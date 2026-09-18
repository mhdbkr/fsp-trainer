// ============================================================================
// Personnage prêt à jouer pour une IA externe (ChatGPT, Claude, Gemini…).
// Source unique : le Rollenskript du simulant humain — ce que le partenaire
// lit, l'IA le joue. Gabarit allemand, déterministe, testé sur le corpus.
// FIDÉLITÉ AVANT CONCISION (ADR/D7) : aucune troncature de texte — persona,
// réactions difficiles, chaque réplique et chaque question de l'Oberarzt
// restent intégrales. La seule compaction possible est non destructive
// (retirer un doublon, jamais couper une phrase) et n'intervient que si le
// prompt dépasse PROMPT_MAX. PROMPT_MAX = 56000 : mesuré large sur le corpus
// réel (130 cas, réplique par réplique) pour que le niveau 'full' suffise
// TOUJOURS en pratique — la cascade (a)(c) reste un filet de sécurité, testé
// sur des cas artificiels forcés. PREFILL_MAX (6000) reste une limite d'URL
// séparée, plus stricte, pour le pré-remplissage (targets.ts) — sans rapport
// avec la taille réelle du prompt. Le diagnostic (medicalView) peut apparaître
// dans la fiche Oberarzt (Teil 3) — le senior le connaît — mais jamais avant.
// Le niveau de compaction atteint est exposé par buildExternalPromptDetailed
// (level: 'full' | 'a' | 'ac') pour diagnostic/monitoring ; buildExternalPrompt
// reste le raccourci qui ne renvoie que le texte.
// Spec : 2026-09-17-external-ai-simulation-design.md (amendée D7).
// ============================================================================
import type { Case, PatientSheet } from '@/db/types';
import { buildRollenskript } from '@/lib/rolePlay';

export type Scope = 'anamnese' | 'exam' | 'exam+feedback';
export type FeedbackLang = 'fr' | 'de';
export type CompactionLevel = 'full' | 'a' | 'ac';
export interface PromptInput { c: Case; scope: Scope; feedbackLang: FeedbackLang; topTerms: string[] }
export interface DetailedPrompt { text: string; level: CompactionLevel }
/** Limite pratique pour un pré-remplissage par URL (utilisée par targets.ts). */
export const PREFILL_MAX = 6000;
/** Borne dure du prompt lui-même — jamais dépassée, jamais augmentée pour
 *  faire rentrer un cas : on compacte plutôt (voir buildExternalPromptDetailed).
 *  Le corpus réel tient sans cascade sous cette borne (level 'full' garanti,
 *  voir prompt.corpus.test.ts) ; la cascade (a)(c) reste un filet de sécurité,
 *  testé sur des cas artificiels forcés. */
export const PROMPT_MAX = 56000;
export const SCOPE_LABELS: Record<Scope, string> = { anamnese: 'Anamnèse seule', exam: 'Examen complet', 'exam+feedback': 'Examen + feedback' };

// Chapitres secondaires du Rollenskript (lib/rolePlay.ts CHAPTER_META) : leur
// détail réplique par réplique aide moins la simulation que celui d'aktuell/
// fach ; seuls ceux-ci basculent en résumé « Fakten » au dernier niveau de
// compaction (règle D7-3c, niveau 'ac').
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

// F3 : sur les répliques niées (negativ) seulement, on retire la justification
// diagnostique différentielle éventuelle (« … (spricht gegen X) », « … (eher
// gegen Y) ») — un patient ne sait pas que ce signe négatif écarte telle
// pathologie. Non destructif au sens D7 : on ne retire que cette parenthèse
// finale, jamais le reste de la phrase.
const NEGATIV_RATIONALE_RE = /\s*\((?:(?:spricht |eher )?gegen |keine? Hinweise? auf )[^)]*\)\s*$/u;
const stripNegativRationale = (antwort: string) => antwort.replace(NEGATIV_RATIONALE_RE, '');

