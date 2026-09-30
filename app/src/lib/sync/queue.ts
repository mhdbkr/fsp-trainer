import { create } from 'zustand';
import { db } from '@/db/db';
import { getAccessToken, useSession, AUTH_MODE } from '@/lib/auth/session';
import { getActiveUserId } from '@/lib/auth/accounts';
import { newId, type NewEvent, type ProgressEvent } from './events';

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/events`;
const BATCH = 100;
const backoffMs = (attempts: number) => Math.min(300_000, 1000 * 2 ** attempts);

interface SyncState { pending: number; online: boolean; lastError: string | null }
export const useSyncStatus = create<SyncState>(() => ({ pending: 0, online: typeof navigator === 'undefined' ? true : navigator.onLine, lastError: null }));
const refreshPending = async () => useSyncStatus.setState({ pending: await db.outbox.count() });

const uid = () => useSession.getState().user?.id ?? 'local';
let lastStamp = 0;
/** occurred_at strictement croissant sur cet appareil : deux événements de la même ms gardent leur ordre causal (sortEvents départage sinon par uuid aléatoire). */
const stamp = () => new Date(lastStamp = Math.max(Date.now(), lastStamp + 1)).toISOString();
const auth = async () => { const t = await getAccessToken(); return t ? { Authorization: `Bearer ${t}`, 'content-type': 'application/json' } : null; };

let inFlight: Promise<{ acked: number; rejected: number }> | null = null;
let warnedMismatch = false;
/** Mode fondateur : la session (partagée entre onglets) doit être celle du
 *  compte actif de ce tab, sinon l'outbox de A partirait sous le jeton de B. */
const sessionMatchesActive = (): boolean => {
  if (AUTH_MODE !== 'founder') return true;
  const ok = (useSession.getState().user?.id ?? null) === getActiveUserId();
  if (!ok && !warnedMismatch) { warnedMismatch = true; console.warn('[sync] session ≠ compte actif : flush ignoré jusqu\'au redémarrage'); }
  return ok;
};
let nextAllowed = 0;
let moreToDrain = false;   // une page pleine vient d'être acquittée : il en reste

export const syncQueue = {
  /** Écrit localement (l'UI se met à jour) et enfile. Ne bloque jamais sur le réseau. */
  async push(input: NewEvent): Promise<ProgressEvent> {
    return (await syncQueue.pushMany([input]))[0];
  },

  /** Plusieurs événements en UNE transaction : tous écrits, ou aucun (F4a D10). */
  async pushMany(inputs: NewEvent[]): Promise<ProgressEvent[]> {
    const evs: ProgressEvent[] = inputs.map((input) => ({ id: newId(), user_id: uid(), occurred_at: input.occurred_at ?? stamp(), type: input.type, subject_id: input.subject_id, payload: input.payload }));
    await db.transaction('rw', [db.progress_events, db.outbox], async () => {
      await db.progress_events.bulkPut(evs);
      await db.outbox.bulkPut(evs.map((e) => ({ id: e.id, attempts: 0 })));
    });
    await refreshPending();
    nextAllowed = 0;                                         // un nouvel événement mérite une tentative immédiate
    void syncQueue.flush();
    return evs;
  },

  /** POST par lots ; ack → retire ; rejected sans retry → retire ; tout le reste (4xx/5xx de lot, réseau, retry) → garde avec backoff. */
  async flush(): Promise<{ acked: number; rejected: number }> {
    if (inFlight) return inFlight;                           // un flush est déjà en cours : son résultat répond aussi à cet appel
    if (Date.now() < nextAllowed) return { acked: 0, rejected: 0 };
    if (!sessionMatchesActive()) return { acked: 0, rejected: 0 };
    // Le verrou est posé AVANT le premier await : sinon deux flush concurrents
    // (push + démarrage) enverraient le même lot et compteraient deux essais.
    const run = auth().then((headers) => (headers ? doFlush(headers) : { acked: 0, rejected: 0 }));   // anonyme : rien ne part
    inFlight = run;
    try { return await run; }
    finally {
      if (inFlight === run) inFlight = null;
      await refreshPending();
      // Relance APRÈS la levée du verrou : lancée depuis doFlush, elle serait
      // avalée par le garde single-flight et le backlog attendrait le timer.
      if (moreToDrain) { moreToDrain = false; setTimeout(() => { void syncQueue.flush(); }, 0); }
    }
  },

  /** Rapatrie les événements des autres appareils (idempotent). */
  async pull(since?: string): Promise<number> {
    const headers = await auth();
    if (!headers) return 0;
    // Curseur = received_at SERVEUR, jamais occurred_at (horloge client) : un
    // événement d'un autre appareil poussé en retard porte un occurred_at
    // ancien et ne serait jamais rapatrié. Nos propres événements obtiennent
    // leur received_at à l'ack (flush) — le curseur avance donc aussi sur un
    // appareil qui ne fait qu'émettre.
    const last = since ?? (await db.progress_events.filter((e) => !!e.received_at).toArray())
      .reduce<string>((m, e) => (e.received_at! > m ? e.received_at! : m), '1970-01-01T00:00:00Z');
    // Le serveur renvoie 1 000 événements max par page : on boucle sur le
    // curseur received_at jusqu'à une page courte, sinon un appareil neuf ne
    // verrait qu'une partie de la progression jusqu'au N-ième démarrage.
    let cursor = last; let total = 0; let fresh: ProgressEvent[] = [];
    for (;;) {
      let res: Response;
      try { res = await fetch(`${FN}?since=${encodeURIComponent(cursor)}`, { headers }); } catch { break; }
      if (!res || !res.ok) break;
      const { events } = (await res.json()) as { events: ProgressEvent[] };
      if (!events.length) break;
      const known = await db.progress_events.bulkGet(events.map((e) => e.id));
      fresh = events.filter((_, i) => !known[i]);
      if (fresh.length) await db.progress_events.bulkPut(fresh);
      total += fresh.length;
      cursor = events[events.length - 1].received_at ?? cursor;
      if (events.length < 1000) break;
    }
    if (total) {
      const { rebuildProjections } = await import('./projections');
      await rebuildProjections();
    }
    return total;
  },
};

type Sent = { acked: number; rejected: number; kept: number };

async function doFlush(headers: Record<string, string>): Promise<{ acked: number; rejected: number }> {
  // Les lignes jamais retentées d'abord : un événement que le serveur refuse
  // encore (client en avance) ne prend pas la place des nouveaux.
  const rows = await db.outbox.orderBy('attempts').limit(BATCH).toArray();
  if (!rows.length) return { acked: 0, rejected: 0 };
  const r = await send(headers, rows);
  moreToDrain = rows.length === BATCH && r.kept === 0;      // rien de gardé : la page suivante peut partir
  return { acked: r.acked, rejected: r.rejected };
}

/**
 * Envoie un lot. **Aucun refus de LOT ne fait perdre un événement** (S-C1) :
 * seul un refus PAR ÉVÉNEMENT, sans `retry`, retire une ligne de l'outbox.
 * Un 400 sur un lot de plusieurs lignes est isolé ligne par ligne — le serveur
 * de production antérieur à la série 3 refuse ainsi tout lot qui contient un
 * type qu'il ne connaît pas ; les valides passent, le refusé attend.
 */
async function send(headers: Record<string, string>, rows: { id: string; attempts: number }[]): Promise<Sent> {
  const events = await db.progress_events.bulkGet(rows.map((r) => r.id));
  const orphans = rows.filter((_, i) => !events[i]).map((r) => r.id);
  if (orphans.length) await db.outbox.bulkDelete(orphans);  // rien à envoyer : ne bloque plus la tête de file
  rows = rows.filter((_, i) => !!events[i]);
  if (!rows.length) return { acked: 0, rejected: 0, kept: 0 };
  const body = events.filter(Boolean).map((e) => ({ ...e!, user_id: undefined }));
  let res: Response;
  try { res = await fetch(FN, { method: 'POST', headers, body: JSON.stringify({ events: body }) }); }
  catch (e) { await bump(rows, String(e)); return { acked: 0, rejected: 0, kept: rows.length }; }
  if (!res || typeof res.status !== 'number') return { acked: 0, rejected: 0, kept: rows.length };
  if (!res.ok) {
    if (res.status === 400 && rows.length > 1) {
      const sum: Sent = { acked: 0, rejected: 0, kept: 0 };
      for (const row of rows) { const one = await send(headers, [row]); sum.acked += one.acked; sum.rejected += one.rejected; sum.kept += one.kept; }
      return sum;
    }
    await bump(rows, `HTTP ${res.status}`);                  // 4xx de lot, 5xx, 401, 429 : gardé, retenté avec backoff
    return { acked: 0, rejected: 0, kept: rows.length };
  }
  const out = (await res.json()) as { acked: string[]; received?: Record<string, string>; rejected: { id: string | null; reason: string; retry?: boolean }[] };
  await db.outbox.bulkDelete(out.acked);
  // Rétro-remplir received_at (serveur) sur nos propres événements : sans ça,
  // un appareil qui ne fait qu'émettre garderait un curseur de pull à l'époque,
  // et au-delà de 1 000 événements le pull rejouerait toujours la même page.
  if (out.received) {
    await db.transaction('rw', db.progress_events, async () => {
      for (const [id, received_at] of Object.entries(out.received!)) await db.progress_events.update(id, { received_at });
    });
  }
  const retryIds = new Set(out.rejected.filter((r) => r.retry).map((r) => r.id));
  const dropped = out.rejected.filter((r) => !r.retry && r.id);
  await reject(dropped.map((r) => r.id!), dropped.map((r) => r.reason).join('; '));
  const kept = rows.filter((r) => retryIds.has(r.id));
  if (kept.length) await bump(kept, out.rejected.filter((r) => r.retry).map((r) => r.reason).join('; '));
  else { nextAllowed = 0; useSyncStatus.setState({ lastError: null }); }
  return { acked: out.acked.length, rejected: dropped.length, kept: kept.length };
}

async function bump(rows: { id: string; attempts: number }[], err: string) {
  // Par ligne : un lot mélange des événements neufs et d'autres déjà retentés ;
  // écraser tout le monde avec rows[0].attempts fausserait le compte.
  await db.outbox.bulkPut(rows.map((r) => ({ ...r, attempts: r.attempts + 1, lastError: err })));
  const worst = Math.max(...rows.map((r) => r.attempts + 1));
  nextAllowed = Date.now() + backoffMs(worst);
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
  // Au démarrage : vider ce qui attend, puis rapatrier ce que les autres
  // appareils ont produit (sinon un contexte neuf ne voit rien avant le
  // prochain « online » ou le prochain flush).
  if (useSyncStatus.getState().online) void syncQueue.flush().then(() => syncQueue.pull());
  return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); window.clearInterval(timer); };
}
