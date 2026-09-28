import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { safeHost, routesFromDist, thirdPartyViolations } from '../scripts/check-cta.mjs';

test('safeHost : URL valide → host', () => {
  assert.equal(safeHost('https://plausible.example.com/api/event'), 'plausible.example.com');
});

test('safeHost : placeholder non résolu {{ANALYTICS_ENDPOINT}} → null (aucun tiers toléré)', () => {
  assert.equal(safeHost('{{ANALYTICS_ENDPOINT}}'), null);
});

test('safeHost : chaîne vide → null', () => {
  assert.equal(safeHost(''), null);
});

test('routesFromDist : ne garde que /de/, exclut 404', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dist-'));
  try {
    mkdirSync(join(dir, 'de'), { recursive: true });
    mkdirSync(join(dir, 'de', 'preise'), { recursive: true });
    mkdirSync(join(dir, '404'), { recursive: true });
    writeFileSync(join(dir, 'de', 'index.html'), '<html></html>');
    writeFileSync(join(dir, 'de', 'preise', 'index.html'), '<html></html>');
    writeFileSync(join(dir, '404', 'index.html'), '<html></html>');
    const routes = routesFromDist(dir);
    assert.deepEqual(routes, ['/de/', '/de/preise/']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('thirdPartyViolations : requête vers l\'hôte analytics autorisé → aucune violation', () => {
  const bad = thirdPartyViolations(['https://plausible.example.com/api/event'], 'plausible.example.com');
  assert.deepEqual(bad, []);
});

test('thirdPartyViolations : requête vers un hôte tiers non autorisé → violation (AC10, G2)', () => {
  const bad = thirdPartyViolations(['https://tracker.evil.com/pixel'], 'plausible.example.com');
  assert.deepEqual(bad, ['https://tracker.evil.com/pixel']);
});

test('thirdPartyViolations : aucun hôte autorisé (placeholder) → toute requête tierce est une violation', () => {
  const bad = thirdPartyViolations(['https://fonts.googleapis.com/css'], null);
  assert.deepEqual(bad, ['https://fonts.googleapis.com/css']);
});

test('thirdPartyViolations : dédoublonne les URLs répétées', () => {
  const bad = thirdPartyViolations(['https://tracker.evil.com/a', 'https://tracker.evil.com/a'], 'plausible.example.com');
  assert.deepEqual(bad, ['https://tracker.evil.com/a']);
});
