import { describe, expect, it } from 'vitest';
import type { Case } from '@/db/types';
import { poidsTirage, type SourceTirage } from './tirage';

const c = (id: string) => ({ id } as Case);
const source: SourceTirage = {
  n: 100, parVille: { Stuttgart: 50 },
  pathologies: { p: { nom: 'P', total: 30, parVille: { Stuttgart: 12 } }, q: { nom: 'Q', total: 8, parVille: {} } },
  cas: { A: 'p', B: 'q' },
};
const entame = new Map(['A', 'B'].map((id) => [id, { caseId: id, etat: 'entame' } as never]));

describe('poidsTirage — la portée de la mesure de couverture', () => {
  it('ville visée ventilée : le compte de la ville ; pathologie non ventilée : le plancher', () => {
    const w = poidsTirage({ cases: [c('A'), c('B')], journal: [], progress: entame, maintenant: 0, ville: 'Stuttgart' }, source);
    expect([w.get('A'), w.get('B')]).toEqual([12, 1]);
  });
  it('tous centres (« Alle ») : le total', () => {
    const w = poidsTirage({ cases: [c('A'), c('B')], journal: [], progress: entame, maintenant: 0, ville: 'Alle' }, source);
    expect([w.get('A'), w.get('B')]).toEqual([30, 8]);
  });
});
