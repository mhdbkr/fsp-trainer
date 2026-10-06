// Registre de la fixture négative « silhouette » (lot Lc1) — même forme que
// `src/data/fachwissenVisuals/index.ts`, chargé uniquement par le validateur
// via `--dir` dans le test dédié.
import { spec as fwLeberzirrhoseAnatomy } from './fw-leberzirrhose';
import type { FachwissenVisualSpec } from '../../../src/data/fachwissenVisuals/types';

export const VISUAL_SPECS: Record<string, FachwissenVisualSpec> = {
  'fw-leberzirrhose': fwLeberzirrhoseAnatomy,
};
