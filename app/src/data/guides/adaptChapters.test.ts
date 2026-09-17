import { describe, expect, it } from 'vitest';
import { adaptChaptersForCase, caseQuestionsForFach } from './anamneseChapters';
import { phraseIsCaseSpecific, phraseProbes, phraseText } from './phrases';
import type { Case } from '@/db/types';

// Cas minimal : seuls les champs lus par l'adaptation comptent.
const mk = (over: Partial<Case['patientSheet']['personalia']>, csq: Case['caseSpecificQuestions'] = []): Case =>
  ({ patientSheet: { personalia: { name: 'X', age: 30, geschlecht: 'w', ...over }, schmerz: {} }, caseSpecificQuestions: csq } as unknown as Case);
const frauen = (c: Case) => adaptChaptersForCase(c).find((ch) => ch.id === 'frauenanamnese');
const probesOf = (c: Case) => frauen(c)!.questions.flatMap(phraseProbes);

describe('Frauenanamnese selon l’âge (FB2-J5)', () => {
  it('à 25 ans : pas de Wechseljahre, mais règles / grossesse / contraception', () => {
    expect(probesOf(mk({ age: 25 }))).toEqual(['frau-periode', 'frau-schwanger', 'frau-verhuetung']);
  });
  it('à 50 ans : tout, et la question de ménopause sans « Falls »', () => {
    const p = probesOf(mk({ age: 50 }));
    expect(p).toContain('frau-wechseljahre');
    const q = frauen(mk({ age: 50 }))!.questions.find((x) => phraseProbes(x).includes('frau-wechseljahre'))!;
    expect(phraseText(q)).toMatch(/^Sind Sie schon in den Wechseljahren/);
  });
  it('à 70 ans : ni grossesse ni contraception, seulement la dernière règle et le gynécologue', () => {
    expect(probesOf(mk({ age: 70 }))).toEqual(['frau-wechseljahre']);
  });
  it('homme : pas de Frauenanamnese', () => {
    expect(frauen(mk({ age: 50, geschlecht: 'm' }))).toBeUndefined();
  });
});

describe('Questions propres au cas dans leur sous-chapitre (FB2-J4)', () => {
  const c = mk({ age: 40 }, [
    { frage: 'Blut im Stuhl?', kapitel: 'aktuell' },
    { frage: 'Nehmen Sie Blutverdünner?', kapitel: 'medikamente' },
    { frage: 'Nitrospray benutzt?', kapitel: 'fach' },
    'Chaîne nue = aktuell',
  ]);
  it('chaque question est ajoutée en FIN de son chapitre, marquée caseSpecific', () => {
    const ch = adaptChaptersForCase(c);
    const akt = ch.find((x) => x.id === 'aktuell')!.questions;
    const med = ch.find((x) => x.id === 'medikamente')!.questions;
    expect(akt.slice(-2).map(phraseText)).toEqual(['Blut im Stuhl?', 'Chaîne nue = aktuell']);
    expect(akt.slice(-2).every(phraseIsCaseSpecific)).toBe(true);
    expect(phraseText(med[med.length - 1])).toBe('Nehmen Sie Blutverdünner?');
    expect(akt.slice(0, -2).some(phraseIsCaseSpecific)).toBe(false);
  });
  it('les questions « fach » vont à la Fachanamnese, pas aux chapitres généraux', () => {
    expect(caseQuestionsForFach(c).map((q) => q.text)).toEqual(['Nitrospray benutzt?']);
    expect(adaptChaptersForCase(c).flatMap((x) => x.questions).map(phraseText)).not.toContain('Nitrospray benutzt?');
  });
});
