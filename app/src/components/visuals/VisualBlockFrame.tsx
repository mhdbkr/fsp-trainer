import { Component, type ReactNode } from 'react';
import { Grid } from './primitives';
import { KIND_LABEL, type VisualKind } from './registry';

interface VisualBlockFrameProps {
  kind: VisualKind;
  title: string;
  merke?: string;
  children: ReactNode;
  /** Slot pour le `<details>` de repli textuel (§3 du contrat), passé par la page. */
  after?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Isole une erreur de rendu d'un bloc visuel : le reste de la page continue
 * de s'afficher (contrat §2 — jamais d'erreur bloquante).
 */
class VisualErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[visuals] erreur de rendu, bloc ignoré', error);
    }
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

/** Cadre commun aux 7 composants visuels Fachwissen (contrat §6). */
export function VisualBlockFrame({ kind, title, merke, children, after }: VisualBlockFrameProps) {
  return (
    <div className="card card-accent relative p-5 pl-6" data-visual={kind} role="region" aria-label={title}>
      <Grid />
      <div className="relative">
        <div className="eyebrow mb-2">Visuell · {KIND_LABEL[kind]}</div>
        <h3 className="mb-3 font-display text-[17px] font-semibold tracking-tightish">{title}</h3>
        <VisualErrorBoundary>{children}</VisualErrorBoundary>
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
