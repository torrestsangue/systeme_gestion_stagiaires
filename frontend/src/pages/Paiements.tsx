import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  CreditCard, PlusCircle, CheckCircle, AlertCircle,
  History, ClipboardList, UserPlus, ChevronDown,
  ChevronRight, Smartphone, Banknote, CreditCard as CardIcon,
  Wifi, Calendar, TrendingUp, Clock, X,
} from 'lucide-react';

import { paiementService, stagiaireService } from '../services/sgs.service';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../store/auth.store';
import { fmtMontant, fmtDate } from '../utils/format';

// ─── TYPES ───────────────────────────────────────────────────────────────────
type StatutPaiement = 'PLANIFIE' | 'PARTIEL' | 'PAYE' | 'LITIGE' | 'EN_ATTENTE';
type MethodePaiement = 'MOMO' | 'ORANGE' | 'CARD' | 'CASH';

const STATUT_CONFIG: Record<string, { tone: 'neutral'|'warning'|'success'|'danger'; label: string; color: string }> = {
  PLANIFIE:   { tone: 'neutral',  label: 'Planifié',     color: '#6b7280' },
  EN_ATTENTE: { tone: 'warning',  label: 'En attente',   color: '#f59e0b' },
  PARTIEL:    { tone: 'warning',  label: 'Partiel',      color: '#f59e0b' },
  PAYE:       { tone: 'success',  label: 'Soldé',        color: '#10b981' },
  LITIGE:     { tone: 'danger',   label: 'Litige',       color: '#ef4444' },
};

