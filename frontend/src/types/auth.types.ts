import { User } from "./user.types";

export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: string;
  company?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;

  login: (
    email: string,
    password: string
  ) => Promise<void>;

  logout: () => void;

  init: () => void;
}