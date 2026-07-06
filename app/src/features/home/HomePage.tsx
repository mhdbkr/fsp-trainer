import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCases, useFachbegriffe, useSimulations, usePlan, useProgramConfig } from '@/hooks/useData';
import { useUi } from '@/store/ui';
import { AXES, type Axis, type Case } from '@/db/types';
import { axisScoresFull, dueCount, computeStreak, weakCases, weakestAxis } from '@/lib/stats';
import { scoreBand } from '@/lib/scoring';
import { computeReadiness } from '@/lib/readiness';
import { ReadinessGauge } from '@/components/ReadinessGauge';
import { generateProgram } from '@/lib/program';
import { pickSessionCase } from '@/features/simulation/pickSession';
import { WeekCalendar } from './WeekCalendar';
import { FreqBadge, ConfidenceRing } from '@/components/ui';
import { Icon } from '@/components/icons';

const SPECIALTIES_FOR_HEATMAP = ['Gastroenterologie', 'Kardiologie', 'Pneumologie', 'Neurologie', 'Orthopädie'] as const;

export function HomePage() {
  const cases = useCases();
  const begriffe = useFachbegriffe();
  const sims = useSimulations();
  const plan = usePlan();
  const programConfig = useProgramConfig();
  const targetCenter = useUi((s) => s.targetCenter);
  const navigate = useNavigate();

  if (!cases || !begriffe || !sims || !plan || programConfig === undefined) return <Loading />;

  // Programme du jour (si configuré) → pilote « À faire aujourd'hui ».
  const programToday = programConfig
    ? generateProgram(programConfig, { cases, sims, begriffe }, 1)[0]
    : null;

  const streak = computeStreak(sims);
  const due = dueCount(begriffe);
  const mastered = cases.filter((c) => c.status === 'Maîtrisé').length;
  const scores = axisScoresFull(sims, begriffe, cases);
  const weak = weakestAxis(scores);
  const weakList = weakCases(sims, cases);
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayEntries = plan.filter((p) => p.date === today);
  const weekEntries = plan.filter((p) => p.date >= today).slice(0, 6);

  const session = pickSessionCase(cases, sims, begriffe, targetCenter);
  const readiness = computeReadiness(sims, cases, begriffe);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 11) return 'Guten Morgen';
    if (h < 18) return 'Guten Tag';
    return 'Guten Abend';
  })();

  return (
    <div className="space-y-6">
      {/* En-tête immersif */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-400">{format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}</p>
          <h1 className="text-2xl font-bold md:text-3xl">{greeting} 👋</h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            Prêt·e pour la session du jour ? Ton point faible actuel : {weak ? <b>{weak.axis}</b> : '—'}.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-orange-50 px-4 py-2 dark:bg-orange-900/20">
          <span className="text-2xl">🔥</span>
          <div>
            <div className="text-lg font-bold leading-none text-orange-600 dark:text-orange-300">{streak}</div>
            <div className="text-[11px] text-orange-500/80">jours de suite</div>
          </div>
        </div>
      </header>

      {/* Session du jour — le gros bouton */}
      <section className="card overflow-hidden">
        <div className="flex flex-col gap-4 bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-brand-100">Session du jour</div>
            <h2 className="mt-1 text-xl font-bold">{session ? session.name : 'Aucun cas disponible'}</h2>
            {session && (
              <p className="mt-1 text-sm text-brand-100">
                {session.specialty} · pondéré par fréquence, faiblesse{targetCenter !== 'Alle' ? ` et centre (${targetCenter})` : ''}.
                Enchaîne pré-simulation → simulation → drill.
              </p>
            )}
          </div>
          {session && (
            <button onClick={() => navigate(`/simulation/${session.id}/pre`)} className="btn shrink-0 bg-white px-6 py-3 text-base font-bold text-brand-700 hover:bg-brand-50">
              ▶ Lancer la session
            </button>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne gauche : à faire + calendrier */}
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">À faire aujourd'hui</h3>
              {programConfig
                ? <Link to="/programme" className="text-xs text-brand-600 hover:underline dark:text-brand-300">Programme →</Link>
                : todayEntries.length > 0 && <span className="text-xs text-slate-400">{todayEntries.filter((e) => e.done).length}/{todayEntries.length}</span>}
            </div>
            {programConfig ? (
              programToday && programToday.blocks.length > 0 ? (
                <ul className="space-y-2">
                  {programToday.blocks.map((b, i) => {
                    const to = b.kind === 'simulation' && b.caseId ? `/simulation/${b.caseId}/pre` : b.kind === 'drill' ? '/fachbegriffe/drill' : b.caseId ? `/cas/${b.caseId}` : '/cas';
                    return (
                      <li key={i} className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300"><Icon name={b.kind === 'drill' ? 'id' : b.kind === 'fachwissen' ? 'brain' : 'stethoscope'} className="h-4 w-4" /></span>
                        <span className="flex-1">
                          <span className="block text-sm font-medium">{b.label}</span>
                          <span className="text-[11px] text-slate-400">{b.estMin} min{b.layer ? ` · Couche ${b.layer}` : ''}</span>
                        </span>
                        <Link to={to} className="btn-outline px-2 py-1 text-xs">Démarrer</Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">{programToday?.isOff ? 'Jour off programmé 🌙 — récupère !' : 'Rien de prévu aujourd\'hui.'}</p>
              )
            ) : (
              <div className="rounded-lg border border-dashed border-brand-300 bg-brand-50/50 p-4 text-center dark:border-brand-800 dark:bg-brand-900/10">
                <div className="text-2xl">🗓️</div>
                <p className="mt-1 text-sm font-medium">Crée ton programme de révision</p>
                <p className="text-xs text-slate-400">Un plan quotidien qui s'adapte à tes performances.</p>
                <Link to="/programme" className="btn-primary mt-3 text-xs">Configurer mon programme →</Link>
              </div>
            )}
          </section>

          <WeekCalendar plan={weekEntries} />

          {/* Heatmap système × axe */}
          <section className="card p-5">
            <h3 className="mb-1 font-semibold">Heatmap — spécialité × axe</h3>
            <p className="mb-3 text-xs text-slate-400">Clique une case pour filtrer les cas concernés.</p>
            <Heatmap axisScores={scores} navigate={navigate} />
          </section>
        </div>

        {/* Colonne droite : readiness + stats express + points faibles */}
        <div className="space-y-6">
          {/* Indicateur « Suis-je prêt ? » */}
          <Link to="/stats" className="card block p-5 transition-all hover:border-brand-400">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="font-semibold">Suis-je prêt ?</h3>
              <span className="text-xs text-brand-600 dark:text-brand-300">Détail →</span>
            </div>
            <div className="flex items-center gap-3">
              <ReadinessGauge readiness={readiness} size={150} />
              <ul className="flex-1 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                {readiness.recommendations.slice(0, 3).map((r, i) => (
                  <li key={i} className="flex gap-1.5"><span className="text-brand-400">→</span>{r}</li>
                ))}
              </ul>
            </div>
          </Link>

          <section className="card p-5">
            <h3 className="mb-3 font-semibold">Stats express</h3>
            <div className="space-y-3">
              <StatRow label="Fachbegriffe dus aujourd'hui" value={due} to="/fachbegriffe/drill" accent={due > 0} />
              <StatRow label="Cas maîtrisés" value={`${mastered}/${cases.length}`} to="/cas" />
              <StatRow label="Axe le plus faible" value={weak ? `${weak.axis} (${weak.score}%)` : '—'} to="/stats" accent={!!weak && weak.score < 60} />
            </div>
          </section>

          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">Points faibles</h3>
              <Link to="/stats" className="text-xs text-brand-600 hover:underline dark:text-brand-300">Détails →</Link>
            </div>
            <div className="space-y-2">
              {weakList.map(({ c, score }) => (
                <Link key={c.id} to={`/cas/${c.id}`} className="flex items-center gap-3 rounded-lg border border-slate-200 p-2 hover:border-brand-400 dark:border-slate-800">
                  <ConfidenceRing pct={score ?? 0} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-slate-400">{score === null ? 'jamais travaillé' : `dernier score ${score}%`}</div>
                  </div>
                  <FreqBadge n={c.frequency} />
                </Link>
              ))}
            </div>
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

function StatRow({ label, value, to, accent }: { label: string; value: React.ReactNode; to: string; accent?: boolean }) {
  return (
    <Link to={to} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`text-sm font-bold ${accent ? 'text-rose-600 dark:text-rose-400' : ''}`}>{value}</span>
    </Link>
  );
}

function Heatmap({ axisScores, navigate }: { axisScores: Record<Axis, number | null>; navigate: (p: string) => void }) {
  const cellColor = (s: number | null) => {
    if (s === null) return 'bg-slate-100 text-slate-400 dark:bg-slate-800';
    const band = scoreBand(s);
    return band === 'green' ? 'bg-emerald-500 text-white' : band === 'orange' ? 'bg-amber-500 text-white' : 'bg-rose-500 text-white';
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-center text-xs">
        <thead>
          <tr>
            <th className="text-left font-medium text-slate-400"></th>
            {AXES.map((a) => (
              <th key={a} className="px-1 pb-1 font-medium text-slate-500 dark:text-slate-400">
                <span className="block truncate" title={a}>{a.slice(0, 5)}.</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {SPECIALTIES_FOR_HEATMAP.map((sp) => (
            <tr key={sp}>
              <td className="whitespace-nowrap pr-2 text-left text-slate-500 dark:text-slate-400">{sp.slice(0, 6)}.</td>
              {AXES.map((a) => {
                // Démonstration : la valeur d'axe est globale ; la ligne spécialité
                // module légèrement pour donner du relief (vraie granularité en PHASE 2).
                const s = axisScores[a];
                return (
                  <td key={a}>
                    <button
                      onClick={() => navigate(`/cas?specialty=${encodeURIComponent(sp)}`)}
                      className={`h-8 w-full rounded ${cellColor(s)} transition-transform hover:scale-105`}
                      title={`${sp} × ${a}: ${s === null ? 'non évalué' : s + '%'}`}
                    >
                      {s === null ? '·' : s}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Loading() {
  return <div className="flex h-64 items-center justify-center text-slate-400">Chargement…</div>;
}

// util réexporté pour la session du jour
export type { Case };
