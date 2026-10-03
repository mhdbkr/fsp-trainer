import type { Deck } from '@/db/types';
import { FAVORITES_DECK_ID } from '@/db/types';

interface Props { decks: Deck[]; activeId: string | null; counts: Record<string, number>; onSelect: (id: string | null) => void }
/** Onglets : Tous · ★ Favoris · manuels · intelligents. Créer = « ⋯ » (DeckManager, entrée unique). `activeId` null = Tous. */
export function DeckTabs({ decks, activeId, counts, onSelect }: Props) {
  const manual = decks.filter((d) => d.kind === 'manual').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const smart = decks.filter((d) => d.kind === 'smart').sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const Tab = ({ id, label }: { id: string | null; label: string }) => {
    const on = activeId === id;
    return (
      <button role="tab" aria-selected={on} onClick={() => onSelect(id)}
        className={`min-h-11 shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${on ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}>
        {label}{id !== null && counts[id] !== undefined ? <span className="ml-1.5 opacity-70">{counts[id]}</span> : null}
      </button>
    );
  };
  return (
    <div role="tablist" aria-label="Decks" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
      <Tab id={null} label="Tous" />
      <Tab id={FAVORITES_DECK_ID} label="★ Favoris" />
      {manual.map((d) => <Tab key={d.id} id={d.id} label={d.name} />)}
      {smart.map((d) => <Tab key={d.id} id={d.id} label={`⚡ ${d.name}`} />)}
    </div>
  );
}
