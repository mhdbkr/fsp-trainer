import { describe, it, expect } from 'vitest';
import { buildExternalPrompt, PROMPT_MAX } from './prompt';
import type { Case } from '@/db/types';

const c = {
  id: 'case-test', name: 'Ulcus ventriculi', pathology: 'ulcus', specialty: 'Gastroenterologie',
  patientSheet: {
    personalia: { name: 'Karl Müller', age: 58, geschlecht: 'm', beruf: 'Maschinenarbeiter', familienstand: 'verheiratet', wohnsituation: 'Wohnung, 2. Stock, mit Ehefrau', hausarzt: 'Dr. Weber' },
    leitsymptome: ['Schmerzen im Oberbauch seit 3 Wochen'], begleitsymptome: ['Übelkeit'],
    antworten: { 'akt-motiv': 'Ich habe seit drei Wochen Schmerzen im Oberbauch.', 'akt-beginn': 'Das hat langsam angefangen.' },
    negativeFindings: ['Fieber'], vegetativeAnamnese: [],
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
  it('ne divulgue jamais la fiche médicale', () => {
    for (const scope of ['anamnese', 'exam', 'exam+feedback'] as const) {
      const p = buildExternalPrompt({ ...base, scope });
      expect(p).not.toContain('Ulcus ventriculi');            // verdachtsdiagnose
      expect(p).not.toContain('ein Geschwür im Magen');        // medicalView.patientWorte
    }
  });
  it('exam : section Oberarzt avec les questions dans l\'ordre, attendus entre parenthèses, puis examinerQuestions', () => {
    const p = buildExternalPrompt({ ...base, scope: 'exam' });
    const i1 = p.indexOf('Welche Differenzialdiagnosen'); const i2 = p.indexOf('Wie gehen Sie weiter vor?');
    expect(i1).toBeGreaterThan(0); expect(i2).toBeGreaterThan(i1);
    expect(p).toContain('(erwartet: Gastritis, Pankreatitis)');
    expect(p).toContain('„Fallvorstellung“'); expect(p).not.toContain('„Feedback“');
  });
  it('exam+feedback : grille avec les termes attendus, langue du feedback', () => {
    const fr = buildExternalPrompt({ ...base, scope: 'exam+feedback' });
    expect(fr).toContain('„Feedback“'); expect(fr).toContain('Ulkus'); expect(fr).toContain('Hämatemesis'); expect(fr).toContain('Konjunktiv I'); expect(fr).toContain('auf Französisch');
    const de = buildExternalPrompt({ ...base, scope: 'exam+feedback', feedbackLang: 'de' });
    expect(de).toContain('auf Deutsch'); expect(de).not.toContain('auf Französisch');
  });
  it('taille bornée sur ce cas', () => { expect(buildExternalPrompt({ ...base, scope: 'exam+feedback' }).length).toBeLessThanOrEqual(PROMPT_MAX); });
});
