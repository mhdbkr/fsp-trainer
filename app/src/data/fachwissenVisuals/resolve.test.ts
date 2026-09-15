import { describe, it, expect } from 'vitest';
import type { Fachwissen } from '@/db/types';
import { refKey, resolveRef, resolveSpec, isCollapsed } from './resolve';
import type { FachwissenVisualSpec, SectionRef, VisualBlock } from './types';

// Fixture minimale, construite à la main (pas d'import de seedFachwissen.ts,
// trop volumineux). Une entrée par section pour couvrir chaque variante de
// `SectionRef`.
const fw: Fachwissen = {
  id: 'fw-test',
  pathology: 'Testkrankheit',
  specialty: 'Kardiologie',
  definition: 'Une définition.',
  aetiologie: 'Idiopathisch in den meisten Fällen.',
  risikofaktoren: ['Rauchen', 'Adipositas'],
  klinik: [
    { text: 'Thoraxschmerz retrosternal' },
    { text: 'Dyspnoe bei Belastung', atypisch: true },
  ],
  klassifikation: [{ name: 'NYHA', inhalt: 'I–IV' }],
  redFlags: ['Akuter Thoraxschmerz mit Schock'],
  diagnostik: [
    { stufe: 'Anamnese/Klinik', text: 'Schmerzanamnese' },
    { stufe: 'Labor', text: 'Troponin' },
  ],
  differenzialdiagnosen: [{ dd: 'Lungenembolie', unterscheidung: 'D-Dimer, CT' }],
  therapie: [
    { label: 'Erstlinie', items: ['ASS', 'Statin'] },
    { label: 'Interventionell', items: ['PCI'], akut: true },
  ],
  prognose: 'Abhängig vom Stadium.',
  pruefungsfallen: [],
  askedInExam: [],
  linkedCaseIds: [],
  keyFachbegriffeIds: [],
  linkedAufklaerungIds: [],
};

describe('refKey', () => {
  it('produit une clé stable par section', () => {
    expect(refKey({ section: 'therapie', label: 'Erstlinie' })).toBe('therapie:Erstlinie');
    expect(refKey({ section: 'klassifikation', name: 'NYHA' })).toBe('klassifikation:NYHA');
    expect(refKey({ section: 'diagnostik', stufe: 'Labor' })).toBe('diagnostik:Labor');
    expect(refKey({ section: 'differenzialdiagnosen', dd: 'Lungenembolie' })).toBe(
      'differenzialdiagnosen:Lungenembolie',
    );
    expect(refKey({ section: 'klinik', text: 'x' })).toBe('klinik:x');
    expect(refKey({ section: 'redFlags', text: 'x' })).toBe('redFlags:x');
    expect(refKey({ section: 'risikofaktoren', text: 'x' })).toBe('risikofaktoren:x');
    expect(refKey({ section: 'prognose' })).toBe('prognose:');
    expect(refKey({ section: 'aetiologie' })).toBe('aetiologie:');
  });
});

describe('resolveRef — chaque variante résout', () => {
  it('therapie', () => {
    const r = resolveRef(fw, { section: 'therapie', label: 'Erstlinie' });
    expect(r).toEqual({ section: 'therapie', index: 0, value: fw.therapie[0] });
  });

  it('klassifikation', () => {
    const r = resolveRef(fw, { section: 'klassifikation', name: 'NYHA' });
    expect(r).toEqual({ section: 'klassifikation', index: 0, value: fw.klassifikation![0] });
  });

  it('diagnostik — toutes les entrées de la stufe', () => {
    const r = resolveRef(fw, { section: 'diagnostik', stufe: 'Anamnese/Klinik' });
    expect(r).toEqual({ section: 'diagnostik', entries: [fw.diagnostik[0]] });
  });

  it('differenzialdiagnosen', () => {
    const r = resolveRef(fw, { section: 'differenzialdiagnosen', dd: 'Lungenembolie' });
    expect(r).toEqual({
      section: 'differenzialdiagnosen',
      index: 0,
      value: fw.differenzialdiagnosen[0],
    });
  });

  it('klinik', () => {
    const r = resolveRef(fw, { section: 'klinik', text: 'Thoraxschmerz retrosternal' });
    expect(r).toEqual({ section: 'klinik', index: 0, value: fw.klinik[0] });
  });

  it('redFlags', () => {
    const r = resolveRef(fw, { section: 'redFlags', text: 'Akuter Thoraxschmerz mit Schock' });
    expect(r).toEqual({ section: 'redFlags', index: 0, value: fw.redFlags![0] });
  });

  it('risikofaktoren', () => {
    const r = resolveRef(fw, { section: 'risikofaktoren', text: 'Rauchen' });
    expect(r).toEqual({ section: 'risikofaktoren', index: 0, value: 'Rauchen' });
  });

  it('prognose', () => {
    const r = resolveRef(fw, { section: 'prognose' });
    expect(r).toEqual({ section: 'prognose', value: fw.prognose });
  });

  it('aetiologie', () => {
    const r = resolveRef(fw, { section: 'aetiologie' });
    expect(r).toEqual({ section: 'aetiologie', value: fw.aetiologie });
  });

  it('ref cassée → null (comparaison exacte, une faute de frappe casse)', () => {
    expect(resolveRef(fw, { section: 'therapie', label: 'Erstlinie ' + 'x' })).toBeNull();
    expect(resolveRef(fw, { section: 'klinik', text: 'texte inexistant' })).toBeNull();
  });

  it('champ optionnel absent de la fiche → null', () => {
    const fwSansKlassifikation: Fachwissen = { ...fw, klassifikation: undefined };
    expect(resolveRef(fwSansKlassifikation, { section: 'klassifikation', name: 'NYHA' })).toBeNull();
  });
});

