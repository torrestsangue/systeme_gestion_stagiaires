
import { Response, NextFunction } from "express";
import { prisma }      from "../lib/prisma.js";
import { AuthRequest } from "./auth.middleware.js";

export const apiLogger = (
  req:  AuthRequest,
  res:  Response,
  next: NextFunction
) => {
  res.on("finish", async () => {
    try {
      if (req.user?.id) {
        await prisma.apiLog.create({
          data: {
            userId:   req.user.id,
            endpoint: req.originalUrl,
            method:   req.method,
            status:   res.statusCode,
          },
        });
      }
    } catch (error) {
      console.error("Erreur apiLogger:", error);
    }
  });
  next();
};