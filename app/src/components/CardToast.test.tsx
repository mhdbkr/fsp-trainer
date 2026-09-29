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
