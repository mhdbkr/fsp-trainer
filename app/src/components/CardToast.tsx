// ============================================================================
// Confirmation d'une carte (F4a D7/D10 → F4b P5) : UNE pilule verre en bas de
// l'écran, une ligne, discrète pendant un cas.
// « Rangée » : ★ Rangée dans <deck> · Révéler · Changer. Toucher la pilule
// ouvre la miniature (la carte) ; Révéler la retourne ; Changer DÉPLACE (D6 ;
// masqué sans autre deck). « Supprimée » : Annuler pendant le délai — rien
// n'a encore été émis (idem « Deck supprimé »). Erreur : même pilule, rôle alert.
// Se ferme seule (8 s ; le délai de suppression pour « Supprimée »), sauf une
// fois touchée. Échap la ferme (une suppression différée suit son cours).
// ============================================================================
import { useEffect, useState } from 'react';
import { FAVORITES_DECK_ID } from '@/db/types';
import { useDecks } from '@/hooks/useData';
import { moveTermToDeck } from '@/lib/collections';
import { cancelDeletion, DELETE_DELAY_MS } from '@/lib/collections/pendingDeletion';
import { AnimatePresence, appear, expand, m } from '@/lib/motion';
import { useCardToast } from '@/store/cardToast';
import { CardFlip } from './CardFlip';
import { Portal } from './Portal';
import { StarGlyph } from './StarButton';

const SAVED_MS = 8000;
const pill = 'glass-thin pointer-events-auto flex min-h-11 max-w-full items-center gap-1 rounded-full py-0.5 pl-3 pr-1 text-sm';
const link = 'min-h-11 shrink-0 rounded-full px-2.5 font-medium text-brand-700 hover:bg-white/50 dark:text-brand-300 dark:hover:bg-white/10';
const Dot = () => <span aria-hidden className="text-slate-400">·</span>;

export function CardToast() {
  const toast = useCardToast((s) => s.toast);
  const show = useCardToast((s) => s.show);
  const hide = useCardToast((s) => s.hide);
  const decks = useDecks();
  const [open, setOpen] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [touched, setTouched] = useState(false);
  const termId = toast && 'term' in toast ? toast.term.id : null;
  const deckToastId = toast?.kind === 'deck-deleted' ? toast.deckId : null;
  useEffect(() => { setOpen(false); setFlipped(false); setChoosing(false); setTouched(false); }, [termId, deckToastId, toast?.kind]);
  useEffect(() => {
    if (!toast) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') hide(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toast, hide]);
  useEffect(() => {
    if (!toast || (touched && toast.kind === 'saved')) return;
    const t = setTimeout(hide, toast.kind === 'deleted' || toast.kind === 'deck-deleted' ? DELETE_DELAY_MS : SAVED_MS);
    return () => clearTimeout(t);
  }, [toast, touched, hide]);

  const targets = [{ id: FAVORITES_DECK_ID, name: 'Favoris' }, ...(decks ?? []).filter((d) => d.kind === 'manual')];
  let body: React.ReactNode = null;
  if (toast?.kind === 'error') {
    body = (
      <m.div key="error" role="alert" {...appear} className={pill}>
        <span className="min-w-0 flex-1 truncate">{toast.message}</span>
        <button type="button" aria-label="Fermer" onClick={hide} className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-white/50 dark:hover:bg-white/10">✕</button>
      </m.div>
    );
  } else if (toast?.kind === 'deleted') {
    body = (
      <m.div key={`deleted-${toast.term.id}`} role="status" data-keep-open {...appear} className={pill}>
        <span className="min-w-0 truncate">Carte « {toast.term.term} » supprimée</span><Dot />
        <button type="button" onClick={() => { if (cancelDeletion(toast.term.id)) hide(); else show({ kind: 'error', message: 'Trop tard : la carte est supprimée.' }); }} className={link}>Annuler</button>
      </m.div>
    );
  } else if (toast?.kind === 'deck-deleted') {
    body = (
      <m.div key={`deck-deleted-${toast.deckId}`} role="status" data-keep-open {...appear} className={pill}>
        <span className="min-w-0 truncate">Deck « {toast.name} » supprimé</span><Dot />
        <button type="button" onClick={() => { if (cancelDeletion(toast.deckId)) hide(); else show({ kind: 'error', message: 'Trop tard : le deck est supprimé.' }); }} className={link}>Annuler</button>
      </m.div>
    );
  } else if (toast?.kind === 'saved') {
    const deckName = targets.find((d) => d.id === toast.deckId)?.name ?? 'Favoris';
    body = (
      <m.div key={`saved-${toast.term.id}`} role="status" data-keep-open {...appear}
        onPointerDown={() => setTouched(true)} onFocus={() => setTouched(true)}
        className="flex max-w-full flex-col items-center gap-2">
        <AnimatePresence>
          {open && (
            <m.div key="mini" {...expand} style={{ transformOrigin: 'bottom center' }} className="glass-full pointer-events-auto w-64 rounded-2xl p-2">
              <CardFlip card={toast.term} direction="term2simple" revealed={flipped} onFlip={() => setFlipped(true)} size="mini" />
            </m.div>
          )}
          {choosing && (
            <m.div key="decks" {...expand} style={{ transformOrigin: 'bottom center' }} role="group" aria-label="Déplacer vers" className="glass-full pointer-events-auto w-56 space-y-1 rounded-2xl p-1">
              {targets.filter((d) => d.id !== toast.deckId).map((d) => (
                <button key={d.id} type="button" onClick={async () => {
                  await moveTermToDeck(toast.term.id, toast.deckId, d.id, toast.caseId ? { caseId: toast.caseId } : {});
                  show({ ...toast, deckId: d.id }); setChoosing(false);
                }} className="flex min-h-11 w-full items-center rounded-xl px-3 text-left hover:bg-white/50 dark:hover:bg-white/10">{d.name}</button>
              ))}
            </m.div>
          )}
        </AnimatePresence>
        <div className={pill}>
          <button type="button" aria-expanded={open} onClick={() => { setOpen((o) => !o); setChoosing(false); }}
            className="flex min-h-11 min-w-0 items-center gap-1.5 rounded-full pr-1 text-left">
            <span className="shrink-0 text-star-600 dark:text-star-400"><StarGlyph filled /></span>
            <span className="min-w-0 truncate">Rangée dans <strong className="font-semibold">{deckName}</strong></span>
          </button>
          <Dot />
          <button type="button" onClick={() => { setChoosing(false); if (open) setFlipped((f) => !f); else { setOpen(true); setFlipped(true); } }} className={link}>{open && flipped ? 'Recto' : 'Révéler'}</button>
          {targets.length > 1 && (<>
            <Dot />
            <button type="button" aria-label="Changer de deck" aria-expanded={choosing} onClick={() => { setChoosing((c) => !c); setOpen(false); }} className={link}>Changer</button>
          </>)}
        </div>
      </m.div>
    );
  }
  return (
    <Portal>
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[90] mx-auto flex max-w-md justify-center">
        <AnimatePresence>{body}</AnimatePresence>
      </div>
    </Portal>
  );
}
