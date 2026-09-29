// ============================================================================
// Confirmation d'une carte (F4a D7/D10). « Rangée » : la carte en miniature,
// « Révéler » (la retourne), « Changer de deck » (DÉPLACE, D6 ; masqué sans autre deck).
// « Supprimée » : Annuler pendant le délai — rien n'a encore été émis.
// Style minimal de la charte actuelle (la matière glass vient au chantier 2).
// ============================================================================
import { useEffect, useState } from 'react';
import { FAVORITES_DECK_ID } from '@/db/types';
import { useDecks } from '@/hooks/useData';
import { moveTermToDeck } from '@/lib/collections';
import { cancelDeletion, DELETE_DELAY_MS } from '@/lib/collections/pendingDeletion';
import { useCardToast } from '@/store/cardToast';
import { CardFlip } from './CardFlip';
import { Portal } from './Portal';

const SAVED_MS = 8000;
const box = 'fixed inset-x-4 bottom-4 z-[90] mx-auto max-w-sm rounded-xl bg-white p-3 text-sm shadow-lg ring-1 ring-slate-200 motion-safe:animate-fade-in-fast dark:bg-slate-900 dark:ring-slate-700';

export function CardToast() {
  const toast = useCardToast((s) => s.toast);
  const show = useCardToast((s) => s.show);
  const hide = useCardToast((s) => s.hide);
  const decks = useDecks();
  const [flipped, setFlipped] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [touched, setTouched] = useState(false);
  useEffect(() => { setFlipped(false); setChoosing(false); setTouched(false); }, [toast && 'term' in toast ? toast.term.id : null, toast?.kind]);
  useEffect(() => {   // Échap ferme la confirmation (la suppression différée, elle, suit son cours)
    if (!toast) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') hide(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toast, hide]);
  useEffect(() => {
    if (!toast || (touched && toast.kind === 'saved')) return;
    const t = setTimeout(hide, toast.kind === 'deleted' ? DELETE_DELAY_MS : SAVED_MS);
    return () => clearTimeout(t);
  }, [toast, touched, hide]);
  if (!toast) return null;

  if (toast.kind === 'error') {
    return (
      <Portal>
        <div role="alert" className={`${box} flex items-center gap-3`}>
          <span className="flex-1">{toast.message}</span>
          <button type="button" aria-label="Fermer" onClick={hide} className="btn-ghost h-11 w-11 justify-center">✕</button>
        </div>
      </Portal>
    );
  }
  if (toast.kind === 'deleted') {
    return (
      <Portal>
        <div role="status" data-keep-open className={`${box} flex items-center gap-3`}>
          <span className="flex-1">Carte « {toast.term.term} » supprimée</span>
          <button type="button" onClick={() => { if (cancelDeletion(toast.term.id)) hide(); else show({ kind: 'error', message: 'Trop tard : la carte est supprimée.' }); }} className="btn-outline min-h-11">Annuler</button>
        </div>
      </Portal>
    );
  }
  const targets = [{ id: FAVORITES_DECK_ID, name: 'Favoris' }, ...(decks ?? []).filter((d) => d.kind === 'manual')];
  const deckName = targets.find((d) => d.id === toast.deckId)?.name ?? 'Favoris';
  return (
    <Portal>
      <div role="status" data-keep-open onPointerDown={() => setTouched(true)} onFocus={() => setTouched(true)} className={`${box} space-y-2`}>
        <div className="flex items-center justify-between gap-2">
          <span>Rangée dans <strong>{deckName}</strong></span>
          <button type="button" aria-label="Fermer" onClick={hide} className="btn-ghost h-11 w-11 justify-center">✕</button>
        </div>
        <CardFlip card={toast.term} direction="term2simple" revealed={flipped} onFlip={() => setFlipped(true)} size="mini" />
        <div className="flex gap-2">
          <button type="button" onClick={() => setFlipped((f) => !f)} className="btn-outline min-h-11 flex-1">{flipped ? 'Recto' : 'Révéler'}</button>
          {targets.length > 1 && <button type="button" aria-expanded={choosing} onClick={() => setChoosing((c) => !c)} className="btn-outline min-h-11 flex-1">Changer de deck</button>}
        </div>
        {choosing && (
          <div role="group" aria-label="Déplacer vers" className="space-y-1">
            {targets.filter((d) => d.id !== toast.deckId).map((d) => (
              <button key={d.id} type="button" onClick={async () => {
                await moveTermToDeck(toast.term.id, toast.deckId, d.id, toast.caseId ? { caseId: toast.caseId } : {});
                show({ ...toast, deckId: d.id }); setChoosing(false);
              }} className="flex min-h-11 w-full items-center rounded-lg px-2 text-left hover:bg-slate-100 dark:hover:bg-white/10">{d.name}</button>
            ))}
          </div>
        )}
      </div>
    </Portal>
  );
}
