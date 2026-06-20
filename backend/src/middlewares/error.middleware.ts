

import { Request, Response, NextFunction } from 'express'

export interface CustomError extends Error {
  status?: number
  code?: string
  type?: string
}


export const notFoundMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const error: CustomError = new Error(
    `Route non trouvée : ${req.method} ${req.url}`
  )
  error.status = 404
  next(error)
}


export const errorMiddleware = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {

  console.error(`
    Erreur   : ${err.message}
    Status      : ${err.status || 500}
    URL         : ${req.method} ${req.url}
    Date        : ${new Date().toISOString()}
  `)


  if (err.code === 'P2002') {
    return res.status(409).json({
      message: "Cet email est déjà utilisé."
    })
  }


  if (err.code === 'P2025') {
    return res.status(404).json({
      message: "Utilisateur non trouvé."
    })
  }

  if (err.code === 'P2003') {
    return res.status(400).json({
      message: "Référence invalide."
    })
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      message: "Format JSON invalide dans le body."
    })
  }


  if (err.status === 404) {
    return res.status(404).json({
      message: err.message
    })
  }


  return res.status(err.status || 500).json({
    message: err.message || "Erreur interne du serveur.",
    detail: process.env.NODE_ENV === 'development'
      ? err.stack
      : undefined
  })
}