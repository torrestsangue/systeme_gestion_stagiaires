import { useEffect, useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { 
  Plus, 
  Search, 
  Calendar, 
  ArrowRight, 
  FolderCheck,
  User,
  Kanban,
  RefreshCw
} from 'lucide-react';
import { tacheService, stagiaireService } from '../services/sgs.service';
import { useAuthStore } from '../store/auth.store';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

const COLS = [
  { id: 'A_FAIRE', label: 'À faire', tone: 'neutral' as const, bg: 'bg-slate-50', border: 'border-slate-200' },
  { id: 'EN_COURS', label: 'En cours', tone: 'info' as const, bg: 'bg-blue-50/40', border: 'border-blue-100' },
  { id: 'EN_REVISION', label: 'En révision', tone: 'warning' as const, bg: 'bg-amber-50/40', border: 'border-amber-100' },
  { id: 'TERMINEE', label: 'Terminée', tone: 'success' as const, bg: 'bg-emerald-50/30', border: 'border-emerald-100' },
];

const PRIORITIES: Record<string, { label: string, color: string }> = {
  HAUTE: { label: 'Haute', color: 'text-rose-600 bg-rose-50 border-rose-100' },
  MOYENNE: { label: 'Moyenne', color: 'text-amber-600 bg-amber-50 border-amber-100' },
  BASSE: { label: 'Basse', color: 'text-slate-600 bg-slate-100 border-slate-200' },
};

export default function Taches() {
  const user = useAuthStore((s) => s.user);
  
  const [taches, setTaches] = useState<any[]>([]);
  const [stagiaires, setStagiaires] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // États du formulaire
  const [showAddForm, setShowAddForm] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('MOYENNE');
  const [selectedStagiaireId, setSelectedStagiaireId] = useState('');
  const [newDeadline, setNewDeadline] = useState('');

  // ─── CHARGEMENT DES TÂCHES ET STAGIAIRES ──────────────────────────────────
  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Récupération des tâches (Prise en compte du format { taches, kanban, total })
      const resTaches: any = await tacheService.list();
      if (resTaches && resTaches.taches) {
        setTaches(resTaches.taches);
      } else if (Array.isArray(resTaches)) {
        setTaches(resTaches);
      } else {
        setTaches([]);
      }

      // 2. Si l'utilisateur est Admin ou Tuteur, on charge les stagiaires pour l'assignation
      if (user?.role !== 'STAGIAIRE') {
        const resStag: any = await stagiaireService.list();
        const listStag = resStag?.items || (Array.isArray(resStag) ? resStag : []);
        setStagiaires(listStag);
        if (listStag.length > 0) {
          setSelectedStagiaireId(listStag[0].id);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors du chargement des données.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // ─── MISE À JOUR DU STATUT (PATCH /taches/:id/statut) ─────────────────────
  const move = async (id: string, statut: string) => {
    try {
      // Appelle la route router.patch('/taches/:id/statut', ...)
      await tacheService.updateStatut(id, statut);
      toast.success('Statut mis à jour');
      
      // Rafraîchissement local optimisé
      const res: any = await tacheService.list();
      setTaches(res?.taches || (Array.isArray(res) ? res : []));
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || 'Erreur lors du changement de statut';
      toast.error(errorMsg);
    }
  };

  // ─── CRÉATION D'UNE TÂCHE CONFORME AU BACKEND ──────────────────────────────
  const handleCreateTache = async (colId: string) => {
    if (!newTitle.trim()) {
      toast.error('Le titre de la tâche est obligatoire');
      return;
    }

    // Détermination du stagiaireId cible
    let targetStagiaireId = selectedStagiaireId;
    if (user?.role === 'STAGIAIRE') {
      // Si c'est un stagiaire connecté, on cherche son entité stagiaire correspondante
      toast.error("Les stagiaires ne peuvent pas s'assigner de tâches.");
      return;
    }

    if (!targetStagiaireId) {
      toast.error('Veuillez sélectionner un stagiaire pour cette tâche.');
      return;
    }

    try {
      // Payload exact attendu par TacheController.create
      await tacheService.create({
        titre: newTitle,
        description: newDesc,
        priorite: newPriority,
        deadline: newDeadline ? new Date(newDeadline).toISOString() : null,
        stagiaireId: targetStagiaireId
      });

      toast.success('Tâche créée avec succès ✅');
      setNewTitle('');
      setNewDesc('');
      setNewDeadline('');
      setShowAddForm(null);
      
      // Recharger le tableau
      const res: any = await tacheService.list();
      setTaches(res?.taches || (Array.isArray(res) ? res : []));
    } catch (error: any) {
      const serverError = error?.response?.data?.error || "Impossible de créer la tâche";
      toast.error(serverError);
    }
  };

  // ─── DRAG AND DROP NATIF HTML5 ─────────────────────────────────────────────
  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent, targetStatut: string) => {
    e.preventDefault();
    const tacheId = e.dataTransfer.getData('text/plain');
    if (tacheId) {
      const current = taches.find(t => t.id === tacheId);
      if (current && current.statut !== targetStatut) {
        move(tacheId, targetStatut);
      }
    }
  };

  // ─── FILTRAGE DES TÂCHES ───────────────────────────────────────────────────
  const filteredTaches = useMemo(() => {
    if (!Array.isArray(taches)) return [];
    return taches.filter(t => 
      t.titre?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase())
    );
  }, [taches, search]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto px-4">
      
      {/* BARRE EN-TÊTE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-sm uppercase tracking-wider">
            <Kanban size={16} />
            <span>Suivi des objectifs</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mt-1">Tableau Kanban</h1>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrer une tâche..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm transition"
          />
        </div>
      </div>

      {/* COLONNES DU KANBAN */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {COLS.map((c) => {
          const colTaches = filteredTaches.filter((t) => t.statut === c.id);
          
          return (
            <div 
              key={c.id} 
              className={`rounded-2xl border p-4 min-h-[500px] flex flex-col transition-all ${c.bg} ${c.border}`}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, c.id)}
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-dashed border-slate-200">
                <div className="flex items-center gap-2">
                  <Badge tone={c.tone}>{c.label}</Badge>
                  <span className="text-xs font-bold text-slate-400 bg-white border px-2 py-0.5 rounded-full shadow-sm">
                    {colTaches.length}
                  </span>
                </div>
                
                {user?.role !== 'STAGIAIRE' && (
                  <button 
                    onClick={() => setShowAddForm(showAddForm === c.id ? null : c.id)}
                    className="p-1 hover:bg-white border rounded-lg text-slate-500 hover:text-indigo-600 shadow-sm transition"
                  >
                    <Plus size={16} />
                  </button>
                )}
              </div>

              {/* FORMULAIRE SÉCURISÉ CONTRE LA REQUÊTE HTTP 400 */}
              {showAddForm === c.id && user?.role !== 'STAGIAIRE' && (
                <div className="bg-white p-3 rounded-xl border border-indigo-100 shadow-md space-y-3 mb-3">
                  <input 
                    type="text"
                    placeholder="Nom / Titre de la tâche *"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    autoFocus
                  />
                  <textarea 
                    placeholder="Description de l'objectif..."
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    className="w-full border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-indigo-500 text-slate-600 resize-none h-14"
                  />
                  
                  {/* Choix impératif du stagiaire cible */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Assigner à *</label>
                    <select
                      value={selectedStagiaireId}
                      onChange={(e) => setSelectedStagiaireId(e.target.value)}
                      className="w-full text-xs border rounded bg-slate-50 p-1.5 text-slate-700 outline-none"
                    >
                      {stagiaires.length === 0 && <option value="">Aucun stagiaire disponible</option>}
                      {stagiaires.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.user?.prenom} {s.user?.nom}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Deadline & Priorité */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Priorité</label>
                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value)}
                        className="w-full text-[11px] border rounded bg-slate-50 p-1 text-slate-600 outline-none"
                      >
                        <option value="BASSE">Basse</option>
                        <option value="MOYENNE">Moyenne</option>
                        <option value="HAUTE">Haute</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Échéance</label>
                      <input 
                        type="date"
                        value={newDeadline}
                        onChange={(e) => setNewDeadline(e.target.value)}
                        className="w-full text-[11px] border rounded bg-slate-50 p-0.5 text-slate-600 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <button 
                      onClick={() => setShowAddForm(null)}
                      className="text-[11px] font-medium text-slate-500 px-2 py-1 hover:bg-slate-50 rounded"
                    >
                      Annuler
                    </button>
                    <button 
                      onClick={() => handleCreateTache(c.id)}
                      className="text-[11px] font-semibold text-white bg-indigo-600 px-2.5 py-1 rounded hover:bg-indigo-700 shadow-sm"
                    >
                      Ajouter
                    </button>
                  </div>
                </div>
              )}

              {/* CARTES DES TÂCHES */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] pr-1">
                {isLoading ? (
                  <div className="h-20 bg-white/60 border border-dashed rounded-xl animate-pulse"></div>
                ) : colTaches.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 border border-dashed rounded-xl border-slate-200 bg-white/30">
                    Déposer une tâche ici
                  </div>
                ) : (
                  colTaches.map((t) => {
                    const priorityInfo = PRIORITIES[t.priorite] || PRIORITIES.MOYENNE;
                    
                    return (
                      <div 
                        key={t.id} 
                        draggable
                        onDragStart={(e) => onDragStart(e, t.id)}
                        className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-200 transition-all cursor-grab active:cursor-grabbing group relative"
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${priorityInfo.color}`}>
                            {priorityInfo.label}
                          </span>
                          
                          {t.deadline && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-400">
                              <Calendar size={12} />
                              <span>{new Date(t.deadline).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>

                        <div className="font-semibold text-sm text-slate-800 tracking-tight group-hover:text-indigo-900 transition-colors">
                          {t.titre}
                        </div>
                        
                        {t.description && (
                          <div className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                            {t.description}
                          </div>
                        )}

                        {/* Propriétaire de la tâche (Données issues de l'include Prisma backend) */}
                        {t.stagiaire?.user && (
                          <div className="mt-3 pt-2 border-t border-slate-50 flex items-center gap-1.5 text-xs text-slate-400">
                            <div className="w-5 h-5 rounded-full bg-indigo-50 text-[9px] font-bold text-indigo-600 flex items-center justify-center border border-indigo-100">
                              {t.stagiaire.user.prenom?.[0]}{t.stagiaire.user.nom?.[0]}
                            </div>
                            <span className="truncate font-medium text-slate-600">
                              {t.stagiaire.user.prenom} {t.stagiaire.user.nom}
                            </span>
                          </div>
                        )}

                        {/* Sélecteur manuel de secours adaptatif */}
                        <div className="mt-3 pt-2 border-t border-slate-50 flex items-center gap-2 lg:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <ArrowRight size={12} className="text-slate-400 shrink-0" />
                          <select 
                            value={t.statut} 
                            onChange={(e) => move(t.id, e.target.value)} 
                            className="text-[11px] bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded px-2 py-1 w-full outline-none cursor-pointer"
                          >
                            {COLS.map((c2) => (
                              <option key={c2.id} value={c2.id}>{c2.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!isLoading && taches.length === 0 && (
        <div className="bg-slate-50 border border-dashed rounded-2xl p-12 text-center max-w-sm mx-auto mt-6">
          <FolderCheck className="mx-auto text-slate-300 mb-2" size={32} />
          <div className="text-sm font-semibold text-slate-700">Aucune tâche enregistrée</div>
          <p className="text-xs text-slate-400 mt-1">
            Les tâches créées par l'administration s'afficheront ici en temps réel.
          </p>
        </div>
      )}
    </div>
  );
}