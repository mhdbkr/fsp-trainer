import { describe, expect, it } from 'vitest';
import { compteursApresCas, playedTrame, profilDuCas } from './anamneseChapters';
import { PROBE_BY_ID } from './anamneseProbes';
import { phraseFollowUps, phraseProbes, phraseText } from './phrases';
import { PROBE_SUCHT, PROFIL_EXIGE, SIGNE_DEF, lexiqueIncoherences, phraseSucht } from './symptoms';
import { PSY, byId, cas, cases, ch, coeur, prof, run, s, signesJoues, trameJouee, un, vue } from './coherenceFixtures';

// K3 — corrections des revues Opus de `508639f6` (mécanique B1, I1, M1, M4 ; clinique P0–P2). Fixtures : sondes réelles.

describe('B1 — une relance hors signe vit sa propre décision, même si sa mère est retirée par r1 (§10.4, INV-87)', () => {
  it('mère `fach-infekt-gelenke` hors profil psy, relance `selbstverletzung_wunsch` : la mère part, la relance est détachée', () => {
    const mere = s('fach-infekt-gelenke', { followUp: ['Haben Sie den Wunsch, sich zu verletzen?'], followUpSucht: [['selbstverletzung_wunsch']] });
    const r = run([ch('fach', mere)], PSY);
    expect(un(r.ecarts, 'fach-infekt-gelenke', 'retire')).toBeTruthy();
    expect(un(r.ecarts, 'fach-infekt-gelenke#1', 'detache')).toBeTruthy();
    expect(vue(r.trame).fach).toEqual(['^fach-infekt-gelenke#1']);
    expect(signesJoues(r.trame).has('selbstverletzung_wunsch')).toBe(true);
  });
});

describe('I1 — règle d\'insertion « précède OU ÉGALE » (§10.4)', () => {
  it('la relance détachée se pose APRÈS la question du chapitre cible qui a le même premier signe', () => {
    const vorg = s('fach-rheuma-vorgeschichte', { followUp: ['Rheuma in der Familie?'], followUpSucht: [['familie_rheuma']] });
    const famille = s('fam-familie', { text: 'Familie: Rheuma, chronische Krankheiten?', sucht: ['familie_rheuma', 'familie_krank'] });
    const r = run([ch('fach', vorg), ch('familie-sozial', famille)], prof('allgemein', ['gelenk']));
    expect(vue(r.trame)['familie-sozial']).toEqual(['fam-familie~familie_rheuma,familie_krank', '^fach-rheuma-vorgeschichte#1']);
  });
});

describe('M1 — r3 puis r4b : une question qui présuppose un signe AJOUTÉ par r3 se place après lui', () => {
  it('cas « schmerz » : `braucht: [ort]` → la question du cas suit akt-ort, inséré par r3 après le motif', () => {
    const r = run([ch('aktuell', cas(0, 'Strahlt es von dort aus?', ['ausstrahlung'], { braucht: ['ort'] }), s('akt-motiv'))], prof('schmerz', ['schmerz']));
    expect(vue(r.trame).aktuell.slice(0, 3)).toEqual(['akt-motiv', 'akt-ort', 'cas']);
    expect(un(r.ecarts, 'cas:0', 'deplace')).toMatchObject({ regle: 4, cause: 'ort' });
  });
});

describe('M4 — r3 sans phrase de banque échoue franchement (jamais un id affiché comme question)', () => {
  it('la banque introuvable lève une erreur', () => {
    const garde = PROBE_BY_ID['akt-ort'];
    delete (PROBE_BY_ID as Record<string, unknown>)['akt-ort'];
    try {
      expect(() => run([ch('aktuell', s('akt-motiv'))], prof('schmerz', ['schmerz']))).toThrow(/akt-ort/);
    } finally { PROBE_BY_ID['akt-ort'] = garde; }
  });
});

describe('I2 — Wasserlassen jour / nuit : les `parts` découpées du texte existant', () => {
  it('gastroenteritis : la question du cas pose la fréquence du jour ; la générale se réduit à la nuit, sans doublon', () => {
    expect(coeur(byId('case-gastroenteritis')).aktuell).toContain('akt-ausscheid-harn-haeufigkeit~nykturie');
  });
});

