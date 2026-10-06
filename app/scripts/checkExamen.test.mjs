// node --test scripts/checkExamen.test.mjs — le validateur rougit sur chacune de ses trois règles, et laisse passer le sain.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { AIDES, verifie } from './checkExamen.mjs';

test('règle 1 : chaque aide de la liste est refusée, en import statique comme dynamique', () => {
  for (const a of AIDES) assert.equal(verifie('x.tsx', `import { X } from '@/features/simulation/${a}';`).length, 1, a);
  assert.equal(verifie('x.tsx', "const m = await import('@/features/simulation/AnamneseGuide');").length, 1);
});

test('règle 2 : une durée en dur hors de plan.ts', () => {
  assert.equal(verifie('ExamenRunner.tsx', 'const cible = 20 * 60;').length, 1);
  assert.equal(verifie('vues.tsx', 'if (reste > 1200) {}').length, 1);
  assert.equal(verifie('ExamenRunner.tsx', 'const aufk = 5 * 60_000;').length, 1);
  assert.equal(verifie('ExamenRunner.tsx', 'setTimeout(fin, 15 * 60 * 1000);').length, 1);
  assert.equal(verifie('ExamenRunner.tsx', 'if (reste <= 300) alerte();').length, 1);
  assert.equal(verifie('ExamenRunner.tsx', 'const ms = 900_000;').length, 1);
  assert.deepEqual(verifie('plan.ts', 'targetSec: 20 * 60,'), []);
  assert.deepEqual(verifie('vues.tsx', "className='text-slate-300 dark:border-signal-600'"), [], 'une nuance Tailwind n’est pas une durée');
  assert.deepEqual(verifie('horloge.ts', '  /** en secondes : 300, 60 */'), [], 'un commentaire n’est pas une durée');
});

test('règle 3 : une relance externe', () => {
  assert.equal(verifie('x.ts', 'new Notification("Examen")').length, 1);
  assert.equal(verifie('x.ts', 'location.href = "mailto:a@b.c"').length, 1);
});

test('le partenaire IA est permis, l’IA externe comme aide ne l’est pas', () => {
  assert.deepEqual(verifie('x.tsx', "import { TeilAiLauncher } from '@/features/simulation/ai/TeilAiLauncher';"), []);
  assert.equal(verifie('x.tsx', "import { ExternalAiSheet } from '@/features/simulation/ExternalAiSheet';").length, 1);
});

test('le sain passe, et le dépôt est propre (code de sortie 0)', () => {
  assert.deepEqual(verifie('x.tsx', "import { PartEvaluation } from '@/features/simulation/PartEvaluation';\nconst r = cible * 1000;"), []);
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('./checkExamen.mjs', import.meta.url))], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
