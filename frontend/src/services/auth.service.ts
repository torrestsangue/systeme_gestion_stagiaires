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
    // client-side cleanup handled by caller
    return data;
  },
};