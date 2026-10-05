import { describe, expect, it } from 'vitest';
import { seedCases } from '@/data/seedCases';
import type { Case } from '@/db/types';
import { compteursApresCas, fachChapterRaw, leitsymptomOf, playedTrame } from './anamneseChapters';
import { phraseProbes } from './phrases';
import { LEXIQUE, profilIncoherences, tagsEffectifs, type ProfilCas } from './signes';

// K2 — le profil clinique des 130 cas (ADR-0023, contrat frage-atomique §10.3).
// INV-80 : tout cas a un profil valide. INV-90 : forme K3 en fin de fichier (le profil pilote r1 et r3).
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
    for (const id of ['case-gastroenteritis', 'case-commotio', 'case-arterielle-hypertonie', 'case-zystitis', 'case-tvt', 'case-erysipel',
      // revue clinique K2 (D2) : douleur co-dominante du motif
      'case-colitis-ulcerosa', 'case-laktoseintoleranz', 'case-sinusitis', 'case-sturz-im-alter']) expect(tags(id), id).toContain('schmerz');
  });

  it('D2 : une douleur accessoire (syndrome fébrile, sevrage, symptôme second) ne le porte pas', () => {
    for (const id of ['case-influenza', 'case-covid19', 'case-lyme', 'case-opioidabhaengigkeit', 'case-glomerulonephritis']) expect(tags(id), id).not.toContain('schmerz');
  });

  it('case-fibromyalgie : douleur généralisée, « Welche Gelenke » exclu avec sa raison', () => {
    expect(tags('case-fibromyalgie')).toEqual(expect.arrayContaining(['schmerz', 'generalisiert']));
    expect(tags('case-fibromyalgie')).not.toContain('arthritis');
    expect(byId('case-fibromyalgie').patientSheet.profil?.exclut?.gelenke).toBeTruthy();
  });
});

// INV-90, forme K3 (contrat §10.8) : un contenu SANS profil (client nouveau, contenu ancien) garde FACH_RULES, aktuellSkip,
// fachSkip, les tags dérivés et SUCHT_AUSSER ; seuls r1-hors-profil et r3 sont inactifs, avec un écart `profil-absent` ; r2 s'applique.
describe('INV-90 (forme K3) — sans profil : r1 hors profil et r3 inactifs, le reste s\'applique', () => {
  const sans = (c: Case) => { const x = structuredClone(c); delete x.patientSheet.profil; return x; };
  it('130 cas : un écart profil-absent, aucun retrait « hors profil », aucun ajout r3, aucun doublon', () => {
    for (const c of cases) {
      const t = playedTrame(sans(c));
      expect(t.ecarts.filter((e) => e.action === 'profil-absent'), c.id).toHaveLength(1);
      expect(t.ecarts.filter((e) => e.regle === 1 && e.cause === 'profil'), c.id).toEqual([]);
      expect(t.ecarts.filter((e) => e.regle === 3), c.id).toEqual([]);
      expect(compteursApresCas(sans(c)).doublons, c.id).toBe(0);
    }
  });
  it('fachSkip et aktuellSkip s\'appliquent toujours ; la Fach brute ne dépend pas du profil', () => {
    for (const c of cases) {
      const t = playedTrame(sans(c));
      const probes = [...t.chapters.flatMap((ch) => ch.questions), ...(t.fach?.chapter.questions ?? [])].flatMap(phraseProbes);
      for (const id of [...(c.patientSheet.fachSkip ?? []), ...(c.patientSheet.aktuellSkip ?? [])]) expect(probes, `${c.id} ${id}`).not.toContain(id);
      expect(JSON.stringify(fachChapterRaw(sans(c))), c.id).toBe(JSON.stringify(fachChapterRaw(c)));
    }
  });
  it('mutation : avec le profil, case-gastroenteritis perd « Schlucken » (r1) et gagne Ort / Charakter / Intensität (r3) ; sans, non', () => {
    const g = byId('case-gastroenteritis');
    const avec = playedTrame(g).ecarts, sansP = playedTrame(sans(g)).ecarts;
    expect(avec.some((e) => e.question === 'akt-ausscheid-schlucken' && e.action === 'retire' && e.regle === 1)).toBe(true);
    expect(sansP.some((e) => e.question === 'akt-ausscheid-schlucken')).toBe(false);
    expect(avec.filter((e) => e.regle === 3).map((e) => e.question)).toEqual(['akt-ort', 'akt-charakter', 'akt-intensitaet']);
    expect(sansP.filter((e) => e.regle === 3)).toEqual([]);
  });
});
