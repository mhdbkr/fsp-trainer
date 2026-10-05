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
    { id: 'p2', user_id: 'u', type: 'plan.materialized', subject_id: '2026-10-05', payload: { tasks: lundi, mode: 'teil-first', seed: 's', targetMin: 240 }, occurred_at: '2026-10-05T06:00:00Z' },
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
    await vi.waitFor(() => expect(txt()).toMatch(/1 jour manqué : Obere GI-Blutung et Pneumonie ont glissé/), { timeout: 10000 });
    expect((await db.day_plans.get('2026-10-05'))!.tasks).toHaveLength(1);
    await act(async () => { btn(/^rattraper$/i)!.click(); });
    await vi.waitFor(async () => expect((await db.day_plans.get('2026-10-05'))!.tasks.map((x) => x.caseId)).toEqual(['c1', 'c2', 'c9']), { timeout: 10000 });   // §12.8 : le reste revient EN TÊTE, avant la première tâche non faite
    await vi.waitFor(() => expect(txt()).toBe(''), { timeout: 10000 });
  });
  it('« Laisser » retire la ligne sans rien ajouter', async () => {
    await poser([t('j1', '2026-10-01', 'c1', 'A')], [t('l1', '2026-10-05', 'c9', 'Autre')]);
    await vi.waitFor(() => expect(btn(/^laisser$/i)).toBeDefined(), { timeout: 10000 });
    await act(async () => { btn(/^laisser$/i)!.click(); });
    await vi.waitFor(() => expect(txt()).toBe(''), { timeout: 10000 });
    expect((await db.day_plans.get('2026-10-05'))!.tasks).toHaveLength(1);
  });
  it('tout est déjà au programme du jour : on le dit, pas de « Rattraper »', async () => {
    await poser([t('j1', '2026-10-01', 'c1', 'Obere GI-Blutung')], [t('l1', '2026-10-05', 'c1', 'Obere GI-Blutung')]);
    await vi.waitFor(() => expect(txt()).toMatch(/1 jour manqué : Obere GI-Blutung — déjà au plan d'aujourd'hui/), { timeout: 10000 });
    expect(btn(/^rattraper$/i)).toBeUndefined();
    await act(async () => { btn(/^compris$/i)!.click(); });
    await vi.waitFor(() => expect(txt()).toBe(''), { timeout: 10000 });
  });
  it('plus de deux tâches : les deux premières, puis « n autres »', async () => {
    await poser(['a', 'b', 'c', 'd'].map((x, i) => t(`j${i}`, '2026-10-01', `c${i}`, `Cas ${x}`)), [t('l1', '2026-10-05', 'c9', 'Autre')]);
    await vi.waitFor(() => expect(txt()).toMatch(/Cas a, Cas b et 2 autres ont glissé/), { timeout: 10000 });
  });
  it('cas mixte : ce qui glisse ET ce qui est déjà au plan, les deux dits', async () => {
    await poser([t('j1', '2026-10-01', 'c1', 'Obere GI-Blutung'), t('j2', '2026-10-01', 'c2', 'Pneumonie')], [t('l1', '2026-10-05', 'c1', 'Obere GI-Blutung')]);
    await vi.waitFor(() => expect(txt()).toMatch(/1 jour manqué : Pneumonie a glissé \(Obere GI-Blutung déjà au plan\)\./), { timeout: 10000 });
    expect(btn(/^rattraper$/i)).toBeDefined();
  });
});

describe('Revue pédagogique — « Finir hier » dit qui, quoi, combien, et propose ce soir', () => {
  const entame = (date: string): TaskInstance => ({ id: `t-${date}`, date, kind: 'simulation', caseId: 'c7', label: 'Pneumonie', teile: ['dokumentation', 'fallvorstellung'], estMin: 32, source: 'plan', reason: 'r' });
  const deux = async (veille: string, jour: string) => {
    await db.progress_events.bulkPut([
      { id: 'q1', user_id: 'u', type: 'plan.materialized', subject_id: veille, payload: { tasks: [entame(veille)], mode: 'cas-complet', seed: 's', targetMin: 90 }, occurred_at: `${veille}T06:00:00Z` },
      { id: 'q2', user_id: 'u', type: 'plan.materialized', subject_id: jour, payload: { tasks: [t(`a-${jour}`, jour, 'c9', 'Autre')], mode: 'cas-complet', seed: 's', targetMin: 240 }, occurred_at: `${jour}T06:00:00Z` },
    ]);
    await rebuildJournal(await db.progress_events.toArray());
    await act(async () => { root.render(<RattrapageLine />); });
  };
  it('la veille : « Hier, tu as commencé Pneumonie : il te reste la Dokumentation et la Fallvorstellung (32 min). La finir ce soir ? »', async () => {
    freezeAt(new Date(2026, 9, 6, 8, 0)); refreshToday();
    await deux('2026-10-05', '2026-10-06');
    await vi.waitFor(() => expect(txt()).toMatch(/^Hier, tu as commencé Pneumonie : il te reste la Dokumentation et la Fallvorstellung \(32 min\)\. La finir ce soir \?/), { timeout: 10000 });
  });
  it('après un week-end off : la date, pas « hier »', async () => {
    await deux('2026-10-02', '2026-10-05');                          // vendredi → lundi, samedi et dimanche off
    await vi.waitFor(() => expect(txt()).toMatch(/^Vendredi 2 octobre, tu as commencé Pneumonie : il te reste la Dokumentation et la Fallvorstellung \(32 min\)\. La finir ce soir \?/), { timeout: 10000 });
  });
});
