import { describe, expect, it } from 'vitest';
import { seedCases } from '@/data/seedCases';
import type { Case } from '@/db/types';
import { fusesFrauenanamnese, playedTrame } from './anamneseChapters';
import { phraseAlts, phraseFollowUp, phraseProbes, phraseText, type Phrase } from './phrases';

// Série 3, lot Q-gyn — garde CI : quand la Fachanamnese Gynäkologie est jouée,
// la Frauenanamnese se FOND dans son bloc (retour d'usage du 4 oct. : « la
// Frauenanamnese vers la fin entre en conflit de questions avec la Fach
// gynéco »). Un seul bloc, dans l'ordre clinique, et aucun signe n'est cherché
// deux fois par deux questions différentes.
const cases = seedCases();
const gynCases = cases.filter((c) => playedTrame(c).fach?.chapter.id === 'fach-gyn');
const withAge = (c: Case, age: number): Case =>
  ({ ...c, patientSheet: { ...c.patientSheet, personalia: { ...c.patientSheet.personalia, age } } });
// Les âges franchissent les seuils de la Frauenanamnese (45 : périménopause, 55 : post-ménopause).
const AGES = [23, 35, 47, 52, 58, 76];
const variants = gynCases.flatMap((c) => AGES.map((age) => ({ id: `${c.id}@${age}`, c: withAge(c, age) })));

/** Tout ce qu'une question fait DIRE : texte, formulations équivalentes, relances. */
const said = (q: Phrase): string[] => [phraseText(q), ...phraseAlts(q), ...phraseFollowUp(q)];

/** Les questions jouées dans l'ordre de l'entretien : Fach insérée après « aktuell ». */
function played(c: Case): Array<{ ch: string; q: Phrase }> {
  const t = playedTrame(c);
  const out: Array<{ ch: string; q: Phrase }> = [];
  for (const ch of t.chapters) {
    for (const q of ch.questions) out.push({ ch: ch.id, q });
    if (ch.id === 'aktuell' && t.fach) for (const q of t.fach.chapter.questions) out.push({ ch: t.fach.chapter.id, q });
  }
  return out;
}

// ── Les paires équivalentes, nommées ─────────────────────────────────────────
// Un SIGNE = ce qu'une question cherche. Il ne doit être cherché que par UNE
// question (texte + alternatives + relances comptent pour elle). Chaque entrée
// porte la paire qui fut un doublon avant le lot.
// `abschluss` (le médecin annonce, il ne cherche pas) est hors trame de recherche.
const SIGNES: Array<{ nom: string; paire: string; re: RegExp; sauf?: RegExp }> = [
  { nom: 'dernière règle', paire: 'frau-periode ⇔ question du cas « Wie lang ist Ihr Zyklus… letzte Regelblutung » (myomatosus) ⇔ « erste und letzte Regel » (mammakarzinom)',
    re: /wann (war|waren|hatten|haben)[^?]*letzte|zuletzt[^?]*(tage|regel|periode)/i },
  { nom: 'régularité du cycle', paire: 'frau-periode ⇔ alternative de fach-gyn-blutung « Bekommen Sie Ihre Tage regelmäßig? »',
    re: /monatsblutung[^?]*regelmäßig|tage regelmäßig|zyklus[^?]*(lang|verändert)|regelmäßig[^?]*(monatsblutung|periode)/i },
  { nom: 'saignement depuis la ménopause', paire: 'frau-periode (> 55 ans) ⇔ relance de fach-gyn-blutung « Falls die Periode schon aufgehört hat »',
    re: /seitdem[^?]*blutung|seit ihrer letzten regelblutung[^?]*blutung/i },
  { nom: 'grossesse possible', paire: 'frau-schwanger ⇔ toute autre question « schwanger sind »',
    re: /möglichkeit[^?]*schwanger|schwanger (sind|sein|gewesen)|schon einmal schwanger/i },
  { nom: 'contraception', paire: 'frau-verhuetung ⇔ question du cas « Spirale » (adnexitis) ⇔ « die Pille genommen » (endometriose, mammakarzinom)',
    // « außer zur Verhütung » BORNE la question des hormones : il ne la cherche pas.
    re: /(?<!außer zur )verhütung|verhüten\b|spirale|(nehmen|genommen|nahmen)[^?]*pille/i,
    // La question des hormones nomme Pille et Spirale « als Behandlung » : elle ne cherche pas la contraception.
    sauf: /als behandlung/i },
  { nom: 'gynécologue / dépistage', paire: 'frau-wechseljahre « Frauenarzt regelmäßig » ⇔ fach-gyn-vorsorge',
    re: /frauenarzt|frauenärztin|gynäkolog|vorsorge|krebsabstrich/i },
  { nom: 'hormones', paire: 'fach-gyn-eingriffe « Hormone » ⇔ frau-verhuetung (Pille) ⇔ frau-wechseljahre (> 55 ans) ⇔ question « Hormone » du cas (mammakarzinom)',
    re: /hormon|östrogen|gestagen/i },
  { nom: 'désir d’enfant', paire: 'fach-gyn-kinderwunsch ⇔ question du cas « Kinderwunsch / Familienplanung » (myomatosus)',
    re: /kinderwunsch|familienplanung|schwanger zu werden/i },
  { nom: 'gestité / parité', paire: 'fach-gyn-schwangerschaften ⇔ question du cas « Kinder geboren » (mammakarzinom) ⇔ relance « Wie viele Schwangerschaften » (myomatosus)',
    re: /wie viele (schwangerschaften|kinder)|schwangerschaften und geburten|fehlgeburt|kinder[^?]*geboren/i },
  { nom: 'douleur au rapport', paire: 'fach-gyn-dyspareunie ⇔ question du cas « Schmerzen beim Geschlechtsverkehr — am Anfang oder tief » (endometriose, aktuell)',
    re: /schmerzen beim geschlechtsverkehr/i },
  { nom: 'opérations gynécologiques', paire: 'fach-gyn-eingriffe (Gebärmutter, Eileiter, Eierstöcke) ⇔ question du cas « Operation an den Eileitern » (eug)',
    re: /an der gebärmutter[^?]*operiert|operation an den eileitern/i },
  { nom: 'ménopause', paire: 'frau-wechseljahre ⇔ question du cas « Hormonersatztherapie gegen Wechseljahresbeschwerden » (mammakarzinom)',
    re: /wechseljahre|menopause|hitzewallung/i,
    // « Hormonersatz in den Wechseljahren » est un exemple de la question des hormones.
    sauf: /als behandlung/i },
];

