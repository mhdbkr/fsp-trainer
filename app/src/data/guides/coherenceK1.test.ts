import { describe, expect, it } from 'vitest';
import { seedCases } from '@/data/seedCases';
import { ALLGEMEINE_ANAMNESE, FACHANAMNESEN, LEITSYMPTOM_KATEGORIEN, aktuellChapterFor } from './anamneseChapters';
import { PROBE_BY_ID } from './anamneseProbes';
import { PROBE_SUCHT } from './symptoms';
import { phraseText } from './phrases';
import { playedTrame } from './anamneseChapters';
import { phraseFollowUp, phraseProbes, type Phrase } from './phrases';
import { parseFollowUp } from './followUp';

// K1 (ADR-0023, contrat `frage-atomique.md` §10.10) : DM1, DM2, la scission selles / miction,
// puis INV-79 / INV-84 / INV-91 sur les sondes. Ce fichier ne grossit qu'avec K1.

const allQuestions = (): Phrase[] => [
  ...ALLGEMEINE_ANAMNESE.flatMap((ch) => ch.questions),
  ...FACHANAMNESEN.flatMap((f) => f.chapter.questions),
  ...LEITSYMPTOM_KATEGORIEN.flatMap((k) => aktuellChapterFor(k).questions),
];
const byProbe = (id: string) => allQuestions().filter((q) => phraseProbes(q).includes(id));

describe('DM1 — les trois sondes redondantes de la Chirurgie', () => {
  const GONE = ['fach-chir-fieber', 'fach-chir-uebelkeit', 'fach-chir-blutverduenner'];

  it('les sondes ne sont plus ni canoniques ni dans le guide', () => {
    for (const id of GONE) {
      expect(PROBE_BY_ID[id], id).toBeUndefined();
      expect(byProbe(id), id).toHaveLength(0);
    }
  });
  it('le champ `redundant` n\'existe plus', () => {
    expect(Object.values(PROBE_BY_ID).filter((p) => 'redundant' in p)).toEqual([]);
  });
  it('les 18 clés `antworten` des 6 cas Chirurgie sont supprimées', () => {
    const chir = seedCases().filter((c) => c.specialty === 'Chirurgie');
    expect(chir.length).toBeGreaterThanOrEqual(6);
    for (const c of seedCases()) for (const id of GONE) expect(c.patientSheet.antworten ?? {}, `${c.id} ${id}`).not.toHaveProperty(id);
  });
  it('INV-88 : l\'information plus riche de la réponse Fach est fusionnée dans la réponse générale', () => {
    const a = (id: string) => seedCases().find((c) => c.id === id)!.patientSheet.antworten!;
    expect(a('case-appendizitis')['veg-fieber']).toMatch(/ich glaube schon, dass ich etwas Fieber habe/);
    expect(a('case-leistenhernie')['med-blutverduenner']).toMatch(/Marcumar/);
    expect(a('case-leistenhernie')['med-blutverduenner']).toMatch(/Aspirin/);
  });
  it('la relance « dernière dose » de la sonde supprimée n\'a jamais été jouée : elle part avec elle (aucun cas n\'en gagne)', () => {
    expect(byProbe('med-blutverduenner').flatMap(phraseFollowUp)).toEqual([]);
  });
});

