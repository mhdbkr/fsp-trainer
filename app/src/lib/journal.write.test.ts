// Le chemin d'ÉCRITURE du journal — revue s3-programme (B-C1, S-I1, S-M1, D-C4, I12).
// Chaque test passe par les fonctions que l'app appelle : logTraining,
// markTaskDone, rebuildJournal.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/auth/session', () => ({
  AUTH_MODE: 'public',
  getAccessToken: async () => null,
  useSession: { getState: () => ({ user: null }) },
}));

import { db } from '@/db/db';
import type { ProgressEvent } from '@/lib/sync/events';
import type { DayPlan, PartResult, Simulation, TaskInstance } from '@/db/types';
import { logTraining, markTaskDone, rebuildJournal, resolveSimulationTask, applySimulationToJournal } from '@/lib/journal';
import { freezeAt, resetClock } from '@/lib/clock';

const task = (o: Partial<TaskInstance> & { id: string }): TaskInstance => ({
  date: '2026-10-01', kind: 'simulation', label: 'Sujet', estMin: 40, source: 'plan', reason: 'parce que', ...o,
});
const plan = (o: Partial<DayPlan> & { date: string; tasks: TaskInstance[] }): DayPlan => ({
  materializedAt: 0, mode: 'teil-first', seed: 's', targetMin: 90, ...o,
});
let seq = 0;
const ev = (type: ProgressEvent['type'], subject_id: string | null, payload: unknown, occurred_at: string): ProgressEvent =>
  ({ id: `e${seq++}`, user_id: 'u1', type, subject_id, payload, occurred_at });

beforeEach(async () => {
  seq = 0;
  await Promise.all([db.training_events.clear(), db.day_plans.clear(), db.case_progress.clear(), db.progress_events.clear(), db.outbox.clear()]);
});
afterEach(() => resetClock());

describe('B-C1 — le journal local ne devance jamais le journal synchronisé', () => {
  it('quand logTraining rend, l\'événement est DANS progress_events : une reconstruction ne le perd pas', async () => {
    freezeAt('2026-10-01T10:00:00Z');
    const te = await logTraining({ kind: 'fiche', caseId: 'c1', spentMin: 12 });
    await rebuildJournal(await db.progress_events.toArray());
    expect((await db.training_events.toArray()).map((t) => t.id)).toEqual([te.id]);
  });
});

/** L'état local doit être celui qu'une reconstruction donnerait (INV-10). */
async function snapshot() {
  const plans = JSON.stringify(await db.day_plans.orderBy('date').toArray());
  const te = JSON.stringify(await db.training_events.orderBy('id').toArray());
  return { plans, te };
}
async function expectLocalEqualsRebuild() {
  const local = await snapshot();
  await rebuildJournal(await db.progress_events.toArray());
  expect(await snapshot()).toEqual(local);
}
const planEv = (type: 'plan.materialized' | 'plan.replanned', date: string, tasks: TaskInstance[], occurred_at: string) =>
  ev(type, date, type === 'plan.materialized' ? { tasks, mode: 'teil-first', seed: 's', targetMin: 90 } : { tasks, reason: 'manuel' }, occurred_at);
const part = (score: number): PartResult => ({ done: true, durationSec: 900, contentPct: score, feeling: score, checklist: [] } as unknown as PartResult);

describe('D-I2 — le plan d\'un autre appareil gagne : le « fait » est reporté par (kind, caseId, teil)', () => {
  it('tâche cochée sur B, le plan de A (plus ancien) gagne : la tâche équivalente de A est faite', async () => {
    const a = task({ id: 'ta', caseId: 'c5', teil: 'anamnese' }), b = task({ id: 'tb', caseId: 'c5', teil: 'anamnese' });
    const done = { at: Date.parse('2026-10-01T10:00:00Z'), kind: 'simulation', caseId: 'c5', teile: ['anamnese'], source: 'plan', taskId: 'tb', spentMin: 20 };
    await rebuildJournal([
      planEv('plan.materialized', '2026-10-01', [a], '2026-10-01T06:00:00Z'),
      planEv('plan.materialized', '2026-10-01', [b], '2026-10-01T07:00:00Z'),
      ev('training.logged', 'x1', done, '2026-10-01T10:00:00Z'),
    ]);
    const p = (await db.day_plans.get('2026-10-01'))!;
    expect(p.tasks.map((t) => t.id)).toEqual(['ta']);
    expect(p.tasks[0].doneAt).toBe(done.at);
    expect(p.tasks[0].eventId).toBe('x1');
  });
  it('sans tâche équivalente dans le plan gagnant : rien n\'est coché, l\'exercice reste dans l\'historique', async () => {
    const a = task({ id: 'ta', caseId: 'c9', teil: 'anamnese' }), b = task({ id: 'tb', caseId: 'c5', teil: 'anamnese' });
    await rebuildJournal([
      planEv('plan.materialized', '2026-10-01', [a], '2026-10-01T06:00:00Z'),
      planEv('plan.materialized', '2026-10-01', [b], '2026-10-01T07:00:00Z'),
      ev('training.logged', 'x1', { at: 1, kind: 'simulation', caseId: 'c5', teile: ['anamnese'], source: 'plan', taskId: 'tb', spentMin: 20 }, '2026-10-01T10:00:00Z'),
    ]);
    expect((await db.day_plans.get('2026-10-01'))!.tasks[0].doneAt).toBeUndefined();
    expect(await db.training_events.count()).toBe(1);
  });
});

