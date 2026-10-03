import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { db } from '@/db/db';
import { useCardToast } from '@/store/cardToast';
import { cancelDeletion, usePendingDeletions } from '@/lib/collections/pendingDeletion';
import { DeckRail } from './DeckRail';
import { CardToast } from './CardToast';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  // Horodatage MONOTONE : deux événements émis dans la même milliseconde gardent leur ordre.
  let tick = Date.parse('2030-01-01T00:00:00Z');
  const toEv = (input: { type: string; subject_id: string | null; payload: unknown }) => ({ id: newId(), user_id: 'u', occurred_at: new Date(tick++).toISOString(), ...input }) as never;
  return { syncQueue: {
    push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = toEv(input); await db.progress_events.put(ev); return ev; }),
    pushMany: vi.fn(async (inputs: { type: string; subject_id: string | null; payload: unknown }[]) => { const evs = inputs.map(toEv); await db.progress_events.bulkPut(evs); return evs; }),
  } };
});

const manual = (id: string, name: string, day: number) => ({ id: `e-${id}`, user_id: 'u', type: 'deck.created', subject_id: id, payload: { name, kind: 'manual' }, occurred_at: `2020-01-0${day}T00:00:00Z` });
async function seed(...names: string[]) {
  await db.progress_events.bulkPut([
    ...names.map((n, i) => manual(`d${i + 1}`, n, i + 1)),
    { id: 'e-smart', user_id: 'u', type: 'deck.created', subject_id: 's1', payload: { name: 'À revoir', kind: 'smart', query: {} }, occurred_at: '2020-01-09T00:00:00Z' },
  ] as never);
  const { reprojectCollections } = await import('@/lib/collections'); await reprojectCollections();
}
const onManage = vi.fn();
const renderRail = () => render(<><DeckRail termId="fb-a" onManage={onManage} /><CardToast /></>);
const book = () => screen.findByRole('group', { name: 'Decks de ce terme' });
const pages = (g: HTMLElement) => within(g).getAllByRole('button');

