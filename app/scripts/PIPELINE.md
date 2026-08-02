# Pipeline PHASE 2 — version efficiente (v2)

Remplace le pipeline v1 (7–13 agents `high` par cas, ~250–950k tokens pour 2–3 cas,
saturait souvent la session avant de finir).

## Principe

Trois étages, du moins cher au plus cher. **On ne paie un agent que pour ce qu'un
script ne peut pas faire.**

```
① RECHERCHE (1 agent medium / lot)      ← mutualisée, PAS par cas
   extrait les passages de protocole utiles pour les N pathologies du lot
   → résumé texte réutilisé par tous les étages suivants

② AUTHORING (1 agent high / lot)        ← par LOT, pas par cas
   produit Fachwissen + Cas + Muster pour les N pathologies d'un coup
   (schéma = tableau d'objets ; le contexte lourd n'est chargé qu'UNE fois)

③ GATE en 3 temps
   a. SCRIPTS (gratuit, instantané)  → checkProbeCoverage + checkMusterCoverage
                                       + checkCaseCoherence
   b. VÉRIF CONSOLIDÉE (1 agent medium / cas) : 4 sous-verdicts en une passe
   c. ADVERSARIAL 4-lentilles (high)  → SEULEMENT si (b) doute, ou cas à risque
                                        (notfall, comorbidité lourde, oncologie)
```

## Pourquoi c'est moins cher, à qualité égale

| Levier | v1 | v2 |
|---|---|---|
| Lecture des protocoles | 6× par cas (auteur + 4 lentilles + fw) | **1× par lot** |
| Chargement schéma/instructions | 1× par cas | **1× par lot** |
| Vérification | 4 agents `high` / cas | scripts + **1 agent `medium`** / cas |
| Adversarial complet | systématique | **ciblé** (échantillon à risque) |
| Points de rupture / limite de session | 8–13 | **2–3** |

La qualité est préservée parce que **la rigueur ne venait pas du nombre d'agents**
mais du contrat : sondes obligatoires, chapitres Muster, schéma typé — tous
vérifiés mécaniquement par l'étage ③a, gratuitement et sans faille.

Preuve : `checkCaseCoherence.mjs` détecte tout seul le défaut BLOQUANT
(IMC 28,4 étiqueté « Adipositas ») que la lentille adversariale `high` avait mis
un run complet à trouver.

## Ce que les scripts couvrent (donc plus besoin d'agent)

- couverture des sondes d'anamnèse (`checkProbeCoverage`)
- couverture des chapitres Muster (`checkMusterCoverage`)
- cohérence identité/chiffres, Anrede vs sexe, IMC vs libellé,
  registre écrit vs oral, Konjunktiv I, abréviations (`checkCaseCoherence`)
- validité du type (tsc) + build

## Ce qui reste irréductiblement humain/agent

- **exactitude clinique** (DD pertinentes, thérapie conforme, classification)
- **fidélité au protocole réel** (le cas reflète-t-il un vrai vécu ?)
- **qualité de la langue** au-delà des heuristiques

→ c'est exactement ce que fait l'étage ③b en une seule passe consolidée.

## Contrats de contenu à respecter (rappel pour les prompts)

- `therapie` : sections **libres** adaptées à la pathologie — ne JAMAIS forcer
  konservativ/interventionell/chirurgisch hors chirurgie/orthopédie.
  Ex. psychiatrie → Psychotherapie / Pharmakotherapie / Krise ;
  infectiologie → Erstlinie / Alternative / schwerer Verlauf ;
  oncologie → kurativ / (neo)adjuvant / palliativ.
- `diagnostik` : classer par **étape** (`Anamnese/Klinik`, `Labor`,
  `Apparativ & Bildgebung`, `Invasiv & Speziell`), jamais par invasivité.
- `name` du cas : **court et sans spoiler** du diagnostic précis (pas de stade,
  pas de Weber, pas de niveau radiculaire) — le détail se découvre en jouant.
