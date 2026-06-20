// src/controllers/users.controllers.ts
  import { Request, Response } from "express";
  import { prisma } from "../lib/prisma";
  import { AuthRequest } from "../middlewares/auth.middleware";
  import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
  import { sendWelcomeEmail } from '../services/emailService';

  const JWT_SECRET = process.env.JWT_SECRET!
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!

if (!JWT_SECRET) throw new Error('JWT_SECRET manquant dans .env')
if (!JWT_REFRESH_SECRET) throw new Error('JWT_REFRESH_SECRET manquant dans .env')

  export const usercontroller = {


CreateUser: async (req: Request, res: Response) => {
  const { Company_name, email, password, country, isFreeTrial } = req.body;

  // 1. Vérifier que tous les champs sont présents
  if (!Company_name || !email || !password || !country) {
    return res.status(400).json({ message: "Tous les champs sont obligatoires" });
  }

  // 2. Vérifier le format de l'email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Format d'email invalide" });
  }

  // 3. Vérifier si l'email existe déjà
  const emailExiste = await prisma.user.findUnique({ where: { email } });
  if (emailExiste) {
    return res.status(409).json({ message: "Cet email est déjà utilisé" });
  }

  // 4. Générer le code de vérification
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expirationTime   = new Date(Date.now() + 300000);

  // 5. Envoyer l'email D'ABORD
  try {
    await sendWelcomeEmail(email, verificationCode);
  } catch (err: any) {
    console.error("Erreur envoi email :", err);
    return res.status(400).json({
      message: "Adresse email inexistante ou invalide. Veuillez vérifier votre email et réessayer."
    });
  }

  // 6. Créer l'utilisateur + crédits en une seule transaction atomique
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Création systématique du compte
      const newUser = await tx.user.create({
        data: {
          Company_name,
          email,
          password: hashedPassword,
          country,
          verificationCode,
          codeExpire:       expirationTime,
        },
      });

      // 2. Ajout des crédits UNIQUEMENT si isFreeTrial est vrai
      if (isFreeTrial === true) {
        await tx.credit.create({
          data: {
            userId: newUser.id,
            amount: 10,
            transaction_type: "IN",
            description: "Bonus : Essai gratuit activé au clic",
          },
        });
      }

      return newUser;
    });

    return res.status(201).json({
      status: "success",
      // On adapte le message de retour pour le frontend
      message: isFreeTrial 
        ? "Inscription réussie ! 10 messages gratuits ont été ajoutés." 
        : "Inscription réussie !",
      user: result,
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de l'inscription" });
  }
},


  // verification du code BONUS

 VerifyEmail: async (req: Request, res: Response) => {
  const { email, code } = req.body;

  try {
    // 1. Chercher l'utilisateur
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // 2. Vérifier le code
    if (user.verificationCode !== code) {
      return res.status(400).json({ message: "Code de vérification incorrect" });
    }

    // 3. Vérifier l'expiration
    if (user.codeExpire && user.codeExpire < new Date()) {
      return res.status(400).json({ message: "Le temps est expiré. Veuillez redemander un code." });
    }

    // 4. Générer les tokens
    const accessToken = jwt.sign(
      {
        id:         user.id,
        email:      user.email,
        role:       user.role,
        is_active:  user.is_active,
        company:    user.Company_name,
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // 5. Tout mettre à jour en une seule requête
    await prisma.user.update({
      where: { email },
      data: {
        is_verify:        true,
        verificationCode: null,  // effacer le code
        codeExpire:       null,  // effacer l'expiration
        refreshToken,            // sauvegarder le refresh token
      },
    });

    // 6. Retourner les tokens ET les infos utilisateur
    return res.status(200).json({
        message: "Connexion réussie",
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            email: user.email,
            company: user.Company_name,
            role: user.role
        }
    });

  } catch (error) {
    console.error("Erreur VerifyEmail:", error);
    return res.status(500).json({ message: "Erreur lors de la vérification" });
  }
},
 
 
  ResendCode: async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email obligatoire" });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    // Si le compte est déjà vérifié, inutile de renvoyer un code
    if (user.is_verify) {
      return res.status(400).json({ message: "Ce compte est déjà vérifié" });
    }

    // Générer un nouveau code dans tous les cas
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expirationTime   = new Date(Date.now() + 300000); // 5 minutes

    await prisma.user.update({
      where: { email },
      data: {
        verificationCode: verificationCode,
        codeExpire:       expirationTime,
      },
    });

    // Renvoyer l'email avec le nouveau code
    sendWelcomeEmail(email, verificationCode)
      .catch((err: any) => console.error("Erreur envoi email :", err));

    return res.status(200).json({
      message:   "Nouveau code envoyé ! Consultez votre email.",
      expiresAt: expirationTime, // ← on renvoie l'heure d'expiration au frontend
    });

  } catch (error) {
    return res.status(500).json({ message: "Erreur lors du renvoi du code" });
  }
  },


  GetUser: async (req: Request, res: Response) => {
    const userId = Number(req.params.id);
    if(isNaN(userId)){
      return res.status(400).json({message: "ID invalide"})
    }
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          Company_name: true,
          email: true,
          country: true,
          role: true,
          is_active: true,
          created_at: true,
        }
      });

      if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
      }

      return res.status(200).json({ user });

    } catch (error) {
      console.error(error); 
      return res.status(500).json({ 
        message: "Erreur lors de la récupération de l'utilisateur",
        error: error instanceof Error ? error.message : error
      });
    }
  },

  // Modifier le profil utilisateur
  UpdateUser: async (req: Request, res: Response) => {
    try {
      const { id }                       = req.params;
      const { Company_name, email }      = req.body;

      const updated = await prisma.user.update({
        where: { id: Number(id) },
        data: {
          ...(Company_name && { Company_name }),
          ...(email        && { email }),
        },
      });

      return res.status(200).json({
        message: "Profil mis à jour.",
        user: {
          id:           updated.id,
          email:        updated.email,
          Company_name: updated.Company_name,
          role:         updated.role,
          is_active:    updated.is_active,
          is_verify:    updated.is_verify,
        }
      });
    } catch (error: any) {
      return res.status(500).json({ message: "Erreur serveur.", error: error.message });
    }
  },

  // Changer le mot de passe
  ChangePassword: async (req: Request, res: Response) => {
    try {
      const { id }                             = req.params;
      const { currentPassword, newPassword }   = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Champs obligatoires manquants." });
      }

      const user = await prisma.user.findUnique({ where: { id: Number(id) } });
      if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });

      // Vérifier l'ancien mot de passe
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Mot de passe actuel incorrect." });
      }
      // Hasher et sauvegarder le nouveau
      const hashed = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: Number(id) },
        data:  { password: hashed },
      });

      return res.status(200).json({ message: "Mot de passe modifié avec succès." });
    } catch (error: any) {
      return res.status(500).json({ message: "Erreur serveur.", error: error.message });
    }
  }

  };