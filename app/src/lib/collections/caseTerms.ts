import type { Case, Fachbegriff, Favorite } from '@/db/types';
import type { ProgressEvent } from '@/lib/sync/events';
import { sortEvents } from './project';

/** Termes du cas = liés par le contenu (ordre de spécificité, F2a pipeline) ∪ marqués (★ / deck)
 * pendant une session sur ce cas, en ordre d'événement, sans doublon (spec F2a D5). */
export function termsOfCase(caseId: string, all: Fachbegriff[], c: Pick<Case, 'linkedFachbegriffeIds'>, events: ProgressEvent[]): Fachbegriff[] {
  const orderedIds: string[] = [];
  const seen = new Set<string>();
  const add = (id: string | undefined) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    orderedIds.push(id);
  };
  for (const id of c.linkedFachbegriffeIds) add(id);
  for (const e of events) {
    const p = (e.payload ?? {}) as { caseId?: string; termId?: string };
    if (p.caseId !== caseId) continue;
    if (e.type === 'term.favorited' && e.subject_id) add(e.subject_id);
    if (e.type === 'deck.term_added' && p.termId) add(p.termId);
  }
  const byId = new Map(all.map((b) => [b.id, b]));
  return orderedIds.map((id) => byId.get(id)).filter((b): b is Fachbegriff => !!b);
}

/** Résout des ids en Fachbegriffe EN GARDANT l'ordre des ids (ordre publié : diagnostic →
 *  spécifique → contextuel, cf. linkCaseTerms.mjs) — jamais l'ordre alphabétique du glossaire. */
export function termsInOrder(ids: readonly string[], all: Fachbegriff[]): Fachbegriff[] {
  const byId = new Map(all.map((b) => [b.id, b]));
  return ids.map((id) => byId.get(id)).filter((b): b is Fachbegriff => !!b);
}

/** Favoris posés pendant une session sur ce cas et toujours favoris, en ordre d'événement
 *  (lot F point 3 : le drill qui suit le cas commence par eux). */
export function caseFavoriteIds(caseId: string, events: ProgressEvent[], favorites: readonly Favorite[]): string[] {
  const fav = new Set(favorites.map((f) => f.termId));
  const ids = sortEvents(events)
    .filter((e) => e.type === 'term.favorited' && e.subject_id && fav.has(e.subject_id) && (e.payload as { caseId?: string } | null)?.caseId === caseId)
    .map((e) => e.subject_id!);
  return [...new Set(ids)];
}
