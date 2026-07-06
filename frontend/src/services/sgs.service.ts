import api from './api';

// ─── 1. SERVICES INSCRIPTIONS / CANDIDATURES ────────────────────────────────
export const inscriptionService = {
  create: (data: any) => api.post('/inscriptions', data).then((r) => r.data),
  list: () => api.get('/inscriptions').then((r) => r.data),
  valider: (id: string, status: string, commentaire?: string) =>
    api.patch(`/inscriptions/${id}/status`, { status, commentaire }).then((r) => r.data),
  uploadFile: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post('/upload', fd).then((r) => r.data.url);
  },
};

// ─── 2. SERVICES TÂCHES (KANBAN) ────────────────────────────────────────────
export const tacheService = {
  list: (params?: any) => api.get('/taches', { params }).then((r) => r.data),
  create: (data: any) => api.post('/taches', data).then((r) => r.data),
  updateStatut: (id: string, statut: string) =>
    api.patch(`/taches/${id}/statut`, { statut }).then((r) => r.data),
  remove: (id: string) => api.delete(`/taches/${id}`).then((r) => r.data),
  enRetard: () => api.get('/taches/en-retard').then((r) => r.data),
};

// ─── 3. SERVICES STAGIAIRES ──────────────────────────────────────────────────
export const stagiaireService = {
  list: () => api.get('/stagiaires').then((r) => r.data),
  create: (data: any) => api.post('/stagiaires', data).then((r) => r.data),
  getById: (id: string) => api.get(`/stagiaires/${id}`).then((r) => r.data),
  stats: () => api.get('/stagiaires/stats').then((r) => r.data),
  toggleActif: (id: string) => api.patch(`/stagiaires/${id}/actif`).then((r) => r.data),
};

// ─── 4. SERVICES RAPPORTS D'ACTIVITÉ ────────────────────────────────────────
export const rapportService = {
  list: () => api.get('/rapports').then((r) => r.data),
  create: (data: any) => api.post('/rapports', data).then((r) => r.data),
  manquants: () => api.get('/rapports/manquants').then((r) => r.data),
  valider: (id: string, commentaire?: string) =>
    api.patch(`/rapports/${id}/valider`, { commentaire }).then((r) => r.data),
};

// ─── 5. SERVICES PRÉSENCES ───────────────────────────────────────────────────
export const presenceService = {
  genererSession: () => api.post('/presences/session').then((r) => r.data),
  sessionActive: () => api.get('/presences/session-active').then((r) => r.data),
  pointer: (data: { token: string; latitude?: number; longitude?: number }) =>
    api.post('/presences/pointer', data).then((r) => r.data),
  teletravail: () => api.post('/presences/teletravail').then((r) => r.data),
  validerPresence: (id: string, statut: string) =>
    api.patch(`/presences/${id}/valider`, { statut }).then((r) => r.data),
  presencesDuJour: () => api.get('/presences/jour').then((r) => r.data),
  obtenirHistoriqueStagiaire: (
    stagiaireId: string,
    params?: { dateMin?: string; dateMax?: string; page?: number; limit?: number }
  ) => api.get(`/presences/historique/${stagiaireId}`, { params }).then((r) => r.data),
};

// ─── 6. SERVICES PAIEMENTS & COMPTABILITÉ ────────────────────────────────────
export const paiementService = {

  // Liste avec filtres optionnels — transmet stagiaireId en query string pour le filtrage rôle STAGIAIRE
  list: (params?: {
    stagiaireId?: string | null;
    statut?: string;
    dateMin?: string;
    dateMax?: string;
    page?: number;
    limit?: number;
  }) => api.get('/paiements', { params }).then((r) => r.data),

  // Crée une nouvelle fiche de paiement (admin)
  create: (data: {
    stagiaireId: string;
    montant: number;
    devise?: string;
    datePrevue: string;
    reference?: string;
  }) => api.post('/paiements', data).then((r) => r.data),

  // Enregistre une tranche de versement → POST /paiements/:id/tranches
  // S'aligne sur : authRouter.post('/paiements/:id/tranches', ...);
  enregistrerTranche: (payload: {
    paiementId: string;   // UUID du paiement parent
    montant: number;
    reference?: string;
    methode?: string;     // défaut côté backend : MOMO
    telephone?: string;
  }) =>
    api
      .post(`/paiements/${payload.paiementId}/tranches`, {
        montant:   payload.montant,
        reference: payload.reference,
        methode:   payload.methode,
        telephone: payload.telephone,
      })
      .then((r) => r.data),

  // Solde un paiement en totalité → PATCH /paiements/:id/solder
  // S'aligne sur : authRouter.patch('/paiements/:id/solder', ...);
  changerStatut: (id: string, _statut?: 'PAYE') =>
    api.patch(`/paiements/${id}/solder`).then((r) => r.data),

  // Valide une tranche en attente → PATCH /paiements/tranches/:id/valider
  validerTranche: (id: string) =>
    api.patch(`/paiements/tranches/${id}/valider`).then((r) => r.data),

  // Statistiques du dashboard financier
  stats: () => api.get('/paiements/dashboard/stats').then((r) => r.data),
};

// ─── 7. SERVICES ÉVALUATIONS ─────────────────────────────────────────────────
export const evaluationService = {
  list: () => api.get('/evaluations').then((r) => r.data),
  create: (data: any) => api.post('/evaluations', data).then((r) => r.data),
  getByStagiaire: (stagiaireId: string) =>
    api.get(`/evaluations/${stagiaireId}`).then((r) => r.data),
};