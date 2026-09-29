import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { useFachbegriffe, usePersonalTerms, useTermsInDecks } from '@/hooks/useData';
import { useUi } from '@/store/ui';
import { useCaseId } from '@/features/fachbegriffe/CaseContext';
import { lookupTerm } from '@/lib/dictionary';
import { askBrief, canAskAi, honestAiError, noAiMessage } from '@/lib/onlineAi';
import { cleanSelection, personalTermId, PT_LIMITS } from '@/lib/collections/personalTerms';
import { usePendingDeletions } from '@/lib/collections/pendingDeletion';
import { toView } from '@/lib/collections/allTerms';
import { sentenceOfRange } from '@/lib/sentence';
import { TermSheet } from '@/components/TermSheet';
import { StarButton } from '@/components/StarButton';
import { NewCardSheet, selectionWords, CHIP_THRESHOLD } from '@/components/NewCardSheet';
import type { Fachbegriff } from '@/db/types';

// ============================================================================
// Quick-search : quand l'utilisateur SÉLECTIONNE un mot, un terme OU une
// phrase (FB2-M2), une pastille apparaît près de la sélection. Au clic sur
// « Expliquer », une bulle donne une glose brève. L'étoile (F4a D4–D6) : un
// terme du glossaire (ou une carte déjà créée) se range comme partout
// (StarButton) ; un mot hors glossaire ouvre la mini-fiche de création
// (NewCardSheet), qui prend la phrase de la sélection pour contexte.
// Déclenchement par `selectionchange` (clavier, souris ET poignées tactiles)
// + `pointerup` (souris/tactile), anti-rebond 250 ms. « Voir plus → » ouvre
// Doctopus complet avec le terme pré-rempli. `data-keep-open` : les couches
// flottantes (decks, mini-fiche, confirmation) ne referment pas la bulle.
// ============================================================================

interface Anchor { text: string; sentence: string; x: number; y: number; bottom: number }
// ponytail : hauteurs estimées (pastille mesurée ~48px ; bulle réponse, taille
// variable, plafond prudent) plutôt qu'une mesure DOM réelle avant premier
// rendu — si une bulle très longue déborde encore en haut, mesurer via ref.
const PILL_H = 48;
const BUBBLE_H = 260;
const GUTTER = 16;
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
  const [newCard, setNewCard] = useState<{ selection: string; sentence: string } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
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
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [anchor]);

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
    setNewCard({ selection: anchor.text, sentence: anchor.sentence });
    setAnchor(null); setBubble(null);
  };

  const explain = async () => {
    if (!anchor) return;
    const term = anchor.text;
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

  const sheet = newCard && <NewCardSheet key={newCard.selection + newCard.sentence} selection={newCard.selection} sentence={newCard.sentence} caseId={caseId} onClose={() => setNewCard(null)} />;
  if (!anchor) return sheet || null;
  // Pas assez de place au-dessus (pastille ou bulle) : bascule sous la sélection
  // plutôt que de partir hors écran (bug B1). Demi-largeurs approximatives
  // (pastille compacte, bulle w-64 fixe) pour un clamp horizontal à 16 px du bord.
  const contentH = bubble ? BUBBLE_H : PILL_H;
  const flipBelow = anchor.y - contentH - 8 < 8;
  const top = flipBelow ? anchor.bottom + 8 : Math.max(8, anchor.y - 8);
  const transform = flipBelow ? 'translate(-50%, 0)' : 'translate(-50%, -100%)';
  const halfWidth = bubble ? 128 : 140;
  const left = Math.min(Math.max(anchor.x, halfWidth + GUTTER), window.innerWidth - halfWidth - GUTTER);
  // 'pill' : pastille pétrole pleine (fond bg-brand-600) — ☆ blanc, survol foncé.
  // 'bubble' : carte claire — tons ardoise/signal lisibles sur les deux fonds.
  const starButton = (variant: 'pill' | 'bubble') => known
    ? <StarButton term={known} filled={inDecks?.has(known.id)} caseId={caseId} tone={variant === 'pill' ? 'onBrand' : 'plain'} />
    : (
      <button type="button" onClick={openNewCard} disabled={!canCreate} aria-label={`Nouvelle carte : ${clean}`}
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg disabled:opacity-40 ${variant === 'pill' ? 'text-white hover:bg-brand-700' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>☆</button>
    );
  return (
    <>
    {sheet}
    <div ref={rootRef} className="fixed z-[80]" style={{ left, top, transform }}>
      {!bubble ? (
        <div className="flex items-center gap-1 rounded-full bg-brand-600 p-0.5 text-xs font-semibold text-white shadow-lg ring-1 ring-brand-700 motion-safe:animate-fade-in-fast">
          {starButton('pill')}
          <button type="button" onClick={() => { void explain(); }} className="flex h-11 items-center gap-1 rounded-full px-3 hover:bg-brand-700">
            <Icon name="search" className="h-3.5 w-3.5" />Expliquer
          </button>
        </div>
      ) : (
        <div className="flex w-64 items-start gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 text-[13px] shadow-xl motion-safe:animate-fade-in-fast dark:border-slate-700 dark:bg-slate-900">
          {!bubble.loading && !bubble.error && <div className="-m-0.5 -mt-1">{starButton('bubble')}</div>}
          <div className="min-w-0 flex-1">
            {bubble.loading ? (
              <div className="flex items-center gap-2 text-slate-400"><span className="h-3 w-3 animate-spin rounded-full border-2 border-brand-400 border-t-transparent" /> Doctopus cherche…</div>
            ) : bubble.error ? (
              <div className="text-[12px] text-amber-600 dark:text-amber-400">{bubble.error}</div>
            ) : (
              <>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400">« {anchor.text} »</span>
                  <span className="chip py-0 text-[9px] text-slate-400">{bubble.source}</span>
                </div>
                {bubble.fb ? <TermSheet term={bubble.fb} compact /> : <div className="leading-snug text-slate-700 dark:text-slate-200">{bubble.text}</div>}
              </>
            )}
            <button onClick={() => { openDoctopus(anchor.text); setAnchor(null); setBubble(null); }}
              className="mt-1.5 w-full rounded-md bg-slate-100 py-1 text-[11px] font-medium text-brand-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-brand-300 dark:hover:bg-slate-700">
              Voir plus avec Doctopus →
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
