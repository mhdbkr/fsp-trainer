// Invariants du journal — contrat `docs/contracts/training-journal.md` §8.
// Écrits AVANT le moteur qu'ils gardent. Chaque test porte son identifiant
// opposable : un test sans `INV-*` ne compte pas.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Ces tests tournent SANS `.env` (contrat §10) : ni Supabase, ni réseau.
vi.mock('@/lib/auth/session', () => ({
  AUTH_MODE: 'public',
  getAccessToken: async () => null,
  useSession: { getState: () => ({ user: null }) },
}));

import { db } from '@/db/db';
import type { ProgressEvent } from '@/lib/sync/events';
import type { DayPlan, PartResult, SimTeil, Simulation, TaskInstance, TrainingEvent } from '@/db/types';
import {
  computeCaseProgress, detteTeil, logTraining, markTaskDone, pointFaible,
  projectDayPlans, projectTrainingEvents, rebuildJournal, satisfiedTask,
  spentByDay, trainingEventFromSimulation, workedDayKeys, applySimulationToJournal,
} from '@/lib/journal';
import { freezeAt, resetClock, DAY_MS } from '@/lib/clock';

// --- fabriques minimales ----------------------------------------------------

const part = (score: number): PartResult => ({
  done: true, durationSec: 600,
  checklist: Array.from({ length: 10 }, (_, i) => ({ id: `i${i}`, label: `l${i}`, checked: i < score / 10 })),
} as unknown as PartResult);

const sim = (o: Partial<Simulation> & { id: string; caseId: string; date: number }): Simulation => ({
  parts: {}, notes: {}, prioritizedCorrections: [], ...o,
} as Simulation);

let seq = 0;
const ev = (type: ProgressEvent['type'], subject_id: string | null, payload: unknown, occurred_at: string, id?: string): ProgressEvent =>
  ({ id: id ?? `e${seq++}`, user_id: 'u1', type, subject_id, payload, occurred_at });

const task = (o: Partial<TaskInstance> & { id: string }): TaskInstance => ({
  date: '2026-10-01', kind: 'simulation', label: 'Sujet', estMin: 40, source: 'plan', reason: 'parce que', ...o,
});

const plan = (o: Partial<DayPlan> & { date: string; tasks: TaskInstance[] }): DayPlan => ({
  materializedAt: 0, mode: 'teil-first', seed: 's', targetMin: 90, ...o,
});

beforeEach(async () => {
  seq = 0;
  await Promise.all([db.training_events.clear(), db.day_plans.clear(), db.case_progress.clear(), db.progress_events.clear(), db.outbox.clear()]);
});
afterEach(() => resetClock());

// ---------------------------------------------------------------------------

describe('dérivation §2.3 — un fait, un événement', () => {
  it('un run de trois Teile écrit UN événement à trois Teile, pas trois', () => {
    const te = trainingEventFromSimulation(sim({
      id: 'sim-1', caseId: 'c1', date: 1000,
      parts: { anamnese: part(90), dokumentation: part(70), fallvorstellung: part(50) },
    }));
    expect(te.teile).toEqual(['anamnese', 'dokumentation', 'fallvorstellung']);
    expect(te.id).toBe('te-sim-1');
    expect(te.laufId).toBe('sim-1');
  });

  it('`teile` porte le FAIT, pas l’intention : une partie non jouée n’y est pas', () => {
    const te = trainingEventFromSimulation(sim({
      id: 'sim-2', caseId: 'c1', date: 1000, scope: 'teil', teil: 'anamnese',
      parts: { anamnese: part(90) },
    }));
    expect(te.teile).toEqual(['anamnese']);
  });

  it('`source` suit `taskId` : sans tâche, l’exercice est libre', () => {
    expect(trainingEventFromSimulation(sim({ id: 's', caseId: 'c1', date: 1 })).source).toBe('libre');
    expect(trainingEventFromSimulation(sim({ id: 's', caseId: 'c1', date: 1, taskId: 't1' })).source).toBe('plan');
  });

  it('une séance IA externe est marquée `selbstbewertet`', () => {
    expect(trainingEventFromSimulation(sim({ id: 's', caseId: 'c1', date: 1, mode: 'external-ai' })).selbstbewertet).toBe(true);
  });
});

