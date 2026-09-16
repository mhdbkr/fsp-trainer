import type { ComponentType } from 'react';

// ============================================================================
// Registre des 7 composants visuels Fachwissen. La page ne connaît que ce
// registre (contrat §2). T3–T5 enregistrent leurs composants via un
// `index.ts` ultérieur — ce fichier n'importe aucun composant.
// ============================================================================

export const VISUAL_KINDS = [
  'anatomy-map',
  'decision-tree',
  'syndrome-map',
  'timeline',
  'compare-table',
  'therapy-toggles',
  'score-gauge',
] as const;

export type VisualKind = (typeof VISUAL_KINDS)[number];

/** Nom allemand du kind, affiché en eyebrow (« Visuell · <nom> »). */
export const KIND_LABEL: Record<VisualKind, string> = {
  'anatomy-map': 'Anatomie',
  'decision-tree': 'Entscheidungsbaum',
  'syndrome-map': 'Syndrom',
  timeline: 'Verlauf',
  'compare-table': 'Vergleich',
  'therapy-toggles': 'Therapie',
  'score-gauge': 'Score',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registry = new Map<VisualKind, ComponentType<any>>();

export function registerVisual<K extends VisualKind>(kind: K, Component: ComponentType<any>): void {
  registry.set(kind, Component);
}

export function getVisual(kind: VisualKind): ComponentType<any> | undefined {
  return registry.get(kind);
}
