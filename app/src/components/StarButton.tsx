// ============================================================================
// L'étoile (F4a D6) — une seule notion : les decks. ★ vide → le terme est rangé
// dans Favoris (deck par défaut) et la confirmation montre la carte (D7).
// ★ pleine = le terme est dans au moins un deck → toucher liste ses decks.
// Matière (F4b P3) : vide = cristal (incolore, liseré clair) ; pleine = ambre
// glassy doux (jeton `star`). Le corail n'habille plus l'étoile.
// ============================================================================
import { useEffect, useId, useRef, useState } from 'react';
import { FAVORITES_DECK_ID } from '@/db/types';
import type { AnyTerm } from '@/lib/collections/allTerms';
import { addTermToDeck } from '@/lib/collections';
import { useCardToast } from '@/store/cardToast';
import { DeckChecklist } from './DeckChecklist';

const STAR = 'M12 3.6l2.55 5.2 5.75.83-4.16 4.05.98 5.72L12 16.7l-5.12 2.7.98-5.72L3.7 9.63l5.75-.83z';

/** L'étoile dessinée : cristal (vide) ou ambre (pleine), trait = currentColor. */
export function StarGlyph({ filled }: { filled: boolean }) {
  const id = `star-${useId().replace(/:/g, '')}`;
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden data-star={filled ? 'amber' : 'crystal'}>
      {filled && (
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" className="[stop-color:theme(colors.star.300)]" />
            <stop offset="1" className="[stop-color:theme(colors.star.500)]" />
          </linearGradient>
        </defs>
      )}
      <path d={STAR} fill={filled ? `url(#${id})` : 'rgb(255 255 255 / 0.28)'} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      {/* liseré de lumière : un reflet sur l'arête haute gauche */}
      <path d="M8.9 9.2 11.3 5.2" fill="none" stroke="white" strokeOpacity={filled ? 0.75 : 0.9} strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function StarButton({ term, filled, caseId, buttonRef }: {
  term: AnyTerm; filled: boolean | undefined; caseId?: string; buttonRef?: (el: HTMLButtonElement | null) => void;
}) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);
  // Le terme perd son dernier deck (ex. décoché) : l'ancre repart de zéro, sinon un
  // prochain clic sur ★ (redevenue pleine) la trouve déjà posée et bascule à vide (m4).
  useEffect(() => { if (!filled) setAnchor(null); }, [filled]);
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
  const color = filled ? 'text-star-600 dark:text-star-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100';
  return (
    <>
      <button ref={buttonRef} type="button" onClick={(e) => { void onClick(e); }} aria-pressed={filled ?? false} aria-busy={filled === undefined || undefined} disabled={filled === undefined}
        aria-label={filled ? `Decks de ${term.term}` : `Ajouter aux favoris : ${term.term}`}
        aria-haspopup={filled ? 'menu' : undefined} aria-expanded={filled ? !!anchor : undefined}
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-white/40 dark:hover:bg-white/10 ${color} ${filled === undefined ? 'invisible' : ''}`}><StarGlyph filled={!!filled} /></button>
      {anchor && filled && <DeckChecklist termId={term.id} caseId={caseId} anchor={anchor} onClose={() => setAnchor(null)} />}
      {error && <span role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</span>}
    </>
  );
}
