// Test de MUTATION de `checkGuideDuplicates` (règle 2) : une même part dans deux chapitres n'est tolérée que si elle
// déclare partout le même signe (r2 n'en pose qu'une) ; un signe différent, et la répétition redevient un doublon.
// Usage : node --test scripts/checkGuideDuplicates.test.mjs
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { sandbox } from './mutationSandbox.mjs';

const sb = sandbox();
after(() => sb.dispose());
const gate = () => sb.run('checkGuideDuplicates.mjs');
const guide = 'src/data/guides/anamneseChapters.ts';

test('guide intact → porte verte', { timeout: 120_000 }, () => {
  assert.equal(gate().status, 0);
});

test('K4 — la même part sous un AUTRE signe dans un second chapitre → porte rouge', { timeout: 120_000 }, () => {
  const r = sb.mutate(guide,
    "{ sucht: ['stuhl'], text: 'Haben Sie Probleme mit dem Stuhlgang?' },\n          { sucht: ['begleit']",
    "{ sucht: ['miktion'], text: 'Haben Sie Probleme mit dem Stuhlgang?' },\n          { sucht: ['begleit']", gate);
  assert.equal(r.status, 1, 'la porte aurait dû échouer');
  assert.match(r.stdout, /question répétée .*Probleme mit dem Stuhlgang/);
});
