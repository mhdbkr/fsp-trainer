import { describe, expect, it } from 'vitest';
import type { Case } from '@/db/types';
import { seedCases } from '@/data/seedCases';
import { playedTrame } from './anamneseChapters';
import { phraseFollowUp, phraseIsCaseSpecific, phraseProbes, phraseText, type Phrase } from './phrases';
import { phraseSucht } from './symptoms';
import frequencies from '../../../../apps/site/src/data/frequencies.json';

// Lot Q4 — les composées d'`aktuell` (zoeliakie → malaria) et les renvois de Q3, relus sur la trame JOUÉE.
// Le rapport `lead-s3-q4.md` donne l'avant / après et la source de chaque réponse écrite.
const cases = seedCases();
const byId = (id: string) => cases.find((c) => c.id === id)!;
const joue = (c: Case): Array<[string, Phrase]> => {
  const { chapters, fach } = playedTrame(c);
  return chapters.flatMap((ch) => [
    ...ch.questions.map((p) => [ch.id, p] as [string, Phrase]),
    ...(fach && ch.id === 'aktuell' ? fach.chapter.questions.map((p) => ['fach', p] as [string, Phrase]) : []),
  ]);
};
const rang = (id: string, test: (p: Phrase) => boolean) => joue(byId(id)).findIndex(([, p]) => test(p));
const sonde = (probe: string) => (p: Phrase) => !phraseIsCaseSpecific(p) && phraseProbes(p).includes(probe);
const cas = (re: RegExp) => (p: Phrase) => phraseIsCaseSpecific(p) && re.test(phraseText(p));
const reponse = (id: string, probe: string) => byId(id).patientSheet.antworten?.[probe] ?? '';

const CAS_Q4 = ['zoeliakie', 'ulcus-cruris', 'leistenhernie', 'commotio', 'itp', 'uterus-myomatosus', 'akutes-nierenversagen',
  'fibromyalgie', 'polymyalgia', 'schlafapnoe', 'schizophrenie', 'delir', 'achalasie', 'spinalkanalstenose', 'laktoseintoleranz',
  'tia', 'diabetes-typ1', 'gastroenteritis', 'rheumatisches-fieber', 'influenza', 'metabolisches-syndrom', 'karzinoid', 'abszess',
  'anorexia-nervosa', 'malaria'].map((s) => `case-${s}`);

describe('Q4 — composées d\'aktuell, zoeliakie → malaria', () => {
  it('chaque question du cas d\'Aktuelle Beschwerden, et chacune de ses relances, pose une seule question', () => {
    for (const id of CAS_Q4) {
      for (const [ch, p] of joue(byId(id))) {
        if (ch !== 'aktuell' || !phraseIsCaseSpecific(p)) continue;
        for (const t of [phraseText(p), ...phraseFollowUp(p)]) expect((t.match(/\?/g) ?? []).length, `${id} « ${t} »`).toBe(1);
      }
    }
  });
});

