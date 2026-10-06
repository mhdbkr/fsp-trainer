// Verrou « face à main » (revue série 3, I3) : aucun compteur des fixtures
// dégressifs ne remonte par rapport à la branche de base, aucune clé ne
// disparaît. `--base-dir` remplace `git show <ref>` pour le test.
// Usage : node --test scripts/checkBudgetFloor.test.mjs
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const REL = ['app/scripts/fixtures/atomicity-budget.json', 'app/scripts/fixtures/trame-symptoms-baseline.json', 'app/scripts/fixtures/fach-nature-pairs.json', 'app/scripts/fixtures/case-question-answers.json', 'app/scripts/fixtures/coherence-budget.json'];
const base = mkdtempSync(join(tmpdir(), 'fsp-floor-'));
after(() => rmSync(base, { recursive: true, force: true }));
const write = (edit = (_rel, j) => j) => {
  for (const rel of REL) {
    const j = JSON.parse(readFileSync(join(here, '..', '..', rel), 'utf8'));
    mkdirSync(dirname(join(base, rel)), { recursive: true });
    writeFileSync(join(base, rel), JSON.stringify(edit(rel, j)));
  }
};
const floor = (...extra) => spawnSync(process.execPath, [join(here, 'checkBudgetFloor.mjs'), '--base-dir', base, ...extra], { encoding: 'utf8' });
// Une TÊTE de branche écrite à la main : `--head-dir` remplace le dépôt, pour mutiler les `hausses`.
const head = mkdtempSync(join(tmpdir(), 'fsp-floor-head-'));
after(() => rmSync(head, { recursive: true, force: true }));
const writeHead = (edit) => {
  for (const rel of REL) {
    const j = JSON.parse(readFileSync(join(here, '..', '..', rel), 'utf8'));
    mkdirSync(dirname(join(head, rel)), { recursive: true });
    writeFileSync(join(head, rel), JSON.stringify(edit(rel, j)));
  }
};
const COH = 'app/scripts/fixtures/coherence-budget.json';
const coh = (fn) => (rel, j) => (rel === COH ? fn(j) : j);

test('fixtures identiques à la base → vert', () => { write(); assert.equal(floor().status, 0); });

test('un compteur plus haut que la base → rouge', () => {
  write((rel, j) => (rel.includes('atomicity') ? { ...j, budget: { ...j.budget, A: j.budget.A - 1 } } : j));
  const r = floor();
  assert.equal(r.status, 1);
  assert.match(r.stdout, /A/);
});

test('Q2 — le plancher des questions du cas sans réponse ne remonte pas → rouge', () => {
  write((rel, j) => (rel.includes('case-question-answers') ? { ...j, budget: { candidats: j.budget.candidats - 1 } } : j));
  const r = floor();
  assert.equal(r.status, 1);
  assert.match(r.stdout, /candidats/);
});

test('K0 — un compteur de cohérence brut plus haut que la base → rouge', () => {
  write((rel, j) => (rel.includes('coherence-budget') ? { ...j, brut: { ...j.brut, doublons: j.brut.doublons - 1 } } : j));
  const r = floor();
  assert.equal(r.status, 1);
  assert.match(r.stdout, /doublons/);
});

test('K0 — un compteur de résidu plus haut que la base → rouge ; un `null` (non mesurable) ne compte pas', () => {
  write((rel, j) => (rel.includes('coherence-budget') ? { ...j, residu: { ...j.residu, questionsMuettes: j.residu.questionsMuettes - 1 } } : j));
  assert.equal(floor().status, 1);
  write();
  assert.equal(floor().status, 0);
});

test('K0 — base entière, tête `null` (le compteur a cessé d\'être mesuré) → rouge', () => {
  // K4 : la tête porte nonReduit = 0 ; la tête `null` s'écrit donc à la main (avant, 103 > 5 rougissait par hasard).
  write((rel, j) => (rel.includes('coherence-budget') ? { ...j, residu: { ...j.residu, nonReduit: 5 } } : j));
  writeHead(coh((j) => ({ ...j, residu: { ...j.residu, nonReduit: null } })));
  const r = floor('--head-dir', head);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /nonReduit/);
});

test('K0 — base `null`, tête entière (le compteur devient mesurable) → vert', () => {
  write((rel, j) => (rel.includes('coherence-budget') ? { ...j, brut: { ...j.brut, doublons: null } } : j));
  assert.equal(floor().status, 0);
});

test('une annotation relu de plus que la base → rouge', () => {
  write((rel, j) => (rel.includes('trame') ? { ...j, relu: j.relu - 1 } : j));
  assert.equal(floor().status, 1);
});

test('une clé de la base absente de la branche → rouge', () => {
  write((rel, j) => (rel.includes('atomicity') ? { ...j, budget: { ...j.budget, Z: 0 } } : j));
  assert.equal(floor().status, 1);
});

