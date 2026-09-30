// Plan du jour — correctifs de la revue s3-programme (S-M2, I3, I4, I5, M3, M7).
// Passe par ensureDayPlan / replanifier / buildTasks : les fonctions de l'app.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/auth/session', () => ({
  AUTH_MODE: 'public',
  getAccessToken: async () => null,
  useSession: { getState: () => ({ user: null }) },
}));

import { db } from '@/db/db';
import type { Case, CaseProgress, ProgramConfig, Specialty, TaskInstance } from '@/db/types';
import { markTaskDone } from '@/lib/journal';
import { freezeAt, resetClock } from '@/lib/clock';
import { buildTasks, dayTargetMin, ensureDayPlan, replanifier, type BuildInput } from './dayPlan';

const SPECS: Specialty[] = ['Kardiologie', 'Gastroenterologie', 'Pneumologie', 'Neurologie', 'Nephrologie', 'Endokrinologie'];
const corpus = (n = 24): Case[] => Array.from({ length: n }, (_, i) => ({
  id: `c${i}`, name: `Cas ${i}`, pathology: `p${i}`, specialty: SPECS[i % SPECS.length],
  frequency: 26 - (i % 20), centers: [], linkedFachbegriffeIds: [], linkedFachwissenId: `fw${i}`,
} as unknown as Case));
const config = (over: Partial<ProgramConfig> = {}): ProgramConfig => ({
  startDate: '2026-09-01', examDate: '2026-12-01', intensity: 'mittel', hoursPerSession: 2,
  offDays: [0, 6], prioritySpecialties: [], selfLevel: {}, createdAt: 0, ...over,
});
const input = (over: Partial<BuildInput> = {}): BuildInput => ({
  config: config(), date: '2026-10-01', cases: corpus(), progress: new Map(),
  trainingEvents: [], begriffe: [], now: Date.parse('2026-10-01T08:00:00Z'), ...over,
});
let n = 0;
const ids = () => { n = 0; return () => `t${n++}`; };
const used = (tasks: TaskInstance[]) => tasks.reduce((s, t) => s + t.estMin, 0);

beforeEach(async () => {
  await Promise.all([db.day_plans.clear(), db.training_events.clear(), db.case_progress.clear(), db.meta.clear(), db.cases.clear(), db.fachbegriffe.clear(), db.progress_events.clear(), db.outbox.clear()]);
});
afterEach(() => resetClock());

async function seed(cfg = config()) {
  await db.cases.bulkPut(corpus());
  await db.meta.put({ key: 'program', value: cfg });
}

describe('S-M2 — plan.replanned porte l\'état des tâches faites', () => {
  it('le payload de plan.replanned garde doneAt / spentMin / eventId des tâches conservées', async () => {
    freezeAt('2026-10-01T08:00:00Z');
    await seed();
    const plan = (await ensureDayPlan())!;
    const t = plan.tasks.find((x) => x.kind === 'simulation')!;
    const te = await markTaskDone(t, 15);
    await replanifier('2026-10-01');
    const [rep] = await db.progress_events.where('type').equals('plan.replanned').toArray();
    const kept = (rep.payload as { tasks: TaskInstance[] }).tasks.find((x) => x.id === t.id)!;
    expect([kept.doneAt, kept.spentMin, kept.eventId]).toEqual([te.at, 15, te.id]);
  });
});

describe('I3 — replanifier ne dépasse jamais le budget du jour', () => {
  it('tâches faites comprises : Σ estMin ≤ targetMin après replan (sonde P-B)', async () => {
    freezeAt('2026-10-01T08:00:00Z');
    await seed();
    const plan = (await ensureDayPlan())!;
    for (const t of plan.tasks.filter((x) => x.kind === 'simulation').slice(0, 2)) await markTaskDone(t, 20);
    const rep = (await replanifier('2026-10-01'))!;
    expect(used(rep.tasks)).toBeLessThanOrEqual(plan.targetMin);
  });
});

