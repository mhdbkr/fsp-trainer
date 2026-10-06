// Fixture NÉGATIVE (lot Lc1) : une silhouette `anatomy-map` par ailleurs valide
// (refs exactes de la fiche réelle). Prouve que le validateur refuse le kind
// déprécié. Hors `src/data/fachwissenVisuals`, jamais publiée.
import type { FachwissenVisualSpec } from '../../../src/data/fachwissenVisuals/types';

const PORTAL =
  'Portale Hypertension: Aszites mit Zunahme des Bauchumfangs, Splenomegalie, Umgehungskreisläufe (Ösophagus- und Fundusvarizen, Caput medusae)';

export const spec: FachwissenVisualSpec = {
  fachwissenId: 'fw-leberzirrhose',
  version: 1,
  blocks: [
    {
      id: 'anatomy-zirrhose',
      kind: 'anatomy-map',
      title: 'Silhouette',
      anchor: 'klinik',
      replaces: [],
      data: {
        figure: 'body',
        hotspots: [
          { region: 'periumbilical', label: 'Caput medusae', source: { section: 'klinik', text: PORTAL } },
          { region: 'legs', label: 'Aszites', source: { section: 'klinik', text: PORTAL } },
        ],
      },
    },
  ],
};
