import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/db/db';
import { useUi } from '@/store/ui';
import { freshSrs } from '@/lib/srs';
import { TermHoverCard } from './TermHoverCard';
import { AutoLink } from './AutoLink';
import { CaseContext } from '@/features/fachbegriffe/CaseContext';
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
const fb = { id: 'fb-a', term: 'Abdomen', translationSimple: 'Bauch', specialty: 'G', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs() } as never;
const anchor = { top: 100, left: 100, width: 60, height: 20, bottom: 120, right: 160 } as DOMRect;
const setCoarsePointer = (v: boolean) => { window.matchMedia = vi.fn().mockImplementation((q: string) => ({ matches: q.includes('coarse') ? v : false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never; };

describe('TermHoverCard', () => {
  beforeEach(async () => { await db.progress_events.clear(); await db.favorites.clear(); await db.decks.clear(); await db.fachbegriffe.clear(); useUi.setState({ hoverTerm: null }); setCoarsePointer(false); });
  afterEach(() => setCoarsePointer(false));

  it('C1 régression : caseId du CaseContext (page) porté jusqu\'au store bien que la carte soit un sibling hors provider (comme dans Shell)', async () => {
    await db.fachbegriffe.put(fb);
    setCoarsePointer(true); // tap ouvre la carte sans attendre le délai de survol
    render(
      <MemoryRouter>
        <CaseContext.Provider value="c1"><AutoLink>Douleur au Abdomen depuis 2 jours</AutoLink></CaseContext.Provider>
        <TermHoverCard />
      </MemoryRouter>,
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Abdomen' }));
    fireEvent.click(await screen.findByRole('button', { name: /Ajouter aux favoris/ }));
    await waitFor(async () => expect((await db.progress_events.toArray()).find((e) => e.type === 'term.favorited')?.payload).toEqual({ caseId: 'c1' }));
  });
  it('rien sans hoverTerm ; ouverte → terme, formulation, ★', async () => {
    const { rerender } = render(<MemoryRouter><TermHoverCard /></MemoryRouter>);
    expect(screen.queryByRole('dialog')).toBeNull();
    act(() => useUi.getState().openHover(fb, anchor));
    rerender(<MemoryRouter><TermHoverCard /></MemoryRouter>);
    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Abdomen')).toBeTruthy(); expect(screen.getByText(/Bauch/)).toBeTruthy();
  });
  it('★ = Favoris immédiat avec caseId du store ; ★ pleine → decks du terme, décocher Favoris retire (F4a D6)', async () => {
    act(() => useUi.getState().openHover(fb, anchor, 'c9'));
    render(<MemoryRouter><TermHoverCard /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /Ajouter aux favoris/ }));
    await waitFor(async () => expect((await db.progress_events.toArray()).find((e) => e.type === 'term.favorited')?.payload).toEqual({ caseId: 'c9' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Decks de Abdomen' }));
    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: /Favoris/ }));
    await waitFor(async () => expect((await db.progress_events.toArray()).some((e) => e.type === 'term.unfavorited')).toBe(true));
    expect(screen.getByRole('dialog')).toBeTruthy();   // la liste des decks ne referme pas la carte
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
  it('I1 : Tab→Enter sur le lien focus déplace le focus vers ★ au lieu d\'activer le lien (Tab→Enter→Enter favorise)', async () => {
    await db.fachbegriffe.put(fb);
    render(
      <MemoryRouter>
        <AutoLink>Douleur au Abdomen</AutoLink>
        <TermHoverCard />
      </MemoryRouter>,
    );
    const link = await screen.findByRole('button', { name: 'Abdomen' });
    act(() => link.focus());
    await screen.findByRole('dialog');
    fireEvent.keyDown(link, { key: 'Enter' });
    const star = await screen.findByRole('button', { name: /Ajouter aux favoris/ });
    await waitFor(() => expect(document.activeElement).toBe(star));
    fireEvent.click(star);
    await waitFor(async () => expect((await db.progress_events.toArray()).some((e) => e.type === 'term.favorited')).toBe(true));
  });
});
