// BUG-C6-1 — les démos `sim-demo-*` ne sont jamais des données du candidat.
// Garde dans le prédicat partagé (`estMesuree`) : aucun score, axe, spécialité
// ni courbe ne les lit. La migration Dexie v6 les retire des bases existantes.
import { describe, it, expect } from 'vitest';
import Dexie from 'dexie';
import type { Case, PartResult, Simulation } from '@/db/types';
import { FspDatabase } from '@/db/db';
import { axisScores, progressSeries, specialtyScores, weakestAxis } from './stats';

const part = (score: number): PartResult => ({ done: true, durationSec: 600, contentPct: score, feeling: score, checklist: [] } as unknown as PartResult);
const sim = (id: string, score: number, date = Date.parse('2026-10-01T10:00:00Z')): Simulation =>
  ({ id, caseId: 'c1', date, parts: { anamnese: part(score) }, notes: {}, prioritizedCorrections: [] } as unknown as Simulation);
const cases = [{ id: 'c1', specialty: 'Kardiologie' } as unknown as Case];

describe('BUG-C6-1 — les démos ne comptent dans aucun score', () => {
  const sims = [sim('sim-demo-1', 95), sim('s-reelle', 40)];
  it('axes, point faible, spécialités, courbe', () => {
    expect(axisScores(sims).Anamnese).toBe(40);
    expect(weakestAxis(axisScores([sim('sim-demo-2', 10)]))).toBeNull();
    expect(specialtyScores(sims, cases)).toEqual([{ specialty: 'Kardiologie', score: 40, count: 1 }]);
    expect(progressSeries(sims).map((p) => p.score)).toEqual([40]);
    expect(progressSeries([sim('sim-demo-3', 90)])).toEqual([]);
  });
});

describe('BUG-C6-1 — migration Dexie v6', () => {
  it('supprime les sim-demo-* des bases existantes et garde les vraies séances', async () => {
    const name = `mig-demo-${Math.random()}`;
    const old = new Dexie(name);
    old.version(5).stores({ simulations: 'id, caseId, date, role, profileId, teil' });
    await old.table('simulations').bulkPut([sim('sim-demo-1', 70), sim('sim-demo-2', 70), sim('sim-demo-3', 70), sim('vraie-1', 55)]);
    old.close();
    const neuve = new FspDatabase(name);
    await neuve.open();
    expect((await neuve.simulations.toArray()).map((s) => s.id)).toEqual(['vraie-1']);
    neuve.close();
  });
});
