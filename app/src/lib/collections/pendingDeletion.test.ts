import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db/db';
import { createPersonalTerm } from './personalTerms';
import { toggleFavorite } from './index';
import { scheduleDeletion, cancelDeletion, flushDeletions, usePendingDeletions } from './pendingDeletion';

vi.mock('@/lib/sync/queue', async () => {
  const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events');
  const toEv = (input: { type: string; subject_id: string | null; payload: unknown }) => ({ id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input }) as never;
  return { syncQueue: {
    push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = toEv(input); await db.progress_events.put(ev); return ev; }),
    pushMany: vi.fn(async (inputs: { type: string; subject_id: string | null; payload: unknown }[]) => { const evs = inputs.map(toEv); await db.progress_events.bulkPut(evs); return evs; }),
  } };
});

const DELAY = 40; // délai court en test : minuteurs réels (fake-indexeddb n'aime pas les faux minuteurs)
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const deletions = async () => (await db.progress_events.toArray()).filter((e) => e.type === 'term.personal_deleted' || e.type === 'term.unfavorited');

describe('suppression différée (F4a D10, AC-9)', () => {
  let id: string;
  beforeEach(async () => {
    await db.progress_events.clear(); await db.personal_terms.clear(); await db.favorites.clear(); await db.deck_terms.clear();
    id = (await createPersonalTerm({ term: 'Belastungsdyspnoe' })).id;
    await toggleFavorite(id);
  });

  it('masquée tout de suite, rien émis ; Annuler → aucun événement, carte et favori intacts', async () => {
    await scheduleDeletion(id, DELAY);
    expect(usePendingDeletions.getState().ids.has(id)).toBe(true);
    expect(await deletions()).toEqual([]);
    expect(cancelDeletion(id)).toBe(true);
    await sleep(DELAY * 3);
    expect(await deletions()).toEqual([]);
    expect(usePendingDeletions.getState().ids.has(id)).toBe(false);
    expect(await db.personal_terms.get(id)).toBeTruthy();
    expect(await db.favorites.get(id)).toBeTruthy();
  });
  it('expiration → événements émis, carte et favori retirés', async () => {
    await scheduleDeletion(id, DELAY);
    await vi.waitFor(() => expect(usePendingDeletions.getState().ids.has(id)).toBe(false), { timeout: 3000 });   // commit terminé (finally)
    expect((await deletions()).map((e) => e.type).sort()).toEqual(['term.personal_deleted', 'term.unfavorited']);
    expect(await db.personal_terms.get(id)).toBeUndefined();
    expect(usePendingDeletions.getState().ids.has(id)).toBe(false);
    expect(cancelDeletion(id)).toBe(false);
  });
  it('pagehide → émis sans attendre le délai ; un seul lot', async () => {
    await scheduleDeletion(id, DELAY);
    window.dispatchEvent(new Event('pagehide'));
    await vi.waitFor(async () => expect(await db.personal_terms.get(id)).toBeUndefined());
    await flushDeletions();
    await sleep(DELAY * 3);
    expect((await deletions()).filter((e) => e.type === 'term.personal_deleted')).toHaveLength(1);
  });
  it('recréer le mot pendant le délai annule la suppression ; le favori déjà posé reste actif', async () => {
    await scheduleDeletion(id, DELAY);
    expect(await createPersonalTerm({ term: 'Belastungsdyspnoe' })).toEqual({ id, created: false, restored: true });
    await sleep(DELAY * 3);
    expect(await deletions()).toEqual([]);
    expect(await db.personal_terms.get(id)).toBeTruthy();
    expect(await db.favorites.get(id)).toBeTruthy();
  });
  it('createPersonalTerm pendant le délai → restored, rien ne sera émis', async () => {
    await scheduleDeletion(id, DELAY);
    expect(await createPersonalTerm({ term: 'Belastungsdyspnoe' })).toEqual({ id, created: false, restored: true });
    await sleep(DELAY * 3);
    expect(await deletions()).toEqual([]);
    expect(usePendingDeletions.getState().ids.has(id)).toBe(false);
  });
  it('page masquée (visibilitychange → hidden) → émis sans attendre le délai', async () => {
    await scheduleDeletion(id, 60_000);
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.waitFor(() => expect(usePendingDeletions.getState().ids.has(id)).toBe(false), { timeout: 3000 });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    expect(await db.personal_terms.get(id)).toBeUndefined();
  });
  it('échec d\'écriture après le délai → carte revenue ET message visible (revue B3 m3)', async () => {
    const { useCardToast } = await import('@/store/cardToast');
    const { syncQueue } = await import('@/lib/sync/queue');
    vi.mocked(syncQueue.pushMany).mockRejectedValueOnce(new Error('quota'));
    await scheduleDeletion(id, DELAY);
    await vi.waitFor(() => expect(usePendingDeletions.getState().ids.has(id)).toBe(false), { timeout: 3000 });
    expect(await db.personal_terms.get(id)).toBeTruthy();
    expect(useCardToast.getState().toast).toMatchObject({ kind: 'error' });
  });
});