const METHODE_CONFIG: Record<MethodePaiement, { icon: React.ReactNode; label: string; color: string }> = {
  MOMO:   { icon: <Smartphone size={16} />,  label: 'MTN Mobile Money', color: '#f59e0b' },
  ORANGE: { icon: <Wifi size={16} />,        label: 'Orange Money',     color: '#f97316' },
  CARD:   { icon: <CardIcon size={16} />,    label: 'Carte bancaire',   color: '#6366f1' },
  CASH:   { icon: <Banknote size={16} />,    label: 'Espèces',          color: '#10b981' },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function normalizeStagiaireList(response: any): any[] {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  return [];
}

async function resolveStagiaireId(user: any): Promise<string | null> {
  if (!user) return null;
  const direct = [user.stagiaireId, user.stagiaire?.id].find(Boolean);
  if (direct) return direct;
  try {
    const response = await stagiaireService.list();
    const liste = normalizeStagiaireList(response);
    return liste.find((s: any) => s.userId === user.id || s.user?.id === user.id)?.id ?? null;
  } catch { return null; }
}

// ─── SOUS-COMPOSANT : BARRE DE PROGRESSION ───────────────────────────────────
function ProgressBar({ paye, total, devise }: { paye: number; total: number; devise?: string }) {
  const pct = total > 0 ? Math.min(100, (paye / total) * 100) : 0;
  const color = pct >= 100 ? '#10b981' : pct > 0 ? '#6366f1' : '#e2e8f0';
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-1">
        <span>{fmtMontant(paye, devise)} versé</span>
        <span className="font-semibold" style={{ color }}>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ─── SOUS-COMPOSANT : HISTORIQUE DES TRANCHES ────────────────────────────────
function TrancheHistorique({ tranches, devise }: { tranches: any[]; devise?: string }) {
  if (!tranches?.length) {
    return (
      <div className="py-4 text-center text-xs text-slate-400">
        Aucun versement enregistré sur cette fiche.
      </div>
    );
  }
  return (
    <div className="divide-y divide-slate-50">
      {tranches.map((t: any, i: number) => {
        const methode = METHODE_CONFIG[t.methode as MethodePaiement] ?? METHODE_CONFIG.CASH;
        const statutColor = t.statut === 'REUSSIT' ? 'text-emerald-600 bg-emerald-50'
          : t.statut === 'EN_ATTENTE' ? 'text-amber-600 bg-amber-50'
          : 'text-red-500 bg-red-50';
        return (
          <div key={t.id ?? i} className="flex items-center gap-3 py-2.5 px-4">
            <span className="text-slate-300" style={{ color: methode.color }}>{methode.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 font-mono">
                  {fmtMontant(t.montant, devise)}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statutColor}`}>
                  {t.statut === 'REUSSIT' ? 'Validé' : t.statut === 'EN_ATTENTE' ? 'En attente' : 'Échoué'}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                {methode.label}{t.reference ? ` · ${t.reference}` : ''}
                {t.telephonePayeur ? ` · ${t.telephonePayeur}` : ''}
              </div>
            </div>
            <span className="text-[10px] text-slate-400 shrink-0">{fmtDate(t.createdAt)}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── COMPOSANT PRINCIPAL ─────────────────────────────────────────────────────
export default function Paiements() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const isAdmin = role !== 'STAGIAIRE';

  const [list, setList]           = useState<any[]>([]);
  const [stats, setStats]         = useState<any>({});
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Résolution stagiaire connecté
  const [monStagiaireId, setMonStagiaireId] = useState<string | null>(null);
  const [resolvingProfil, setResolvingProfil] = useState(role === 'STAGIAIRE');

  // Modal versement
  const [activePaiement, setActivePaiement] = useState<any>(null);
  const [showTrancheModal, setShowTrancheModal]   = useState(false);
  const [montantTranche, setMontantTranche]       = useState('');
  const [referenceTranche, setReferenceTranche]   = useState('');
  const [methodeTranche, setMethodeTranche]       = useState<MethodePaiement>('MOMO');
  const [telephoneTranche, setTelephoneTranche]   = useState('');
  const [isSubmitting, setIsSubmitting]           = useState(false);

  // Modal création (admin)
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [stagiaires, setStagiaires]               = useState<any[]>([]);
  const [loadingStagiaires, setLoadingStagiaires] = useState(false);
  const [creation, setCreation] = useState({
    stagiaireId: '', montant: '', devise: 'FCFA', datePrevue: '', reference: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  // ─── RÉSOLUTION STAGIAIRE ──────────────────────────────────────────────────
  useEffect(() => {
    if (role !== 'STAGIAIRE') { setResolvingProfil(false); return; }
    let cancelled = false;
    resolveStagiaireId(user).then((id) => {
      if (cancelled) return;
      setMonStagiaireId(id);
      setResolvingProfil(false);
      if (!id) toast.error("Impossible d'identifier votre dossier. Contactez l'administration.");
    });
    return () => { cancelled = true; };
  }, [role, user?.id]);

  // ─── CHARGEMENT ───────────────────────────────────────────────────────────
  const reload = useCallback(() => {
    if (role === 'STAGIAIRE' && !monStagiaireId) return;
    setIsLoading(true);
    const params = role === 'STAGIAIRE' ? { stagiaireId: monStagiaireId } : undefined;
    paiementService.list(params)
      .then((response: any) => {
        if (response?.items) {
          setList(response.items);
          setStats({
            total:     response.budget?.total   ?? 0,
            paye:      response.budget?.paye    ?? 0,
            enAttente: response.budget?.attente ?? 0,
            nombre:    response.total           ?? 0,
          });
        } else {
          setList(Array.isArray(response) ? response : []);
        }
      })
      .catch((err) => {
        console.error('Erreur de chargement des paiements:', err);
        setList([]); setStats({});
      })
      .finally(() => setIsLoading(false));
  }, [role, monStagiaireId]);

  useEffect(() => { reload(); }, [reload]);

  // ─── OUVRIR MODAL ADMIN ────────────────────────────────────────────────────
  const ouvrirCreationModal = () => {
    setShowCreationModal(true);
    if (stagiaires.length === 0) {
      setLoadingStagiaires(true);
      stagiaireService.list()
        .then((r: any) => setStagiaires(normalizeStagiaireList(r)))
        .catch(() => { toast.error('Impossible de charger les stagiaires.'); setStagiaires([]); })
        .finally(() => setLoadingStagiaires(false));
    }
  };

  const fermerTrancheModal = () => {
    setShowTrancheModal(false);
    setActivePaiement(null);
    setMontantTranche('');
    setReferenceTranche('');
    setTelephoneTranche('');
    setMethodeTranche('MOMO');
  };

  // ─── AJOUTER TRANCHE ──────────────────────────────────────────────────────
  const handleAjouterTranche = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePaiement) return;
    const montantNum = parseFloat(montantTranche);
    const resteAPayer = activePaiement.montant - (activePaiement.montantPaye ?? 0);
    if (isNaN(montantNum) || montantNum <= 0)
      return toast.error('Montant invalide.');
    if (montantNum > resteAPayer + 0.01)
      return toast.error(`Dépasse le reste à payer (${fmtMontant(resteAPayer, activePaiement.devise)}).`);

    setIsSubmitting(true);
    try {
      await paiementService.enregistrerTranche({
        paiementId: activePaiement.id,
        montant:    montantNum,
        reference:  referenceTranche || undefined,
        methode:    methodeTranche,
        telephone:  telephoneTranche || undefined,
      });
      toast.success(
        role === 'STAGIAIRE'
          ? 'Versement soumis — en attente de validation.'
          : 'Versement encaissé avec succès.'
      );
      fermerTrancheModal();
      reload();
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? "Erreur lors de l'enregistrement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── SOLDER TOTALEMENT ────────────────────────────────────────────────────
  const validerPaiementTotal = async (id: string) => {
    try {
      await paiementService.changerStatut(id, 'PAYE');
      toast.success('Paiement soldé en totalité ✅');
      reload();
    } catch {
      toast.error('Erreur lors de la validation.');
    }
  };

  // ─── CRÉER PAIEMENT ────────────────────────────────────────────────────────
  const handleCreerPaiement = async (e: React.FormEvent) => {
    e.preventDefault();
    const montantNum = parseFloat(creation.montant);
    if (!creation.stagiaireId) return toast.error('Sélectionner un stagiaire.');
    if (isNaN(montantNum) || montantNum <= 0) return toast.error('Montant invalide.');
    if (!creation.datePrevue) return toast.error('Date limite requise.');
    setIsCreating(true);
    try {
      await paiementService.create({
        stagiaireId: creation.stagiaireId,
        montant:     montantNum,
        devise:      creation.devise || 'FCFA',
        datePrevue:  creation.datePrevue,
        reference:   creation.reference || undefined,
      });
      toast.success('Fiche de paiement créée.');
      setShowCreationModal(false);
      setCreation({ stagiaireId: '', montant: '', devise: 'FCFA', datePrevue: '', reference: '' });
      reload();
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Erreur lors de la création.');
    } finally {
      setIsCreating(false);
    }
  };

  // ─── ÉTAT CHARGEMENT STAGIAIRE ─────────────────────────────────────────────
  if (role === 'STAGIAIRE' && resolvingProfil) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
          Chargement de votre dossier financier…
        </div>
      </div>
    );
  }

  const pctGlobal = stats.total > 0 ? Math.min(100, ((stats.paye ?? 0) / stats.total) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-2">

      {/* ── EN-TÊTE ─────────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 text-white shadow-lg shadow-indigo-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={22} className="opacity-80" />
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">
                {isAdmin ? 'Registre financier' : 'Mes gratifications'}
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight">Paiements & Gratifications</h1>
            <p className="text-xs opacity-60 mt-1">
              {role === 'STAGIAIRE'
                ? "Déclarez vos versements et suivez l\u2019état de vos fiches en temps réel."
                : 'Pilotez les gratifications, encaissez les tranches et soldez les dossiers.'}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {isAdmin && (
              <button
                onClick={ouvrirCreationModal}
                className="flex items-center gap-1.5 bg-white text-indigo-700 font-bold text-xs px-4 py-2 rounded-xl hover:bg-indigo-50 transition-colors shadow"
              >
                <UserPlus size={14} /> Nouvelle fiche
              </button>
            )}
            <button
              onClick={reload}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs px-4 py-2 rounded-xl border border-white/20 transition-colors"
            >
              Rafraîchir
            </button>
          </div>
        </div>

        {/* Barre de progression globale */}
        {stats.total > 0 && (
          <div className="mt-5 pt-4 border-t border-white/10">
            <div className="flex justify-between text-[10px] font-mono opacity-70 mb-1.5">
              <span>Progression globale des encaissements</span>
              <span className="font-bold">{pctGlobal.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${pctGlobal}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── STATS CARDS ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total engagé',
            value: fmtMontant(stats.total ?? 0),
            icon: <TrendingUp size={16} className="text-slate-400" />,
            sub: `${stats.nombre ?? 0} fiche${(stats.nombre ?? 0) > 1 ? 's' : ''}`,
            accent: 'border-slate-200',
          },
          {
            label: 'Encaissé & validé',
            value: fmtMontant(stats.paye ?? 0),
            icon: <CheckCircle size={16} className="text-emerald-500" />,
            sub: stats.total > 0 ? `${pctGlobal.toFixed(0)}% du total` : '—',
            accent: 'border-emerald-100',
          },
          {
            label: 'Reste à percevoir',
            value: fmtMontant(stats.enAttente ?? 0),
            icon: <Clock size={16} className="text-amber-500" />,
            sub: stats.total > 0 ? `${(100 - pctGlobal).toFixed(0)}% restant` : '—',
            accent: 'border-amber-100',
          },
          {
            label: 'Dossiers actifs',
            value: stats.nombre ?? 0,
            icon: <ClipboardList size={16} className="text-indigo-400" />,
            sub: 'fiches en cours',
            accent: 'border-indigo-100',
          },
        ].map((card) => (
          <div
            key={card.label}
            className={`bg-white rounded-2xl p-4 border ${card.accent} shadow-sm`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{card.label}</span>
              {card.icon}
            </div>
            <div className="text-xl font-black font-mono text-slate-800 truncate">{card.value}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* ── TABLEAU EXPANDABLE ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">
            Fiches de paiement
          </span>
          <span className="text-xs text-slate-400">{list.length} résultat{list.length > 1 ? 's' : ''}</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center gap-3 text-slate-400 text-sm">
              <div className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
              Chargement du registre…
            </div>
          </div>
        ) : list.length === 0 ? (
          <div className="p-16 text-center">
            <ClipboardList className="mx-auto text-slate-200 mb-3" size={40} />
            <p className="text-sm font-semibold text-slate-400">Aucune fiche de paiement</p>
            <p className="text-xs text-slate-300 mt-1">
              {isAdmin ? 'Créez une fiche via le bouton Nouvelle fiche.' : "Aucune gratification n2019est encore planifiée pour vous."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {list.map((p) => {
              const montantPaye = p.montantPaye ?? 0;
              const reste = p.montant - montantPaye;
              const statut = STATUT_CONFIG[p.statut] ?? STATUT_CONFIG.PLANIFIE;
              const isExpanded = expandedId === p.id;
              const nomStagiaire = p.stagiaire?.user
                ? `${p.stagiaire.user.prenom} ${p.stagiaire.user.nom}`
                : p.stagiaire?.nom ? `${p.stagiaire.prenom ?? ''} ${p.stagiaire.nom}`.trim() : '—';

              return (
                <div key={p.id} className="group">
                  {/* LIGNE PRINCIPALE — cliquable pour expand */}
                  <div
                    className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50/80 cursor-pointer transition-colors select-none"
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  >
                    {/* Indicateur statut */}
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: statut.color }}
                    />

                    {/* Stagiaire + dossier */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-800 truncate">{nomStagiaire}</span>
                        {p.reference && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded truncate hidden sm:inline">
                            {p.reference}
                          </span>
                        )}
                      </div>
                      <ProgressBar paye={montantPaye} total={p.montant} devise={p.devise} />
                    </div>

                    {/* Montant dû */}
                    <div className="text-right shrink-0 hidden sm:block">
                      <div className="text-xs text-slate-400 uppercase tracking-wider">Dû</div>
                      <div className="text-sm font-black font-mono text-slate-700">{fmtMontant(p.montant, p.devise)}</div>
                    </div>

                    {/* Date limite */}
                    <div className="text-right shrink-0 hidden md:block">
                      <div className="text-xs text-slate-400 uppercase tracking-wider">Échéance</div>
                      <div className="text-xs font-semibold text-slate-600">{fmtDate(p.datePrevue)}</div>
                    </div>

                    {/* Badge statut */}
                    <div className="shrink-0">
                      <span
                        className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                        style={{
                          color: statut.color,
                          background: `${statut.color}18`,
                        }}
                      >
                        {statut.label}
                      </span>
                    </div>

                    {/* Actions */}
                    <div
                      className="flex items-center gap-2 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {p.statut !== 'PAYE' && (
                        <>
                          <button
                            onClick={() => {
                              setActivePaiement(p);
                              setMontantTranche(reste > 0 ? reste.toString() : '');
                              setShowTrancheModal(true);
                            }}
                            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            <PlusCircle size={13} /> Verser
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => validerPaiementTotal(p.id)}
                              className="text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors hidden sm:inline-flex items-center gap-1"
                            >
                              <CheckCircle size={13} /> Solder
                            </button>
                          )}
                        </>
                      )}
                      {p.statut === 'PAYE' && (
                        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle size={13} /> Soldé
                        </span>
                      )}
                    </div>

                    {/* Chevron expand */}
                    <div className="text-slate-300 group-hover:text-slate-500 transition-colors">
                      {isExpanded
                        ? <ChevronDown size={16} />
                        : <ChevronRight size={16} />}
                    </div>
                  </div>

                  {/* SECTION EXPANDABLE : historique des tranches */}
                  {isExpanded && (
                    <div className="bg-slate-50/50 border-t border-slate-100">
                      <div className="px-6 pt-3 pb-1 flex items-center gap-2">
                        <History size={12} className="text-slate-400" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          Historique des versements
                        </span>
                        <span className="text-[10px] text-slate-300 ml-auto">
                          {(p.tranches ?? []).length} versement{(p.tranches ?? []).length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <TrancheHistorique tranches={p.tranches ?? []} devise={p.devise} />
                      {/* Récap mobile */}
                      <div className="px-6 py-3 flex gap-4 text-xs text-slate-500 border-t border-slate-100 sm:hidden">
                        <span>Dû : <strong className="font-mono">{fmtMontant(p.montant, p.devise)}</strong></span>
                        <span>Versé : <strong className="font-mono text-emerald-600">{fmtMontant(montantPaye, p.devise)}</strong></span>
                        <span>Reste : <strong className="font-mono text-amber-600">{fmtMontant(reste, p.devise)}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── MODALE VERSEMENT ─────────────────────────────────────────────────── */}
      {showTrancheModal && activePaiement && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <History size={16} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {role === 'STAGIAIRE' ? 'Déclarer un versement' : 'Encaisser un versement'}
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    {activePaiement.stagiaire?.user
                      ? `${activePaiement.stagiaire.user.prenom} ${activePaiement.stagiaire.user.nom}`
                      : 'Fiche de paiement'}
                  </p>
                </div>
              </div>
              <button
                onClick={fermerTrancheModal}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Récap fiche */}
            <div className="mx-6 my-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Total dû</div>
                  <div className="font-black font-mono text-slate-700">{fmtMontant(activePaiement.montant, activePaiement.devise)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Déjà versé</div>
                  <div className="font-black font-mono text-emerald-600">{fmtMontant(activePaiement.montantPaye ?? 0, activePaiement.devise)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Reste</div>
                  <div className="font-black font-mono text-indigo-600">
                    {fmtMontant(activePaiement.montant - (activePaiement.montantPaye ?? 0), activePaiement.devise)}
                  </div>
                </div>
              </div>
              <ProgressBar paye={activePaiement.montantPaye ?? 0} total={activePaiement.montant} devise={activePaiement.devise} />
            </div>

            <form onSubmit={handleAjouterTranche} className="px-6 pb-6 space-y-4">

              {/* Méthode de paiement */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  Méthode de paiement
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(METHODE_CONFIG) as [MethodePaiement, typeof METHODE_CONFIG[MethodePaiement]][]).map(([key, m]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMethodeTranche(key)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        methodeTranche === key
                          ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <span style={{ color: methodeTranche === key ? m.color : '#9ca3af' }}>{m.icon}</span>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Montant */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  Montant de ce versement
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-bold">
                    {activePaiement.devise || 'FCFA'}
                  </span>
                  <input
                    type="number"
                    step="any"
                    required
                    className="w-full pl-14 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-sm font-bold"
                    placeholder="Ex: 50 000"
                    value={montantTranche}
                    onChange={(e) => setMontantTranche(e.target.value)}
                  />
                </div>
              </div>

              {/* Téléphone si MOMO/ORANGE */}
              {(methodeTranche === 'MOMO' || methodeTranche === 'ORANGE') && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                    Numéro payeur
                  </label>
                  <input
                    type="tel"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                    placeholder="Ex: 6XX XXX XXX"
                    value={telephoneTranche}
                    onChange={(e) => setTelephoneTranche(e.target.value)}
                  />
                </div>
              )}

              {/* Référence */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                  {role === 'STAGIAIRE' ? 'ID de transaction (optionnel)' : 'Référence / Note (optionnel)'}
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  placeholder={role === 'STAGIAIRE' ? 'Ex: ID Mobile Money, N° reçu' : 'Ex: Chèque n°123, reçu caisse'}
                  value={referenceTranche}
                  onChange={(e) => setReferenceTranche(e.target.value)}
                />
              </div>

              {/* Alerte stagiaire */}
              {role === 'STAGIAIRE' && (
                <div className="flex gap-2.5 p-3 bg-amber-50 rounded-xl text-[11px] text-amber-700 border border-amber-100">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>Ce versement sera vérifié par l'équipe comptable avant d'être crédité sur votre solde.</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={fermerTrancheModal}
                  className="flex-1 py-3 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors"
                >
                  {isSubmitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Traitement…
                    </span>
                  ) : role === 'STAGIAIRE' ? 'Soumettre le versement' : "Confirmer l\u2019encaissement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODALE CRÉATION ADMIN ────────────────────────────────────────────── */}
      {showCreationModal && isAdmin && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md shadow-2xl">

            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <UserPlus size={16} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Nouvelle fiche de paiement</h3>
                  <p className="text-[10px] text-slate-400">Planifier une gratification pour un stagiaire</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreationModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreerPaiement} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Stagiaire</label>
                <select
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  value={creation.stagiaireId}
                  onChange={(e) => setCreation({ ...creation, stagiaireId: e.target.value })}
                  disabled={loadingStagiaires}
                >
                  <option value="">
                    {loadingStagiaires ? 'Chargement…' : 'Sélectionner un stagiaire'}
                  </option>
                  {stagiaires.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.user
                        ? `${s.user.prenom} ${s.user.nom}`
                        : `${s.prenom ?? ''} ${s.nom ?? ''}`.trim() || s.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Montant dû</label>
                  <input
                    type="number"
                    step="any"
                    required
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm font-bold"
                    placeholder="150 000"
                    value={creation.montant}
                    onChange={(e) => setCreation({ ...creation, montant: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Devise</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    value={creation.devise}
                    onChange={(e) => setCreation({ ...creation, devise: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <Calendar size={11} /> Date limite d'encaissement
                </label>
                <input
                  type="date"
                  required
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  value={creation.datePrevue}
                  onChange={(e) => setCreation({ ...creation, datePrevue: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Libellé (optionnel)</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  placeholder="Ex: Gratification mois de juin 2025"
                  value={creation.reference}
                  onChange={(e) => setCreation({ ...creation, reference: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreationModal(false)}
                  className="flex-1 py-3 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex-1 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors"
                >
                  {isCreating ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Création…
                    </span>
                  ) : 'Créer la fiche'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}