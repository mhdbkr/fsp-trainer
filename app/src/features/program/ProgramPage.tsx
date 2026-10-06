// ============================================================================
// Programme (S4-5) — une page qui répond à trois questions, dans l'ordre (proposition validée « 4 · Programme ») :
//   1. Aujourd'hui : le plan FIGÉ du jour, et « Commencer par … » ;
//   2. La semaine : un point par cas prévu, rempli quand il est joué ; les jours off sont neutres ;
//   3. Jusqu'à l'examen : une projection sur le rythme réel, recalculée chaque soir, sans alarme ;
// puis la carte de couverture (des cadrans, pondérée par la fréquence) et son encart.
//
// Ce qui a quitté la page : le champ spécialités × Teile (ADR-0021, l'axe des Teile quitte la surface), le calendrier
// semaine/mois et la navigation de jour en jour (la semaine les remplace ; le carnet des jours passés est l'Historique,
// S4-6). La frise n'y est plus (décision (c)). La page LIT le plan, elle ne recalcule rien qui change la sélection
// (INV-55) : la seule action sur le jour figé reste « Replanifier ».
// ============================================================================
import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { useCases, useProgramConfig } from '@/hooks/useData';
import { useCaseProgress, useDayPlan, useDayPlans, useProjectedDays, useTrainingEvents } from './useProgram';
import { planProgress, programEnd, replanifier, sessionDuJour } from '@/lib/program';
import { setIntensity, setModus } from '@/lib/programAdjust';
import { useToday } from '@/lib/today';
import { useUi } from '@/store/ui';
import { joursRestants } from '@/lib/program/trajectory';
import { FREQUENCES } from '@/lib/program/couverturePonderee';
import { carteCouverture, encartCouverture, joursDeLaSemaine, projectionExamen, semaine } from '@/lib/program/pageProgramme';
import type { DayPlan, Intensity, TrainingEvent } from '@/db/types';
import { ProgramSetup } from './ProgramSetup';
import { RattrapageLine } from './RattrapageLine';
import { RythmeCard } from './RythmeCard';
import { lectureDuPlan, TaskList, taskCta, taskLink } from './TaskLine';
import { SemaineProgramme } from './SemaineProgramme';
import { CarteCouverture } from './CarteCouverture';
import { Icon } from '@/components/icons';
import { EmptyState } from '@/components/ui';

