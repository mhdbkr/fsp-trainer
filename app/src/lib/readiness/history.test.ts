import { describe, expect, it } from 'vitest';
import type { Case, PartResult, Simulation } from '@/db/types';
import { bereitschaftHistory, projectBereitschaft } from './history';
import { DAY } from './bereitschaft';
import type { ReadinessInput } from './bereitschaft';

const part = (contentPct: number, officialPct: number): PartResult => ({
  done: true,
  durationSec: 600,
  checklist: [],
  feeling: 50,
  contentPct,
  officialPct,
});

const base = { id: 's', caseId: 'c1', date: 0, parts: {}, notes: {}, prioritizedCorrections: [] } as unknown as Simulation;

const caseOf = (id: string, specialty: Case['specialty']): Case => ({ id, specialty, frequency: 1 } as unknown as Case);

describe('bereitschaftHistory', () => {
  it('produces 12 points, weekEnd[11] === now, non-decreasing value over last 4 weeks with one sim per week', () => {
    const now = 100 * 7 * DAY;
    const cases = [caseOf('c1', 'Kardiologie')];
    const sims: Simulation[] = [];
    for (let i = 0; i < 12; i++) {
      const weekEnd = now - (11 - i) * 7 * DAY;
      sims.push({
        ...base,
        id: `sim-${i}`,
        caseId: 'c1',
        date: weekEnd,
        context: 'pruefungstag',
        withSimulant: true,
        parts: { anamnese: part(80, 80) },
      } as Simulation);
    }
    const input: ReadinessInput = { sims, cases, visibleCases: cases };
    const history = bereitschaftHistory(input, now, 12);
    expect(history).toHaveLength(12);
    expect(history[11].weekEnd).toBe(now);
    const last4 = history.slice(-4).map((p) => p.value);
    for (let i = 1; i < last4.length; i++) {
      expect(last4[i]).toBeGreaterThanOrEqual(last4[i - 1]);
    }
  });
});

describe('projectBereitschaft', () => {
  const mkHistory = (values: number[], now: number) =>
    values.map((value, i) => ({ weekEnd: now - (values.length - 1 - i) * 7 * DAY, value }));

  it('caps atExamDate to <=79 when capped is true', () => {
    const now = 20 * 7 * DAY;
    const history = mkHistory([40, 55, 70, 85], now);
    const examDate = now + 8 * 7 * DAY;
    const result = projectBereitschaft(history, examDate, true);
    expect(result.atExamDate).toBe(examDate);
    expect(result.value).toBeLessThanOrEqual(79);
    expect(result.basis).toBe('trend');
  });

  it('bounds to <=100 when capped is false', () => {
    const now = 20 * 7 * DAY;
    const history = mkHistory([40, 55, 70, 85], now);
    const examDate = now + 8 * 7 * DAY;
    const result = projectBereitschaft(history, examDate, false);
    expect(result.value).toBeLessThanOrEqual(100);
    expect(result.basis).toBe('trend');
  });

  it('returns basis "insufficient" with fewer than 2 points', () => {
    const now = 0;
    const history = [{ weekEnd: now, value: 42 }];
    const result = projectBereitschaft(history, now + 4 * 7 * DAY, true);
    expect(result.basis).toBe('insufficient');
    expect(result.value).toBe(42);
  });

  it('returns basis "insufficient" with zero points', () => {
    const result = projectBereitschaft([], DAY, true);
    expect(result.basis).toBe('insufficient');
    expect(result.value).toBe(0);
  });
});
