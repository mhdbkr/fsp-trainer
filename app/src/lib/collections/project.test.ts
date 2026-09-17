import { describe, it, expect, beforeEach } from 'vitest';
import { projectCollections, sortEvents } from './project';
import type { ProgressEvent } from '@/lib/sync/events';
import { db } from '@/db/db';
import { rebuildProjections } from '@/lib/sync/projections';

const ev = (type: ProgressEvent['type'], subject_id: string, payload: unknown, t: number, id = `${type}-${subject_id}-${t}`): ProgressEvent =>
  ({ id, user_id: 'u', type, subject_id, payload, occurred_at: new Date(Date.UTC(2026, 8, 17, 10, 0, t)).toISOString() });

const shuffle = <T,>(a: T[]) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = (i * 7919) % (i + 1); [b[i], b[j]] = [b[j], b[i]]; } return b; };

describe('projectCollections', () => {
  it('ignore les autres types et part vide', () => {
    expect(projectCollections([ev('srs.reviewed', 'fb-1', {}, 1)])).toEqual({ decks: [], deckTerms: [], favorites: [] });
  });

  it('favori : le dernier événement par terme gagne', () => {
    const s = projectCollections([ev('term.favorited', 'fb-1', {}, 1), ev('term.unfavorited', 'fb-1', {}, 2), ev('term.favorited', 'fb-2', {}, 3)]);
    expect(s.favorites.map((f) => f.termId)).toEqual(['fb-2']);
  });

  it('deck : créé, renommé, termes ajoutés/retirés, supprimé — état exact', () => {
    const d = 'd1';
    const events = [
      ev('deck.created', d, { name: 'Kardio', kind: 'manual' }, 1),
      ev('deck.term_added', d, { termId: 'fb-1' }, 2),
      ev('deck.term_added', d, { termId: 'fb-2' }, 3),
      ev('deck.term_added', d, { termId: 'fb-3' }, 4),
      ev('deck.renamed', d, { name: 'Kardio II' }, 5),
      ev('deck.term_removed', d, { termId: 'fb-2' }, 6),
    ];
    const s = projectCollections(events);
    expect(s.decks).toEqual([{ id: d, name: 'Kardio II', kind: 'manual', query: undefined, createdAt: events[0].occurred_at, updatedAt: events[5].occurred_at }]);
    expect(s.deckTerms.map((t) => t.termId).sort()).toEqual(['fb-1', 'fb-3']);
    const after = projectCollections([...events, ev('deck.deleted', d, {}, 7), ev('deck.term_added', d, { termId: 'fb-9' }, 8)]);
    expect(after.decks).toEqual([]);
    expect(after.deckTerms).toEqual([]);
  });

  it('idempotence : ordre mélangé → même état', () => {
    const d = 'd2';
    const events = [
      ev('deck.created', d, { name: 'Gastro', kind: 'smart', query: { specialty: 'Gastroenterologie' } }, 1),
      ev('deck.query_changed', d, { query: { specialty: 'Gastroenterologie', state: 'Zu wiederholen' } }, 2),
      ev('term.favorited', 'fb-1', {}, 3),
      ev('deck.term_added', d, { termId: 'fb-1' }, 4),
      ev('term.unfavorited', 'fb-1', {}, 5),
      ev('term.favorited', 'fb-1', {}, 6),
    ];
    const a = projectCollections(events), b = projectCollections(shuffle(events));
    expect(b).toEqual(a);
    expect(a.decks[0].query).toEqual({ specialty: 'Gastroenterologie', state: 'Zu wiederholen' });
    expect(a.favorites).toHaveLength(1);
  });

  it('deck-favorites : term_added/removed sans deck.created sont acceptés (deck implicite)', () => {
    const s = projectCollections([ev('deck.term_added', 'deck-favorites', { termId: 'fb-1' }, 1)]);
    expect(s.deckTerms).toEqual([{ deckId: 'deck-favorites', termId: 'fb-1', addedAt: s.deckTerms[0].addedAt }]);
    expect(s.decks).toEqual([]);   // le deck Favoris est virtuel : l'UI le fabrique
  });

  it('sortEvents : occurred_at, puis received_at (absent = dernier), puis id', () => {
    const a = { ...ev('plan.done', 'p', {}, 1, 'b'), received_at: '2026-09-17T10:00:00Z' };
    const b = { ...ev('plan.done', 'p', {}, 1, 'a') };
    const c = { ...ev('plan.done', 'p', {}, 1, 'c'), received_at: '2026-09-17T09:00:00Z' };
    expect(sortEvents([a, b, c]).map((e) => e.id)).toEqual(['c', 'b', 'a']);
  });

  it('deck : recréé après suppression, un nouveau terme est accepté', () => {
    const d = 'd3';
    const events = [
      ev('deck.created', d, { name: 'Neuro', kind: 'manual' }, 1),
      ev('deck.term_added', d, { termId: 'fb-1' }, 2),
      ev('deck.deleted', d, {}, 3),
      ev('deck.created', d, { name: 'Neuro II', kind: 'manual' }, 4),
      ev('deck.term_added', d, { termId: 'fb-2' }, 5),
    ];
    const s = projectCollections(events);
    expect(s.decks).toEqual([{ id: d, name: 'Neuro II', kind: 'manual', query: undefined, createdAt: events[3].occurred_at, updatedAt: events[4].occurred_at }]);
    expect(s.deckTerms).toEqual([{ deckId: d, termId: 'fb-2', addedAt: events[4].occurred_at }]);
  });

  it('deck-favorites : deck.created/deck.renamed sont ignorés (aucun deck en sortie)', () => {
    const s = projectCollections([
      ev('deck.created', 'deck-favorites', { name: 'Favoris', kind: 'manual' }, 1),
      ev('deck.renamed', 'deck-favorites', { name: 'Mes favoris' }, 2),
    ]);
    expect(s.decks).toEqual([]);
  });

  describe('rebuildProjections (intégration Dexie)', () => {
    beforeEach(async () => {
      await db.progress_events.clear();
      await db.decks.clear(); await db.deck_terms.clear(); await db.favorites.clear();
    });

    it('reconstruit decks/deck_terms/favorites depuis le journal', async () => {
      const d = 'd-int';
      const events: ProgressEvent[] = [
        ev('deck.created', d, { name: 'Endoc', kind: 'manual' }, 1),
        ev('deck.term_added', d, { termId: 'fb-1' }, 2),
        ev('term.favorited', 'fb-1', {}, 3),
      ];
      await db.progress_events.bulkPut(events);
      await rebuildProjections();

      const decks = await db.decks.toArray();
      const deckTerms = await db.deck_terms.toArray();
      const favorites = await db.favorites.toArray();

      expect(decks).toEqual([{ id: d, name: 'Endoc', kind: 'manual', query: undefined, createdAt: events[0].occurred_at, updatedAt: events[1].occurred_at }]);
      expect(deckTerms).toEqual([{ deckId: d, termId: 'fb-1', addedAt: events[1].occurred_at }]);
      expect(favorites).toEqual([{ termId: 'fb-1', since: events[2].occurred_at }]);
    });
  });
});
