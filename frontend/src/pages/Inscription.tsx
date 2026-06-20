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
    <div className="min-h-screen bg-slate-100 py-10 px-4">

      {/* HERO */}
      <div className="max-w-5xl mx-auto mb-8">

        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-700 via-blue-700 to-cyan-600 p-10 text-white">

          <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-cyan-300/20 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                <GraduationCap size={28} />
              </div>

              <div>
                <h2 className="font-bold text-xl">
                  Programme de Stage SGS
                </h2>

                <p className="text-white/80">
                  Déposez votre candidature en ligne
                </p>
              </div>
            </div>

            <h1 className="text-4xl font-extrabold">
              Rejoignez notre programme
              <br />
              de stage professionnel
            </h1>

            <p className="mt-4 max-w-2xl text-lg text-white/90">
              Soumettez votre candidature et
              bénéficiez d'un accompagnement
              professionnel au sein de nos entreprises
              partenaires.
            </p>
          </div>
        </div>
      </div>

      {/* FORMULAIRE */}
      <form
        onSubmit={submit}
        className="
          max-w-4xl
          mx-auto
          bg-white
          rounded-3xl
          shadow-xl
          border
          border-slate-100
          p-8
        "
      >

        {/* Header */}
        <div className="mb-8">

          <div className="flex justify-between text-sm text-slate-500 mb-2">
            <span>Étape 1 / 1</span>
            <span>100%</span>
          </div>

          <div className="h-2 rounded-full bg-slate-200">
            <div className="h-2 w-full rounded-full bg-indigo-600" />
          </div>

          <h2 className="mt-6 text-3xl font-bold text-slate-900">
            Formulaire de candidature
          </h2>

          <p className="text-slate-500 mt-2">
            Complétez les informations suivantes.
            Le service RH vous contactera sous 5 jours.
          </p>

        </div>

        {/* Fichiers : CV / Lettre de motivation */}
        <div className="grid md:grid-cols-2 gap-6 mt-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">CV (PDF/JPG/PNG)</label>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setCvFile(e.target.files?.[0] ?? null)}
              className="block w-full"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">Lettre de motivation (optionnel)</label>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setMotivationFile(e.target.files?.[0] ?? null)}
              className="block w-full"
            />
          </div>
        </div>

        {/* Champs */}
        <div className="grid md:grid-cols-2 gap-6">

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <User size={16} />
              Prénom
            </label>

            <Input
              required
              value={form.prenom}
              onChange={set('prenom')}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <User size={16} />
              Nom
            </label>

            <Input
              required
              value={form.nom}
              onChange={set('nom')}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Mail size={16} />
              Email
            </label>

            <Input
              type="email"
              required
              value={form.email}
              onChange={set('email')}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              <Phone size={16} />
              Téléphone
            </label>

            <Input
              type="tel"
              inputMode="tel"
              placeholder="+237677123456"
              value={form.telephone}
              onChange={(e) =>
                setForm({
                  ...form,
                  telephone: e.target.value
                    .replace(/(?!^\+)[^\d]/g, '') // supprime tout sauf chiffres et le + au début
                    .replace(/(\+.*)\+/g, '$1'), // empêche plusieurs +
                })
              }
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
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

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
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

        {/* Boutons */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-10">

          <Link
            to="/"
            className="
              text-slate-600
              hover:text-indigo-600
              font-medium
            "
          >
            ← Retour à l'accueil
          </Link>

          <Button
            type="submit"
            loading={loading}
            className="
              px-8
              bg-indigo-600
              hover:bg-indigo-700
            "
          >
            Envoyer ma candidature
          </Button>

        </div>

      </form>
    </div>
  );
}