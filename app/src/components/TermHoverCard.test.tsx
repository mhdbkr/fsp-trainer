import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/db/db';
import { useUi } from '@/store/ui';
import { freshSrs } from '@/lib/srs';
import { TermHoverCard } from './TermHoverCard';
import { CaseContext } from '@/features/fachbegriffe/CaseContext';
vi.mock('@/lib/sync/queue', async () => { const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events'); return { syncQueue: { push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input } as never; await db.progress_events.put(ev); return ev; }) } }; });
const fb = { id: 'fb-a', term: 'Abdomen', translationSimple: 'Bauch', specialty: 'G', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs() } as never;
const anchor = { top: 100, left: 100, width: 60, height: 20, bottom: 120, right: 160 } as DOMRect;

describe('TermHoverCard', () => {
  beforeEach(async () => { await db.progress_events.clear(); await db.favorites.clear(); await db.decks.clear(); useUi.setState({ hoverTerm: null }); });
  it('rien sans hoverTerm ; ouverte → terme, formulation, ★', async () => {
    const { rerender } = render(<MemoryRouter><TermHoverCard /></MemoryRouter>);
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => useUi.getState().openHover(fb, anchor));
    rerender(<MemoryRouter><TermHoverCard /></MemoryRouter>);
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Abdomen')).toBeTruthy(); expect(screen.getByText('Bauch')).toBeTruthy();
  });
  it('★ = favori immédiat avec caseId du contexte, puis extension deck ; second ★ retire', async () => {
    act(() => useUi.getState().openHover(fb, anchor));
    render(<MemoryRouter><CaseContext.Provider value="c9"><TermHoverCard /></CaseContext.Provider></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /Ajouter aux favoris/ }));
    await waitFor(async () => expect((await db.progress_events.toArray()).find((e) => e.type === 'term.favorited')?.payload).toEqual({ caseId: 'c9' }));
    expect(await screen.findByRole('button', { name: /Ajouter à un deck/ })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Retirer des favoris/ }));
    await waitFor(async () => expect((await db.progress_events.toArray()).some((e) => e.type === 'term.unfavorited')).toBe(true));
  });
  it('Échap et clic extérieur ferment', async () => {
    act(() => useUi.getState().openHover(fb, anchor));
    render(<MemoryRouter><TermHoverCard /></MemoryRouter>);
    await screen.findByRole('dialog');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    act(() => useUi.getState().openHover(fb, anchor));
    await screen.findByRole('dialog');
    fireEvent.mouseDown(document.body);
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
