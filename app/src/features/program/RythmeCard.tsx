// ============================================================================
// Le rythme PROPOSÉ (training-journal.md §13.5, ADR-0022 §5) — jamais imposé.
//
// Une ligne sobre, comme le rattrapage : le rythme réel des derniers jours, sa
// conséquence sur la projection (jamais l'écart en %, réserve P1), puis deux
// gestes. [Caler sur N min] écrit `program.configured` (la config complète) ;
// [Garder] écrit `rythme.refused`, synchronisé : l'autre appareil ne repropose
// pas. Deux refus de suite, plus rien jusqu'à la prochaine modification (P2).
// Rien ne change sans geste, et aucun jour déjà figé ne bouge.
// ============================================================================
import { useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/db';
import { useCases, useProgramConfig } from '@/hooks/useData';
import { useToday } from '@/lib/today';
import { dayTargetMin } from '@/lib/program/dayPlan';
import { accepterRythme, consequenceRythme, proposerRythme, refuserRythme } from '@/lib/program/rythme';
import { refusRythme } from '@/lib/sync/configProjetee';
import { useCaseProgress, useDayPlans, useTrainingEvents } from './useProgram';

export function RythmeCard() {
  const config = useProgramConfig();
  const plans = useDayPlans();
  const events = useTrainingEvents();
  const cases = useCases();
  const progress = useCaseProgress();
  const today = useToday((s) => s.day);
  // Les refus et les configurations viennent du journal SYNCHRONISÉ : un refus fait ailleurs vaut ici.
  const refus = useLiveQuery(async () => refusRythme(await db.progress_events.where('type').anyOf('rythme.refused', 'program.configured').toArray()), [], undefined);

  const p = useMemo(
    () => (config && plans && events && refus ? proposerRythme({ plans, events, config, refus, today }) : null),
    [config, plans, events, refus, today],
  );
  const q = useMemo(
    () => (p && config && cases && progress && events ? consequenceRythme({ cases, progress, config, today, valeur: p.valeur, events }) : null),
    [p, config, cases, progress, events, today],
  );
  if (!p || !config) return null;

  return (
    <section aria-live="polite" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-slate-200 px-4 py-1.5 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
      <p className="min-w-0 flex-1 py-1.5">
        {/* Vrai aussi au plancher : le temps réel TIENT dans la valeur proposée, il ne l'égale pas forcément. */}
        Ton temps des derniers jours tient dans un budget de {p.valeur} min par jour.{q && <> {q.texte}</>}
      </p>
      <div className="flex gap-1">
        <button type="button" onClick={() => refuserRythme(p.semaine)} className="btn-ghost min-h-11 text-xs">Garder {dayTargetMin(config)} min</button>
        <button type="button" onClick={() => accepterRythme(p.valeur, config)} className="btn-outline min-h-11 text-xs">Caler sur {p.valeur} min</button>
      </div>
    </section>
  );
}
