// Les durées d'une tâche (training-journal.md §13.4, ADR-0022 §4, INV-64) : apprises sur les mesures du candidat.
// Elles ne servent qu'aux MINUTES d'une tâche — jamais à une remarque.
import type { SimTeil, TrainingEvent } from '@/db/types';
import { partieMesuree } from './completion';
import { DUREE_BORNES, DUREE_FENETRE, DUREE_MIN_MESURES, TEIL_MIN } from './parametres';

/**
 * Minutes attendues pour UN Teil : la MÉDIANE des `DUREE_FENETRE` dernières mesures (> 0, sur des `partieMesuree`),
 * bornée à `DUREE_BORNES` ; sous `DUREE_MIN_MESURES` mesures, le repli `TEIL_MIN`. La médiane plutôt que la moyenne :
 * une partie oubliée ouverte toute une nuit ne fausse pas l'estimation.
 */
export function dureeTeil(t: SimTeil, events: readonly TrainingEvent[] = []): number {
  const mesures = events
    .filter((e) => partieMesuree(e) && (e.minutesParTeil?.[t] ?? 0) > 0)
    .sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(-DUREE_FENETRE)
    .map((e) => e.minutesParTeil![t]!)
    .sort((a, b) => a - b);
  if (mesures.length < DUREE_MIN_MESURES) return TEIL_MIN[t];
  const n = mesures.length;
  const mediane = n % 2 ? mesures[(n - 1) / 2] : (mesures[n / 2 - 1] + mesures[n / 2]) / 2;
  return Math.min(DUREE_BORNES[1], Math.max(DUREE_BORNES[0], Math.round(mediane)));
}

/** Les trois durées, calculées une fois (le plan les lit pour chaque candidat). */
export const dureesTeile = (events: readonly TrainingEvent[]): Record<SimTeil, number> => ({
  anamnese: dureeTeil('anamnese', events), dokumentation: dureeTeil('dokumentation', events), fallvorstellung: dureeTeil('fallvorstellung', events),
});