/** Signes cherchés par plus d'une question (même Phrase = une seule fois). */
function doublons(trame: Array<{ ch: string; q: Phrase }>): string[] {
  const cherche = trame.filter((x) => x.ch !== 'abschluss' && x.ch !== 'eroeffnung');
  return SIGNES.flatMap((s) => {
    const hits = cherche.filter((x) => said(x.q).some((t) => s.re.test(t) && !s.sauf?.test(t)));
    return hits.length > 1 ? [`${s.nom} ← ${hits.map((h) => `[${h.ch}] ${phraseText(h.q).slice(0, 60)}`).join(' | ')}`] : [];
  });
}

describe('Q-gyn — la Frauenanamnese se fond dans la Fach gynéco', () => {
  it('la garde n’est pas vide : 5 cas jouent la Fach gynéco', () => {
    expect(gynCases.map((c) => c.id).sort()).toEqual(
      ['case-adnexitis', 'case-endometriose', 'case-eug', 'case-mammakarzinom', 'case-uterus-myomatosus']);
  });

  it('aucun chapitre « frauenanamnese » séparé, quel que soit l’âge', () => {
    const encore = variants.filter((v) => playedTrame(v.c).chapters.some((ch) => ch.id === 'frauenanamnese')).map((v) => v.id);
    expect(encore).toEqual([]);
  });

  it('les sondes propres à la Frauenanamnese ouvrent le bloc gynéco, avant toute sonde fach-gyn', () => {
    const fautes = variants.flatMap((v) => {
      const probes = (playedTrame(v.c).fach?.chapter.questions ?? []).flatMap(phraseProbes);
      const firstGyn = probes.findIndex((p) => p.startsWith('fach-gyn-'));
      const lastFrau = probes.reduce((i, p, k) => (p.startsWith('frau-') ? k : i), -1);
      return lastFrau > firstGyn ? [`${v.id} : ${probes.join(' > ')}`] : [];
    });
    expect(fautes).toEqual([]);
  });

  it('les sondes de la Frauenanamnese applicables à l’âge restent jouées (aucune sonde obligatoire perdue)', () => {
    const attendu = (age: number) => ['frau-periode', ...(age <= 55 ? ['frau-schwanger', 'frau-verhuetung'] : []), ...(age >= 45 ? ['frau-wechseljahre'] : [])];
    const fautes = variants.flatMap((v) => {
      const age = v.c.patientSheet.personalia.age;
      const probes = (playedTrame(v.c).fach?.chapter.questions ?? []).flatMap(phraseProbes).filter((p) => p.startsWith('frau-'));
      return JSON.stringify(probes) === JSON.stringify(attendu(age)) ? [] : [`${v.id} : ${probes.join(',')} ≠ ${attendu(age).join(',')}`];
    });
    expect(fautes).toEqual([]);
  });

  it('aucun signe n’est cherché par deux questions jouées (cas réels)', () => {
    const fautes = gynCases.flatMap((c) => doublons(played(c)).map((d) => `${c.id} : ${d}`));
    expect(fautes).toEqual([]);
  });

  it('… ni aux âges franchissant les seuils de la Frauenanamnese (clones de cas)', () => {
    const fautes = variants.flatMap((v) => doublons(played(v.c)).map((d) => `${v.id} : ${d}`));
    expect(fautes).toEqual([]);
  });

  it('chaque question jouée du bloc porte au plus un « ? » par réplique', () => {
    const fautes = variants.flatMap((v) => (playedTrame(v.c).fach?.chapter.questions ?? []).flatMap((q) =>
      said(q).filter((t) => (t.match(/\?/g) ?? []).length > 1).map((t) => `${v.id} : ${t}`)));
    expect(fautes).toEqual([]);
  });

  it('fusesFrauenanamnese (lu par l’écran du simulant) : vrai pour les 5 cas gynéco, faux pour un autre cas de patiente', () => {
    expect(gynCases.map((c) => fusesFrauenanamnese(c, playedTrame(c).fach))).toEqual(gynCases.map(() => true));
    const autre = cases.find((c) => c.patientSheet.personalia.geschlecht === 'w' && playedTrame(c).fach?.chapter.id !== 'fach-gyn')!;
    expect(fusesFrauenanamnese(autre, playedTrame(autre).fach)).toBe(false);
  });

  it('hors Fach gynéco, une patiente garde son chapitre Frauenanamnese : mêmes sondes, même ordre, même conseil — seuls les textes sont découpés en relances', () => {
    const autre = cases.find((c) => c.patientSheet.personalia.geschlecht === 'w' && c.patientSheet.personalia.age < 45 && !playedTrame(c).fach?.chapter.id.endsWith('gyn'))!;
    const t = playedTrame(autre);
    expect(t.chapters.some((ch) => ch.id === 'frauenanamnese')).toBe(true);
    expect((t.fach?.chapter.questions ?? []).flatMap(phraseProbes).some((p) => p.startsWith('frau-'))).toBe(false);
  });
});

