// ============================================================================
// Personnage prêt à jouer pour une IA externe (ChatGPT, Claude, Gemini…).
// Source unique : le Rollenskript du simulant humain — ce que le partenaire
// lit, l'IA le joue. JAMAIS la fiche médicale (le patient ignore son
// diagnostic). Gabarit allemand, déterministe, testé par snapshot et sur le
// corpus (≤ PROMPT_MAX). Spec : 2026-09-17-external-ai-simulation-design.md
// ============================================================================
import type { Case, PatientSheet } from '@/db/types';
import { buildRollenskript } from '@/lib/rolePlay';

export type Scope = 'anamnese' | 'exam' | 'exam+feedback';
export type FeedbackLang = 'fr' | 'de';
export interface PromptInput { c: Case; scope: Scope; feedbackLang: FeedbackLang; topTerms: string[] }
export const PROMPT_MAX = 6000;
export const SCOPE_LABELS: Record<Scope, string> = { anamnese: 'Anamnèse seule', exam: 'Examen complet', 'exam+feedback': 'Examen + feedback' };

const GLANCE_MAX = 4;       // repli ultra-compact : borne le nb de Fakten par chapitre
const ITEM_CHARS_MAX = 40;  // repli ultra-compact : borne la longueur d'un Fakt / d'une réplique isolée
const LIST_CHARS_MAX = 120; // repli ultra-compact : borne un champ texte libre (persona, motifs…)

const join = (parts: (string | null)[], sep = '\n') => parts.filter((p): p is string => !!p).join(sep);
const trunc = (s: string, max: number) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

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

function knowledge(s: PatientSheet, compact: boolean, ultraCompact: boolean): string {
  const chapters = buildRollenskript(normalizeSheet(s));
  return chapters.map((ch) => {
    const glanceItems = ultraCompact ? ch.glance.slice(0, GLANCE_MAX).map((g) => trunc(g, ITEM_CHARS_MAX)) : ch.glance;
    const facts = glanceItems.length ? `  Fakten: ${glanceItems.join(' · ')}` : null;
    const lines = compact ? [] : ch.lines.map((l) => l.negativ ? `  - Nein: ${l.antwort}` : `  - ${l.frage ? `Wenn gefragt „${l.frage}“ → ` : ''}${l.antwort}`);
    return join([`### ${ch.title}`, facts, ...lines]);
  }).join('\n');
}

const OBERARZT_SECTIONS_MAX = 2;     // repli : borne le nb de thèmes Oberarzt
const OBERARZT_QUESTIONS_MAX = 2;    // repli : borne les questions Arzt-Arzt hors thèmes

// D3 (non négociable) : même dans la fiche de l'Oberarzt — qui, elle,
// connaît le diagnostic — le nom de la verdachtsdiagnose ne doit jamais
// apparaître littéralement dans le prompt, sinon l'IA externe le révèle en
// jouant le patient. Les questions du senior restent posables sans le nom.
function redactDiagnosis(text: string, vd?: string): string {
  if (!vd || vd.length <= 6) return text;
  return text.split(vd).join('[Diagnose]');
}