describe('INV-10 — le journal est append-only et se reconstruit à l’identique', () => {
  const events = [
    ev('simulation.completed', 'c1', sim({ id: 'sim-1', caseId: 'c1', date: 1000, parts: { anamnese: part(90) } }), '2026-10-01T08:00:00Z'),
    ev('training.logged', 'te-drill-1', { at: 2000, kind: 'drill', teile: [], source: 'libre', spentMin: 12 }, '2026-10-01T09:00:00Z'),
  ];

  it('INV-10 : deux projections successives donnent exactement le même état', () => {
    expect(projectTrainingEvents(events)).toEqual(projectTrainingEvents(events));
  });

  it('INV-10 : `rebuildJournal()` deux fois de suite est stable', async () => {
    await rebuildJournal(events);
    const first = await db.training_events.orderBy('id').toArray();
    await rebuildJournal(events);
    const second = await db.training_events.orderBy('id').toArray();
    expect(second).toEqual(first);
    expect(second).toHaveLength(2);
  });

  it('INV-10 : rejouer le même `simulation.completed` ne duplique rien (id déterministe)', () => {
    const twice = [...events, { ...events[0], id: 'autre-uuid' }];
    expect(projectTrainingEvents(twice)).toHaveLength(2);
  });
});

describe('INV-5 / INV-6 — hors plan compte, drill compris', () => {
  const libre: TrainingEvent = { id: 'a', at: Date.parse('2026-10-01T10:00:00Z'), kind: 'simulation', caseId: 'c1', teile: ['anamnese'], source: 'libre', spentMin: 20 };
  const drill: TrainingEvent = { id: 'b', at: Date.parse('2026-10-02T10:00:00Z'), kind: 'drill', teile: [], source: 'libre', spentMin: 15 };
  const duPlan: TrainingEvent = { id: 'c', at: Date.parse('2026-10-01T18:00:00Z'), kind: 'simulation', caseId: 'c2', teile: ['dokumentation'], source: 'plan', taskId: 't1', spentMin: 25 };

  it('INV-5 : tout événement entre dans le temps investi de SON jour, quelle que soit sa source', () => {
    const m = spentByDay([libre, drill, duPlan]);
    expect(m.get('2026-10-01')).toBe(45);   // libre + plan, le même jour
    expect(m.get('2026-10-02')).toBe(15);
  });

  it('INV-5 : tout événement entre dans l’historique, quelle que soit sa source', () => {
    const all = [libre, drill, duPlan];
    expect(all.filter((e) => e.source === 'libre')).toHaveLength(2);
    expect(workedDayKeys(all).size).toBe(2);
  });

  it('INV-6 : une journée 100 % drill est une journée travaillée', () => {
    expect(workedDayKeys([drill]).has('2026-10-02')).toBe(true);
    expect(spentByDay([drill]).get('2026-10-02')).toBeGreaterThan(0);
  });

  it('INV-6 : un jour sans événement n’est jamais travaillé', () => {
    expect(workedDayKeys([drill]).has('2026-10-03')).toBe(false);
    expect(spentByDay([drill]).get('2026-10-03') ?? 0).toBe(0);
  });
});

