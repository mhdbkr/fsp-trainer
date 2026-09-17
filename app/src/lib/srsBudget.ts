// ============================================================================
// Budget quotidien de NOUVEAUX Fachbegriffe (spec F2a D2). Les dus ne sont
// jamais limités ; seule l'introduction de termes Neu l'est, pour ne pas
// présenter 2 266 cartes le premier jour. Compteur local par jour (meta).
// ============================================================================
import { getMeta, setMeta } from '@/db/db';
import type { ProgressEvent } from '@/lib/sync/events';
import type { Srs } from '@/db/types';

export interface BudgetInput { freshRemaining: number; workingDaysToExam: number | null; retention7d: number | null }

export function newBudget(i: BudgetInput): number {
  const base = i.workingDaysToExam === null ? 10 : Math.ceil(i.freshRemaining / Math.max(1, i.workingDaysToExam));
  const f = i.retention7d === null ? 1 : i.retention7d < 0.6 ? 0.7 : i.retention7d > 0.85 ? 1.2 : 1;
  return Math.max(5, Math.min(30, Math.round(base * f)));
}

// Jour LOCAL (pas UTC) : réviser à 00 h 30 compte pour aujourd'hui, pas pour la veille.
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const introducedKey = (d: Date) => `srs.newIntroduced:${dayKey(d)}`;
export const introducedToday = (now = new Date()) => getMeta<number>(introducedKey(now), 0);
export async function markIntroduced(now = new Date()): Promise<void> { await setMeta(introducedKey(now), (await introducedToday(now)) + 1); }
export async function remainingToday(budget: number, now = new Date()): Promise<number> { return Math.max(0, budget - (await introducedToday(now))); }

/** Taux de réussite (note ≥ Schwer) sur les 7 derniers jours ; null si < 10 notes.
 *  Le payload est l'état SRS APRÈS la note : un échec remet `repetitions` à 0
 *  (`reviewSrs`), une réussite l'incrémente — `state` ne suffit pas, car un
 *  premier « Gut » reste 'Zu wiederholen' (intervalle 1 j). */
export function retention7d(events: ProgressEvent[], now = Date.now()): number | null {
  const since = new Date(now - 7 * 24 * 3600 * 1000).toISOString();
  const notes = events.filter((e) => e.type === 'srs.reviewed' && e.occurred_at >= since);
  if (notes.length < 10) return null;
  const ok = notes.filter((e) => ((e.payload as Srs).repetitions ?? 0) > 0).length;
  return ok / notes.length;
}
