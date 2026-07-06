// inscription.tsx
import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import {
  GraduationCap,
  User,
  Mail,
  Phone,
  Briefcase,
  Calendar
} from 'lucide-react';

import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { inscriptionService } from '../services/sgs.service';
import { isValidPhoneNumber } from 'libphonenumber-js';

export default function Inscription() {
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    domaine: '',
    periode: '',
  });

  const [loading, setLoading] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [motivationFile, setMotivationFile] = useState<File | null>(null);

  const nav = useNavigate();

  const set =
    (k: string) =>
    (e: any) =>
      setForm({
        ...form,
        [k]: e.target.value,
      });

  const submit = async (e: FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      // Upload files first (if any)
      const uploads: any = {};
      if (cvFile) {
        uploads.cvUrl = await inscriptionService.uploadFile(cvFile);
      }
      if (motivationFile) {
        uploads.motivationUrl = await inscriptionService.uploadFile(motivationFile);
      }

      const payload = { ...form, ...uploads };

      const r = await inscriptionService.create(payload);

      toast.success(
        `Candidature envoyée - Dossier ${r.numeroDossier}`
      );

      nav('/');
    } catch (e: any) {
      console.error('Inscription error:', e);
      const serverData = e?.response?.data;
      const msg = serverData?.error || serverData?.message || (serverData ? JSON.stringify(serverData) : 'Erreur');
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 sm:px-6 lg:px-8">

      {/* HERO */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-slate-900 via-indigo-700 to-cyan-600 p-6 sm:p-10 text-white shadow-xl shadow-cyan-500/15">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.18),_transparent_35%)]" />
          <div className="absolute right-[-60px] top-20 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="relative z-10 grid gap-6 lg:grid-cols-[1fr_auto] items-center">
            <div>
              <div className="inline-flex items-center gap-3 rounded-3xl bg-white/10 px-4 py-3 text-sm font-semibold shadow-sm shadow-slate-900/10">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 text-white">
                  <GraduationCap size={24} />
                </span>
                <div>
                  <div>Programme de Stage SGS</div>
                  <div className="text-slate-200 text-xs">Candidature en ligne rapide et sécurisée</div>
                </div>
              </div>
            </div>

            <div className="text-right text-sm text-slate-200">
              <div className="font-semibold">Étape 1 sur 1</div>
              <div className="mt-1 text-xs uppercase tracking-[0.2em]">Soumission</div>
            </div>
          </div>

          <div className="relative z-10 mt-8">
            <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Déposez votre candidature
              <br />
              et démarrez votre parcours.
            </h1>
            <p className="mt-4 max-w-2xl text-slate-100 text-base sm:text-lg">
              Remplissez le formulaire, chargez votre CV et votre lettre de motivation, puis laissez notre équipe RH vous contacter rapidement.
            </p>
          </div>
        </div>
      </div>

      <form
        onSubmit={submit}
        className="max-w-4xl mx-auto space-y-8 bg-white rounded-[2rem] shadow-2xl border border-slate-200 p-6 sm:p-8"
      >
        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-indigo-700">Formulaire de candidature</p>
            <h2 className="mt-3 text-3xl font-bold text-slate-900">Infos personnelles & détails du stage</h2>
            <p className="mt-3 text-slate-600 leading-7">
              Renseignez vos coordonnées, votre domaine d'intérêt et la période souhaitée. Un dossier complet accélère le traitement de votre candidature.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="text-lg font-semibold text-slate-900">Pourquoi candidater chez SGS ?</h3>
            <ul className="mt-4 space-y-3 text-slate-600">
              <li className="flex gap-3"><span className="mt-1 text-indigo-600">•</span> Accompagnement personnalisé</li>
              <li className="flex gap-3"><span className="mt-1 text-indigo-600">•</span> Suivi RH dédié</li>
              <li className="flex gap-3"><span className="mt-1 text-indigo-600">•</span> Validation en moins de 5 jours</li>
            </ul>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="group relative rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center transition hover:border-indigo-500 hover:bg-slate-100">
            <div className="flex flex-col items-center justify-center gap-3">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                CV
              </span>
              <p className="text-sm font-semibold text-slate-900">CV (PDF/JPG/PNG)</p>
              <p className="text-sm text-slate-500">Téléversez votre CV</p>
              <div className="mt-3 text-sm text-indigo-600">{cvFile ? cvFile.name : 'Aucun fichier sélectionné'}</div>
            </div>
            <input
              type="file"
              accept="application/pdf,image/*"
              required
              onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>

          <label className="group relative rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center transition hover:border-indigo-500 hover:bg-slate-100">
            <div className="flex flex-col items-center justify-center gap-3">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-600 text-white">
                LM
              </span>
              <p className="text-sm font-semibold text-slate-900">Lettre de motivation</p>
              <p className="text-sm text-slate-500">Optionnel, mais recommandé</p>
              <div className="mt-3 text-sm text-indigo-600">{motivationFile ? motivationFile.name : 'Aucun fichier sélectionné'}</div>
            </div>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setMotivationFile(e.target.files?.[0] ?? null)}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <User size={16} />
              Prénom
            </label>
            <Input
              required
              value={form.prenom}
              onChange={set('prenom')}
              placeholder="Votre prénom"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <User size={16} />
              Nom
            </label>
            <Input
              required
              value={form.nom}
              onChange={set('nom')}
              placeholder="Votre nom"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Mail size={16} />
              Email
            </label>
            <Input
              type="email"
              required
              value={form.email}
              onChange={set('email')}
              placeholder="exemple@domaine.com"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Phone size={16} />
              Téléphone
            </label>
            <Input
              type="tel"
              inputMode="tel"
              placeholder="+237 670 00 00 00"
              value={form.telephone}
              onChange={(e) =>
                setForm({
                  ...form,
                  telephone: e.target.value
                    .replace(/(?!^\+)[^\d]/g, '')
                    .replace(/(\+.*)\+/g, '$1'),
                })
              }
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Briefcase size={16} />
              Domaine
            </label>
            <Input
              required
              placeholder="Ex : Développement Web"
              value={form.domaine}
              onChange={set('domaine')}
            />
          </div>

          <div className="md:col-span-2">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
              <Calendar size={16} />
              Période souhaitée
            </label>
            <Input
              required
              placeholder="Ex : Janv. - Avril 2026"
              value={form.periode}
              onChange={set('periode')}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
          <p className="font-semibold text-slate-900">Conseil</p>
          <p className="mt-2">Un dossier complet avec CV et lettre de motivation augmente vos chances d’être contacté rapidement.</p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <Link
            to="/"
            className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-indigo-400 hover:text-indigo-700 sm:w-auto"
          >
            ← Retour à l'accueil
          </Link>

          <Button
            type="submit"
            loading={loading}
            className="w-full rounded-xl px-8 py-3 sm:w-auto"
          >
            Envoyer ma candidature
          </Button>
        </div>
      </form>
    </div>
  );
}