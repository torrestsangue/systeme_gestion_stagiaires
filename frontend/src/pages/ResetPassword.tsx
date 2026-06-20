// src/pages/ResetPassword.tsx
import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { GraduationCap, KeyRound, ArrowLeft } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { authService } from '../services/auth.service'; // Ajustez le chemin

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token'); // On récupère ?token=... dans l'URL
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const nav = useNavigate();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      toast.error('Lien invalide ou expiré. Veuillez refaire une demande.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas.');
      return;
    }

    if (password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(token, password);
      toast.success('Mot de passe modifié avec succès !');
      // Redirection vers le login
      nav('/login');
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || 
        'Erreur lors de la réinitialisation. Le lien a peut-être expiré.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Si l'utilisateur arrive sur la page sans Token dans l'URL
  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full">
          <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 flex items-center justify-center mb-4">
            <KeyRound className="w-8 h-8 text-rose-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Lien invalide</h2>
          <p className="text-slate-500 mt-2 mb-6">
            Le lien de réinitialisation est manquant ou invalide. Veuillez refaire une demande.
          </p>
          <Link to="/forgot-password">
            <Button className="w-full">Refaire une demande</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-100">
      {/* ── GAUCHE (Identique) ── */}
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
          <h1 className="mt-6 text-5xl font-extrabold leading-tight">
            Nouveau<br />départ.
          </h1>
          <p className="mt-6 text-lg text-white/90 max-w-md">
            Choisissez un nouveau mot de passe fort pour sécuriser votre compte.
          </p>
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
              <KeyRound className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Nouveau mot de passe</h1>
            <p className="text-slate-500 mt-2">Créez votre nouveau mot de passe</p>
          </div>

          <Input
            label="Nouveau mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 6 caractères"
            required
          />

          <Input
            label="Confirmer le mot de passe"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Retapez le mot de passe"
            required
          />

          <Button
            type="submit"
            loading={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
          >
            Enregistrer le mot de passe
          </Button>

          <div className="text-center pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Annuler et retourner au login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}