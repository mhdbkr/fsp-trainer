import { describe, expect, it } from 'vitest';
import { adaptChaptersForCase, caseQuestionsForFach, fachChapterForCase } from './anamneseChapters';
import { phraseAlts, phraseFollowUp, phraseIsCaseSpecific, phraseProbes, phraseText } from './phrases';
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
    expect(phraseText(qs[0])).toBe('Wann hatten Sie Ihre letzte Regelblutung?');
    expect(phraseFollowUp(qs[0])).toEqual(['Hatten Sie seitdem noch einmal eine Blutung?']);
    expect(frauen(mk({ age: 70 }))!.tip).not.toMatch(/âge de procréer/);
  });
  it('à 50 ans : la dernière règle n’est pas demandée deux fois', () => {
    // Texte ET relances : la dernière règle est une relance de frau-periode (une question, une relance).
    const said = frauen(mk({ age: 50 }))!.questions.flatMap((q) => [phraseText(q), ...phraseFollowUp(q)]);
    expect(said.filter((t) => /letzte (Regel|Periode)/i.test(t))).toHaveLength(1);
  });
  it('sans Fach gynéco, « Frauenarzt regelmäßig » reste en relance de la ménopause (Q-gyn : elle ne l’est que fondue)', () => {
    const q = frauen(mk({ age: 50 }))!.questions.find((x) => phraseProbes(x).includes('frau-wechseljahre'))!;
    expect(phraseFollowUp(q)).toEqual(['Gehen Sie regelmäßig zum Frauenarzt?']);
    expect((phraseText(q).match(/\?/g) ?? []).length).toBe(1);
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
  it('fachSkip retire une sonde de Fach qui n’a pas de sens pour ce cas', () => {
    const c = mk({ specialty: 'Dermatologie', patientSheet: { personalia: { name: 'X', age: 30, geschlecht: 'w' }, leitsymptomKategorie: 'atemnot', fachSkip: ['fach-derma-muttermal'] } });
    expect(fachChapterForCase(c)!.chapter.questions.flatMap(phraseProbes)).not.toContain('fach-derma-muttermal');
  });
  it('la Sexualanamnese urologique ne demande pas la contraception à 76 ans', () => {
    const c = mk({ specialty: 'Urologie', patientSheet: { personalia: { name: 'X', age: 76, geschlecht: 'w' }, schmerz: {} } });
    expect(fachChapterForCase(c)!.chapter.questions.map(phraseText).join(' ')).not.toMatch(/verhüten/);
  });
});

