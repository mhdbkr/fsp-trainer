// Test de MUTATION du budget dégressif (audit série 3 §6.4, règle 4) : la
// porte doit échouer dès qu'un compteur REMONTE, et tenir la distinction
// `fach-kardio-ausstrahlung` (irradiation : l'énumération EST la question) /
// `fach-ortho-durchblutung` (le cas sait si c'est la main ou le pied).
// Sans ce test, un budget régénéré à l'aveugle avalerait la régression.
// Toutes les mutations s'appliquent à une COPIE de travail (M2).
// Usage : node --test scripts/checkQuestionAtomicity.test.mjs
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { sandbox } from './mutationSandbox.mjs';

const sb = sandbox();
after(() => sb.dispose());
const gate = (...args) => sb.run('checkQuestionAtomicity.mjs', ...args);
const PROBES = 'src/data/guides/anamneseProbes.ts';
const BUDGET = 'scripts/fixtures/atomicity-budget.json';
const CASES = 'src/data/seedCases.ts';
const T = { timeout: 300_000 };

test('budget intact → porte verte', T, () => assert.equal(gate().status, 0));

test('règle A — une sonde qui gagne un « ? » fait remonter le compteur → rouge', T, () => {
  const r = sb.mutate(PROBES,
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
});

// Contrat §3.3 : c'est le VERBE d'irradiation qui exempte, pas l'id. Sans lui,
// la même paire bras/jambe redevient une alternative que le cas tranche.
test('règle C — sans verbe d\'irradiation, « Arm oder Bein » est refusé', T, () => {
  const r = sb.mutate(PROBES,
    'Strahlen sie in den linken Arm, den Hals, den Unterkiefer oder den Rücken aus?',
    'Haben Sie Schmerzen im linken Arm oder im Bein?',
    () => gate('--rule', 'C', '--report'));
  assert.match(r.stdout, /fach-kardio-ausstrahlung/);
});

test('budget abaissé à la main → rouge (il ne se contourne pas)', T, () => {
  const b = JSON.parse(sb.read(BUDGET));
  const r = sb.mutate(BUDGET, `"A": ${b.budget.A}`, `"A": ${b.budget.A - 1}`, gate);
  assert.equal(r.status, 1);
});

// --- Décision Q11 : l'Oberarzt enchaîne, c'est fidèle -----------------------
test('règle A — une salve d\'Oberarzt n\'est PAS un constat d\'atomicité', T, () => {
  const r = sb.mutate(CASES,
    "'Welche Komplikationen der Leberzirrhose kennen Sie?',",
    "'Welche Komplikationen der Leberzirrhose kennen Sie? Welche zuerst? Warum?',",
    () => gate('--rule', 'A', '--report'));
  assert.doesNotMatch(r.stdout, /oberarzt/, 'en examen reel un senior enchaine ses questions');
});

test('règle D — au-delà de trois interrogations, la salve est incohérente → rouge', T, () => {
  const r = sb.mutate(CASES,
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
  const r = sb.mutate(PROBES,
    "frage: 'Haben Sie ein Nitrospray benutzt? Hat es geholfen?'",
    "frage: 'Haben Sie ein Nitrospray benutzt?'",
    gate);
  assert.equal(r.status, 0, 'un compteur qui baisse ne casse jamais la porte');
  assert.match(r.stdout, /Budget entamé : A −1/);
});

// --- Revue série 3 : les contournements du budget (I1–I4, I7–I8, D1) -------
const SCRIPT = 'scripts/checkQuestionAtomicity.mjs';

test('I1 — une exemption nominative ajoutée fait échouer la porte (Q12)', T, () => {
  const r = sb.mutate(SCRIPT,
    'const ALLOWED_COMPOSED = {',
    "const ALLOWED_COMPOSED = {\n  'fach-ortho-durchblutung': 'porte dérobée',",
    gate);
  assert.equal(r.status, 1, 'la liste ne grossit pas sans décision de la direction');
  assert.match(r.stdout, /exemption/);
});

test('I2 — une clé retirée du fixture ne désactive pas sa règle', T, () => {
  const b = JSON.parse(sb.read(BUDGET));
  const r = sb.mutate(BUDGET, `"C": ${b.budget.C},`, '', gate);
  assert.notEqual(r.status, 0, 'budget incomplet = porte fermée, jamais NaN > 0 = faux');
  assert.match(r.stdout + r.stderr, /\bC\b/);
});

test('I3 — --bless refuse de graver une hausse, et laisse le fixture intact', T, () => {
  const before = sb.read(BUDGET);
  sb.mutate(BUDGET, '"budget"', '"budget"', () => {
    const r = sb.mutate(PROBES,
      "frage: 'Haben Sie einen Hausarzt?'",
      "frage: 'Haben Sie einen Hausarzt? Wie heißt er?'",
      () => gate('--bless'));
    assert.equal(r.status, 1, '--bless ne fait jamais remonter le budget');
    assert.equal(sb.read(BUDGET), before);
  });
});

test('I4 — une réplique qui n\'existe que dans la TRAME JOUÉE est comptée', T, () => {
  // Reformulation de fach-uro-funktion pour une patiente : absente du
  // catalogue, elle ne s'affiche que dans la trame du cas.
  const r = sb.mutate('src/data/guides/anamneseChapters.ts',
    "'Haben Sie Schmerzen oder Blutungen beim oder nach dem Geschlechtsverkehr?'",
    "'Haben Sie Schmerzen oder Blutungen beim oder nach dem Geschlechtsverkehr? Seit wann?'",
    gate);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /règle A/);
});

test('D1 — une salve d\'Oberarzt à deux « ? » est comptée (D2) et ne remonte pas', T, () => {
  const r = sb.mutate(CASES,
    "'Welche Komplikationen der Leberzirrhose kennen Sie?',",
    "'Welche Komplikationen der Leberzirrhose kennen Sie? Welche zuerst?',",
    gate);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /règle D2/);
});

