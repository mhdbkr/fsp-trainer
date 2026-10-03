// D-I7 : la proposition de rattrapage, dans la page, par un geste.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/auth/session', () => ({
  AUTH_MODE: 'public',
  getAccessToken: async () => null,
  useSession: { getState: () => ({ user: null }) },
}));

import { db } from '@/db/db';
import type { Case, ProgramConfig, TaskInstance } from '@/db/types';
import { freezeAt, resetClock } from '@/lib/clock';
import { refreshToday } from '@/lib/today';
import { rebuildJournal } from '@/lib/journal';
import { ProgramPage } from './ProgramPage';

const config = { startDate: '2026-09-01', examDate: '2026-12-01', intensity: 'mittel', hoursPerSession: 2, offDays: [0, 6], prioritySpecialties: [], selfLevel: {}, createdAt: 0 } as unknown as ProgramConfig;
const t = (id: string, date: string, caseId: string): TaskInstance => ({ id, date, kind: 'simulation', caseId, label: `Cas ${caseId}`, estMin: 20, source: 'plan', reason: 'r' });

let container: HTMLDivElement; let root: Root;
beforeEach(async () => {
  freezeAt(new Date(2026, 9, 2, 8, 0));
  refreshToday();                                                   // le store « aujourd'hui » suit l'horloge figée (I-1)
  await Promise.all([db.cases.clear(), db.meta.clear(), db.day_plans.clear(), db.training_events.clear(), db.case_progress.clear(), db.progress_events.clear(), db.outbox.clear(), db.fachbegriffe.clear()]);
  await db.cases.bulkPut(['c1', 'c9'].map((id) => ({ id, name: `Cas ${id}`, pathology: 'p', specialty: 'Kardiologie', frequency: 10, centers: [], linkedFachbegriffeIds: [] } as unknown as Case)));
  await db.meta.put({ key: 'program', value: config });
  await db.progress_events.bulkPut([
    { id: 'p1', user_id: 'u', type: 'plan.materialized', subject_id: '2026-10-01', payload: { tasks: [t('h1', '2026-10-01', 'c1')], mode: 'teil-first', seed: 's', targetMin: 90 }, occurred_at: '2026-10-01T06:00:00Z' },
    { id: 'p2', user_id: 'u', type: 'plan.materialized', subject_id: '2026-10-02', payload: { tasks: [t('a1', '2026-10-02', 'c9')], mode: 'teil-first', seed: 's', targetMin: 90 }, occurred_at: '2026-10-02T06:00:00Z' },
  ]);
  await rebuildJournal(await db.progress_events.toArray());
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  await act(async () => { root.render(<MemoryRouter><ProgramPage /></MemoryRouter>); });
  await vi.waitFor(() => expect(container.textContent).toMatch(/Replanifier la journée/), { timeout: 3000 });
});
afterEach(() => { act(() => root.unmount()); container.remove(); resetClock(); });

const btn = (re: RegExp) => [...container.querySelectorAll('button')].find((b) => re.test(b.textContent ?? ''));

describe('D-I7 — la proposition de rattrapage', () => {
  it('rien n\'est ajouté sans geste ; « Les reprendre » ajoute la tâche de la veille', async () => {
    expect((await db.day_plans.get('2026-10-02'))!.tasks).toHaveLength(1);
    await vi.waitFor(() => expect(container.textContent).toMatch(/reste 1 tâche/i), { timeout: 3000 });
    await act(async () => { btn(/les reprendre/i)!.click(); });
    await vi.waitFor(async () => expect((await db.day_plans.get('2026-10-02'))!.tasks.map((x) => x.caseId)).toEqual(['c9', 'c1']), { timeout: 3000 });
    await vi.waitFor(() => expect(container.textContent).not.toMatch(/reste 1 tâche/i), { timeout: 3000 });
  });
  it('« Non, laisser » retire la proposition sans rien ajouter', async () => {
    await vi.waitFor(() => expect(btn(/non, laisser/i)).toBeDefined(), { timeout: 3000 });
    await act(async () => { btn(/non, laisser/i)!.click(); });
    await vi.waitFor(() => expect(container.textContent).not.toMatch(/reste 1 tâche/i), { timeout: 3000 });
    expect((await db.day_plans.get('2026-10-02'))!.tasks).toHaveLength(1);
  });
});
