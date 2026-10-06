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
  it('gastroenteritis : la question du cas pose la fréquence du jour ; la nuit est hors sujet (R2) — la générale disparaît', () => {
    expect(coeur(byId('case-gastroenteritis')).aktuell.some((k) => k.startsWith('akt-ausscheid-harn-haeufigkeit'))).toBe(false);
    expect(coeur(byId('case-laktoseintoleranz')).aktuell).toContain('akt-ausscheid-harn-haeufigkeit~miktion_frequenz');   // diarrhée : la diurèse du jour reste
  });
});

describe('I3 / P2 psy — l\'ordre de sécurité sous fach-psych-suizid (10 cas psy)', () => {
  const psy = cases.filter((c) => playedTrame(c).fach?.chapter.id === 'fach-psy');
  it('cadrage « Ich frage das jeden Patienten », idée → plans → tentative antérieure → intention (NOTFALL), puis le désir avant l\'acte, puis le soutien', () => {
    expect(psy).toHaveLength(10);
    for (const c of psy) {
      const q = playedTrame(c).fach!.chapter.questions.find((p) => phraseProbes(p).includes('fach-psych-suizid'))!;
      expect(phraseText(q), c.id).toMatch(/^Ich frage das jeden Patienten in Ihrer Situation: Denken Sie manchmal/);
      expect(phraseFollowUps(q).map((f) => f.text.slice(0, 32)), c.id).toEqual([
        'Haben Sie konkrete Pläne, sich d', 'Haben Sie schon einmal versucht,', 'Falls konkrete Absicht oder Plan', 'Haben Sie den Wunsch, sich zu ve', 'Haben Sie sich selbst verletzt?', 'Gibt es jemanden, der Sie unters']);
      // Q3 (revue clinique P2) : la tentative antérieure suit les plans et précède la consigne NOTFALL
      expect(phraseFollowUps(q).map((f) => f.sucht ?? []), c.id).toEqual([[], ['suizidversuch'], [], ['selbstverletzung_wunsch'], ['selbstverletzung'], []]);
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
    expect(coeur(g).aktuell).toContain('akt-ausscheid-aussehen~stuhl_blut');
    expect(g.patientSheet.antworten?.['akt-ausscheid-aussehen']).toBeTruthy();
    const q = g.caseSpecificQuestions.find((x) => typeof x !== 'string' && /Wie sieht Ihr Stuhl aus/.test(x.frage));
    expect(typeof q !== 'string' && q?.sucht).toEqual(['stuhl', 'stuhlaussehen']);   // jamais stuhl_blut (garde-fou) ; `stuhl` : la question du cas pose le changement des selles
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
  it('pneumonie : la Fach pneumo garde « Hatten Sie Schüttelfrost? » (part, texte de la relecture de langue K4), plus de « Haben Sie Fieber? »', () => {
    expect(fieber('case-pneumonie')).toEqual(['aktuell:akt-infekt-fieber']);
    const fach = playedTrame(byId('case-pneumonie')).fach!.chapter.questions.map(phraseText);
    expect(fach).toContain('Hatten Sie Schüttelfrost?');
    expect(fach).not.toContain('Haben Sie Fieber oder Schüttelfrost?');
  });
  it('130 cas de nature infekt : aucune question de fièvre hors d\'Aktuelle Beschwerden (sauf une question du cas)', () => {
    for (const c of cases.filter((x) => profilDuCas(x).nature === 'infekt' && profilDuCas(x).tags.includes('fieber'))) for (const f of fieber(c.id)) expect(f.startsWith('aktuell:') || f.endsWith(':cas'), `${c.id} ${f}`).toBe(true);
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
    expect(textesAkt('case-depression')).toContain('Verlauf — Ist es jeden Tag gleich, oder gibt es bessere und schlechtere Tage?');
    expect(textesAkt('case-depression').join(' ')).not.toMatch(/morgens anders als abends/);
  });
  it('P1-4 : « Seit wann » reste, le mode de début n\'est posé qu\'une fois (6 cas rhumato)', () => {
    for (const id of ['case-fibromyalgie', 'case-gicht', 'case-rheumatoide-arthritis', 'case-polymyalgia', 'case-septische-arthritis', 'case-reaktive-arthritis']) {
      expect(textesAkt(id), id).toContain('Beginn — Seit wann haben Sie die Schmerzen?');
      const t = trameJouee(byId(id)).flatMap((x) => x.questions).filter((p) => phraseSucht(p).includes('beginn_art'));
      expect(t.length, id).toBe(1);
    }
  });
  it('P1-5 : la fréquence des selles ne se pose que dans une diarrhée ou un trouble du transit ; celle des urines, dans un tableau urinaire, rénal ou une diarrhée', () => {
    expect(SIGNE_DEF.stuhlfrequenz.pertinence).toEqual(['diarrhoe', 'transit']);
    expect(SIGNE_DEF.miktion_frequenz.pertinence).toEqual(['harn', 'diarrhoe']);
    for (const id of ['case-zystitis', 'case-bph', 'case-oesophaguskarzinom', 'case-hepatitis-b']) expect(akt(id), id).not.toContain('akt-ausscheid-haeufigkeit');
    for (const id of ['case-obstipation', 'case-kolorektales-ca', 'case-gastroenteritis']) expect(akt(id).some((k) => k.startsWith('akt-ausscheid-haeufigkeit')), id).toBe(true);
    expect(akt('case-kolorektales-ca').some((k) => k.startsWith('akt-ausscheid-harn-haeufigkeit'))).toBe(false);   // R2 : ni le jour ni la nuit
    // nykturie reste de dépistage : la Fach Kardio (insuffisance cardiaque) et Endo (polyurie) en ont besoin
    expect(coeur(byId('case-herzinsuffizienz')).fach).toContain('fach-kardio-nykturie');
    for (const c of cases) expect(compteursApresCas(c), c.id).toMatchObject({ horsProfil: 0, exigeAbsent: 0, ajouteSansReponse: 0 });
  });
});

describe('P1-6 / P1-7 — le changement remarqué (veraenderung) ne repose pas ce que la Fach demande', () => {
  // P1-6a, remplacé par R3 (décision de main) : la variante n'a plus de relances de saignement systémique ; la Fach les pose.
  it('P1-6a / R3 : la variante ne pose plus le saignement systémique (bronchialkarzinom, lymphom, itp)', () => {
    const variante = (id: string) => trameJouee(byId(id)).flatMap((x) => x.questions).filter((p) => phraseProbes(p).includes('akt-veraend-blutung'))
      .flatMap((p) => [phraseText(p), ...phraseFollowUps(p).map((f) => f.text)]);
    for (const id of ['case-bronchialkarzinom', 'case-lymphom', 'case-itp']) expect(variante(id).filter((t) => /Blut ab|Blut im/.test(t)), id).toEqual([]);
  });
  it('P1-6b : nodule et évolution — la Fach (onko, haem, gyn, derma) pose ce que la variante demande', () => {
    for (const p of ['fach-onko-knoten', 'fach-haem-lymphknoten', 'fach-gyn-brust']) expect(PROBE_SUCHT[p], p).toContain('knoten');
    for (const p of ['fach-derma-muttermal', 'fach-derma-beginn-ort']) expect(PROBE_SUCHT[p], p).toContain('entwicklung');
    expect(coeur(byId('case-basaliom')).aktuell).not.toContain('akt-veraend-entwicklung');
  });
  it('P1-7 : uterus-myomatosus — trouble hémorragique, pas de constat cutané : ni « Befund », ni « Schmerz und Blutung »', () => {
    expect(coeur(byId('case-uterus-myomatosus')).aktuell).not.toContain('akt-veraend-was');
    expect(coeur(byId('case-uterus-myomatosus')).aktuell.some((k) => k.startsWith('akt-veraend-blutung'))).toBe(false);
  });
});

describe('P1-8 à P1-12 — déclarations des questions du cas, banques', () => {
  const sucht = (id: string, re: RegExp) => { const q = byId(id).caseSpecificQuestions.find((x) => typeof x !== 'string' && re.test(x.frage)); return typeof q === 'string' ? undefined : q?.sucht; };
  const textes = (id: string) => trameJouee(byId(id)).flatMap((x) => x.questions.flatMap((p) => [phraseText(p), ...phraseFollowUps(p).map((f) => f.text)]));
  it('P1-8 : herzinsuffizienz — « Mit wie vielen Kissen … nachts aufwachen » déclare orthopnoe et dpn', () => {
    expect(sucht('case-herzinsuffizienz', /Kissen/)).toEqual(['orthopnoe', 'dpn']);
  });
  it('P1-9 : la banque de la dyspnée est fach-pneumo-atemnot ; chaque cas où r3 l\'ajoute a sa réponse', () => {
    expect(SIGNE_DEF.atemnot.bank).toBe('fach-pneumo-atemnot');
    for (const c of cases) for (const e of playedTrame(c).ecarts.filter((x) => x.action === 'ajoute' && x.question === 'fach-pneumo-atemnot'))
      expect(c.patientSheet.antworten?.['fach-pneumo-atemnot'], `${c.id} ${e.raison}`).toBeTruthy();
  });
  it('P1-10 : la nuit des selles est un signe ; akt-ausscheid-haeufigkeit a ses parts jour / nuit ; crohn et zoeliakie la déclarent', () => {
    expect(SIGNE_DEF.stuhl_nachts).toBeTruthy();
    expect(sucht('case-morbus-crohn', /nachts wegen des Durchfalls/)).toEqual(['stuhl_nachts']);
    expect(sucht('case-zoeliakie', /nachts zum Stuhlgang/)).toEqual(['stuhl_nachts']);
    for (const id of ['case-morbus-crohn', 'case-zoeliakie']) expect(textes(id).filter((t) => /nachts .*Stuhlgang|nachts wegen des Durchfalls/.test(t)), id).toHaveLength(1);
  });
  it('P1-12 : la vaccination n\'est posée qu\'une fois dans les 6 cas où une question du cas la pose', () => {
    for (const id of ['case-pneumonie', 'case-copd', 'case-itp', 'case-abszess', 'case-pertussis', 'case-hodentorsion'])
      expect(textes(id), id).not.toContain('Sind Ihre Impfungen auf dem neuesten Stand?');
  });
});

describe('P1-11 — le voyage ne se demande que dans un contexte infectieux', () => {
  const INFECT = ['infekt', 'fieber', 'reise', 'diarrhoe', 'lyme', 'meningitis'];
  it('pertinence de reise : tags infectieux ; fibromyalgie ne pose plus « Waren Sie kürzlich im Ausland? » isolé', () => {
    expect(SIGNE_DEF.reise.pertinence).toEqual(INFECT);
    const veg = playedTrame(byId('case-fibromyalgie')).chapters.find((x) => x.id === 'vegetativ')!.questions.map(phraseText);
    expect(veg).not.toContain('Waren Sie kürzlich im Ausland?');
  });
  it('130 cas : hors contexte infectieux, aucune question jouée ne cherche le voyage (sauf résidu non réduit)', () => {
    for (const c of cases.filter((x) => !profilDuCas(x).tags.some((t) => INFECT.includes(t)))) {
      const nonReduit = new Set(playedTrame(c).ecarts.filter((e) => e.action === 'non-reduit').map((e) => e.question));
      const q = trameJouee(c).flatMap((x) => x.questions).filter((p) => phraseSucht(p).includes('reise') && !nonReduit.has(phraseProbes(p).join('+')));
      expect(q.map(phraseText), c.id).toEqual([]);
    }
    expect(coeur(byId('case-gastroenteritis')).fach).toContain('fach-infekt-reise');
  });
});

describe('P2 — finitions', () => {
  const q = (id: string, probe: string) => trameJouee(byId(id)).flatMap((x) => x.questions).filter((p) => phraseProbes(p).includes(probe));
  it('la transpiration : les parts gardées d\'une même question se posent en UNE question et ses relances (nierenkolik)', () => {
    const veg = q('case-nierenkolik', 'veg-schuettelfrost');
    expect(veg).toHaveLength(1);
    expect(phraseText(veg[0])).toBe('Schwitzen Sie nachts stark?');
    expect(phraseFollowUps(veg[0]).map((f) => f.text)).toEqual(['Haben Sie starke Schweißausbrüche?']);
  });
  it('fach-rheuma-systemisch ne déclare plus ausschlag (la Fach le pose par fach-rheuma-haut) : plus de non-réduite', () => {
    expect(PROBE_SUCHT['fach-rheuma-systemisch']).not.toContain('ausschlag');
    for (const c of cases) expect(playedTrame(c).ecarts.filter((e) => e.question === 'fach-rheuma-systemisch' && e.action === 'non-reduit' && e.signes.includes('ausschlag')), c.id).toEqual([]);
  });
  it('fach-ortho-mechanismus déclare par variante : sans traumatisme, « Unfall oder Sturz » (pas la syncope, pas la blessure)', () => {
    expect(phraseSucht(q('case-bandscheibenvorfall', 'fach-ortho-mechanismus')[0])).toEqual(['unfallhergang', 'sturz']);
    expect(phraseSucht(q('case-osg-fraktur', 'fach-ortho-mechanismus')[0])).toEqual(['unfallhergang', 'bewusstlos', 'begleitverletzung']);
  });
  it('akt-neuro-lage (rotation de la tête) n\'est pas posée dans schlaganfall et tia', () => {
    for (const id of ['case-schlaganfall', 'case-tia']) expect(q(id, 'akt-neuro-lage'), id).toEqual([]);
  });
});

describe('R6 — r2 ne déplace une question du cas que si la perdante est RETIRÉE (§10.4)', () => {
  it('perdante non réduite : la question du cas reste à sa place ; perdante retirée : elle prend sa place', () => {
    const nonReduite = run([ch('aktuell', s('akt-allgemein-art'), s('akt-motiv'), cas(0, 'Sind Sie müde?', ['muedigkeit']))]);
    expect(vue(nonReduite.trame).aktuell).toEqual(['akt-allgemein-art', 'akt-motiv', 'cas']);
    expect(un(nonReduite.ecarts, 'cas:0', 'deplace')).toBeUndefined();
    const retiree = run([ch('aktuell', s('akt-ausloeser'), s('akt-motiv'), cas(1, 'Auslöser?', ['ausloeser']))]);
    expect(vue(retiree.trame).aktuell).toEqual(['cas', 'akt-motiv']);
  });
});

describe('R5 — D4-bis se fonde sur le motif DÉCLARÉ (tag du profil), pas sur la seule nature', () => {
  it('allergische-rhinitis (nature atemnot, sans tag dyspnoe) : la question neutre de la Fach pneumo revient', () => {
    expect(coeur(byId('case-allergische-rhinitis')).fach).toContain('fach-pneumo-atemnot');
    expect(coeur(byId('case-copd')).fach).not.toContain('fach-pneumo-atemnot');   // copd déclare dyspnoe : Aktuelle Beschwerden la pose
  });
  it('3e revue B1 — lyme (« leicht erhöhte Temperatur ») déclare fieber : la fièvre se demande une fois, dans Aktuelle Beschwerden', () => {
    const lyme = trameJouee(byId('case-lyme')).flatMap((x) => x.questions);
    expect(lyme.filter((p) => phraseSucht(p).includes('fieber')).map((p) => phraseProbes(p)[0])).toEqual(['akt-infekt-fieber']);
    expect(lyme.filter((p) => /Schüben/.test(phraseText(p)))).toHaveLength(1);
  });
  it('3e revue B1 — 130 cas : tout motif fébrile (réponse à akt-motiv) déclare fieber, sinon D4-bis ne joue pas', () => {
    const febril = (c: (typeof cases)[number]) => /Fieber|Temperatur|fiebr|Schüttelfrost/i.test(c.patientSheet.antworten?.['akt-motiv'] ?? '');
    expect(cases.filter((c) => febril(c) && !profilDuCas(c).tags.includes('fieber')).map((c) => c.id)).toEqual([]);
  });
});

describe('R1 / R2 — le sang dans les selles et la nycturie ne se demandent que là où ils servent', () => {
  const cherche = (id: string, s: string) => trameJouee(byId(id)).flatMap((x) => x.questions).some((p) => phraseSucht(p).includes(s as never));
  it('R1 : stuhl_blut pertinent pour diarrhoe, transit, gastro, haem, onko ; plus dans les cas uro / néphro', () => {
    expect(SIGNE_DEF.stuhl_blut.pertinence).toEqual(['diarrhoe', 'transit', 'gastro', 'haem', 'onko']);
    for (const id of ['case-zystitis', 'case-bph', 'case-prostatakarzinom', 'case-glomerulonephritis']) expect(cherche(id, 'stuhl_blut'), id).toBe(false);
    for (const id of ['case-gib', 'case-itp', 'case-lymphom', 'case-gastroenteritis']) expect(cherche(id, 'stuhl_blut'), id).toBe(true);
  });
  it('R2 : nykturie pertinente pour kardio, endo, harn ; les 16 cas Kardio / Endo la gardent (Q3 : + copd, cœur pulmonaire) ; les cas digestifs ne la posent plus', () => {
    expect(SIGNE_DEF.nykturie.pertinence).toEqual(['harn', 'kardio', 'endo']);
    for (const c of cases.filter((x) => ['kardio', 'endo'].some((t) => profilDuCas(x).tags.includes(t as never)))) expect(cherche(c.id, 'nykturie'), c.id).toBe(true);
    expect(cases.filter((x) => ['kardio', 'endo'].some((t) => profilDuCas(x).tags.includes(t as never)))).toHaveLength(16);
    for (const id of ['case-kolorektales-ca', 'case-oesophaguskarzinom', 'case-pankreaskarzinom', 'case-hepatitis-b', 'case-achalasie', 'case-obstipation', 'case-gastroenteritis'])
      expect(cherche(id, 'nykturie'), id).toBe(false);
  });
});

describe('R3 / P2 / gib — le bloc « Veränderung » d\'une lésion cutanée reste à sa place', () => {
  const textes = (id: string) => trameJouee(byId(id)).flatMap((x) => x.questions.flatMap((p) => [phraseText(p), ...phraseFollowUps(p).map((f) => f.text)]));
  it('R3 : plus de « Blut im Stuhl / Urin » ni « Husten Sie Blut ab? » dans la variante (mammakarzinom, tvt, derma)', () => {
    for (const id of ['case-mammakarzinom', 'case-tvt', 'case-erysipel', 'case-basaliom', 'case-psoriasis', 'case-urtikaria'])
      expect(textes(id).filter((t) => /Blut im Stuhl|Blut im Urin|Husten Sie Blut ab/.test(t)), id).toEqual([]);
  });
  it('P2 : « blutet es? » est une part propre — quand le saignement est déjà demandé, il reste « Tut es weh oder juckt es? »', () => {
    expect(textes('case-mammakarzinom')).toContain('Schmerz und Blutung — Tut es weh oder juckt es?');
    expect(textes('case-mammakarzinom')).not.toContain('Tut es weh, juckt es, oder blutet es?');
  });
  it('3e revue B2 — gib : la douleur épigastrique est demandée (exige charakter), avec une réponse fidèle à la fiche, sans « jucken »', () => {
    const g = byId('case-gib');
    expect(profilDuCas(g).exige.charakter).toBeTruthy();
    expect(coeur(g).aktuell).toContain('akt-charakter');
    const r = g.patientSheet.antworten?.['akt-charakter'] ?? '';
    expect(r).toMatch(/brenn/i);
    expect(r).not.toMatch(/juck/i);
    expect(compteursApresCas(g)).toMatchObject({ ajouteSansReponse: 0, brauchtViole: 0 });
  });
  it('gib, itp, lymphom : décisions cas par cas (rapport § 0bis)', () => {
    for (const id of ['case-gib', 'case-lymphom']) expect(coeur(byId(id)).aktuell.some((k) => /^akt-veraend-(was|blutung)/.test(k)), id).toBe(false);
    expect(coeur(byId('case-itp')).aktuell.some((k) => k.startsWith('akt-veraend-blutung'))).toBe(false);
    expect(coeur(byId('case-itp')).aktuell.some((k) => k.startsWith('akt-veraend-was'))).toBe(true);   // les pétéchies sont la « Veränderung »
  });
});

describe('R4 / P2 syncope — Zungenbiss et Einnässen : là où il faut, après le témoin et la durée', () => {
  const lignes = (id: string) => playedTrame(byId(id)).chapters.find((x) => x.id === 'aktuell')!.questions.map(phraseText);
  it('R4 : vorhofflimmern (keine Synkope) exclut zungenbiss et einnaessen ; ni la morsure ni l\'énurésie ne sont posées', () => {
    expect(byId('case-vorhofflimmern').patientSheet.profil?.exclut).toMatchObject({ zungenbiss: 'keine Synkope', einnaessen: 'keine Synkope' });
    expect(lignes('case-vorhofflimmern').join(' ')).not.toMatch(/Zunge gebissen|Urin abgegangen/);
  });
  it('synkope : Zungenbiss et Einnässen se posent après la question du témoin et celle de la durée', () => {
    const l = lignes('case-synkope');
    const duree = l.findIndex((t) => /Wie lange waren Sie nicht ansprechbar/.test(t));
    expect(l.findIndex((t) => /Zunge gebissen/.test(t))).toBe(duree + 1);
    expect(l.findIndex((t) => /Urin abgegangen/.test(t))).toBe(duree + 2);
  });
  it('les réponses ajoutées que plus aucune question n\'interroge sont retirées (vorhofflimmern, sturz-im-alter)', () => {
    for (const id of ['case-vorhofflimmern', 'case-sturz-im-alter']) expect(byId(id).patientSheet.antworten?.['akt-anfall-bewusstsein'], id).not.toMatch(/Zunge/);
  });
});

describe('Les deux cas de la direction, présentables dès K3 — zéro doublon, zéro présupposition, zéro hors sujet', () => {
  const ordre = (id: string) => trameJouee(byId(id)).flatMap((x) => x.questions.map((p) => `${x.id}:${phraseProbes(p).join('+') || (typeof p !== 'string' && p.caseSpecific ? 'cas' : '·')}|${phraseText(p)}`));
  it('gastroenteritis : « dort gegessen » suit le voyage ; Krankenhaus et Beruf une fois ; ni Lyme (peau, neuro) ni « Was hat sich verändert »', () => {
    const o = ordre('case-gastroenteritis');
    const i = (re: RegExp) => o.findIndex((l) => re.test(l));
    expect(i(/dort gegessen/)).toBe(i(/fach-infekt-reise/) + 1);
    expect(o.filter((l) => /Krankenhaus/.test(l))).toHaveLength(1);
    expect(o.filter((l) => /beruflich|von Beruf/.test(l))).toHaveLength(1);
    expect(i(/dabei mit besonderen Stoffen/)).toBeGreaterThan(i(/Was arbeiten Sie beruflich/));
    expect(i(/Stress durch Ihre Arbeitssituation/)).toBeGreaterThan(i(/Was arbeiten Sie beruflich/));
    for (const re of [/fach-infekt-haut/, /fach-infekt-neuro/, /akt-ausscheid-was/, /ungewöhnliche Lebensmittel/]) expect(i(re), String(re)).toBe(-1);
    expect(compteursApresCas(byId('case-gastroenteritis'))).toMatchObject({ doublons: 0, horsProfil: 0, brauchtViole: 0, nonReduit: 0 });
  });
  it('fibromyalgie : Ort, Verlauf, Steifigkeit, Entzündung posés une fois, par la question du cas ; une seule raideur matinale ; pas de goutte', () => {
    const o = ordre('case-fibromyalgie');
    for (const re of [/akt-ort\|/, /akt-verlauf\|/, /fach-rheuma-morgensteifigkeit/, /fach-rheuma-entzuendung/, /Bier\?|Wassertablette/]) expect(o.filter((l) => re.test(l)), String(re)).toEqual([]);
    expect(o.filter((l) => /steif/i.test(l))).toHaveLength(1);
    expect(o.findIndex((l) => /Zeichnung/.test(l))).toBe(o.findIndex((l) => /akt-motiv/.test(l)) + 1);   // la question du cas prend la place d'akt-ort
    expect(compteursApresCas(byId('case-fibromyalgie'))).toMatchObject({ doublons: 0, horsProfil: 0, brauchtViole: 0 });
  });
});

describe('P2 — une part réduite porte le libellé de dimension de sa mère', () => {
  it('« Beginn — Seit wann haben Sie die Schmerzen? » (fibromyalgie) ; « Schmerz und Blutung — Tut es weh oder juckt es? » (mammakarzinom)', () => {
    const akt = (id: string) => playedTrame(byId(id)).chapters.find((x) => x.id === 'aktuell')!.questions.map(phraseText);
    expect(akt('case-fibromyalgie')).toContain('Beginn — Seit wann haben Sie die Schmerzen?');
    expect(akt('case-mammakarzinom')).toContain('Schmerz und Blutung — Tut es weh oder juckt es?');
    expect(akt('case-depression')).toContain('Verlauf — Ist es jeden Tag gleich, oder gibt es bessere und schlechtere Tage?');
  });
});

describe('gastroenteritis — la couleur des selles n\'est demandée qu\'une fois', () => {
  it('la question du cas (« wässrig oder breiig, welche Farbe ») garde l\'aspect ; la banque ne garde que l\'alarme', () => {
    const akt = playedTrame(byId('case-gastroenteritis')).chapters.find((x) => x.id === 'aktuell')!.questions.map(phraseText);
    expect(akt).toContain('Aussehen — Ist Ihnen Blut oder Schleim im Stuhl aufgefallen?');
    expect(akt.filter((t) => /Farbe/.test(t))).toHaveLength(1);
  });
  it('sans question du cas sur l\'aspect, la banque reste entière (akutes-nierenversagen)', () => {
    const akt = playedTrame(byId('case-akutes-nierenversagen')).chapters.find((x) => x.id === 'aktuell')!.questions.map(phraseText);
    expect(akt).toContain('Aussehen — Ist Ihnen Blut, Schleim oder eine ungewöhnliche Farbe im Stuhl aufgefallen?');
  });
});
