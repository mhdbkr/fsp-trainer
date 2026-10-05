import { describe, expect, it } from 'vitest';
import { seedCases } from '@/data/seedCases';
import { ALLGEMEINE_ANAMNESE, FACHANAMNESEN, LEITSYMPTOM_KATEGORIEN, aktuellChapterFor } from './anamneseChapters';
import { PROBE_BY_ID } from './anamneseProbes';
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