test('D1 — les « ? » cités entre guillemets ne sont pas des interrogations', T, () => {
  const r = sb.mutate(CASES,
    "'Welche Komplikationen der Leberzirrhose kennen Sie?',",
    "'Der Patient fragt: „Habe ich Krebs? Muss ich sterben? Wie lange noch?“ Was antworten Sie?',",
    gate);
  assert.equal(r.status, 0, 'une seule interrogation de l\'examinateur');
});

test('I7 — la salve à trois de case-reizdarm est comptée (D3)', T, () => {
  const r = gate('--rule', 'D3', '--report');
  assert.match(r.stdout, /case-reizdarm/);
});

// INV-42 : test de discrimination obligatoire (contrat frage-atomique §3.3).
test('I8 — INV-42 : les alternatives de membre échouent, l\'irradiation et la topographie passent', T, () => {
  const out = gate('--rule', 'C', '--report').stdout;
  for (const id of ['fach-ortho-durchblutung', 'fach-ortho-belastung', 'fach-neuro-kraft', 'fach-ortho-sensomotorik']) assert.match(out, new RegExp(id), `${id} : le cas sait quel membre`);
  for (const id of ['fach-kardio-ausstrahlung', 'fach-uro-flanke', 'fach-ortho-ausstrahlung', 'case-cholezystitis', 'case-erysipel']) assert.doesNotMatch(out, new RegExp(id), `${id} : la topographie EST la question`);
});

test('I8 — la variante résolue par le cas n\'est plus une alternative', T, () => {
  const r = sb.mutate(PROBES,
    "frage: 'Ist ein Arm oder Bein schwächer geworden?",
    "frage: 'Ist der Arm schwächer geworden?",
    () => gate('--rule', 'C', '--report'));
  assert.doesNotMatch(r.stdout, /sondes \(fach-neuro-kraft\)/);
});

// --- Re-revue : quatrième contournement et resserrages ----------------------
test('I-1 — les guillemets ne masquent une interrogation que chez l\'Oberarzt', T, () => {
  const r = sb.mutate(PROBES,
    "frage: 'Haben Sie einen Hausarzt?'",
    "frage: '„Wie groß sind Sie?“ Wie viel wiegen Sie?'",
    gate);
  assert.equal(r.status, 1, 'une réplique du candidat à deux « ? » reste un constat A, guillemets ou non');
  assert.match(r.stdout, /règle A/);
});

test('m-3 — « anziehen » n\'est pas un verbe d\'irradiation', T, () => {
  const r = sb.mutate(PROBES,
    "frage: 'Ist ein Arm oder Bein schwächer geworden?",
    "frage: 'Können Sie sich mit einem Arm oder Bein schlechter anziehen?",
    () => gate('--rule', 'C', '--report'));
  assert.match(r.stdout, /sondes \(fach-neuro-kraft\)/);
});

test('7c — le « ？ » pleine chasse compte comme un « ? »', T, () => {
  const r = sb.mutate(PROBES,
    "frage: 'Haben Sie einen Hausarzt?'",
    "frage: 'Haben Sie einen Hausarzt？ Wie heißt er？'",
    gate);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /règle A/);
});
