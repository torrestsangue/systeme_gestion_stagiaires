import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { PresenceStatut, Role } from '@prisma/client';
import crypto from 'crypto';

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
const SESSION_DURATION_MS = 120 * 1000; // 120 secondes

const generateToken = () => crypto.randomBytes(32).toString('hex');

export const PresenceController = {

  // ─── 1. GÉNÉRER UNE SESSION QR (admin / tuteur — affiché sur l'écran entrée) ─
  genererSession: async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;

      // Expirer les anciennes sessions actives
      await prisma.presenceSession.updateMany({
        where: { expiresAt: { lt: new Date() } },
        data: {},   // prisma ne supporte pas delete via updateMany — on les garde pour l'historique
      });

      const token = generateToken();
      const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

      const session = await prisma.presenceSession.create({
        data: { token, expiresAt },
      });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'QR_GENERATED',
          cible: 'PresenceSession',
          details: `Session ${session.id} créée, expire à ${expiresAt.toISOString()}`,
          ip: req.ip,
        },
      });

      return res.json({
        sessionId: session.id,
        token,
        expiresAt,
        expiresInSeconds: Math.round(SESSION_DURATION_MS / 1000),
        // URL à encoder dans le QR : `${FRONTEND_URL}/pointer?token=${token}`
        qrUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/pointer?token=${token}`,
      });
    } catch (error) {
      console.error('PresenceController.genererSession:', error);
      return res.status(500).json({ error: 'Erreur lors de la génération du QR.' });
    }
  },

  // ─── 2. SESSION COURANTE ACTIVE (pour afficher le QR en temps réel) ────────
  sessionActive: async (_req: Request, res: Response) => {
    try {
      const session = await prisma.presenceSession.findFirst({
        where: { expiresAt: { gt: new Date() } },
        orderBy: { createdAt: 'desc' },
      });

      if (!session) {
        return res.status(404).json({ error: 'Aucune session QR active. Veuillez en générer une.' });
      }

      const expiresInSeconds = Math.max(0, Math.round((session.expiresAt.getTime() - Date.now()) / 1000));

      return res.json({
        sessionId: session.id,
        token: session.token,
        expiresAt: session.expiresAt,
        expiresInSeconds,
        qrUrl: `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/pointer?token=${session.token}`,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Erreur lors du chargement de la session.' });
    }
  },

  // ─── 3. POINTER (stagiaire scanne le QR) ──────────────────────────────────
  pointer: async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      const reqUser = (req as any).user;

      if (!token) return res.status(400).json({ error: 'Token QR manquant.' });

      // Récupérer le profil stagiaire
      const stagiaire = await prisma.stagiaire.findUnique({ where: { userId: reqUser.id } });
      if (!stagiaire) {
        return res.status(403).json({ error: 'Seul un stagiaire peut pointer sa présence.' });
      }

      // Vérifier la session QR
      const session = await prisma.presenceSession.findUnique({ where: { token } });
      if (!session) {
        return res.status(401).json({ error: 'QR Code invalide.' });
      }
      if (session.expiresAt < new Date()) {
        return res.status(401).json({ error: 'QR Code expiré. Scannez le code affiché sur l\'écran.' });
      }

      // Vérifier que le stage est en cours
      const now = new Date();
      if (now < stagiaire.dateDebut || now > stagiaire.dateFin) {
        return res.status(403).json({ error: 'Votre période de stage n\'est pas en cours.' });
      }

      // Empêcher double-pointage sur la même session
      const dejaPointe = await prisma.presence.findFirst({
        where: { stagiaireId: stagiaire.id, sessionId: session.id },
      });
      if (dejaPointe) {
        return res.status(409).json({
          error: 'Vous avez déjà pointé pour cette session.',
          presence: dejaPointe,
        });
      }

      // Déterminer le statut (PRESENT ou RETARD selon l'heure)
      const heureDebut = new Date();
      heureDebut.setHours(8, 0, 0, 0);  // Heure de début configurable
      const statut: PresenceStatut = now > new Date(heureDebut.getTime() + 15 * 60 * 1000)
        ? PresenceStatut.RETARD
        : PresenceStatut.PRESENT;

      // --- Vérifications On-site / Réseau ---
      const companyLat = process.env.COMPANY_LAT ? Number(process.env.COMPANY_LAT) : null;
      const companyLon = process.env.COMPANY_LON ? Number(process.env.COMPANY_LON) : null;
      const allowedRadius = process.env.PRESENCE_ALLOWED_RADIUS ? Number(process.env.PRESENCE_ALLOWED_RADIUS) : 200; // meters
      const allowedCidrs = process.env.COMPANY_ALLOWED_CIDRS ? process.env.COMPANY_ALLOWED_CIDRS.split(',').map(s => s.trim()).filter(Boolean) : [];

      const latitude = typeof req.body.latitude === 'number' ? req.body.latitude : (req.body.latitude ? Number(req.body.latitude) : null);
      const longitude = typeof req.body.longitude === 'number' ? req.body.longitude : (req.body.longitude ? Number(req.body.longitude) : null);

      const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const toRad = (v: number) => v * Math.PI / 180;
        const R = 6371000; // metres
        const dLat = toRad(lat2 - lat1);
        const dLon = toRad(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
      };

      const ipToInt = (ip: string) => {
        if (!ip) return null;
        // remove port if any
        ip = ip.split(':').slice(-1).pop() || ip;
        const parts = ip.split('.');
        if (parts.length !== 4) return null;
        return parts.reduce((acc, p) => (acc<<8) + Number(p), 0) >>> 0;
      };

      const cidrMatch = (ip: string, cidr: string) => {
        try {
          if (!ip || !cidr) return false;
          const [range, bitsStr] = cidr.split('/');
          const bits = Number(bitsStr || '32');
          const ipInt = ipToInt(ip);
          const rangeInt = ipToInt(range);
          if (ipInt === null || rangeInt === null) return false;
          const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
          return (ipInt & mask) === (rangeInt & mask);
        } catch {
          return false;
        }
      };

      let locationOk = false;
      let networkOk = false;

      if (companyLat !== null && companyLon !== null && latitude !== null && longitude !== null) {
        const dist = haversine(companyLat, companyLon, latitude, longitude);
        locationOk = dist <= allowedRadius;
      }

      // req.ip may be like ::ffff:127.0.0.1, normalize
      const clientIp = req.ip || (req.headers['x-forwarded-for'] as string | undefined) || '';
      for (const cidr of allowedCidrs) {
        if (cidrMatch(clientIp, cidr)) {
          networkOk = true;
          break;
        }
      }

      const requireOnSite = process.env.PRESENCE_REQUIRE_ON_SITE === 'true';
      if (requireOnSite && !(locationOk || networkOk)) {
        return res.status(403).json({ error: 'Présence refusée : vous devez être sur le site (géoloc) ou connecté au réseau de l’entreprise.', locationOk, networkOk });
      }

      const presence = await prisma.presence.create({
        data: {
          stagiaireId: stagiaire.id,
          sessionId:   session.id,
          statut,
          ip:        req.ip ?? null,
          latitude:  latitude ?? null,
          longitude: longitude ?? null,
          scannedAt: new Date(),
        },
      });

      return res.status(201).json({
        message: statut === PresenceStatut.PRESENT
          ? 'Présence enregistrée. Bonne journée !'
          : 'Présence enregistrée (retard signalé).',
        statut,
        presence,
        locationOk,
        networkOk,
      });
    } catch (error) {
      console.error('PresenceController.pointer:', error);
      return res.status(500).json({ error: 'Erreur lors du pointage.' });
    }
  },

  // ─── 4. POINTER EN TÉLÉTRAVAIL ────────────────────────────────────────────
  teletravail: async (req: Request, res: Response) => {
    try {
      const reqUser = (req as any).user;
      const stagiaire = await prisma.stagiaire.findUnique({ where: { userId: reqUser.id } });
      if (!stagiaire) return res.status(403).json({ error: 'Profil stagiaire introuvable.' });

      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay   = new Date(startOfDay.getTime() + 86400000);

      const existant = await prisma.presence.findFirst({
        where: { stagiaireId: stagiaire.id, scannedAt: { gte: startOfDay, lt: endOfDay } },
      });
      if (existant) {
        return res.status(409).json({ error: 'Présence déjà enregistrée pour aujourd\'hui.' });
      }

      const presence = await prisma.presence.create({
        data: {
          stagiaireId: stagiaire.id,
          statut: PresenceStatut.TELETRAVAIL,
          ip: req.ip ?? null,
          scannedAt: new Date(),
        },
      });

      return res.status(201).json({
        message: 'Télétravail déclaré. En attente de validation par votre tuteur.',
        presence,
      });
    } catch (error) {
      return res.status(500).json({ error: 'Erreur lors de la déclaration.' });
    }
  },

  // ─── 5. VALIDER UNE PRÉSENCE (tuteur / admin) ─────────────────────────────
  validerPresence: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { statut } = req.body;
      const userId = (req as any).user?.id;

      const validStatuts = Object.values(PresenceStatut);
      if (!validStatuts.includes(statut)) {
        return res.status(400).json({ error: `Statut invalide. Valeurs : ${validStatuts.join(', ')}` });
      }

      const presence = await prisma.presence.findUnique({ where: { id } });
      if (!presence) return res.status(404).json({ error: 'Présence introuvable.' });

      const updated = await prisma.presence.update({ where: { id }, data: { statut } });

      await prisma.auditLog.create({
        data: {
          userId,
          action: 'PRESENCE_VALIDATE',
          cible: 'Presence',
          details: `Présence ${id} → ${statut}`,
          ip: req.ip,
        },
      });

      return res.json({ message: 'Présence mise à jour.', presence: updated });
    } catch {
      return res.status(500).json({ error: 'Erreur lors de la validation.' });
    }
  },

  // ─── 6. TABLEAU DES PRÉSENCES DU JOUR ────────────────────────────────────
  presencesDuJour: async (_req: Request, res: Response) => {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay   = new Date(startOfDay.getTime() + 86400000);

      // Tous les stagiaires actifs
      const stagiaires = await prisma.stagiaire.findMany({
        where: { dateFin: { gte: today } },
        include: { user: { select: { nom: true, prenom: true, email: true } } },
      });

      const presences = await prisma.presence.findMany({
        where: { scannedAt: { gte: startOfDay, lt: endOfDay } },
        select: { stagiaireId: true, statut: true, scannedAt: true, ip: true },
      });

      const presenceMap = new Map(presences.map(p => [p.stagiaireId, p]));

      const liste = stagiaires.map(s => ({
        stagiaire:    { id: s.id, numeroDossier: s.numeroDossier, ...s.user },
        presence:     presenceMap.get(s.id) ?? null,
        statut:       presenceMap.get(s.id)?.statut ?? PresenceStatut.ABSENT,
        heurePointage: presenceMap.get(s.id)?.scannedAt ?? null,
      }));

      const resume = {
        total:       stagiaires.length,
        presents:    liste.filter(l => l.statut === PresenceStatut.PRESENT).length,
        retards:     liste.filter(l => l.statut === PresenceStatut.RETARD).length,
        absents:     liste.filter(l => l.statut === PresenceStatut.ABSENT).length,
        teletravail: liste.filter(l => l.statut === PresenceStatut.TELETRAVAIL).length,
      };

      return res.json({ date: startOfDay, resume, liste });
    } catch (error) {
      console.error('PresenceController.presencesDuJour:', error);
      return res.status(500).json({ error: 'Erreur lors du chargement des présences.' });
    }
  },

  // ─── 7. PRÉSENCE HEBDOMADAIRE (counts par jour, Lundi→Dimanche) ─────────
  semaine: async (_req: Request, res: Response) => {
    try {
      const now = new Date();
      const jourActuel = now.getDay(); // 0 = Dimanche
      const diff = now.getDate() - jourActuel + (jourActuel === 0 ? -6 : 1); // obtenir Lundi
      const debutSemaine = new Date(now);
      debutSemaine.setDate(diff);
      debutSemaine.setHours(0, 0, 0, 0);

      const finSemaine = new Date(debutSemaine);
      finSemaine.setDate(debutSemaine.getDate() + 7);

      const presences = await prisma.presence.findMany({
        where: { scannedAt: { gte: debutSemaine, lt: finSemaine } },
        select: { id: true, statut: true, scannedAt: true },
      });

      const joursLabel = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

      const data = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(debutSemaine);
        date.setDate(debutSemaine.getDate() + i);
        const label = joursLabel[date.getDay()];
        const count = presences.filter(p => {
          const d = new Date(p.scannedAt);
          return d.toLocaleDateString() === date.toLocaleDateString() && (p.statut === 'PRESENT' || p.statut === 'RETARD');
        }).length;
        return { jour: label, presents: count };
      });

      return res.json({ semaine: { debut: debutSemaine, fin: finSemaine }, data });
    } catch (error) {
      console.error('PresenceController.semaine:', error);
      return res.status(500).json({ error: 'Erreur lors du chargement des présences hebdomadaires.' });
    }
  },

  // ─── 7. HISTORIQUE DES PRÉSENCES D'UN STAGIAIRE ───────────────────────────
  historique: async (req: Request, res: Response) => {
    try {
      const { stagiaireId } = req.params;
      const { dateMin, dateMax, page = '1', limit = '30' } = req.query;
      const reqUser = (req as any).user;

      // Vérification des accès
      if (reqUser.role === Role.STAGIAIRE) {
        const stag = await prisma.stagiaire.findUnique({ where: { userId: reqUser.id } });
        if (!stag || stag.id !== stagiaireId) return res.status(403).json({ error: 'Accès refusé.' });
      }

      const where: any = { stagiaireId };
      if (dateMin) where.scannedAt = { ...where.scannedAt, gte: new Date(dateMin as string) };
      if (dateMax) where.scannedAt = { ...where.scannedAt, lte: new Date(dateMax as string) };

      const skip = (Number(page) - 1) * Number(limit);
      const [total, presences] = await Promise.all([
        prisma.presence.count({ where }),
        prisma.presence.findMany({
          where, orderBy: { scannedAt: 'desc' }, skip, take: Number(limit),
        }),
      ]);

      // Stats synthétiques
      const stats = {
        presents:    presences.filter(p => p.statut === PresenceStatut.PRESENT).length,
        retards:     presences.filter(p => p.statut === PresenceStatut.RETARD).length,
        absents:     presences.filter(p => p.statut === PresenceStatut.ABSENT).length,
        teletravail: presences.filter(p => p.statut === PresenceStatut.TELETRAVAIL).length,
      };

      return res.json({ total, stats, page: Number(page), limit: Number(limit), presences });
    } catch (error) {
      return res.status(500).json({ error: 'Erreur lors du chargement de l\'historique.' });
    }
  },
};