// C6 — la CONSTRUCTION du plan (S4-2). Contrat : training-journal.md §5, §12.2, §12.4, §12.5, §13.1 ; ADR-0021 (I1, I6, I7, I8) ; ADR-0022 §1.
//
//   INV-4   (restreint aux plans série 4, hors `specialite`) jamais deux spécialités identiques de suite, sauf `diversityRelaxed`
//   INV-50  toute tâche de cas porte `teile` non vide, sans `teil` ; `simulation` = restePlan ; `revision` et examen à blanc = les trois
//   INV-55  le plan d'un jour ne dépend que de ce qui PRÉCÈDE ce jour (et pas de l'instant de matérialisation)
//   INV-57  le mode : explicite pour `examen-blanc` et `specialite`, observé en silence sinon, sans boucle
//   INV-58  budget : au plus UNE tâche forcée par jour ; remplissage glouton sur les `estMin` réels
//   INV-60  consolidation espacée : un cas solide revient à son échéance, pas avant ; « d'un trait » seulement si la garde est vraie
//   INV-67  une seule fonction « reste » : `detteTeil` et `teile` d'une tâche `simulation` en dérivent
//
// Le monde est le vrai : 130 cas, fake-indexeddb, horloge injectable. Rien du code applicatif n'est mocké hors réseau.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/auth/session', async () => (await import('./helpers/mocks')).authMock());
vi.mock('@/lib/sync/queue', async () => (await import('./helpers/mocks')).queueMock());
vi.mock('@/lib/supabase', async () => (await import('./helpers/mocks')).supabaseMock());
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

import { db } from '@/db/db';
import { computeCaseProgress, detteTeil, markTaskDone, rebuildJournal } from '@/lib/journal';
import { saveSimulation } from '@/lib/simulationSave';
import { buildTasks, ensureDayPlan, taperDays, type BuildInput } from '@/lib/program/dayPlan';
import { modeDuJour, observeModus } from '@/lib/program/modus';
import { rankCandidates } from '@/lib/program/select';
import { restePlan } from '@/lib/program/tacheDeCas';
import { debutJour, fuseauLocal } from '@/lib/program/fuseau';
import { D_UN_TRAIT_ACTIF, POIDS_CONSOLIDATION, SEUIL_FREQUENT, SOLIDE_ECART_JOURS, TEIL_MIN } from '@/lib/program/parametres';
import { ecrireConfig } from '@/lib/sync/configProjetee';
import { dayKey } from '@/lib/clock';
import type { Case, CaseProgress, Fortschrittsmodus, ProgramConfig, SimTeil, Srs, TaskInstance, TrainingEvent } from '@/db/types';
import type { ProgressEvent } from '@/lib/sync/events';
import { forAll, rng, type Rng } from './helpers/prop';
import { CORPUS, TEILE, addDaysISO, begriffe, morning, partResult, randomConfig, resetTime, resetWorld, simulationOf, startOn } from './helpers/world';

beforeEach(() => resetWorld());
afterEach(() => resetTime());

const A: SimTeil = 'anamnese', D: SimTeil = 'dokumentation', F: SimTeil = 'fallvorstellung';
const ISO = (ms: number) => new Date(ms).toISOString();
const JOUR_D = '2026-10-12';                                                    // un lundi
const strip = (t: TaskInstance) => { const { id: _i, creeA: _c, ...rest } = t; return rest; };
const CAS_KINDS = new Set(['simulation', 'revision', 'examen-blanc']);
const SOMME_TEIL_MIN = TEIL_MIN.anamnese + TEIL_MIN.dokumentation + TEIL_MIN.fallvorstellung;   // 52

