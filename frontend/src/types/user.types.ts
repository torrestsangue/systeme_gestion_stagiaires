export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN_RH = "ADMIN_RH",
  TUTEUR = "TUTEUR",
  STAGIAIRE = "STAGIAIRE",
}

export interface User {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: UserRole;
  company?: string;
}