import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dataDir = fileURLToPath(new URL('../src/data/', import.meta.url));
const status = JSON.parse(readFileSync(`${dataDir}status.json`, 'utf8'));
const examBw = JSON.parse(readFileSync(`${dataDir}exam-bw.json`, 'utf8'));
const site = JSON.parse(readFileSync(`${dataDir}site.json`, 'utf8'));
const pricing = JSON.parse(readFileSync(`${dataDir}pricing.json`, 'utf8'));

const VALID_STATES = new Set(['operational', 'degraded', 'outage', 'maintenance']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

test('status.json: updatedAt is ISO date, every component has a valid state', () => {
  assert.match(status.updatedAt, ISO_DATE);
  assert.ok(Array.isArray(status.components) && status.components.length > 0);
  for (const c of status.components) {
    assert.ok(VALID_STATES.has(c.state), `unexpected state "${c.state}" for ${c.id}`);
  }
  assert.ok(Array.isArray(status.incidents));
});

test('exam-bw.json: totalPoints/minPercentPerPart, three 20-minute parts, not asserted as officially sourced', () => {
  assert.equal(examBw.land, 'Baden-Württemberg');
  assert.equal(examBw.totalPoints, 60);
  assert.equal(examBw.minPercentPerPart, 60);
  // Le barème 60 pts / 60 % n'est pas sourcé dans un document officiel (CONTEXT.md) :
  // exam-bw.json doit le marquer comme grille interne, jamais comme barème officiel.
  assert.equal(examBw.pointsSource, 'intern');
  assert.ok(Array.isArray(examBw.parts) && examBw.parts.length === 3);
  for (const p of examBw.parts) {
    assert.equal(p.minutes, 20);
  }
});

test('site.json: exact expected keys', () => {
  const expected = [
    'domain', 'appUrl', 'supportEmail', 'brandName', 'productName',
    'tagline', 'analyticsEndpoint', 'analyticsProvider', 'public',
  ].sort();
  assert.deepEqual(Object.keys(site).sort(), expected);
});

test('pricing.json: freeCases is an integer', () => {
  assert.ok(Number.isInteger(pricing.freeCases));
});
