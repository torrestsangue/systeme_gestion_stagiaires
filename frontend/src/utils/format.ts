export const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

export const fmtDateTime = (d: string | Date) =>
  new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// Table de correspondance devise affichée → code ISO 4217 valide
// Intl.NumberFormat n'accepte que les codes ISO officiels (XAF, EUR, USD…)
// "FCFA" est un nom vernaculaire, pas un code ISO → il faut mapper vers XAF
const DEVISE_ISO: Record<string, string> = {
  FCFA: 'XAF',
  CFA:  'XAF',
  XAF:  'XAF',
  XOF:  'XOF',
  EUR:  'EUR',
  USD:  'USD',
  GBP:  'GBP',
};

export const fmtMontant = (m: number, devise = 'XAF'): string => {
  const isoCode = DEVISE_ISO[devise?.toUpperCase()] ?? devise ?? 'XAF';
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: isoCode }).format(m);
  } catch {
    // Fallback si le code devise est inconnu : affiche juste le nombre + libellé
    return `${new Intl.NumberFormat('fr-FR').format(m)} ${devise}`;
  }
};