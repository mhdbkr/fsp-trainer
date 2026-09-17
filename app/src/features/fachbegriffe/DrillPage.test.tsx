import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/db/db';
import { freshSrs } from '@/lib/srs';
import * as drillQueueModule from '@/lib/collections/drillQueue';
import { DrillPage } from './DrillPage';

// Régression HIGH (branch-review) : `{ id: FAVORITES_DECK_ID, name: 'Favoris' }`
// était recréé à chaque rendu → pool → buildQueue → useEffect → setQueue en
// boucle infinie tant que `!started` (4 111 buildDrillQueue/s mesurés sur
// ?deck=deck-favorites). FAV_DECK est désormais une constante de module ;
// ce test verrouille le nombre d'appels.
vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  return { syncQueue: { push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input } as never; await db.progress_events.put(ev); return ev; }) } };
});

const seed = async () => {
  await db.fachbegriffe.bulkPut([
    { id: 'fb-a', term: 'Abdomen', translationSimple: 'Bauch', specialty: 'Gastroenterologie', pathologyTags: [], centers: ['Freiburg'], linkedCaseIds: [], srs: freshSrs() },
    { id: 'fb-k', term: 'Kardiomyopathie', translationSimple: 'Herzmuskelerkrankung', specialty: 'Kardiologie', pathologyTags: [], centers: ['Freiburg'], linkedCaseIds: [], srs: freshSrs() },
  ] as never);
  await db.favorites.put({ termId: 'fb-a', since: new Date().toISOString() } as never);
};

const renderAt = (url: string) => render(<MemoryRouter initialEntries={[url]}><DrillPage /></MemoryRouter>);

describe('DrillPage — pas de boucle de rendu', () => {
  beforeEach(async () => {
    await db.fachbegriffe.clear(); await db.progress_events.clear();
    await db.decks.clear(); await db.deck_terms.clear(); await db.favorites.clear();
    await seed();
  });

  it('?deck=deck-favorites : buildDrillQueue ne boucle pas (≤ 3 appels après 500 ms)', async () => {
    const spy = vi.spyOn(drillQueueModule, 'buildDrillQueue');
    renderAt('/fachbegriffe/drill?deck=deck-favorites');
    await screen.findByText(/drill fachbegriffe/i);
    await new Promise((r) => setTimeout(r, 500));
    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(spy.mock.calls.length).toBeLessThanOrEqual(3);
    spy.mockRestore();
  });

  it('deck manuel : buildDrillQueue ne boucle pas (≤ 3 appels après 500 ms)', async () => {
    const deckId = await db.decks.add({ id: 'd1', name: 'Kardio', kind: 'manual', createdAt: '', updatedAt: '' } as never);
    await db.deck_terms.add({ deckId: String(deckId), termId: 'fb-k', addedAt: new Date().toISOString() } as never);
    const spy = vi.spyOn(drillQueueModule, 'buildDrillQueue');
    renderAt(`/fachbegriffe/drill?deck=${deckId}`);
    await waitFor(() => expect(screen.getByText(/drill fachbegriffe/i)).toBeTruthy());
    await new Promise((r) => setTimeout(r, 500));
    expect(spy.mock.calls.length).toBeGreaterThanOrEqual(1);
    expect(spy.mock.calls.length).toBeLessThanOrEqual(3);
    spy.mockRestore();
  });
});
