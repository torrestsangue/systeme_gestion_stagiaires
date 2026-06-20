import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  QrCode,
  Users,
  CheckCircle,
  Clock,
  Search,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  AlertTriangle,
  Camera,
  Laptop,
  Check,
  FileText
} from 'lucide-react';

import { presenceService } from '../services/sgs.service';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../store/auth.store';
import { fmtDateTime } from '../utils/format';
import { Badge } from '../components/ui/Badge';

// Alignement strict avec l'enum PresenceStatut de Prisma
const statusTones: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  PRESENT: 'success',
  RETARD: 'warning',
  ABSENT: 'danger',
  TELETRAVAIL: 'neutral',
  JUSTIFIE: 'neutral'
};

export default function Presences() {
  // ─── ÉTATS DE BASE ET AUTH ────────────────────────────────────────────────
  const role = useAuthStore((s) => s.user?.role);

  const [qr, setQr] = useState<any>(null);
  const [list, setList] = useState<any[]>([]);
  const [resumeStats, setResumeStats] = useState({ total: 0, presents: 0, retards: 0, absents: 0, teletravail: 0 });
  const [scanToken, setScanToken] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [search, setSearch] = useState('');
  
  // ─── ÉTATS UI & FILTRES ───────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [isQrLoading, setIsQrLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('TOUS');
  const [dateFilter, setDateFilter] = useState<string>('TOUS');
  const [cameraActive, setCameraActive] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // ─── RECHERCHE & CHARGEMENT DES PRÉSENCES ──────────────────────────────────
  const fetchPresences = useCallback(async () => {
    setIsLoading(true);
    try {
      const response: any = await presenceService.presencesDuJour();
      
      if (response && response.liste) {
        setList(response.liste);
        if (response.resume) {
          setResumeStats(response.resume);
        }
      } else {
        setList([]);
      }
    } catch (error) {
      console.error('Erreur chargement présences:', error);
      toast.error("Impossible de charger l'historique des présences.");
      setList([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── GESTION DU CYCLE DE VIE DES SESSIONS QR ──────────────────────────────
  const handleSessionData = (session: any) => {
    setQr(session);
    if (session && session.expiresAt) {
      const secondsLeft = Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - Date.now()) / 1000));
      setCountdown(secondsLeft);
    } else if (session && session.expiresInSeconds) {
      setCountdown(session.expiresInSeconds);
    } else {
      setCountdown(120); // Valeur refuge par défaut du backend
    }
  };

  const refreshQr = async () => {
    if (role === 'STAGIAIRE') return;
    setIsQrLoading(true);
    try {
      const r = await presenceService.genererSession();
      handleSessionData(r);
      toast.success('Nouveau QR Code généré');
    } catch (error) {
      console.error('Erreur QR Code:', error);
      toast.error('Erreur lors de la génération du QR Code dynamique');
    } finally {
      setIsQrLoading(false);
    }
  };

  const loadActiveSession = useCallback(async () => {
    if (role === 'STAGIAIRE') return;
    try {
      const r = await presenceService.sessionActive();
      if (r) {
        handleSessionData(r);
      } else {
        setQr(null);
      }
    } catch (error) {
      setQr(null);
    }
  }, [role]);

  // ─── EFFECTS SYNC ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (role !== 'STAGIAIRE') {
      loadActiveSession();
    }
    fetchPresences();
  }, [role, loadActiveSession, fetchPresences]);

  // Debounce pour la recherche locale afin d'éviter la surcharge
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchPresences();
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [search, fetchPresences]);

  // Compteur dynamique d'expiration du QR Code
  useEffect(() => {
    if (!qr || countdown <= 0) return;

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          loadActiveSession(); // Tente de récupérer la rotation suivante
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [qr, countdown, loadActiveSession]);

  // ─── ACTION DE SCAN & ENREGISTREMENT ─────────────────────────────────────
  const scan = async (tokenOverride?: string) => {
    const tokenToValidate = tokenOverride || scanToken;
    let cleanToken = tokenToValidate.trim();

    // Extraction robuste si l'utilisateur met ou scanne l'URL complète
    if (cleanToken.includes('token=')) {
      const urlParams = new URLSearchParams(cleanToken.split('?')[1]);
      cleanToken = urlParams.get('token') || cleanToken;
    } else if (cleanToken.includes('/')) {
      cleanToken = cleanToken.split('/').pop() || cleanToken;
    }

    if (!cleanToken) {
      toast.error('Veuillez spécifier ou scanner un jeton valide.');
      return;
    }

    try {
      await presenceService.pointer({ token: cleanToken });
      toast.success('Présence enregistrée avec succès ✅');
      setScanToken('');
      setCameraActive(false);
      fetchPresences();
    } catch (e: any) {
      toast.error(e?.response?.data?.error || e?.message || 'Jeton invalide ou expiré. Réessayez.');
    }
  };

  const toggleCamera = () => {
    setCameraActive(!cameraActive);
    if (!cameraActive) {
      toast.info("Accès caméra demandé... Mode simulation actif.");
    }
  };

  // ─── EXPORT CSV FIABLE ────────────────────────────────────────────────────
  const exportToCSV = () => {
    if (filtered.length === 0) {
      toast.error('Aucune donnée filtrée disponible à exporter.');
      return;
    }
    
    const headers = ['Date Enregistrement', 'Stagiaire Nom', 'Stagiaire Prenom', 'Statut', 'Adresse IP'];
    const csvRows = [headers.join(',')];
    
    filtered.forEach(l => {
      const row = [
        `"${l.heurePointage ? fmtDateTime(l.heurePointage) : '—'}"`,
        `"${l.stagiaire?.nom || '—'}"`,
        `"${l.stagiaire?.prenom || '—'}"`,
        `"${l.statut || 'ABSENT'}"`,
        `"${l.presence?.ip || l.ip || '—'}"`
      ];
      csvRows.push(row.join(','));
    });
    
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SGS_Presences_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Export CSV téléchargé !');
  };

  // ─── FILTRAGE DES DONNÉES FRONTEND ────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!Array.isArray(list)) return [];
    
    return list.filter((l) => {
      const fullName = `${l.stagiaire?.prenom || ''} ${l.stagiaire?.nom || ''}`.toLowerCase();
      const matchesSearch = fullName.includes(search.toLowerCase());
      
      const currentStatut = l.statut || 'ABSENT';
      const matchesStatus = statusFilter === 'TOUS' || currentStatut === statusFilter;
      
      if (!matchesSearch || !matchesStatus) return false;
      if (dateFilter === 'TOUS') return true;
      
      const dateTarget = l.heurePointage || l.createdAt;
      if (!dateTarget) return false;

      const recordDate = new Date(dateTarget);
      const today = new Date();
      
      if (dateFilter === 'TODAY') {
        return recordDate.toDateString() === today.toDateString();
      } else if (dateFilter === 'WEEK') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(today.getDate() - 7);
        return recordDate >= oneWeekAgo;
      } else if (dateFilter === 'MONTH') {
        return recordDate.getMonth() === today.getMonth() && recordDate.getFullYear() === today.getFullYear();
      }
      
      return true;
    });
  }, [list, search, statusFilter, dateFilter]);

  const kpiStats = useMemo(() => {
    return {
      total: filtered.length,
      presents: filtered.filter(l => l.statut === 'PRESENT').length,
      retards: filtered.filter(l => l.statut === 'RETARD').length
    };
  }, [filtered]);

  // Construction sécurisée de la chaîne de données QR
  const qrDataValue = useMemo(() => {
    if (!qr) return '';
    return qr.qrUrl || qr.url || (typeof qr === 'string' ? qr : qr.token || '');
  }, [qr]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto px-1 md:px-4 animate-fadeIn">
      
      {/* En-tête Hero */}
      <div className="bg-gradient-to-br from-indigo-800 via-blue-700 to-cyan-600 rounded-3xl p-6 md:p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 text-white/5 pointer-events-none transform rotate-12">
          <QrCode size={240} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="bg-white/20 text-white text-xs px-3 py-1 rounded-full font-medium tracking-wide uppercase">
              Module Émargement
            </span>
            <h1 className="text-3xl md:text-5xl font-black mt-2 tracking-tight">
              Gestion des présences
            </h1>
            <p className="mt-2 text-white/85 text-sm md:text-base max-w-xl font-light">
              Suivi de ponctualité en temps réel des stagiaires via jetons de sécurité QR asynchrones.
            </p>
          </div>
          {role !== 'STAGIAIRE' && (
            <Button 
              onClick={exportToCSV}
              className="bg-white text-indigo-900 hover:bg-slate-100 font-semibold shadow-md rounded-xl py-3 self-start md:self-auto transition-transform active:scale-95 flex items-center"
            >
              <Download size={18} className="mr-2" />
              Exporter la sélection (.csv)
            </Button>
          )}
        </div>
      </div>

      {/* Blocs KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition group">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Stagiaires Filtrés</p>
              <h3 className="text-4xl font-black mt-2 text-slate-800 group-hover:text-indigo-600 transition-colors">
                {isLoading ? '...' : kpiStats.total}
              </h3>
              <p className="text-xs text-slate-500 mt-1">{kpiStats.presents} présent(s) actif(s)</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner">
              <CheckCircle size={28} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition group">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Base J-0</p>
              <h3 className="text-4xl font-black mt-2 text-slate-800 group-hover:text-blue-600 transition-colors">
                {isLoading ? '...' : (resumeStats.presents + resumeStats.teletravail)}
              </h3>
              <p className="text-xs text-slate-500 mt-1">{resumeStats.teletravail} en distanciel</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner">
              <Users size={28} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition group">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Retards & Absences</p>
              <h3 className="text-4xl font-black mt-2 text-amber-600">
                {isLoading ? '...' : resumeStats.retards} <span className="text-sm font-normal text-rose-500">({resumeStats.absents} abs)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-1">Données du jour cumulées</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-inner">
              <Clock size={28} />
            </div>
          </div>
        </div>
      </div>

      {/* Section Administration : QR Code */}
      {role !== 'STAGIAIRE' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8 text-center">
          <div className="max-w-md mx-auto">
            <h2 className="font-extrabold text-2xl text-slate-800 tracking-tight">Générateur de Flux Unique</h2>
            <p className="text-xs text-slate-500 mt-1 mb-6">Ce code change régulièrement pour bloquer les tentatives de fraude.</p>

            {isQrLoading ? (
              <div className="mx-auto w-64 h-64 bg-slate-50 rounded-3xl flex flex-col items-center justify-center border border-dashed border-slate-200 animate-pulse">
                <RefreshCw className="animate-spin text-indigo-500 mb-2" size={32} />
                <span className="text-xs text-slate-400 font-medium">Génération du jeton sécurisé...</span>
              </div>
            ) : qr && qrDataValue ? (
              <div className="space-y-4">
                <div className="mx-auto w-fit p-4 bg-white rounded-3xl border shadow-inner">
                  <div className="bg-slate-50 p-2 rounded-2xl border">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrDataValue)}`}
                      alt="Code QR dynamique"
                      className="w-64 h-64 object-contain rounded-xl"
                      onError={(e) => {
                        console.error("Erreur api.qrserver.com");
                        toast.error("Format de données invalide pour le rendu QR Code");
                      }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex flex-col items-center justify-center gap-2">
                  <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-sm shadow-sm transition-colors ${countdown <= 20 ? 'bg-rose-50 text-rose-700 animate-pulse' : 'bg-indigo-50 text-indigo-700'}`}>
                    <Clock size={16} />
                    <span>Expiration : <strong>{countdown}s</strong></span>
                  </div>
                  
                  {(qr.token || qr.id) && (
                    <div className="bg-slate-50 border px-3 py-1 rounded-lg text-xs font-mono text-slate-600 flex items-center gap-2 mt-1">
                      <span className="text-slate-400">Token :</span>
                      <span>{qr.token}</span>
                    </div>
                  )}
                </div>

                <Button onClick={refreshQr} className="mt-2 bg-slate-900 text-white hover:bg-slate-800 rounded-xl px-6 py-2.5 inline-flex items-center">
                  <RefreshCw size={16} className="mr-2" /> Forcer la rotation
                </Button>
              </div>
            ) : (
              <div className="p-8 text-center bg-indigo-50/50 rounded-3xl border border-indigo-100 text-slate-700 text-sm flex flex-col items-center gap-3 max-w-sm mx-auto">
                <AlertTriangle className="text-amber-500" size={28} />
                <span className="font-semibold text-slate-800">Aucun flux d'émargement actif</span>
                <p className="text-xs text-slate-500">Activez une session dynamique pour autoriser les émargements.</p>
                <Button onClick={refreshQr} className="mt-2 bg-indigo-600 text-white hover:bg-indigo-700 text-xs px-5 py-2 rounded-xl flex items-center mx-auto">
                  <RefreshCw size={12} className="mr-1.5" /> Initialiser le QR Code
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section Stagiaire : Interface Émargement */}
      {role === 'STAGIAIRE' && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600"><QrCode size={24} /></div>
              <div>
                <h2 className="font-bold text-xl text-slate-800">Émarger ma présence</h2>
                <p className="text-xs text-slate-500">Entrez le jeton temporaire ou utilisez la caméra</p>
              </div>
            </div>

            <div className="flex items-center bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
              <button onClick={() => setCameraActive(false)} className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${!cameraActive ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>
                <Laptop size={14} /> Clavier
              </button>
              <button onClick={toggleCamera} className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${cameraActive ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>
                <Camera size={14} /> Appareil photo
              </button>
            </div>
          </div>

          {cameraActive ? (
            <div className="max-w-md mx-auto bg-slate-950 rounded-2xl overflow-hidden aspect-video relative flex flex-col items-center justify-center text-white border border-slate-800 p-4 text-center">
              <div className="absolute inset-4 border-2 border-indigo-500 border-dashed rounded-xl opacity-40 animate-pulse pointer-events-none"></div>
              <Camera className="animate-pulse text-indigo-400 mb-2" size={36} />
              <p className="text-sm font-medium">Détecteur de QR Code en attente</p>
              <button onClick={() => scan("TOKEN_EXEMPLE_SCANNE")} className="mt-4 bg-indigo-600 text-white text-xs px-4 py-2 rounded-xl hover:bg-indigo-700">
                Simuler capture automatique
              </button>
            </div>
          ) : (
            <div className="max-w-xl mx-auto space-y-4 py-2">
              <p className="text-sm text-slate-600">Retranscrivez le <strong>token éphémère</strong> affiché par l'administration ou collez l'URL reçue.</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  className="flex-1 border bg-slate-50 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm text-slate-800 placeholder:text-slate-400"
                  placeholder="Ex: d3b07384d113..."
                  value={scanToken}
                  onChange={(e) => setScanToken(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && scan()}
                />
                <Button onClick={() => scan()} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl px-6 py-3 shadow flex items-center justify-center">
                  <Check size={18} className="mr-1.5" /> Enregistrer ma présence
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Barre de Recherche et Filtres */}
      <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par nom ou prénom..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-700 bg-slate-50/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border">
              <Filter size={14} className="text-slate-400" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-transparent text-xs font-semibold text-slate-600 outline-none cursor-pointer">
                <option value="TOUS">Tous les statuts</option>
                <option value="PRESENT">Présent</option>
                <option value="RETARD">En Retard</option>
                <option value="ABSENT">Absent</option>
                <option value="TELETRAVAIL">Télétravail</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border">
              <Calendar size={14} className="text-slate-400" />
              <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="bg-transparent text-xs font-semibold text-slate-600 outline-none cursor-pointer">
                <option value="TOUS">Toutes les dates</option>
                <option value="TODAY">Aujourd'hui</option>
                <option value="WEEK">7 derniers jours</option>
                <option value="MONTH">Mois en cours</option>
              </select>
            </div>

            <Button onClick={() => { setSearch(''); setStatusFilter('TOUS'); setDateFilter('TOUS'); fetchPresences(); }} className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl" title="Réinitialiser les filtres">
              <RefreshCw size={14} />
            </Button>
          </div>
        </div>
      </div>

      {/* Tableau des Présences */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs uppercase font-bold text-slate-500 tracking-wider border-b">
              <tr>
                <th className="p-4 pl-6">Horodatage / Date</th>
                <th className="p-4">Stagiaire concerné</th>
                <th className="p-4 text-center">Statut</th>
                <th className="p-4">Données IP</th>
                <th className="p-4 text-right pr-6">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={`skel-${i}`} className="animate-pulse bg-white">
                    <td className="p-4 pl-6"><div className="h-4 bg-slate-100 rounded w-28"></div></td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100"></div>
                        <div className="space-y-1"><div className="h-4 bg-slate-100 rounded w-32"></div><div className="h-3 bg-slate-100 rounded w-20"></div></div>
                      </div>
                    </td>
                    <td className="p-4"><div className="h-6 bg-slate-100 rounded-full w-20 mx-auto"></div></td>
                    <td className="p-4"><div className="h-3 bg-slate-100 rounded w-24"></div></td>
                    <td className="p-4 text-right pr-6"><div className="h-4 bg-slate-100 rounded w-6 ml-auto"></div></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-xs mx-auto">
                      <Search size={32} className="text-slate-300" />
                      <span className="text-slate-700 font-semibold text-sm">Aucun résultat trouvé</span>
                      <span className="text-xs text-slate-400">Modifiez vos critères pour affiner la liste.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((l, index) => {
                  const rowId = l.id || (l.stagiaire?.id ? `${l.stagiaire.id}-${index}` : `row-${index}`);
                  return (
                    <tr key={rowId} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="p-4 pl-6 font-medium text-slate-700 whitespace-nowrap">
                        {l.heurePointage ? fmtDateTime(l.heurePointage) : l.createdAt ? fmtDateTime(l.createdAt) : "— Pas de pointage"}
                      </td>
                      
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 via-indigo-500 to-cyan-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                            {l.stagiaire?.prenom?.[0] || 'S'}{l.stagiaire?.nom?.[0] || 'G'}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-800">
                              {l.stagiaire ? `${l.stagiaire.prenom} ${l.stagiaire.nom}` : 'Collaborateur Inconnu'}
                            </div>
                            <div className="text-slate-400 text-xs">{l.stagiaire?.email || "Pas d'adresse renseignée"}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-center whitespace-nowrap">
                        <Badge tone={statusTones[l.statut] || 'danger'}>
                          {l.statut || 'ABSENT'}
                        </Badge>
                      </td>

                      <td className="p-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${l.presence?.ip || l.ip ? 'bg-emerald-400' : 'bg-slate-300'}`}></span>
                          {l.presence?.ip || l.ip || '—'}
                        </div>
                      </td>

                      <td className="p-4 text-right pr-6 text-slate-400 group-hover:text-slate-700">
                        <button className="p-1 hover:bg-slate-100 rounded-lg transition" title="Détails du pointage">
                          <FileText size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}