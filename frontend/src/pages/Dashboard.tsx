// pages/Dashboard.tsx — dynamic dashboard (fetch API for KPIs, presences and recent activities)
import { useEffect, useState } from 'react';
import { Users, CheckCircle2, AlertCircle, CreditCard, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { useAuthStore } from '../store/auth.store';
import api from '../services/api';

const defaultWeek = [
  { jour: 'Lun', presents: 0 }, { jour: 'Mar', presents: 0 },
  { jour: 'Mer', presents: 0 }, { jour: 'Jeu', presents: 0 },
  { jour: 'Ven', presents: 0 }, { jour: 'Sam', presents: 0 }, { jour: 'Dim', presents: 0 },
];

const Kpi = ({ icon: Icon, label, value, tone }: any) => (
  <div className="card flex items-center gap-4">
    <div className={`w-12 h-12 rounded-xl grid place-items-center ${tone}`}><Icon className="w-6 h-6" /></div>
    <div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  </div>
);

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const [now, setNow] = useState(new Date());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<any>({ total: 0, actifs: 0, presentsAujourdhui: 0, rapportsEnAttente: 0, paiementsAValider: 0 });
  const [todayPresence, setTodayPresence] = useState<any>(null);
  const [weekData, setWeekData] = useState<any[]>(defaultWeek);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true); setError(null);
      try {
        const [sRes, pRes, wRes, rRes, tRes, iRes] = await Promise.all([
          api.get('/stagiaires/stats'),
          api.get('/presences/jour'),
          api.get('/presences/semaine'),
          api.get('/rapports?limit=6'),
          api.get('/taches?limit=6'),
          api.get('/inscriptions?limit=6'),
        ]);

        setStats(sRes.data ?? {});
        setTodayPresence(pRes.data ?? null);
        // Debug: log responses to help diagnose why "Présents aujourd'hui" peut être vide
        // (à supprimer une fois le problème identifié)
        // eslint-disable-next-line no-console
        console.debug('Dashboard API responses', { stats: sRes.data, presencesDuJour: pRes.data, semaine: wRes.data });

        const week = (wRes.data && wRes.data.data) ? wRes.data.data : (Array.isArray(wRes.data) ? wRes.data : defaultWeek);
        const weekArr = Array.isArray(week) ? week : defaultWeek;
        setWeekData(weekArr.map((d: any) => ({ jour: d.jour, presents: d.presents })));

        const rapportsRaw = Array.isArray(rRes.data?.items) ? rRes.data.items : (Array.isArray(rRes.data) ? rRes.data : []);
        const rapports = (rapportsRaw).map((x: any) => ({
          type: 'rapport', who: x.auteur?.prenom ? `${x.auteur.prenom} ${x.auteur.nom ?? ''}`.trim() : x.titre ?? 'Rapport',
          what: x.titre ?? 'Rapport soumis', at: x.createdAt ?? x.date ?? x.updatedAt ?? null,
        }));
        const tachesRaw = Array.isArray(tRes.data?.items) ? tRes.data.items : (Array.isArray(tRes.data) ? tRes.data : []);
        const taches = (tachesRaw).map((x: any) => ({
          type: 'tache', who: x.assignedTo?.prenom ? `${x.assignedTo.prenom} ${x.assignedTo.nom ?? ''}`.trim() : x.titre ?? 'Tâche',
          what: x.titre ?? 'Tâche mise à jour', at: x.createdAt ?? x.updatedAt ?? null,
        }));
        const inscRaw = Array.isArray(iRes.data?.items) ? iRes.data.items : (Array.isArray(iRes.data) ? iRes.data : []);
        const insc = (inscRaw).map((x: any) => ({
          type: 'inscription', who: x.nom ? `${x.prenom ?? ''} ${x.nom}`.trim() : 'Nouvelle inscription',
          what: 'Inscription reçue', at: x.createdAt ?? x.date ?? null,
        }));

        const merged = [...rapports, ...taches, ...insc]
          .filter(a => a.at)
          .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
          .slice(0, 6);

        setActivities(merged);
      } catch (err: any) {
        console.error('Dashboard fetch error', err);
        setError(err?.response?.data?.error || err.message || 'Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bienvenue, {user?.prenom} 👋</h1>
        <p className="text-sm text-slate-500">{now.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
      </div>

      {error && <div className="text-sm text-red-600">Erreur: {error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Users} label="Stagiaires actifs" value={stats.actifs ?? stats.total ?? 0} tone="bg-primary-50 text-primary-600" />
        <Kpi icon={CheckCircle2} label="Présents aujourd'hui" value={stats.presentsAujourdhui ?? (todayPresence?.resume?.presents ?? 0)} tone="bg-emerald-50 text-emerald-600" />
        <Kpi icon={AlertCircle} label="Rapports en attente" value={stats.rapportsEnAttente ?? 0} tone="bg-amber-50 text-amber-600" />
        <Kpi icon={CreditCard} label="Paiements à valider" value={stats.paiementsAValider ?? 0} tone="bg-indigo-50 text-indigo-600" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Présence hebdomadaire</h2>
            <span className="text-xs text-slate-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> {loading ? 'Chargement...' : '+8% vs sem. précédente'}</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={weekData.length ? weekData : defaultWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="jour" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} />
              <Tooltip />
              <Bar dataKey="presents" fill="#4f46e5" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2 className="font-semibold text-slate-900 mb-4">Activité récente</h2>
          <ul className="space-y-3 text-sm">
            {(activities.length ? activities : [
              { who: 'Aucun', what: 'Pas d’activité récente', at: null }
            ]).map((act: any, i: number) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 grid place-items-center text-xs font-semibold flex-shrink-0">{(act.who || '?')[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-slate-900"><span className="font-medium">{act.who}</span> <span className="text-slate-500">{act.what}</span></div>
                  <div className="text-xs text-slate-400">{act.at ? new Date(act.at).toLocaleString('fr-FR') : ''}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}