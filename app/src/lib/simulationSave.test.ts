import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db/db';
import { saveSimulation } from './simulationSave';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db');
  const { newId } = await import('@/lib/sync/events');
  return {
    syncQueue: {
      push: vi.fn(async (i: { type: string; subject_id: string | null; payload: unknown }) => {
        const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...i } as never;
        await db.progress_events.put(ev);
        return ev;
      }),
    },
  };
});
vi.mock('@/lib/supabase', () => ({ supabase: {}, callFn: vi.fn() }));

const c = {
  id: 'c1', name: 'X', pathology: 'x', specialty: 'X',
  linkedFachbegriffeIds: [], probableAufklaerungIds: [], caseSpecificQuestions: [], centers: [],
  frequency: 1, difficulty: 1,
  patientSheet: { personalia: { name: 'A', age: 1 }, leitsymptome: [], begleitsymptome: [], antworten: {}, vegetativeAnamnese: [] },
  medicalView: {},
} as never;
const part = { done: true, checklist: [], feeling: 70, durationSec: 600 } as never;

describe('saveSimulation', () => {
  beforeEach(async () => {
    await db.simulations.clear();
    await db.progress_events.clear();
    await db.cases.clear();
    await db.cases.put(c);
  });

  it('external-ai : enregistre, émet simulation.completed avec mode/externalTarget, met à jour la confiance du cas', async () => {
    const sim = await saveSimulation({ c, parts: { anamnese: part }, assistance: 'autonome', layer: 1 as never, mode: 'external-ai', externalTarget: 'chatgpt' });
    expect(sim.mode).toBe('external-ai');
    expect(sim.externalTarget).toBe('chatgpt');
    expect(await db.simulations.get(sim.id)).toBeTruthy();
    const ev = (await db.progress_events.toArray()).find((e) => e.type === 'simulation.completed');
    expect((ev?.payload as { mode?: string }).mode).toBe('external-ai');
    const updated = await db.cases.get('c1');
    expect(updated?.lastSimulationId).toBe(sim.id);
    expect(typeof updated?.confidence).toBe('number');
  });
});
