// ============================================================================
// Onglets des decks d'UN terme (F4b P6) — verre fin, dans le tiroir latéral
// (GlossaryDrawer). Ordinateur (md+) : une colonne d'onglets qui SORTENT du
// bord gauche du tiroir ; téléphone : les mêmes en bande horizontale en haut
// du tiroir (défile seule). Onglet allumé = le terme est rangé dans ce deck ;
// toucher = ranger / retirer (addTermToDeck / removeTermFromDeck, rien de
// nouveau). Decks intelligents : absents (ils se remplissent seuls, rien à
// toucher ici). « Gérer », en dernier, ouvre le tiroir de gestion.
// Remplace l'étoile du tiroir.
// ============================================================================
import { useRef, useState } from 'react';
import { FAVORITES_DECK_ID } from '@/db/types';
import { useDecks, useDeckTerms, useFavorites } from '@/hooks/useData';
import { addTermToDeck, removeTermFromDeck } from '@/lib/collections';
import { decksOfTerm } from '@/lib/collections/query';
import { Icon } from './icons';
import { StarGlyph } from './StarButton';

const tab = 'glass-thin group flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-slate-700 transition-colors hover:text-brand-700 aria-pressed:text-brand-700 aria-disabled:opacity-60 dark:aria-pressed:text-brand-300 dark:text-slate-200 md:max-w-[10rem] md:rounded-l-full md:rounded-r-none md:border-r-0';
const check = <span aria-hidden className="text-xs">✓</span>;

export function DeckRail({ termId, caseId, onManage }: { termId: string; caseId?: string; onManage: () => void }) {
  // useDecks()/useDeckTerms()/useFavorites() filtrent déjà les decks en
  // attente de suppression (Annuler 5 s, F4b P6) : pas de refiltre ici.
  const decks = useDecks(); const deckTerms = useDeckTerms(); const favorites = useFavorites();
  const [busy, setBusy] = useState<Set<string>>(new Set());   // affichage (aria-disabled)
  const lock = useRef(new Set<string>());                     // verrou immédiat : l'onglet garde le focus clavier
  const [error, setError] = useState<string | null>(null);
  if (!decks || !deckTerms || !favorites) return null;   // états inconnus : rien à toucher
  const has = new Set(decksOfTerm(termId, favorites, deckTerms));
  const byDate = (a: { createdAt: string }, b: { createdAt: string }) => a.createdAt.localeCompare(b.createdAt);
  const rows = decks.filter((d) => d.kind === 'manual').sort(byDate);
  const opts = caseId ? { caseId } : {};
  // Verrou par onglet : un second appui pendant l'écriture est ignoré (double appui).
  const toggle = async (id: string) => {
    if (lock.current.has(id)) return;
    lock.current.add(id); setBusy((b) => new Set(b).add(id)); setError(null);
    try { await (has.has(id) ? removeTermFromDeck(id, termId) : addTermToDeck(id, termId, opts)); }
    catch { setError('Impossible de ranger : réessaie.'); }
    finally { lock.current.delete(id); setBusy((b) => { const n = new Set(b); n.delete(id); return n; }); }
  };
  const describe = (name: string, on: boolean) => (on ? `Retirer de ${name}` : `Ranger dans ${name}`);
  return (
    <>
    {/* Une seule rangée qui DÉFILE (téléphone) / une colonne qui défile (ordinateur) : jamais de retour à la ligne (revue E4). */}
    <div role="group" aria-label="Decks de ce terme"
      className="flex items-center gap-1.5 overflow-x-auto border-b border-white/40 px-4 py-2 dark:border-white/10 md:absolute md:right-full md:top-16 md:max-h-[calc(100dvh-5rem)] md:w-40 md:flex-col md:items-end md:overflow-y-auto md:overflow-x-hidden md:border-0 md:p-0">
      <span className="label shrink-0">Ranger dans</span>
      <button type="button" aria-pressed={has.has(FAVORITES_DECK_ID)} aria-description={describe('Favoris', has.has(FAVORITES_DECK_ID))}
        aria-disabled={busy.has(FAVORITES_DECK_ID) || undefined} onClick={() => { void toggle(FAVORITES_DECK_ID); }} className={tab}>
        <span className="text-star-600 dark:text-star-400"><StarGlyph filled={has.has(FAVORITES_DECK_ID)} /></span>
        <span className="truncate">Favoris</span>
        {has.has(FAVORITES_DECK_ID) && check}
      </button>
      {rows.map((d) => (
        <button key={d.id} type="button" aria-pressed={has.has(d.id)} aria-description={describe(d.name, has.has(d.id))}
          aria-disabled={busy.has(d.id) || undefined} onClick={() => { void toggle(d.id); }} className={tab}>
          <span className="truncate">{d.name}</span>
          {has.has(d.id) && check}
        </button>
      ))}
      <button type="button" onClick={onManage} aria-haspopup="dialog" aria-label="Gérer les decks" className={tab}>
        <Icon name="gear" className="h-4 w-4 shrink-0" /><span>Gérer</span>
      </button>
    </div>
    {error && <p role="alert" className="px-4 py-1 text-xs text-rose-600 dark:text-rose-400 md:absolute md:right-full md:top-2 md:w-40 md:px-0 md:text-right">{error}</p>}
    </>
  );
}
