import { AutoLink } from '@/components/AutoLink';

/** Différenciel en TABLEAU comparatif plutôt qu'en liste.
 *
 *  Le raisonnement d'examen n'est pas « voici des diagnostics » mais « voici
 *  ce qui les sépare » : deux colonnes mettent le critère discriminant en
 *  regard du diagnostic, ce qu'une puce « dd — critère » n'obtient jamais.
 *  L'index mono sert la récitation (« ich nenne vier Differenzialdiagnosen »).
 *
 *  Sur mobile chaque ligne devient un bloc autoportant (pas de scroll
 *  horizontal) : l'en-tête ne s'affiche donc qu'à partir de sm.
 */
export function DDTable({ items }: { items: { dd: string; unterscheidung: string }[] }) {
  const COLS = 'sm:grid-cols-[auto_minmax(8rem,1fr)_1.85fr]';
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200/80 dark:border-slate-800">
      <div className={`hidden border-b border-slate-200/80 bg-slate-50/70 sm:grid ${COLS} dark:border-slate-800 dark:bg-ink-800/40`}>
        <span className="label py-1.5 pl-3" aria-hidden />
        <div className="label py-1.5 pl-2 pr-3">Differenzialdiagnose</div>
        <div className="label border-l border-slate-200/80 px-3 py-1.5 dark:border-slate-800">Unterscheidungsmerkmal</div>
      </div>
      <ul className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
        {items.map((d, i) => (
          <li key={i} className={`grid gap-0.5 px-3 py-2 text-sm sm:items-baseline sm:gap-0 sm:px-0 sm:py-0 ${COLS}`}>
            <span className="hidden font-mono text-[11px] text-slate-400 sm:block sm:py-2 sm:pl-3 dark:text-slate-500">{i + 1}</span>
            <div className="font-semibold sm:py-2 sm:pl-2 sm:pr-3">
              <span className="mr-1 font-mono text-[11px] text-slate-400 sm:hidden dark:text-slate-500">{i + 1}</span>
              <AutoLink>{d.dd}</AutoLink>
            </div>
            <div className="border-l-2 border-slate-200 pl-2 text-slate-600 sm:border-l sm:border-slate-200/80 sm:px-3 sm:py-2 dark:border-slate-700 dark:text-slate-300 sm:dark:border-slate-800">
              <AutoLink>{d.unterscheidung}</AutoLink>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
