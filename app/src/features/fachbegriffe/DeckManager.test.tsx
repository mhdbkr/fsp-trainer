import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { useCardToast } from '@/store/cardToast';
import { useDecks } from '@/hooks/useData';
import { createDeck, reprojectCollections } from '@/lib/collections';
import { cancelDeletion, usePendingDeletions } from '@/lib/collections/pendingDeletion';
import { CardToast } from '@/components/CardToast';
import { DeckManager } from './DeckManager';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  let lastStamp = 0;
  const stamp = () => new Date(lastStamp = Math.max(Date.now(), lastStamp + 1)).toISOString();
  const toEv = (input: { type: string; subject_id: string | null; payload: unknown }) => ({ id: newId(), user_id: 'u', occurred_at: stamp(), ...input }) as never;
  return { syncQueue: {
    push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = toEv(input); await db.progress_events.put(ev); return ev; }),
    pushMany: vi.fn(async (inputs: { type: string; subject_id: string | null; payload: unknown }[]) => { const evs = inputs.map(toEv); await db.progress_events.bulkPut(evs); return evs; }),
  } };
});

// useDecks() live : masque déjà les decks en attente de suppression, comme
// chez les vrais appelants (FachbegriffePage, GlossaryDrawer) — pas de refiltre ici.
function Harness({ onClose }: { onClose: () => void }) {
  const decks = useDecks();
  return <><DeckManager decks={decks ?? []} counts={{ 'deck-favorites': 2 }} onClose={onClose} /><CardToast /></>;
}
function renderManager(onClose = vi.fn()) {
  return render(<Harness onClose={onClose} />);
}

function OpenerHarness() {
  const decks = useDecks();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>⋯ Decks</button>
      {open && <DeckManager decks={decks ?? []} counts={{ 'deck-favorites': 2 }} onClose={() => setOpen(false)} />}
      <CardToast />
    </>
  );
}

describe('DeckManager (F4b P6, AC-5)', () => {
  beforeEach(async () => {
    await db.progress_events.clear(); await db.decks.clear(); await db.deck_terms.clear(); await db.favorites.clear();
    useCardToast.setState({ toast: null }); usePendingDeletions.setState({ ids: new Set() });
  });

  it('renommer sur place (Entrée) → deck.renamed ; Favoris n\'est ni renommable ni supprimable', async () => {
    const id = await createDeck('Leber', 'manual');
    renderManager();
    const input = await screen.findByRole('textbox', { name: 'Nom du deck Leber' });
    expect(screen.queryByRole('textbox', { name: /Favoris/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /Supprimer le deck Favoris/ })).toBeNull();
    fireEvent.change(input, { target: { value: 'Leber & Galle' } });
    fireEvent.keyDown(input, { key: 'Enter' }); fireEvent.blur(input);
    await waitFor(async () => expect((await db.decks.get(id))?.name).toBe('Leber & Galle'));
  });
  it('nom vide → message, rien n\'est émis', async () => {
    await createDeck('Leber', 'manual');
    renderManager();
    const input = await screen.findByRole('textbox', { name: 'Nom du deck Leber' });
    fireEvent.change(input, { target: { value: '   ' } }); fireEvent.blur(input);
    expect(await screen.findByText('Nom : 1 à 40 caractères.')).toBeTruthy();
    expect((await db.progress_events.toArray()).some((e) => e.type === 'deck.renamed')).toBe(false);
  });
  it('supprimer → masqué, pilule « Deck supprimé · Annuler » ; Annuler → rien n\'est émis', async () => {
    const id = await createDeck('Leber', 'manual');
    renderManager();
    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer le deck Leber' }));
    expect(await screen.findByText('Deck « Leber » supprimé')).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Nom du deck Leber' })).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    await waitFor(() => expect(usePendingDeletions.getState().ids.has(id)).toBe(false));
    expect(await screen.findByRole('textbox', { name: 'Nom du deck Leber' })).toBeTruthy();
    expect((await db.progress_events.toArray()).some((e) => e.type === 'deck.deleted')).toBe(false);
    expect(cancelDeletion(id)).toBe(false);
  });
  it('deck intelligent : icône ; créer un deck manuel sur place ; Échap délègue', async () => {
    await db.progress_events.put({ id: 'e1', user_id: 'u', type: 'deck.created', subject_id: 's1', payload: { name: 'À revoir', kind: 'smart', query: { state: 'Zu wiederholen' } }, occurred_at: '2020-01-01T00:00:00Z' } as never);
    await reprojectCollections();
    const onClose = vi.fn();
    renderManager(onClose);
    expect(await screen.findByRole('img', { name: 'Deck intelligent' })).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox', { name: 'Nom du nouveau deck' }), { target: { value: 'Hepato' } });
    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
    await waitFor(async () => expect((await db.decks.toArray()).some((d) => d.name === 'Hepato' && d.kind === 'manual')).toBe(true));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
  it('le focus revient à l\'ouvreur à la fermeture ; créer un deck ne le lui vole pas', async () => {
    render(<OpenerHarness />);
    const opener = screen.getByRole('button', { name: '⋯ Decks' });
    opener.focus();   // jsdom : click() ne focalise pas seul, comme dans un vrai clic clavier/tactile
    fireEvent.click(opener);
    await screen.findByRole('dialog', { name: 'Decks' });
    const nameInput = screen.getByRole('textbox', { name: 'Nom du nouveau deck' });
    nameInput.focus();
    fireEvent.change(nameInput, { target: { value: 'Hepato' } });
    fireEvent.click(screen.getByRole('button', { name: 'Créer' }));
    await waitFor(async () => expect((await db.decks.toArray()).some((d) => d.name === 'Hepato')).toBe(true));
    expect(document.activeElement).toBe(nameInput);   // créer un deck ne re-vole pas le focus (effet à dépendances vides)
    fireEvent.click(screen.getByRole('button', { name: 'Fermer' }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Decks' })).toBeNull());
    expect(document.activeElement).toBe(opener);
  });
});
