import { useEffect, useState, useMemo, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  CreditCard,
  Calendar,
  PlusCircle,
  CheckCircle,
  AlertCircle,
  History,
  ClipboardList,
  UserPlus,
} from 'lucide-react';

import { paiementService, stagiaireService } from '../services/sgs.service';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../store/auth.store';
import { fmtMontant, fmtDate } from '../utils/format';

const tone: Record<string, 'neutral' | 'warning' | 'success' | 'danger'> = {
  PLANIFIE: 'neutral',
  EN_ATTENTE: 'warning',
  PAYE: 'success',
  PARTIEL: 'warning',
  LITIGE: 'danger',
};

// ─── HELPER : normalise la réponse de stagiaireService.list() ──────────────
// Adapte cette fonction si la forme de ta réponse diffère
// (ex: { data: [...] } au lieu de { items: [...] }).
function normalizeStagiaireList(response: any): any[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

// ─── HELPER : résout le stagiaireId du user actuellement connecté ─────────
// Stratégie robuste à plusieurs niveaux, du plus direct au plus coûteux :
//   1) Le store d'auth contient déjà l'id stagiaire (cas idéal, zéro appel réseau)
//   2) Un appel dédié /stagiaires/me existe côté backend
//   3) Repli : on cherche dans la liste des stagiaires celui dont userId correspond
async function resolveStagiaireId(user: any): Promise<string | null> {
  if (!user) return null;

  // 1) Champs possibles directement sur l'objet user du store
  const directCandidates = [user.stagiaireId, user.stagiaire?.id];
  for (const candidate of directCandidates) {
    if (candidate) return candidate;
  }

  // 2) Endpoint dédié, si disponible côté backend
  try {
    if (stagiaireService?.getMonProfil) {
      const profil = await stagiaireService.getMonProfil();
      const id = profil?.id ?? profil?.stagiaire?.id;
      if (id) return id;
    }
  } catch {
    // Pas grave, on tente le repli ci-dessous
  }

  // 3) Repli : recherche dans la liste complète par correspondance userId
  try {
    const response = await stagiaireService.list();
    const liste = normalizeStagiaireList(response);
    const match = liste.find((s: any) => s.userId === user.id || s.user?.id === user.id);
    return match?.id ?? null;
  } catch {
    return null;
  }
}

export default function Paiements() {
  // ─── ÉTATS & AUTH CONFIG ──────────────────────────────────────────────────
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const isAdmin = role !== 'STAGIAIRE';

  const [list, setList] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);

  // Id stagiaire résolu pour l'utilisateur connecté (uniquement pertinent si role === 'STAGIAIRE')
  const [monStagiaireId, setMonStagiaireId] = useState<string | null>(null);
  const [resolvingProfil, setResolvingProfil] = useState(role === 'STAGIAIRE');

  // États pour la gestion des fenêtres modales — versement de tranche
  const [activePaiement, setActivePaiement] = useState<any>(null);
  const [showTrancheModal, setShowTrancheModal] = useState(false);
  const [montantTranche, setMontantTranche] = useState('');
  const [referenceTranche, setReferenceTranche] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // États pour la modale de création de paiement (admin uniquement)
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [stagiaires, setStagiaires] = useState<any[]>([]);
  const [loadingStagiaires, setLoadingStagiaires] = useState(false);
  const [creation, setCreation] = useState({
    stagiaireId: '',
    montant: '',
    devise: 'FCFA',
    datePrevue: '',
    reference: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  // ─── RÉSOLUTION DU STAGIAIRE CONNECTÉ (une seule fois) ─────────────────────
  useEffect(() => {
    if (role !== 'STAGIAIRE') {
      setResolvingProfil(false);
      return;
    }
    let cancelled = false;
    setResolvingProfil(true);
    resolveStagiaireId(user).then((id) => {
      if (cancelled) return;
      setMonStagiaireId(id);
      setResolvingProfil(false);
      if (!id) {
        toast.error("Impossible d'identifier votre dossier stagiaire. Contactez l'administration.");
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, user?.id]);

  // ─── SYNCHRONISATION DES DONNÉES BACKEND ──────────────────────────────────
  const reload = useCallback(() => {
    // Un stagiaire ne doit jamais déclencher la requête tant que son id n'est pas résolu,
    // sinon il verrait temporairement (ou par erreur) les paiements de tout le monde.
    if (role === 'STAGIAIRE' && !monStagiaireId) return;

    setIsLoading(true);
    const params = role === 'STAGIAIRE' ? { stagiaireId: monStagiaireId } : undefined;

    paiementService
      .list(params)
      .then((response: any) => {
        if (response && response.items) {
          setList(response.items);
          if (response.budget) {
            setStats({
              total: response.budget.total ?? 0,
              paye: response.budget.paye ?? 0,
              enAttente: response.budget.attente ?? 0,
              nombre: response.total ?? 0,
            });
          }
        } else if (Array.isArray(response)) {
          setList(response);
        } else {
          setList([]);
        }
      })
      .catch((err) => {
        console.error('Erreur de chargement des paiements:', err);
        setList([]);
        setStats({});
      })
      .finally(() => setIsLoading(false));
  }, [role, monStagiaireId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // ─── CHARGEMENT DE LA LISTE DES STAGIAIRES (pour le modal admin) ──────────
  const ouvrirCreationModal = () => {
    setShowCreationModal(true);
    if (stagiaires.length === 0) {
      setLoadingStagiaires(true);
      stagiaireService
        .list()
        .then((response: any) => setStagiaires(normalizeStagiaireList(response)))
        .catch(() => {
          toast.error('Impossible de charger la liste des stagiaires.');
          setStagiaires([]);
        })
        .finally(() => setLoadingStagiaires(false));
    }
  };

  // ─── ACTIONS : ENREGISTREMENT ET VALIDATION DES TRANCHES ──────────────────
  const handleAjouterTranche = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePaiement) return;

    const montantNum = parseFloat(montantTranche);
    const resteAPayer = activePaiement.montant - (activePaiement.montantPaye ?? 0);

    if (isNaN(montantNum) || montantNum <= 0) {
      return toast.error('Veuillez entrer un montant valide supérieur à 0.');
    }
    if (montantNum > resteAPayer) {
      return toast.error(`Le montant excède le reste à payer (${fmtMontant(resteAPayer, activePaiement.devise)}).`);
    }

    setIsSubmitting(true);
    try {
      const payload = {
        paiementId: activePaiement.id,
        montant: montantNum,
        reference: referenceTranche,
        statut: role === 'STAGIAIRE' ? 'EN_ATTENTE' : 'PAYE',
      };

      await paiementService.enregistrerTranche(payload);

      toast.success(
        role === 'STAGIAIRE'
          ? 'Preuve de paiement soumise avec succès, en attente de vérification !'
          : 'Tranche de paiement validée et encaissée.'
      );

      setShowTrancheModal(false);
      setActivePaiement(null);
      setMontantTranche('');
      setReferenceTranche('');
      reload();
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? "Erreur lors de l'enregistrement du versement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const validerPaiementTotal = async (id: string) => {
    try {
      await paiementService.changerStatut(id, 'PAYE');
      toast.success('Paiement intégral validé ✅');
      reload();
    } catch (error) {
      toast.error('Erreur lors de la validation globale du paiement');
    }
  };

  // ─── ACTION : CRÉATION D'UN NOUVEAU PAIEMENT (admin) ───────────────────────
  const handleCreerPaiement = async (e: React.FormEvent) => {
    e.preventDefault();

    const montantNum = parseFloat(creation.montant);
    if (!creation.stagiaireId) {
      return toast.error('Veuillez sélectionner un stagiaire.');
    }
    if (isNaN(montantNum) || montantNum <= 0) {
      return toast.error('Veuillez entrer un montant valide supérieur à 0.');
    }
    if (!creation.datePrevue) {
      return toast.error('Veuillez indiquer une date limite.');
    }

    setIsCreating(true);
    try {
      await paiementService.create({
        stagiaireId: creation.stagiaireId,
        montant: montantNum,
        devise: creation.devise || 'FCFA',
        datePrevue: creation.datePrevue,
        reference: creation.reference || undefined,
      });

      toast.success('Fiche de paiement créée avec succès.');
      setShowCreationModal(false);
      setCreation({ stagiaireId: '', montant: '', devise: 'FCFA', datePrevue: '', reference: '' });
      reload();
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Erreur lors de la création du paiement.');
    } finally {
      setIsCreating(false);
    }
  };

  // ─── ÉTAT DE CHARGEMENT INITIAL POUR UN STAGIAIRE NON ENCORE RÉSOLU ───────
  if (role === 'STAGIAIRE' && resolvingProfil) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-400 animate-pulse">
        Chargement de votre dossier financier...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-2 animate-fadeIn">

      {/* ─── EN-TÊTE COMPOSANT ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="text-indigo-600" size={28} />
            Paiements & Gratifications
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {role === 'STAGIAIRE'
              ? 'Consultez vos fiches de gratifications et déclarez vos paiements par tranche ou par solde.'
              : 'Suivi budgétaire des stagiaires, échelonnements par tranches et encaissements.'}
          </p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button
              onClick={ouvrirCreationModal}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <UserPlus size={14} className="mr-1 inline" /> Nouveau paiement
            </Button>
          )}
          <Button onClick={reload} variant="secondary" size="sm" className="border-slate-200">
            Rafraîchir les données
          </Button>
        </div>
      </div>

      {/* ─── COMPTEURS ET BUDGETS EN GRILLE ──────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm group">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Engagé</div>
          <div className="text-2xl font-black mt-2 text-slate-800">{fmtMontant(stats.total ?? 0)}</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm group">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider text-emerald-600">Total Validé & Payé</div>
          <div className="text-2xl font-black mt-2 text-emerald-600">{fmtMontant(stats.paye ?? 0)}</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm group">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider text-amber-500">Restant / En Attente</div>
          <div className="text-2xl font-black mt-2 text-amber-500">{fmtMontant(stats.enAttente ?? 0)}</div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm group">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dossiers traités</div>
          <div className="text-2xl font-black mt-2 text-slate-700">{stats.nombre ?? 0}</div>
        </div>
      </div>

      {/* ─── TABLEAU PRINCIPAL DES ENREGISTREMENTS ──────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 tracking-wider border-b">
              <tr>
                <th className="p-4 pl-6">Stagiaire</th>
                <th className="p-4">Dû initial</th>
                <th className="p-4">Déjà versé</th>
                <th className="p-4">Date limite</th>
                <th className="p-4 text-center">Statut</th>
                <th className="p-4 text-right pr-6">Actions & Paiement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 animate-pulse">
                    Chargement du registre financier en cours...
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400 font-medium">
                    <ClipboardList className="mx-auto text-slate-300 mb-2" size={32} />
                    Aucun historique ou flux financier répertorié.
                  </td>
                </tr>
              ) : (
                list.map((p) => {
                  const reste = p.montant - (p.montantPaye ?? 0);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 pl-6 font-semibold text-slate-800">
                        {p.stagiaire && p.stagiaire.user
                          ? `${p.stagiaire.user.prenom} ${p.stagiaire.user.nom}`
                          : p.stagiaire?.nom ? `${p.stagiaire.prenom} ${p.stagiaire.nom}` : '—'}
                      </td>
                      <td className="p-4 font-mono font-bold text-slate-700">{fmtMontant(p.montant, p.devise)}</td>
                      <td className="p-4 text-emerald-600 font-mono font-medium">
                        {p.montantPaye && p.montantPaye > 0 ? fmtMontant(p.montantPaye, p.devise) : '—'}
                      </td>
                      <td className="p-4 text-slate-500 font-medium">{fmtDate(p.datePrevue)}</td>
                      <td className="p-4 text-center whitespace-nowrap">
                        <Badge tone={tone[p.statut] || 'neutral'}>
                          {p.statut === 'PARTIEL' ? 'PAYÉ PARTIEL' : p.statut}
                        </Badge>
                      </td>
                      <td className="p-4 text-right pr-6 space-x-2 whitespace-nowrap">
                        {p.statut !== 'PAYE' && (
                          <>
                            <Button
                              onClick={() => {
                                setActivePaiement(p);
                                setMontantTranche(reste.toString());
                                setShowTrancheModal(true);
                              }}
                              size="sm"
                              variant="secondary"
                              className="border-slate-200 hover:bg-slate-50 text-xs py-1.5"
                            >
                              <PlusCircle size={14} className="mr-1 inline" /> Versement
                            </Button>

                            {isAdmin && (
                              <Button
                                onClick={() => validerPaiementTotal(p.id)}
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-700 text-xs py-1.5"
                              >
                                Tout solder
                              </Button>
                            )}
                          </>
                        )}
                        {p.statut === 'PAYE' && (
                          <span className="text-xs text-emerald-600 font-semibold inline-flex items-center gap-1">
                            <CheckCircle size={14} /> Réglé en totalité
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODALE : FORMULAIRE DE VERSEMENT DE TRANCHE ─────────────────────── */}
      {showTrancheModal && activePaiement && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border animate-scaleUp">

            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <History className="text-indigo-600" size={20} />
                {role === 'STAGIAIRE' ? 'Déclarer un versement' : 'Encaisser un versement'}
              </h3>
              <button
                onClick={() => { setShowTrancheModal(false); setActivePaiement(null); }}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="my-4 p-3 bg-slate-50 rounded-2xl text-xs space-y-1.5 text-slate-600 border">
              <div className="flex justify-between">
                <span>Total attendu :</span>
                <span className="font-bold text-slate-800">{fmtMontant(activePaiement.montant, activePaiement.devise)}</span>
              </div>
              <div className="flex justify-between text-emerald-600">
                <span>Déjà réglé :</span>
                <span className="font-bold">{fmtMontant(activePaiement.montantPaye ?? 0, activePaiement.devise)}</span>
              </div>
              <div className="flex justify-between border-t pt-1.5 font-semibold text-indigo-700">
                <span>Reste à payer :</span>
                <span>{fmtMontant(activePaiement.montant - (activePaiement.montantPaye ?? 0), activePaiement.devise)}</span>
              </div>
            </div>

            <form onSubmit={handleAjouterTranche} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Montant de ce versement</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">
                    {activePaiement.devise || '$'}
                  </span>
                  <input
                    type="number"
                    step="any"
                    required
                    className="w-full pl-8 pr-4 py-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                    placeholder="Ex: 50000"
                    value={montantTranche}
                    onChange={(e) => setMontantTranche(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  {role === 'STAGIAIRE' ? 'Référence ou Numéro de transaction' : 'Méthode / ID de Transaction'}
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder={role === 'STAGIAIRE' ? 'Ex: Mobile Money ID, virement bancaire' : 'Ex: Espèces, Chèque n°...'}
                  value={referenceTranche}
                  onChange={(e) => setReferenceTranche(e.target.value)}
                />
              </div>

              {role === 'STAGIAIRE' && (
                <div className="flex gap-2 p-3 bg-amber-50 rounded-2xl text-[11px] text-amber-700 leading-relaxed border border-amber-100">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p>Votre déclaration sera soumise à l'équipe comptable pour vérification avant d'être créditée sur votre solde.</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1 rounded-xl"
                  onClick={() => { setShowTrancheModal(false); setActivePaiement(null); }}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Traitement...' : role === 'STAGIAIRE' ? 'Déclarer' : 'Confirmer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODALE : CRÉATION D'UNE NOUVELLE FICHE DE PAIEMENT (admin) ──────── */}
      {showCreationModal && isAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-xl border animate-scaleUp">

            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <UserPlus className="text-indigo-600" size={20} />
                Nouvelle fiche de paiement
              </h3>
              <button
                onClick={() => setShowCreationModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreerPaiement} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stagiaire</label>
                <select
                  required
                  className="w-full px-4 py-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  value={creation.stagiaireId}
                  onChange={(e) => setCreation({ ...creation, stagiaireId: e.target.value })}
                  disabled={loadingStagiaires}
                >
                  <option value="">
                    {loadingStagiaires ? 'Chargement des stagiaires...' : 'Sélectionner un stagiaire'}
                  </option>
                  {stagiaires.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.user ? `${s.user.prenom} ${s.user.nom}` : `${s.prenom ?? ''} ${s.nom ?? ''}`.trim() || s.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Montant dû</label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="w-full px-4 py-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                    placeholder="Ex: 150000"
                    value={creation.montant}
                    onChange={(e) => setCreation({ ...creation, montant: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Devise</label>
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    placeholder="FCFA"
                    value={creation.devise}
                    onChange={(e) => setCreation({ ...creation, devise: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                  <Calendar size={12} /> Date limite
                </label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  value={creation.datePrevue}
                  onChange={(e) => setCreation({ ...creation, datePrevue: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Référence (optionnel)</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Ex: Gratification mois de Juin"
                  value={creation.reference}
                  onChange={(e) => setCreation({ ...creation, reference: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  className="flex-1 rounded-xl"
                  onClick={() => setShowCreationModal(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl"
                  disabled={isCreating}
                >
                  {isCreating ? 'Création...' : 'Créer la fiche'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}