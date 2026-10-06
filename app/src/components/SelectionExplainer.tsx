import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { useFachbegriffe, usePersonalTerms, useTermsInDecks } from '@/hooks/useData';
import { useUi } from '@/store/ui';
import { useCaseId } from '@/features/fachbegriffe/CaseContext';
import { lookupTerm } from '@/lib/dictionary';
import { noterTermeCherche } from '@/lib/termesCherches';
import { askBrief, canAskAi, honestAiError, noAiMessage } from '@/lib/onlineAi';
import { cleanSelection, personalTermId, PT_LIMITS } from '@/lib/collections/personalTerms';
import { usePendingDeletions } from '@/lib/collections/pendingDeletion';
import { toView } from '@/lib/collections/allTerms';
import { sentenceOfRange } from '@/lib/sentence';
import { TermSheet } from '@/components/TermSheet';
import { StarButton } from '@/components/StarButton';
import { StarGlyph } from '@/components/StarButton';
import { NewCardSheet, selectionWords, CHIP_THRESHOLD } from '@/components/NewCardSheet';
import { AnimatePresence, appear, expand, m, spring, type Settle } from '@/lib/motion';
import type { Fachbegriff } from '@/db/types';

// ============================================================================
// Quick-search : quand l'utilisateur SÉLECTIONNE un mot, un terme OU une
// phrase (FB2-M2), une petite pilule verre à deux icônes (Expliquer, ★ ;
// libellés au survol sur ordinateur) apparaît près de la sélection (F4b P4).
// « Expliquer » l'ÉTEND en carte verre (glose brève) ; elle se rétracte à la
// fermeture — gestes interruptibles (lib/motion). L'étoile (F4a D4–D6) : un
// terme du glossaire (ou une carte déjà créée) se range comme partout
// (StarButton) ; un mot hors glossaire ouvre la mini-fiche de création
// (NewCardSheet), qui prend la phrase de la sélection pour contexte.
// Déclenchement par `selectionchange` (clavier, souris ET poignées tactiles)
// + `pointerup` (souris/tactile), anti-rebond 250 ms. « Voir plus → » ouvre
// Doctopus complet avec le terme pré-rempli. `data-keep-open` : les couches
// flottantes (decks, mini-fiche, confirmation) ne referment pas la bulle.
// ============================================================================

interface Anchor { text: string; sentence: string; x: number; y: number; bottom: number }
// ponytail : hauteurs estimées (pilule 48 px ; bulle réponse, taille
// variable, plafond prudent) plutôt qu'une mesure DOM réelle avant premier
// rendu — si une bulle très longue déborde encore en haut, mesurer via ref.
const PILL_H = 48;
const BUBBLE_H = 260;
const GUTTER = 16;
// Libellé au survol (souris seulement) : la pilule reste deux icônes.
const tip = (label: string) => (
  <span aria-hidden className="panel pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium text-slate-700 opacity-0 transition-opacity dark:text-slate-200 [@media(hover:hover)]:group-hover:opacity-100">{label}</span>
);
type Bubble = { loading: boolean; text?: string; error?: string; source?: 'glossaire' | 'IA'; fb?: Fachbegriff };