// ── Mutations : la garde doit rougir si une paire revient ────────────────────
describe('Q-gyn — mutations (la garde rougit)', () => {
  const base = () => played(gynCases.find((c) => c.id === 'case-endometriose')!);
  const inject = (ch: string, text: string) => [...base(), { ch, q: text as Phrase }];

  it('base saine : aucun doublon', () => { expect(doublons(base())).toEqual([]); });
  it('« Gehen Sie regelmäßig zum Frauenarzt? » rejoué à côté de la Vorsorge', () => {
    expect(doublons(inject('frauenanamnese', 'Gehen Sie regelmäßig zum Frauenarzt?')).join()).toMatch(/gynécologue/);
  });
  it('« Bekommen Sie Ihre Tage regelmäßig? » rejoué à côté de la Monatsblutung', () => {
    expect(doublons(inject('fach', 'Bekommen Sie Ihre Tage regelmäßig?')).join()).toMatch(/régularité/);
  });
  it('« Nehmen Sie Hormone ein? » rejoué dans Medikamente', () => {
    expect(doublons(inject('medikamente', 'Nehmen Sie Hormone ein?')).join()).toMatch(/hormones/);
  });
  it('« Wann war Ihre letzte Regelblutung? » posée deux fois', () => {
    expect(doublons(inject('frauenanamnese', 'Wann war Ihre letzte Regelblutung?')).join()).not.toBe('');
    expect(doublons([...base(), { ch: 'frauenanamnese', q: 'Wann war Ihre letzte Regelblutung?' }, { ch: 'fach', q: 'Wann hatten Sie Ihre letzte Regel?' }]).join()).toMatch(/dernière règle/);
  });

  // Revue mécanique I1 : la garde lexicale se contournait par reformulation.
  // Six paraphrases mesurées ; chacune, injectée à côté de sa jumelle, doit rougir.
  const REFORMULATIONS: Array<[chapitre: string, texte: string, signe: RegExp]> = [
    ['fach', 'Wann hatten Sie zuletzt Ihre Tage?', /dernière règle/],
    ['fach', 'Welche Verhütung benutzen Sie?', /contraception/],
    ['fach', 'Könnten Sie schwanger sein?', /grossesse possible/],
    ['fach', 'Wann waren Sie zuletzt beim Gynäkologen?', /gynécologue/],
    ['fach', 'Waren Sie schon einmal schwanger?', /grossesse possible/],
    ['medikamente', 'Nehmen Sie Östrogene oder Gestagene ein?', /hormones/],
  ];
  for (const [ch, texte, signe] of REFORMULATIONS) {
    it(`reformulation « ${texte} » rougit`, () => { expect(doublons(inject(ch, texte)).join()).toMatch(signe); });
  }
});

