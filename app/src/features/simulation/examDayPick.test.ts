import { describe, expect, it } from 'vitest';
import type { Case, Simulation } from '@/db/types';
import { pickExamDayCase } from './examDayPick';
import { EXAM_DAY_PLAN } from './examDayPlan';

const day = 24 * 60 * 60 * 1000;
const now = 1_000_000_000_000;

function caseOf(id: string, frequency: number): Case {
  return { id, frequency } as unknown as Case;
}

function simOf(caseId: string, daysAgo: number): Simulation {
  return { id: `sim-${caseId}-${daysAgo}`, caseId, date: now - daysAgo * day, parts: {}, notes: {} as Simulation['notes'], prioritizedCorrections: [] } as unknown as Simulation;
}

describe('pickExamDayCase', () => {
  it('tire A quand rng() = 0 (début du cumul)', () => {
    const cases = [caseOf('A', 10), caseOf('B', 30)];
    const picked = pickExamDayCase(cases, [], now, () => 0);
    expect(picked?.id).toBe('A');
  });

  it('tire B quand rng() proche de 1 (fin du cumul)', () => {
    const cases = [caseOf('A', 10), caseOf('B', 30)];
    const picked = pickExamDayCase(cases, [], now, () => 0.99);
    expect(picked?.id).toBe('B');
  });

  it('tire B exactement au seuil du cumul (10/40 = 0.25)', () => {
    const cases = [caseOf('A', 10), caseOf('B', 30)];
    const picked = pickExamDayCase(cases, [], now, () => 0.25);
    expect(picked?.id).toBe('B');
  });

  it('exclut un cas joué il y a 13 jours (< 14 j)', () => {
    const cases = [caseOf('A', 10), caseOf('B', 30)];
    const sims = [simOf('A', 13)];
    const picked = pickExamDayCase(cases, sims, now, () => 0);
    expect(picked?.id).toBe('B');
  });

  it('inclut un cas joué il y a 15 jours (>= 14 j)', () => {
    const cases = [caseOf('A', 10), caseOf('B', 30)];
    const sims = [simOf('A', 15)];
    const picked = pickExamDayCase(cases, sims, now, () => 0);
    expect(picked?.id).toBe('A');
  });

  it('relâche la contrainte 14 j si tous les cas ont été joués récemment', () => {
    const cases = [caseOf('A', 10), caseOf('B', 30)];
    const sims = [simOf('A', 1), simOf('B', 1)];
    const picked = pickExamDayCase(cases, sims, now, () => 0);
    expect(picked).not.toBeNull();
    expect(['A', 'B']).toContain(picked?.id);
  });

  it('retourne null si la liste de cas est vide', () => {
    const picked = pickExamDayCase([], [], now, () => 0.5);
    expect(picked).toBeNull();
  });

  it('traite frequency 0 comme un poids de 1 (jamais exclu du tirage)', () => {
    const cases = [caseOf('A', 0), caseOf('B', 0)];
    const pickedLow = pickExamDayCase(cases, [], now, () => 0);
    const pickedHigh = pickExamDayCase(cases, [], now, () => 0.99);
    expect(pickedLow?.id).toBe('A');
    expect(pickedHigh?.id).toBe('B');
  });

  it("utilise excludePlayedWithinMs de EXAM_DAY_PLAN['BW']", () => {
    const boundary = EXAM_DAY_PLAN.BW.excludePlayedWithinMs;
    expect(boundary).toBe(14 * day);
  });
});
