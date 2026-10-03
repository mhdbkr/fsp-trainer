// Test de MUTATION de la couverture des sondes (lot L0, revue mécanique I3) :
// `fachSkip` ne dispense d'aucune réponse, et chacun de ses ids appartient à
// la Fachanamnese que le cas joue. Mutations sur une COPIE de travail.
// Usage : node --test scripts/checkProbeCoverage.test.mjs
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { sandbox } from './mutationSandbox.mjs';

const sb = sandbox();
after(() => sb.dispose());
const gate = () => sb.run('checkProbeCoverage.mjs');
const CASES = 'src/data/seedCases.ts';
const T = { timeout: 120_000 };
const SKIP = "fachSkip: ['fach-derma-muttermal', 'fach-derma-verlauf'],"; // case-erysipel

test('corpus intact → vert', T, () => assert.equal(gate().status, 0));

test('fachSkip : un id inexistant → rouge', T, () => {
  const r = sb.mutate(CASES, SKIP, "fachSkip: ['fach-derma-muttermal', 'fach-derma-inexistant'],", gate);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /fach-derma-inexistant/);
});

test('fachSkip : un id d’une autre Fach que celle jouée → rouge', T, () => {
  const r = sb.mutate(CASES, SKIP, "fachSkip: ['fach-derma-muttermal', 'fach-kardio-nitro'],", gate);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /fach-kardio-nitro/);
});

test('fachSkip ne dispense pas de la réponse : la retirer → rouge', T, () => {
  const r = sb.mutate(CASES,
    "'fach-derma-muttermal': 'Nein, an meinen Muttermalen hat sich nichts verändert, keines blutet oder juckt. Beim Hautarzt war ich allerdings noch nie.'",
    "'x-retire': ''", gate);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /fach-derma-muttermal/);
});
