import { describe, expect, it } from 'vitest';
import { seedCases } from '@/data/seedCases';
import type { Case } from '@/db/types';
import { leitsymptomOf, playedTrame } from './anamneseChapters';
import { LEXIQUE, profilIncoherences, tagsEffectifs, type ProfilCas } from './signes';

// K2 — le profil clinique des 130 cas (ADR-0023, contrat frage-atomique §10.3).
// INV-80 : tout cas a un profil valide. INV-90 (forme K2) : le profil ne change pas
// le montage avant K3 — un cas sans profil joue la même trame.
const cases = seedCases();
const asProfilCas = (c: Case): ProfilCas => ({ id: c.id, kategorie: leitsymptomOf(c), sheet: c.patientSheet });
const byId = (id: string): Case => cases.find((c) => c.id === id)!;
/** Le cas `id` muté (copie profonde de la fiche), en `ProfilCas`. */
const mute = (id: string, edit: (s: Case['patientSheet']) => void): ProfilCas => {
  const c = structuredClone(byId(id));
  edit(c.patientSheet);
  return asProfilCas(c);
};

describe('INV-80 — tout cas a un profil valide', () => {
  it('les 130 cas déclarent un profil, sans incohérence', () => {
    expect(cases).toHaveLength(130);
    expect(profilIncoherences(cases.map(asProfilCas))).toEqual([]);
  });

  it('mutation : profil supprimé de case-gastroenteritis → rouge', () => {
    const bad = profilIncoherences([mute('case-gastroenteritis', (s) => { delete s.profil; })]);
    expect(bad).toEqual(['INV-80 : case-gastroenteritis n\'a pas de profil']);
  });

  it('mutation : la banque de « ort » dans aktuellSkip d\'un cas tagué schmerz → rouge', () => {
    const bad = profilIncoherences([mute('case-gastroenteritis', (s) => { s.aktuellSkip = ['akt-ort']; })]);
    expect(bad.join('\n')).toMatch(/exige « ort », dont la banque « akt-ort » est skippée/);
  });

  it('mutation : la banque d\'un signe exigé visée par SUCHT_AUSSER sous un tag du cas → rouge', () => {
    const t = { ...LEXIQUE, ausser: { ...LEXIQUE.ausser, 'akt-ort': { schmerz: ['ort' as const] } } };
    expect(profilIncoherences([asProfilCas(byId('case-gastroenteritis'))], t).join('\n')).toMatch(/SUCHT_AUSSER/);
  });

  it('mutations : exclut un signe de dépistage, sans raison, exige ET exclut, tag inconnu, exige non pertinent → rouge', () => {
    const rouge = (edit: (s: Case['patientSheet']) => void) => profilIncoherences([mute('case-gastroenteritis', edit)]).join('\n');
    expect(rouge((s) => { s.profil!.exclut = { fieber: 'x' }; })).toMatch(/exclut « fieber », signe de dépistage/);
    expect(rouge((s) => { s.profil!.exclut = { gelenke: ' ' }; })).toMatch(/exclut « gelenke » sans raison/);
    expect(rouge((s) => { s.profil!.exclut = { ausstrahlung: 'x' }; s.profil!.exige = ['ausstrahlung']; })).toMatch(/exige ET exclut « ausstrahlung »/);
    expect(rouge((s) => { (s.profil!.tags as string[]).push('gelenkig'); })).toMatch(/tag inconnu « gelenkig »/);
    expect(rouge((s) => { s.profil!.exige = ['schluck']; })).toMatch(/exige « schluck », pertinent seulement pour \[dysphagie, hals\]/);
  });

  it('mutation (revue K2 m1) : exige un signe SANS banque → rouge, même pertinent pour le cas', () => {
    // case-meningitis porte `meningitis` : la raideur de nuque lui est pertinente, mais elle n'a pas de sonde de banque.
    const bad = profilIncoherences([mute('case-meningitis', (s) => { s.profil!.exige = ['meningismus']; })]).join('\n');
    expect(bad).toMatch(/exige « meningismus », sans banque/);
    expect(bad).not.toMatch(/pertinent seulement/);
  });

  it('mutation (revue K2 m1) : un signe inconnu dans exige ou dans exclut → rouge', () => {
    const rouge = (edit: (s: Case['patientSheet']) => void) => profilIncoherences([mute('case-gastroenteritis', edit)]).join('\n');
    expect(rouge((s) => { (s.profil!.exige as string[]) = ['nackenweh']; })).toMatch(/exige « nackenweh », qui n'est pas un signe/);
    expect(rouge((s) => { (s.profil as { exclut?: Record<string, string> }).exclut = { nackenweh: 'x' }; })).toMatch(/exclut « nackenweh », qui n'est pas un signe/);
  });
});

describe('Arbitrages relus (D2, revue de direction du 4 oct.)', () => {
  const tags = (id: string) => tagsEffectifs(asProfilCas(byId(id)));

  it('D2 : une douleur en premier symptôme d\'un motif d\'une autre nature porte le tag schmerz', () => {
    for (const id of ['case-gastroenteritis', 'case-commotio', 'case-arterielle-hypertonie', 'case-zystitis', 'case-tvt', 'case-erysipel']) expect(tags(id), id).toContain('schmerz');
  });

  it('D2 : une douleur accessoire (syndrome fébrile, sevrage, symptôme second) ne le porte pas', () => {
    for (const id of ['case-influenza', 'case-covid19', 'case-lyme', 'case-laktoseintoleranz', 'case-opioidabhaengigkeit', 'case-glomerulonephritis']) expect(tags(id), id).not.toContain('schmerz');
  });

  it('case-fibromyalgie : douleur généralisée, « Welche Gelenke » exclu avec sa raison', () => {
    expect(tags('case-fibromyalgie')).toEqual(expect.arrayContaining(['schmerz', 'generalisiert']));
    expect(tags('case-fibromyalgie')).not.toContain('arthritis');
    expect(byId('case-fibromyalgie').patientSheet.profil?.exclut?.gelenke).toBeTruthy();
  });
});

describe('INV-90 (forme K2) — sans profil, le comportement est inchangé', () => {
  it('le montage ne lit pas le profil : la trame jouée des 130 cas est identique sans lui', () => {
    for (const c of cases) {
      const sans = structuredClone(c);
      delete sans.patientSheet.profil;
      expect(playedTrame(sans), c.id).toEqual(playedTrame(c));
    }
  });
});
