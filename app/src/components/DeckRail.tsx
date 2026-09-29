// ============================================================================
// Onglets des decks d'UN terme (F4b P6) — verre fin, dans le tiroir latéral
// (GlossaryDrawer). Ordinateur (md+) : une colonne d'onglets qui SORTENT du
// bord gauche du tiroir ; téléphone : les mêmes en bande horizontale en haut
// du tiroir (défile seule). Onglet allumé = le terme est rangé dans ce deck ;
// toucher = ranger / retirer (addTermToDeck / removeTermFromDeck, rien de
// nouveau). Decks intelligents : icône, jamais rangeables à la main (inertes).
// « ⋯ Decks » ouvre le tiroir de gestion. Remplace l'étoile du tiroir.
// ============================================================================
import { FAVORITES_DECK_ID } from '@/db/types';
import { useDecks, useDeckTerms, useFavorites } from '@/hooks/useData';
import { addTermToDeck, removeTermFromDeck } from '@/lib/collections';
import { usePendingDeletions } from '@/lib/collections/pendingDeletion';
import { decksOfTerm } from '@/lib/collections/query';
import { Icon } from './icons';
import { StarGlyph } from './StarButton';

const tab = 'glass-thin group flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-slate-700 transition-colors hover:text-brand-700 aria-pressed:bg-brand-600 aria-pressed:text-white disabled:opacity-60 dark:text-slate-200 md:max-w-[10rem] md:rounded-l-full md:rounded-r-none md:border-r-0';

export function DeckRail({ termId, caseId, onManage }: { termId: string; caseId?: string; onManage: () => void }) {
  const decks = useDecks(); const deckTerms = useDeckTerms(); const favorites = useFavorites();
  const hidden = usePendingDeletions((s) => s.ids);
  if (!decks || !deckTerms || !favorites) return null;   // états inconnus : rien à toucher
  const has = new Set(decksOfTerm(termId, favorites, deckTerms));
  const byDate = (a: { createdAt: string }, b: { createdAt: string }) => a.createdAt.localeCompare(b.createdAt);
  const visible = decks.filter((d) => !hidden.has(d.id));
  const rows = [...visible.filter((d) => d.kind === 'manual').sort(byDate), ...visible.filter((d) => d.kind === 'smart').sort(byDate)];
  const opts = caseId ? { caseId } : {};
  const toggle = (id: string) => { void (has.has(id) ? removeTermFromDeck(id, termId) : addTermToDeck(id, termId, opts)); };
  return (
    <div role="group" aria-label="Decks de ce terme"
      className="flex gap-1.5 overflow-x-auto border-b border-white/40 px-4 py-2 dark:border-white/10 md:absolute md:right-full md:top-16 md:w-40 md:flex-col md:items-end md:overflow-visible md:border-0 md:p-0">
      <button type="button" aria-pressed={has.has(FAVORITES_DECK_ID)} onClick={() => toggle(FAVORITES_DECK_ID)} className={tab}>
        <span className="text-star-600 group-aria-pressed:text-star-300 dark:text-star-400"><StarGlyph filled={has.has(FAVORITES_DECK_ID)} /></span>
        <span className="truncate">Favoris</span>
      </button>
      {rows.map((d) => d.kind === 'smart' ? (
        <button key={d.id} type="button" disabled title="Se remplit tout seul" className={tab}>
          <Icon name="bolt" className="h-4 w-4 shrink-0" title="Deck intelligent" /><span className="truncate">{d.name}</span>
        </button>
      ) : (
        <button key={d.id} type="button" aria-pressed={has.has(d.id)} onClick={() => toggle(d.id)} className={tab}><span className="truncate">{d.name}</span></button>
      ))}
      <button type="button" onClick={onManage} aria-haspopup="dialog" aria-label="Gérer les decks" className={`${tab} text-slate-500`}>⋯ Decks</button>
    </div>
  );
}
