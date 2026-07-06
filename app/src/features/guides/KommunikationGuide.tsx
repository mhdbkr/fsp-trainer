import { useState } from 'react';
import { KOMMUNIKATIVE_STRATEGIEN } from '@/data/guides/kommunikativeStrategien';
import { Icon } from '@/components/icons';

// Guide dédié « Schwieriger Patient » — 6 situations illustrées + mini-drill
// (situation tirée → formuler mentalement → révéler la parade).
export function KommunikationGuide() {
  const [drill, setDrill] = useState(false);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const s = KOMMUNIKATIVE_STRATEGIEN[idx];
  const next = () => { setIdx((i) => (i + 1) % KOMMUNIKATIVE_STRATEGIEN.length); setRevealed(false); };

  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 bg-rose-50/50 px-4 py-3 dark:border-slate-800 dark:bg-rose-900/10">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300">
            <Icon name="shield" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold">Kommunikative Strategien — Schwieriger Patient</h2>
            <p className="text-xs text-slate-400">6 situations d'examen + parades. Entraîne tes réflexes.</p>
          </div>
        </div>
        <button onClick={() => { setDrill((d) => !d); setRevealed(false); }} className={`btn text-xs ${drill ? 'bg-brand-600 text-white' : 'btn-outline'}`}>
          {drill ? '✕ Quitter le drill' : '🎯 Mode drill'}
        </button>
      </div>

      {drill ? (
        <div className="p-6 text-center">
          <div className="mx-auto max-w-md">
            <div className="mb-3 flex items-center justify-center gap-2">
              <Icon name={s.icon} className="h-5 w-5 text-rose-500" />
              <span className="font-semibold">{s.title}</span>
            </div>
            <p className="rounded-xl bg-rose-50 px-4 py-3 text-rose-700 dark:bg-rose-900/20 dark:text-rose-200">« {s.cue} »</p>
            <p className="mt-3 text-sm text-slate-400">Formule ta réponse à voix haute, puis vérifie.</p>
            {revealed ? (
              <ul className="mt-3 space-y-1.5 text-left text-sm">
                {s.parades.map((p, i) => <li key={i} className="flex gap-1.5"><span className="text-emerald-500">✓</span>{p}</li>)}
              </ul>
            ) : (
              <button onClick={() => setRevealed(true)} className="btn-primary mt-4">Révéler les parades</button>
            )}
            <div className="mt-5">
              <button onClick={next} className="btn-outline text-xs">Situation suivante →</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {KOMMUNIKATIVE_STRATEGIEN.map((sit) => (
            <div key={sit.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Icon name={sit.icon} className="h-4 w-4 text-rose-500" />
                <span className="text-sm font-semibold">{sit.title}</span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{sit.situation}</p>
              <p className="mt-1.5 rounded bg-rose-50 px-2 py-1 text-[13px] italic text-rose-700 dark:bg-rose-900/20 dark:text-rose-200">« {sit.cue} »</p>
              <ul className="mt-1.5 space-y-1 text-[13px]">
                {sit.parades.map((p, i) => <li key={i} className="flex gap-1.5"><span className="text-emerald-500">✓</span>{p}</li>)}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