// ----------------------------------------------------------------------------
// resolveSpec — repli, écarts en bloc entier, doublon
// ----------------------------------------------------------------------------

function block(overrides: Partial<VisualBlock> & Pick<VisualBlock, 'id' | 'kind'>): VisualBlock {
  const base = {
    title: 'Titre',
    replaces: [] as SectionRef[],
    anchor: 'klinik' as const,
  };
  return { ...base, ...overrides } as VisualBlock;
}

describe('resolveSpec', () => {
  it('garde un bloc dont toutes les refs (replaces + source) résolvent', () => {
    const spec: FachwissenVisualSpec = {
      fachwissenId: 'fw-test',
      version: 1,
      blocks: [
        block({
          id: 'timeline-x',
          kind: 'timeline',
          replaces: [{ section: 'klinik', text: 'Thoraxschmerz retrosternal' }],
          data: {
            axis: 'zeit',
            points: [
              {
                at: '0 min',
                label: 'Schmerzbeginn',
                source: { section: 'klinik', text: 'Thoraxschmerz retrosternal' },
              },
            ],
          },
        }),
      ],
    };
    const result = resolveSpec(fw, spec);
    expect(result.blocks).toHaveLength(1);
    expect(result.warnings).toHaveLength(0);
    expect(isCollapsed(result.collapsed, { section: 'klinik', text: 'Thoraxschmerz retrosternal' })).toBe(
      true,
    );
  });

  it('écarte un bloc à source cassée EN ENTIER (jamais partiel) avec un warning', () => {
    const spec: FachwissenVisualSpec = {
      fachwissenId: 'fw-test',
      version: 1,
      blocks: [
        block({
          id: 'timeline-cassee',
          kind: 'timeline',
          replaces: [{ section: 'klinik', text: 'Thoraxschmerz retrosternal' }],
          data: {
            axis: 'zeit',
            points: [
              {
                at: '0 min',
                label: 'Schmerzbeginn',
                source: { section: 'klinik', text: 'texte qui n’existe pas dans la fiche' },
              },
            ],
          },
        }),
        block({
          id: 'timeline-valide',
          kind: 'timeline',
          replaces: [{ section: 'risikofaktoren', text: 'Rauchen' }],
          data: {
            axis: 'schritt',
            points: [
              { at: '1', label: 'Konsum', source: { section: 'risikofaktoren', text: 'Rauchen' } },
            ],
          },
        }),
      ],
    };
    const result = resolveSpec(fw, spec);
    expect(result.blocks.map((b) => b.id)).toEqual(['timeline-valide']);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain('ref introuvable');
    expect(result.warnings[0]).toContain('fw-test/timeline-cassee');
    // le bloc écarté ne replie rien
    expect(isCollapsed(result.collapsed, { section: 'klinik', text: 'Thoraxschmerz retrosternal' })).toBe(
      false,
    );
  });

  it('deux blocs repliant la même clé : le second est écarté avec un warning', () => {
    const spec: FachwissenVisualSpec = {
      fachwissenId: 'fw-test',
      version: 1,
      blocks: [
        block({
          id: 'bloc-a',
          kind: 'timeline',
          replaces: [{ section: 'risikofaktoren', text: 'Rauchen' }],
          data: { axis: 'schritt', points: [{ at: '1', label: 'A', source: 'ergänzt' }] },
        }),
        block({
          id: 'bloc-b',
          kind: 'timeline',
          replaces: [{ section: 'risikofaktoren', text: 'Rauchen' }],
          data: { axis: 'schritt', points: [{ at: '1', label: 'B', source: 'ergänzt' }] },
        }),
      ],
    };
    const result = resolveSpec(fw, spec);
    expect(result.blocks.map((b) => b.id)).toEqual(['bloc-a']);
    expect(result.warnings.some((w) => w.includes('double repli'))).toBe(true);
  });

  it('ne lève jamais, même sur une spec vide', () => {
    const spec: FachwissenVisualSpec = { fachwissenId: 'fw-test', version: 1, blocks: [] };
    expect(() => resolveSpec(fw, spec)).not.toThrow();
  });

  it('ergänzt résout toujours (pas de vérification contre la fiche)', () => {
    const spec: FachwissenVisualSpec = {
      fachwissenId: 'fw-test',
      version: 1,
      blocks: [
        block({
          id: 'bloc-ergaenzt',
          kind: 'syndrome-map',
          data: {
            center: 'Centre',
            spokes: [{ label: 'Rayon', items: [{ text: 'Ajout non sourcé', source: 'ergänzt' }] }],
          },
        }),
      ],
    };
    const result = resolveSpec(fw, spec);
    expect(result.blocks).toHaveLength(1);
    expect(result.warnings).toHaveLength(0);
  });
});

// ----------------------------------------------------------------------------
// Typage — un `kind` inconnu et un `replaces` mal typé (par index) échouent tsc
// ----------------------------------------------------------------------------

describe('typage', () => {
  it('un kind inconnu est rejeté par tsc', () => {
    // @ts-expect-error kind inconnu, pas dans l'union VisualKind
    const invalid: VisualBlock = { id: 'x', kind: 'nouveau-kind', title: 't', replaces: [], anchor: 'klinik', data: {} };
    expect(invalid).toBeDefined();
  });

  it('un replaces par index est rejeté par tsc (SectionRef par clé, jamais par index)', () => {
    // @ts-expect-error SectionRef n'a pas de champ `index`
    const invalid: SectionRef = { section: 'therapie', index: 0 };
    expect(invalid).toBeDefined();
  });
});
