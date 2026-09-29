import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom';
import { db } from '@/db/db';
import { useUi } from '@/store/ui';
import { useCardToast } from '@/store/cardToast';
import { freshSrs } from '@/lib/srs';
import { toView } from '@/lib/collections/allTerms';
import { createPersonalTerm } from '@/lib/collections/personalTerms';
import { usePendingDeletions } from '@/lib/collections/pendingDeletion';
import { GlossaryDrawer } from './GlossaryDrawer';
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
  return { ...actual, scheduleDeletion: vi.fn(actual.scheduleDeletion) };
});
const fb = { id: 'fb-a', term: 'Abdomen', translationSimple: 'Bauch', specialty: 'Gastroenterologie', pathologyTags: [], centers: ['Freiburg'], linkedCaseIds: [], srs: freshSrs() } as never;
const renderDrawer = () => render(<MemoryRouter><GlossaryDrawer /><CardToast /></MemoryRouter>);

describe('GlossaryDrawer (F4a)', () => {
  beforeEach(async () => {
    await db.progress_events.clear(); await db.decks.clear(); await db.deck_terms.clear(); await db.favorites.clear(); await db.personal_terms.clear();
    useUi.setState({ glossaryTerm: fb, hoverTerm: null }); useCardToast.setState({ toast: null });
  });

  it('fiche : Bedeutung, jamais « patientengerecht »', async () => {
    renderDrawer();
    expect(await screen.findByText('Bauch')).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/patientengerecht/i);
  });
  it('★ vide → Favoris ; ★ pleine → decks du terme, cocher un deck l\'y range (D6)', async () => {
    await db.progress_events.put({ id: 'e1', user_id: 'u', type: 'deck.created', subject_id: 'd1', payload: { name: 'Kardio', kind: 'manual' }, occurred_at: '2020-01-01T00:00:00Z' } as never);
    const { reprojectCollections } = await import('@/lib/collections'); await reprojectCollections();
    renderDrawer();
    const starBtn = await screen.findByRole('button', { name: 'Ajouter aux favoris : Abdomen' });
    await waitFor(() => expect(starBtn.hasAttribute('disabled')).toBe(false));   // decks en chargement : étoile inerte (revue C4)
    fireEvent.click(starBtn);
    await waitFor(async () => expect(await db.favorites.get('fb-a')).toBeTruthy());
    fireEvent.click(await screen.findByRole('button', { name: 'Decks de Abdomen' }));
    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: /kardio/i }));
    await waitFor(async () => expect(await db.deck_terms.get(['d1', 'fb-a'])).toBeTruthy());
  });
  it('« Carte » retourne la fiche en carte recto/verso comme au drill (D9, AC-8)', async () => {
    renderDrawer();
    fireEvent.click(await screen.findByRole('button', { name: 'Carte' }));
    expect(document.querySelector('[data-card-flip]')!.getAttribute('data-card-flip')).toBe('recto');
    fireEvent.click(screen.getByRole('button', { name: /révéler/i }));
    expect(document.querySelector('[data-card-flip]')!.getAttribute('data-card-flip')).toBe('verso');
    expect(screen.getAllByText('Bauch').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'Fiche' }));
    expect(document.querySelector('[data-card-flip]')).toBeNull();
  });
  it('Échap ferme le panneau ; avec la liste des decks ouverte, Échap ne ferme que la liste', async () => {
    await db.favorites.put({ termId: 'fb-a', since: '' } as never);
    renderDrawer();
    fireEvent.click(await screen.findByRole('button', { name: 'Decks de Abdomen' }));
    await screen.findByRole('menu');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(useUi.getState().glossaryTerm).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(useUi.getState().glossaryTerm).toBeNull());
    expect(document.querySelectorAll('.fixed.inset-0').length).toBe(0);
  });
  it('changer de route ferme le panneau et démonte son fond', async () => {
    render(
      <MemoryRouter initialEntries={['/cas/c1']}>
        <GlossaryDrawer />
        <Routes>
          <Route path="/cas/c1" element={<Link to="/fachbegriffe">aller</Link>} />
          <Route path="/fachbegriffe" element={<p>Fachbegriffe</p>} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText('Abdomen');
    fireEvent.click(screen.getByText('aller'));
    await screen.findByText('Fachbegriffe');
    await waitFor(() => expect(useUi.getState().glossaryTerm).toBeNull());
    expect(document.querySelectorAll('.fixed.inset-0').length).toBe(0);
  });
  it('ouvrir le panneau ferme la hover-card ★', async () => {
    useUi.setState({ glossaryTerm: null, hoverTerm: { fb, anchor: {} as DOMRect, caseId: null } });
    renderDrawer();
    useUi.getState().openGlossary(fb);
    await screen.findByText('Abdomen');
    await waitFor(() => expect(useUi.getState().hoverTerm).toBeNull());
  });
  it('tiroir en verre plein, sans ombre portée ; fermer le retire (F4b P1/P9)', async () => {
    renderDrawer();
    await screen.findByText('Bauch');
    const aside = document.querySelector('aside')!;
    expect(aside.className).toContain('glass-full');
    expect(aside.className).not.toMatch(/animate-slide-in|shadow-/);
    fireEvent.click(screen.getAllByRole('button', { name: 'Fermer' })[0]);
    await waitFor(() => expect(document.querySelector('aside')).toBeNull());
  });
  it('terme du glossaire : pas de corbeille', async () => {
    renderDrawer();
    await screen.findByText('Abdomen');
    expect(screen.queryByRole('button', { name: 'Supprimer ma carte' })).toBeNull();
  });
});

