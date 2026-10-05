// C6 — ce que le programme APPREND du candidat (S4-2). Contrat : training-journal.md §13.3, §13.4, §13.5, §12.10 ; ADR-0022 §3 à §5.
//
//   INV-63  erreurs transversales : un item signalé a été manqué dans ≥ 3 des 5 dernières `partieAvecChecklist` de son Teil,
//           sur ≥ 2 cas distincts ; au plus UN rappel par tâche de cas, jamais sur un examen à blanc ni une tâche d'un trait
//   INV-64  durées apprises : médiane des 10 dernières mesures du Teil, repli `TEIL_MIN` sous 3 mesures, bornée à [5, 45]
//   INV-65  aucun changement de budget sans geste ; la proposition n'est jamais à la hausse, ni sous 20 min ; deux refus = fin
//   INV-76  (c) `accepterRythme` produit une config que `lireConfig` accepte, même à 20 min en intensité haute
//
// Les ORACLES sont réécrits ici à la lettre du contrat : jamais les fonctions qu'ils jugent.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/auth/session', async () => (await import('./helpers/mocks')).authMock());
vi.mock('@/lib/sync/queue', async () => (await import('./helpers/mocks')).queueMock());
vi.mock('@/lib/supabase', async () => (await import('./helpers/mocks')).supabaseMock());
vi.setConfig({ testTimeout: 60_000, hookTimeout: 60_000 });

import { db } from '@/db/db';
import { checklistFor } from '@/lib/checklists';
import { buildTasks, dayTargetMin, type BuildInput } from '@/lib/program/dayPlan';
import { fenetreDUnTrait, taperDays } from '@/lib/program/calendrier';
import { dureeTeil } from '@/lib/program/durees';
import { erreursTransversales, texteRappel } from '@/lib/program/erreurs';
import { rattrapageAProposer } from '@/lib/program/rattrapage';
import { accepterRythme, consequenceRythme, proposerRythme, refuserRythme, semaineIso } from '@/lib/program/rythme';
import { lireTache, teileDeTache } from '@/lib/program/tacheDeCas';
import { INTENSITY_FACTOR } from '@/lib/intensity';
import { BUDGET_PLANCHER_MIN, SESSION_MAX_MIN, SESSION_MIN_MIN, SESSION_PAS_MIN, DUREE_BORNES, DUREE_FENETRE, DUREE_MIN_MESURES, ERREUR_CAS_MIN, ERREUR_FENETRE, ERREUR_SEUIL, RYTHME_MIN_JOURS, RYTHME_SEUIL, TEIL_MIN } from '@/lib/program/parametres';
import { ecrireConfig, lireConfig, refusRythme } from '@/lib/sync/configProjetee';
import type { Case, CaseProgress, DayPlan, ProgramConfig, SimTeil, TaskInstance, TrainingEvent } from '@/db/types';
import { forAll } from './helpers/prop';
import { CORPUS, TEILE, addDaysISO, morning, resetTime, resetWorld, startOn } from './helpers/world';

beforeEach(() => resetWorld());
afterEach(() => resetTime());

const A: SimTeil = 'anamnese', D: SimTeil = 'dokumentation', F: SimTeil = 'fallvorstellung';
const JOUR = '2026-10-12';
const cases = CORPUS.slice(0, 60) as Case[];

let seq = 0;
const partie = (over: Partial<TrainingEvent> & { teile: SimTeil[] }): TrainingEvent => ({
  id: `p${String(++seq).padStart(6, '0')}`, at: 1_790_000_000_000 + seq * 3_600_000, kind: 'simulation', caseId: 'c1', source: 'libre', spentMin: 10,
  scores: Object.fromEntries(over.teile.map((t) => [t, 70])), ...over,
});
const mesuree = (e: TrainingEvent) =>
  (e.kind === 'simulation' || e.kind === 'examen-blanc') && !!e.caseId && e.selbstbewertet !== true && !!e.scores && Object.keys(e.scores).length > 0;
const chrono = (a: TrainingEvent, b: TrainingEvent) => a.at - b.at || (a.id < b.id ? -1 : 1);

// ---------------------------------------------------------------------- INV-64

/** L'oracle des durées (§13.4), réécrit à part : médiane des `DUREE_FENETRE` dernières mesures > 0 de `partieMesuree`. */
function dureeOracle(t: SimTeil, events: TrainingEvent[]): number {
  const mesures = events.filter((e) => mesuree(e) && (e.minutesParTeil?.[t] ?? 0) > 0)
    .sort(chrono).slice(-DUREE_FENETRE).map((e) => e.minutesParTeil![t]!);
  if (mesures.length < DUREE_MIN_MESURES) return TEIL_MIN[t];
  const tri = [...mesures].sort((a, b) => a - b);
  const m = tri.length % 2 ? tri[(tri.length - 1) / 2] : (tri[tri.length / 2 - 1] + tri[tri.length / 2]) / 2;
  return Math.min(DUREE_BORNES[1], Math.max(DUREE_BORNES[0], Math.round(m)));
}

