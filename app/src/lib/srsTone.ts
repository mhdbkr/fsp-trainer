import type { Srs } from '@/db/types';
/** Tons SRS partagés (page, tiroir, drill, barre de simulation). Sémantique existante, jamais redéfinie ailleurs. */
export const SRS_TONE: Record<Srs['state'], { chip: string; dot: string }> = {
  Neu: { chip: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300', dot: 'bg-sky-500' },
  Gelernt: { chip: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', dot: 'bg-emerald-500' },
  'Zu wiederholen': { chip: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', dot: 'bg-amber-500' },
};
