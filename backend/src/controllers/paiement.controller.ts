import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { PaiementStatut, TrancheStatut, PaymentMethod } from '@prisma/client';

export const PaiementController = {

  // ─── 1. CRÉER UN PAIEMENT GLOBAL (PLANIFICATION) ─────────────────────────
  create: async (req: Request, res: Response) => {
    try {
      const { stagiaireId, montant, devise, datePrevue, reference } = req.body;
      const userId = (req as any).user?.id;

      if (!stagiaireId || !montant || !datePrevue) {
        return res.status(400).json({ error: 'stagiaireId, montant et datePrevue sont obligatoires.' });
      }
      if (Number(montant) <= 0) {
        return res.status(400).json({ error: 'Le montant doit être positif.' });
      }

      const stagiaire = await prisma.stagiaire.findUnique({ where: { id: stagiaireId } });
      if (!stagiaire) return res.status(404).json({ error: 'Stagiaire introuvable.' });

      const paiement = await prisma.paiement.create({
        data: {
          stagiaireId,
          montant:    Number(montant),
          devise:     devise ?? 'FCFA',
          datePrevue: new Date(datePrevue),
          reference,
          statut:     PaiementStatut.PLANIFIE,
        },
        include: {
          stagiaire: { include: { user: { select: { nom: true, prenom: true, email: true } } } },
        },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'PAIEMENT_CREATE',
          cible: 'Paiement',
          details: `Paiement ${montant} ${devise ?? 'FCFA'} planifié pour stagiaire ${stagiaireId}`,
          ip: req.ip,
        },
      });

      return res.status(201).json({ message: 'Paiement planifié.', paiement });
    } catch (error) {
      console.error('PaiementController.create:', error);
      return res.status(500).json({ error: 'Erreur lors de la création du paiement.' });
    }
  },

  // ─── 2. LISTE DES PAIEMENTS (calcul dynamique montantPaye via tranches) ────
  list: async (req: Request, res: Response) => {
    try {
      const { stagiaireId, statut, dateMin, dateMax, page = '1', limit = '20' } = req.query;

      const where: any = {};
      if (stagiaireId) where.stagiaireId = stagiaireId as string;
      if (statut)      where.statut      = statut;
      if (dateMin) where.datePrevue = { ...where.datePrevue, gte: new Date(dateMin as string) };
      if (dateMax) where.datePrevue = { ...where.datePrevue, lte: new Date(dateMax as string) };

      const skip = (Number(page) - 1) * Number(limit);
      const [total, items] = await Promise.all([
        prisma.paiement.count({ where }),
        prisma.paiement.findMany({
          where,
          orderBy: { datePrevue: 'desc' },
          skip,
          take: Number(limit),
          include: {
            stagiaire: { include: { user: { select: { nom: true, prenom: true, email: true } } } },
            tranches: true,
          },
        }),
      ]);

      // Injection de montantPaye calculé depuis les tranches REUSSIT
      const itemsFormates = items.map((p) => {
        const montantPaye = p.tranches
          .filter((t) => t.statut === TrancheStatut.REUSSIT)
          .reduce((sum, t) => sum + t.montant, 0);
        return { ...p, montantPaye };
      });

      // Calcul du budget dashboard
      const tous = await prisma.paiement.findMany({ where, include: { tranches: true } });
      const budgetTotalSaisi   = tous.reduce((s, p) => s + p.montant, 0);
      const totalPayeGlobal    = tous.reduce((acc, p) => {
        return acc + p.tranches
          .filter((t) => t.statut === TrancheStatut.REUSSIT)
          .reduce((s, t) => s + t.montant, 0);
      }, 0);

      const budget = {
        total:   budgetTotalSaisi,
        paye:    totalPayeGlobal,
        attente: Math.max(0, budgetTotalSaisi - totalPayeGlobal),
      };

      return res.json({ total, page: Number(page), limit: Number(limit), budget, items: itemsFormates });
    } catch (error) {
      console.error('PaiementController.list:', error);
      return res.status(500).json({ error: 'Erreur lors du chargement des paiements.' });
    }
  },

  // ─── 3. AJOUTER UNE TRANCHE (POST /paiements/:id/tranches) ───────────────
  // Correspond à paiementService.enregistrerTranche() côté frontend.
  // L'id dans req.params est l'UUID String du paiement parent.
  ajouterTranche: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;   // UUID String — forcé string
      const { montant, methode, reference, telephone } = req.body;
      const user = (req as any).user;

      if (!montant || Number(montant) <= 0) {
        return res.status(400).json({ error: 'Un montant valide et positif est requis.' });
      }

      const paiement = await prisma.paiement.findUnique({
        where: { id },                      // String UUID direct
        include: { tranches: true },
      }) as any;
      if (!paiement) return res.status(404).json({ error: 'Fiche de paiement introuvable.' });

      // Calcul du reste à payer
      const totalDejaPaye = paiement.tranches
        .filter((t: any) => t.statut === TrancheStatut.REUSSIT)
        .reduce((sum: number, t: any) => sum + t.montant, 0);
      const resteAPayer = paiement.montant - totalDejaPaye;

      if (Number(montant) > resteAPayer + 0.01) {
        return res.status(400).json({
          error: `Le versement (${montant}) dépasse le reste à payer (${resteAPayer.toFixed(2)}).`,
        });
      }

      // Statut de la tranche selon le rôle
      const estStagiaire   = user?.role === 'STAGIAIRE';
      const statutTranche  = estStagiaire ? TrancheStatut.EN_ATTENTE : TrancheStatut.REUSSIT;

      const nouvelleTranche = await prisma.tranchePaiement.create({
        data: {
          paiementId:      id,              // String UUID
          montant:         Number(montant),
          methode:         (methode as PaymentMethod) ?? PaymentMethod.MOMO,
          reference:       reference  || null,
          telephonePayeur: telephone  || null,
          statut:          statutTranche,
        },
      });

      // Recalcul du statut global du paiement (seulement si admin encaisse directement)
      let paiementMisAJour: any = paiement;
      if (!estStagiaire) {
        const nouveauTotalPaye   = totalDejaPaye + Number(montant);
        const nouveauStatutGlobal =
          nouveauTotalPaye >= paiement.montant ? PaiementStatut.PAYE : PaiementStatut.PARTIEL;

        paiementMisAJour = await prisma.paiement.update({
          where: { id },
          data: {
            statut:       nouveauStatutGlobal,
            datePaiement: nouveauStatutGlobal === PaiementStatut.PAYE ? new Date() : null,
            reference:    reference || paiement.reference,
          },
          include: { tranches: true },
        });
      }

      await prisma.auditLog.create({
        data: {
          userId:  user?.id,
          action:  'PAIEMENT_TRANCHE_AJOUT',
          cible:   'TranchePaiement',
          details: `Tranche ${montant} ajoutée sur paiement ${id}. Statut tranche: ${statutTranche}`,
          ip:      req.ip,
        },
      });

      return res.json({
        message:  estStagiaire ? 'Preuve soumise, en attente de validation.' : 'Tranche encaissée avec succès.',
        paiement: { ...paiementMisAJour, montantPaye: (totalDejaPaye + (estStagiaire ? 0 : Number(montant))) },
        tranche:  nouvelleTranche,
      });
    } catch (error) {
      console.error('PaiementController.ajouterTranche:', error);
      return res.status(500).json({ error: 'Erreur serveur lors de l\'enregistrement de la tranche.' });
    }
  },

  // ─── 4. VALIDER UNE TRANCHE (PATCH /paiements/tranches/:id/valider) ───────
  validerTranche: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const userId = (req as any).user?.id;

      const tranche = await prisma.tranchePaiement.findUnique({
        where: { id },
        include: { paiement: { include: { tranches: true } } },
      }) as any;
      if (!tranche) return res.status(404).json({ error: 'Tranche introuvable.' });
      if (tranche.statut === TrancheStatut.REUSSIT) {
        return res.status(400).json({ error: 'Cette tranche est déjà validée.' });
      }

      const updatedTranche = await prisma.tranchePaiement.update({
        where: { id },
        data: { statut: TrancheStatut.REUSSIT },
      });

      const paiement = await prisma.paiement.findUnique({
        where: { id: tranche.paiementId },
        include: { tranches: true },
      }) as any;

      if (paiement) {
        const totalPaye = paiement.tranches
          .filter((t: any) => t.statut === TrancheStatut.REUSSIT || t.id === id)
          .reduce((sum: number, t: any) => sum + t.montant, 0);
        const nouveauStatut = totalPaye >= paiement.montant ? PaiementStatut.PAYE : PaiementStatut.PARTIEL;

        await prisma.paiement.update({
          where: { id: paiement.id },
          data: {
            statut:       nouveauStatut,
            datePaiement: nouveauStatut === PaiementStatut.PAYE ? new Date() : null,
          },
        });
      }

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'PAIEMENT_TRANCHE_VALIDEE',
          cible: 'TranchePaiement',
          details: `Tranche ${id} validée manuellement par l'admin`,
          ip: req.ip,
        },
      });

      return res.json({ message: 'Tranche validée.', tranche: updatedTranche });
    } catch (error) {
      console.error('PaiementController.validerTranche:', error);
      return res.status(500).json({ error: 'Erreur lors de la validation de la tranche.' });
    }
  },

  // ─── 5. SOLDER UN PAIEMENT EN TOTALITÉ (PATCH /paiements/:id/solder) ──────
  // Correspond à paiementService.changerStatut(id, 'PAYE') côté frontend.
  // Réservé aux admins — le middleware de route doit vérifier le rôle si besoin.
  solderPaiement: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;            // UUID String
      const userId = (req as any).user?.id;

      const paiement = await prisma.paiement.findUnique({ where: { id }, include: { tranches: true } }) as any;
      if (!paiement) return res.status(404).json({ error: 'Paiement introuvable.' });

      if (paiement.statut === PaiementStatut.PAYE) {
        return res.status(400).json({ error: 'Ce paiement est déjà soldé.' });
      }

      // Si des tranches existent déjà, calculer le reste à payer et créer
      // une tranche REUSSIT pour matérialiser le règlement complet.
      const totalDejaPaye = (paiement.tranches ?? [])
        .filter((t: any) => t.statut === TrancheStatut.REUSSIT)
        .reduce((s: number, t: any) => s + t.montant, 0);
      const reste = Math.max(0, paiement.montant - totalDejaPaye);

      if (reste > 0) {
        await prisma.tranchePaiement.create({
          data: {
            paiementId: id,
            montant: reste,
            methode: PaymentMethod.CASH,
            statut: TrancheStatut.REUSSIT,
          },
        });
      }

      const updated = await prisma.paiement.update({
        where: { id },
        data: {
          statut:       PaiementStatut.PAYE,
          datePaiement: new Date(),
        },
        include: {
          stagiaire: { include: { user: { select: { nom: true, prenom: true } } } },
          tranches: true,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action:  'PAIEMENT_SOLDE',
          cible:   'Paiement',
          details: `Paiement ${id} soldé manuellement par admin`,
          ip:      req.ip,
        },
      });

      return res.json({ message: 'Paiement soldé en totalité.', paiement: updated });
    } catch (error) {
      console.error('PaiementController.solderPaiement:', error);
      return res.status(500).json({ error: 'Erreur lors de la validation du paiement.' });
    }
  },

  // ─── 5. SUPPRIMER UN PAIEMENT (admin) ────────────────────────────────────
  delete: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const paiement = await prisma.paiement.findUnique({ where: { id } });
      if (!paiement) return res.status(404).json({ error: 'Paiement introuvable.' });
      if (paiement.statut === PaiementStatut.PAYE) {
        return res.status(400).json({ error: 'Impossible de supprimer un paiement déjà effectué.' });
      }
      await prisma.paiement.delete({ where: { id } });
      return res.json({ message: 'Paiement supprimé.' });
    } catch {
      return res.status(500).json({ error: 'Erreur lors de la suppression.' });
    }
  },

  // ─── 6. TABLEAU DE BORD FINANCIER ────────────────────────────────────────
  dashboard: async (_req: Request, res: Response) => {
    try {
      const now          = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const [tous, mois, parStatut] = await Promise.all([
        prisma.paiement.aggregate({ _sum: { montant: true }, _count: true }),
        prisma.paiement.aggregate({
          where: { datePrevue: { gte: startOfMonth, lte: endOfMonth } },
          _sum: { montant: true },
          _count: true,
        }),
        prisma.paiement.groupBy({
          by: ['statut'],
          _sum: { montant: true },
          _count: true,
        }),
      ]);

      return res.json({
        global:       { total: tous._count,  montant: tous._sum.montant ?? 0 },
        moisEnCours:  { total: mois._count,  montant: mois._sum.montant ?? 0 },
        parStatut:    parStatut.map((s) => ({
          statut:  s.statut,
          count:   s._count,
          montant: s._sum.montant ?? 0,
        })),
      });
    } catch (error) {
      return res.status(500).json({ error: 'Erreur lors du chargement du tableau de bord.' });
    }
  },

  // ─── 7. WEBHOOK PAIEMENT OPÉRATEUR EXTERNE (route publique optionnelle) ───
  webhookVerification: async (req: Request, res: Response) => {
    try {
      const { custom_id, transaction_id, status } = req.body;
      const tranche = await prisma.tranchePaiement.findUnique({ where: { id: custom_id } });
      if (!tranche) return res.status(404).json({ error: 'Tranche introuvable.' });

      const statutSucces = status === 'SUCCESS';
      await prisma.tranchePaiement.update({
        where: { id: custom_id },
        data: {
          statut:    statutSucces ? TrancheStatut.REUSSIT : TrancheStatut.ECHOUE,
          reference: transaction_id,
        },
      });

      if (statutSucces) {
        const paiement = await prisma.paiement.findUnique({
          where: { id: tranche.paiementId },
          include: { tranches: true },
        });
        if (paiement) {
          const totalPaye    = paiement.tranches
            .filter((t) => t.statut === TrancheStatut.REUSSIT)
            .reduce((s, t) => s + t.montant, 0);
          const nouveauStatut = totalPaye >= paiement.montant ? PaiementStatut.PAYE : PaiementStatut.PARTIEL;
          await prisma.paiement.update({
            where: { id: paiement.id },
            data: {
              statut:       nouveauStatut,
              datePaiement: nouveauStatut === PaiementStatut.PAYE ? new Date() : null,
            },
          });
        }
      }

      return res.status(200).json({ status: 'Acknowledge' });
    } catch (error) {
      return res.status(500).json({ error: 'Erreur Webhook.' });
    }
  },
};