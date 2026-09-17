import { TEILE, scopeLabel } from '@/lib/simScope';
import { Link } from 'react-router-dom';
import { useCases, useSimulations } from '@/hooks/useData';
import { FreqBadge, CenterBadge, EmptyState } from '@/components/ui';
import { Icon } from '@/components/icons';
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
        <div className="eyebrow">Entraînement</div>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tightish">Simulation</h1>
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
              {/* « Commencer » = complète ; au survol ou au focus, trois icônes
                  glissent depuis le bord droit du bouton — un Teil seul (FB2-P).
                  Groupe = focus-within : accessible au clavier, chaque icône
                  est un lien nommé. */}
              <div className="group/start relative mt-3 flex items-stretch">
                <Link to={`/simulation/${c.id}/pre`} className="btn-primary relative z-10 w-full justify-center gap-1.5 text-xs transition-[padding] duration-300 ease-fluid group-hover/start:pr-[6.5rem] group-focus-within/start:pr-[6.5rem]"><Icon name="play" className="h-3.5 w-3.5" />Commencer</Link>
                <div className="pointer-events-none absolute inset-y-0 right-0 z-20 flex items-center gap-1 pr-1 opacity-0 transition-[opacity,transform] duration-300 ease-fluid [transform:translateX(12px)] group-hover/start:pointer-events-auto group-hover/start:opacity-100 group-hover/start:[transform:translateX(0)] group-focus-within/start:pointer-events-auto group-focus-within/start:opacity-100 group-focus-within/start:[transform:translateX(0)] motion-reduce:transition-none">
                  {TEILE.map((t, i) => (
                    <Link key={t.key} to={`/simulation/${c.id}/pre?teil=${t.key}`} title={`${t.label} seule`} aria-label={`${t.label} seule`}
                      style={{ transitionDelay: `${i * 40}ms` }}
                      className="z-20 grid h-7 w-7 place-items-center rounded-lg bg-white/90 text-brand-700 shadow-sm ring-1 ring-brand-200 transition-colors hover:bg-brand-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-ink-700 dark:text-brand-200 dark:ring-brand-800">
                      <Icon name={t.icon} className="h-3.5 w-3.5" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-semibold">Simulations récentes</h2>
        {recent.length === 0 ? (
          <EmptyState icon="nav-sim" title="Aucune simulation encore" hint="Lance ta première session." />
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
                      {new Date(sim.date).toLocaleDateString('fr-FR')} · {scopeLabel(sim)}{sim.scope !== 'teil' && parts.length < 3 ? ` (${parts.map(([k]) => TEILE.find((t) => t.key === k)?.label ?? k).join(', ')})` : ''}
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
