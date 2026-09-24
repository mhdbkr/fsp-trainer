// ============================================================================
// Budget quotidien de NOUVEAUX Fachbegriffe (spec F2a D2). Les dus ne sont
// jamais limités ; seule l'introduction de termes Neu l'est, pour ne pas
// présenter 2 266 cartes le premier jour. Compteur local par jour (meta).
// ============================================================================
import { getMeta, setMeta } from '@/db/db';
import type { ProgressEvent } from '@/lib/sync/events';
import type { Srs } from '@/db/types';

export interface BudgetInput { freshRemaining: number; workingDaysToExam: number | null; retention7d: number | null }

/** Dernière ligne droite : à ≤ 7 jours ouvrés de l'examen, un terme Neu ne peut plus
 *  atteindre « Gelernt » (deux réussites espacées J+1 puis J+6) — on consolide au
 *  lieu d'ouvrir du nouveau. Plafond décroissant 2 × jours ouvrés (7 → 14 … 1 → 2, 0 → 0). */
const TAPER_DAYS = 7;

export function newBudget(i: BudgetInput): number {
  const base = i.workingDaysToExam === null ? 10 : Math.ceil(i.freshRemaining / Math.max(1, i.workingDaysToExam));
  const f = i.retention7d === null ? 1 : i.retention7d < 0.6 ? 0.7 : i.retention7d > 0.85 ? 1.2 : 1;
  const raw = Math.round(base * f);
  if (i.workingDaysToExam !== null && i.workingDaysToExam <= TAPER_DAYS) {
    return Math.max(0, Math.min(i.workingDaysToExam * 2, raw));
  }
  return Math.max(5, Math.min(30, raw));
}

// Jour LOCAL (pas UTC) : réviser à 00 h 30 compte pour aujourd'hui, pas pour la veille.
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const introducedKey = (d: Date) => `srs.newIntroduced:${dayKey(d)}`;
export const introducedToday = (now = new Date()) => getMeta<number>(introducedKey(now), 0);
export async function markIntroduced(now = new Date()): Promise<void> { await setMeta(introducedKey(now), (await introducedToday(now)) + 1); }
export async function remainingToday(budget: number, now = new Date()): Promise<number> { return Math.max(0, budget - (await introducedToday(now))); }

// Compteur local par jour des dus REVUS (spec F2b D6, plafond de dus présentés).
export const reviewedKey = (d: Date) => `srs.reviewedToday:${dayKey(d)}`;
export const reviewedToday = (now = new Date()) => getMeta<number>(reviewedKey(now), 0);
// Sémantique Anki : une carte ratée (« Wieder ») est remise en fin de file (DrillPage)
// et recomptée à sa prochaine présentation dans la MÊME session — le compteur du jour
// suit les présentations, pas les cartes distinctes.
export async function markReviewed(now = new Date()): Promise<void> { await setMeta(reviewedKey(now), (await reviewedToday(now)) + 1); }

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
