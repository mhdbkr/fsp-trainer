import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
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
});
