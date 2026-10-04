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
    await Promise.all([db.training_events.clear(), db.case_progress.clear(), db.day_plans.clear()]);
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

  it('external-ai : enregistre, émet simulation.completed avec mode/externalTarget, n\'écrit plus la confiance du cas (R-C5)', async () => {
    const sim = await saveSimulation({ c, parts: { anamnese: part }, assistance: 'autonome', layer: 1 as never, mode: 'external-ai', externalTarget: 'chatgpt' });
    expect(sim.mode).toBe('external-ai');
    expect(sim.externalTarget).toBe('chatgpt');
    expect(await db.simulations.get(sim.id)).toBeTruthy();
    const ev = (await db.progress_events.toArray()).find((e) => e.type === 'simulation.completed');
    expect((ev?.payload as { mode?: string }).mode).toBe('external-ai');
    const updated = await db.cases.get('c1');
    expect(updated?.lastSimulationId).toBeUndefined();
    expect(updated?.confidence).toBeUndefined();
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

  // R-C2 / R-C5 (intégration s3-programme) : le journal LOCAL est alimenté à
  // l'enregistrement — sans attendre un redémarrage — et `case_progress` est la
  // seule vérité : plus de confidence / status / lastSimulationId.
  it('R-C2 : training_events et case_progress existent dès le retour, identiques à une reconstruction', async () => {
    const good = { done: true, checklist: [], contentPct: 90, feeling: 90, durationSec: 600 } as never;
    const sim = await saveSimulation({ id: 'lauf-2', c, parts: { anamnese: good }, assistance: 'autonome', layer: 2 as never });
    expect(await db.training_events.get(`te-${sim.id}`)).toBeDefined();
    expect((await db.case_progress.get('c1'))?.teile.anamnese.status).toBe('solide');
    const { rebuildJournal } = await import('@/lib/journal');
    const avant = JSON.stringify(await db.training_events.toArray());
    await rebuildJournal();
    expect(JSON.stringify(await db.training_events.toArray())).toBe(avant);   // l'événement était DÉJÀ dans progress_events
  });
  it('R-C5 : status / confidence / lastSimulationId jamais écrits ; layerProgress ne redescend pas', async () => {
    await db.cases.update('c1', { layerProgress: 3 } as never);
    await saveSimulation({ c, parts: { anamnese: part }, assistance: 'assiste', layer: 1 as never });
    const k = await db.cases.get('c1');
    expect([k?.status, k?.confidence, k?.lastSimulationId, k?.layerProgress]).toEqual([undefined, undefined, undefined, 3]);
  });
  it('R-C4 : le taskId passé est persisté dans la ligne et l\'événement', async () => {
    await db.day_plans.put({ date: '2026-10-01', materializedAt: 0, mode: 'teil-first', seed: 's', targetMin: 90,
      tasks: [{ id: 'tA', date: '2026-10-01', kind: 'simulation', caseId: 'c1', teil: 'anamnese', label: 'X', estMin: 20, source: 'plan', reason: 'r' }] });
    const sim = await saveSimulation({ c, parts: { anamnese: part }, assistance: 'autonome', layer: 1 as never, scope: 'teil', teil: 'anamnese', taskId: 'tA' });
    expect(sim.taskId).toBe('tA');
    const ev = (await db.progress_events.toArray()).find((e) => e.type === 'simulation.completed' && e.subject_id === sim.id);
    expect((ev?.payload as { taskId?: string }).taskId).toBe('tA');
  });

  it('C6-A — une grille de langue non notée ne produit aucune correction « Sprache »', async () => {
    const vide = { aussprache: -1, wortschatz: -1, grammatik: -1, redefluss: -1, kommunikation: -1 };
    const sim = await saveSimulation({ c, parts: { anamnese: { ...(part as object), languageGrid: vide } as never }, assistance: 'autonome', layer: 1 as never });
    expect(sim.prioritizedCorrections.filter((x) => x.includes('Sprache'))).toEqual([]);
  });
});
