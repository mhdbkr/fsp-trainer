import { describe, expect, it } from 'vitest';
import { groupFollowUps, parseFollowUp } from './followUp';

describe('parseFollowUp', () => {
  it('« Falls verstorben » est un choix leben noch / verstorben, pas verstorben / nein (FB2-J3)', () => {
    const c = parseFollowUp('Falls verstorben: Woran, und wann?');
    expect(c).toMatchObject({ kind: 'wahl', options: ['leben noch', 'verstorben'], match: 'verstorben' });
  });
  it('« Falls ja » reste un toggle ja/nein', () => {
    expect(parseFollowUp('Falls ja: Seit wann?')).toMatchObject({ kind: 'ja', label: 'ja' });
  });
});

describe('groupFollowUps', () => {
  it('« Falls ja » + « Falls aufgehört » deviennent un seul contrôle à trois branches', () => {
    const g = groupFollowUps(['Falls ja: Seit wann?', 'Falls aufgehört: Wann?']);
    expect(g).toHaveLength(1);
    expect(g[0].control).toMatchObject({ kind: 'zweig', options: ['ja', 'aufgehört', 'nie'] });
    expect((g[0].control as { branches: Record<string, string[]> }).branches.aufgehört).toEqual(['Wann?']);
  });
});

// ── Série 3, lot Q0 (G4) : une relance qui n'a de sens que sous un « oui »
// porte son préfixe. Sans lui, `parseFollowUp` la range en « immer » et le
// guide la montre toujours. Chaque ligne = (sonde mère, début de la relance).
import { ALLGEMEINE_ANAMNESE, FACHANAMNESEN, aktuellChapterFor, LEITSYMPTOM_KATEGORIEN } from './anamneseChapters';
import { phraseFollowUp, phraseProbes, type Phrase } from './phrases';

const allQuestions = (): Phrase[] => [
  ...ALLGEMEINE_ANAMNESE.flatMap((ch) => ch.questions),
  ...FACHANAMNESEN.flatMap((f) => f.chapter.questions),
  ...LEITSYMPTOM_KATEGORIEN.flatMap((k) => aktuellChapterFor(k).questions),
];
const relancesOf = (probe: string, start: string) =>
  allQuestions().filter((q) => phraseProbes(q).includes(probe)).flatMap(phraseFollowUp)
    .filter((r) => r.replace(/^Falls [^:]+:\s*/, '').startsWith(start));

describe('G4 — relances conditionnelles préfixées', () => {
  const CASES: [probe: string, start: string, kind: 'ja' | 'skala'][] = [
    ['nox-alkohol', 'Trinken Sie täglich', 'ja'],
    ['fach-gastro-uebelkeit', 'Geht es Ihnen besser', 'ja'],
    ['fach-onko-knoten', 'Tut er beim Tasten weh', 'ja'],
    ['akt-atemnot-husten', 'Husten Sie dabei etwas ab', 'ja'],
    ['akt-atemnot-husten', 'Ist Blut dabei', 'ja'],
    ['fach-uro-frequenz', 'Wie oft müssen Sie nachts', 'ja'],
    ['fach-neuro-kopfschmerz', 'Ist Ihnen während der Schmerzen übel', 'ja'],
    ['fach-neuro-kraft', 'Lassen Sie Dinge fallen', 'ja'],
    ['fach-chir-op', 'Wann war das', 'ja'],
    ['fach-chir-blutverduenner', 'Wichtig vor jeder Operation', 'ja'],
    ['fach-infekt-fieber', 'Haben Sie Schüttelfrost', 'ja'],
    ['fach-kardio-brust', 'Können Sie mit einem Finger', 'ja'],
    ['akt-infekt-fieber', 'Wie hoch war es', 'ja'],
    ['akt-infekt-fieber', 'Wann ist das Fieber am höchsten', 'ja'],
    ['akt-intensitaet', 'Vor jedem Schmerzmittel', 'skala'],
  ];
  for (const [probe, start, kind] of CASES) {
    it(`${probe} · « ${start}… » n'est plus inconditionnelle`, () => {
      const rs = relancesOf(probe, start);
      expect(rs.length).toBeGreaterThan(0);
      for (const r of rs) expect(parseFollowUp(r).kind).toBe(kind);
    });
  }
  it('« Falls Auswurf » : un interrupteur « Auswurf », pas « Sie etwas abhusten »', () => {
    const r = allQuestions().filter((q) => phraseProbes(q).includes('akt-atemnot-husten')).flatMap(phraseFollowUp).find((x) => /Welche Farbe/.test(x))!;
    expect(parseFollowUp(r)).toMatchObject({ kind: 'ja', label: 'Auswurf' });
  });
  it('« Vor jedem Schmerzmittel » rejoint la branche « sehr stark » (un seul contrôle)', () => {
    const q = allQuestions().find((x) => phraseProbes(x).includes('akt-intensitaet'))!;
    const g = groupFollowUps(phraseFollowUp(q));
    expect(g).toHaveLength(1);
    expect(g[0].control).toMatchObject({ kind: 'skala', threshold: 7 });
    expect(g[0].questions).toHaveLength(2);
  });
  it('laissées inconditionnelles à dessein : voyage/vaccins (parts du veg-fieber) et psy automutilation (à trancher)', () => {
    expect(relancesOf('veg-fieber', 'Waren Sie kürzlich im Ausland').map((r) => parseFollowUp(r).kind)).toEqual(['immer']);
    expect(relancesOf('fach-psych-suizid', 'Haben Sie sich selbst verletzt').map((r) => parseFollowUp(r).kind)).toEqual(['immer']);
  });
});

describe('Revue clinique Q0 — C-3 : le NOTFALL psy ne se déclenche pas sur un « oui » vague', () => {
  const notfall = () => relancesOf('fach-psych-suizid', 'NOTFALL');
  it('« Falls bejaht » (à quoi ? l\'automutilation, les idées ?) devient une condition explicite', () => {
    expect(notfall()).toHaveLength(1);
    expect(notfall()[0]).not.toMatch(/^Falls bejaht/);
  });
  it('le parseur en fait un interrupteur lisible (« Konkrete Absicht oder Plan »), pas un « Ja » ni une note', () => {
    expect(parseFollowUp(notfall()[0])).toMatchObject({ kind: 'ja', label: 'konkrete Absicht oder Plan' });
    expect(notfall()[0]).toMatch(/NOTFALL — der Patient bleibt stationär/);
  });
});
