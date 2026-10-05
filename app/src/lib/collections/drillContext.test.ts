import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/db';
import { loadDrillContext, todayProgramContext } from './drillContext';
import type { Case, DayPlan, Fachbegriff, ProgramConfig, TaskInstance } from '@/db/types';
import { freshSrs } from '@/lib/srs';
import { usePendingDeletions } from './pendingDeletion';

const now = new Date(2026, 8, 17, 12);   // jeudi, jour ouvré (heure locale)
const TODAY = '2026-09-17';
const config: ProgramConfig = {
  startDate: TODAY, examDate: '2026-10-30', intensity: 'mittel', hoursPerSession: 2, offDays: [0, 6],
  prioritySpecialties: [], selfLevel: {}, createdAt: 0, modus: 'cas-complet',
} as ProgramConfig;
const mkCase = (id: string, specialty: string, frequency: number): Case =>
  ({ id, name: `Cas ${id}`, pathology: id, specialty, centers: [], frequency, difficulty: 'mittel', status: 'Nouveau', confidence: 0,
    linkedFachbegriffeIds: [], probableAufklaerungIds: [], caseSpecificQuestions: [], examinerQuestions: [],
    patientSheet: {}, medicalView: {} } as unknown as Case);
const mkTerm = (id: string): Fachbegriff => ({ id, term: id, translationSimple: '', specialty: 'X' as never, pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs(now.getTime()) });

const task = (o: Partial<TaskInstance> & { id: string }): TaskInstance =>
  ({ date: TODAY, kind: 'simulation', label: 'Sujet', estMin: 40, source: 'plan', reason: 'parce que', ...o });
const plan = (tasks: TaskInstance[]): DayPlan =>
  ({ date: TODAY, materializedAt: now.getTime(), mode: 'cas-complet', seed: 's', targetMin: 120, tasks });

// Le contexte du jour lit le PLAN FIGÉ (ADR-0017), plus un second calcul du
// planificateur : `generateProgram` était le troisième appel concurrent.
describe('todayProgramContext (M1 — D3 depuis le plan figé)', () => {
  it('cas et spécialité des tâches de simulation du plan du jour', () => {
    const ctx = todayProgramContext(plan([
      task({ id: 't0', kind: 'drill', label: 'Fachbegriffe', estMin: 10 }),
      task({ id: 't1', caseId: 'case-a', specialty: 'Kardiologie' as never }),
      task({ id: 't2', caseId: 'case-b', specialty: 'Gastroenterologie' as never }),
      task({ id: 't3', caseId: 'case-a', specialty: 'Kardiologie' as never }),
    ]));
    expect(ctx.todayCaseIds).toEqual(['case-a', 'case-b']);   // dédoublonné, ordre du plan
    expect(ctx.todaySpecialty).toBe('Kardiologie');
  });

  it('sans plan figé → rien du jour : un jour non ouvert n’a pas de contexte', () => {
    expect(todayProgramContext(undefined)).toEqual({ todayCaseIds: [] });
    expect(todayProgramContext(null)).toEqual({ todayCaseIds: [] });
    expect(todayProgramContext(plan([]))).toEqual({ todayCaseIds: [] });
  });
});

