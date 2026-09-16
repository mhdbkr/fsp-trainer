// Registre statique des specs visuelles Fachwissen (contrat §4). Pilotes T6 :
// fw-khk, fw-leberzirrhose, fw-depression. Import statique, chemins relatifs
// uniquement (`./types`).

import type { FachwissenVisualSpec } from './types';
import { spec as fwKhk } from './fw-khk';
import { spec as fwLeberzirrhose } from './fw-leberzirrhose';
import { spec as fwDepression } from './fw-depression';

export const VISUAL_SPECS: Record<string, FachwissenVisualSpec> = {
  [fwKhk.fachwissenId]: fwKhk,
  [fwLeberzirrhose.fachwissenId]: fwLeberzirrhose,
  [fwDepression.fachwissenId]: fwDepression,
};

export function getVisualSpec(id: string): FachwissenVisualSpec | undefined {
  return VISUAL_SPECS[id];
}
