import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom';
import { db } from '@/db/db';
import { useUi } from '@/store/ui';
import { freshSrs } from '@/lib/srs';
import { GlossaryDrawer } from './GlossaryDrawer';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  return { syncQueue: { push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input } as never; await db.progress_events.put(ev); return ev; }) } };
});
const fb = { id: 'fb-a', term: 'Abdomen', translationSimple: 'Bauch', specialty: 'Gastroenterologie', pathologyTags: [], centers: ['Freiburg'], linkedCaseIds: [], srs: freshSrs() } as never;

describe('GlossaryDrawer collections', () => {
  beforeEach(async () => { await db.progress_events.clear(); await db.decks.clear(); await db.deck_terms.clear(); await db.favorites.clear(); useUi.setState({ glossaryTerm: fb }); });

  it('★ bascule le favori', async () => {
    render(<MemoryRouter><GlossaryDrawer /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /ajouter aux favoris/i }));
    await waitFor(async () => expect(await db.favorites.get('fb-a')).toBeTruthy());
    expect(await screen.findByRole('button', { name: /retirer des favoris/i })).toBeTruthy();
  });

  it('« Ajouter à un deck… » liste les decks manuels et ajoute', async () => {
    await db.progress_events.put({ id: 'e1', user_id: 'u', type: 'deck.created', subject_id: 'd1', payload: { name: 'Kardio', kind: 'manual' }, occurred_at: '2020-01-01T00:00:00Z' } as never);
    const { reprojectCollections } = await import('@/lib/collections'); await reprojectCollections();
    render(<MemoryRouter><GlossaryDrawer /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /ajouter à un deck/i }));
    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: /kardio/i }));
    await waitFor(async () => expect(await db.deck_terms.get(['d1', 'fb-a'])).toBeTruthy());
  });

  it('« + Nouveau deck » crée un deck via le formulaire en ligne et y ajoute le terme', async () => {
    render(<MemoryRouter><GlossaryDrawer /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /ajouter à un deck/i }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /nouveau deck/i }));
    fireEvent.change(await screen.findByLabelText(/nom du nouveau deck/i), { target: { value: 'Pneumo' } });
    fireEvent.click(await screen.findByRole('button', { name: /^créer$/i }));
    await waitFor(async () => {
      const deck = (await db.decks.toArray()).find((d) => d.name === 'Pneumo');
      expect(deck).toBeTruthy();
      expect(await db.deck_terms.get([deck!.id, 'fb-a'])).toBeTruthy();
    });
  });

  // Régression BLOQUANT UX (ux-review) : après sélection d'un deck (existant
  // ou juste créé), le menu « Ajouter à un deck… » restait ouvert et
  // bloquait les clics sur la liste en dessous. Le menu doit se fermer et
  // seul le fond du tiroir (`.fixed.inset-0`) doit rester monté.
  it('choisir un deck existant ferme le menu ; seul le fond du tiroir reste monté', async () => {
    await db.progress_events.put({ id: 'e1', user_id: 'u', type: 'deck.created', subject_id: 'd1', payload: { name: 'Kardio', kind: 'manual' }, occurred_at: '2020-01-01T00:00:00Z' } as never);
    const { reprojectCollections } = await import('@/lib/collections'); await reprojectCollections();
    render(<MemoryRouter><GlossaryDrawer /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /ajouter à un deck/i }));
    fireEvent.click(await screen.findByRole('menuitemcheckbox', { name: /kardio/i }));
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(document.querySelectorAll('.fixed.inset-0').length).toBe(1);
  });

  it('créer un deck inline ferme le menu ; seul le fond du tiroir reste monté', async () => {
    render(<MemoryRouter><GlossaryDrawer /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /ajouter à un deck/i }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /nouveau deck/i }));
    fireEvent.change(await screen.findByLabelText(/nom du nouveau deck/i), { target: { value: 'Uro' } });
    fireEvent.click(await screen.findByRole('button', { name: /^créer$/i }));
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(document.querySelectorAll('.fixed.inset-0').length).toBe(1);
  });

  // Revue UX F2b (bloquant + important) : Échap doit fermer la carte elle-même,
  // et la carte ne doit pas survivre à un changement de page (fond invisible
  // qui interceptait les clics de la page suivante).
  it('Échap ferme le panneau (pas seulement le sous-menu deck)', async () => {
    render(<MemoryRouter><GlossaryDrawer /></MemoryRouter>);
    await screen.findByText('Abdomen');
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(useUi.getState().glossaryTerm).toBeNull());
    expect(document.querySelectorAll('.fixed.inset-0').length).toBe(0);
  });

  it('Échap avec le menu deck ouvert ne ferme que le menu ; un second Échap ferme le panneau', async () => {
    render(<MemoryRouter><GlossaryDrawer /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /ajouter à un deck/i }));
    expect(screen.getByRole('menu')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(useUi.getState().glossaryTerm).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(useUi.getState().glossaryTerm).toBeNull());
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
    render(<MemoryRouter><GlossaryDrawer /></MemoryRouter>);
    useUi.getState().openGlossary(fb);
    await screen.findByText('Abdomen');
    await waitFor(() => expect(useUi.getState().hoverTerm).toBeNull());
  });
});
