// Silhouettes SVG écrites à la main (code, jamais d'image) pour `anatomy-map`.
// Voir docs/contracts/fachwissen-visuals.md §1.3 et §6 (hotspot = cercle 10 px
// + anneau au focus, traits 1,5 px). Un seul système de coordonnées
// (viewBox 0 0 200 400) partagé par les trois figures.

import { ANATOMY_REGIONS, type AnatomyFigure, type AnatomyRegion } from './types';

/** viewBox commun aux trois figures. */
export const FIGURE_VIEWBOX = '0 0 200 400';

export interface FigureSilhouette {
  /** Cercles décoratifs (tête). */
  circles: { cx: number; cy: number; r: number }[];
  /** Traits du contour (`d` de `<path>`), 1,5 px, `currentColor`. */
  paths: string[];
}

const TORSO_AND_ARMS = [
  'M70,55 L130,55 L138,110 L132,230 L68,230 L62,110 Z',
  'M70,58 Q40,90 38,150',
  'M130,58 Q160,90 162,150',
];

/** Silhouettes stylisées, un jeu de traits par figure — aucune image. */
export const FIGURE_SILHOUETTES: Record<AnatomyFigure, FigureSilhouette> = {
  body: {
    circles: [{ cx: 100, cy: 32, r: 16 }],
    paths: [...TORSO_AND_ARMS, 'M80,230 L72,390', 'M120,230 L128,390'],
  },
  torso: {
    circles: [{ cx: 100, cy: 32, r: 16 }],
    paths: [...TORSO_AND_ARMS],
  },
  abdomen: {
    circles: [],
    paths: [
      'M50,140 Q50,120 70,120 L130,120 Q150,120 150,140 L150,220 Q150,240 130,240 L70,240 Q50,240 50,220 Z',
      'M100,120 L100,240',
      'M50,180 L150,180',
    ],
  },
};

/**
 * Point d'ancrage de chaque région de l'enum fermé `ANATOMY_REGIONS`. Un
 * seul système de coordonnées, réutilisé par les trois figures ; `skin` est
 * hors silhouette (marqueur générique), valide sur les trois figures.
 */
export const REGION_ANCHORS: Record<AnatomyRegion, { x: number; y: number }> = {
  head: { x: 100, y: 32 },
  eyes: { x: 108, y: 30 },
  neck: { x: 100, y: 58 },
  jaw: { x: 100, y: 48 },
  chest: { x: 100, y: 100 },
  retrosternal: { x: 100, y: 115 },
  'left-arm': { x: 45, y: 120 },
  'right-arm': { x: 155, y: 120 },
  epigastrium: { x: 100, y: 150 },
  'right-upper-quadrant': { x: 125, y: 165 },
  'left-upper-quadrant': { x: 75, y: 165 },
  periumbilical: { x: 100, y: 180 },
  'right-lower-quadrant': { x: 125, y: 205 },
  'left-lower-quadrant': { x: 75, y: 205 },
  'flank-left': { x: 60, y: 180 },
  'flank-right': { x: 140, y: 180 },
  back: { x: 100, y: 135 },
  lumbar: { x: 100, y: 220 },
  pelvis: { x: 100, y: 235 },
  'left-leg': { x: 75, y: 310 },
  'right-leg': { x: 125, y: 310 },
  legs: { x: 100, y: 350 },
  hands: { x: 155, y: 150 },
  feet: { x: 100, y: 390 },
  skin: { x: 25, y: 370 },
};

// Garde-fou de développement : si l'enum s'agrandit sans amendement de ce
// fichier, la couverture manque au chargement du module (le test dédié
// itère `ANATOMY_REGIONS` pour la vérification opposable).
if (ANATOMY_REGIONS.some((region) => !(region in REGION_ANCHORS))) {
  throw new Error('anatomyFigures: région ANATOMY_REGIONS sans ancre dans REGION_ANCHORS');
}
