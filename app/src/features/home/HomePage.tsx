// ============================================================================
// Accueil — RESSERRÉ (ADR-0020 §5) : la tâche du jour, son explication en une
// ligne, l'avancement du plan figé. Puis la trajectoire. Rien d'autre.
//
// Retirés : la heatmap spécialité × axe (cinq fois la même valeur globale sur
// cinq spécialités en dur parmi dix-sept — rien à réparer, l'information
// n'existait pas dans sa source) et le second moteur de sélection
// (`pickSessionCase`), qui faisait que le hero ignorait totalement le plan
// affiché juste en dessous.
// ============================================================================
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCases, useFachbegriffe, useProgramConfig } from '@/hooks/useData';
import { useCaseProgress, useDayPlan, useTrainingEvents } from '@/features/program/useProgram';
import { dueCount, streakFromDays, weakCases } from '@/lib/stats';
import { workedDayKeys } from '@/lib/journal';
import { planProgress, sessionDuJour } from '@/lib/program';
import { RattrapageLine } from '@/features/program/RattrapageLine';
import { TrajectoryStrip } from '@/features/program/TrajectoryStrip';
import { TaskList, taskCta, taskLink } from '@/features/program/TaskLine';
import { nowDate } from '@/lib/clock';
import { useToday } from '@/lib/today';
import { TEILE } from '@/lib/simScope';
import { FreqBadge } from '@/components/ui';
import { Icon } from '@/components/icons';
import { Tilt } from '@/components/Tilt';
import { MigrationPrompt } from '@/features/account/MigrationPrompt';
import { PendingExternalSimCard } from '@/features/simulation/PendingExternalSimCard';
import { AnnonceS4 } from './AnnonceS4';

