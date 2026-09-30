// S-I2 = B-I8 (revue s3-programme) : une séance auto-évaluée (IA externe)
// n'entre dans AUCUN score — ni axes, ni axe le plus faible, ni spécialités,
// ni courbe. Même prédicat que l'indice de préparation : `estMesuree`.
import { describe, it, expect } from 'vitest';
import type { Case, PartResult, Simulation } from '@/db/types';
import { axisScores, progressSeries, specialtyScores, weakestAxis } from './stats';

const part = (score: number): PartResult => ({ done: true, durationSec: 600, contentPct: score, feeling: score, checklist: [] } as unknown as PartResult);
const sim = (id: string, score: number, mode?: Simulation['mode']): Simulation =>
  ({ id, caseId: 'c1', date: Date.parse('2026-10-01T10:00:00Z'), parts: { anamnese: part(score) }, notes: {}, prioritizedCorrections: [], ...(mode ? { mode } : {}) } as unknown as Simulation);
const cases = [{ id: 'c1', specialty: 'Kardiologie' } as unknown as Case];

describe('S-I2 — les séances auto-évaluées ne comptent dans aucun score', () => {
  const sims = [sim('a', 50), sim('b', 100, 'external-ai')];
  it('axisScores et weakestAxis', () => {
    expect(axisScores(sims).Anamnese).toBe(50);
    expect(weakestAxis(axisScores([sim('b', 10, 'external-ai')]))).toBeNull();
  });
  it('specialtyScores', () => {
    expect(specialtyScores(sims, cases)).toEqual([{ specialty: 'Kardiologie', score: 50, count: 1 }]);
  });
  it('progressSeries', () => {
    expect(progressSeries(sims).map((p) => p.score)).toEqual([50]);
  });
});
