import { Link } from 'react-router-dom';
import { Icon } from '@/components/icons';
import { TEILE } from '@/lib/simScope';
import type { SimTeil } from '@/db/types';

// ============================================================================
// Choix du mode de simulation (FB2-P, retour direction) : la complète
// AU-DESSUS, d'un bloc ; les trois Teile EN DESSOUS, nés d'une division — ils
// partent du centre et s'écartent à leur place. Même composant sur le verso
// de la carte (liens) et en pré-simulation (sélection). Le dessin dit ce que
// fait l'action : un bloc entier, ou une part de l'examen.
// ============================================================================

type Props = {
  /** Cibles : liens (verso de carte) ou sélection (pré-simulation). */
  hrefFor?: (teil: SimTeil | null) => string;
  value?: SimTeil | null;
  onChange?: (teil: SimTeil | null) => void;
  /** 'glass' sur le verso (fond sombre translucide), 'card' en pré-simulation. */
  tone?: 'glass' | 'card';
  compact?: boolean;
};

const SPLIT = ['animate-split-l', 'animate-split-c', 'animate-split-r'];

export function ModeChooser({ hrefFor, value = null, onChange, tone = 'card', compact = false }: Props) {
  const glass = tone === 'glass';
  const full = value === null;
  const base = `flex items-center justify-center gap-2 rounded-xl font-semibold transition-[transform,background-color,color,box-shadow] duration-200 ease-fluid active:scale-[0.98] ${compact ? 'text-[12.5px]' : 'text-sm'}`;
  const fullCls = `${base} w-full ${compact ? 'py-2' : 'py-2.5'} ${full && !hrefFor
    ? 'bg-brand-600 text-white shadow-md shadow-brand-950/20'
    : glass ? 'bg-white/85 text-brand-800 hover:bg-white' : 'bg-white text-brand-800 ring-1 ring-slate-200 hover:ring-brand-400 dark:bg-ink-700 dark:text-brand-200 dark:ring-ink-600'}`;
  const teilCls = (k: SimTeil) => `${base} ${compact ? 'flex-row gap-1.5 py-1.5 text-[11.5px]' : 'flex-col gap-1.5 py-3'} ${value === k && !hrefFor
    ? 'bg-brand-600 text-white shadow-md shadow-brand-950/20'
    : glass ? 'bg-white/70 text-slate-700 hover:bg-white/90' : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-brand-400 dark:bg-ink-700 dark:text-slate-200 dark:ring-ink-600'}`;
  const Full = hrefFor
    ? <Link to={hrefFor(null)} className={fullCls}><Icon name="play" className="h-4 w-4" />Simulation complète</Link>
    : <button type="button" role="radio" aria-checked={full} onClick={() => onChange?.(null)} className={fullCls}><Icon name="play" className="h-4 w-4" />Simulation complète</button>;
  return (
    <div role={hrefFor ? undefined : 'radiogroup'} aria-label="Mode de simulation" className="space-y-2">
      {Full}
      {/* Le trait de division : la barre pleine se scinde en trois parts. */}
      <div className="relative">
        <div aria-hidden className={`absolute inset-x-6 -top-1 h-px ${glass ? 'bg-white/50' : 'bg-slate-200 dark:bg-ink-600'}`} />
        <div className={`grid grid-cols-3 ${compact ? 'gap-1.5' : 'gap-2'} pt-1 motion-reduce:[&>*]:animate-none`}>
          {TEILE.map((t, i) => (hrefFor
            ? <Link key={t.key} to={hrefFor(t.key)} className={`${teilCls(t.key)} ${SPLIT[i]}`} style={{ animationDelay: `${120 + i * 40}ms` }}>
                <Icon name={t.icon} className={compact ? 'h-4 w-4' : 'h-5 w-5'} /><span>{compact ? t.short : t.label}</span>
              </Link>
            : <button key={t.key} type="button" role="radio" aria-checked={value === t.key} onClick={() => onChange?.(t.key)} className={`${teilCls(t.key)} ${SPLIT[i]}`} style={{ animationDelay: `${120 + i * 40}ms` }}>
                <Icon name={t.icon} className={compact ? 'h-4 w-4' : 'h-5 w-5'} /><span>{compact ? t.short : t.label}</span>
              </button>
          ))}
        </div>
      </div>
    </div>
  );
}
