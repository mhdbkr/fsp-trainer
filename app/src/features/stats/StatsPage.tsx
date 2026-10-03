import { isFullSimulation } from '@/lib/simScope';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { useCases, useFachbegriffe, useSimulations } from '@/hooks/useData';
import { useCaseProgress, useTrainingEvents } from '@/features/program/useProgram';
import { CoverageField } from '@/features/program/CoverageField';
import { TrajectoryStrip } from '@/features/program/TrajectoryStrip';
import { useProgramConfig } from '@/hooks/useData';
import { TEILE } from '@/lib/simScope';
import { Icon } from '@/components/icons';
import { AXES } from '@/db/types';
import { axisScoresFull, specialtyScores, progressSeries, weakCases, weakestAxis } from '@/lib/stats';
import { ScoreBar, EmptyState } from '@/components/ui';

export function StatsPage() {
  const sims = useSimulations();
  const cases = useCases();
  const begriffe = useFachbegriffe();
  const progress = useCaseProgress();
  const events = useTrainingEvents();
  const config = useProgramConfig();
  if (!sims || !cases || !begriffe || !progress || !events || config === undefined) return <div className="text-slate-400">Chargement…</div>;

  if (events.length === 0) {
    return (
      <div className="space-y-5">
        <div className="eyebrow">Analyse</div>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tightish">Stats / Performances</h1>
        <EmptyState icon="nav-chart" title="Pas encore de données" hint="Ta première séance alimentera les stats — simulation, drill ou fiche." />
      </div>
    );
  }

  const scores = axisScoresFull(sims, begriffe, cases, progress);
  const weak = weakestAxis(scores);
  const bySpecialty = specialtyScores(sims, cases);
  const series = progressSeries(sims);
  const weakList = weakCases(progress, cases, 5);
  const radarData = AXES.map((a) => ({ axis: a.slice(0, 8), score: scores[a] ?? 0 }));

  return (
    <div className="space-y-6">
      <header>
        <div className="eyebrow">Analyse</div>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tightish">Stats / Performances</h1>
        <p className="text-slate-500 dark:text-slate-400">
          {sims.filter(isFullSimulation).length} simulations complètes · {sims.filter((x) => !isFullSimulation(x)).length} par partie ·{' '}
          <Link to="/historique" className="text-brand-600 hover:underline dark:text-brand-300">tout l'historique →</Link>
        </p>
      </header>

      {/* Où j'en suis, et où ça mène — la même frise qu'à l'accueil. C'est le
          SEUL indice de préparation de l'app (D-I9) : une formule, un nom. */}
      <TrajectoryStrip config={config} cases={cases} events={events} />

      {weak && weak.score < 60 && (
        <div className="card border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <Icon name="target" className="h-5 w-5 shrink-0" />
            <span>Point faible détecté : <b>{weak.axis}</b> ({weak.score}%). Priorise cet axe dans tes prochaines sessions.</span>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Radar par axe */}
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Profil par axe</h2>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid className="stroke-slate-200 dark:stroke-slate-700" />
              <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: 'currentColor' }} className="text-slate-500" />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
              <Radar name="Score" dataKey="score" stroke="#2b9689" fill="#2b9689" fillOpacity={0.4} />
            </RadarChart>
          </ResponsiveContainer>
        </section>

        {/* Progression */}
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Progression dans le temps</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={series} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-800" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#2b9689" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Par axe (barres) */}
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Détail par axe</h2>
          <div className="space-y-3">
            {AXES.map((a) => (
              <ScoreBar key={a} pct={scores[a] ?? 0} label={a} />
            ))}
          </div>
        </section>

        {/* Par spécialité */}
        <section className="card p-5">
          <h2 className="mb-3 font-semibold">Par spécialité</h2>
          {bySpecialty.length === 0 ? (
            <p className="text-sm text-slate-400">Pas encore de données.</p>
          ) : (
            <div className="space-y-3">
              {bySpecialty.map((s) => (
                <ScoreBar key={s.specialty} pct={s.score} label={`${s.specialty} (${s.count})`} />
              ))}
            </div>
          )}
        </section>
      </div>

      <CoverageField cases={cases} progress={progress} />

      {/* Points faibles — des parties TENTÉES qui n'ont pas tenu. Ce qui n'a
          jamais été travaillé se lit dans le champ de couverture, en neutre. */}
      <section className="card p-5">
        <h2 className="font-semibold">Parties à reprendre</h2>
        <p className="mb-3 text-[11px] text-slate-400">Mesurées sous le seuil. Ce qui n'a pas encore été travaillé n'est pas listé ici.</p>
        {weakList.length === 0 ? (
          <p className="text-sm text-slate-400">Aucune partie mesurée en dessous du seuil.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {weakList.map(({ c, teil, score }) => (
              <Link key={`${c.id}:${teil}`} to={`/simulation/${c.id}/pre?teil=${teil}`} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:border-brand-400 dark:border-slate-800">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{c.name}</div>
                  <div className="text-xs text-slate-400">{TEILE.find((t) => t.key === teil)?.label} · {score} %</div>
                </div>
                <span className="btn-primary shrink-0 px-2 py-1 text-xs"><Icon name="play" className="h-3.5 w-3.5" /></span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
