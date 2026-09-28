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
  // Arbitrage tâche 5 (réserve n°1) : l'assertion d'origine exigeait que « 60 Punkte »
  // RESTE sur la page, une fois, près de « interne Übungsskala » (review-T2.5-T2.6.md
  // I1/I2 — « le chiffre reste »). Ce barème n'est pas sourcé : la tâche 5 tranche que
  // le texte part, et `check-voice` (règle `bareme`) le refuse désormais. L'assertion est
  // donc resserrée — aucun barème chiffré, ni en points ni en pourcentage — au lieu d'être
  // levée : l'intention du test (la grille interne ne se lit jamais comme un résultat
  // officiel) est conservée et renforcée.
  assert.doesNotMatch(html, /60\s*(Punkte|%|Prozent)/);
  assert.ok(html.indexOf('Übungsskala') >= 0);
});
