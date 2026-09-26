import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkEntry, termForms } from './checkTermRegister.mjs';

const ok = { t: 'Aszites', r: { pa: 'Wasser im Bauch', vo: 'Sonographisch zeigte sich ein Aszites.', an: 'Haben Sie bemerkt, dass Ihr Bauch dicker geworden ist?' } };
test('entrée valide', () => assert.deepEqual(checkEntry(ok), []));
test('pa = terme → erreur', () => assert.ok(checkEntry({ ...ok, r: { ...ok.r, pa: 'aszites' } }).some((e) => e.includes('pa'))));
test('vo sans le terme → erreur ; forme fléchie acceptée', () => {
  assert.ok(checkEntry({ ...ok, r: { ...ok.r, vo: 'Sonographisch unauffällig.' } }).some((e) => e.includes('vo')));
  assert.deepEqual(checkEntry({ t: 'Ödem', r: { pa: 'Schwellung', vo: 'Es bestehen beidseitige Ödeme.', an: 'Sind Ihre Beine geschwollen?' } }), []);
});
test('an contient le terme ou ne finit pas par ? → erreur', () => {
  assert.ok(checkEntry({ ...ok, r: { ...ok.r, an: 'Haben Sie Aszites?' } }).some((e) => e.includes('an')));
  assert.ok(checkEntry({ ...ok, r: { ...ok.r, an: 'Ihr Bauch ist dick.' } }).some((e) => e.includes('an')));
});
test('longueurs bornées', () => assert.ok(checkEntry({ ...ok, r: { ...ok.r, pa: 'x'.repeat(61) } }).some((e) => e.includes('pa'))));
test('termForms : mot entier seulement', () => {
  assert.ok(termForms('Sonde').test('eine Sonde legen')); assert.ok(termForms('Sonde').test('zwei Sonden'));
  assert.ok(!termForms('Sonde').test('Sondenernährung'));
});
