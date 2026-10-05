// ============================================================================
// Le calendrier du programme — des dates ABSOLUES, jamais des jours restants (INV-12).
// Sorti de `dayPlan.ts` pour que `rattrapage.ts` et `entree.ts` n'en dépendent pas en cercle.
// ============================================================================
import { addDays, format, getDay, parseISO, startOfDay } from 'date-fns';
import type { ProgramConfig } from '@/db/types';

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
