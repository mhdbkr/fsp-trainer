import { describe, it, expect } from 'vitest';
import { buildPromptPaket, promptText, AUSGABE, ANREDE_MAX, BEGRUESSUNG } from './prompt';
import type { Case } from '@/db/types';

const c = {
  id: 'case-test', name: 'Schmerzen im Oberbauch', pathology: 'Ulcus ventriculi', specialty: 'Gastroenterologie',
  patientSheet: {
    personalia: { name: 'Karl Müller', age: 58, geschlecht: 'm', beruf: 'Maschinenarbeiter', hausarzt: 'Dr. Weber' },
    leitsymptome: ['Schmerzen im Oberbauch seit 3 Wochen'], begleitsymptome: ['Übelkeit'],
    antworten: {
      'akt-motiv': 'Ich habe seit drei Wochen Schmerzen im Oberbauch.',
      'akt-beginn': 'Das hat langsam angefangen (spricht gegen Pankreatitis).',
    },
    negativeFindings: ['kein Fieber (gegen Cholezystitis)'], vegetativeAnamnese: [],
    vorerkrankungen: [], voroperationen: [], medikamente: ['Ibuprofen bei Bedarf'], allergien: [], unvertraeglichkeiten: [],
    noxen: {}, familienanamnese: [], sozialanamnese: [],
    schwierigeReaktionen: ['„Ist das Krebs, Herr Doktor?“'],
    persona: 'Tu minimises tes douleurs ; tu ne parles du sang dans les selles que si on te le demande.',
  },
  medicalView: {
    verdachtsdiagnose: 'Ulcus ventriculi bei NSAR-Einnahme', differenzialdiagnosen: [{ dd: 'Gastritis', unterscheidung: 'x' }, { dd: 'Pankreatitis', unterscheidung: 'y' }],
    diagnostik: [], therapie: [], patientWorte: { verdacht: 'ein Geschwür im Magen', diagnostik: '', therapie: '' },
  },
  examinerSheet: [{ title: 'Nach der Vorstellung', interactions: [
    { frage: 'Stellen Sie mir bitte den Fall vor.', reaktion: 'Erwartet: strukturierte Vorstellung.' },
    { frage: 'Welche Differenzialdiagnosen kommen in Frage?', reaktion: 'Gastritis, Pankreatitis' },
  ] }],
  examinerQuestions: ['Wie gehen Sie weiter vor?'],
  linkedFachbegriffeIds: [], probableAufklaerungIds: [], caseSpecificQuestions: [], centers: [], frequency: 1, difficulty: 1,
} as unknown as Case;

const count = (s: string, sub: string) => s.split(sub).length - 1;

describe('buildPromptPaket — Teil Anamnese ⇒ rôle patient', () => {
  const p = buildPromptPaket(c, 'anamnese');
  const full = promptText(p);

  it('un seul rôle, amorce courte, une seule instruction de sortie (A1, A3, A5)', () => {
    expect(p.modus).toBe('patient');
    expect(p.caseId).toBe('case-test');
    expect(p.anrede.length).toBeLessThanOrEqual(ANREDE_MAX);
    expect(count(p.anrede, AUSGABE.patient)).toBe(1);
    expect(count(full, 'Antworte ausschließlich')).toBe(1);
    expect(p.anrede).toContain('Karl Müller');
    expect(p.anrede).toContain('58');
    expect(p.anrede).not.toMatch(/Oberarzt|Oberärztin/);
  });

  it('les faits du patient en verbatim, sans régie française ni négatifs annotés', () => {
    expect(p.akte).toContain('Ich habe seit drei Wochen Schmerzen im Oberbauch.');
    expect(p.akte).toContain('Ibuprofen bei Bedarf');
    expect(p.akte).toContain('Ist das Krebs, Herr Doktor?');
    expect(full).not.toContain('minimises');
    expect(full).not.toContain('Regieanweisung');
  });

  it('aucune fuite : ni diagnostic, ni différentiels, ni justification (D1, D2, D3)', () => {
    for (const s of ['Ulcus ventriculi', 'ein Geschwür im Magen', 'Pankreatitis', 'Cholezystitis', 'Gastritis', '(erwartet', 'gegen', 'Oberärztin/der Oberarzt']) {
      expect(full).not.toContain(s);
    }
    expect(p.akte).toContain('Das hat langsam angefangen.');
  });

  it('le candidat salue en premier : le texte se termine sur sa salutation à compléter (A6)', () => {
    expect(full.trimEnd().endsWith(BEGRUESSUNG)).toBe(true);
    expect(full).not.toMatch(/warte[^.]*\.\s*Dann/);
    expect(full).not.toMatch(/Feedback|bewerte|Korrektur|Fehler|Note\b/);
  });
});

describe('buildPromptPaket — Teil Fallvorstellung ⇒ Oberarzt seul', () => {
  const p = buildPromptPaket(c, 'fallvorstellung');
  const full = promptText(p);

  it('un seul rôle, une seule instruction de sortie, pas de « Patient » dans l\'amorce (A3, A5)', () => {
    expect(p.modus).toBe('oberarzt');
    expect(p.anrede.length).toBeLessThanOrEqual(ANREDE_MAX);
    expect(count(p.anrede, AUSGABE.oberarzt)).toBe(1);
    expect(count(full, 'Antworte ausschließlich')).toBe(1);
    expect(p.anrede).not.toMatch(/Patient/);
    expect(p.anrede).toContain('Gastroenterologie');
  });

  it('connaît le diagnostic et pose ses questions dans l\'ordre', () => {
    expect(p.akte).toContain('Ulcus ventriculi bei NSAR-Einnahme');
    expect(p.akte).toContain('Gastritis');
    const i1 = p.akte.indexOf('Stellen Sie mir bitte den Fall vor.');
    const i2 = p.akte.indexOf('Welche Differenzialdiagnosen');
    expect(i1).toBeGreaterThan(-1);
    expect(i2).toBeGreaterThan(i1);
  });

  it('sans le script du patient (O1) ni les réponses attendues', () => {
    expect(p.akte).not.toContain('Ich habe seit drei Wochen Schmerzen im Oberbauch.');
    expect(p.akte).not.toContain('kein Fieber');
    expect(p.akte).not.toContain('Erwartet');
    expect(full.trimEnd().endsWith(BEGRUESSUNG)).toBe(false);
  });

  it('connaît les faits structurés du cas pour juger la présentation (sans répliques)', () => {
    const fall = p.akte.slice(p.akte.indexOf('## Der Fall'), p.akte.indexOf('## Diagnose'));
    expect(p.akte.indexOf('## Der Fall')).toBeGreaterThan(-1);
    for (const s of ['Karl Müller', '58 Jahre', 'männlich', 'Maschinenarbeiter', 'Ibuprofen bei Bedarf']) expect(fall).toContain(s);
    expect(fall).not.toContain('Ich habe');
  });

  it('sans examinerSheet, les examinerQuestions servent de liste', () => {
    const p2 = buildPromptPaket({ ...c, examinerSheet: [] } as Case, 'fallvorstellung');
    expect(p2.akte).toContain('Wie gehen Sie weiter vor?');
  });
});
