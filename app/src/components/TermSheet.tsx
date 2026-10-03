// ============================================================================
// Fiche d'un terme (F4a D2) — UN composant pour le tiroir latéral, la carte au
// survol (compacte) et le dos de la carte au drill. Ordre : Bedeutung →
// Définition complète (repliée) → Dans l'entretien. Carte personnelle : la
// Bedeutung se corrige (D8), le mot jamais ; sans Bedeutung → « à compléter ».
// ============================================================================
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { isPersonalView, type AnyTerm } from '@/lib/collections/allTerms';
import { updatePersonalExplanation, PT_LIMITS } from '@/lib/collections/personalTerms';
import { highlightParts } from '@/lib/sentence';
import { TermUsage } from './TermUsage';
import { Icon } from './icons';

/** Prononciation entre barres, une seule fois : une partie des données porte déjà ses « / ». */
export const ipa = (p: string): string => `/${p.trim().replace(/^\/+|\/+$/g, '')}/`;

export function ContextSentence({ sentence, word, className = 'text-sm' }: { sentence: string; word: string; className?: string }) {
  const parts = highlightParts(sentence, word);
  return (
    <p className={`${className} text-slate-600 dark:text-slate-300`}>
      {parts ? <>{parts[0]}<mark className="rounded bg-brand-100 px-0.5 text-brand-900 dark:bg-brand-900/50 dark:text-brand-100">{parts[1]}</mark>{parts[2]}</> : sentence}
    </p>
  );
}

function BedeutungEditor({ id, initial, onDone }: { id: string; initial: string; onDone: () => void }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    try { await updatePersonalExplanation(id, value); onDone(); }
    catch (e) { setError(e instanceof Error && e.message === 'explanation_empty' ? 'Écris la signification.' : 'La modification a échoué.'); }
  };
  return (
    <div className="space-y-1.5">
      <input aria-label="Bedeutung" value={value} maxLength={PT_LIMITS.explanation} autoFocus onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') void save(); if (e.key === 'Escape') { e.stopPropagation(); onDone(); } }} className="field-line font-display text-xl font-semibold leading-snug tracking-tightish" />
      <div className="flex gap-2">
        <button type="button" onClick={() => { void save(); }} disabled={!value.trim()} className="btn-primary min-h-11 text-sm">Enregistrer</button>
        <button type="button" onClick={onDone} className="btn-outline min-h-11 text-sm">Annuler</button>
      </div>
      {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
}

export function TermSheet({ term, compact = false, actions }: { term: AnyTerm; compact?: boolean; actions?: ReactNode }) {
  const [editing, setEditing] = useState(false);
  const editBtn = useRef<HTMLButtonElement>(null);
  const refocus = useRef(false);
  useEffect(() => { if (!editing && refocus.current) { refocus.current = false; editBtn.current?.focus(); } }, [editing]);   // le clavier retrouve « Modifier »
  const personal = isPersonalView(term);
  const bedeutung = term.translationSimple.trim();
  return (
    <div className="space-y-4" data-term-sheet={term.id}>
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className={`${compact ? 'text-base' : 'text-lg'} break-words font-display font-bold tracking-tightish text-slate-900 dark:text-white`}>{term.term}</h3>
          {term.pronunciation && <p className="ipa">{ipa(term.pronunciation)}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </header>

      {/* La Bedeutung = ce qu'on apprend pour l'examen (F4c) : le seul bloc teinté de la fiche,
          en police de titre, filet pétrole à gauche — l'œil y va d'abord. */}
      <section aria-labelledby={`bedeutung-${term.id}`} data-bedeutung className={`callout callout-tip flex-col items-stretch gap-0.5 ${compact ? '' : 'py-3'}`}>
        <h4 id={`bedeutung-${term.id}`} className="field-label text-brand-700 dark:text-brand-300">Bedeutung</h4>
        {editing && personal ? (
          <BedeutungEditor id={term.id} initial={bedeutung} onDone={() => { refocus.current = true; setEditing(false); }} />
        ) : (
          <div className="flex items-start gap-2">
            <p className={`min-w-0 flex-1 ${bedeutung ? `font-display font-semibold leading-snug tracking-tightish text-slate-900 dark:text-white ${compact ? 'text-base' : 'text-xl'}` : 'text-sm italic text-slate-500 dark:text-slate-400'}`}>{bedeutung || 'à compléter'}</p>
            {personal && !compact && (
              <button ref={editBtn} type="button" aria-label="Modifier la Bedeutung" onClick={() => setEditing(true)} className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-brand-700 hover:bg-white/60 dark:text-brand-300 dark:hover:bg-white/10">
                <Icon name="pen" className="h-4 w-4" title="Modifier" />
              </button>
            )}
          </div>
        )}
      </section>

      {!compact && term.definitionDetailed && (
        <details className="group rounded-lg border border-slate-200 dark:border-slate-800">
          <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium text-slate-600 dark:text-slate-300">Définition complète</summary>
          <p className="px-3 pb-3 text-sm text-slate-600 dark:text-slate-300">{term.definitionDetailed}</p>
        </details>
      )}

      {!compact && <TermUsage term={term} />}

      {!compact && personal && term.context && (
        <section aria-labelledby={`contexte-${term.id}`}>
          <h4 id={`contexte-${term.id}`} className="field-label mb-1">Contexte</h4>
          <ContextSentence sentence={term.context} word={term.term} />
        </section>
      )}
    </div>
  );
}
