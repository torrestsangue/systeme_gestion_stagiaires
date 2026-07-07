import { useEffect, useMemo, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Search,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Check,
  X
} from 'lucide-react';
// import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { inscriptionService } from '../services/sgs.service';
import { fmtDate } from '../utils/format';

const tone: Record<string, 'info' | 'warning' | 'success' | 'danger'> = {
  RECUE: 'info',
  EN_EXAMEN: 'warning',
  ACCEPTEE: 'success',
  REFUSEE: 'danger',
};

// Fonction utilitaire pour générer un mot de passe dynamique aléatoire si besoin
const generateRandomPassword = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^*";
  let password = "";
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

export default function Inscriptions() {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'accept' | 'reject' | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const res = await inscriptionService.list();
      setList(Array.isArray(res) ? res : res.items || []);
    } catch (error) {
      console.error(error);
      setList([]);
      toast.error('Erreur de chargement des candidatures');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Ouvrir la modale (accept/reject) et sélectionner le candidat
  const openModalFor = (mode: 'accept' | 'reject', candidate: any) => {
    setSelectedCandidate(candidate);
    setModalMode(mode);
    setModalOpen(true);
  };

  // Confirmation depuis la modale
  const handleConfirmFromModal = async (payload: { password?: string; comment?: string }) => {
    if (!selectedCandidate || !modalMode) return;
    const id = selectedCandidate.id;
    const status = modalMode === 'accept' ? 'ACCEPTEE' : 'REFUSEE';
    try {
      setUpdatingId(id);
      await inscriptionService.valider(id, {
        status,
        password: payload.password,
        commentaire: payload.comment,
      });
      toast.success(modalMode === 'accept' ? `Candidature acceptée !` : 'Candidature refusée.');
      setModalOpen(false);
      await reload();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la mise à jour du statut.");
    } finally {
      setUpdatingId(null);
      setSelectedCandidate(null);
      setModalMode(null);
    }
  };

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return list;
    return list.filter((item) =>
      `${item.prenom || ''} ${item.nom || ''} ${item.email || ''} ${item.domaine || ''} ${item.numeroDossier || ''}`
        .toLowerCase()
        .includes(query)
    );
  }, [list, search]);

  const stats = useMemo(() => {
    return {
      total: list.length,
      acceptees: list.filter((x) => x.status === 'ACCEPTEE').length,
      refusees: list.filter((x) => x.status === 'REFUSEE').length,
      attente: list.filter((x) => x.status === 'RECUE' || x.status === 'EN_EXAMEN').length,
    };
  }, [list]);

  const Card = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 flex justify-between items-center transition hover:shadow-md">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="text-3xl font-bold text-slate-800 mt-1">{value}</h3>
      </div>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color}`}>
        <Icon size={22} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 p-1 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-indigo-700 via-blue-700 to-cyan-600 rounded-3xl p-8 text-white shadow-lg shadow-indigo-100">
        <h1 className="text-4xl font-bold tracking-tight">Gestion des candidatures</h1>
        <p className="mt-2 text-white/80 max-w-xl">
          Analysez, filtrez et traitez les demandes d'inscription des futurs stagiaires du système.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card title="Total" value={stats.total} icon={Users} color="bg-indigo-50 text-indigo-600" />
        <Card title="Acceptées" value={stats.acceptees} icon={CheckCircle} color="bg-emerald-50 text-emerald-600" />
        <Card title="Refusées" value={stats.refusees} icon={XCircle} color="bg-rose-50 text-rose-600" />
        <Card title="En attente" value={stats.attente} icon={Clock} color="bg-amber-50 text-amber-600" />
      </div>

      {/* RECHERCHE */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4">
        <div className="relative max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, email, domaine, dossier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition"
          />
        </div>
      </div>

      {/* TABLEAU */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full table-auto text-left">
            <thead className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-slate-200">
              <tr className="text-xs uppercase font-semibold tracking-[0.18em]">
                <th className="p-4">Candidature</th>
                <th className="p-4">Domaine</th>
                <th className="p-4">Fichiers</th>
                <th className="p-4 hidden lg:table-cell">N° dossier</th>
                <th className="p-4 hidden sm:table-cell">Date</th>
                <th className="p-4">Statut</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600 bg-slate-50">
              {loading && list.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500 font-medium">
                    Chargement des candidatures...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500">
                    Aucune candidature ne correspond à votre recherche.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-white transition-colors duration-200">
                    <td className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-cyan-500 text-white flex items-center justify-center font-semibold text-sm shadow-lg shadow-slate-200/40">
                          {item.prenom?.charAt(0).toUpperCase()}
                          {item.nom?.charAt(0).toUpperCase()}
                        </div>
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-900">{item.prenom} {item.nom}</p>
                          <p className="text-xs text-slate-500">{item.email}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] text-slate-600">
                              Dossier {item.numeroDossier || 'N/A'}
                            </span>
                            {item.status === 'RECUE' && (
                              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] uppercase tracking-[0.12em] font-semibold text-amber-700">
                                Nouvelle
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 align-top">
                      <div className="font-semibold text-slate-800">{item.domaine}</div>
                    </td>
                    <td className="p-4 align-top">
                      <div className="flex flex-col gap-2">
                        {item.cvUrl ? (
                          <a
                            href={item.cvUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition"
                          >
                            CV
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">Aucun CV</span>
                        )}
                        {item.motivationUrl ? (
                          <a
                            href={item.motivationUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition"
                          >
                            Lettre
                          </a>
                        ) : (
                          <span className="text-xs text-slate-400">Aucune lettre</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-500 align-top">{item.numeroDossier || 'N/A'}</td>
                    <td className="p-4 hidden sm:table-cell text-slate-500 align-top">{fmtDate(item.createdAt)}</td>
                    <td className="p-4 align-top">
                      <Badge tone={tone[item.status] || 'info'}>
                        {item.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-center align-top">
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant={item.status === 'ACCEPTEE' ? 'secondary' : 'primary'}
                          disabled={item.status === 'ACCEPTEE' || updatingId !== null}
                          isLoading={updatingId === item.id}
                          onClick={() => openModalFor('accept', item)}
                          className="flex items-center gap-1.5 px-3 py-1.5"
                        >
                          <Check size={14} />
                          Accepter
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={item.status === 'REFUSEE' || updatingId !== null}
                          isLoading={updatingId === item.id}
                          onClick={() => openModalFor('reject', item)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 shadow-none"
                        >
                          <X size={14} />
                          Refuser
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={modalOpen}
        mode={modalMode}
        candidateName={selectedCandidate ? `${selectedCandidate.prenom} ${selectedCandidate.nom}` : ''}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmFromModal}
      />
    </div>
  );
}
