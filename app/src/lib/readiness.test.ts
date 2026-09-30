import { describe, it, expect } from 'vitest';
import type { Case, CaseProgress, Fachbegriff, Simulation } from '@/db/types';
import { computeReadiness, weightedAxisScores, estMesuree } from './readiness';
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

const CASES: Case[] = [{ id: 'c1', specialty: 'Kardiologie', name: 'c1', pathology: 'p' } as Case];
const BEGRIFFE: Fachbegriff[] = [];
const PROGRESS = new Map<string, CaseProgress>();

describe('l’indice de préparation ne repose que sur des scores MESURÉS', () => {
  it('une séance IA externe ne fait pas monter un axe', () => {
    const mesure = weightedAxisScores([sim('a', 90)], BEGRIFFE, CASES, PROGRESS);
    const declare = weightedAxisScores([sim('b', 90, 'external-ai')], BEGRIFFE, CASES, PROGRESS);
    expect(mesure.Anamnese).toBe(90);
    // Déclaré ⇒ l'axe reste VIERGE, pas « testé à 90 ».
    expect(declare.Anamnese).toBeNull();
  });

  it('elle ne dilue pas non plus un axe mesuré : elle est absente, pas moyennée', () => {
    const seul = weightedAxisScores([sim('a', 80)], BEGRIFFE, CASES, PROGRESS);
    const avecDeclare = weightedAxisScores(
      [sim('a', 80), sim('b', 20, 'external-ai')], BEGRIFFE, CASES, PROGRESS);
    expect(avecDeclare.Anamnese).toBe(seul.Anamnese);
  });

  it('un indice bâti UNIQUEMENT sur des séances déclarées ne bouge pas d’un cran', () => {
    const vide = computeReadiness([], CASES, BEGRIFFE, PROGRESS);
    const declare = computeReadiness(
      [sim('a', 100, 'external-ai'), sim('b', 100, 'external-ai')], CASES, BEGRIFFE, PROGRESS);
    expect(declare.global).toBe(vide.global);
    expect(declare.verdict).toBe(vide.verdict);
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
