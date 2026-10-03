// Test du détecteur de présupposition (série 3, lot Q0) : les 8 fautes de
// l'audit « questions du cas » (§4) sont TOUTES détectées, aucun contrôle ne
// produit de candidat, et la porte sur les données réelles les retrouve encore.
// Mutations sur une COPIE de travail (mutationSandbox).
// Usage : node --test scripts/checkQuestionOrder.test.mjs
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { detect, trameWords } from './questionOrderDetect.mjs';
import { sandbox } from './mutationSandbox.mjs';

const fx = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/question-order-presuppositions.json', import.meta.url)), 'utf8'));
const trame = trameWords(fx.trame);
const T = { timeout: 300_000 };

for (const c of fx.cases) {
  test(`${c.id} : « ${c.hit} » est détectée (${c.rule})`, () => {
    const hits = detect(c, trame);
    assert.ok(hits.some((h) => h.rule === c.rule && h.hit === c.hit), JSON.stringify(hits));
  });
}

for (const c of fx.controls) {
  test(`contrôle ${c.id} : rien (${c.why})`, () => assert.deepEqual(detect(c, trame), []));
}

const sb = sandbox();
after(() => sb.dispose());
const DETECT = 'scripts/questionOrderDetect.mjs';
const run = () => sb.run('checkQuestionOrder.mjs');
const EIGHT = ['coxarthrose', 'covid19', 'reaktive-arthritis', 'influenza', 'prostatakarzinom', 'achalasie', 'ptbs', 'metabolisches-syndrom'];
const missing = (stdout) => EIGHT.filter((id) => !new RegExp(`· case-${id} `).test(stdout));

test('données réelles : la porte retrouve les 8, sort 0 (informative)', T, () => {
  const r = run();
  assert.equal(r.status, 0);
  assert.deepEqual(missing(r.stdout), []);
});

test('mutation — sans la règle « affirmation en tête », Tamsulosin et Magenschutz passent', T, () => {
  const r = sb.mutate(DETECT, 'if (ASSERT.test(t.q))', 'if (false)', run);
  assert.deepEqual(missing(r.stdout), ['prostatakarzinom', 'achalasie']);
});

test('mutation — sans adjectifs ni ordinal, « den zweiten Stock » passe', T, () => {
  const r = sb.mutate(DETECT, '(?:[a-zäöü][a-zäöüß]+\\s+){0,2}', '', () =>
    sb.mutate(DETECT, 'for (const m of t.q.matchAll(ORD))', 'for (const m of [])', run));
  assert.deepEqual(missing(r.stdout), ['coxarthrose']);
});

test('mutation — sans l\'exclusion des mots de la trame, le bruit monte', T, () => {
  const count = (o) => Number(/(\d+) candidat/.exec(o)[1]);
  const base = count(run().stdout);
  const noisy = count(sb.mutate(DETECT, '|| trame.has(full(m[1]))', '', run).stdout);
  assert.ok(noisy > base, `${noisy} > ${base}`);
});
