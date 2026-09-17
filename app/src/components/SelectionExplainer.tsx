import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons';
import { useFachbegriffe } from '@/hooks/useData';
import { useUi } from '@/store/ui';
import { exactLookup } from '@/lib/dictionary';
import { askBrief, hasKey } from '@/lib/onlineAi';

// ============================================================================
// Quick-search : quand l'utilisateur SÉLECTIONNE un mot, un terme OU une
// phrase (FB2-M2), une pastille apparaît près de la sélection. Au clic, une
// bulle donne une glose brève. Cerveau HYBRIDE : réponse instantanée si la
// sélection est EXACTEMENT un terme du glossaire (FB2-M3 : jamais de
// correspondance floue — « Sonde » n'est pas « Sondenernährung ») ; sinon
// appel bref à Doctopus (IA, clé).
// « Voir plus → » ouvre Doctopus complet avec le terme pré-rempli.
// ============================================================================

interface Anchor { text: string; x: number; y: number }
type Bubble = { loading: boolean; text?: string; error?: string; source?: 'glossaire' | 'IA' };

export function SelectionExplainer() {
  const begriffe = useFachbegriffe() ?? [];
  const openDoctopus = useUi((s) => s.openDoctopus);
  const [anchor, setAnchor] = useState<Anchor | null>(null);
  const [bubble, setBubble] = useState<Bubble | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onMouseUp = (e: MouseEvent) => {
      // Ne pas déclencher si on clique dans notre propre UI (pastille/bulle).
      if (rootRef.current && e.target instanceof Node && rootRef.current.contains(e.target)) return;
      // Laisser le navigateur finaliser la sélection.
      setTimeout(() => {
        const seldom = window.getSelection();
        const text = seldom?.toString().trim() ?? '';
        // D'un mot à une phrase : on borne seulement la longueur (un paragraphe
        // entier n'est pas une question, c'est Doctopus complet qu'il faut).
        if (!text || text.length < 2 || text.length > 220) return;
        // Ignorer les sélections dans un champ de saisie.
        const node = seldom?.anchorNode?.parentElement;
        if (node?.closest('input, textarea, [contenteditable="true"]')) return;
        try {
          const rect = seldom!.getRangeAt(0).getBoundingClientRect();
          if (!rect.width && !rect.height) return;
          setAnchor({ text, x: Math.min(rect.left + rect.width / 2, window.innerWidth - 120), y: rect.top });
          setBubble(null);
        } catch { /* ignore */ }
      }, 10);
    };
    const onScroll = () => { setAnchor(null); setBubble(null); };
    document.addEventListener('mouseup', onMouseUp);
    window.addEventListener('scroll', onScroll, true);
    return () => { document.removeEventListener('mouseup', onMouseUp); window.removeEventListener('scroll', onScroll, true); };
  }, []);

  // Fermer si on clique ailleurs.
  useEffect(() => {
    if (!anchor) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && e.target instanceof Node && rootRef.current.contains(e.target)) return;
      setAnchor(null); setBubble(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [anchor]);

  const explain = async () => {
    if (!anchor) return;
    const term = anchor.text;
    // 1) Glossaire local, correspondance EXACTE seulement (instantané).
    const h = exactLookup(term, begriffe);
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
  return (
    <div ref={rootRef} className="fixed z-[80]" style={{ left: anchor.x, top: Math.max(8, anchor.y - 8), transform: 'translate(-50%, -100%)' }}>
      {!bubble ? (
        <button onClick={explain}
          className="flex items-center gap-1 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white shadow-lg ring-1 ring-brand-700 hover:bg-brand-700">
          <Icon name="search" className="h-3.5 w-3.5" />Expliquer
        </button>
      ) : (
        <div className="w-64 rounded-xl border border-slate-200 bg-white p-2.5 text-[13px] shadow-xl dark:border-slate-700 dark:bg-slate-900">
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
          <button onClick={() => { openDoctopus(anchor.text); setAnchor(null); setBubble(null); }}
            className="mt-1.5 w-full rounded-md bg-slate-100 py-1 text-[11px] font-medium text-brand-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-brand-300 dark:hover:bg-slate-700">
            Voir plus avec Doctopus →
          </button>
        </div>
      )}
    </div>
  );
}
