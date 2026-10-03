import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Contrat simulation-run §0 Q7 / §9.1 : aucune transition NOUVELLE dans
// `features/simulation` — même préfixée `motion-safe:` — tant que le périmètre
// de `motionSafe.test.ts` n'est pas tranché. Le plafond de chaque fichier est
// son compte sur `main` : on peut en retirer, jamais en ajouter.
const DIR = dirname(fileURLToPath(import.meta.url));
const PLAFOND_MAIN: Record<string, number> = {
  'AnamneseBogen.tsx': 0,     // M5
  'SimulationSetup.tsx': 2,   // re-revue mineur 5 : `PartnerChoice` en ajoutait une
};

describe('aucune transition nouvelle dans features/simulation', () => {
  for (const [f, max] of Object.entries(PLAFOND_MAIN)) {
    it(`${f} : au plus ${max} (compte sur main)`, () => {
      const src = readFileSync(join(DIR, f), 'utf-8');
      expect((src.match(/\b(transition|animate)-[a-z]+/g) ?? []).length).toBeLessThanOrEqual(max);
    });
  }
});
