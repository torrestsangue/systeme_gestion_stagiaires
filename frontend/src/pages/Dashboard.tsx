// pages/Dashboard.tsx — dynamic dashboard (fetch API for KPIs, presences and recent activities)
import { useEffect, useState } from 'react';
import { Users, CheckCircle2, AlertCircle, CreditCard, TrendingUp, LogIn, LogOut, Edit, Trash2, Plus, CheckSquare, Eye, Lock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { useAuthStore } from '../store/auth.store';
import api from '../services/api';

const getActivityIcon = (action: string) => {
  if (action.includes('PAIEMENT')) return { icon: CreditCard, color: 'text-indigo-500', bg: 'bg-indigo-50' };
  if (action.includes('USER')) return { icon: Users, color: 'text-purple-500', bg: 'bg-purple-50' };
  if (action.includes('RAPPORT')) return { icon: Edit, color: 'text-blue-500', bg: 'bg-blue-50' };
  if (action.includes('PRÉSENCE')) return { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' };
  if (action.includes('TRANCHE')) return { icon: CheckSquare, color: 'text-cyan-500', bg: 'bg-cyan-50' };
  if (action.includes('TACHE')) return { icon: Plus, color: 'text-orange-500', bg: 'bg-orange-50' };
  if (action.includes('LOGIN')) return { icon: LogIn, color: 'text-green-500', bg: 'bg-green-50' };
  if (action.includes('LOGOUT')) return { icon: LogOut, color: 'text-red-500', bg: 'bg-red-50' };
  if (action.includes('DELETE') || action.includes('SUPPRIMER')) return { icon: Trash2, color: 'text-red-500', bg: 'bg-red-50' };
  if (action.includes('CREATE')) return { icon: Plus, color: 'text-green-500', bg: 'bg-green-50' };
  return { icon: Eye, color: 'text-slate-500', bg: 'bg-slate-50' };
};

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
        const [sRes, pRes, wRes, auditRes] = await Promise.all([
          api.get('/stagiaires/stats'),
          api.get('/presences/jour'),
          api.get('/presences/semaine'),
          api.get('/users/audit', { params: { limit: 8 } }),
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

        const logsRaw = Array.isArray(auditRes.data?.logs) ? auditRes.data.logs : (Array.isArray(auditRes.data) ? auditRes.data : []);
        const activitiesFromLogs = logsRaw.map((log: any) => ({
          type: 'audit',
          user: log.user ? `${log.user.prenom ?? ''} ${log.user.nom ?? ''}`.trim() : 'Système',
          action: String(log.action).replace(/_/g, ' '),
          at: log.createdAt,
        }));

        setActivities(activitiesFromLogs);
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
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-slate-900 text-lg">📋 Activité récente</h2>
            <span className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2.5 py-1 rounded-full">Temps réel</span>
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {(activities.length ? activities : [
              { user: 'Aucune activité', action: '', at: null }
            ]).map((act: any, i: number) => {
              const { icon: Icon, color, bg } = getActivityIcon(act.action);
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-all duration-200 group">
                  <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-semibold text-slate-900 truncate">{act.user}</span>
                      <span className="text-xs text-slate-600 uppercase tracking-wide truncate">{act.action}</span>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-slate-400 ml-auto flex-shrink-0">{act.at ? new Date(act.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}