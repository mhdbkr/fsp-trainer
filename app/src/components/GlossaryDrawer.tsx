import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUi } from '@/store/ui';
import { useCases, useFavorites, useDecks, useDeckTerms } from '@/hooks/useData';
import { toggleFavorite, addToDeck, removeFromDeck, createDeck } from '@/lib/collections';
import { deletePersonalTerm } from '@/lib/collections/personalTerms';
import { isPersonalView, type PersonalTermView } from '@/lib/collections/allTerms';
import { SRS_TONE } from '@/lib/srsTone';
import { TermRegister } from './TermRegister';

// Panneau latéral d'aperçu d'un Fachbegriff (ouvert au clic sur un terme
// auto-linké). Montre traduction, prononciation, définition, et les cas liés
// — matérialise l'interconnexion : depuis un terme, on voit où il apparaît.
export function GlossaryDrawer() {
  const fb = useUi((s) => s.glossaryTerm);
  const close = useUi((s) => s.closeGlossary);
  const closeHover = useUi((s) => s.closeHover);
  const { pathname } = useLocation();
  const cases = useCases();
  const favorites = useFavorites();
  const decks = useDecks();
  const deckTerms = useDeckTerms();
  const [menu, setMenu] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  useEffect(() => { setConfirmDelete(false); setDeleteError(null); }, [fb?.id]);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) { setMenu(false); setCreating(false); }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMenu(false); setCreating(false); menuTriggerRef.current?.focus(); }
    };
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menu]);

  // Ouverture : la hover-card ★ cède la place (une seule carte à l'écran).
  // Échap ferme le panneau lui-même (pas seulement le sous-menu deck).
  const open = !!fb;
  useEffect(() => { if (open) closeHover(); }, [open, closeHover]);
  useEffect(() => {
    if (!open || menu) return; // menu ouvert : Échap ne ferme que le menu (effet ci-dessus)
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, menu, close]);
  // Changement de route : le panneau ne survit pas à la page où il a été ouvert
  // (revue UX F2b : fond invisible qui avalait les clics de la page suivante).
  const openedOn = useRef(pathname);
  useEffect(() => {
    if (pathname !== openedOn.current) close();
    openedOn.current = pathname;
  }, [pathname, close]);

  if (!fb) return null;

  const linkedCases = (cases ?? []).filter((c) => fb.linkedCaseIds.includes(c.id));
  const fav = !!favorites?.some((f) => f.termId === fb.id);
  const manual = (decks ?? []).filter((d) => d.kind === 'manual');
  const personal = isPersonalView(fb);
  const inDeck = (id: string) => !!deckTerms?.some((t) => t.deckId === id && t.termId === fb.id);

  const submitNewDeck = async () => {
    const name = newDeckName.trim();
    if (!name) return;
    try {
      const id = await createDeck(name, 'manual');
      await addToDeck(id, fb.id);
      setNewDeckName('');
      setCreateError(null);
      setCreating(false);
      setMenu(false);
    } catch (err) {
      setCreateError(err instanceof Error && err.message === 'deck_name' ? 'Nom : 1 à 40 caractères.' : 'Impossible de créer le deck.');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-[1px]" onClick={close} />
      <aside className="glass glass-edge fixed right-0 top-0 z-50 flex h-full w-full max-w-sm animate-slide-in flex-col border-y-0 border-r-0">
        <div className="flex items-start justify-between border-b border-slate-100 p-4 dark:border-slate-800">
          <div>
            <div className="label">Fachbegriff</div>
            <h3 className="text-lg font-bold text-brand-700 dark:text-brand-300">{fb.term}</h3>
            {fb.pronunciation && <p className="text-sm text-slate-400">/{fb.pronunciation}/</p>}
          </div>
          <div className="flex items-center gap-1">
            <button type="button" aria-label={fav ? `Retirer des favoris : ${fb.term}` : `Ajouter aux favoris : ${fb.term}`} aria-pressed={fav} onClick={() => { void toggleFavorite(fb.id); }}
              className={`h-11 w-11 text-xl ${fav ? 'text-signal-600' : 'text-slate-300 hover:text-signal-400 dark:text-slate-600'}`}>{fav ? '★' : '☆'}</button>
            <div className="relative" ref={menuRef}>
              <button ref={menuTriggerRef} type="button" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu((m) => !m)} className="btn-ghost h-11 px-2 text-sm">Ajouter à un deck…</button>
              {menu && (
                <div role="menu" className="absolute right-0 z-10 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  {manual.length === 0 && <p className="px-2 py-1.5 text-xs text-slate-500">Aucune liste. Crée-en une :</p>}
                  {manual.map((d) => (
                    <button key={d.id} role="menuitemcheckbox" aria-checked={inDeck(d.id)} onClick={() => { void (inDeck(d.id) ? removeFromDeck(d.id, fb.id) : addToDeck(d.id, fb.id)); setMenu(false); setCreating(false); }}
                      className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/10">{d.name}<span>{inDeck(d.id) ? '✓' : ''}</span></button>
                  ))}
                  {creating ? (
                    <div className="mt-1 border-t border-slate-100 p-1 dark:border-slate-800">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          aria-label="Nom du nouveau deck"
                          value={newDeckName}
                          onChange={(e) => setNewDeckName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { void submitNewDeck(); } }}
                          autoFocus
                          maxLength={40}
                          className="h-11 flex-1 rounded-lg border border-slate-200 bg-transparent px-2 text-sm dark:border-slate-700"
                        />
                        <button type="button" onClick={() => { void submitNewDeck(); }} className="btn-outline h-11 px-3 text-sm">Créer</button>
                      </div>
                      {createError && <p role="alert" className="mt-1 px-1 text-xs text-signal-600 dark:text-signal-400">{createError}</p>}
                    </div>
                  ) : (
                    <button type="button" role="menuitem" onClick={() => setCreating(true)}
                      className="mt-1 w-full rounded-lg border-t border-slate-100 px-2 py-1.5 text-left text-sm text-brand-600 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-white/10">+ Nouveau deck</button>
                  )}
                </div>
              )}
            </div>
            <button onClick={close} className="btn-ghost -mr-2 -mt-1 text-lg">✕</button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div>
            <div className="label mb-1">Bedeutung (patientengerecht)</div>
            <TermRegister term={fb} />
          </div>

          {fb.definitionDetailed && (
            <div>
              <div className="label mb-1">Definition</div>
              <p className="text-sm text-slate-600 dark:text-slate-300">{fb.definitionDetailed}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">{fb.specialty}</span>
            <span className={`chip ${SRS_TONE[fb.srs.state].chip}`}>{fb.srs.state}</span>
          </div>

          {linkedCases.length > 0 && (
            <div>
              <div className="label mb-2">Erscheint in Fällen</div>
              <div className="space-y-1.5">
                {linkedCases.map((c) => (
                  <Link key={c.id} to={`/cas/${c.id}`} onClick={close} className="block rounded-lg border border-slate-200 px-3 py-2 text-sm hover:border-brand-400 hover:bg-brand-50 dark:border-slate-800 dark:hover:bg-brand-900/20">
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {personal && (
            <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
              {(fb as PersonalTermView).context && <p className="mb-2 text-xs italic text-slate-500">« {(fb as PersonalTermView).context} »</p>}
              {!confirmDelete ? (
                <button type="button" onClick={() => setConfirmDelete(true)} className="min-h-11 text-sm text-rose-600 dark:text-rose-400">Supprimer ma carte</button>
              ) : (
                <div className="flex gap-2">
                  <button type="button" onClick={() => { deletePersonalTerm(fb.id).then(close).catch(() => setDeleteError('Impossible de supprimer : réessaie.')); }} className="btn-primary min-h-11 bg-rose-600">Confirmer la suppression</button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="btn-outline min-h-11">Annuler</button>
                </div>
              )}
              {deleteError && <p role="alert" className="mt-2 text-xs text-signal-600 dark:text-signal-400">{deleteError}</p>}
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
