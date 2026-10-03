import { trapFocus } from '@/lib/trapFocus';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUi } from '@/store/ui';
import { useCardToast } from '@/store/cardToast';
import { useCases, useDecks, useDeckTerms, useFavorites, usePersonalTerms } from '@/hooks/useData';
import { scheduleDeletion } from '@/lib/collections/pendingDeletion';
import { isPersonalView, toView } from '@/lib/collections/allTerms';
import { SRS_TONE } from '@/lib/srsTone';
import { TermSheet } from './TermSheet';
import { CardFlip } from './CardFlip';
import { DeckRail } from './DeckRail';
import { DeckManager } from '@/features/fachbegriffe/DeckManager';
import { Icon } from './icons';
import { AnimatePresence, m, slide } from '@/lib/motion';
import { FAVORITES_DECK_ID } from '@/db/types';

// Panneau latéral d'un Fachbegriff (F4a D2/D9/D10) : la fiche (TermSheet), ou
// la carte recto/verso comme au drill (« Carte ») ; les onglets de decks du
// terme (DeckRail, F4b P6 — remplacent l'étoile) et leur gestion (DeckManager) ;
// la corbeille d'une carte personnelle (Annuler pendant 5 s) ; les cas liés.
// Verre plein ; glisse depuis la droite et repart par là (F4b P1/P9).
export function GlossaryDrawer() {
  const opened = useUi((s) => s.glossaryTerm);
  const close = useUi((s) => s.closeGlossary);
  const closeHover = useUi((s) => s.closeHover);
  const showToast = useCardToast((s) => s.show);
  const { pathname } = useLocation();
  const cases = useCases();
  const personalTerms = usePersonalTerms();
  const decks = useDecks(); const deckTerms = useDeckTerms(); const favorites = useFavorites();
  const [manager, setManager] = useState(false);
  const [view, setView] = useState<'sheet' | 'card'>('sheet');
  const [revealed, setRevealed] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  useEffect(() => { setView('sheet'); setRevealed(false); setDeleteError(null); setManager(false); }, [opened?.id]);

  // Ouverture : la hover-card ★ cède la place (une seule carte à l'écran).
  // Échap ferme le panneau — sauf si une liste de decks est ouverte (elle se ferme d'abord).
  const open = !!opened;
  useEffect(() => { if (open) closeHover(); }, [open, closeHover]);
  // Dialogue (G1-17) : focus sur le tiroir à l'ouverture, rendu à l'ouvreur à la fermeture.
  const asideRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    asideRef.current?.focus();
    return () => { opener?.focus(); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    // … ou le tiroir de gestion des decks, ou la pilule de sélection (ils se ferment d'abord).
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[role="menu"][data-keep-open], [role="dialog"][aria-label="Decks"], [data-selection-pill]')) close(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close]);
  // Changement de route : le panneau ne survit pas à la page où il a été ouvert.
  const openedOn = useRef(pathname);
  useEffect(() => {
    if (pathname !== openedOn.current) close();
    openedOn.current = pathname;
  }, [pathname, close]);

  if (!opened) return <AnimatePresence>{null}</AnimatePresence>;   // même instance : la sortie du tiroir se joue
  // Carte personnelle : la version VIVANTE (Bedeutung modifiée, D8), pas l'instantané de l'ouverture.
  const live = isPersonalView(opened) ? personalTerms?.find((p) => p.id === opened.id) : undefined;
  const fb = live ? toView(live) : opened;
  const personal = isPersonalView(fb);
  const linkedCases = (cases ?? []).filter((c) => fb.linkedCaseIds.includes(c.id));

  const counts: Record<string, number> = { [FAVORITES_DECK_ID]: favorites?.length ?? 0 };
  for (const t of deckTerms ?? []) counts[t.deckId] = (counts[t.deckId] ?? 0) + 1;
  const remove = () => {
    scheduleDeletion(fb.id)
      .then(() => { showToast({ kind: 'deleted', term: fb }); close(); })
      .catch(() => setDeleteError('Impossible de supprimer : réessaie.'));
  };

  return (
    <AnimatePresence>
      <m.div key="glossary-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px]" onClick={close} />
      <m.aside key="glossary-drawer" ref={asideRef} onKeyDown={(e) => trapFocus(e, asideRef.current)} role="dialog" aria-modal="true" aria-label={fb.term} tabIndex={-1} {...slide('right')}
        className="glass-full glass-edge fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-y-0 border-r-0 outline-none">
        <DeckRail termId={fb.id} onManage={() => setManager(true)} />
        <div className="flex items-center justify-between gap-1 border-b border-white/40 px-4 py-2 dark:border-white/10">
          <div className="label">{personal ? 'Ma carte' : 'Fachbegriff'}</div>
          <div className="flex items-center gap-1">
            <button type="button" aria-pressed={view === 'card'} onClick={() => { setView((v) => (v === 'card' ? 'sheet' : 'card')); setRevealed(false); }}
              className="min-h-11 rounded-full px-3 text-sm font-medium hover:bg-white/50 dark:hover:bg-white/10">{view === 'card' ? 'Fiche' : 'Carte'}</button>
            {personal && (
              <button type="button" aria-label="Supprimer ma carte" onClick={remove} className="grid h-11 w-11 place-items-center rounded-full text-slate-500 hover:bg-white/50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-rose-400">
                <Icon name="trash" className="h-5 w-5" title="Supprimer" />
              </button>
            )}
            <button type="button" aria-label="Fermer" onClick={close} className="grid h-11 w-11 place-items-center rounded-full text-lg hover:bg-white/50 dark:hover:bg-white/10">✕</button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {view === 'card' ? (
            <CardFlip key={fb.id} card={fb} direction="term2simple" revealed={revealed} onFlip={setRevealed} />
          ) : (
            <TermSheet term={fb} />
          )}
          {deleteError && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{deleteError}</p>}

          <div className="flex flex-wrap gap-2">
            {!personal && <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{fb.specialty}</span>}
            <span className={`chip ${SRS_TONE[fb.srs.state].chip}`}>{fb.srs.state}</span>
          </div>

          {linkedCases.length > 0 && (
            <div>
              <div className="field-label mb-2">Erscheint in Fällen</div>
              <div className="space-y-1.5">
                {linkedCases.map((c) => (
                  <Link key={c.id} to={`/cas/${c.id}`} onClick={close} className="panel panel-interactive block px-3 py-2 text-sm">
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-white/40 p-4 dark:border-white/10">
          <Link to="/fachbegriffe" onClick={close} className="btn-outline w-full">Alle Fachbegriffe →</Link>
        </div>
      </m.aside>
      {manager && <DeckManager key="deck-manager" decks={decks ?? []} counts={counts} onClose={() => setManager(false)} />}
    </AnimatePresence>
  );
}
