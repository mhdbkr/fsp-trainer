import { describe, it, expect } from 'vitest';
import { workingDaysUntilExam, generateProgram } from './program';
import { freshSrs, reviewSrs } from '@/lib/srs';
import type { Fachbegriff, Case, ProgramConfig } from '@/db/types';

const mkCase = (id: string): Case => ({
  id, name: id, pathology: 'p', specialty: 'Kardiologie', centers: [], frequency: 5, difficulty: 'mittel',
  linkedFachbegriffeIds: [], probableAufklaerungIds: [], caseSpecificQuestions: [], examinerQuestions: [], status: 'À faire',
  patientSheet: { personalia: { name: id, age: 40 } }, medicalView: {},
} as unknown as Case);

const config: ProgramConfig = { startDate: '2026-09-01', intensity: 'mittel', hoursPerSession: 2, offDays: [0, 6], prioritySpecialties: [], selfLevel: {}, createdAt: 0, strategy: 'teil-first' } as ProgramConfig;

describe('workingDaysUntilExam', () => {
  it('jeudi 17/09/2026 → examen 30/09/2026, jours ouvrés (semaine) uniquement = 9', () => {
    const now = new Date(2026, 8, 17);
    expect(workingDaysUntilExam('2026-09-30', now, config)).toBe(9);
  });
  it('examen = demain (jour ouvré) → 1', () => {
    const now = new Date(2026, 8, 17); // jeudi
    expect(workingDaysUntilExam('2026-09-18', now, config)).toBe(1);
  });
  it('examen = aujourd\'hui → 0 (déjà passé)', () => {
    const now = new Date(2026, 8, 17);
    expect(workingDaysUntilExam('2026-09-17', now, config)).toBe(0);
  });
  it('sans config → défaut (weekend off)', () => {
    const now = new Date(2026, 8, 17);
    expect(workingDaysUntilExam('2026-09-30', now)).toBe(9);
  });
});

const now = new Date(Date.UTC(2026, 8, 17, 12));   // jeudi
const fb = (id: string, srs: Fachbegriff['srs']): Fachbegriff => ({ id, term: id, translationSimple: '', specialty: 'X' as never, pathologyTags: [], centers: [], linkedCaseIds: [], srs });
const drillConfig: ProgramConfig = {
  startDate: '2026-09-17', examDate: '2026-10-30', intensity: 'mittel', hoursPerSession: 2, offDays: [0, 6],
  prioritySpecialties: [], selfLevel: {}, createdAt: 0, strategy: 'teil-first',
} as ProgramConfig;

describe('bloc drill (F2a 3.7)', () => {
  const due = reviewSrs(freshSrs(now.getTime() - 20 * 86400e3), 4, now.getTime() - 20 * 86400e3);
  const drillOf = (days: ReturnType<typeof generateProgram>, i: number) => days[i].blocks.find((b) => b.kind === 'drill');

  it('jour J : libellé sur le RESTE du budget ; jours suivants : budget plein ; estMin = ceil((k+n)×0,4)', () => {
    const begriffe = [fb('a', due), fb('b', due), fb('c', freshSrs(now.getTime())), fb('d', freshSrs(now.getTime()))];
    const days = generateProgram(drillConfig, { cases: [] as Case[], sims: [], begriffe, drillBudget: 1, drillBudgetFull: 3 }, 7, now);
    expect(days[0].date).toBe('2026-09-17');
    expect(drillOf(days, 0)!.label).toBe('Drill · 2 dus + 1 nouveaux (≈ 2 min)');
    expect(drillOf(days, 0)!.estMin).toBe(2);
    expect(drillOf(days, 1)!.label).toBe('Drill · 2 dus + 2 nouveaux (≈ 2 min)');   // vendredi : min(2 Neu, budget plein 3)
  });
  it('sans drillBudgetFull, les jours suivants reprennent drillBudget (rétro-compatibilité)', () => {
    const begriffe = [fb('c', freshSrs(now.getTime())), fb('d', freshSrs(now.getTime()))];
    const days = generateProgram(drillConfig, { cases: [] as Case[], sims: [], begriffe, drillBudget: 1 }, 7, now);
    expect(drillOf(days, 1)!.label).toBe('Drill · 0 dus + 1 nouveaux (≈ 1 min)');
  });
  it('absent SEULEMENT le jour où k + n = 0 (budget du jour épuisé), présent les jours suivants', () => {
    const begriffe = [fb('c', freshSrs(now.getTime()))];
    const days = generateProgram(drillConfig, { cases: [] as Case[], sims: [], begriffe, drillBudget: 0, drillBudgetFull: 5 }, 7, now);
    expect(drillOf(days, 0)).toBeUndefined();
    expect(drillOf(days, 1)!.label).toBe('Drill · 0 dus + 1 nouveaux (≈ 1 min)');
  });
  it('absent partout quand il n\'y a vraiment rien (0 dus, 0 Neu)', () => {
    const days = generateProgram(drillConfig, { cases: [] as Case[], sims: [], begriffe: [], drillBudget: 5, drillBudgetFull: 5 }, 7, now);
    expect(days.flatMap((d) => d.blocks).some((b) => b.kind === 'drill')).toBe(false);
  });
  it('le bloc drill du jour porte caseId du bloc simulation du même jour', () => {
    const begriffe = [fb('c', freshSrs(now.getTime()))];
    const c1 = mkCase('c1');
    const days = generateProgram(
      { ...drillConfig, strategy: 'full' },
      { cases: [c1], sims: [], begriffe, drillBudget: 1, drillBudgetFull: 3 },
      7, now,
    );
    expect(days[0].blocks.find((b) => b.kind === 'simulation')?.caseId).toBe('c1');
    expect(drillOf(days, 0)!.caseId).toBe('c1');
  });
});
