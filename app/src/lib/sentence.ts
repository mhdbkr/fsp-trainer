// ============================================================================
// Contexte d'une carte personnelle (F4a §3.3) : la SEULE phrase qui contient la
// sélection. L'offset vient du Range DOM ; la segmentation est Intl.Segmenter
// avec la même garde des abréviations que scripts/linkCaseTerms.mjs (lettre
// isolée + point : « z. B. », « Z. n. », « V. a. » ; liste partagée
// src/data/sentenceAbbreviations.json : « ca. », « bzw. »…).
// ============================================================================
import ABBREVIATIONS from '@/data/sentenceAbbreviations.json';

export const CONTEXT_MAX = 300;
const SEG = new Intl.Segmenter('de', { granularity: 'sentence' });

const endsWithAbbreviation = (s: string): boolean => {
  const t = s.trimEnd();
  if (/(?:^|[\s(])\p{L}\.$/u.test(t)) return true;
  return ABBREVIATIONS.some((a) => t.endsWith(a) && (t.length === a.length || /[\s(]/.test(t[t.length - a.length - 1])));
};

/** Phrases de `text` avec leur position de départ. */
export function splitSentences(text: string): { start: number; text: string }[] {
  const out: { start: number; text: string }[] = [];
  for (const { segment, index } of SEG.segment(text)) {
    const prev = out[out.length - 1];
    if (prev && endsWithAbbreviation(prev.text)) prev.text += segment;
    else out.push({ start: index, text: segment });
  }
  return out;
}

/** Phrase de `text` qui contient `offset`, espaces normalisés, ≤ 300 car. (fenêtre centrée sur l'offset). */
export function sentenceAt(text: string, offset: number): string {
  const all = splitSentences(text);
  const s = [...all].reverse().find((x) => x.start <= offset) ?? all[0];
  if (!s) return '';
  let raw = s.text;
  if (raw.length > CONTEXT_MAX) {
    const from = Math.max(0, Math.min(offset - s.start - CONTEXT_MAX / 2, raw.length - CONTEXT_MAX));
    raw = raw.slice(from, from + CONTEXT_MAX);
  }
  return raw.replace(/\s+/g, ' ').trim();
}

/** Phrase du début d'un Range (sélection) : bloc englobant + offset mesuré par un Range. */
export function sentenceOfRange(range: Range): string {
  const node = range.startContainer;
  const el = (node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement)?.closest('p, li, td, blockquote, div');
  if (!el) return '';
  const pre = document.createRange();
  pre.selectNodeContents(el);
  pre.setEnd(range.startContainer, range.startOffset);
  return sentenceAt(el.textContent ?? '', pre.toString().length);
}

/** Découpe `sentence` autour de la 1re occurrence de `word` (mot entier, casse
 *  ignorée, formes -e/-en/-es/-n/-s) pour la surligner ; null si absent. */
export function highlightParts(sentence: string, word: string): [string, string, string] | null {
  const w = word.trim();
  if (!w) return null;
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:e|en|es|n|s)?(?![\\p{L}\\p{N}])`, 'iu');
  const m = re.exec(sentence);
  return m ? [sentence.slice(0, m.index), m[0], sentence.slice(m.index + m[0].length)] : null;
}
