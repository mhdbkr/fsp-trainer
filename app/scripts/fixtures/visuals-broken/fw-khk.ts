// Fixture NÉGATIVE pour le validateur (M-2) : une ref inexistante dans la
// fiche réelle `fw-khk` (aucune section `therapie` avec ce label). Sert
// uniquement à prouver que le validateur sort en erreur (AC-1, AC-17) — ne
// fait PAS partie des specs publiées (hors `src/data/fachwissenVisuals`, non
// listée dans son `index.ts`).
import type { FachwissenVisualSpec } from '../../../src/data/fachwissenVisuals/types';

export const spec: FachwissenVisualSpec = {
  fachwissenId: 'fw-khk',
  version: 1,
  blocks: [
    {
      id: 'gauge-broken',
      kind: 'score-gauge',
      title: 'Fixture cassée',
      anchor: 'klassifikation',
      replaces: [{ section: 'therapie', label: 'Label qui n’existe pas dans fw-khk' }],
      data: {
        score: { name: 'X' },
        criteria: [],
        bands: [],
      },
    },
  ],
};
