export enum InscriptionStatus {
  EN_ATTENTE = "EN_ATTENTE",
  ACCEPTEE = "ACCEPTEE",
  REFUSEE = "REFUSEE",
}

export interface Inscription {
  id: string;
  numeroDossier: string;

  nom: string;
  prenom: string;

  email: string;
  telephone?: string;

  domaine: string;
  periode: string;

  cvUrl?: string;
  motivationUrl?: string;

  status: InscriptionStatus;
  commentaire?: string;

  createdAt: string;
}