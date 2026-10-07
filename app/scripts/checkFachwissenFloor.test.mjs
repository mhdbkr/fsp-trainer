// node --test scripts/checkFachwissenFloor.test.mjs — le plancher rougit sur chacune de ses trois règles, et laisse passer le sain.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { EXPLICATION, MIN_ASKED, mesure, questionMalFormee, verdict } from './checkFachwissenFloor.mjs';

const q = (frage) => ({ frage, antwort: 'x' });
const fw = (id, fragen) => ({ id, askedInExam: fragen.map(q) });
const sain = fw('fw-sain', ['A?', 'B?', 'C?', 'D?', 'Wie erklären Sie dem Patienten die Erkrankung?']);
const budget = { sansExplication: 0, questionsMalFormees: 0 };

test('règle 1 : moins de MIN_ASKED questions → rouge, quel que soit le budget', () => {
  const m = mesure([fw('fw-court', ['A?', 'Wie erklären Sie das?'])], []);
  assert.equal(m.sousPlancher.length, 1);
  assert.equal(verdict(m, { sansExplication: 99, questionsMalFormees: 99 }).length, 1);
  assert.equal(MIN_ASKED, 5);
});

test('règle 2 : l’explication au patient est reconnue sous ses formes usuelles, et son absence compte au budget', () => {
  for (const f of ['Wie erklären Sie der Patientin die Diagnose?', 'Erklären Sie es in einfachen Worten.', 'Wie sagen Sie es ohne Fachbegriffe?', 'Wie teilen Sie dem Patienten die Diagnose mit?']) assert.ok(EXPLICATION.test(f), f);
  assert.ok(!EXPLICATION.test('Wann operieren Sie?'));
  const m = mesure([fw('fw-muet', ['A?', 'B?', 'C?', 'D?', 'E?'])], []);
  assert.equal(verdict(m, budget).length, 1);
  assert.deepEqual(verdict(m, { sansExplication: 1, questionsMalFormees: 0 }), []);
});

test('règle 3 : examinerQuestions sans « ? » ou de moins de 4 mots', () => {
  assert.ok(questionMalFormee('Wann operieren?'));
  assert.ok(questionMalFormee('Wann operieren Sie?'));
  assert.ok(questionMalFormee('Nennen Sie die Alarmsymptome.'));
  assert.ok(!questionMalFormee('Wann operieren Sie die Patientin?'));
  const m = mesure([sain], [{ id: 'case-x', examinerQuestions: ['Akuttherapie?'] }]);
  assert.equal(verdict(m, budget).length, 1);
});

test('le sain passe, et le corpus tient son budget (code de sortie 0)', () => {
  assert.deepEqual(verdict(mesure([sain], [{ id: 'case-x', examinerQuestions: ['Wie sieht die Akuttherapie aus?'] }]), budget), []);
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('./checkFachwissenFloor.mjs', import.meta.url))], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
