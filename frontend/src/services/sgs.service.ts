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

// ─── 3. SERVICES STAGIAIRES (INDISPENSABLE POUR ASSIGNATIONS) ───────────────
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

// ─── 5. SERVICES PRÉSENCES (ÉMARGEMENT & QR CODE EN PARFAITE SYNC BACKEND) ──
export const presenceService = {
  // 1. Générer une session QR (admin / tuteur) -> PresenceController.genererSession
  genererSession: () => api.post('/presences/session').then((r) => r.data),
  
  // 2. Récupérer la session QR courante active -> PresenceController.sessionActive
  sessionActive: () => api.get('/presences/session-active').then((r) => r.data),
  
  // 3. Pointer (le stagiaire scanne le QR / envoie le token) -> PresenceController.pointer
  pointer: (data: { token: string; latitude?: number; longitude?: number }) => 
    api.post('/presences/pointer', data).then((r) => r.data),
    
  // 4. Déclarer le télétravail -> PresenceController.teletravail
  teletravail: () => api.post('/presences/teletravail').then((r) => r.data),

  // 5. Valider / Modifier manuellement une présence -> PresenceController.validerPresence
  validerPresence: (id: string, statut: string) =>
    api.patch(`/presences/${id}/valider`, { statut }).then((r) => r.data),
    
  // 6. Tableau de bord des présences du jour -> PresenceController.presencesDuJour
  presencesDuJour: () => api.get('/presences/jour').then((r) => r.data),

  // 7. Historique complet d'un stagiaire spécifique (avec pagination/filtres optionnels) -> PresenceController.historique
  obtenirHistoriqueStagiaire: (stagiaireId: string, params?: { dateMin?: string; dateMax?: string; page?: number; limit?: number }) =>
    api.get(`/presences/historique/${stagiaireId}`, { params }).then((r) => r.data),
};

// ─── 6. SERVICES PAIEMENTS & COMPTABILITÉ ──────────────────────────────────
export const paiementService = {
  list: () => api.get('/paiements').then((r) => r.data),
  create: (data: any) => api.post('/paiements', data).then((r) => r.data),
  changerStatut: (id: string, statut: string) =>
    api.patch(`/paiements/${id}/statut`, { statut }).then((r) => r.data),
  stats: () => api.get('/paiements/dashboard/stats').then((r) => r.data),
};

// ─── 7. SERVICES ÉVALUATIONS DE STAGE ──────────────────────────────────────
export const evaluationService = {
  list: () => api.get('/evaluations').then((r) => r.data),
  create: (data: any) => api.post('/evaluations', data).then((r) => r.data),
  getByStagiaire: (stagiaireId: string) => api.get(`/evaluations/${stagiaireId}`).then((r) => r.data),
};
