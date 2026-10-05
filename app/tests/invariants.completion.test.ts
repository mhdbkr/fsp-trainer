// C6 — la COMPLÉTION d'une tâche, dérivée du journal (S4-2). Contrat : training-journal.md §12.1, §12.3, §12.8 ; ADR-0021 (I3, I4, I5, N1).
//
//   INV-51  complétion dérivée, multi-appareils, pour TOUTES les tâches : `doneAt(T) !== undefined ⇔ faite(T, J)`.
//           Deux appareils qui ont reçu `J`, dans n'importe quel ordre et dans n'importe quel fuseau, projettent les mêmes `doneAt`.
//   INV-52  jamais « manquée » : `statutTache ∈ {faite, entamee, a-faire}` ; le rattrapage d'une tâche entamée propose
//           exactement `resteTache(T)`, sans `dUnTrait` ; avant `accepterRattrapage`, rien ne bouge.
//   INV-54  un ancien plan figé (tâches d'un seul Teil) reste lisible : mêmes `doneAt` que la règle série 3.
//
// L'ORACLE ci-dessous est écrit à part, à la lettre du contrat, sur les exercices que le générateur a lui-même produits
// (jamais sur les `TrainingEvent` que l'application en dérive) : un défaut de dérivation ne peut pas se cacher des deux côtés.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

vi.mock('@/lib/auth/session', async () => (await import('./helpers/mocks')).authMock());
vi.mock('@/lib/sync/queue', async () => (await import('./helpers/mocks')).queueMock());
vi.mock('@/lib/supabase', async () => (await import('./helpers/mocks')).supabaseMock());
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

import { db } from '@/db/db';
import { rebuildJournal } from '@/lib/journal';
import { teileDeTache } from '@/lib/program/tacheDeCas';
import { evaluerTache } from '@/lib/program/completion';
import { planProgress } from '@/lib/program/dayPlan';
import { accepterRattrapage, glissement, rattrapageAProposer } from '@/lib/program/rattrapage';
import type { DayPlan, ProgramConfig, SimTeil, TaskInstance, TaskKind } from '@/db/types';
import { now } from '@/lib/clock';
import type { ProgressEvent } from '@/lib/sync/events';
import { forAll, type Rng } from './helpers/prop';
import { TEILE, addDaysISO, resetTime, resetWorld, simulationOf, startOn } from './helpers/world';

beforeEach(() => resetWorld());
afterEach(() => resetTime());

const TZ_ORIGINE = process.env.TZ;
afterEach(() => { if (TZ_ORIGINE === undefined) delete process.env.TZ; else process.env.TZ = TZ_ORIGINE; });
/** Un « appareil » : le fuseau du système change, le code applicatif ne doit pas le voir. */
async function surAppareil<T>(tz: string, fn: () => Promise<T>): Promise<T> {
  process.env.TZ = tz;
  try { return await fn(); } finally { if (TZ_ORIGINE === undefined) delete process.env.TZ; else process.env.TZ = TZ_ORIGINE; }
}

// ------------------------------------------------------------------ l'oracle

const A: SimTeil = 'anamnese', D: SimTeil = 'dokumentation', F: SimTeil = 'fallvorstellung';
const FUSEAUX = ['Europe/Berlin', 'Pacific/Auckland', 'America/Los_Angeles', 'Asia/Tokyo'];
const ISO = (ms: number) => new Date(ms).toISOString();
const jourEn = (t: number, tz: string) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(t);
/** Minuit du jour `date` dans `tz`, trouvé par balayage au quart d'heure : aucune arithmétique de fuseau à reproduire. */
function minuit(date: string, tz: string): number {
  let t = Date.parse(`${date}T12:00:00Z`) - 40 * 3600_000;
  while (jourEn(t, tz) !== date) t += 15 * 60_000;
  return t;
}

type Genre = 'partie' | 'drill' | 'fiche' | 'aufklaerung' | 'coche';
interface Ex { id: string; genre: Genre; at: number; caseId?: string; teile: SimTeil[]; enchaine?: boolean; selbst?: boolean; layer3?: boolean; info?: string; tache?: TaskInstance }

const GENRE_ATTENDU: Partial<Record<TaskKind, Genre>> = { drill: 'drill', fachwissen: 'fiche', aufklaerung: 'aufklaerung' };
const EST_CAS = (k: TaskKind) => k === 'simulation' || k === 'revision' || k === 'examen-blanc';

interface Verdict { faite: boolean; doneAt?: number }
/** doneAt = l'instant de l'exercice qui rend la tâche faite ; une coche nue redondante (la tâche est aussi faite par des
 *  parties) est absorbée dans l'historique (D-C4) : c'est alors la partie qui fait foi. */
