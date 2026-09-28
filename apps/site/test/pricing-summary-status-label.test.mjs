import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { requireBuilt, textOf } from '../scripts/lib/dist.mjs';

// Revue (reprise 1, tâche 5b) : la tâche 5 a rendu à PricingTable (/de/preise/) le droit
// de nommer chaque feature avec son état (« noch nicht freigeschaltet »). Mais PricingSummary
// est aussi rendu sur l'accueil (/de/), où la même étiquette d'état rouvrait la règle
// « pas d'annonce de fonctionnalité non livrée en vitrine ». L'arbitrage retenu (voir le
// commentaire en tête de PricingSummary.astro) : l'accueil vend ce qui marche, sans
// étiquette ; /de/preise/ reste complète et honnête, avec les états ; /de/status/ porte
// le détail. Un filtre `live` muet réintroduit silencieusement le premier bug (annonce
// implicite d'une fonctionnalité par son absence de mention) ; une étiquette recopiée sur
// l'accueil réintroduit le second. Ce test porte les deux moitiés, sur le HTML construit —
// pas seulement la source des composants.
const homeFile = fileURLToPath(new URL('../dist/de/index.html', import.meta.url));
const pricingFile = fileURLToPath(new URL('../dist/de/preise/index.html', import.meta.url));
requireBuilt(homeFile, pricingFile);

test(
  "accueil construit (dist/de/) : aucune étiquette d'état — PricingSummary ne vend que ce qui est servi",
  () => {
    const text = textOf(readFileSync(homeFile, 'utf8'));
    assert.doesNotMatch(text, /noch nicht freigeschaltet/);
  }
);

test(
  "page tarifs construite (dist/de/preise/) : les états restent affichés — PricingTable inchangé",
  () => {
    const text = textOf(readFileSync(pricingFile, 'utf8'));
    assert.match(text, /noch nicht freigeschaltet/);
  }
);