/** L'ORACLE de « ce qui reste » (§12.2), réécrit ici à la lettre — jamais `restePlan` lui-même. */
function resteOracle(cp: CaseProgress | undefined, jour: string): SimTeil[] {
  const ecart = (a: string, b: string) => Math.round((Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86_400_000);
  return TEILE.filter((t) => {
    const p = cp?.teile[t];
    if (!p) return true;
    if (p.status === 'solide') return false;
    return !(p.lastAt !== null && ecart(jour, dayKey(p.lastAt)) < SOLIDE_ECART_JOURS);
  });
}

const progressAvant = async (jour: string): Promise<Map<string, CaseProgress>> => {
  const debut = debutJour(jour);
  return new Map(computeCaseProgress((await db.training_events.toArray()).filter((e) => e.at < debut)).map((p) => [p.caseId, p]));
};

const cfgDe = (r: Rng, over: Partial<ProgramConfig> = {}): ProgramConfig => randomConfig(r, { startDate: '2026-10-05', examDate: '2026-12-18', ...over });

// ============================================================ INV-50, INV-4 (restreint), INV-67 (teile)

describe('INV-50 — toute tâche de cas porte `teile` ; INV-4 — la diversité tient dans tous les modes sauf `specialite`', () => {
  it('14 jours ouvrés, corpus complet, journaux joués au hasard : la structure de chaque tâche, plan après plan', async () => {
    const vus = { sim: 0, revision: 0, exam: 0, courts: 0, relax: 0, paires: 0, modes: new Set<string>() };
    await forAll(6, async (r, seed) => {
      await resetWorld();
      const cfg = cfgDe(r, { modus: r.pick<Fortschrittsmodus | undefined>([undefined, 'cas-complet', 'teil-first', 'examen-blanc']), hoursPerSession: r.pick([2, 3]), intensity: 'intensiv', examDate: r.pick(['2026-12-18', '2026-10-30']) });
      await ecrireConfig(cfg);
      let jours = 0;
      for (let j = 0; j < 24 && jours < 14; j++) {
        const date = addDaysISO('2026-10-05', j);
        if ([0, 6].includes(new Date(`${date}T12:00:00`).getDay())) continue;
        const tick = startOn(date);
        const plan = await ensureDayPlan(date);
        if (!plan || plan.tasks.length === 0) continue;
        jours++; vus.modes.add(plan.mode);
        const avant = await progressAvant(date);
        for (const t of plan.tasks) {
          if (!CAS_KINDS.has(t.kind)) continue;
          expect(t.teile?.length, `graine ${seed}, ${date} : « ${t.kind} ${t.label} » sans teile`).toBeGreaterThan(0);
          expect(t, `graine ${seed}, ${date} : « ${t.label} » écrit encore \`teil\``).not.toHaveProperty('teil');
          expect(t.creeA, 'creeA posé').toBeTypeOf('number');
          if (t.kind === 'simulation') {
            expect(t.teile, `graine ${seed}, ${date} : « ${t.label} » : teile ≠ restePlan`).toEqual(resteOracle(avant.get(t.caseId!), date));
            vus.sim++; if (t.teile!.length < 3) vus.courts++;
          } else {
            expect(t.teile, `${t.kind} : les trois Teile`).toEqual([A, D, F]);
            if (t.kind === 'revision') vus.revision++; else vus.exam++;
          }
        }
        // INV-4 (m1) : plan série 4 (toute tâche de cas porte `teile`) hors `specialite`
        if (plan.mode !== 'specialite') {
          const sp = plan.tasks.filter((t) => t.specialty);
          for (let i = 1; i < sp.length; i++) {
            vus.paires++;
            if (sp[i].specialty === sp[i - 1].specialty) { expect(sp[i].diversityRelaxed, `graine ${seed}, ${date} : « ${sp[i - 1].label} » puis « ${sp[i].label} » = ${sp[i].specialty}`).toBe(true); vus.relax++; }
          }
        }
        // le candidat joue la journée : ce que le plan sait du lendemain change vraiment
        for (const t of plan.tasks.filter((x) => x.doneAt === undefined)) {
          tick(60_000);
          if (CAS_KINDS.has(t.kind) && t.caseId && r.bool(0.7)) {
            const c = CORPUS.find((x) => x.id === t.caseId)!;
            const teile = r.bool(0.35) ? [r.pick(t.teile!)] : t.teile!;
            await saveSimulation({ c, assistance: 'autonome', layer: 2, taskId: t.id, parts: Object.fromEntries(teile.map((x) => [x, partResult(r.int(30, 98))])), scope: teile.length === 3 ? 'full' : 'teil', ...(teile.length === 1 ? { teil: teile[0] } : {}) });
          } else await markTaskDone(t, 5);
        }
      }
    });
    expect(vus.sim).toBeGreaterThan(60); expect(vus.paires).toBeGreaterThan(80);
    expect(vus.courts, 'des tâches « il te reste … » (teile < 3) ont bien été planifiées').toBeGreaterThan(5);
    expect(vus.exam).toBeGreaterThan(2);
    expect(vus.modes.size).toBeGreaterThanOrEqual(2);
  }, 600_000);
});

describe('INV-67 — une seule fonction « reste » : `detteTeil` en dérive', () => {
  const teilDe = (jours: number, status: 'acquis' | 'fragile' | 'solide' = 'acquis', score = 70) => ({ status, lastScore: score, lastAt: new Date(`${JOUR_D}T10:00:00`).getTime() - jours * 86_400_000, attempts: 1 });
  const cp = (a: ReturnType<typeof teilDe>, d: ReturnType<typeof teilDe>, f: ReturnType<typeof teilDe>): CaseProgress =>
    ({ caseId: 'c1', teile: { anamnese: a, dokumentation: d, fallvorstellung: f }, overall: 'entame', couverture: 3, maitrise: 70, etat: 'couvert', solideDepuis: null, pretAt: null, prochaineConsolidation: null, pretManque: [] });

  it('un Teil acquis joué il y a 0, 1, 2 jours n’est ni dans `teile` ni dans la dette ; à 3 jours et plus, il y est', () => {
    for (const jours of [0, 1, 2, 3, 4]) {
      const c = cp(teilDe(jours), teilDe(40, 'solide', 90), teilDe(40, 'solide', 90));
      const dedans = jours >= 3;
      expect(restePlan(c, JOUR_D)).toEqual(dedans ? [A] : []);
      expect(detteTeil(c, JOUR_D), `${jours} jour(s)`).toBeCloseTo(dedans ? 1 / 3 : 0, 6);
      const tasks = buildTasks({ config: cfgDe(rngDe(1)), date: JOUR_D, cases: [CORPUS[0] as Case], progress: new Map([[CORPUS[0].id, { ...c, caseId: CORPUS[0].id }]]), trainingEvents: [], begriffe: [], now: morning(JOUR_D) }, () => 'x');
      const sim = tasks.filter((t) => t.kind === 'simulation');
      expect(sim.length === 1, `${jours} jour(s) : le cas est planifié ssi un Teil peut progresser`).toBe(dedans);
      if (dedans) expect(sim[0].teile).toEqual([A]);
    }
  });

  it('la dette = Σ poids / 3 sur restePlan : 1 par Teil, POIDS_CONSOLIDATION pour un Teil « à confirmer »', () => {
    const aConfirmer = { ...teilDe(40, 'acquis', 85), solideDes: '2026-10-01' };
    const c = cp(aConfirmer, teilDe(40), teilDe(40, 'solide', 90));
    expect(detteTeil(c, JOUR_D)).toBeCloseTo((POIDS_CONSOLIDATION + 1) / 3, 6);
    expect(detteTeil(undefined, JOUR_D)).toBe(1);
  });
});

const rngDe = (seed: number): Rng => rng(seed);

// ================================================================== INV-55

describe('INV-55 — le plan d’un jour ne dépend que de ce qui PRÉCÈDE ce jour', () => {
  /** Un journal antérieur au jour D : parties, révisions SRS, une configuration. */
  function journalAvant(r: Rng, cfg: ProgramConfig): { events: ProgressEvent[]; srs: Map<string, Srs> } {
    const events: ProgressEvent[] = [];
    const srs = new Map<string, Srs>();
    events.push({ id: 'cfg0', user_id: 'u', type: 'program.configured', subject_id: null, payload: cfg, occurred_at: ISO(morning('2026-09-20')) });
    for (let i = 0, n = r.int(3, 22); i < n; i++) {
      const jour = addDaysISO(JOUR_D, -r.int(1, 24));
      const at = morning(jour, r.int(7, 21));
      const teile = r.bool(0.4) ? TEILE : TEILE.filter(() => r.bool(0.5));
      const sim = simulationOf(`h${i}`, r.pick(CORPUS).id, at, teile.length ? teile : [A], r.int(25, 98));
      events.push({ id: `ph${i}`, user_id: 'u', type: 'simulation.completed', subject_id: sim.id, payload: sim, occurred_at: ISO(at + 600_000) });
    }
    for (let i = 0, n = r.int(0, 12); i < n; i++) {
      const id = `fb${r.int(0, 29)}`;
      const at = morning(addDaysISO(JOUR_D, -r.int(1, 10)), 9);
      const s: Srs = { interval: 2, easeFactor: 2.5, dueDate: morning(addDaysISO(JOUR_D, r.int(-2, 2)), 8), repetitions: 1, lapses: 0, state: 'Gelernt' };
      events.push({ id: `ps${i}`, user_id: 'u', type: 'srs.reviewed', subject_id: id, payload: s, occurred_at: ISO(at) });
      srs.set(id, s);
    }
    return { events, srs };
  }

  /** Ce qui arrive LE JOUR D lui-même : parties, coches, révisions SRS, réglages, `program.configured`. */
  function evenementsDuJour(r: Rng, cfg: ProgramConfig): { events: ProgressEvent[]; srs: Map<string, Srs>; cfg: ProgramConfig } {
    const events: ProgressEvent[] = [];
    const srs = new Map<string, Srs>();
    for (let i = 0, n = r.int(1, 6); i < n; i++) {
      const at = morning(JOUR_D, r.int(0, 22)) + r.int(0, 3_000_000);
      const teile = r.bool(0.5) ? TEILE : TEILE.filter(() => r.bool(0.5));
      const sim = simulationOf(`e${i}`, r.pick(CORPUS).id, at, teile.length ? teile : [F], r.int(20, 98));
      events.push({ id: `pe${i}`, user_id: 'u', type: 'simulation.completed', subject_id: sim.id, payload: sim, occurred_at: ISO(at + 600_000) });
    }
    if (r.bool(0.5)) events.push({ id: 'pc', user_id: 'u', type: 'training.logged', subject_id: 'tc', occurred_at: ISO(morning(JOUR_D, 10)), payload: { at: morning(JOUR_D, 10), kind: 'drill', teile: [], source: 'libre', spentMin: 9 } });
    for (let i = 0, n = r.int(0, 8); i < n; i++) {
      const id = `fb${r.int(0, 29)}`;
      const s: Srs = { interval: 5, easeFactor: 2.6, dueDate: morning(addDaysISO(JOUR_D, 5), 8), repetitions: 2, lapses: 0, state: 'Gelernt' };
      events.push({ id: `pr${i}`, user_id: 'u', type: 'srs.reviewed', subject_id: id, payload: s, occurred_at: ISO(morning(JOUR_D, r.int(6, 20))) });
      srs.set(id, s);
    }
    if (r.bool(0.5)) events.push({ id: 'pset', user_id: 'u', type: 'srs.settings_changed', subject_id: 'srs', payload: { mode: 'manual', newPerDay: r.int(0, 3) }, occurred_at: ISO(morning(JOUR_D, 9)) });
    const nouvelle = r.bool(0.6) ? { ...cfg, hoursPerSession: r.pick([1, 4, 5]), intensity: r.pick(['leicht', 'intensiv'] as const) } : cfg;
    if (nouvelle !== cfg) events.push({ id: 'pcfg1', user_id: 'u', type: 'program.configured', subject_id: null, payload: nouvelle, occurred_at: ISO(morning(JOUR_D, 11)) });
    return { events, srs, cfg: nouvelle };
  }

  async function monde(cfgMeta: ProgramConfig, journal: { events: ProgressEvent[]; srs: Map<string, Srs> }, jour?: { events: ProgressEvent[]; srs: Map<string, Srs> }) {
    await resetWorld();
    await db.fachbegriffe.bulkPut(begriffe(30).map((b) => ({ ...b, srs: jour?.srs.get(b.id) ?? journal.srs.get(b.id) ?? b.srs })));   // l'état LIVE : celui que le code actuel lit
    await db.meta.bulkPut([{ key: 'program', value: cfgMeta }, { key: 'program.at', value: morning(JOUR_D, 23) }]);
    await db.progress_events.bulkPut([...journal.events, ...(jour?.events ?? [])]);
    await rebuildJournal();                           // case_progress, training_events : le live contient le jour D
  }

  const plan = (at: number, date = JOUR_D) => { const advance = startOn(date); advance(at - morning(date)); return ensureDayPlan(date); };

  it('mêmes événements antérieurs ⇒ même plan, quels que soient les événements DU jour et l’instant de matérialisation dans [00:00, 23:59]', async () => {
    const vus = { plans: 0, taches: 0, differentsSiLu: 0 };
    await forAll(40, async (r, seed) => {
      const cfg = cfgDe(r, { modus: r.pick<Fortschrittsmodus | undefined>([undefined, 'cas-complet', 'teil-first']), hoursPerSession: r.pick([2, 3]), intensity: 'mittel' });
      const J = journalAvant(r, cfg);
      const E = evenementsDuJour(r, cfg);

      await monde(cfg, J);
      const p0 = (await plan(morning(JOUR_D, 8)))!;
      await monde(E.cfg, J, E);                       // meta = la config modifiée AU COURS du jour D ; le journal contient E
      const t1 = morning(JOUR_D, 0) + r.int(60_000, 24 * 3600_000 - 120_000);
      const p1 = (await plan(t1))!;

      expect(p1.tasks.map(strip), `graine ${seed} : le plan dépend d'événements du jour D ou de l'instant (${ISO(t1)})`).toEqual(p0.tasks.map(strip));
      expect(p1.mode, `graine ${seed} : mode`).toBe(p0.mode);
      expect(p1.targetMin, `graine ${seed} : budget`).toBe(p0.targetMin);
      expect(p1.tz).toBe(fuseauLocal());
      vus.plans++; vus.taches += p0.tasks.length;
    });
    expect(vus.plans).toBe(40); expect(vus.taches).toBeGreaterThan(120);
  }, 600_000);

  it('une partie jouée LE JOUR D ne retire pas le cas du plan de D (elle compte pour le plan de D+1)', async () => {
    const cfg = cfgDe(rngDe(3), { modus: 'cas-complet', hoursPerSession: 3 });
    const J = journalAvant(rngDe(5), cfg);
    await monde(cfg, J);
    const p0 = (await plan(morning(JOUR_D, 8)))!;
    const cible = p0.tasks.find((t) => t.kind === 'simulation')!;
    const sim = simulationOf('jouer', cible.caseId!, morning(JOUR_D, 7), TEILE, 95);
    await monde(cfg, J, { events: [{ id: 'pj', user_id: 'u', type: 'simulation.completed', subject_id: 'jouer', payload: sim, occurred_at: ISO(morning(JOUR_D, 7) + 600_000) }], srs: new Map() });
    const p1 = (await plan(morning(JOUR_D, 12)))!;
    expect(p1.tasks.some((t) => t.caseId === cible.caseId), 'la partie du jour D a retiré le cas du plan de D').toBe(true);
    const lendemain = addDaysISO(JOUR_D, 1);
    const p2 = (await plan(morning(lendemain, 8), lendemain))!;
    expect(p2.tasks.find((t) => t.caseId === cible.caseId)?.teile ?? [], 'le lendemain, le cas joué la veille (Teile non solides, joués il y a < 3 jours) n’est plus à planifier').toEqual([]);
  });
});

// ================================================================== INV-57

describe('INV-57 — le mode : explicite pour deux, observé en silence pour le reste', () => {
  const ev = (id: string, at: number, teile: SimTeil[], over: Partial<TrainingEvent> = {}): TrainingEvent =>
    ({ id, at, kind: 'simulation', caseId: `c${id}`, teile, source: 'libre', spentMin: 10, scores: Object.fromEntries(teile.map((t) => [t, 70])), ...over });
  const cases = CORPUS.slice(0, 40) as Case[];

  it('`examen-blanc` et `specialite` explicites sont respectés ; le reste est observé, dans {cas-complet, teil-first}', async () => {
    const vus = { teil: 0, cas: 0, exam: 0, spec: 0 };
    await forAll(300, (r) => {
      const modus = r.pick<Fortschrittsmodus | undefined>([undefined, 'teil-first', 'cas-complet', 'specialite', 'examen-blanc']);
      const events: TrainingEvent[] = Array.from({ length: r.int(0, 14) }, (_, i) =>
        ev(String(i).padStart(3, '0'), 1_790_000_000_000 + i * 3_600_000, r.bool(0.45) ? [r.pick(TEILE)] : TEILE.filter(() => r.bool(0.6)).concat([A]).slice(0, 3),
          { ...(r.bool(0.4) ? { kind: 'examen-blanc' as const, caseId: `c${i}` } : {}), caseId: cases[r.int(0, 5)].id }));
      const cfg = { ...cfgDe(r), modus } as ProgramConfig;           // `modus` absent ⇒ mode observé
      const mode = modeDuJour(cfg, events, cases);
      if (modus === 'examen-blanc' || modus === 'specialite') { expect(mode).toBe(modus); modus === 'specialite' ? vus.spec++ : vus.exam++; return; }
      expect(['cas-complet', 'teil-first'], `l'observation ne rend jamais ${mode}`).toContain(mode);
      mode === 'teil-first' ? vus.teil++ : vus.cas++;
    });
    expect(vus.teil).toBeGreaterThan(5); expect(vus.cas).toBeGreaterThan(30); expect(vus.exam).toBeGreaterThan(20); expect(vus.spec).toBeGreaterThan(20);
  });

  it('un `teil-first` EXPLICITE (ou `strategy` série 3) devient `cas-complet` ; l’observation peut le retrouver', () => {
    const vide: TrainingEvent[] = [];
    expect(modeDuJour({ ...cfgDe(rngDe(1)), modus: 'teil-first' } as ProgramConfig, vide, cases)).toBe('cas-complet');
    expect(modeDuJour({ ...cfgDe(rngDe(1)), strategy: 'teil-first' } as ProgramConfig, vide, cases)).toBe('cas-complet');
    expect(modeDuJour({ ...cfgDe(rngDe(1)), strategy: 'full' } as ProgramConfig, vide, cases)).toBe('cas-complet');
    // L'usage observé : une seule partie à la fois, la même, sur des cas différents.
    const parties = Array.from({ length: 6 }, (_, i) => ev(`t${i}`, 1_790_000_000_000 + i * 3_600_000, [D], { caseId: cases[i].id }));
    expect(modeDuJour({ ...cfgDe(rngDe(1)), modus: 'teil-first' } as ProgramConfig, parties, cases)).toBe('teil-first');
  });

  it('pas de boucle : des examens à blanc PLANIFIÉS ne font pas observer « examen-blanc » (brut, observeModus le rend)', () => {
    const exams = Array.from({ length: 8 }, (_, i) => ev(`x${i}`, 1_790_000_000_000 + i * 3_600_000, TEILE, { kind: 'examen-blanc', caseId: cases[i].id }));
    expect(observeModus(exams, cases), 'le comportement brut de l’observation est celui de la boucle').toBe('examen-blanc');
    const cfg = cfgDe(rngDe(2)) as ProgramConfig;
    expect(modeDuJour(cfg, exams, cases)).toBe('cas-complet');
  });

  it('le mode figé dans le plan est celui du journal ANTÉRIEUR au jour (les événements du jour ne le changent pas)', async () => {
    const cfg = cfgDe(rngDe(4), { modus: undefined });
    await ecrireConfig(cfg);
    for (let i = 0; i < 6; i++) {                                                  // avant D : une partie à la fois, sur des cas différents
      const at = morning(addDaysISO(JOUR_D, -6 + i), 10);
      const sim = simulationOf(`a${i}`, CORPUS[i].id, at, [D], 80);
      await db.progress_events.put({ id: `pa${i}`, user_id: 'u', type: 'simulation.completed', subject_id: sim.id, payload: sim, occurred_at: ISO(at + 600_000) });
    }
    await rebuildJournal();
    startOn(JOUR_D);
    const plan0 = (await ensureDayPlan(JOUR_D))!;
    expect(plan0.mode).toBe('teil-first');
    await resetWorld(); await ecrireConfig(cfg);
    for (let i = 0; i < 6; i++) {                                                  // même passé…
      const at = morning(addDaysISO(JOUR_D, -6 + i), 10);
      const sim = simulationOf(`a${i}`, CORPUS[i].id, at, [D], 80);
      await db.progress_events.put({ id: `pa${i}`, user_id: 'u', type: 'simulation.completed', subject_id: sim.id, payload: sim, occurred_at: ISO(at + 600_000) });
    }
    for (let i = 0; i < 12; i++) {                                                 // …mais LE JOUR D, des parties complètes d'un trait
      const at = morning(JOUR_D, 1) + i * 60_000;
      const sim = simulationOf(`j${i}`, CORPUS[20 + i].id, at, TEILE, 80);
      await db.progress_events.put({ id: `pj${i}`, user_id: 'u', type: 'simulation.completed', subject_id: sim.id, payload: sim, occurred_at: ISO(at + 600_000) });
    }
    await rebuildJournal();
    startOn(JOUR_D);
    expect((await ensureDayPlan(JOUR_D))!.mode).toBe('teil-first');
  });
});

// ================================================================== INV-58

describe('INV-58 — le budget : une seule tâche forcée par jour, puis remplissage glouton sur les estMin réels', () => {
  const cfgBudget = (extra: Partial<ProgramConfig> = {}) => ({ startDate: '2026-10-05', examDate: '2026-12-18', intensity: 'mittel', hoursPerSession: 2, offDays: [0, 6], prioritySpecialties: [], selfLevel: {}, createdAt: 0, ...extra }) as ProgramConfig;
  const bi = (budgetMin: number, over: Partial<BuildInput> = {}): BuildInput =>
    ({ config: cfgBudget(), date: JOUR_D, cases: CORPUS as Case[], progress: new Map(), trainingEvents: [], begriffe: [], now: morning(JOUR_D), budgetMin, ...over });

  const depassements = (tasks: TaskInstance[], budget: number) => {
    let used = 0; const forcees: TaskInstance[] = [];
    for (const t of tasks) { if (used + t.estMin > budget) forcees.push(t); used += t.estMin; }
    return { used, forcees };
  };

  it('cas vierges (Σ ≈ 52 min), budgets de 15 à 180 min : au plus UNE tâche dépasse, et c’est la première tâche de cas', () => {
    for (const budget of [15, 20, 30, 40, 51, 52, 53, 60, 90, 104, 120, 156, 180]) {
      const tasks = buildTasks(bi(budget), () => `i${Math.random()}`);
      const cas = tasks.filter((t) => CAS_KINDS.has(t.kind));
      const { forcees, used } = depassements(tasks, budget);
      expect(forcees.length, `budget ${budget} : ${forcees.length} tâches dépassent`).toBeLessThanOrEqual(1);
      if (forcees.length) expect(forcees[0].id, `budget ${budget} : la tâche forcée n'est pas la première tâche de cas`).toBe(cas[0].id);
      expect(cas.length, `budget ${budget} : la première tâche de cas est posée même au-delà du budget`).toBeGreaterThanOrEqual(1);
      // À la fin du remplissage, aucun candidat restant ne tient dans le budget restant.
      expect(budget - used, `budget ${budget} : il reste ${budget - used} min, un cas (${SOMME_TEIL_MIN}) tiendrait`).toBeLessThan(SOMME_TEIL_MIN);
    }
  });

  it('remplissage glouton sur des estMin HÉTÉROGÈNES : le premier candidat qui ne tient pas n’arrête pas le remplissage', async () => {
    let courts = 0;
    await forAll(30, (r, seed) => {
      // des cas dont il ne reste qu'un Teil (estMin 12, 20) mêlés à des cas vierges (52)
      const progress = new Map<string, CaseProgress>();
      const cas = CORPUS.slice(0, 60) as Case[];
      for (const c of cas) {
        const reste = r.shuffle(TEILE).slice(0, r.pick([1, 1, 2, 3]));
        const teile = Object.fromEntries(TEILE.map((t) => [t, reste.includes(t)
          ? { status: 'vierge', lastScore: null, lastAt: null, attempts: 0 }
          : { status: 'solide', lastScore: 90, lastAt: morning('2026-09-01'), attempts: 2 }]));
        progress.set(c.id, { caseId: c.id, teile, overall: 'entame', couverture: 3, maitrise: 90, etat: 'couvert', solideDepuis: null, pretAt: null, prochaineConsolidation: null, pretManque: [] } as unknown as CaseProgress);
      }
      const budget = r.int(15, 180);
      const tasks = buildTasks(bi(budget, { cases: cas, progress }), () => `i${seed}${Math.random()}`);
      const { forcees, used } = depassements(tasks, budget);
      expect(forcees.length, `graine ${seed}, budget ${budget}`).toBeLessThanOrEqual(1);
      const planifies = new Set(tasks.map((t) => t.caseId).filter(Boolean));
      const room = budget - used;
      const plusPetit = Math.min(...cas.filter((c) => !planifies.has(c.id)).map((c) => resteOracle(progress.get(c.id), JOUR_D).reduce((s, t) => s + TEIL_MIN[t], 0)));
      expect(room, `graine ${seed}, budget ${budget} : il reste ${room} min et un candidat de ${plusPetit} min ne tient pas… ou est oublié`).toBeLessThan(plusPetit);
      if (tasks.some((t) => t.kind === 'simulation' && t.estMin < SOMME_TEIL_MIN)) courts++;
    });
    expect(courts, 'des tâches courtes ont bien été planifiées').toBeGreaterThan(15);
  });

  it('mode `examen-blanc` explicite : l’examen à blanc est la tâche forcée, dépasse le budget, et rien d’autre ne l’est en plus', () => {
    for (const budget of [15, 40, 60, 90]) {
      const tasks = buildTasks(bi(budget, { config: cfgBudget({ modus: 'examen-blanc' }) }), () => `i${Math.random()}`);
      const exam = tasks.filter((t) => t.kind === 'examen-blanc');
      expect(exam.length, `budget ${budget}`).toBe(1);
      expect(exam[0].estMin).toBe(SOMME_TEIL_MIN);
      expect(exam[0].layer).toBe(3); expect(exam[0].assistance).toBe('autonome');
      expect(depassements(tasks, budget).forcees.length).toBeLessThanOrEqual(1);
      expect(tasks.filter((t) => t.kind === 'simulation' || t.kind === 'revision'), 'une tâche de cas FORCÉE en plus de l’examen à blanc').toEqual([]);
    }
  });

  it('dernière ligne droite : l’examen à blanc est la tâche forcée, les tâches de cas respectent le budget (m-c)', () => {
    const cfg = cfgBudget({ examDate: '2026-10-20' });
    const jour = [...taperDays(cfg)][1];
    for (const budget of [30, 60, 120, 200]) {
      const tasks = buildTasks(bi(budget, { config: cfg, date: jour }), () => `i${Math.random()}`);
      expect(tasks.filter((t) => t.kind === 'examen-blanc').length, `budget ${budget} : un examen à blanc`).toBe(1);
      let used = 0;
      for (const t of tasks) {
        used += t.estMin;
        if (t.kind === 'simulation' || t.kind === 'revision') expect(used, `budget ${budget} : « ${t.label} » dépasse alors que l’examen à blanc est la tâche forcée`).toBeLessThanOrEqual(budget);
      }
    }
  });
});

// ================================================================== INV-60

describe('INV-60 — la consolidation espacée : un cas solide revient à son échéance, pas avant', () => {
  const un = CORPUS[0] as Case;
  const mesure = (id: string, jour: string, s = 88, h = 10): TrainingEvent =>
    ({ id, at: morning(jour, h), kind: 'simulation', caseId: un.id, teile: TEILE, source: 'libre', spentMin: 30, scores: { anamnese: s, dokumentation: s, fallvorstellung: s } });
  const ctxDe = (events: TrainingEvent[], jour: string) => {
    const progress = new Map(computeCaseProgress(events).map((p) => [p.caseId, p]));
    const lastPlayedAt = new Map<string, number>(); for (const e of events) lastPlayedAt.set(e.caseId!, Math.max(lastPlayedAt.get(e.caseId!) ?? 0, e.at));
    return { progress, ctx: { daysUntilExam: 60, freqMax: 26, now: debutJour(jour), jour, lastPlayedAt, progress } };
  };
  const planDe = (events: TrainingEvent[], jour: string, over: Partial<BuildInput> = {}) => {
    const { progress } = ctxDe(events, jour);
    return buildTasks({ config: cfgDe(rngDe(1), { modus: 'cas-complet', hoursPerSession: 3, examDate: '2027-06-30', offDays: [] }), date: jour, cases: [un], progress, trainingEvents: events.filter((e) => e.at < debutJour(jour)), begriffe: [], now: morning(jour), ...over }, () => `i${Math.random()}`);
  };

  it('score > 0 à toute date ≥ prochaineConsolidation, 0 avant ; échéances successives à 7, 21, 45, 45 jours', () => {
    let evs: TrainingEvent[] = [mesure('a', '2026-09-01'), mesure('b', '2026-09-04')];       // solide au 4 sept.
    const ecarts: number[] = [];
    let precedent = '2026-09-04';
    for (let echeance = 0; echeance < 5; echeance++) {
      const cp = computeCaseProgress(evs)[0];
      expect(cp.etat).toBe('solide');
      const due = cp.prochaineConsolidation!;
      ecarts.push(Math.round((Date.parse(`${due}T12:00:00Z`) - Date.parse(`${precedent}T12:00:00Z`)) / 86_400_000));
      const veille = addDaysISO(due, -1);
      expect(rankCandidates([un], ctxDe(evs, veille).ctx), `échéance ${due} : le cas revient avant l'heure (le ${veille})`).toEqual([]);
      const ranked = rankCandidates([un], ctxDe(evs, due).ctx);
      expect(ranked.length, `échéance ${due} : le cas ne revient pas`).toBe(1);
      expect(ranked[0].score).toBeGreaterThan(0);
      for (const apres of [due, addDaysISO(due, 3)]) expect(rankCandidates([un], ctxDe(evs, apres).ctx).length, `après l'échéance (${apres})`).toBe(1);
      const tasks = planDe(evs, due);
      expect(tasks.filter((t) => t.kind === 'revision' && t.caseId === un.id), `${due} : la tâche est une révision`).toHaveLength(1);
      expect(planDe(evs, veille).filter((t) => t.caseId === un.id), `${veille} : le cas n'est pas au plan`).toEqual([]);
      const rev = tasks.find((t) => t.kind === 'revision')!;
      expect(rev.teile).toEqual([A, D, F]); expect(rev.reason).toMatch(/^Consolidation : vu il y a \d+ jours?$/);
      precedent = due;
      evs = [...evs, mesure(`r${echeance}`, due)];                 // rejoué À l'échéance, les trois Teile ≥ 80
    }
    expect(ecarts, 'la suite s’élargit : 7, puis 21, puis 45, plafonnée').toEqual([7, 21, 45, 45, 45]);
  });

  it('un cas solide pèse POIDS_CONSOLIDATION à l’échéance (le score d’un cas dû)', () => {
    const evs = [mesure('a', '2026-09-01'), mesure('b', '2026-09-04')];
    const cp = computeCaseProgress(evs)[0];
    const due = cp.prochaineConsolidation!;
    const { ctx } = ctxDe(evs, due);
    const [s] = rankCandidates([un], ctx);
    expect(s.parts.dette).toBeCloseTo(POIDS_CONSOLIDATION, 6);
  });

  it('« d’un trait » : une tâche dUnTrait seulement si D_UN_TRAIT_ACTIF — la garde livrée est fausse', () => {
    expect(D_UN_TRAIT_ACTIF, 'la garde ne passe à true que dans le commit qui déploie S4-3').toBe(false);
    const frequents = (CORPUS as Case[]).filter((c) => c.frequency >= 26 * SEUIL_FREQUENT).slice(0, 4);
    // des cas solides non prêts, dont l'échéance est passée, à 8 jours ouvrés de l'examen
    const examen = '2026-10-30';
    const cfg = cfgDe(rngDe(1), { modus: 'cas-complet', examDate: examen, hoursPerSession: 4 });
    const evs: TrainingEvent[] = frequents.flatMap((c, i) => [
      { ...mesure(`s${i}a`, '2026-09-01'), caseId: c.id }, { ...mesure(`s${i}b`, '2026-09-04'), caseId: c.id },
    ]);
    const progress = new Map(computeCaseProgress(evs).map((p) => [p.caseId, p]));
    const jour = '2026-10-21';
    const base: BuildInput = { config: cfg, date: jour, cases: frequents, progress, trainingEvents: evs, begriffe: [], now: morning(jour) };
    const defaut = buildTasks(base, () => `i${Math.random()}`);
    expect(defaut.some((t) => t.kind === 'revision'), 'la fenêtre contient des révisions dues').toBe(true);
    expect(defaut.some((t) => t.dUnTrait), 'dUnTrait émis avec la garde à false').toBe(false);
    const actif = buildTasks({ ...base, dUnTraitActif: true }, () => `i${Math.random()}`);
    const revs = actif.filter((t) => t.kind === 'revision');
    expect(revs.length).toBeGreaterThan(0);
    for (const t of revs) expect(t.dUnTrait, `la révision d'un cas fréquent porte dUnTrait dans la fenêtre (garde vraie)`).toBe(true);
    // hors fenêtre (plus de 15 jours ouvrés avant l'examen) : jamais, même garde vraie
    const loin = buildTasks({ ...base, date: '2026-10-05', dUnTraitActif: true, now: morning('2026-10-05') }, () => `i${Math.random()}`);
    expect(loin.some((t) => t.dUnTrait)).toBe(false);
  });
});
