import { describe, it, expect } from 'vitest';
import type { Simulation } from '@/db/types';
import { estMesuree } from './readiness';
import { indiceAt } from './program/trajectory';
import { trainingEventFromSimulation } from './journal';
import { streakFromDays } from './stats';
import { workedDayKeys } from './journal';
import type { TrainingEvent } from '@/db/types';

// Une simulation sur l'Anamnese, mesurée ou déclarée selon `mode`.
// Sans grille de langue, `partScore` = contenu×0.8 + ressenti×0.2 ; en autonome
// couche 2 le multiplicateur vaut 1.0 — le score pondéré est donc `score` pile,
// ce qui rend les assertions lisibles sans arrondi à décoder.
const sim = (id: string, score: number, mode?: Simulation['mode']): Simulation => ({
  id, caseId: 'c1', date: 1_000,
  parts: {
    anamnese: {
      done: true, durationSec: 600, checklist: [],
      feeling: score, contentPct: score, officialPct: score,
    },
  },
  notes: {}, prioritizedCorrections: [], assistance: 'autonome', layer: 2,
  ...(mode ? { mode } : {}),
} as Simulation);

// D-I9 : l'indice de préparation est UN — celui de la frise (`indiceAt`).
// Il repose sur `case_progress`, qui exclut les séances `selbstbewertet` (INV-11).
const TOTAL = 3;   // un cas × trois Teile
const te = (s: Simulation) => trainingEventFromSimulation(s);

describe('l’indice de préparation ne repose que sur des scores MESURÉS', () => {
  it('une séance IA externe ne fait pas monter l’indice', () => {
    expect(indiceAt([te(sim('a', 90))], TOTAL, 2_000)).toBeGreaterThan(0);
    expect(indiceAt([te(sim('b', 90, 'external-ai'))], TOTAL, 2_000)).toBe(0);
  });

  it('elle ne dilue pas non plus un Teil mesuré : elle est absente, pas moyennée', () => {
    const seul = indiceAt([te(sim('a', 80))], TOTAL, 2_000);
    const avec = indiceAt([te(sim('a', 80)), { ...te(sim('b', 20, 'external-ai')), at: 1_500 }], TOTAL, 2_000);
    expect(avec).toBe(seul);
  });

  it('`estMesuree` est le seul prédicat — external-ai dehors, tout le reste dedans', () => {
    expect(estMesuree(sim('a', 50))).toBe(true);
    expect(estMesuree(sim('a', 50, 'texte'))).toBe(true);
    expect(estMesuree(sim('a', 50, 'external-ai'))).toBe(false);
  });
});

describe('… mais elle COMPTE dans la série : c’est du travail réel', () => {
  it('une journée n’ayant qu’une séance déclarée entre bien dans la série', () => {
    const jour = new Date(2026, 8, 30, 10, 0, 0).getTime();
    const declare: TrainingEvent = {
      id: 'te-x', at: jour, kind: 'simulation', caseId: 'c1', teile: ['anamnese'],
      source: 'libre', spentMin: 20, scores: {}, selbstbewertet: true,
    };
    const jours = workedDayKeys([declare]);
    expect(jours.size).toBe(1);
    expect(streakFromDays(jours, new Date(2026, 8, 30, 23, 0, 0))).toBe(1);
  });
});
