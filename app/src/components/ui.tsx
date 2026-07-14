import React from 'react';
import type { Center, CaseStatus, Axis } from '@/db/types';
import { scoreBand } from '@/lib/scoring';
import { Icon } from './icons';

// ---------------------------------------------------------------- Badges & chips
const CENTER_COLORS: Record<Center, string> = {
  Freiburg: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  Karlsruhe: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  Reutlingen: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  Stuttgart: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  Complément: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export function CenterBadge({ center }: { center: Center }) {
  return <span className={`chip ${CENTER_COLORS[center]}`}>{center}</span>;
}

const STATUS_COLORS: Record<CaseStatus, string> = {
  'À faire': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  'En cours': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'Maîtrisé': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};
export function StatusBadge({ status }: { status: CaseStatus }) {
  return <span className={`chip ${STATUS_COLORS[status]}`}>{status}</span>;
}

export function FreqBadge({ n }: { n: number }) {
  return (
    <span className="chip bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300" title={`${n} apparitions dans les protocoles`}>
      ×{n}
    </span>
  );
}

export function DifficultyDots({ level }: { level: 1 | 2 | 3 }) {
  return (
    <span className="inline-flex gap-0.5" title={`Difficulté ${level}/3`}>
      {[1, 2, 3].map((i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${i <= level ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------- Score bar
const BAND_BG: Record<'green' | 'orange' | 'red', string> = {
  green: 'bg-emerald-500', orange: 'bg-amber-500', red: 'bg-rose-500',
};
const BAND_TEXT: Record<'green' | 'orange' | 'red', string> = {
  green: 'text-emerald-600 dark:text-emerald-400', orange: 'text-amber-600 dark:text-amber-400', red: 'text-rose-600 dark:text-rose-400',
};

export function ScoreBar({ pct, label, showValue = true }: { pct: number; label?: string; showValue?: boolean }) {
  const band = scoreBand(pct);
  return (
    <div className="w-full">
      {label && (
        <div className="mb-1 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">{label}</span>
          {showValue && <span className={`font-semibold ${BAND_TEXT[band]}`}>{pct}%</span>}
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div className={`h-full rounded-full transition-all ${BAND_BG[band]}`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
    </div>
  );
}

export function ConfidenceRing({ pct, size = 44 }: { pct: number; size?: number }) {
  const band = scoreBand(pct);
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ringColor = band === 'green' ? '#10b981' : band === 'orange' ? '#f59e0b' : '#f43f5e';
  return (
    <svg width={size} height={size} className="shrink-0" role="img" aria-label={`Confiance ${pct}%`}>
      <title>{`Confiance ${pct}%`}</title>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ringColor} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="fill-slate-600 dark:fill-slate-300 text-[10px] font-semibold">
        {pct}%
      </text>
    </svg>
  );
}

// ---------------------------------------------------------------- Section / toggle
export function Toggle({ title, children, defaultOpen = false, note }: { title: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; note?: string }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <span className="font-medium">{title}</span>
        <Icon name="chevron" className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-800">
          {children}
          {note && <p className="callout callout-warn mt-3 text-sm"><Icon name="alert" className="mt-0.5 h-4 w-4 shrink-0" />{note}</p>}
        </div>
      )}
    </div>
  );
}

export function AxisBadge({ axis }: { axis: Axis }) {
  return <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{axis}</span>;
}

export function EmptyState({ icon = 'inbox', title, hint }: { icon?: string; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 py-12 text-center dark:border-slate-700">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"><Icon name={icon} className="h-7 w-7" /></div>
      <p className="mt-3 font-medium text-slate-600 dark:text-slate-300">{title}</p>
      {hint && <p className="mt-1 text-sm text-slate-400">{hint}</p>}
    </div>
  );
}
