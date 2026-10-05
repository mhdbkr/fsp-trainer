// Démarrage du journal — revue s3-programme B-C1 et D-I2.
// `bootJournal()` est EXACTEMENT ce que `main.tsx` appelle avant le premier
// rendu : ces tests passent par le chemin de l'app, pas par un raccourci.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const session = vi.hoisted(() => ({ token: null as string | null }));
vi.mock('@/lib/auth/session', () => ({
  AUTH_MODE: 'public',
  getAccessToken: async () => session.token,
  useSession: { getState: () => ({ user: session.token ? { id: 'u1' } : null }) },
}));
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { db } from '@/db/db';
import type { Case, PartResult, ProgramConfig, Simulation, Specialty } from '@/db/types';
import type { ProgressEvent } from './events';
import { freezeAt, resetClock } from '@/lib/clock';
import { bootJournal, msToNextDay, watchDayPlan } from './boot';
import { ensureDayPlan } from '@/lib/program/dayPlan';

const SPECS: Specialty[] = ['Kardiologie', 'Gastroenterologie', 'Pneumologie', 'Neurologie', 'Nephrologie', 'Endokrinologie'];
const corpus = (n = 24): Case[] => Array.from({ length: n }, (_, i) => ({
  id: `c${i}`, name: `Cas ${i}`, pathology: `p${i}`, specialty: SPECS[i % SPECS.length],
  frequency: 26 - (i % 20), centers: [], linkedFachbegriffeIds: [],
} as unknown as Case));
const config: ProgramConfig = {
  startDate: '2026-09-01', examDate: '2026-12-01', intensity: 'mittel', hoursPerSession: 2,
  offDays: [0, 6], prioritySpecialties: [], selfLevel: {}, createdAt: 0,
} as ProgramConfig;
const part = (score: number): PartResult => ({ done: true, durationSec: 600, contentPct: score, feeling: score, checklist: [] } as unknown as PartResult);
const ev = (type: ProgressEvent['type'], subject_id: string | null, payload: unknown, occurred_at: string, extra: Partial<ProgressEvent> = {}): ProgressEvent =>
  ({ id: crypto.randomUUID(), user_id: 'u1', type, subject_id, payload, occurred_at, ...extra });

/** L'état d'un appareil de Mehdi ou Lydia au premier démarrage de la v5 : un
 *  historique réel dans `progress_events`, trois projections neuves et vides. */
async function donneesDeMain() {
  await db.cases.bulkPut(corpus());
  await db.meta.put({ key: 'program', value: config });
  const solide = { id: 'sim-1', caseId: 'c0', date: Date.parse('2026-09-20T09:00:00Z'), parts: { anamnese: part(90), dokumentation: part(90), fallvorstellung: part(90) }, notes: {}, prioritizedCorrections: [], assistance: 'autonome', layer: 2, scope: 'full' } as unknown as Simulation;
  // S4-1 : « solide » demande deux réussites ≥ 80 espacées de 3 jours — c0 en a deux.
  const solide2 = { ...solide, id: 'sim-1b', date: Date.parse('2026-09-24T09:00:00Z') } as unknown as Simulation;
  const anamnese = { id: 'sim-2', caseId: 'c1', date: Date.parse('2026-09-21T09:00:00Z'), parts: { anamnese: part(90) }, notes: {}, prioritizedCorrections: [], assistance: 'assiste', layer: 1, scope: 'teil', teil: 'anamnese' } as unknown as Simulation;
  await db.progress_events.bulkPut([
    ev('program.configured', null, config, '2026-09-01T08:00:00Z', { received_at: '2026-09-01T08:00:01Z' }),
    ev('simulation.completed', 'c0', solide, '2026-09-20T09:40:00Z', { received_at: '2026-09-20T09:40:01Z' }),
    ev('simulation.completed', 'c0', solide2, '2026-09-24T09:40:00Z', { received_at: '2026-09-24T09:40:01Z' }),
    ev('simulation.completed', 'c1', anamnese, '2026-09-21T09:20:00Z', { received_at: '2026-09-21T09:20:01Z' }),
  ]);
}

