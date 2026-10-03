// L'état d'un cas, lu sur `case_progress` (B-C5, ADR-0017 §4.1). Un cas n'a plus
// de pourcentage ni de statut global : il a un état par Teil. `vierge` est
// NEUTRE — « pas encore travaillé », jamais un défaut.
import type { CaseProgress, TeilStatus } from '@/db/types';
import { TEILE } from '@/lib/simScope';
import { estNonMesure } from '@/lib/journal';

export const OVERALL: Record<CaseProgress['overall'], { label: string; cls: string }> = {
  vierge: { label: 'Pas encore travaillé', cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
  entame: { label: 'Entamé', cls: 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200' },
  solide: { label: 'Solide', cls: 'bg-brand-600 text-white dark:bg-brand-500' },
};
const TEIL_TONE: Record<TeilStatus, string> = {
  vierge: 'bg-slate-200 dark:bg-ink-700',
  fragile: 'bg-signal-400',
  acquis: 'bg-brand-300 dark:bg-brand-700',
  solide: 'bg-brand-600 dark:bg-brand-400',
};
const TEIL_WORD: Record<TeilStatus, string> = { vierge: 'pas encore travaillé', fragile: 'à reprendre', acquis: 'acquis', solide: 'solide' };

/** Un cas sans aucune mesure mais déclaré fait sur au moins un Teil (I-4). */
export const nonMesureSeulement = (cp: CaseProgress): boolean =>
  cp.overall === 'vierge' && TEILE.some((t) => estNonMesure(cp.teile[t.key]));
const NON_MESURE = { label: 'Faite — non mesurée', cls: 'border border-dashed border-slate-400 bg-transparent text-slate-500 dark:text-slate-400' };

export const ProgressBadge = ({ cp }: { cp: CaseProgress }) => {
  const m = nonMesureSeulement(cp) ? NON_MESURE : OVERALL[cp.overall];
  return <span className={`chip ${m.cls}`}>{m.label}</span>;
};
const word = (p: CaseProgress['teile'][keyof CaseProgress['teile']]) => (estNonMesure(p) ? 'faite — non mesurée' : TEIL_WORD[p.status]);

/** Trois pastilles, une par Teil, dans l'ordre de l'examen. */
export function TeilDots({ cp }: { cp: CaseProgress }) {
  return (
    <span className="flex shrink-0 items-center gap-1" role="img"
      aria-label={TEILE.map((t) => `${t.label} : ${word(cp.teile[t.key])}`).join(', ')}>
      {TEILE.map((t) => (
        <span key={t.key} title={`${t.label} — ${word(cp.teile[t.key])}${cp.teile[t.key].lastScore !== null ? ` (${cp.teile[t.key].lastScore} %)` : ''}`}
          className={`h-2.5 w-5 rounded-sm ${estNonMesure(cp.teile[t.key]) ? 'border border-dashed border-slate-400' : TEIL_TONE[cp.teile[t.key].status]}`} />
      ))}
    </span>
  );
}

/** Tri « progression » : les cas les moins avancés d'abord. */
export const progressRank = (cp: CaseProgress): number =>
  TEILE.reduce((s, t) => s + ({ vierge: 0, fragile: 1, acquis: 2, solide: 3 } as const)[cp.teile[t.key].status], 0);