function oracle(T: TaskInstance, exs: Ex[], tz: string): Verdict {
  const dansTache = (e: Ex) => jourEn(e.at, tz) === T.date && e.at >= (T.creeA ?? minuit(T.date, tz));
  // [S4-3 fixeur M5, décision de main, training-journal.md §12.3 amendé] Une PARTIE compte aussi si elle a été
  // ENREGISTRÉE dans la tâche (son jour, après `creeA`) — `occurred_at` de `simulation.completed`, ici `at + k + 2` —, et
  // jamais si elle a été enregistrée avant la tâche. Elle la fait alors à l'instant de son enregistrement.
  const debutTache = T.creeA ?? minuit(T.date, tz);
  const enr = (e: Ex) => e.at + exs.indexOf(e) + 2;
  const partieDansTache = (e: Ex) => enr(e) >= debutTache && (dansTache(e) || jourEn(enr(e), tz) === T.date);
  const quand = (e: Ex) => (e.at >= debutTache ? e.at : enr(e));
  const tri = [...exs].sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1));
  const coche = tri.find((e) => e.genre === 'coche' && e.tache?.id === T.id);
  let fait: number | undefined;
  if (EST_CAS(T.kind)) {
    const parties = tri.filter((e) => e.genre === 'partie' && e.caseId === T.caseId && partieDansTache(e));
    const voulus = T.teile!;
    if (T.dUnTrait) {
      const premiere = parties.find((e) => e.enchaine === true && !e.selbst && e.teile.length === 3);
      if (premiere) fait = quand(premiere);
    } else {
      const vus = new Set<SimTeil>();
      for (const e of parties) { e.teile.forEach((t) => vus.add(t)); if (voulus.every((t) => vus.has(t))) { fait = quand(e); break; } }
    }
  } else {
    const genre = GENRE_ATTENDU[T.kind]!;
    const e = tri.find((x) => x.genre === genre && (T.caseId === undefined || x.caseId === T.caseId) && dansTache(x));
    if (e) fait = e.at;
  }
  const doneAt = fait ?? coche?.at;
  return doneAt === undefined ? { faite: false } : { faite: true, doneAt };
}

// ------------------------------------------------------------ le générateur

const DATE = '2026-10-12';

function tachesDe(r: Rng, debut: number, fin: number): TaskInstance[] {
  const cas = r.shuffle(['c1', 'c2', 'c3', 'c4', 'c5']);
  const out: TaskInstance[] = [];
  const base = (i: number, kind: TaskKind): TaskInstance => ({ id: `T${i}`, date: DATE, kind, label: `L${i}`, estMin: 30, source: 'plan', reason: 'r' });
  const quand = () => (r.bool(0.35) ? debut + r.int(1, 10) * 3600_000 : undefined);
  for (let i = 0, n = r.int(3, 6); i < n; i++) {
    const kind = r.pick<TaskKind>(['simulation', 'simulation', 'simulation', 'revision', 'examen-blanc', 'drill', 'fachwissen', 'aufklaerung']);
    const t = base(i, kind);
    if (EST_CAS(kind)) {
      t.caseId = cas.pop()!;
      t.teile = kind === 'simulation' ? TEILE.filter(() => r.bool(0.7)) : [A, D, F];
      if (!t.teile.length) t.teile = [r.pick(TEILE)];
      if ((kind === 'revision' || kind === 'simulation') && t.teile.length === 3 && r.bool(0.3)) t.dUnTrait = true;
      const c = quand(); if (c !== undefined && c < fin) t.creeA = c;
    } else if (kind === 'fachwissen') t.caseId = cas.pop()!;
    else if (kind === 'aufklaerung' && r.bool()) t.caseId = cas.pop()!;
    out.push(t);
  }
  return out;
}

