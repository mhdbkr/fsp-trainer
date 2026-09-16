// Tirage au sort pondéré du cas du jour (spec D5/§10 : pondération par Case.frequency,
// exclusion des cas joués < excludePlayedWithinMs, relâchement si aucun éligible).
import type { Case, Simulation } from '@/db/types';
import { EXAM_DAY_PLAN, type ExamLand } from './examDayPlan';

export function pickExamDayCase(
  cases: Case[],
  sims: Simulation[],
  now: number,
  rng: () => number = Math.random,
  land: ExamLand = 'BW'
): Case | null {
  if (!cases.length) return null;

  const recent = new Set(
    sims.filter((s) => now - s.date < EXAM_DAY_PLAN[land].excludePlayedWithinMs).map((s) => s.caseId)
  );
  let pool = cases.filter((c) => !recent.has(c.id));
  if (!pool.length) pool = cases;

  const weights = pool.map((c) => Math.max(c.frequency ?? 0, 1));
  const total = weights.reduce((a, b) => a + b, 0);

  let r = rng() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r < 0) return pool[i];
  }
  return pool[pool.length - 1];
}
