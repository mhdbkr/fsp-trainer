import { describe, it, expect } from 'vitest';
import { ANATOMY_REGIONS } from './types';
import { FIGURE_SILHOUETTES, FIGURE_VIEWBOX, REGION_ANCHORS } from './anatomyFigures';

describe('anatomyFigures — couverture des régions', () => {
  it('chaque région de ANATOMY_REGIONS a une ancre numérique', () => {
    for (const region of ANATOMY_REGIONS) {
      const anchor = REGION_ANCHORS[region];
      expect(anchor, `ancre manquante pour ${region}`).toBeDefined();
      expect(typeof anchor.x).toBe('number');
      expect(typeof anchor.y).toBe('number');
    }
  });

  it("n'a pas d'ancre en trop hors de l'enum fermé", () => {
    expect(Object.keys(REGION_ANCHORS).sort()).toEqual([...ANATOMY_REGIONS].sort());
  });

  it('les trois figures ont une silhouette (traits, pas d’image)', () => {
    for (const figure of ['body', 'torso', 'abdomen'] as const) {
      expect(FIGURE_SILHOUETTES[figure].paths.length).toBeGreaterThan(0);
    }
  });

  it('viewBox commun aux trois figures', () => {
    expect(FIGURE_VIEWBOX).toBe('0 0 200 400');
  });
});
