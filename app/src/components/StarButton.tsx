// ============================================================================
// L'étoile (F4a D6) — une seule notion : les decks. ★ vide → le terme est rangé
// dans Favoris (deck par défaut) et la confirmation montre la carte (D7).
// ★ pleine = le terme est dans au moins un deck → toucher liste ses decks.
// ============================================================================
import { useRef, useState } from 'react';
import { FAVORITES_DECK_ID } from '@/db/types';
import type { AnyTerm } from '@/lib/collections/allTerms';
import { addTermToDeck } from '@/lib/collections';
import { useCardToast } from '@/store/cardToast';
import { DeckChecklist } from './DeckChecklist';

export function StarButton({ term, filled, caseId, tone = 'plain', buttonRef }: {
  term: AnyTerm; filled: boolean | undefined; caseId?: string; tone?: 'plain' | 'onBrand'; buttonRef?: (el: HTMLButtonElement | null) => void;
}) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  const show = useCardToast((s) => s.show);
  const onClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (filled === undefined) return;   // decks en chargement : ni ★ vide trompeuse ni ajout en double
    if (filled) { const r = e.currentTarget.getBoundingClientRect(); setAnchor((a) => (a ? null : r)); return; }
    if (busy.current) return;
    busy.current = true; setError(null);
    try {
      await addTermToDeck(FAVORITES_DECK_ID, term.id, caseId ? { caseId } : {});
      show({ kind: 'saved', term, deckId: FAVORITES_DECK_ID, ...(caseId ? { caseId } : {}) });
    } catch { setError('Impossible d\'enregistrer : réessaie.'); }
    finally { busy.current = false; }
  };
  const color = tone === 'onBrand'
    ? `hover:bg-brand-700 ${filled ? 'text-signal-300' : 'text-white'}`
    : filled ? 'text-signal-600 dark:text-signal-400' : 'text-slate-400 hover:text-signal-500 dark:text-slate-500';
  return (
    <>
      <button ref={buttonRef} type="button" onClick={(e) => { void onClick(e); }} aria-pressed={filled ?? false} aria-busy={filled === undefined || undefined} disabled={filled === undefined}
        aria-label={filled ? `Decks de ${term.term}` : `Ajouter aux favoris : ${term.term}`}
        aria-haspopup={filled ? 'menu' : undefined} aria-expanded={filled ? !!anchor : undefined}
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg ${color} ${filled === undefined ? 'invisible' : ''}`}>{filled ? '★' : '☆'}</button>
      {anchor && filled && <DeckChecklist termId={term.id} caseId={caseId} anchor={anchor} onClose={() => setAnchor(null)} />}
      {error && <span role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</span>}
    </>
  );
}
