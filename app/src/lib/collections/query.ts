import type { Deck, DeckQuery, DeckTerm, Fachbegriff, Favorite } from '@/db/types';
import { FAVORITES_DECK_ID } from '@/db/types';

/** Les mêmes filtres que la page Fachbegriffe — un deck intelligent n'est qu'une requête enregistrée. */
export function applyQuery(q: DeckQuery, all: Fachbegriff[]): Fachbegriff[] {
  const needle = q.q?.trim().toLowerCase();
  return all.filter((b) =>
    (!needle || `${b.term} ${b.translationSimple}`.toLowerCase().includes(needle))
    && (!q.specialty || b.specialty === q.specialty)
    && (!q.state || b.srs.state === q.state)
    && (!q.center || b.centers.includes(q.center)));
}

export function termsOfDeck(deck: Deck | { id: typeof FAVORITES_DECK_ID }, all: Fachbegriff[], deckTerms: DeckTerm[], favorites: Favorite[]): Fachbegriff[] {
  if (deck.id === FAVORITES_DECK_ID) { const ids = new Set(favorites.map((f) => f.termId)); return all.filter((b) => ids.has(b.id)); }
  const d = deck as Deck;
  if (d.kind === 'smart') return applyQuery(d.query ?? {}, all);
  const ids = new Set(deckTerms.filter((t) => t.deckId === d.id).map((t) => t.termId));
  return all.filter((b) => ids.has(b.id));
}

/** Ids des termes rangés dans au moins un deck, Favoris compris — ★ plein (F4a D6). */
export function termIdsInDecks(favorites: Favorite[], deckTerms: DeckTerm[]): Set<string> {
  return new Set([...favorites.map((f) => f.termId), ...deckTerms.map((t) => t.termId)]);
}
/** Decks (ids) qui contiennent le terme : Favoris d'abord, puis les decks manuels. */
export function decksOfTerm(termId: string, favorites: Favorite[], deckTerms: DeckTerm[]): string[] {
  return [
    ...(favorites.some((f) => f.termId === termId) ? [FAVORITES_DECK_ID] : []),
    ...deckTerms.filter((t) => t.termId === termId).map((t) => t.deckId),
  ];
}
