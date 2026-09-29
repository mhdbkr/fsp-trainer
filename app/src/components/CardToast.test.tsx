import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { useCardToast } from '@/store/cardToast';
import { createPersonalTerm } from '@/lib/collections/personalTerms';
import { toView } from '@/lib/collections/allTerms';
import { usePendingDeletions, scheduleDeletion, cancelDeletion } from '@/lib/collections/pendingDeletion';
import { CardToast } from './CardToast';

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
    const status = screen.getByRole('status');
    expect(status.textContent).toBe('Carte supprimée·Annuler');
    expect(status.className).toContain('glass-thin');
    expect(document.body.innerHTML).not.toMatch(/shadow-/);
  });
  it('« Rangée » : une ligne ★ · Révéler · Changer ; aucun miniature tant qu\'on ne touche pas', async () => {
    await db.progress_events.put({ id: 'e1', user_id: 'u', type: 'deck.created', subject_id: 'd1', payload: { name: 'Leber', kind: 'manual' }, occurred_at: '2020-01-01T00:00:00Z' } as never);
    const { reprojectCollections } = await import('@/lib/collections'); await reprojectCollections();
    const { id } = await createPersonalTerm({ term: 'Orthopnoe', explanation: 'Atemnot im Liegen' });
    useCardToast.getState().show({ kind: 'saved', term: toView((await db.personal_terms.get(id))!), deckId: 'deck-favorites' });
    render(<CardToast />);
    expect(await screen.findByRole('button', { name: 'Changer de deck' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Changer de deck' }).textContent).toBe('Changer');
    expect(screen.getByRole('button', { name: /Rangée dans Favoris/ }).getAttribute('aria-expanded')).toBe('false');
    expect(document.querySelector('[data-card-flip]')).toBeNull();
    expect(document.body.innerHTML).not.toMatch(/shadow-/);
  });
  it('« Deck supprimé · Annuler » : Annuler → rien n\'est émis, la pilule se ferme (F4b P6)', async () => {
    useCardToast.getState().show({ kind: 'deck-deleted', deckId: 'd1', name: 'Leber' });
    vi.mocked(cancelDeletion).mockReturnValueOnce(true);
    render(<CardToast />);
    expect(screen.getByRole('status').textContent).toBe('Deck « Leber » supprimé·Annuler');
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
    expect(screen.getByText(/supprimée/)).toBeTruthy();
    await waitFor(() => expect(useCardToast.getState().toast).toBeNull(), { timeout: 2000 });
  });
});
