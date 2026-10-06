import { describe, expect, it } from 'vitest';
import type { Case } from '@/db/types';
import { seedCases } from '@/data/seedCases';
import { playedTrame } from './anamneseChapters';
import { phraseFollowUp, phraseIsCaseSpecific, phraseProbes, phraseText, type Phrase } from './phrases';
import { phraseSucht } from './symptoms';

// Lots Q5 (composées d'`aktuell`, endokarditis → fin ; doublons) et Q8 (natures de motif), relus sur la trame JOUÉE.
// Le rapport `lead-s3-q5.md` donne l'avant / après et la source de chaque réponse écrite ou déplacée.
const cases = seedCases();
const byId = (id: string) => cases.find((c) => c.id === id)!;
const joue = (c: Case): Array<[string, Phrase]> => {
  const { chapters, fach } = playedTrame(c);
  return chapters.flatMap((ch) => [
    ...ch.questions.map((p) => [ch.id, p] as [string, Phrase]),
    ...(fach && ch.id === 'aktuell' ? fach.chapter.questions.map((p) => ['fach', p] as [string, Phrase]) : []),
  ]);
};
const textes = (id: string) => joue(byId(id)).flatMap(([, p]) => [phraseText(p), ...phraseFollowUp(p)]);
const rang = (id: string, test: (p: Phrase) => boolean) => joue(byId(id)).findIndex(([, p]) => test(p));
const sonde = (probe: string) => (p: Phrase) => !phraseIsCaseSpecific(p) && phraseProbes(p).includes(probe);
const cas = (re: RegExp) => (p: Phrase) => phraseIsCaseSpecific(p) && re.test(phraseText(p));
const reponse = (id: string, probe: string) => byId(id).patientSheet.antworten?.[probe] ?? '';
const ecrite = (id: string, frage: string) => byId(id).patientSheet.frageAntworten?.find((f) => f.frage === frage)?.antwort ?? '';

describe('Q5 — composées d\'aktuell', () => {
  it('aucune question du cas d\'Aktuelle Beschwerden ne porte deux « ? »', () => {
    const fautes = cases.flatMap((c) => (c.caseSpecificQuestions ?? [])
      .filter((q) => typeof q !== 'string' && q.kapitel === 'aktuell' && (q.frage.match(/\?/g) ?? []).length > 1)
      .map((q) => `${c.id} : ${typeof q === 'string' ? q : q.frage}`));
    expect(fautes).toEqual([]);
  });

  it('toute réponse écrite ajoutée par Q5 se rattache au texte exact d\'une question du cas', () => {
    const q5 = ['endokarditis', 'pertussis', 'myokarditis', 'somatoforme-schmerzstoerung', 'nhl', 'typhus', 'sturz-im-alter',
      'lumboischialgie', 'bauchaortenaneurysma', 'aortendissektion', 'epilepsie', 'hodentorsion', 'perniziose-anaemie', 'sinusitis',
      'arterielle-hypertonie', 'mammakarzinom', 'gib', 'malaria', 'itp', 'delir', 'achalasie', 'rheumatisches-fieber',
      'laktoseintoleranz', 'copd', 'hyperthyreose', 'herzinsuffizienz', 'tonsillitis', 'lymphom', 'bronchialkarzinom', 'parkinson',
      'struma', 'hws-diskusprolaps', 'hueftkopfnekrose'].map((s) => byId(`case-${s}`));
    const orphelins = q5.flatMap((c) => (c.patientSheet.frageAntworten ?? [])
      .filter((f) => f.kapitel === 'aktuell' && !(c.caseSpecificQuestions ?? []).some((q) => (typeof q === 'string' ? q : q.frage) === f.frage))
      .map((f) => `${c.id} : ${f.frage}`));
    // Trois entrées antérieures à Q5, sans question du cas au texte exact (relevées, non traitées ici).
    const anterieurs = ['case-itp : Was hat Ihre Hausärztin genau gesagt?', 'case-itp : Lassen sich die roten Punkte wegdrücken?',
      'case-copd : Wurden Sie in der letzten Zeit auf Corona getestet? Wie wurde der Test gemacht?'];
    expect(orphelins.filter((o) => !anterieurs.includes(o))).toEqual([]);
  });

  it('une réplique jouée avant la question ne dit plus ce qu\'elle demande (signes propres au cas, hors garde)', () => {
    expect(reponse('case-endokarditis', 'akt-begleit')).not.toMatch(/Fingernägeln|Urin/);
    expect(reponse('case-pertussis', 'akt-beginn')).not.toMatch(/Erkältung/);
    expect(reponse('case-myokarditis', 'akt-ausloeser')).not.toMatch(/Corona|Training/);
    expect(reponse('case-nephrotisches-syndrom', 'akt-begleit')).not.toMatch(/Schuhe|Ehering|Bauch/);
    expect(reponse('case-endometriose', 'akt-einfluss')).not.toMatch(/Verkehr/);
    expect(reponse('case-epilepsie', 'akt-frueher')).not.toMatch(/Zunge/);
    expect(reponse('case-epilepsie', 'fach-neuro-koordination')).not.toMatch(/Zuckungen/);
    expect(reponse('case-aortendissektion', 'akt-beginn')).not.toMatch(/Zementsack|Wucht/);
    expect(reponse('case-perniziose-anaemie', 'akt-einfluss')).not.toMatch(/Dunkeln/);
    expect(reponse('case-hodentorsion', 'akt-begleit')).not.toMatch(/geschwollen|höher/);
    expect(reponse('case-arterielle-hypertonie', 'veg-schlaf')).not.toMatch(/schnarche|Luft weg/);
    // … et le texte est DÉPLACÉ vers la question qui le demande, sans perte.
    expect(ecrite('case-epilepsie', 'Zucken Ihnen morgens manchmal die Arme, sodass Ihnen etwas aus der Hand fällt?')).toMatch(/zehnmal/);
    expect(ecrite('case-aortendissektion', 'Was haben Sie gemacht, als es losging — haben Sie etwas Schweres gehoben oder gepresst?')).toMatch(/Zementsack/);
  });

  it('malaria : la réplique d\'akt-infekt-kontakt ne contredit plus la fiche (aucune prophylaxie)', () => {
    expect(reponse('case-malaria', 'akt-infekt-kontakt')).not.toMatch(/Prophylaxe habe ich die ganze Zeit genommen/);
    expect(reponse('case-malaria', 'fach-infekt-reise')).toMatch(/Keine Malariaprophylaxe/);
  });

  it('sturz-im-alter : la durée des malaises n\'est plus contredite (« nicht jeden Tag » / « jeden Tag »)', () => {
    expect(reponse('case-sturz-im-alter', 'fach-neuro-verlauf')).not.toMatch(/jeden Tag da/);
  });
});

