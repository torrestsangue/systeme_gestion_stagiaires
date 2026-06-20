
/// SGS/frontend/src/pages/Rapports.tsx

import { FormEvent, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { rapportService } from '../services/sgs.service';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { fmtDate } from '../utils/format';
import { useAuthStore } from '../store/auth.store';

export default function Rapports() {
  const role = useAuthStore((s) => s.user?.role);
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState({ activites: '', difficultes: '', apprentissages: '' });

  const reload = async () => {
    try {
      const data = await rapportService.list();

      console.log("API rapports =", data);

      setList(Array.isArray(data) ? data : data.items || []);
    } catch (error) {
      console.error(error);
      setList([]);
    }
  };
  useEffect(() => { reload(); }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await rapportService.create(form);
      toast.success('Rapport soumis');
      setForm({ activites: '', difficultes: '', apprentissages: '' });
      reload();
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Erreur'); }
  };
  console.log("list =", list);
  console.log("type =", typeof list);
  console.log("isArray =", Array.isArray(list));
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Rapports journaliers</h1>

      {role === 'STAGIAIRE' && (
        <form onSubmit={submit} className="card space-y-3">
          <h2 className="font-semibold">Soumettre le rapport du jour</h2>
          <Input label="Activités réalisées" required value={form.activites} onChange={(e) => setForm({ ...form, activites: e.target.value })} />
          <Input label="Difficultés rencontrées" value={form.difficultes} onChange={(e) => setForm({ ...form, difficultes: e.target.value })} />
          <Input label="Apprentissages" value={form.apprentissages} onChange={(e) => setForm({ ...form, apprentissages: e.target.value })} />
          <Button type="submit">Envoyer</Button>
        </form>
      )}

      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Activités</th><th className="p-3 text-left">Stagiaire</th><th className="p-3">Statut</th></tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-400">Aucun rapport</td></tr>}
            {list.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="p-3 text-slate-600">{fmtDate(r.date)}</td>
                <td className="p-3">{r.activites}</td>
                <td className="p-3">{r.stagiaire?.user?.prenom} {r.stagiaire?.user?.nom}</td>
                <td className="p-3 text-center">{r.valide ? <Badge tone="success">Validé</Badge> : <Badge tone="warning">En attente</Badge>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
