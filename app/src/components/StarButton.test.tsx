import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { freshSrs } from '@/lib/srs';
import { FAVORITES_DECK_ID } from '@/db/types';
import { useCardToast } from '@/store/cardToast';
import { createDeck, addTermToDeck } from '@/lib/collections';
import { useTermsInDecks } from '@/hooks/useData';
import { StarButton } from './StarButton';
import { CardToast } from './CardToast';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db');
  const { newId } = await import('@/lib/sync/events');
  // occurred_at monotone par appareil (même formule que queue.ts) : push ET
  // pushMany partagent le même compteur, comme collections/index.test.ts.
  let lastStamp = 0;
  const stamp = () => new Date(lastStamp = Math.max(Date.now(), lastStamp + 1)).toISOString();
  const toEv = (input: { type: string; subject_id: string | null; payload: unknown }) => ({ id: newId(), user_id: 'u', occurred_at: stamp(), ...input }) as never;
  return { syncQueue: {
    push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = toEv(input); await db.progress_events.put(ev); return ev; }),
    pushMany: vi.fn(async (inputs: { type: string; subject_id: string | null; payload: unknown }[]) => { const evs = inputs.map(toEv); await db.progress_events.bulkPut(evs); return evs; }),
  } };
});

const term = { id: 'fb-aszites', term: 'Aszites', translationSimple: 'Bauchwasser', specialty: 'Gastroenterologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs(0) } as never;
function Harness({ caseId }: { caseId?: string }) {
  const inDecks = useTermsInDecks();
  return <><StarButton term={term} filled={inDecks?.has('fb-aszites')} caseId={caseId} /><CardToast /></>;
}

/** L'étoile reste inerte tant que les decks chargent (revue C4) : attendre qu'elle soit prête. */
async function clickEmptyStar() {
  const b = await screen.findByRole('button', { name: 'Ajouter aux favoris : Aszites' });
  await waitFor(() => expect(b.hasAttribute('disabled')).toBe(false));
  fireEvent.click(b);
}

describe('StarButton + CardToast (F4a D6/D7, AC-6)', () => {
  beforeEach(async () => { await db.progress_events.clear(); await db.favorites.clear(); await db.decks.clear(); await db.deck_terms.clear(); useCardToast.setState({ toast: null }); });

  it('★ vide → Favoris (+caseId) ; pilule « Rangée dans Favoris » : toucher ouvre la miniature, « Révéler » la retourne (F4b P5)', async () => {
    render(<Harness caseId="case-leberzirrhose" />);
    await clickEmptyStar();
    expect(await screen.findByText('Favoris', { selector: 'strong' })).toBeTruthy();
    expect((await db.progress_events.toArray()).find((e) => e.type === 'term.favorited')!.payload).toEqual({ caseId: 'case-leberzirrhose' });
    expect(document.querySelector('[data-card-flip]')).toBeNull();   // une ligne : la carte ne s'ouvre qu'au toucher
    fireEvent.click(screen.getByRole('button', { name: /Rangée dans/ }));
    expect(document.querySelector('[data-card-flip]')!.getAttribute('data-card-flip')).toBe('recto');
    fireEvent.click(screen.getByRole('button', { name: 'Révéler' }));
    expect(document.querySelector('[data-card-flip]')!.getAttribute('data-card-flip')).toBe('verso');
    expect(await screen.findByRole('button', { name: 'Decks de Aszites' })).toBeTruthy();
  });
  it('« Changer de deck » déplace : retiré de Favoris, ajouté au deck choisi', async () => {
    const deckId = await createDeck('Leber', 'manual');
    render(<Harness />);
    await clickEmptyStar();
    fireEvent.click(await screen.findByRole('button', { name: 'Changer de deck' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Leber' }));
    await waitFor(async () => expect(await db.deck_terms.get([deckId, 'fb-aszites'])).toBeTruthy());
    expect(await db.favorites.get('fb-aszites')).toBeUndefined();
    expect(await screen.findByText('Leber', { selector: 'strong' })).toBeTruthy();
  });
  it('★ pleine (terme dans un deck) → ouvre la fiche du terme, sans rien émettre (F4b P6 : les decks se rangent dans ses onglets)', async () => {
    const { useUi } = await import('@/store/ui');
    useUi.setState({ glossaryTerm: null });
    const deckId = await createDeck('Leber', 'manual');
    await addTermToDeck(deckId, 'fb-aszites');
    const before = (await db.progress_events.toArray()).length;
    render(<Harness />);
    const full = await screen.findByRole('button', { name: 'Decks de Aszites' });
    expect(full.getAttribute('aria-haspopup')).toBe('dialog');
    fireEvent.click(full);
    expect(useUi.getState().glossaryTerm?.id).toBe('fb-aszites');
    expect((await db.progress_events.toArray()).length).toBe(before);
    expect(FAVORITES_DECK_ID).toBe('deck-favorites');
    useUi.setState({ glossaryTerm: null });
  });
  it('Échap ferme la confirmation (revue C4)', async () => {
    render(<Harness />);
    await clickEmptyStar();
    expect(await screen.findByText('Favoris', { selector: 'strong' })).toBeTruthy();
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByText('Favoris', { selector: 'strong' })).toBeNull());
  });
  it('matière (F4b P3, AC-2) : vide = cristal, pleine = ambre `star` ; jamais de corail', async () => {
    const { container } = render(<Harness />);
    await clickEmptyStar();
    const full = await screen.findByRole('button', { name: 'Decks de Aszites' });
    expect(full.querySelector('[data-star]')!.getAttribute('data-star')).toBe('amber');
    expect(full.className).toContain('text-star-600');
    expect(full.className).toContain('dark:text-star-400');
    render(<StarButton term={{ ...(term as object), id: 'fb-x', term: 'X' } as never} filled={false} />);
    const empty = screen.getByRole('button', { name: 'Ajouter aux favoris : X' });
    expect(empty.querySelector('[data-star]')!.getAttribute('data-star')).toBe('crystal');
    expect(container.ownerDocument.body.innerHTML).not.toMatch(/signal-/);
  });
  it('decks en chargement : étoile inerte, pas de ★ vide cliquable (revue C4)', () => {
    render(<StarButton term={term} filled={undefined} />);
    const b = screen.getByRole('button', { hidden: true });
    expect(b.hasAttribute('disabled')).toBe(true);
    expect(b.getAttribute('aria-busy')).toBe('true');
  });
});
