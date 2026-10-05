import type { Fachbegriff, Favorite } from '@/db/types';
import { effectiveDue, favoriteSinceMap } from '@/lib/srs';
import { sessionFavoriteIds, sortByRelevance, type RelevanceContext } from './relevance';

export interface DrillOpts {
  prioritySpecialty?: string | null;
  priorityPathology?: string | null;
  now?: number;
  limit?: number;
  /** Borne le nombre de Neu introduits (budget du jour, spec F2a D2). Non bornés si absent. */
  newLimit?: number;
  /** Ordonne les Neu par pertinence (favoris, deck, cas simulé/du jour, spécialité). */
  relevance?: RelevanceContext;
  /** Plafonne les dus PRÉSENTÉS (réglage F2b D6, `maxReviewsPerDay`). Non borné si absent. */
  maxReviews?: number;
  /** Termes qui OUVRENT la file, dans cet ordre (drill après un cas : ses favoris, lot F point 3).
   *  Un Neu de cette liste entre toujours, hors budget. */
  leadIds?: string[];
}

const RESERVED_NEW = 3;

/** File de drill : dus (priorité pathologie > spécialité > reste, puis date) puis Neu (favoris de la séance d'abord, puis par pertinence, bornés par newLimit). Le pool borne tout — un deck n'ajoute jamais de terme. */
export function buildDrillQueue(pool: Fachbegriff[], opts: DrillOpts = {}): Fachbegriff[] {
  const now = opts.now ?? Date.now();
  const favorites = opts.relevance?.favorites ?? [];
  const since = favoriteSinceMap(favorites);
  const due$ = new Map(pool.map((b) => [b.id, effectiveDue(b.srs, since.get(b.id))]));
  const priority = (b: Fachbegriff) => (opts.priorityPathology && b.pathologyTags.includes(opts.priorityPathology) ? 0 : opts.prioritySpecialty && b.specialty === opts.prioritySpecialty ? 1 : 2);
  const due = pool.filter((b) => b.srs.state !== 'Neu' && due$.get(b.id)! <= now).sort((a, b) => priority(a) - priority(b) || due$.get(a.id)! - due$.get(b.id)!);
  // Plafond de dus PRÉSENTÉS (spec F2b D6) : bornés en amont, avant la réserve aux Neu.
  const dueShown = opts.maxReviews !== undefined ? due.slice(0, Math.max(0, opts.maxReviews)) : due;
  let news = pool.filter((b) => b.srs.state === 'Neu');
  news = opts.relevance ? sortByRelevance(news, opts.relevance) : news.sort((a, b) => priority(a) - priority(b));
  // Lot F point 1 : TOUS les favoris Neu de la séance (et ceux du cas) entrent. Ils
  // consomment le budget du jour mais ne sont jamais coupés par lui.
  const lead = opts.leadIds ?? [];
  const forcedIds = new Set([...lead, ...(opts.relevance ? sessionFavoriteIds({ now, favorites }) : [])]);
  const forced = news.filter((b) => forcedIds.has(b.id));
  let rest = news.filter((b) => !forcedIds.has(b.id));
  if (opts.newLimit !== undefined) rest = rest.slice(0, Math.max(0, opts.newLimit - forced.length));
  const limit = opts.limit ?? 20;
  // Jusqu'à RESERVED_NEW places gardées aux Neu même quand les dus saturent la file
  // (veto pédagogie). Les favoris forcés s'AJOUTENT : ils ne prennent jamais la place
  // d'un dû (revue I1) et ne sont jamais coupés par `limit` ; les autres Neu
  // remplissent ce qui reste.
  const dueSlots = Math.min(dueShown.length, Math.max(0, limit - Math.min(RESERVED_NEW, forced.length + rest.length)));
  const queue = [...dueShown.slice(0, dueSlots), ...forced, ...rest.slice(0, Math.max(0, limit - dueSlots - forced.length))];
  if (!lead.length) return queue;
  const inQueue = new Map(queue.map((b) => [b.id, b]));
  const head = lead.map((id) => inQueue.get(id)).filter((b): b is Fachbegriff => !!b);
  return [...head, ...queue.filter((b) => !lead.includes(b.id))];
}

/** Ce que la file contiendra (dus / nouveaux / favoris de la séance) — EXACTEMENT la file
 *  servie avec les mêmes options (revue I1 : l'en-tête et la durée ne promettent rien de plus). */
export function queueCounts(pool: Fachbegriff[], opts: DrillOpts = {}): { due: number; fresh: number; favorites: number } {
  const q = buildDrillQueue(pool, opts);
  const fav = opts.relevance ? sessionFavoriteIds({ now: opts.now ?? Date.now(), favorites: opts.relevance.favorites }) : new Set<string>();
  return { due: q.filter((b) => b.srs.state !== 'Neu').length, fresh: q.filter((b) => b.srs.state === 'Neu').length, favorites: q.filter((b) => fav.has(b.id)).length };
}

export function nextDueAt(pool: Fachbegriff[], now = Date.now(), favorites: readonly Favorite[] = []): number | null {
  const since = favoriteSinceMap(favorites);
  const future = pool.filter((b) => b.srs.state !== 'Neu').map((b) => effectiveDue(b.srs, since.get(b.id))).filter((d) => d > now);
  return future.length ? Math.min(...future) : null;
}