function exercices(r: Rng, taches: TaskInstance[], debut: number, fin: number): Ex[] {
  const cas = ['c1', 'c2', 'c3', 'c4', 'c5'];
  const bords = [debut - 120_000, debut - 1, debut, debut + 60_000, fin - 120_000, fin - 1, fin, fin + 60_000];
  return Array.from({ length: r.int(4, 14) }, (_, i) => {
    const at = r.bool(0.4) ? r.pick(bords) + r.int(0, 3) * 1000 : debut - 3 * 3600_000 + r.int(0, 30 * 3600_000);
    const genre = r.pick<Genre>(['partie', 'partie', 'partie', 'partie', 'drill', 'fiche', 'aufklaerung', 'coche']);
    const ex: Ex = { id: `x${String(i).padStart(2, '0')}`, genre, at, teile: [] };
    if (genre === 'partie') {
      const caseId = r.bool(0.75) ? r.pick(taches.filter((t) => t.caseId).map((t) => t.caseId!).concat(cas.slice(0, 1))) : r.pick(cas);
      ex.caseId = caseId; ex.teile = r.bool(0.4) ? [A, D, F] : TEILE.filter(() => r.bool(0.5));
      if (!ex.teile.length) ex.teile = [r.pick(TEILE)];
      ex.enchaine = ex.teile.length === 3 && r.bool(0.7); ex.selbst = r.bool(0.15); ex.layer3 = r.bool(0.3);
      if (r.bool(0.4)) ex.info = r.pick(taches).id;            // le taskId INFORMATIF : il ne doit rien décider
    } else if (genre === 'fiche') ex.caseId = r.pick(cas);
    else if (genre === 'drill') { if (r.bool(0.3)) ex.caseId = r.pick(cas); }
    else if (genre === 'aufklaerung') { if (r.bool(0.5)) ex.caseId = r.pick(cas); }
    else { const t = r.pick(taches); ex.tache = t; ex.caseId = t.caseId; ex.teile = EST_CAS(t.kind) ? teileDeTache(t) : []; }
    return ex;
  });
}

const KIND_DE: Record<TaskKind, 'simulation' | 'drill' | 'fiche' | 'aufklaerung' | 'examen-blanc'> = {
  simulation: 'simulation', revision: 'simulation', 'examen-blanc': 'examen-blanc', drill: 'drill', fachwissen: 'fiche', aufklaerung: 'aufklaerung',
};

function journalDe(taches: TaskInstance[], exs: Ex[], tz: string, debut: number): ProgressEvent[] {
  const evs: ProgressEvent[] = [{
    id: 'plan', user_id: 'u', type: 'plan.materialized', subject_id: DATE, occurred_at: ISO(debut + 1),
    payload: { tasks: taches, mode: 'cas-complet', seed: 's', targetMin: 120, tz },
  }];
  exs.forEach((ex, k) => {
    const occurred_at = ISO(ex.at + k + 2);
    if (ex.genre === 'partie') {
      const sim = simulationOf(`s-${ex.id}`, ex.caseId!, ex.at, ex.teile, 70, {
        ...(ex.enchaine ? { enchaine: true } : {}), ...(ex.selbst ? { mode: 'external-ai' } : {}), layer: ex.layer3 ? 3 : 2,
        ...(ex.info ? { taskId: ex.info } : {}),
      } as never);
      evs.push({ id: `pe-${ex.id}`, user_id: 'u', type: 'simulation.completed', subject_id: sim.id, payload: sim, occurred_at });
      return;
    }
    const kind = ex.genre === 'coche' ? KIND_DE[ex.tache!.kind] : ex.genre;
    evs.push({
      id: `pe-${ex.id}`, user_id: 'u', type: 'training.logged', subject_id: `te-${ex.id}`, occurred_at,
      payload: {
        at: ex.at, kind, ...(ex.caseId ? { caseId: ex.caseId } : {}), teile: ex.teile,
        source: ex.genre === 'coche' ? 'plan' : 'libre', ...(ex.genre === 'coche' ? { taskId: ex.tache!.id } : {}),
        spentMin: ex.genre === 'coche' ? 0 : 5 + (k % 7),
      },
    });
  });
  return evs;
}

const plan = async (date = DATE) => (await db.day_plans.get(date))!;
const signature = (p: DayPlan) => JSON.stringify(p.tasks.map((t) => [t.id, t.doneAt ?? null, t.eventId ?? null, t.spentMin ?? null]));

// ---------------------------------------------------------------------- INV-51

