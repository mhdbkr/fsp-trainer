// ============================================================================
// Mini-fiche de création (F4a D4/D5) : ★ sur un mot hors glossaire. Le mot
// (modifiable), sa Bedeutung proposée par l'IA (modifiable), le Contexte = la
// seule phrase qui le contient, mot surligné, le deck (Favoris par défaut),
// « Créer ». Plus de 4 mots sélectionnés : on touche le mot à garder. Fermer
// sans créer n'écrit rien. IA indisponible : « Écris la signification ».
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import { FAVORITES_DECK_ID } from '@/db/types';
import { db } from '@/db/db';
import { useDecks } from '@/hooks/useData';
import { addTermToDeck } from '@/lib/collections';
import { cleanSelection, createPersonalTerm, PT_LIMITS } from '@/lib/collections/personalTerms';
import { toView } from '@/lib/collections/allTerms';
import { askBedeutung, canAskAi } from '@/lib/onlineAi';
import { useCardToast } from '@/store/cardToast';
import { ContextSentence } from './TermSheet';
import { Portal } from './Portal';

export const CHIP_THRESHOLD = 4;
/** Mots d'une sélection longue, nettoyés, sans doublon (≥ 2 lettres). */
export function selectionWords(selection: string): string[] {
  return [...new Set(selection.split(/\s+/).map(cleanSelection).filter((w) => w.length >= 2))];
}

export function NewCardSheet({ selection, sentence, caseId, onClose }: { selection: string; sentence: string; caseId?: string; onClose: () => void }) {
  const decks = useDecks();
  const show = useCardToast((s) => s.show);
  const chips = selectionWords(selection).length > CHIP_THRESHOLD ? selectionWords(selection) : null;
  const [word, setWord] = useState(chips ? '' : cleanSelection(selection));
  const [bedeutung, setBedeutung] = useState('');
  const [ai, setAi] = useState<'idle' | 'loading' | 'failed'>('idle');
  const [deckId, setDeckId] = useState(FAVORITES_DECK_ID);
  const [error, setError] = useState<string | null>(null);
  const asked = useRef<string | null>(null);
  const typed = useRef(false);

  // UN appel IA par mot choisi (à l'ouverture, ou au toucher d'une pastille).
  useEffect(() => {
    if (!word || asked.current !== null || !canAskAi()) { if (word && !canAskAi()) setAi('failed'); return; }
    asked.current = word; setAi('loading');
    askBedeutung(word, sentence || undefined)
      .then((b) => { if (!typed.current) setBedeutung(b); setAi(b ? 'idle' : 'failed'); })
      .catch(() => setAi('failed'));
  }, [word, sentence]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const canCreate = !!word.trim() && word.length <= PT_LIMITS.term && !!bedeutung.trim();
  const create = async () => {
    if (!canCreate) return;
    try {
      const { id } = await createPersonalTerm({ term: word, explanation: bedeutung, context: sentence, caseId });
      await addTermToDeck(deckId, id, caseId ? { caseId } : {});
      const pt = await db.personal_terms.get(id);
      if (pt) show({ kind: 'saved', term: toView(pt), deckId, ...(caseId ? { caseId } : {}) });
      onClose();
    } catch { setError('Impossible de créer la carte : réessaie.'); }
  };

  return (
    <Portal>
      <div role="dialog" aria-modal="true" aria-label="Nouvelle carte" data-keep-open
        className="fixed inset-x-4 bottom-4 z-[95] mx-auto max-w-md space-y-3 rounded-xl bg-white p-4 text-sm shadow-xl ring-1 ring-slate-200 motion-safe:animate-fade-in-fast dark:bg-slate-900 dark:ring-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Nouvelle carte</h3>
          <button type="button" aria-label="Fermer" onClick={onClose} className="btn-ghost h-11 w-11 justify-center">✕</button>
        </div>
        {chips && (
          <div>
            <p className="label mb-1">Touche le mot à garder</p>
            <div className="flex flex-wrap gap-1.5">
              {chips.map((w) => (
                <button key={w} type="button" aria-pressed={word === w} onClick={() => { setWord(w); typed.current = false; setBedeutung(''); asked.current = null; }}
                  className={`min-h-11 rounded-full px-3 ring-1 ${word === w ? 'bg-brand-600 text-white ring-brand-600' : 'ring-slate-300 hover:bg-slate-100 dark:ring-slate-600 dark:hover:bg-white/10'}`}>{w}</button>
              ))}
            </div>
          </div>
        )}
        {word && (
          <>
            <label className="block"><span className="label">Mot</span>
              <input value={word} maxLength={PT_LIMITS.term} onChange={(e) => setWord(e.target.value)} className="input mt-1 min-h-11 w-full" />
            </label>
            <label className="block"><span className="label">Bedeutung</span>
              <input value={bedeutung} maxLength={PT_LIMITS.explanation} placeholder={ai === 'loading' ? 'Doctopus propose…' : 'Écris la signification'}
                onChange={(e) => { typed.current = true; setBedeutung(e.target.value); }} className="input mt-1 min-h-11 w-full" />
            </label>
            {ai === 'failed' && !bedeutung && <p className="text-xs text-slate-500">Pas de proposition : écris la signification.</p>}
            {sentence && <div><span className="label">Contexte</span><ContextSentence sentence={sentence} word={word} /></div>}
            <label className="block"><span className="label">Deck</span>
              <select value={deckId} onChange={(e) => setDeckId(e.target.value)} className="input mt-1 min-h-11 w-full">
                <option value={FAVORITES_DECK_ID}>Favoris</option>
                {(decks ?? []).filter((d) => d.kind === 'manual').map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            <button type="button" onClick={() => { void create(); }} disabled={!canCreate} className="btn-primary min-h-11 w-full disabled:opacity-40">Créer</button>
            {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
          </>
        )}
      </div>
    </Portal>
  );
}