describe('INV-64 — les durées sont apprises : médiane des mesures, repli sous 3 mesures, bornes [5, 45]', () => {
  it('dureeTeil = l’oracle, sur des mesures aléatoires dont une valeur aberrante de 300 min, des séances IA externe et des durées nulles', async () => {
    const vus = { repli: 0, mediane: 0, bornes: 0, ignorees: 0 };
    await forAll(300, (r, seed) => {
      const events: TrainingEvent[] = Array.from({ length: r.int(0, 16) }, () => {
        const teile = r.bool(0.5) ? TEILE : TEILE.filter(() => r.bool(0.5));
        const minutesParTeil = Object.fromEntries(teile.map((t) => [t, r.pick([0, 1, 3, 8, 12, 15, 18, 22, 30, 45, 60, 300])]));
        const selbst = r.bool(0.15);
        if (selbst) vus.ignorees++;
        return partie({ teile: teile.length ? teile : [A], minutesParTeil, ...(selbst ? { selbstbewertet: true } : {}), ...(r.bool(0.1) ? { scores: undefined } : {}), at: 1_790_000_000_000 + r.int(0, 20) * 86_400_000 });
      });
      for (const t of TEILE) {
        const att = dureeOracle(t, events), lu = dureeTeil(t, events);
        expect(lu, `graine ${seed}, ${t}`).toBe(att);
        if (att === TEIL_MIN[t]) vus.repli++; else vus.mediane++;
        if (lu === DUREE_BORNES[1] || lu === DUREE_BORNES[0]) vus.bornes++;
        expect(lu).toBeGreaterThanOrEqual(DUREE_BORNES[0]); expect(lu).toBeLessThanOrEqual(DUREE_BORNES[1]);
      }
    });
    expect(vus.repli).toBeGreaterThan(100); expect(vus.mediane).toBeGreaterThan(100); expect(vus.ignorees).toBeGreaterThan(50);
    expect(vus.bornes, 'les bornes ont été atteintes').toBeGreaterThan(10);
  });

  it('une partie oubliée ouverte toute la nuit (300 min) ne fausse pas l’estimation : médiane, pas moyenne', () => {
    const events = [10, 12, 11, 300, 13].map((m, i) => partie({ teile: [A], minutesParTeil: { anamnese: m }, at: 1_790_000_000_000 + i * 86_400_000 }));
    expect(dureeTeil(A, events)).toBe(12);                                    // la moyenne donnerait 69 → plafonnée à 45
    expect(dureeTeil(D, events), 'aucune mesure de la Dokumentation : le repli').toBe(TEIL_MIN.dokumentation);
  });

  it('sous trois mesures : le repli TEIL_MIN, même si les deux mesures sont nettes ; seules les DIX dernières comptent', () => {
    const deux = [30, 30].map((m, i) => partie({ teile: [F], minutesParTeil: { fallvorstellung: m }, at: 1_790_000_000_000 + i }));
    expect(dureeTeil(F, deux)).toBe(TEIL_MIN.fallvorstellung);
    expect(dureeTeil(F, [...deux, partie({ teile: [F], minutesParTeil: { fallvorstellung: 30 }, at: 1_790_000_000_100 })])).toBe(30);
    const vieilles = Array.from({ length: 10 }, (_, i) => partie({ teile: [F], minutesParTeil: { fallvorstellung: 40 }, at: 1_790_000_000_000 + i }));
    const recentes = Array.from({ length: 10 }, (_, i) => partie({ teile: [F], minutesParTeil: { fallvorstellung: 9 }, at: 1_790_100_000_000 + i }));
    expect(dureeTeil(F, [...recentes, ...vieilles]), 'le candidat a accéléré : seules les dix dernières, dans l’ordre du temps').toBe(9);
  });

  // L'estimation d'une TÂCHE : Σ dureeTeil sur ses Teile ; une `simulation` observée « par Teil » = le Teil le plus probable seul ;
  // une `revision` et un examen à blanc = toujours les trois Teile (m-b).
  const cfg: ProgramConfig = { startDate: '2026-10-05', examDate: '2026-12-18', intensity: 'mittel', hoursPerSession: 6, offDays: [0, 6], prioritySpecialties: [], selfLevel: {}, createdAt: 0 } as ProgramConfig;
  const base = (over: Partial<BuildInput> = {}): BuildInput => ({ config: cfg, date: JOUR, cases: cases.slice(0, 12), progress: new Map(), trainingEvents: [], begriffe: [], now: morning(JOUR), ...over });
  const apprises = (caseId: string, i: number) => partie({ teile: TEILE, caseId, minutesParTeil: { anamnese: 14, dokumentation: 9, fallvorstellung: 17 }, at: 1_790_000_000_000 + i * 86_400_000 });

  it('cas-complet : estMin d’une `simulation` = Σ dureeTeil de ce qui reste', () => {
    const events = [0, 1, 2, 3].map((i) => apprises(`x${i}`, i));
    const sims = buildTasks(base({ trainingEvents: events }), () => `i${Math.random()}`).filter((t) => t.kind === 'simulation');
    expect(sims.length).toBeGreaterThan(0);
    for (const t of sims) expect(t.estMin).toBe(t.teile!.reduce((s, k) => s + dureeOracle(k, events), 0));
    expect(sims[0].estMin).toBe(14 + 9 + 17);
  });

  it('observé « par Teil » : estMin d’une `simulation` = le Teil le plus probable seul, la tâche reste un cas entier', () => {
    // une seule partie à la fois, la même (Dokumentation), sur des cas différents → teil-first observé, teilHabituel = Dokumentation
    const parties = cases.slice(20, 26).map((c, i) => partie({ teile: [D], caseId: c.id, minutesParTeil: { dokumentation: 11 }, at: 1_790_000_000_000 + i * 86_400_000 }));
    const sims = buildTasks(base({ trainingEvents: parties }), () => `i${Math.random()}`).filter((t) => t.kind === 'simulation');
    expect(sims.length).toBeGreaterThan(0);
    for (const t of sims) { expect(t.teile, 'la tâche reste un cas entier').toEqual([A, D, F]); expect(t.estMin, 'estimation sur la Dokumentation seule').toBe(dureeOracle(D, parties)); }
  });

  it('observé « par Teil » : un cas solide DÛ revient quand même, en `revision` des trois Teile à Σ dureeTeil ; l’examen à blanc aussi (m-b)', () => {
    const parties = cases.slice(20, 26).map((c, i) => partie({ teile: [D], caseId: c.id, minutesParTeil: { dokumentation: 11 }, at: 1_790_000_000_000 + i * 86_400_000 }));
    const trois = TEILE.reduce((s, t) => s + dureeOracle(t, parties), 0);
    const solide = cases[0];
    const progress = new Map<string, CaseProgress>([[solide.id, {
      caseId: solide.id, teile: Object.fromEntries(TEILE.map((t) => [t, { status: 'solide', lastScore: 90, lastAt: morning('2026-09-20'), attempts: 2 }])),
      overall: 'solide', couverture: 3, maitrise: 90, etat: 'solide', solideDepuis: morning('2026-09-20'), pretAt: null, prochaineConsolidation: '2026-10-01', pretManque: [],
    } as unknown as CaseProgress]]);
    const rev = buildTasks(base({ trainingEvents: parties, progress }), () => `i${Math.random()}`).find((t) => t.kind === 'revision');
    expect(rev, 'la consolidation d’un cas solide dû disparaît chez un candidat qui joue par Teil').toBeDefined();
    expect(rev!.teile).toEqual([A, D, F]);
    expect(rev!.estMin).toBe(trois);
    const veille = [...taperDays(cfg)][0];
    const exam = buildTasks(base({ trainingEvents: parties, date: veille, now: morning(veille) }), () => `i${Math.random()}`).find((t) => t.kind === 'examen-blanc');
    expect(exam!.estMin, 'un examen à blanc compte les trois Teile, même observé « par Teil »').toBe(trois);
  });

  it('un examen à blanc compte toujours Σ dureeTeil sur les trois Teile (MOCK_MIN disparaît)', () => {
    const events = [0, 1, 2].map((i) => apprises(`x${i}`, i));
    const tasks = buildTasks(base({ trainingEvents: events, config: { ...cfg, modus: 'examen-blanc' } as ProgramConfig }), () => `i${Math.random()}`);
    expect(tasks.find((t) => t.kind === 'examen-blanc')!.estMin).toBe(14 + 9 + 17);
  });

  it('« finir hier » : la reprise compte Σ dureeTeil de ce qui RESTE, pas une part de l’ancienne estimation', () => {
    const hier = '2026-10-09', aujourdhui = '2026-10-12';
    const historique = [0, 1, 2].map((i) => apprises(`x${i}`, i));
    const tache: TaskInstance = { id: 't-hier', date: hier, kind: 'simulation', caseId: 'cas-h', label: 'Cas H', teile: [A, D, F], estMin: 20, source: 'plan', reason: 'r', creeA: morning(hier, 7) };
    const jouee = partie({ teile: [A], caseId: 'cas-h', at: morning(hier, 10), minutesParTeil: { anamnese: 15 } });
    const plans: DayPlan[] = [
      { date: hier, materializedAt: morning(hier, 7), mode: 'teil-first', seed: 's', targetMin: 60, tasks: [tache] },
      { date: aujourdhui, materializedAt: morning(aujourdhui, 7), mode: 'cas-complet', seed: 's2', targetMin: 60, tasks: [] },
    ];
    const events = [...historique, jouee];
    const p = rattrapageAProposer(plans, aujourdhui, [], events)!;
    expect(p.tasks[0].teile).toEqual([D, F]);
    expect(p.tasks[0].estMin, 'la reprise d’une tâche estimée « par Teil » (20 min) compte vraiment D + F').toBe(dureeOracle(D, events) + dureeOracle(F, events));
  });
});

