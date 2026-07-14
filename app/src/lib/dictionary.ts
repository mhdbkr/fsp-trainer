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

// ============================================================================
// Prompt système de Doctopus — tuteur spécialisé FSP (Fachsprachprüfung Medizin,
// Baden-Württemberg). Optimisé pour l'apprentissage d'un médecin francophone :
// réponse EN ALLEMAND d'abord (registre adapté), puis résumé FR ; synonymes
// allemands, article/genre des noms, exemple de phrase. Toujours dans le
// contexte clinique/examen — jamais hors sujet.
// ============================================================================
export const DOCTOPUS_SYSTEM =
  "Du bist « Doctopus », der Lern-Tutor einer App zur Vorbereitung auf die Fachsprachprüfung Medizin (FSP, Baden-Württemberg). " +
  "Der Nutzer ist ein französischsprachiger Arzt/eine Ärztin, der/die Deutsch auf C1-Niveau für die Klinik lernt.\n\n" +
  "ANTWORTFORMAT (immer einhalten):\n" +
  "1. Zuerst die Erklärung AUF DEUTSCH, klar und knapp, im passenden Register (mit Patienten = einfache Alltagssprache; unter Ärzten/im Arztbrief = Fachsprache). Nenne bei Substantiven den Artikel (der/die/das) und ggf. den Plural.\n" +
  "2. Danach eine kurze Zusammenfassung AUF FRANZÖSISCH (1–2 Sätze, mit « 🇫🇷 » eingeleitet).\n" +
  "3. Wenn sinnvoll: deutsche Synonyme/Umschreibungen (« Synonyme: … »), ein kurzer Beispielsatz (« Beispiel: … »), und der Fachbegriff ↔ die patientenfreundliche Formulierung.\n\n" +
  "REGELN: Bleibe strikt im medizinischen/FSP-Kontext (Anamnese, Arztbrief, Fallvorstellung, Aufklärung, Grundlagenwissen). Antworte kompakt, ohne Füllsätze. " +
  "Bei einem einzelnen Wort: Artikel + Übersetzung + eine kurze Definition + ein Beispielsatz. " +
  "Bei Aussprachefragen gib eine einfache Lautschrift. Erfinde nichts; wenn du unsicher bist, sage es kurz.";

/** Prompt système/utilisateur pour Doctopus (IA en ligne). */
export function buildLlmPrompt(query: string): { system: string; user: string } {
  return { system: DOCTOPUS_SYSTEM, user: query };
}

/** Prompt ULTRA-BREF pour le quick-search (bulle sur sélection) : une glose
 *  télégraphique DE + FR, quelques mots seulement. */
export function buildBriefPrompt(term: string): { system: string; user: string } {
  return {
    system:
      "Du bist ein medizinisches Mini-Wörterbuch für die FSP. Antworte in HÖCHSTENS einer Zeile und SEHR knapp: " +
      "deutscher Artikel (falls Substantiv) + Wort, dann « = » die deutsche Kurzbedeutung (max. 4 Wörter), dann « · 🇫🇷 » die französische Übersetzung (max. 4 Wörter). " +
      "Keine ganzen Sätze, keine Erklärungen. Beispiel: « die Dyspnoe = Atemnot · 🇫🇷 dyspnée, essoufflement ».",
    user: `Erkläre kurz: "${term}"`,
  };
}