describe('INV-51 — la complétion est DÉRIVÉE du journal, pour toutes les tâches, quel que soit l’appareil', () => {
  it('doneAt(T) défini ⇔ faite(T, J), au doneAt près ; deux appareils (fuseaux et ordres d’arrivée différents) projettent la même chose', async () => {
    const vus = { faites: 0, ouvertes: 0, cas: 0, horsCas: 0, dUnTrait: 0, bord: 0, fuseaux: new Set<string>() };
    await forAll(120, async (r, seed) => {
      const tz = r.pick(FUSEAUX); vus.fuseaux.add(tz);
      const debut = minuit(DATE, tz), fin = minuit(addDaysISO(DATE, 1), tz);
      const taches = tachesDe(r, debut, fin);
      const exs = exercices(r, taches, debut, fin);
      const evs = journalDe(taches, exs, tz, debut);
      const signatures: string[] = [];
      for (const appareil of ['Europe/Paris', r.pick(['Asia/Tokyo', 'America/Los_Angeles', 'Pacific/Auckland', 'UTC'])]) {
        await resetWorld();
        await surAppareil(appareil, () => rebuildJournal(r.shuffle(evs)));
        const p = await plan();
        for (const t of taches) {
          const att = oracle(t, exs, tz);
          const lu = p.tasks.find((x) => x.id === t.id)!;
          expect(lu.doneAt !== undefined, `graine ${seed}, appareil ${appareil} (plan ${tz}), « ${t.kind} ${t.caseId ?? ''} ${t.teile?.join('+') ?? ''}${t.dUnTrait ? ' d’un trait' : ''} » : faite=${att.faite} attendu`).toBe(att.faite);
          if (att.faite) expect(lu.doneAt, `graine ${seed}, appareil ${appareil} : doneAt`).toBe(att.doneAt);
          if (appareil === 'Europe/Paris') {
            if (att.faite) vus.faites++; else vus.ouvertes++;
            if (EST_CAS(t.kind)) vus.cas++; else vus.horsCas++;
            if (t.dUnTrait) vus.dUnTrait++;
          }
        }
        signatures.push(signature(p));
      }
      expect(signatures[1], `graine ${seed} : les deux appareils divergent`).toBe(signatures[0]);
      vus.bord += exs.filter((e) => [debut - 1, debut, fin - 1, fin].some((b) => Math.abs(e.at - b) < 4000)).length;
    });
    // La preuve ne passe pas à vide : des tâches faites ET ouvertes, de cas ET hors cas, d'un trait, aux frontières du jour.
    expect(vus.faites).toBeGreaterThan(60); expect(vus.ouvertes).toBeGreaterThan(60);
    expect(vus.cas).toBeGreaterThan(100); expect(vus.horsCas).toBeGreaterThan(50);
    expect(vus.dUnTrait).toBeGreaterThan(8); expect(vus.bord).toBeGreaterThan(30);
    expect(vus.fuseaux.size).toBe(FUSEAUX.length);
  }, 600_000);

  it('23 h 59 et 0 h 01 au fuseau du PLAN : la partie de 23 h 59 compte, celle de 0 h 01 non — sur n’importe quel appareil', async () => {
    const tz = 'Pacific/Auckland';
    const debut = minuit(DATE, tz), fin = minuit(addDaysISO(DATE, 1), tz);
    const t: TaskInstance = { id: 'T0', date: DATE, kind: 'simulation', label: 'L', estMin: 30, source: 'plan', reason: 'r', caseId: 'c1', teile: [A] };
    for (const [at, faite] of [[fin - 60_000, true], [fin + 60_000, false], [debut + 60_000, true], [debut - 60_000, false]] as const) {
      for (const appareil of ['America/Los_Angeles', 'Europe/Berlin', 'Asia/Tokyo']) {
        await resetWorld();
        const evs = journalDe([t], [{ id: 'x00', genre: 'partie', at, caseId: 'c1', teile: [A] }], tz, debut);
        await surAppareil(appareil, () => rebuildJournal(evs));
        expect((await plan()).tasks[0].doneAt !== undefined, `partie à ${ISO(at)} vue d'un appareil ${appareil}`).toBe(faite);
      }
    }
  });

  it('le taskId écrit à l’écriture est INFORMATIF : il ne coche rien, et son absence ne décoche rien', async () => {
    const tz = 'Europe/Berlin', debut = minuit(DATE, tz);
    const t: TaskInstance = { id: 'T0', date: DATE, kind: 'simulation', label: 'L', estMin: 30, source: 'plan', reason: 'r', caseId: 'c1', teile: [A, D, F] };
    const autre: TaskInstance = { ...t, id: 'T1', caseId: 'c2', teile: [A] };
    // Une partie de c2 qui prétend (taskId) satisfaire T0 : T0 reste ouverte, T1 se coche par le contenu.
    await resetWorld();
    await rebuildJournal(journalDe([t, autre], [{ id: 'x00', genre: 'partie', at: debut + 3600_000, caseId: 'c2', teile: [A], info: 'T0' }], tz, debut));
    const p = await plan();
    expect(p.tasks.find((x) => x.id === 'T0')!.doneAt).toBeUndefined();
    expect(p.tasks.find((x) => x.id === 'T1')!.doneAt).toBe(debut + 3600_000);
  });

  it('une coche manuelle d’un plan PERDANT vaut pour la tâche équivalente du plan gagnant (D-I2), sinon la tâche faite est conservée (I-3)', async () => {
    const tz = 'Europe/Berlin', debut = minuit(DATE, tz);
    const gagnante: TaskInstance = { id: 'G0', date: DATE, kind: 'simulation', label: 'L', estMin: 30, source: 'plan', reason: 'r', caseId: 'c1', teile: [A, D, F] };
    const perdante: TaskInstance = { ...gagnante, id: 'P0' };
    const orpheline: TaskInstance = { ...gagnante, id: 'P1', caseId: 'c9' };
    const evs: ProgressEvent[] = [
      { id: 'win', user_id: 'u', type: 'plan.materialized', subject_id: DATE, occurred_at: ISO(debut + 1), payload: { tasks: [gagnante], mode: 'cas-complet', seed: 'a', targetMin: 120, tz } },
      { id: 'lose', user_id: 'u', type: 'plan.materialized', subject_id: DATE, occurred_at: ISO(debut + 99_000), payload: { tasks: [perdante, orpheline], mode: 'cas-complet', seed: 'b', targetMin: 120, tz } },
      { id: 'pe1', user_id: 'u', type: 'training.logged', subject_id: 'te-1', occurred_at: ISO(debut + 200_000), payload: { at: debut + 200_000, kind: 'simulation', caseId: 'c1', teile: [A, D, F], source: 'plan', taskId: 'P0', spentMin: 0 } },
      { id: 'pe2', user_id: 'u', type: 'training.logged', subject_id: 'te-2', occurred_at: ISO(debut + 300_000), payload: { at: debut + 300_000, kind: 'simulation', caseId: 'c9', teile: [A, D, F], source: 'plan', taskId: 'P1', spentMin: 0 } },
    ];
    await rebuildJournal(evs);
    const p = await plan();
    expect(p.tasks.find((x) => x.id === 'G0')!.doneAt).toBe(debut + 200_000);
    expect(p.tasks.find((x) => x.id === 'P1')?.doneAt, 'la tâche faite sur le plan perdant est conservée (I-3)').toBe(debut + 300_000);
  });
});

