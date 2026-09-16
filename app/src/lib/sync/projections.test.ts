import { describe, it, expect } from 'vitest';
import { latestSrs, simulationsFrom, rebuildProjections } from './projections';
import { db } from '@/db/db';
import type { ProgressEvent, ExamDayCompletedPayload } from './events';

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

describe('exam_day.completed', () => {
  it('journal avec exam_day.completed : pas d\'erreur, aucune ligne dérivée, sim restituée avec context/withSimulant/examDay', async () => {
    const sim = {
      id: 'sim-exam-1', caseId: 'c1', date: 1, parts: {}, notes: {}, prioritizedCorrections: [],
      context: 'pruefungstag', withSimulant: true,
      examDay: { startedAt: 1, endedAt: 2, land: 'BW', partTimes: {} },
    };
    const part = { score: 71, contentPct: 68, officialPct: 76, durationSec: 1200, passed: true };
    const payload: ExamDayCompletedPayload = {
      v: 1,
      simulationId: 'sim-exam-1',
      caseId: 'c1',
      specialty: 'Kardiologie',
      land: 'BW',
      withSimulant: true,
      weightClass: 'pruefungstag',
      startedAt: '2026-01-01T00:00:00.000Z',
      endedAt: '2026-01-01T01:00:00.000Z',
      parts: { anamnese: part, dokumentation: part, fallvorstellung: part, aufklaerung: null },
      passed: true,
      bereitschaft: { before: 61, after: 64, capped: 'no_recent_exam_day' },
      appVersion: '1.4.0',
    };
    await db.progress_events.bulkPut([
      e('simulation.completed', 'c1', sim, '2026-01-01T00:00:00Z'),
      e('exam_day.completed', 'sim-exam-1', payload, '2026-01-01T00:00:01Z'),
    ]);
    await expect(rebuildProjections()).resolves.not.toThrow();
    const got = await db.simulations.get('sim-exam-1');
    expect(got).toMatchObject({ context: 'pruefungstag', withSimulant: true, examDay: { land: 'BW' } });
    expect(await db.simulations.count()).toBe(1);
  });
});
