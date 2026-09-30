import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUi } from '@/store/ui';
import { useCardToast } from '@/store/cardToast';
import { useCases, usePersonalTerms, useTermsInDecks } from '@/hooks/useData';
import { scheduleDeletion } from '@/lib/collections/pendingDeletion';
import { isPersonalView, toView } from '@/lib/collections/allTerms';
import { SRS_TONE } from '@/lib/srsTone';
import { TermSheet } from './TermSheet';
import { CardFlip } from './CardFlip';
import { StarButton } from './StarButton';
import { Icon } from './icons';

// Panneau latéral d'un Fachbegriff (F4a D2/D9/D10) : la fiche (TermSheet), ou
// la carte recto/verso comme au drill (« Carte ») ; l'étoile des decks ; la
// corbeille d'une carte personnelle (Annuler pendant 5 s) ; les cas liés.
export function GlossaryDrawer() {
  const opened = useUi((s) => s.glossaryTerm);
  const close = useUi((s) => s.closeGlossary);
  const closeHover = useUi((s) => s.closeHover);
  const showToast = useCardToast((s) => s.show);
  const { pathname } = useLocation();
  const cases = useCases();
  const personalTerms = usePersonalTerms();
  const inDecks = useTermsInDecks();
  const [view, setView] = useState<'sheet' | 'card'>('sheet');
  const [revealed, setRevealed] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  useEffect(() => { setView('sheet'); setRevealed(false); setDeleteError(null); }, [opened?.id]);

  // Ouverture : la hover-card ★ cède la place (une seule carte à l'écran).
  // Échap ferme le panneau — sauf si une liste de decks est ouverte (elle se ferme d'abord).
  const open = !!opened;
  useEffect(() => { if (open) closeHover(); }, [open, closeHover]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape' && !document.querySelector('[role="menu"][data-keep-open]')) close(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close]);
  // Changement de route : le panneau ne survit pas à la page où il a été ouvert.
  const openedOn = useRef(pathname);
  useEffect(() => {
    if (pathname !== openedOn.current) close();
    openedOn.current = pathname;
  }, [pathname, close]);

  if (!opened) return null;
  // Carte personnelle : la version VIVANTE (Bedeutung modifiée, D8), pas l'instantané de l'ouverture.
  const live = isPersonalView(opened) ? personalTerms?.find((p) => p.id === opened.id) : undefined;
  const fb = live ? toView(live) : opened;
  const personal = isPersonalView(fb);
  const linkedCases = (cases ?? []).filter((c) => fb.linkedCaseIds.includes(c.id));

  const remove = () => {
    scheduleDeletion(fb.id)
      .then(() => { showToast({ kind: 'deleted', term: fb }); close(); })
      .catch(() => setDeleteError('Impossible de supprimer : réessaie.'));
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px]" onClick={close} />
      <aside className="glass glass-edge fixed right-0 top-0 z-50 flex h-full w-full max-w-sm animate-slide-in flex-col border-y-0 border-r-0">
        <div className="flex items-center justify-between gap-1 border-b border-slate-100 px-4 py-2 dark:border-slate-800">
          <div className="label">{personal ? 'Ma carte' : 'Fachbegriff'}</div>
          <div className="flex items-center gap-1">
            <StarButton term={fb} filled={inDecks?.has(fb.id)} />
            <button type="button" aria-pressed={view === 'card'} onClick={() => { setView((v) => (v === 'card' ? 'sheet' : 'card')); setRevealed(false); }}
              className="btn-ghost min-h-11 px-2 text-sm">{view === 'card' ? 'Fiche' : 'Carte'}</button>
            {personal && (
              <button type="button" aria-label="Supprimer ma carte" onClick={remove} className="btn-ghost h-11 w-11 justify-center text-slate-500 hover:text-rose-600 dark:hover:text-rose-400">
                <Icon name="trash" className="h-5 w-5" title="Supprimer" />
              </button>
            )}
            <button type="button" aria-label="Fermer" onClick={close} className="btn-ghost h-11 w-11 justify-center text-lg">✕</button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {view === 'card' ? (
            <div className="space-y-2">
              <CardFlip card={fb} direction="term2simple" revealed={revealed} onFlip={() => setRevealed(true)} />
              {revealed && <button type="button" onClick={() => setRevealed(false)} className="btn-outline min-h-11 w-full">Recto</button>}
            </div>
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
              <div className="label mb-2">Erscheint in Fällen</div>
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

        <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          <Link to="/fachbegriffe" onClick={close} className="btn-outline w-full">Alle Fachbegriffe →</Link>
        </div>
      </aside>
    </>
  );
}