describe('I3 / P2 psy — l\'ordre de sécurité sous fach-psych-suizid (10 cas psy)', () => {
  const psy = cases.filter((c) => playedTrame(c).fach?.chapter.id === 'fach-psy');
  it('cadrage « Ich frage das jeden Patienten », idée → plans → intention (NOTFALL), puis le désir avant l\'acte, puis le soutien', () => {
    expect(psy).toHaveLength(10);
    for (const c of psy) {
      const q = playedTrame(c).fach!.chapter.questions.find((p) => phraseProbes(p).includes('fach-psych-suizid'))!;
      expect(phraseText(q), c.id).toMatch(/^Ich frage das jeden Patienten in Ihrer Situation: Denken Sie manchmal/);
      expect(phraseFollowUps(q).map((f) => f.text.slice(0, 32)), c.id).toEqual([
        'Haben Sie konkrete Pläne, sich d', 'Falls konkrete Absicht oder Plan', 'Haben Sie den Wunsch, sich zu ve', 'Haben Sie sich selbst verletzt?', 'Gibt es jemanden, der Sie unters']);
      expect(phraseFollowUps(q).map((f) => f.sucht ?? []), c.id).toEqual([[], [], ['selbstverletzung_wunsch'], ['selbstverletzung'], []]);
    }
  });
});

describe('P0-1 — le sang dans les selles (`stuhl_blut`) est un signe, exigé par la diarrhée', () => {
  it('lexique : banque mono-signe akt-ausscheid-aussehen ; diarrhoe l\'exige ; les sondes qui demandent le sang le déclarent', () => {
    expect(SIGNE_DEF.stuhl_blut.bank).toBe('akt-ausscheid-aussehen');
    expect(PROBE_SUCHT['akt-ausscheid-aussehen']).toEqual(['stuhl_blut']);
    expect(PROFIL_EXIGE.diarrhoe).toContain('stuhl_blut');
    for (const p of ['fach-gastro-stuhl', 'fach-haem-blutverlust', 'fach-onko-blutung']) expect(PROBE_SUCHT[p], p).toContain('stuhl_blut');
    expect(lexiqueIncoherences()).toEqual([]);
  });
  it('gastroenteritis : « Blut, Schleim » revient, avec sa réponse ; « Wie sieht Ihr Stuhl aus » ne déclare que l\'aspect', () => {
    const g = byId('case-gastroenteritis');
    expect(coeur(g).aktuell).toContain('akt-ausscheid-aussehen');
    expect(g.patientSheet.antworten?.['akt-ausscheid-aussehen']).toBeTruthy();
    const q = g.caseSpecificQuestions.find((x) => typeof x !== 'string' && /Wie sieht Ihr Stuhl aus/.test(x.frage));
    expect(typeof q !== 'string' && q?.sucht).toEqual(['stuhlaussehen']);
  });
  it('130 cas : un cas de diarrhée pose toujours le sang dans les selles, avec une réponse', () => {
    for (const c of cases.filter((x) => profilDuCas(x).tags.includes('diarrhoe'))) expect(signesJoues(trameJouee(c)).has('stuhl_blut'), c.id).toBe(true);
    for (const c of cases) expect(compteursApresCas(c).ajouteSansReponse, c.id).toBe(0);
  });
});

describe('P0-2 — Zungenbiss et Einnässen : deux signes du malaise (syncope ≠ crise)', () => {
  const textes = (id: string) => trameJouee(byId(id)).flatMap((x) => x.questions.flatMap((p) => [phraseText(p), ...phraseFollowUps(p).map((f) => f.text)]));
  it('case-synkope pose la morsure de langue et l\'énurésie, même quand la Fach Kardio prend la perte de connaissance', () => {
    expect(textes('case-synkope').filter((t) => /Zunge gebissen/.test(t))).toHaveLength(1);
    expect(textes('case-synkope').filter((t) => /Urin abgegangen/.test(t))).toHaveLength(1);
  });
  it('case-epilepsie : une seule fois chacune (la Fach neuro les pose, r2)', () => {
    expect(textes('case-epilepsie').filter((t) => /Zungenbiss\?|auf die Zunge gebissen/.test(t))).toHaveLength(1);
  });
  it('chaque cas qui les pose a la réponse (dans celle de la question mère)', () => {
    for (const c of cases) {
      if (!textes(c.id).some((t) => /etwa auf die Zunge gebissen/.test(t))) continue;
      expect(c.patientSheet.antworten?.['akt-anfall-bewusstsein'], c.id).toMatch(/Zunge/);
      expect(c.patientSheet.antworten?.['akt-anfall-bewusstsein'], c.id).toMatch(/[Ee]ingenässt|Urin|Hose/);
    }
  });
});