describe('DeckRail — pages de livre (E5)', () => {
  beforeEach(async () => {
    await db.progress_events.clear(); await db.decks.clear(); await db.deck_terms.clear(); await db.favorites.clear();
    useCardToast.setState({ toast: null }); onManage.mockClear();
  });
  afterEach(() => { for (const id of usePendingDeletions.getState().ids) cancelDeletion(id); vi.unstubAllGlobals(); });

  it('pages = Favoris + manuels dans l\'ordre, sans deck intelligent ; « + » en dernier (le plus à gauche)', async () => {
    await seed('Kardio', 'Pneumo');
    renderRail();
    const g = await book();
    await waitFor(() => expect(pages(g).length).toBe(4));
    expect(pages(g).map((b) => b.getAttribute('aria-label') ?? b.textContent?.replace('✓', '').trim())).toEqual(['Favoris', 'Kardio', 'Pneumo', 'Gérer les decks']);
    expect(within(g).queryByRole('button', { name: /À revoir/ })).toBeNull();
    // Le livre s'empile vers la gauche : décalages croissants, z-index décroissant.
    const d = pages(g).map((b) => Number(b.getAttribute('data-offset')));
    expect(d).toEqual([...d].sort((a, b) => a - b));
    const z = pages(g).map((b) => Number(b.style.zIndex));
    expect(z).toEqual([...z].sort((a, b) => b - a));
    for (const b of pages(g)) expect(b.className).not.toMatch(/shadow-/);
  });

  it('clic range puis retire (base vérifiée) ; aria-pressed + aria-description suivent', async () => {
    await seed('Kardio');
    renderRail();
    const g = await book();
    const kardio = await within(g).findByRole('button', { name: 'Kardio' });
    expect(kardio.getAttribute('aria-description')).toBe('Ranger dans Kardio');
    fireEvent.click(kardio);
    await waitFor(async () => expect(await db.deck_terms.get(['d1', 'fb-a'])).toBeTruthy());
    await waitFor(() => expect(kardio.getAttribute('aria-pressed')).toBe('true'));
    expect(kardio.getAttribute('aria-description')).toBe('Retirer de Kardio');
    expect(within(kardio).getByText('✓').getAttribute('aria-hidden')).toBe('true');
    fireEvent.click(within(g).getByRole('button', { name: 'Favoris' }));
    await waitFor(async () => expect(await db.favorites.get('fb-a')).toBeTruthy());
    fireEvent.click(kardio);
    await waitFor(async () => expect(await db.deck_terms.get(['d1', 'fb-a'])).toBeUndefined());
  }, 15_000);

  it('verrou : un second clic pendant l\'écriture est ignoré (aria-disabled)', async () => {
    await seed('Kardio');
    const collections = await import('@/lib/collections');
    const real = collections.addTermToDeck;
    let release: () => void = () => {};
    const spy = vi.spyOn(collections, 'addTermToDeck').mockImplementationOnce((...a) => new Promise((r) => { release = () => r(real(...a)); }));
    renderRail();
    const kardio = await within(await book()).findByRole('button', { name: 'Kardio' });
    fireEvent.click(kardio); fireEvent.click(kardio);
    await waitFor(() => expect(kardio.getAttribute('aria-disabled')).toBe('true'));
    release();
    await waitFor(async () => expect(await db.deck_terms.get(['d1', 'fb-a'])).toBeTruthy());
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('échec de l\'écriture → message visible (role=alert)', async () => {
    await seed('Kardio');
    const collections = await import('@/lib/collections');
    const spy = vi.spyOn(collections, 'addTermToDeck').mockRejectedValueOnce(new Error('offline'));
    renderRail();
    fireEvent.click(await within(await book()).findByRole('button', { name: 'Kardio' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Impossible de ranger : réessaie.');
    spy.mockRestore();
  });

  it('≤ 3 decks : noms visibles ; > 3 : condensé, mais la page rangée garde son nom', async () => {
    await seed('Kardio', 'Pneumo');
    const { unmount } = renderRail();
    let g = await book();
    await waitFor(() => expect(pages(g).length).toBe(4));
    expect(g.getAttribute('data-condensed')).toBe('false');
    for (const b of pages(g).slice(0, 3)) expect(b.getAttribute('data-named')).toBe('true');
    unmount();
    await seed('Kardio', 'Pneumo', 'Neuro', 'Gastro');
    await db.favorites.put({ termId: 'fb-a', createdAt: '2020-01-01T00:00:00Z' } as never);
    renderRail();
    g = await book();
    await waitFor(() => expect(pages(g).length).toBe(6));
    await waitFor(() => expect(within(g).getByRole('button', { name: 'Favoris' }).getAttribute('aria-pressed')).toBe('true'));
    expect(g.getAttribute('data-condensed')).toBe('true');
    expect(within(g).getByRole('button', { name: 'Favoris' }).getAttribute('data-named')).toBe('true');
    expect(within(g).getByRole('button', { name: 'Kardio' }).getAttribute('data-named')).toBe('false');
    const favT = Number(within(g).getByRole('button', { name: 'Favoris' }).getAttribute('data-tranche'));
    const kT = Number(within(g).getByRole('button', { name: 'Kardio' }).getAttribute('data-tranche'));
    expect(favT).toBeGreaterThanOrEqual(20);
    expect(kT).toBeGreaterThanOrEqual(8); expect(kT).toBeLessThanOrEqual(14);
  });

  it('survol : seule la page survolée est « écartée » (data-open), ses voisines de gauche glissent', async () => {
    await seed('Kardio', 'Pneumo', 'Neuro', 'Gastro');
    renderRail();
    const g = await book();
    await waitFor(() => expect(pages(g).length).toBe(6));
    const before = pages(g).map((b) => Number(b.getAttribute('data-offset')));
    const kardio = within(g).getByRole('button', { name: 'Kardio' });
    fireEvent.pointerOver(kardio, { pointerType: 'mouse' });
    await waitFor(() => expect(kardio.getAttribute('data-open')).toBe('true'));
    expect(kardio.getAttribute('data-named')).toBe('true');
    const after = pages(g).map((b) => Number(b.getAttribute('data-offset')));
    expect(pages(g).filter((b) => b.getAttribute('data-open') === 'true')).toHaveLength(1);
    expect(after[0]).toBe(before[0]);                       // Favoris (à droite) ne bouge pas
    for (let i = 2; i < after.length; i++) expect(after[i]).toBeGreaterThan(before[i]);   // la gauche glisse
    fireEvent.pointerOut(kardio, { pointerType: 'mouse', relatedTarget: document.body });
    await waitFor(() => expect(kardio.getAttribute('data-open')).toBe('false'));
  });

  it('clavier : roving tabindex, flèches, Entrée range ; Maj+F10 ouvre le menu ; Favoris sans menu', async () => {
    await seed('Kardio');
    renderRail();
    const g = await book();
    await waitFor(() => expect(pages(g).length).toBe(3));
    const [fav, kardio] = pages(g);
    expect(pages(g).map((b) => b.tabIndex)).toEqual([0, -1, -1]);
    fav.focus();
    fireEvent.keyDown(fav, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(kardio);
    expect(pages(g).map((b) => b.tabIndex)).toEqual([-1, 0, -1]);
    fireEvent.keyDown(kardio, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(fav);
    fireEvent.keyDown(fav, { key: 'F10', shiftKey: true });
    expect(screen.queryByRole('menu')).toBeNull();          // Favoris : ni renommable ni supprimable
    fireEvent.contextMenu(fav);
    expect(screen.queryByRole('menu')).toBeNull();
    fireEvent.keyDown(fav, { key: 'ArrowDown' });
    fireEvent.keyDown(kardio, { key: 'Enter' });            // un bouton : Entrée = clic natif ; jsdom le simule par click
    fireEvent.click(kardio);
    await waitFor(async () => expect(await db.deck_terms.get(['d1', 'fb-a'])).toBeTruthy());
    fireEvent.keyDown(kardio, { key: 'F10', shiftKey: true });
    const menu = await screen.findByRole('menu');
    expect(menu.getAttribute('data-keep-open')).not.toBeNull();
    expect(document.activeElement).toBe(within(menu).getByRole('menuitem', { name: 'Renommer' }));
  });

  it('menu : Renommer (Entrée) émet deck.renamed ; Échap ne ferme que le menu', async () => {
    await seed('Kardio');
    renderRail();
    const kardio = await within(await book()).findByRole('button', { name: 'Kardio' });
    const outside = vi.fn(); document.addEventListener('keydown', outside);
    fireEvent.contextMenu(kardio);
    let menu = await screen.findByRole('menu');
    fireEvent.keyDown(menu, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(outside).not.toHaveBeenCalled();                 // le tiroir ne voit pas cet Échap
    expect(document.activeElement).toBe(kardio);
    document.removeEventListener('keydown', outside);
    fireEvent.contextMenu(kardio);
    menu = await screen.findByRole('menu');
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'Renommer' }));
    const input = within(menu).getByRole('textbox', { name: 'Nouveau nom' });
    expect(document.activeElement).toBe(input);
    fireEvent.change(input, { target: { value: 'Kardiologie' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(async () => expect((await db.progress_events.where('type').equals('deck.renamed').toArray()).map((e) => (e.payload as { name: string }).name)).toEqual(['Kardiologie']));
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    await within(await book()).findByRole('button', { name: 'Kardiologie' });
  });

  it('menu : Supprimer → suppression différée (rien émis) + pilule « Annuler » focalisée', async () => {
    await seed('Kardio');
    renderRail();
    const kardio = await within(await book()).findByRole('button', { name: 'Kardio' });
    fireEvent.contextMenu(kardio);
    fireEvent.click(within(await screen.findByRole('menu')).getByRole('menuitem', { name: 'Supprimer' }));
    await waitFor(() => expect(usePendingDeletions.getState().ids.has('d1')).toBe(true));
    const undo = await screen.findByRole('button', { name: 'Annuler' });
    await waitFor(() => expect(document.activeElement).toBe(undo));
    expect(await db.progress_events.where('type').equals('deck.deleted').count()).toBe(0);
    await waitFor(() => expect(within(screen.getByRole('group', { name: 'Decks de ce terme' })).queryByRole('button', { name: 'Kardio' })).toBeNull());
  });

  it('appui long (500 ms) ouvre le menu sans ranger', async () => {
    await seed('Kardio');
    renderRail();
    const kardio = await within(await book()).findByRole('button', { name: 'Kardio' });
    fireEvent.pointerDown(kardio, { pointerType: 'touch', button: 0, clientX: 5, clientY: 5 });
    await new Promise((r) => setTimeout(r, 560));
    expect(await screen.findByRole('menu')).toBeTruthy();
    fireEvent.pointerUp(kardio, { pointerType: 'touch' });
    fireEvent.click(kardio);                                 // le clic qui suit l'appui long est avalé
    await new Promise((r) => setTimeout(r, 50));
    expect(await db.deck_terms.get(['d1', 'fb-a'])).toBeUndefined();
  });

  it('« + » ouvre la gestion (création via DeckSheet) ; un nouveau deck ajoute une page', async () => {
    await seed('Kardio');
    renderRail();
    const g = await book();
    fireEvent.click(await within(g).findByRole('button', { name: 'Gérer les decks' }));
    expect(onManage).toHaveBeenCalledTimes(1);
    const { createDeck } = await import('@/lib/collections');
    await createDeck('Neuro', 'manual');
    await within(g).findByRole('button', { name: 'Neuro' });
    expect(pages(g)[pages(g).length - 1].getAttribute('aria-label')).toBe('Gérer les decks');
  });

  it('téléphone (< md) : bandes horizontales (data-axis), flèches gauche/droite', async () => {
    vi.stubGlobal('matchMedia', (q: string) => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    await seed('Kardio');
    renderRail();
    const g = await book();
    await waitFor(() => expect(pages(g).length).toBe(3));
    expect(g.getAttribute('data-axis')).toBe('y');
    const [fav, kardio] = pages(g);
    fav.focus();
    fireEvent.keyDown(fav, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(kardio);
    fireEvent.keyDown(kardio, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(fav);
  });

  it('ordinateur : livre vertical (data-axis=x)', async () => {
    await seed('Kardio');
    renderRail();
    expect((await book()).getAttribute('data-axis')).toBe('x');
  });
});
