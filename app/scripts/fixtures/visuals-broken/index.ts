// Registre de la fixture négative (M-2) — même forme que
// `src/data/fachwissenVisuals/index.ts`, chargé uniquement par le
// validateur via `--dir` dans le test dédié.
import { spec as fwKhkBroken } from './fw-khk';
import type { FachwissenVisualSpec } from '../../../src/data/fachwissenVisuals/types';

export const VISUAL_SPECS: Record<string, FachwissenVisualSpec> = {
  'fw-khk': fwKhkBroken,
};
