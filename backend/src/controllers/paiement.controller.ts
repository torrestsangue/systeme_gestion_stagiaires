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
      if (montant <= 0) {
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

  // ─── 2. LISTE DES PAIEMENTS (Avec calcul dynamique du montantPaye) ────────
  list: async (req: Request, res: Response) => {
    try {
      const { stagiaireId, statut, dateMin, dateMax, page = '1', limit = '20' } = req.query;

      const where: any = {};
      if (stagiaireId) where.stagiaireId = stagiaireId;
      if (statut)      where.statut      = statut;
      if (dateMin) where.datePrevue = { ...where.datePrevue, gte: new Date(dateMin as string) };
      if (dateMax) where.datePrevue = { ...where.datePrevue, lte: new Date(dateMax as string) };

      const skip = (Number(page) - 1) * Number(limit);
      const [total, items] = await Promise.all([
        prisma.paiement.count({ where }),
        prisma.paiement.findMany({
          where,
          orderBy: { datePrevue: 'desc' },
          skip, take: Number(limit),
          include: {
            stagiaire: { include: { user: { select: { nom: true, prenom: true, email: true } } } },
            tranches: true, // Récupère les tranches associées
          },
        }),
      ]);

      // Injection dynamique de "montantPaye" pour correspondre à ton composant React
      const itemsFormates = items.map(p => {
        const montantPaye = p.tranches
          .filter(t => t.statut === TrancheStatut.REUSSIT)
          .reduce((sum, t) => sum + t.montant, 0);
        return { ...p, montantPaye };
      });

      // Calcul du budget global du Dashboard
      const tous = await prisma.paiement.findMany({ where, include: { tranches: true } });
      const totalPayeGlobal = tous.reduce((acc, p) => {
        const payeSurFiche = p.tranches
          .filter(t => t.statut === TrancheStatut.REUSSIT)
          .reduce((s, t) => s + t.montant, 0);
        return acc + payeSurFiche;
      }, 0);

      const budgetTotalSaisi = tous.reduce((s, p) => s + p.montant, 0);

      const budget = {
        total:    budgetTotalSaisi,
        paye:     totalPayeGlobal,
        attente:  Math.max(0, budgetTotalSaisi - totalPayeGlobal),
      };

      return res.json({ total, page: Number(page), limit: Number(limit), budget, items: itemsFormates });
    } catch (error) {
      console.error('PaiementController.list:', error);
      return res.status(500).json({ error: 'Erreur lors du chargement des paiements.' });
    }
  },

  // ─── 3. ENREGISTRER UNE NOUVELLE TRANCHE (Route: PATCH /paiements/:id/statut) ───
  // Parfaitement synchronisé avec l'action de ton bouton "Enregistrer la tranche" du Front.
  changerStatut: async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const { montant, methode, reference, telephone } = req.body;
      const user = (req as any).user; // Récupéré via le middleware authenticate

      if (!montant || Number(montant) <= 0) {
        return res.status(400).json({ error: 'Un montant valide et positif est requis.' });
      }

      // 1. Recherche de la fiche de paiement parent
      const paiement = await prisma.paiement.findUnique({
        where: { id },
        include: { tranches: true }
      });
      if (!paiement) return res.status(404).json({ error: 'Fiche de paiement introuvable.' });

      // 2. Vérification du reste à payer
      const totalDejaPaye = paiement.tranches
        .filter(t => t.statut === TrancheStatut.REUSSIT)
        .reduce((sum, t) => sum + t.montant, 0);
      const resteAPayer = paiement.montant - totalDejaPaye;

      if (Number(montant) > resteAPayer) {
        return res.status(400).json({ error: `Le versement (${montant}) dépasse le reste à payer (${resteAPayer}).` });
      }

      // 3. Gestion du statut de la tranche selon le rôle
      const estStagiaire = user?.role === 'STAGIAIRE';
      const statutTranche = estStagiaire ? TrancheStatut.EN_ATTENTE : TrancheStatut.REUSSIT;

      // 4. Création de la tranche
      const nouvelleTranche = await prisma.tranchePaiement.create({
        data: {
          paiementId: id,
          montant: Number(montant),
          methode: (methode as PaymentMethod) ?? PaymentMethod.MOMO,
          reference: reference || null,
          telephonePayeur: telephone || null,
          statut: statutTranche
        }
      });

      // 5. Recalculer le statut global si l'administration effectue l'encaissement direct
      let paiementMisAJour = paiement;
      if (!estStagiaire) {
        const nouveauTotalPaye = totalDejaPaye + Number(montant);
        let nouveauStatutGlobal = PaiementStatut.PARTIEL;

        if (nouveauTotalPaye >= paiement.montant) {
          nouveauStatutGlobal = PaiementStatut.PAYE;
        }

        paiementMisAJour = await prisma.paiement.update({
          where: { id },
          data: { 
            statut: nouveauStatutGlobal,
            datePaiement: nouveauStatutGlobal === PaiementStatut.PAYE ? new Date() : null,
            reference: reference || paiement.reference
          },
          include: { tranches: true }
        });
      }

      // Log de sécurité
      await prisma.auditLog.create({
        data: {
          userId: user?.id,
          action: 'PAIEMENT_TRANCHE_AJOUT',
          cible: 'TranchePaiement',
          details: `Tranche de ${montant} ajoutée pour le paiement ${id}. Statut: ${statutTranche}`,
          ip: req.ip,
        },
      });

      return res.json({ 
        message: estStagiaire ? 'Preuve de tranche soumise, en attente.' : 'Tranche encaissée avec succès.', 
        paiement: paiementMisAJour,
        tranche: nouvelleTranche
      });

    } catch (error) {
      console.error('PaiementController.changerStatut (Tranches):', error);
      return res.status(500).json({ error: 'Erreur serveur lors de la gestion du versement.' });
    }
  },

  // ─── 4. WEBHOOK POUR OPÉRATEURS EXTERNES (Optionnel - Route Publique) ───────
  webhookVerification: async (req: Request, res: Response) => {
    try {
      const { custom_id, transaction_id, status } = req.body; 
      // custom_id doit contenir l'ID de la TranchePaiement (UUID) générée au moment du paiement en ligne

      const tranche = await prisma.tranchePaiement.findUnique({ where: { id: custom_id } });
      if (!tranche) return res.status(404).json({ error: 'Tranche introuvable.' });

      const statutSucces = status === 'SUCCESS';
      
      // Mise à jour de la tranche
      const trancheMaj = await prisma.tranchePaiement.update({
        where: { id: custom_id },
        data: {
          statut: statutSucces ? TrancheStatut.REUSSIT : TrancheStatut.ECHOUE,
          reference: transaction_id
        }
      });

      // Recalcul global du statut si le paiement est réussi
      if (statutSucces) {
        const paiement = await prisma.paiement.findUnique({
          where: { id: tranche.paiementId },
          include: { tranches: true }
        });

        if (paiement) {
          const totalPaye = paiement.tranches
            .filter(t => t.statut === TrancheStatut.REUSSIT)
            .reduce((sum, t) => sum + t.montant, 0);

          const nouveauStatut = totalPaye >= paiement.montant ? PaiementStatut.PAYE : PaiementStatut.PARTIEL;

          await prisma.paiement.update({
            where: { id: paiement.id },
            data: { 
              statut: nouveauStatut,
              datePaiement: nouveauStatut === PaiementStatut.PAYE ? new Date() : null
            }
          });
        }
      }

      return res.status(200).json({ status: 'Acknowledge' });
    } catch (error) {
      return res.status(500).json({ error: 'Erreur Webhook.' });
    }
  },

  // Les autres méthodes (updateStatut, paiementMasse, delete, dashboard) restent identiques...
  updateStatut: async (req: Request, res: Response) => { /* Code existant... */ },
  paiementMasse: async (req: Request, res: Response) => { /* Code existant... */ },
  delete: async (req: Request, res: Response) => { /* Code existant... */ },
  dashboard: async (_req: Request, res: Response) => { /* Code existant... */ }
};