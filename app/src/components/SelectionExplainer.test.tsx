import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { db } from '@/db/db';
import { freshSrs } from '@/lib/srs';
import { SelectionExplainer } from './SelectionExplainer';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  return { syncQueue: { push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input } as never; await db.progress_events.put(ev); return ev; }) } };
});

function selectText(el: HTMLElement) {
  const range = document.createRange(); range.selectNodeContents(el);
  range.getBoundingClientRect = () => ({ left: 10, top: 100, width: 60, height: 16, right: 70, bottom: 116, x: 10, y: 100, toJSON() {} }) as DOMRect;
  const sel = window.getSelection()!; sel.removeAllRanges(); sel.addRange(range);
}

describe('SelectionExplainer', () => {
  beforeEach(async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await db.fachbegriffe.clear(); await db.favorites.clear(); await db.personal_terms.clear(); await db.progress_events.clear();
    await db.fachbegriffe.put({ id: 'fb-aszites', term: 'Aszites', translationSimple: 'Bauchwasser', specialty: 'Gastroenterologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs(0) } as never);
  });
  afterEach(() => { vi.useRealTimers(); });
  it('selectionchange (sans souris) → pastille ★ + Expliquer après 250 ms (AC-4c)', async () => {
    render(<><p data-testid="t">Aszites</p><SelectionExplainer /></>);
    selectText(screen.getByTestId('t'));
    act(() => { document.dispatchEvent(new Event('selectionchange')); vi.advanceTimersByTime(260); });
    expect(await screen.findByRole('button', { name: /Ajouter aux favoris : Aszites/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Expliquer/ })).toBeTruthy();
  });
  it('★ → favori + confirmation + lien deck (AC-1)', async () => {
    render(<><p data-testid="t">Aszites</p><SelectionExplainer /></>);
    selectText(screen.getByTestId('t'));
    act(() => { document.dispatchEvent(new Event('selectionchange')); vi.advanceTimersByTime(260); });
    const starButton = await screen.findByRole('button', { name: /Ajouter aux favoris : Aszites/ });
    vi.useRealTimers(); // au-delà de ce point : écritures Dexie réelles (IndexedDB fake), pas de minuteur simulé.
    fireEvent.click(starButton);
    expect(await screen.findByText('Ajouté aux favoris')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ajouter à un deck…' })).toBeTruthy();
    expect(await db.favorites.get('fb-aszites')).toBeTruthy();
  });
  it('hors glossaire → « Carte créée » (AC-2)', async () => {
    render(<><p data-testid="t">Belastungsdyspnoe</p><SelectionExplainer /></>);
    selectText(screen.getByTestId('t'));
    act(() => { document.dispatchEvent(new Event('selectionchange')); vi.advanceTimersByTime(260); });
    const starButton = await screen.findByRole('button', { name: /Ajouter aux favoris : Belastungsdyspnoe/ });
    vi.useRealTimers();
    fireEvent.click(starButton);
    expect(await screen.findByText('Carte créée')).toBeTruthy();
    expect(await db.personal_terms.count()).toBe(1);
  });
});
