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
    re: /seitdem[^?]*blutung/i },
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