/** INV-4 et C2 sur la liste restreinte aux tâches qui portent une spécialité. */
function diversityViolations(tasks: TaskInstance[]): string[] {
  const sp = tasks.filter((t) => t.specialty);
  const out: string[] = [];
  for (let i = 1; i < sp.length; i++) {
    if (sp[i].specialty === sp[i - 1].specialty && !sp[i].diversityRelaxed) out.push(`C1 ${sp[i - 1].id}→${sp[i].id} ${sp[i].specialty}`);
  }
  for (let i = 0; i + 5 <= sp.length; i++) {
    const w = sp.slice(i, i + 5);
    for (const s of new Set(w.map((t) => t.specialty))) {
      if (w.filter((t) => t.specialty === s).length > 2 && !w.some((t) => t.specialty === s && t.diversityRelaxed)) out.push(`C2 @${i} ${s}`);
    }
  }
  return out;
}

describe('I4 — INV-4 tient aussi pour l\'examen à blanc et la tâche Fachwissen', () => {
  // Deux cas de même spécialité en tête de classement : sans amorçage, le
  // premier cas simulé suit l'examen à blanc de la même spécialité.
  const paired = (): Case[] => corpus().map((c, i) => ({ ...c, specialty: SPECS[Math.floor(i / 2) % SPECS.length] }));
  it('INV-4 : 14 jours (dernière ligne droite comprise), plusieurs budgets, deux corpus', () => {
    const bad: string[] = [];
    for (const cases of [corpus(), paired()]) {
      for (const hoursPerSession of [1, 1.5, 2, 2.25, 3]) {
        for (let d = 0; d < 14; d++) {
          const date = `2026-11-${String(16 + d).padStart(2, '0')}`;
          const tasks = buildTasks(input({ cases, date, config: config({ hoursPerSession, examDate: '2026-12-01', offDays: [] }) }), ids());
          for (const v of diversityViolations(tasks)) bad.push(`${date} ${hoursPerSession}h ${v}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('D-I5 — le mode choisi prime', () => {
  it('cas-complet : un Teil fragile ne force jamais un `teil`', () => {
    const cp: CaseProgress = { caseId: 'c0', overall: 'entame', teile: {
      anamnese: { status: 'fragile', lastScore: 40, lastAt: 1, attempts: 1 },
      dokumentation: { status: 'vierge', lastScore: null, lastAt: null, attempts: 0 },
      fallvorstellung: { status: 'vierge', lastScore: null, lastAt: null, attempts: 0 } } };
    const tasks = buildTasks(input({ config: config({ modus: 'cas-complet' }), progress: new Map([['c0', cp]]) }), ids());
    const sims = tasks.filter((t) => t.kind === 'simulation');
    expect(sims.some((t) => t.caseId === 'c0')).toBe(true);
    expect(sims.every((t) => t.teil === undefined)).toBe(true);
  });
});

describe('M3 — l\'examen à blanc respecte le budget', () => {
  it('un jour de 45 min ne reçoit pas un examen à blanc de 60 min', () => {
    const cfg = config({ modus: 'examen-blanc', hoursPerSession: 0.75 });
    expect(dayTargetMin(cfg)).toBeLessThan(60);
    const tasks = buildTasks(input({ config: cfg }), ids());
    expect(used(tasks)).toBeLessThanOrEqual(dayTargetMin(cfg));
  });
});

describe('fraîcheur — seul un Teil JOUÉ compte comme dernier jeu (§5.1)', () => {
  it('lire la fiche d\'un cas hier ne le repousse pas dans la sélection', () => {
    const lu = { id: 'x', at: Date.parse('2026-09-30T10:00:00Z'), kind: 'fiche' as const, caseId: 'c0', teile: [], source: 'libre' as const, spentMin: 10 };
    const sans = buildTasks(input(), ids()).map((t) => t.caseId);
    const avec = buildTasks(input({ trainingEvents: [lu] }), ids()).map((t) => t.caseId);
    expect(avec).toEqual(sans);
  });
});