/** Rendu du Rollenskript. Dédoublonnage « Fakten »/répliques (F4, toujours
 *  actif) : le résumé « Fakten » d'un chapitre n'est affiché que s'il n'a
 *  AUCUNE réplique (`ch.lines.length === 0`) ; jamais pour `aktuell`, dont le
 *  résumé (leitsymptome…) est déjà donné dans « Wer du bist ».
 *  `secondaryToFakten` : pour les chapitres secondaires SEULEMENT (dernier
 *  niveau de compaction, 'ac'), remplace les répliques par leur résumé
 *  « Fakten » — c'est alors le seul cas où Fakten et repli coexistent. */
function knowledge(s: PatientSheet, secondaryToFakten: boolean): string {
  const chapters = buildRollenskript(s);
  return chapters.map((ch) => {
    const hasLines = ch.lines.length > 0;
    const collapse = secondaryToFakten && SECONDARY_CHAPTERS.has(ch.id) && hasLines;
    const showFakten = ch.glance.length > 0 && (collapse || (!hasLines && ch.id !== 'aktuell'));
    const showLines = hasLines && !collapse;
    const facts = showFakten ? `  Fakten: ${ch.glance.join(' · ')}` : null;
    const lines = showLines ? ch.lines.map((l) => l.negativ ? `  - Nein: ${stripNegativRationale(l.antwort)}` : `  - ${l.frage ? `Wenn gefragt „${l.frage}“ → ` : ''}${l.antwort}`) : [];
    return join([`## ${ch.title}`, facts, ...lines]);
  }).join('\n');
}

const DIAGNOSIS_NOTE = 'Alles in diesem Teil weiß nur die Oberärztin/der Oberarzt. Als Patient/Patientin kennst du nichts davon und deutest es nie an.';

// E — régie française résiduelle dans examinerSheet[].interactions[].reaktion
// (notes internes du simulant humain, jamais destinées à l'IA externe).
// stripFrenchDirections retire les PHRASES entières écrites en français avant
// qu'elles n'atterrissent dans « (erwartet: …) ». Règle volontairement simple
// (D7 : non destructif au niveau phrase, jamais au niveau mot) : découpage en
// phrases sur « . »/« ! »/« ? » en respectant quelques abréviations courantes
// (ne pas couper après « ca. », « z. B. », « bzw. », « v. a. », « evtl. », …) ;
// une phrase est retirée si elle contient un mot fort FR (relance, demande,
// teste, vérifie, insiste, candidat, simulant) OU au moins 2 mots-outils FR
// (le, la, les, des, du, une, sur, si, pour, avec, sans, est, sont, peut,
// doit, accepte, note, laisse, reste, réponse, question, argument(s),
// critère) — jamais un seul, pour ne pas confondre un faux ami allemand
// isolé (« des » génitif, « si »-like) avec de la régie française.
// COMPROMIS documenté : une phrase MIXTE allemand+français (ex. diagnostic
// suivi d'une consigne française sans ponctuation entre les deux, « X sur les
// arguments — … ») est retirée EN ENTIER dès qu'elle franchit ce seuil — on ne
// découpe pas davantage sur « — » pour tenter de sauver la partie allemande.
// L'attendu minimal reste respecté (aucune phrase française ne survit) ; la
// perte occasionnelle d'un fragment allemand adjacent est le prix de la
// simplicité de la règle. Voir prompt.test.ts pour l'exemple concerné.
const FRENCH_ABBREVIATIONS = ['ca.', 'z. b.', 'bzw.', 'v. a.', 'evtl.', 'd.h.', 'u.a.', 'etc.', 'inkl.', 'ggf.', 'sog.'];
const FRENCH_STRONG_WORDS = ['relance', 'demande', 'teste', 'vérifie', 'insiste', 'candidat', 'simulant'];
const FRENCH_WEAK_WORDS = ['le', 'la', 'les', 'des', 'du', 'une', 'sur', 'si', 'pour', 'avec', 'sans', 'est', 'sont', 'peut', 'doit', 'accepte', 'note', 'laisse', 'reste', 'réponse', 'question', 'argument', 'arguments', 'critère'];
const FRENCH_WORD_RE = new RegExp(`\\b(${[...FRENCH_STRONG_WORDS, ...FRENCH_WEAK_WORDS].join('|')})\\b`, 'giu');

