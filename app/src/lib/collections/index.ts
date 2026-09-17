// ============================================================================
// Mutations des collections : UN événement dans le journal (sync) + reprojection
// locale immédiate. Aucune écriture directe dans decks/deck_terms/favorites.
// ============================================================================
import { db } from '@/db/db';
import { syncQueue } from '@/lib/sync/queue';
import { newId } from '@/lib/sync/events';
import type { DeckQuery } from '@/db/types';
import { FAVORITES_DECK_ID } from '@/db/types';
import { projectCollections, writeCollections } from './project';

export async function reprojectCollections(): Promise<void> {
  await writeCollections(projectCollections(await db.progress_events.toArray()));
}
const emit = async (type: Parameters<typeof syncQueue.push>[0]['type'], subject_id: string, payload: unknown) => {
  await syncQueue.push({ type, subject_id, payload });
  await reprojectCollections();
};

export function normalizeDeckName(raw: string): string {
  const name = raw.trim().replace(/\s+/g, ' ');
  if (name.length < 1 || name.length > 40) throw new Error('deck_name');
  return name;
}

export async function toggleFavorite(termId: string): Promise<boolean> {
  const is = !!(await db.favorites.get(termId));
  await emit(is ? 'term.unfavorited' : 'term.favorited', termId, {});
  return !is;
}
export async function createDeck(name: string, kind: 'manual' | 'smart', query?: DeckQuery): Promise<string> {
  const id = newId();
  await emit('deck.created', id, { name: normalizeDeckName(name), kind, ...(kind === 'smart' ? { query: query ?? {} } : {}) });
  return id;
}
export const renameDeck = async (deckId: string, name: string) => { if (deckId === FAVORITES_DECK_ID) throw new Error('reserved'); await emit('deck.renamed', deckId, { name: normalizeDeckName(name) }); };
export const setDeckQuery = (deckId: string, query: DeckQuery) => emit('deck.query_changed', deckId, { query });
export const deleteDeck = async (deckId: string) => { if (deckId === FAVORITES_DECK_ID) throw new Error('reserved'); await emit('deck.deleted', deckId, {}); };
export const addToDeck = (deckId: string, termId: string) => emit('deck.term_added', deckId, { termId });
export const removeFromDeck = (deckId: string, termId: string) => emit('deck.term_removed', deckId, { termId });
