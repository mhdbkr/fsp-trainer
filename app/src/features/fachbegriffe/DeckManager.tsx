// ============================================================================
// Tiroir de gestion des decks (F4b P6), ouvert par « ⋯ Decks » : renommer
// (sur place), supprimer (+ Annuler 5 s : rien n'est émis avant l'expiration,
// pendingDeletion), créer (« Nouveau deck » → DeckSheet). Supprimer un deck
// ne supprime aucune carte. Favoris est réservé : ni renommé, ni supprimé.
// Verre plein, glisse depuis la gauche (côté des onglets) ; Échap ferme.
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import type { Deck } from '@/db/types';
import { FAVORITES_DECK_ID } from '@/db/types';
import { renameDeck } from '@/lib/collections';
import { scheduleDeletion, usePendingDeletions } from '@/lib/collections/pendingDeletion';
import { m, slide } from '@/lib/motion';
import { useCardToast } from '@/store/cardToast';
import { Icon } from '@/components/icons';
import { Portal } from '@/components/Portal';

function DeckRow({ deck, count }: { deck: Deck; count: number | undefined }) {
  const [name, setName] = useState(deck.name);
  const [error, setError] = useState<string | null>(null);
  const show = useCardToast((s) => s.show);
  useEffect(() => { setName(deck.name); }, [deck.name]);
  const commit = async () => {
    if (name.trim() === deck.name) { setName(deck.name); return; }
    try { await renameDeck(deck.id, name); setError(null); }
    catch (e) { setError(e instanceof Error && e.message === 'deck_name' ? 'Nom : 1 à 40 caractères.' : 'Impossible de renommer.'); }
  };
  const remove = () => {
    scheduleDeletion(deck.id, undefined, 'deck')
      .then(() => show({ kind: 'deck-deleted', deckId: deck.id, name: deck.name }))
      .catch(() => setError('Impossible de supprimer : réessaie.'));
  };
  return (
    <li className="py-1">
      <div className="flex items-center gap-1">
        {deck.kind === 'smart' && <Icon name="bolt" className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" title="Deck intelligent" />}
        <input aria-label={`Nom du deck ${deck.name}`} value={name} maxLength={40} onChange={(e) => setName(e.target.value)}
          onBlur={() => { void commit(); }} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
          className="min-h-11 min-w-0 flex-1 border-b border-transparent bg-transparent px-1 outline-none hover:border-slate-300 focus:border-brand-500 dark:hover:border-white/20" />
        {count !== undefined && <span className="shrink-0 font-mono text-[11px] text-slate-500">{count}</span>}
        <button type="button" aria-label={`Supprimer le deck ${deck.name}`} onClick={remove}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-white/50 hover:text-rose-600 dark:hover:bg-white/10 dark:hover:text-rose-400">
          <Icon name="trash" className="h-4 w-4" title="Supprimer" />
        </button>
      </div>
      {error && <p role="alert" className="px-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </li>
  );
}

export function DeckManager({ decks, counts, onCreate, onClose }: {
  decks: Deck[]; counts: Record<string, number>; onCreate: () => void; onClose: () => void;
}) {
  const hidden = usePendingDeletions((s) => s.ids);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const shown = decks.filter((d) => !hidden.has(d.id)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return (
    <Portal>
      <m.div key="deck-manager-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-slate-900/15" onClick={onClose} />
      <m.aside key="deck-manager" ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Decks" {...slide('left')}
        className="glass-full fixed left-0 top-0 z-50 flex h-full w-full max-w-sm flex-col rounded-r-2xl p-4 outline-none">
        <div className="flex items-center justify-between">
          <h2 className="text-lg">Decks</h2>
          <button type="button" aria-label="Fermer" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/50 dark:hover:bg-white/10">✕</button>
        </div>
        <ul className="mt-2 flex-1 divide-y divide-white/40 overflow-y-auto dark:divide-white/10">
          <li className="flex min-h-11 items-center gap-1 px-1 text-slate-500">Favoris<span className="ml-auto pr-3 font-mono text-[11px]">{counts[FAVORITES_DECK_ID] ?? 0}</span></li>
          {shown.map((d) => <DeckRow key={d.id} deck={d} count={counts[d.id]} />)}
        </ul>
        <button type="button" onClick={onCreate} className="btn-primary mt-3 min-h-11 w-full rounded-full">Nouveau deck</button>
      </m.aside>
    </Portal>
  );
}