describe('Q8 — natures de motif', () => {
  it('sturz-im-alter : aucune question jouée ne parle d\'« Anfall » ; les sondes renommées gardent leur signe et leur place', () => {
    const id = 'case-sturz-im-alter';
    expect(textes(id).filter((t) => /Anf[aä]ll/.test(t) && !/Krampfanfall/.test(t))).toEqual([]);
    for (const probe of ['akt-anfall-ablauf', 'akt-anfall-dauer', 'akt-einfluss', 'akt-frueher']) expect(rang(id, sonde(probe)), probe).toBe(-1);
    const ablauf = rang(id, cas(/^Erzählen Sie mir bitte ganz genau/));
    const dauer = rang(id, cas(/^Wie lange dauert so ein Schwindel/));
    const frueher = rang(id, cas(/in den letzten zwölf Monaten schon einmal gestürzt/));
    expect(ablauf).toBeGreaterThan(0);
    expect(dauer).toBe(ablauf + 1);
    expect(frueher).toBeGreaterThan(dauer);
    expect(joue(byId(id))[frueher][0]).toBe('aktuell');
    expect(phraseSucht(joue(byId(id))[dauer][1])).toEqual(['dauer']);
    expect(ecrite(id, 'Wie lange dauert so ein Schwindel — Sekunden, Minuten oder Stunden?')).toMatch(/seit ungefähr drei Monaten/);
  });

  it('tvt : « Ist Ihnen eine Blutung aufgefallen? » n\'est plus posée', () => {
    expect(textes('case-tvt').filter((t) => /Blutung aufgefallen/.test(t))).toEqual([]);
  });

  it('gib : « Hatten Sie so eine Blutung schon einmal? » ; mammakarzinom : « so einen Knoten »', () => {
    expect(textes('case-gib')).toContain('Hatten Sie so eine Blutung schon einmal?');
    expect(textes('case-mammakarzinom')).toContain('Hatten Sie so einen Knoten schon einmal?');
    expect(cases.flatMap((c) => textes(c.id)).filter((t) => /so eine Veränderung schon einmal/.test(t))).toEqual([]);
  });

  it('la Veränderung ne demande plus « Sonne » en Aktuelle Beschwerden (mammakarzinom en premier)', () => {
    const aktuell = (c: Case) => playedTrame(c).chapters.find((ch) => ch.id === 'aktuell')!.questions.map(phraseText);
    expect(cases.filter((c) => c.patientSheet.leitsymptomKategorie === 'veraenderung').flatMap(aktuell).filter((t) => /Sonne/.test(t))).toEqual([]);
  });

  it('malaria : le voyage est demandé tôt, en Aktuelle Beschwerden, avant le foyer', () => {
    const id = 'case-malaria';
    const reise = rang(id, cas(/^Waren Sie in den letzten Monaten im Ausland\?$/));
    expect(reise).toBeGreaterThan(0);
    expect(reise).toBeLessThan(rang(id, sonde('akt-infekt-herd')));
    expect(rang(id, sonde('fach-infekt-reise'))).toBe(-1);
  });

  it('les gabarits hors sujet sont sautés : pas d\'urine en ouverture d\'une dysphagie, pas de selles pour une prostate', () => {
    for (const id of ['case-oesophaguskarzinom', 'case-achalasie']) expect(textes(id).filter((t) => /^Veränderung — .*Wasserlassen|Urin aufgefallen/.test(t)), id).toEqual([]);
    for (const id of ['case-bph', 'case-prostatakarzinom']) expect(textes(id).filter((t) => /im Stuhl aufgefallen|beim Stuhlgang etwas verändert/.test(t)), id).toEqual([]);
    expect(textes('case-bronchialkarzinom').filter((t) => /Hautveränderung|juckt es/.test(t))).toEqual([]);
  });
});
