import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Contrat simulation-run §0 Q7 / §9.1 : aucune transition NOUVELLE dans
// `features/simulation` tant que le périmètre de `motionSafe.test.ts` n'est
// pas tranché. Le Muster-Bogen n'en avait aucune sur `main` (M5).
const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'AnamneseBogen.tsx'), 'utf-8');

describe('M5 — AnamneseBogen reste sans mouvement', () => {
  it('aucune classe transition-*/animate-*, préfixée ou non', () => {
    expect(src.match(/\b(transition|animate)-[a-z]+/g)).toBeNull();
  });
});