// Lot L0 : la liste des paires absurdes est un plancher — une paire ne
// disparaît pas (la porte vitest ne la verrait plus), une exemption `kept`
// ne s'ajoute pas en silence.
test('une paire (cas × sonde) de la base absente de la branche → rouge', () => {
  write((rel, j) => (rel.includes('fach-nature') ? { ...j, groups: [...j.groups, { probe: 'fach-x-test', cases: ['case-fantome'] }] } : j));
  const r = floor();
  assert.equal(r.status, 1);
  assert.match(r.stdout, /fach-x-test/);
});

test('une exemption `kept` de plus que la base → rouge', () => {
  write((rel, j) => (rel.includes('fach-nature') ? { ...j, groups: j.groups.map(({ kept: _k, ...g }) => g) } : j));
  const r = floor();
  assert.equal(r.status, 1);
  assert.match(r.stdout, /kept/);
});

test('fixture absent de la base (introduit par la branche) → vert, et dit pourquoi', () => {
  rmSync(base, { recursive: true, force: true }); mkdirSync(base);
  const r = floor();
  assert.equal(r.status, 0);
  assert.match(r.stdout, /absent/);
});

// Re-revue I-2 : une ref introuvable n'est pas « fixture absent » — exit 2.
test('ref git non résolue → exit 2, jamais vert', () => {
  const r = spawnSync(process.execPath, [join(here, 'checkBudgetFloor.mjs'), 'no-such-ref-s3'], { encoding: 'utf8' });
  assert.equal(r.status, 2);
});

// ── Les hausses de MESURE : permises seulement si le fixture les documente, exactement ──
// La base est abaissée de 2 sur horsProfil : la tête (la valeur réelle du fixture) « remonte » de H−2 à H.
const H = JSON.parse(readFileSync(join(here, '..', '..', COH), 'utf8')).brut.horsProfil;
const D = H - 2;
// La base n'a pas encore les entrées de la branche (`hausses` vide) : sinon elles n'excuseraient rien (I-1).
const baseHorsProfil = () => write(coh((j) => ({ ...j, brut: { ...j.brut, horsProfil: D }, hausses: [] })));

test('hausses — une hausse non documentée → rouge, et le message dit l\'entrée attendue', () => {
  baseHorsProfil();
  writeHead(coh((j) => ({ ...j, hausses: [] })));
  const r = floor('--head-dir', head);
  assert.equal(r.status, 1);
  assert.match(r.stdout, new RegExp(`horsProfil remonte, ${D} → ${H}, sans entrée \\{ compteur: "horsProfil", de: ${D}, a: ${H}, raison \\}`));
});

test('hausses — documentée mais le chiffre diffère (de ou a) → rouge', () => {
  baseHorsProfil();
  const entree = { compteur: 'horsProfil', de: D, a: H, raison: 'x' };
  for (const faux of [{ de: D - 1 }, { a: H - 1 }, { a: H + 1 }, { compteur: 'exigeAbsent' }]) {
    writeHead(coh((j) => ({ ...j, hausses: [{ ...entree, ...faux }] })));
    assert.equal(floor('--head-dir', head).status, 1, JSON.stringify(faux));
  }
});

test('hausses — documentée avec une raison vide → rouge', () => {
  baseHorsProfil();
  for (const raison of ['', '   ', undefined, 3]) {
    writeHead(coh((j) => ({ ...j, hausses: [{ compteur: 'horsProfil', de: D, a: H, raison }] })));
    assert.equal(floor('--head-dir', head).status, 1, String(raison));
  }
});

test('hausses — documentée, chiffres exacts, raison non vide → vert (et signalée à la revue)', () => {
  baseHorsProfil();
  writeHead(coh((j) => ({ ...j, hausses: [{ compteur: 'horsProfil', de: D, a: H, raison: 'mesure plus fine' }] })));
  const r = floor('--head-dir', head);
  assert.equal(r.status, 0, r.stdout);
  assert.match(r.stdout, /hausse documentée/);
});

test('hausses — une hausse documentée n\'excuse pas une AUTRE hausse', () => {
  write(coh((j) => ({ ...j, brut: { ...j.brut, horsProfil: D, doublons: j.brut.doublons - 1 }, hausses: [] })));
  writeHead(coh((j) => ({ ...j, hausses: [{ compteur: 'horsProfil', de: D, a: H, raison: 'mesure plus fine' }] })));
  const r = floor('--head-dir', head);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /doublons remonte/);
});

test('hausses — le fixture réel face à lui-même reste vert', () => { write(); assert.equal(floor().status, 0); });

test('hausses — une entrée DÉJÀ présente dans la base n\'excuse pas une hausse nouvelle (revue K1 I-1)', () => {
  // La base porte déjà l'entrée (D → H) ; elle sert de plancher D, la tête remonte encore à H : la vieille
  // entrée (mergée) ne doit pas excuser une hausse future identique.
  const entree = { compteur: 'horsProfil', de: D, a: H, raison: 'mesure plus fine' };
  write(coh((j) => ({ ...j, brut: { ...j.brut, horsProfil: D }, hausses: [entree] })));
  writeHead(coh((j) => ({ ...j, hausses: [entree] })));
  const r = floor('--head-dir', head);
  assert.equal(r.status, 1, r.stdout);
  assert.match(r.stdout, /horsProfil remonte/);
});
