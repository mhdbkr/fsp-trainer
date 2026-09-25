import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useUi } from '@/store/ui';
import { useFavorites, useDecks, useDeckTerms } from '@/hooks/useData';
import { toggleFavorite, addToDeck, removeFromDeck, createDeck } from '@/lib/collections';
import { SRS_TONE } from '@/lib/srsTone';
import { armClose, disarmClose } from './hoverTimer';
import { starRef } from './hoverStarRef';
import { TermRegister } from './TermRegister';

// Hover-card ★ (spec F2b D2/D3) : une seule carte, ancrée sur le terme survolé
// ou tapé ; ★ = favori immédiat (+caseId en contexte de cas) puis extension
// (deck, fiche). Mouvement : opacity/transform ≤ 150 ms, reduced-motion respecté.
// Le minuteur de fermeture est partagé avec AutoLinkText via `hoverTimer` — la
// souris qui passe du lien à la carte ne referme pas la carte. `caseId` vient
// du store (voir ui.ts) : cette carte est montée dans Shell, hors de tout
// CaseContext.Provider.
const W = 280;

export function TermHoverCard() {
  const hover = useUi((s) => s.hoverTerm);
  const close = useUi((s) => s.closeHover);
  const openGlossary = useUi((s) => s.openGlossary);
  const favorites = useFavorites();
  const decks = useDecks();
  const deckTerms = useDeckTerms();
  const [expanded, setExpanded] = useState(false);
  const [newName, setNewName] = useState('');
  const [measuredH, setMeasuredH] = useState(160);
  const ref = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setExpanded(false); setNewName(''); }, [hover?.fb.id]);

  // M3 : le repli au-dessus est calculé sur la hauteur réellement rendue de la
  // carte (deck ouvert ≠ carte repliée), pas une constante approximative.
  useLayoutEffect(() => {
    if (!hover || !ref.current) return;
    const h = ref.current.getBoundingClientRect().height;
    if (h) setMeasuredH(h);
  }, [hover?.fb.id, expanded]);

  useEffect(() => {
    if (!hover) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    // M2 : un scroll de la page (liste, panneau) doit refermer la carte —
    // son ancrage (DOMRect figé au moment de l'ouverture) devient obsolète.
    // I2 : un focus clavier sur un lien hors viewport provoque un scrollIntoView
    // à la frame suivante — on ignore les scrolls des 250 ms après l'ouverture.
    const openedAt = performance.now();
    const onScroll = () => { if (performance.now() - openedAt > 250) close(); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, [hover, close]);

  if (!hover) return null;
  const { fb, anchor, caseId } = hover;
  const fav = !!favorites?.some((f) => f.termId === fb.id);
  const manual = (decks ?? []).filter((d) => d.kind === 'manual');
  const inDeck = (id: string) => !!deckTerms?.some((t) => t.deckId === id && t.termId === fb.id);

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  const left = Math.max(8, Math.min(anchor.left, vw - W - 8));
  const belowTop = anchor.bottom + 8;
  const fitsBelow = belowTop + measuredH + 8 <= vh;
  const rawTop = fitsBelow ? belowTop : anchor.top - 8 - measuredH;
  const top = Math.max(8, rawTop);
  const style: React.CSSProperties = { position: 'fixed', left, width: W, top, zIndex: 60 };

  const star = async () => {
    await toggleFavorite(fb.id, caseId ? { caseId } : undefined);
    if (!fav) setExpanded(true);
  };

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={fb.term}
      style={style}
      tabIndex={-1}
      onMouseEnter={disarmClose}
      onMouseLeave={() => armClose(close, 300)}
      onFocus={disarmClose}
      onBlur={(e) => {
        // I1 : la fermeture ne se réarme que si le focus quitte VRAIMENT la
        // carte (pas un simple passage d'un bouton à l'autre à l'intérieur).
        if (!ref.current?.contains(e.relatedTarget as Node)) armClose(close, 300);
      }}
      className="glass rounded-xl border border-slate-200 p-3 text-sm shadow-lg motion-safe:animate-fade-in dark:border-slate-700"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold text-brand-700 dark:text-brand-300">{fb.term}</div>
          <TermRegister term={fb} narrow />
          <span role="img" aria-label={fb.srs.state} className={`chip mt-1 ${SRS_TONE[fb.srs.state].chip}`}>{fb.srs.state}</span>
        </div>
        <button
          type="button"
          ref={(el) => { starRef.current = el; }}
          aria-pressed={fav}
          aria-label={fav ? `Retirer des favoris : ${fb.term}` : `Ajouter aux favoris : ${fb.term}`}
          onClick={() => { void star(); }}
          className={`h-11 w-11 shrink-0 text-xl ${fav ? 'text-signal-600' : 'text-slate-300 hover:text-signal-400 dark:text-slate-600'}`}
        >
          {fav ? '★' : '☆'}
        </button>
      </div>
      {(expanded || fav) && (
        <div className="mt-2 space-y-1 border-t border-slate-100 pt-2 dark:border-slate-800">
          <button type="button" aria-label="Ajouter à un deck" onClick={() => nameRef.current?.focus()} className="label block min-h-11 w-full text-left">Ajouter à un deck…</button>
          <div role="menu">
            {manual.map((d) => (
              <button
                key={d.id}
                type="button"
                role="menuitemcheckbox"
                aria-checked={inDeck(d.id)}
                onClick={() => { void (inDeck(d.id) ? removeFromDeck(d.id, fb.id) : addToDeck(d.id, fb.id, caseId ? { caseId } : undefined)); }}
                className="flex min-h-11 w-full items-center justify-between rounded-lg px-2 text-left hover:bg-slate-100 dark:hover:bg-white/10"
              >
                {d.name}<span>{inDeck(d.id) ? '✓' : ''}</span>
              </button>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              ref={nameRef}
              aria-label="Nom du nouveau deck"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={40}
              placeholder="Nouveau deck"
              className="input min-h-11 flex-1"
            />
            <button
              type="button"
              onClick={async () => {
                if (!newName.trim()) return;
                try {
                  const id = await createDeck(newName, 'manual');
                  await addToDeck(id, fb.id, caseId ? { caseId } : undefined);
                  setNewName('');
                } catch {
                  /* nom invalide : bornes du champ */
                }
              }}
              className="btn-outline min-h-11"
            >
              Créer
            </button>
          </div>
          <button type="button" onClick={() => { close(); openGlossary(fb); }} className="btn-ghost min-h-11 w-full justify-start">
            Voir la fiche →
          </button>
        </div>
      )}
    </div>
  );
}
