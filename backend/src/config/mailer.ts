// src/config/mailer.ts
import nodemailer from 'nodemailer';

import dotenv from 'dotenv';

// 1. Charger les variables d'environnement
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  // 2. Convertir le port en nombre et ajouter une valeur par défaut (587 pour secure: false)
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: true, 
  auth: {
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS,
  },
});

// transporter.verify((error, success) => {
//   if (error) {
//     console.error("Erreur de configuration Email :", error);
//   } else {
//     console.log("Serveur d'email prêt à envoyer des messages");
//   }
// });

export default transporter;