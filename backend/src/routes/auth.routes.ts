import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { usercontroller } from "../controllers/users.controllers"; // Gère l'auth de base (Create, Verify...)
import { InscriptionController } from "../controllers/inscription.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { upload } from "../middlewares/upload";
import { UserController } from "../controllers/user.controller"; // Gère la liste et l'administration des users
import { stagiaireController } from "../controllers/stagiaire.controller";
import { TacheController } from "../controllers/tache.controller";
import { RapportController } from "../controllers/rapport.controller";
import { PaiementController } from "../controllers/paiement.controller";
import { PresenceController } from "../controllers/presence.controller";
import { EvaluationController } from "../controllers/evaluation.controller";

const authRouter = Router();

// Diagnostic imports: afficher types pour détecter handlers manquants
console.log('Handlers types:', {
  usercontroller: typeof usercontroller,
  CreateUser: usercontroller ? typeof (usercontroller as any).CreateUser : 'undefined',
  AuthController: typeof AuthController,
  login: AuthController ? typeof (AuthController as any).login : 'undefined',
  InscriptionController: typeof InscriptionController,
  inscriptionCreate: InscriptionController ? typeof (InscriptionController as any).create : 'undefined',
  uploadSingle: upload ? typeof upload.single : 'undefined',
  UserController: typeof UserController,
  stagiaireController: typeof stagiaireController,
});

/**
 * ─── AUTHENTIFICATION ──────────────────────────────────────────────────────
 */
authRouter.post("/register",        usercontroller.CreateUser);
authRouter.post("/verify-email",    usercontroller.VerifyEmail);
authRouter.post("/resend-code",     usercontroller.ResendCode);
authRouter.post("/login",           AuthController.login);
authRouter.post("/refresh",         AuthController.refreshToken);
authRouter.post("/logout",          AuthController.logout);
authRouter.post("/forgot-password", AuthController.forgotPassword);
authRouter.post("/reset-password",  AuthController.resetPassword);

/**
 * ─── INSCRIPTIONS / CANDIDATURES ───────────────────────────────────────────
 */
authRouter.post("/inscriptions", InscriptionController.create);
authRouter.get("/inscriptions",           authenticate, InscriptionController.list);
authRouter.get("/inscriptions/:id",       authenticate, InscriptionController.getById);
authRouter.patch("/inscriptions/:id/status", authenticate, InscriptionController.updateStatus);
authRouter.post("/inscriptions/import",   authenticate, InscriptionController.importMasse);
authRouter.delete("/inscriptions/:id",    authenticate, InscriptionController.delete);

// Upload de fichiers (CV / Lettre de motivation)
authRouter.post("/upload", upload.single("file"), (req, res) => {
  try {
    const file = (req as any).file;
    if (!file) return res.status(400).json({ error: "Aucun fichier reçu." });
    const url = `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
    return res.json({ url });
  } catch (err) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: "Erreur upload fichier." });
  }
});

/**
 * ─── GESTION DES UTILISATEURS (USERS) ──────────────────────────────────────
 */
authRouter.get('/users',              authenticate, UserController.list);
authRouter.get('/users/audit',        authenticate, UserController.auditLogs);
authRouter.get('/users/:id',          authenticate, UserController.getById);
authRouter.post('/users',             authenticate, UserController.createAdmin);
authRouter.put('/users/:id',          authenticate, UserController.update);
authRouter.patch('/users/:id/password', authenticate, UserController.changePassword); // 💡 Corrigé : UserController avec U majuscule
authRouter.patch('/users/:id/actif',    authenticate, UserController.toggleActif);    // 💡 Corrigé : UserController avec U majuscule
authRouter.delete('/users/:id',           authenticate, UserController.delete);

/**
 * ─── STAGIAIRES ────────────────────────────────────────────────────────────
 */
authRouter.post('/stagiaires',            authenticate, stagiaireController.create);
authRouter.get('/stagiaires',             authenticate, stagiaireController.list);
authRouter.get('/stagiaires/stats',       authenticate, stagiaireController.stats);
authRouter.get('/stagiaires/:id',         authenticate, stagiaireController.getById);
authRouter.put('/stagiaires/:id',         authenticate, stagiaireController.update);
authRouter.patch('/stagiaires/:id/actif', authenticate, stagiaireController.toggleActif);

/**
 * ─── TÂCHES ────────────────────────────────────────────────────────────────
 */
authRouter.post('/taches',            authenticate, TacheController.create);
authRouter.get('/taches',             authenticate, TacheController.list);
authRouter.get('/taches/en-retard',   authenticate, TacheController.enRetard);
authRouter.get('/taches/:id',         authenticate, TacheController.getById);
authRouter.put('/taches/:id',         authenticate, TacheController.update);
authRouter.patch('/taches/:id/statut', authenticate, TacheController.updateStatut);
authRouter.delete('/taches/:id',      authenticate, TacheController.delete);

/**
 * ─── RAPPORTS ──────────────────────────────────────────────────────────────
 */
authRouter.post('/rapports',           authenticate, RapportController.create);
authRouter.get('/rapports',            authenticate, RapportController.list);
authRouter.get('/rapports/manquants',  authenticate, RapportController.manquants);
authRouter.get('/rapports/:id',        authenticate, RapportController.getById);
authRouter.patch('/rapports/:id/valider', authenticate, RapportController.valider);
authRouter.delete('/rapports/:id',     authenticate, RapportController.delete);

/**
 * ─── PAIEMENTS ─────────────────────────────────────────────────────────────
 */

authRouter.get('/paiements',                 authenticate, PaiementController.list);
authRouter.post('/paiements',                authenticate, PaiementController.create);
authRouter.get('/paiements/dashboard/stats', authenticate, PaiementController.dashboard);
authRouter.patch('/paiements/:id/statut',    authenticate, PaiementController.changerStatut);

// Route publique pour recevoir les réponses des APIs de paiement (Momo/Orange) sans token d'authentification
authRouter.post('/paiements/webhook',        PaiementController.webhookVerification);

/**
 * ─── PRÉSENCES (QR CODES) ──────────────────────────────────────────────────
 */
/**
 * ─── PRÉSENCES (QR CODES) ──────────────────────────────────────────────────
 */
authRouter.post('/presences/session',                 authenticate, PresenceController.genererSession);
authRouter.get('/presences/session-active',           authenticate, PresenceController.sessionActive);
authRouter.post('/presences/pointer',                  authenticate, PresenceController.pointer); // ✅ Corrigé !
authRouter.post('/presences/teletravail',              authenticate, PresenceController.teletravail);
authRouter.patch('/presences/:id/valider',            authenticate, PresenceController.validerPresence);
authRouter.get('/presences/jour',                     authenticate, PresenceController.presencesDuJour);
authRouter.get('/presences/historique/:stagiaireId', authenticate, PresenceController.historique);

/**
 * ─── ÉVALUATIONS ───────────────────────────────────────────────────────────
 */
authRouter.get('/evaluations',               authenticate, EvaluationController.list);
authRouter.post('/evaluations',              authenticate, EvaluationController.create);
authRouter.get('/evaluations/:stagiaireId', authenticate, EvaluationController.getByStagiaire);

export default authRouter;