// src/pages/ForgotPassword.tsx
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { GraduationCap, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { authService } from '../services/auth.service'; // Ajustez le chemin

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await authService.forgotPassword(email);
      setIsSent(true);
      toast.success('Lien de réinitialisation envoyé !');
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || 
        'Erreur lors de la demande. Veuillez réessayer.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-100">
      {/* ── GAUCHE (Identique au Login) ── */}
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
            Pas de panique.
          </h1>
          <p className="mt-6 text-lg text-white/90 max-w-md">
            Il arrive à tout le monde d'oublier son mot de passe. Entrez votre adresse e-mail et nous vous aiderons à retrouver l'accès à votre compte.
          </p>
        </div>

        <div className="text-sm text-white/70 z-10">
          © {new Date().getFullYear()} SGS — Tous droits réservés
        </div>
      </div>

      {/* ── DROITE ── */}
      <div className="flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-8">
          
          {isSent ? (
            // ÉCRAN DE SUCCÈS
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">E-mail envoyé !</h1>
              <p className="text-slate-500">
                Si un compte est associé à <span className="font-semibold text-slate-800">{email}</span>, vous recevrez un lien pour réinitialiser votre mot de passe d'ici quelques minutes.
              </p>
              <div className="pt-4">
                <Link to="/login">
                  <Button className="w-full bg-slate-900 hover:bg-slate-800">
                    Retour à la connexion
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            // FORMULAIRE DE DEMANDE
            <form onSubmit={submit} className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-100 flex items-center justify-center mb-4">
                  <Mail className="w-8 h-8 text-indigo-600" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900">Mot de passe oublié</h1>
                <p className="text-slate-500 mt-2">Saisissez l'e-mail lié à votre compte</p>
              </div>

              <Input
                label="Adresse Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="prenom.nom@exemple.com"
                required
              />

              <Button
                type="submit"
                loading={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                Envoyer le lien
              </Button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Retour à la connexion
                </Link>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}