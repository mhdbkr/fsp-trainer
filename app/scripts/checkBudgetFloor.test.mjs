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
const REL = ['app/scripts/fixtures/atomicity-budget.json', 'app/scripts/fixtures/trame-symptoms-baseline.json', 'app/scripts/fixtures/fach-nature-pairs.json', 'app/scripts/fixtures/case-question-answers.json'];
const base = mkdtempSync(join(tmpdir(), 'fsp-floor-'));
after(() => rmSync(base, { recursive: true, force: true }));
const write = (edit = (_rel, j) => j) => {
  for (const rel of REL) {
    const j = JSON.parse(readFileSync(join(here, '..', '..', rel), 'utf8'));
    mkdirSync(dirname(join(base, rel)), { recursive: true });
    writeFileSync(join(base, rel), JSON.stringify(edit(rel, j)));
  }
};
const floor = () => spawnSync(process.execPath, [join(here, 'checkBudgetFloor.mjs'), '--base-dir', base], { encoding: 'utf8' });

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
