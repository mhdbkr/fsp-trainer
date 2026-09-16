import type { ReactNode } from 'react';
import { Grid } from './primitives';
import { KIND_LABEL, type VisualKind } from './registry';

interface VisualBlockFrameProps {
  /** Identifiant du bloc source (contrat §2) — utilisé par les tests E2E. */
  id?: string;
  kind: VisualKind;
  title: string;
  merke?: string;
  children: ReactNode;
  /** Slot pour le `<details>` de repli textuel (§3 du contrat), passé par la page. */
  after?: ReactNode;
}

/**
 * Cadre commun aux 7 composants visuels Fachwissen (contrat §6). La frontière
 * d'erreur du bloc vit AU-DESSUS de ce cadre (dans `VisualBlock`, contrat D7)
 * pour qu'un composant qui throw ne laisse jamais un cadre vide.
 */
export function VisualBlockFrame({ id, kind, title, merke, children, after }: VisualBlockFrameProps) {
  return (
    <div
      className="card card-accent relative p-5 pl-6"
      data-visual={kind}
      data-block={id}
      role="region"
      aria-label={title}
    >
      <Grid />
      <div className="relative">
        <div className="eyebrow mb-2">Visuell · {KIND_LABEL[kind]}</div>
        <h3 className="mb-3 font-display text-[17px] font-semibold tracking-tightish">{title}</h3>
        {children}
        {merke && (
          <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-brand-600 dark:text-brand-300">
            Merke · <span className="normal-case tracking-normal">{merke}</span>
          </p>
        )}
        {after}
      </div>
    </div>
  );
}
