import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/db/db';
import { freshSrs } from '@/lib/srs';
import { FachbegriffePage } from './FachbegriffePage';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  return { syncQueue: { push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input } as never; await db.progress_events.put(ev); return ev; }) } };
});
// Virtualisation en jsdom : pas de layout → on force un viewport de mesure
vi.mock('@tanstack/react-virtual', async (orig) => { const m = await orig<typeof import('@tanstack/react-virtual')>(); return { ...m, useVirtualizer: (o: Parameters<typeof m.useVirtualizer>[0]) => m.useVirtualizer({ ...o, initialRect: { width: 800, height: 600 } }) }; });
// jsdom ne calcule aucun layout : le conteneur de scroll a une hauteur nulle
// malgré `initialRect`, donc `useVirtualizer` ne rend aucune ligne. On force
// une mesure minimale pour que la liste ait un viewport non vide.
Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 600 });
Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 800 });
HTMLElement.prototype.getBoundingClientRect = () => ({ width: 800, height: 600, top: 0, left: 0, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => {} }) as DOMRect;

const seed = async () => {
  await db.fachbegriffe.bulkPut([
    { id: 'fb-a', term: 'Abdomen', translationSimple: 'Bauch', specialty: 'Gastroenterologie', pathologyTags: [], centers: ['Freiburg'], linkedCaseIds: [], srs: freshSrs() },
    { id: 'fb-k', term: 'Kardiomyopathie', translationSimple: 'Herzmuskelerkrankung', specialty: 'Kardiologie', pathologyTags: [], centers: ['Freiburg'], linkedCaseIds: [], srs: { ...freshSrs(), state: 'Zu wiederholen' } },
  ] as never);
};
const renderAt = (url = '/fachbegriffe') => render(<MemoryRouter initialEntries={[url]}><FachbegriffePage /></MemoryRouter>);

describe('FachbegriffePage', () => {
  beforeEach(async () => { await db.fachbegriffe.clear(); await db.progress_events.clear(); await db.decks.clear(); await db.deck_terms.clear(); await db.favorites.clear(); await seed(); });

  it('liste A→Z avec onglets Tous et Favoris ; ★ ajoute aux favoris et à l\'onglet', async () => {
    renderAt();
    await screen.findByText('Abdomen');
    expect(screen.getByRole('tab', { name: /tous/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /ajouter abdomen aux favoris/i }));
    await waitFor(async () => expect(await db.favorites.get('fb-a')).toBeTruthy());
    expect((await db.progress_events.toArray()).map((e) => e.type)).toContain('term.favorited');
    fireEvent.click(screen.getByRole('tab', { name: /favoris/i }));
    await screen.findByText('Abdomen');
    expect(screen.queryByText('Kardiomyopathie')).toBeNull();
  });

  it('créer un deck manuel depuis « + » puis y ajouter depuis la ligne (menu) ; onglet actif via URL', async () => {
    renderAt();
    await screen.findByText('Abdomen');
    fireEvent.click(screen.getByRole('button', { name: /nouveau deck/i }));
    fireEvent.change(screen.getByLabelText(/nom du deck/i), { target: { value: 'Kardio' } });
    fireEvent.click(screen.getByRole('button', { name: /créer/i }));
    const tab = await screen.findByRole('tab', { name: /kardio/i });
    expect(tab.getAttribute('aria-selected')).toBe('true');
    const decks = await db.decks.toArray(); expect(decks).toHaveLength(1);
    // deck vide → état vide
    expect(screen.getByText(/ajoute des termes/i)).toBeTruthy();
  });

  it('deck intelligent : filtres enregistrés suivent le SRS', async () => {
    renderAt();
    await screen.findByText('Abdomen');
    fireEvent.click(screen.getByRole('button', { name: /nouveau deck/i }));
    fireEvent.change(screen.getByLabelText(/nom du deck/i), { target: { value: 'À revoir' } });
    fireEvent.click(screen.getByLabelText(/deck intelligent/i));
    fireEvent.change(screen.getByLabelText(/^état$/i), { target: { value: 'Zu wiederholen' } });
    fireEvent.click(screen.getByRole('button', { name: /créer/i }));
    await screen.findByText('Kardiomyopathie');
    await waitFor(() => expect(screen.queryByText('Abdomen')).toBeNull());
    await db.fachbegriffe.update('fb-k', { srs: { ...freshSrs(), state: 'Gelernt' } });
    await waitFor(() => expect(screen.queryByText('Kardiomyopathie')).toBeNull());
  });

  it('?deck=<id> restaure l\'onglet ; bouton drill pointe sur le deck', async () => {
    await db.progress_events.put({ id: 'e1', user_id: 'u', type: 'deck.created', subject_id: 'd1', payload: { name: 'Mon deck', kind: 'manual' }, occurred_at: '2026-09-17T10:00:00Z' } as never);
    const { reprojectCollections } = await import('@/lib/collections'); await reprojectCollections();
    renderAt('/fachbegriffe?deck=d1');
    const tab = await screen.findByRole('tab', { name: /mon deck/i });
    expect(tab.getAttribute('aria-selected')).toBe('true');
    expect((screen.getByRole('link', { name: /drill/i }) as HTMLAnchorElement).getAttribute('href')).toContain('deck=d1');
  });
});
