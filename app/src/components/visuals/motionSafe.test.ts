import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ============================================================================
// LE CONTRAT DE MOUVEMENT RÉDUIT — périmètre tranché le 30 sept. 2026
// (s3-primitives T7), avant que les autres chantiers n'ajoutent des
// transitions. Il y a DEUX règles, et une seule est universelle.
//
// RÈGLE A (universelle) — LA GARDE GLOBALE de index.css. Sous
// `prefers-reduced-motion: reduce`, `*, *::before, *::after` remet à zéro les
// DURÉES **et les DÉLAIS**, animation comme transition. C'est le contrat de
// l'app : un composant n'a pas à se garder lui-même, et `!important` en
// feuille d'auteur l'emporte même sur un `style=""` inline.
//   Trou mesuré et bouché : la garde ne remettait que les durées. Un
//   `animation-delay` de 120–200 ms survivait (l’ex-ModeChooser, retiré en S4-3), donc
//   sous mouvement réduit l'élément restait invisible ce délai (`fill: both`)
//   puis surgissait d'un coup — un clignotement, exactement ce que
//   l'utilisateur avait demandé d'éviter.
//   Exception native : `::view-transition-*` vit hors de l'arbre du document,
//   `*` ne l'atteint pas. D'où une règle dédiée, vérifiée ici aussi.
//
// RÈGLE B (locale) — LE PRÉFIXE `motion-safe:`. Elle ne s'applique QU'À
// `components/visuals/*` (+ visualSections.tsx). Ce n'est pas une règle de
// charte, c'est une règle de technique : ces visuels SVG animent des tracés
// dont le mouvement est structurel (il porte du sens), et où une durée
// ramenée à 0,001 ms laisserait un état intermédiaire figé à l'écran plutôt
// qu'un état final. Il faut donc que la classe soit ABSENTE, pas accélérée.
//
// POURQUOI ON N'ÉTEND PAS LA RÈGLE B À TOUT `src/` : `SimulationRunner.tsx`
// échouerait — or c'est le meilleur mouvement de l'app (condensation d'en-tête
// FLIP, `ease-fluid`, interruptible), et il est PARFAITEMENT correct sous
// mouvement réduit grâce à la règle A. Une porte CI qui condamne le meilleur
// exemple du dépôt mesure le mauvais objet. La règle A est mécanique et
// couvre 100 % du CSS ; la règle B reste chirurgicale.
//
// CE QUI RESTE NON COUVERT (dit explicitement) : le mouvement piloté en JS
// (Web Animations API, `requestAnimationFrame`, `scrollTo({behavior:'smooth'})`).
// Aucun n'existe aujourd'hui dans l'app ; le jour où il en apparaît un, il
// devra lire `matchMedia('(prefers-reduced-motion: reduce)')` — comme le fait
// déjà `useSwap` (components/useSwap.ts).
// ============================================================================

const VISUALS_DIR = dirname(fileURLToPath(import.meta.url));
const SECTIONS_FILE = join(VISUALS_DIR, '..', '..', 'features', 'fachwissen', 'visualSections.tsx');
const INDEX_CSS = join(VISUALS_DIR, '..', '..', 'styles', 'index.css');

function sourceFiles(): { path: string; content: string }[] {
  const files = readdirSync(VISUALS_DIR)
    .filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx'))
    .map((f) => join(VISUALS_DIR, f));
  files.push(SECTIONS_FILE);
  return files.map((path) => ({ path, content: readFileSync(path, 'utf-8') }));
}

/** Bloc `@media (prefers-reduced-motion: reduce) { … }` contenant le sélecteur donné. */
function reducedMotionBlock(css: string, selectorHint: string): string {
  const blocks = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{[\s\S]*?\n\}/g) ?? [];
  return blocks.find((b) => b.includes(selectorHint)) ?? '';
}

describe('Règle A — la garde globale de index.css est le contrat de l’app', () => {
  const css = readFileSync(INDEX_CSS, 'utf-8');
  const guard = reducedMotionBlock(css, '*, *::before, *::after');

  it('la garde globale existe', () => {
    expect(guard).not.toBe('');
  });

  // Les quatre propriétés : deux durées ET deux délais. Le délai est le trou
  // qui a produit un clignotement en production — il ne doit jamais revenir.
  it.each([
    ['animation-duration'],
    ['animation-delay'],
    ['transition-duration'],
    ['transition-delay'],
  ])('neutralise %s avec !important', (prop) => {
    expect(guard).toMatch(new RegExp(`${prop}:\\s*[^;]*!important`));
  });

  it('neutralise aussi les ::view-transition-* — la garde en `*` ne les atteint pas', () => {
    const vt = reducedMotionBlock(css, '::view-transition');
    expect(vt).toMatch(/::view-transition-old\(\*\)/);
    expect(vt).toMatch(/::view-transition-new\(\*\)/);
    expect(vt).toMatch(/animation:\s*none\s*!important/);
  });
});

/** Classe Tailwind `transition-*`/`animate-*` NON précédée de `motion-safe:`
 *  ou `motion-reduce:` (les deux neutralisent le mouvement par défaut). */
const BARE_MOTION_CLASS = /(?<!motion-safe:)(?<!motion-reduce:)\b(transition|animate)-[a-z]+/g;

describe('Règle B — visuels SVG : mouvement structurel, donc jamais inconditionnel', () => {
  it('aucune classe transition-*/animate-* sans préfixe motion-safe:/motion-reduce: dans components/visuals', () => {
    const offenders: string[] = [];
    for (const { path, content } of sourceFiles()) {
      const matches = content.match(BARE_MOTION_CLASS);
      if (matches) offenders.push(`${path}: ${matches.join(', ')}`);
    }
    expect(offenders).toEqual([]);
  });
});
