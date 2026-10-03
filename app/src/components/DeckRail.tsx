// ============================================================================
// Decks d'UN terme en « pages de livre » (F4b P6, E5 — maquette validée le
// 30 sept.). Ordinateur : chaque deck (Favoris + manuels) est une page verre
// sur toute la hauteur du tiroir, collée à son bord gauche ; les pages
// s'empilent vers la gauche comme la tranche d'un livre (Favoris contre le
// panneau). ≤ 3 decks : tranche de 32 px, nom vertical ; au-delà : tranches
// condensées (livre borné à ~160 px), nom masqué sauf page rangée. Survol /
// focus clavier : la page s'écarte (40 px) et celles de gauche glissent.
// Téléphone : la même chose tournée de 90° — bandes empilées vers le HAUT
// au-dessus de l'en-tête, noms toujours visibles (pas de survol au doigt).
// Toucher = ranger / retirer ; clic droit, appui long, Menu ou Maj+F10 sur un
// deck manuel = menu Renommer / Supprimer (suppression différée + Annuler).
// « + » (le plus à gauche) ouvre la gestion — seule entrée de création.
// Mouvement : UNIQUEMENT des translations (positions calculées ici, pages
// absolues de largeur fixe) au ressort partagé ; rien ne reflue au survol.
// ============================================================================
import { memo, useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { FAVORITES_DECK_ID } from '@/db/types';
import { useDecks, useDeckTerms, useFavorites } from '@/hooks/useData';
import { addTermToDeck, removeTermFromDeck, renameDeck } from '@/lib/collections';
import { decksOfTerm } from '@/lib/collections/query';
import { scheduleDeletion } from '@/lib/collections/pendingDeletion';
import { AnimatePresence, expand, m, spring } from '@/lib/motion';
import { trapFocus } from '@/lib/trapFocus';
import { useCardToast } from '@/store/cardToast';

type Axis = 'x' | 'y';   // x : pages côte à côte (ordinateur) ; y : bandes empilées (téléphone)
const PAGE = 56;          // largeur (ou hauteur) FIXE d'une page : 40 px de tranche ouverte + 16 px sous sa voisine
const OPEN = 40, NAMED = 32, RANGED = 20, PLUS = 24, BAND = 24, BOOK = 160, PHONE_MAX = 120;

/** Tranche visible de chaque page (decks puis « + »), en px. */
export function tranches(ranged: boolean[], axis: Axis, open: number | null): number[] {
  const n = ranged.length;
  let t: number[];
  if (axis === 'y') t = ranged.map(() => (n > 3 ? BAND : NAMED));
  else if (n <= 3) t = ranged.map(() => NAMED);
  else {
    const r = ranged.filter(Boolean).length;
    const tc = Math.max(8, Math.min(14, Math.floor((BOOK - PLUS - RANGED * r) / Math.max(1, n - r))));
    t = ranged.map((on) => (on ? Math.max(RANGED, tc) : tc));
  }
  if (axis === 'x' && open !== null && open < n) t[open] = OPEN;
  return [...t, PLUS];
}
const cumulate = (t: number[]) => { let s = 0; return t.map((v) => (s += v)); };

const DESKTOP = '(min-width: 768px)';
const subscribe = (cb: () => void) => {
  const q = window.matchMedia?.(DESKTOP);
  q?.addEventListener?.('change', cb);
  return () => q?.removeEventListener?.('change', cb);
};
const useAxis = (): Axis => useSyncExternalStore(subscribe, () => ((window.matchMedia?.(DESKTOP).matches ?? true) ? 'x' : 'y'));
const focusVisible = (el: Element) => { try { return el.matches(':focus-visible'); } catch { return true; } };

type Act = 'toggle' | 'menu' | 'manage' | 'hover' | 'focus' | 'blur';
interface PageProps {
  i: number; id: string; name: string; kind: 'favorites' | 'manual' | 'plus'; axis: Axis;
  edge: number; t: number; z: number; named: boolean; open: boolean; ranged: boolean; busy: boolean; tabbable: boolean;
  act: (a: Act, i: number, y?: number) => void;
}

/** Une page. Mémoïsée : survoler une page ne re-rend qu'elle et ses voisines qui glissent. */
const Page = memo(function Page({ i, id, name, kind, axis, edge, t, z, named, open, ranged, busy, tabbable, act }: PageProps) {
  const press = useRef<{ timer?: ReturnType<typeof setTimeout>; fired: boolean }>({ fired: false });
  useEffect(() => () => clearTimeout(press.current.timer), []);
  const plus = kind === 'plus';
  // Position : la page est ancrée au bord du panneau et TRANSLATÉE pour que sa tranche finisse à `edge`.
  const pos = PAGE - edge;
  const at = axis === 'x' ? { x: pos } : { y: pos };
  const hidden = axis === 'x' ? { x: pos + t } : { y: pos + t };   // largeur 0 : cachée sous sa voisine
  const tone = ranged
    ? 'bg-brand-50/80 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
    : plus ? 'border-dashed border-slate-400/80 bg-transparent text-slate-600 dark:border-white/30 dark:text-slate-300' : 'text-slate-700 dark:text-slate-200';
  // Tranche lisible sur l'empilement de verre : un filet d'encre (clair) / de lumière (sombre), jamais une ombre.
  const shape = axis === 'x' ? 'inset-y-0 right-0 w-14 rounded-l-2xl' : 'inset-x-0 bottom-0 h-14 rounded-t-2xl';
  const edgeLine = plus ? '' : axis === 'x' ? 'border-l-slate-900/15 dark:border-l-white/20' : 'border-t-slate-900/15 dark:border-t-white/20';
  // Nom centré dans la tranche visible (vertical, lu de bas en haut / horizontal au téléphone).
  const label = axis === 'x'
    ? { box: 'left-0 top-16 flex w-10 flex-col items-center gap-1', move: { x: (t - OPEN) / 2 }, text: '[writing-mode:vertical-rl] rotate-180 max-h-[calc(100dvh-8rem)] truncate' }
    : { box: 'left-4 right-4 top-0 flex h-5 items-center', move: { y: (t - 20) / 2 }, text: 'truncate' };
  return (
    <m.button type="button" data-page data-index={i} data-page-id={id} data-offset={edge} data-tranche={t}
      data-open={open} data-named={named} tabIndex={tabbable ? 0 : -1} style={{ zIndex: z }}
      initial={hidden} animate={at} exit={hidden} transition={spring}
      aria-pressed={plus ? undefined : ranged} aria-disabled={busy || undefined}
      aria-description={plus ? 'Créer, renommer ou supprimer un deck' : `${ranged ? 'Retirer de' : 'Ranger dans'} ${name}`}
      aria-label={plus ? 'Gérer les decks' : undefined} aria-haspopup={plus ? 'dialog' : undefined}
      className={`deck-page ${plus ? '' : 'glass-full'} pointer-events-auto absolute border text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 aria-disabled:cursor-progress ${shape} ${edgeLine} ${tone}`}
      onClick={() => { if (press.current.fired) { press.current.fired = false; return; } act(plus ? 'manage' : 'toggle', i); }}
      onContextMenu={(e) => { if (plus) return; e.preventDefault(); act('menu', i, e.clientY); }}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') act('hover', i); }}
      onFocus={(e) => act(focusVisible(e.currentTarget) ? 'focus' : 'blur', i)}
      onBlur={() => act('blur', i)}
      onPointerDown={(e) => {
        if (plus || kind === 'favorites' || e.pointerType === 'mouse') return;
        press.current.fired = false; clearTimeout(press.current.timer);
        const y = e.clientY;
        press.current.timer = setTimeout(() => { press.current.fired = true; act('menu', i, y); }, 500);
      }}
      onPointerUp={() => clearTimeout(press.current.timer)} onPointerCancel={() => clearTimeout(press.current.timer)}
      onPointerLeave={() => clearTimeout(press.current.timer)}>
      {plus ? (
        <span aria-hidden className={`absolute text-base ${axis === 'x' ? 'left-0 top-16 w-6 text-center' : 'left-4 top-0 leading-6'}`}>+</span>
      ) : (
        <m.span className={`pointer-events-none absolute ${label.box}`} initial={false} animate={{ opacity: named ? 1 : 0, ...label.move }} transition={spring}>
          {/* ✓ debout, au-dessus du nom vertical (tourné, il se lirait comme un chevron). */}
          {axis === 'x' ? (<>{ranged && <span aria-hidden>✓</span>}<span className={label.text}>{name}</span></>)
            : <span className={label.text}>{name}{ranged && <span aria-hidden> ✓</span>}</span>}
        </m.span>
      )}
    </m.button>
  );
});

/** Menu d'un deck manuel : Renommer (champ en place) / Supprimer (différé, Annuler). Échap ne ferme que lui. */
function DeckMenu({ deck, style, onClose }: { deck: { id: string; name: string }; style: React.CSSProperties; onClose: (refocus: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const show = useCardToast((s) => s.show);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(deck.name);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const outside = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) closeRef.current(false); };
    document.addEventListener('pointerdown', outside, true);
    return () => document.removeEventListener('pointerdown', outside, true);
  }, []);
  const commit = () => {
    if (name.trim() === deck.name) { onClose(true); return; }
    renameDeck(deck.id, name).then(() => onClose(true))
      .catch((e: unknown) => setError(e instanceof Error && e.message === 'deck_name' ? 'Nom : 1 à 40 caractères.' : 'Impossible de renommer.'));
  };
  const remove = () => {
    scheduleDeletion(deck.id, undefined, 'deck')
      .then(() => { onClose(false); show({ kind: 'deck-deleted', deckId: deck.id, name: deck.name }, { focus: true }); })
      .catch(() => setError('Impossible de supprimer : réessaie.'));
  };
  const item = 'flex min-h-11 w-full items-center rounded-xl px-3 text-left text-sm hover:bg-white/50 focus-visible:bg-white/50 outline-none dark:hover:bg-white/10 dark:focus-visible:bg-white/10';
  return (
    <m.div ref={ref} role="menu" aria-label={`Deck ${deck.name}`} data-keep-open {...expand} style={{ ...style, transformOrigin: 'right top' }}
      className="glass-full absolute z-20 w-52 rounded-2xl p-1"
      onKeyDown={(e) => {
        if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); onClose(true); return; }
        if (e.key === 'Tab') { trapFocus(e, ref.current); e.stopPropagation(); return; }
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          const items = [...(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
          if (!items.length) return;
          e.preventDefault();
          const at = items.indexOf(document.activeElement as HTMLElement);
          items[(at + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus();
        }
      }}>
      {renaming ? (
        <input aria-label="Nouveau nom" value={name} maxLength={40} autoFocus onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
          className="min-h-11 w-full border-b border-slate-300 bg-transparent px-3 text-sm focus:border-brand-500 dark:border-white/20" />
      ) : (<>
        <button type="button" role="menuitem" className={item} onClick={() => setRenaming(true)}>Renommer</button>
        <button type="button" role="menuitem" className={`${item} text-rose-700 dark:text-rose-300`} onClick={remove}>Supprimer</button>
      </>)}
      {error && <p role="alert" className="px-3 py-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </m.div>
  );
}

export function DeckRail({ termId, caseId, onManage }: { termId: string; caseId?: string; onManage: () => void }) {
  // useDecks()/useDeckTerms()/useFavorites() filtrent déjà les decks en attente de suppression.
  const decks = useDecks(); const deckTerms = useDeckTerms(); const favorites = useFavorites();
  const axis = useAxis();
  const [busy, setBusy] = useState<ReadonlySet<string>>(new Set());   // affichage (aria-disabled)
  const lock = useRef(new Set<string>());                               // verrou immédiat, par page
  const [error, setError] = useState<string | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [kbdOpen, setKbdOpen] = useState<number | null>(null);
  const [roving, setRoving] = useState(0);
  const [menu, setMenu] = useState<{ i: number; y: number | null } | null>(null);
  const groupRef = useRef<HTMLDivElement>(null);

  const has = new Set(decks && deckTerms && favorites ? decksOfTerm(termId, favorites, deckTerms) : []);
  const rows = [{ id: FAVORITES_DECK_ID, name: 'Favoris', kind: 'favorites' as const },
    ...(decks ?? []).filter((d) => d.kind === 'manual').sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((d) => ({ id: d.id, name: d.name, kind: 'manual' as const }))];
  const ranged = rows.map((r) => has.has(r.id));
  const open = axis === 'x' ? (hover ?? kbdOpen) : null;
  const t = tranches(ranged, axis, open);
  const edges = cumulate(t);
  const base = tranches(ranged, axis, null).reduce((a, b) => a + b, 0);   // taille au repos : ne change pas au survol
  const condensed = rows.length > 3;
  const count = rows.length + 1;
  const focusPage = (i: number) => groupRef.current?.querySelector<HTMLElement>(`[data-index="${i}"]`)?.focus();

  // Un seul rappel STABLE pour toutes les pages (memo) : il lit l'état courant par ref.
  const latest = useRef<(a: Act, i: number, y?: number) => void>(() => {});
  latest.current = (a, i, y) => {
    const row = rows[i];
    if (a === 'hover') setHover(i);
    else if (a === 'focus') { setRoving(i); setKbdOpen(i); }
    else if (a === 'blur') { setRoving(i); setKbdOpen((k) => (k === i ? null : k)); }
    else if (a === 'manage') onManage();
    else if (a === 'menu') { if (row?.kind === 'manual') setMenu({ i, y: y ?? null }); }
    else if (a === 'toggle' && row) void toggle(row.id);
  };
  const act = useCallback((a: Act, i: number, y?: number) => latest.current(a, i, y), []);
  const opts = caseId ? { caseId } : {};
  const toggle = async (id: string) => {
    if (lock.current.has(id)) return;
    lock.current.add(id); setBusy((b) => new Set(b).add(id)); setError(null);
    try { await (has.has(id) ? removeTermFromDeck(id, termId) : addTermToDeck(id, termId, opts)); }
    catch { setError('Impossible de ranger : réessaie.'); }
    finally { lock.current.delete(id); setBusy((b) => { const n = new Set(b); n.delete(id); return n; }); }
  };

  if (!decks || !deckTerms || !favorites) return null;   // états inconnus : rien à toucher

  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = Number((e.target as HTMLElement).closest('[data-page]')?.getAttribute('data-index'));
    if (Number.isNaN(i)) return;
    if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) { e.preventDefault(); act('menu', i); return; }
    // Suivante = plus loin du panneau : à gauche (ordinateur), en haut (téléphone) ; les deux paires marchent.
    const next = axis === 'x' ? ['ArrowDown', 'ArrowLeft'] : ['ArrowRight', 'ArrowUp'];
    const prev = axis === 'x' ? ['ArrowUp', 'ArrowRight'] : ['ArrowLeft', 'ArrowDown'];
    const to = next.includes(e.key) ? i + 1 : prev.includes(e.key) ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? count - 1 : null;
    if (to === null) return;
    e.preventDefault();
    const j = Math.max(0, Math.min(count - 1, to));
    setRoving(j); focusPage(j);
  };
  const closeMenu = (refocus: boolean) => { const i = menu?.i; setMenu(null); if (refocus && i !== undefined) focusPage(i); };

  const pages = [...rows, { id: 'plus', name: '', kind: 'plus' as const }].map((r, i) => (
    <Page key={r.id} i={i} id={r.id} name={r.name} kind={r.kind} axis={axis} edge={edges[i]} t={t[i]} z={count - i}
      named={axis === 'y' || !condensed || ranged[i] || open === i} open={open === i} ranged={!!ranged[i]}
      busy={busy.has(r.id)} tabbable={Math.min(roving, count - 1) === i} act={act} />
  ));
  const menuDeck = menu && rows[menu.i]?.kind === 'manual' ? rows[menu.i] : null;
  const top = groupRef.current?.getBoundingClientRect().top ?? 0;
  const menuStyle: React.CSSProperties = axis === 'x'
    ? { right: (menu ? edges[menu.i] : 0) + 8, top: Math.max(8, (menu?.y ?? top + 64) - top - 22) }
    : { left: 16, top: '100%' };
  return (
    <div className={axis === 'x' ? 'absolute inset-y-0 right-full w-0' : 'relative z-10 shrink-0'}>
      <div ref={groupRef} role="group" aria-label="Decks de ce terme" data-axis={axis} data-condensed={condensed}
        onKeyDown={onKeyDown} onPointerLeave={() => setHover(null)}
        className={axis === 'x'
          ? 'deck-book pointer-events-none absolute inset-y-0 right-0 overflow-hidden'
          : 'deck-book flex flex-col-reverse overflow-y-auto overscroll-contain pt-2'}
        style={axis === 'x' ? { width: base + OPEN } : { maxHeight: PHONE_MAX }}>
        {axis === 'x' ? (
          <AnimatePresence initial={false}>{pages}</AnimatePresence>
        ) : (
          <div className="relative w-full shrink-0 overflow-hidden" style={{ height: base }}>
            <AnimatePresence initial={false}>{pages}</AnimatePresence>
          </div>
        )}
      </div>
      <AnimatePresence>
        {menuDeck && <DeckMenu key={menuDeck.id} deck={menuDeck} style={menuStyle} onClose={closeMenu} />}
      </AnimatePresence>
      {error && (
        <p role="alert" style={axis === 'x' ? { right: base + 8 } : undefined}
          className={axis === 'x' ? 'glass-full absolute bottom-4 w-40 rounded-xl px-2 py-1 text-right text-xs text-rose-700 dark:text-rose-300' : 'px-4 py-1 text-xs text-rose-700 dark:text-rose-300'}>{error}</p>
      )}
    </div>
  );
}
