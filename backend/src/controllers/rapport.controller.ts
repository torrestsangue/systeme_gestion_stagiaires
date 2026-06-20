import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';

export const RapportController = {

  // ─── 1. SOUMETTRE UN RAPPORT (stagiaire) ──────────────────────────────────
  create: async (req: Request, res: Response) => {
    try {
      const { activites, difficultes, apprentissages, date } = req.body;
      const reqUser = (req as any).user;

      if (!activites) {
        return res.status(400).json({ error: 'Le champ "activites" est obligatoire.' });
      }

      // Récupérer le profil stagiaire
      const stagiaire = await prisma.stagiaire.findUnique({ where: { userId: reqUser.id } });
      if (!stagiaire) {
        return res.status(403).json({ error: 'Seul un stagiaire peut soumettre un rapport.' });
      }

      // Empêcher doublon sur la même date (un rapport par jour)
      const reportDate = date ? new Date(date) : new Date();
      const startOfDay = new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate());
      const endOfDay   = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      const existing = await prisma.rapport.findFirst({
        where: {
          stagiaireId: stagiaire.id,
          date: { gte: startOfDay, lt: endOfDay },
        },
      });
      if (existing) {
        return res.status(409).json({
          error: 'Vous avez déjà soumis un rapport pour cette date.',
          rapportId: existing.id,
        });
      }

      const rapport = await prisma.rapport.create({
        data: {
          activites,
          difficultes,
          apprentissages,
          date: reportDate,
          stagiaireId: stagiaire.id,
          valide: false,
        },
        include: {
          stagiaire: { include: { user: { select: { nom: true, prenom: true } } } },
        },
      });

      return res.status(201).json({ message: 'Rapport soumis avec succès.', rapport });
    } catch (error) {
      console.error('RapportController.create:', error);
      return res.status(500).json({ error: 'Erreur lors de la soumission du rapport.' });
    }
  },

  // ─── 2. LISTE DES RAPPORTS (filtres) ──────────────────────────────────────
  list: async (req: Request, res: Response) => {
    try {
      const { stagiaireId, valide, dateMin, dateMax, page = '1', limit = '20' } = req.query;
      const reqUser = (req as any).user;

      const where: any = {};

      if (reqUser.role === Role.STAGIAIRE) {
        const stag = await prisma.stagiaire.findUnique({ where: { userId: reqUser.id } });
        if (!stag) return res.status(404).json({ error: 'Profil stagiaire introuvable.' });
        where.stagiaireId = stag.id;
      } else if (reqUser.role === Role.TUTEUR) {
        const stagiaires = await prisma.stagiaire.findMany({ where: { tuteurId: reqUser.id }, select: { id: true } });
        where.stagiaireId = { in: stagiaires.map(s => s.id) };
        if (stagiaireId) where.stagiaireId = stagiaireId;
      } else {
        if (stagiaireId) where.stagiaireId = stagiaireId;
      }

      if (valide !== undefined) where.valide = valide === 'true';
      if (dateMin) where.date = { ...where.date, gte: new Date(dateMin as string) };
      if (dateMax) where.date = { ...where.date, lte: new Date(dateMax as string) };

      const skip = (Number(page) - 1) * Number(limit);
      const [total, items] = await Promise.all([
        prisma.rapport.count({ where }),
        prisma.rapport.findMany({
          where,
          orderBy: { date: 'desc' },
          skip, take: Number(limit),
          include: {
            stagiaire: { include: { user: { select: { nom: true, prenom: true } } } },
            validateur: { select: { nom: true, prenom: true } },
          },
        }),
      ]);

      return res.json({ total, page: Number(page), limit: Number(limit), items });
    } catch (error) {
      console.error('RapportController.list:', error);
      return res.status(500).json({ error: 'Erreur lors du chargement des rapports.' });
    }
  },

  // ─── 3. DÉTAIL D'UN RAPPORT ───────────────────────────────────────────────
  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const rapport = await prisma.rapport.findUnique({
        where: { id },
        include: {
          stagiaire: { include: { user: { select: { nom: true, prenom: true, email: true } } } },
          validateur: { select: { nom: true, prenom: true } },
        },
      });
      if (!rapport) return res.status(404).json({ error: 'Rapport introuvable.' });
      return res.json(rapport);
    } catch {
      return res.status(500).json({ error: 'Erreur lors du chargement.' });
    }
  },

  // ─── 4. VALIDER / ANNOTER UN RAPPORT (tuteur / admin) ─────────────────────
  valider: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { valide, commentaire } = req.body;
      const validateurId = (req as any).user?.id;

      if (typeof valide !== 'boolean') {
        return res.status(400).json({ error: 'Le champ "valide" (boolean) est obligatoire.' });
      }

      const rapport = await prisma.rapport.findUnique({
        where: { id },
        include: { stagiaire: true },
      });
      if (!rapport) return res.status(404).json({ error: 'Rapport introuvable.' });

      const reqUser = (req as any).user;
      // Un tuteur ne peut valider que les rapports de ses stagiaires
      if (reqUser.role === Role.TUTEUR && rapport.stagiaire.tuteurId !== reqUser.id) {
        return res.status(403).json({ error: 'Accès refusé.' });
      }

      const updated = await prisma.rapport.update({
        where: { id },
        data: { valide, commentaire, validateurId },
        include: { validateur: { select: { nom: true, prenom: true } } },
      });

      await prisma.auditLog.create({
        data: {
          userId: validateurId,
          action: valide ? 'RAPPORT_VALIDE' : 'RAPPORT_REJETE',
          cible: 'Rapport',
          details: `Rapport ${id} ${valide ? 'validé' : 'rejeté'}`,
          ip: req.ip,
        },
      });

      return res.json({ message: `Rapport ${valide ? 'validé' : 'rejeté'}.`, rapport: updated });
    } catch (error) {
      return res.status(500).json({ error: 'Erreur lors de la validation.' });
    }
  },

  // ─── 5. RAPPORTS NON SOUMIS AUJOURD'HUI (alertes) ─────────────────────────
  manquants: async (_req: Request, res: Response) => {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay   = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

      // Tous les stagiaires actifs
      const stagiaires = await prisma.stagiaire.findMany({
        where: { dateFin: { gte: today } },
        include: { user: { select: { nom: true, prenom: true, email: true } } },
      });

      const rapportsDuJour = await prisma.rapport.findMany({
        where: { date: { gte: startOfDay, lt: endOfDay } },
        select: { stagiaireId: true },
      });

      const stagiaireIdsAvecRapport = new Set(rapportsDuJour.map(r => r.stagiaireId));
      const sansTapport = stagiaires.filter(s => !stagiaireIdsAvecRapport.has(s.id));

      return res.json({ date: startOfDay, total: sansTapport.length, stagiaires: sansTapport });
    } catch (error) {
      return res.status(500).json({ error: 'Erreur lors du chargement.' });
    }
  },

  // ─── 6. SUPPRIMER UN RAPPORT ───────────────────────────────────────────────
  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const reqUser = (req as any).user;
      const rapport = await prisma.rapport.findUnique({ where: { id } });
      if (!rapport) return res.status(404).json({ error: 'Rapport introuvable.' });

      // Un stagiaire ne peut supprimer que ses propres rapports non validés
      if (reqUser.role === Role.STAGIAIRE) {
        const stag = await prisma.stagiaire.findUnique({ where: { userId: reqUser.id } });
        if (!stag || rapport.stagiaireId !== stag.id) return res.status(403).json({ error: 'Accès refusé.' });
        if (rapport.valide) return res.status(403).json({ error: 'Impossible de supprimer un rapport déjà validé.' });
      }

      await prisma.rapport.delete({ where: { id } });
      return res.json({ message: 'Rapport supprimé.' });
    } catch {
      return res.status(500).json({ error: 'Erreur lors de la suppression.' });
    }
  },
};