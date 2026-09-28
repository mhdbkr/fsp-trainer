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
  for (const i of status.incidents) {
    assert.match(i.date, ISO_DATE, `incident date "${i.date}" is not ISO`);
    assert.ok(typeof i.description === 'string' && i.description.length > 0, 'incident description is empty');
  }
});

test('exam-bw.json: three 20-minute parts, internal scale, no numeric grading scheme', () => {
  assert.equal(examBw.land, 'Baden-Württemberg');
  // Le barème 60 pts / 60 % n'est pas sourcé dans un document officiel (CONTEXT.md) et
  // n'est plus rendu nulle part : `totalPoints` / `minPercentPerPart` étaient de la donnée
  // morte tenue en vie par une assertion. La donnée part, et l'assertion garde l'inverse —
  // aucun barème chiffré ne revient dans exam-bw.json par distraction.
  assert.ok(!('totalPoints' in examBw) && !('minPercentPerPart' in examBw));
  assert.equal(examBw.pointsSource, 'intern');
  assert.ok(Array.isArray(examBw.parts) && examBw.parts.length === 3);
  for (const p of examBw.parts) {
    assert.equal(p.minutes, 20);
  }
});

test('site.json: exact expected keys', () => {
  const expected = [
    'domain', 'appUrl', 'supportEmail', 'brandName', 'productName',
    'tagline', 'descriptor', 'analyticsEndpoint', 'analyticsProvider', 'public',
  ].sort();
  assert.deepEqual(Object.keys(site).sort(), expected);
});

test('pricing.json: freeCases is an integer', () => {
  assert.ok(Number.isInteger(pricing.freeCases));
});
