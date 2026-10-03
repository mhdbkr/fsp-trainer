import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { db } from '@/db/db';
import { useCardToast } from '@/store/cardToast';
import { createPersonalTerm } from '@/lib/collections/personalTerms';
import { toView } from '@/lib/collections/allTerms';
import { usePendingDeletions, scheduleDeletion, cancelDeletion } from '@/lib/collections/pendingDeletion';
import { CardToast, SAVED_MS } from './CardToast';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  const toEv = (input: { type: string; subject_id: string | null; payload: unknown }) => ({ id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input }) as never;
  return { syncQueue: {
    push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = toEv(input); await db.progress_events.put(ev); return ev; }),
    pushMany: vi.fn(async (inputs: { type: string; subject_id: string | null; payload: unknown }[]) => { const evs = inputs.map(toEv); await db.progress_events.bulkPut(evs); return evs; }),
  } };
});
vi.mock('@/lib/collections/pendingDeletion', async () => {
  const actual = await vi.importActual<typeof import('@/lib/collections/pendingDeletion')>('@/lib/collections/pendingDeletion');
  return { ...actual, cancelDeletion: vi.fn(actual.cancelDeletion) };
});

describe('CardToast — accessibilité (G1-16, G1-18, G1-21)', () => {
  beforeEach(async () => {
    await db.progress_events.clear(); await db.personal_terms.clear(); await db.favorites.clear(); await db.deck_terms.clear(); await db.decks.clear();
    useCardToast.setState({ toast: null }); usePendingDeletions.setState({ ids: new Set() });
  });
  it('région role=status PERSISTANTE : montée sans toast, son texte change ; erreur = role=alert', async () => {
    render(<CardToast />);
    const status = screen.getByRole('status');
    expect(status.textContent).toBe('');
    act(() => useCardToast.getState().show({ kind: 'deck-deleted', deckId: 'd1', name: 'Leber' }));
    expect(screen.getByRole('status')).toBe(status);
    expect(status.textContent).toBe('Deck « Leber » supprimé');
    act(() => useCardToast.getState().show({ kind: 'error', message: 'Oups' }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });
  it('le focus retourne à l\'élément d\'avant quand la pilule disparaît (Échap, Annuler) ; sinon <main> (G1-28)', async () => {
    render(<><main tabIndex={-1}>m</main><button type="button">ouvreur</button><CardToast /></>);
    const opener = screen.getByRole('button', { name: 'ouvreur' });
    opener.focus();
    act(() => useCardToast.getState().show({ kind: 'error', message: 'x' }));
    act(() => useCardToast.getState().hide());
    expect(document.activeElement).toBe(opener);   // pas de focus pris : on ne vole rien
    act(() => useCardToast.getState().show({ kind: 'deck-deleted', deckId: 'd9', name: 'Leber' }, { focus: true }));
    const undo = await screen.findByRole('button', { name: 'Annuler' });
    await waitFor(() => expect(document.activeElement).toBe(undo));
    fireEvent.keyDown(undo, { key: 'Escape' });
    await waitFor(() => expect(document.activeElement).toBe(opener));
    const gone = document.body.appendChild(document.createElement('button')); gone.focus();
    act(() => useCardToast.getState().show({ kind: 'deck-deleted', deckId: 'd8', name: 'Niere' }, { focus: true }));
    const undo2 = await screen.findByRole('button', { name: 'Annuler' });
    await waitFor(() => expect(document.activeElement).toBe(undo2));
    gone.remove();   // l'ouvreur (la ligne supprimée) n'existe plus
    act(() => useCardToast.getState().hide());
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('main')));
  });
  it('Échap ailleurs (ex. dans un tiroir) ne ferme PAS la pilule ; Échap dans la pilule la ferme', async () => {
    render(<CardToast />);
    act(() => useCardToast.getState().show({ kind: 'deck-deleted', deckId: 'd1', name: 'Leber' }));
    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(useCardToast.getState().toast).not.toBeNull();
    fireEvent.keyDown(screen.getByRole('button', { name: 'Annuler' }), { key: 'Escape' });
    expect(useCardToast.getState().toast).toBeNull();
  });
  it('« Changer » : après le choix, le focus revient sur « Changer »', async () => {
    await db.progress_events.put({ id: 'e1', user_id: 'u', type: 'deck.created', subject_id: 'd1', payload: { name: 'Leber', kind: 'manual' }, occurred_at: '2020-01-01T00:00:00Z' } as never);
    const { reprojectCollections } = await import('@/lib/collections'); await reprojectCollections();
    const { id } = await createPersonalTerm({ term: 'Orthopnoe', explanation: 'Atemnot im Liegen' });
    const { addTermToDeck } = await import('@/lib/collections'); await addTermToDeck('deck-favorites', id);
    useCardToast.getState().show({ kind: 'saved', term: toView((await db.personal_terms.get(id))!), deckId: 'deck-favorites' });
    render(<CardToast />);
    fireEvent.click(await screen.findByRole('button', { name: 'Changer de deck' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Leber' }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Changer de deck' })));
  });
  it('toast demandé avec focus (après « Créer ») : le focus va au premier bouton de la pilule', async () => {
    const { id } = await createPersonalTerm({ term: 'Orthopnoe', explanation: 'Atemnot im Liegen' });
    const term = toView((await db.personal_terms.get(id))!);
    render(<CardToast />);
    act(() => useCardToast.getState().show({ kind: 'saved', term, deckId: 'deck-favorites' }, { focus: true }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: /Rangée dans Favoris/ })));
  });
  it('« Rangée » se retire SEULE, même focalisée par « Créer » ; le survol la retient puis elle repart (F4c, retour 3 oct.)', async () => {
    const { id } = await createPersonalTerm({ term: 'Orthopnoe', explanation: 'Atemnot im Liegen' });
    const term = toView((await db.personal_terms.get(id))!);
    render(<CardToast />);
    vi.useFakeTimers();
    try {
      act(() => useCardToast.getState().show({ kind: 'saved', term, deckId: 'deck-favorites' }, { focus: true }));
      const main = screen.getByRole('button', { name: /Rangée dans Favoris/ });
      expect(document.activeElement).toBe(main);
      expect(document.querySelector('[data-drain]')).toBeTruthy();   // le filet du temps qui reste
      fireEvent.pointerEnter(main.closest('[data-keep-open]')!, { pointerType: 'mouse' });
      act(() => { vi.advanceTimersByTime(SAVED_MS * 2); });
      expect(useCardToast.getState().toast).not.toBeNull();   // survolée : elle attend
      expect(document.querySelector('[data-drain]')!.getAttribute('data-drain')).toBe('held');   // filet plein, fixe
      fireEvent.pointerLeave(main.closest('[data-keep-open]')!, { pointerType: 'mouse' });
      act(() => { vi.advanceTimersByTime(SAVED_MS - 100); });
      expect(useCardToast.getState().toast).not.toBeNull();   // repart pour un délai entier
      act(() => { vi.advanceTimersByTime(200); });
      expect(useCardToast.getState().toast).toBeNull();
    } finally { vi.useRealTimers(); }
  });
  it('le clavier retient la pilule dès qu\'on y agit (WCAG 2.2.1), pas le focus posé par « Créer »', async () => {
    const { id } = await createPersonalTerm({ term: 'Orthopnoe', explanation: 'Atemnot im Liegen' });
    const term = toView((await db.personal_terms.get(id))!);
    render(<CardToast />);
    vi.useFakeTimers();
    try {
      act(() => useCardToast.getState().show({ kind: 'saved', term, deckId: 'deck-favorites' }, { focus: true }));
      const main = screen.getByRole('button', { name: /Rangée dans Favoris/ });
      fireEvent.keyDown(main, { key: 'Tab' });
      act(() => { vi.advanceTimersByTime(SAVED_MS * 2); });
      expect(useCardToast.getState().toast).not.toBeNull();
    } finally { vi.useRealTimers(); }
  });
});

