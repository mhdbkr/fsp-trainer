import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findExamClaims } from './checkUiTells.mjs';

const hits = (s) => findExamClaims(s).map((m) => m.text);

test('une affirmation d’examen non sourcée déclenche', () => {
  // Les libellés corrigés, mot pour mot avant correction.
  for (const s of [
    'Grille de langue (barème officiel)',
    'Ce que le jury note vraiment (C1).',
    'Cette partie ≥ 60 % (règle FSP).',
    'Le jury évalue le tact',
    'le jury attend la gradation à l’effort',
    'Les examinateurs notent chaque compétence.',
    'Die Prüfer bewerten jede Kompetenz einzeln.',
  ]) assert.equal(hits(s).length, 1, s);
});

test('le déroulé de l’examen et la grille Doctopus ne déclenchent pas', () => {
  for (const s of [
    'Grille d’entraînement Doctopus',
    'Cette partie ≥ 60 % (repère Doctopus).',
    'Le jury peut te demander d’expliquer un acte à tout moment.',
    'Le jury t’interrompt.',
    'const officialPct = languagePct(grid);',
  ]) assert.deepEqual(hits(s), [], s);
});
