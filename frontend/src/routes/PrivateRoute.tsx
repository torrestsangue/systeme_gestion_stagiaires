import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';

// ✅ Changement en export nommé pour correspondre exactement à tes imports
export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  // 1. Si pas de token, l'utilisateur n'est pas connecté -> redirection login
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Si le token est là mais que Zustand n'a pas fini de charger l'objet 'user' (latence),
  // on affiche un mini chargeur au lieu de casser la redirection en silence !
  if (token && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-slate-500 font-medium">Chargement de la session sécurisée...</p>
        </div>
      </div>
    );
  }

  // 3. Tout est chargé, on laisse passer l'utilisateur !
  return <>{children}</>;
}