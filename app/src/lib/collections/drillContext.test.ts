import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/db';
import { loadDrillContext, todayProgramContext } from './drillContext';
import { generateProgram } from '@/lib/program';
import type { Case, Fachbegriff, ProgramConfig } from '@/db/types';
import { freshSrs } from '@/lib/srs';

const now = new Date(2026, 8, 17, 12);   // jeudi, jour ouvré (heure locale)
const config: ProgramConfig = {
  startDate: '2026-09-17', examDate: '2026-10-30', intensity: 'mittel', hoursPerSession: 2, offDays: [0, 6],
  prioritySpecialties: [], selfLevel: {}, createdAt: 0, strategy: 'full',
} as ProgramConfig;
const mkCase = (id: string, specialty: string, frequency: number): Case =>
  ({ id, name: `Cas ${id}`, pathology: id, specialty, centers: [], frequency, difficulty: 'mittel', status: 'Nouveau', confidence: 0,
    linkedFachbegriffeIds: [], probableAufklaerungIds: [], caseSpecificQuestions: [], examinerQuestions: [],
    patientSheet: {}, medicalView: {} } as unknown as Case);
const mkTerm = (id: string): Fachbegriff => ({ id, term: id, translationSimple: '', specialty: 'X' as never, pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs(now.getTime()) });

describe('todayProgramContext (M1 — D3 depuis le VRAI programme, pas db.plan)', () => {
  const cases = [mkCase('case-a', 'Kardiologie', 30), mkCase('case-b', 'Gastroenterologie', 5)];
  it('cas et spécialité des blocs simulation du jour 0 de generateProgram', () => {
    const day0 = generateProgram(config, { cases, sims: [], begriffe: [] }, 1, now)[0];
    const expected = day0.blocks.filter((b) => b.kind === 'simulation').map((b) => b.caseId);
    expect(expected.length).toBeGreaterThan(0);
    const ctx = todayProgramContext(config, { cases, sims: [], begriffe: [] }, now);
    expect(ctx.todayCaseIds).toEqual([...new Set(expected)]);
    expect(ctx.todayCaseIds[0]).toBe('case-a');            // le plus fréquent est introduit en premier
    expect(ctx.todaySpecialty).toBe('Kardiologie');
  });
  it('sans config → rien du jour', () => {
    expect(todayProgramContext(undefined, { cases, sims: [], begriffe: [] }, now)).toEqual({ todayCaseIds: [] });
    expect(todayProgramContext(null, { cases, sims: [], begriffe: [] }, now)).toEqual({ todayCaseIds: [] });
  });
});

describe('loadDrillContext (config injectée en base)', () => {
  beforeEach(async () => { await Promise.all([db.meta.clear(), db.cases.clear(), db.fachbegriffe.clear(), db.plan.clear(), db.simulations.clear(), db.progress_events.clear()]); });
  it('todayCaseIds vient du programme (db.plan vide), budget et reste cohérents', async () => {
    await db.cases.bulkPut([mkCase('case-a', 'Kardiologie', 30)]);
    await db.fachbegriffe.bulkPut([mkTerm('t1'), mkTerm('t2')]);
    await db.meta.put({ key: 'program', value: config });
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
});
