// app/scripts/registerLots.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextLot, serialize } from './registerLots.mjs';

const fb = [
  { id: 'a', t: 'A', sp: 'X' },
  { id: 'b', t: 'B', sp: 'Y', r: { pa: 'p', vo: 'B.', an: 'q?' } },
  { id: 'c', t: 'C', sp: 'Z' },
  { id: 'd', t: 'D', sp: 'X' }
];

const links = {
  k1: ['a', 'b', 'c'],
  k2: ['a', 'c'],
  k3: ['a', 'd']
};

test('ordre : nb de cas décroissant puis id ; ignore les termes déjà renseignés', () => {
  assert.deepEqual(
    nextLot(fb, links, 2).map((e) => e.id),
    ['a', 'c']
  );
});

test('taille respectée', () => {
  assert.equal(nextLot(fb, links, 10).length, 3);
});

test('serialize produit du JSON compact (sans indentation)', () => {
  const fixture = [
    { id: 'fb-test', t: 'Test', sp: 'X', r: { pa: 'p', vo: 'Test.', an: 'q?' } }
  ];
  const result = serialize(fixture);
  assert.ok(!result.includes('\n'), 'serialize ne doit pas ajouter de retours à la ligne');
  assert.ok(!result.includes('  '), 'serialize ne doit pas ajouter d\'indentation');
  assert.equal(result, '[{"id":"fb-test","t":"Test","sp":"X","r":{"pa":"p","vo":"Test.","an":"q?"}}]');
});
