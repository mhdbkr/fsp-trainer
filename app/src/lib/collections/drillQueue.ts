import type { Fachbegriff } from '@/db/types';
import { isDue } from '@/lib/srs';

/** File de drill : dus (priorité pathologie > spécialité > reste, puis date) puis Neu. Le pool borne tout — un deck n'ajoute jamais de terme. */
export function buildDrillQueue(pool: Fachbegriff[], opts: { prioritySpecialty?: string | null; priorityPathology?: string | null; now?: number; limit?: number } = {}): Fachbegriff[] {
  const now = opts.now ?? Date.now();
  const priority = (b: Fachbegriff) => (opts.priorityPathology && b.pathologyTags.includes(opts.priorityPathology) ? 0 : opts.prioritySpecialty && b.specialty === opts.prioritySpecialty ? 1 : 2);
  const due = pool.filter((b) => isDue(b.srs, now)).sort((a, b) => priority(a) - priority(b) || a.srs.dueDate - b.srs.dueDate);
  const dueIds = new Set(due.map((b) => b.id));
  const news = pool.filter((b) => b.srs.state === 'Neu' && !dueIds.has(b.id)).sort((a, b) => priority(a) - priority(b));
  return [...due, ...news].slice(0, opts.limit ?? 20);
}

export function nextDueAt(pool: Fachbegriff[], now = Date.now()): number | null {
  const future = pool.filter((b) => b.srs.state !== 'Neu' && b.srs.dueDate > now).map((b) => b.srs.dueDate);
  return future.length ? Math.min(...future) : null;
}
