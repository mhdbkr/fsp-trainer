import { describe, it, expect } from 'vitest';
import { latestSrs, simulationsFrom } from './projections';
import type { ProgressEvent } from './events';

const e = (type: ProgressEvent['type'], subject_id: string, payload: unknown, occurred_at: string): ProgressEvent => ({ id: crypto.randomUUID(), user_id: 'u', type, subject_id, payload, occurred_at });

describe('projections', () => {
  it('latestSrs : le plus récent par occurred_at gagne (last-write-wins)', () => {
    const evs = [
      e('srs.reviewed', 'fb-1', { interval: 1, easeFactor: 2.5, dueDate: 1, repetitions: 1, lapses: 0, state: 'Gelernt' }, '2026-01-02T00:00:00Z'),
      e('srs.reviewed', 'fb-1', { interval: 6, easeFactor: 2.6, dueDate: 2, repetitions: 2, lapses: 0, state: 'Gelernt' }, '2026-01-03T00:00:00Z'),
      e('srs.reviewed', 'fb-1', { interval: 0, easeFactor: 2.5, dueDate: 0, repetitions: 0, lapses: 0, state: 'Neu' }, '2026-01-01T00:00:00Z'),
    ];
    expect(latestSrs(evs, 'fb-1')?.interval).toBe(6);
    expect(latestSrs(evs, 'fb-2')).toBeNull();
  });
  it('simulationsFrom : une Simulation par événement simulation.completed', () => {
    const sim = { id: 's1', caseId: 'c1', date: 1, parts: {}, notes: {}, prioritizedCorrections: [] };
    const out = simulationsFrom([e('simulation.completed', 'c1', sim, '2026-01-01T00:00:00Z'), e('plan.done', 'p', {}, '2026-01-01T00:00:00Z')]);
    expect(out).toEqual([sim]);
  });
});
