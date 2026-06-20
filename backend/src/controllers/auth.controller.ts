// auth.controller.ts
import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;

if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
  throw new Error('JWT_SECRET ou JWT_REFRESH_SECRET manquant dans .env');
}

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

export const AuthController = {

    // ✅ 1. CONNEXION (Login)
    login: async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body;

            const user = await prisma.user.findUnique({
                where: { email }
            });

            if (!user) {
                return res.status(401).json({ error: "Email ou mot de passe incorrect." });
            }


            // 📢 SUPER LOGS DE DIAGNOSTIC :
            console.log("=== Données réelles de l'utilisateur en BDD ===");
            console.log(`Email  : ${user.email}`);
            console.log(`Actif  : ${user.actif} (Type: ${typeof user.actif})`);
            console.log(`Vérifié: ${user.is_verify} (Type: ${typeof user.is_verify})`);
            console.log(`Rôle   : ${user.role}`);
            console.log("==============================================");
            if (!user.actif) {
                return res.status(403).json({ error: "Ce compte est désactivé." });
            }

            if (!user.is_verify) {
                return res.status(403).json({ error: "Ce compte n'est pas encore vérifié. Veuillez valider votre e-mail." });
            }

            const isPasswordValid = await bcrypt.compare(password, user.password);

            if (!isPasswordValid) {
                return res.status(401).json({ error: "Email ou mot de passe incorrect." });
            }

            const accessToken = jwt.sign(
                { id: user.id, email: user.email, role: user.role, actif: user.actif, company: user.company },
                JWT_SECRET,
                { expiresIn: '1h' }
            );

            const refreshToken = jwt.sign(
                { id: user.id },
                JWT_REFRESH_SECRET,
                { expiresIn: '7d' }
            );

            await prisma.user.update({
                where: { id: user.id },
                data: { refreshToken }
            });

            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: "LOGIN",
                    cible: "Auth",
                    details: "Connexion réussie.",
                    ip: req.ip
                }
            });

            return res.status(200).json({
                message: "Connexion réussie",
                accessToken,
                refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    nom: user.nom,
                    prenom: user.prenom,
                    role: user.role,
                    company: user.company
                }
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: "Erreur lors de la connexion." });
        }
    },

    // ✅ 2. RAFRAÎCHISSEMENT DU JETON (Refresh Token)
    refreshToken: async (req: Request, res: Response) => {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(401).json({ error: "Refresh token manquant." });
            }

            const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: string };

            const user = await prisma.user.findUnique({ where: { id: decoded.id } });

            if (!user || user.refreshToken !== refreshToken || !user.actif) {
                return res.status(401).json({ error: "Session non autorisée ou invalide." });
            }

            const newAccessToken = jwt.sign(
                { id: user.id, email: user.email, role: user.role, actif: user.actif, company: user.company },
                JWT_SECRET,
                { expiresIn: "15m" }
            );

            return res.json({ accessToken: newAccessToken });

        } catch (err: any) {
            if (err.name === "TokenExpiredError") {
                return res.status(401).json({ error: "Session expirée. Reconnectez-vous." });
            }
            return res.status(401).json({ error: "Refresh token invalide." });
        }
    },

    // ✅ 3. DÉCONNEXION (Logout)
    logout: async (req: Request, res: Response) => {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({ error: "Refresh token manquant." });
            }

            const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as { id: string };

            await prisma.user.update({
                where: { id: decoded.id },
                data: { refreshToken: null }
            });

            await prisma.auditLog.create({
                data: {
                    userId: decoded.id,
                    action: "LOGOUT",
                    cible: "Auth",
                    details: "Déconnexion de l'utilisateur.",
                    ip: req.ip
                }
            });

            return res.status(200).json({ message: "Déconnexion réussie." });

        } catch (error) {
            return res.status(403).json({ error: "Refresh token invalide." });
        }
    },

    // ✅ 4. MOT DE PASSE OUBLIÉ - ENVOI DU CODE
    forgotPassword: async (req: Request, res: Response) => {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ error: "Email obligatoire." });
            }

            const user = await prisma.user.findUnique({ where: { email } });

            if (!user) {
                return res.status(404).json({ error: "Aucun compte associé à cet email." });
            }

            const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
            const expirationTime = new Date(Date.now() + 10 * 60000); // 10 minutes

            await prisma.user.update({
                where: { email },
                data: {
                    verificationCode: resetCode,
                    codeExpiresAt: expirationTime
                }
            });

            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: "Réinitialisation de votre mot de passe",
                html: `
                    <h2>Réinitialisation de mot de passe</h2>
                    <p>Voici votre code de réinitialisation :</p>
                    <h1 style="color: #4F46E5; letter-spacing: 2px;">${resetCode}</h1>
                    <p>Ce code expire dans <b>10 minutes</b>.</p>
                    <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
                `
            });

            return res.status(200).json({ message: "Code de réinitialisation envoyé par email." });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: "Erreur lors de l'envoi du code." });
        }
    },

    // ✅ 5. REINITIALISATION DU MOT DE PASSE
    resetPassword: async (req: Request, res: Response) => {
        try {
            const { email, verificationCode, newPassword } = req.body;

            if (!email || !verificationCode || !newPassword) {
                return res.status(400).json({ error: "Tous les champs sont obligatoires." });
            }

            const user = await prisma.user.findUnique({ where: { email } });

            if (!user) {
                return res.status(404).json({ error: "Utilisateur non trouvé." });
            }

            if (user.verificationCode !== verificationCode) {
                return res.status(400).json({ error: "Code invalide." });
            }

            if (user.codeExpiresAt && user.codeExpiresAt < new Date()) {
                return res.status(400).json({ error: "Le code de réinitialisation a expiré." });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);

            await prisma.user.update({
                where: { email },
                data: {
                    password: hashedPassword,
                    verificationCode: null,
                    codeExpiresAt: null
                }
            });

            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: "PASSWORD_RESET",
                    cible: "User",
                    details: "Mot de passe réinitialisé suite à un oubli.",
                    ip: req.ip
                }
            });

            return res.status(200).json({ message: "Mot de passe réinitialisé avec succès." });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ error: "Erreur lors de la réinitialisation." });
        }
    }
};