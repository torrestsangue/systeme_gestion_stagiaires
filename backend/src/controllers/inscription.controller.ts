import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import bcrypt from 'bcrypt';
import { InscriptionStatus, Role } from '@prisma/client';
import nodemailer from 'nodemailer';
/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
const genNumeroDossier = () => {
  const year = new Date().getFullYear();
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `DOS-${year}-${rand}`;
};

// Configure transporter: prefer explicit SMTP config, fallback to Gmail, else JSON transport for testing
const transporter = (() => {
  if (process.env.SMTP_HOST) {
    const port = Number(process.env.SMTP_PORT) || 587;
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  }

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // No SMTP configured: use JSON transport so mails appear in logs (safe for local dev)
  console.warn('Aucun SMTP configuré — utilisation du transport JSON (emails non envoyés).');
  return nodemailer.createTransport({ jsonTransport: true });
})();

transporter.verify((error, success) => {
  if (error) {
    console.log('Erreur SMTP :', error);
  } else {
    console.log('SMTP connecté');
  }
});
export const InscriptionController = {

  // ─── 1. CRÉER UNE CANDIDATURE (public) ─────────────────────────────────────
  create: async (req: Request, res: Response) => {
    try {
      const { nom, prenom, email, telephone, domaine, periode, cvUrl, motivationUrl } = req.body;

      if (!nom || !prenom || !email || !domaine || !periode) {
        return res.status(400).json({ error: 'Champs obligatoires manquants : nom, prenom, email, domaine, periode.' });
      }

      // Empêcher doublon d'email en cours d'examen
      const existing = await prisma.inscription.findFirst({
        where: {
          email,
          status: { notIn: [InscriptionStatus.REFUSEE] },
        },
      });
      if (existing) {
        return res.status(409).json({
          error: 'Une candidature avec cet email est déjà en cours de traitement.',
          numeroDossier: existing.numeroDossier,
        });
      }

      let numeroDossier = genNumeroDossier();
      // Garantir unicité
      while (await prisma.inscription.findUnique({ where: { numeroDossier } })) {
        numeroDossier = genNumeroDossier();
      }

      const inscription = await prisma.inscription.create({
        data: { numeroDossier, nom, prenom, email, telephone, domaine, periode, cvUrl, motivationUrl },
      });

      await prisma.auditLog.create({
        data: {
          action: 'INSCRIPTION_CREATE',
          cible: 'Inscription',
          details: `Nouvelle candidature reçue : ${numeroDossier} (${email})`,
          ip: req.ip,
        },
      });

      try {
        const adminEmails = new Set<string>();
        if (process.env.ADMIN_NOTIFICATION_EMAIL) {
          adminEmails.add(process.env.ADMIN_NOTIFICATION_EMAIL);
        }

        // Adresse de l'admin (fixe) — s'assurer qu'elle reçoit toujours les notifications
        adminEmails.add('bryantsangue@gmail.com');

        const admins = await prisma.user.findMany({
          where: { role: { in: [Role.SUPER_ADMIN, Role.ADMIN_RH] } },
          select: { email: true },
        });

        admins.forEach((admin) => adminEmails.add(admin.email));

        if (adminEmails.size > 0) {
          void transporter.sendMail({
            from: `"SGS Notification" <${process.env.EMAIL_USER || 'no-reply@sgs.local'}>`,
            to: Array.from(adminEmails).join(', '),
            subject: `Nouvelle candidature reçue : ${nom} ${prenom}`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:auto;">
                <h2>Nouvelle candidature</h2>
                <p>Une nouvelle candidature a été déposée sur la plateforme SGS :</p>
                <ul>
                  <li><strong>Nom :</strong> ${nom} ${prenom}</li>
                  <li><strong>Email :</strong> ${email}</li>
                  <li><strong>Domaine :</strong> ${domaine}</li>
                  <li><strong>Période :</strong> ${periode}</li>
                  <li><strong>Numéro de dossier :</strong> ${numeroDossier}</li>
                </ul>
                <p>Consultez le tableau des candidatures pour traiter cette demande.</p>
              </div>
            `,
          }).catch((err) => console.error('Erreur envoi email admin candidature :', err));
        }
      } catch (mailError) {
        console.error('Erreur notification admin candidatures :', mailError);
      }

      return res.status(201).json({
        message: 'Candidature soumise avec succès. Le service RH reviendra vers vous sous 5 jours ouvrés.',
        numeroDossier,
        id: inscription.id,
      });
    } catch (error) {
      console.error('InscriptionController.create:', error);
      return res.status(500).json({ error: 'Erreur lors de la création de la candidature.' });
    }
  },

  // ─── 2. LISTE DES CANDIDATURES (admin / RH) ───────────────────────────────
  list: async (req: Request, res: Response) => {
    try {
      const { status, domaine, search, page = '1', limit = '20' } = req.query;

      const where: any = {};
      if (status)  where.status  = status;
      if (domaine) where.domaine = { contains: domaine as string, mode: 'insensitive' };
      if (search) {
        where.OR = [
          { nom:           { contains: search as string, mode: 'insensitive' } },
          { prenom:        { contains: search as string, mode: 'insensitive' } },
          { email:         { contains: search as string, mode: 'insensitive' } },
          { numeroDossier: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [total, items] = await Promise.all([
        prisma.inscription.count({ where }),
        prisma.inscription.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: Number(limit),
        }),
      ]);

      return res.json({ total, page: Number(page), limit: Number(limit), items });
    } catch (error) {
      console.error('InscriptionController.list:', error);
      return res.status(500).json({ error: 'Erreur lors du chargement des candidatures.' });
    }
  },

  // ─── 3. DÉTAIL D'UNE CANDIDATURE ──────────────────────────────────────────
  getById: async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const inscription = await prisma.inscription.findUnique({ where: { id } });
      if (!inscription) return res.status(404).json({ error: 'Candidature introuvable.' });
      return res.json(inscription);
    } catch (error) {
      return res.status(500).json({ error: 'Erreur lors de la récupération.' });
    }
  },

  // ─── 4. CHANGER LE STATUT (admin / RH) — CORRIGÉ ET SÉCURISÉ 🛠️ ───────────
  // ─── 4. CHANGER LE STATUT (admin / RH) — VERSION SÉCURISÉE ET CORRIGÉE 🛠️ ─
  updateStatus: async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { status, commentaire, password } = req.body;
      const adminId = (req as any).user?.id;

      // 1. Trouver l'inscription d'origine
      const inscription = await prisma.inscription.findUnique({
        where: { id }
      });

      if (!inscription) {
        return res.status(404).json({ error: 'Candidature introuvable.' });
      }

      // Refus : mise à jour et envoi de notification au candidat
      if (status === InscriptionStatus.REFUSEE) {
        const updated = await prisma.inscription.update({
          where: { id },
          data: { status, commentaire }
        });

        try {
          await transporter.sendMail({
            from: `"SGS RH" <${process.env.EMAIL_USER || 'no-reply@sgs.local'}>`,
            to: inscription.email,
            subject: 'Votre candidature SGS a été refusée',
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:auto;">
                <h2>Bonjour ${inscription.prenom} ${inscription.nom},</h2>
                <p>Nous vous remercions pour votre candidature au sein de SGS.</p>
                <p>Après examen, votre dossier n'a pas été retenu pour le moment.</p>
                ${commentaire ? `<p><strong>Message RH :</strong> ${commentaire}</p>` : ''}
                <p>Nous vous souhaitons une bonne continuation et restons à votre disposition pour de futures opportunités.</p>
              </div>
            `,
          });
        } catch (mailError) {
          console.error('Erreur envoi email refus candidature :', mailError);
        }

        await prisma.auditLog.create({
          data: {
            userId: adminId,
            action: 'INSCRIPTION_STATUS',
            cible: 'Inscription',
            details: `${inscription.numeroDossier} refusé`,
            ip: req.ip
          }
        });

        return res.json({ message: `Statut mis à jour -> ${status}`, inscription: updated });
      }

      if (status !== InscriptionStatus.ACCEPTEE) {
        const updated = await prisma.inscription.update({
          where: { id },
          data: { status, commentaire }
        });
        return res.json({ message: `Statut mis à jour -> ${status}`, inscription: updated });
      }

      /* ─────────────────────────────────────────────────────────────────
         LOGIQUE D'ACCEPTATION : SÉCURISATION TRANSACTIONNELLE BDD
         ───────────────────────────────────────────────────────────────── */
      const passwordTemp = typeof password === 'string' && password.trim() ? password.trim() : 'Stagiaire123!';
      const passwordHash = await bcrypt.hash(passwordTemp, 10);

      // Adaptation automatique du numéro de dossier pour correspondre aux filtres (DOS-XXXX -> STG-XXXX)
      const matriculeStagiaire = inscription.numeroDossier.replace('DOS-', 'STG-');

      const result = await prisma.$transaction(async (tx) => {
        // a. Mise à jour de l'état de l'inscription
        const updatedInscription = await tx.inscription.update({
          where: { id },
          data: { status, commentaire }
        });

        // b. Upsert/Gestion de l'utilisateur (Vérification préalable d'existence)
        let user = await tx.user.findUnique({ where: { email: inscription.email } });

        if (!user) {
          user = await tx.user.create({
            data: {
              nom: inscription.nom,
              prenom: inscription.prenom,
              email: inscription.email,
              telephone: inscription.telephone || '',
              password: passwordHash,
              role: Role.STAGIAIRE,
              actif: true,
              is_verify: true
            }
          });
        } else {
          // Si l'utilisateur possède déjà un compte, on s'assure qu'il reçoit l'accès Stagiaire et qu'il soit vérifié
          const updateData: any = {
            role: Role.STAGIAIRE,
            actif: true,
            is_verify: true,
          };
          if (passwordTemp) {
            updateData.password = passwordHash;
          }
          user = await tx.user.update({
            where: { id: user.id },
            data: updateData
          });
        }

        // c. Vérification d'un profil Stagiaire existant pour éviter les plantages de contraintes uniques
        let stagiaire = await tx.stagiaire.findUnique({ where: { userId: user.id } });

        if (!stagiaire) {
          stagiaire = await tx.stagiaire.create({
            data: {
              userId: user.id,
              numeroDossier: matriculeStagiaire,
              domaine: inscription.domaine,
              dateDebut: new Date(), 
              dateFin: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // Période de 90 jours par défaut
              cvUrl: inscription.cvUrl || null,
              motivationUrl: inscription.motivationUrl || null,
            }
          });
        }

        return { updatedInscription, user };
      });

      /* ─────────────────────────────────────────────────────────────────
         ENVOI DU MAIL DE BIENVENUE (Isolé pour ne jamais bloquer la BDD)
         ───────────────────────────────────────────────────────────────── */
      try {
        const emailSender = process.env.EMAIL_USER || 'no-reply@sgs.local';
        await transporter.sendMail({
          from: `"SGS RH" <${emailSender}>`,
          to: inscription.email,
          subject: "Validation de votre candidature SGS",
          html: `
            <h2>Félicitations ${inscription.prenom} ${inscription.nom}</h2>
            <p>Votre candidature a été acceptée avec succès.</p>
            <p>Voici vos accès pour vous connecter à votre espace personnel :</p>
            <ul>
              <li><strong>Identifiant (Email) :</strong> ${inscription.email}</li>
              <li><strong>Mot de passe temporaire :</strong> ${passwordTemp}</li>
            </ul>
            <p><em>Par mesure de sécurité, nous vous invitons à modifier ce mot de passe dès votre première connexion.</em></p>
            <p>Numéro de matricule stagiaire : <strong>${matriculeStagiaire}</strong></p>
            <br/>
            <p>SGS - Service RH</p>
          `,
        });
        console.log(`[SMTP] Notification d'activation envoyée à ${inscription.email}`);
      } catch (mailError) {
        // En cas de coupure réseau ou de mauvaise configuration des variables d'environnement (.env)
        console.error("[SMTP] Alerte : Échec de l'envoi de l'email, mais le compte stagiaire a bien été validé en BDD :", mailError);
      }

      // Enregistrement d'audit
      await prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'INSCRIPTION_STATUS',
          cible: 'Inscription',
          details: `${inscription.numeroDossier} validé -> Stagiaire actif crée (${matriculeStagiaire})`,
          ip: req.ip
        }
      });

      return res.json({
        message: `Statut mis à jour -> ${status}. Compte utilisateur et profil stagiaire opérationnels.`,
        inscription: result.updatedInscription
      });

    } catch (error) {
      console.error('Erreur critique détectée lors du traitement de updateStatus:', error);
      return res.status(500).json({
        error: 'Une erreur technique interne a empêché la validation du dossier.'
      });
    }
  },

  // ─── 5. IMPORT EN MASSE CSV/JSON ──────────────────────────────────────────
  importMasse: async (req: Request, res: Response) => {
    try {
      const { candidatures } = req.body; // tableau d'objets
      const userId = (req as any).user?.id;

      if (!Array.isArray(candidatures) || candidatures.length === 0) {
        return res.status(400).json({ error: 'Tableau "candidatures" vide ou absent.' });
      }

      const results = { created: 0, skipped: 0, errors: [] as string[] };

      for (const c of candidatures) {
        try {
          const { nom, prenom, email, domaine, periode, telephone } = c;
          if (!nom || !prenom || !email || !domaine || !periode) {
            results.errors.push(`Ligne ignorée (champs manquants) : ${email || 'email inconnu'}`);
            results.skipped++;
            continue;
          }

          const exists = await prisma.inscription.findFirst({
            where: { email, status: { notIn: [InscriptionStatus.REFUSEE] } },
          });
          if (exists) { results.skipped++; continue; }

          let numeroDossier = genNumeroDossier();
          while (await prisma.inscription.findUnique({ where: { numeroDossier } })) {
            numeroDossier = genNumeroDossier();
          }

          await prisma.inscription.create({
            data: { numeroDossier, nom, prenom, email, telephone, domaine, periode },
          });
          results.created++;
        } catch {
          results.errors.push(`Erreur sur : ${c?.email || '?'}`);
          results.skipped++;
        }
      }

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'INSCRIPTION_IMPORT',
          cible: 'Inscription',
          details: `Import masse : ${results.created} créées, ${results.skipped} ignorées`,
          ip: req.ip,
        },
      });

      return res.json(results);
    } catch (error) {
      console.error('InscriptionController.importMasse:', error);
      return res.status(500).json({ error: "Erreur lors de l'import en masse." });
    }
  },

  // ─── 6. SUPPRIMER (admin seulement) ──────────────────────────────────────
  delete: async (req: Request, res: Response) => {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await prisma.inscription.findUniqueOrThrow({ where: { id } });
      await prisma.inscription.delete({ where: { id } });
      return res.json({ message: 'Candidature supprimée.' });
    } catch {
      return res.status(404).json({ error: 'Candidature introuvable.' });
    }
  },
};