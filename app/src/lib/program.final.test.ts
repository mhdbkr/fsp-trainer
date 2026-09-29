import { describe, expect, it } from 'vitest';
import { generateProgram } from './program';
import { freshSrs } from '@/lib/srs';
import type { Case, Fachbegriff, ProgramConfig, Simulation } from '@/db/types';

// Fin de parcours avec un plan SATURÉ (réglages par défaut de ProgramSetup :
// mittel, 2 h, dimanche libre, teil-first) : examen à blanc, jour J, dernière
// ligne droite, budget quotidien.
const NOW = new Date('2026-09-28T08:00:00');   // lundi
const EXAM = '2026-11-09';                      // lundi, 36 jours ouvrés avant
const BUDGET = 120;
const config: ProgramConfig = {
  startDate: '2026-09-28', examDate: EXAM, intensity: 'mittel', hoursPerSession: 2, offDays: [0],
  prioritySpecialties: [], selfLevel: {}, createdAt: 0, strategy: 'teil-first',
} as ProgramConfig;

const mkCase = (i: number, extra: Partial<Case> = {}): Case => ({
  id: `c${String(i).padStart(2, '0')}`, name: `Cas ${i}`, pathology: 'p', specialty: 'Kardiologie', centers: [], frequency: 5 + (i % 7),
  difficulty: 'mittel', linkedFachwissenId: `fw-${i}`, linkedFachbegriffeIds: [], probableAufklaerungIds: [], caseSpecificQuestions: [],
  examinerQuestions: [], status: 'À faire', patientSheet: { personalia: { name: `P${i}`, age: 40 } }, medicalView: {}, ...extra,
} as unknown as Case);
const cases = Array.from({ length: 40 }, (_, i) => mkCase(i));
const begriffe: Fachbegriff[] = Array.from({ length: 30 }, (_, i) => ({
  id: `t${i}`, term: `t${i}`, translationSimple: '', specialty: 'X' as never, pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs(NOW.getTime()),
}));
const plan = (cs = cases, sims: Simulation[] = []) =>
  generateProgram(config, { cases: cs, sims, begriffe, drillBudget: 30, drillBudgetFull: 30 }, 400, NOW);

const workDays = (days: ReturnType<typeof plan>) => days.filter((d) => !d.isOff && d.date < EXAM);
// Dernière ligne droite : 15 % de 36 jours ouvrés → 5 jours.
const finalStretch = (days: ReturnType<typeof plan>) => workDays(days).slice(-5);

describe('programme — fin de parcours', () => {
  it('l’examen à blanc occupe les deux derniers jours ouvrés, même quand le plan est saturé', () => {
    const days = workDays(plan());
    for (const d of days.slice(-2)) expect(d.blocks.filter((b) => b.id?.startsWith('mock:'))).toHaveLength(1);
    expect(days.slice(0, -2).flatMap((d) => d.blocks).some((b) => b.id?.startsWith('mock:'))).toBe(false);
  });

  it('le jour de l’examen ne porte aucune séance', () => {
    const examDay = plan().find((d) => d.date === EXAM)!;
    expect(examDay.blocks).toEqual([]);
  });

  it('la dernière ligne droite n’introduit plus de cas nouveau et s’affiche comme telle', () => {
    const stretch = finalStretch(plan());
    expect(stretch[0].date).toBe('2026-11-03');
    const auto = stretch.flatMap((d) => d.blocks);
    expect(auto.some((b) => b.phase === 'discovery' || b.layer === 1)).toBe(false);
    expect(auto.every((b) => b.phase === 'taper')).toBe(true);
  });

  it('la dernière ligne droite reprend seule chaque partie faible (< 60 %), pas les parties acquises', () => {
    const weak = mkCase(7, { layerProgress: 3 });
    const part = (pct: number) => ({ done: true, durationSec: 60, checklist: [], feeling: pct, contentPct: pct, officialPct: pct, languageGrid: {} as never });
    const sim: Simulation = {
      id: 's', caseId: weak.id, date: Date.parse('2026-09-20'), scope: 'full',
      parts: { anamnese: part(40), dokumentation: part(80), fallvorstellung: part(90) }, notes: {}, prioritizedCorrections: [],
    };
    const days = plan(cases.map((c) => (c.id === weak.id ? weak : c)), [sim]);
    const blocks = finalStretch(days).flatMap((d) => d.blocks).filter((b) => b.caseId === weak.id && b.kind !== 'drill');
    expect(blocks.map((b) => [b.kind, b.teil])).toEqual([['simulation', 'anamnese']]);
    expect(workDays(days).slice(0, -5).flatMap((d) => d.blocks).some((b) => b.caseId === weak.id && b.kind !== 'drill')).toBe(false);
  });

  it('aucun jour ne dépasse le budget, drill Fachbegriffe compris', () => {
    for (const d of workDays(plan())) {
      expect(d.blocks.some((b) => b.kind === 'drill'), d.date).toBe(true);
      expect(d.blocks.reduce((s, b) => s + b.estMin, 0), d.date).toBeLessThanOrEqual(BUDGET);
    }
  });
});
