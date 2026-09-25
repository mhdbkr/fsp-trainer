import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { useFachbegriffe, useFavorites } from '@/hooks/useData';
import { useUi } from '@/store/ui';
import { useCaseId } from '@/features/fachbegriffe/CaseContext';
import { db } from '@/db/db';
import { lookupTerm } from '@/lib/dictionary';
import { askBrief, hasKey } from '@/lib/onlineAi';
import { starSelection, cleanSelection, personalTermId, PT_LIMITS } from '@/lib/collections/personalTerms';
import { toView } from '@/lib/collections/allTerms';

// ============================================================================
// Quick-search : quand l'utilisateur SÉLECTIONNE un mot, un terme OU une
// phrase (FB2-M2), une pastille apparaît près de la sélection. Au clic sur
// « Expliquer », une bulle donne une glose brève ; au clic sur ★, la
// sélection devient un favori (terme du glossaire ou carte personnelle —
// F3 D2/D3). Déclenchement par `selectionchange` (clavier, souris ET
// poignées tactiles) + `pointerup` (souris/tactile), anti-rebond 250 ms.
// « Voir plus → » ouvre Doctopus complet avec le terme pré-rempli.
// ============================================================================

interface Anchor { text: string; context: string; x: number; y: number }
type Bubble = { loading: boolean; text?: string; error?: string; source?: 'glossaire' | 'IA' };

