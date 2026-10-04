// Tests de la règle « la fiche répond à la question du cas » (série 3, lot Q2).
// 1) fonction pure sur fixtures ; 2) la porte sur les données réelles (le
// compteur ne dépasse pas le fixture) ; 3) mutations en bac à sable.
// Usage : node --test scripts/checkCaseQuestionAnswers.test.mjs
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findUnanswered } from './caseQuestionAnswersDetect.mjs';
import { sandbox } from './mutationSandbox.mjs';

const T = { timeout: 300_000 };
const FIX = 'scripts/fixtures/case-question-answers.json';
// Un corpus de 6 fiches : « Schmerzen » est partout (non distinctif), « Stent » nulle part ailleurs.
const generic = (i) => ({ id: `g${i}`, sheet: { leitsymptome: ['Schmerzen in der Brust, Schmerzen im Arm'] }, questions: [] });
const withCase = (c) => [generic(1), generic(2), generic(3), generic(4), generic(5), c];
const kase = (sheet, questions) => ({ id: 'c', sheet, questions });

test('un mot distinctif absent de la fiche → candidat', () => {
  const r = findUnanswered(withCase(kase({ leitsymptome: ['Schmerzen in der Brust'] }, [{ frage: 'Wurde ein Stent gesetzt?' }])));
  assert.equal(r.candidates.length, 1);
  assert.deepEqual(r.candidates[0].words, ['Stent']);
});

test('le mot distinctif présent dans la fiche → répondu (racine de 5 lettres)', () => {
  const r = findUnanswered(withCase(kase({ vorerkrankungen: ['Stents in beiden Herzkranzgefäßen'] }, [{ frage: 'Wurde ein Stent gesetzt?' }])));
  assert.equal(r.candidates.length, 0);
});

test('un mot générique (dans > 20 % des fiches) ne prouve rien : question non jugeable, pas trouée', () => {
  const r = findUnanswered(withCase(kase({ leitsymptome: ['Schmerzen'] }, [{ frage: 'Wie stark sind die Schmerzen?' }])));
  assert.equal(r.candidates.length, 0);
  assert.equal(r.unjudged, 1);
});

test('la relance compte avec la question', () => {
  const sheet = { vorerkrankungen: ['Stent 2019'] };
  const r = findUnanswered(withCase(kase(sheet, [{ frage: 'Hatten Sie Beschwerden?', followUp: 'Falls ja: Wurde ein Stent gesetzt?' }])));
  assert.equal(r.candidates.length, 0);
});

test('frageAntworten au texte exact de la question → champ explicite, répondu', () => {
  const frage = 'Wurde ein Stent gesetzt?';
  const r = findUnanswered(withCase(kase({ frageAntworten: [{ frage, antwort: 'Nein.' }] }, [{ frage }])));
  assert.equal(r.candidates.length, 0);
  const r2 = findUnanswered(withCase(kase({ frageAntworten: [{ frage: 'Autre chose', antwort: 'Nein.' }] }, [{ frage }])));
  assert.equal(r2.candidates.length, 1, 'une entrée au texte différent ne pointe pas');
});

test('la persona (consigne de jeu) n\'est pas une réponse', () => {
  const r = findUnanswered(withCase(kase({ persona: 'Il a un Stent.' }, [{ frage: 'Wurde ein Stent gesetzt?' }])));
  assert.equal(r.candidates.length, 1);
});

test('porte sur les données réelles : le compteur ne dépasse pas le fixture', T, () => {
  const sb = sandbox();
  try {
    const r = sb.run('checkCaseQuestionAnswers.mjs');
    assert.equal(r.status, 0, r.stderr);
    const budget = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', FIX), 'utf8')).budget.candidats;
    const n = Number(r.stdout.match(/: (\d+) candidat/)?.[1]);
    assert.ok(Number.isInteger(n), r.stdout);
    assert.ok(n <= budget, `${n} candidats > plancher ${budget} : ${r.stdout}`);
    assert.doesNotMatch(r.stdout, /⚠/);
  } finally { sb.dispose(); }
});

test('mutation — une question du cas dont la fiche ne dit rien fait monter le compteur ; frageAntworten la résout', T, () => {
  const sb = sandbox();
  try {
    const count = (r) => Number(r.stdout.match(/: (\d+) candidat/)[1]);
    const base = count(sb.run('checkCaseQuestionAnswers.mjs'));
    const anchor = "caseSpecificQuestions: [";
    const q = 'Haben Sie Ihre Zahnprothese verloren?';
    const mutated = sb.mutate('src/data/seedCases.ts', anchor, `${anchor}\n      '${q}',`, () => sb.run('checkCaseQuestionAnswers.mjs'));
    assert.equal(mutated.status, 0, 'informatif : sortie 0');
    assert.equal(count(mutated), base + 1);
    assert.match(mutated.stdout, /⚠/);
    const blessed = sb.mutate('src/data/seedCases.ts', anchor, `${anchor}\n      '${q}',`, () => sb.run('checkCaseQuestionAnswers.mjs', '--bless'));
    assert.equal(blessed.status, 1, '--bless refuse une hausse');
  } finally { sb.dispose(); }
});
