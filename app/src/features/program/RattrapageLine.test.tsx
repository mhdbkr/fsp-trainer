// C6-B point 3 (FB3-D10) — la ligne de retour, sur l'accueil : « 1 jour manqué :
// X et Y ont glissé » + [Rattraper] [Laisser]. Proposé, jamais imposé.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

vi.mock('@/lib/auth/session', () => ({
  AUTH_MODE: 'public',
  getAccessToken: async () => null,
  useSession: { getState: () => ({ user: null }) },
}));

import { db } from '@/db/db';
import type { ProgramConfig, TaskInstance } from '@/db/types';
import { freezeAt, resetClock } from '@/lib/clock';
import { refreshToday } from '@/lib/today';
import { rebuildJournal } from '@/lib/journal';
import { RattrapageLine } from './RattrapageLine';

const config = { startDate: '2026-09-01', examDate: '2026-12-01', intensity: 'mittel', hoursPerSession: 2, offDays: [0, 6], prioritySpecialties: [], selfLevel: {}, createdAt: 0 } as unknown as ProgramConfig;
const t = (id: string, date: string, caseId: string, label: string): TaskInstance => ({ id, date, kind: 'simulation', caseId, label, estMin: 20, source: 'plan', reason: 'r' });

let container: HTMLDivElement; let root: Root;
const poser = async (jeudi: TaskInstance[], lundi: TaskInstance[]) => {
  await db.progress_events.bulkPut([
    { id: 'p1', user_id: 'u', type: 'plan.materialized', subject_id: '2026-10-01', payload: { tasks: jeudi, mode: 'teil-first', seed: 's', targetMin: 90 }, occurred_at: '2026-10-01T06:00:00Z' },
    { id: 'p2', user_id: 'u', type: 'plan.materialized', subject_id: '2026-10-05', payload: { tasks: lundi, mode: 'teil-first', seed: 's', targetMin: 90 }, occurred_at: '2026-10-05T06:00:00Z' },
  ]);
  await rebuildJournal(await db.progress_events.toArray());
  await act(async () => { root.render(<RattrapageLine />); });
};
const txt = () => container.textContent ?? '';
const btn = (re: RegExp) => [...container.querySelectorAll('button')].find((b) => re.test(b.textContent ?? ''));

beforeEach(async () => {
  freezeAt(new Date(2026, 9, 5, 8, 0));                            // lundi 5 octobre
  refreshToday();
  await Promise.all([db.meta.clear(), db.day_plans.clear(), db.training_events.clear(), db.case_progress.clear(), db.progress_events.clear(), db.outbox.clear()]);
  await db.meta.put({ key: 'program', value: config });
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); resetClock(); });

describe('RattrapageLine', () => {
  it('jour(s) manqué(s) : dit ce qui a glissé, propose, n\'ajoute rien sans clic', async () => {
    await poser([t('j1', '2026-10-01', 'c1', 'Obere GI-Blutung'), t('j2', '2026-10-01', 'c2', 'Pneumonie')], [t('l1', '2026-10-05', 'c9', 'Autre')]);
    await vi.waitFor(() => expect(txt()).toMatch(/1 jour manqué : Obere GI-Blutung et Pneumonie ont glissé/), { timeout: 3000 });
    expect((await db.day_plans.get('2026-10-05'))!.tasks).toHaveLength(1);
    await act(async () => { btn(/^rattraper$/i)!.click(); });
    await vi.waitFor(async () => expect((await db.day_plans.get('2026-10-05'))!.tasks.map((x) => x.caseId)).toEqual(['c9', 'c1', 'c2']), { timeout: 3000 });
    await vi.waitFor(() => expect(txt()).toBe(''), { timeout: 3000 });
  });
  it('« Laisser » retire la ligne sans rien ajouter', async () => {
    await poser([t('j1', '2026-10-01', 'c1', 'A')], [t('l1', '2026-10-05', 'c9', 'Autre')]);
    await vi.waitFor(() => expect(btn(/^laisser$/i)).toBeDefined(), { timeout: 3000 });
    await act(async () => { btn(/^laisser$/i)!.click(); });
    await vi.waitFor(() => expect(txt()).toBe(''), { timeout: 3000 });
    expect((await db.day_plans.get('2026-10-05'))!.tasks).toHaveLength(1);
  });
  it('tout est déjà au programme du jour : on le dit, pas de « Rattraper »', async () => {
    await poser([t('j1', '2026-10-01', 'c1', 'Obere GI-Blutung')], [t('l1', '2026-10-05', 'c1', 'Obere GI-Blutung')]);
    await vi.waitFor(() => expect(txt()).toMatch(/1 jour manqué : Obere GI-Blutung — déjà au plan d'aujourd'hui/), { timeout: 3000 });
    expect(btn(/^rattraper$/i)).toBeUndefined();
    await act(async () => { btn(/^compris$/i)!.click(); });
    await vi.waitFor(() => expect(txt()).toBe(''), { timeout: 3000 });
  });
  it('plus de deux tâches : les deux premières, puis « n autres »', async () => {
    await poser(['a', 'b', 'c', 'd'].map((x, i) => t(`j${i}`, '2026-10-01', `c${i}`, `Cas ${x}`)), [t('l1', '2026-10-05', 'c9', 'Autre')]);
    await vi.waitFor(() => expect(txt()).toMatch(/Cas a, Cas b et 2 autres ont glissé/), { timeout: 3000 });
  });
});
