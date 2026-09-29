import test from 'node:test';
import assert from 'node:assert/strict';
import { bedeutungIssue } from './checkBedeutung.mjs';

test('conforme : ≤ 6 mots, pas une phrase', () => {
  for (const s of ['Atemnot', 'zum Bauch gehörend', 'Harnproduktion unter 100 ml pro Tag']) assert.equal(bedeutungIssue(s), null, s);
});
test('> 6 mots → signalé', () => assert.equal(bedeutungIssue('Ausdehnung der Venen im Bereich des Nabels'), '> 6 mots'));
test('phrase de définition → signalée (point final, relative, verbe copule)', () => {
  assert.equal(bedeutungIssue('ausgebreitet (von Krankheitserregern).'), 'phrase de définition');
  assert.equal(bedeutungIssue('Stoff, der eine Allergie hervorrufen kann'), 'phrase de définition');
  assert.equal(bedeutungIssue('Medikamente, die den Eisprung unterdrücken'), 'phrase de définition');
});
test('vide → signalé', () => assert.equal(bedeutungIssue('  '), 'vide'));
