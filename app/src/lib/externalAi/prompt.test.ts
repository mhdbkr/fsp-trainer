import { describe, it, expect } from 'vitest';
import { buildExternalPrompt, buildExternalPromptDetailed, PROMPT_MAX, PREFILL_MAX, stripFrenchDirections } from './prompt';
import type { Case } from '@/db/types';

const c = {
  id: 'case-test', name: 'Ulcus ventriculi', pathology: 'ulcus', specialty: 'Gastroenterologie',
  patientSheet: {
    personalia: { name: 'Karl Müller', age: 58, geschlecht: 'm', beruf: 'Maschinenarbeiter', familienstand: 'verheiratet', wohnsituation: 'Wohnung, 2. Stock, mit Ehefrau', hausarzt: 'Dr. Weber' },
    leitsymptome: ['Schmerzen im Oberbauch seit 3 Wochen'], begleitsymptome: ['Übelkeit'],
    antworten: { 'akt-motiv': 'Ich habe seit drei Wochen Schmerzen im Oberbauch.', 'akt-beginn': 'Das hat langsam angefangen.' },
    negativeFindings: ['Fieber'], vegetativeAnamnese: [],
    vorerkrankungen: [], voroperationen: [], medikamente: [], allergien: [], unvertraeglichkeiten: [],
    noxen: {}, familienanamnese: [], sozialanamnese: [],
    schwierigeReaktionen: ['Wird ungeduldig, wenn Fachwörter benutzt werden'],
    persona: 'Tu minimises tes douleurs ; tu ne parles du sang dans les selles que si on te le demande.',
  },
  medicalView: { verdachtsdiagnose: 'Ulcus ventriculi', patientWorte: { verdacht: 'ein Geschwür im Magen' } },
  examinerSheet: [{ title: 'Nach der Vorstellung', interactions: [{ frage: 'Welche Differenzialdiagnosen kommen in Frage?', reaktion: 'Gastritis, Pankreatitis' }] }],
  examinerQuestions: ['Wie gehen Sie weiter vor?'],
  linkedFachbegriffeIds: [], probableAufklaerungIds: [], caseSpecificQuestions: [], centers: [], frequency: 1, difficulty: 1,
} as unknown as Case;
const base = { c, feedbackLang: 'fr' as const, topTerms: ['Ulkus', 'Hämatemesis'] };

describe('buildExternalPrompt', () => {
  it('anamnese : rôle, personalia, chaque réponse du Rollenskript, négatifs, réactions difficiles, persona', () => {
    const p = buildExternalPrompt({ ...base, scope: 'anamnese' });
    for (const s of ['Karl Müller', '58', 'Maschinenarbeiter', 'Dr. Weber', 'Ich habe seit drei Wochen Schmerzen im Oberbauch.', 'Das hat langsam angefangen.', 'Nein: Fieber', 'Wird ungeduldig', 'Regieanweisung', 'minimises tes douleurs', 'Nenne nie eine Diagnose']) expect(p).toContain(s);
    expect(p).not.toContain('Fallvorstellung'); expect(p).not.toContain('Feedback');
  });
  it('ne divulgue jamais la fiche médicale AVANT la section Oberarzt (Teil 3) — toléré après, le senior connaît le diagnostic', () => {
    for (const scope of ['anamnese', 'exam', 'exam+feedback'] as const) {
      const p = buildExternalPrompt({ ...base, scope });
      const [beforeTeil3] = p.split('# Teil 3 – Oberärztin/Oberarzt');
      expect(beforeTeil3).not.toContain('Ulcus ventriculi');            // verdachtsdiagnose
      expect(beforeTeil3).not.toContain('ein Geschwür im Magen');        // medicalView.patientWorte
    }
  });
  it('exam : section Oberarzt avec les questions dans l\'ordre, attendus entre parenthèses, puis examinerQuestions, marqueur exact, note diagnostic', () => {
    const p = buildExternalPrompt({ ...base, scope: 'exam' });
    expect(p).toContain('# Teil 3 – Oberärztin/Oberarzt');
    expect(p).toContain('Alles in diesem Teil weiß nur die Oberärztin/der Oberarzt.');
    const i1 = p.indexOf('Welche Differenzialdiagnosen'); const i2 = p.indexOf('Wie gehen Sie weiter vor?');
    expect(i1).toBeGreaterThan(0); expect(i2).toBeGreaterThan(i1);
    expect(p).toContain('(erwartet: Gastritis, Pankreatitis)');
    expect(p).toContain('„Fallvorstellung“');
    expect(p).not.toContain('# Feedback'); // pas de grille de feedback hors scope exam+feedback
  });
  it('exam+feedback : grille avec les termes attendus, langue du feedback', () => {
    const fr = buildExternalPrompt({ ...base, scope: 'exam+feedback' });
    expect(fr).toContain('„Feedback“'); expect(fr).toContain('Ulkus'); expect(fr).toContain('Hämatemesis'); expect(fr).toContain('Konjunktiv I'); expect(fr).toContain('auf Französisch');
    const de = buildExternalPrompt({ ...base, scope: 'exam+feedback', feedbackLang: 'de' });
    expect(de).toContain('auf Deutsch'); expect(de).not.toContain('auf Französisch');
  });
  it('taille bornée par PROMPT_MAX sur ce cas (petit cas : loin sous la borne), niveau full', () => {
    const d = buildExternalPromptDetailed({ ...base, scope: 'exam+feedback' });
    expect(d.text.length).toBeLessThanOrEqual(PROMPT_MAX);
    expect(d.level).toBe('full');
  });
  it('PREFILL_MAX < PROMPT_MAX (le premier est une limite d\'URL, le second une borne dure du prompt)', () => {
    expect(PREFILL_MAX).toBeLessThan(PROMPT_MAX);
  });
});