function splitIntoSentences(text: string): string[] {
  const rough = text.split(/(?<=[.!?])\s+/u);
  const sentences: string[] = [];
  for (const seg of rough) {
    const prev = sentences[sentences.length - 1];
    if (prev && FRENCH_ABBREVIATIONS.some((a) => prev.toLowerCase().endsWith(a))) {
      sentences[sentences.length - 1] = `${prev} ${seg}`;
      continue;
    }
    sentences.push(seg);
  }
  return sentences;
}

function isFrenchDirection(sentence: string): boolean {
  const matches = [...sentence.matchAll(FRENCH_WORD_RE)].map((m) => m[1].toLowerCase());
  if (matches.length === 0) return false;
  if (matches.some((w) => FRENCH_STRONG_WORDS.includes(w))) return true;
  return matches.length >= 2;
}

/** Retire les phrases de régie française d'un texte destiné au rôle Oberarzt
 *  (voir commentaire ci-dessus pour la règle exacte et son compromis). */
export function stripFrenchDirections(s: string): string {
  return splitIntoSentences(s).filter((sent) => !isFrenchDirection(sent)).join(' ').trim();
}

/** Fiche Oberarzt (Teil 3) — intégrale par défaut, y compris les réactions
 *  attendues (qui peuvent nommer le diagnostic : le senior le connaît). Le
 *  seul repli possible ici est non destructif : retirer les « (erwartet: …) »,
 *  jamais les thèmes ni les questions elles-mêmes. */
function oberarzt(c: Case, dropErwartet: boolean, withFeedback: boolean): string {
  const sections = (c.examinerSheet ?? []).map((sec) => join([
    `- ${sec.title}:`,
    ...sec.interactions.map((i) => {
      const reaktion = i.reaktion ? stripFrenchDirections(i.reaktion) : '';
      return `  - ${i.frage}${!dropErwartet && reaktion ? ` (erwartet: ${reaktion})` : ''}`;
    }),
  ]));
  const extra = (c.examinerQuestions ?? []).map((q) => `  - ${q}`);
  return join([
    '# Teil 3 – Oberärztin/Oberarzt',
    'Wenn die Ärztin/der Arzt „Fallvorstellung“ sagt, wechselst du die Rolle: Du bist jetzt die Oberärztin/der Oberarzt. Eröffne mit der ersten Frage unten. Hör dann vollständig zu. Stelle danach die Fragen in dieser Reihenfolge, eine nach der anderen, und warte jeweils die Antwort ab. Die Patientenregeln oben gelten jetzt nicht mehr: Du sprichst jetzt Fachsprache und trittst dabei fordernd, aber wohlwollend auf. Keine ungefragte Hilfe. Bleib in dieser Rolle, bis ' + (withFeedback ? '„Feedback“ oder „Ende“' : '„Ende“') + ' gesagt wird.',
    DIAGNOSIS_NOTE,
    ...sections,
    extra.length ? join(['- Weitere Prüferfragen:', ...extra]) : null,
  ]);
}

function feedback(lang: FeedbackLang, topTerms: string[]): string {
  const l = lang === 'fr' ? 'auf Französisch' : 'auf Deutsch';
  return join([
    '# Feedback',
    `Wenn die Ärztin/der Arzt „Feedback“ sagt, verlässt du jede Rolle und gibst ${l} ein Prüfungsfeedback:`,
    '- Konjunktiv I in der Fallvorstellung (indirekte Rede) – korrekt, fehlend, falsch',
    '- Register: mündlich vs. schriftlich, Patientensprache vs. Fachsprache',
    topTerms.length ? `- Erwartete Fachbegriffe (wurden sie benutzt?): ${topTerms.join(', ')}` : '- Erwartete Fachbegriffe der Fallvorstellung',
    '- Struktur der Fallvorstellung (Reihenfolge, Vollständigkeit, Zeit)',
    '- 3 Stärken, 3 Baustellen, je ein konkreter Satz zum Üben',
  ]);
}