export function ProgramPage() {
  const config = useProgramConfig();
  const cases = useCases();
  const progress = useCaseProgress();
  const plans = useDayPlans();
  const plan = useDayPlan();
  const events = useTrainingEvents();
  const ville = useUi((s) => s.targetCenter);
  const [editing, setEditing] = useState(false);
  const today = useToday((s) => s.day);

  const jours = useMemo(() => joursDeLaSemaine(today), [today]);
  const projected = useProjectedDays(jours);
  const byDate = useMemo(() => new Map((plans ?? []).map((p) => [p.date, p])), [plans]);
  const laSemaine = useMemo(() => (config && events && projected ? semaine({ today, plans: byDate, projection: projected, events, config, cases }) : null), [today, byDate, projected, events, config, cases]);
  // Recalculée chaque soir : la projection ne lit que le journal d'avant aujourd'hui (pageProgramme.ts).
  const projection = useMemo(() => (config && cases && events ? projectionExamen({ cases, events, config, today }) : null), [config, cases, events, today]);
  const carte = useMemo(() => (cases && progress ? carteCouverture(cases, progress, FREQUENCES, ville) : null), [cases, progress, ville]);
  const encart = useMemo(() => (carte && progress ? encartCouverture(carte, progress) : null), [carte, progress]);

  if (config === undefined || !cases || !progress || !plans || !events || plan === undefined) return <div className="text-slate-400">Chargement…</div>;
  if (config === null) {
    return (
      <>
        <EmptyState icon="nav-calendar" title="Aucun programme encore" hint="Configure ta préparation : le plan de chaque journée sera figé à sa première ouverture." />
        <ProgramSetup onDone={() => { /* live-query */ }} />
      </>
    );
  }
  if (editing) return <ProgramSetup initial={config} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />;

  const end = programEnd(config);
  const jRestants = joursRestants(config);                       // I10 : la formule de la frise, pas une seconde

  return (
    <div className="min-w-0 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Programme</h1>
          <p className="text-slate-500 dark:text-slate-400">
            {config.examDate ? `Examen le ${format(end, 'd MMM yyyy', { locale: fr })}` : `${config.weeks} semaines`}
            {jRestants !== null && <> · <b className="text-brand-600 dark:text-brand-300">J-{jRestants}</b></>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ModusSwitch value={config.modus === 'specialite' || config.modus === 'examen-blanc' ? config.modus : 'auto'} onChange={(m) => setModus(config, m === 'auto' ? null : m)} />
          <IntensitySwitch value={config.intensity} onChange={(i) => setIntensity(config, i)} />
          <button type="button" onClick={() => setEditing(true)} className="btn-outline gap-1.5 text-sm">
            <Icon name="gear" className="h-4 w-4" />Ajuster
          </button>
        </div>
      </header>

      <RattrapageLine />
      <RythmeCard />

      <Aujourdhui date={today} plan={plan} events={events} />

      <div className="grid gap-6 md:grid-cols-2">
        {laSemaine && <SemaineProgramme jours={laSemaine} today={today} />}
        {projection && (
          <section className="card p-4">
            <h2 className="mb-2 font-semibold">Jusqu'à l'examen</h2>
            <p className="text-sm text-slate-700 dark:text-slate-200">{projection.texte}</p>
          </section>
        )}
      </div>

      {carte && <CarteCouverture carte={carte} encart={encart} progress={progress} />}
    </div>
  );
}

// --- 1 · Aujourd'hui ---------------------------------------------------------

function Aujourdhui({ date, plan, events }: { date: string; plan: DayPlan | null; events: TrainingEvent[] }) {
  const [busy, setBusy] = useState(false);
  const { faites: done, total } = planProgress(plan);
  const session = sessionDuJour(plan);
  const reste = plan && session ? lectureDuPlan(plan, events).get(session.id)?.reste : undefined;

  return (
    <section className="card p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="font-semibold">Aujourd'hui · {format(parseISO(date), 'EEEE d MMM', { locale: fr })}</h2>
        {plan && plan.tasks.length > 0 && (
          <span className="text-[11px] tnum text-slate-400">{done}/{total} fait{done > 1 ? 's' : ''} · {plan.tasks.reduce((s, t) => s + t.estMin, 0)} min prévues</span>
        )}
      </div>
      {!plan ? (
        <p className="py-4 text-center text-sm text-slate-400">Ce jour sera figé à sa première ouverture.</p>
      ) : plan.tasks.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-400">Jour off — récupère bien.</p>
      ) : (
        <>
          {/* La tâche de « Commencer par … » ne porte pas un second lien vers la même adresse. */}
          <TaskList tasks={plan.tasks} lancer={false} sansLien={session?.id} />
          {session ? (
            <Link to={taskLink(session, reste?.teile)} data-commencer={session.label} data-cta={taskCta(session)} className="btn-primary mt-3 min-h-11 w-full justify-center gap-1.5 text-sm sm:w-auto">
              <Icon name="play" className="h-3.5 w-3.5" />Commencer par {session.label}
            </Link>
          ) : (
            <p className="mt-3 text-center text-[13px] text-emerald-600 dark:text-emerald-300">Journée terminée. Rien d'autre n'est proposé — c'est voulu.</p>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <p className="text-[11px] text-slate-400">{plan.replannedAt ? `Replanifié à ${format(new Date(plan.replannedAt), 'HH:mm')}.` : ''}</p>
            <button
              type="button" disabled={busy}
              onClick={async () => {
                if (!confirm('Replanifier la journée ? Les tâches déjà faites sont conservées ; les autres sont remplacées.')) return;
                setBusy(true); try { await replanifier(date); } finally { setBusy(false); }
              }}
              className="btn-outline gap-1.5 text-xs"
            >
              <Icon name="refresh" className="h-3.5 w-3.5" />Replanifier la journée
            </button>
          </div>
        </>
      )}
    </section>
  );
}

// --- Réglages ----------------------------------------------------------------

/**
 * Le réglage EXPLICITE du mode — il n'en reste que deux (ADR-0021 décision 1). Tout le reste est observé en silence :
 * l'app suit la façon de travailler du candidat, sans la lui proposer ni la lui demander (« Automatique »).
 * Changer de mode ne réécrit AUCUN jour déjà figé.
 */
type ModusChoix = 'auto' | 'specialite' | 'examen-blanc';
const MODUS_META: { id: ModusChoix; label: string; hint: string }[] = [
  { id: 'auto', label: 'Automatique', hint: 'Le plan suit ta façon de travailler.' },
  { id: 'specialite', label: 'Spécialité', hint: 'Une spécialité travaillée à fond, puis la suivante.' },
  { id: 'examen-blanc', label: 'Examen blanc', hint: 'Des runs complets chronométrés, sans assistance.' },
];

function ModusSwitch({ value, onChange }: { value: ModusChoix; onChange: (m: ModusChoix) => void }) {
  const current = MODUS_META.find((m) => m.id === value)!;
  return (
    <label className="flex items-center gap-1.5" title={current.hint}>
      <span className="label hidden sm:inline">Avancement</span>
      <select value={value} onChange={(e) => onChange(e.target.value as ModusChoix)} aria-label="Avancement"
        className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900">
        {MODUS_META.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
      </select>
    </label>
  );
}

const INTENSITY_META: { id: Intensity; label: string; icon: string }[] = [
  { id: 'leicht', label: 'Léger', icon: 'leaf' }, { id: 'mittel', label: 'Moyen', icon: 'bolt' }, { id: 'intensiv', label: 'Intensif', icon: 'flame' },
];
function IntensitySwitch({ value, onChange }: { value: Intensity; onChange: (i: Intensity) => void }) {
  return (
    <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs dark:bg-ink-700" title="Intensité — volume des jours à venir">
      {INTENSITY_META.map((m) => (
        <button key={m.id} type="button" onClick={() => onChange(m.id)}
          className={`flex items-center gap-1 rounded-md px-2 py-1.5 font-medium transition-colors ${value === m.id ? 'bg-white text-brand-700 shadow-sm dark:bg-ink-800 dark:text-brand-200' : 'text-slate-500'}`}>
          <Icon name={m.icon} className="h-3.5 w-3.5" /><span className="hidden sm:inline">{m.label}</span>
        </button>
      ))}
    </div>
  );
}
