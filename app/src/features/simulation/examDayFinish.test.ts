import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Case, PartResult } from '@/db/types';
import { db } from '@/db/db';
import { syncQueue } from '@/lib/sync/queue';
import { simulationPassed } from '@/lib/scoring';
import type { ExamDayState } from './examDaySession';
import { targetSec } from './examDayPlan';
import { buildExamDaySimulation, buildExamDayPayload, persistExamDay } from './examDayFinish';

vi.mock('@/lib/auth/session', () => ({
  getAccessToken: vi.fn().mockResolvedValue(null),
  useSession: { getState: () => ({ user: null }) },
}));

const part = (contentPct: number, officialPct: number, extra: Partial<PartResult> = {}): PartResult => ({
  done: true,
  durationSec: 0,
  checklist: [],
  feeling: 50,
  contentPct,
  officialPct,
  ...extra,
});

const caseOf = (id: string): Case => ({ id, specialty: 'Innere', frequency: 1 } as unknown as Case);

const stOf = (overrides: Partial<ExamDayState> = {}): ExamDayState =>
  ({
    caseId: 'c1',
    caseName: 'Fall 1',
    land: 'BW',
    withSimulant: true,
    startedAt: 0,
    partTimes: { anamnese: 0, dokumentation: 20 * 60 * 1000, fallvorstellung: 40 * 60 * 1000 },
    transitionStartedAt: null,
    phase: 'result',
    current: 'fallvorstellung',
    bogen: {},
    arztbriefText: '',
    aufklaerungOpened: false,
    results: {
      anamnese: part(90, 80),
      dokumentation: part(85, 0),
      fallvorstellung: part(70, 60),
    },
    ...overrides,
  }) as ExamDayState;

describe('buildExamDaySimulation', () => {
  it("porte context 'pruefungstag', assistance 'autonome', layer 3, withSimulant recopié", () => {
    const st = stOf();
    const c = caseOf('c1');
    const now = 60 * 60 * 1000;
    const sim = buildExamDaySimulation(st, c, now);
    expect(sim.context).toBe('pruefungstag');
    expect(sim.assistance).toBe('autonome');
    expect(sim.layer).toBe(3);
    expect(sim.withSimulant).toBe(true);
    expect(sim.id).toBe(`sim-exam-${st.startedAt}`);
  });

  it('recopie examDay.partTimes et endedAt = now', () => {
    const st = stOf();
    const c = caseOf('c1');
    const now = 60 * 60 * 1000;
    const sim = buildExamDaySimulation(st, c, now);
    expect(sim.examDay?.partTimes).toEqual(st.partTimes);
    expect(sim.examDay?.endedAt).toBe(now);
    expect(sim.examDay?.startedAt).toBe(st.startedAt);
  });

  it('recalcule durationSec ≤ 1200 par partie (min(target, écart), dernier = min(target, now-start))', () => {
    const st = stOf();
    const c = caseOf('c1');
    const now = 60 * 60 * 1000; // fallvorstellung dure 20 min pile
    const sim = buildExamDaySimulation(st, c, now);
    const target = targetSec('BW', 'anamnese');
    expect(sim.parts.anamnese!.durationSec).toBe(Math.min(target, 20 * 60));
    expect(sim.parts.dokumentation!.durationSec).toBe(Math.min(target, 20 * 60));
    expect(sim.parts.fallvorstellung!.durationSec).toBe(Math.min(target, 20 * 60));
    for (const p of Object.values(sim.parts)) {
      if (p) expect(p.durationSec).toBeLessThanOrEqual(1200);
    }
  });

  it("plafonne durationSec au-delà du target même si l'écart réel dépasse", () => {
    const st = stOf({ partTimes: { anamnese: 0, dokumentation: 25 * 60 * 1000, fallvorstellung: 50 * 60 * 1000 } });
    const c = caseOf('c1');
    const now = 75 * 60 * 1000;
    const sim = buildExamDaySimulation(st, c, now);
    expect(sim.parts.anamnese!.durationSec).toBe(targetSec('BW', 'anamnese'));
    expect(sim.parts.fallvorstellung!.durationSec).toBe(targetSec('BW', 'fallvorstellung'));
  });

  it('passed = simulationPassed(sim)', () => {
    const st = stOf();
    const c = caseOf('c1');
    const sim = buildExamDaySimulation(st, c, 60 * 60 * 1000);
    expect(sim.passed).toBe(simulationPassed(sim));
  });
});

describe('buildExamDayPayload', () => {
  it('respecte le contrat v1 et weightClass = solo si !withSimulant', () => {
    const st = stOf({ withSimulant: false });
    const c = caseOf('c1');
    const now = 60 * 60 * 1000;
    const sim = buildExamDaySimulation(st, c, now);
    const before = { value: 40 } as any;
    const after = { value: 55 } as any;
    const payload = buildExamDayPayload(sim, c, before, after, '1.0.0');
    expect(payload.v).toBe(1);
    expect(payload.simulationId).toBe(sim.id);
    expect(payload.weightClass).toBe('solo');
    expect(payload.parts.aufklaerung).toBeNull();
  });

  it('weightClass = pruefungstag si withSimulant, taille < 2 Ko, sans champs texte libre', () => {
    const st = stOf();
    const c = caseOf('c1');
    const sim = buildExamDaySimulation(st, c, 60 * 60 * 1000);
    const before = { value: 40 } as any;
    const after = { value: 55 } as any;
    const payload = buildExamDayPayload(sim, c, before, after, '1.0.0');
    expect(payload.weightClass).toBe('pruefungstag');
    const json = JSON.stringify(payload);
    expect(json.length).toBeLessThan(2048);
    expect(json).not.toContain('bogen');
    expect(json).not.toContain('arztbriefText');
  });
});

describe('persistExamDay', () => {
  beforeEach(async () => {
    await db.simulations.clear();
    await db.cases.clear();
    await db.progress_events.clear();
    await db.outbox.clear();
  });

  it('enfile simulation.completed puis exam_day.completed (subject_id = sim.id), et persiste', async () => {
    const push = vi.spyOn(syncQueue, 'push').mockResolvedValue({} as any);
    const st = stOf();
    const c = caseOf('c1');
    await db.cases.put(c);
    const now = 60 * 60 * 1000;
    const sim = buildExamDaySimulation(st, c, now);
    const before = { value: 40 } as any;
    const after = { value: 55 } as any;
    const payload = buildExamDayPayload(sim, c, before, after, '1.0.0');

    await persistExamDay(sim, payload, c);

    expect(push).toHaveBeenCalledTimes(2);
    expect(push.mock.calls[0][0].type).toBe('simulation.completed');
    expect(push.mock.calls[1][0].type).toBe('exam_day.completed');
    expect(push.mock.calls[1][0].subject_id).toBe(sim.id);

    expect(await db.simulations.get(sim.id)).toBeTruthy();
    const updated = await db.cases.get(c.id);
    expect(updated?.lastSimulationId).toBe(sim.id);
    push.mockRestore();
  });

  it("un push qui rejette ne fait pas échouer persistExamDay", async () => {
    const push = vi.spyOn(syncQueue, 'push').mockRejectedValue(new Error('offline'));
    const st = stOf();
    const c = caseOf('c1');
    await db.cases.put(c);
    const sim = buildExamDaySimulation(st, c, 60 * 60 * 1000);
    const payload = buildExamDayPayload(sim, c, { value: 40 } as any, { value: 55 } as any, '1.0.0');

    await expect(persistExamDay(sim, payload, c)).resolves.toBeUndefined();
    push.mockRestore();
  });
});
