import { describe, it, expect } from 'vitest';
import { workingDaysUntilExam, generateProgram } from './program';
import { freshSrs, reviewSrs } from '@/lib/srs';
import type { Fachbegriff, Case, ProgramConfig } from '@/db/types';

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
  it('libellé sur les vrais compteurs, estMin = ceil((k+n)×0,4)', () => {
    const due = reviewSrs(freshSrs(now.getTime() - 20 * 86400e3), 4, now.getTime() - 20 * 86400e3);
    const begriffe = [fb('a', due), fb('b', due), fb('c', freshSrs(now.getTime())), fb('d', freshSrs(now.getTime()))];
    const days = generateProgram(drillConfig, { cases: [] as Case[], sims: [], begriffe, drillBudget: 1 }, 7, now);
    const drill = days.flatMap((d) => d.blocks).find((b) => b.kind === 'drill')!;
    expect(drill.label).toBe('Drill · 2 dus + 1 nouveaux (≈ 2 min)');
    expect(drill.estMin).toBe(2);
  });
  it('absent quand rien à faire (0 dus, budget 0)', () => {
    const days = generateProgram(drillConfig, { cases: [] as Case[], sims: [], begriffe: [fb('c', freshSrs(now.getTime()))], drillBudget: 0 }, 7, now);
    expect(days.flatMap((d) => d.blocks).some((b) => b.kind === 'drill')).toBe(false);
  });
});