// ----------------------------------------------------------------------------
// Cascade de compaction NON DESTRUCTIVE (D7) — cas artificiels. Aucune phrase
// n'est jamais coupée : on retire seulement des éléments redondants, dans
// l'ordre (a) erwartet Oberarzt, (c) répliques des chapitres secondaires
// (personalia/vegetativ/familie-sozial) → résumé Fakten. Niveaux exposés par
// buildExternalPromptDetailed : 'full' | 'a' | 'ac'.
// ----------------------------------------------------------------------------
describe('cascade de compaction non destructive (cas artificiels)', () => {
  const bigCase = (overrides: Record<string, unknown>) => ({
    id: 'case-artificial', name: 'Testfall', pathology: 'test', specialty: 'Innere Medizin',
    patientSheet: {
      personalia: { name: 'Erika Beispiel', age: 40, geschlecht: 'w' },
      leitsymptome: ['Testmotiv'], begleitsymptome: [],
      antworten: { 'akt-motiv': 'Ich bin seit einer Woche krank.' },
      vegetativeAnamnese: ['Kein Fieber'],
      vorerkrankungen: [], voroperationen: [], medikamente: [], allergien: [], unvertraeglichkeiten: [],
      noxen: {},
      familienanamnese: ['Mutter: Diabetes'], sozialanamnese: ['Nichtraucher'],
      ...overrides,
    },
    medicalView: { verdachtsdiagnose: 'Testdiagnose', patientWorte: { verdacht: 'ein Test' } },
    examinerSheet: [], examinerQuestions: [],
    linkedFachbegriffeIds: [], probableAufklaerungIds: [], caseSpecificQuestions: [], centers: [], frequency: 1, difficulty: 1,
  } as unknown as Case);

  it('niveau (a) suffit : des « erwartet » très longs font dépasser PROMPT_MAX, les retirer suffit — rien d\'autre n\'est perdu', () => {
    const longReaktion = 'Erwartete Antwort im Detail. '.repeat(600); // ~17 400 chars
    const c1 = bigCase({});
    (c1 as unknown as { examinerSheet: unknown }).examinerSheet = Array.from({ length: 12 }, (_, k) => ({
      title: `Thema ${k}`,
      interactions: [{ frage: `Frage Nummer ${k} ?`, reaktion: longReaktion }],
    })); // ≈ 12 × 17 400 ≈ 208 800 chars bruts, largement > PROMPT_MAX
    const d = buildExternalPromptDetailed({ c: c1, scope: 'exam', feedbackLang: 'fr', topTerms: [] });
    expect(d.text.length).toBeLessThanOrEqual(PROMPT_MAX);
    expect(d.level).toBe('a');
    expect(d.text).not.toContain('(erwartet:');
    expect(d.text).not.toContain('…'); // jamais de troncature
    for (let k = 0; k < 12; k++) expect(d.text).toContain(`Frage Nummer ${k} ?`); // les questions restent intégrales
  });

  it('niveau (ac) nécessaire : de longues répliques dans les chapitres secondaires forcent le repli en Fakten, mais aktuell/fach restent intégraux', () => {
    const longAntwort = (n: number) => `Réponse détaillée numéro ${n}, avec beaucoup de contexte redondant pour occuper de la place et faire dépasser la borne. `.repeat(40);
    const c2 = bigCase({
      antworten: { 'akt-motiv': 'Ich bin seit einer Woche krank und habe starke Bauchschmerzen, die immer schlimmer werden.' },
      frageAntworten: [
        ...Array.from({ length: 60 }, (_, k) => ({ frage: `Vegetativ-Frage ${k}`, antwort: longAntwort(k), kapitel: 'vegetativ' as const })),
        ...Array.from({ length: 60 }, (_, k) => ({ frage: `Sozial-Frage ${k}`, antwort: longAntwort(100 + k), kapitel: 'familie-sozial' as const })),
      ], // ≈ 120 × ~5 000 chars ≈ 600 000 chars bruts, largement > PROMPT_MAX même après (a)
      vegetativeAnamnese: ['Kein Fieber'],
      familienanamnese: ['Mutter: Diabetes'], sozialanamnese: ['Nichtraucher'],
    });
    const d = buildExternalPromptDetailed({ c: c2, scope: 'anamnese', feedbackLang: 'fr', topTerms: [] });
    expect(d.text.length).toBeLessThanOrEqual(PROMPT_MAX);
    expect(d.level).toBe('ac');
    expect(d.text).not.toContain('…'); // jamais de troncature, même au dernier niveau
    // Fidélité : la réplique du motif principal (chapitre non secondaire) reste intégrale.
    expect(d.text).toContain('Ich bin seit einer Woche krank und habe starke Bauchschmerzen, die immer schlimmer werden.');
    // Compaction : les longues répliques secondaires ont été remplacées par leur résumé Fakten.
    expect(d.text).not.toContain('Vegetativ-Frage 0');
    expect(d.text).not.toContain('Sozial-Frage 0');
    expect(d.text).toContain('Fakten: Kein Fieber');
    expect(d.text).toContain('Mutter: Diabetes');
  });
});