describe('INV-3 / INV-11 — la progression par Teil', () => {
  const at = Date.parse('2026-10-01T10:00:00Z');
  const one = (teil: SimTeil, score: number, o: Partial<TrainingEvent> = {}): TrainingEvent =>
    ({ id: `x${Math.random()}`, at, kind: 'simulation', caseId: 'c1', teile: [teil], source: 'libre', spentMin: 10, scores: { [teil]: score }, ...o });

  it('table de vérité complète des quatre TeilStatus', () => {
    const cases: [number | null, string][] = [[null, 'vierge'], [0, 'fragile'], [59, 'fragile'], [60, 'acquis'], [79, 'acquis'], [80, 'solide'], [100, 'solide']];
    for (const [score, expected] of cases) {
      const [cp] = score === null ? [undefined] : computeCaseProgress([one('anamnese', score)]);
      expect(cp?.teile.anamnese.status ?? 'vierge').toBe(expected);
    }
  });

  it('les TROIS clés sont toujours présentes, même après un seul Teil', () => {
    const [cp] = computeCaseProgress([one('anamnese', 90)]);
    expect(Object.keys(cp.teile).sort()).toEqual(['anamnese', 'dokumentation', 'fallvorstellung']);
    expect(cp.teile.dokumentation.status).toBe('vierge');
  });

  it('une Anamnese seule réussie à 90 % ne fait PAS régresser le cas (bug simScope.ts:42)', () => {
    const [cp] = computeCaseProgress([one('anamnese', 90)]);
    expect(cp.teile.anamnese.status).toBe('solide');
    expect(pointFaible(cp, 'anamnese')).toBe(false);
    expect(cp.overall).toBe('entame');
  });

  it('INV-3 : un point faible implique au moins une tentative mesurée', () => {
    const [faible] = computeCaseProgress([one('anamnese', 30)]);
    expect(pointFaible(faible, 'anamnese')).toBe(true);
    expect(faible.teile.anamnese.attempts).toBeGreaterThanOrEqual(1);
    // et l'absence n'est JAMAIS un point faible
    expect(pointFaible(faible, 'fallvorstellung')).toBe(false);
    expect(faible.teile.fallvorstellung.attempts).toBe(0);
  });

  it('INV-11 : un événement `selbstbewertet` laisse le CaseProgress inchangé', () => {
    const base = computeCaseProgress([one('anamnese', 90)]);
    const withSelf = computeCaseProgress([one('anamnese', 90), one('dokumentation', 20, { selbstbewertet: true, at: at + 1000 })]);
    expect(withSelf[0].teile).toEqual(base[0].teile);
    expect(withSelf[0].teile.dokumentation.attempts).toBe(0);
  });

  it('`overall` : vierge / entamé / solide', () => {
    const all = (s: number) => computeCaseProgress([one('anamnese', s), one('dokumentation', s, { at: at + 1 }), one('fallvorstellung', s, { at: at + 2 })])[0];
    expect(all(95).overall).toBe('solide');
    expect(all(50).overall).toBe('entame');
    expect(computeCaseProgress([]).length).toBe(0);
  });

  it('dette ≠ faiblesse : la dette compte les Teile vierges, la faiblesse jamais', () => {
    const [cp] = computeCaseProgress([one('anamnese', 95)]);
    expect(detteTeil(cp)).toBeCloseTo(2 / 3);
    expect(detteTeil(undefined)).toBe(1);                     // cas jamais rencontré
    const solide = computeCaseProgress([one('anamnese', 95), one('dokumentation', 95, { at: at + 1 }), one('fallvorstellung', 95, { at: at + 2 })])[0];
    expect(detteTeil(solide)).toBe(0);                        // dette nulle ⇒ le cas sort des candidats
  });
});

