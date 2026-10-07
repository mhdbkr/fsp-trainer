// node --test scripts/checkFachwissenFloor.test.mjs — le plancher rougit sur chacune de ses règles, et laisse passer le sain.
// Mutation : chaque forme (EXPLICATIONS) et chaque défaut (DEFAUTS) a un échantillon que LUI SEUL reconnaît ;
// retirer une entrée fait rougir son test.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DEFAUTS, EXPLICATIONS, MIN_ASKED, defautQuestion, defautSheet, explique, mesure, questionMalFormee, verdict } from './checkFachwissenFloor.mjs';

const q = (frage) => ({ frage, antwort: 'x' });
const fw = (id, fragen) => ({ id, askedInExam: fragen.map(q) });
const sain = fw('fw-sain', ['A?', 'B?', 'C?', 'D?', 'Wie erklären Sie dem Patienten die Erkrankung?']);
const budget = { sansExplication: 0, questionsMalFormees: 0, sheetMalFormees: 0 };
const large = { sansExplication: 99, questionsMalFormees: 99, sheetMalFormees: 99 };

test('règle 1 : moins de MIN_ASKED questions → rouge, quel que soit le budget', () => {
  const m = mesure([fw('fw-court', ['A?', 'Wie erklären Sie das?'])], []);
  assert.equal(m.sousPlancher.length, 1);
  assert.equal(verdict(m, large).length, 1);
  assert.equal(MIN_ASKED, 5);
});

// Un échantillon par forme, dans l'ordre d'EXPLICATIONS : chacun n'est reconnu QUE par la sienne.
const FORMES = [
  'Wie erklären Sie der Patientin die Diagnose?',
  'Wie sagen Sie es in einfachen Worten?',
  'Wie sagen Sie es ohne Fachbegriffe?',
  'Wie teilen Sie dem Patienten die Diagnose mit?',
  'Klären Sie den Patienten in zwei Minuten über die Diagnose auf.',
  'Worüber müssen Sie den Patienten vor der Entlassung aufklären?',
  'Die Patientin fragt, ob das ansteckend ist.',
  'Er will nach Hause. Was antworten Sie?',
  'Was sagen Sie der Patientin, um sie zu entlasten?',
  'Könnten Sie der Patientin das Karpaltunnelsyndrom erklären?',
];

test('règle 2 : chaque forme d’explication au patient est reconnue par elle seule (mutation)', () => {
  assert.equal(FORMES.length, EXPLICATIONS.length);
  FORMES.forEach((f, i) => assert.deepEqual(EXPLICATIONS.map((r, j) => [j, r.test(f)]).filter(([, ok]) => ok).map(([j]) => j), [i], f));
});

test('règle 2 : un conseil, une question à l’examinateur ou un « abklären » ne comptent pas', () => {
  for (const f of ['Wann operieren Sie?', 'Was raten Sie dem Patienten nach dem Entzug?', 'Was müssen Sie noch abklären?', 'Wie erklären sich die Beschwerden der Patientin?', 'Können Sie die Operation erklären?']) assert.ok(!explique(f), f);
  const m = mesure([fw('fw-muet', ['A?', 'B?', 'C?', 'D?', 'E?'])], []);
  assert.equal(verdict(m, budget).length, 1);
  assert.deepEqual(verdict(m, { ...budget, sansExplication: 1 }), []);
});

// Un échantillon par défaut, dans l'ordre de DEFAUTS : chacun ne déclenche QUE le sien.
const DEFAUTS_ECHANTILLONS = {
  reponseParenthese: 'Welches Screening-Instrument verwenden Sie? (PHQ-9)',
  reponseUnd: 'Haben Sie andere Differenzialdiagnosen? — Und?',
  motsCourts: 'Wann operieren Sie?',
  versus: 'Was spricht für Adeno- vs. Plattenepithelkarzinom?',
  sansVerbe: 'Welche Diagnostik in welcher Reihenfolge?',
  ponctuation: 'Nennen Sie die kardiovaskulären Risikofaktoren',
};

test('règle 3 : chaque défaut d’examinerQuestion est reconnu par lui seul (mutation)', () => {
  assert.deepEqual(Object.keys(DEFAUTS_ECHANTILLONS), Object.keys(DEFAUTS));
  for (const [k, f] of Object.entries(DEFAUTS_ECHANTILLONS)) assert.deepEqual(Object.keys(DEFAUTS).filter((d) => DEFAUTS[d](f)), [k], f);
});

test('règle 3 : l’impératif complet en « . », la question complète et la glose en milieu de phrase sont valides', () => {
  for (const f of [
    'Nennen Sie die kardiovaskulären Risikofaktoren.',
    'Wie äußert sich ein Alkoholdelir bei diesem Patienten?',
    'Ist das Colon irritabile eine psychosomatische Krankheit?',
    'Was ist der Knöchel-Arm-Index (ABI) und wie interpretieren Sie ihn?',
    'Erklären Sie der Patientin nun Diagnose und Therapie — und beantworten Sie ihre Frage „Kann ich nach Hause?“',
  ]) assert.equal(defautQuestion(f), undefined, f);
  assert.ok(questionMalFormee('Wichtigster Laborwert?'));
  const m = mesure([sain], [{ id: 'case-x', examinerQuestions: ['Akuttherapie?'] }]);
  assert.equal(verdict(m, budget).length, 1);
});

test('règle 4 : examinerSheet — le télégraphique compte, la réplique du patient « (als …) » et la relance commentée non', () => {
  assert.ok(defautSheet('Verdachtsdiagnose und Begründung?'));
  assert.ok(defautSheet('Und die Polyneuropathie?'));
  assert.ok(!defautSheet('(als Patientin) Ist das Krebs?'));
  assert.ok(!defautSheet('Haben Sie andere Differenzialdiagnosen? — Und?'));
  const c = { id: 'case-x', examinerQuestions: [], examinerSheet: [{ title: 'T', interactions: [{ frage: 'Wie behandeln Sie?' }, { frage: '(als Patient) Muss die Brust ab?' }] }] };
  const m = mesure([sain], [c]);
  assert.equal(m.sheetMalFormees.length, 1);
  assert.equal(verdict(m, budget).length, 1);
  assert.deepEqual(verdict(m, { ...budget, sheetMalFormees: 1 }), []);
});

test('le sain passe, et le corpus tient son budget (code de sortie 0)', () => {
  assert.deepEqual(verdict(mesure([sain], [{ id: 'case-x', examinerQuestions: ['Wie sieht die Akuttherapie aus?'] }]), budget), []);
  const r = spawnSync(process.execPath, [fileURLToPath(new URL('./checkFachwissenFloor.mjs', import.meta.url))], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});