describe('CardToast — suppression (m2)', () => {
  beforeEach(async () => {
    await db.progress_events.clear(); await db.personal_terms.clear(); await db.favorites.clear(); await db.deck_terms.clear();
    useCardToast.setState({ toast: null }); usePendingDeletions.setState({ ids: new Set() });
    vi.mocked(cancelDeletion).mockClear();
  });

  it('Annuler trop tard (cancelDeletion → faux) : « Trop tard : la carte est supprimée. »', async () => {
    const { id } = await createPersonalTerm({ term: 'Orthopnoe' });
    const term = toView((await db.personal_terms.get(id))!);
    vi.mocked(cancelDeletion).mockReturnValueOnce(false);
    useCardToast.getState().show({ kind: 'deleted', term });
    render(<CardToast />);
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(await screen.findByText('Trop tard : la carte est supprimée.')).toBeTruthy();
  });

  it('pilule verre une ligne : « Carte supprimée · Annuler », sans ombre portée (F4b P5, AC-1)', async () => {
    const { id } = await createPersonalTerm({ term: 'Orthopnoe' });
    useCardToast.getState().show({ kind: 'deleted', term: toView((await db.personal_terms.get(id))!) });
    render(<CardToast />);
    expect(screen.getByRole('status').textContent).toBe('Carte « Orthopnoe » supprimée');   // G1-11, région persistante (G1-18)
    const pill = screen.getByRole('button', { name: 'Annuler' }).parentElement!;
    expect(pill.textContent).toBe('Carte « Orthopnoe » supprimée·Annuler');
    expect(pill.className).toContain('glass-thin');
    expect(pill.getAttribute('role')).toBeNull();   // le nœud animé ne porte pas l'annonce
    expect(document.body.innerHTML).not.toMatch(/shadow-/);
  });
  it('« Rangée » : une ligne ★ · Changer (plus de « Révéler », F4c) ; aucun miniature tant qu\'on ne touche pas', async () => {
    await db.progress_events.put({ id: 'e1', user_id: 'u', type: 'deck.created', subject_id: 'd1', payload: { name: 'Leber', kind: 'manual' }, occurred_at: '2020-01-01T00:00:00Z' } as never);
    const { reprojectCollections } = await import('@/lib/collections'); await reprojectCollections();
    const { id } = await createPersonalTerm({ term: 'Orthopnoe', explanation: 'Atemnot im Liegen' });
    useCardToast.getState().show({ kind: 'saved', term: toView((await db.personal_terms.get(id))!), deckId: 'deck-favorites' });
    render(<CardToast />);
    expect(await screen.findByRole('button', { name: 'Changer de deck' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Changer de deck' }).textContent).toBe('Changer');
    expect(screen.getByRole('button', { name: /Rangée dans Favoris/ }).getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('[data-card-flip]')).toBeNull();
    expect(screen.queryByRole('button', { name: /Révéler|Recto/ })).toBeNull();
    expect(document.body.innerHTML).not.toMatch(/shadow-/);
  });
  it('« Deck supprimé · Annuler » : Annuler → rien n\'est émis, la pilule se ferme (F4b P6)', async () => {
    useCardToast.getState().show({ kind: 'deck-deleted', deckId: 'd1', name: 'Leber' });
    vi.mocked(cancelDeletion).mockReturnValueOnce(true);
    render(<CardToast />);
    expect(screen.getByRole('status').textContent).toBe('Deck « Leber » supprimé');
    fireEvent.click(screen.getByRole('button', { name: 'Annuler' }));
    expect(cancelDeletion).toHaveBeenCalledWith('d1');
    await waitFor(() => expect(useCardToast.getState().toast).toBeNull());
  });
  it('expiration (flushDeletions) masque la confirmation de suppression de la carte concernée', async () => {
    const { id } = await createPersonalTerm({ term: 'Orthopnoe' });
    const term = toView((await db.personal_terms.get(id))!);
    await scheduleDeletion(id, 30);
    useCardToast.getState().show({ kind: 'deleted', term });
    render(<CardToast />);
    expect(screen.getByRole('status').textContent).toMatch(/supprimée/);
    await waitFor(() => expect(useCardToast.getState().toast).toBeNull(), { timeout: 2000 });
  });
});