// La réponse d'une sonde jouée plus haut ne dit plus ce que la question du cas demande ensuite (revue clinique Q3, F.1).
// [cas, sonde, ce que la réplique ne dit plus, la question du cas qui le demande, posée après]
const RETIRES: Array<[string, string, RegExp, RegExp]> = [
  ['case-zoeliakie', 'akt-ausscheid-haeufigkeit', /Nachts/, /nachts zum Stuhlgang/],
  ['case-ulcus-cruris', 'akt-frueher', /Kompressionsstr/, /Kompressionsstrümpfe verordnet/],
  ['case-leistenhernie', 'akt-verlauf', /mit der Hand/, /mit der Hand zurückschieben/],
  ['case-commotio', 'akt-neuro-dauer', /Bewusstlos/, /^Waren Sie bewusstlos\?$/],
  ['case-commotio', 'akt-ausloeser', /Letzte|Helm/, /Was ist das Letzte/],
  ['case-commotio', 'akt-begleit', /übergeben/, /Mussten Sie sich übergeben/],
  ['case-commotio', 'akt-intensitaet', /mehr geworden/, /Wird der Kopfschmerz stärker/],
  ['case-uterus-myomatosus', 'akt-begleit', /Toilette|müde|schwindelig/, /schneller müde als früher/],
  ['case-akutes-nierenversagen', 'pers-groesse', /drei Kilo/, /in den letzten Tagen gewogen/],
  ['case-fibromyalgie', 'akt-begleit', /Wörter|steif|erschöpft/, /auf Wörter zu kommen/],
  ['case-polymyalgia', 'akt-ort', /Kopfschmerz/, /NEUE Kopfschmerzen/],
  ['case-polymyalgia', 'akt-verlauf', /beweglich/, /bis Sie wieder einigermaßen beweglich/],
  ['case-polymyalgia', 'akt-einfluss', /über den Kopf/, /Arme über den Kopf heben/],
  ['case-polymyalgia', 'akt-begleit', /Kauen|Kopfhaut|Vorhang/, /beim Kauen/],
  ['case-schizophrenie', 'akt-verlauf', /Stimmen/, /Hören Sie manchmal Stimmen/],
  ['case-delir', 'akt-verlauf', /Morgens|nachts/, /Schwankt sein Zustand/],
  ['case-achalasie', 'akt-begleit', /hoch|Kopfkissen|huste/, /Kommt Ihnen Essen wieder hoch/],
  ['case-spinalkanalstenose', 'akt-verlauf', /800 Meter/, /Wie weit können Sie am Stück gehen/],
  ['case-laktoseintoleranz', 'akt-ausscheid-haeufigkeit', /Nachts/, /Wachen Sie nachts/],
  ['case-tia', 'akt-motiv', /zwanzig Minuten/, /Wie lange dauert eine einzelne Attacke/],
  ['case-diabetes-typ1', 'akt-begleit', /Toilette|juckt|Kilo/, /Juckt Ihre Haut/],
  ['case-gastroenteritis', 'akt-ausloeser', /Eiswürfel|Salat/, /Was haben Sie dort gegessen/],
  ['case-gastroenteritis', 'akt-ausscheid-aussehen', /Hellgelb|wässrig/, /Wie sieht Ihr Stuhl aus/],
  ['case-metabolisches-syndrom', 'akt-ausloeser', /Cola|Bewegen/, /an einem ganz normalen Tag/],
  ['case-karzinoid', 'akt-begleit', /Herzrasen|pfeift/, /Herzrasen oder Luftnot/],
  ['case-anorexia-nervosa', 'akt-einfluss', /übergebe/, /nach dem Essen übergeben/],
  ['case-malaria', 'akt-ausloeser', /zurückgekommen/, /nach der Rückkehr/],
  ['case-malaria', 'akt-infekt-herd', /Cola/, /Wie sieht der Urin genau aus/],
  // Q4 fixeur (revue clinique de a9c7b82c, doublons préexistants des cas relus)
  ['case-leistenhernie', 'akt-ort', /Hoden/, /bis in den Hodensack/],
  ['case-leistenhernie', 'akt-verlauf', /hinlege/, /wenn Sie sich hinlegen/],
  ['case-leistenhernie', 'akt-begleit', /hart|nicht mehr zurück/, /ließ sich nicht mehr zurückdrücken/],
  ['case-schlafapnoe', 'akt-begleit', /ersticken|schwitze/, /Erstickungs- oder Würgegefühl/],
  ['case-metabolisches-syndrom', 'pers-groesse', /105|Vor zwei Jahren/, /in diesen zwei Jahren zugenommen/],
  ['case-karzinoid', 'akt-begleit', /Gesicht wird|Kilo/, /Ihr Gesicht werde plötzlich rot/],
];

describe('Q4 — garde anti-doublon : la réplique jouée avant ne répond plus à la question du cas', () => {
  it.each(RETIRES)('%s · %s', (id, probe, dit, question) => {
    expect(reponse(id, probe)).not.toMatch(dit);
    const s = rang(id, sonde(probe)), q = rang(id, cas(question));
    expect(q, 'la question du cas est jouée').toBeGreaterThan(-1);
    expect(s, 'la sonde est jouée avant elle').toBeLessThan(q);
    expect(s).toBeGreaterThan(-1);
  });
});

