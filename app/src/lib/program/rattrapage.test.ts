// D-I7 (décision de direction Q4) : le rattrapage d'un jour manqué est PROPOSÉ,
// jamais imposé. Rien ne s'ajoute sans un geste explicite.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/auth/session', () => ({
  AUTH_MODE: 'public',
  getAccessToken: async () => null,
  useSession: { getState: () => ({ user: null }) },
}));

import { db } from '@/db/db';
import type { DayPlan, TaskInstance } from '@/db/types';
import { rebuildJournal, markTaskDone } from '@/lib/journal';
import { freezeAt, resetClock } from '@/lib/clock';
import { accepterRattrapage, rattrapageAProposer, refuserRattrapage, RATTRAPAGE_REFUS_KEY } from './rattrapage';

const task = (o: Partial<TaskInstance> & { id: string; date: string }): TaskInstance => ({ kind: 'simulation', label: 'S', estMin: 20, source: 'plan', reason: 'r', ...o });
const plan = (date: string, tasks: TaskInstance[]): DayPlan => ({ date, materializedAt: 0, mode: 'teil-first', seed: 's', targetMin: 90, tasks });

beforeEach(async () => {
  await Promise.all([db.day_plans.clear(), db.training_events.clear(), db.case_progress.clear(), db.progress_events.clear(), db.outbox.clear(), db.meta.clear()]);
});
afterEach(() => resetClock());

describe('D-I7 — proposer, jamais imposer', () => {
  const hier = plan('2026-10-01', [task({ id: 'h1', date: '2026-10-01', caseId: 'c1' }), task({ id: 'h2', date: '2026-10-01', caseId: 'c2', doneAt: 1 }), task({ id: 'hd', date: '2026-10-01', kind: 'drill' })]);
  const auj = plan('2026-10-02', [task({ id: 'a1', date: '2026-10-02', caseId: 'c9' })]);

  it('propose les tâches NON faites du dernier jour figé — pas le drill (celui du jour le remplace)', () => {
    const p = rattrapageAProposer([hier, auj], '2026-10-02', []);
    expect(p).toEqual({ from: '2026-10-01', tasks: [hier.tasks[0]] });
  });
  it('rien à proposer : jour non figé, tout fait, cas déjà au programme du jour, ou refus retenu', () => {
    expect(rattrapageAProposer([auj], '2026-10-02', [])).toBeNull();
    expect(rattrapageAProposer([plan('2026-10-01', [task({ id: 'x', date: '2026-10-01', caseId: 'c1', doneAt: 1 })]), auj], '2026-10-02', [])).toBeNull();
    expect(rattrapageAProposer([plan('2026-10-01', [task({ id: 'x', date: '2026-10-01', caseId: 'c9' })]), auj], '2026-10-02', [])).toBeNull();
    expect(rattrapageAProposer([hier, auj], '2026-10-02', ['2026-10-01'])).toBeNull();
    expect(rattrapageAProposer([hier], '2026-10-02', [])).toBeNull();          // aujourd'hui pas encore figé
  });
  it('accepter : plan.replanned (raison rattrapage) — tâches du jour intactes, faites comprises, reprises ajoutées avec un id neuf', async () => {
    freezeAt(new Date(2026, 9, 2, 9, 0));
    await db.progress_events.bulkPut([
      { id: 'p1', user_id: 'u', type: 'plan.materialized', subject_id: '2026-10-01', payload: { tasks: hier.tasks.map(({ doneAt, ...t }) => t), mode: 'teil-first', seed: 's', targetMin: 90 }, occurred_at: '2026-10-01T06:00:00Z' },
      { id: 'p2', user_id: 'u', type: 'plan.materialized', subject_id: '2026-10-02', payload: { tasks: auj.tasks, mode: 'teil-first', seed: 's', targetMin: 90 }, occurred_at: '2026-10-02T06:00:00Z' },
    ]);
    await rebuildJournal(await db.progress_events.toArray());
    await markTaskDone(auj.tasks[0]);
    const next = (await accepterRattrapage('2026-10-02', '2026-10-01'))!;
    expect(next.tasks.map((t) => t.id).slice(0, 1)).toEqual(['a1']);
    expect(next.tasks[0].doneAt).toBeDefined();
    const reprises = next.tasks.slice(1);
    expect(reprises.map((t) => [t.caseId, t.date])).toEqual([['c1', '2026-10-02'], ['c2', '2026-10-02']]);   // h2 n'a pas d'événement : non faite
    expect(reprises.every((t) => !['h1', 'h2', 'hd'].includes(t.id))).toBe(true);
    const [rep] = await db.progress_events.where('type').equals('plan.replanned').toArray();
    expect((rep.payload as { reason: string }).reason).toBe('rattrapage');
    await rebuildJournal(await db.progress_events.toArray());
    expect((await db.day_plans.get('2026-10-02'))!.tasks.map((t) => t.id)).toEqual(next.tasks.map((t) => t.id));
  });
  it('refuser : retenu pour ce jour-là', async () => {
    await refuserRattrapage('2026-10-01');
    expect((await db.meta.get(RATTRAPAGE_REFUS_KEY))!.value).toEqual(['2026-10-01']);
  });
});
