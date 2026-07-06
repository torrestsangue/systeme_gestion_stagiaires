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

  const handleValider = async (id: string, status: 'ACCEPTEE' | 'REFUSEE') => {
    if (status === 'REFUSEE' && !window.confirm('Êtes-vous sûr de vouloir refuser cette candidature ?')) {
      return;
    }

    let passwordToSend = undefined;

    // Si la candidature est acceptée, on gère le mot de passe dynamique
    if (status === 'ACCEPTEE') {
      const choix = window.confirm(
        "Voulez-vous générer automatiquement le mot de passe ? \n\n(Cliquez sur 'Annuler' pour saisir un mot de passe personnalisé)"
      );

      if (choix) {
        passwordToSend = generateRandomPassword();
      } else {
        const customPassword = window.prompt("Veuillez saisir le mot de passe pour ce stagiaire :");
        if (customPassword === null) return; // L'utilisateur a annulé l'action complète
        if (!customPassword.trim()) {
          toast.error("Le mot de passe ne peut pas être vide.");
          return;
        }
        passwordToSend = customPassword.trim();
      }
    }

    try {
      setUpdatingId(id);
      
      // On passe le mot de passe dynamique en second paramètre (ou dans un objet selon votre API)
      await inscriptionService.valider(id, status, passwordToSend);
      
      if (status === 'ACCEPTEE') {
        toast.success(`Candidature acceptée ! Mot de passe envoyé : ${passwordToSend}`);
      } else {
        toast.success('Candidature refusée.');
      }
      
      await reload();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour du statut.');
    } finally {
      setUpdatingId(null);
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
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead className="bg-slate-50/70 border-b border-slate-100">
              <tr className="text-xs uppercase text-slate-500 font-semibold tracking-wider">
                <th className="p-4">Candidature</th>
                <th className="p-4">Domaine</th>
                <th className="p-4">N° Dossier</th>
                <th className="p-4">Date de dépôt</th>
                <th className="p-4">Statut</th>
                <th className="p-4 text-center">Actions d'arbitrage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-600">
              {loading && list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400 font-medium">
                    Chargement des candidatures...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-slate-400">
                    Aucune candidature ne correspond à votre recherche.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                          {item.prenom?.charAt(0).toUpperCase()}
                          {item.nom?.charAt(0).toUpperCase()}
                        </div>
                        <div className="space-y-2">
                          <div className="font-semibold text-slate-800">
                            {item.prenom} {item.nom}
                          </div>
                          <div className="text-xs text-slate-400">{item.email}</div>
                          <div className="flex flex-wrap gap-2">
                            {item.status === 'RECUE' && (
                              <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-800">
                                Nouvelle candidature
                              </span>
                            )}
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-500">
                              Dossier {item.numeroDossier || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 font-medium text-slate-700">{item.domaine}</td>
                    <td className="p-4 font-mono text-xs text-slate-500">{item.numeroDossier || 'N/A'}</td>
                    <td className="p-4 text-slate-500">{fmtDate(item.createdAt)}</td>
                    <td className="p-4">
                      <Badge tone={tone[item.status] || 'info'}>
                        {item.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant={item.status === 'ACCEPTEE' ? 'secondary' : 'primary'}
                          disabled={item.status === 'ACCEPTEE' || updatingId !== null}
                          isLoading={updatingId === item.id}
                          onClick={() => handleValider(item.id, 'ACCEPTEE')}
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
                          onClick={() => handleValider(item.id, 'REFUSEE')}
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
    </div>
  );
}