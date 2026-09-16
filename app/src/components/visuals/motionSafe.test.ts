import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ============================================================================
// AC-12 : toute transition/animation d'un composant visuel doit être sous
// `motion-safe:` (ou neutralisée par `motion-reduce:`) — jamais de mouvement
// inconditionnel (contrat §6, prefers-reduced-motion). Audit statique par
// grep sur les fichiers sources : la mesure navigateur réelle (getComputedStyle
// sous prefers-reduced-motion) reste à l'étape 5 (T9).
// ============================================================================

const VISUALS_DIR = dirname(fileURLToPath(import.meta.url));
const SECTIONS_FILE = join(VISUALS_DIR, '..', '..', 'features', 'fachwissen', 'visualSections.tsx');

function sourceFiles(): { path: string; content: string }[] {
  const files = readdirSync(VISUALS_DIR)
    .filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx'))
    .map((f) => join(VISUALS_DIR, f));
  files.push(SECTIONS_FILE);
  return files.map((path) => ({ path, content: readFileSync(path, 'utf-8') }));
}

/** Classe Tailwind `transition-*`/`animate-*` NON précédée de `motion-safe:`
 *  ou `motion-reduce:` (les deux neutralisent le mouvement par défaut). */
const BARE_MOTION_CLASS = /(?<!motion-safe:)(?<!motion-reduce:)\b(transition|animate)-[a-z]+/g;

describe('AC-12 — mouvement toujours conditionné à prefers-reduced-motion', () => {
  it('aucune classe transition-*/animate-* sans préfixe motion-safe:/motion-reduce:', () => {
    const offenders: string[] = [];
    for (const { path, content } of sourceFiles()) {
      const matches = content.match(BARE_MOTION_CLASS);
      if (matches) offenders.push(`${path}: ${matches.join(', ')}`);
    }
    expect(offenders).toEqual([]);
  });
});
