import { Component, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import type { Fachwissen } from '@/db/types';
import type { VisualBlock as VisualBlockSpec } from '@/data/fachwissenVisuals/types';
import { getVisual } from './registry';
import { VisualBlockFrame } from './VisualBlockFrame';

// ============================================================================
// Dispatch kind → composant, sous VisualBlockFrame. Contrat §2, §4, §6 :
// un kind non enregistré ou un composant qui rend `null` fait disparaître le
// bloc ENTIER (jamais de cadre vide, D7). La résolution des refs (blocs
// écartés faute de données) est déjà faite en amont par `resolveSpec`
// (useVisualSpec) — ce composant ne reçoit que des blocs à tenter de rendre.
//
// La frontière d'erreur (`VisualErrorBoundary`) enveloppe le CADRE ENTIER
// (VisualBlockFrame), pas seulement son contenu : si le composant throw, le
// cadre disparaît complètement (D7) plutôt que de laisser un cadre vide. Le
// callback `onError` remonte l'id du bloc en échec à la page, qui déplie le
// texte que ce bloc avait remplacé.
// ============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
}

class VisualErrorBoundary extends Component<{ children: ReactNode; onError?: () => void }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown): void {
    this.props.onError?.();
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

export interface VisualBlockProps {
  block: VisualBlockSpec;
  fw: Fachwissen;
  /** Slot pour le `<details>` de repli (§3.1), placé par la page quand ce
   *  bloc est celui de l'`anchor` dont la section se replie. */
  after?: ReactNode;
  /** Remonté à la page quand le composant throw (D7) — permet de déplier le
   *  texte que ce bloc avait remplacé plutôt que de le perdre. */
  onError?: (blockId: string) => void;
}

export function VisualBlock({ block, fw, after, onError }: VisualBlockProps) {
  const Component = getVisual(block.kind);
  const contentRef = useRef<HTMLDivElement>(null);
  const [empty, setEmpty] = useState(false);

  // Synchrone avant peinture : si le composant enregistré a rendu `null`
  // (garde-fou interne, ex. hotspots < 2), on retire le cadre entier plutôt
  // que d'afficher un cadre vide (D7). Le validateur CI empêche ce cas en
  // pratique pour les specs publiées ; ce garde-fou couvre le rendu direct.
  useLayoutEffect(() => {
    if (!Component) return;
    setEmpty(!!contentRef.current && contentRef.current.childNodes.length === 0);
  }, [Component, block]);

  if (!Component) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[visuals] kind inconnu, bloc ignoré', block.kind, block.id);
    }
    return null;
  }

  if (empty) return null;

  return (
    <VisualErrorBoundary onError={() => onError?.(block.id)}>
      <VisualBlockFrame id={block.id} kind={block.kind} title={block.title} merke={block.merke} after={after}>
        <div ref={contentRef}>
          <Component block={block} fw={fw} />
        </div>
      </VisualBlockFrame>
    </VisualErrorBoundary>
  );
}
