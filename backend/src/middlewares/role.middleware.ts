

import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth.middleware'


export const roleMiddleware = (...rolesAutorises: string[]) => {
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {

   
    if (!req.user) {
      return res.status(401).json({
        message: "Non authentifié. Token manquant."
      })
    }


    if (!req.user.is_active) {
      return res.status(403).json({
        message: "Compte désactivé. Contactez l'administrateur."
      })
    }

    const roleUser = req.user.role

   
    if (!rolesAutorises.includes(roleUser)) {
      return res.status(403).json({
        message: `Accès refusé. Rôle requis : ${rolesAutorises.join(' ou ')}`,
        votreRole: roleUser
      })
    }

    next()
  }
}

export const adminOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {

  if (!req.user) {
    return res.status(401).json({
      message: "Non authentifié."
    })
  }

 
  if (!req.user.is_active) {
    return res.status(403).json({
      message: "Compte désactivé."
    })
  }

  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      message: "Accès refusé. Réservé aux administrateurs.",
      votreRole: req.user.role
    })
  }

  next()
}


export const entrepriseOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {

  if (!req.user) {
    return res.status(401).json({
      message: "Non authentifié."
    })
  }

 
  if (!req.user.is_active) {
    return res.status(403).json({
      message: "Compte désactivé."
    })
  }

  if (req.user.role !== 'ENTREPRISE' && req.user.role !== 'ADMIN') {
    return res.status(403).json({
      message: "Accès refusé. Réservé aux entreprises.",
      votreRole: req.user.role
    })
  }

  next()
}