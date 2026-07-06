import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import { useCases, useFachbegriffe, useSimulations } from '@/hooks/useData';
import { AXES } from '@/db/types';
import { axisScoresFull, specialtyScores, progressSeries, weakCases, weakestAxis } from '@/lib/stats';
import { computeReadiness } from '@/lib/readiness';
import { ReadinessGauge } from '@/components/ReadinessGauge';
import { ScoreBar, EmptyState } from '@/components/ui';

export function StatsPage() {
  const sims = useSimulations();
  const cases = useCases();
  const begriffe = useFachbegriffe();
  if (!sims || !cases || !begriffe) return <div className="text-slate-400">Chargement…</div>;

  if (sims.length === 0) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-bold">Stats / Performances</h1>
        <EmptyState icon="📈" title="Pas encore de données" hint="Lance une simulation pour alimenter les stats." />
      </div>
    );
  }

  const scores = axisScoresFull(sims, begriffe, cases);
  const weak = weakestAxis(scores);
  const readiness = computeReadiness(sims, cases, begriffe);
  const bySpecialty = specialtyScores(sims, cases);
  const series = progressSeries(sims);
  const weakList = weakCases(sims, cases, 5);
  const radarData = AXES.map((a) => ({ axis: a.slice(0, 8), score: scores[a] ?? 0 }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Stats / Performances</h1>
        <p className="text-slate-500 dark:text-slate-400">{sims.length} simulations · détection auto des points faibles.</p>
      </header>

      {/* Indicateur de préparation global */}
      <section className="card p-5">
        <div className="grid items-center gap-4 sm:grid-cols-[auto_1fr]">
          <ReadinessGauge readiness={readiness} size={190} />
          <div>
            <h2 className="font-semibold">Prêt à réussir la FSP ?</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Verdict global pondéré par ton niveau d'assistance et tes couches.</p>
            <ul className="mt-2 space-y-1 text-sm">
              {readiness.recommendations.map((r, i) => (
                <li key={i} className="flex gap-2"><span className="text-brand-400">→</span>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {weak && weak.score < 60 && (
        <div className="card border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <span className="text-lg">🎯</span>
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

      {/* Points faibles → révisions */}
      <section className="card p-5">
        <h2 className="mb-3 font-semibold">Cas à retravailler en priorité</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {weakList.map(({ c, score }) => (
            <Link key={c.id} to={`/cas/${c.id}`} className="flex items-center justify-between rounded-lg border border-slate-200 p-3 hover:border-brand-400 dark:border-slate-800">
              <div>
                <div className="text-sm font-medium">{c.name}</div>
                <div className="text-xs text-slate-400">{score === null ? 'jamais travaillé' : `${score}%`}</div>
              </div>
              <span className="btn-primary px-2 py-1 text-xs">▶</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