// ----------------------------------------------------------------------------
// E — régie française résiduelle dans examinerSheet[].interactions[].reaktion
// (relecture langue allemande). Les 3 exemples réels viennent du corpus.
// ----------------------------------------------------------------------------
describe('stripFrenchDirections', () => {
  it('retire une phrase française portée par un mot fort (« Relance… »), garde la phrase allemande intacte', () => {
    const input = 'ca. 10 Flaschen Bier + 3 Flaschen Schnaps pro Tag seit 20 Jahren. Relance si le candidat reste vague.';
    expect(stripFrenchDirections(input)).toBe('ca. 10 Flaschen Bier + 3 Flaschen Schnaps pro Tag seit 20 Jahren.');
  });

  it('retire une phrase française portée par un mot fort (« Demande un… »), garde la phrase allemande intacte', () => {
    const input = 'hepatozelluläres Karzinom, Pankreaskarzinom, Rechtsherzinsuffizienz. Demande un critère distinctif pour chacune.';
    expect(stripFrenchDirections(input)).toBe('hepatozelluläres Karzinom, Pankreaskarzinom, Rechtsherzinsuffizienz.');
  });

  it('phrase mixte allemand+français sans ponctuation séparatrice (« sur les arguments — … ») : COMPROMIS documenté — la règle simple (≥2 mots-outils FR ou un mot fort ⇒ phrase entière retirée) retire aussi le fragment allemand adjacent plutôt que de découper sur « — ». Attendu minimal : aucune phrase française ne survit.', () => {
    const input = 'Leberzirrhose (alkoholtoxisch) sur les arguments — Aszite, Ödeme, Hämatome, heller Stuhl, Alkoholanamnese. Le simulant hoche la tête si les arguments sont nommés.';
    const out = stripFrenchDirections(input);
    expect(out).not.toContain('sur les arguments');
    expect(out).not.toContain('Le simulant');
    expect(out).not.toContain('candidat');
  });

  it('un mot-outil FR isolé (faux ami allemand, ex. « des » génitif) ne suffit pas seul à déclencher le retrait', () => {
    const input = 'Symptome des Patienten seit drei Wochen, keine Fieberschübe.';
    expect(stripFrenchDirections(input)).toBe(input);
  });

  it('sans aucune régie française, le texte est rendu intact (trim seul)', () => {
    const input = 'Gastritis, Pankreatitis';
    expect(stripFrenchDirections(input)).toBe('Gastritis, Pankreatitis');
  });
});
