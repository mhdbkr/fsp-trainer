import { useMemo, useState } from 'react';
import { getPreferredVariant, setPreferredVariant } from '@/lib/variantPrefs';
import type { ReactNode } from 'react';
import type { Phrase } from '@/data/guides/phrases';
import { phraseAlts, phraseText } from '@/data/guides/phrases';
import { groupFollowUps, type FollowUpGroup } from '@/data/guides/followUp';
import { GuidedText } from '@/components/GuidedText';
import { PROBE_BY_ID } from '@/data/guides/anamneseProbes';
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

/** Sélection de variante d'une phrase : -1 = formulation standard. Le choix
 *  est MÉMORISÉ (FB2-O3) : la variante choisie une fois devient la formulation
 *  affichée par défaut dans toutes les simulations suivantes. */
export function useVariant(phrase: Phrase) {
  const alts = phraseAlts(phrase);
  const standard = phraseText(phrase);
  const [idx, setIdxState] = useState(() => getPreferredVariant(standard, alts.length));
  const setIdx = (next: number | ((i: number) => number)) => {
    setIdxState((i) => { const v = typeof next === 'function' ? next(i) : next; setPreferredVariant(standard, v); return v; });
  };
  const text = idx >= 0 && idx < alts.length ? alts[idx] : standard;
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
  const xl = size === 'xl';
  const pick = (i: number) => { onSelect(i); setOpen(false); };
  // Au repos : un simple lien texte gris, sans bordure ni fond — la phrase
  // reste la vedette (FB2-O1). Le contrôle ne se remarque qu'au survol.
  const quiet = focus ? 'text-slate-500 hover:text-brand-300' : 'text-slate-400 hover:text-brand-600 dark:hover:text-brand-300';
  return (
    <div className={xl ? 'mx-auto mt-4 max-w-xl text-left' : 'mt-0.5'}>
      <div className={`flex items-center gap-3 ${xl ? 'text-[13px]' : 'text-[11px]'}`}>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
          title="Formulations équivalentes — choisis celle qui te vient naturellement ; elle sera retenue"
          className={`inline-flex items-center gap-1 font-medium transition-colors ${quiet}`}>
          <Icon name="branch" className={`${xl ? 'h-3.5 w-3.5' : 'h-3 w-3'} opacity-70`} />
          {idx >= 0 ? (alts.length === 1 ? 'Formulation choisie' : `Formulation ${idx + 1} de ${alts.length}`) : `${alts.length} autre${alts.length > 1 ? 's' : ''} formulation${alts.length > 1 ? 's' : ''}`}
        </button>
        {/* Revenir à la standard : l'option n'est pas répétée dans la liste (elle
            est déjà affichée au-dessus, FB2-O2) — un simple retour suffit. */}
        {idx >= 0 && (
          <button type="button" onClick={() => pick(-1)} title="Revenir à la formulation standard"
            className={`inline-flex items-center gap-1 font-medium transition-colors ${quiet}`}>
            <Icon name="refresh" className={xl ? 'h-3.5 w-3.5' : 'h-3 w-3'} />standard
          </button>
        )}
      </div>
      {open && (
        <ul role="listbox" aria-label="Formulations"
          className={`reveal mt-1.5 space-y-0.5 border-l pl-3 ${focus ? 'border-slate-700' : 'border-slate-200 dark:border-ink-600'}`}>
          {alts.map((a, i) => <Option key={i} label={a} selected={idx === i} onClick={() => pick(i)} theme={theme} size={size} index={i + 1} />)}
        </ul>
      )}
    </div>
  );
}

