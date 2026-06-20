import { Bell, Search } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';

export function Navbar() {
  const user = useAuthStore((s) => s.user);
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
      <div className="flex-1 max-w-md relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input placeholder="Rechercher..." className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-100 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white" />
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
        <div className="text-right">
          <div className="text-sm font-medium text-slate-900">{user?.prenom} {user?.nom}</div>
          <div className="text-xs text-slate-500">{user?.email}</div>
        </div>
      </div>
    </header>
  );
}
