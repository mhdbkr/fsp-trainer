import type { ReactNode } from 'react';
import { Icon } from '@/components/icons';
import { AutoLink } from '@/components/AutoLink';
import type { SectionRef } from '@/data/fachwissenVisuals/types';
import { refKey } from '@/data/fachwissenVisuals/resolve';

/** Accord singulier/pluriel allemand : « 1 Punkt » vs « N Punkte ». */
function punkteLabel(count: number): string {
  return count === 1 ? '1 Punkt' : `${count} Punkte`;
}

// ============================================================================
// Déchargement du texte (contrat §3.1) : primitives partagées par
// FachwissenDetailPage — extraites ici pour garder la page < 500 lignes.
// Aucune donnée clinique ici, uniquement du gabarit.
// ============================================================================

/** Sépare une liste d'entrées entre visibles et repliées, à partir de
 *  `collapsed` (union des `replaces` des blocs visuels résolus). */
export function splitByCollapse<T>(
  items: T[],
  refFor: (item: T) => SectionRef,
  collapsed: Set<string>,
): { visible: T[]; hidden: T[]; allHidden: boolean; someHidden: boolean } {
  const visible: T[] = [];
  const hidden: T[] = [];
  for (const item of items) {
    (collapsed.has(refKey(refFor(item))) ? hidden : visible).push(item);
  }
  return {
    visible,
    hidden,
    allHidden: items.length > 0 && hidden.length === items.length,
    someHidden: hidden.length > 0,
  };
}

/** `true` si le champ scalaire (prognose/aetiologie) de `ref` est replié. */
export function isFieldCollapsed(ref: SectionRef, collapsed: Set<string>): boolean {
  return collapsed.has(refKey(ref));
}

/** Repli partiel : les entrées couvertes par un bloc visuel, dans un
 *  `<details>` imbriqué au même emplacement que la section (§3.1, règle 1). */
export function Repli({ count, children }: { count: number; children: ReactNode }) {
  return (
    <details className="group mt-2 rounded-lg border border-slate-200 dark:border-slate-800">
      <summary className="cursor-pointer list-none px-3 py-2 text-[13px] font-medium text-slate-500 marker:content-none hover:text-brand-600 dark:text-slate-400">
        <span className="group-open:hidden">Text anzeigen · {punkteLabel(count)}</span>
        <span className="hidden group-open:inline">Text ausblenden</span>
      </summary>
      <div className="border-t border-slate-100 px-3 py-2 dark:border-slate-800">{children}</div>
    </details>
  );
}

/** Carte de section standard (colonne principale). */
export function Section({ title, icon, children }: { title: string; icon?: string; children: ReactNode }) {
  return (
    <div className="card card-accent p-5 pl-6" data-section={title}>
      <div className="mb-3 flex items-center gap-2.5">
        {icon && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/25 dark:text-brand-300">
            <Icon name={icon} className="h-4 w-4" />
          </span>
        )}
        <h2 className="font-display text-[17px] font-semibold tracking-tightish">{title}</h2>
      </div>
      {children}
    </div>
  );
}

/** Repli total : toutes les entrées d'une section sont couvertes par un bloc
 *  visuel — la carte ENTIÈRE (titre compris) devient le `<details>` fermé,
 *  à l'emplacement habituel de la section (§3.1, règle 1). */
export function CollapsedSection({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon?: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <details className="card card-accent group p-0" data-section={title}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2.5 px-5 py-4 marker:content-none">
        <span className="flex items-center gap-2.5">
          {icon && (
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/25 dark:text-brand-300">
              <Icon name={icon} className="h-4 w-4" />
            </span>
          )}
          <h2 className="font-display text-[17px] font-semibold tracking-tightish">{title}</h2>
        </span>
        <span className="text-[11px] font-semibold text-brand-600 group-open:hidden dark:text-brand-300">
          Text anzeigen · {punkteLabel(count)}
        </span>
        <span className="hidden text-[11px] font-semibold text-brand-600 group-open:inline dark:text-brand-300">
          Text ausblenden
        </span>
      </summary>
      <div className="px-5 pb-5">{children}</div>
    </details>
  );
}

export function SymptomList({ items, tone = 'bg-brand-400' }: { items: { text: string }[]; tone?: string }) {
  return (
    <ul className="space-y-1.5 text-sm">
      {items.map((k, i) => (
        <li key={i} className="flex gap-2">
          <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${tone}`} />
          <span>
            <AutoLink>{k.text}</AutoLink>
          </span>
        </li>
      ))}
    </ul>
  );
}
