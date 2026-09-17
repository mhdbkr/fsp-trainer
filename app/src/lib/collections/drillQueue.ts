import type { Fachbegriff } from '@/db/types';
import { isDue } from '@/lib/srs';
import { sortByRelevance, type RelevanceContext } from './relevance';

export interface DrillOpts {
  prioritySpecialty?: string | null;
  priorityPathology?: string | null;
  now?: number;
  limit?: number;
  /** Borne le nombre de Neu introduits (budget du jour, spec F2a D2). Non bornés si absent. */
  newLimit?: number;
  /** Ordonne les Neu par pertinence (favoris, deck, cas simulé/du jour, spécialité). */
  relevance?: RelevanceContext;
}

/** File de drill : dus (priorité pathologie > spécialité > reste, puis date) puis Neu (par pertinence si fournie, bornés par newLimit). Le pool borne tout — un deck n'ajoute jamais de terme. */
export function buildDrillQueue(pool: Fachbegriff[], opts: DrillOpts = {}): Fachbegriff[] {
  const now = opts.now ?? Date.now();
  const priority = (b: Fachbegriff) => (opts.priorityPathology && b.pathologyTags.includes(opts.priorityPathology) ? 0 : opts.prioritySpecialty && b.specialty === opts.prioritySpecialty ? 1 : 2);
  const due = pool.filter((b) => isDue(b.srs, now)).sort((a, b) => priority(a) - priority(b) || a.srs.dueDate - b.srs.dueDate);
  let news = pool.filter((b) => b.srs.state === 'Neu');
  news = opts.relevance ? sortByRelevance(news, opts.relevance) : news.sort((a, b) => priority(a) - priority(b));
  if (opts.newLimit !== undefined) news = news.slice(0, Math.max(0, opts.newLimit));
  return [...due, ...news].slice(0, opts.limit ?? 20);
}

/** Ce que la file contiendra (dus / nouveaux), sans la borne d'affichage `limit`. */
export function queueCounts(pool: Fachbegriff[], opts: DrillOpts = {}): { due: number; fresh: number } {
  const q = buildDrillQueue(pool, { ...opts, limit: Number.MAX_SAFE_INTEGER });
  return { due: q.filter((b) => b.srs.state !== 'Neu').length, fresh: q.filter((b) => b.srs.state === 'Neu').length };
}

export function nextDueAt(pool: Fachbegriff[], now = Date.now()): number | null {
  const future = pool.filter((b) => b.srs.state !== 'Neu' && b.srs.dueDate > now).map((b) => b.srs.dueDate);
  return future.length ? Math.min(...future) : null;
}