export function SelectionExplainer() {
  const begriffe = useFachbegriffe() ?? [];
  const openDoctopus = useUi((s) => s.openDoctopus);
  const personalTerms = usePersonalTerms();
  const inDecks = useTermsInDecks();
  const pendingDeletions = usePendingDeletions((s) => s.ids);
  const caseId = useCaseId() ?? undefined;
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [newCard, setNewCard] = useState<{ selection: string; sentence: string; at: { x: number; bottom: number } } | null>(null);
  const [settle, setSettle] = useState<Settle | undefined>(undefined);   // « se poser » (P8) : lu par la sortie de la carte
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<Anchor | null>(null);
  useEffect(() => { anchorRef.current = anchor; }, [anchor]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const read = () => {
      const seldom = window.getSelection();
      const text = seldom?.toString().replace(/\s+/g, ' ').trim() ?? '';
      if (!text || text.length < 2 || text.length > 220) return;
      const node = seldom?.anchorNode?.parentElement;
      if (node?.closest('input, textarea, [contenteditable="true"]')) return;
      if (rootRef.current && node && rootRef.current.contains(node)) return;
      if (node?.closest('[data-keep-open]')) return;
      try {
        const rect = seldom!.getRangeAt(0).getBoundingClientRect();
        if (!rect.width && !rect.height) return;
        const x = rect.left + rect.width / 2;
        const y = rect.top;
        // Même sélection qu'avant, au même endroit (ex. focus/tap sur un bouton relance
        // selectionchange sans que l'utilisateur ait resélectionné) : ne pas effacer
        // bulle/confirmation. Texte identique mais rect différent (ex. re-sélection au
        // clavier ailleurs dans la page) → nouvelle ancre, la bulle se déplace.
        if (anchorRef.current?.text === text && anchorRef.current.x === x && anchorRef.current.y === y) return;
        setAnchor({ text, sentence: sentenceOfRange(seldom!.getRangeAt(0)), x, y, bottom: rect.bottom });
        setBubble(null);
      } catch { /* sélection vide */ }
    };
    // selectionchange : clavier, souris ET poignées tactiles (mobile) ; anti-rebond 250 ms.
    const onSelChange = () => { clearTimeout(timer); timer = setTimeout(read, 250); };
    const onPointerUp = (e: PointerEvent) => {
      if (rootRef.current && e.target instanceof Node && rootRef.current.contains(e.target)) return;
      if (e.target instanceof Element && e.target.closest('[data-keep-open]')) return;
      clearTimeout(timer); timer = setTimeout(read, 10);
    };
    const onScroll = () => { setAnchor(null); setBubble(null); };
    document.addEventListener('selectionchange', onSelChange);
    document.addEventListener('pointerup', onPointerUp);
    window.addEventListener('scroll', onScroll, true);
    return () => { clearTimeout(timer); document.removeEventListener('selectionchange', onSelChange); document.removeEventListener('pointerup', onPointerUp); window.removeEventListener('scroll', onScroll, true); };
  }, []);

  // Fermer si on clique/touche ailleurs.
  useEffect(() => {
    if (!anchor) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && e.target instanceof Node && rootRef.current.contains(e.target)) return;
      if (e.target instanceof Element && e.target.closest('[data-keep-open]')) return;
      setAnchor(null); setBubble(null);
    };
    // Échap ferme la pilule / la carte (le tiroir d'un terme, dessous, l'ignore : `data-selection-pill`).
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (cardRef.current?.contains(document.activeElement)) document.querySelector<HTMLElement>('main')?.focus();   // le focus ne tombe pas sur <body> (G1-30)
      setAnchor(null); setBubble(null);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onDown); document.removeEventListener('keydown', onKey); };
  }, [anchor]);
  // « Expliquer » : le focus suit la carte qui remplace la pilule (G1-21).
  const hasBubble = !!bubble;
  useEffect(() => { if (hasBubble) cardRef.current?.focus(); }, [hasBubble]);

  const hit = anchor ? lookupTerm(anchor.text, begriffe) : null;
  const clean = anchor ? cleanSelection(anchor.text) : '';
  const chips = !!anchor && selectionWords(anchor.text).length > CHIP_THRESHOLD;
  // Une carte en attente de suppression (D10) ne compte pas comme « connue » :
  // la bulle repasse par la mini-fiche, dont createPersonalTerm annule la
  // suppression (`restored`) et conserve la Bedeutung modifiée (revue I3).
  const existing = !hit && clean ? personalTerms?.find((p) => p.id === personalTermId(clean) && !pendingDeletions.has(p.id)) : undefined;
  const known: Fachbegriff | null = hit ?? (existing ? toView(existing) : null);
  const canCreate = !!clean && (chips || clean.length <= PT_LIMITS.term);
  const openNewCard = () => {
    if (!anchor) return;
    setNewCard({ selection: anchor.text, sentence: anchor.sentence, at: { x: anchor.x, bottom: anchor.bottom } });
    setAnchor(null); setBubble(null);
  };

  const explain = async () => {
    if (!anchor) return;
    const term = anchor.text;
    // S4-6 : demander le sens d'un mot est LE geste « terme cherché » (local, jamais synchronisé ; l'Historique le lit).
    void noterTermeCherche(term).catch((e) => console.warn('[termes cherchés]', e));
    // 1) Glossaire local (correspondance exacte ou fléchie proche, jamais floue — FB2-M3).
    const h = lookupTerm(term, begriffe);
    if (h) {
      setBubble({ loading: false, source: 'glossaire', text: h.term, fb: h });
      return;
    }
    // 2) IA brève (serveur d'abord, clé navigateur en repli).
    if (!canAskAi()) {
      setBubble({ loading: false, error: noAiMessage() });
      return;
    }
    setBubble({ loading: true });
    try { setBubble({ loading: false, source: 'IA', text: await askBrief(term) }); }
    catch (e) { setBubble({ loading: false, error: honestAiError(e) }); }
  };

  const sheet = (
    <AnimatePresence custom={settle}>
      {newCard && <NewCardSheet key={newCard.selection + newCard.sentence} selection={newCard.selection} sentence={newCard.sentence} caseId={caseId} at={newCard.at}
        onClose={(to) => {
          setSettle(to); setNewCard(null);
          // Fermée sans créer : le focus revient au contenu (la pilule, créée, prend le sien — CardToast).
          if (!to) document.querySelector<HTMLElement>('main')?.focus();
        }} />}
    </AnimatePresence>
  );
  // Pas assez de place au-dessus (pilule ou bulle) : bascule sous la sélection
  // plutôt que de partir hors écran (bug B1). Demi-largeurs (pilule 94 px,
  // bulle w-64) pour un clamp horizontal à 16 px du bord.
  const contentH = bubble ? BUBBLE_H : PILL_H;
  const flipBelow = !!anchor && anchor.y - contentH - 8 < 8;
  const top = !anchor ? 0 : flipBelow ? anchor.bottom + 8 : Math.max(8, anchor.y - 8);
  const halfWidth = bubble ? 128 : 48;
  const left = !anchor ? 0 : Math.min(Math.max(anchor.x, halfWidth + GUTTER), window.innerWidth - halfWidth - GUTTER);
  const star = known
    ? <StarButton term={known} filled={inDecks?.has(known.id)} caseId={caseId} />
    : (
      <button type="button" onClick={openNewCard} disabled={!canCreate} aria-label={`Nouvelle carte : ${clean}`}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-white/40 hover:text-slate-700 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/10"><StarGlyph filled={false} /></button>
    );
  const starTip = !known ? 'Nouvelle carte' : inDecks?.has(known.id) ? 'Voir la fiche' : 'Ranger dans Favoris';
  return (
    <>
    {sheet}
    <AnimatePresence>
      {anchor && (
        // Position (left/top) sur le calque animé ; le centrage (translate) sur l'enfant :
        // l'origine du geste (0 0) tombe ainsi pile sur l'ancre de la sélection.
        <m.div key="selection" ref={rootRef} data-selection-pill className="fixed z-[80]" style={{ left, top, transformOrigin: '0 0' }}
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={spring}>
          <div data-anchor-box style={{ transform: flipBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)' }}
            className={`grid justify-items-center ${flipBelow ? 'items-start' : 'items-end'}`}>
            <AnimatePresence initial={false}>
              {!bubble ? (
                <m.div key="pill" {...appear} data-pill role="toolbar" aria-label="Sélection" className="glass-thin flex items-center gap-0.5 rounded-full p-0.5 [grid-area:1/1]">
                  <button type="button" aria-label="Expliquer" onClick={() => { void explain(); }}
                    className="group relative grid h-11 w-11 place-items-center rounded-full text-brand-700 hover:bg-white/40 dark:text-brand-300 dark:hover:bg-white/10">
                    <Icon name="search" className="h-4 w-4" />{tip('Expliquer')}
                  </button>
                  <span className="group relative">{star}{tip(starTip)}</span>
                </m.div>
              ) : (
                <m.div key="card" ref={cardRef} tabIndex={-1} role="group" aria-label={`Explication : ${anchor.text}`} data-explain-card {...expand} style={{ transformOrigin: flipBelow ? 'top center' : 'bottom center' }}
                  className="glass-full flex w-64 items-start gap-1.5 rounded-2xl p-2.5 text-[13px] [grid-area:1/1]">
                  {!bubble.loading && !bubble.error && <div className="-m-0.5 -mt-1">{star}</div>}
                  <div aria-live="polite" className="min-w-0 flex-1">
                    {bubble.loading ? (
                      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400"><span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" /> Doctopus cherche…</div>
                    ) : bubble.error ? (
                      <div role="alert" className="text-[12px] text-amber-700 dark:text-amber-400">{bubble.error}</div>
                    ) : (
                      <>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">« {anchor.text} »</span>
                          <span className="chip py-0 text-[9px] text-slate-500 dark:text-slate-400">{bubble.source}</span>
                        </div>
                        {bubble.fb ? <TermSheet term={bubble.fb} compact /> : <div className="leading-snug text-slate-700 dark:text-slate-200">{bubble.text}</div>}
                      </>
                    )}
                    <button onClick={() => { openDoctopus(anchor.text); setAnchor(null); setBubble(null); }}
                      className="mt-1.5 min-h-11 w-full rounded-full text-[12px] font-medium text-brand-700 hover:bg-white/40 dark:text-brand-300 dark:hover:bg-white/10">
                      Voir plus avec Doctopus →
                    </button>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </m.div>
      )}
    </AnimatePresence>
    </>
  );
}
