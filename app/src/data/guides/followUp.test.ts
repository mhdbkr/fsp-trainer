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
    ['fach-onko-knoten', 'Tut es beim Tasten weh', 'ja'],
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

describe('Revue Q0 — m1 : mêmes défauts que l\'alcool', () => {
  it('« Hält der Juckreiz Sie nachts wach ? » attend un « ja » au prurit', () => {
    const rs = relancesOf('fach-derma-empfinden', 'Hält der Juckreiz');
    expect(rs).toHaveLength(1);
    expect(parseFollowUp(rs[0])).toMatchObject({ kind: 'ja', label: 'ja' });
  });
  it('« normal entbunden ou Kaiserschnitt ? » attend des naissances : interrupteur « Geburten »', () => {
    const rs = relancesOf('fach-gyn-schwangerschaften', 'Haben Sie normal entbunden');
    expect(rs).toHaveLength(1);
    expect(parseFollowUp(rs[0])).toMatchObject({ kind: 'ja', label: 'Geburten' });
  });
});

describe('Revue Q0 — m2 : le sang dépend du crachat', () => {
  it('« Welche Farbe » et « Ist Blut dabei » partagent l\'interrupteur « Auswurf », dans cet ordre', () => {
    const q = allQuestions().find((x) => phraseProbes(x).includes('akt-atemnot-husten'))!;
    const g = groupFollowUps(phraseFollowUp(q));
    const auswurf = g.find((x) => x.control.kind === 'ja' && x.control.label === 'Auswurf')!;
    expect(auswurf.questions).toEqual(['Welche Farbe hat das?', 'Ist Blut dabei?']);
    // Défaut ANTÉRIEUR, non corrigé ici : l'interrupteur « Auswurf » est visible avant « Husten = Ja ».
  });
});

describe('Revue Q0 — m7 : héparine, Clexane', () => {
  it('le blutverdünner demande la dernière DOSE, pas la dernière tablette', () => {
    const rs = relancesOf('fach-chir-blutverduenner', 'Wichtig vor jeder Operation');
    expect(rs).toHaveLength(1);
    expect(rs[0]).toMatch(/die letzte Dosis/);
    expect(rs[0]).not.toMatch(/Tablette/);
  });
});

// ── Série 3, lot Q2 : une relance = une question ─────────────────────────────
describe('Q2 — relances découpées, l\'information est gardée', () => {
  const ALL = (probe: string) => allQuestions().filter((q) => phraseProbes(q).includes(probe)).flatMap(phraseFollowUp);
  const SPLIT: [probe: string, expected: string[]][] = [
    ['nox-alkohol', ['Trinken Sie täglich oder nur zu besonderen Anlässen?', 'Wie viel trinken Sie ungefähr pro Woche?']],
    ['fach-neuro-kopfschmerz', ['Ist Ihnen während der Schmerzen übel?', 'Sind Sie licht- oder lärmempfindlich?']],
    ['fach-chir-op', ['Wann war das?', 'Weswegen wurden Sie operiert?', 'Gab es Komplikationen bei der Narkose?']],
    ['fach-psych-suizid', ['Haben Sie sich selbst verletzt?', 'Haben Sie den Wunsch, sich zu verletzen?']],
  ];
  for (const [probe, expected] of SPLIT) {
    it(`${probe} : ${expected.length} relances d'une question chacune`, () => {
      const rs = ALL(probe).map((r) => r.replace(/^Falls [^:]+:\s*/, ''));
      for (const e of expected) {
        expect(rs).toContain(e);
        expect(e.match(/\?/g)).toHaveLength(1);
      }
    });
  }
  it('veg-fieber : le voyage est une question (partie « reise »), les vaccins une question autonome (revue Q2)', () => {
    const q = allQuestions().find((x) => phraseProbes(x).includes('veg-fieber'))!;
    const reise = (q as { parts: { sucht: string[]; text: string; followUp?: string[] }[] }).parts.find((p) => p.sucht.includes('reise'))!;
    expect(reise).toEqual({ sucht: ['reise'], text: 'Waren Sie kürzlich im Ausland?' });
    expect(phraseFollowUp(q)).toEqual(expect.arrayContaining(['Waren Sie kürzlich im Ausland?', 'Sind Ihre Impfungen auf dem neuesten Stand?']));
  });
  it('suizid : « konkrete Pläne » est une relance inconditionnelle (la note NOTFALL en dépend, revue Q2)', () => {
    const rs = relancesOf('fach-psych-suizid', 'Haben Sie konkrete Pläne');
    expect(rs).toEqual(['Haben Sie konkrete Pläne, sich das Leben zu nehmen?']);
    expect(parseFollowUp(rs[0]).kind).toBe('immer');
  });
  it('gastro : les relances du Erbrochenen attendent le vomissement, pas un « ja » vague (revue Q2)', () => {
    const rs = relancesOf('fach-gastro-uebelkeit', 'Wie sah das Erbrochene aus');
    expect(rs).toHaveLength(1);
    expect(parseFollowUp(rs[0])).toMatchObject({ kind: 'ja', label: 'Sie sich übergeben haben' });
  });
});
