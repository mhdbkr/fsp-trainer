import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkLabel, checkAll } from './checkTermLabels.mjs';

test('libellé propre', () => assert.deepEqual(checkLabel('Pleura'), []));
test('acronyme final toléré', () => assert.deepEqual(checkLabel('Elektrokardiogramm (EKG)'), []));
for (const t of ['Pleura (2)', 'Androgene (pl.)', 'Klistier (syn. Klysma)', 'incompliant (engl.)', 'Fermente [pl.] (Enzyme)', 'cave!', 'Radiologie (2):', 'Nukleus:'])
  test(`refusé : ${t}`, () => assert.ok(checkLabel(t).length));
test('mot patient d’une autre entrée refusé', () => {
  const errs = checkAll([{ id: 'fb-myokardinfarkt', t: 'Myokardinfarkt', s: 'Herzinfarkt' }, { id: 'fb-herzinfarkt', t: 'Herzinfarkt', s: 'Absterben von Herzmuskel' }]);
  assert.equal(errs.length, 1); assert.ok(errs[0].startsWith('fb-herzinfarkt'));
});
test('même s entre synonymes toléré', () => assert.deepEqual(checkAll([{ id: 'a', t: 'Apoplex', s: 'Schlaganfall' }, { id: 'b', t: 'Insult', s: 'Schlaganfall' }]), []));
