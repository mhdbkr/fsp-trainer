// Évaluation du Prüfungstag (T19, spec §5.5) : mêmes grilles que l'entraînement,
// enchaînées en fin de session (`ORDER`, + `aufklaerung` si ouverte). Une partie
// non tentée est évaluée quand même. Pas de retour arrière : `onCancel` est un
// no-op (PartEvaluation n'expose aucun attribut de ciblage pour masquer le
// bouton « Retour » sans la modifier — brief T19).
import { useEffect } from 'react';
import { ORDER, targetSec, type ExamDayPart } from './examDayPlan';
import { useExamDaySession, type ExamDayState } from './examDaySession';
import { PartEvaluation } from './PartEvaluation';
import type { SimulationPart } from '@/db/types';

/** Temps réellement consommé pour `part`, borné à la cible (spec §5.5). */
export function consumedSec(state: ExamDayState, part: ExamDayPart, now: number): number {
  const started = state.partTimes[part];
  if (started === undefined) return 0;
  const order = ORDER;
  const next = order[order.indexOf(part) + 1];
  const endedAt = (next ? state.partTimes[next] : undefined) ?? state.transitionStartedAt ?? now;
  const elapsedSec = Math.floor((endedAt - started) / 1000);
  return Math.min(targetSec(state.land, part), Math.max(0, elapsedSec));
}

export function ExamDayEvaluation() {
  const state = useExamDaySession((s) => s.state);
  const saveResult = useExamDaySession((s) => s.saveResult);
  const toResult = useExamDaySession((s) => s.toResult);

  const order: SimulationPart[] = state
    ? [...ORDER, ...(state.aufklaerungOpened ? (['aufklaerung'] as const) : [])]
    : [];
  const idx = state ? order.findIndex((p) => !state.results[p]) : -1;
  const done = !!state && idx === -1;

  useEffect(() => {
    if (done) toResult();
  }, [done, toResult]);

  if (!state || done) return null;

  const part = order[idx];
  const now = Date.now();
  const durationSec =
    part === 'aufklaerung' ? consumedSec(state, 'anamnese', now) : consumedSec(state, part, now);

  return (
    <div data-exam-eval data-step={idx + 1} data-total={order.length}>
      <p className="readout">Bewertung {idx + 1}/{order.length} · Prüfungstag BW</p>
      <PartEvaluation part={part} durationSec={durationSec} onSave={(r) => saveResult(part, r)} onCancel={() => {}} />
    </div>
  );
}