// ── Revue clinique gynéco (C1–C4 + décisions) et revue de langue (L1–L3) ─────
describe('Q-gyn — revues clinique et langue', () => {
  const byId = (id: string) => cases.find((c) => c.id === id)!;
  const bloc = (c: Case) => playedTrame(c).fach!.chapter.questions;
  const parSonde = (c: Case, probe: string) => bloc(c).find((q) => phraseProbes(q).includes(probe))!;
  const dit = (c: Case, probe: string) => said(parSonde(c, probe));
  const tousTextes = (c: Case) => bloc(c).flatMap(said);
  const adnexitis = byId('case-adnexitis');

  it('C1 — une seule question « Hormone », au passé et au thérapeutique, en forme orale', () => {
    const q = parSonde(adnexitis, 'fach-gyn-eingriffe');
    expect(phraseFollowUp(q)).toEqual(['Nehmen oder nahmen Sie Hormone ein — etwa Hormonersatz in den Wechseljahren, oder die Pille oder Spirale als Behandlung?']);
  });
  it('C1 — après 55 ans, la ménopause ne porte plus que « Beschwerden » (les hormones sont celles du bloc)', () => {
    const q = parSonde(withAge(byId('case-endometriose'), 76), 'frau-wechseljahre');
    expect(phraseText(q)).toBe('Wie haben Sie die Wechseljahre erlebt — hatten Sie Beschwerden?');
    expect(phraseFollowUp(q)).toEqual([]);
  });
  it('C2 — la longueur du cycle est une relance de frau-periode', () => {
    expect(phraseFollowUp(parSonde(byId('case-uterus-myomatosus'), 'frau-periode')))
      .toEqual(['Wann war Ihre letzte Regelblutung?', 'Wie viele Tage liegen zwischen dem Beginn einer Blutung und dem Beginn der nächsten?']);
  });
  it('C3 — HPV jusqu’à 35 ans, mammographie dès 50 ans (clones de cas)', () => {
    const fautes = [23, 31, 35, 36, 44, 49, 50, 54, 76].flatMap((age) => {
      const t = dit(withAge(adnexitis, age), 'fach-gyn-vorsorge').join(' ');
      return [(/HPV/.test(t) !== age <= 35) && `HPV @${age}`, (/Mammographie/.test(t) !== age >= 50) && `Mammographie @${age}`].filter(Boolean);
    });
    expect(fautes).toEqual([]);
  });
  it('C3 — fiches : HPV répondu pour endometriose (31 ans), EUG ne dit plus « zu alt »', () => {
    expect(byId('case-endometriose').patientSheet.antworten!['fach-gyn-vorsorge']).toMatch(/HPV/);
    const eug = byId('case-eug').patientSheet.antworten!['fach-gyn-vorsorge'];
    expect(eug).not.toMatch(/zu alt/);
    expect(eug).toMatch(/nie angeboten/);
  });
  it('C4 — adnexitis : plus de question du cas sur le début après la période ; la réponse le dit', () => {
    expect(tousTextes(adnexitis).join(' ')).not.toMatch(/kurz nach Ihrer letzten Periode/);
    expect(adnexitis.patientSheet.antworten!['fach-gyn-unterbauch']).toContain('Die Schmerzen haben etwa drei Tage nach dem Ende der letzten Periode begonnen.');
  });
  it('décision — dyspareunie : une question, deux relances', () => {
    const q = parSonde(adnexitis, 'fach-gyn-dyspareunie');
    expect(phraseText(q)).toBe('Haben Sie Schmerzen beim Geschlechtsverkehr?');
    expect(phraseFollowUp(q)).toEqual(['Falls ja: Eher am Anfang oder tief im Inneren?', 'Brennt oder schmerzt es beim Wasserlassen?']);
  });
  it('décision — opérations : Gebärmutter, Eileiter ou Eierstöcke', () => {
    expect(phraseText(parSonde(adnexitis, 'fach-gyn-eingriffe'))).toBe('Wurden Sie schon an der Gebärmutter, an den Eileitern oder an den Eierstöcken operiert?');
  });
  it('mineur — mammakarzinom : « erste Regel » juste après la régularité, « gestillt » juste après la gestité', () => {
    const texte = bloc(byId('case-mammakarzinom')).map((q) => phraseProbes(q)[0] ?? phraseText(q));
    expect(texte[texte.indexOf('frau-periode') + 1]).toBe('In welchem Alter hatten Sie Ihre erste Regel?');
    expect(texte[texte.indexOf('fach-gyn-schwangerschaften') + 1]).toBe('Haben Sie schon einmal gestillt?');
  });
  it('mineur — eug : « Schwangerschaftstest » juste après la grossesse possible', () => {
    const texte = bloc(byId('case-eug')).map((q) => phraseProbes(q)[0] ?? phraseText(q));
    expect(texte[texte.indexOf('frau-schwanger') + 1]).toBe('Haben Sie bereits einen Schwangerschaftstest gemacht?');
  });
  it('mineur — après 55 ans : le saignement depuis la dernière règle est la relance du rang 1, pas de la Blutung', () => {
    const c = withAge(byId('case-endometriose'), 70);
    expect(phraseFollowUp(bloc(c)[0])).toEqual(['Hatten Sie seitdem noch einmal eine Blutung?']);
    expect(phraseFollowUp(parSonde(c, 'fach-gyn-blutung'))).toEqual([]);
    expect(doublons(played(c))).toEqual([]);
  });
  it('mineur — le conseil du bloc ne redit pas l’alarme et ne parle ni grossesse ni contraception après 55 ans', () => {
    const tip = playedTrame(withAge(byId('case-endometriose'), 70)).fach!.chapter.tip!;
    expect((tip.match(/post-ménopausique/g) ?? []).length).toBe(1);
    expect(tip).not.toMatch(/grossesse|contraception|enceinte|pré-éclampsie/i);
    expect(playedTrame(adnexitis).fach!.chapter.tip).toMatch(/grossesse possible, contraception/);
  });
  it('mineur — paire « opérations gynécologiques » : l’opération des trompes n’est cherchée qu’une fois (eug)', () => {
    expect(doublons(played(byId('case-eug')))).toEqual([]);
    expect(tousTextes(byId('case-eug')).join(' ')).not.toMatch(/Operation an den Eileitern/);
  });
  it('L1–L2 + mineurs de langue — textes du bloc', () => {
    const t = tousTextes(adnexitis);
    for (const attendu of [
      'Gab es dabei auch Fehlgeburten oder Schwangerschaftsabbrüche?',
      'Falls ja: Hat der Ausfluss einen auffälligen Geruch?',
      'Falls ja: Seit wann bemerken Sie den Ausfluss?',
      'Falls Ihre Periode schon aufgehört hat: Hatten Sie seit Ihrer letzten Regelblutung noch einmal eine Blutung?',
      'Falls ja: Wo genau sitzen die Schmerzen?',
      'Falls ja: Hängen die Schmerzen mit Ihrem Zyklus zusammen?',
      'Falls ja: Welche Methode verwenden Sie?',
      'Falls Kaiserschnitt: Aus welchem Grund wurde der Kaiserschnitt gemacht?',
    ]) expect(t, attendu).toContain(attendu);
  });
  it('L3 — endometriose : la Pille, au bon temps', () => {
    expect(tousTextes(byId('case-endometriose')).join(' ')).not.toMatch(/Wie waren die Schmerzen unter der Pille/);
    const cq = (byId('case-endometriose').caseSpecificQuestions ?? []).map((q) => (typeof q === 'string' ? q : q.frage));
    expect(cq).toContain('Falls Sie die Pille genommen haben oder genommen hatten: Wie waren die Schmerzen damals im Vergleich zu heute?');
  });
});
