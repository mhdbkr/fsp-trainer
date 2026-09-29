// ============================================================================
// Les decks d'un terme (F4a D6) : ouverte par une ★ pleine. Favoris + decks
// manuels cochés ; toucher retire ou ajoute ; « + Nouveau deck » crée et range.
// Téléportée (Portal) et positionnée sous l'étoile : jamais rognée par une
// liste qui défile. `data-keep-open` : la bulle de sélection et la carte au
// survol ne se ferment pas quand on la touche.
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import { FAVORITES_DECK_ID } from '@/db/types';
import { useDecks, useDeckTerms, useFavorites } from '@/hooks/useData';
import { addTermToDeck, createDeck, removeTermFromDeck } from '@/lib/collections';
import { decksOfTerm } from '@/lib/collections/query';
import { Portal } from './Portal';

const W = 224;

export function DeckChecklist({ termId, caseId, anchor, onClose }: { termId: string; caseId?: string; anchor: DOMRect; onClose: () => void }) {
  const decks = useDecks(); const deckTerms = useDeckTerms(); const favorites = useFavorites();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const has = new Set(decksOfTerm(termId, favorites ?? [], deckTerms ?? []));
  const rows = [{ id: FAVORITES_DECK_ID, name: 'Favoris' }, ...(decks ?? []).filter((d) => d.kind === 'manual')];
  const opts = caseId ? { caseId } : {};

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    // L'étoile qui a ouvert la liste la referme elle-même (sinon : fermée ici puis rouverte par son clic).
    const onDown = (e: PointerEvent) => {
      const t = e.target as Element;
      if (ref.current && !ref.current.contains(t) && !t.closest?.('[aria-haspopup="menu"][aria-expanded="true"]')) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onDown); };
  }, [onClose]);

  const create = async () => {
    try { const id = await createDeck(name, 'manual'); await addTermToDeck(id, termId, opts); setName(''); setError(null); }
    catch (err) { setError(err instanceof Error && err.message === 'deck_name' ? 'Nom : 1 à 40 caractères.' : 'Impossible de créer le deck.'); }
  };
  if (!decks || !deckTerms || !favorites) return null;   // états cochés inconnus : ne rien proposer à toucher
  const left = Math.max(8, Math.min(anchor.right - W, window.innerWidth - W - 8));
  return (
    <Portal>
      <div ref={ref} data-keep-open role="menu" aria-label="Decks de ce terme" style={{ position: 'fixed', top: anchor.bottom + 4, left, width: W }}
        className="z-[90] rounded-xl border border-slate-200 bg-white p-1 text-sm shadow-lg motion-safe:animate-fade-in-fast dark:border-slate-700 dark:bg-slate-900">
        {rows.map((d) => (
          <button key={d.id} type="button" role="menuitemcheckbox" aria-checked={has.has(d.id)}
            onClick={() => { void (has.has(d.id) ? removeTermFromDeck(d.id, termId) : addTermToDeck(d.id, termId, opts)); }}
            className="flex min-h-11 w-full items-center justify-between rounded-lg px-2 text-left hover:bg-slate-100 dark:hover:bg-white/10">
            {d.name}<span aria-hidden>{has.has(d.id) ? '✓' : ''}</span>
          </button>
        ))}
        <div className="mt-1 flex gap-1 border-t border-slate-100 p-1 dark:border-slate-800">
          <input aria-label="Nom du nouveau deck" value={name} maxLength={40} placeholder="Nouveau deck" onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void create(); }} className="input min-h-11 flex-1" />
          <button type="button" onClick={() => { void create(); }} disabled={!name.trim()} className="btn-outline min-h-11 px-3">Créer et ranger</button>
        </div>
        {error && <p role="alert" className="px-2 pb-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
      </div>
    </Portal>
  );
}
