// R-C3 (intégration s3-programme) : une séance de drill entre dans le journal —
// à la fin, ET au démontage si au moins une carte a été notée (décision de
// main : quitter en cours de route, c'est du travail fait). Une seule fois.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/db/db';
import { freshSrs } from '@/lib/srs';
import { loadDrillContext } from '@/lib/collections/drillContext';
import { DrillPage } from './DrillPage';

vi.mock('@/lib/collections/drillContext', () => ({ loadDrillContext: vi.fn() }));
vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  return { syncQueue: { push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input } as never; await db.progress_events.put(ev); return ev; }) } };
});
const ctx = {
  relevance: { now: Date.now(), favorites: [], deckTerms: [], recentSimulations: [], todayCaseIds: [], cases: [] },
  budget: 10, remaining: 10, settings: { mode: 'auto' as const },
  daily: { newPerDay: 10, maxReviewsPerDay: 200, source: 'auto' as const, explain: 'auto' },
  autoDaily: { newPerDay: 10, maxReviewsPerDay: 200, source: 'auto' as const, explain: 'auto' },
  reviewsRemaining: 200,
};
const drills = async () => (await db.progress_events.where('type').equals('training.logged').toArray())
  .filter((e) => (e.payload as { kind: string }).kind === 'drill');

beforeEach(async () => {
  await Promise.all([db.fachbegriffe.clear(), db.progress_events.clear(), db.training_events.clear(), db.day_plans.clear(), db.decks.clear(), db.deck_terms.clear(), db.favorites.clear(), db.cases.clear(), db.personal_terms.clear()]);
  vi.mocked(loadDrillContext).mockReset(); vi.mocked(loadDrillContext).mockResolvedValue(ctx); localStorage.clear();
  await db.fachbegriffe.bulkPut([
    { id: 'fb-a', term: 'Abdomen', translationSimple: 'Bauch', specialty: 'Gastroenterologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs() },
    { id: 'fb-k', term: 'Kardiomyopathie', translationSimple: 'Herzmuskelerkrankung', specialty: 'Kardiologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs() },
  ] as never);
});

async function noter() {
  fireEvent.click(await screen.findByRole('button', { name: /retourner la carte/i }, { timeout: 10_000 }));
  fireEvent.click(await screen.findByRole('button', { name: /^Gut/ }, { timeout: 10_000 }));
}

describe('R-C3 — le drill dans le journal', () => {
  it('fin de séance : UN training.logged `drill`, ≥ 1 min ; quitter ensuite n\'en écrit pas un second', async () => {
    const v = render(<MemoryRouter initialEntries={['/fachbegriffe/drill']}><DrillPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /commencer/i }, { timeout: 10_000 }));
    await noter(); await noter();
    await waitFor(async () => expect(await drills()).toHaveLength(1), { timeout: 12_000 });
    expect((((await drills())[0].payload) as { spentMin: number }).spentMin).toBeGreaterThanOrEqual(1);
    v.unmount();
    await new Promise((r) => setTimeout(r, 100));
    expect(await drills()).toHaveLength(1);
  }, 40_000);
  it('quitter après une carte notée : la séance est journalisée', async () => {
    const v = render(<MemoryRouter initialEntries={['/fachbegriffe/drill']}><DrillPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /commencer/i }, { timeout: 10_000 }));
    await noter();
    v.unmount();
    await waitFor(async () => expect(await drills()).toHaveLength(1), { timeout: 12_000 });
  }, 40_000);
  it('quitter sans aucune carte notée : rien', async () => {
    const v = render(<MemoryRouter initialEntries={['/fachbegriffe/drill']}><DrillPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /commencer/i }, { timeout: 10_000 }));
    await screen.findByRole('button', { name: /retourner la carte/i }, { timeout: 10_000 });   // la carte est montée (indice « ↻ Espace », 9f975394)
    v.unmount();
    await new Promise((r) => setTimeout(r, 200));
    expect(await drills()).toHaveLength(0);
  }, 40_000);
});
