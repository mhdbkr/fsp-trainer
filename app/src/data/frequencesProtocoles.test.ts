// La table des fréquences de l'app est une COPIE de la source (`apps/site/src/data/frequencies.json`) : elle ne diverge
// pas, et chaque cas pointe une pathologie qui existe (S4-5, revue direction : la base est le `n` de la source).
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { CAS_PATHOLOGIE, PATHOLOGIES, PROTOCOLES_N, PROTOCOLES_PAR_VILLE } from './frequencesProtocoles';
import { seedCases } from './seedCases';

const SOURCE = path.resolve(__dirname, '../../../apps/site/src/data/frequencies.json');
const VILLE: Record<string, string> = { Fr: 'Freiburg', Ka: 'Karlsruhe', Re: 'Reutlingen', St: 'Stuttgart' };

describe('frequencesProtocoles — copie fidèle de la source', () => {
  it.skipIf(!fs.existsSync(SOURCE))('n, les villes et chaque pathologie sont ceux de frequencies.json', () => {
    const src = JSON.parse(fs.readFileSync(SOURCE, 'utf8')) as { n: number; centers: { code: string; n: number }[]; pathologies: { id: string; name: string; total: number | null; byCenter?: Record<string, number | null> }[] };
    expect(PROTOCOLES_N).toBe(src.n);
    expect(PROTOCOLES_PAR_VILLE).toEqual(Object.fromEntries(src.centers.map((c) => [VILLE[c.code], c.n])));
    expect(PATHOLOGIES).toEqual(Object.fromEntries(src.pathologies.map((p) => [p.id, {
      nom: p.name, total: p.total,
      parVille: Object.fromEntries(Object.entries(p.byCenter ?? {}).filter(([, v]) => v !== null).map(([k, v]) => [VILLE[k], v])),
    }])));
  });

  it('chaque cas de la table existe, et pointe une pathologie de la source', () => {
    const ids = new Set(seedCases().map((c) => c.id));
    for (const [cas, patho] of Object.entries(CAS_PATHOLOGIE)) {
      expect(ids.has(cas), cas).toBe(true);
      expect(PATHOLOGIES[patho], `${cas} → ${patho}`).toBeDefined();
    }
  });

  // S3-Q4 : le badge de fréquence (`Case.frequency`) lit cette table, il n'en tient pas une seconde.
  it('Case.frequency = le total de la pathologie du cas, quand la source le compte', () => {
    for (const c of seedCases()) {
      const total = PATHOLOGIES[CAS_PATHOLOGIE[c.id]]?.total;
      if (total != null) expect(c.frequency, c.id).toBe(total);
    }
  });
});
