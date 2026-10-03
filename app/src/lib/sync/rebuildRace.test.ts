// Re-revue I-2 : une reconstruction (pull) qui tourne pendant qu'on écrit ne
// doit RIEN effacer. Avant : `rebuildProjections` lisait `progress_events`, puis
// `rebuildJournal` vidait et réécrivait les projections — ce qui s'écrivait
// entre les deux disparaissait (coche perdue, re-clic = second événement).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/auth/session', () => ({
  AUTH_MODE: 'public',
  getAccessToken: async () => null,
  useSession: { getState: () => ({ user: null }) },
}));

import { db } from '@/db/db';
import type { Case, ProgramConfig } from '@/db/types';
import type { ProgressEvent } from './events';
import { rebuildProjections } from './projections';
import { logTraining } from '@/lib/journal';
import { ensureDayPlan } from '@/lib/program/dayPlan';
import { freezeAt, resetClock } from '@/lib/clock';

const config = { startDate: '2026-09-01', examDate: '2026-12-01', intensity: 'mittel', hoursPerSession: 2, offDays: [], prioritySpecialties: [], selfLevel: {}, createdAt: 0 } as unknown as ProgramConfig;

beforeEach(async () => {
  await Promise.all([db.training_events.clear(), db.day_plans.clear(), db.case_progress.clear(), db.progress_events.clear(), db.outbox.clear(), db.meta.clear(), db.cases.clear(), db.simulations.clear()]);
  await db.cases.bulkPut(Array.from({ length: 12 }, (_, i) => ({ id: `c${i}`, name: `Cas ${i}`, pathology: 'p', specialty: ['Kardiologie', 'Pneumologie'][i % 2], frequency: 20 - i, centers: [], linkedFachbegriffeIds: [] } as unknown as Case)));
  await db.meta.put({ key: 'program', value: config });
  // Un journal assez long pour que la reconstruction prenne du temps.
  const evs: ProgressEvent[] = Array.from({ length: 3000 }, (_, i) => ({
    id: `s${i}`, user_id: 'u', type: 'training.logged', subject_id: `x${i}`, occurred_at: new Date(Date.UTC(2026, 8, 1) + i * 60_000).toISOString(),
    payload: { at: Date.UTC(2026, 8, 1) + i * 60_000, kind: 'fiche', teile: [], source: 'libre', spentMin: 3 },
  }));
  await db.progress_events.bulkPut(evs);
}, 60_000);                                                        // m-3 : délai de hook explicite
afterEach(() => resetClock());

describe('I-2 — une reconstruction concurrente n\'efface rien', () => {
  it('logTraining pendant rebuildProjections : l\'événement reste dans training_events', async () => {
    freezeAt(new Date(2026, 9, 1, 10, 0));
    const rebuild = rebuildProjections();
    await new Promise((r) => setTimeout(r, 0));                      // la reconstruction a lu le journal
    const te = await logTraining({ kind: 'fiche', caseId: 'c1', spentMin: 5 });
    await rebuild;
    expect(await db.training_events.get(te.id)).toBeDefined();
  }, 60_000);   // m-3 : 3 000 événements, délai explicite (charge CI)
  it('ensureDayPlan pendant rebuildProjections : le plan du jour reste dans day_plans', async () => {
    freezeAt(new Date(2026, 9, 1, 10, 0));
    const rebuild = rebuildProjections();
    await new Promise((r) => setTimeout(r, 0));
    const plan = await ensureDayPlan();
    await rebuild;
    expect((await db.day_plans.get('2026-10-01'))?.seed).toBe(plan!.seed);
  }, 60_000);
});
