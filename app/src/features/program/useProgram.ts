// Lectures réactives du journal et du plan figé.
//
// Aucune de ces fonctions ne MATÉRIALISE quoi que ce soit : la matérialisation
// est pure de tout rendu (contrat §3.2). Un rendu qui ne trouve pas le `DayPlan`
// du jour affiche « pas encore ouvert », il ne le crée pas.
import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { CaseProgress, DayPlan, TaskInstance, TrainingEvent } from '@/db/types';
import { projectedDays } from '@/lib/program/dayPlan';
import { useToday } from '@/lib/today';

/** Le plan figé du jour. `undefined` = chargement, `null` = jour pas encore ouvert.
 *  Sans `date`, suit « aujourd'hui » RÉACTIF (I-1) : l'écran change de jour quand
 *  `watchDayPlan` rouvre la journée, pas au prochain rendu fortuit. */
export function useDayPlan(date?: string): DayPlan | null | undefined {
  const today = useToday((s) => s.day);
  const d = date ?? today;
  return useLiveQuery(async () => (await db.day_plans.get(d)) ?? null, [d], undefined);
}

/** Tous les plans figés — l'historique du plan, jamais recalculé. */
export const useDayPlans = (): DayPlan[] | undefined =>
  useLiveQuery(() => db.day_plans.orderBy('date').toArray(), [], undefined);

/** Le journal, du plus ancien au plus récent. */
export const useTrainingEvents = (): TrainingEvent[] | undefined =>
  useLiveQuery(() => db.training_events.orderBy('at').toArray(), [], undefined);

/** La progression par Teil, indexée par cas. */
export function useCaseProgress(): Map<string, CaseProgress> | undefined {
  const rows = useLiveQuery(() => db.case_progress.toArray(), [], undefined);
  return useMemo(() => (rows ? new Map(rows.map((r) => [r.caseId, r])) : undefined), [rows]);
}

/** La projection NON FIGÉE des jours à venir parmi `dates` (I6). Se recalcule
 *  quand le journal ou le programme change ; ne matérialise rien. */
export const useProjectedDays = (dates: string[]): Map<string, TaskInstance[]> | undefined =>
  useLiveQuery(() => projectedDays(dates), [dates.join(',')], undefined);