function Option({ label, selected, onClick, theme, size, index }: {
  label: string; selected: boolean; onClick: () => void; theme: ControlTheme; size: ControlSize; index: number;
}) {
  const focus = theme === 'focus';
  return (
    <li role="option" aria-selected={selected}>
      <button type="button" onClick={onClick}
        className={`flex w-full items-start gap-2.5 rounded-md text-left transition-colors ${size === 'xl' ? 'px-2 py-1.5 text-[15px]' : 'px-1.5 py-1 text-[13px]'} ${
          selected
            ? focus ? 'text-brand-200' : 'text-brand-800 dark:text-brand-200'
            : focus ? 'text-slate-300 hover:bg-slate-800/60' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-ink-700/60'}`}>
        <span className={`mt-0.5 w-4 shrink-0 font-mono text-[10px] tabular-nums ${selected ? 'text-brand-500' : focus ? 'text-slate-600' : 'text-slate-400'}`}>
          {selected ? <Icon name="check" className="h-3.5 w-3.5" /> : index}
        </span>
        <span>{label}</span>
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
  let branchQuestions: string[] | null = null;
  if (c.kind === 'zweig') {
    const chosen = typeof answer === 'string' ? answer.toLowerCase() : null;
    branchQuestions = chosen ? c.branches[chosen] ?? [] : null;
    open = !!branchQuestions && branchQuestions.length > 0;
    control = <Seg options={c.options.map(cap)} value={answer as string | null} onChange={setAnswer} theme={theme} size={size} display={(o) => o} />;
  } else if (c.kind === 'ja') {
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

  // Le libellé « Antwort des Patienten » devient une icône (FB2-O4) : un
  // glyphe fin, avec le texte en info-bulle et pour les lecteurs d'écran.
  // L'échelle garde une mention courte parce qu'elle porte une règle (seuil).
  const hint = c.kind === 'skala' ? `Schmerzskala · ab ${c.threshold} Rückfrage` : c.kind === 'wahl' && c.match === 'anfallsartig' ? 'Charakter' : 'Antwort des Patienten';
  const iconOnly = c.kind !== 'skala';

  return (
    <div className={`${xl ? 'rounded-2xl border p-4' : 'rounded-lg border p-2'} ${focus ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200/80 bg-slate-50/60 dark:border-ink-600 dark:bg-ink-700/40'}`}>
      <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 ${xl ? '' : ''}`}>
        {iconOnly ? (
          <span title={hint} className={`inline-flex items-center ${focus ? 'text-slate-500' : 'text-slate-400'}`}>
            <Icon name="speech" className={xl ? 'h-4 w-4' : 'h-3.5 w-3.5'} /><span className="sr-only">{hint}</span>
          </span>
        ) : (
          <span className={`label ${focus ? 'text-slate-500' : ''}`}>{hint}</span>
        )}
        {control}
      </div>
      {open && <Reveal questions={branchQuestions ?? g.questions} keywords={keywords} theme={theme} size={size} />}
      {!open && answer !== null && (
        <p className={`reveal mt-1.5 text-[11.5px] italic ${focus ? 'text-slate-500' : 'text-slate-400'}`}>Keine Rückfrage nötig — weiter.</p>
      )}
    </div>
  );
}

function Reveal({ questions, keywords, theme, size, always }: { questions: string[]; keywords: string[]; theme: ControlTheme; size: ControlSize; always?: boolean }) {
  const focus = theme === 'focus';
  return (
    // La relance suit la question comme une suite naturelle : un filet pétrole
    // fin et une indentation, sans flèche ni ambre (FB2-O5) — l'œil comprend
    // « ceci découle de la réponse » sans qu'on le lui crie.
    <ul className={`${always ? '' : 'reveal mt-2'} space-y-1 border-l pl-3 ${focus ? 'border-brand-500/40' : 'border-brand-300/70 dark:border-brand-700/60'}`}>
      {questions.map((q, i) => (
        <li key={i} className={`${size === 'xl' ? 'text-[15px] leading-relaxed' : 'text-[13px]'} ${focus ? 'text-slate-200' : 'text-slate-700 dark:text-slate-200'}`}>
          <GuidedText text={q} keywords={keywords} />
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

// ── Question progressive ─────────────────────────────────────────────────────
// Une question liée à PLUSIEURS sondes s'égrène : chaque sonde est une étape,
// avec sa question canonique. Le médecin révèle l'étape suivante quand il l'a
// posée ; à chaque étape `onStep` remonte la sonde courante (suivi live), donc
// le simulant voit la réplique de CETTE étape et sait où s'arrêter.

export function ProgressiveSteps({ probes, onStep, theme = 'light', size = 'md' }: {
  probes: string[]; onStep?: (probeId: string) => void; theme?: ControlTheme; size?: ControlSize;
}) {
  const [shown, setShown] = useState(1);
  const focus = theme === 'focus';
  const xl = size === 'xl';
  if (probes.length < 2) return null;
  const reveal = (n: number) => { setShown(n); onStep?.(probes[n - 1]); };
  return (
    <div className={`${xl ? 'mx-auto mt-5 max-w-xl text-left' : 'mt-1.5'}`}>
      <ol className="space-y-1">
        {probes.slice(0, shown).map((id, i) => (
          <li key={id} className={`reveal flex items-start gap-2 rounded-lg px-2 py-1 ${i === shown - 1 ? (focus ? 'bg-brand-900/30' : 'bg-brand-50/70 dark:bg-brand-900/20') : ''}`}>
            <span className={`mt-0.5 font-mono text-[10px] tabular-nums ${i === shown - 1 ? 'text-brand-500' : focus ? 'text-slate-600' : 'text-slate-400'}`}>{String(i + 1).padStart(2, '0')}</span>
            <span className={`${xl ? 'text-[15px]' : 'text-[13px]'} ${i === shown - 1 ? (focus ? 'text-slate-100' : 'text-slate-800 dark:text-slate-100') : focus ? 'text-slate-500' : 'text-slate-500 dark:text-slate-400'}`}>{PROBE_BY_ID[id]?.frage ?? id}</span>
          </li>
        ))}
      </ol>
      {shown < probes.length ? (
        <button type="button" onClick={() => reveal(shown + 1)}
          className={`mt-1.5 inline-flex items-center gap-1 rounded-full border font-semibold transition-colors ${xl ? 'px-3.5 py-1.5 text-[12.5px]' : 'px-2.5 py-1 text-[11px]'} ${focus ? 'border-slate-700 bg-slate-800/70 text-brand-300 hover:bg-slate-700' : 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 dark:border-brand-900/40 dark:bg-brand-900/20 dark:text-brand-300'}`}>
          Nächster Teil <span className="font-mono text-[10px] opacity-70">{shown}/{probes.length}</span> <Icon name="chevron" className="h-3 w-3" />
        </button>
      ) : (
        <p className={`mt-1.5 text-[11px] italic ${focus ? 'text-slate-500' : 'text-slate-400'}`}>Alle Teile gestellt.</p>
      )}
    </div>
  );
}
