// À ajouter dans votre auth.service.ts ou équivalent
export const authService = {
  // ... vos autres méthodes (login, register, etc.)

  forgotPassword: async (email: string) => {
    // Appel à votre API (ajustez la route selon votre backend)
    const response = await axios.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string) => {
    // Appel à votre API avec le token reçu par email
    const response = await axios.post('/auth/reset-password', { token, newPassword });
    return response.data;
  }
};