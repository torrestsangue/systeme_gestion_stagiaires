import { useEffect, useState } from 'react';
import { evaluationService } from '../services/sgs.service';
import { Badge } from '../components/ui/Badge';

export default function Evaluations() {
  const [list, setList] = useState<any[]>([]);

  useEffect(() => { 
    evaluationService.list()
      .then((response: any) => {
        // 💡 Si la réponse contient .items, on prend .items, sinon on vérifie si c'est déjà un tableau
        if (response && response.items) {
          setList(response.items);
        } else if (Array.isArray(response)) {
          setList(response);
        } else {
          setList([]);
        }
      })
      .catch(() => setList([])); 
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Évaluations finales</h1>
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-600">
            <tr>
              <th className="p-3 text-left">Stagiaire</th>
              <th className="p-3">Note</th>
              <th className="p-3">Mention</th>
              <th className="p-3 text-left">Attestation</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-slate-400">
                  Aucune évaluation
                </td>
              </tr>
            )}
            {list.map((e) => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="p-3">{e.stagiaire?.user?.prenom} {e.stagiaire?.user?.nom}</td>
                <td className="p-3 text-center font-bold">{e.noteFinale}/20</td>
                <td className="p-3 text-center">
                  <Badge tone={e.noteFinale >= 12 ? 'success' : e.noteFinale >= 10 ? 'warning' : 'danger'}>
                    {e.mention}
                  </Badge>
                </td>
                <td className="p-3 text-xs font-mono text-slate-500">{e.attestationToken?.slice(0, 12)}…</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}