describe('GlossaryDrawer — carte personnelle (D8, D10)', () => {
  let id: string;
  beforeEach(async () => {
    await db.progress_events.clear(); await db.decks.clear(); await db.deck_terms.clear(); await db.favorites.clear(); await db.personal_terms.clear();
    useCardToast.setState({ toast: null }); usePendingDeletions.setState({ ids: new Set() });
    id = (await createPersonalTerm({ term: 'Belastungsdyspnoe', context: 'Der Patient klagt über Belastungsdyspnoe.' })).id;
    useUi.setState({ glossaryTerm: toView((await db.personal_terms.get(id))!), hoverTerm: null });
  });

  it('corbeille → masquée, panneau fermé, confirmation « Annuler » ; rien n\'est émis ; Annuler rétablit (AC-9)', async () => {
    renderDrawer();
    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer ma carte' }));
    await waitFor(() => expect(useUi.getState().glossaryTerm).toBeNull());
    expect(usePendingDeletions.getState().ids.has(id)).toBe(true);
    expect((await db.progress_events.toArray()).some((e) => e.type === 'term.personal_deleted')).toBe(false);
    fireEvent.click(await screen.findByRole('button', { name: 'Annuler' }));
    expect(usePendingDeletions.getState().ids.has(id)).toBe(false);
    expect(await db.personal_terms.get(id)).toBeTruthy();
  });
  it('sans Bedeutung → « à compléter » ; modifiée, la fiche montre la nouvelle Bedeutung (AC-7)', async () => {
    renderDrawer();
    expect(await screen.findByText('à compléter')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Modifier la Bedeutung' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Bedeutung' }), { target: { value: 'Atemnot bei Belastung' } });
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Atemnot bei Belastung')).toBeTruthy();
  });
  it('contexte affiché une fois, mot surligné, jamais « Reformulation »', async () => {
    renderDrawer();
    expect(await screen.findByText('Belastungsdyspnoe', { selector: 'mark' })).toBeTruthy();
    expect(screen.queryByText('Reformulation')).toBeNull();
    expect(screen.getAllByText(/klagt über/i).length).toBe(1);
  });
  it("Échap dans l'éditeur de Bedeutung ne ferme pas le tiroir (m1)", async () => {
    renderDrawer();
    fireEvent.click(await screen.findByRole('button', { name: 'Modifier la Bedeutung' }));
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Bedeutung' }), { key: 'Escape' });
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Modifier la Bedeutung' })));
    expect(useUi.getState().glossaryTerm).not.toBeNull();
  });

  it('suppression : échec → message, panneau ouvert', async () => {
    const { scheduleDeletion } = await import('@/lib/collections/pendingDeletion');
    vi.mocked(scheduleDeletion).mockRejectedValueOnce(new Error('offline'));
    renderDrawer();
    fireEvent.click(await screen.findByRole('button', { name: 'Supprimer ma carte' }));
    expect(await screen.findByText(/impossible de supprimer/i)).toBeTruthy();
    expect(useUi.getState().glossaryTerm).not.toBeNull();
  });
});