describe('INV-7 — deux appareils, un seul plan figé', () => {
  const tasks = (label: string): TaskInstance[] => [task({ id: `t-${label}`, label })];
  const payload = (label: string) => ({ tasks: tasks(label), mode: 'teil-first', seed: label, targetMin: 90 });

  it('INV-7 : le PLUS ANCIEN occurred_at gagne — « figé » veut dire que le premier fige', () => {
    const a = ev('plan.materialized', '2026-10-01', payload('A'), '2026-10-01T06:00:00Z', 'zzz');
    const b = ev('plan.materialized', '2026-10-01', payload('B'), '2026-10-01T07:30:00Z', 'aaa');
    for (const order of [[a, b], [b, a]]) {
      const [dp] = projectDayPlans(order, []);
      expect(dp.tasks[0].label).toBe('A');
      expect(projectDayPlans(order, [])).toHaveLength(1);
    }
  });

  it('INV-7 : c’est bien l’EXCEPTION au dernier-gagne — `plan.replanned` bat la matérialisation', () => {
    const m = ev('plan.materialized', '2026-10-01', payload('A'), '2026-10-01T06:00:00Z');
    const r = ev('plan.replanned', '2026-10-01', { tasks: tasks('R'), reason: 'manuel' }, '2026-10-01T09:00:00Z');
    const [dp] = projectDayPlans([m, r], []);
    expect(dp.tasks[0].label).toBe('R');
    expect(dp.replannedAt).toBe(Date.parse('2026-10-01T09:00:00Z'));
  });

  it('`doneAt` se DÉRIVE du journal, jamais de la charge utile du plan', () => {
    const m = ev('plan.materialized', '2026-10-01', payload('A'), '2026-10-01T06:00:00Z');
    const te: TrainingEvent = { id: 'e1', at: Date.parse('2026-10-01T10:00:00Z'), kind: 'simulation', caseId: 'c1', teile: ['anamnese'], source: 'plan', taskId: 't-A', spentMin: 22 };
    const [dp] = projectDayPlans([m], [te]);
    expect(dp.tasks[0].doneAt).toBe(te.at);
    expect(dp.tasks[0].spentMin).toBe(22);
    expect(dp.tasks[0].eventId).toBe('e1');
  });
});

describe('§3.4 — la machine s’adapte à l’humain', () => {
  const dp = plan({ date: '2026-10-01', tasks: [
    task({ id: 't1', caseId: 'c1', teil: 'anamnese', label: 'Leberzirrhose' }),
    task({ id: 't2', caseId: 'c2', label: 'TVT' }),
  ] });

  it('un exercice libre qui fait ce qui était prévu satisfait la tâche', () => {
    expect(satisfiedTask(dp, { kind: 'simulation', caseId: 'c1', teile: ['anamnese'] })?.id).toBe('t1');
  });

  it('une tâche sans `teil` (run complet) est satisfaite par n’importe quel Teil joué du cas', () => {
    expect(satisfiedTask(dp, { kind: 'simulation', caseId: 'c2', teile: ['fallvorstellung'] })?.id).toBe('t2');
  });

  it('un autre cas, ou un autre Teil que celui prévu, ne satisfait rien', () => {
    expect(satisfiedTask(dp, { kind: 'simulation', caseId: 'c9', teile: ['anamnese'] })).toBeUndefined();
    expect(satisfiedTask(dp, { kind: 'simulation', caseId: 'c1', teile: ['dokumentation'] })).toBeUndefined();
  });

  it('une tâche déjà faite n’est jamais satisfaite deux fois', () => {
    const done = plan({ date: '2026-10-01', tasks: [{ ...dp.tasks[0], doneAt: 1 }] });
    expect(satisfiedTask(done, { kind: 'simulation', caseId: 'c1', teile: ['anamnese'] })).toBeUndefined();
  });

  it('aucune tâche n’est CRÉÉE pour absorber un exercice libre', async () => {
    freezeAt('2026-10-01T10:00:00Z');
    await db.day_plans.put(plan({ date: '2026-10-01', tasks: [task({ id: 't1', caseId: 'c1' })] }));
    await logTraining({ kind: 'simulation', caseId: 'c9', teile: ['anamnese'], spentMin: 20 });
    const stored = await db.day_plans.get('2026-10-01');
    expect(stored!.tasks).toHaveLength(1);
    expect(stored!.tasks[0].doneAt).toBeUndefined();
  });

  it('un exercice libre coche la tâche prévue et bascule en `plan`', async () => {
    freezeAt('2026-10-01T10:00:00Z');
    await db.day_plans.put(plan({ date: '2026-10-01', tasks: [task({ id: 't1', caseId: 'c1', teil: 'anamnese' })] }));
    const e = await logTraining({ kind: 'simulation', caseId: 'c1', teile: ['anamnese'], spentMin: 20, scores: { anamnese: 82 } });
    expect(e.source).toBe('plan');
    expect(e.taskId).toBe('t1');
    const stored = await db.day_plans.get('2026-10-01');
    expect(stored!.tasks[0].doneAt).toBe(e.at);
    expect((await db.case_progress.get('c1'))!.teile.anamnese.status).toBe('solide');
  });
});

