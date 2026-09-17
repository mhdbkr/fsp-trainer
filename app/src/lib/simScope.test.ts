import { describe, expect, it } from 'vitest';
import { caseMastery, isFullSimulation, scopeLabel } from './simScope';
import type { Simulation } from '@/db/types';

const sim = (o: Partial<Simulation>) => ({ id: 's', caseId: 'c', date: 0, parts: {}, notes: {}, prioritizedCorrections: [], ...o } as Simulation);
const done = { done: true, durationSec: 1, checklist: [], feeling: 50, contentPct: 80, officialPct: 80 };

describe('portée d’une simulation (FB2-P)', () => {
  it('un Teil déclaré n’est pas une simulation complète', () => {
    expect(isFullSimulation(sim({ scope: 'teil', teil: 'anamnese', parts: { anamnese: done } }))).toBe(false);
    expect(scopeLabel(sim({ scope: 'teil', teil: 'anamnese', parts: { anamnese: done } }))).toBe('Anamnese seule');
  });
  it('historique sans portée : complète dès deux parties jouées', () => {
    expect(isFullSimulation(sim({ parts: { anamnese: done, dokumentation: done } }))).toBe(true);
    expect(isFullSimulation(sim({ parts: { anamnese: done } }))).toBe(false);
  });
});

describe('maîtrise au prorata (caseMastery)', () => {
  it('une partie seule vaut un tiers ; la dernière session de chaque partie compte', () => {
    const a = sim({ id: 'a', caseId: 'c', date: 1, scope: 'teil', teil: 'anamnese', parts: { anamnese: { ...done, contentPct: 90, officialPct: 90, feeling: 90 } } });
    expect(caseMastery([a], 'c').score).toBe(30);
    const full = sim({ id: 'b', caseId: 'c', date: 2, parts: { anamnese: { ...done, contentPct: 60, officialPct: 60, feeling: 60 }, dokumentation: { ...done, contentPct: 60, officialPct: 60, feeling: 60 }, fallvorstellung: { ...done, contentPct: 60, officialPct: 60, feeling: 60 } } });
    expect(caseMastery([a, full], 'c').score).toBe(60);
    const later = sim({ id: 'd', caseId: 'c', date: 3, scope: 'teil', teil: 'anamnese', parts: { anamnese: { ...done, contentPct: 100, officialPct: 100, feeling: 100 } } });
    expect(caseMastery([a, full], 'c', later).parts.anamnese).toBe(100);
  });
  it('un autre cas n’influence pas', () => {
    const x = sim({ id: 'x', caseId: 'other', parts: { anamnese: done } });
    expect(caseMastery([x], 'c').score).toBeNull();
  });
});
