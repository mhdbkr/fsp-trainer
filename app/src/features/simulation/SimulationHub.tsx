import { Link } from 'react-router-dom';
import { useCases, useSimulations } from '@/hooks/useData';
import { FreqBadge, CenterBadge, EmptyState } from '@/components/ui';
import { partScore } from '@/lib/scoring';

export function SimulationHub() {
  const cases = useCases();
  const sims = useSimulations();
  if (!cases || !sims) return <div className="text-slate-400">Chargement…</div>;

  const recent = sims.slice(0, 5);
  const byCase = new Map(cases.map((c) => [c.id, c]));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Simulation</h1>
        <p className="text-slate-500 dark:text-slate-400">Choisis un cas à simuler en conditions réelles (chrono, notes, guide, scoring).</p>
      </header>

      <section>
        <h2 className="mb-3 font-semibold">Cas à simuler</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <div key={c.id} className="card p-4">
              <h3 className="font-medium">{c.name}</h3>
              <p className="text-xs text-slate-400">{c.specialty}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <FreqBadge n={c.frequency} />
                {c.centers.slice(0, 2).map((ct) => <CenterBadge key={ct} center={ct} />)}
              </div>
              <Link to={`/simulation/${c.id}/pre`} className="btn-primary mt-3 w-full justify-center text-xs">▶ Pré-simulation</Link>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Simulations récentes</h2>
        {recent.length === 0 ? (
          <EmptyState icon="🎬" title="Aucune simulation encore" hint="Lance ta première session." />
        ) : (
          <div className="space-y-2">
            {recent.map((sim) => {
              const c = byCase.get(sim.caseId);
              const parts = Object.entries(sim.parts).filter(([, p]) => p?.done);
              const avg = parts.length ? Math.round(parts.reduce((s, [, p]) => s + partScore(p!), 0) / parts.length) : 0;
              return (
                <div key={sim.id} className="card flex items-center gap-4 p-3">
                  <div className={`flex h-10 w-12 flex-col items-center justify-center rounded-lg text-xs font-bold ${avg >= 60 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'}`}>
                    {avg}%
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{c?.name ?? sim.caseId}</div>
                    <div className="text-xs text-slate-400">
                      {new Date(sim.date).toLocaleDateString('fr-FR')} · {sim.role} · {parts.map(([k]) => k).join(', ')}
                    </div>
                  </div>
                  {c && <Link to={`/simulation/${c.id}/pre`} className="btn-ghost text-xs">Rejouer</Link>}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