describe('INV-1 — cocher ne fait jamais apparaître de travail', () => {
  it('INV-1 : n coches successives ne font jamais croître le nombre de tâches restantes', async () => {
    freezeAt('2026-10-01T08:00:00Z');
    const tasks = ['fachwissen', 'examen-blanc', 'drill', 'simulation', 'revision'].map((kind, i) =>
      task({ id: `t${i}`, kind: kind as TaskInstance['kind'], caseId: `c${i}`, label: `sujet ${i}` }));
    await db.day_plans.put(plan({ date: '2026-10-01', tasks }));

    const restantes = async () => (await db.day_plans.get('2026-10-01'))!.tasks.filter((t) => !t.doneAt).length;
    let prev = await restantes();
    expect(prev).toBe(5);
    for (const t of tasks) {
      await markTaskDone(t, 10);                       // tous cochables : Fachwissen et examen blanc compris
      const n = await restantes();
      expect(n).toBeLessThanOrEqual(prev);
      prev = n;
    }
    expect(prev).toBe(0);
    expect((await db.day_plans.get('2026-10-01'))!.tasks).toHaveLength(5);   // rien n'a pris la place
  });

  it('INV-9 : le plan figé est bit-identique après que l’horloge a avancé dans la journée', async () => {
    const advance = freezeAt('2026-10-01T08:00:00Z');
    const dp = plan({ date: '2026-10-01', tasks: [task({ id: 't1', caseId: 'c1' })] });
    await db.day_plans.put(dp);
    const before = JSON.stringify(await db.day_plans.get('2026-10-01'));
    advance(6 * 3600_000);
    expect(JSON.stringify(await db.day_plans.get('2026-10-01'))).toBe(before);
    advance(DAY_MS);
    expect(JSON.stringify(await db.day_plans.get('2026-10-01'))).toBe(before);
  });
});

describe('§2.3 — une simulation terminée alimente le journal LOCAL, sans attendre un pull', () => {
  it('applySimulationToJournal : case_progress existe hors ligne, et un seul Teil mesuré ne touche que lui', async () => {
    freezeAt('2026-10-01T08:00:00Z');
    const s = sim({ id: 'sim-1', caseId: 'c1', date: Date.parse('2026-10-01T08:00:00Z'), parts: { anamnese: part(100) } });

    expect(await db.case_progress.get('c1')).toBeUndefined();      // l'état AVANT : rien
    const te = await applySimulationToJournal(s);

    expect(te.id).toBe('te-sim-1');                                 // id déterministe (INV-10)
    expect(await db.training_events.get('te-sim-1')).toBeTruthy();
    const cp = (await db.case_progress.get('c1'))!;
    expect(cp.teile.anamnese.status).toBe('solide');                // 100 % contenu, pas de grille → 80
    expect(cp.teile.dokumentation.status).toBe('vierge');           // jamais mesuré ⇒ jamais un défaut
    expect(cp.teile.fallvorstellung.status).toBe('vierge');
    expect(pointFaible(cp, 'dokumentation')).toBe(false);
    expect(cp.overall).toBe('entame');                              // vierge → entame : jamais une régression
  });

  it('INV-10 : appliquer puis reconstruire depuis progress_events donne le MÊME état', async () => {
    freezeAt('2026-10-01T08:00:00Z');
    const s = sim({ id: 'sim-1', caseId: 'c1', date: Date.parse('2026-10-01T08:00:00Z'), parts: { anamnese: part(100) } });
    await applySimulationToJournal(s);
    const after = JSON.stringify(await db.case_progress.toArray());

    await rebuildJournal([ev('simulation.completed', 'c1', s, '2026-10-01T08:00:00Z')]);
    expect(JSON.stringify(await db.case_progress.toArray())).toBe(after);
    expect(await db.training_events.count()).toBe(1);               // pas de doublon
  });
});