export function SelectionExplainer() {
  const begriffe = useFachbegriffe() ?? [];
  const openDoctopus = useUi((s) => s.openDoctopus);
  const openGlossary = useUi((s) => s.openGlossary);
  const favorites = useFavorites();
  const caseId = useCaseId() ?? undefined;
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const [done, setDone] = useState<null | { label: string; id: string }>(null);
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
      // Même sélection qu'avant (ex. focus/tap sur un bouton relance selectionchange
      // sans que l'utilisateur ait resélectionné) : ne pas effacer bulle/confirmation.
      if (anchorRef.current?.text === text) return;
      try {
        const rect = seldom!.getRangeAt(0).getBoundingClientRect();
        if (!rect.width && !rect.height) return;
        const context = (node?.closest('p, li, td, blockquote, div')?.textContent ?? '').replace(/\s+/g, ' ').trim();
        setAnchor({ text, context, x: Math.min(Math.max(rect.left + rect.width / 2, 110), window.innerWidth - 110), y: rect.top });
        setBubble(null); setDone(null);
      } catch { /* sélection vide */ }
    };
    // selectionchange : clavier, souris ET poignées tactiles (mobile) ; anti-rebond 250 ms.
    const onSelChange = () => { clearTimeout(timer); timer = setTimeout(read, 250); };
    const onPointerUp = (e: PointerEvent) => {
      if (rootRef.current && e.target instanceof Node && rootRef.current.contains(e.target)) return;
      clearTimeout(timer); timer = setTimeout(read, 10);
    };
    const onScroll = () => { setAnchor(null); setBubble(null); setDone(null); };
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
      setAnchor(null); setBubble(null); setDone(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [anchor]);

  const hit = anchor ? lookupTerm(anchor.text, begriffe) : null;
  const clean = anchor ? cleanSelection(anchor.text) : '';
  const starId = hit ? hit.id : clean ? personalTermId(clean) : '';
  const starred = !!favorites?.some((f) => f.termId === starId);
  const canStar = !!clean && clean.length <= PT_LIMITS.term;
  const starringRef = useRef(false);

  const star = async () => {
    if (!anchor || !canStar || starringRef.current) return;
    starringRef.current = true;
    try {
      const r = await starSelection({ selection: anchor.text, context: anchor.context, explanation: bubble?.source === 'IA' || bubble?.source === 'glossaire' ? bubble.text : undefined, caseId }, begriffe);
      setDone(r.favorite ? { label: r.created ? 'Carte créée' : 'Ajouté aux favoris', id: r.id } : { label: 'Retiré des favoris', id: r.id });
    } finally { starringRef.current = false; }
  };
  const openDeckPicker = async () => {
    if (!done) return;
    const target = hit ?? (await db.personal_terms.get(done.id).then((p) => (p ? toView(p) : null)));
    if (target) openGlossary(target); // le tiroir porte déjà « Ajouter à un deck… » (F1)
    setAnchor(null); setBubble(null); setDone(null);
  };

  const explain = async () => {
    if (!anchor) return;
    const term = anchor.text;
    // 1) Glossaire local (correspondance exacte ou fléchie proche, jamais floue — FB2-M3).
    const h = lookupTerm(term, begriffe);
    if (h) {
      setBubble({ loading: false, source: 'glossaire', text: `${h.term} — ${h.translationSimple}` });
      return;
    }
    // 2) IA brève (si clé configurée).
    if (!hasKey()) {
      setBubble({ loading: false, error: 'Ajoute ta clé IA (réglages Doctopus) pour expliquer les mots hors glossaire.' });
      return;
    }
    setBubble({ loading: true });
    try { setBubble({ loading: false, source: 'IA', text: await askBrief(term) }); }
    catch (e) { setBubble({ loading: false, error: (e as Error).message }); }
  };

  if (!anchor) return null;
  const starButton = (
    <button type="button" onClick={() => { void star(); }} disabled={!canStar}
      aria-pressed={starred} aria-label={starred ? `Retirer des favoris : ${clean}` : `Ajouter aux favoris : ${clean}`}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg hover:bg-brand-700 disabled:opacity-40 ${starred ? 'text-signal-300' : 'text-white'}`}>{starred ? '★' : '☆'}</button>
  );
  return (
    <div ref={rootRef} className="fixed z-[80]" style={{ left: anchor.x, top: Math.max(8, anchor.y - 8), transform: 'translate(-50%, -100%)' }}>
      {!bubble ? (
        <div className="flex items-center gap-1 rounded-full bg-brand-600 p-0.5 text-xs font-semibold text-white shadow-lg ring-1 ring-brand-700 motion-safe:animate-fade-in-fast">
          {starButton}
          <button type="button" onClick={() => { void explain(); }} className="flex h-11 items-center gap-1 rounded-full px-3 hover:bg-brand-700">
            <Icon name="search" className="h-3.5 w-3.5" />Expliquer
          </button>
        </div>
      ) : (
        <div className="flex w-64 items-start gap-1.5 rounded-xl border border-slate-200 bg-white p-2.5 text-[13px] shadow-xl motion-safe:animate-fade-in-fast dark:border-slate-700 dark:bg-slate-900">
          {!bubble.loading && !bubble.error && (
            <div className={`-m-0.5 -mt-1 ${starred ? 'text-signal-500' : 'text-slate-300 hover:text-slate-400'}`}>{starButton}</div>
          )}
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
                <div className="leading-snug text-slate-700 dark:text-slate-200">{bubble.text}</div>
              </>
            )}
            <button onClick={() => { openDoctopus(anchor.text); setAnchor(null); setBubble(null); setDone(null); }}
              className="mt-1.5 w-full rounded-md bg-slate-100 py-1 text-[11px] font-medium text-brand-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-brand-300 dark:hover:bg-slate-700">
              Voir plus avec Doctopus →
            </button>
          </div>
        </div>
      )}
      {done && (
        <div role="status" className="mt-1 flex items-center gap-2 rounded-lg bg-white px-2 py-1 text-[12px] shadow ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          <span>{done.label}</span>
          {done.label !== 'Retiré des favoris' && (
            <button type="button" onClick={() => { void openDeckPicker(); }} className="min-h-11 font-medium text-brand-600 dark:text-brand-300">Ajouter à un deck…</button>
          )}
        </div>
      )}
    </div>
  );
}
