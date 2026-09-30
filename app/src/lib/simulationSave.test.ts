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

  it('M9 — un second appel idempotent conserve la date d’origine', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000);
    await saveSimulation({ id: 'lauf-1', c, parts: { anamnese: part }, assistance: 'autonome', layer: 1 as never });
    now.mockReturnValue(9_000);
    const zweite = await saveSimulation({ id: 'lauf-1', c, parts: { anamnese: part }, assistance: 'autonome', layer: 1 as never });
    now.mockRestore();
    expect((await db.simulations.get('lauf-1'))?.date).toBe(1_000);
    expect(zweite.date).toBe(1_000);
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

  // Décision de direction : une séance faite dans l'IA externe compte dans
  // l'historique et la série, jamais dans l'indice de préparation. Le fait
  // « non observé par l'app » voyage AVEC l'événement, il ne se redéduit pas.
  it('marque la séance externe comme auto-déclarée, et une séance jouée dans l’app comme observée', async () => {
    const dehors = await saveSimulation({ c, parts: { anamnese: part }, assistance: 'autonome', layer: 1 as never, mode: 'external-ai', externalTarget: 'chatgpt' });
    await db.progress_events.clear();
    const dedans = await saveSimulation({ c, parts: { anamnese: part }, assistance: 'autonome', layer: 1 as never, mode: 'texte' });

    const evDedans = (await db.progress_events.toArray()).find((e) => e.type === 'simulation.completed' && e.subject_id === dedans.id);
    expect((evDedans?.payload as { selfDeclared?: boolean }).selfDeclared).toBe(false);

    const sim = await db.simulations.get(dehors.id);
    expect(sim?.mode).toBe('external-ai');
  });

  it('l’événement de la séance externe porte selfDeclared: true', async () => {
    const dehors = await saveSimulation({ c, parts: { anamnese: part }, assistance: 'autonome', layer: 1 as never, mode: 'external-ai', externalTarget: 'chatgpt' });
    const ev = (await db.progress_events.toArray()).find((e) => e.type === 'simulation.completed' && e.subject_id === dehors.id);
    expect((ev?.payload as { selfDeclared?: boolean }).selfDeclared).toBe(true);
  });
});
