import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Search,
  Users,
  Briefcase,
  UserCheck,
  Calendar,
  Layers,
  FileText,
  ShieldCheck
} from 'lucide-react';

import { stagiaireService } from '../services/sgs.service'; // 💡 Changement vers le bon service unifié
import { Badge } from '../components/ui/Badge';

export default function Stagiaires() {
  const [list, setList] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // ─── CHARGEMENT DES STAGIAIRES AVEC EXTRACTION SECURISEE ──────────────────
  const loadStagiaires = () => {
    setIsLoading(true);
    stagiaireService
      .list()
      .then((res: any) => {
        // Extraction adaptative selon la structure de votre réponse backend
        if (res && res.items) {
          setList(res.items);
        } else if (Array.isArray(res)) {
          setList(res);
        } else if (res && res.stagiaires) {
          setList(res.stagiaires);
        } else {
          setList([]);
        }
      })
      .catch((err) => {
        setList([]);
        toast.error('Impossible de charger la liste des stagiaires');
        console.error("Erreur Stagiaires:", err);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadStagiaires();
  }, []);

  // ─── FILTRAGE DYNAMIQUE ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!Array.isArray(list)) return [];
    return list.filter((s) => {
      const fullname = `${s.user?.prenom || ''} ${s.user?.nom || ''}`.toLowerCase();
      const email = (s.user?.email || '').toLowerCase();
      const domaine = (s.domaine || '').toLowerCase();
      const dossier = (s.numeroDossier || '').toLowerCase();
      const term = search.toLowerCase();

      return (
        fullname.includes(term) ||
        email.includes(term) ||
        domaine.includes(term) ||
        dossier.includes(term)
      );
    });
  }, [list, search]);

 // ─── CALCULS DE STATISTIQUES EN TEMPS RÉEL ────────────────────────────────
  const stats = useMemo(() => {
    if (!Array.isArray(list)) return { total: 0, actifs: 0, domaines: 0 };
    const actifs = list.filter((s) => s.user?.actif !== false).length;
    
    // 💡 Corrigé ici : renommage propre en 'domainesUniques'
    const domainesUniques = new Set(list.map((s) => s.domaine).filter(Boolean)).size;
    
    return {
      total: list.length,
      actifs,
      domaines: domainesUniques
    };
  }, [list]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto px-4">

      {/* HERO BANNER */}
      <div className="bg-gradient-to-r from-indigo-700 via-blue-600 to-indigo-800 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 bg-white/10 w-fit px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-md mb-3">
            <ShieldCheck size={14} />
            <span>Espace Administration</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight">
            Gestion des Stagiaires
          </h1>
          <p className="mt-2 text-indigo-100/90 max-w-xl text-sm leading-relaxed">
            Consultez les dossiers d'affectation, suivez l'état des comptes utilisateurs et pilotez l'ensemble des effectifs actifs au sein de l'établissement.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-radial from-white/10 to-transparent pointer-events-none"></div>
      </div>

      {/* BLOCS KPI RESONSIVE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-100 flex justify-between items-center hover:shadow-md transition">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Stagiaires</p>
            <h3 className="text-3xl font-black text-slate-800 mt-1">{stats.total}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
            <Users size={20} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-100 flex justify-between items-center hover:shadow-md transition">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Comptes Actifs</p>
            <h3 className="text-3xl font-black text-emerald-600 mt-1">{stats.actifs}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
            <UserCheck size={20} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-100 flex justify-between items-center hover:shadow-md transition">
          <div>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Filières / Domaines</p>
            <h3 className="text-3xl font-black text-blue-600 mt-1">{stats.domaines}</h3>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
            <Briefcase size={20} />
          </div>
        </div>

      </div>

      {/* SECTION BARRE DE RECHERCHE */}
      <div className="bg-white rounded-2xl p-4 shadow-xs border border-slate-100 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, email, filière, N° dossier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50 transition"
          />
        </div>
      </div>

      {/* GRID DE CARTES PROFIL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        
        {isLoading ? (
          // Loader Skeleton
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-6 border space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                  <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                </div>
              </div>
              <div className="h-12 bg-slate-100 rounded-xl"></div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full bg-slate-50 border border-dashed rounded-2xl p-8 text-center text-slate-400 text-sm">
            Aucun dossier stagiaire ne correspond à votre recherche.
          </div>
        ) : (
          filtered.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all p-5 flex flex-col justify-between group"
            >
              <div>
                {/* En-tête Profil */}
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-full bg-linear-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm group-hover:scale-105 transition-transform">
                    {s.user?.prenom?.[0] || ''}{s.user?.nom?.[0] || ''}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 text-base truncate">
                      {s.user?.prenom} {s.user?.nom}
                    </h3>
                    <p className="text-xs text-slate-400 truncate">
                      {s.user?.email}
                    </p>
                  </div>
                </div>

                {/* Section Spécifications Dossier */}
                <div className="mt-5 p-3.5 bg-slate-50 rounded-xl space-y-2.5 border border-slate-100">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                      <FileText size={13} /> N° Matricule
                    </span>
                    <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 border rounded-md shadow-2xs">
                      {s.numeroDossier}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                      <Layers size={13} /> Spécialité
                    </span>
                    <span className="font-semibold text-slate-700 tracking-tight">
                      {s.domaine}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200/60">
                    <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                      <Calendar size={13} /> Période
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">
                      {s.dateDebut ? new Date(s.dateDebut).toLocaleDateString() : '?'} au {s.dateFin ? new Date(s.dateFin).toLocaleDateString() : '?'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Statut du compte (Basé sur le champ 'actif' du User lié) */}
              <div className="mt-4 flex items-center justify-between">
                <Badge tone={s.user?.actif !== false ? "success" : "danger"}>
                  {s.user?.actif !== false ? "Stagiaire Actif" : "Compte Suspendu"}
                </Badge>

                {s.user?.telephone && (
                  <span className="text-[11px] text-slate-400 font-medium">
                    {s.user.telephone}
                  </span>
                )}
              </div>

            </div>
          ))
        )}

      </div>
    </div>
  );
}