describe('P1-1 — D4-bis : le symptôme directeur du motif se pose dans Aktuelle Beschwerden, la Fach se réduit', () => {
  const fieber = (id: string) => trameJouee(byId(id)).flatMap((x) => x.questions.filter((p) => phraseSucht(p).includes('fieber')).map((p) => `${x.id}:${phraseProbes(p).join('+') || 'cas'}`));
  it('malaria : la fièvre est posée une fois, dans Aktuelle Beschwerden (fach-infekt-fieber cède)', () => {
    expect(fieber('case-malaria')).toEqual(['aktuell:akt-infekt-fieber']);
    expect(un(playedTrame(byId('case-malaria')).ecarts, 'fach-infekt-fieber', 'retire')).toMatchObject({ cause: 'akt-infekt-fieber' });
  });
  it('pneumonie : la Fach pneumo garde « Hatten Sie dabei Schüttelfrost? » (texte existant), plus de « Haben Sie Fieber? »', () => {
    expect(fieber('case-pneumonie')).toEqual(['aktuell:akt-infekt-fieber']);
    const fach = playedTrame(byId('case-pneumonie')).fach!.chapter.questions.map(phraseText);
    expect(fach).toContain('Hatten Sie dabei Schüttelfrost?');
    expect(fach).not.toContain('Haben Sie Fieber oder Schüttelfrost?');
  });
  it('130 cas de nature infekt : aucune question de fièvre hors d\'Aktuelle Beschwerden (sauf une question du cas)', () => {
    for (const c of cases.filter((x) => profilDuCas(x).nature === 'infekt')) for (const f of fieber(c.id)) expect(f.startsWith('aktuell:') || f.endsWith(':cas'), `${c.id} ${f}`).toBe(true);
  });
});

describe('P1-2 à P1-5 — dimensions et pertinence', () => {
  const akt = (id: string) => coeur(byId(id)).aktuell;
  const textesAkt = (id: string) => playedTrame(byId(id)).chapters.find((x) => x.id === 'aktuell')!.questions.map(phraseText);
  it('P1-2 : la Fach neuro pose le cours (schub, verlauf) — Aktuelle Beschwerden ne le redemande pas (multiple-sklerose)', () => {
    expect(PROBE_SUCHT['fach-neuro-verlauf']).toEqual(['schub', 'verlauf', 'waerme']);
    expect(akt('case-multiple-sklerose')).not.toContain('akt-verlauf');
  });
  it('P1-3 : la variante psy de Verlauf se réduit au cours quand la Fach psy pose le moment de la journée (depression)', () => {
    expect(textesAkt('case-depression')).toContain('Ist es jeden Tag gleich, oder gibt es bessere und schlechtere Tage?');
    expect(textesAkt('case-depression').join(' ')).not.toMatch(/morgens anders als abends/);
  });
  it('P1-4 : « Seit wann » reste, le mode de début n\'est posé qu\'une fois (6 cas rhumato)', () => {
    for (const id of ['case-fibromyalgie', 'case-gicht', 'case-rheumatoide-arthritis', 'case-polymyalgia', 'case-septische-arthritis', 'case-reaktive-arthritis']) {
      expect(textesAkt(id), id).toContain('Seit wann haben Sie die Schmerzen?');
      const t = trameJouee(byId(id)).flatMap((x) => x.questions).filter((p) => phraseSucht(p).includes('beginn_art'));
      expect(t.length, id).toBe(1);
    }
  });
  it('P1-5 : la fréquence des selles ne se pose que dans une diarrhée ou un trouble du transit ; celle des urines, dans un tableau urinaire, rénal ou une diarrhée', () => {
    expect(SIGNE_DEF.stuhlfrequenz.pertinence).toEqual(['diarrhoe', 'transit']);
    expect(SIGNE_DEF.miktion_frequenz.pertinence).toEqual(['harn', 'diarrhoe']);
    for (const id of ['case-zystitis', 'case-bph', 'case-oesophaguskarzinom', 'case-hepatitis-b']) expect(akt(id), id).not.toContain('akt-ausscheid-haeufigkeit');
    for (const id of ['case-obstipation', 'case-kolorektales-ca', 'case-gastroenteritis']) expect(akt(id), id).toContain('akt-ausscheid-haeufigkeit');
    expect(akt('case-kolorektales-ca')).toContain('akt-ausscheid-harn-haeufigkeit~nykturie');
    // nykturie reste de dépistage : la Fach Kardio (insuffisance cardiaque) et Endo (polyurie) en ont besoin
    expect(coeur(byId('case-herzinsuffizienz')).fach).toContain('fach-kardio-nykturie');
    for (const c of cases) expect(compteursApresCas(c), c.id).toMatchObject({ horsProfil: 0, exigeAbsent: 0, ajouteSansReponse: 0 });
  });
});
