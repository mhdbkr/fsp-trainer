import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// ============================================================================
// M-2 : test négatif du validateur mécanique (contrat §5). Le validateur lit
// `src/data/fachwissenVisuals` par défaut ; ce test l'exécute une fois contre
// les VRAIES specs (positif, AC-1/AC-17), une fois contre une fixture à ref
// cassée (négatif, `scripts/fixtures/visuals-broken/`, hors chargement
// normal — ni le validateur par défaut, ni tsc (`tsconfig.json` n'inclut que
// `src`) ne la ramassent).
// ============================================================================

// app/src/data/fachwissenVisuals/checkFachwissenVisuals.test.ts → app/
const APP_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const SCRIPT = join(APP_ROOT, 'scripts', 'checkFachwissenVisuals.mjs');

function run(args: string[]) {
  return execFileSync('node', [SCRIPT, ...args], { cwd: APP_ROOT, encoding: 'utf-8' });
}

// Chaque cas lance un process Node + esbuild sur seedFachwissen.ts (> 1 Mo) :
// quelques secondes sous contention (suite complète, jsdom parallèles). Timeout
// ciblé plutôt que global — le test reste bloquant.
const VALIDATOR_TIMEOUT_MS = 30_000;

describe('checkFachwissenVisuals.mjs', () => {
  it('sort en 0 sur les vraies specs (AC-1 positif)', () => {
    const out = run([]);
    expect(out).toMatch(/^OK \d+ specs \/ \d+ blocs \/ \d+ ergänzt relus/);
  }, VALIDATOR_TIMEOUT_MS);

  it('sort en 1 avec « ref introuvable » sur une fixture à ref cassée (AC-1/AC-17 négatif)', () => {
    let error: (Error & { status?: number; stderr?: Buffer | string }) | undefined;
    try {
      run(['--dir', 'scripts/fixtures/visuals-broken']);
    } catch (err) {
      error = err as Error & { status?: number; stderr?: Buffer | string };
    }
    expect(error).toBeDefined();
    expect(error?.status).toBe(1);
    expect(String(error?.stderr)).toContain('ref introuvable');
  }, VALIDATOR_TIMEOUT_MS);
});