describe('La Fach suit la nature du motif (série 3, L0)', () => {
  type Sheet = Record<string, unknown>;
  const mkF = (specialty: string, sheet: Sheet, personalia: Sheet = {}) => ({
    specialty, caseSpecificQuestions: [],
    patientSheet: { personalia: { name: 'X', age: 50, geschlecht: 'm', ...personalia }, ...sheet },
  } as unknown as Case);
  const fq = (c: Case) => fachChapterForCase(c)!.chapter.questions;
  const probes = (c: Case) => fq(c).flatMap(phraseProbes);
  const q = (c: Case, probe: string) => fq(c).find((x) => phraseProbes(x).includes(probe));
  const ortho = (trauma: boolean, region: string) => mkF('Orthopädie', { schmerz: { ort: 'x' }, motiv: { trauma, region } });

  it('ni casque ni relance de chute sans traumatisme ; jamais de casque pour un traumatisme', () => {
    const non = q(ortho(false, 'lws'), 'fach-ortho-mechanismus')!;
    expect([phraseText(non), ...phraseAlts(non), ...phraseFollowUp(non)].join(' ')).not.toMatch(/Helm|gestürzt — auf welche Seite/);
    const tr = q(ortho(true, 'untere'), 'fach-ortho-mechanismus')!;
    expect([phraseText(tr), ...phraseAlts(tr), ...phraseFollowUp(tr)].join(' ')).not.toMatch(/Helm/);
    expect(phraseFollowUp(tr).length).toBeGreaterThan(0);
  });
  it('queue de cheval : seulement pour le rachis', () => {
    expect(probes(ortho(false, 'lws'))).toContain('fach-ortho-cauda');
    expect(probes(ortho(false, 'bws'))).toContain('fach-ortho-cauda');
    for (const r of ['untere', 'obere']) expect(probes(ortho(true, r))).not.toContain('fach-ortho-cauda');
  });
  it('gonflement articulaire : pas pour le rachis', () => {
    for (const r of ['lws', 'bws', 'hws']) expect(probes(ortho(false, r))).not.toContain('fach-ortho-schwellung');
    expect(probes(ortho(true, 'untere'))).toContain('fach-ortho-schwellung');
  });
  it('perfusion et appui : la main OU le pied, le bras OU la jambe — jamais les deux', () => {
    const up = ortho(true, 'obere'), low = ortho(true, 'untere');
    expect(phraseText(q(up, 'fach-ortho-durchblutung')!)).toMatch(/Hand/);
    expect(phraseText(q(up, 'fach-ortho-durchblutung')!)).not.toMatch(/Fuß/);
    expect(phraseText(q(low, 'fach-ortho-durchblutung')!)).toMatch(/Fuß/);
    expect(phraseText(q(low, 'fach-ortho-durchblutung')!)).not.toMatch(/Hand/);
    expect(phraseText(q(up, 'fach-ortho-belastung')!)).not.toMatch(/Bein|gehen/);
    expect(phraseText(q(low, 'fach-ortho-belastung')!)).not.toMatch(/Arm/);
    for (const r of ['bws', 'hws']) expect(probes(ortho(false, r))).not.toContain('fach-ortho-durchblutung');
  });
  it('Nitrospray et irradiation angineuse : seulement avec une douleur thoracique', () => {
    const thorax = mkF('Kardiologie', { schmerz: { ort: 'hinter dem Brustbein' } });
    const ohne = mkF('Kardiologie', { leitsymptomKategorie: 'anfall' });
    const kopf = mkF('Kardiologie', { schmerz: { ort: 'Hinterkopf beidseits' }, leitsymptomKategorie: 'allgemein' });
    expect(probes(thorax)).toEqual(expect.arrayContaining(['fach-kardio-nitro', 'fach-kardio-ausstrahlung']));
    for (const c of [ohne, kopf]) {
      expect(probes(c)).not.toContain('fach-kardio-nitro');
      expect(probes(c)).not.toContain('fach-kardio-ausstrahlung');
    }
  });
  it('la douleur thoracique se reconnaît sous ses noms médicaux, pas dans « Schmerz »', () => {
    for (const ort of ['linksthorakal', 'thorakal, atemabhängig', 'präkordial', 'in der Herzgegend'])
      expect(probes(mkF('Kardiologie', { schmerz: { ort } }))).toContain('fach-kardio-nitro');
    expect(probes(mkF('Kardiologie', { schmerz: { ort: 'Schmerzen im Nacken' } }))).not.toContain('fach-kardio-nitro');
  });
  it('signes autonomes (cluster) : seulement pour une douleur de la tête', () => {
    expect(probes(mkF('Neurologie', { schmerz: { ort: 'linke Kopfhälfte, Schläfe' } }))).toContain('fach-neuro-autonom');
    expect(probes(mkF('Neurologie', { leitsymptomKategorie: 'neurologisch', schmerz: { ort: 'holozephal, Kopf' } }))).not.toContain('fach-neuro-autonom');
    expect(probes(mkF('Neurologie', { schmerz: { ort: 'rechte Schulter' } }))).not.toContain('fach-neuro-autonom');
  });
  it('claudication, douleur de décubitus et plaie de jambe : pas pour une aorte', () => {
    const aorta = mkF('Angiologie', { schmerz: { ort: 'Rücken' }, motiv: { trauma: false, region: 'thorax' } });
    for (const p of ['fach-gefaess-gehstrecke', 'fach-gefaess-ruheschmerz']) expect(probes(aorta)).not.toContain(p);
    // La malperfusion d'un membre reste la question : sans la plaie de jambe.
    const wunde = phraseText(q(aorta, 'fach-gefaess-wunde')!);
    expect(wunde).toMatch(/Fuß kalt/);
    expect(wunde).not.toMatch(/Wunde/);
    expect(probes(mkF('Angiologie', { schmerz: { ort: 'Wade' } }))).toContain('fach-gefaess-gehstrecke');
  });
  it('jet urinaire : pas chez une femme', () => {
    expect(probes(mkF('Urologie', { schmerz: {} }, { geschlecht: 'w' }))).not.toContain('fach-uro-strahl');
    expect(probes(mkF('Urologie', { schmerz: {} }))).toContain('fach-uro-strahl');
  });
});