describe('DM2 — une relance conditionnelle ne cherche pas un autre signe que sa mère', () => {
  it('akt-intensitaet : la relance « Allergien » n\'est plus une question ; la consigne suit la relance du Schmerzmittel', () => {
    for (const q of byProbe('akt-intensitaet')) expect(phraseFollowUp(q)).toHaveLength(1);
    const rs = byProbe('akt-intensitaet').flatMap(phraseFollowUp);
    expect(parseFollowUp(rs[0]).kind).toBe('skala');
    expect(rs[0]).toMatch(/ein Schmerzmittel geben\?“ \(Vor jedem Schmerzmittel zuerst nach Allergien/);
    expect(allQuestions().flatMap(phraseFollowUp).filter((r) => /Gibt es Allergien oder Unverträglichkeiten gegenüber Medikamenten\?/.test(r))).toEqual([]);
  });
  it('fach-infekt-zecke : plus de relance FSME ; la fiche répond FSME à fach-infekt-impfung (aucune information perdue)', () => {
    expect(byProbe('fach-infekt-zecke').flatMap(phraseFollowUp)).toEqual([]);
    expect(allQuestions().flatMap(phraseFollowUp).filter((r) => /FSME/.test(r))).toEqual([]);
    for (const id of ['case-lyme', 'case-meningitis']) {
      expect(seedCases().find((c) => c.id === id)!.patientSheet.antworten!['fach-infekt-impfung'], id).toMatch(/FSME/);
    }
  });
});

describe('Scission selles / urines — « Häufigkeit » et « Aussehen »', () => {
  const ausscheidung = () => seedCases().filter((c) => c.patientSheet.antworten?.['akt-ausscheid-was'] !== undefined);

  it('chaque question se coupe en deux sondes mono-signe ; les ids historiques gardent les selles', () => {
    expect(PROBE_SUCHT['akt-ausscheid-haeufigkeit']).toEqual(['stuhlfrequenz']);
    expect(PROBE_SUCHT['akt-ausscheid-harn-haeufigkeit']).toEqual(['miktion_frequenz', 'nykturie']);
    expect(PROBE_SUCHT['akt-ausscheid-aussehen']).toEqual(['stuhlaussehen']);
    expect(PROBE_SUCHT['akt-ausscheid-harn-aussehen']).toEqual(['urin_aspekt']);
    expect(PROBE_BY_ID['akt-ausscheid-haeufigkeit'].frage).toMatch(/Stuhlgang/);
    expect(PROBE_BY_ID['akt-ausscheid-haeufigkeit'].frage).not.toMatch(/Wasser/);
    expect(PROBE_BY_ID['akt-ausscheid-aussehen'].frage).toMatch(/im Stuhl/);
    expect(PROBE_BY_ID['akt-ausscheid-harn-aussehen'].frage).toMatch(/im Urin/);
  });
  it('le guide pose les deux moitiés, chacune avec sa question', () => {
    const q = (id: string) => byProbe(id).map(phraseText);
    expect(q('akt-ausscheid-harn-haeufigkeit')).toEqual(['Wasserlassen — Wie oft müssen Sie am Tag Wasser lassen, und wie oft nachts?']);
    expect(q('akt-ausscheid-harn-aussehen')).toEqual(['Urin — Ist Ihnen Blut, Schaum oder eine ungewöhnliche Farbe im Urin aufgefallen?']);
  });
  it('les 13 cas « ausscheidung » répondent aux quatre sondes (stuhl + urine, fréquence + aspect)', () => {
    const cs = ausscheidung();
    expect(cs).toHaveLength(13);
    for (const c of cs) for (const k of ['akt-ausscheid-haeufigkeit', 'akt-ausscheid-harn-haeufigkeit', 'akt-ausscheid-aussehen', 'akt-ausscheid-harn-aussehen']) {
      expect(c.patientSheet.antworten![k], `${c.id} ${k}`).toBeTruthy();
    }
  });
  // Aucune information de fiche perdue : chaque fait de l'ancienne réplique est dans la réplique de sa sonde.
  const FAITS: Array<[caseId: string, key: string, fragments: string[]]> = [
    ['case-zystitis', 'akt-ausscheid-harn-haeufigkeit', ['bestimmt fünfzehnmal', 'zwei-, dreimal raus', 'tröpfchenweise']],
    ['case-zystitis', 'akt-ausscheid-harn-aussehen', ['trüb und riecht streng', 'rötliches Blut']],
    ['case-bph', 'akt-ausscheid-harn-haeufigkeit', ['alle anderthalb bis zwei Stunden', 'Nachts stehe ich dreimal auf', 'Urin abgegangen']],
    ['case-bph', 'akt-ausscheid-harn-aussehen', ['nachträufelt']],
    ['case-prostatakarzinom', 'akt-ausscheid-harn-haeufigkeit', ['viermal', 'tröpfelt es noch nach']],
    ['case-prostatakarzinom', 'akt-ausscheid-harn-aussehen', ['Samenerguss']],
    ['case-glomerulonephritis', 'akt-ausscheid-harn-haeufigkeit', ['weniger als sonst']],
    ['case-glomerulonephritis', 'akt-ausscheid-harn-aussehen', ['dunkelbraun, wie Cola']],
    ['case-pankreaskarzinom', 'akt-ausscheid-harn-aussehen', ['dunkel wie Bier']],
    ['case-pankreaskarzinom', 'akt-ausscheid-aussehen', ['hell, fast wie Lehm', 'schlecht wegspülen']],
    ['case-pankreaskarzinom', 'akt-ausscheid-harn-haeufigkeit', ['Häufigkeit eigentlich gleich geblieben']],
    ['case-pankreaskarzinom', 'akt-ausscheid-haeufigkeit', ['wie oft, das hat sich nicht verändert']],
    ['case-hepatitis-b', 'akt-ausscheid-harn-aussehen', ['dunkel wie Cola']],
    ['case-hepatitis-b', 'akt-ausscheid-aussehen', ['hell, fast weiß']],
    // déglutition : la fréquence du blocage rejoint la réplique de la sonde « Schlucken »
    ['case-oesophaguskarzinom', 'akt-ausscheid-schlucken', ['bei jeder Mahlzeit', 'jetzt fast immer', 'Essensreste wieder hochwürgen']],
    ['case-achalasie', 'akt-ausscheid-schlucken', ['bei fast jeder Mahlzeit', 'Hochwürgen', 'ohne Säuregeschmack']],
    // les cas « selles » gardent leur réplique
    ['case-gastroenteritis', 'akt-ausscheid-haeufigkeit', ['bis zu zehnmal am Tag']],
    ['case-colitis-ulcerosa', 'akt-ausscheid-haeufigkeit', ['Acht- bis zehnmal am Tag']],
    ['case-obstipation', 'akt-ausscheid-haeufigkeit', ['einmal die Woche']],
  ];
  for (const [caseId, key, fragments] of FAITS) {
    it(`${caseId} · ${key.replace('akt-ausscheid-', '')} garde ${fragments.length} fait(s) de la fiche`, () => {
      const r = seedCases().find((c) => c.id === caseId)!.patientSheet.antworten![key];
      for (const f of fragments) expect(r, f).toContain(f);
    });
  }
  // K3 (décision 3 de main ; contrat §11.4 : FACH_COVERS est absorbé par r2) : le pont « Fach urologique → fréquence des
  // SELLES » disparaît. Une moitié est jouée, ou retirée par r2 au profit d'une question qui cherche son signe — jamais effacée en silence.
  it('K3 : chaque moitié (selles, urines) est jouée, ou retirée par r2 avec un écart qui nomme son gagnant', () => {
    for (const c of ausscheidung()) {
      const t = playedTrame(c);
      const probes = [...t.chapters.flatMap((ch) => ch.questions), ...(t.fach?.chapter.questions ?? [])].flatMap(phraseProbes);
      const skip = new Set(c.patientSheet.aktuellSkip ?? []);
      for (const id of ['akt-ausscheid-haeufigkeit', 'akt-ausscheid-aussehen', 'akt-ausscheid-harn-haeufigkeit', 'akt-ausscheid-harn-aussehen']) {
        if (skip.has(id) || probes.includes(id)) continue;
        expect(t.ecarts.some((e) => e.question === id && e.action === 'retire' && e.regle === 2 && !!e.cause), `${c.id} ${id}`).toBe(true);
      }
    }
  });
});
