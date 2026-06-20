import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, ClipboardList, QrCode,
  CreditCard, Award, Inbox, LogOut, GraduationCap,
} from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

const items = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/inscriptions', label: 'Inscriptions', icon: Inbox, roles: ['SUPER_ADMIN', 'ADMIN_RH'] },
  { to: '/app/stagiaires', label: 'Stagiaires', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN_RH', 'TUTEUR'] },
  { to: '/app/taches', label: 'Tâches', icon: ClipboardList },
  { to: '/app/rapports', label: 'Rapports', icon: FileText },
  { to: '/app/presences', label: 'Présences', icon: QrCode },
  { to: '/app/paiements', label: 'Paiements', icon: CreditCard, roles: ['SUPER_ADMIN', 'ADMIN_RH', 'STAGIAIRE'] },
  { to: '/app/evaluations', label: 'Évaluations', icon: Award, roles: ['SUPER_ADMIN', 'ADMIN_RH', 'TUTEUR'] },
];

export function Sidebar() {
  const { user, logout } = useAuthStore();
  const nav = useNavigate();
  const onLogout = () => { logout(); nav('/login'); };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-5 border-b border-slate-100 flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 text-white grid place-items-center font-bold shadow-sm">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div>
          <div className="font-bold text-slate-900 leading-tight">SGS</div>
          <div className="text-xs text-slate-500">Gestion stagiaires</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {items
          .filter((i) => !i.roles || i.roles.includes(user?.role ?? ''))
          .map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              end={i.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <i.icon className="w-4 h-4" />
              {i.label}
            </NavLink>
          ))}
      </nav>

      <div className="p-3 border-t border-slate-100">
        <div className="px-3 py-2 mb-2 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 grid place-items-center font-semibold text-sm">
            {user?.prenom?.[0]}{user?.nom?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900 truncate">{user?.prenom} {user?.nom}</div>
            <div className="text-xs text-slate-500 truncate">{user?.role}</div>
          </div>
        </div>
        <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-red-50 hover:text-red-700 transition">
          <LogOut className="w-4 h-4" /> Déconnexion
        </button>
      </div>
    </aside>
  );
}
