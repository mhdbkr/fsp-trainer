import { describe, it, expect } from 'vitest';
import type { PartResult, Simulation } from '@/db/types';
import { porteeHistorique } from './SimulationHub';

// I3 — un run complet abandonné après deux parties s'affichait « Anamnese seule ».
const p: PartResult = { done: true, durationSec: 60, checklist: [], feeling: 50, contentPct: 50, officialPct: 50 };
const sim = (over: Partial<Simulation>): Simulation => ({
  id: 's', caseId: 'c', date: 0, parts: {}, notes: {}, prioritizedCorrections: [], passed: false,
  assistance: 'assiste', layer: 1, ...over,
} as Simulation);

describe('porteeHistorique — la ligne d’historique dit ce qui a été JOUÉ', () => {
  it('run abandonné après deux parties (scope teil, sans teil) ⇒ les deux parties listées', () => {
    expect(porteeHistorique(sim({ scope: 'teil', parts: { anamnese: p, dokumentation: p } })))
      .toBe('Simulation partielle (Anamnese, Dokumentation)');
  });
  it('un Teil seul ⇒ « Anamnese seule », sans liste', () => {
    expect(porteeHistorique(sim({ scope: 'teil', teil: 'anamnese', parts: { anamnese: p } }))).toBe('Anamnese seule');
  });
  // Mineur 3 : l'Aufklärung n'est pas un des trois Teile — elle ne change pas
  // la portée et ne figure pas comme partie.
  it('Teil seul + Aufklärung ⇒ « Anamnese seule », sans liste', () => {
    expect(porteeHistorique(sim({ scope: 'teil', teil: 'anamnese', parts: { anamnese: p, aufklaerung: p } })))
      .toBe('Anamnese seule');
  });
  it('run interrompu avec Aufklärung ⇒ seuls les Teile sont listés', () => {
    expect(porteeHistorique(sim({ scope: 'teil', parts: { anamnese: p, aufklaerung: p, dokumentation: p } })))
      .toBe('Simulation partielle (Anamnese, Dokumentation)');
  });
  it('complète à trois parties ⇒ « Complète », sans liste redondante', () => {
    expect(porteeHistorique(sim({ scope: 'full', parts: { anamnese: p, dokumentation: p, fallvorstellung: p } }))).toBe('Complète');
  });
});
