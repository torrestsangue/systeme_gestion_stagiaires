import api from "./api";
import { LoginRequest, LoginResponse } from "../types";

export const AuthService = {
  login: async (payload: LoginRequest): Promise<LoginResponse> => {
    const { data } = await api.post<LoginResponse>("/login", payload);
    return data;
  },

  refresh: async (refreshToken: string) => {
    const { data } = await api.post<{ accessToken: string }>("/refresh", { refreshToken });
    return data.accessToken;
  },

  logout: async (refreshToken: string) => {
    const { data } = await api.post<{ message: string }>("/logout", { refreshToken });
    return data;
  },

  // ➕ AJOUTEZ CE BLOC :
  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const { data } = await api.post<{ message: string }>("/forgot-password", { email });
    return data;
  },
};