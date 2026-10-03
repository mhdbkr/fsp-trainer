import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useUi } from '@/store/ui';
import { useTermsInDecks } from '@/hooks/useData';
import { SRS_TONE } from '@/lib/srsTone';
import { armClose, disarmClose } from './hoverTimer';
import { starRef } from './hoverStarRef';
import { TermSheet } from './TermSheet';
import { StarButton } from './StarButton';
import { AnimatePresence, appear, m } from '@/lib/motion';

// Hover-card ★ (spec F2b D2/D3, F4a D2/D6) : une seule carte, ancrée sur le
// terme survolé ou tapé — la fiche en version compacte (terme, Bedeutung),
// l'étoile (Favoris d'un geste, ou les decks du terme si elle est pleine) et
// « Voir la fiche ». Verre plein ; mouvement : geste `appear` (lib/motion), reduced-motion
// respecté. Le minuteur de fermeture est partagé avec AutoLinkText via
// `hoverTimer`. `caseId` vient du store (voir ui.ts) : cette carte est montée
// dans Shell, hors de tout CaseContext.Provider.
const W = 280;

export function TermHoverCard() {
  const hover = useUi((s) => s.hoverTerm);
  const close = useUi((s) => s.closeHover);
  const openGlossary = useUi((s) => s.openGlossary);
  const inDecks = useTermsInDecks();
  const [measuredH, setMeasuredH] = useState(160);
  const ref = useRef<HTMLDivElement>(null);

  // M3 : le repli au-dessus est calculé sur la hauteur réellement rendue.
  useLayoutEffect(() => {
    if (!hover || !ref.current) return;
    const h = ref.current.getBoundingClientRect().height;
    if (h) setMeasuredH(h);
  }, [hover?.fb.id]);

  useEffect(() => {
    if (!hover) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    // Un clic dans une couche flottante de la carte (decks, confirmation) ne la ferme pas.
    const onDown = (e: MouseEvent) => {
      const t = e.target as Element;
      if (ref.current && !ref.current.contains(t) && !t.closest?.('[data-keep-open]')) close();
    };
    // M2 / I2 : un scroll referme la carte, sauf dans les 250 ms qui suivent l'ouverture.
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

  if (!hover) return <AnimatePresence>{null}</AnimatePresence>;   // même instance : la sortie se joue
  const { fb, anchor, caseId } = hover;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  const left = Math.max(8, Math.min(anchor.left, vw - W - 8));
  const belowTop = anchor.bottom + 8;
  const fitsBelow = belowTop + measuredH + 8 <= vh;
  const top = Math.max(8, fitsBelow ? belowTop : anchor.top - 8 - measuredH);

  return (
    <AnimatePresence>
    <m.div
      key={fb.id}
      {...appear}
      ref={ref}
      role="dialog"
      aria-label={fb.term}
      style={{ position: 'fixed', left, width: W, top, zIndex: 60 }}
      tabIndex={-1}
      onMouseEnter={disarmClose}
      onMouseLeave={() => armClose(close, 300)}
      onFocus={disarmClose}
      onBlur={(e) => { if (!ref.current?.contains(e.relatedTarget as Node)) armClose(close, 300); }}
      className="glass-full rounded-xl p-3 text-sm"
    >
      <TermSheet term={fb} compact actions={
        <StarButton term={fb} filled={inDecks?.has(fb.id)} caseId={caseId ?? undefined} buttonRef={(el) => { starRef.current = el; }} />
      } />
      <div className="mt-2 flex items-center justify-between gap-2">
        <span role="img" aria-label={fb.srs.state} className={`chip ${SRS_TONE[fb.srs.state].chip}`}>{fb.srs.state}</span>
        <button type="button" onClick={() => { close(); openGlossary(fb); }} className="btn-ghost min-h-11">Voir la fiche →</button>
      </div>
    </m.div>
    </AnimatePresence>
  );
}