describe('Q4 — renvois de Q3', () => {
  it('psy : les préparatifs (« Haben Sie schon Vorbereitungen getroffen … ») suivent les plans et précède la tentative antérieure (10 cas)', () => {
    const psy = cases.filter((c) => playedTrame(c).fach?.chapter.id === 'fach-psy');
    expect(psy).toHaveLength(10);
    for (const c of psy) {
      const q = playedTrame(c).fach!.chapter.questions.find((p) => phraseProbes(p).includes('fach-psych-suizid'))!;
      const r = phraseFollowUp(q);
      const i = (re: RegExp) => r.findIndex((t) => re.test(t));
      expect(i(/^Haben Sie schon Vorbereitungen getroffen — zum Beispiel Tabletten gesammelt oder einen Abschiedsbrief geschrieben\?$/), c.id).toBe(i(/^Haben Sie konkrete Pläne/) + 1);
      expect(i(/Vorbereitungen getroffen/), c.id).toBeLessThan(i(/schon einmal versucht, sich das Leben/));
    }
  });

  it('opioid : l\'intention de l\'overdose se demande sur la question de l\'overdose, plus dans la réponse du risque suicidaire', () => {
    const id = 'case-opioidabhaengigkeit';
    const q = joue(byId(id)).find(([, p]) => cas(/kaum wach zu bekommen/)(p))!;
    expect(phraseFollowUp(q[1])).toEqual(['Falls ja: Haben Sie damals bewusst mehr genommen, oder ist das aus Versehen passiert?']);   // langue I2
    expect(reponse(id, 'fach-psych-suizid')).not.toMatch(/wach bekommen|Absicht/);
    expect(byId(id).patientSheet.frageAntworten?.find((x) => x.frage === phraseText(q[1]))?.antwort).toMatch(/Absicht war das nicht/);
  });

  it('anorexia : le vomissement n\'est plus dit avant la question n° 2', () => {
    const id = 'case-anorexia-nervosa';
    expect(rang(id, sonde('akt-einfluss'))).toBeLessThan(rang(id, cas(/nach dem Essen übergeben/)));
    expect(reponse(id, 'akt-einfluss')).not.toMatch(/übergebe|Erbrech/);
  });

  it('sous-questions Q2 reprises en relances (mammakarzinom, morbus-crohn, karpaltunnel)', () => {
    const relances = (id: string, re: RegExp) => phraseFollowUp(joue(byId(id)).find(([, p]) => cas(re)(p))![1]);
    expect(relances('case-mammakarzinom', /Brustkrebs oder Eierstockkrebs/)).toContain('Falls ja: Gab es solche Erkrankungen nur in der Familie Ihrer Mutter, oder auch in der Familie Ihres Vaters?');   // langue I3
    expect(relances('case-morbus-crohn', /im Ausland\?$/)).toEqual(['Falls ja: Wo genau waren Sie?', 'Falls ja: Wie lange waren Sie dort?', 'Falls ja: Hatten Sie dort Durchfall?']);   // langue I4
    expect(reponse('case-morbus-crohn', 'veg-fieber')).not.toMatch(/Ausland|Ägypten/);
    // Q5 (doublon relevé en Q4 § 7a) : le motif dit « ich wache jede Nacht mehrmals davon auf » — seule l'heure reste à demander.
    expect(joue(byId('case-karpaltunnel')).some(([, p]) => cas(/^Um welche Uhrzeit wachen Sie von den Beschwerden meistens auf\?$/)(p))).toBe(true);
    expect(joue(byId('case-karpaltunnel')).some(([, p]) => cas(/nachts von den Beschwerden auf/)(p))).toBe(false);
  });

  it('FreqBadge : `Case.frequency` suit la source (pAVK 18, TVT 8 — étaient 20 et 25)', () => {
    const total = (p: string) => frequencies.pathologies.find((x) => x.id === p)!.total;
    expect(byId('case-pavk').frequency).toBe(total('pavk'));
    expect(byId('case-tvt').frequency).toBe(total('tvt'));
    expect([byId('case-pavk').frequency, byId('case-tvt').frequency]).toEqual([18, 8]);
  });
});