// ---------------------------------------------------------------------- INV-63

const ITEMS: Record<SimTeil, string[]> = { anamnese: checklistFor('anamnese').map((i) => i.id), dokumentation: checklistFor('dokumentation').map((i) => i.id), fallvorstellung: checklistFor('fallvorstellung').map((i) => i.id) };

/** L'oracle des erreurs transversales (§13.3). */
function signauxOracle(events: TrainingEvent[]): { teil: SimTeil; item: string }[] {
  const out: { teil: SimTeil; item: string }[] = [];
  for (const t of TEILE) {
    const fenetre = events.filter((e) => mesuree(e) && e.manques?.[t] !== undefined).sort(chrono).slice(-ERREUR_FENETRE);
    for (const item of new Set(fenetre.flatMap((e) => e.manques![t]!))) {
      const ou = fenetre.filter((e) => e.manques![t]!.includes(item));
      if (ou.length >= ERREUR_SEUIL && new Set(ou.map((e) => e.caseId)).size >= ERREUR_CAS_MIN) out.push({ teil: t, item });
    }
  }
  return out;
}

describe('INV-63 — erreurs transversales : le même item manqué dans ≥ 3 des 5 dernières parties, sur ≥ 2 cas', () => {
  it('erreursTransversales = l’oracle, sur des journaux de checklists aléatoires (un item manqué 3 fois sur le MÊME cas, parties d’avant le pont de checklist, séances IA)', async () => {
    const vus = { signaux: 0, sansChecklist: 0, ia: 0 };
    await forAll(300, (r, seed) => {
      const events: TrainingEvent[] = Array.from({ length: r.int(0, 12) }, () => {
        const teile = r.bool(0.4) ? TEILE : [r.pick(TEILE)];
        const manques: Partial<Record<SimTeil, string[]>> = {};
        for (const t of teile) if (r.bool(0.85)) manques[t] = ITEMS[t].filter((_, k) => k < 3 && r.bool(0.7)).concat(r.bool(0.3) ? [ITEMS[t][3]] : []);
        const sansChecklist = Object.keys(manques).length === 0;
        if (sansChecklist) vus.sansChecklist++;
        const ia = r.bool(0.1); if (ia) vus.ia++;
        return partie({ teile, caseId: r.pick(['c1', 'c1', 'c1', 'c2', 'c3']), at: 1_790_000_000_000 + r.int(0, 30) * 3_600_000, ...(sansChecklist ? {} : { manques }), ...(ia ? { selbstbewertet: true } : {}) });
      });
      const att = signauxOracle(events).map((s) => `${s.teil}:${s.item}`).sort();
      const lu = erreursTransversales(events).map((s) => `${s.teil}:${s.item}`).sort();
      expect(lu, `graine ${seed}`).toEqual(att);
      vus.signaux += att.length;
    });
    expect(vus.signaux).toBeGreaterThan(80); expect(vus.sansChecklist).toBeGreaterThan(50); expect(vus.ia).toBeGreaterThan(30);
  });

  it('le même item manqué 3 fois sur le MÊME cas n’est pas une erreur transversale ; sur deux cas, il l’est', () => {
    const manque = (caseId: string, i: number) => partie({ teile: [A], caseId, at: 1_790_000_000_000 + i * 3_600_000, manques: { anamnese: ['anam-allergien'] } });
    expect(erreursTransversales([0, 1, 2].map((i) => manque('c1', i)))).toEqual([]);
    expect(erreursTransversales([manque('c1', 0), manque('c2', 1), manque('c1', 2)])).toMatchObject([{ teil: A, item: 'anam-allergien', manques: 3, sur: 3, cas: 2 }]);
  });

  it('une partie sans checklist pour ce Teil (avant le pont, ids legacy) n’entre pas dans la fenêtre : elle ne dilue ni ne signale', () => {
    const sans = (i: number) => partie({ teile: [A], caseId: 'c9', at: 1_790_000_000_000 + (10 + i) * 3_600_000 });         // aucun `manques`
    const avec = (caseId: string, i: number) => partie({ teile: [A], caseId, at: 1_790_000_000_000 + i * 3_600_000, manques: { anamnese: ['anam-allergien'] } });
    expect(erreursTransversales([avec('c1', 0), avec('c2', 1), avec('c3', 2), sans(0), sans(1)])).toHaveLength(1);
    const ia = (caseId: string, i: number) => ({ ...avec(caseId, i), selbstbewertet: true });
    expect(erreursTransversales([ia('c1', 0), ia('c2', 1), ia('c3', 2)]), 'une séance IA externe ne mesure rien').toEqual([]);
  });

  it('seules les cinq DERNIÈRES parties comptent : l’item que le candidat a fini par cocher sort du signal', () => {
    const manque = (caseId: string, i: number) => partie({ teile: [A], caseId, at: 1_790_000_000_000 + i * 3_600_000, manques: { anamnese: ['anam-allergien'] } });
    const coche = (caseId: string, i: number) => partie({ teile: [A], caseId, at: 1_790_000_000_000 + i * 3_600_000, manques: { anamnese: [] } });
    const avant = [manque('c1', 0), manque('c2', 1), manque('c3', 2), coche('c1', 3), coche('c2', 4)];
    expect(erreursTransversales(avant)).toHaveLength(1);                       // 3 manques sur 5
    expect(erreursTransversales([...avant, coche('c3', 5)]), 'la fenêtre glisse : 2 manques sur 5').toEqual([]);
  });

  it('le texte est NEUTRE (T2) : il dit le fait, jamais le jugement', () => {
    const s = erreursTransversales([0, 1, 2, 3, 4].map((i) => partie({ teile: [A], caseId: `c${i % 2}`, at: 1_790_000_000_000 + i, manques: { anamnese: i < 3 ? ['anam-allergien'] : [] } })))[0];
    const t = texteRappel(s);
    expect(t).toMatch(/3 de tes 5 dernières Anamnesen/);
    expect(t).toMatch(/Allergien/);
    expect(t).not.toMatch(/échec|faute|erreur|toujours|encore|%|retard|faible|mauvais|oubli/i);
  });

  // --- ce que le PLAN en fait : au plus un rappel par tâche, figé avec elle ---
  const cfg: ProgramConfig = { startDate: '2026-10-05', examDate: '2026-12-18', intensity: 'intensiv', hoursPerSession: 6, offDays: [0, 6], prioritySpecialties: [], selfLevel: {}, createdAt: 0, modus: 'cas-complet' } as ProgramConfig;
  const base = (over: Partial<BuildInput> = {}): BuildInput => ({ config: cfg, date: JOUR, cases: cases.slice(0, 30), progress: new Map(), trainingEvents: [], begriffe: [], now: morning(JOUR), ...over });
  // Les trois cas les plus fréquents sont solides : dans la fenêtre « d'un trait », l'un d'eux revient d'un trait (§13.1).
  const solides = new Map<string, CaseProgress>([...cases.slice(0, 30)].sort((a, b) => b.frequency - a.frequency).slice(0, 3).map((c) => [c.id, {
    caseId: c.id, teile: Object.fromEntries(TEILE.map((t) => [t, { status: 'solide', lastScore: 90, lastAt: morning('2026-11-02'), attempts: 2 }])),
    overall: 'solide', couverture: 3, maitrise: 90, etat: 'solide', solideDepuis: morning('2026-11-02'), pretAt: null, prochaineConsolidation: '2026-11-09', pretManque: [],
  } as unknown as CaseProgress]));
  const FENETRE = '2026-12-01';                                            // dans la fenêtre « d'un trait », avant la dernière ligne droite

  it('au plus UN rappel par tâche de cas, d’un Teil de la tâche, jamais deux fois le même dans le jour, jamais sur un examen à blanc ni une tâche d’un trait', async () => {
    expect(fenetreDUnTrait(cfg).has(FENETRE) && !taperDays(cfg).has(FENETRE)).toBe(true);
    const vus = { rappels: 0, dUnTrait: 0, examens: 0 };
    await forAll(30, (r, seed) => {
      const items = [ITEMS.anamnese[0], ITEMS.anamnese[1], ITEMS.dokumentation[0], ITEMS.fallvorstellung[0]];
      const events: TrainingEvent[] = Array.from({ length: r.int(6, 14) }, (_, i) => {
        const manques: Partial<Record<SimTeil, string[]>> = { anamnese: items.slice(0, 2).filter(() => r.bool(0.8)), dokumentation: r.bool(0.7) ? [items[2]] : [], fallvorstellung: r.bool(0.7) ? [items[3]] : [] };
        return partie({ teile: TEILE, caseId: `x${i % 5}`, at: 1_790_000_000_000 + i * 86_400_000, manques });
      });
      const signaux = erreursTransversales(events);
      for (const actif of [false, true]) {
        for (const modus of ['cas-complet', 'examen-blanc'] as const) {
          for (const date of [JOUR, FENETRE, '2026-12-16']) {     // un jour ordinaire, la fenêtre « d'un trait », la dernière ligne droite
            const tasks = buildTasks(base({ trainingEvents: events, date, progress: solides, dUnTraitActif: actif, config: { ...cfg, modus } as ProgramConfig, now: morning(date) }), () => `i${Math.random()}`);
            const vusRappels = new Set<string>();
            vus.dUnTrait += tasks.filter((t) => t.dUnTrait && t.kind !== 'examen-blanc').length;
            vus.examens += tasks.filter((t) => t.kind === 'examen-blanc').length;
            for (const t of tasks) {
              if (t.rappel === undefined) continue;
              expect(['simulation', 'revision'], `graine ${seed} : rappel sur « ${t.kind} »`).toContain(t.kind);
              expect(t.dUnTrait, `graine ${seed} : rappel sur une tâche d'un trait`).toBeUndefined();
              expect(vusRappels.has(t.rappel), `graine ${seed} : le même rappel deux fois dans le jour`).toBe(false); vusRappels.add(t.rappel);
              const teil = TEILE.find((k) => ITEMS[k].includes(t.rappel!))!;
              expect(teileDeTache(t), `graine ${seed} : un rappel d'un Teil qui n'est pas dans la tâche`).toContain(teil);
              expect(signaux.some((s) => s.item === t.rappel), `graine ${seed} : un rappel sans signal`).toBe(true);
              expect(lireTache(t, { date })!.rappel, 'lireTache le conserve').toBe(t.rappel);
              vus.rappels++;
            }
            // Chaque signal dont le Teil figure dans une tâche éligible est dit une fois (« la tâche suivante qui contient ce Teil le dit »).
            const eligibles = tasks.filter((t) => (t.kind === 'simulation' || t.kind === 'revision') && !t.dUnTrait);
            if (eligibles.length >= signaux.length) {
              for (const s of signaux) if (eligibles.some((t) => teileDeTache(t).includes(s.teil))) expect(vusRappels.has(s.item), `graine ${seed} : signal ${s.item} tu`).toBe(true);
            }
          }
        }
      }
    });
    expect(vus.rappels, 'des rappels ont bien été posés').toBeGreaterThan(30);
    expect(vus.dUnTrait, 'des tâches de cas d’un trait ont bien été générées').toBeGreaterThan(10);
    expect(vus.examens).toBeGreaterThan(10);
  });

  it('le rappel ne lit que le journal ANTÉRIEUR au jour (INV-55) : il est le même à 8 h et à 18 h', () => {
    const events = [0, 1, 2].map((i) => partie({ teile: TEILE, caseId: `x${i}`, at: 1_790_000_000_000 + i * 86_400_000, manques: { anamnese: ['anam-allergien'] } }));
    const a = buildTasks(base({ trainingEvents: events, now: morning(JOUR, 8) }), () => 'i').map((t) => t.rappel);
    const b = buildTasks(base({ trainingEvents: events, now: morning(JOUR, 18) }), () => 'i').map((t) => t.rappel);
    expect(a).toEqual(b);
    expect(a).toContain('anam-allergien');
  });
});

