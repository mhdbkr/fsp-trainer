// La tâche de cas (training-journal.md §12.1). S4-1 n'en pose que la LECTURE tolérante
// dont le cadran a besoin ; `resteTache`, `statutTache` et `lireTache` sont à S4-2.

import type { SimTeil, TaskInstance } from '@/db/types';

const TEILE_ORDRE: readonly SimTeil[] = ['anamnese', 'dokumentation', 'fallvorstellung'];

/** Lecture tolérante — LE SEUL point qui lit `TaskInstance.teil` (plans série 3). */
export function teileDeTache(t: TaskInstance): SimTeil[] {
  if (t.teile?.length) return t.teile;
  if (t.teil) return [t.teil];
  return t.kind === 'simulation' || t.kind === 'revision' || t.kind === 'examen-blanc' ? [...TEILE_ORDRE] : [];
}
