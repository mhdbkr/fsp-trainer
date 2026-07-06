import type { Srs } from '@/db/types';

// ============================================================================
// Algorithme SM-2 (SuperMemo 2) — répétition espacée native, remplace Anki.
// Note de rappel: 0 = "Wieder" (raté), 3 = "Schwer", 4 = "Gut", 5 = "Einfach".
// ============================================================================
export type Grade = 0 | 3 | 4 | 5;

export const DAY_MS = 24 * 60 * 60 * 1000;

export function freshSrs(now = Date.now()): Srs {
  return { interval: 0, easeFactor: 2.5, dueDate: now, repetitions: 0, lapses: 0, state: 'Neu' };
}

/** Applique une note SM-2 et renvoie le nouvel état SRS. */
export function reviewSrs(prev: Srs, grade: Grade, now = Date.now()): Srs {
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

export function isDue(srs: Srs, now = Date.now()): boolean {
  return srs.dueDate <= now;
}
