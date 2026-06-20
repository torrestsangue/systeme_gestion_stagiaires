import api from './api';

export const userService = {
  list: () => api.get('/users').then((r) => r.data),
  stagiaires: () => api.get('/stagiaires').then((r) => r.data),
  myStagiaire: () => api.get('/stagiaires/me').then((r) => r.data),
};
