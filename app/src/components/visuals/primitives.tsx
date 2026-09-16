import { Icon } from '@/components/icons';

// ============================================================================
// Primitives visuelles partagées par les 7 composants Fachwissen (T3–T5).
// Aucune donnée clinique ici : uniquement du style et des micro-composants.
// Voir docs/contracts/fachwissen-visuals.md §6 (table Tone).
// ============================================================================

/** Teintes fermées — voir spec §7 et contrat §6. Pas de cinquième tone. */
export type Tone = 'neutral' | 'accent' | 'signal' | 'warn';

interface ToneClasses {
  /** Fond + bordure. */
  box: string;
  /** Couleur de texte. */
  text: string;
  /** Petit marqueur ponctuel (point). */
  dot: string;
}

const TONE: Record<Tone, ToneClasses> = {
  neutral: {
    box: 'border-slate-200 dark:border-slate-800',
    text: 'text-slate-600 dark:text-slate-300',
    dot: 'bg-slate-400 dark:bg-slate-500',
  },
  accent: {
    box: 'bg-brand-50 border-brand-200 dark:bg-brand-900/25 dark:border-brand-800',
    text: 'text-brand-700 dark:text-brand-300',
    dot: 'bg-brand-500',
  },
  signal: {
    box: 'bg-signal-50 border-signal-200 dark:bg-signal-900/25 dark:border-signal-800',
    text: 'text-signal-600 dark:text-signal-300',
    dot: 'bg-signal-500',
  },
  warn: {
    box: 'bg-amber-50 border-amber-200 dark:bg-amber-900/25 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
};

/** Classes Tailwind associées à un tone (voir contrat §6). */
export function toneClasses(tone: Tone = 'neutral'): ToneClasses {
  return TONE[tone];
}

/**
 * Fond « papier millimétré » : motif SVG 8 px, décoratif seul, jamais
 * porteur d'information → `aria-hidden` + `pointer-events-none`.
 */
export function Grid({ className = '' }: { className?: string }) {
  const patternId = 'visuals-grid-8';
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full opacity-[0.08] dark:opacity-[0.05] ${className}`}
    >
      <defs>
        <pattern id={patternId} width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M 8 0 L 0 0 0 8" fill="none" stroke="currentColor" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

/** Valeur/score/stade en mono aligné-tabulaire (signature « readout »). */
export function Readout({
  value,
  unit,
  tone = 'neutral',
  className = '',
}: {
  value: string | number;
  unit?: string;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span className={`font-mono tnum text-sm font-semibold ${toneClasses(tone).text} ${className}`}>
      {value}
      {unit ? <span className="ml-1 font-normal opacity-80">{unit}</span> : null}
    </span>
  );
}

const TONE_SR_LABEL: Partial<Record<Tone, string>> = {
  signal: 'Notfall',
  warn: 'Vorsicht',
};

/**
 * Marqueur textuel/icône associé à un tone — la couleur seule ne porte
 * jamais le sens (contrat §6).
 */
export function ToneMark({ tone = 'neutral', className = '' }: { tone?: Tone; className?: string }) {
  const srLabel = TONE_SR_LABEL[tone];
  if (srLabel) {
    return (
      <span className={`inline-flex items-center gap-1 ${toneClasses(tone).text} ${className}`}>
        <Icon name="alert" className="h-3.5 w-3.5" />
        <span className="sr-only">{srLabel}</span>
      </span>
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${toneClasses(tone).dot} ${className}`}
    />
  );
}

/** Rectangle aligné-grille : nœud commun aux composants d'arbre/mindmap. */
export function NodeBox({
  variant = 'default',
  tone = 'neutral',
  className = '',
  children,
}: {
  variant?: 'default' | 'question' | 'signal';
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  const borderAccent =
    variant === 'question'
      ? 'border-l-[3px] border-l-brand-500'
      : variant === 'signal'
        ? 'border-l-[3px] border-l-signal-500'
        : '';
  return (
    <div
      className={`rounded-lg border p-2 ${toneClasses(tone).box} ${borderAccent} ${className}`}
    >
      {children}
    </div>
  );
}
