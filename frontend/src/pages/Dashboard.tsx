// pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { Users, CheckCircle2, AlertCircle, CreditCard, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { useAuthStore } from '../store/auth.store';

const data = [
  { jour: 'Lun', presents: 28 }, { jour: 'Mar', presents: 32 },
  { jour: 'Mer', presents: 30 }, { jour: 'Jeu', presents: 34 },
  { jour: 'Ven', presents: 27 }, { jour: 'Sam', presents: 12 },
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
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60_000); return () => clearInterval(t); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bienvenue, {user?.prenom} 👋</h1>
        <p className="text-sm text-slate-500">{now.toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={Users} label="Stagiaires actifs" value="42" tone="bg-primary-50 text-primary-600" />
        <Kpi icon={CheckCircle2} label="Présents aujourd'hui" value="36" tone="bg-emerald-50 text-emerald-600" />
        <Kpi icon={AlertCircle} label="Rapports en attente" value="7" tone="bg-amber-50 text-amber-600" />
        <Kpi icon={CreditCard} label="Paiements à valider" value="3" tone="bg-indigo-50 text-indigo-600" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Présence hebdomadaire</h2>
            <span className="text-xs text-slate-500 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> +8% vs sem. précédente</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data}>
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
            {[
              ['Marie Dupont', 'a soumis un rapport', '5 min'],
              ['Karim Ali', 'a validé une tâche', '12 min'],
              ['Sophie Martin', "s'est présentée", '34 min'],
              ['Nouvelle inscription', 'reçue', '1 h'],
            ].map(([who, what, when], i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 grid place-items-center text-xs font-semibold flex-shrink-0">{who[0]}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-slate-900"><span className="font-medium">{who}</span> <span className="text-slate-500">{what}</span></div>
                  <div className="text-xs text-slate-400">il y a {when}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
