// Re-audit sécurité m5 : en mode fondateur, la session (partagée entre onglets)
// peut être celle d'un AUTRE compte que celui de ce tab. Le pull ne doit pas
// rapatrier les événements de B dans la base Dexie de A.
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/auth/session', () => ({
  AUTH_MODE: 'founder',
  getAccessToken: async () => 'tok-de-B',
  useSession: { getState: () => ({ user: { id: 'B' } }) },
}));
vi.mock('@/lib/auth/accounts', () => ({ getActiveUserId: () => 'A' }));
const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

import { db } from '@/db/db';
import { syncQueue } from './queue';

describe('m5 — pull gardé par sessionMatchesActive', () => {
  it('session de B dans le tab de A : aucun appel réseau, rien inséré', async () => {
    await db.progress_events.clear();
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ events: [{ id: 'eB', user_id: 'B', type: 'srs.reviewed', subject_id: 'x', payload: {}, occurred_at: '2026-10-01T00:00:00Z', received_at: '2026-10-01T00:00:01Z' }] }) });
    expect(await syncQueue.pull()).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await db.progress_events.count()).toBe(0);
  });
});
