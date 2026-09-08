import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Phrase } from '@/data/guides/phrases';
import { phraseAlts, phraseText } from '@/data/guides/phrases';
import { groupFollowUps, type FollowUpGroup } from '@/data/guides/followUp';
import { GuidedText } from '@/components/GuidedText';
import { Icon } from '@/components/icons';

// ============================================================================
// Contrôles interactifs d'une Phrase — partagés par le mode normal (PhraseLine)
// et le mode focus (ImmersiveMode). Même logique, deux mises en scène :
// `theme` (light | focus) et `size` (md | xl).
//  • useVariant / VariantPicker : choisir une formulation équivalente ; la
//    formulation choisie REMPLACE la standard (le parent la rend avec une
//    `key` qui change → animation `reveal`), au lieu d'une liste en dessous.
//  • FollowUpControls : les relances conditionnelles deviennent des toggles
//    (Ja/Nein, choix, échelle 0-10) ; la relance n'apparaît que si la réponse
//    du patient la déclenche — on JOUE la scène au lieu de la lire.
// ============================================================================

export type ControlTheme = 'light' | 'focus';
export type ControlSize = 'md' | 'xl';

/** Sélection de variante d'une phrase : -1 = formulation standard. */
export function useVariant(phrase: Phrase) {
  const [idx, setIdx] = useState(-1);
  const alts = phraseAlts(phrase);
  const text = idx >= 0 && idx < alts.length ? alts[idx] : phraseText(phrase);
  // Cycle sur [standard, v1 … vn] : utile au clavier (↑/↓ en focus).
  const cycle = (dir: 1 | -1) => setIdx((i) => { const n = alts.length + 1; return ((((i + 1 + dir) % n) + n) % n) - 1; });
  return { text, idx, setIdx, alts, cycle };
}

