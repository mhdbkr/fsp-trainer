// C6 — invariants du journal d'entraînement (contrat training-journal.md §7).
//   INV-3  un point faible se décide sur la performance, jamais sur l'absence
//   INV-5  tout exercice libre apparaît dans l'historique ET dans les stats
//   INV-6  une journée 100 % drill est une journée travaillée
// INV-5 se prouve deux fois : sur les données que les écrans lisent, et sur
// l'écran Historique RENDU (jsdom), pas sur une fonction qui n'en est que le reflet.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/auth/session', async () => (await import('./helpers/mocks')).authMock());
vi.mock('@/lib/sync/queue', async () => (await import('./helpers/mocks')).queueMock());
vi.mock('@/lib/supabase', async () => (await import('./helpers/mocks')).supabaseMock());

import { db } from '@/db/db';
import { dayKey } from '@/lib/clock';
import {
  PART_OK, computeCaseProgress, logTraining, pointFaible, rebuildJournal, spentByDay, workedDayKeys,
} from '@/lib/journal';
import { saveSimulation } from '@/lib/simulationSave';
import { weakCases, streakFromDays } from '@/lib/stats';
import { programStats } from '@/lib/program';
import { HistoriquePage } from '@/features/program/HistoriquePage';
import type { TrainingEvent, TrainingKind, SimTeil } from '@/db/types';
import { forAll, rng, type Rng } from './helpers/prop';
import { CORPUS, TEILE, addDaysISO, partResult, randomConfig, resetTime, resetWorld, startOn } from './helpers/world';

beforeEach(() => resetWorld());
afterEach(() => { cleanup(); resetTime(); });

// --------------------------------------------------------------------- INV-3

function randomJournal(r: Rng): TrainingEvent[] {
  const cases = r.shuffle(CORPUS).slice(0, r.int(1, 12));
  const out: TrainingEvent[] = [];
  for (let i = 0; i < r.int(1, 40); i++) {
    const caseId = r.bool(0.9) ? r.pick(cases).id : undefined;
    const kind = r.pick<TrainingKind>(['simulation', 'simulation', 'drill', 'fiche', 'aufklaerung', 'examen-blanc']);
    const teile = r.shuffle(TEILE).slice(0, r.int(0, 3));
    const mesure = kind === 'simulation' || kind === 'examen-blanc';
    out.push({
      id: `e${i}`, at: 1_000 + i * 1000, kind, ...(caseId ? { caseId } : {}), teile, source: r.bool() ? 'plan' : 'libre',
      ...(r.bool(0.3) ? { taskId: `t${i}` } : {}),
      spentMin: r.pick([0, 0, 5, 20]),
      // une coche nue ou une fiche n'ont PAS de score ; une simulation en a un par Teil joué
      ...(mesure && r.bool(0.8) ? { scores: Object.fromEntries(teile.map((t) => [t, r.int(0, 100)])) } : {}),
      ...(r.bool(0.2) ? { selbstbewertet: true } : {}),
    });
  }
  return out;
}

describe('INV-3 — aucun cas n’est point faible par absence', () => {
  it('pour tout journal : pointFaible ⇒ au moins un essai MESURÉ, sous le seuil', async () => {
    let faibles = 0, vierges = 0;
    await forAll(300, (r) => {
      const events = randomJournal(r);
      const progress = new Map(computeCaseProgress(events).map((p) => [p.caseId, p]));
      for (const c of CORPUS) {
        for (const t of TEILE) {
          const cp = progress.get(c.id);
          if (!pointFaible(cp, t)) { if (!cp || cp.teile[t].attempts === 0) vierges++; continue; }
          faibles++;
          expect(cp!.teile[t].attempts, `${c.id}/${t} est un point faible sans aucun essai mesuré`).toBeGreaterThanOrEqual(1);
          expect(cp!.teile[t].lastScore, `${c.id}/${t} est un point faible sans score`).not.toBeNull();
          expect(cp!.teile[t].lastScore!, `${c.id}/${t} est un point faible au-dessus du seuil`).toBeLessThan(PART_OK);
        }
      }
      // …et c'est la même règle que celle de la liste « Points faibles » affichée.
      for (const w of weakCases(progress, CORPUS, 10_000)) {
        expect(progress.get(w.c.id)!.teile[w.teil].attempts, `weakCases liste ${w.c.id}/${w.teil} sans essai`).toBeGreaterThanOrEqual(1);
      }
    });
    expect(faibles).toBeGreaterThan(50);       // la preuve ne passe pas à vide : des échecs réels existent…
    expect(vierges).toBeGreaterThan(50_000);   // …et des Teile jamais travaillés aussi (ils ne sont jamais accusés)
  });

  it('un cas travaillé sur un Teil seulement ne rend fautifs ni les autres Teile ni lui-même s’il a réussi', async () => {
    await forAll(60, async (r) => {
      await resetWorld();
      const c = r.pick(CORPUS), teil = r.pick(TEILE), score = r.int(60, 100);
      startOn('2026-10-05');
      await saveSimulation({ c, assistance: 'autonome', layer: 2, parts: { [teil]: partResult(score) }, scope: 'teil', teil });
      const cp = (await db.case_progress.get(c.id))!;
      for (const t of TEILE) expect(pointFaible(cp, t), `${c.id}/${t} accusé après un seul Teil réussi (${teil} à ${score} %)`).toBe(false);
    });
  });
});

// ------------------------------------------------------------------ INV-5 / 6

