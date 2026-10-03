// I-4 : le champ de couverture compte « faite — non mesurée » à part — ni
// « pas encore travaillé », ni « entamé ».
import { describe, it, expect } from 'vitest';
import type { Case, CaseProgress } from '@/db/types';
import { blankProgress } from '@/lib/journal';
import { cellOf, coverageField } from './coverage';

describe('I-4 — 4e compteur du champ de couverture', () => {
  it('nonMesure sort de vierge', () => {
    const cases = ['c1', 'c2'].map((id) => ({ id, specialty: 'Kardiologie' } as Case));
    const cp: CaseProgress = blankProgress('c1');
    cp.teile.anamnese = { ...cp.teile.anamnese, nonMesureAt: 1 };
    const cell = cellOf(coverageField(cases, new Map([['c1', cp]])), 'Kardiologie', 'anamnese')!;
    expect([cell.vierge, cell.nonMesure, cell.entame, cell.solide]).toEqual([1, 1, 0, 0]);
  });
});
