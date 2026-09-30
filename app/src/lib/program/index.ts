// ============================================================================
// Le Programme — surface publique.
//
// Ce qui a disparu, et ne revient pas :
//  • `schedule()` / `generateProgram()` — la fonction pure recalculée depuis
//    `now` à chaque rendu. Remplacée par un état matérialisé (`dayPlan.ts`).
//  • `casePriority()` et `disciplineBoost` — le barème additif et sa boucle de
//    rétroaction par spécialité. Remplacés par `select.ts`.
//  • `effectiveDoneLayers()` / `ProgramAdjust.doneLayers` — « fait » est une
//    propriété d'une TÂCHE datée, pas d'un cas.
//  • `disciplineStats()` — les jauges « Où le plan met l'accent », dont
//    l'explication décrivait un seuil binaire quand l'algorithme était continu
//    (ADR-0020 §2). Remplacées par le champ de couverture.
// ============================================================================

import { addDays, differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';
import type { Case, CaseProgress, ProgramConfig, SimTeil, TrainingEvent } from '@/db/types';
import { spentByDay, workedDayKeys, blankProgress } from '@/lib/journal';
import { TEILE } from '@/lib/simScope';
import { nowDate } from '@/lib/clock';
import { isWorkingDay, programEnd } from './dayPlan';

export {
  buildTasks, dayTargetMin, ensureDayPlan, isWorkingDay, modusOf, nextWorkingDay,
  planProgress, programEnd, projectedDay, replanifier, sessionDuJour,
  specialiteLaPlusEnDette, taperDays, teilLePlusEnDette,
} from './dayPlan';
export { observeModus, modusAProposer, MIN_SEANCES } from './modus';
export {
  fraicheur, freq, pickWithDiversity, pourquoiAujourdhui, pressionExamen,
  rankCandidates, scoreCase, urgence, type Scored, type SelectContext,
} from './select';

const TEIL_KEYS: SimTeil[] = TEILE.map((t) => t.key);

/** Nombre de jours ouvrés strictement après `now` jusqu'à `examDateISO` inclus. */
export function workingDaysUntilExam(examDateISO: string, now = nowDate(), config?: ProgramConfig): number {
  const cfg = config ?? ({ offDays: [0, 6] } as ProgramConfig);
  const end = startOfDay(parseISO(examDateISO));
  let count = 0;
  for (let d = startOfDay(addDays(now, 1)), guard = 0; d <= end && guard < 10_000; d = addDays(d, 1), guard++) {
    if (isWorkingDay(d, cfg)) count++;
  }
  return count;
}

export interface ProgramStats {
  daysUntilExam: number | null;
  /** Jours où le candidat a TRAVAILLÉ — drill compris (INV-6). L'ancien compte
   *  dérivait des seules simulations : une journée entière de drill affichait
   *  `worked: false`, `spentMin: 0`, et déclenchait le bandeau « retard ». */
  workedDays: number;
  /** Minutes MESURÉES, toutes sources confondues — plan et libre. */
  totalSpentMin: number;
  /** Ce qui reste à rendre solide, en TEILE. L'ancienne unité « couche »
   *  (`3 − layers`) était fausse et non monotone (audit §8). */
  backlogTeile: number;
  totalTeile: number;
}

export function programStats(
  config: ProgramConfig,
  data: { cases: Case[]; trainingEvents: TrainingEvent[]; progress: Map<string, CaseProgress> },
  now = nowDate(),
): ProgramStats {
  const spent = spentByDay(data.trainingEvents);
  let backlogTeile = 0;
  for (const c of data.cases) {
    const cp = data.progress.get(c.id) ?? blankProgress(c.id);
    backlogTeile += TEIL_KEYS.filter((t) => cp.teile[t].status !== 'solide').length;
  }
  return {
    daysUntilExam: config.examDate ? Math.max(0, differenceInCalendarDays(programEnd(config), now)) : null,
    workedDays: workedDayKeys(data.trainingEvents).size,
    totalSpentMin: [...spent.values()].reduce((s, v) => s + v, 0),
    backlogTeile,
    totalTeile: data.cases.length * TEIL_KEYS.length,
  };
}
