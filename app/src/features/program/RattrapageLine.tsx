// ============================================================================
// Le retour après un jour manqué (FB3-D10) — PROPOSÉ, jamais imposé (Q4).
//
// Une ligne discrète, pas une carte : elle dit ce qui a glissé, puis offre
// [Rattraper] (écrit `plan.replanned`, raison `rattrapage`) ou [Laisser] (retenu
// pour ce jour-là). Aucune tâche n'est ajoutée sans clic. Montée sur l'accueil
// (là où l'on revient) et sur le Programme (là où l'on agit) : même mécanisme,
// `lib/program/rattrapage.ts`.
// ============================================================================
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useLiveQuery } from 'dexie-react-hooks';
import { useProgramConfig } from '@/hooks/useData';
import { useToday } from '@/lib/today';
import { accepterRattrapage, glissement, joursRefuses, refuserRattrapage } from '@/lib/program/rattrapage';
import { resteTexte } from './TaskLine';
import { useDayPlans, useTrainingEvents } from './useProgram';

/** « A et B », « A, B et 2 autres » — deux noms au plus : la ligne reste une ligne. */
const noms = (labels: string[]): string => {
  if (labels.length <= 2) return labels.join(' et ');
  return `${labels[0]}, ${labels[1]} et ${labels.length - 2} autre${labels.length - 2 > 1 ? 's' : ''}`;
};

export function RattrapageLine() {
  const plans = useDayPlans();
  const config = useProgramConfig();
  const events = useTrainingEvents();
  // Le refus est un événement SYNCHRONISÉ : refusé sur un appareil, il vaut sur l'autre.
  const refused = useLiveQuery(() => joursRefuses(), [], undefined);
  const today = useToday((s) => s.day);                    // m-4 : le jour réactif, jamais l'horloge au rendu
  const g = plans && config && refused && events ? glissement(plans, today, config, refused, events) : null;
  if (!g) return null;

  const reprise = g.tasks.length > 0;
  const n = g.tasks.length;
  const jours = `${g.manques} jour${g.manques > 1 ? 's' : ''} manqué${g.manques > 1 ? 's' : ''}`;
  // « (X déjà au plan) » : ce qui a glissé mais que le plan du jour a repris lui-même.
  const dejaAuPlan = g.deja.length ? ` (${noms(g.deja.map((t) => t.label))} déjà au plan)` : '';
  const jour = format(parseISO(g.from), 'EEEE d MMMM', { locale: fr });
  // « hier » pour la veille, la date sinon (texte de la direction).
  const quand = differenceInCalendarDays(parseISO(today), parseISO(g.from)) === 1 ? 'Hier' : jour.charAt(0).toUpperCase() + jour.slice(1);
  // « Finir hier » (§12.8) : un seul cas entamé se dit par ce qui lui reste — « il te reste la Dokumentation ».
  const seule = n === 1 && g.tasks[0].teile && g.tasks[0].teile.length < 3 ? g.tasks[0] : null;
  const phrase = g.manques === 0
    ? seule
      ? `${quand}, tu as commencé ${seule.label} : il te reste ${resteTexte(seule.teile!)} (${seule.estMin} min). La finir ce soir ?`
      : `Il reste ${n} tâche${n > 1 ? 's' : ''} du ${jour}. ${n > 1 ? 'Les ajouter' : "L'ajouter"} à aujourd'hui ?`
    : reprise
      ? `${jours} : ${noms(g.tasks.map((t) => t.label))} ${n > 1 ? 'ont' : 'a'} glissé${dejaAuPlan}.`
      : `${jours} : ${noms(g.deja.map((t) => t.label))} — déjà au plan d'aujourd'hui.`;

  return (
    <section aria-live="polite" className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border border-slate-200 px-4 py-1.5 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
      <p className="min-w-0 py-1.5">{phrase}</p>
      <div className="flex gap-1">
        <button type="button" onClick={() => refuserRattrapage(g.from)} className="btn-ghost min-h-11 text-xs">{reprise ? 'Laisser' : 'Compris'}</button>
        {reprise && <button type="button" onClick={() => accepterRattrapage(today, g.from)} className="btn-outline min-h-11 text-xs">Rattraper</button>}
      </div>
    </section>
  );
}
