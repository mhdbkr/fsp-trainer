import type { Intensity } from '@/db/types';

// Facteur d'intensité partagé entre le Programme (minutes/jour) et le SRS
// (nouveaux/jour auto, spec F2b D5). Module dédié pour éviter l'import
// circulaire program.ts ↔ srsSettings.ts.
export const INTENSITY_FACTOR: Record<Intensity, number> = { leicht: 0.8, mittel: 1.0, intensiv: 1.3 };
