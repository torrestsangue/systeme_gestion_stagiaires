import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import crypto from 'crypto';

/* ─────────────────────────────────────────
   PONDÉRATIONS DE LA NOTE FINALE
   Modifiables selon votre règlement intérieur
───────────────────────────────────────── */
const POIDS = {
  ponctualite:  0.20,  // Présences / retards
  rapports:     0.20,  // Qualité et régularité des rapports
  taches:       0.30,  // Réalisation des tâches Kanban
  competences:  0.20,  // Compétences techniques évaluées par le tuteur
  comportement: 0.10,  // Attitude, communication, intégration
};

const calcNoteFinale = (notes: typeof POIDS extends Record<string, number> ? any : never) => {
  return (
    notes.ponctualite  * POIDS.ponctualite  +
    notes.rapports     * POIDS.rapports     +
    notes.taches       * POIDS.taches       +
    notes.competences  * POIDS.competences  +
    notes.comportement * POIDS.comportement
  );
};

const getMention = (note: number): string => {
  if (note >= 16) return 'Excellent';
  if (note >= 14) return 'Très bien';
  if (note >= 12) return 'Bien';
  if (note >= 10) return 'Passable';
  return 'Insuffisant';
};

export const EvaluationController = {

  // ─── 1. CRÉER / SOUMETTRE UNE ÉVALUATION ─────────────────────────────────
  create: async (req: Request, res: Response) => {
    try {
      const {
        stagiaireId,
        ponctualite, rapports, taches, competences, comportement,
        commentaire,
      } = req.body;
      const evaluateurId = (req as any).user?.id;

      if (!stagiaireId || ponctualite === undefined || rapports === undefined ||
          taches === undefined || competences === undefined || comportement === undefined) {
        return res.status(400).json({ error: 'Tous les critères de notation sont obligatoires.' });
      }

      // Valider les notes (0–20)
      const notes = { ponctualite, rapports, taches, competences, comportement };
      for (const [cle, val] of Object.entries(notes)) {
        if (Number(val) < 0 || Number(val) > 20) {
          return res.status(400).json({ error: `La note "${cle}" doit être entre 0 et 20.` });
        }
      }

      // Vérifier que le stagiaire existe
      const stagiaire = await prisma.stagiaire.findUnique({
        where: { id: stagiaireId },
        include: { user: { select: { nom: true, prenom: true, email: true } } },
      });
      if (!stagiaire) return res.status(404).json({ error: 'Stagiaire introuvable.' });

      // Empêcher une double évaluation
      const existing = await prisma.evaluation.findUnique({ where: { stagiaireId } });
      if (existing) {
        return res.status(409).json({
          error: 'Ce stagiaire a déjà une évaluation. Utilisez PUT /evaluations/:id pour la modifier.',
          evaluationId: existing.id,
        });
      }

      const noteFinale = calcNoteFinale({
        ponctualite: Number(ponctualite),
        rapports:    Number(rapports),
        taches:      Number(taches),
        competences: Number(competences),
        comportement: Number(comportement),
      });
      const mention = getMention(noteFinale);

      // Token d'authenticité pour QR sur l'attestation
      const attestationToken = crypto.randomBytes(24).toString('hex');

      const evaluation = await prisma.evaluation.create({
        data: {
          stagiaireId,
          evaluateurId,
          ponctualite:  Number(ponctualite),
          rapports:     Number(rapports),
          taches:       Number(taches),
          competences:  Number(competences),
          comportement: Number(comportement),
          noteFinale:   Math.round(noteFinale * 100) / 100,
          mention,
          commentaire,
          attestationToken,
        },
        include: {
          stagiaire:  { include: { user: { select: { nom: true, prenom: true, email: true } } } },
          evaluateur: { select: { nom: true, prenom: true, role: true } },
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: evaluateurId,
          action: 'EVALUATION_CREATE',
          cible: 'Evaluation',
          details: `Évaluation créée pour ${stagiaireId} — note finale : ${noteFinale.toFixed(2)} (${mention})`,
          ip: req.ip,
        },
      });

      return res.status(201).json({
        message: 'Évaluation enregistrée avec succès.',
        evaluation,
        poids: POIDS,
        verificationUrl: `${process.env.FRONTEND_URL}/verifier-attestation/${attestationToken}`,
      });
    } catch (error) {
      console.error('EvaluationController.create:', error);
      return res.status(500).json({ error: "Erreur lors de la création de l'évaluation." });
    }
  },

  // ─── 2. MODIFIER UNE ÉVALUATION ───────────────────────────────────────────
  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { ponctualite, rapports, taches, competences, comportement, commentaire } = req.body;
      const userId = (req as any).user?.id;

      const evaluation = await prisma.evaluation.findUnique({ where: { id } });
      if (!evaluation) return res.status(404).json({ error: 'Évaluation introuvable.' });

      const notes = {
        ponctualite:  Number(ponctualite  ?? evaluation.ponctualite),
        rapports:     Number(rapports     ?? evaluation.rapports),
        taches:       Number(taches       ?? evaluation.taches),
        competences:  Number(competences  ?? evaluation.competences),
        comportement: Number(comportement ?? evaluation.comportement),
      };

      const noteFinale = calcNoteFinale(notes);
      const mention    = getMention(noteFinale);

      const updated = await prisma.evaluation.update({
        where: { id },
        data: {
          ...notes,
          noteFinale: Math.round(noteFinale * 100) / 100,
          mention,
          ...(commentaire !== undefined && { commentaire }),
        },
        include: {
          stagiaire:  { include: { user: { select: { nom: true, prenom: true } } } },
          evaluateur: { select: { nom: true, prenom: true } },
        },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'EVALUATION_UPDATE',
          cible: 'Evaluation',
          details: `Évaluation ${id} modifiée → ${noteFinale.toFixed(2)} (${mention})`,
          ip: req.ip,
        },
      });

      return res.json({ message: 'Évaluation mise à jour.', evaluation: updated, poids: POIDS });
    } catch (error) {
      return res.status(500).json({ error: "Erreur lors de la mise à jour de l'évaluation." });
    }
  },

  // ─── 3. ÉVALUATION D'UN STAGIAIRE ─────────────────────────────────────────
  getByStagiaire: async (req: Request, res: Response) => {
    try {
      const { stagiaireId } = req.params;
      const reqUser = (req as any).user;

      // Un stagiaire ne peut voir que sa propre évaluation
      if (reqUser.role === 'STAGIAIRE') {
        const stag = await prisma.stagiaire.findUnique({ where: { userId: reqUser.id } });
        if (!stag || stag.id !== stagiaireId) return res.status(403).json({ error: 'Accès refusé.' });
      }

      const evaluation = await prisma.evaluation.findUnique({
        where: { stagiaireId },
        include: {
          stagiaire:  { include: { user: { select: { nom: true, prenom: true, email: true } } } },
          evaluateur: { select: { nom: true, prenom: true, role: true } },
        },
      });

      if (!evaluation) {
        return res.status(404).json({ error: 'Aucune évaluation trouvée pour ce stagiaire.' });
      }

      return res.json({
        evaluation,
        poids: POIDS,
        detail: {
          ponctualite:  { note: evaluation.ponctualite,  poids: POIDS.ponctualite,  contribution: evaluation.ponctualite  * POIDS.ponctualite  },
          rapports:     { note: evaluation.rapports,     poids: POIDS.rapports,     contribution: evaluation.rapports     * POIDS.rapports     },
          taches:       { note: evaluation.taches,       poids: POIDS.taches,       contribution: evaluation.taches       * POIDS.taches       },
          competences:  { note: evaluation.competences,  poids: POIDS.competences,  contribution: evaluation.competences  * POIDS.competences  },
          comportement: { note: evaluation.comportement, poids: POIDS.comportement, contribution: evaluation.comportement * POIDS.comportement },
        },
        verificationUrl: evaluation.attestationToken
          ? `${process.env.FRONTEND_URL}/verifier-attestation/${evaluation.attestationToken}`
          : null,
      });
    } catch (error) {
      return res.status(500).json({ error: "Erreur lors du chargement de l'évaluation." });
    }
  },

  // ─── 4. LISTE DE TOUTES LES ÉVALUATIONS ───────────────────────────────────
  list: async (req: Request, res: Response) => {
    try {
      const { mention, page = '1', limit = '20' } = req.query;
      const where: any = {};
      if (mention) where.mention = mention;

      const skip = (Number(page) - 1) * Number(limit);
      const [total, items] = await Promise.all([
        prisma.evaluation.count({ where }),
        prisma.evaluation.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip, take: Number(limit),
          include: {
            stagiaire:  { include: { user: { select: { nom: true, prenom: true } } } },
            evaluateur: { select: { nom: true, prenom: true } },
          },
        }),
      ]);

      return res.json({ total, page: Number(page), limit: Number(limit), items });
    } catch {
      return res.status(500).json({ error: 'Erreur lors du chargement.' });
    }
  },

  // ─── 5. VÉRIFICATION D'AUTHENTICITÉ (public — QR code attestation) ────────
  verifierAttestation: async (req: Request, res: Response) => {
    try {
      const { token } = req.params;

      const evaluation = await prisma.evaluation.findUnique({
        where: { attestationToken: token },
        include: {
          stagiaire: {
            include: { user: { select: { nom: true, prenom: true } } },
          },
          evaluateur: { select: { nom: true, prenom: true } },
        },
      });

      if (!evaluation) {
        return res.status(404).json({
          valide: false,
          message: 'Attestation introuvable ou token invalide.',
        });
      }

      return res.json({
        valide: true,
        message: 'Attestation authentique.',
        stagiaire: {
          nom:     evaluation.stagiaire.user.nom,
          prenom:  evaluation.stagiaire.user.prenom,
          domaine: evaluation.stagiaire.domaine,
          dateDebut: evaluation.stagiaire.dateDebut,
          dateFin:   evaluation.stagiaire.dateFin,
        },
        evaluation: {
          noteFinale: evaluation.noteFinale,
          mention:    evaluation.mention,
          evaluateur: `${evaluation.evaluateur.prenom} ${evaluation.evaluateur.nom}`,
          delivreeLe: evaluation.createdAt,
        },
      });
    } catch (error) {
      return res.status(500).json({ error: "Erreur lors de la vérification." });
    }
  },

  // ─── 6. SAUVEGARDER L'URL DE L'ATTESTATION PDF ────────────────────────────
  setAttestationUrl: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { attestationUrl } = req.body;
      const userId = (req as any).user?.id;

      await prisma.evaluation.update({
        where: { id },
        data: { attestationUrl },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'ATTESTATION_UPLOAD',
          cible: 'Evaluation',
          details: `Attestation PDF uploadée pour évaluation ${id}`,
          ip: req.ip,
        },
      });

      return res.json({ message: 'URL de l\'attestation enregistrée.' });
    } catch {
      return res.status(500).json({ error: "Erreur lors de la mise à jour." });
    }
  },
};