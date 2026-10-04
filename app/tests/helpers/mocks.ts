// Les deux frontières réseau que tout test du journal coupe, et RIEN d'autre :
// la file de synchro écrit dans `progress_events` (la vraie base, fake-indexeddb)
// — c'est ce qui permet de rejouer `rebuildJournal` — et Supabase est muet.
import { vi } from 'vitest';

export async function queueMock() {
  const { db } = await import('@/db/db');
  const { newId } = await import('@/lib/sync/events');
  const { now } = await import('@/lib/clock');
  let last = 0;   // occurred_at strictement croissant, comme la vraie file (queue.ts:17), sur l'HORLOGE INJECTÉE
  const stamp = () => new Date((last = Math.max(now(), last + 1))).toISOString();
  return {
    syncQueue: {
      push: vi.fn(async (i: { type: string; subject_id: string | null; payload: unknown; occurred_at?: string }) => {
        const ev = { id: newId(), user_id: 'u', occurred_at: stamp(), ...i } as never;
        await db.progress_events.put(ev);
        return ev;
      }),
    },
  };
}

export const supabaseMock = () => ({ supabase: {}, callFn: vi.fn() });

export const authMock = () => ({
  AUTH_MODE: 'public',
  getAccessToken: async () => null,
  useSession: { getState: () => ({ user: null }) },
});
