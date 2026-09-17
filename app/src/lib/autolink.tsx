import React, { useEffect, useMemo, useRef } from 'react';
import type { Fachbegriff } from '@/db/types';
import { focusStar } from '@/components/hoverStarRef';
import { useUi } from '@/store/ui';

// ============================================================================
// Auto-linking terme → glossaire. C'EST DU CODE, PAS DU BALISAGE MANUEL.
// On construit une regex à partir de tous les termes connus, et on rend chaque
// occurrence cliquable (aperçu au survol → fiche). Utilisé partout où un texte
// médical est affiché (cas, guides, Fachwissen, Aufklärung, simulation).
// ============================================================================

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface LinkIndex {
  regex: RegExp | null;
  byTerm: Map<string, Fachbegriff>;
}

/** Construit un index de matching à partir des Fachbegriffe.
 *  On trie par longueur décroissante pour matcher les termes composés d'abord. */
export function buildLinkIndex(begriffe: Fachbegriff[]): LinkIndex {
  const byTerm = new Map<string, Fachbegriff>();
  const terms: string[] = [];
  for (const b of begriffe) {
    // On ne garde que le premier mot-clé significatif (évite le bruit sur les
    // termes de >4 mots). Les termes très courts (<4 lettres) sont ignorés
    // pour ne pas surligner "in", "vor", etc.
    const key = b.term.trim();
    if (key.length < 4) continue;
    const lower = key.toLowerCase();
    if (!byTerm.has(lower)) {
      byTerm.set(lower, b);
      terms.push(key);
    }
  }
  if (!terms.length) return { regex: null, byTerm };
  terms.sort((a, b) => b.length - a.length);
  // Frontières de MOT ENTIER, Unicode (umlauts, ß) : « sonde » ne doit pas se
  // lier dans « besonderen », ni « Magen » dans « Magenspiegelung » (composé =
  // autre mot). \b ne connaît que l'ASCII, d'où les lookarounds sur \p{L}\p{N}.
  const pattern = '(?<![\\p{L}\\p{N}])(' + terms.map(escapeRe).join('|') + ')(?![\\p{L}\\p{N}])';
  const regex = new RegExp(pattern, 'giu');
  return { regex, byTerm };
}

interface AutoLinkTextProps {
  text: string;
  index: LinkIndex;
  onOpen: (fb: Fachbegriff) => void;
  /** Survol/focus desktop : ouvre la hover-card ancrée sur le lien. */
  onHover?: (fb: Fachbegriff, anchor: DOMRect) => void;
  /** La souris quitte le lien : ferme la hover-card (après délai, géré par l'appelant). */
  onLeave?: () => void;
  /** Tap sur `pointer: coarse` (mobile/tablette) : ouvre la hover-card au lieu du tiroir. */
  onTap?: (fb: Fachbegriff, anchor: DOMRect) => void;
  /** Vrai si la hover-card est actuellement ouverte (I1 : Tab→Enter→Enter). */
  hoverOpen?: boolean;
}

export interface AutoLinkPart { t: string; fb: Fachbegriff | null }

/** Découpe pure (testable) : segments de texte, ceux qui portent un `fb`
 *  deviennent des liens. Un seul lien par terme et par bloc. */
export function splitAutoLink(text: string, index: LinkIndex): AutoLinkPart[] {
  if (!index.regex || !text) return [{ t: text, fb: null }];
  const out: AutoLinkPart[] = [];
  let last = 0;
  // Reset lastIndex car la regex est globale et réutilisée.
  index.regex.lastIndex = 0;
  let m: RegExpExecArray | null;
  const seen = new Set<string>(); // 1 lien par terme et par bloc (évite le sapin de Noël)
  while ((m = index.regex.exec(text)) !== null) {
    const matched = m[0];
    const fb = index.byTerm.get(matched.toLowerCase()) ?? null;
    const dedupKey = matched.toLowerCase();
    if (m.index > last) out.push({ t: text.slice(last, m.index), fb: null });
    if (fb && !seen.has(dedupKey)) {
      out.push({ t: matched, fb });
      seen.add(dedupKey);
    } else {
      out.push({ t: matched, fb: null });
    }
    last = m.index + matched.length;
    if (matched.length === 0) index.regex.lastIndex++; // garde-fou
  }
  if (last < text.length) out.push({ t: text.slice(last), fb: null });
  return out;
}

/** Rend un texte avec les Fachbegriffe cliquables. Survol/focus → hover-card
 *  (`onHover`, délai 150 ms géré ici) ; tap sur `pointer: coarse` → `onTap` au
 *  lieu du tiroir (`onOpen`). */
export function AutoLinkText({ text, index, onOpen, onHover, onLeave, onTap, hoverOpen }: AutoLinkTextProps) {
  const parts = useMemo(() => splitAutoLink(text, index), [text, index]);
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // M1 : un démontage (navigation, changement de texte) pendant les 150 ms
  // d'attente d'un survol ne doit pas déclencher `onHover` sur un lien disparu.
  useEffect(() => () => { if (enterTimer.current) clearTimeout(enterTimer.current); }, []);

  return (
    <>
      {parts.map((p, i) =>
        p.fb ? (
          <button
            key={i}
            onClick={(e) => {
              const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
              if (coarse) {
                e.preventDefault();
                onTap?.(p.fb!, e.currentTarget.getBoundingClientRect());
              } else {
                onOpen(p.fb!);
              }
            }}
            onKeyDown={(e) => {
              // I1 : le premier Enter/Espace sur un lien déjà focus (la carte
              // s'est ouverte via onFocus) déplace le focus vers ★ au lieu
              // d'activer le lien — Tab→Enter→Enter favorise le terme.
              if (e.key !== 'Enter' && e.key !== ' ') return;
              const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
              // M7 : n'agir que si la carte ouverte est celle DE CE lien.
              if (coarse || !hoverOpen || useUi.getState().hoverTerm?.fb.id !== p.fb!.id) return;
              e.preventDefault();
              focusStar();
            }}
            onMouseEnter={(e) => {
              // M5 : sur `pointer: coarse`, il n'y a pas de survol réel — ne
              // pas armer un minuteur qui ne sera jamais désarmé par un vrai
              // mouseleave (le tap gère déjà l'ouverture via `onTap`).
              const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
              if (coarse) return;
              const r = e.currentTarget.getBoundingClientRect();
              if (enterTimer.current) clearTimeout(enterTimer.current);
              enterTimer.current = setTimeout(() => onHover?.(p.fb!, r), 150);
            }}
            onMouseLeave={() => {
              if (enterTimer.current) clearTimeout(enterTimer.current);
              onLeave?.();
            }}
            onFocus={(e) => onHover?.(p.fb!, e.currentTarget.getBoundingClientRect())}
            onBlur={() => onLeave?.()}   // I1-b : Tab hors du lien arme la fermeture (le focus sur la carte la désarme)
            className="text-brand-600 dark:text-brand-300 underline decoration-dotted decoration-brand-400/60 underline-offset-2 hover:bg-brand-100 dark:hover:bg-brand-900/40 rounded px-0.5 -mx-0.5 transition-colors"
          >
            {p.t}
          </button>
        ) : (
          <React.Fragment key={i}>{p.t}</React.Fragment>
        ),
      )}
    </>
  );
}
