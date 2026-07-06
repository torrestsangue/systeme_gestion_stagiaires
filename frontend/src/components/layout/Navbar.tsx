import { Bell, Search, X } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

export function Navbar() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingInscriptions, setPendingInscriptions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN_RH';

  const fetchPendingInscriptions = async () => {
    try {
      const res = await api.get('/inscriptions', { params: { status: 'RECUE', limit: 100 } });
      const data = res.data;
      const items = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
      setPendingInscriptions(items);
      setPendingCount(data.total ?? items.length);
    } catch (err) {
      console.error('Error fetching pending inscriptions:', err);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchPendingInscriptions();
    const interval = setInterval(fetchPendingInscriptions, 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
      <div className="flex-1 max-w-md relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input placeholder="Rechercher..." className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-100 border-0 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white" />
      </div>
      <div className="flex items-center gap-3">
        {isAdmin && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
              title="Inscriptions en attente"
            >
              <Bell className="w-5 h-5" />
              {pendingCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </span>
              )}
            </button>

            {/* Dropdown */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-slate-200 z-50 max-h-96 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <h3 className="font-bold text-slate-900">Inscriptions en attente</h3>
                  <button
                    onClick={() => setShowDropdown(false)}
                    className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {pendingInscriptions.length > 0 ? (
                  <div className="overflow-y-auto flex-1">
                    {pendingInscriptions.map((insc: any, i: number) => (
                      <div
                        key={i}
                        onClick={() => {
                          navigate('/app/inscriptions');
                          setShowDropdown(false);
                        }}
                        className="px-4 py-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-semibold text-slate-900 text-sm">
                              {insc.prenom ?? ''} {insc.nom ?? ''}
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">{insc.email}</div>
                          </div>
                          <div className="text-xs text-slate-400 ml-2 flex-shrink-0">
                            {new Date(insc.createdAt).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center text-slate-400 text-sm">
                    Aucune inscription en attente
                  </div>
                )}

                {pendingInscriptions.length > 0 && (
                  <button
                    onClick={() => {
                      navigate('/app/inscriptions');
                      setShowDropdown(false);
                    }}
                    className="px-4 py-3 bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors"
                  >
                    Voir toutes les inscriptions →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="text-right">
          <div className="text-sm font-medium text-slate-900">{user?.prenom} {user?.nom}</div>
          <div className="text-xs text-slate-500">{user?.email}</div>
        </div>
      </div>
    </header>
  );
}