describe('I12 — la coche est robuste', () => {
  it('double clic : UN seul événement', async () => {
    freezeAt('2026-10-01T10:00:00Z');
    const t = task({ id: 't1', kind: 'fachwissen', caseId: 'c1' });
    await db.day_plans.put(plan({ date: '2026-10-01', tasks: [t] }));
    await Promise.all([markTaskDone(t), markTaskDone(t)]);
    await markTaskDone(t);
    expect(await db.progress_events.where('type').equals('training.logged').count()).toBe(1);
  });
  it('après minuit, cocher une tâche de la veille la coche LOCALEMENT, comme au rebuild', async () => {
    freezeAt(new Date(2026, 9, 2, 0, 30));
    const t = task({ id: 't1', date: '2026-10-01', kind: 'fachwissen', caseId: 'c1' });
    await db.progress_events.put(planEv('plan.materialized', '2026-10-01', [t], '2026-10-01T06:00:00Z'));
    await rebuildJournal(await db.progress_events.toArray());
    await markTaskDone(t);
    expect((await db.day_plans.get('2026-10-01'))!.tasks[0].doneAt).toBeDefined();
    await expectLocalEqualsRebuild();
  });
});

describe('D-C4 — résolution à l\'écriture, un seul événement par exercice', () => {
  const dayPlan = (tasks: TaskInstance[]) => db.progress_events.put(planEv('plan.materialized', '2026-10-01', tasks, '2026-10-01T06:00:00Z'))
    .then(async () => rebuildJournal(await db.progress_events.toArray()));

  it('une simulation libre du cas prévu porte le taskId de la tâche (persisté dans simulation.completed)', async () => {
    freezeAt(new Date(2026, 9, 1, 10, 0));
    await dayPlan([task({ id: 't1', caseId: 'c1', teil: 'anamnese' })]);
    const sim = { id: 'sim-9', caseId: 'c1', date: new Date(2026, 9, 1, 10, 0).getTime(), parts: { anamnese: part(85) }, notes: {}, prioritizedCorrections: [], scope: 'teil', teil: 'anamnese' } as unknown as Simulation;
    const resolved = await resolveSimulationTask(sim);
    expect(resolved.taskId).toBe('t1');
    await db.progress_events.put(ev('simulation.completed', 'c1', resolved, '2026-10-01T10:00:00Z'));
    await applySimulationToJournal(resolved);
    expect((await db.day_plans.get('2026-10-01'))!.tasks[0].eventId).toBe('te-sim-9');
    await expectLocalEqualsRebuild();
  });
  it('un taskId explicite (lancé depuis le plan) n\'est jamais remplacé', async () => {
    const sim = { id: 'sim-9', caseId: 'c1', date: 1, parts: {}, taskId: 'tX' } as unknown as Simulation;
    expect((await resolveSimulationTask(sim)).taskId).toBe('tX');
  });
  it('coche manuelle PUIS jeu : un seul exercice dans le journal, la tâche est faite par le jeu', async () => {
    freezeAt(new Date(2026, 9, 1, 10, 0));
    const t = task({ id: 't1', caseId: 'c1', teil: 'anamnese' });
    await dayPlan([t]);
    await markTaskDone(t);
    const sim = await resolveSimulationTask({ id: 'sim-7', caseId: 'c1', date: new Date(2026, 9, 1, 10, 5).getTime(), parts: { anamnese: part(70) }, notes: {}, prioritizedCorrections: [], scope: 'teil', teil: 'anamnese' } as unknown as Simulation);
    expect(sim.taskId).toBe('t1');                                   // la coche nue est absorbée par le jeu
    await db.progress_events.put(ev('simulation.completed', 'c1', sim, '2026-10-01T10:05:00Z'));
    await applySimulationToJournal(sim);
    expect((await db.training_events.toArray()).map((x) => x.id)).toEqual(['te-sim-7']);
    expect((await db.day_plans.get('2026-10-01'))!.tasks[0].eventId).toBe('te-sim-7');
    await expectLocalEqualsRebuild();
  });
  it('fiche et drill libres cochent leur tâche (même caseId pour la fiche)', async () => {
    freezeAt(new Date(2026, 9, 1, 10, 0));
    await dayPlan([task({ id: 'td', kind: 'drill' }), task({ id: 'tf', kind: 'fachwissen', caseId: 'c1' })]);
    const f = await logTraining({ kind: 'fiche', caseId: 'c1', spentMin: 9 });
    const d = await logTraining({ kind: 'drill', spentMin: 6 });
    expect([f.taskId, d.taskId]).toEqual(['tf', 'td']);
    await expectLocalEqualsRebuild();
  });
});

