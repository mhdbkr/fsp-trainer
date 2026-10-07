import { describe, expect, it } from 'vitest';
import type { Case } from '@/db/types';
import { ALLGEMEINE_ANAMNESE, FACHANAMNESEN, LEITSYMPTOM_KATEGORIEN, aktuellChapterFor, ctxDuCas, playedTrame, profilDuCas, trameBrute } from './anamneseChapters';
import { cohere, promouvable } from './coherence';
import { byId, cases, ch, run, s, signesJoues, trameJouee, un, vue } from './coherenceFixtures';
import { parseFollowUp } from './followUp';
import { phraseFollowUp, phraseFollowUps, phraseIsCaseSpecific, phraseProbes, phraseText, type Phrase } from './phrases';
import { ditsDe, phraseSucht, signesDits } from './symptoms';

// Lot Banque (série 3, FB3-A2 « redemander = ne pas écouter ») — r5 du moteur : une question de BANQUE ne redemande pas ce
// qu'une réplique jouée avant elle a déjà dit. Tous les signes dits → retirée ; une partie → réduite à ses `parts` ; aucune
// part ne porte le reste → gardée telle quelle (jamais un texte recoupé, jamais un « non réduit » de plus).

const PLAFOND_RELANCES_NON_AUTONOMES = 50;
const joue = (c: Case): Phrase[] => trameJouee(c).flatMap((x) => x.questions);
const textes = (id: string) => joue(byId(id)).flatMap((p) => [phraseText(p), ...phraseFollowUp(p)]);
const deSonde = (id: string, probe: string) => joue(byId(id)).filter((p) => !phraseIsCaseSpecific(p) && phraseProbes(p).includes(probe));

describe('r5 — les trois exemples de la direction', () => {
  it('pankreatitis : « Mir ist sehr übel, ich habe mehrmals erbrochen » → « Leiden Sie an Übelkeit oder Erbrechen? » n\'est plus posée ; ses précisions oui', () => {
    const t = textes('case-pankreatitis');
    expect(t.filter((x) => /Leiden Sie an Übelkeit|Müssen Sie sich übergeben\?|Ist Ihnen übel\?|Mussten Sie sich übergeben\?/.test(x))).toEqual([]);
    // la présence est dite, pas l'aspect : les relances rédigées s'ouvrent sans leur condition (« Falls Sie sich übergeben haben: »)
    const q = deSonde('case-pankreatitis', 'fach-gastro-uebelkeit');
    // revue clinique P2-5 : dans un abdomen aigu qui vomit, la question d'alarme ouvre (avant le délai postprandial)
    expect(q.map(phraseText)).toEqual(['Wie sah das Erbrochene aus — wie Kaffeesatz, mit Blut?']);
    expect(phraseFollowUp(q[0])).toContain('Wie lange nach dem Essen ist Ihnen übel?');
    expect(un(playedTrame(byId('case-pankreatitis')).ecarts, 'fach-gastro-uebelkeit', 'reduit')).toMatchObject({ regle: 5, cause: 'akt-begleit', signes: ['uebelkeit', 'erbrechen'] });
  });

  it('commotio : le motif dit « mir ist übel » → « War Ihnen dabei übel? » n\'est plus posée, le reste des Begleitbeschwerden oui', () => {
    expect(textes('case-commotio')).not.toContain('War Ihnen dabei übel?');
    expect(deSonde('case-commotio', 'akt-begleit').length).toBe(1);
    // INV-87 : un écart par (question, action) — la réduction de r5 s'ajoute à celle de r2, avec sa raison.
    expect(un(playedTrame(byId('case-commotio')).ecarts, 'akt-begleit', 'reduit')!.raison).toMatch(/RÉDUIT akt-begleit : uebelkeit déjà dit par akt-motiv/);
  });

  it('rheumatoide-arthritis : « keinen Durchfall » → la question systémique est réduite, sans le Durchfall', () => {
    const q = deSonde('case-rheumatoide-arthritis', 'fach-rheuma-systemisch');
    expect(q.length).toBe(1);
    expect(phraseSucht(q[0])).not.toContain('stuhl');
    expect([phraseText(q[0]), ...phraseFollowUp(q[0])].join(' ')).not.toMatch(/Durchfall/);
    expect(phraseSucht(q[0])).toContain('fieber');
  });
});

