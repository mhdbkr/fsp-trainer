// ============================================================================
// La carte de couverture (S4-5) — remplace le champ spécialités × Teile (ADR-0021 : l'axe des Teile quitte la surface).
// Chaque point est un cadran miniature (`CaseDial` 24, non ouvrable) : pas de pourcentage à lire, on voit d'un coup d'œil
// où la carte est blanche. Pondérée par la fréquence : les spécialités et les cas viennent par poids de protocoles, et
// seules les `VISIBLES` plus lourdes s'affichent d'abord. Toucher une spécialité l'agrandit en cadrans complets (64,
// ouvrables) ; la dernière ouverte est retenue (`useUi`). L'encart, AU-DESSUS, dit UNE chose avec une fréquence sourcée
// (§12.9) ; son action est d'ouvrir la spécialité dans la carte — jamais de jouer hors du plan (revue direction).
// Le cadran lit `dialData` (INV-59), il ne calcule rien.
// ============================================================================
import { useState } from 'react';
import type { CaseProgress } from '@/db/types';
import { CaseDial } from '@/components/visuals/CaseDial';
import { dialData } from '@/lib/dialData';
import { blankProgress } from '@/lib/progression';
import { useUi } from '@/store/ui';
import type { CarteCouverture as Carte, EncartCouverture } from '@/lib/program/pageProgramme';

/** Les spécialités montrées avant « Voir les N autres » : la carte fermée tient dans un écran de téléphone. */
export const VISIBLES = 6;

export function CarteCouverture({ carte, encart, progress }: { carte: Carte; encart: EncartCouverture | null; progress: Map<string, CaseProgress> }) {
  const ouverte = useUi((s) => s.specialiteOuverte);
  const setOuverte = useUi((s) => s.setSpecialiteOuverte);
  const [tout, setTout] = useState(false);
  if (!carte.specialites.length) return null;
  const dial = (id: string) => dialData(progress.get(id) ?? blankProgress(id));
  const rang = carte.specialites.findIndex((s) => s.specialite === ouverte);
  const montrees = tout || rang >= VISIBLES ? carte.specialites : carte.specialites.slice(0, VISIBLES);
  const autres = carte.specialites.length - VISIBLES;
  const ouvrir = (sp: string) => {
    setOuverte(sp);
    document.getElementById(`carte-${sp}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
  };

  return (
    <section className="card p-4">
      <h2 className="mb-3 font-semibold">Carte de couverture</h2>
      {encart && (
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          <button type="button" onClick={() => ouvrir(encart.specialite)} aria-label={`Ouvrir ${encart.specialite} dans la carte`}
            className="font-medium text-brand-700 underline decoration-brand-300 underline-offset-2 hover:decoration-brand-600 dark:text-brand-200">
            {encart.specialite}
          </button>
          {encart.texte.slice(encart.specialite.length)}
        </p>
      )}
      <ul className="space-y-1.5">
        {montrees.map((s) => {
          const ici = ouverte === s.specialite;
          const bascule = () => setOuverte(ici ? null : s.specialite);
          const vierges = s.cas.filter((c) => (progress.get(c.id)?.couverture ?? 0) === 0).length;
          return (
            <li key={s.specialite} id={`carte-${s.specialite}`} className="sm:grid sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:items-center sm:gap-x-3">
              <button type="button" onClick={bascule} aria-expanded={ici} data-specialite={s.specialite}
                aria-label={`${s.specialite} : ${s.cas.length} cas, dont ${vierges} pas encore travaillé${vierges > 1 ? 's' : ''}`}
                className="flex min-h-9 w-full items-center text-left text-sm font-medium text-slate-700 sm:min-h-11 hover:text-brand-700 dark:text-slate-200 dark:hover:text-brand-200">
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
                // Le dessin seul : le bouton à côté dit la même chose en mots (lecteur d'écran, clavier).
                <div aria-hidden="true" onClick={bascule} className="flex cursor-pointer flex-wrap gap-[3px] pb-1.5 sm:pb-0">
                  {s.cas.map((c) => <CaseDial key={c.id} data={dial(c.id)} size={24} nom={c.name} ouvrable={false} />)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {autres > 0 && rang < VISIBLES && (
        <button type="button" onClick={() => setTout((t) => !t)} aria-expanded={tout} className="btn-ghost mt-2 min-h-11 px-0 text-sm text-brand-700 dark:text-brand-200">
          {tout ? 'Voir moins' : `Voir les ${autres} autres spécialités`}
        </button>
      )}
    </section>
  );
}
