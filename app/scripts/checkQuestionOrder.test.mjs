// Test du détecteur de présupposition (série 3, lot Q0) : les 8 fautes de
// l'audit « questions du cas » (§4) sont TOUTES détectées (fixtures de textes réels),
// aucun contrôle ne produit de candidat. Lot Q1 : ces 8 fautes sont corrigées dans les
// données, la porte réelle garantit qu'elles ne reviennent pas.
// Mutations sur une COPIE de travail (mutationSandbox).
// Usage : node --test scripts/checkQuestionOrder.test.mjs
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
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
// Lot Q1 : les 8 fautes de l'audit sont CORRIGÉES dans les données ; la preuve que le
// détecteur les voit vit dans les fixtures (textes réels, ci-dessus). Sur les données
// réelles, la porte garde le rôle inverse : une faute corrigée ne revient pas.
const lastWord = (hit) => hit.split(' ').at(-1);
const reappears = (stdout, c) => stdout.split('\n').some((l) => l.startsWith(`  · ${c.id} `) && l.includes(lastWord(c.hit)));

test('données réelles : sort 0 (informative), les 8 fautes corrigées au lot Q1 ne reviennent pas', T, () => {
  const r = run();
  assert.equal(r.status, 0);
  assert.deepEqual(fx.cases.filter((c) => reappears(r.stdout, c)).map((c) => c.id), []);
});

// Mutations sur les fixtures : un script jetable, écrit DANS la copie de travail, rejoue le
// détecteur muté sur les 8 textes réels et rend les cas non détectés.
const FX = 'scripts/_undetected.mjs';
writeFileSync(sb.path(FX), `
  import { readFileSync } from 'node:fs';
  import { detect, trameWords } from './questionOrderDetect.mjs';
  const fx = JSON.parse(readFileSync(new URL('./fixtures/question-order-presuppositions.json', import.meta.url), 'utf8'));
  const trame = trameWords(fx.trame);
  console.log(JSON.stringify(fx.cases.filter((c) => !detect(c, trame).some((h) => h.rule === c.rule && h.hit === c.hit)).map((c) => c.id)));
`);
const undetected = () => JSON.parse(sb.run('_undetected.mjs').stdout);

test('sans mutation, les 8 sont détectées', T, () => assert.deepEqual(undetected(), []));

test('mutation — sans la règle « affirmation en tête », Tamsulosin et Magenschutz passent', T, () => {
  assert.deepEqual(sb.mutate(DETECT, 'if (ASSERT.test(t.q) &&', 'if (false &&', undetected), ['case-prostatakarzinom', 'case-achalasie']);
});

test('mutation — sans adjectifs ni ordinal, « den zweiten Stock » et « das mit dem Burnout » passent', T, () => {
  const missed = sb.mutate(DETECT, '(?:[a-zäöü][a-zäöüß]+\\s+){0,2}', '', () =>
    sb.mutate(DETECT, 'for (const m of t.q.matchAll(ORD))', 'for (const m of [])', undetected));
  assert.deepEqual(missed, ['case-coxarthrose', 'case-covid19']);
});

test('mutation — sans l\'exclusion des mots de la trame, le bruit monte', T, () => {
  const count = (o) => Number(/(\d+) candidat/.exec(o)[1]);
  const base = count(run().stdout);
  const noisy = count(sb.mutate(DETECT, '|| trame.has(full(m[1]))', '', run).stdout);
  assert.ok(noisy > base, `${noisy} > ${base}`);
});