function oberarzt(c: Case, trim: boolean): string {
  const vd = c.medicalView?.verdachtsdiagnose;
  const shorten = (t: string) => (trim ? trunc(redactDiagnosis(t, vd), ITEM_CHARS_MAX) : redactDiagnosis(t, vd));
  const allSections = c.examinerSheet ?? [];
  const sections = (trim ? allSections.slice(0, OBERARZT_SECTIONS_MAX) : allSections)
    .map((sec) => join([`- ${shorten(sec.title)}:`, ...sec.interactions.map((i) => `  - ${shorten(i.frage)}${!trim && i.reaktion ? ` (erwartet: ${redactDiagnosis(i.reaktion, vd)})` : ''}`)]));
  const allExtra = c.examinerQuestions ?? [];
  const extra = (trim ? allExtra.slice(0, OBERARZT_QUESTIONS_MAX) : allExtra).map((q) => `  - ${shorten(q)}`);
  return join([
    '## Teil 3 – Oberarzt/Oberärztin',
    'Wenn die Ärztin/der Arzt „Fallvorstellung“ sagt, wechselst du die Rolle: Du bist jetzt die Oberärztin/der Oberarzt. Hör die Fallvorstellung vollständig an, dann stelle diese Fragen in dieser Reihenfolge – fordernd, aber wohlwollend. Keine ungefragte Hilfe. Bleib in dieser Rolle, bis erneut ein Rollenwechsel oder „Ende“ angesagt wird.',
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
  const withRole = (compact: boolean, ultraCompact: boolean) => {
    const cap = (t: string) => (ultraCompact ? trunc(t, LIST_CHARS_MAX) : t);
    return join([
      '# Rolle',
      'Du spielst eine Patientin / einen Patienten in einer Simulation der Fachsprachprüfung Medizin (Deutschland). Die Ärztin/der Arzt führt das Anamnesegespräch. Regeln:',
      '- Antworte NUR auf das, was gefragt wird. Ein bis zwei Sätze. Auf Deutsch.',
      '- Sprich wie ein Patient: keine Fachbegriffe von dir aus, Umgangssprache, Gefühle.',
      '- Nenne nie eine Diagnose – du weißt nicht, was du hast. Erfinde keine neuen Fakten; wenn etwas nicht unten steht, sag „Das weiß ich nicht“ oder bleib vage.',
      '- Bleib in der Rolle, auch wenn die Ärztin/der Arzt aus dem Rahmen fällt.',
      '',
      '# Wer du bist',
      personalia(s),
      s.persona ? `- Regieanweisung (nicht vorlesen): ${cap(s.persona)}` : null,
      s.leitsymptome?.length ? `- Warum du hier bist (in deinen Worten): ${cap(s.leitsymptome.join('; '))}` : null,
      s.begleitsymptome?.length ? `- Außerdem: ${cap(s.begleitsymptome.join('; '))}` : null,
      '',
      '# Was du weißt (antworte nur, wenn danach gefragt wird)',
      knowledge(s, compact, ultraCompact),
      s.schwierigeReaktionen?.length ? join(['', '## Schwierige Momente', ...(ultraCompact ? s.schwierigeReaktionen.slice(0, 2) : s.schwierigeReaktionen).map((r) => `- ${cap(r)}`)]) : null,
      i.scope !== 'anamnese' ? join(['', oberarzt(i.c, ultraCompact)]) : null,
      i.scope === 'exam+feedback' ? join(['', feedback(i.feedbackLang, i.topTerms)]) : null,
      '',
      '# Start',
      'Stell dich mit einem Satz vor, sobald die Ärztin/der Arzt dich begrüßt. Nenne nie eine Diagnose. Sprachmodus empfohlen.',
    ]);
  };
  // Repli en cascade — jamais d'augmentation de PROMPT_MAX, jamais de perte du
  // rôle ou de la règle D3 : on réduit le VOLUME (répliques déjà connues,
  // détail Oberarzt, longueur des champs libres), jamais le PÉRIMÈTRE (aucune
  // fiche médicale ajoutée). Garde-fou ultime en toute dernière ligne : même
  // un cas imprévu ne peut jamais dépasser PROMPT_MAX.
  const full = withRole(false, false);
  if (full.length <= PROMPT_MAX) return full;
  const compact = withRole(true, false);   // chapitres en « Fakten » seulement, Oberarzt inchangé
  if (compact.length <= PROMPT_MAX) return compact;
  const compactTrimmed = withRole(true, true); // + Fakten ≤ GLANCE_MAX/chapitre, champs libres et Oberarzt condensés
  if (compactTrimmed.length <= PROMPT_MAX) return compactTrimmed;
  return compactTrimmed.slice(0, PROMPT_MAX);
}
