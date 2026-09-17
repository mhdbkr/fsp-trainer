import { TEILE, scopeLabel } from '@/lib/simScope';
import { ModeChooser } from '@/components/ModeChooser';
import type { Case } from '@/db/types';
import { useEffect, useState } from 'react';
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
            <FlipCaseCard key={c.id} c={c} />
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


// Carte de cas RETOURNABLE (FB2-P, retour direction) : « Commencer » retourne
// la carte entière ; le verso, en verre, propose la complète au-dessus et les
// trois Teile en dessous, nés d'une division. Retour par ↩ ou Échap.
function FlipCaseCard({ c }: { c: Case }) {
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    if (!flipped) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFlipped(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped]);
  return (
    <div className="[perspective:1200px]">
      <div className={`grid transition-transform duration-500 ease-fluid [transform-style:preserve-3d] motion-reduce:transition-none ${flipped ? '[transform:rotateY(180deg)]' : ''}`}>
        {/* Recto */}
        <div className="card p-4 [grid-area:1/1] [backface-visibility:hidden]" aria-hidden={flipped}>
          <h3 className="font-medium">{c.name}</h3>
          <p className="text-xs text-slate-400">{c.specialty}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <FreqBadge n={c.frequency} />
            {c.centers.slice(0, 2).map((ct) => <CenterBadge key={ct} center={ct} />)}
          </div>
          <button type="button" onClick={() => setFlipped(true)} tabIndex={flipped ? -1 : 0}
            className="btn-primary mt-3 w-full justify-center gap-1.5 text-xs"><Icon name="play" className="h-3.5 w-3.5" />Commencer</button>
        </div>
        {/* Verso — verre, choix du mode */}
        <div className="glass glass-edge flex flex-col rounded-2xl p-3 [grid-area:1/1] [backface-visibility:hidden] [transform:rotateY(180deg)]" aria-hidden={!flipped}>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{c.name}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Comment veux-tu t'entraîner ?</div>
            </div>
            <button type="button" onClick={() => setFlipped(false)} title="Retourner la carte" aria-label="Retourner la carte" tabIndex={flipped ? 0 : -1}
              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-white/60 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-white">
              <Icon name="refresh" className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-auto">
            {flipped && <ModeChooser tone="glass" compact hrefFor={(t) => `/simulation/${c.id}/pre${t ? `?teil=${t}` : ''}`} />}
          </div>
        </div>
      </div>
    </div>
  );
}
