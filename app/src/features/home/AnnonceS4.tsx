import { useEffect, useState } from 'react';
import { db, getMeta, setMeta } from '@/db/db';
import { annonceKey, annoncesEnAttente, type Annonce, type SujetAnnonce } from '@/lib/annonceS4';
import type { ProgramConfig } from '@/db/types';

const SUJETS: SujetAnnonce[] = ['teile', 'mode', 'muster'];

/**
 * L'annonce unique des changements rétroactifs (simulation-run.md §10.7). Un encart
 * neutre et fermable ; fermé, il ne revient plus sur cet appareil. Il n'existe que
 * pour un candidat à qui un changement s'applique.
 */
export function AnnonceS4() {
  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  useEffect(() => { (async () => {
    const vues = new Set<SujetAnnonce>();
    for (const s of SUJETS) if (await getMeta(annonceKey(s), false)) vues.add(s);
    const config = (await db.meta.get('program'))?.value as ProgramConfig | undefined;
    setAnnonces(annoncesEnAttente({ events: await db.training_events.toArray(), config, musterLocal: localStorage.getItem('fsp-muster'), vues }));
  })(); }, []);
  if (!annonces.length) return null;
  const fermer = async () => { for (const a of annonces) await setMeta(annonceKey(a.sujet), true); setAnnonces([]); };
  return (
    <section role="region" aria-label="Ce qui change" className="card mb-4 flex items-start justify-between gap-4 p-4">
      <div className="space-y-2">
        {annonces.map((a) => (
          <div key={a.sujet}><div className="font-semibold">{a.titre}</div><p className="text-sm text-slate-500">{a.texte}</p></div>
        ))}
      </div>
      <button onClick={fermer} className="btn-outline shrink-0">Compris</button>
    </section>
  );
}