describe('r5 — précision : un signe cité dans un autre sens ne vaut pas réponse', () => {
  it('pneumothorax : « schlimmer beim Husten » (facteur) → la question de la toux reste posée', () => {
    expect(signesDits('Schlimmer wird es beim tiefen Einatmen, beim Husten und beim Lachen.')).not.toContain('husten');
    expect(deSonde('case-pneumothorax', 'fach-pneumo-husten').flatMap(phraseSucht)).toContain('husten');
  });

  it('myokarditis : « vor drei Wochen Corona, fünf Tage Fieber » (épisode passé) → la fièvre d\'aujourd\'hui reste demandée', () => {
    expect(signesDits('Ja, vor drei Wochen hatte ich Corona, fünf Tage Fieber.')).not.toContain('fieber');
    expect(deSonde('case-myokarditis', 'veg-fieber').flatMap(phraseSucht)).toContain('fieber');
  });

  it('la lecture : une négation est une réponse ; une image, une distance, un poids du jour ne le sont pas', () => {
    expect(signesDits('Keine Verletzung, keinen Durchfall, keinen Zeckenstich.')).toContain('stuhl');
    expect(signesDits('Nein, Fieber und Nachtschweiß habe ich nicht.')).toEqual(expect.arrayContaining(['fieber', 'nachtschweiss']));
    expect(signesDits('Es pocht nicht, es ist eher wie ein Gewicht auf der Brust.')).not.toContain('gewicht');
    expect(signesDits('Früher bin ich fünf Kilometer gelaufen.')).not.toContain('gewicht');
    expect(signesDits('Ich bin 1,78 m groß und wiege 70 Kilo.')).not.toContain('gewicht');
    expect(signesDits('Vor zwei Monaten waren es noch 72 Kilo.')).toContain('gewicht');
    expect(signesDits('Ich habe mehrmals gemessen, da waren es 37,4 oder 37,5 Grad.')).not.toContain('gewicht');   // une température
    expect(signesDits('Ich wiege 78 Kilo — vor dem Infekt waren es 80.')).toContain('gewicht');
    expect(signesDits('Ich habe fünf Kilo abgenommen.')).toContain('gewicht');
    expect(signesDits('Nach dem Stuhlgang lassen die Schmerzen nach.')).not.toContain('stuhl');
    expect(signesDits('Mir ist heiß, ich fühle mich warm.')).not.toContain('fieber');
    expect(signesDits('Mir ist übel, erbrochen habe ich nicht.')).toEqual(expect.arrayContaining(['uebelkeit', 'erbrechen']));
    expect(signesDits('Mir ist übel.')).not.toContain('erbrechen');
    expect(signesDits('Ich schwitze nachts sehr stark.')).toEqual(['nachtschweiss']);  });

  it('la polarité : l\'absence et le chiffre répondent aussi aux précisions, la présence seule non', () => {
    expect([...ditsDe('Mir ist übel, erbrochen habe ich nicht.')]).toEqual([['uebelkeit', false], ['erbrechen', true]]);
    expect(ditsDe('Nein, Fieber und Nachtschweiß habe ich nicht.').get('fieber')).toBe(true);
    expect(ditsDe('Nachtschweiß habe ich allerdings — aber eben ohne Fieber.').get('nachtschweiss')).toBe(false);
    expect(ditsDe('Ich kann nicht mehr sitzen und ich habe Fieber bekommen.').get('fieber')).toBe(false);
    expect(ditsDe('Etwa 1,76 m und 74 Kilo — zuletzt habe ich abgenommen.').get('gewicht')).toBe(false);
    expect(ditsDe('Ich habe in vier Wochen zehn Kilo abgenommen.').get('gewicht')).toBe(true);
    expect(ditsDe('Ja, ich habe abgenommen, vier Kilo.').get('gewicht')).toBe(true);
    expect(ditsDe('Beim Wasserlassen ist auch alles wie immer.').get('miktion')).toBe(true);
  });

  it('la présence dite sans précision : les précisions restent posées (relances ouvertes, ou question qui les demande)', () => {
    // schizophrenie : « Und ich habe abgenommen » → plus « Gewichtsveränderungen? », mais « Wie viel …? » et « In welchem Zeitraum …? »
    expect(deSonde('case-schizophrenie', 'veg-gewicht').map((p) => [phraseText(p), ...phraseFollowUp(p)]))
      .toEqual([['Wie viel hat sich Ihr Gewicht verändert?', 'In welchem Zeitraum war das?']]);
    // asthma : « … jetzt fast jeden zweiten Tag, auch nachts mit Husten » → « Seit wann husten Sie? », puis trocken / Auswurf ; anaemie : « Luftnot » à l'effort →
    // « Ab welcher Belastung …? »
    expect(deSonde('case-asthma', 'fach-pneumo-husten').map(phraseText)).toEqual(['Seit wann husten Sie?']);
    expect(deSonde('case-anaemie', 'fach-haem-belastung').map(phraseText)[0]).toMatch(/^Ab welcher Belastung/);
    // lymphom : « ich habe abgenommen » ne répond pas à « — wie viel in welcher Zeit? » (définition des symptômes B)
    expect(textes('case-lymphom')).toContain('Haben Sie ungewollt Gewicht verloren — wie viel in welcher Zeit?');
  });

  it('une relance qui déclare un signe dit ne se pose plus ; la question reste (adnexitis) — la diarrhée dite ouvre « Wechseln sich … ab? » (morbus-crohn)', () => {
    const q = deSonde('case-adnexitis', 'fach-gyn-dyspareunie');
    expect(q.map(phraseText)).toEqual(['Haben Sie Schmerzen beim Geschlechtsverkehr?']);
    expect(phraseFollowUp(q[0])).not.toContain('Brennt oder schmerzt es beim Wasserlassen?');
    expect(phraseSucht(q[0])).not.toContain('miktion');
    expect(deSonde('case-morbus-crohn', 'fach-gastro-stuhl').map(phraseText)).toEqual(['Wechseln sich Durchfall und Verstopfung ab?']);
  });

  it('les Personalia disent le poids ; elles ne PORTENT pas un signe que le profil exige (la question de l\'entretien reste)', () => {
    // copd : « Vor einem halben Jahr waren es noch 81 » (Personalia), « abgenommen, ohne es zu wollen » (akt-begleit, qui le porte)
    expect(deSonde('case-copd', 'veg-gewicht')).toEqual([]);
    expect(phraseSucht(deSonde('case-copd', 'akt-begleit')[0])).toContain('gewicht');
    // delir : « Vor drei Wochen waren es noch 72 » (la fille) — `gewicht` exigé, seule une question de l'entretien clinique le porte
    expect(deSonde('case-delir', 'veg-gewicht').length).toBe(1);
  });

  it('« dabei » hors d\'Aktuelle Beschwerden renvoie au sujet de la question, pas au signe en général', () => {
    // multiple-sklerose : « Übel wird mir dabei nicht » (pendant les céphalées de tension) — la nausée reste demandée
    expect(signesDits('Ab und zu habe ich Spannungskopfschmerzen. Übel wird mir dabei nicht.')).toContain('uebelkeit');
    expect([...ditsDe('Übel wird mir dabei nicht.', false).keys()]).toEqual([]);
    expect(deSonde('case-multiple-sklerose', 'veg-uebelkeit').map(phraseText)).toEqual(['Ist Ihnen übel? Mussten Sie sich übergeben?']);
  });

  it('une question qui demande une DIMENSION du signe (mesure, effort, localisation) reste posée', () => {
    // tonsillitis : « kaum noch schlucken » dit la plainte ; « Festes oder Flüssiges » en demande la dimension.
    expect(deSonde('case-tonsillitis', 'akt-ausscheid-schlucken').length).toBe(1);
  });
});

