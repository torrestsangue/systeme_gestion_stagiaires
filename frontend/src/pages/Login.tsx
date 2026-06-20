// src/pages/Login.tsx
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { GraduationCap, Users, Briefcase, Award } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../store/auth.store';

export default function Login() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);

  const login = useAuthStore((s) => s.login);
  const nav   = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. On lance la connexion et on récupère DIRECTEMENT la réponse du store s'il la renvoie,
      // ou on attend que l'action s'exécute.
        const result = await login(email, password);

  console.log("LOGIN RESULT =", result);
  console.log("TOKEN LOCALSTORAGE =", localStorage.getItem("token"));
      // 2. Pour contourner les bugs de latence de Zustand, on va lire DIRECTEMENT 
      // le token qui vient d'être enregistré pour décoder le rôle de manière 100% fiable.
      const token = localStorage.getItem('token') || useAuthStore.getState().token;

      if (!token) {
        console.error('Aucun token trouvé immédiatement après la connexion !');
        toast.error('Erreur d\'initialisation de la session.');
        return;
      }

      // 3. Décodage manuel sécurisé du JWT (Zéro dépendance aux délais du Store)
      const base64Url = token.split('.')[1] || '';
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      
      console.log('=== REDIRECTION CLIENT - ROLE DÉCODÉ ===', payload?.role);

      const userRole = String(payload?.role || '').toUpperCase();

      // 4. Redirection immédiate et stricte
      if (userRole === 'STAGIAIRE') {
        console.log('Redirection en cours vers l\'espace Stagiaire...');
        nav('/app');
      } else {
        console.log('Redirection en cours vers l\'espace Admin/RH...');
        nav('/app');
      }
      
    } catch (error: any) {
      console.error("Échec de la redirection côté client :", error);
      toast.error(error?.response?.data?.error ?? error?.response?.data?.message ?? 'Connexion impossible');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-100">

      {/* ── GAUCHE ── */}
      <div className="hidden lg:flex relative overflow-hidden flex-col justify-between p-12 bg-gradient-to-br from-indigo-700 via-blue-700 to-cyan-600 text-white">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-300/20 rounded-full blur-3xl" />

        <Link to="/" className="flex items-center gap-3 z-10">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-bold text-xl">SGS</h2>
            <p className="text-sm text-white/80">Smart Gestion Stagiaires</p>
          </div>
        </Link>

        <div className="z-10">
          <span className="bg-white/20 px-4 py-2 rounded-full text-sm">
            Plateforme de gestion des stages
          </span>
          <h1 className="mt-6 text-5xl font-extrabold leading-tight">
            Gérez vos<br />stagiaires<br />simplement.
          </h1>
          <p className="mt-6 text-lg text-white/90 max-w-lg">
            Une solution moderne pour suivre les présences, tâches,
            paiements, rapports et évaluations des stagiaires en temps réel.
          </p>
          <div className="grid grid-cols-3 gap-5 mt-12">
            {[
              { Icon: Users,     val: '250+', label: 'Stagiaires'   },
              { Icon: Briefcase, val: '120+', label: 'Entreprises'  },
              { Icon: Award,     val: '95%',  label: 'Satisfaction' },
            ].map(({ Icon, val, label }) => (
              <div key={label} className="bg-white/10 backdrop-blur-md rounded-2xl p-4">
                <Icon className="w-6 h-6 mb-2" />
                <h3 className="text-3xl font-bold">{val}</h3>
                <p className="text-sm text-white/80">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="text-sm text-white/70 z-10">
          © {new Date().getFullYear()} SGS — Tous droits réservés
        </div>
      </div>

      {/* ── DROITE ── */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <form
          onSubmit={submit}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-8 space-y-6"
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
              <GraduationCap className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Connexion</h1>
            <p className="text-slate-500 mt-2">Accédez à votre espace SGS</p>
          </div>

          <Input
            label="Adresse Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Input
            label="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="text-right -mt-2">
            <Link
              to="/forgot-password"
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          <Button
            type="submit"
            loading={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            Se connecter
          </Button>

          <div className="text-center text-sm text-slate-500">
            Pas encore de compte ?{' '}
            <Link
              to="/inscription"
              className="font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Candidater
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}