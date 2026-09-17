import { describe, expect, it } from 'vitest';
import { adaptChaptersForCase, caseQuestionsForFach, fachChapterForCase } from './anamneseChapters';
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
    expect(phraseText(q)).toMatch(/^Haben die Wechseljahre bei Ihnen schon begonnen/);
  });
  it('à 70 ans : ni grossesse ni contraception ; la question des règles devient celle du saignement post-ménopausique', () => {
    const qs = frauen(mk({ age: 70 }))!.questions;
    expect(qs.flatMap(phraseProbes)).toEqual(['frau-periode', 'frau-wechseljahre']);
    expect(phraseText(qs[0])).toMatch(/seitdem noch einmal eine Blutung/);
    expect(frauen(mk({ age: 70 }))!.tip).not.toMatch(/âge de procréer/);
  });
  it('à 50 ans : la dernière règle n’est pas demandée deux fois', () => {
    const texts = frauen(mk({ age: 50 }))!.questions.map(phraseText);
    expect(texts.filter((t) => /letzte (Regel|Periode)/i.test(t))).toHaveLength(1);
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

describe('Fachanamnese jouée (fachChapterForCase)', () => {
  const base = { patientSheet: { personalia: { name: 'X', age: 40, geschlecht: 'w' }, schmerz: {} }, caseSpecificQuestions: [] };
  it('une TVT classée cardio joue l’angiologie via l’override (FB2-K1)', () => {
    const c = { ...base, specialty: 'Kardiologie', fachanamnese: 'Angiologie' } as unknown as Case;
    const f = fachChapterForCase(c)!;
    expect(f.chapter.id).toBe('fach-gefaess');
    expect(f.chapter.questions.flatMap(phraseProbes)).toContain('fach-gefaess-gehstrecke');
  });
  it('chez une femme, la Fachanamnese urologique ne parle ni d’érection ni de prostate', () => {
    const c = { ...base, specialty: 'Urologie' } as unknown as Case;
    const texts = fachChapterForCase(c)!.chapter.questions.map(phraseText).join(' ');
    expect(texts).not.toMatch(/Erektion|Prostata/);
    const m = { ...base, specialty: 'Urologie', patientSheet: { ...base.patientSheet, personalia: { ...base.patientSheet.personalia, geschlecht: 'm' } } } as unknown as Case;
    expect(fachChapterForCase(m)!.chapter.questions.map(phraseText).join(' ')).toMatch(/Erektion/);
  });
});

describe('Aktuelle Beschwerden par nature du motif (FB2-J1)', () => {
  const mkKat = (k: string) => ({ patientSheet: { personalia: { name: 'X', age: 40, geschlecht: 'm' }, leitsymptomKategorie: k }, caseSpecificQuestions: [] } as unknown as Case);
  const aktuell = (k: string) => adaptChaptersForCase(mkKat(k)).find((ch) => ch.id === 'aktuell')!;
  it('un cas d’essoufflement n’a ni échelle de douleur ni irradiation', () => {
    const probes = aktuell('atemnot').questions.flatMap(phraseProbes);
    expect(probes).toContain('akt-atemnot-belastung');
    expect(probes).not.toContain('akt-intensitaet');
    expect(probes).not.toContain('akt-ausstrahlung');
    expect(aktuell('atemnot').questions.map(phraseText).join(' ')).not.toMatch(/Skala/);
  });
  it('un cas de douleur garde OPQRST intact', () => {
    expect(aktuell('schmerz').questions.flatMap(phraseProbes)).toEqual(expect.arrayContaining(['akt-ort', 'akt-charakter', 'akt-intensitaet', 'akt-ausstrahlung']));
  });
  it('sans catégorie : douleur si un bloc schmerz existe', () => {
    const c = { patientSheet: { personalia: { name: 'X', age: 40, geschlecht: 'm' }, schmerz: {} }, caseSpecificQuestions: [] } as unknown as Case;
    expect(adaptChaptersForCase(c).find((ch) => ch.id === 'aktuell')!.questions.flatMap(phraseProbes)).toContain('akt-ort');
  });
});

describe('Un seul endroit par trame (FACH_COVERS, aktuellSkip, règles de Fach)', () => {
  const mk = (over: Record<string, unknown>) => ({ caseSpecificQuestions: [], ...over } as unknown as Case);
  it('la variante psychisch ne repose pas ce que la Fach Psychiatrie demande (Stimmung, sécurité)', () => {
    const c = mk({ specialty: 'Psychiatrie', patientSheet: { personalia: { name: 'X', age: 40, geschlecht: 'm' }, leitsymptomKategorie: 'psychisch' } });
    const akt = adaptChaptersForCase(c).find((ch) => ch.id === 'aktuell')!.questions.flatMap(phraseProbes);
    expect(akt).not.toContain('akt-psych-stimmung');
    expect(akt).not.toContain('akt-psych-sicherheit');
    // Sans Fach psy, la variante les pose.
    const d = mk({ specialty: 'Kardiologie', patientSheet: { personalia: { name: 'X', age: 40, geschlecht: 'm' }, leitsymptomKategorie: 'psychisch' } });
    expect(adaptChaptersForCase(d).find((ch) => ch.id === 'aktuell')!.questions.flatMap(phraseProbes)).toContain('akt-psych-sicherheit');
  });
  it('aktuellSkip retire une dimension qui n’a pas de sens pour ce cas', () => {
    const c = mk({ specialty: 'Dermatologie', patientSheet: { personalia: { name: 'X', age: 30, geschlecht: 'w' }, leitsymptomKategorie: 'atemnot', aktuellSkip: ['akt-atemnot-nachts'] } });
    expect(adaptChaptersForCase(c).find((ch) => ch.id === 'aktuell')!.questions.flatMap(phraseProbes)).not.toContain('akt-atemnot-nachts');
  });
  it('la pilule ne se demande ni à un homme ni après 55 ans (Fach angiologie)', () => {
    const m = mk({ specialty: 'Kardiologie', fachanamnese: 'Angiologie', patientSheet: { personalia: { name: 'X', age: 60, geschlecht: 'm' }, schmerz: {} } });
    const w70 = mk({ specialty: 'Kardiologie', fachanamnese: 'Angiologie', patientSheet: { personalia: { name: 'X', age: 70, geschlecht: 'w' }, schmerz: {} } });
    const w30 = mk({ specialty: 'Kardiologie', fachanamnese: 'Angiologie', patientSheet: { personalia: { name: 'X', age: 30, geschlecht: 'w' }, schmerz: {} } });
    const probes = (c: Case) => fachChapterForCase(c)!.chapter.questions.flatMap(phraseProbes);
    expect(probes(m)).not.toContain('fach-gefaess-hormone');
    expect(probes(w70)).not.toContain('fach-gefaess-hormone');
    expect(probes(w30)).toContain('fach-gefaess-hormone');
  });
  it('la Sexualanamnese urologique ne demande pas la contraception à 76 ans', () => {
    const c = mk({ specialty: 'Urologie', patientSheet: { personalia: { name: 'X', age: 76, geschlecht: 'w' }, schmerz: {} } });
    expect(fachChapterForCase(c)!.chapter.questions.map(phraseText).join(' ')).not.toMatch(/verhüten/);
  });
});
