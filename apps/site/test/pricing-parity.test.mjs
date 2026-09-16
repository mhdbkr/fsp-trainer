import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkPricing, readMatrix } from '../scripts/check-pricing-parity.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const pricingRaw = readFileSync(resolve(here, '../src/data/pricing.json'), 'utf8');
const entitlementsMd = readFileSync(resolve(here, 'fixtures/entitlements.md'), 'utf8');
const realEntitlementsMd = readFileSync(resolve(here, '../../../docs/contracts/entitlements.md'), 'utf8');
const featuresDir = resolve(here, '../../../app/src/features');
const seedCasesTs = readFileSync(resolve(here, '../../../app/src/data/seedCases.ts'), 'utf8');
const clone = () => JSON.parse(pricingRaw);

test('(a) pricing.json réel ↔ entitlements.md réel ↔ app/src/features réel → []', () => {
  assert.deepEqual(checkPricing({ pricing: clone(), entitlementsMd: realEntitlementsMd, featuresDir, seedCasesTs }), []);
});

test('fixture entitlements.md == docs/contracts/entitlements.md (copie)', () => {
  assert.equal(entitlementsMd, realEntitlementsMd);
});

test('(b) feature foo.bar ajoutée à Pro → absente de la matrice (AC8)', () => {
  const p = clone();
  p.plans.find((pl) => pl.id === 'pro').features.push({ id: 'foo.bar', status: 'bald' });
  const errs = checkPricing({ pricing: p, entitlementsMd, featuresDir, seedCasesTs });
  assert.ok(errs.some((e) => e.includes('foo.bar') && e.includes('absent de la matrice')));
});

test('(c) sim.online déplacée dans Free → Free n\'a pas sim.online', () => {
  const p = clone();
  p.plans.find((pl) => pl.id === 'free').features.push({ id: 'sim.online', status: 'bald' });
  const errs = checkPricing({ pricing: p, entitlementsMd, featuresDir, seedCasesTs });
  assert.ok(errs.some((e) => e.includes("free n'a pas sim.online")));
});

test('(d) credits.monthly:250 → ≠ matrice 200', () => {
  const p = clone();
  const pro = p.plans.find((pl) => pl.id === 'pro');
  pro.features.find((f) => f.id === 'credits.monthly:200').id = 'credits.monthly:250';
  p.labels['credits.monthly:250'] = p.labels['credits.monthly:200'];
  const errs = checkPricing({ pricing: p, entitlementsMd, featuresDir, seedCasesTs });
  assert.ok(errs.some((e) => e.includes('250 ≠ matrice 200')));
});

test('(e) freeCases: 10 → ≠ contrat 12 (C6)', () => {
  const p = clone();
  p.freeCases = 10;
  const errs = checkPricing({ pricing: p, entitlementsMd, featuresDir, seedCasesTs });
  assert.ok(errs.some((e) => e.includes('freeCases 10 ≠ contrat 12')));
});

test('(f) feature live avec dir: "nope" → dossier absent (AC15)', () => {
  const p = clone();
  p.core[0].dir = 'nope';
  const errs = checkPricing({ pricing: p, entitlementsMd, featuresDir, seedCasesTs });
  assert.ok(errs.some((e) => e.includes('dossier app/src/features/nope absent')));
});

test('(g) live sans dir → erreur', () => {
  const p = clone();
  delete p.core[0].dir;
  const errs = checkPricing({ pricing: p, entitlementsMd, featuresDir, seedCasesTs });
  assert.ok(errs.some((e) => e.includes('live sans dir')));
});

test('(h) content.tier:3 affiché → aucun contenu tier 3 publié (C3)', () => {
  const p = clone();
  const pro = p.plans.find((pl) => pl.id === 'pro');
  pro.features.find((f) => f.id === 'content.tier:2').id = 'content.tier:3';
  p.labels['content.tier:3'] = p.labels['content.tier:2'];
  const errs = checkPricing({ pricing: p, entitlementsMd, featuresDir, seedCasesTs });
  assert.ok(errs.some((e) => e.includes('aucun contenu tier 3 publié (C3)')));
});

test('(i) autoRenew: true → erreur (C7)', () => {
  const p = clone();
  p.autoRenew = true;
  const errs = checkPricing({ pricing: p, entitlementsMd, featuresDir, seedCasesTs });
  assert.ok(errs.some((e) => e.includes('autoRenew doit être false (C7)')));
});

test('(j) billingPeriods contenant yearly → cadence interdite (C7)', () => {
  const p = clone();
  p.billingPeriods.push('yearly');
  const errs = checkPricing({ pricing: p, entitlementsMd, featuresDir, seedCasesTs });
  assert.ok(errs.some((e) => e.includes('cadence interdite : yearly (C7)')));
});

test('readMatrix : freeCases lu depuis la fixture', () => {
  const { freeCases } = readMatrix(entitlementsMd);
  assert.equal(freeCases, 12);
});
