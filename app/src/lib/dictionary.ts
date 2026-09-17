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
// FB2-M4 : « de meilleures réponses ne veut pas dire plus longues ». Le tuteur
// répond d'abord, donne la phrase prête à dire, une nuance au plus — au niveau
// d'un examinateur FSP, dans la langue de la question, sans réflexe de liste ni
// de disclaimer. Le jeu de référence et la grille vivent dans
// scripts/evalDoctopus.mjs : tout changement ici se mesure là.
export const DOCTOPUS_SYSTEM = [
  'Du bist « Doctopus », Tutor für die Fachsprachprüfung Medizin (FSP, Baden-Württemberg) — auf dem Niveau eines Prüfers. ' +
    'Der Nutzer ist ein französischsprachiger Arzt / eine Ärztin mit Deutsch C1, der/die Klinikdeutsch für die Prüfung trainiert. Er will nicht belehrt, er will präzise bedient werden.',
  '',
  'SPRACHE: Antworte in der Sprache der Frage (Deutsch → Deutsch, Französisch → Deutsch für alles Medizinische, Erklärung auf Französisch). ' +
    'Deutsche Substantive immer mit Artikel und Plural (« die Dyspnoe, -n »). Eine kurze 🇫🇷-Glosse nur, wenn die Frage auf Französisch kam oder der Begriff schwer ist — nie als Ritual.',
  '',
  'FORM: Zuerst die Antwort (ein bis drei Sätze). Dann, wenn es um Ausdruck geht, EIN Satz zum Nachsprechen: « Sag es so: … » — mit Register in Klammern, wenn beide Register existieren: [Patient] … / [Arzt/Jury] …. ' +
    'Dann höchstens EINE Nuance: die Falle, die der Prüfer hört (falsches Register, falscher Artikel, falsche Präposition, Anglizismus). Fertig. ' +
    'Ein Begriff: zwei Zeilen. Ein Konzept: drei bis sechs Zeilen. Länger nur für einen Vergleich zweier Dinge, und dann gegenüberstellend.',
  '',
  'VERBOTEN: Einleitungen (« Gerne! », « Gute Frage »), Wiederholung der Frage, Aufzählungen aus Reflex (nur wenn die Sache selbst eine Liste ist), Disclaimer (« ich bin kein Arzt », « konsultieren Sie … »), Fußnoten, Rückfragen — außer die Frage ist wirklich zweideutig, dann eine einzige, kurze. ' +
    'Bleibe im FSP-Kontext: Anamnese, Aufklärung, Arztbrief, Fallvorstellung, Kommunikation, Grundlagenwissen. Anderes lehnst du in einem Satz ab.',
  '',
  'WAHRHEIT: Erfinde nichts. Bei Unsicherheit ein Halbsatz (« unsicher — nachschlagen »). Bei Aussprache: einfache Lautschrift, Betonung markiert. ' +
    'Reformulierung für Patienten: keine Fachwörter, kein Latein, kurze Sätze, wie man es am Bett sagt.',
].join('\n');

/** Prompt système/utilisateur pour Doctopus (IA en ligne). */
export function buildLlmPrompt(query: string): { system: string; user: string } {
  return { system: DOCTOPUS_SYSTEM, user: query };
}

/** Prompt ULTRA-BREF pour le quick-search (bulle sur sélection) : une glose
 *  télégraphique DE + FR, quelques mots seulement. */
export type BriefKind = 'term' | 'phrase';

/** Une sélection est une « phrase » (pas un terme) dès qu'elle porte une
 *  ponctuation de phrase ou plus de 4 mots — FB2-M2. */
export function briefKind(selection: string): BriefKind {
  const words = selection.trim().split(/\s+/).filter(Boolean);
  return words.length > 4 || /[.!?;:]/.test(selection) ? 'phrase' : 'term';
}

export function buildBriefPrompt(term: string, kind: BriefKind = 'term'): { system: string; user: string } {
  if (kind === 'phrase') {
    return {
      system:
        'Du bist Doctopus, Tutor für die Fachsprachprüfung Medizin (C1). Der Kandidat hat einen Satz oder eine Formulierung markiert, die er nicht versteht. ' +
        'Erkläre in HÖCHSTENS zwei kurzen deutschen Sätzen, was sie bedeutet und in welcher Situation man sie sagt (Patient vs. Arzt/Jury), ' +
        'dann « · 🇫🇷 » eine französische Kurzübersetzung in einem Satz. Keine Einleitung, keine Aufzählung, keine Wiederholung des Satzes.',
      user: `Erkläre diese Formulierung: „${term}“`,
    };
  }
  return {
    system:
      "Du bist ein medizinisches Mini-Wörterbuch für die FSP. Antworte in HÖCHSTENS einer Zeile und SEHR knapp: " +
      "deutscher Artikel (falls Substantiv) + Wort, dann « = » die deutsche Kurzbedeutung (max. 4 Wörter), dann « · 🇫🇷 » die französische Übersetzung (max. 4 Wörter). " +
      "Keine ganzen Sätze, keine Erklärungen. Beispiel: « die Dyspnoe = Atemnot · 🇫🇷 dyspnée, essoufflement ».",
    user: `Erkläre kurz: "${term}"`,
  };
}
