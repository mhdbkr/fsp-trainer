import { TEILE, isFullSimulation, scopeLabel } from '@/lib/simScope';
import type { Case, Simulation } from '@/db/types';
import { Link } from 'react-router-dom';
import { useCases, useSimulations } from '@/hooks/useData';
import { FreqBadge, CenterBadge, EmptyState } from '@/components/ui';
import { Icon } from '@/components/icons';
import { partScore } from '@/lib/scoring';
import { AI_TARGETS } from '@/lib/externalAi/targets';

/** La portée d'une ligne d'historique : ce qui a été JOUÉ. La liste des
 *  parties apparaît dès qu'il y en a plus d'une — un run complet abandonné
 *  après deux parties ne se lit plus « Anamnese seule » (I3). */
export function porteeHistorique(sim: Simulation): string {
  // Les trois Teile seulement : l'Aufklärung n'en est pas un (mineur 3) —
  // elle ne change pas la portée et ne figure pas comme partie.
  const gespielt = TEILE.filter((t) => sim.parts[t.key]?.done).map((t) => t.label);
  const voll = isFullSimulation(sim);
  const basis = voll || sim.teil || gespielt.length < 2 ? scopeLabel(sim) : 'Simulation partielle';
  return gespielt.length > 1 && !(voll && gespielt.length >= 3) ? `${basis} (${gespielt.join(', ')})` : basis;
}

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
            <CaseCard key={c.id} c={c} />
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
                    <div className="flex items-center gap-1.5 text-sm font-medium">
                      {c?.name ?? sim.caseId}
                      {sim.mode === 'external-ai' && (
                        <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">IA externe{sim.externalTarget ? ` · ${AI_TARGETS.find((t) => t.id === sim.externalTarget)?.label ?? sim.externalTarget}` : ''}</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(sim.date).toLocaleDateString('fr-FR')} · {porteeHistorique(sim)}
                    </div>
                  </div>
                  {c && <Link viewTransition to={`/simulation/${c.id}/pre`} className="btn-ghost text-xs">Rejouer</Link>}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}


// Carte de cas. [S4] La carte RETOURNABLE (FB2-P) n'avait qu'une raison d'être, le
// choix d'un Teil : elle disparaît avec lui (ADR-0021 déc. 1). « Commencer » mène à la
// pré-simulation, qui porte le cas entier.
function CaseCard({ c }: { c: Case }) {
  return (
    <div className="card p-4">
      <h3 className="font-medium">{c.name}</h3>
      <p className="text-xs text-slate-400">{c.specialty}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <FreqBadge n={c.frequency} />
        {c.centers.slice(0, 2).map((ct) => <CenterBadge key={ct} center={ct} />)}
      </div>
      <Link viewTransition to={`/simulation/${c.id}/pre`}
        className="btn-primary mt-3 w-full justify-center gap-1.5 text-xs"><Icon name="play" className="h-3.5 w-3.5" />Commencer</Link>
    </div>
  );
}