/** Écrit un exercice libre par le VRAI chemin d'écriture de son genre. */
async function ecrireLibre(r: Rng, kind: TrainingKind): Promise<{ id: string; spentMin: number; caseId?: string }> {
  const spentMin = r.int(0, 45);
  if (kind === 'simulation' || kind === 'examen-blanc') {
    const c = r.pick(CORPUS), teile: SimTeil[] = r.shuffle(TEILE).slice(0, r.int(1, 3));
    const sim = await saveSimulation({
      c, assistance: 'autonome', layer: 2, mode: r.pick(['texte', 'external-ai'] as const),
      parts: Object.fromEntries(teile.map((t) => [t, partResult(r.int(20, 100), { durationSec: spentMin * 60 / teile.length })])),
      scope: teile.length === 3 ? 'full' : 'teil', ...(teile.length === 1 ? { teil: teile[0] } : {}),
    });
    return { id: `te-${sim.id}`, spentMin, caseId: c.id };
  }
  const caseId = kind === 'drill' && r.bool() ? undefined : r.pick(CORPUS).id;
  const te = await logTraining({ kind, ...(caseId ? { caseId } : {}), spentMin });
  return { id: te.id, spentMin: te.spentMin, caseId };
}

describe('INV-5 / INV-6 — un exercice libre apparaît dans l’historique et dans les stats', () => {
  it('chaque exercice libre, de tout genre, est dans le journal et dans le temps investi de son jour', async () => {
    const jours = new Set<string>();
    await forAll(40, async (r) => {
      await resetWorld();
      await db.meta.put({ key: 'program', value: randomConfig(r) } as never);   // un programme existe, mais PAS de plan matérialisé : tout est libre
      const ecrits: { id: string; spentMin: number; day: string }[] = [];
      for (let j = 0; j < r.int(1, 4); j++) {
        const date = addDaysISO('2026-10-05', j * r.int(1, 3));
        const tick = startOn(date);
        for (let k = 0; k < r.int(1, 4); k++) {
          tick(r.int(1, 3_600_000));
          const kind = r.pick<TrainingKind>(['drill', 'drill', 'fiche', 'aufklaerung', 'simulation']);
          const w = await ecrireLibre(r, kind);
          ecrits.push({ id: w.id, spentMin: w.spentMin, day: date });
        }
      }
      const events = await db.training_events.toArray();
      for (const e of ecrits) {
        const te = events.find((x) => x.id === e.id);
        expect(te, `l'exercice ${e.id} du ${e.day} n'est pas dans l'historique`).toBeTruthy();
        expect(te!.source, 'un exercice hors plan doit se dire libre').toBe('libre');
      }
      expect(events.length, 'un exercice, un événement').toBe(ecrits.length);

      // Les stats lisent le même journal (INV-6 : un drill seul suffit à travailler un jour).
      const worked = workedDayKeys(events), spent = spentByDay(events);
      for (const day of new Set(ecrits.map((e) => e.day))) {
        expect(worked.has(day), `le ${day} a un exercice mais n'est pas un jour travaillé`).toBe(true);
        const attendu = events.filter((x) => dayKey(x.at) === day).reduce((s, x) => s + x.spentMin, 0);
        expect(spent.get(day) ?? 0, `temps investi du ${day}`).toBe(attendu);
        jours.add(day);
      }
      const ps = programStats(randomConfig(r), { cases: CORPUS, trainingEvents: events, progress: new Map() });
      expect(ps.workedDays, 'jours travaillés des stats du programme').toBe(worked.size);
      expect(ps.totalSpentMin, 'minutes investies des stats du programme').toBe([...spent.values()].reduce((s, v) => s + v, 0));
      expect(streakFromDays(worked, new Date(Math.max(...events.map((x) => x.at)))), 'la série compte le dernier jour travaillé').toBeGreaterThanOrEqual(1);

      // …et la reconstruction depuis le journal source ne perd aucun d'eux (INV-10).
      await rebuildJournal();
      const apres = new Set((await db.training_events.toArray()).map((x) => x.id));
      for (const e of ecrits) expect(apres.has(e.id), `${e.id} perdu à la reconstruction`).toBe(true);
    });
    expect(jours.size).toBeGreaterThan(5);
  }, 120_000);

  it('INV-6 — une journée 100 % drill est une journée travaillée, avec son temps', async () => {
    startOn('2026-10-06');
    await logTraining({ kind: 'drill', spentMin: 12 });
    const events = await db.training_events.toArray();
    expect(workedDayKeys(events).has('2026-10-06')).toBe(true);
    expect(spentByDay(events).get('2026-10-06')).toBe(12);
    expect(programStats(randomConfig(rng(1)), { cases: CORPUS, trainingEvents: events, progress: new Map() }).workedDays).toBe(1);
  });

  it('l’écran Historique RENDU montre chaque exercice libre, de tout genre, avec son total', async () => {
    await forAll(8, async (r) => {
      await resetWorld();
      cleanup();
      const tick = startOn('2026-10-05');
      const n = r.int(2, 6);
      const noms: string[] = [];
      for (let k = 0; k < n; k++) {
        tick(120_000);
        const kind = r.pick<TrainingKind>(['drill', 'fiche', 'aufklaerung', 'simulation']);
        const w = await ecrireLibre(r, kind);
        if (w.caseId) noms.push(CORPUS.find((c) => c.id === w.caseId)!.name);
      }
      render(<MemoryRouter><HistoriquePage /></MemoryRouter>);
      await waitFor(() => expect(screen.getByText('Exercices').nextElementSibling!.textContent).toBe(String(n)), { timeout: 5000 });
      for (const nom of new Set(noms)) expect(screen.getAllByText(nom).length, `« ${nom} » absent de l'historique rendu`).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Jours travaillés').nextElementSibling!.textContent).toBe('1');
      cleanup();
    });
  }, 120_000);
});