beforeEach(async () => {
  session.token = null; fetchMock.mockReset();
  await Promise.all([db.training_events.clear(), db.day_plans.clear(), db.case_progress.clear(), db.progress_events.clear(), db.outbox.clear(), db.meta.clear(), db.cases.clear(), db.fachbegriffe.clear()]);
});
afterEach(() => resetClock());

describe('B-C1 — le journal se construit pour un utilisateur existant', () => {
  it('migration depuis les données de main : historique projeté AVANT que le jour ne se fige', async () => {
    freezeAt('2026-10-01T08:00:00Z');
    await donneesDeMain();
    const plan = await bootJournal();
    expect((await db.training_events.toArray()).map((t) => t.id).sort()).toEqual(['te-sim-1', 'te-sim-1b', 'te-sim-2']);
    expect((await db.case_progress.get('c0'))!.overall).toBe('solide');
    expect((await db.case_progress.get('c1'))!.teile.anamnese.status).toBe('acquis');
    // Le cas déjà solide ne revient pas au plan (detteTeil = 0 → hors candidats).
    expect(plan!.tasks.some((t) => t.caseId === 'c0')).toBe(false);
  });

  it('idempotent : deux démarrages donnent le même journal et le même plan', async () => {
    freezeAt('2026-10-01T08:00:00Z');
    await donneesDeMain();
    const a = JSON.stringify(await bootJournal());
    const te = JSON.stringify(await db.training_events.toArray());
    expect(JSON.stringify(await bootJournal())).toBe(a);
    expect(JSON.stringify(await db.training_events.toArray())).toBe(te);
  });
});

describe('D-I2 — un second appareil ne fige pas un autre plan que le premier', () => {
  const planB = { tasks: [{ id: 'tb-1', date: '2026-10-01', kind: 'simulation', caseId: 'c5', label: 'Cas 5', estMin: 20, source: 'plan', reason: 'r' }], mode: 'teil-first', seed: 'B', targetMin: 120 };

  it('pull borné AVANT ensureDayPlan : le plan déjà figé par l\'autre appareil est repris, rien n\'est re-matérialisé', async () => {
    freezeAt('2026-10-01T08:00:00Z');
    await donneesDeMain();
    session.token = 'tok';
    const remote = ev('plan.materialized', '2026-10-01', planB, '2026-10-01T06:00:00Z', { received_at: '2026-10-01T06:00:01Z' });
    fetchMock.mockImplementation(async (url: string) => ({ ok: true, status: 200, json: async () => ({ events: String(url).includes('since=') ? [remote] : [] }) }));
    const plan = await bootJournal();
    expect(plan!.tasks.map((t) => t.id)).toEqual(['tb-1']);
    expect((await db.progress_events.where('type').equals('plan.materialized').count())).toBe(1);
  });

  it('hors ligne ou serveur muet : le jour se matérialise quand même, dans le délai', async () => {
    freezeAt('2026-10-01T08:00:00Z');
    await donneesDeMain();
    session.token = 'tok';
    fetchMock.mockImplementation(() => new Promise(() => {}));      // ne répond jamais
    const t0 = performance.now();
    const plan = await bootJournal(50);
    expect(performance.now() - t0).toBeLessThan(1000);
    expect(plan!.tasks.length).toBeGreaterThan(0);
  });
});

describe('INV-76 (b) — le premier démarrage S4-2 ne laisse pas une config distante écraser la locale', () => {
  it('pull d\'une config distante PLUS ANCIENNE : la config locale est poussée d\'abord et reste la référence', async () => {
    freezeAt('2026-10-01T08:00:00Z');
    await db.cases.bulkPut(corpus());
    const locale: ProgramConfig = { ...config, hoursPerSession: 3 };
    await db.meta.put({ key: 'program', value: locale });                  // une install d'avant S4-2 : meta seule
    session.token = 'tok';
    const distante = ev('program.configured', null, { ...config, hoursPerSession: 1 }, '2026-09-15T08:00:00Z', { received_at: '2026-09-15T08:00:01Z' });
    fetchMock.mockImplementation(async (url: string) => ({ ok: true, status: 200, json: async () => ({ events: String(url).includes('since=') ? [distante] : [] }) }));
    await bootJournal();
    expect((await db.meta.get('program'))!.value).toEqual(locale);
    expect(await db.progress_events.where('type').equals('program.configured').count()).toBe(2);   // la distante + la locale poussée
    await bootJournal();                                                   // deuxième démarrage : pas de second push
    expect(await db.progress_events.where('type').equals('program.configured').count()).toBe(2);
  });
});

