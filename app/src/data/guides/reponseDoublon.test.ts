import { describe, expect, it } from 'vitest';
import type { Case } from '@/db/types';
import { seedCases } from '@/data/seedCases';
import { playedTrame } from './anamneseChapters';
import { phraseIsCaseSpecific, phraseProbes, phraseText } from './phrases';
import { phraseSucht, symptomsInText, type Signe } from './symptoms';

// Q4 — garde anti-doublon : « la réponse dit ce que la question suivante demande » (trouvé trois fois par la revue
// clinique de Q3 : copd, parkinson, anaphylaxie). Pour chaque question du cas de la trame JOUÉE, aucune réplique d'une
// sonde posée AVANT elle ne contient les mots-clés d'un signe que la question cherche (`sucht`).
// Mots-clés = `symptomsInText` (TEXT_RE, la seule lecture du lexique). `pers-groesse` dit le poids du jour : il ne
// compte pour `gewicht` que s'il dit une VARIATION (« vor zwei Monaten waren es noch 72 »).
// ponytail : seuls les signes que TEXT_RE sait lire sont vus ; un signe propre au cas sans motif (« stuhl_nachts »,
// « kompression ») échappe. D'où une garde stricte sur les cas relus par Q4 et un PLAFOND sur les 130 cas
// (mesuré : origin/main 107, Q4 87) — il ne remonte jamais ; le baisser quand un lot traite des constats.
// Q4 fixeur : le plafond compte les constats NON admis (`ADMIS`, chacun motivé) — 81 ; la lecture lit aussi `frageAntworten`.
// Q5 : les 81 sont traités (réplique coupée ou déplacée, question réduite) ou admis avec leur raison — plafond 0.
const PLAFOND = 0;

type Constat = { cas: string; signe: Signe; sonde: string; question: string; banque?: true };

const VARIATION = /abgenommen|zugenommen|waren es|vorher|früher/i;

/** Les constats d'un cas, dans l'ordre de la trame JOUÉE (après `cohere`). Une question du cas (et, Q4 fixeur, une question
 *  de BANQUE gardée par `cohere`, avec le `sucht` de ce qu'elle pose encore) est relevée si une réplique jouée AVANT elle
 *  contient déjà un signe qu'elle cherche. Les répliques lues : celles des sondes (`antworten`) et celles des questions du
 *  cas (`frageAntworten`, Q4 fixeur). */
function constats(c: Case): Constat[] {
  const { chapters, fach } = playedTrame(c);
  const units = chapters.flatMap((ch) => [...ch.questions, ...(fach && ch.id === 'aktuell' ? fach.chapter.questions : [])]);
  const vus: Array<{ sonde: string; signes: Set<Signe> }> = [];
  const out: Constat[] = [];
  for (const p of units) {
    const cas = phraseIsCaseSpecific(p);
    const sonde = cas ? undefined : phraseProbes(p)[0];
    if (cas || sonde) {
      for (const signe of phraseSucht(p)) for (const v of vus) if (v.signes.has(signe)) {
        out.push({ cas: c.id, signe, sonde: v.sonde, question: cas ? phraseText(p) : sonde!, ...(cas ? {} : { banque: true as const }) });
      }
    }
    const reponse = cas ? c.patientSheet.frageAntworten?.find((f) => f.frage === phraseText(p))?.antwort : sonde ? c.patientSheet.antworten?.[sonde] : undefined;
    if (!reponse) continue;
    const signes = new Set(symptomsInText(reponse));
    if (sonde === 'pers-groesse' && !VARIATION.test(reponse)) signes.delete('gewicht');
    vus.push({ sonde: sonde ?? `cas « ${phraseText(p).slice(0, 40)} »`, signes });
  }
  return out;
}

// Les cas relus par Q4 (composées d'`aktuell`, zoeliakie → malaria, et les renvois). Chaque constat restant est
// écrit ici avec sa raison : un faux positif de la lecture par mots-clés, jamais un doublon laissé.
const CAS_Q4 = ['zoeliakie', 'ulcus-cruris', 'leistenhernie', 'commotio', 'itp', 'uterus-myomatosus', 'akutes-nierenversagen',
  'fibromyalgie', 'polymyalgia', 'schlafapnoe', 'schizophrenie', 'delir', 'achalasie', 'spinalkanalstenose', 'laktoseintoleranz',
  'tia', 'diabetes-typ1', 'gastroenteritis', 'rheumatisches-fieber', 'influenza', 'metabolisches-syndrom', 'karzinoid', 'abszess',
  'anorexia-nervosa', 'malaria', 'opioidabhaengigkeit', 'mammakarzinom', 'morbus-crohn', 'karpaltunnel'].map((s) => `case-${s}`);
