// ============================================================================
// Le calendrier du programme — des dates ABSOLUES, jamais des jours restants (INV-12).
// Sorti de `dayPlan.ts` pour que `rattrapage.ts` et `entree.ts` n'en dépendent pas en cercle.
// ============================================================================
import { addDays, format, getDay, parseISO, startOfDay } from 'date-fns';
import type { ProgramConfig } from '@/db/types';
import { FENETRE_D_UN_TRAIT_JOURS_OUVRES } from './parametres';

export const isWorkingDay = (d: Date, config: Pick<ProgramConfig, 'offDays'>): boolean => !config.offDays.includes(getDay(d));

export function nextWorkingDay(d: Date, config: ProgramConfig): Date {
  let x = d;
  for (let guard = 0; guard < 14 && !isWorkingDay(x, config); guard++) x = addDays(x, 1);
  return x;
}

export function programEnd(config: ProgramConfig): Date {
  if (config.examDate) return parseISO(config.examDate);
  return addDays(parseISO(config.startDate), (config.weeks ?? 8) * 7);
}

/**
 * La « dernière ligne droite », en dates ABSOLUES.
 *
 * INV-12 : l'ancienne version mesurait `taperLen(workingDays.length)` sur les
 * jours RESTANTS (`program.ts:35-37,136`) — la fenêtre se rétrécissait et
 * glissait chaque jour, et le badge apparaissait puis disparaissait tout seul.
 * Ici la fenêtre se calcule sur la date d'examen : elle ne dépend pas de `now`,
 * donc la phase d'un jour figé ne change plus jamais.
 */
export function taperDays(config: ProgramConfig): Set<string> {
  const start = startOfDay(parseISO(config.startDate));
  const last = addDays(startOfDay(programEnd(config)), -1);   // le jour de l'examen n'est pas un jour d'entraînement
  const working: Date[] = [];
  for (let d = start; d <= last; d = addDays(d, 1)) if (isWorkingDay(d, config)) working.push(d);
  const len = Math.max(3, Math.min(8, Math.round(working.length * 0.15)));
  return new Set(working.slice(-len).map((d) => format(d, 'yyyy-MM-dd')));
}

/**
 * La fenêtre « d'un trait » (décision (a) de la direction) : les `FENETRE_D_UN_TRAIT_JOURS_OUVRES` derniers jours ouvrés
 * avant l'examen, en dates ABSOLUES comme `taperDays` (INV-12) — la fenêtre d'un jour figé ne glisse pas. Elle contient la
 * dernière ligne droite.
 */
export function fenetreDUnTrait(config: ProgramConfig): Set<string> {
  const start = startOfDay(parseISO(config.startDate));
  const last = addDays(startOfDay(programEnd(config)), -1);
  const working: Date[] = [];
  for (let d = start; d <= last; d = addDays(d, 1)) if (isWorkingDay(d, config)) working.push(d);
  return new Set(working.slice(-FENETRE_D_UN_TRAIT_JOURS_OUVRES).map((d) => format(d, 'yyyy-MM-dd')));
}

/** Nombre de jours ouvrés strictement après `now` jusqu'à `examDateISO` inclus. */
export function workingDaysUntilExam(examDateISO: string, now: Date, config?: ProgramConfig): number {
  const cfg = config ?? ({ offDays: [0, 6] } as ProgramConfig);
  const end = startOfDay(parseISO(examDateISO));
  let count = 0;
  for (let d = startOfDay(addDays(now, 1)), guard = 0; d <= end && guard < 10_000; d = addDays(d, 1), guard++) {
    if (isWorkingDay(d, cfg)) count++;
  }
  return count;
}