describe('loadDrillContext (config injectée en base)', () => {
  beforeEach(async () => { await Promise.all([db.meta.clear(), db.cases.clear(), db.fachbegriffe.clear(), db.day_plans.clear(), db.simulations.clear(), db.progress_events.clear()]); });

  it('todayCaseIds vient du plan figé ; budget et reste cohérents', async () => {
    await db.cases.bulkPut([mkCase('case-a', 'Kardiologie', 30)]);
    await db.fachbegriffe.bulkPut([mkTerm('t1'), mkTerm('t2')]);
    await db.meta.put({ key: 'program', value: config });
    await db.day_plans.put(plan([task({ id: 't1', caseId: 'case-a', specialty: 'Kardiologie' as never })]));
    const ctx = await loadDrillContext(now);
    expect(ctx.relevance.todayCaseIds).toEqual(['case-a']);
    expect(ctx.relevance.todaySpecialty).toBe('Kardiologie');
    expect(ctx.relevance.cases[0]).toMatchObject({ id: 'case-a', name: 'Cas case-a' });
    expect(ctx.budget).toBeGreaterThanOrEqual(5);
    expect(ctx.remaining).toBe(ctx.budget);
  });

  it('sans config → todayCaseIds vide, budget 10', async () => {
    await db.fachbegriffe.bulkPut([mkTerm('t1')]);
    const ctx = await loadDrillContext(now);
    expect(ctx.relevance.todayCaseIds).toEqual([]);
    expect(ctx.relevance.todaySpecialty).toBeUndefined();
    expect(ctx.budget).toBe(10);
  });

  it('autoDaily = calcul auto même en mode manuel enregistré ; daily suit le mode', async () => {
    await db.fachbegriffe.bulkPut([mkTerm('t1')]);
    await db.meta.put({ key: 'srs.settings', value: { mode: 'manual', newPerDay: 3, maxReviewsPerDay: 7 } } as never);
    const ctx = await loadDrillContext(now);
    expect(ctx.daily).toMatchObject({ source: 'manual', newPerDay: 3, maxReviewsPerDay: 7 });
    expect(ctx.autoDaily.source).toBe('auto');
    expect(ctx.autoDaily.newPerDay).toBe(10);
    expect(ctx.autoDaily.explain).toMatch(/^auto : 10\/jour = 10 × moyen$/);
  });

  it('freshRemaining inclut les termes personnels neufs (pas seulement le glossaire)', async () => {
    await db.personal_terms.clear();
    const closeExam: ProgramConfig = { ...config, examDate: '2026-09-18' };
    await db.fachbegriffe.bulkPut([mkTerm('t1')]);
    await db.meta.put({ key: 'program', value: closeExam });
    await db.personal_terms.put({ id: 'pt-aaaa1111', term: 'X', createdAt: now.toISOString(), srs: freshSrs(now.getTime()) } as never);
    const ctx = await loadDrillContext(now);
    expect(ctx.budget).toBe(2);
    await db.personal_terms.clear();
  });

  it('carte personnelle en attente de suppression : absente du contexte de drill', async () => {
    await db.personal_terms.clear();
    const closeExam: ProgramConfig = { ...config, examDate: '2026-09-18' };
    await db.fachbegriffe.bulkPut([mkTerm('t1')]);
    await db.meta.put({ key: 'program', value: closeExam });
    await db.personal_terms.put({ id: 'pt-pending01', term: 'X', createdAt: now.toISOString(), srs: freshSrs(now.getTime()) } as never);
    usePendingDeletions.setState({ ids: new Set(['pt-pending01']) });
    try {
      const ctx = await loadDrillContext(now);
      expect(ctx.budget).toBe(1);
    } finally {
      usePendingDeletions.setState({ ids: new Set() });
      await db.personal_terms.clear();
    }
  });
});

// Revue I3 : la dernière séance de drill TERMINÉE (journal), jamais une coche nue.
import { lastDrillAt } from './drillContext';
import type { TrainingEvent } from '@/db/types';
describe('lastDrillAt', () => {
  const te = (over: Partial<TrainingEvent>): TrainingEvent => ({ id: Math.random().toString(36), at: 0, kind: 'drill', teile: [], source: 'libre', spentMin: 3, ...over });
  it('dernier drill réel ≤ now ; ignore coches nues, autres types, futur', () => {
    const events = [te({ at: 100 }), te({ at: 300 }), te({ at: 400, taskId: 't', spentMin: 0 }), te({ at: 500, kind: 'simulation' }), te({ at: 900 })];
    expect(lastDrillAt(events, 600)).toBe(300);
    expect(lastDrillAt([], 600)).toBeUndefined();
  });
});
describe('loadDrillContext.relevance.lastDrillAt (I3)', () => {
  beforeEach(async () => { await db.training_events.clear(); });
  it('lit la dernière séance de drill du journal', async () => {
    const at = new Date(2026, 9, 1, 20).getTime();
    await db.training_events.put({ id: 'te1', at, kind: 'drill', teile: [], source: 'libre', spentMin: 4 });
    expect((await loadDrillContext(new Date(2026, 9, 5, 9))).relevance.lastDrillAt).toBe(at);
  });
});
