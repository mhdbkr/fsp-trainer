import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { db } from '@/db/db';
import { createDeck, addTermToDeck } from '@/lib/collections';
import { scheduleDeletion, cancelDeletion } from '@/lib/collections/pendingDeletion';
import { useDecks, useTermsInDecks } from './useData';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db');
  const { newId } = await import('@/lib/sync/events');
  let lastStamp = 0;
  const stamp = () => new Date(lastStamp = Math.max(Date.now(), lastStamp + 1)).toISOString();
  const toEv = (input: { type: string; subject_id: string | null; payload: unknown }) => ({ id: newId(), user_id: 'u', occurred_at: stamp(), ...input }) as never;
  return { syncQueue: {
    push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = toEv(input); await db.progress_events.put(ev); return ev; }),
    pushMany: vi.fn(async (inputs: { type: string; subject_id: string | null; payload: unknown }[]) => { const evs = inputs.map(toEv); await db.progress_events.bulkPut(evs); return evs; }),
  } };
});

describe('decks en attente de suppression (revue E1)', () => {
  beforeEach(async () => { await db.progress_events.clear(); await db.decks.clear(); await db.deck_terms.clear(); await db.favorites.clear(); });

  it('masqués partout pendant le délai : absents de useDecks, ne tiennent plus aucune ★ ; Annuler les rend', async () => {
    const deckId = await createDeck('Kardio', 'manual');
    await addTermToDeck(deckId, 'fb-1');
    const decks = renderHook(() => useDecks());
    const inDecks = renderHook(() => useTermsInDecks());
    await waitFor(() => expect(decks.result.current?.map((d) => d.id)).toContain(deckId));
    await waitFor(() => expect(inDecks.result.current?.has('fb-1')).toBe(true));
    await act(async () => { await scheduleDeletion(deckId, 60_000, 'deck'); });
    expect(decks.result.current?.map((d) => d.id)).not.toContain(deckId);
    expect(inDecks.result.current?.has('fb-1')).toBe(false);
    act(() => { cancelDeletion(deckId); });
    expect(decks.result.current?.map((d) => d.id)).toContain(deckId);
    expect(inDecks.result.current?.has('fb-1')).toBe(true);
  });
});
