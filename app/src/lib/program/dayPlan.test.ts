// Invariants du plan du jour figé — contrat §3 et §7 · INV-1, INV-2, INV-8,
// INV-9, INV-12. Horloge injectable : ces tests jouent « le jour 2 ».
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Sans `.env`, sans réseau (contrat §10).
vi.mock('@/lib/auth/session', () => ({
  AUTH_MODE: 'public',
  getAccessToken: async () => null,
  useSession: { getState: () => ({ user: null }) },
}));

import { db } from '@/db/db';
import type { Case, ProgramConfig, Specialty, TrainingEvent } from '@/db/types';
import { computeCaseProgress, markTaskDone } from '@/lib/journal';
import { DAY_MS, freezeAt, resetClock } from '@/lib/clock';
import {
  buildTasks, ensureDayPlan, modusOf, planProgress, replanifier, sessionDuJour,
  taperDays, teilLePlusEnDette, type BuildInput,
} from './dayPlan';

const SPECS: Specialty[] = ['Kardiologie', 'Gastroenterologie', 'Pneumologie', 'Neurologie', 'Nephrologie', 'Endokrinologie'];

const corpus = (n = 24): Case[] => Array.from({ length: n }, (_, i) => ({
  id: `c${i}`, name: `Cas ${i}`, pathology: `p${i}`, specialty: SPECS[i % SPECS.length],
  frequency: 26 - (i % 20), centers: [], linkedFachbegriffeIds: [],
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

beforeEach(async () => {
  await Promise.all([db.day_plans.clear(), db.training_events.clear(), db.case_progress.clear(), db.meta.clear(), db.cases.clear(), db.fachbegriffe.clear(), db.progress_events.clear(), db.outbox.clear()]);
});
afterEach(() => resetClock());

describe('buildTasks — fonction PURE, et tout ce qu’elle produit est cochable', () => {
  it('mêmes entrées, mêmes sorties (identifiants compris si mkId est déterministe)', () => {
    expect(buildTasks(input(), ids())).toEqual(buildTasks(input(), ids()));
  });

  it('ne lit ni la base ni l’horloge : `now` est passé, jamais pris', () => {
    const a = buildTasks({ ...input(), now: Date.parse('2026-10-01T08:00:00Z') }, ids());
    const b = buildTasks({ ...input(), now: Date.parse('2026-10-01T23:59:00Z') }, ids());
    expect(b).toEqual(a);                              // l'heure DANS la journée ne change rien
  });

  it('chaque tâche porte son « pourquoi aujourd’hui », figé avec elle', () => {
    for (const t of buildTasks(input(), ids())) {
      expect(t.reason.length).toBeGreaterThan(10);
      expect(t.reason.length).toBeLessThanOrEqual(90);
    }
  });

  it('l’étiquette est le SEUL nom du sujet : elle ne concatène ni type ni Teil', () => {
    for (const t of buildTasks(input(), ids())) {
      expect(t.label).not.toMatch(/ — |Couche |seule|Fachwissen :/);
    }
  });

  it('un jour off ne produit aucune tâche ; le jour de l’examen non plus', () => {
    expect(buildTasks(input({ date: '2026-10-04' }), ids())).toEqual([]);   // dimanche
    expect(buildTasks(input({ date: '2026-12-01' }), ids())).toEqual([]);   // jour de l'examen
  });

  it('le budget du jour est respecté', () => {
    const tasks = buildTasks(input(), ids());
    const target = Math.round(2 * 60 * 1.0);
    expect(tasks.filter((t) => t.kind !== 'examen-blanc').reduce((s, t) => s + t.estMin, 0)).toBeLessThanOrEqual(target);
  });

  it('mode `cas-complet` : pas de Teil, la tâche est un run complet', () => {
    const tasks = buildTasks(input({ config: config({ modus: 'cas-complet' }) }), ids());
    expect(tasks.filter((t) => t.kind === 'simulation').every((t) => t.teil === undefined)).toBe(true);
  });

  it('mode `specialite` : toutes les simulations du jour dans la même spécialité', () => {
    const tasks = buildTasks(input({ config: config({ modus: 'specialite' }) }), ids())
      .filter((t) => t.kind === 'simulation');
    expect(new Set(tasks.map((t) => t.specialty)).size).toBeLessThanOrEqual(1);
  });

  it('mode `examen-blanc` : un run complet, couche 3, autonome', () => {
    const [drill, mock] = buildTasks(input({ config: config({ modus: 'examen-blanc' }), begriffe: [] }), ids());
    const task = mock ?? drill;
    expect(task.kind).toBe('examen-blanc');
    expect(task.layer).toBe(3);
    expect(task.assistance).toBe('autonome');
  });

  it('lecture tolérante de l’ancien `strategy`', () => {
    expect(modusOf(config({ strategy: 'full' }))).toBe('cas-complet');
    expect(modusOf(config({ strategy: 'teil-first' }))).toBe('teil-first');
    expect(modusOf(config({ strategy: 'full', modus: 'specialite' }))).toBe('specialite');
  });

  it('le drill a sa propre tâche : faire ses cartes n’attire plus de simulations', () => {
    const begriffe = Array.from({ length: 20 }, (_, i) => ({
      id: `b${i}`, term: `t${i}`, srs: { state: 'Neu', dueDate: 0, ease: 2.5, interval: 0, reps: 0 },
    })) as never[];
    const avec = buildTasks(input({ begriffe }), ids());
    const drill = avec.find((t) => t.kind === 'drill')!;
    expect(drill.reason).toMatch(/nouveaux|dû/);
  });

  it('un Teil FRAGILE passe devant le Teil du jour', () => {
    const cases = corpus(6);
    const events: TrainingEvent[] = [{
      id: 'e1', at: Date.parse('2026-09-20T10:00:00Z'), kind: 'simulation', caseId: 'c0',
      teile: ['fallvorstellung'], source: 'libre', spentMin: 12, scores: { fallvorstellung: 35 },
    }];
    const progress = new Map(computeCaseProgress(events).map((p) => [p.caseId, p]));
    const tasks = buildTasks(input({ cases, progress, trainingEvents: events }), ids());
    const t = tasks.find((x) => x.caseId === 'c0');
    expect(t?.teil).toBe('fallvorstellung');
    expect(t?.reason).toContain('35 %');
  });

  it('`teilLePlusEnDette` sur un corpus vierge : le premier Teil de l’examen', () => {
    expect(teilLePlusEnDette(new Map(), corpus(6))).toBe('anamnese');
  });
});

describe('INV-12 — la phase d’un jour figé ne change plus', () => {
  it('INV-12 : la fenêtre de taper se calcule sur la DATE D’EXAMEN, pas sur les jours restants', () => {
    const cfg = config();
    const j1 = taperDays(cfg);
    // L'horloge avance d'un jour, d'une semaine, d'un mois : la fenêtre est la même.
    const j2 = taperDays({ ...cfg });
    expect([...j2].sort()).toEqual([...j1].sort());
    // Elle ne dépend que de startDate/examDate/offDays.
    expect([...j1].every((d) => d < '2026-12-01')).toBe(true);
    expect(j1.size).toBeGreaterThanOrEqual(3);
    expect(j1.size).toBeLessThanOrEqual(8);
  });
});

describe('INV-2 / INV-7 / INV-9 — matérialiser une fois, et une seule', () => {
  const seed = async () => {
    await db.cases.bulkPut(corpus());
    await db.meta.put({ key: 'program', value: config() });
  };

  it('sans programme configuré, rien n’est matérialisé', async () => {
    freezeAt('2026-10-01T08:00:00Z');
    expect(await ensureDayPlan()).toBeNull();
    expect(await db.day_plans.count()).toBe(0);
  });

  it('INV-9 : n appels dans la journée donnent UN seul plan, bit-identique', async () => {
    const advance = freezeAt('2026-10-01T08:00:00Z');
    await seed();
    const first = await ensureDayPlan();
    const snapshot = JSON.stringify(first);
    for (let i = 0; i < 5; i++) { advance(2 * 3600_000); expect(JSON.stringify(await ensureDayPlan())).toBe(snapshot); }
    expect(await db.day_plans.count()).toBe(1);
  });

  it('INV-7 : un plan déjà présent n’est JAMAIS réécrit — le premier fige', async () => {
    freezeAt('2026-10-01T08:00:00Z');
    await seed();
    const dautrui = { date: '2026-10-01', materializedAt: 1, mode: 'teil-first' as const, seed: 'autre-appareil', targetMin: 90, tasks: [] };
    await db.day_plans.put(dautrui);
    expect(await ensureDayPlan()).toEqual(dautrui);
  });

  it('le lendemain matérialise son propre jour ; la veille reste intacte', async () => {
    const advance = freezeAt('2026-10-01T08:00:00Z');
    await seed();
    const j1 = JSON.stringify(await ensureDayPlan());
    advance(DAY_MS);
    const j2 = await ensureDayPlan();
    expect(j2!.date).toBe('2026-10-02');
    expect(JSON.stringify(await db.day_plans.get('2026-10-01'))).toBe(j1);
  });

  it('le passé n’est jamais matérialisé rétroactivement : un jour non ouvert reste vide', async () => {
    const advance = freezeAt('2026-10-01T08:00:00Z');
    await seed();
    await ensureDayPlan();
    advance(3 * DAY_MS);
    await ensureDayPlan();
    expect((await db.day_plans.toArray()).map((p) => p.date)).toEqual(['2026-10-01', '2026-10-04']);
  });

  it('INV-2 : `sessionDuJour` appartient toujours au plan, ou vaut null', async () => {
    freezeAt('2026-10-01T08:00:00Z');
    await seed();
    const plan = (await ensureDayPlan())!;
    expect(plan.tasks).toContain(sessionDuJour(plan));
    expect(sessionDuJour(null)).toBeNull();
    expect(sessionDuJour({ ...plan, tasks: plan.tasks.map((t) => ({ ...t, doneAt: 1 })) })).toBeNull();
  });
});

describe('INV-1 — cocher marque faite, rien ne prend la place', () => {
  it('INV-1 : la session du jour AVANCE dans la liste, elle n’est pas remplacée', async () => {
    freezeAt('2026-10-01T08:00:00Z');
    await db.cases.bulkPut(corpus());
    await db.meta.put({ key: 'program', value: config() });
    const plan = (await ensureDayPlan())!;
    const ordre = plan.tasks.map((t) => t.id);
    expect(plan.tasks.length).toBeGreaterThan(1);

    let restantes = plan.tasks.length;
    for (const t of plan.tasks) {
      await markTaskDone(t, 10);
      const apres = (await db.day_plans.get('2026-10-01'))!;
      expect(apres.tasks.map((x) => x.id)).toEqual(ordre);          // AUCUN réordonnancement
      const n = apres.tasks.filter((x) => !x.doneAt).length;
      expect(n).toBeLessThan(restantes);                            // strictement décroissant
      restantes = n;
      expect(sessionDuJour(apres)).toBe(apres.tasks.find((x) => !x.doneAt) ?? null);
    }
    const fini = (await db.day_plans.get('2026-10-01'))!;
    expect(sessionDuJour(fini)).toBeNull();
    expect(planProgress(fini)).toEqual({ done: ordre.length, total: ordre.length });
  }, 20_000);
});

describe('INV-8 — replanifier conserve tout ce qui est fait', () => {
  it('INV-8 : les tâches faites sont conservées à l’identique, id compris', async () => {
    freezeAt('2026-10-01T08:00:00Z');
    await db.cases.bulkPut(corpus());
    await db.meta.put({ key: 'program', value: config() });
    const plan = (await ensureDayPlan())!;
    const cible = plan.tasks.find((t) => t.kind === 'simulation')!;
    await markTaskDone(cible, 22);
    const faite = (await db.day_plans.get('2026-10-01'))!.tasks.find((t) => t.id === cible.id)!;

    const replanifie = (await replanifier('2026-10-01'))!;
    const retrouvee = replanifie.tasks.find((t) => t.id === cible.id);
    expect(retrouvee).toEqual(faite);
    expect(replanifie.replannedAt).toBe(Date.parse('2026-10-01T08:00:00Z'));
    expect(replanifie.date).toBe('2026-10-01');
  }, 20_000);

  it('replanifier ne touche que le jour courant', async () => {
    const advance = freezeAt('2026-10-01T08:00:00Z');
    await db.cases.bulkPut(corpus());
    await db.meta.put({ key: 'program', value: config() });
    await ensureDayPlan();
    advance(DAY_MS);
    await ensureDayPlan();
    const veille = JSON.stringify(await db.day_plans.get('2026-10-01'));
    await replanifier('2026-10-02');
    expect(JSON.stringify(await db.day_plans.get('2026-10-01'))).toBe(veille);
  }, 20_000);

  it('replanifier sur un jour non matérialisé ne crée rien', async () => {
    freezeAt('2026-10-01T08:00:00Z');
    await db.meta.put({ key: 'program', value: config() });
    expect(await replanifier('2026-10-01')).toBeNull();
    expect(await db.day_plans.count()).toBe(0);
  });
});

// C6-B point 2 — l'accord : « dus », jamais « dûs » (participe passé de devoir,
// pluriel masculin : « dus » ; « dû » au singulier seulement).
const terme = (id: string, state: 'Neu' | 'Gelernt', dueDate: number) => ({
  id, term: id, srs: { interval: 6, easeFactor: 2.5, dueDate, repetitions: 2, lapses: 0, state },
}) as never;
const NOW = Date.parse('2026-10-01T08:00:00Z');
const dus = (n: number) => Array.from({ length: n }, (_, i) => terme(`d${i}`, 'Gelernt', NOW - DAY_MS));
const nouveaux = (n: number) => Array.from({ length: n }, (_, i) => terme(`n${i}`, 'Neu', NOW));
const drillDe = (begriffe: never[]) => buildTasks(input({ begriffe, now: NOW }), ids()).find((t) => t.kind === 'drill');

describe('C6-B · l’accord de « dus »', () => {
  it('pluriel : « dus » ; singulier : « dû » ; jamais « dûs »', () => {
    expect(drillDe(dus(4) as never[])!.reason).toMatch(/\b4 termes dus\b/);
    expect(drillDe(dus(1) as never[])!.reason).toMatch(/\b1 terme dû(?!s)/);
    expect(drillDe([...dus(4), ...nouveaux(3)] as never[])!.reason).not.toContain('dûs');
  });
});

describe('C6-B · la tâche Fachbegriffe nomme ce qu’elle contient', () => {
  it('rien de dû : elle dit les nouveaux termes, jamais « 0 terme dû »', () => {
    const d = drillDe(nouveaux(25) as never[])!;
    expect(d.reason).toBe('10 nouveaux termes');            // le budget de nouveaux est plafonné à 10
    expect(d.reason).not.toMatch(/\b0\b/);
  });
  it('du dû ET du nouveau : les deux, dans cet ordre', () => {
    expect(drillDe([...dus(3), ...nouveaux(2)] as never[])!.reason).toBe('3 termes dus · 2 nouveaux termes');
    expect(drillDe([...dus(1), ...nouveaux(1)] as never[])!.reason).toBe('1 terme dû · 1 nouveau terme');
  });
  it('rien de dû ET aucun nouveau : pas de tâche Fachbegriffe, donc jamais la session de tête', () => {
    const tasks = buildTasks(input({ begriffe: [], now: NOW }), ids());
    expect(tasks.some((t) => t.kind === 'drill')).toBe(false);
    expect(sessionDuJour({ date: '2026-10-01', materializedAt: 0, mode: 'teil-first', seed: 's', targetMin: 90, tasks })!.kind).toBe('simulation');
  });
});

describe('C6-B · rien de dû : les nouveaux termes passent APRÈS la première partie', () => {
  const kinds = (b: never[], over: Partial<BuildInput> = {}) => buildTasks(input({ begriffe: b, now: NOW, ...over }), ids()).map((t) => t.kind);

  it('seulement des nouveaux : la session de tête est une partie de cas, le drill vient juste après', () => {
    const tasks = buildTasks(input({ begriffe: nouveaux(25) as never[], now: NOW }), ids());
    expect(tasks[0].kind).toBe('simulation');
    expect(tasks[1].kind).toBe('drill');
    expect(sessionDuJour({ date: '2026-10-01', materializedAt: 0, mode: 'teil-first', seed: 's', targetMin: 90, tasks })!.kind).toBe('simulation');
  });
  it('des termes dus : le drill reste en tête', () => {
    expect(kinds([...dus(2), ...nouveaux(5)] as never[])[0]).toBe('drill');
  });
  it('le coût du drill reste réservé (budget) et les identifiants restent rejouables', () => {
    const a = buildTasks(input({ begriffe: nouveaux(25) as never[], now: NOW }), ids());
    const b = buildTasks(input({ begriffe: nouveaux(25) as never[], now: NOW }), ids());
    expect(a).toEqual(b);
    expect(a.reduce((s, t) => s + t.estMin, 0)).toBeLessThanOrEqual(120);
  });
  it('mode examen-blanc : sans dû, l’examen passe avant le drill', () => {
    expect(kinds(nouveaux(5) as never[], { config: config({ modus: 'examen-blanc' }) }).slice(0, 2)).toEqual(['examen-blanc', 'drill']);
  });
});

describe('C6-B · « N nouveaux » suit le réglage du drill (newPerDay)', () => {
  it('newPerDay plafonne les nouveaux annoncés ; 0 = pas de tâche', () => {
    const r = (n?: number) => buildTasks(input({ begriffe: nouveaux(25) as never[], now: NOW, newPerDay: n }), ids()).find((t) => t.kind === 'drill')?.reason;
    expect(r(3)).toBe('3 nouveaux termes');
    expect(r(40)).toBe('25 nouveaux termes');            // jamais plus que ce qui existe
    expect(r(undefined)).toBe('10 nouveaux termes');     // repli
    expect(r(0)).toBeUndefined();
  });
  it('ensureDayPlan lit le réglage manuel enregistré', async () => {
    freezeAt('2026-10-01T08:00:00Z');
    await db.cases.bulkPut(corpus());
    await db.fachbegriffe.bulkPut(nouveaux(25).map((b, i) => ({ ...(b as object), id: `n${i}`, srs: { interval: 0, easeFactor: 2.5, dueDate: 0, repetitions: 0, lapses: 0, state: 'Neu' } })) as never[]);
    await db.meta.put({ key: 'program', value: config() });
    await db.meta.put({ key: 'srs.settings', value: { mode: 'manual', newPerDay: 4 } });
    const plan = await ensureDayPlan();
    expect(plan!.tasks.find((t) => t.kind === 'drill')!.reason).toBe('4 nouveaux termes');
  });
});

describe('C6-B m-1 · la tâche annonce ce que le drill servira (remaining, pas newPerDay)', () => {
  it('après « Replanifier », 3 nouveaux déjà introduits sur 4 : « 1 nouveau terme »', async () => {
    freezeAt('2026-10-01T08:00:00Z');
    await db.cases.bulkPut(corpus());
    await db.fachbegriffe.bulkPut(nouveaux(25).map((b, i) => ({ ...(b as object), id: `n${i}`, srs: { interval: 0, easeFactor: 2.5, dueDate: 0, repetitions: 0, lapses: 0, state: 'Neu' } })) as never[]);
    await db.meta.put({ key: 'program', value: config() });
    await db.meta.put({ key: 'srs.settings', value: { mode: 'manual', newPerDay: 4 } });
    expect((await ensureDayPlan())!.tasks.find((t) => t.kind === 'drill')!.reason).toBe('4 nouveaux termes');
    await db.meta.put({ key: 'srs.newIntroduced:2026-10-01', value: 3 });
    const re = await replanifier();
    expect(re!.tasks.find((t) => t.kind === 'drill')!.reason).toBe('1 nouveau terme');
  });
});
