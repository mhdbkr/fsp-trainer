import { describe, it, expect } from 'vitest';
import { applyQuery, termsOfDeck } from './query';
import { FAVORITES_DECK_ID, type Fachbegriff } from '@/db/types';
import { freshSrs } from '@/lib/srs';

const fb = (id: string, term: string, specialty: string, state: Fachbegriff['srs']['state'] = 'Neu', centers: string[] = ['Freiburg']): Fachbegriff =>
  ({ id, term, translationSimple: 's', specialty: specialty as never, pathologyTags: [], centers: centers as never, linkedCaseIds: [], srs: { ...freshSrs(), state } });
const all = [fb('a', 'Abdomen', 'Gastroenterologie'), fb('b', 'Bradykardie', 'Kardiologie', 'Zu wiederholen'), fb('c', 'Cholezystitis', 'Gastroenterologie', 'Gelernt', ['Stuttgart'])];

describe('applyQuery', () => {
  it('vide → tout', () => expect(applyQuery({}, all)).toHaveLength(3));
  it('spécialité + état', () => expect(applyQuery({ specialty: 'Gastroenterologie' as never, state: 'Gelernt' }, all).map((x) => x.id)).toEqual(['c']));
  it('recherche insensible à la casse sur terme et traduction', () => expect(applyQuery({ q: 'brady' }, all).map((x) => x.id)).toEqual(['b']));
  it('centre', () => expect(applyQuery({ center: 'Stuttgart' as never }, all).map((x) => x.id)).toEqual(['c']));
});

describe('termsOfDeck', () => {
  it('manuel → jointure deck_terms', () => {
    const deck = { id: 'd', name: 'x', kind: 'manual' as const, createdAt: '', updatedAt: '' };
    expect(termsOfDeck(deck, all, [{ deckId: 'd', termId: 'c', addedAt: '' }, { deckId: 'z', termId: 'a', addedAt: '' }], []).map((x) => x.id)).toEqual(['c']);
  });
  it('smart → applyQuery', () => {
    const deck = { id: 'd', name: 'x', kind: 'smart' as const, query: { state: 'Zu wiederholen' as const }, createdAt: '', updatedAt: '' };
    expect(termsOfDeck(deck, all, [], []).map((x) => x.id)).toEqual(['b']);
  });
  it('favoris → table favorites', () => {
    expect(termsOfDeck({ id: FAVORITES_DECK_ID }, all, [], [{ termId: 'a', since: '' }]).map((x) => x.id)).toEqual(['a']);
  });
});
