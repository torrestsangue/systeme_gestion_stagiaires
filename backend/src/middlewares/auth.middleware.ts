import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET!;

/* ─────────────────────────────────────────
   1. VÉRIFIER LE TOKEN JWT
   Injecte req.user = { id, email, role, actif, company }
───────────────────────────────────────── */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant.' });
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    if (!decoded.actif) {
      return res.status(403).json({ error: 'Compte désactivé.' });
    }

    (req as any).user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expirée. Reconnectez-vous.' });
    }
    return res.status(401).json({ error: 'Token invalide.' });
  }
};

/* ─────────────────────────────────────────
   2. AUTORISER CERTAINS RÔLES
   Usage : authorize(Role.SUPER_ADMIN, Role.ADMIN_RH)
───────────────────────────────────────── */
export const authorize = (...roles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || !roles.includes(user.role)) {
      return res.status(403).json({
        error: 'Accès refusé. Permissions insuffisantes.',
        required: roles,
        current: user?.role ?? 'unknown',
      });
    }
    next();
  };
};

/* ─────────────────────────────────────────
   3. RACCOURCIS SÉMANTIQUES
───────────────────────────────────────── */
export const onlySuperAdmin = authorize(Role.SUPER_ADMIN);
export const onlyAdmins     = authorize(Role.SUPER_ADMIN, Role.ADMIN_RH);
export const onlyStaff      = authorize(Role.SUPER_ADMIN, Role.ADMIN_RH, Role.TUTEUR);
export const allRoles       = authorize(Role.SUPER_ADMIN, Role.ADMIN_RH, Role.TUTEUR, Role.STAGIAIRE);