import { useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Fachbegriff } from '@/db/types';
import { SRS_TONE } from '@/lib/srsTone';
import { buildRows } from './letters';

export interface TermListHandle { jumpTo: (letter: string) => void }
interface Props { terms: Fachbegriff[]; favorites: Set<string>; onOpen: (t: Fachbegriff) => void; onToggleFavorite: (t: Fachbegriff) => void; onRemove?: (t: Fachbegriff) => void }

// Liste A→Z virtualisée (2 266 termes : ≤ 60 lignes montées). En-tête de
// lettre flottant (overlay unique par-dessus le conteneur de scroll, calculé
// depuis la première ligne visible — `sticky` ne fonctionne pas sur des
// lignes positionnées en absolu) ; ligne 44 px ; étoile et « Retirer » sont
// des boutons distincts de la ligne (pas d'imbrication de boutons).
export const TermList = forwardRef<TermListHandle, Props>(function TermList({ terms, favorites, onOpen, onToggleFavorite, onRemove }, ref) {
  const parentRef = useRef<HTMLDivElement>(null);
  const { rows, firstIndexByLetter } = useMemo(() => buildRows(terms), [terms]);
  const v = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) => (rows[i].kind === 'letter' ? 32 : 44),
    overscan: 10,
    getItemKey: (i) => (rows[i].kind === 'letter' ? `L:${rows[i].letter}` : rows[i].term.id),
  });
  useImperativeHandle(ref, () => ({ jumpTo: (letter) => { const i = firstIndexByLetter.get(letter); if (i !== undefined) v.scrollToIndex(i, { align: 'start' }); } }), [firstIndexByLetter, v]);

  const virtualItems = v.getVirtualItems();
  // Lettre flottante = celle du premier item RÉELLEMENT visible (virtualItems[0]
  // inclut l'overscan, jusqu'à 10 lignes au-dessus du bord).
  const top = v.scrollOffset ?? 0;
  const firstVisible = virtualItems.find((it) => it.end > top);
  let currentLetter = '';
  for (let i = firstVisible?.index ?? -1; i >= 0; i--) {
    const row = rows[i];
    if (row.kind === 'letter') { currentLetter = row.letter; break; }
  }

  return (
    <div className="relative">
      {currentLetter && (
        <div aria-hidden data-floating-letter className="pointer-events-none absolute inset-x-0 top-0 z-10 flex h-8 rounded-t-xl items-center border-b border-slate-100 bg-paper/95 px-4 text-xs font-bold tracking-wider text-slate-400 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
          {currentLetter}
        </div>
      )}
      <div ref={parentRef} data-testid="term-list" className="card h-[min(70vh,640px)] overflow-y-auto p-0">
        <div style={{ height: v.getTotalSize(), position: 'relative' }}>
          {virtualItems.map((it) => {
            const row = rows[it.index];
            const style = { position: 'absolute' as const, top: 0, left: 0, width: '100%', transform: `translateY(${it.start}px)`, height: it.size };
            if (row.kind === 'letter') return <div key={`L${row.letter}`} data-letter={row.letter} style={style} className="flex items-center border-b border-slate-100 bg-paper/95 px-4 text-xs font-bold tracking-wider text-slate-400 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">{row.letter}</div>;
            const t = row.term; const fav = favorites.has(t.id); const tone = SRS_TONE[t.srs.state];
            return (
              <div key={t.id} data-term-id={t.id} style={style} className="flex items-center gap-2 border-b border-slate-50 px-2 hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-white/5">
                <button type="button" onClick={() => onOpen(t)} className="flex min-w-0 flex-1 flex-col items-start px-2 text-left">
                  <span className="truncate font-semibold text-brand-700 dark:text-brand-300">{t.term}</span>
                  <span className="truncate text-xs text-slate-500 dark:text-slate-400">{t.translationSimple}</span>
                </button>
                <span role="img" className={`chip shrink-0 ${tone.chip}`} title={t.srs.state} aria-label={t.srs.state}>{t.srs.state === 'Zu wiederholen' ? '↻' : t.srs.state[0]}</span>
                {onRemove && <button type="button" aria-label={`Retirer ${t.term} du deck`} onClick={() => onRemove(t)} className="btn-ghost h-11 w-11 shrink-0 justify-center text-slate-400">−</button>}
                <button type="button" aria-label={fav ? `Retirer ${t.term} des favoris` : `Ajouter ${t.term} aux favoris`} aria-pressed={fav} onClick={() => onToggleFavorite(t)}
                  className={`h-11 w-11 shrink-0 text-lg ${fav ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400 dark:text-slate-600'}`}>{fav ? '★' : '☆'}</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
