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
        onKeyDown={(e) => { if (e.key === 'Enter') void save(); if (e.key === 'Escape') { e.stopPropagation(); onDone(); } }} className="input min-h-11 w-full" />
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
          <h3 className={`${compact ? 'text-base' : 'text-lg'} break-words font-bold text-brand-700 dark:text-brand-300`}>{term.term}</h3>
          {term.pronunciation && <p className="text-sm text-slate-400">/{term.pronunciation}/</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </header>

      <section aria-labelledby={`bedeutung-${term.id}`}>
        <h4 id={`bedeutung-${term.id}`} className="label mb-1">Bedeutung</h4>
        {editing && personal ? (
          <BedeutungEditor id={term.id} initial={bedeutung} onDone={() => { refocus.current = true; setEditing(false); }} />
        ) : (
          <div className="flex items-start gap-2">
            <p className={`min-w-0 flex-1 ${bedeutung ? 'text-base text-slate-800 dark:text-slate-100' : 'text-sm italic text-slate-400'}`}>{bedeutung || 'à compléter'}</p>
            {personal && !compact && (
              <button ref={editBtn} type="button" aria-label="Modifier la Bedeutung" onClick={() => setEditing(true)} className="btn-ghost h-11 w-11 shrink-0 justify-center">
                <Icon name="pen" className="h-4 w-4" title="Modifier" />
              </button>
            )}
          </div>
        )}
      </section>

      {!compact && term.definitionDetailed && (
        <details className="panel group">
          <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium text-slate-600 dark:text-slate-300">Définition complète</summary>
          <p className="px-3 pb-3 text-sm text-slate-600 dark:text-slate-300">{term.definitionDetailed}</p>
        </details>
      )}

      {!compact && <TermUsage term={term} />}

      {!compact && personal && term.context && (
        <section aria-labelledby={`contexte-${term.id}`}>
          <h4 id={`contexte-${term.id}`} className="label mb-1">Contexte</h4>
          <ContextSentence sentence={term.context} word={term.term} />
        </section>
      )}
    </div>
  );
}
