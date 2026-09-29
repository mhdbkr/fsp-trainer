// ============================================================================
// Mutations des collections : UN événement dans le journal (sync) + reprojection
// locale immédiate. Aucune écriture directe dans decks/deck_terms/favorites.
// ============================================================================
import { db } from '@/db/db';
import { syncQueue } from '@/lib/sync/queue';
import { newId, type NewEvent } from '@/lib/sync/events';
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

export async function toggleFavorite(termId: string, opts: { caseId?: string } = {}): Promise<boolean> {
  const is = !!(await db.favorites.get(termId));
  // caseId n'a de sens qu'à l'ajout (« marqué pendant ce cas ») — jamais sur term.unfavorited (contrat).
  await emit(is ? 'term.unfavorited' : 'term.favorited', termId, !is && opts.caseId ? { caseId: opts.caseId } : {});
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
/** Suppression d'un deck PLANIFIÉE (F4b P6) : rien n'est émis ici (Annuler
 *  pendant le délai, pendingDeletion) ; les termes restent dans le glossaire. */
export function planDeckDeletion(deckId: string): NewEvent[] {
  if (deckId === FAVORITES_DECK_ID) throw new Error('reserved');
  return [{ type: 'deck.deleted', subject_id: deckId, payload: {} }];
}
/** Émet un lot planifié en UNE transaction, puis reprojette les collections. */
export async function commitCollectionEvents(events: NewEvent[]): Promise<void> {
  await syncQueue.pushMany(events);
  await reprojectCollections();
}
export const addToDeck = (deckId: string, termId: string, opts: { caseId?: string } = {}) => emit('deck.term_added', deckId, { termId, ...(opts.caseId ? { caseId: opts.caseId } : {}) });
export const removeFromDeck = (deckId: string, termId: string) => emit('deck.term_removed', deckId, { termId });

// -- Rangement d'un terme (F4a D6) : une seule notion de deck, Favoris compris. --
// planAdd/planRemove sont PURS côté décision (lisent l'état, ne l'émettent pas) :
// moveTermToDeck combine les deux plans en UNE transaction (pushMany), sinon un
// « déplacer » interrompu (crash, onglet fermé) laisserait le terme nulle part.
async function planAddTermToDeck(deckId: string, termId: string, opts: { caseId?: string }): Promise<NewEvent | null> {
  if (deckId === FAVORITES_DECK_ID) {
    if (await db.favorites.get(termId)) return null;
    return { type: 'term.favorited', subject_id: termId, payload: opts.caseId ? { caseId: opts.caseId } : {} };
  }
  const deck = await db.decks.get(deckId);
  if (!deck || deck.kind === 'smart') return null;   // un deck intelligent se remplit par sa requête : ★ plein fantôme sinon (revue C3)
  if (await db.deck_terms.get([deckId, termId])) return null;
  return { type: 'deck.term_added', subject_id: deckId, payload: { termId, ...(opts.caseId ? { caseId: opts.caseId } : {}) } };
}
async function planRemoveTermFromDeck(deckId: string, termId: string): Promise<NewEvent | null> {
  if (deckId === FAVORITES_DECK_ID) {
    if (!(await db.favorites.get(termId))) return null;
    return { type: 'term.unfavorited', subject_id: termId, payload: {} };
  }
  if (!(await db.deck_terms.get([deckId, termId]))) return null;
  return { type: 'deck.term_removed', subject_id: deckId, payload: { termId } };
}
/** Range un terme dans un deck (F4a D6) : Favoris = term.favorited (deck réservé),
 *  sinon deck.term_added. Idempotent : déjà rangé → rien n'est émis. */
export async function addTermToDeck(deckId: string, termId: string, opts: { caseId?: string } = {}): Promise<void> {
  const event = await planAddTermToDeck(deckId, termId, opts);
  if (!event) return;
  await syncQueue.pushMany([event]);
  await reprojectCollections();
}
/** Retire un terme d'un deck (Favoris compris). Absent → rien n'est émis. */
export async function removeTermFromDeck(deckId: string, termId: string): Promise<void> {
  const event = await planRemoveTermFromDeck(deckId, termId);
  if (!event) return;
  await syncQueue.pushMany([event]);
  await reprojectCollections();
}
/** « Changer de deck » = DÉPLACER (D6) : retrait de l'ancien + ajout au nouveau
 *  en UNE transaction (pushMany) — jamais retiré sans être ajouté, ni l'inverse. */
export async function moveTermToDeck(termId: string, fromDeckId: string, toDeckId: string, opts: { caseId?: string } = {}): Promise<void> {
  if (fromDeckId === toDeckId) return;
  const events = (await Promise.all([planRemoveTermFromDeck(fromDeckId, termId), planAddTermToDeck(toDeckId, termId, opts)]))
    .filter((e): e is NewEvent => e !== null);
  if (!events.length) return;
  await syncQueue.pushMany(events);
  await reprojectCollections();
}
