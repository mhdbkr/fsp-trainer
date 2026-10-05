import type { Favorite, Srs } from '@/db/types';
import { now as clockNow } from '@/lib/clock';

// ============================================================================
// Algorithme SM-2 (SuperMemo 2) — répétition espacée native, remplace Anki.
// Note de rappel: 0 = "Wieder" (raté), 3 = "Schwer", 4 = "Gut", 5 = "Einfach".
// ============================================================================
export type Grade = 0 | 3 | 4 | 5;

export const DAY_MS = 24 * 60 * 60 * 1000;

export function freshSrs(now = clockNow()): Srs {
  return { interval: 0, easeFactor: 2.5, dueDate: now, repetitions: 0, lapses: 0, state: 'Neu' };
}

/** Applique une note SM-2 et renvoie le nouvel état SRS. */
export function reviewSrs(prev: Srs, grade: Grade, now = clockNow()): Srs {
  let { interval, easeFactor, repetitions, lapses } = prev;

  if (grade < 3) {
    // Raté → on repart, révision le jour même (dans ~10 min → dueDate = now).
    repetitions = 0;
    interval = 0;
    lapses += 1;
    easeFactor = Math.max(1.3, easeFactor - 0.2);
    return { interval, easeFactor, repetitions, lapses, dueDate: now + 60_000, state: 'Zu wiederholen' };
  }

  // Réussi
  repetitions += 1;
  if (repetitions === 1) interval = 1;
  else if (repetitions === 2) interval = 6;
  else interval = Math.round(interval * easeFactor);

  // Ajustement de la facilité (formule SM-2)
  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));

  // Cap à 25 jours comme le recommandaient les instructions Anki du deck FSP.
  interval = Math.min(interval, 25);

  return {
    interval, easeFactor, repetitions, lapses,
    dueDate: now + interval * DAY_MS,
    state: interval >= 6 ? 'Gelernt' : 'Zu wiederholen',
  };
}

/** termId → instant du favori (ms). Construite UNE fois par l'appelant, lue par terme. */
export const favoriteSinceMap = (favorites: readonly Favorite[] = []): Map<string, number> =>
  new Map(favorites.map((f) => [f.termId, Date.parse(f.since)]));

/** Échéance effective (lot F point 2) : un terme appris mis en favori, et pas revu
 *  depuis, est dû au lendemain du favori — jamais plus tard que son échéance SRS.
 *  Calculée à la lecture : le SRS et son historique ne sont jamais réécrits. */
export function effectiveDue(srs: Srs, favoriteSince?: number): number {
  if (srs.state === 'Neu' || favoriteSince === undefined) return srs.dueDate;
  // Dernière revue = dueDate − interval (reviewSrs : réussite → now + interval·j ; raté → now + 60 s, interval 0).
  if (srs.dueDate - srs.interval * DAY_MS >= favoriteSince) return srs.dueDate;
  const lendemain = new Date(favoriteSince); lendemain.setHours(24, 0, 0, 0);
  return Math.min(srs.dueDate, lendemain.getTime());
}

/** Dû = déjà présenté (state ≠ Neu) et échéance (effective) passée. Un Neu n'est jamais réclamé (spec F2a D1). */
export function isDue(srs: Srs, now = clockNow(), favoriteSince?: number): boolean {
  return srs.state !== 'Neu' && effectiveDue(srs, favoriteSince) <= now;
}
export const isNew = (srs: Srs): boolean => srs.state === 'Neu';