describe('r5 — le moteur', () => {
  const T = () => [
    ch('aktuell', s('akt-motiv')),
    ch('vegetativ',
      s('veg-a', { sucht: ['fieber'] }),
      s('veg-b', { sucht: ['uebelkeit', 'erbrechen'], parts: [{ sucht: ['uebelkeit'], text: 'Ist Ihnen übel?' }, { sucht: ['erbrechen'], text: 'Mussten Sie sich übergeben?' }] }),
      s('veg-c', { sucht: ['schuettelfrost', 'appetit'] })),
  ];
  const rep = (m: Record<string, string>) => ({ reponse: (p: Phrase) => phraseProbes(p).map((x) => m[x] ?? '').join(' ') });

  it('retire, réduit à ses parts, garde entière sans part ; la réplique qui a dit le signe le porte', () => {
    const { trame, ecarts } = run(T(), undefined, rep({ 'akt-motiv': 'Mir ist übel, ich habe Fieber und Schüttelfrost.' }));
    expect(vue(trame)).toEqual({ aktuell: ['akt-motiv~motiv,fieber,uebelkeit'], vegetativ: ['veg-b~erbrechen', 'veg-c~schuettelfrost,appetit'] });
    expect(un(ecarts, 'veg-a', 'retire')).toMatchObject({ regle: 5, cause: 'akt-motiv', signes: ['fieber'] });
    expect(un(ecarts, 'veg-b', 'reduit')).toMatchObject({ regle: 5, cause: 'akt-motiv', signes: ['uebelkeit'] });
    // veg-c n'a pas de parts : le reste (appetit) ne se pose pas seul — gardée entière, sans écart « non réduit » (résidu bloquant).
    expect(ecarts.filter((e) => e.question === 'veg-c')).toEqual([]);
  });

  it('une réplique jouée APRÈS la question ne compte pas ; sans `reponse`, r5 se tait', () => {
    expect(vue(run(T(), undefined, rep({ 'veg-c': 'Mir ist übel und ich habe Fieber.' })).trame).vegetativ).toEqual(['veg-a~fieber', 'veg-b~uebelkeit,erbrechen', 'veg-c~schuettelfrost,appetit']);
    expect(run(T()).ecarts.filter((e) => e.regle === 5)).toEqual([]);
  });

  it('sans parts : une précision qui ne s\'ouvre pas seule, ou demandée dans le texte, garde la question — sauf si l\'absence est dite', () => {
    const t = () => [ch('aktuell', s('akt-motiv')), ch('vegetativ',
      s('veg-d', { sucht: ['husten'], followUp: ['Falls ja: Seit wann?'] }),
      s('veg-e', { sucht: ['fieber'], text: 'Haben Sie Fieber — wie hoch?' }))];
    expect(vue(run(t(), undefined, rep({ 'akt-motiv': 'Ich habe Husten und Fieber.' })).trame).vegetativ).toEqual(['veg-d~husten', 'veg-e~fieber']);
    expect(vue(run(t(), undefined, rep({ 'akt-motiv': 'Keinen Husten, kein Fieber.' })).trame).vegetativ).toEqual([]);
  });

  it('jamais un signe de risque, jamais une sonde de dimension', () => {
    const t = [ch('aktuell', s('akt-motiv')), ch('fach', s('fach-x', { sucht: ['suizid'] }), s('fach-infekt-fieber', { sucht: ['fieber'] }))];
    const { ecarts } = run(t, undefined, rep({ 'akt-motiv': 'Ich habe Fieber. Ich will nicht mehr leben.' }));
    expect(ecarts.filter((e) => e.regle === 5)).toEqual([]);
  });
});

