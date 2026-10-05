import { describe, expect, it } from 'vitest';
import { PROBE_BY_ID } from './anamneseProbes';
import { phraseFollowUps, phraseProbes, type Phrase } from './phrases';
import { PROBE_SUCHT, SIGNES } from './symptoms';
import { SUCHT_TABLES, suchtIncoherences, type SuchtTables } from './suchtCheck';

// K1 — INV-79 (toute sonde déclare `sucht`, texte ↔ déclaration), INV-84 (une relance conditionnelle porte sur le
// signe de sa mère) et INV-91 (une relance de précision n'est pas une unité) sur les SONDES. Contrat §10.9.
// Chaque invariant a sa mutation : la même validation, sur une table abîmée, doit rougir.
const mutated = (over: Partial<SuchtTables>): SuchtTables => ({ ...SUCHT_TABLES, ...over });
const without = <T extends object>(o: T, k: string): T => Object.fromEntries(Object.entries(o).filter(([key]) => key !== k)) as T;
const row = (probe: string, startsWith = '') => SUCHT_TABLES.phrases.find(({ p }) => phraseProbes(p).includes(probe) && (typeof p !== 'string' && p.text.startsWith(startsWith)))!;
const swap = (probe: string, patch: Record<string, unknown>, startsWith = ''): SuchtTables => {
  const target = row(probe, startsWith);
  return mutated({ phrases: SUCHT_TABLES.phrases.map((r) => (r === target ? { ...r, p: { ...(r.p as object), ...patch } as unknown as Phrase } : r)) });
};

