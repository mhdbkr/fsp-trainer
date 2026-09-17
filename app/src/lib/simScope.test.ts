import { describe, expect, it } from 'vitest';
import { isFullSimulation, scopeLabel } from './simScope';
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