export function VariantPicker({ alts, idx, onSelect, theme = 'light', size = 'md' }: {
  alts: string[]; idx: number; onSelect: (i: number) => void; theme?: ControlTheme; size?: ControlSize;
}) {
  const [open, setOpen] = useState(false);
  if (!alts.length) return null;
  const focus = theme === 'focus';
  const pick = (i: number) => { onSelect(i); setOpen(false); };
  return (
    <div className={size === 'xl' ? 'mx-auto mt-5 max-w-xl text-left' : 'mt-1'}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        title="Formulations équivalentes — choisis celle qui te vient naturellement"
        className={`inline-flex items-center gap-1.5 rounded-full border font-semibold transition-colors ${size === 'xl' ? 'px-3.5 py-1.5 text-[12.5px]' : 'px-2.5 py-1 text-[11px]'} ${
          focus ? 'border-slate-700 bg-slate-800/70 text-brand-300 hover:bg-slate-700'
                : 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:border-brand-900/40 dark:bg-brand-900/20 dark:text-brand-300 dark:hover:bg-brand-900/40'}`}>
        <span aria-hidden>⇄</span>
        {idx >= 0 ? `Variante ${idx + 1} / ${alts.length}` : `${alts.length} variante${alts.length > 1 ? 's' : ''}`}
        <Icon name="chevron" className={`h-3 w-3 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <ul role="listbox" aria-label="Formulations"
          className={`reveal mt-1.5 overflow-hidden rounded-xl border ${focus ? 'border-slate-700 bg-slate-900/80' : 'border-slate-200 bg-white dark:border-ink-600 dark:bg-ink-800'}`}>
          <Option label="Standard" muted selected={idx === -1} onClick={() => pick(-1)} theme={theme} size={size} />
          {alts.map((a, i) => <Option key={i} label={a} selected={idx === i} onClick={() => pick(i)} theme={theme} size={size} index={i + 1} />)}
        </ul>
      )}
    </div>
  );
}

function Option({ label, selected, onClick, theme, size, muted, index }: {
  label: string; selected: boolean; onClick: () => void; theme: ControlTheme; size: ControlSize; muted?: boolean; index?: number;
}) {
  const focus = theme === 'focus';
  return (
    <li role="option" aria-selected={selected}>
      <button type="button" onClick={onClick}
        className={`flex w-full items-start gap-2.5 text-left transition-colors ${size === 'xl' ? 'px-4 py-2.5 text-[15px]' : 'px-3 py-2 text-[13px]'} ${
          selected
            ? focus ? 'bg-brand-900/40 text-brand-100' : 'bg-brand-50 text-brand-900 dark:bg-brand-900/30 dark:text-brand-100'
            : focus ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-ink-700'}`}>
        <span className={`mt-0.5 w-4 shrink-0 font-mono text-[10px] ${selected ? 'text-brand-500' : focus ? 'text-slate-600' : 'text-slate-400'}`}>
          {selected ? <Icon name="check" className="h-3.5 w-3.5" /> : index ?? '·'}
        </span>
        <span className={muted ? 'italic opacity-80' : ''}>{label}</span>
      </button>
    </li>
  );
}

// ── Relances conditionnelles ─────────────────────────────────────────────────

export function FollowUpControls({ raws, keywords = [], theme = 'light', size = 'md' }: {
  raws: string[]; keywords?: string[]; theme?: ControlTheme; size?: ControlSize;
}) {
  const groups = useMemo(() => groupFollowUps(raws), [raws]);
  if (!groups.length) return null;
  return (
    <div className={`${size === 'xl' ? 'mx-auto mt-5 max-w-xl space-y-3 text-left' : 'mt-1.5 space-y-1.5'}`}>
      {groups.map((g, i) => <FollowUpGroupView key={i} g={g} keywords={keywords} theme={theme} size={size} />)}
    </div>
  );
}

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function FollowUpGroupView({ g, keywords, theme, size }: { g: FollowUpGroup; keywords: string[]; theme: ControlTheme; size: ControlSize }) {
  const [answer, setAnswer] = useState<string | number | null>(null);
  const c = g.control;
  const focus = theme === 'focus';
  const xl = size === 'xl';

  // Notes inconditionnelles : toujours visibles, accent ambre (« à demander »).
  if (c.kind === 'immer') {
    return <Reveal questions={g.questions} keywords={keywords} theme={theme} size={size} always />;
  }

  let open = false;
  let control: ReactNode;
  if (c.kind === 'ja') {
    const yes = cap(c.label);
    open = answer === yes;
    control = <Seg options={[yes, 'Nein']} value={answer as string | null} onChange={setAnswer} theme={theme} size={size} />;
  } else if (c.kind === 'wahl') {
    open = answer === c.match;
    control = <Seg options={[cap(c.options[0]), cap(c.options[1])]} value={answer as string | null}
      onChange={(v) => setAnswer(v ? v.toLowerCase() : null)} theme={theme} size={size} display={(o) => o} />;
  } else {
    open = typeof answer === 'number' && answer >= c.threshold;
    control = <Scale value={answer as number | null} onChange={setAnswer} threshold={c.threshold} theme={theme} size={size} />;
  }

  const hint = c.kind === 'skala' ? `Schmerzskala · ab ${c.threshold} → Rückfrage` : c.kind === 'ja' ? 'Antwort des Patienten' : 'Charakter';

  return (
    <div className={`${xl ? 'rounded-2xl border p-4' : 'rounded-lg border p-2'} ${focus ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200/80 bg-slate-50/60 dark:border-ink-600 dark:bg-ink-700/40'}`}>
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 ${xl ? '' : ''}`}>
        <span className={`label ${focus ? 'text-slate-500' : ''}`}>{hint}</span>
        {control}
      </div>
      {open && <Reveal questions={g.questions} keywords={keywords} theme={theme} size={size} />}
      {!open && answer !== null && (
        <p className={`reveal mt-1.5 text-[11.5px] italic ${focus ? 'text-slate-500' : 'text-slate-400'}`}>Keine Rückfrage nötig — weiter.</p>
      )}
    </div>
  );
}

function Reveal({ questions, keywords, theme, size, always }: { questions: string[]; keywords: string[]; theme: ControlTheme; size: ControlSize; always?: boolean }) {
  const focus = theme === 'focus';
  return (
    <ul className={`${always ? '' : 'reveal mt-2'} space-y-1 border-l-2 pl-3 ${focus ? 'border-amber-500/50' : 'border-amber-300 dark:border-amber-700/60'}`}>
      {questions.map((q, i) => (
        <li key={i} className={`flex gap-1.5 ${size === 'xl' ? 'text-[15px] leading-relaxed' : 'text-[13px]'} ${focus ? 'text-amber-100/90' : 'text-slate-700 dark:text-slate-200'}`}>
          <span className={`shrink-0 ${focus ? 'text-amber-400' : 'text-amber-500'}`} aria-hidden>↳</span>
          <span><GuidedText text={q} keywords={keywords} /></span>
        </li>
      ))}
    </ul>
  );
}

function Seg({ options, value, onChange, theme, size, display }: {
  options: string[]; value: string | null; onChange: (v: string | null) => void; theme: ControlTheme; size: ControlSize; display?: (o: string) => string;
}) {
  return (
    <div role="group" className={`seg ${theme === 'focus' ? 'seg-focus' : ''} ${size === 'xl' ? 'seg-xl' : ''}`}>
      {options.map((o) => (
        <button key={o} type="button" aria-pressed={value === o} onClick={() => onChange(value === o ? null : o)}>
          {display ? display(o) : o}
        </button>
      ))}
    </div>
  );
}

function Scale({ value, onChange, threshold, theme, size }: {
  value: number | null; onChange: (v: number | null) => void; threshold: number; theme: ControlTheme; size: ControlSize;
}) {
  return (
    <div role="group" aria-label="Schmerzskala 0 bis 10" className={`seg seg-scale ${theme === 'focus' ? 'seg-focus' : ''} ${size === 'xl' ? 'seg-xl' : ''}`}>
      {Array.from({ length: 11 }, (_, n) => (
        <button key={n} type="button" aria-pressed={value === n} data-hot={n >= threshold} onClick={() => onChange(value === n ? null : n)}>{n}</button>
      ))}
    </div>
  );
}
