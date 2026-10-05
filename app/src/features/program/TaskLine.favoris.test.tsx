// Lot F point 4 : la tâche drill du jour dit « dont N favoris de ta séance » — lu à l'AFFICHAGE
// (état courant : favoris vivants, file du drill), N > 0 seulement ; jamais stocké dans le plan.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/db/db';
import type { TaskInstance } from '@/db/types';
import { DAY_MS, freshSrs } from '@/lib/srs';
import { useToday } from '@/lib/today';
import { loadDrillContext } from '@/lib/collections/drillContext';
import { TaskLine } from './TaskLine';

vi.mock('@/lib/collections/drillContext', () => ({ loadDrillContext: vi.fn() }));
const ctx = {
  relevance: { now: Date.now(), favorites: [], deckTerms: [], recentSimulations: [], todayCaseIds: [], cases: [] },
  budget: 10, remaining: 0, settings: { mode: 'auto' as const },
  daily: { newPerDay: 10, maxReviewsPerDay: 200, source: 'auto' as const, explain: 'auto' },
  autoDaily: { newPerDay: 10, maxReviewsPerDay: 200, source: 'auto' as const, explain: 'auto' },
  reviewsRemaining: 200,
};
const term = (id: string) => ({ id, term: id, translationSimple: id, specialty: 'Kardiologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs() });
const drill = (over: Partial<TaskInstance> = {}): TaskInstance =>
  ({ id: 'td', date: useToday.getState().day, kind: 'drill', label: 'Fachbegriffe', estMin: 4, source: 'plan', reason: '3 nouveaux termes', ...over });
const dans = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(async () => {
  await Promise.all([db.fachbegriffe.clear(), db.favorites.clear(), db.personal_terms.clear()]);
  await db.fachbegriffe.bulkPut([term('a'), term('b'), term('c')] as never);
  vi.mocked(loadDrillContext).mockReset().mockResolvedValue(ctx as never);
});
afterEach(cleanup);

describe('TaskLine — « dont N favoris de ta séance » (lot F point 4)', () => {
  it('2 favoris Neu de la séance → « dont 2 favoris de ta séance »', async () => {
    await db.favorites.bulkPut([{ termId: 'a', since: new Date().toISOString() }, { termId: 'b', since: new Date().toISOString() }]);
    dans(<TaskLine task={drill()} />);
    expect(await screen.findByText('dont 2 favoris de ta séance')).toBeTruthy();
  });
  it('revue delta I2 : N = favoris de la séance DANS la file, pas tous les favoris vivants', async () => {
    const now = Date.now();
    // b : appris, revu il y a 5 j, échéance dans 15 j — mis en favori maintenant, dû seulement demain.
    await db.fachbegriffe.put({ ...term('b'), srs: { interval: 20, easeFactor: 2.5, dueDate: now + 15 * DAY_MS, repetitions: 3, lapses: 0, state: 'Gelernt' } } as never);
    await db.favorites.bulkPut([
      { termId: 'a', since: new Date(now).toISOString() },                 // neuf, de la séance → compte
      { termId: 'b', since: new Date(now).toISOString() },                 // appris, pas dû aujourd'hui → ne compte pas
      { termId: 'c', since: new Date(now - 72 * 3600_000).toISOString() }, // neuf, > 48 h et AVANT le dernier drill → ne compte pas
    ]);
    vi.mocked(loadDrillContext).mockResolvedValue({ ...ctx, relevance: { ...ctx.relevance, lastDrillAt: now - 3600_000 } } as never);
    dans(<TaskLine task={drill()} />);
    expect(await screen.findByText('dont 1 favori de ta séance')).toBeTruthy();
  });
  it('week-end off : favori neuf > 48 h mais APRÈS le dernier drill → compte (contexte vivant lu, pas la fenêtre seule)', async () => {
    const now = Date.now();
    await db.favorites.put({ termId: 'd', since: new Date(now - 60 * 3600_000).toISOString() });
    await db.fachbegriffe.put(term('d') as never);
    vi.mocked(loadDrillContext).mockResolvedValue({ ...ctx, relevance: { ...ctx.relevance, lastDrillAt: now - 70 * 3600_000 } } as never);
    dans(<TaskLine task={drill()} />);
    expect(await screen.findByText('dont 1 favori de ta séance')).toBeTruthy();
  });
  it('N = 0 : rien', async () => {
    dans(<TaskLine task={drill()} />);
    await new Promise((r) => setTimeout(r, 150));
    expect(screen.queryByText(/favori/)).toBeNull();
  });
  it('jamais sur une tâche faite, en lecture seule (projection, passé) ou d\'un autre jour', async () => {
    await db.favorites.put({ termId: 'a', since: new Date().toISOString() });
    dans(<><TaskLine task={drill({ id: 'x1', doneAt: 1 })} /><TaskLine task={drill({ id: 'x2' })} readOnly /><TaskLine task={drill({ id: 'x3', date: '2020-01-01' })} /><TaskLine task={drill({ id: 'x4', kind: 'fachwissen' })} /></>);
    await new Promise((r) => setTimeout(r, 150));
    expect(screen.queryByText(/favori/)).toBeNull();
  });
});