const ADMIS: Record<string, string> = {
  'case-leistenhernie|stuhl|akt-veraend-was': 'la réplique nie un lien avec le Stuhlgang ; la question demande s\'il faut pousser',
  'case-schlafapnoe|schlaf|akt-motiv': 'le motif nomme le sommeil (« mit meinem Schlaf stimmt etwas nicht ») sans en dire la durée',
  'case-achalasie|reise|veg-fieber': 'la réplique dit l\'Espagne ; la question demande l\'Amérique centrale ou du Sud (Chagas)',
  'case-gastroenteritis|stuhl|akt-motiv': 'la question déclare `stuhl` pour retirer la végétative ; le motif dit la diarrhée, pas l\'aspect',
  'case-gastroenteritis|stuhl|akt-verlauf': 'idem : la fréquence de la diarrhée, pas l\'aspect des selles',
  'case-gastroenteritis|stuhl|akt-einfluss': 'idem : « nach dem Stuhlgang » (ce qui soulage), pas l\'aspect',
  // Q4 fixeur
  'case-metabolisches-syndrom|gewicht|akt-motiv': 'le motif dit la prise de poids sans la chiffrer ; la question demande combien (revue clinique P1-3 : elle porte `gewicht`, fach-endo-gewicht retombe sur l\'appétit)',
  'case-polymyalgia|fieber|fach-rheuma-systemisch': 'la réplique nie une vraie fièvre (décision de main, F.7-a) ; la question du cas demande la MESURE — fébricule à 37,5–37,8 le soir',
  'case-akutes-nierenversagen|gewicht|akt-allgemein-gewicht': 'la réplique dit la perte (les bagues) sans la chiffrer ; la question demande la pesée (texte de la relecture de langue, I7)',
  // Q5 — une présyncope dite (« schwarz vor Augen ») n'est pas la perte de connaissance que la question demande
  'case-myokarditis|bewusstlos|akt-motiv': 'le motif dit « schwarz vor Augen » (présyncope) ; la relance demande la perte de connaissance',
  'case-bauchaortenaneurysma|bewusstlos|akt-motiv': 'le motif dit « schwarz vor Augen » ; la question demande l\'effondrement',
  'case-schenkelhalsfraktur|bewusstlos|akt-ausloeser': 'la réplique dit « schwarz vor Augen » ; la question demande la perte de connaissance',
  'case-sturz-im-alter|bewusstlos|cas « Erzählen Sie mir bitte ganz genau, was p »': 'la réplique du récit dit « schwarz vor Augen » ; la question suivante demande la perte de connaissance',
  // Q5 — la question précise un signe que la réplique nomme (le grossier est dit, le fin est demandé)
  'case-ptbs|kopfschmerz|akt-motiv': 'le motif nomme le Kopfschmerz ; la question en demande les caractères d\'alarme (matinal, en décubitus, vomissement à jeun)',
  'case-perniziose-anaemie|taubheit|akt-motiv': 'les répliques disent le fourmillement des pieds ; la question en demande l\'extension (en chaussette)',
  'case-perniziose-anaemie|taubheit|akt-beginn': 'idem',
  'case-perniziose-anaemie|taubheit|akt-verlauf': 'idem',
  'case-perniziose-anaemie|taubheit|akt-einfluss': 'idem',
  'case-allergische-rhinitis|juckreiz|akt-motiv': 'le motif dit les yeux qui démangent ; la question demande le palais et les oreilles',
  'case-allergische-rhinitis|husten|akt-beginn': 'la réplique dit la toux nouvelle (nocturne, motif) ; la question demande la toux de jour et d\'effort',
  'case-lyme|ausschlag|akt-beginn': 'la réplique date la rougeur ; la question demande si elle s\'étend',
  'case-lyme|ausschlag|pers-hausarzt': 'la réplique nomme le « Ausschlag » comme motif de venue ; la question demande s\'il s\'étend',
  'case-bronchialkarzinom|husten|akt-ausloeser': 'la réplique dit que la toux persiste depuis la pneumonie ; la question demande en quoi elle diffère du Raucherhusten',
  'case-bronchialkarzinom|husten|akt-frueher': 'la réplique dit la toux de fumeur ancienne (« Husten ja, jahrelang ») ; la question demande ce qui a changé',
  'case-hyperthyreose|gewicht|akt-motiv': 'le motif dit la perte de poids sans la chiffrer ; la question (Fach) est celle que `gewicht`, signe de dépistage, fait toujours poser (même figure que metabolisches-syndrom, Q4 F.7-c) — sa réplique écrite chiffre la perte',
  'case-herzinsuffizienz|gewicht|fach-kardio-brust': 'faux positif de lecture : « wie ein Gewicht auf der Brust » est une image, pas un poids',
  'case-typhus|stuhl|akt-frueher': 'la réplique dit une diarrhée d\'un voyage passé (règle (e)) ; la question demande l\'ordre constipation / diarrhée d\'aujourd\'hui',
  'case-obstipation|stimmung|med-regelmaessig': 'la réplique nomme l\'indication d\'un médicament (« für die Stimmung ») ; la question demande l\'humeur depuis le deuil',
  'case-sturz-im-alter|sturz|cas « Gibt es etwas, das die Hüftschmerzen bes »': '« seit dem Sturz » est la chute d\'aujourd\'hui ; la question demande les chutes antérieures',
  'case-arterielle-hypertonie|schwitzen|veg-schuettelfrost': 'la réplique nie la sueur nocturne ; la question demande les accès de sueur avec palpitations et pâleur (phéochromocytome)',
};