describe('r5 — les 130 cas', () => {
  const idDe = (c: Case, p: Phrase) => (typeof p !== 'string' && p.detacheDe) || (phraseIsCaseSpecific(p) ? `cas:${ctxDuCas(c).casIndex!(p)}` : phraseProbes(p).join('+'));

  it('chaque signe perdu par r5 est dit par une réplique jouée AVANT la question, et cette réplique le porte désormais', () => {
    // contrôle indépendant des écarts : la trame sans r5 (`reponse` absent) comparée à la trame jouée
    const fautes: string[] = [];
    for (const c of cases) {
      const sans = cohere(trameBrute(c), profilDuCas(c), c.id, { ...ctxDuCas(c), reponse: undefined }).trame.flatMap((x) => x.questions);
      const avec = trameJouee(c).flatMap((x) => x.questions);
      const sucht = (l: Phrase[], id: string) => new Set(l.filter((p) => idDe(c, p) === id).flatMap(phraseSucht));
      sans.forEach((p, i) => {
        if (phraseIsCaseSpecific(p)) return;
        const apres = sucht(avec, idDe(c, p));
        for (const sg of phraseSucht(p).filter((x) => !apres.has(x))) {
          const k = sans.findIndex((q, j) => j < i && signesDits(ctxDuCas(c).reponse!(q) ?? '').includes(sg));
          if (k < 0) fautes.push(`${c.id} : ${idDe(c, p)} perd « ${sg} », qu'aucune réplique jouée avant ne dit`);
          else if (!avec.some((q) => idDe(c, q) !== idDe(c, p) && phraseSucht(q).includes(sg))) fautes.push(`${c.id} : « ${sg} » n'est plus porté`);
        }
      });
    }
    expect(fautes).toEqual([]);
  });

  it('aucun signe ne quitte la trame : r5 ne retire que ce qui a été dit (mêmes signes cherchés avec et sans r5)', () => {
    const fautes: string[] = [];
    for (const c of cases) {
      const sans = cohere(trameBrute(c), profilDuCas(c), c.id, { ...ctxDuCas(c), reponse: undefined }).trame;
      const avec = signesJoues(trameJouee(c));
      for (const sg of signesJoues(sans)) if (!avec.has(sg)) fautes.push(`${c.id} : « ${sg} »`);
    }
    expect(fautes).toEqual([]);
  });
});

