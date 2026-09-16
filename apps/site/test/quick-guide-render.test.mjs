import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Revue T2.6 (I1) : la grille interne ne doit jamais se lire comme un résultat
// officiel — vérifie le rendu produit (dist), pas seulement les data sources.
const distFile = fileURLToPath(new URL('../dist/de/quick-guide/index.html', import.meta.url));

test('quick-guide dist rendu : grille interne annoncée, aucun barème officiel', { skip: !existsSync(distFile) && 'npm run build requis avant ce test' }, () => {
  const html = readFileSync(distFile, 'utf8');
  assert.match(html, /interne[n]? Übungsskala/);
  assert.match(html, /kein offizielles Prüfungsergebnis/);
  assert.doesNotMatch(html, /\bC1\b/);
  // « 60 Punkte » : n'apparaît jamais hors de la phrase étiquetée « interne Übungsskala »
  // (review-T2.5-T2.6.md I1/I2 — le chiffre reste, la promesse « angelehnt an den Bogen
  // deiner Kammer » a été retirée séparément).
  const pointsMatches = [...html.matchAll(/60 Punkte/g)];
  assert.equal(pointsMatches.length, 1, 'la mention « 60 Punkte » doit rester unique');
  const scaleIndex = html.indexOf('Übungsskala');
  assert.ok(scaleIndex >= 0);
  assert.ok(Math.abs(pointsMatches[0].index - scaleIndex) < 200, '« 60 Punkte » doit rester dans la phrase de la grille interne');
});