describe('Q4 — une réplique jouée avant une question du cas ne dit pas déjà ce qu\'elle cherche', () => {
  const tous = seedCases().flatMap(constats);
  const duCas = tous.filter((k) => !k.banque);

  it(`les 130 cas : informatif, plafond ${PLAFOND} (il ne remonte pas)`, () => {
    // Le relevé complet, pour le lot qui traitera le reste (Q5 et suivants).
    console.info(`[reponseDoublon] ${duCas.length} constats\n` + duCas.map((k) => `  ${k.cas} · ${k.signe} · ${k.sonde} → « ${k.question} »`).join('\n'));
    expect(duCas.filter((k) => !(`${k.cas}|${k.signe}|${k.sonde}` in ADMIS)).length).toBeLessThanOrEqual(PLAFOND);
  });

  it('les cas relus par Q4 : aucun constat hors de la liste écrite, chaque entrée de la liste sert encore', () => {
    const q4 = duCas.filter((k) => CAS_Q4.includes(k.cas)).map((k) => `${k.cas}|${k.signe}|${k.sonde}`);
    expect([...new Set(q4)].filter((k) => !(k in ADMIS))).toEqual([]);
    // Q5 : la liste vaut pour les 130 cas — une entrée qui ne sert plus se retire.
    const tousCles = duCas.map((k) => `${k.cas}|${k.signe}|${k.sonde}`);
    expect(Object.keys(ADMIS).filter((k) => !tousCles.includes(k))).toEqual([]);
  });

  it('la lecture voit le défaut (contrôle) : une réplique qui annonce la question est relevée', () => {
    const c = structuredClone(seedCases().find((x) => x.id === 'case-polymyalgia')!);
    c.patientSheet.antworten!['akt-ort'] += ' Und seit zehn Tagen habe ich zusätzlich Kopfschmerzen.';
    expect(constats(c).map((k) => `${k.signe}|${k.sonde}`)).toContain('kopfschmerz|akt-ort');
  });
});

// Q4 fixeur (revue clinique P1-3) : une coupe dans une question du cas peut faire REVENIR une question de banque que
// `cohere` réduisait (metabolisches-syndrom : `fach-endo-gewicht` reposait le poids que le motif venait de dire). La même
// lecture, sur les questions de banque gardées par `cohere`, avec le `sucht` de ce qu'elles posent encore.
// ponytail : 447 constats sur les 130 cas à la mesure, presque tous antérieurs à Q4 (une réplique d'aktuell dit la
// nausée, la végétative la redemande) — trop pour une liste écrite. D'où un CLIQUET : le relevé des cas Q4 est figé
// (`__snapshots__/doublon-banque-q4.txt`) — une banque qui revient y ajoute une ligne et le test rougit ; un lot qui
// traite des constats en retire et met l'instantané à jour (`-u`) — et un PLAFOND sur les 130 cas.
// Q5 : 442 → 367 — répliques hors motif qui annonçaient une question de banque posée plus loin (cas tier 1 d'abord : angina-pectoris,
// gib, pneumonie, pyelonephritis, schlaganfall, diabetes, copd, migraene, nierenkolik) et cas relus par Q5. Le reste est surtout
// structurel : le motif dit la plainte que la Fach redemande (fièvre, toux, poids), hors de portée d'un lot de contenu.
const PLAFOND_BANQUE = 367;

describe('Q4 fixeur — les questions de BANQUE jouées après `cohere` : même lecture', () => {
  const banque = seedCases().flatMap(constats).filter((k) => k.banque);

  it(`les 130 cas : plafond ${PLAFOND_BANQUE} (il ne remonte pas)`, () => {
    expect(banque.length).toBeLessThanOrEqual(PLAFOND_BANQUE);
  });

  it('les cas relus par Q4 : le relevé est figé — une banque qui revient le change', async () => {
    const lignes = banque.filter((k) => CAS_Q4.includes(k.cas)).map((k) => `${k.cas} · ${k.signe} · ${k.sonde} → ${k.question}`);
    await expect(lignes.join('\n') + '\n').toMatchFileSnapshot('./__snapshots__/doublon-banque-q4.txt');
  });

  it('contrôle (P1-3) : sans la question du cas qui demande le poids, fach-endo-gewicht revient et le relevé le voit', () => {
    const orig = seedCases().find((x) => x.id === 'case-metabolisches-syndrom')!;
    const avant = constats(orig).filter((k) => k.banque && k.question === 'fach-endo-gewicht');
    const c = structuredClone(orig);                     // un objet neuf : `playedTrame` met la trame en cache par objet
    c.caseSpecificQuestions = c.caseSpecificQuestions.filter((q) => !q.frage.startsWith('Wie viel haben Sie in diesen zwei Jahren zugenommen'));
    const apres = constats(c).filter((k) => k.banque && k.question === 'fach-endo-gewicht').map((k) => `${k.signe}|${k.sonde}`);
    expect(avant).toEqual([]);
    expect(apres).toContain('gewicht|akt-motiv');
  });
});
