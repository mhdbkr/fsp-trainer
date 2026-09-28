import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { checkFrequencies } from '../scripts/check-frequencies.mjs';

const raw = readFileSync(new URL('../src/data/frequencies.json', import.meta.url), 'utf8');
const clone = () => JSON.parse(raw);

test('frequencies.json réel ne produit aucune erreur', () => {
  assert.deepEqual(checkFrequencies(clone()), []);
});

test('inv1 : id dupliqué', () => {
  const f = clone();
  f.pathologies[1].id = f.pathologies[0].id;
  assert.ok(checkFrequencies(f).some((e) => e.startsWith('inv1 id dupliqué')));
});

test('inv2 : tier top avec total < 10', () => {
  const f = clone();
  const top = f.pathologies.find((p) => p.tier === 'top');
  top.total = 5;
  assert.ok(checkFrequencies(f).some((e) => e.startsWith('inv2 top invalide')));
});

test('inv3 : Σ byCenter ≠ total (byCenter.Fr +1)', () => {
  const f = clone();
  const top = f.pathologies.find((p) => p.tier === 'top');
  top.byCenter.Fr += 1;
  assert.ok(checkFrequencies(f).some((e) => e.startsWith('inv3')));
});

test('inv4 : Σ byCenter[centre] > n (centers[0].n = 1)', () => {
  const f = clone();
  f.centers[0].n = 1;
  assert.ok(checkFrequencies(f).some((e) => e.startsWith('inv4')));
});

test('inv5 : n ≠ 580', () => {
  const f = clone();
  f.n = 581;
  assert.ok(checkFrequencies(f).some((e) => e.startsWith('inv5 n=581')));
});

test('inv6 : Σ total > nByCenterSum (total frequent = 9999)', () => {
  const f = clone();
  const frequent = f.pathologies.find((p) => p.tier === 'frequent');
  frequent.total = 9999;
  assert.ok(checkFrequencies(f).some((e) => e.startsWith('inv6')));
});

test('inv7 : trend avec centre inconnu', () => {
  const f = clone();
  f.trends[0].center = 'XX';
  assert.ok(checkFrequencies(f).some((e) => e.startsWith('inv7 trend centre inconnu')));
});
