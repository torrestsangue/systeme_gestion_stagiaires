// src/store/auth.store.ts
// Store unique — branché sur api.ts (axios avec baseURL http://localhost:4000/api/auth)
import { create } from "zustand";
import api from "../services/api";

interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  company?: string;
}

interface AuthState {
  user:         User | null;
  token:        string | null;
  refreshToken: string | null;
  loading:      boolean;

  init:    () => void;
  login:   (email: string, password: string) => Promise<void>;
  logout:  () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:         null,
  token:        localStorage.getItem("token"),
  refreshToken: localStorage.getItem("refreshToken"),
  loading:      true,

  // ── Initialisation au démarrage (App.tsx ou main.tsx)
  init: () => {
    const token        = localStorage.getItem("token");
    const refreshToken = localStorage.getItem("refreshToken");
    const raw          = localStorage.getItem("user");
    set({
      token,
      refreshToken,
      user:    raw ? JSON.parse(raw) : null,
      loading: false,
    });
  },

  // ── Connexion — POST /api/auth/login via api.ts
  login: async (email: string, password: string) => {
    // api.ts a déjà baseURL = "http://localhost:4000/api/auth"
    const { data } = await api.post("/login", { email, password });
    // data = { message, accessToken, refreshToken, user }

    localStorage.setItem("token",        data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("user",         JSON.stringify(data.user));

    set({
      token:        data.accessToken,
      refreshToken: data.refreshToken,
      user:         data.user,
      loading:      false,
    });
  },

  // ── Déconnexion — POST /api/auth/logout (best-effort)
  logout: () => {
    const refreshToken = get().refreshToken ?? localStorage.getItem("refreshToken");
    if (refreshToken) {
      api.post("/logout", { refreshToken }).catch(() => {});
    }
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    set({ token: null, refreshToken: null, user: null });
  },
}));