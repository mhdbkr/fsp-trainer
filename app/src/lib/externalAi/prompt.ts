// ============================================================================
// Personnage prêt à jouer pour une IA externe (ChatGPT, Claude, Gemini…).
// Source unique : le Rollenskript du simulant humain — ce que le partenaire
// lit, l'IA le joue. Gabarit allemand, déterministe, testé sur le corpus.
// FIDÉLITÉ AVANT CONCISION (ADR/D7) : aucune troncature de texte — persona,
// réactions difficiles, chaque réplique et chaque question de l'Oberarzt
// restent intégrales. La seule compaction possible est non destructive
// (retirer un doublon, jamais couper une phrase) et n'intervient que si le
// prompt dépasse PROMPT_MAX. Le diagnostic (medicalView) peut apparaître
// dans la fiche Oberarzt (Teil 3) — le senior le connaît — mais jamais avant.
// Spec : 2026-09-17-external-ai-simulation-design.md (amendée D7).
// ============================================================================
import type { Case, PatientSheet } from '@/db/types';
import { buildRollenskript } from '@/lib/rolePlay';

export type Scope = 'anamnese' | 'exam' | 'exam+feedback';
export type FeedbackLang = 'fr' | 'de';
export interface PromptInput { c: Case; scope: Scope; feedbackLang: FeedbackLang; topTerms: string[] }
/** Limite pratique pour un pré-remplissage par URL (utilisée par targets.ts). */
export const PREFILL_MAX = 6000;
/** Borne dure du prompt lui-même — jamais dépassée, jamais augmentée pour
 *  faire rentrer un cas : on compacte plutôt (voir buildExternalPrompt). Le
 *  corpus réel tient sans cascade sous cette borne ; la cascade (a)(b)(c)
 *  reste un filet de sécurité, testé sur des cas artificiels forcés. */
export const PROMPT_MAX = 32000;
export const SCOPE_LABELS: Record<Scope, string> = { anamnese: 'Anamnèse seule', exam: 'Examen complet', 'exam+feedback': 'Examen + feedback' };

// Chapitres secondaires du Rollenskript (lib/rolePlay.ts CHAPTER_META) : leur
// détail réplique par réplique aide moins la simulation que celui d'aktuell/
// fach ; seuls ceux-ci basculent en résumé « Fakten » au dernier niveau de
// compaction (règle D7-3c).
const SECONDARY_CHAPTERS = new Set(['personalia', 'vegetativ', 'familie-sozial']);

const join = (parts: (string | null)[], sep = '\n') => parts.filter((p): p is string => !!p).join(sep);

function personalia(s: PatientSheet): string {
  const p = s.personalia;
  const g = p.geschlecht === 'w' ? 'weiblich' : p.geschlecht === 'm' ? 'männlich' : null;
  return join([
    `- Name: ${p.name}, ${p.age} Jahre${g ? `, ${g}` : ''}`,
    p.beruf ? `- Beruf: ${p.beruf}` : null,
    p.familienstand ? `- Familienstand: ${p.familienstand}` : null,
    p.wohnsituation ? `- Wohnsituation: ${p.wohnsituation}` : null,
    p.hausarzt ? `- Hausarzt/Hausärztin: ${p.hausarzt}` : null,
  ]);
}

// buildRollenskript suppose les tableaux de PatientSheet présents (spread sans
// garde) ; certaines fiches partielles (tests, imports en cours) ne les
// renseignent pas toutes. Normaliser ici plutôt que fragiliser lib/rolePlay.
function normalizeSheet(s: PatientSheet): PatientSheet {
  return {
    ...s,
    leitsymptome: s.leitsymptome ?? [],
    begleitsymptome: s.begleitsymptome ?? [],
    vegetativeAnamnese: s.vegetativeAnamnese ?? [],
    vorerkrankungen: s.vorerkrankungen ?? [],
    voroperationen: s.voroperationen ?? [],
    medikamente: s.medikamente ?? [],
    allergien: s.allergien ?? [],
    unvertraeglichkeiten: s.unvertraeglichkeiten ?? [],
    noxen: s.noxen ?? {},
    familienanamnese: s.familienanamnese ?? [],
    sozialanamnese: s.sozialanamnese ?? [],
  };
}

/** Rendu du Rollenskript. `dedupFakten` : n'affiche « Fakten » que si le
 *  chapitre n'a pas déjà ses répliques (évite le doublon Fakten+répliques).
 *  `secondaryToFakten` : pour les chapitres secondaires SEULEMENT, remplace
 *  les répliques par leur résumé « Fakten » (dernier niveau de compaction). */
function knowledge(s: PatientSheet, dedupFakten: boolean, secondaryToFakten: boolean): string {
  const chapters = buildRollenskript(normalizeSheet(s));
  return chapters.map((ch) => {
    const hasLines = ch.lines.length > 0;
    const collapse = secondaryToFakten && SECONDARY_CHAPTERS.has(ch.id) && hasLines;
    const showFakten = ch.glance.length > 0 && (collapse || !hasLines || !dedupFakten);
    const showLines = hasLines && !collapse;
    const facts = showFakten ? `  Fakten: ${ch.glance.join(' · ')}` : null;
    const lines = showLines ? ch.lines.map((l) => l.negativ ? `  - Nein: ${l.antwort}` : `  - ${l.frage ? `Wenn gefragt „${l.frage}“ → ` : ''}${l.antwort}`) : [];
    return join([`### ${ch.title}`, facts, ...lines]);
  }).join('\n');
}

