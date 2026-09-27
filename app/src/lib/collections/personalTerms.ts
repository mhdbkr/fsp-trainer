// ============================================================================
// Termes personnels (F3, spec §3.1). Mutations = UN événement + reprojection.
// L'id est DÉTERMINISTE (FNV-1a du terme en minuscules) : le même mot créé sur
// deux appareils, même hors ligne, converge vers un seul terme.
// ============================================================================
import { db } from '@/db/db';
import type { Fachbegriff, PersonalTerm, Srs } from '@/db/types';
import type { ProgressEvent } from '@/lib/sync/events';
import { syncQueue } from '@/lib/sync/queue';
import { freshSrs } from '@/lib/srs';
import { lookupTerm } from '@/lib/dictionary';
import { sortEvents } from './project';
import { reprojectCollections, removeFromDeck, toggleFavorite } from './index';

export const PERSONAL_PREFIX = 'pt-';
export const isPersonalId = (id: string): boolean => id.startsWith(PERSONAL_PREFIX);
export const PT_LIMITS = { term: 80, context: 300, explanation: 600 } as const;

export function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}
export const personalTermId = (term: string): string =>
  PERSONAL_PREFIX + fnv1a32(cleanSelection(term).toLowerCase()).toString(16).padStart(8, '0');

export function cleanSelection(raw: string): string {
  return raw.normalize('NFC').replace(/\s+/g, ' ').trim().replace(/^[\s„“"'«»(\[]+|[\s“”"'«»)\].,;:!?]+$/g, '');
}

export interface PersonalTermInput { term: string; context?: string; explanation?: string; caseId?: string }
const cut = (s: string | undefined, n: number) => { const t = s?.trim(); return t ? t.slice(0, n) : undefined; };
export function sanitizePersonalTerm(input: PersonalTermInput): Omit<PersonalTerm, 'id' | 'srs' | 'createdAt'> | null {
  const term = cleanSelection(input.term);
  if (!term || term.length > PT_LIMITS.term) return null;
  const out: Omit<PersonalTerm, 'id' | 'srs' | 'createdAt'> = { term };
  const context = cut(input.context, PT_LIMITS.context); if (context) out.context = context;
  const explanation = cut(input.explanation, PT_LIMITS.explanation); if (explanation) out.explanation = explanation;
  if (input.caseId) out.caseId = input.caseId;
  return out;
}

/** Projection PURE : par id, dernier created/deleted gagne (ordre sortEvents) ;
 *  srs = dernier srs.reviewed APRÈS la dernière création, sinon freshSrs. */
export function projectPersonalTerms(events: ProgressEvent[]): PersonalTerm[] {
  const live = new Map<string, { ev: ProgressEvent; srs: Srs | null }>();
  for (const e of sortEvents(events)) {
    const id = e.subject_id;
    if (!id || !isPersonalId(id)) continue;
    if (e.type === 'term.personal_created') live.set(id, { ev: e, srs: null });
    else if (e.type === 'term.personal_deleted') live.delete(id);
    else if (e.type === 'srs.reviewed') { const cur = live.get(id); if (cur) cur.srs = e.payload as Srs; }
  }
  const out: PersonalTerm[] = [];
  for (const [id, { ev, srs }] of live) {
    const p = sanitizePersonalTerm(ev.payload as PersonalTermInput);
    if (!p) continue;
    const payloadCreatedAt = (ev.payload as { createdAt?: string }).createdAt;
    const createdAt = payloadCreatedAt && !Number.isNaN(Date.parse(payloadCreatedAt)) ? payloadCreatedAt : ev.occurred_at;
    out.push({ id, ...p, createdAt, srs: srs ?? freshSrs(Date.parse(createdAt)) });
  }
  return out;
}

export async function writePersonalTerms(list: PersonalTerm[]): Promise<void> {
  await db.transaction('rw', db.personal_terms, async () => { await db.personal_terms.clear(); await db.personal_terms.bulkPut(list); });
}
export async function reprojectPersonalTerms(): Promise<void> {
  await writePersonalTerms(projectPersonalTerms(await db.progress_events.toArray()));
}

export async function createPersonalTerm(input: PersonalTermInput): Promise<{ id: string; created: boolean }> {
  const clean = sanitizePersonalTerm(input);
  if (!clean) throw new Error('personal_term_invalid');
  const id = personalTermId(clean.term);
  if (await db.personal_terms.get(id)) return { id, created: false };
  await syncQueue.push({ type: 'term.personal_created', subject_id: id, payload: { ...clean, createdAt: new Date().toISOString() } });
  await reprojectPersonalTerms();
  return { id, created: true };
}

export type StarResult = { id: string; kind: 'glossary' | 'personal'; created: boolean; favorite: boolean };
/** ★ de la bulle (F3 D2/D3) : glossaire → favori du terme publié ; sinon terme
 *  personnel (créé une seule fois) + favori. Un 2ᵉ ★ bascule le favori. */
export async function starSelection(input: { selection: string; context?: string; explanation?: string; caseId?: string }, begriffe: Fachbegriff[]): Promise<StarResult> {
  const opts = input.caseId ? { caseId: input.caseId } : {};
  const hit = lookupTerm(input.selection, begriffe);
  if (hit) return { id: hit.id, kind: 'glossary', created: false, favorite: await toggleFavorite(hit.id, opts) };
  const { id, created } = await createPersonalTerm({ term: input.selection, context: input.context, explanation: input.explanation, caseId: input.caseId });
  return { id, kind: 'personal', created, favorite: await toggleFavorite(id, opts) };
}
export async function isStarred(selection: string, begriffe: Fachbegriff[]): Promise<boolean> {
  const hit = lookupTerm(selection, begriffe);
  const id = hit ? hit.id : personalTermId(selection);
  return !!(await db.favorites.get(id));
}

export async function deletePersonalTerm(id: string): Promise<void> {
  if (!isPersonalId(id)) throw new Error('not_personal');
  if (await db.favorites.get(id)) await syncQueue.push({ type: 'term.unfavorited', subject_id: id, payload: {} });
  const decks = await db.deck_terms.where('termId').equals(id).toArray();
  for (const { deckId } of decks) await removeFromDeck(deckId, id);
  await syncQueue.push({ type: 'term.personal_deleted', subject_id: id, payload: {} });
  await reprojectPersonalTerms();
  await reprojectCollections();
}
