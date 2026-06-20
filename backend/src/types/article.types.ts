export interface CreateArticleDTO {
  titre:     string;
  date:      string; // Ajouté
  categorie: string;
  auteur:    string;
  statut?:   "publie" | "brouillon";
}

export interface UpdateArticleDTO {
  titre?:     string;
  date?:      string; // Ajouté
  categorie?: string;
  auteur?:    string;
  statut?:    "publie" | "brouillon";
}