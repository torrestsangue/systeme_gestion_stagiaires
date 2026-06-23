import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { Role, PaiementStatut } from '@prisma/client';

/* ─────────────────────────────────────────
   HELPER — numéro de dossier unique
───────────────────────────────────────── */
const genNumeroDossier = async (): Promise<string> => {
  const year = new Date().getFullYear();
  let num: string;
  do {
    num = `STG-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
  } while (await prisma.stagiaire.findUnique({ where: { numeroDossier: num } }));
  return num;
};

export const stagiaireController = {

  // ─── 1. CRÉER UN STAGIAIRE (admin / RH) ───────────────────────────────────
  create: async (req: Request, res: Response) => {
    try {
      const {
        email, nom, prenom, telephone,
        domaine, dateDebut, dateFin, tuteurId,
        cvUrl, motivationUrl, photoUrl,
      } = req.body;
      const adminId = (req as any).user?.id;

      if (!email || !nom || !prenom || !domaine || !dateDebut || !dateFin) {
        return res.status(400).json({ error: 'Champs obligatoires manquants.' });
      }

      const emailExiste = await prisma.user.findUnique({ where: { email } });
      if (emailExiste) return res.status(409).json({ error: 'Cet email est déjà utilisé.' });

      const tempPassword = `SGS@${Math.floor(1000 + Math.random() * 9000)}`;
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const numeroDossier = await genNumeroDossier();

      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email, nom, prenom, telephone,
            password: hashedPassword,
            role: Role.STAGIAIRE,
            is_verify: true,
            actif: true,
          },
        });

        const stagiaire = await tx.stagiaire.create({
          data: {
            userId: user.id,
            numeroDossier,
            domaine,
            dateDebut: new Date(dateDebut),
            dateFin:   new Date(dateFin),
            tuteurId:  tuteurId ?? null,
            cvUrl, motivationUrl, photoUrl,
          },
          include: { user: { select: { id: true, email: true, nom: true, prenom: true, role: true } } },
        });

        await tx.auditLog.create({
          data: {
            userId: adminId,
            action: 'STAGIAIRE_CREATE',
            cible: 'Stagiaire',
            details: `Stagiaire ${numeroDossier} créé pour ${email}`,
            ip: req.ip,
          },
        });

        return { stagiaire, tempPassword };
      });

      return res.status(201).json({
        message: 'Stagiaire créé avec succès.',
        numeroDossier,
        tempPassword: result.tempPassword,
        stagiaire: result.stagiaire,
      });
    } catch (error) {
      console.error('StagiaireController.create:', error);
      return res.status(500).json({ error: 'Erreur lors de la création du stagiaire.' });
    }
  },

  // ─── 2. LISTE DES STAGIAIRES (CORRIGÉ 🛠️) ───────────────────────────────────
  list: async (req: Request, res: Response) => {
    try {
      const { domaine, tuteurId, search, actif, page = '1', limit = '20' } = req.query;
      const user = (req as any).user;

      const where: any = {};

      if (user.role === Role.TUTEUR) {
        where.tuteurId = user.id;
      } else if (tuteurId) {
        where.tuteurId = tuteurId;
      }

      if (domaine) where.domaine = { contains: domaine as string, mode: 'insensitive' };
      
      if (search) {
        where.OR = [
          { numeroDossier: { contains: search as string, mode: 'insensitive' } },
          { user: { nom:    { contains: search as string, mode: 'insensitive' } } },
          { user: { prenom: { contains: search as string, mode: 'insensitive' } } },
          { user: { email:  { contains: search as string, mode: 'insensitive' } } },
        ];
      }
      
      if (actif !== undefined) {
        where.user = { ...where.user, actif: actif === 'true' };
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [total, items] = await Promise.all([
        prisma.stagiaire.count({ where }),
        prisma.stagiaire.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip, 
          take: Number(limit),
          include: {
            user: { 
              select: { 
                id: true, 
                email: true, 
                nom: true, 
                prenom: true, 
                telephone: true, 
                actif: true 
                // 💡 Ligne 'photoUrl: true' supprimée d'ici car elle appartient au Stagiaire
              } 
            },
            _count: { select: { taches: true, rapports: true, presences: true, paiements: true } },
          },
        }),
      ]);

      return res.json({ total, page: Number(page), limit: Number(limit), items });
    } catch (error) {
      console.error('StagiaireController.list:', error);
      return res.status(500).json({ error: 'Erreur lors du chargement des stagiaires.' });
    }
  },
  
  // ─── 3. PROFIL COMPLET D'UN STAGIAIRE ─────────────────────────────────────
  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const reqUser = (req as any).user;

      const stagiaire = await prisma.stagiaire.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, email: true, nom: true, prenom: true, telephone: true, actif: true, role: true } },
          taches:    { orderBy: { createdAt: 'desc' } },
          rapports:  { orderBy: { date: 'desc' }, take: 10 },
          presences: { orderBy: { scannedAt: 'desc' }, take: 30 },
          paiements: { orderBy: { datePrevue: 'desc' } },
          evaluation: true,
        },
      });

      if (!stagiaire) return res.status(404).json({ error: 'Stagiaire introuvable.' });

      if (reqUser.role === Role.STAGIAIRE && stagiaire.userId !== reqUser.id) {
        return res.status(403).json({ error: 'Accès refusé.' });
      }
      if (reqUser.role === Role.TUTEUR && stagiaire.tuteurId !== reqUser.id) {
        return res.status(403).json({ error: 'Accès refusé.' });
      }

      const debut = stagiaire.dateDebut.getTime();
      const fin   = stagiaire.dateFin.getTime();
      const now   = Date.now();
      const progression = Math.min(100, Math.max(0, Math.round(((now - debut) / (fin - debut)) * 100)));

      return res.json({ ...stagiaire, progression });
    } catch (error) {
      console.error('StagiaireController.getById:', error);
      return res.status(500).json({ error: 'Erreur lors du chargement du profil.' });
    }
  },

  // ─── 4. MISE À JOUR DU STAGIAIRE ──────────────────────────────────────────
  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { domaine, dateDebut, dateFin, tuteurId, cvUrl, motivationUrl, photoUrl } = req.body;
      const userId = (req as any).user?.id;

      const stagiaire = await prisma.stagiaire.findUnique({ where: { id } });
      if (!stagiaire) return res.status(404).json({ error: 'Stagiaire introuvable.' });

      const updated = await prisma.stagiaire.update({
        where: { id },
        data: {
          ...(domaine     && { domaine }),
          ...(dateDebut   && { dateDebut: new Date(dateDebut) }),
          ...(dateFin     && { dateFin:   new Date(dateFin)   }),
          ...(tuteurId    && { tuteurId }),
          ...(cvUrl       && { cvUrl }),
          ...(motivationUrl && { motivationUrl }),
          ...(photoUrl    && { photoUrl }),
        },
        include: { user: { select: { id: true, email: true, nom: true, prenom: true } } },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'STAGIAIRE_UPDATE',
          cible: 'Stagiaire',
          details: `Profil ${stagiaire.numeroDossier} mis à jour`,
          ip: req.ip,
        },
      });

      return res.json({ message: 'Profil mis à jour.', stagiaire: updated });
    } catch (error) {
      return res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
    }
  },

  // ─── 5. ACTIVER / DÉSACTIVER UN COMPTE STAGIAIRE ──────────────────────────
  toggleActif: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const adminId = (req as any).user?.id;

      const stagiaire = await prisma.stagiaire.findUnique({ where: { id }, include: { user: true } });
      if (!stagiaire) return res.status(404).json({ error: 'Stagiaire introuvable.' });

      const newActif = !stagiaire.user.actif;
      await prisma.user.update({ where: { id: stagiaire.userId }, data: { actif: newActif } });

      await prisma.auditLog.create({
        data: {
          userId: adminId,
          action: newActif ? 'STAGIAIRE_ACTIVATE' : 'STAGIAIRE_DEACTIVATE',
          cible: 'Stagiaire',
          details: `${stagiaire.numeroDossier} → ${newActif ? 'activé' : 'désactivé'}`,
          ip: req.ip,
        },
      });

      return res.json({ message: `Compte ${newActif ? 'activé' : 'désactivé'}.`, actif: newActif });
    } catch (error) {
      return res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
    }
  },

  // ─── 6. STATISTIQUES GLOBALES (admin / RH) ────────────────────────────────
  stats: async (_req: Request, res: Response) => {
    try {
      const now = new Date();
      const [total, actifs, presentsAujourdhui] = await Promise.all([
        prisma.stagiaire.count(),
        prisma.stagiaire.count({ where: { dateFin: { gte: now } } }),
        prisma.presence.count({
          where: {
            statut: 'PRESENT',
            scannedAt: {
              gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
              lt:  new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
            },
          },
        }),
      ]);

      const rapportsEnAttente = await prisma.rapport.count({ where: { valide: false } });
      const paiementsAValider = await prisma.paiement.count({ where: { statut: PaiementStatut.EN_ATTENTE } });

      return res.json({ total, actifs, presentsAujourdhui, rapportsEnAttente, paiementsAValider });
    } catch (error: any) {
      console.error('StagiaireController.stats:', error?.message ?? error, error?.stack ?? 'no-stack');
      return res.status(500).json({ error: 'Erreur lors du chargement des statistiques.' });
    }
  },
};