describe('10 000 événements — le démarrage reconstruit tout, sans rien perdre', () => {
  it('3 000 simulations + 2 000 training.logged + 5 000 révisions SRS', async () => {
    freezeAt('2026-10-01T08:00:00Z');
    await db.cases.bulkPut(corpus());
    await db.meta.put({ key: 'program', value: config });
    const t = Date.parse('2026-06-01T08:00:00Z');
    const evs: ProgressEvent[] = [];
    for (let i = 0; i < 3000; i++) {
      const sim = { id: `sim-${i}`, caseId: `c${i % 24}`, date: t + i * 60_000, parts: { anamnese: part(50 + (i % 50)) }, notes: {}, prioritizedCorrections: [], scope: 'teil', teil: 'anamnese' };
      evs.push(ev('simulation.completed', sim.caseId, sim, new Date(sim.date).toISOString()));
    }
    for (let i = 0; i < 2000; i++) evs.push(ev('training.logged', `tl-${i}`, { at: t + i * 60_000, kind: 'fiche', teile: [], source: 'libre', spentMin: 5 }, new Date(t + i * 60_000).toISOString()));
    for (let i = 0; i < 5000; i++) evs.push(ev('srs.reviewed', `fb-${i % 300}`, {}, new Date(t + i * 1000).toISOString()));
    await db.progress_events.bulkPut(evs);
    const t0 = performance.now();
    await bootJournal();
    const ms = performance.now() - t0;
    expect(await db.training_events.count()).toBe(5000);
    expect(await db.case_progress.count()).toBe(24);
    console.info(`[boot] 10 000 événements reconstruits en ${Math.round(ms)} ms (fake-indexeddb)`);
    expect(ms).toBeLessThan(15_000);
  }, 180_000);   // m-3 : le budget mesuré reste 15 s ; le délai couvre la charge CI
});

describe('I1 — le jour se matérialise aussi APRÈS le démarrage', () => {
  it('retour au premier plan le lendemain (app restée ouverte) : le nouveau jour est figé', async () => {
    const advance = freezeAt(new Date(2026, 9, 1, 23, 0));
    await donneesDeMain();
    await bootJournal(0);
    const stop = watchDayPlan();
    try {
      advance(2 * 3600_000);                                     // 1er oct. 23 h → 2 oct. 1 h
      document.dispatchEvent(new Event('visibilitychange'));
      await vi.waitFor(async () => expect(await db.day_plans.get('2026-10-02')).toBeDefined());
    } finally { stop(); }
  });
  it('minuit : le délai jusqu\'au jour suivant suit le calendrier local', () => {
    expect(msToNextDay(new Date(2026, 9, 1, 23, 0).getTime())).toBe(3600_000);
    expect(msToNextDay(new Date(2026, 9, 1, 0, 0).getTime())).toBe(new Date(2026, 9, 2).getTime() - new Date(2026, 9, 1).getTime());
  });
});

describe('M7 — une horloge qui recule ne matérialise jamais le passé', () => {
  it('après le 2 oct., revenir au 1er ne crée pas de plan du 1er', async () => {
    const advance = freezeAt(new Date(2026, 9, 2, 9, 0));
    await donneesDeMain();
    await bootJournal(0);
    advance(-24 * 3600_000);
    expect(await ensureDayPlan()).toBeNull();
    expect((await db.day_plans.toArray()).map((p) => p.date)).toEqual(['2026-10-02']);
  });
});
