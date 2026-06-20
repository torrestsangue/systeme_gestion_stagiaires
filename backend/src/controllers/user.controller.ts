// user.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';
import bcrypt from 'bcrypt';

export const UserController = {

  // ─── 1. LISTE DES UTILISATEURS ────────────────────────────────────────────
  list: async (req: Request, res: Response) => {
    try {
      const { role, actif, search, page = '1', limit = '20' } = req.query;

      const where: any = {};
      if (role)  where.role  = role;
      if (actif !== undefined) where.actif = actif === 'true';
      if (search) {
        where.OR = [
          { nom:    { contains: search as string, mode: 'insensitive' } },
          { prenom: { contains: search as string, mode: 'insensitive' } },
          { email:  { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [total, items] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip, take: Number(limit),
          select: {
            id: true, email: true, nom: true, prenom: true,
            telephone: true, role: true, actif: true,
            is_verify: true, company: true, createdAt: true,
            stagiaire: { select: { id: true, numeroDossier: true, domaine: true } },
          },
        }),
      ]);

      return res.json({ total, page: Number(page), limit: Number(limit), items });
    } catch (error) {
      return res.status(500).json({ error: 'Erreur lors du chargement des utilisateurs.' });
    }
  },

  // ─── 2. PROFIL D'UN UTILISATEUR ───────────────────────────────────────────
  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const reqUser = (req as any).user;

      // Un utilisateur standard ne peut voir que son propre profil
      if (reqUser.role !== Role.SUPER_ADMIN && reqUser.role !== Role.ADMIN_RH && reqUser.id !== id) {
        return res.status(403).json({ error: 'Accès refusé.' });
      }

      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true, email: true, nom: true, prenom: true,
          telephone: true, role: true, actif: true, is_verify: true,
          company: true, createdAt: true, updatedAt: true,
          stagiaire: {
            include: {
              taches:    { orderBy: { createdAt: 'desc' }, take: 5 },
              rapports:  { orderBy: { date: 'desc' }, take: 5 },
              paiements: { orderBy: { datePrevue: 'desc' } },
              evaluation: true,
            },
          },
        },
      });

      if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });
      return res.json(user);
    } catch {
      return res.status(500).json({ error: 'Erreur lors du chargement.' });
    }
  },

  // ─── 3. CRÉER UN UTILISATEUR ADMIN / TUTEUR / RH ──────────────────────────
  createAdmin: async (req: Request, res: Response) => {
    try {
      const { email, nom, prenom, telephone, role, company } = req.body;
      const adminId = (req as any).user?.id;

      if (!email || !nom || !prenom || !role) {
        return res.status(400).json({ error: 'email, nom, prenom et role sont obligatoires.' });
      }

      const rolesAutorisés = [Role.ADMIN_RH, Role.TUTEUR, Role.SUPER_ADMIN];
      if (!rolesAutorisés.includes(role)) {
        return res.status(400).json({ error: `Rôle invalide. Valeurs : ${rolesAutorisés.join(', ')}` });
      }

      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) return res.status(409).json({ error: 'Email déjà utilisé.' });

      const tempPassword = `SGS@${Math.floor(1000 + Math.random() * 9000)}`;
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const user = await prisma.user.create({
        data: {
          email, nom, prenom, telephone, company,
          password: hashedPassword,
          role,
          is_verify: true,
          actif: true,
        },
        select: {
          id: true, email: true, nom: true, prenom: true,
          role: true, actif: true, createdAt: true,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'USER_CREATE',
          cible: 'User',
          details: `Compte ${role} créé : ${email}`,
          ip: req.ip,
        },
      });

      return res.status(201).json({
        message: 'Compte créé.',
        tempPassword,  // À envoyer par email en production
        user,
      });
    } catch (error) {
      console.error('UserController.createAdmin:', error);
      return res.status(500).json({ error: 'Erreur lors de la création.' });
    }
  },

  // ─── 4. METTRE À JOUR UN UTILISATEUR ─────────────────────────────────────
  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { nom, prenom, telephone, company, role } = req.body;
      const reqUser = (req as any).user;

      // Seul l'admin peut changer le rôle
      if (role && reqUser.role !== Role.SUPER_ADMIN) {
        return res.status(403).json({ error: 'Seul le Super Admin peut modifier les rôles.' });
      }

      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(nom       && { nom }),
          ...(prenom    && { prenom }),
          ...(telephone && { telephone }),
          ...(company   && { company }),
          ...(role      && { role }),
        },
        select: { id: true, email: true, nom: true, prenom: true, role: true, actif: true },
      });

      await prisma.auditLog.create({
        data: {
          userId: reqUser.id,
          action: 'USER_UPDATE',
          cible: 'User',
          details: `Profil ${id} mis à jour`,
          ip: req.ip,
        },
      });

      return res.json({ message: 'Profil mis à jour.', user });
    } catch {
      return res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
    }
  },

  // ─── 5. CHANGER SON PROPRE MOT DE PASSE ──────────────────────────────────
  changePassword: async (req: Request, res: Response) => {
    try {
      const { ancienMotDePasse, nouveauMotDePasse } = req.body;
      const userId = (req as any).user?.id;

      if (!ancienMotDePasse || !nouveauMotDePasse) {
        return res.status(400).json({ error: 'ancienMotDePasse et nouveauMotDePasse sont obligatoires.' });
      }
      if (nouveauMotDePasse.length < 8) {
        return res.status(400).json({ error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

      const valid = await bcrypt.compare(ancienMotDePasse, user.password);
      if (!valid) return res.status(401).json({ error: 'Ancien mot de passe incorrect.' });

      const hashed = await bcrypt.hash(nouveauMotDePasse, 10);
      await prisma.user.update({ where: { id: userId }, data: { password: hashed } });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'PASSWORD_CHANGE',
          cible: 'User',
          details: 'Mot de passe changé.',
          ip: req.ip,
        },
      });

      return res.json({ message: 'Mot de passe mis à jour.' });
    } catch {
      return res.status(500).json({ error: 'Erreur lors du changement de mot de passe.' });
    }
  },

  // ─── 6. ACTIVER / DÉSACTIVER UN COMPTE ───────────────────────────────────
  toggleActif: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const adminId = (req as any).user?.id;

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

      // Empêcher l'auto-désactivation
      if (id === adminId) {
        return res.status(400).json({ error: 'Vous ne pouvez pas désactiver votre propre compte.' });
      }

      const newActif = !user.actif;
      await prisma.user.update({ where: { id }, data: { actif: newActif } });

      await prisma.auditLog.create({
        data: {
          userId: adminId,
          action: newActif ? 'USER_ACTIVATE' : 'USER_DEACTIVATE',
          cible: 'User',
          details: `Compte ${id} → ${newActif ? 'activé' : 'désactivé'}`,
          ip: req.ip,
        },
      });

      return res.json({ message: `Compte ${newActif ? 'activé' : 'désactivé'}.`, actif: newActif });
    } catch {
      return res.status(500).json({ error: 'Erreur lors de la mise à jour.' });
    }
  },

  // ─── 7. SUPPRIMER UN UTILISATEUR (super admin) ───────────────────────────
  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const adminId = (req as any).user?.id;

      if (id === adminId) {
        return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' });
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

      await prisma.user.delete({ where: { id } });

      await prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'USER_DELETE',
          cible: 'User',
          details: `Compte supprimé : ${user.email}`,
          ip: req.ip,
        },
      });

      return res.json({ message: 'Utilisateur supprimé.' });
    } catch {
      return res.status(500).json({ error: 'Erreur lors de la suppression.' });
    }
  },

  // ─── 8. JOURNAL D'AUDIT (super admin) ────────────────────────────────────
  auditLogs: async (req: Request, res: Response) => {
    try {
      const { userId, action, page = '1', limit = '50' } = req.query;

      const where: any = {};
      if (userId) where.userId = userId;
      if (action) where.action = { contains: action as string, mode: 'insensitive' };

      const skip = (Number(page) - 1) * Number(limit);
      const [total, logs] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip, take: Number(limit),
          include: { user: { select: { nom: true, prenom: true, email: true, role: true } } },
        }),
      ]);

      return res.json({ total, page: Number(page), limit: Number(limit), logs });
    } catch {
      return res.status(500).json({ error: 'Erreur lors du chargement des logs.' });
    }
  },
};