describe('INV-79 — PROBE_SUCHT est totale', () => {
  it('la déclaration réelle est cohérente', () => {
    expect(suchtIncoherences()).toEqual([]);
  });
  it('toute sonde de la banque déclare au moins un signe du lexique, et aucune entrée n’est orpheline', () => {
    expect(Object.keys(PROBE_BY_ID).filter((id) => !PROBE_SUCHT[id]?.length)).toEqual([]);
    expect(Object.keys(PROBE_SUCHT).filter((id) => !(id in PROBE_BY_ID))).toEqual([]);
    expect(Object.values(PROBE_SUCHT).flat().filter((s) => !SIGNES.includes(s))).toEqual([]);
  });
  it('229 sondes : 230 de la banque − 3 de DM1 + 2 de la scission', () => {
    expect(Object.keys(PROBE_BY_ID)).toHaveLength(229);
    expect(Object.keys(PROBE_SUCHT)).toHaveLength(229);
  });
  it('mutation : une entrée retirée de PROBE_SUCHT rougit', () => {
    const bad = suchtIncoherences(mutated({ sucht: without(PROBE_SUCHT, 'fach-rheuma-systemisch') }));
    expect(bad.some((m) => /« fach-rheuma-systemisch » ne déclare aucun sucht/.test(m))).toBe(true);
  });
  it('mutation : un sucht vide rougit', () => {
    expect(suchtIncoherences(mutated({ sucht: { ...PROBE_SUCHT, 'akt-ort': [] as never } })).some((m) => /« akt-ort » ne déclare aucun sucht/.test(m))).toBe(true);
  });
  it('mutation : un signe inconnu rougit', () => {
    expect(suchtIncoherences(mutated({ sucht: { ...PROBE_SUCHT, 'akt-ort': ['ortt'] as never } })).some((m) => /cherche « ortt »/.test(m))).toBe(true);
  });
  it('mutation : une sonde déclarée mais absente de la banque rougit', () => {
    expect(suchtIncoherences(mutated({ sucht: { ...PROBE_SUCHT, 'fach-fantome': ['ort'] as never } })).some((m) => /« fach-fantome », qui n'est pas une sonde/.test(m))).toBe(true);
  });
});

describe('INV-79 — texte ↔ déclaration', () => {
  it('une énumération déclare chaque signe qu’elle nomme (D1) : fach-rheuma-systemisch', () => {
    expect(PROBE_SUCHT['fach-rheuma-systemisch']).toEqual(expect.arrayContaining(['fieber', 'augenentzuendung', 'ulzera', 'stuhl']));
  });
  it('mutation : fach-rheuma-systemisch ne déclare que `fieber` — le texte nomme le reste', () => {
    const bad = suchtIncoherences(mutated({ sucht: { ...PROBE_SUCHT, 'fach-rheuma-systemisch': ['fieber'] } }));
    expect(bad.some((m) => /fach-rheuma-systemisch.*nomme \[.*stuhl.*\] sans le déclarer/.test(m))).toBe(true);
  });
  it('mutation : poser `relu` sur fach-rheuma-systemisch au lieu de déclarer ses signes rougit (jamais sur une énumération)', () => {
    const t = swap('fach-rheuma-systemisch', { relu: true });
    const bad = suchtIncoherences({ ...t, sucht: { ...PROBE_SUCHT, 'fach-rheuma-systemisch': ['fieber'] } });
    expect(bad.some((m) => /fach-rheuma-systemisch.*pose relu sur une énumération/.test(m))).toBe(true);
  });
  it('revue K1 I-3 : une VARIANTE qui énumère (≥ 2 signes) n’est jamais couverte par `relu` — fach-haem-bsymptomatik sans Schüttelfrost', () => {
    expect(row('fach-haem-bsymptomatik').p).not.toMatchObject({ relu: true });
    const t = swap('fach-haem-bsymptomatik', { relu: true, alts: ['Haben Sie Fieber, Schüttelfrost oder Nachtschweiß bemerkt?'] });
    expect(suchtIncoherences(t).some((m) => /fach-haem-bsymptomatik.*pose relu sur une énumération/.test(m))).toBe(true);
  });
  it('revue K1 I-3 : une RELANCE qui énumère (≥ 2 signes) n’est jamais couverte par `relu`', () => {
    const fu = ['Falls ja: Husten Sie dabei etwas ab?', 'Falls Auswurf: Welche Farbe hat das?', 'Falls Auswurf: Ist Blut dabei? Haben Sie Fieber oder Nachtschweiß?'];
    const bad = suchtIncoherences(swap('akt-atemnot-husten', { followUp: fu }));
    expect(bad.some((m) => /akt-atemnot-husten.*relance 2 pose relu sur une énumération/.test(m))).toBe(true);
  });
  it('`relu` reste permis pour UNE mention qui n’interroge pas : « Falls Auswurf: Ist Blut dabei ? » sous le Husten', () => {
    expect(row('akt-atemnot-husten').p).toMatchObject({ relu: true });
    const sans = swap('akt-atemnot-husten', { relu: false });
    expect(suchtIncoherences(sans).some((m) => /akt-atemnot-husten.*nomme \[blutung\]/.test(m))).toBe(true);
  });
  it('revue K1 C2 : fach-pneumo-auswurf cherche l’aspect ET l’hémoptysie, sans `relu` ; mutation : sans haemoptyse, « Blut beigemengt » rougit', () => {
    expect(PROBE_SUCHT['fach-pneumo-auswurf']).toEqual(['auswurf_aspekt', 'haemoptyse']);
    expect(row('fach-pneumo-auswurf').p).not.toMatchObject({ relu: true });
    const bad = suchtIncoherences(mutated({ sucht: { ...PROBE_SUCHT, 'fach-pneumo-auswurf': ['auswurf_aspekt'] } }));
    expect(bad.some((m) => /fach-pneumo-auswurf.*nomme \[blutung\]/.test(m))).toBe(true);
  });
  it('une variante qui énumère (akt-begleit) déclare ses signes dans `enumere` ; mutation : sans lui, la porte rougit', () => {
    const neuro = row('akt-begleit', 'Begleitbeschwerden — Hatten Sie dabei Kopfschmerzen');
    expect(neuro.p).toMatchObject({ enumere: expect.arrayContaining(['begleit', 'kopfschmerz', 'sehstoerung']) });
    const bad = suchtIncoherences(swap('akt-begleit', { enumere: undefined }, 'Begleitbeschwerden — Hatten Sie dabei Kopfschmerzen'));
    expect(bad.some((m) => /akt-begleit.*nomme \[.*kopfschmerz.*\] sans le déclarer/.test(m))).toBe(true);
  });
  it('une dimension porte SUR le motif : « Beginn — Seit wann haben Sie Fieber ? » ne cherche pas `fieber`', () => {
    expect(suchtIncoherences()).toEqual([]);
    expect(PROBE_SUCHT['akt-beginn']).toEqual(['beginn']);
  });
  it('un signe affiné couvre le signe grossier que le texte lit : « Stuhlgang » dans la fréquence des selles', () => {
    expect(PROBE_SUCHT['akt-ausscheid-haeufigkeit']).toEqual(['stuhlfrequenz']);
    expect(suchtIncoherences().filter((m) => /akt-ausscheid-haeufigkeit/.test(m))).toEqual([]);
  });
});

describe('INV-79 / INV-84 / INV-91 — les relances', () => {
  const relances = (probe: string) => phraseFollowUps(row(probe).p);

  it('INV-91 : « Länger oder kürzer als eine halbe Stunde ? » est une précision, elle hérite de sa mère et n’est pas une unité', () => {
    const [r] = relances('fach-rheuma-morgensteifigkeit');
    expect(r.text).toMatch(/halbe Stunde/);
    expect(r.sucht).toBeUndefined();
  });
  it('une relance qui cherche un autre signe le déclare (unité à part) : famille et antécédent sous fach-rheuma-vorgeschichte', () => {
    const rs = relances('fach-rheuma-vorgeschichte');
    expect(rs.map((r) => r.sucht)).toEqual([['gicht', 'nierensteine'], ['familie_rheuma']]);
    expect(rs.every((r) => !/^Falls /.test(r.text))).toBe(true);
  });
  it('INV-84 mutation : « Falls ja: Gibt es in Ihrer Familie Rheuma oder Gicht? » remise sous fach-rheuma-vorgeschichte rougit', () => {
    const t = swap('fach-rheuma-vorgeschichte', { followUp: ['Hatten Sie schon einmal einen Gichtanfall oder Nierensteine?', 'Falls ja: Gibt es in Ihrer Familie Rheuma oder Gicht?'] });
    expect(suchtIncoherences(t).some((m) => /INV-84.*fach-rheuma-vorgeschichte.*conditionnelle 1.*familie_rheuma/.test(m))).toBe(true);
  });
  it('INV-91 mutation : la précision de la raideur matinale traitée comme une unité conditionnelle rougit (INV-84)', () => {
    const t = swap('fach-rheuma-morgensteifigkeit', { followUpSucht: [['steifigkeit']] });
    expect(suchtIncoherences(t).some((m) => /INV-84.*fach-rheuma-morgensteifigkeit.*conditionnelle 0/.test(m))).toBe(true);
  });
  it('mutation : une relance hors signe sans déclaration rougit (« sind Sie schon gestürzt ? » sous akt-nerven-alltag)', () => {
    expect(row('akt-nerven-alltag').p).toMatchObject({ followUpSucht: [['sturz']] });
    // K3 : la mère déclare aussi `sturz` (la relance la précise et reste sous elle) ; la mutation retire donc les DEUX déclarations.
    const bad = suchtIncoherences({ ...swap('akt-nerven-alltag', { followUpSucht: undefined }), sucht: { ...PROBE_SUCHT, 'akt-nerven-alltag': ['feinmotorik'] } });
    expect(bad.some((m) => /akt-nerven-alltag.*relance 0 nomme \[sturz\] hors de son signe/.test(m))).toBe(true);
  });
  it('mutation : plus de followUpSucht que de followUp, ou un signe inconnu, rougit', () => {
    expect(suchtIncoherences(swap('akt-nerven-alltag', { followUpSucht: [['sturz'], ['ort']] })).some((m) => /plus de followUpSucht que de followUp/.test(m))).toBe(true);
    expect(suchtIncoherences(swap('akt-nerven-alltag', { followUpSucht: [['stuerz']] })).some((m) => /relance 0 cherche « stuerz »/.test(m))).toBe(true);
  });
  it('aucune relance conditionnelle du guide ne déclare un autre signe que sa mère', () => {
    const offenders = SUCHT_TABLES.phrases.flatMap(({ where, p }) => phraseFollowUps(p).filter((l) => l.sucht && /^Falls /.test(l.text)).map((l) => `${where} ${l.text}`));
    expect(offenders).toEqual([]);
  });
});
