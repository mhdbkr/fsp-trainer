import { useRef, useState } from 'react';
import { LETTERS } from './letters';

// Curseur alphabétique vertical (instrument : clic = saut instantané). Le zoom
// « dock » n'est que du transform, 120 ms, et disparaît sous reduced-motion.
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function AlphabetRail({ available, onJump }: { available: Set<string>; onJump: (letter: string) => void }) {
  const [hot, setHot] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const scaleFor = (i: number) => {
    if (hot === null || reduced()) return '';
    const d = Math.abs(i - hot);
    return d === 0 ? 'scale(1.6)' : d === 1 ? 'scale(1.25)' : '';
  };
  const letterAt = (clientY: number): number | null => {
    const el = ref.current; if (!el) return null;
    const r = el.getBoundingClientRect(); const i = Math.floor(((clientY - r.top) / r.height) * LETTERS.length);
    return i >= 0 && i < LETTERS.length ? i : null;
  };
  const onTouch = (e: React.TouchEvent) => {
    const i = letterAt(e.touches[0].clientY); setHot(i);
    if (i !== null && available.has(LETTERS[i])) onJump(LETTERS[i]);
  };

  return (
    <div ref={ref} role="group" aria-label="Aller à la lettre"
      className="sticky top-20 flex h-[min(70vh,520px)] w-11 select-none flex-col items-center justify-between py-1 text-[11px] font-semibold text-slate-400"
      onMouseLeave={() => setHot(null)} onTouchStart={onTouch} onTouchMove={onTouch} onTouchEnd={() => setHot(null)}>
      {LETTERS.map((l, i) => {
        const on = available.has(l);
        return (
          <button key={l} type="button" aria-label={l} aria-disabled={!on}
            onMouseMove={() => setHot(i)} onClick={() => on && onJump(l)}
            style={{ transform: scaleFor(i), transition: reduced() ? undefined : 'transform 120ms ease-out' }}
            className={`grid h-4 w-8 place-items-center rounded leading-none ${on ? (hot === i ? 'text-brand-600 dark:text-brand-300' : 'text-slate-500 dark:text-slate-400') : 'text-slate-300 dark:text-slate-700'}`}>
            {l}
          </button>
        );
      })}
      {hot !== null && (
        <div aria-hidden className="pointer-events-none absolute right-12 grid h-10 w-10 place-items-center rounded-xl bg-ink text-base font-bold text-white shadow-lg dark:bg-ink-600" style={{ top: `${(hot / LETTERS.length) * 100}%` }}>{LETTERS[hot]}</div>
      )}
    </div>
  );
}
