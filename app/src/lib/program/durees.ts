// Les durées d'une tâche (training-journal.md §13.4). Étape 5 : le repli seul — `TEIL_MIN` ; les durées apprises
// (médiane des mesures du candidat) arrivent à l'étape suivante, avec leur invariant (INV-64).
import type { SimTeil, TrainingEvent } from '@/db/types';
import { TEIL_MIN } from './parametres';

/** Minutes attendues pour UN Teil. */
export function dureeTeil(t: SimTeil, _events: readonly TrainingEvent[] = []): number {
  return TEIL_MIN[t];
}
