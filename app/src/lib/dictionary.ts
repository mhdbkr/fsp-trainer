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

/** Prompt système de l'assistant (WebLLM). Tuteur FSP polyvalent : traduction,
 *  reformulation, sciences fondamentales, et questions sur l'examen. */
export function buildLlmPrompt(query: string): { system: string; user: string } {
  return {
    system:
      "Tu es l'assistant d'un médecin qui prépare la Fachsprachprüfung (examen de langue médicale en Allemagne). " +
      'Tu aides sur trois plans : (1) traduction/reformulation allemand↔français (registre patient vs technique), ' +
      "(2) sciences médicales fondamentales (physiopathologie, diagnostic, traitement), (3) déroulé et attentes de l'examen FSP. " +
      'Réponds en français, de façon claire, structurée et concise. Donne les termes médicaux en allemand quand c’est utile. ' +
      'Si la question est un simple mot, donne la traduction et une courte définition.',
    user: query,
  };
}
