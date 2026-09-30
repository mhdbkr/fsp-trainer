// Lectures réactives du journal et du plan figé.
//
// Aucune de ces fonctions ne MATÉRIALISE quoi que ce soit : la matérialisation
// est pure de tout rendu (contrat §3.2). Un rendu qui ne trouve pas le `DayPlan`
// du jour affiche « pas encore ouvert », il ne le crée pas.
import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import type { CaseProgress, DayPlan, Fortschrittsmodus, TrainingEvent } from '@/db/types';
import { todayKey } from '@/lib/clock';
import { MODUS_REFUSE_KEY } from '@/lib/programAdjust';

/** Le plan figé du jour. `undefined` = chargement, `null` = jour pas encore ouvert. */
export const useDayPlan = (date = todayKey()): DayPlan | null | undefined =>
  useLiveQuery(async () => (await db.day_plans.get(date)) ?? null, [date], undefined);

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

/** Le mode d'avancement que le candidat a explicitement REFUSÉ, s'il y en a un.
 *  `undefined` = chargement, `null` = aucun refus. */
export const useModusRefuse = (): Fortschrittsmodus | null | undefined =>
  useLiveQuery(async () => ((await db.meta.get(MODUS_REFUSE_KEY))?.value as Fortschrittsmodus) ?? null, [], undefined);