// ---------------------------------------------------------------------- INV-52

describe('INV-52 — jamais « manquée » : faite, entamée ou à faire', () => {
  it('statut ∈ {faite, entamee, a-faire} ; un avancement non vide d’une tâche non faite ⇒ entamée ; planProgress en rend le compte', async () => {
    const vus = { entamees: 0, faites: 0, aFaire: 0 };
    await forAll(80, async (r, seed) => {
      const tz = r.pick(FUSEAUX);
      const debut = minuit(DATE, tz), fin = minuit(addDaysISO(DATE, 1), tz);
      const taches = tachesDe(r, debut, fin);
      const exs = exercices(r, taches, debut, fin);
      await resetWorld();
      await rebuildJournal(journalDe(taches, exs, tz, debut));
      const p = await plan();
      const events = await db.training_events.toArray();
      let faites = 0, entamees = 0;
      for (const t of p.tasks) {
        const e = evaluerTache(t, events, tz);
        expect(['faite', 'entamee', 'a-faire'], `graine ${seed}`).toContain(e.statut);
        expect(e.statut === 'faite', `graine ${seed} : statut ≠ doneAt`).toBe(t.doneAt !== undefined);
        if (e.statut !== 'faite' && e.avancement.length > 0) expect(e.statut, `graine ${seed} : un avancement non vide d’une tâche non faite doit être « entamée »`).toBe('entamee');
        if (e.statut === 'entamee') { expect(e.avancement.length).toBeGreaterThan(0); entamees++; vus.entamees++; }
        if (e.statut === 'faite') { faites++; vus.faites++; }
        if (e.statut === 'a-faire') { expect(e.avancement).toEqual([]); vus.aFaire++; }
      }
      expect(planProgress(p, events)).toEqual({ faites, entamees, total: p.tasks.length });
    });
    expect(vus.entamees).toBeGreaterThan(20); expect(vus.faites).toBeGreaterThan(30); expect(vus.aFaire).toBeGreaterThan(30);
  }, 300_000);

  // --- le rattrapage : « Finir hier » (§12.8) ---------------------------------
  const HIER = '2026-10-12', AUJOURDHUI = '2026-10-13';
  const T = (id: string, kind: TaskKind, over: Partial<TaskInstance> = {}): TaskInstance =>
    ({ id, date: HIER, kind, label: `Cas ${id}`, estMin: 40, source: 'plan', reason: `raison ${id}`, specialty: 'Kardiologie', ...over });
  const cfg: ProgramConfig = { startDate: '2026-10-05', examDate: '2026-12-18', intensity: 'mittel', hoursPerSession: 2, offDays: [0, 6], prioritySpecialties: [], selfLevel: {}, createdAt: 0 } as ProgramConfig;

  /** Deux jours figés (hier, aujourd'hui) + le journal d'hier, dans la vraie base. */
  async function monde(hier: TaskInstance[], aujourdhui: TaskInstance[], parties: { caseId: string; teile: SimTeil[]; at: number }[], targetToday = 120) {
    await resetWorld();
    await db.meta.put({ key: 'program', value: cfg } as never);
    const tz = 'Europe/Berlin';
    const dh = minuit(HIER, tz), da = minuit(AUJOURDHUI, tz);
    const evs: ProgressEvent[] = [
      { id: 'ph', user_id: 'u', type: 'plan.materialized', subject_id: HIER, occurred_at: ISO(dh + 1), payload: { tasks: hier, mode: 'cas-complet', seed: 'h', targetMin: 120, tz } },
      { id: 'pa', user_id: 'u', type: 'plan.materialized', subject_id: AUJOURDHUI, occurred_at: ISO(da + 1), payload: { tasks: aujourdhui.map((t) => ({ ...t, date: AUJOURDHUI })), mode: 'cas-complet', seed: 'a', targetMin: targetToday, tz } },
      ...parties.map((x, i) => ({ id: `pe${i}`, user_id: 'u', type: 'simulation.completed', subject_id: `s${i}`, occurred_at: ISO(x.at + 1), payload: simulationOf(`s${i}`, x.caseId, x.at, x.teile, 75) }) as ProgressEvent),
    ];
    await db.progress_events.bulkPut(evs);
    await rebuildJournal();
    return { tz, dh, da };
  }
  const touteLaBase = async () => JSON.stringify({ plans: await db.day_plans.toArray(), pe: (await db.progress_events.toArray()).map((e) => e.id).sort(), te: await db.training_events.toArray() });

  it('chaque tâche non faite de la veille est proposée avec EXACTEMENT resteTache(T), sans dUnTrait ; rien ne bouge avant accepterRattrapage', async () => {
    const hier = [
      T('1', 'simulation', { caseId: 'c1', teile: [A, D, F] }),                            // jamais commencée
      T('2', 'simulation', { caseId: 'c2', teile: [A, D, F] }),                            // Anamnese jouée
      T('3', 'revision', { caseId: 'c3', teile: [A, D, F], dUnTrait: true }),              // d'un trait, Anamnese jouée
      T('4', 'revision', { caseId: 'c4', teile: [A, D, F], dUnTrait: true }),              // d'un trait, jamais commencée
      T('5', 'simulation', { caseId: 'c5', teile: [D] }),                                  // une reprise, faite
      T('6', 'simulation', { caseId: 'c6', teil: F }),                                     // plan série 3 : un seul Teil
      T('7', 'drill', { specialty: undefined }),                                           // jamais repris
      T('8', 'fachwissen', { caseId: 'c8' }),                                              // pas de Teil : proposée telle quelle
    ];
    const aujourdhui = [T('9', 'simulation', { caseId: 'c9', teile: [A, D, F] })];
    const dHier = minuit(HIER, 'Europe/Berlin');
    await monde(hier, aujourdhui, [
      { caseId: 'c2', teile: [A], at: dHier + 9 * 3600_000 }, { caseId: 'c3', teile: [A], at: dHier + 10 * 3600_000 }, { caseId: 'c5', teile: [D], at: dHier + 11 * 3600_000 },
    ]);
    const plans = await db.day_plans.orderBy('date').toArray();
    const events = await db.training_events.toArray();
    const avant = await touteLaBase();

    const p = rattrapageAProposer(plans, AUJOURDHUI, [], events)!;
    expect(p.from).toBe(HIER);
    const par = Object.fromEntries(p.tasks.map((t) => [t.label, t]));
    expect(Object.keys(par).sort()).toEqual(['Cas 1', 'Cas 2', 'Cas 3', 'Cas 4', 'Cas 6', 'Cas 8']);   // ni le drill, ni la reprise faite
    expect(par['Cas 1'].teile).toEqual([A, D, F]);
    expect(par['Cas 2'].teile, 'une tâche entamée : exactement ce qui reste').toEqual([D, F]);
    expect(par['Cas 3'].teile, 'une tâche d’un trait entamée : ce qui reste, sans « d’un trait »').toEqual([D, F]);
    expect(par['Cas 4'].teile).toEqual([A, D, F]);
    expect(par['Cas 6'].teile, 'un plan série 3 devient une tâche de cas (teile = [teil])').toEqual([F]);
    expect(par['Cas 6']).not.toHaveProperty('teil');
    for (const t of p.tasks) {
      expect(t, `${t.label} garde dUnTrait`).not.toHaveProperty('dUnTrait');
      expect(t.id).not.toBe(hier.find((h) => h.label === t.label)!.id);          // un id neuf
      expect(t.date).toBe(AUJOURDHUI);
      expect(t.doneAt).toBeUndefined();
    }
    expect(par['Cas 8']).not.toHaveProperty('teile');
    expect(await touteLaBase(), 'proposer ne doit rien changer').toBe(avant);
    // glissement(): la même proposition, plus le décompte des jours manqués
    const g = glissement(plans, AUJOURDHUI, cfg, [], events)!;
    expect(g.tasks.map((t) => t.label)).toEqual(p.tasks.map((t) => t.label));
    expect(g.manques).toBe(0);
    expect(await touteLaBase()).toBe(avant);
  });

  it('un reste vide n’est pas proposé ; une tâche déjà planifiée aujourd’hui non plus ; un refus (synchronisé) fait taire la proposition', async () => {
    const hier = [T('1', 'simulation', { caseId: 'c1', teile: [A, D, F] }), T('2', 'simulation', { caseId: 'c2', teile: [A] })];
    const du = minuit(HIER, 'Europe/Berlin');
    await monde(hier, [T('3', 'simulation', { caseId: 'c1', teile: [A, D, F] })], [{ caseId: 'c2', teile: [A], at: du + 3600_000 }]);
    const plans = await db.day_plans.orderBy('date').toArray(); const events = await db.training_events.toArray();
    expect(rattrapageAProposer(plans, AUJOURDHUI, [], events), 'c1 déjà au plan, c2 faite : rien à rattraper').toBeNull();
    expect(rattrapageAProposer(plans, AUJOURDHUI, [HIER], events)).toBeNull();
    expect(rattrapageAProposer(plans, AUJOURDHUI, new Set([HIER]), events)).toBeNull();
  });

  it('accepter insère les reprises AVANT la première tâche non faite, avec un creeA neuf ; les tâches faites du jour sont conservées à l’identique', async () => {
    const hier = [T('1', 'simulation', { caseId: 'c1', teile: [A, D, F] }), T('2', 'simulation', { caseId: 'c2', teile: [A, D, F] })];
    const du = minuit(AUJOURDHUI, 'Europe/Berlin');
    const aujourdhui = [T('b', 'simulation', { caseId: 'c9', teile: [A] }), T('c', 'simulation', { caseId: 'c8', teile: [A, D, F], specialty: 'Neurologie' }), T('a', 'drill', { specialty: undefined, estMin: 10 })];
    await monde(hier, aujourdhui, [{ caseId: 'c9', teile: [A], at: du + 3600_000 }], 300);   // `b` faite par le jeu ; budget large
    const tick = startOn(AUJOURDHUI); tick(5 * 3600_000);
    const avant = await plan(AUJOURDHUI);
    const apres = (await accepterRattrapage(AUJOURDHUI, HIER))!;
    expect(apres.tasks.map((t) => t.label), 'les reprises passent avant la première tâche NON FAITE').toEqual(['Cas b', 'Cas 1', 'Cas 2', 'Cas c', 'Cas a']);
    for (const t of avant.tasks.filter((x) => x.doneAt !== undefined)) expect(apres.tasks.find((x) => x.id === t.id), 'une tâche faite a bougé (INV-8)').toEqual(t);
    for (const r of apres.tasks.filter((t) => t.label === 'Cas 1' || t.label === 'Cas 2')) {
      expect(r.creeA, 'creeA neuf').toBe(now());
      expect(r.reason).toMatch(/^Finir /);
    }
    expect((await db.progress_events.where('type').equals('plan.replanned').toArray()).map((e) => (e.payload as { reason: string }).reason)).toEqual(['rattrapage']);
    expect(await db.progress_events.where('type').equals('rattrapage.refused').count(), 'traité : la ligne ne revient pas').toBe(1);
  });

  it('INV-58 (reprise) : hors budget, la reprise REMPLACE la première tâche de cas ni faite ni entamée ; sinon elle s’ajoute', async () => {
    const tz = 'Europe/Berlin';
    const du = minuit(AUJOURDHUI, tz);
    const hier = [T('1', 'simulation', { caseId: 'c1', teile: [A, D, F], estMin: 52 })];
    const aujourdhui = [
      T('a', 'simulation', { caseId: 'c7', teile: [A, D, F], estMin: 30, specialty: 'Neurologie' }),   // entamée : protégée
      T('b', 'simulation', { caseId: 'c8', teile: [A, D, F], estMin: 30, specialty: 'Pneumologie' }),  // ni faite ni entamée : remplacée
      T('c', 'simulation', { caseId: 'c9', teile: [A, D, F], estMin: 30, specialty: 'Nephrologie' }),
    ];
    await monde(hier, aujourdhui, [{ caseId: 'c7', teile: [A], at: du + 3600_000 }], 90);            // 90 min de budget, 90 prévues
    startOn(AUJOURDHUI);
    const apres = (await accepterRattrapage(AUJOURDHUI, HIER))!;
    expect(apres.tasks.map((t) => t.label), 'c8 remplacée par la reprise de c1').toEqual(['Cas a', 'Cas 1', 'Cas c']);
    expect(apres.tasks.find((t) => t.label === 'Cas a')!.id, 'la tâche entamée est intacte').toBe('a');

    // Aucune tâche de cas à remplacer (toutes faites ou entamées) : elle s'ajoute.
    const toutes = [T('a', 'simulation', { caseId: 'c7', teile: [A, D, F], estMin: 60 }), T('b', 'simulation', { caseId: 'c8', teile: [A, D, F], estMin: 30, specialty: 'Neurologie' })];
    await monde(hier, toutes, [{ caseId: 'c7', teile: [A, D, F], at: du + 3600_000 }, { caseId: 'c8', teile: [D], at: du + 7200_000 }], 90);
    startOn(AUJOURDHUI);
    const ajoute = (await accepterRattrapage(AUJOURDHUI, HIER))!;
    expect(ajoute.tasks.map((t) => t.label), 'elle s’ajoute, au même endroit : avant la première tâche non faite').toEqual(['Cas a', 'Cas 1', 'Cas b']);

    // Deux reprises hors budget : la seconde remplace une tâche DU JOUR, jamais la reprise qu'on vient d'insérer (S4-2).
    const deux = [T('1', 'simulation', { caseId: 'c1', teile: [A, D, F], estMin: 52 }), T('2', 'simulation', { caseId: 'c2', teile: [A, D, F], estMin: 52, specialty: 'Pneumologie' })];
    await monde(deux, [T('z', 'simulation', { caseId: 'c9', teile: [A, D, F], estMin: 20, specialty: 'Nephrologie' })], [], 90);
    startOn(AUJOURDHUI);
    const deuxApres = (await accepterRattrapage(AUJOURDHUI, HIER))!;
    expect(deuxApres.tasks.map((t) => t.label), 'la 1re reprise tient, la 2de remplace Cas z').toEqual(['Cas 1', 'Cas 2']);
  });
});

