// C6 — fixeur S4-3, M5 (décision de main) : une partie commencée la veille, reprise et ENREGISTRÉE ce matin, coche la
// tâche « Finir X » posée ce matin. Le jour d'une partie reste celui de son début (m5, INV-75) pour l'historique ; la
// complétion d'une tâche, elle, compte les parties enregistrées après `creeA` (même logique que la coupure m1 de S4-2 :
// l'instant d'ENREGISTREMENT, `occurred_at`).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/auth/session', async () => (await import('./helpers/mocks')).authMock());
vi.mock('@/lib/sync/queue', async () => (await import('./helpers/mocks')).queueMock());
vi.mock('@/lib/supabase', async () => (await import('./helpers/mocks')).supabaseMock());
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

import { db } from '@/db/db';
import { freezeAt } from '@/lib/clock';
import { checklistFor } from '@/lib/checklists';
import { erstelleLauf, transition } from '@/lib/lauf/automat';
import { speichern } from '@/lib/lauf/speichern';
import { evaluerTache } from '@/lib/program/completion';
import type { DayPlan, SimTeil, TaskInstance, TrainingEvent } from '@/db/types';
import { CORPUS, partResult, resetTime, resetWorld } from './helpers/world';

const cas = () => CORPUS[0];
const MATIN = new Date(2026, 9, 6, 8, 0).getTime();
const tache = (teile: SimTeil[]): TaskInstance => ({
  id: 'tFinir', date: '2026-10-06', kind: 'simulation', caseId: cas().id, label: cas().name, estMin: 20, source: 'plan',
  reason: 'Commencée hier : finir le cas.', teile, creeA: MATIN,
});

beforeEach(async () => { await resetWorld(); await db.cases.put(cas()); });
afterEach(() => resetTime());

describe('M5 — reprise le lendemain : la tâche du jour est cochée', () => {
  it('partie commencée la veille à 23 h 30, enregistrée ce matin à 9 h : « Finir X » est faite', async () => {
    const avance = freezeAt(new Date(2026, 9, 5, 23, 30).getTime());
    let l = transition(erstelleLauf({ caseId: cas().id, caseName: cas().name, assistance: 'autonome', layer: 2 }),
      { typ: 'demarrer', checkliste: [...checklistFor('anamnese'), ...checklistFor('dokumentation'), ...checklistFor('fallvorstellung')] });
    l = transition(l, { typ: 'terminerPartie', ergebnis: partResult(70, { durationSec: 900 }) });
    const plan: DayPlan = { date: '2026-10-06', materializedAt: MATIN, mode: 'cas-complet', seed: 's', targetMin: 60, tasks: [tache(['dokumentation', 'fallvorstellung'])] };
    avance(MATIN - new Date(2026, 9, 5, 23, 30).getTime());
    await db.day_plans.put(plan);
    avance(60 * 60_000);                                            // 9 h
    l = transition(l, { typ: 'partieSuivante' });
    l = transition(l, { typ: 'terminerPartie', ergebnis: partResult(70, { durationSec: 900 }) });
    l = transition(l, { typ: 'partieSuivante' });
    l = transition(l, { typ: 'terminerPartie', ergebnis: partResult(70, { durationSec: 900 }) });
    l = transition(transition(l, { typ: 'versChecklist' }), { typ: 'speichern' });
    const sim = await speichern(l, cas());
    expect(sim.date).toBe(l.startedAt);                            // INV-75 : la partie reste datée de la veille
    expect((await db.day_plans.get('2026-10-06'))!.tasks[0].doneAt, 'la tâche « Finir X » du matin reste ouverte').toBeDefined();
  });

  it('pur : un événement daté de la veille mais enregistré après `creeA` fait la tâche ; enregistré avant, non', () => {
    const ev = (enregistreA: number): TrainingEvent => ({
      id: 'te-x', at: new Date(2026, 9, 5, 23, 30).getTime(), enregistreA, kind: 'simulation', caseId: cas().id,
      teile: ['dokumentation', 'fallvorstellung'], source: 'libre', spentMin: 30, laufId: 'x', scores: { dokumentation: 70, fallvorstellung: 70 },
    });
    expect(evaluerTache(tache(['dokumentation', 'fallvorstellung']), [ev(MATIN + 3_600_000)]).statut).toBe('faite');
    expect(evaluerTache(tache(['dokumentation', 'fallvorstellung']), [ev(MATIN - 60_000)]).statut).toBe('a-faire');
  });
});