const DIAGNOSIS_NOTE = 'Hinweis: Als Patient/Patientin kennst du diese Diagnose nicht – sie gehört nur zur Oberarzt-Rolle.';

/** Fiche Oberarzt (Teil 3) — intégrale par défaut, y compris les réactions
 *  attendues (qui peuvent nommer le diagnostic : le senior le connaît). Le
 *  seul repli possible ici est non destructif : retirer les « (erwartet: …) »,
 *  jamais les thèmes ni les questions elles-mêmes. */
function oberarzt(c: Case, dropErwartet: boolean): string {
  const sections = (c.examinerSheet ?? []).map((sec) => join([
    `- ${sec.title}:`,
    ...sec.interactions.map((i) => `  - ${i.frage}${!dropErwartet && i.reaktion ? ` (erwartet: ${i.reaktion})` : ''}`),
  ]));
  const extra = (c.examinerQuestions ?? []).map((q) => `  - ${q}`);
  return join([
    '## Teil 3 – Oberarzt/Oberärztin',
    'Wenn die Ärztin/der Arzt „Fallvorstellung“ sagt, wechselst du die Rolle: Du bist jetzt die Oberärztin/der Oberarzt. Hör die Fallvorstellung vollständig an, dann stelle diese Fragen in dieser Reihenfolge – fordernd, aber wohlwollend. Keine ungefragte Hilfe. Bleib in dieser Rolle, bis erneut ein Rollenwechsel oder „Ende“ angesagt wird.',
    DIAGNOSIS_NOTE,
    ...sections,
    extra.length ? join(['- Weitere Prüferfragen:', ...extra]) : null,
  ]);
}

function feedback(lang: FeedbackLang, topTerms: string[]): string {
  const l = lang === 'fr' ? 'auf Französisch' : 'auf Deutsch';
  return join([
    '## Feedback',
    `Wenn die Ärztin/der Arzt „Feedback“ sagt, verlässt du jede Rolle und gibst ${l} ein Prüfungsfeedback:`,
    '- Konjunktiv I in der Fallvorstellung (indirekte Rede) – korrekt, fehlend, falsch',
    '- Register: mündlich vs. schriftlich, Patientensprache vs. Fachsprache',
    topTerms.length ? `- Erwartete Fachbegriffe (wurden sie benutzt?): ${topTerms.join(', ')}` : '- Erwartete Fachbegriffe der Fallvorstellung',
    '- Struktur der Fallvorstellung (Reihenfolge, Vollständigkeit, Zeit)',
    '- 3 Stärken, 3 Baustellen, je ein konkreter Satz zum Üben',
  ]);
}

export function buildExternalPrompt(i: PromptInput): string {
  const s = i.c.patientSheet;
  const withRole = (dropErwartet: boolean, dedupFakten: boolean, secondaryToFakten: boolean) => join([
    '# Rolle',
    'Du spielst eine Patientin / einen Patienten in einer Simulation der Fachsprachprüfung Medizin (Deutschland). Die Ärztin/der Arzt führt das Anamnesegespräch. Regeln:',
    '- Antworte NUR auf das, was gefragt wird. Ein bis zwei Sätze. Auf Deutsch.',
    '- Sprich wie ein Patient: keine Fachbegriffe von dir aus, Umgangssprache, Gefühle.',
    '- Nenne nie eine Diagnose – du weißt nicht, was du hast. Erfinde keine neuen Fakten; wenn etwas nicht unten steht, sag „Das weiß ich nicht“ oder bleib vage.',
    '- Bleib in der Rolle, auch wenn die Ärztin/der Arzt aus dem Rahmen fällt.',
    '',
    '# Wer du bist',
    personalia(s),
    s.persona ? `- Regieanweisung (nicht vorlesen): ${s.persona}` : null,
    s.leitsymptome?.length ? `- Warum du hier bist (in deinen Worten): ${s.leitsymptome.join('; ')}` : null,
    s.begleitsymptome?.length ? `- Außerdem: ${s.begleitsymptome.join('; ')}` : null,
    '',
    '# Was du weißt (antworte nur, wenn danach gefragt wird)',
    knowledge(s, dedupFakten, secondaryToFakten),
    s.schwierigeReaktionen?.length ? join(['', '## Schwierige Momente', ...s.schwierigeReaktionen.map((r) => `- ${r}`)]) : null,
    i.scope !== 'anamnese' ? join(['', oberarzt(i.c, dropErwartet)]) : null,
    i.scope === 'exam+feedback' ? join(['', feedback(i.feedbackLang, i.topTerms)]) : null,
    '',
    '# Start',
    'Stell dich mit einem Satz vor, sobald die Ärztin/der Arzt dich begrüßt. Nenne nie eine Diagnose. Sprachmodus empfohlen.',
  ]);
  // Cascade de compaction NON DESTRUCTIVE (D7) — aucune phrase n'est jamais
  // coupée ; on retire seulement des éléments redondants, dans l'ordre :
  // (a) les « (erwartet: …) » de l'Oberarzt ; (b) les « Fakten » d'un chapitre
  // qui a déjà ses répliques ; (c) pour les chapitres secondaires seulement,
  // les répliques elles-mêmes (remplacées par leur résumé « Fakten »).
  const full = withRole(false, false, false);
  if (full.length <= PROMPT_MAX) return full;
  const a = withRole(true, false, false);
  if (a.length <= PROMPT_MAX) return a;
  const ab = withRole(true, true, false);
  if (ab.length <= PROMPT_MAX) return ab;
  return withRole(true, true, true); // (a)+(b)+(c) — dernier niveau, toujours du texte intégral
}