// Passe fixeur de la revue clinique (7 oct. 2026) : 2 P1, 6 P2 corrigés dans le moteur ou la banque — rapport lead-s3-banque.md.
describe('r5 — passe fixeur de la revue clinique', () => {
  it('P1-1 appendizitis : une fièvre supposée n\'est pas dite ; la question de la mesure reste posée', () => {
    expect(signesDits('Mir ist heiß, ich glaube, ich habe Fieber.')).not.toContain('fieber');
    expect(signesDits('Ich habe wohl Fieber.')).not.toContain('fieber');
    expect(signesDits('Ich fühle mich fiebrig.')).not.toContain('fieber');
    expect(textes('case-appendizitis')).toContain('Haben Sie Ihre Körpertemperatur in letzter Zeit gemessen? Haben Sie Fieber festgestellt?');
    // la mesure n'est pas la présence : « Ich habe Fieber » (cholezystitis) laisse posée la question « gemessen? »
    expect(textes('case-cholezystitis')).toContain('Haben Sie Ihre Körpertemperatur in letzter Zeit gemessen? Haben Sie Fieber festgestellt?');
  });

  it('P1-2 tia : « vorher » situe dans le passé — « Gestürzt … habe ich mich vorher nicht » ne dit pas les chutes des attaques', () => {
    expect(signesDits('Gestürzt oder gestoßen habe ich mich vorher nicht.')).not.toContain('sturz');
    expect(signesDits('Davor war ich nie gestürzt.')).not.toContain('sturz');
    expect(textes('case-tia')).toContain('Sind Sie schon gestürzt?');
  });

  it('P2-1 nhl : une didascalie conditionnelle « (Wenn … gefragt …) » n\'est pas dite tant qu\'on n\'a pas demandé', () => {
    expect(signesDits('Ich wiege 62 Kilo. (Wenn nach dem früheren Gewicht gefragt wird:) Vor einem Monat waren es noch 65.')).not.toContain('gewicht');
    expect(signesDits('Ich wiege 61 Kilo. (auf Nachfrage) Vorher waren es noch 68 Kilo.')).not.toContain('gewicht');
    // nhl : le motif dit « abgenommen » sans chiffre — la quantification (critère B) est demandée
    expect(textes('case-nhl')).toContain('Wie viele Kilo haben Sie abgenommen?');
  });

  it('P2-2 lymphom, bronchialkarzinom : le Wäschewechsel du symptôme B reste demandé', () => {
    for (const id of ['case-lymphom', 'case-bronchialkarzinom']) {
      expect(textes(id), id).toContain('Schwitzen Sie nachts so stark, dass Sie die Wäsche wechseln müssen?');
    }
  });

  it('P2-3 nierenkolik : la fièvre dite au motif ouvre sa hauteur et son début', () => {
    expect(textes('case-nierenkolik')).toContain('Wie hoch war das Fieber?');
    expect(textes('case-nierenkolik')).toContain('Seit wann haben Sie Fieber?');
  });

  it('P2-4 pneumonie : « seit drei Tagen … Husten » dit déjà le début — « Seit wann husten Sie? » ne se pose pas', () => {
    expect(textes('case-pneumonie')).not.toContain('Seit wann husten Sie?');
    expect(deSonde('case-pneumonie', 'fach-pneumo-husten').map(phraseText)).toEqual(['Ist der Husten trocken oder mit Auswurf?']);
  });

  it('P2-5 hodentorsion : « ich hab mich übergeben » — « Wie oft » avant « Seit wann »', () => {
    expect(deSonde('case-hodentorsion', 'veg-uebelkeit').map(phraseText)).toEqual(['Wie oft haben Sie sich übergeben?']);
  });

  it('P2-6 aortendissektion : « Schlecht war mir » dit la nausée', () => {
    expect(signesDits('Schlecht war mir, erbrochen nicht.')).toContain('uebelkeit');
    expect(deSonde('case-aortendissektion', 'veg-uebelkeit')).toEqual([]);
  });

  it('langue : la question ouverte nomme ce qu\'elle localise', () => {
    expect(textes('case-zystitis')).toContain('Wo genau spüren Sie das Brennen — vorne in der Harnröhre oder eher tief im Unterbauch?');
  });

  it('règle des auteurs (§10.4) : toute question ouverte par r5 se pose seule ; la banque n\'ajoute pas de relance de précision qui ne le peut pas', () => {
    // a) dans les 130 trames jouées, chaque question réduite par r5 s'ouvre sur un texte qui se pose seul
    const fautes: string[] = [];
    for (const c of cases) {
      const r5 = new Set(playedTrame(c).ecarts.filter((e) => /déjà dit par/.test(e.raison) && !e.question.includes('#')).map((e) => e.question));
      for (const p of joue(c)) if (!phraseIsCaseSpecific(p) && r5.has(phraseProbes(p).join('+'))) {
        const brute = trameBrute(c).flatMap((x) => x.questions).find((q) => phraseProbes(q).join('+') === phraseProbes(p).join('+'));
        const ouverte = brute && phraseText(brute) !== phraseText(p) && !(typeof brute !== 'string' && brute.parts?.some((pt) => phraseText(p).endsWith(pt.text)));
        if (ouverte && !promouvable(phraseText(p))) fautes.push(`${c.id} : « ${phraseText(p)} »`);
      }
    }
    expect(fautes).toEqual([]);
    // b) cliquet : les relances de précision de la banque (sous une part ou une question mono-signe) qui ne se posent pas seules.
    // Elles ne sont pas fautives (la question reste alors entière) ; leur nombre ne remonte pas. Mesuré au lot Banque : 50.
    const bank: Phrase[] = [...LEITSYMPTOM_KATEGORIEN.flatMap((k) => aktuellChapterFor(k).questions), ...ALLGEMEINE_ANAMNESE.flatMap((x) => x.questions), ...FACHANAMNESEN.flatMap((f) => f.chapter.questions)];
    const corps = (f: string) => { const k = parseFollowUp(f); return 'question' in k ? k.question : f; };
    const non = new Set<string>();
    for (const p of bank) {
      if (typeof p === 'string' || phraseIsCaseSpecific(p) || !phraseProbes(p).length) continue;
      for (const pt of p.parts ?? []) for (const f of pt.followUp ?? []) if (!promouvable(corps(f))) non.add(`${phraseProbes(p)[0]}|${f}`);
      if (!p.parts && phraseSucht(p).length === 1) for (const f of phraseFollowUps(p)) if (!f.sucht?.length && !promouvable(corps(f.text))) non.add(`${phraseProbes(p)[0]}|${f.text}`);
    }
    expect(non.size).toBeLessThanOrEqual(PLAFOND_RELANCES_NON_AUTONOMES);
  });
});
