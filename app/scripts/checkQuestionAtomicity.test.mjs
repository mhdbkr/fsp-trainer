// Test de MUTATION du budget dégressif (audit série 3 §6.4, règle 4) : la
// porte doit échouer dès qu'un compteur REMONTE, et tenir la distinction
// `fach-kardio-ausstrahlung` (irradiation : l'énumération EST la question) /
// `fach-ortho-durchblutung` (le cas sait si c'est la main ou le pied).
// Sans ce test, un budget régénéré à l'aveugle avalerait la régression.
// Usage : node --test scripts/checkQuestionAtomicity.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const gate = (...args) => spawnSync(process.execPath, [join(here, 'checkQuestionAtomicity.mjs'), ...args], { encoding: 'utf8' });
const withMutation = (file, from, to, fn) => {
  const before = readFileSync(file, 'utf8');
  assert.ok(before.includes(from), `ancre introuvable : ${from}`);
  try { writeFileSync(file, before.replace(from, to)); return fn(); } finally { writeFileSync(file, before); }
};
const probes = join(here, '../src/data/guides/anamneseProbes.ts');
const budget = join(here, 'fixtures/atomicity-budget.json');
const T = { timeout: 300_000 };

test('budget intact → porte verte', T, () => assert.equal(gate().status, 0));

test('règle A — une sonde qui gagne un « ? » fait remonter le compteur → rouge', T, () => {
  const r = withMutation(probes,
    "frage: 'Haben Sie einen Hausarzt?'",
    "frage: 'Haben Sie einen Hausarzt? Wie heißt er?'",
    gate);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /règle A/);
});

test('règle C — l\'alternative binaire du cas est refusée…', T, () => {
  const r = gate('--rule', 'C', '--report');
  assert.match(r.stdout, /fach-ortho-durchblutung/, 'la main OU le pied : le cas le sait, c\'est un trou');
  assert.match(r.stdout, /fach-ortho-belastung/);
});

test('…et l\'énumération d\'irradiation ne l\'est PAS', T, () => {
  const r = gate('--rule', 'C', '--report');
  assert.doesNotMatch(r.stdout, /fach-kardio-ausstrahlung/, 'les quatre territoires d\'irradiation SONT la question');
  assert.doesNotMatch(r.stdout, /fach-uro-flanke/, 'exemption nominative relue (ALLOWED_COMPOSED)');
});

test('règle C — réduire l\'irradiation à deux membres la rend suspecte', T, () => {
  const r = withMutation(probes,
    'Strahlen sie in den linken Arm, den Hals, den Unterkiefer oder den Rücken aus?',
    'Strahlen sie in den linken Arm oder den Rücken aus?',
    () => gate('--rule', 'C', '--report'));
  assert.match(r.stdout, /fach-kardio-ausstrahlung/, 'deux membres = alternative binaire, plus une énumération');
});

test('budget abaissé à la main → rouge (il ne se contourne pas)', T, () => {
  const b = JSON.parse(readFileSync(budget, 'utf8'));
  const r = withMutation(budget, `"A": ${b.budget.A}`, `"A": ${b.budget.A - 1}`, gate);
  assert.equal(r.status, 1);
});
