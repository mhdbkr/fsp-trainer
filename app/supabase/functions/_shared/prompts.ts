// ============================================================================
// Prompts système de Doctopus — module FEUILLE (aucun import) partagé par
// l'Edge Function `ai` (Deno), l'app (via src/lib/dictionary.ts) et
// scripts/evalDoctopus.mjs. Le client n'envoie JAMAIS de prompt système au
// serveur (spec F3 §3.5) : le serveur lit ce fichier.
// ============================================================================

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

// ============================================================================
// Bedeutung d'une carte personnelle (F4a §3.3, D4) : ≤ 6 mots, texte brut,
// sans emoji, au sens où le mot est employé dans la phrase de contexte.
// ============================================================================
export const BEDEUTUNG_MAX_WORDS = 6;

export function buildBedeutungPrompt(word: string, context?: string): { system: string; user: string } {
  return {
    system:
      'Du bist ein medizinisches Wörterbuch für die Fachsprachprüfung (C1). Gib die Bedeutung des markierten Wortes so an, wie es im Satz gemeint ist: ' +
      'eine direkte, merkbare deutsche Umschreibung in HÖCHSTENS sechs Wörtern. Kein ganzer Satz, kein Artikel am Anfang, keine Anführungszeichen, keine Emoji, keine Übersetzung, keine Erklärung. ' +
      'Beispiele: Dyspnoe → Atemnot ; Aszites → Flüssigkeit in der Bauchhöhle.',
    user: context ? `Wort: „${word}“\nSatz: „${context}“` : `Wort: „${word}“`,
  };
}

/** Nettoie une Bedeutung proposée : première ligne, sens après « = »/« → », sans
 *  emoji, guillemets, article initial ni ponctuation finale, ≤ 6 mots. '' si rien. */
export function cleanBedeutung(raw: string): string {
  const line = raw.split('\n').map((l) => l.trim()).find(Boolean) ?? '';
  const meaning = line.split('·')[0].split(/[=→]/).pop() ?? '';
  const plain = meaning
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{1F1E6}-\u{1F1FF}]/gu, '')
    .replace(/[„“”"'«»*_`]/g, '')
    .replace(/^\s*(?:bedeutung\s*:\s*)?(?:der|die|das)?\s+/iu, ' ')
    .replace(/[.;:!?,\s]+$/u, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.split(' ').filter(Boolean).slice(0, BEDEUTUNG_MAX_WORDS).join(' ');
}