export function HomePage() {
  const cases = useCases();
  const begriffe = useFachbegriffe();
  const config = useProgramConfig();
  const plan = useDayPlan();
  const today = useToday((s) => s.day);
  const events = useTrainingEvents();
  const progress = useCaseProgress();

  if (!cases || !begriffe || !events || !progress || config === undefined || plan === undefined) {
    return <div className="flex h-64 items-center justify-center text-slate-400">Chargement…</div>;
  }

  const streak = streakFromDays(workedDayKeys(events), nowDate(), config?.offDays ?? []);
  const due = dueCount(begriffe);
  const session = sessionDuJour(plan);
  const { done, total } = planProgress(plan);
  const weak = weakCases(progress, cases, 3);

  const greeting = (() => {
    const h = nowDate().getHours();
    return h < 11 ? 'Guten Morgen' : h < 18 ? 'Guten Tag' : 'Guten Abend';
  })();

  return (
    <div className="space-y-6">
      <MigrationPrompt />
      <AnnonceS4 />
      <PendingExternalSimCard />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="eyebrow">{format(parseISO(today), 'EEEE d MMMM', { locale: fr })}</div>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tightish md:text-4xl">{greeting}</h1>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl border border-signal-200 bg-signal-50 px-4 py-2.5 dark:border-signal-900/40 dark:bg-signal-900/15">
          <Icon name="flame" className="h-6 w-6 text-signal-500" />
          <div>
            <div className="text-xl font-bold leading-none tnum text-signal-600 dark:text-signal-300">{streak}</div>
            <div className="mt-0.5 text-[10px] font-semibold text-signal-500/80">{streak === 1 ? 'jour de suite' : 'jours de suite'}</div>
          </div>
        </div>
      </header>

      {/* La tâche du jour — la PREMIÈRE tâche non faite du plan figé, et son
          « pourquoi aujourd'hui ». Le hero et la liste lisent le MÊME plan. */}
      {config === null ? (
        <SetupInvite />
      ) : plan === null ? (
        <Tilt className="card relative overflow-hidden">
          <div className="relative bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-brand-100"><span className="h-px w-6 bg-signal-400" />Aujourd'hui</div>
            <h2 className="mt-1.5 text-xl font-bold tracking-tightish">La journée n'est pas encore figée</h2>
            <p className="mt-1.5 max-w-xl text-sm text-brand-100/90">Elle s'ouvre dès que l'app est au premier plan — son plan sera fixé une fois pour toutes.</p>
          </div>
        </Tilt>
      ) : session ? (
        <Tilt className="card relative overflow-hidden">
          <svg className="pointer-events-none absolute inset-y-0 right-0 h-full w-2/3 text-white/10" viewBox="0 0 400 160" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" preserveAspectRatio="xMaxYMid slice">
            <path d="M0 80h120l14-52 24 104 18-70 12 30h200" />
          </svg>
          <div className="relative flex flex-col gap-4 bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-brand-100">
                <span className="h-px w-6 bg-signal-400" />Session du jour · {done}/{total}
              </div>
              <h2 className="mt-1.5 text-xl font-bold tracking-tightish md:text-2xl">{session.label}</h2>
              {/* L'explication, en une ligne, figée avec la tâche. */}
              <p className="mt-1.5 max-w-xl text-sm text-brand-100/90">{session.reason} · <span className="tnum">{session.estMin} min</span></p>
            </div>
            <Link to={taskLink(session)} className="btn shrink-0 gap-2 bg-white px-6 py-3 text-base font-bold text-brand-700 hover:bg-brand-50">
              <Icon name="play" className="h-4 w-4" />{taskCta(session)}
            </Link>
          </div>
        </Tilt>
      ) : (
        <Tilt className="card relative overflow-hidden">
          <div className="relative bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-white">
            <div className="flex items-center gap-2 text-[11px] font-semibold text-brand-100"><span className="h-px w-6 bg-signal-400" />Session du jour</div>
            <h2 className="mt-1.5 text-xl font-bold tracking-tightish">
              {total === 0 ? 'Jour off — récupère bien.' : 'Journée terminée.'}
            </h2>
            <p className="mt-1.5 max-w-xl text-sm text-brand-100/90">
              {total === 0 ? 'Rien n\'était prévu aujourd\'hui.' : 'Rien d\'autre n\'est proposé : c\'est voulu. Tu peux travailler librement, tout est compté.'}
            </p>
          </div>
        </Tilt>
      )}

      <RattrapageLine />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {plan && plan.tasks.length > 0 && (
            <section className="card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold">Le plan du jour</h3>
                <Link to="/programme" className="text-xs text-brand-600 hover:underline dark:text-brand-300">Programme →</Link>
              </div>
              <TaskList tasks={plan.tasks} />
            </section>
          )}

          {/* Le visuel qui vend : où j'en suis, et où ça mène. */}
          <TrajectoryStrip config={config} cases={cases} events={events} />
        </div>

        <div className="min-w-0 space-y-6">
          <section className="card p-5">
            <h3 className="mb-3 font-semibold">Aujourd'hui</h3>
            <div className="space-y-3">
              <StatRow label="Fachbegriffe dus" value={due} to="/fachbegriffe/drill" accent={due > 0} />
              <StatRow label="Plan du jour" value={`${done}/${total}`} to="/programme" />
              <StatRow label="Tout ce que j'ai fait" value={`${events.length}`} to="/historique" />
            </div>
          </section>

          <section className="card p-5">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-semibold">Points faibles</h3>
              <Link to="/stats" className="text-xs text-brand-600 hover:underline dark:text-brand-300">Détails →</Link>
            </div>
            {/* Un point faible se décide sur la PERFORMANCE, jamais sur
                l'absence : un cas jamais travaillé n'apparaît pas ici. */}
            <p className="mb-3 text-[11px] text-slate-400">Des parties tentées qui n'ont pas tenu. Ce qui n'a pas encore été travaillé n'est pas listé ici.</p>
            {weak.length === 0 ? (
              <p className="text-sm text-slate-400">Aucune partie mesurée en dessous du seuil. Rien à signaler.</p>
            ) : (
              <div className="space-y-2">
                {weak.map(({ c, teil, score }) => (
                  <Link key={`${c.id}:${teil}`} to={`/simulation/${c.id}/pre?teil=${teil}`}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 p-2 hover:border-brand-400 dark:border-slate-800">
                    <span className="mono-tag tnum shrink-0">{score} %</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium [overflow-wrap:anywhere]">{c.name}</div>
                      <div className="text-xs text-slate-400">{TEILE.find((t) => t.key === teil)?.label}</div>
                    </div>
                    <FreqBadge n={c.frequency} />
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="card p-5">
            <h3 className="mb-3 font-semibold">Guides rapides</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                { t: 'Anamnese', id: 'guide-anamnese-v4' },
                { t: 'Arztbrief', id: 'guide-arztbrief' },
                { t: 'Fallvorstellung', id: 'guide-fallvorstellung' },
                { t: 'Kommunikation', id: 'guide-kommunikation' },
              ].map((g) => (
                <Link key={g.id} to={`/guides?open=${g.id}`} className="btn-outline justify-center text-xs">{g.t}</Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SetupInvite() {
  return (
    <div className="card rounded-lg border border-dashed border-brand-300 bg-brand-50/50 p-6 text-center dark:border-brand-800 dark:bg-brand-900/10">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
        <Icon name="nav-calendar" className="h-6 w-6" />
      </div>
      <p className="mt-2 text-sm font-medium">Crée ton programme de révision</p>
      <p className="text-xs text-slate-400">Chaque journée sera figée à sa première ouverture — et ne bougera plus.</p>
      <Link to="/programme" className="btn-primary mt-3 text-xs">Configurer mon programme →</Link>
    </div>
  );
}

function StatRow({ label, value, to, accent }: { label: string; value: React.ReactNode; to: string; accent?: boolean }) {
  return (
    <Link to={to} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-sm font-bold tnum ${accent ? 'text-signal-600 dark:text-signal-400' : ''}`}>{value}</span>
    </Link>
  );
}