// ---------------------------------------------------------------------- INV-54

describe('INV-54 — un ancien plan figé reste lisible (fixture gelée du code série 3)', () => {
  interface Fixture { _meta: { origine: string }; events: ProgressEvent[]; plans: { date: string; mode: string; tasks: { id: string; kind: TaskKind; caseId: string | null; teil: SimTeil | null; doneAt: number | null }[] }[] }
  const fixture: Fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/serie3-plans.json'), 'utf8'));

  it('mêmes doneAt que la règle série 3, sur les six jours (tâches d’un seul Teil, runs complets, coches, replanification, drill, fiche)', async () => {
    await resetWorld();
    await rebuildJournal(fixture.events);
    const lus = await db.day_plans.orderBy('date').toArray();
    expect(lus.map((p) => p.date)).toEqual(fixture.plans.map((p) => p.date));
    let faites = 0, seuls = 0, complets = 0;
    for (const att of fixture.plans) {
      const p = lus.find((x) => x.date === att.date)!;
      expect(p.tasks.map((t) => t.id), `${att.date} : les tâches`).toEqual(att.tasks.map((t) => t.id));
      for (const t of att.tasks) {
        const lu = p.tasks.find((x) => x.id === t.id)!;
        expect(lu.doneAt ?? null, `${att.date} ${t.kind} ${t.caseId} ${t.teil ?? 'run'} : doneAt`).toBe(t.doneAt);
        if (t.doneAt !== null) faites++;
        if (t.kind === 'simulation') { if (t.teil) seuls++; else complets++; }
      }
    }
    expect(faites).toBeGreaterThan(8); expect(seuls).toBeGreaterThan(10); expect(complets).toBeGreaterThan(5);
  });

  it('teileDeTache : [teil] pour une tâche d’un Teil, les trois Teile pour un run complet sans teil', () => {
    for (const p of fixture.plans) for (const t of p.tasks.filter((x) => x.kind === 'simulation')) {
      const lu = { id: t.id, date: p.date, kind: t.kind, label: 'x', estMin: 1, source: 'plan', reason: 'r', ...(t.teil ? { teil: t.teil } : {}) } as TaskInstance;
      expect(teileDeTache(lu)).toEqual(t.teil ? [t.teil] : [A, D, F]);
    }
  });

  it('une partie du jour lit le fuseau LOCAL tant que le plan n’a pas de `tz` (plan série 3)', async () => {
    for (const appareil of ['Europe/Paris', 'UTC']) {
      await resetWorld();
      await surAppareil(appareil, () => rebuildJournal(fixture.events));
      const lus = await db.day_plans.orderBy('date').toArray();
      const doneAts = lus.flatMap((p) => p.tasks.map((t) => t.doneAt ?? null));
      expect(doneAts, `appareil ${appareil}`).toEqual(fixture.plans.flatMap((p) => p.tasks.map((t) => t.doneAt)));
    }
  });
});

