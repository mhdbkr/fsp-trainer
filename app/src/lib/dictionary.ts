import type { Fachbegriff } from '@/db/types';
import { miniLookup } from '@/data/miniDict';

// ============================================================================
// Logique du dictionnaire/traducteur (Module 5).
// Voie 1 (mot isolé) : recherche locale Fachbegriffe → mini-dict. Hors-ligne.
// Voie 2 (requête complexe) : IA — WebLLM local (opt-in) ou deep-link gratuit
// sans clé (option B validée). Aucune API payante.
// ============================================================================

/** Une requête est "complexe" si plusieurs mots / ponctuation de phrase. */
export function isComplexQuery(q: string): boolean {
  const t = q.trim();
  const words = t.split(/\s+/).filter(Boolean);
  return words.length > 2 || /[?.!]/.test(t);
}

export interface LocalHit {
  source: 'fachbegriff' | 'mini';
  term: string;
  translation: string;
  detail?: string;
  pronunciation?: string;
  fb?: Fachbegriff;
}

/** Voie 1 : recherche locale (Fachbegriffe puis mini-dict), bidirectionnelle. */
export function localLookup(query: string, begriffe: Fachbegriff[]): LocalHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: LocalHit[] = [];

  // Fachbegriffe : terme allemand OU traduction FR contient la requête.
  for (const b of begriffe) {
    if (b.term.toLowerCase() === q || b.term.toLowerCase().startsWith(q) || b.translationSimple.toLowerCase().includes(q)) {
      hits.push({ source: 'fachbegriff', term: b.term, translation: b.translationSimple, detail: b.definitionDetailed, pronunciation: b.pronunciation, fb: b });
    }
    if (hits.length >= 6) break;
  }

  // Mini-dict en complément si peu de résultats.
  if (hits.length < 3) {
    const m = miniLookup(query);
    if (m) hits.push({ source: 'mini', term: m.direction === 'de-fr' ? query : m.result, translation: m.direction === 'de-fr' ? m.result : query });
  }
  return hits;
}

/** Résolution EXACTE d'un terme sélectionné (FB2-M3) : le terme du glossaire
 *  doit être égal à la sélection (casse ignorée, ponctuation de bord retirée).
 *  Pas de startsWith/includes ici : « Sonde » ne doit pas renvoyer
 *  « Sondenernährung », ni un terme dont la traduction contient le mot. Le
 *  flou reste réservé à la recherche (`localLookup`). */
export function exactLookup(selection: string, begriffe: Fachbegriff[]): Fachbegriff | null {
  const q = selection.trim().replace(/^[\s„“"'«»(\[]+|[\s“”"'«»)\].,;:!?]+$/g, '').toLowerCase();
  if (!q) return null;
  return begriffe.find((b) => b.term.trim().toLowerCase() === q) ?? null;
}

const SUFFIXES = ['en', 'e', 's', 'n'];
const norm = (s: string) => s.trim().replace(/^[\s„“"'«»(\[]+|[\s“”"'«»)\].,;:!?]+$/g, '').toLowerCase();

/** Bases candidates d'un mot : lui-même, puis sans suffixe e/en/s/n (base ≥ 4 lettres). */
function stems(w: string): string[] {
  const out = [w];
  for (const s of SUFFIXES) if (w.endsWith(s) && w.length - s.length >= 4) out.push(w.slice(0, -s.length));
  return out;
}

/** Résolution d'une sélection (F3 §3.4) : exact, puis formes fléchies simples
 *  des DEUX côtés (« Asziten » ↔ « Aszites » par la base « aszite »). Jamais de
 *  préfixe, d'inclusion ni de distance d'édition (FB2-M3). */
export function lookupTerm(selection: string, begriffe: Fachbegriff[]): Fachbegriff | null {
  const exact = exactLookup(selection, begriffe);
  if (exact) return exact;
  const q = norm(selection);
  if (!q || /\s/.test(q)) return null;
  const qstems = stems(q);
  if (qstems.length === 1) return null;
  const want = new Set(qstems.slice(1));
  for (const b of begriffe) {
    const t = b.term.trim().toLowerCase();
    if (stems(t).some((s) => want.has(s))) return b;
  }
  return null;
}
// --- Voie 2 : deep-links gratuits sans clé (option B) -----------------------
export interface DeepLink { label: string; url: string; note?: string }

export function deepLinks(query: string): DeepLink[] {
  const q = encodeURIComponent(query);
  const promptFr = encodeURIComponent(
    `Explique/reformule en allemand médical simple (registre patient) et donne la traduction française : "${query}"`,
  );
  return [
    { label: 'DeepL', url: `https://www.deepl.com/translator#de/fr/${q}`, note: 'traduction' },
    { label: 'Reverso Context', url: `https://context.reverso.net/traduction/allemand-francais/${q}`, note: 'exemples' },
    { label: 'ChatGPT', url: `https://chat.openai.com/?q=${promptFr}`, note: 'explication' },
    { label: 'Google Traduction', url: `https://translate.google.com/?sl=de&tl=fr&text=${q}`, note: 'rapide' },
  ];
}

export { DOCTOPUS_SYSTEM, buildLlmPrompt, briefKind, buildBriefPrompt, type BriefKind } from '../../supabase/functions/_shared/prompts.ts';