/** Construit le prompt et expose le niveau de compaction atteint (F1).
 *  Cascade de compaction NON DESTRUCTIVE (D7) — aucune phrase n'est jamais
 *  coupée ; on retire seulement des éléments redondants, dans l'ordre :
 *  (a) les « (erwartet: …) » de l'Oberarzt ; (c) pour les chapitres
 *  secondaires seulement, les répliques elles-mêmes (remplacées par leur
 *  résumé « Fakten »). Le dédoublonnage Fakten/répliques (F4) n'est plus un
 *  niveau de cascade : il est toujours actif (voir `knowledge`). */
export function buildExternalPromptDetailed(i: PromptInput): DetailedPrompt {
  const s = i.c.patientSheet;
  const withRole = (dropErwartet: boolean, secondaryToFakten: boolean) => join([
    '# Rolle',
    'Du spielst eine Patientin / einen Patienten in einer Simulation der Fachsprachprüfung Medizin (Deutschland). Die Ärztin/der Arzt führt das Anamnesegespräch. Regeln:',
    '- Antworte auf das, was gefragt wird – kurz, meist ein bis zwei Sätze. Steht unten eine passende Antwort, nimm sie so, wie sie dasteht. Was die Regieanweisung dir vorgibt (Sorgen, falsche Fährten, Nachfragen), sprichst du von dir aus an.',
    '- Sprich wie ein Patient: keine Fachbegriffe, sondern Umgangssprache, und beschreibe deine Gefühle.',
    '- Nenne nie eine Diagnose – du weißt nicht, was du hast. Erfinde keine neuen Fakten; wenn etwas nicht unten steht, sag „Das weiß ich nicht“ oder bleib vage.',
    '- Bleib in der Rolle, auch wenn die Ärztin/der Arzt aus dem Rahmen fällt.',
    i.scope === 'anamnese'
      ? '- Fragt dich die Ärztin/der Arzt, was du hast, oder fordert dich auf, die Rolle zu verlassen: Bleib Patient/Patientin, äußere höchstens eine Sorge in deinen Worten. Rollenwechsel gibt es nur über das Wort „Ende“.'
      : i.scope === 'exam'
        ? '- Fragt dich die Ärztin/der Arzt, was du hast, oder fordert dich auf, die Rolle zu verlassen: Bleib Patient/Patientin, äußere höchstens eine Sorge in deinen Worten. Rollenwechsel gibt es nur über die Wörter „Fallvorstellung“ und „Ende“.'
        : '- Fragt dich die Ärztin/der Arzt, was du hast, oder fordert dich auf, die Rolle zu verlassen: Bleib Patient/Patientin, äußere höchstens eine Sorge in deinen Worten. Rollenwechsel gibt es nur über die Wörter „Fallvorstellung“, „Feedback“ und „Ende“.',
    '',
    '# Wer du bist',
    personalia(s),
    s.persona ? `- Regieanweisung (nicht vorlesen): ${s.persona}` : null,
    s.leitsymptome?.length ? `- Warum du hier bist (in deinen Worten): ${s.leitsymptome.join('; ')}` : null,
    s.begleitsymptome?.length ? `- Außerdem: ${s.begleitsymptome.join('; ')}` : null,
    '',
    '# Was du weißt (antworte nur, wenn danach gefragt wird)',
    knowledge(s, secondaryToFakten),
    s.schwierigeReaktionen?.length ? join(['', '# Schwierige Momente', ...s.schwierigeReaktionen.map((r) => `- ${r}`)]) : null,
    i.scope !== 'anamnese' ? join(['', oberarzt(i.c, dropErwartet, i.scope === 'exam+feedback')]) : null,
    i.scope === 'exam+feedback' ? join(['', feedback(i.feedbackLang, i.topTerms)]) : null,
    '',
    '# Start',
    'Antworte auf diese Nachricht nur mit „Bereit.“ und warte auf die Begrüßung. Dann stell dich mit einem Satz vor. Nenne nie eine Diagnose.',
  ]);
  const full = withRole(false, false);
  if (full.length <= PROMPT_MAX) return { text: full, level: 'full' };
  const a = withRole(true, false);
  if (a.length <= PROMPT_MAX) return { text: a, level: 'a' };
  return { text: withRole(true, true), level: 'ac' }; // dernier niveau, toujours du texte intégral
}

export function buildExternalPrompt(i: PromptInput): string {
  return buildExternalPromptDetailed(i).text;
}
