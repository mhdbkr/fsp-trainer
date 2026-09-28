import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { requireBuilt, textOf } from '../scripts/lib/dist.mjs';

// Revue T2.6 (I1) : la grille interne ne doit jamais se lire comme un résultat
// officiel — vérifie le rendu produit (dist), pas seulement les data sources.
//
// Correction de revue : les assertions portaient sur le HTML BRUT. `interne Übungsskala`
// ne passait que parce que la frontière de balise tombait par chance hors de la locution,
// et l'assertion négative sur « 60 Punkte » se laissait contourner par `60&nbsp;Punkte`,
// `60 <strong>Punkte</strong>` ou `6&#48; %`. Tout passe désormais par `textOf`, qui décode
// les entités, retire les caractères invisibles et dépouille les balises — le même
// dépouillement que check-voice, dans le même foyer (scripts/lib/dist.mjs).
//
// L'assertion sur le barème chiffré est SUPPRIMÉE, pas resserrée davantage : une fois
// passée par `textOf`, elle devenait le doublon exact de la règle `bareme` de
// check-voice.lexicon.json, en portée d'une seule page au lieu de tout le site. Les deux
// portes exigent un `npm run build` — la garder n'achetait aucun signal plus précoce, elle
// n'ajoutait qu'un second endroit où maintenir la même vérité. `check:voice` porte seul
// le barème, sur les 17 pages construites.
//
// La réserve « ce test se saute en silence si dist/ manque » est levée (tâche 8) :
// `requireBuilt` échoue avec la consigne, et `verify` construit avant de tester.
const distFile = fileURLToPath(new URL('../dist/de/quick-guide/index.html', import.meta.url));
requireBuilt(distFile);

test('quick-guide dist rendu : grille interne annoncée, aucun résultat officiel', () => {
  const text = textOf(readFileSync(distFile, 'utf8'));
  assert.match(text, /interne[n]? Übungsskala/);
  assert.match(text, /kein offizielles Prüfungsergebnis/);
  assert.doesNotMatch(text, /\bC1\b/);
});