// ---------------------------------------------------------------------- INV-65

describe('INV-65 — le rythme est PROPOSÉ, jamais appliqué : pas de budget changé sans geste', () => {
  const cfg = (over: Partial<ProgramConfig> = {}): ProgramConfig => ({ startDate: '2026-09-07', examDate: '2026-12-18', intensity: 'mittel', hoursPerSession: 2, offDays: [0, 6], prioritySpecialties: [], selfLevel: {}, createdAt: 0, ...over }) as ProgramConfig;
  const tache = (date: string): TaskInstance => ({ id: `t${date}`, date, kind: 'drill', label: 'Fachbegriffe', estMin: 10, source: 'plan', reason: 'r' });
  const plan = (date: string, targetMin: number, vide = false): DayPlan => ({ date, materializedAt: 0, mode: 'cas-complet', seed: 's', targetMin, tasks: vide ? [] : [tache(date)] });
  const minutes = (jour: string, spentMin: number, i = 0): TrainingEvent => ({ id: `m${jour}${i}`, at: morning(jour, 9 + i), kind: 'simulation', caseId: 'c1', teile: [A], source: 'libre', spentMin, scores: { anamnese: 70 } });
  const AUJOURDHUI = '2026-10-12';                                   // lundi ; la fenêtre = du 5 au 11 oct. (7 jours finissant hier)
  const SANS_REFUS = { semaines: new Set<string>(), depuisDerniereConfig: 0 };

  /** L'oracle de la proposition (§13.5). Un jour figé SANS tâche (jour off ouvert) n'a pas de budget : il n'est pas compté. */
  function propositionOracle(plans: DayPlan[], events: TrainingEvent[], c: ProgramConfig, refus: { semaines: Set<string>; depuisDerniereConfig: number }, today: string): number | null {
    const dates = Array.from({ length: 7 }, (_, i) => addDaysISO(today, -(i + 1)));
    const figes = plans.filter((p) => dates.includes(p.date) && p.tasks.length > 0);
    if (figes.length < RYTHME_MIN_JOURS) return null;
    const spent = figes.reduce((s, p) => s + events.filter((e) => new Date(e.at).toDateString() === new Date(`${p.date}T12:00:00`).toDateString()).reduce((x, e) => x + e.spentMin, 0), 0);
    const cible = figes.reduce((s, p) => s + p.targetMin, 0);
    if (!(spent < RYTHME_SEUIL * cible)) return null;
    if (refus.semaines.has(semaineIso(today)) || refus.depuisDerniereConfig >= 2) return null;
    // Revue m3 : arrondi au multiple de 5 SUPÉRIEUR. Revue m4 : sur la grille du curseur (minutes de session, pas de 5),
    // vers le haut ; la valeur proposée est le budget du jour de cette session.
    const brut = Math.max(BUDGET_PLANCHER_MIN, Math.ceil(spent / figes.length / 5 - 1e-9) * 5);
    let session = SESSION_MIN_MIN;                                         // la plus petite session du curseur qui couvre le brut
    while (session < SESSION_MAX_MIN && Math.round(session * INTENSITY_FACTOR[c.intensity]) < brut) session += SESSION_PAS_MIN;
    const valeur = Math.round(session * INTENSITY_FACTOR[c.intensity]);
    return valeur < dayTargetMin(c) ? valeur : null;
  }

  it('proposerRythme = l’oracle : seuil de 60 %, au moins trois jours figés, jamais à la hausse, jamais sous 20 min, refus respectés', async () => {
    const vus = { proposees: 0, silence: 0, plancher: 0, refus: 0, joursOff: 0 };
    await forAll(400, (r, seed) => {
      const c = cfg({ hoursPerSession: r.pick([0.5, 1, 2, 3, 4]), intensity: r.pick(['leicht', 'mittel', 'intensiv'] as const) });
      const cible = dayTargetMin(c);
      const jours = ['2026-10-03', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12'].filter(() => r.bool(0.75));
      const plans = jours.map((j) => plan(j, r.bool(0.8) ? cible : r.int(30, 200), r.bool(0.1)));
      vus.joursOff += plans.filter((p) => !p.tasks.length).length;
      const events = jours.flatMap((j) => (r.bool(0.85) ? [minutes(j, r.pick([0, 5, 12, 20, 35, 50, 90, 140]))] : []));
      const refus = { semaines: new Set(r.bool(0.2) ? [semaineIso(AUJOURDHUI)] : r.bool(0.2) ? [semaineIso('2026-10-05')] : []), depuisDerniereConfig: r.pick([0, 0, 1, 2, 3]) };
      const att = propositionOracle(plans, events, c, refus, AUJOURDHUI);
      const lu = proposerRythme({ plans, events, config: c, refus, today: AUJOURDHUI });
      expect(lu?.valeur ?? null, `graine ${seed}`).toBe(att);
      if (lu) {
        expect(lu.valeur, 'jamais à la hausse').toBeLessThan(cible);
        expect(lu.valeur, 'jamais sous le plancher').toBeGreaterThanOrEqual(BUDGET_PLANCHER_MIN);
        expect(lu.minutesSession % SESSION_PAS_MIN, 'sur la grille du curseur').toBe(0);
        vus.proposees++; if (lu.valeur < BUDGET_PLANCHER_MIN + SESSION_PAS_MIN * INTENSITY_FACTOR[c.intensity]) vus.plancher++;
      } else vus.silence++;
      if (refus.depuisDerniereConfig >= 2 || refus.semaines.size) vus.refus++;
    });
    expect(vus.proposees).toBeGreaterThan(40); expect(vus.silence).toBeGreaterThan(100); expect(vus.plancher).toBeGreaterThan(3); expect(vus.refus).toBeGreaterThan(60);
    expect(vus.joursOff).toBeGreaterThan(50);
  });

  it('un jour off ouvert (plan figé SANS tâche) ne compte pas comme un jour où le budget n’a pas été tenu', () => {
    const plans = ['2026-10-05', '2026-10-06', '2026-10-10', '2026-10-11'].map((j, i) => plan(j, 120, i >= 2));
    const events = plans.map((x) => minutes(x.date, 0));
    expect(proposerRythme({ plans, events, config: cfg(), refus: SANS_REFUS, today: AUJOURDHUI }), 'deux jours ouvrés seulement').toBeNull();
  });

  it('une proposition n’écrit rien : ni config, ni plan, ni événement — le budget ne change que par un geste', async () => {
    const c = cfg();
    await ecrireConfig(c);
    const plans = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'].map((j) => plan(j, 120));
    await db.day_plans.bulkPut(plans);
    const etat = async () => JSON.stringify({ meta: await db.meta.toArray(), pe: (await db.progress_events.toArray()).map((e) => e.id).sort(), dp: await db.day_plans.toArray() });
    const avant = await etat();
    const p = proposerRythme({ plans, events: plans.map((x) => minutes(x.date, 10)), config: c, refus: SANS_REFUS, today: AUJOURDHUI });
    expect(p, 'la proposition existe').not.toBeNull();
    consequenceRythme({ cases, progress: new Map(), config: c, today: AUJOURDHUI, valeur: p!.valeur });
    expect(await etat(), 'proposer a écrit').toBe(avant);
  });

  it('accepterRythme : UN program.configured, la config COMPLÈTE, seul le budget change, aucun jour figé ne bouge, la config est lisible (INV-76 c)', async () => {
    startOn('2026-10-12');
    const c = cfg({ intensity: 'intensiv', hoursPerSession: 3 });
    await ecrireConfig(c);
    const figes = [plan('2026-10-08', 234), plan('2026-10-09', 234)];
    await db.day_plans.bulkPut(figes);
    const n0 = await db.progress_events.where('type').equals('program.configured').count();
    for (const valeur of [20, 25, 35, 60]) {
      await accepterRythme(valeur, c);
      // m4 : la config acceptée est un point du curseur de ProgramSetup (minutes de session, pas de 5).
      const minutes = ((await db.meta.get('program'))!.value as ProgramConfig).hoursPerSession * 60;
      expect(Math.abs(minutes - Math.round(minutes)) < 1e-9 && Math.round(minutes) % SESSION_PAS_MIN === 0, `${valeur} min : ${minutes} min de session, hors du curseur`).toBe(true);
      const evs = (await db.progress_events.where('type').equals('program.configured').toArray()).sort((a, b) => (a.occurred_at < b.occurred_at ? -1 : 1));
      const dernier = evs[evs.length - 1].payload as ProgramConfig;
      expect(Object.keys(dernier).sort(), `payload partiel à ${valeur} min`).toEqual(Object.keys(c).sort());
      expect({ ...dernier, hoursPerSession: c.hoursPerSession }, 'seul le budget change').toEqual(c);
      expect(dayTargetMin(dernier), `le budget du jour couvre ${valeur} min`).toBeGreaterThanOrEqual(valeur);
      expect(dayTargetMin(dernier), 'au plus un pas de curseur au-dessus').toBeLessThan(valeur + SESSION_PAS_MIN * INTENSITY_FACTOR.intensiv + 1);
      expect(dernier.hoursPerSession).toBeLessThan(c.hoursPerSession);
      expect(lireConfig(dernier), `${valeur} min en intensité haute : la config est lisible`).not.toBeNull();
      expect((await db.meta.get('program'))?.value, 'la config locale suit').toEqual(dernier);
    }
    expect(await db.progress_events.where('type').equals('program.configured').count()).toBe(n0 + 4);
    expect(await db.day_plans.toArray(), 'aucun jour figé ne change à l’acceptation').toEqual(figes);
    // La valeur PROPOSÉE est exactement le budget qu'on obtient en l'acceptant (la carte ne promet pas 25 pour donner 26).
    for (const intensity of ['leicht', 'mittel', 'intensiv'] as const) {
      const ci = cfg({ intensity, hoursPerSession: 4 });
      const jours = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'];
      for (const m of [3, 22, 37, 61]) {
        const p = proposerRythme({ plans: jours.map((j) => plan(j, 300)), events: jours.map((j) => minutes(j, m)), config: ci, refus: SANS_REFUS, today: AUJOURDHUI })!;
        await accepterRythme(p.valeur, ci);
        expect(dayTargetMin((await db.meta.get('program'))!.value as ProgramConfig), `${intensity}, ${m} min par jour`).toBe(p.valeur);
      }
    }
  });

  it('refuserRythme : un événement SYNCHRONISÉ par semaine ISO ; l’autre appareil ne repropose pas ; deux refus de suite = plus de proposition jusqu’à une modification', async () => {
    const c = cfg();
    await ecrireConfig(c);
    const plans = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'].map((j) => plan(j, 120));
    const events = plans.map((x) => minutes(x.date, 10));
    const refusDe = async () => refusRythme(await db.progress_events.toArray());       // l'AUTRE appareil : le même journal, aucun état local
    expect(proposerRythme({ plans, events, config: c, refus: await refusDe(), today: AUJOURDHUI })).not.toBeNull();
    await refuserRythme(semaineIso(AUJOURDHUI));
    await refuserRythme(semaineIso(AUJOURDHUI));                                        // un double clic n'écrit qu'un refus
    const refus = await db.progress_events.where('type').equals('rythme.refused').toArray();
    expect(refus).toHaveLength(1);
    expect(refus[0].subject_id).toBe('2026-W42'); expect(refus[0].payload).toEqual({});
    expect(proposerRythme({ plans, events, config: c, refus: await refusDe(), today: AUJOURDHUI }), 'le refus doit valoir sur l’autre appareil').toBeNull();
    // la semaine suivante, un seul refus : on repropose ; un second refus : fin, jusqu'à la prochaine modification du programme
    const suivant = addDaysISO(AUJOURDHUI, 7);
    const plans2 = [...plans, ...['2026-10-12', '2026-10-13', '2026-10-14'].map((j) => plan(j, 120))];
    const events2 = [...events, ...['2026-10-12', '2026-10-13', '2026-10-14'].map((j) => minutes(j, 10))];
    expect(proposerRythme({ plans: plans2, events: events2, config: c, refus: await refusDe(), today: suivant })).not.toBeNull();
    await refuserRythme(semaineIso(suivant));
    const plusTard = addDaysISO(AUJOURDHUI, 14);
    const plans3 = [...plans2, ...['2026-10-19', '2026-10-20', '2026-10-21'].map((j) => plan(j, 120))];
    const events3 = [...events2, ...['2026-10-19', '2026-10-20', '2026-10-21'].map((j) => minutes(j, 10))];
    expect(proposerRythme({ plans: plans3, events: events3, config: c, refus: await refusDe(), today: plusTard }), 'deux refus de suite').toBeNull();
    await ecrireConfig({ ...c, hoursPerSession: 2.5 });                       // une modification du programme remet le compte à zéro
    expect(proposerRythme({ plans: plans3, events: events3, config: { ...c, hoursPerSession: 2.5 }, refus: await refusDe(), today: plusTard })).not.toBeNull();
  });

  it('la carte montre la CONSÉQUENCE sur la projection, jamais l’écart en % (P1), et ne juge pas', () => {
    const c = cfg({ hoursPerSession: 2 });
    const q = consequenceRythme({ cases: cases.slice(0, 50), progress: new Map(), config: c, today: AUJOURDHUI, valeur: 35 })!;
    expect(q).not.toBeNull();
    expect(q.date > q.dateActuelle, 'au rythme réel, la date recule').toBe(true);
    expect(q.texte).toMatch(/^À ce rythme, les \d+ cas les plus fréquents seront travaillés le \d{1,2} \S+ au lieu du \d{1,2} \S+$/);
    expect(q.texte).not.toMatch(/%|retard|manqu|en dessous|paresse|échec|insuffisan/i);
    // Les cas déjà solides ne sont plus du travail : tout solide ⇒ rien à projeter, pas de phrase.
    const tout = new Map(cases.slice(0, 50).map((x) => [x.id, { caseId: x.id, teile: Object.fromEntries(TEILE.map((t) => [t, { status: 'solide', lastScore: 90, lastAt: 0, attempts: 2 }])) } as unknown as CaseProgress]));
    expect(consequenceRythme({ cases: cases.slice(0, 50), progress: tout, config: c, today: AUJOURDHUI, valeur: 35 })).toBeNull();
  });
});