describe('S-I1 / S-M1 — un training.logged n\'est pas cru sur parole', () => {
  it('S-I1 : les scores d\'un training.logged sont ignorés — seul simulation.completed mesure', async () => {
    await rebuildJournal([ev('training.logged', 'x1', { at: 1, kind: 'simulation', caseId: 'c1', teile: ['anamnese'], source: 'libre', spentMin: 5, scores: { anamnese: 100 } }, '2026-10-01T10:00:00Z')]);
    expect((await db.training_events.get('x1'))!.scores).toBeUndefined();
    expect((await db.case_progress.get('c1'))?.teile.anamnese.status ?? 'vierge').toBe('vierge');
  });
  it('S-M1 : `teile: ["__proto__"]` ne pollue pas le prototype, `teile: null` ne casse pas la reconstruction', async () => {
    await rebuildJournal([
      ev('training.logged', 'x1', { at: 1, kind: 'fiche', caseId: 'c1', teile: ['__proto__', 'anamnese'], source: 'libre', spentMin: 5 }, '2026-10-01T10:00:00Z'),
      ev('training.logged', 'x2', { at: 2, kind: 'fiche', caseId: 'c1', teile: null, source: 'libre', spentMin: 5 }, '2026-10-01T10:00:01Z'),
      ev('training.logged', 'x3', null, '2026-10-01T10:00:02Z'),
      ev('training.logged', 'x4', { at: 'hier', kind: 'hack' }, '2026-10-01T10:00:03Z'),
    ]);
    expect(({} as Record<string, unknown>).attempts).toBeUndefined();
    expect((await db.training_events.get('x1'))!.teile).toEqual(['anamnese']);
    expect((await db.training_events.get('x2'))!.teile).toEqual([]);
    expect(await db.training_events.count()).toBe(2);
  });
  it('spentMin borné et entier (0–1440)', async () => {
    await rebuildJournal([ev('training.logged', 'x1', { at: 1, kind: 'drill', teile: [], source: 'libre', spentMin: 1e9 }, '2026-10-01T10:00:00Z')]);
    expect((await db.training_events.get('x1'))!.spentMin).toBe(1440);
  });
});

describe('M4 — une coche sans score n\'est pas une mesure', () => {
  const coche = (id: string, caseId: string) => ({ id, at: 1, kind: 'simulation' as const, caseId, teile: ['anamnese' as const], source: 'plan' as const, taskId: `t-${id}`, spentMin: 0 });
  it('case_progress : vierge ⇔ attempts = 0 ⇔ lastScore = null, même après une coche', async () => {
    const { computeCaseProgress } = await import('@/lib/journal');
    const [cp] = computeCaseProgress([coche('a', 'c1')]);
    expect(cp.teile.anamnese).toEqual({ status: 'vierge', lastScore: null, lastAt: null, attempts: 0 });
  });
  it('observeModus ne vote que sur des séances mesurées : trois coches ne « révèlent » aucun mode', async () => {
    const { observeModus } = await import('@/lib/program/modus');
    expect(observeModus([coche('a', 'c1'), coche('b', 'c2'), coche('c', 'c3'), coche('d', 'c4')], [])).toBeNull();
  });
});

describe('I-3 — une tâche faite n\'est jamais perdue (décision de main, amende D-I2)', () => {
  it('deux appareils, plan de A gagnant, sans équivalent : la tâche faite sur B est AJOUTÉE au plan de A, faite', async () => {
    const a = task({ id: 'ta', caseId: 'c9', teil: 'dokumentation' });     // A n'a pas vu la simulation d'hier : autre Teil du jour
    const b = task({ id: 'tb', caseId: 'c5', teil: 'anamnese' });
    const done = { at: Date.parse('2026-10-01T10:00:00Z'), kind: 'simulation', caseId: 'c5', teile: ['anamnese'], source: 'plan', taskId: 'tb', spentMin: 20 };
    await rebuildJournal([
      planEv('plan.materialized', '2026-10-01', [a], '2026-10-01T06:00:00Z'),
      planEv('plan.materialized', '2026-10-01', [b], '2026-10-01T07:00:00Z'),
      ev('training.logged', 'x1', done, '2026-10-01T10:00:00Z'),
      ev('training.logged', 'x2', { ...done, at: done.at + 1 }, '2026-10-01T10:00:01Z'),   // un second exercice sur la même tâche : pas de doublon
    ]);
    const p = (await db.day_plans.get('2026-10-01'))!;
    expect(p.tasks.map((t) => [t.id, t.doneAt !== undefined])).toEqual([['ta', false], ['tb', true]]);
  });
});
