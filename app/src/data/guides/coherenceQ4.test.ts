import { describe, expect, it } from 'vitest';
import type { Case } from '@/db/types';
import { seedCases } from '@/data/seedCases';
import { playedTrame } from './anamneseChapters';
import { phraseFollowUp, phraseIsCaseSpecific, phraseProbes, phraseText, type Phrase } from './phrases';
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
  it('psy : « Haben Sie schon etwas vorbereitet? » suit les plans et précède la tentative antérieure (10 cas)', () => {
    const psy = cases.filter((c) => playedTrame(c).fach?.chapter.id === 'fach-psy');
    expect(psy).toHaveLength(10);
    for (const c of psy) {
      const q = playedTrame(c).fach!.chapter.questions.find((p) => phraseProbes(p).includes('fach-psych-suizid'))!;
      const r = phraseFollowUp(q);
      const i = (re: RegExp) => r.findIndex((t) => re.test(t));
      expect(i(/^Haben Sie schon etwas vorbereitet\?$/), c.id).toBe(i(/^Haben Sie konkrete Pläne/) + 1);
      expect(i(/vorbereitet/), c.id).toBeLessThan(i(/schon einmal versucht, sich das Leben/));
    }
  });

  it('opioid : l\'intention de l\'overdose se demande sur la question de l\'overdose, plus dans la réponse du risque suicidaire', () => {
    const id = 'case-opioidabhaengigkeit';
    const q = joue(byId(id)).find(([, p]) => cas(/kaum wach zu bekommen/)(p))!;
    expect(phraseFollowUp(q[1])).toEqual(['Falls ja: War das Absicht?']);
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
    expect(relances('case-mammakarzinom', /Brustkrebs oder Eierstockkrebs/)).toContain('Falls ja: War jemand auf beiden Seiten betroffen?');
    expect(relances('case-morbus-crohn', /im Ausland\?$/)).toEqual(['Falls ja: Wo genau?', 'Falls ja: Wie lange waren Sie dort?', 'Falls ja: Hatten Sie dort Durchfall?']);
    expect(reponse('case-morbus-crohn', 'veg-fieber')).not.toMatch(/Ausland|Ägypten/);
    expect(relances('case-karpaltunnel', /nachts von den Beschwerden auf/)).toContain('Falls ja: Um welche Uhrzeit?');
  });

  it('FreqBadge : `Case.frequency` suit la source (pAVK 18, TVT 8 — étaient 20 et 25)', () => {
    const total = (p: string) => frequencies.pathologies.find((x) => x.id === p)!.total;
    expect(byId('case-pavk').frequency).toBe(total('pavk'));
    expect(byId('case-tvt').frequency).toBe(total('tvt'));
    expect([byId('case-pavk').frequency, byId('case-tvt').frequency]).toEqual([18, 8]);
  });
});