// Q4 fixeur — revues Opus de a9c7b82c (clinique : 5 P1, P2 ; décisions de main).
describe('Q4 fixeur — revue clinique de a9c7b82c', () => {
  const casQ = (id: string, re: RegExp) => joue(byId(id)).find(([, p]) => cas(re)(p))![1];
  const fa = (id: string, re: RegExp) => byId(id).patientSheet.frageAntworten?.find((x) => re.test(x.frage))?.antwort ?? '';

  it('P1-1 / P1-2 : la question du poids ne présuppose plus une perte que personne n\'a dite (diabetes-typ1, achalasie)', () => {
    const d = casQ('case-diabetes-typ1', /Gewicht in letzter Zeit verändert/);
    expect(phraseText(d)).toBe('Hat sich Ihr Gewicht in letzter Zeit verändert, ohne dass Sie es wollten?');
    expect(phraseFollowUp(d)).toEqual(['Falls ja: Wie viel, in welchem Zeitraum?', 'Wie ist dabei Ihr Appetit — essen Sie weniger, gleich viel oder sogar mehr als früher?']);
    const a = casQ('case-achalasie', /ungewollt abgenommen/);
    expect(phraseText(a)).toBe('Haben Sie ungewollt abgenommen?');
    expect(phraseFollowUp(a)).toEqual(['Falls ja: Wie viel, in welchem Zeitraum?', 'Ist Ihr Appetit dabei erhalten geblieben?']);
  });

  it('P1-3 : metabolisches-syndrom — fach-endo-gewicht est réduite à l\'appétit, sa réplique ne redit plus le poids', () => {
    const id = 'case-metabolisches-syndrom';
    const f = joue(byId(id)).find(([, p]) => sonde('fach-endo-gewicht')(p))![1];
    expect(phraseSucht(f)).toEqual(['appetit']);
    expect(reponse(id, 'fach-endo-gewicht')).not.toMatch(/Kilo|ugenommen/);
    expect(phraseSucht(casQ(id, /in diesen zwei Jahren zugenommen/))).toEqual(['gewicht']);
  });

  it('P1-4 : uterus-myomatosus — le ventre qui grossit est dit une fois, par akt-begleit, avec le poids stable', () => {
    const id = 'case-uterus-myomatosus';
    expect(reponse(id, 'akt-veraend-entwicklung')).not.toMatch(/Bauch/);
    expect(reponse(id, 'akt-begleit')).toBe('Ja — mein Bauch ist dicker geworden, die Hosen kneifen, obwohl mein Gewicht gleich geblieben ist.');
  });

  it('P2 psy : les 10 cas répondent aux préparatifs (opioid : « Tabletten gesammelt habe ich nicht »)', () => {
    const psy = cases.filter((c) => playedTrame(c).fach?.chapter.id === 'fach-psy');
    expect(psy).toHaveLength(10);
    for (const c of psy) expect(reponse(c.id, 'fach-psych-suizid'), c.id).toMatch(/Vorbereitet habe ich nichts|nichts vorbereitet|Tabletten gesammelt habe ich nicht/);
    expect(reponse('case-opioidabhaengigkeit', 'fach-psych-suizid')).toMatch(/Tabletten gesammelt habe ich nicht/);
  });

  it('P2 anorexia : le désir de mort passif est la réponse de la question du cas, posée avant ; la Fach psy ne le redit pas', () => {
    const id = 'case-anorexia-nervosa';
    expect(rang(id, cas(/nicht mehr leben möchten/))).toBeLessThan(rang(id, sonde('fach-psych-suizid')));
    expect(fa(id, /nicht mehr leben möchten/)).toMatch(/nicht aufwachen müsste/);
    expect(reponse(id, 'fach-psych-suizid')).not.toMatch(/aufwach|sinnlos/);
  });

  it('P2 zoeliakie : fach-gastro-stuhl ne redit ni la fréquence, ni l\'aspect, ni la nuit — demandés avant', () => {
    const id = 'case-zoeliakie';
    expect(reponse(id, 'fach-gastro-stuhl')).not.toMatch(/nachts|viermal|fettig|schwimmt|klebt/);
    expect(rang(id, cas(/fettig-glänzend/))).toBeLessThan(rang(id, sonde('fach-gastro-stuhl')));
    expect(rang(id, cas(/nachts zum Stuhlgang/))).toBeLessThan(rang(id, sonde('fach-gastro-stuhl')));
  });

  it('P2 polymyalgia (F.7-a) : akt-begleit garde la fatigue ; fach-rheuma-systemisch répond à sa question par les négatifs, sans la redire', () => {
    const id = 'case-polymyalgia';
    expect(reponse(id, 'akt-begleit')).toMatch(/erschöpft/);
    expect(reponse(id, 'fach-rheuma-systemisch')).toBe('Augenentzündungen oder Geschwüre im Mund hatte ich nicht, und richtiges Fieber auch nicht. Durchfall, Husten oder Blut im Stuhl habe ich nicht.');
    expect(reponse(id, 'fach-rheuma-systemisch')).not.toMatch(/[Mm]üde|schlapp|erschöpft/);
  });

  it('P2 tia : la question de la durée suit immédiatement celle du début', () => {
    const id = 'case-tia';
    expect(rang(id, cas(/Wie lange dauert eine einzelne Attacke/))).toBe(rang(id, cas(/die erste Attacke begonnen/)) + 1);
  });

  it('opioid : l\'épisode d\'overdose n\'est plus raconté par vor-krankenhaus, avant la question qui le demande', () => {
    expect(reponse('case-opioidabhaengigkeit', 'vor-krankenhaus')).not.toMatch(/Notarzt|vier Monaten/);
  });

  it('les réponses déplacées vers la question du cas qui les demande (leistenhernie, schlafapnoe, metabolisches-syndrom)', () => {
    expect(fa('case-leistenhernie', /ließ sich nicht mehr zurückdrücken/)).toMatch(/nicht mehr zurück/);
    expect(fa('case-schlafapnoe', /Erstickungs- oder Würgegefühl/)).toMatch(/ringe nach Luft/);
    expect(fa('case-metabolisches-syndrom', /^Schnarchen Sie\?/)).toMatch(/schnarche laut/);
    expect(reponse('case-metabolisches-syndrom', 'veg-schlaf')).not.toMatch(/schnarch|Ampel/);
  });
});
