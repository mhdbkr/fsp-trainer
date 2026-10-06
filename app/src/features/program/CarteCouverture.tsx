// ============================================================================
// La carte de couverture (S4-5) — remplace le champ spécialités × Teile (ADR-0021 : l'axe des Teile quitte la surface).
// Chaque point est un cadran miniature (`CaseDial` 36, non ouvrable) : pas de pourcentage à lire, on voit d'un coup d'œil
// où la carte est blanche. Pondérée par la fréquence : les spécialités et les cas viennent par poids de protocoles.
// Toucher une spécialité l'agrandit en cadrans complets (64, ouvrables). L'encart dit UNE chose, avec une action et une
// fréquence sourcée (§12.9). Le cadran lit `dialData` (INV-59), il ne calcule rien.
// ============================================================================
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { CaseProgress } from '@/db/types';
import { CaseDial } from '@/components/visuals/CaseDial';
import { dialData } from '@/lib/dialData';
import { blankProgress } from '@/lib/progression';
import type { CarteCouverture as Carte, EncartCouverture } from '@/lib/program/pageProgramme';

export function CarteCouverture({ carte, encart, progress }: { carte: Carte; encart: EncartCouverture | null; progress: Map<string, CaseProgress> }) {
  const [ouverte, setOuverte] = useState<string | null>(null);
  if (!carte.specialites.length) return null;
  const dial = (id: string) => dialData(progress.get(id) ?? blankProgress(id));

  return (
    <section className="card p-4">
      <h2 className="mb-3 font-semibold">Carte de couverture</h2>
      <ul className="space-y-2.5">
        {carte.specialites.map((s) => {
          const ici = ouverte === s.specialite;
          const bascule = () => setOuverte((o) => (o === s.specialite ? null : s.specialite));
          const vierges = s.cas.filter((c) => (progress.get(c.id)?.couverture ?? 0) === 0).length;
          return (
            <li key={s.specialite} className="sm:grid sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:items-start sm:gap-x-3">
              <button type="button" onClick={bascule} aria-expanded={ici}
                aria-label={`${s.specialite} : ${s.cas.length} cas, dont ${vierges} pas encore travaillé${vierges > 1 ? 's' : ''}`}
                className="flex min-h-11 w-full items-center text-left text-sm font-medium text-slate-700 hover:text-brand-700 dark:text-slate-200 dark:hover:text-brand-200">
                {s.specialite}
              </button>
              {ici ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(5.25rem,1fr))] gap-x-2 gap-y-3 py-1">
                  {s.cas.map((c) => (
                    <div key={c.id} className="flex min-w-0 flex-col items-center gap-1">
                      <CaseDial data={dial(c.id)} size={64} nom={c.name} />
                      <span className="line-clamp-2 text-center text-[11px] leading-tight text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300">{c.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                // Le dessin seul : le bouton au-dessus dit la même chose en mots (lecteur d'écran, clavier).
                <div aria-hidden="true" onClick={bascule} className="flex cursor-pointer flex-wrap gap-1 sm:py-1">
                  {s.cas.map((c) => <CaseDial key={c.id} data={dial(c.id)} size={36} nom={c.name} ouvrable={false} />)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {encart && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <p className="min-w-0 flex-1 basis-60 text-sm text-slate-600 dark:text-slate-300">{encart.texte}</p>
          <Link to={`/simulation/${encart.cas.id}/pre`} aria-label={`Lancer ${encart.cas.name}`} className="btn-primary min-h-11 shrink-0 px-4 text-xs">Lancer</Link>
        </div>
      )}
    </section>
  );
}
