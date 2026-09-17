import React, { useMemo } from 'react';
import type { Fachbegriff } from '@/db/types';

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

/** Rend un texte avec les Fachbegriffe cliquables. */
export function AutoLinkText({ text, index, onOpen }: AutoLinkTextProps) {
  const parts = useMemo(() => splitAutoLink(text, index), [text, index]);

  return (
    <>
      {parts.map((p, i) =>
        p.fb ? (
          <button
            key={i}
            onClick={() => onOpen(p.fb!)}
            title={p.fb.translationSimple}
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
