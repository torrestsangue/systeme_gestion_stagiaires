import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { TacheStatut, PriorityLevel, Role } from '@prisma/client';

export const TacheController = {

  // ─── 1. CRÉER UNE TÂCHE ───────────────────────────────────────────────────
  create: async (req: Request, res: Response) => {
    try {
      const { titre, description, priorite, deadline, stagiaireId } = req.body;
      const createurId = (req as any).user?.id;
      const reqUser    = (req as any).user;

      if (!titre || !stagiaireId) {
        return res.status(400).json({ error: 'titre et stagiaireId sont obligatoires.' });
      }

      // Vérifier que le stagiaire existe
      const stagiaire = await prisma.stagiaire.findUnique({
        where: { id: stagiaireId },
        include: { user: true },
      });
      if (!stagiaire) return res.status(404).json({ error: 'Stagiaire introuvable.' });

      // Un tuteur ne peut créer des tâches que pour ses propres stagiaires
      if (reqUser.role === Role.TUTEUR && stagiaire.tuteurId !== reqUser.id) {
        return res.status(403).json({ error: 'Vous ne pouvez assigner des tâches qu\'à vos stagiaires.' });
      }

      const tache = await prisma.tache.create({
        data: {
          titre,
          description,
          priorite: priorite ?? PriorityLevel.MOYENNE,
          deadline: deadline ? new Date(deadline) : null,
          stagiaireId,
          createurId,
          statut: TacheStatut.A_FAIRE,
        },
        include: {
          stagiaire: { include: { user: { select: { nom: true, prenom: true } } } },
          createur:  { select: { id: true, nom: true, prenom: true, role: true } },
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: createurId,
          action: 'TACHE_CREATE',
          cible: 'Tache',
          details: `Tâche "${titre}" créée pour stagiaire ${stagiaireId}`,
          ip: req.ip,
        },
      });

      return res.status(201).json({ message: 'Tâche créée.', tache });
    } catch (error) {
      console.error('TacheController.create:', error);
      return res.status(500).json({ error: 'Erreur lors de la création de la tâche.' });
    }
  },

  // ─── 2. LISTER LES TÂCHES (filtres + Kanban) ──────────────────────────────
  list: async (req: Request, res: Response) => {
    try {
      const { stagiaireId, statut, priorite, search } = req.query;
      const reqUser = (req as any).user;

      const where: any = {};

      if (stagiaireId) {
        where.stagiaireId = stagiaireId;
      } else if (reqUser.role === Role.STAGIAIRE) {
        // Un stagiaire ne voit que ses propres tâches
        const stag = await prisma.stagiaire.findUnique({ where: { userId: reqUser.id } });
        if (!stag) return res.status(404).json({ error: 'Profil stagiaire introuvable.' });
        where.stagiaireId = stag.id;
      } else if (reqUser.role === Role.TUTEUR) {
        // Un tuteur voit les tâches de ses stagiaires
        const stagiaires = await prisma.stagiaire.findMany({ where: { tuteurId: reqUser.id }, select: { id: true } });
        where.stagiaireId = { in: stagiaires.map(s => s.id) };
      }

      if (statut)   where.statut   = statut;
      if (priorite) where.priorite = priorite;
      if (search)   where.titre    = { contains: search as string, mode: 'insensitive' };

      const taches = await prisma.tache.findMany({
        where,
        orderBy: [{ priorite: 'desc' }, { deadline: 'asc' }, { createdAt: 'desc' }],
        include: {
          stagiaire: { include: { user: { select: { nom: true, prenom: true } } } },
          createur:  { select: { id: true, nom: true, prenom: true } },
        },
      });

      // Grouper par statut pour le Kanban
      const kanban = {
        A_FAIRE:     taches.filter(t => t.statut === TacheStatut.A_FAIRE),
        EN_COURS:    taches.filter(t => t.statut === TacheStatut.EN_COURS),
        EN_REVISION: taches.filter(t => t.statut === TacheStatut.EN_REVISION),
        TERMINEE:    taches.filter(t => t.statut === TacheStatut.TERMINEE),
      };

      return res.json({ taches, kanban, total: taches.length });
    } catch (error) {
      console.error('TacheController.list:', error);
      return res.status(500).json({ error: 'Erreur lors du chargement des tâches.' });
    }
  },

  // ─── 3. DÉTAIL D'UNE TÂCHE ────────────────────────────────────────────────
  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const tache = await prisma.tache.findUnique({
        where: { id },
        include: {
          stagiaire: { include: { user: { select: { nom: true, prenom: true, email: true } } } },
          createur:  { select: { id: true, nom: true, prenom: true, role: true } },
        },
      });
      if (!tache) return res.status(404).json({ error: 'Tâche introuvable.' });
      return res.json(tache);
    } catch {
      return res.status(500).json({ error: 'Erreur lors du chargement.' });
    }
  },

  // ─── 4. METTRE À JOUR LE STATUT (glisser-déposer Kanban) ──────────────────
  updateStatut: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { statut } = req.body;
      const reqUser = (req as any).user;

      const validStatuts = Object.values(TacheStatut);
      if (!validStatuts.includes(statut)) {
        return res.status(400).json({ error: `Statut invalide. Valeurs : ${validStatuts.join(', ')}` });
      }

      const tache = await prisma.tache.findUnique({
        where: { id },
        include: { stagiaire: true },
      });
      if (!tache) return res.status(404).json({ error: 'Tâche introuvable.' });

      // Un stagiaire ne peut que faire avancer ses propres tâches (pas revenir en arrière)
      if (reqUser.role === Role.STAGIAIRE) {
        const stag = await prisma.stagiaire.findUnique({ where: { userId: reqUser.id } });
        if (!stag || tache.stagiaireId !== stag.id) {
          return res.status(403).json({ error: 'Accès refusé.' });
        }
        const order = [TacheStatut.A_FAIRE, TacheStatut.EN_COURS, TacheStatut.EN_REVISION, TacheStatut.TERMINEE];
        if (order.indexOf(statut) < order.indexOf(tache.statut)) {
          return res.status(403).json({ error: 'Vous ne pouvez pas revenir à un statut précédent.' });
        }
      }

      const updated = await prisma.tache.update({ where: { id }, data: { statut } });

      return res.json({ message: `Statut mis à jour → ${statut}`, tache: updated });
    } catch (error) {
      return res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
    }
  },

  // ─── 5. MODIFIER UNE TÂCHE (tuteur / admin) ───────────────────────────────
  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { titre, description, priorite, deadline, statut } = req.body;
      const userId = (req as any).user?.id;

      const tache = await prisma.tache.findUnique({ where: { id } });
      if (!tache) return res.status(404).json({ error: 'Tâche introuvable.' });

      const updated = await prisma.tache.update({
        where: { id },
        data: {
          ...(titre       && { titre }),
          ...(description !== undefined && { description }),
          ...(priorite    && { priorite }),
          ...(deadline    && { deadline: new Date(deadline) }),
          ...(statut      && { statut }),
        },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'TACHE_UPDATE',
          cible: 'Tache',
          details: `Tâche "${tache.titre}" modifiée`,
          ip: req.ip,
        },
      });

      return res.json({ message: 'Tâche mise à jour.', tache: updated });
    } catch {
      return res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
    }
  },

  // ─── 6. SUPPRIMER UNE TÂCHE ───────────────────────────────────────────────
  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const tache = await prisma.tache.findUnique({ where: { id } });
      if (!tache) return res.status(404).json({ error: 'Tâche introuvable.' });

      await prisma.tache.delete({ where: { id } });
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'TACHE_DELETE',
          cible: 'Tache',
          details: `Tâche "${tache.titre}" supprimée`,
          ip: req.ip,
        },
      });

      return res.json({ message: 'Tâche supprimée.' });
    } catch {
      return res.status(500).json({ error: 'Erreur lors de la suppression.' });
    }
  },

  // ─── 7. TÂCHES EN RETARD (alertes) ────────────────────────────────────────
  enRetard: async (req: Request, res: Response) => {
    try {
      const reqUser = (req as any).user;
      const where: any = {
        deadline: { lt: new Date() },
        statut:   { not: TacheStatut.TERMINEE },
      };
      if (reqUser.role === Role.TUTEUR) {
        const stagiaires = await prisma.stagiaire.findMany({ where: { tuteurId: reqUser.id }, select: { id: true } });
        where.stagiaireId = { in: stagiaires.map(s => s.id) };
      }

      const taches = await prisma.tache.findMany({
        where,
        include: { stagiaire: { include: { user: { select: { nom: true, prenom: true } } } } },
        orderBy: { deadline: 'asc' },
      });

      return res.json({ total: taches.length, taches });
    } catch {
      return res.status(500).json({ error: 'Erreur lors du chargement.' });
    }
  },
};