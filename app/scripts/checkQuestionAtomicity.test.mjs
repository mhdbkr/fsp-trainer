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
const cases = join(here, '../src/data/seedCases.ts');
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

// --- Décision Q11 : l'Oberarzt enchaîne, c'est fidèle -----------------------
test('règle A — une salve d\'Oberarzt n\'est PAS un constat d\'atomicité', T, () => {
  const r = withMutation(cases,
    "'Welche Komplikationen der Leberzirrhose kennen Sie?',",
    "'Welche Komplikationen der Leberzirrhose kennen Sie? Welche zuerst? Warum?',",
    () => gate('--rule', 'A', '--report'));
  assert.doesNotMatch(r.stdout, /oberarzt/, 'en examen reel un senior enchaine ses questions');
});

test('règle D — au-delà de trois interrogations, la salve est incohérente → rouge', T, () => {
  const r = withMutation(cases,
    "'Welche Komplikationen der Leberzirrhose kennen Sie?',",
    "'Welche Komplikationen der Leberzirrhose kennen Sie? Welche zuerst? Warum? Was bedeutet „Aszites“?',",
    gate);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /règle D/);
  assert.match(r.stdout, /case-leberzirrhose/);
});

// Le budget DESCEND : corriger un énoncé fait baisser le compteur et la porte
// le dit. Sans cette preuve on ne sait que la moitié de la règle 4 — qu'elle
// refuse de remonter, pas qu'elle enregistre un gain.
test('règle 4 — corriger un énoncé fait BAISSER le compteur, et la porte l\'annonce', T, () => {
  const r = withMutation(probes,
    "frage: 'Haben Sie ein Nitrospray benutzt? Hat es geholfen?'",
    "frage: 'Haben Sie ein Nitrospray benutzt?'",
    gate);
  assert.equal(r.status, 0, 'un compteur qui baisse ne casse jamais la porte');
  assert.match(r.stdout, /Budget entamé : A −1/);
});
