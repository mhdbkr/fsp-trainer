// Re-revue I-1 : l'écran change de jour. App ouverte à 23 h, retour au premier
// plan à 1 h : watchDayPlan fige le 2, et l'accueil comme le Programme rendent
// le 2 — pas le plan de la veille sous l'étiquette « Session du jour ».
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/lib/auth/session', () => ({
  AUTH_MODE: 'public',
  getAccessToken: async () => null,
  useSession: Object.assign(() => null, { getState: () => ({ user: null, status: 'anonymous' }), subscribe: () => () => {} }),
}));

import { db } from '@/db/db';
import type { Case, ProgramConfig, TaskInstance } from '@/db/types';
import { freezeAt, resetClock } from '@/lib/clock';
import { rebuildJournal } from '@/lib/journal';
import { watchDayPlan } from '@/lib/sync/boot';
import { refreshToday } from '@/lib/today';
import { HomePage } from '@/features/home/HomePage';
import { ProgramPage } from './ProgramPage';

globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as unknown as typeof ResizeObserver;
const config = { startDate: '2026-09-01', examDate: '2026-12-01', intensity: 'mittel', hoursPerSession: 2, offDays: [], prioritySpecialties: [], selfLevel: {}, createdAt: 0 } as unknown as ProgramConfig;
const veille: TaskInstance = { id: 'tv', date: '2026-10-01', kind: 'simulation', caseId: 'c0', label: 'Tâche de la veille', estMin: 20, source: 'plan', reason: 'r' };

let container: HTMLDivElement; let root: Root; let advance: (ms: number) => number; let stop: () => void;
beforeEach(async () => {
  advance = freezeAt(new Date(2026, 9, 1, 23, 0));
  refreshToday();
  await Promise.all([db.cases.clear(), db.meta.clear(), db.day_plans.clear(), db.training_events.clear(), db.case_progress.clear(), db.progress_events.clear(), db.outbox.clear(), db.fachbegriffe.clear(), db.simulations.clear()]);
  await db.cases.bulkPut(Array.from({ length: 8 }, (_, i) => ({ id: `c${i}`, name: `Cas ${i}`, pathology: 'p', specialty: ['Kardiologie', 'Pneumologie'][i % 2], frequency: 20 - i, centers: [], linkedFachbegriffeIds: [] } as unknown as Case)));
  await db.meta.put({ key: 'program', value: config });
  await db.progress_events.put({ id: 'p1', user_id: 'u', type: 'plan.materialized', subject_id: '2026-10-01', payload: { tasks: [veille], mode: 'teil-first', seed: 's', targetMin: 120 }, occurred_at: '2026-10-01T06:00:00Z' });
  await rebuildJournal();
  stop = watchDayPlan();
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { stop(); act(() => root.unmount()); container.remove(); resetClock(); });

async function passerMinuit() {
  advance(2 * 3600_000);                                            // 2 octobre, 1 h
  document.dispatchEvent(new Event('visibilitychange'));
  await vi.waitFor(async () => expect(await db.day_plans.get('2026-10-02')).toBeDefined(), { timeout: 5000 });
  return (await db.day_plans.get('2026-10-02'))!.tasks.find((t) => t.doneAt === undefined)!.label;
}

describe('I-1 — l\'écran change de jour', () => {
  it('accueil : la session du jour devient celle du 2', async () => {
    await act(async () => { root.render(<MemoryRouter><HomePage /></MemoryRouter>); });
    await vi.waitFor(() => expect(container.textContent).toMatch(/Tâche de la veille/), { timeout: 5000 });
    const label = await passerMinuit();
    await vi.waitFor(() => expect(container.textContent).toMatch(/vendredi 2 octobre/i), { timeout: 5000 });
    await vi.waitFor(() => expect(container.textContent).not.toMatch(/Tâche de la veille/), { timeout: 5000 });
    expect(container.textContent).toContain(label);
  }, 20_000);
  it('programme : le jour choisi suit aujourd\'hui s\'il valait la veille', async () => {
    await act(async () => { root.render(<MemoryRouter><ProgramPage /></MemoryRouter>); });
    await vi.waitFor(() => expect(container.textContent).toMatch(/jeudi 1 octobre/i), { timeout: 5000 });
    await passerMinuit();
    await vi.waitFor(() => expect(container.textContent).toMatch(/vendredi 2 octobre\s*Aujourd'hui/i), { timeout: 5000 });
  }, 20_000);
});
