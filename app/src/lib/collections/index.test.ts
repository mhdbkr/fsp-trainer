import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db/db';
import { toggleFavorite, createDeck, renameDeck, deleteDeck, addToDeck, removeFromDeck, setDeckQuery, normalizeDeckName, addTermToDeck, removeTermFromDeck, moveTermToDeck } from './index';
import { FAVORITES_DECK_ID } from '@/db/types';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db');
  const { newId } = await import('@/lib/sync/events');
  // occurred_at monotone par appareil (même formule que queue.ts) : push ET
  // pushMany partagent le même compteur, comme personalTerms.test.ts.
  let lastStamp = 0;
  const stamp = () => new Date(lastStamp = Math.max(Date.now(), lastStamp + 1)).toISOString();
  const toEv = (input: { type: string; subject_id: string | null; payload: unknown }) => ({ id: newId(), user_id: 'u', occurred_at: stamp(), ...input }) as never;
  return { syncQueue: {
    push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = toEv(input); await db.progress_events.put(ev); return ev; }),
    pushMany: vi.fn(async (inputs: { type: string; subject_id: string | null; payload: unknown }[]) => { const evs = inputs.map(toEv); await db.progress_events.bulkPut(evs); return evs; }),
  } };
});

describe('collections mutations', () => {
  beforeEach(async () => { await db.progress_events.clear(); await db.decks.clear(); await db.deck_terms.clear(); await db.favorites.clear(); });

  it('toggleFavorite émet term.favorited puis term.unfavorited et projette', async () => {
    expect(await toggleFavorite('fb-1')).toBe(true);
    expect(await db.favorites.get('fb-1')).toBeTruthy();
    expect((await db.progress_events.toArray()).map((e) => e.type)).toEqual(['term.favorited']);
    expect(await toggleFavorite('fb-1')).toBe(false);
    expect(await db.favorites.get('fb-1')).toBeUndefined();
  });

  it('toggleFavorite avec opts.caseId enrichit le payload (F2a)', async () => {
    // toArray() trie par clé primaire (uuid), pas par insertion : on cherche par type.
    await toggleFavorite('fb-9', { caseId: 'c1' });
    const fav = (await db.progress_events.toArray()).find((e) => e.type === 'term.favorited' && e.subject_id === 'fb-9');
    expect(fav?.payload).toEqual({ caseId: 'c1' });
    await toggleFavorite('fb-9', { caseId: 'c1' });   // retrait : jamais de caseId sur term.unfavorited
    const unfav = (await db.progress_events.toArray()).find((e) => e.type === 'term.unfavorited' && e.subject_id === 'fb-9');
    expect(unfav?.payload).toEqual({});
  });

  it('cycle de vie d\'un deck manuel', async () => {
    const id = await createDeck('  Kardio   II ', 'manual');
    expect((await db.decks.get(id))?.name).toBe('Kardio II');
    await addToDeck(id, 'fb-1'); await addToDeck(id, 'fb-2'); await removeFromDeck(id, 'fb-1');
    expect((await db.deck_terms.where('deckId').equals(id).toArray()).map((t) => t.termId)).toEqual(['fb-2']);
    await renameDeck(id, 'Herz');
    expect((await db.decks.get(id))?.name).toBe('Herz');
    await deleteDeck(id);
    expect(await db.decks.get(id)).toBeUndefined();
    expect(await db.deck_terms.where('deckId').equals(id).count()).toBe(0);
  });

  it('deck intelligent : query modifiable ; Favoris non supprimable', async () => {
    const id = await createDeck('Gastro', 'smart', { specialty: 'Gastroenterologie' as never });
    await setDeckQuery(id, { specialty: 'Gastroenterologie' as never, state: 'Zu wiederholen' });
    expect((await db.decks.get(id))?.query).toEqual({ specialty: 'Gastroenterologie', state: 'Zu wiederholen' });
    await expect(deleteDeck(FAVORITES_DECK_ID)).rejects.toThrow();
    await expect(renameDeck(FAVORITES_DECK_ID, 'x')).rejects.toThrow();   // rejet asynchrone, comme toute mutation
  });

  it('normalizeDeckName : bornes', () => {
    expect(normalizeDeckName('  a  b ')).toBe('a b');
    expect(() => normalizeDeckName('   ')).toThrow('deck_name');
    expect(() => normalizeDeckName('x'.repeat(41))).toThrow('deck_name');
  });

  it('addTermToDeck / removeTermFromDeck : Favoris = term.favorited ; idempotents (F4a D6)', async () => {
    await addTermToDeck(FAVORITES_DECK_ID, 'fb-1', { caseId: 'case-x' });
    await addTermToDeck(FAVORITES_DECK_ID, 'fb-1');
    const deckId = await createDeck('Kardio', 'manual');
    await addTermToDeck(deckId, 'fb-1'); await addTermToDeck(deckId, 'fb-1');
    const evs = await db.progress_events.toArray();
    expect(evs.map((e) => e.type).sort()).toEqual(['deck.created', 'deck.term_added', 'term.favorited']);
    expect(evs.find((e) => e.type === 'term.favorited')!.payload).toEqual({ caseId: 'case-x' });
    await removeTermFromDeck(FAVORITES_DECK_ID, 'fb-1'); await removeTermFromDeck(FAVORITES_DECK_ID, 'fb-1');
    expect((await db.progress_events.toArray()).filter((e) => e.type === 'term.unfavorited')).toHaveLength(1);
  });
  it('moveTermToDeck : retiré de l\'ancien, ajouté au nouveau (Changer de deck = déplacer)', async () => {
    await addTermToDeck(FAVORITES_DECK_ID, 'fb-1');
    const deckId = await createDeck('Kardio', 'manual');
    await moveTermToDeck('fb-1', FAVORITES_DECK_ID, deckId);
    expect(await db.favorites.get('fb-1')).toBeUndefined();
    expect(await db.deck_terms.get([deckId, 'fb-1'])).toBeTruthy();
  });
  it('moveTermToDeck : UN seul pushMany (retrait + ajout atomiques) ; même deck ou deck intelligent → rien', async () => {
    const { syncQueue } = await import('@/lib/sync/queue');
    await addTermToDeck(FAVORITES_DECK_ID, 'fb-2');
    const deckId = await createDeck('Pneumo', 'manual');
    const smart = await createDeck('Neu', 'smart');
    vi.mocked(syncQueue.pushMany).mockClear();
    await moveTermToDeck('fb-2', FAVORITES_DECK_ID, deckId);
    expect(vi.mocked(syncQueue.pushMany).mock.calls.map((c) => (c[0] as { type: string }[]).map((e) => e.type))).toEqual([['term.unfavorited', 'deck.term_added']]);
    vi.mocked(syncQueue.pushMany).mockClear();
    await moveTermToDeck('fb-2', deckId, deckId);
    await addTermToDeck(smart, 'fb-2');
    expect(syncQueue.pushMany).not.toHaveBeenCalled();
  });
});
