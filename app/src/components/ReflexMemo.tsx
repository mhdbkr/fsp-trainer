import { useState } from 'react';
import { REFLEX_PHASES, GENERAL_REFLEXES } from '@/data/guides/reflexes';
import { Icon } from '@/components/icons';

// ============================================================================
// Mémo de réflexes d'examen (Module 6) — bouton flottant + panneau latéral,
// disponible partout (surtout en simulation). Déroulé du jour J + réflexes de
// transition module→module. N'est PAS un tutoriel de démarrage : un aide-mémoire
// de conduite, consultable en conditions.
// ============================================================================
export function ReflexMemo() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setOpen(true)}
        title="Mémo de réflexes d'examen"
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-brand-700"
      >
        <span className="text-lg">🧭</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
          <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md animate-slide-in flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 p-4 dark:border-slate-800">
              <div>
                <div className="text-sm font-bold">🧭 Réflexes d'examen — Jour J</div>
                <div className="text-[11px] text-slate-400">Le déroulé et les transitions module→module</div>
              </div>
              <button onClick={() => setOpen(false)} className="btn-ghost text-lg">✕</button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {/* Timeline des phases */}
              {REFLEX_PHASES.map((ph, idx) => (
                <div key={ph.id} className="relative">
                  <div className="card overflow-hidden">
                    <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/40">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/30 dark:text-brand-300">
                        <Icon name={ph.icon} className="h-5 w-5" />
                      </span>
                      <div className="flex-1">
                        <div className="text-sm font-semibold">{ph.title}</div>
                        <div className="text-[11px] text-slate-400">{ph.subtitle}</div>
                      </div>
                      {ph.minutes > 0 && <span className="chip bg-slate-100 text-slate-500 dark:bg-slate-800">{ph.minutes} min</span>}
                    </div>
                    <ul className="space-y-1 px-3 py-2 text-[13px]">
                      {ph.steps.map((s, i) => <li key={i} className="flex gap-1.5"><span className="text-brand-400">·</span>{s}</li>)}
                    </ul>
                    {ph.cave && <p className="mx-3 mb-2 rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-700 dark:bg-amber-900/20 dark:text-amber-200">⚠ {ph.cave}</p>}
                  </div>
                  {/* Transition vers la phase suivante */}
                  {ph.transition && idx < REFLEX_PHASES.length - 1 && (
                    <div className="my-1.5 flex items-start gap-2 px-3">
                      <span className="mt-0.5 text-brand-500">↓</span>
                      <p className="text-[12px] italic text-brand-700 dark:text-brand-300">{ph.transition}</p>
                    </div>
                  )}
                </div>
              ))}

              {/* Réflexes généraux */}
              <div className="card p-3">
                <div className="label mb-2">Réflexes transversaux</div>
                <ul className="space-y-1.5">
                  {GENERAL_REFLEXES.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px]">
                      <span className="mt-0.5 text-slate-400"><Icon name={r.icon} className="h-4 w-4" /></span>{r.text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
