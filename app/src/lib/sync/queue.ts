import { create } from 'zustand';
import { db } from '@/db/db';
import { getAccessToken, useSession } from '@/lib/auth/session';
import { newId, type NewEvent, type ProgressEvent } from './events';

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/events`;
const BATCH = 100;
const backoffMs = (attempts: number) => Math.min(300_000, 1000 * 2 ** attempts);

interface SyncState { pending: number; online: boolean; lastError: string | null }
export const useSyncStatus = create<SyncState>(() => ({ pending: 0, online: typeof navigator === 'undefined' ? true : navigator.onLine, lastError: null }));
const refreshPending = async () => useSyncStatus.setState({ pending: await db.outbox.where('attempts').aboveOrEqual(0).count() });

const uid = () => useSession.getState().user?.id ?? 'local';
const auth = async () => { const t = await getAccessToken(); return t ? { Authorization: `Bearer ${t}`, 'content-type': 'application/json' } : null; };

let inFlight: Promise<{ acked: number; rejected: number }> | null = null;
let nextAllowed = 0;

export const syncQueue = {
  /** Écrit localement (l'UI se met à jour) et enfile. Ne bloque jamais sur le réseau. */
  async push(input: NewEvent): Promise<ProgressEvent> {
    const ev: ProgressEvent = { id: newId(), user_id: uid(), occurred_at: input.occurred_at ?? new Date().toISOString(), type: input.type, subject_id: input.subject_id, payload: input.payload };
    await db.transaction('rw', [db.progress_events, db.outbox], async () => {
      await db.progress_events.put(ev);
      await db.outbox.put({ id: ev.id, attempts: 0 });
    });
    await refreshPending();
    nextAllowed = 0;                                         // un nouvel événement mérite une tentative immédiate
    void syncQueue.flush();
    return ev;
  },

  /** POST par lots ; ack → retire ; 4xx/rejected → marque et retire ; 5xx/réseau → garde avec backoff. */
  async flush(): Promise<{ acked: number; rejected: number }> {
    if (inFlight) return inFlight;                           // un flush est déjà en cours : son résultat répond aussi à cet appel
    if (Date.now() < nextAllowed) return { acked: 0, rejected: 0 };
    const headers = await auth();
    if (!headers) return { acked: 0, rejected: 0 };          // anonyme : rien ne part
    const run = doFlush(headers);
    inFlight = run;
    try { return await run; } finally { if (inFlight === run) inFlight = null; await refreshPending(); }
  },

  /** Rapatrie les événements des autres appareils (idempotent). */
  async pull(since?: string): Promise<number> {
    const headers = await auth();
    if (!headers) return 0;
    const last = since ?? (await db.progress_events.orderBy('occurred_at').reverse().first())?.occurred_at ?? '1970-01-01T00:00:00Z';
    let res: Response;
    try { res = await fetch(`${FN}?since=${encodeURIComponent(last)}`, { headers }); } catch { return 0; }
    if (!res || !res.ok) return 0;
    const { events } = (await res.json()) as { events: ProgressEvent[] };
    const fresh = [] as ProgressEvent[];
    for (const e of events) if (!(await db.progress_events.get(e.id))) fresh.push(e);
    if (fresh.length) await db.progress_events.bulkPut(fresh);
    return fresh.length;
  },
};

async function doFlush(headers: Record<string, string>): Promise<{ acked: number; rejected: number }> {
  let acked = 0, rejected = 0;
  const rows = await db.outbox.filter((r) => !r.rejected).limit(BATCH).toArray();
  if (!rows.length) return { acked, rejected };
  const events = await db.progress_events.bulkGet(rows.map((r) => r.id));
  const body = events.filter(Boolean).map((e) => ({ ...e!, user_id: undefined }));
  let res: Response;
  try { res = await fetch(FN, { method: 'POST', headers, body: JSON.stringify({ events: body }) }); }
  catch (e) { await bump(rows, String(e)); return { acked, rejected }; }
  if (!res || typeof res.status !== 'number') { return { acked, rejected }; }
  if (res.status >= 500) { await bump(rows, `HTTP ${res.status}`); return { acked, rejected }; }
  if (res.status >= 400) { await reject(rows.map((r) => r.id), `HTTP ${res.status}`); rejected += rows.length; return { acked, rejected }; }
  const out = (await res.json()) as { acked: string[]; rejected: { id: string; reason: string }[] };
  await db.outbox.bulkDelete(out.acked); acked += out.acked.length;
  await reject(out.rejected.map((r) => r.id), out.rejected.map((r) => r.reason).join('; ')); rejected += out.rejected.length;
  nextAllowed = 0;
  useSyncStatus.setState({ lastError: null });
  if (rows.length === BATCH) void syncQueue.flush();
  return { acked, rejected };
}

async function bump(rows: { id: string; attempts: number }[], err: string) {
  const attempts = (rows[0]?.attempts ?? 0) + 1;
  await db.outbox.bulkPut(rows.map((r) => ({ ...r, attempts, lastError: err })));
  nextAllowed = Date.now() + backoffMs(attempts);
  useSyncStatus.setState({ lastError: err });
}
async function reject(ids: string[], reason: string) {
  if (!ids.length) return;
  console.warn('[sync] événements rejetés', ids, reason);
  await db.outbox.bulkDelete(ids);
}

/** Déclencheurs : reconnexion, intervalle si outbox non vide. À appeler une fois au boot. */
export function startSyncLoop(): () => void {
  const onOnline = () => { useSyncStatus.setState({ online: true }); nextAllowed = 0; void syncQueue.flush().then(() => syncQueue.pull()); };
  const onOffline = () => useSyncStatus.setState({ online: false });
  window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline);
  const timer = window.setInterval(() => { if (useSyncStatus.getState().pending > 0) void syncQueue.flush(); }, 120_000);
  void refreshPending();
  return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); window.clearInterval(timer); };
}
