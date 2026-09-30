// Le chemin d'ÉCRITURE du journal — revue s3-programme (B-C1, S-I1, S-M1, D-C4, I12).
// Chaque test passe par les fonctions que l'app appelle : logTraining,
// markTaskDone, rebuildJournal.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/auth/session', () => ({
  AUTH_MODE: 'public',
  getAccessToken: async () => null,
  useSession: { getState: () => ({ user: null }) },
}));

import { db } from '@/db/db';
import type { ProgressEvent } from '@/lib/sync/events';
import type { DayPlan, TaskInstance } from '@/db/types';
import { logTraining, rebuildJournal } from '@/lib/journal';
import { freezeAt, resetClock } from '@/lib/clock';

const task = (o: Partial<TaskInstance> & { id: string }): TaskInstance => ({
  date: '2026-10-01', kind: 'simulation', label: 'Sujet', estMin: 40, source: 'plan', reason: 'parce que', ...o,
});
const plan = (o: Partial<DayPlan> & { date: string; tasks: TaskInstance[] }): DayPlan => ({
  materializedAt: 0, mode: 'teil-first', seed: 's', targetMin: 90, ...o,
});
let seq = 0;
const ev = (type: ProgressEvent['type'], subject_id: string | null, payload: unknown, occurred_at: string): ProgressEvent =>
  ({ id: `e${seq++}`, user_id: 'u1', type, subject_id, payload, occurred_at });

beforeEach(async () => {
  seq = 0;
  await Promise.all([db.training_events.clear(), db.day_plans.clear(), db.case_progress.clear(), db.progress_events.clear(), db.outbox.clear()]);
});
afterEach(() => resetClock());

describe('B-C1 — le journal local ne devance jamais le journal synchronisé', () => {
  it('quand logTraining rend, l\'événement est DANS progress_events : une reconstruction ne le perd pas', async () => {
    freezeAt('2026-10-01T10:00:00Z');
    const te = await logTraining({ kind: 'fiche', caseId: 'c1', spentMin: 12 });
    await rebuildJournal(await db.progress_events.toArray());
    expect((await db.training_events.toArray()).map((t) => t.id)).toEqual([te.id]);
  });
});
