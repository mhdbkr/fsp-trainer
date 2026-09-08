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

### `therapie` : RAISONNEMENT adaptatif, jamais un dictionnaire figé

⚠️ Ne PAS coder un mapping spécialité → labels et l'appliquer mécaniquement.
Les futurs lots vont croiser des pathologies (Néphrologie, Endocrinologie,
Rhumatologie, Dermatologie, Gynécologie…) qui n'entrent dans AUCUNE case d'un
tel dictionnaire — le risque est de retomber sur konservativ/interventionell/
chirurgisch par défaut, exactement le défaut qu'on corrige.

**La consigne, dans le prompt d'authoring, doit être une question à se poser
pour CHAQUE pathologie, pas une table à consulter :**
> « Comment un médecin structure-t-il réellement la prise en charge de CETTE
> pathologie précise, quand il l'explique à un collègue ? Choisis 2-4 sections,
> nomme-les comme un clinicien le ferait, dans l'ordre logique de sa démarche. »

Repères de LOGIQUE clinique (pas de spécialité — une pathologie peut suivre
plusieurs de ces logiques à la fois selon sa présentation) :

| Logique de la pathologie | Sections typiques (à adapter, jamais copier tel quel) |
|---|---|
| Geste chirurgical/traumato/procédural | Konservativ / Interventionell / Chirurgisch |
| Infection aiguë | Erstlinie / Alternative (Allergie, Résistance, Grossesse) / Schwerer Verlauf |
| Maladie chronique gérée à vie (HTA, IRC, Diabetes) | Ersteinstellung / Langzeitmanagement / Eskalation bei Komplikation |
| Trouble psychiatrique | Psychotherapie / Pharmakotherapie / Krisenintervention |
| Cancer | (Neo)adjuvant / Kurativ (chirurgisch) / Palliativ |
| Maladie auto-immune/inflammatoire chronique | Akuttherapie (Schub) / Basistherapie / Eskalation (Biologika) |
| Maladie endocrinienne (substitution) | Substitution / Medikamentöse Einstellung / Interventionell-chirurgisch (bei Tumor) |
| Insuffisance d'organe progressive (rein, foie, cœur) | Konservativ (Diät, RAAS-Blockade…) / Ersatztherapie (Dialyse…) / Transplantation |
| Dermatose | Topisch / Systemisch / Interventionell (Lichttherapie, Chirurgie) |

Si aucune ligne du tableau ne convient : c'est normal, **invente les 2-4
sections qui reflètent VRAIMENT cette pathologie** — c'est le principe, pas
l'exception. Le champ `akut?: boolean` reste disponible pour surligner une
section contenant une urgence (ex. Suizidalität, Cauda-equina, Sepsis).

### `diagnostik` : l'axe par étape reste fixe (c'est un vrai standard universel)

Contrairement à `therapie`, l'axe `Anamnese/Klinik → Labor → Apparativ &
Bildgebung → Invasiv & Speziell` n'est PAS un moule arbitraire : c'est l'ordre
dans lequel un médecin raisonne réellement, quelle que soit la spécialité — on
le garde donc **fixe**. Ce qui varie légitimement d'un cas à l'autre, c'est
quelles étapes sont remplies : un cas psychiatrique pur peut n'avoir presque
rien en Bildgebung, un cas traumatologique presque tout en Bildgebung/Invasiv
— c'est normal, les étapes vides ne s'affichent pas.

### `name` du cas : court et sans spoiler

Pas de stade, pas de Weber, pas de niveau radiculaire dans le titre — le
détail se découvre en jouant le cas.

### Audit fait sur les autres champs (rien d'autre à corriger)

`klassifikation`, `risikofaktoren`, `klinik`, `redFlags`, `pruefungsfallen`,
`askedInExam`, `prognose`, `erstmassnahmen`, `patientSheet.schmerz` sont déjà
des listes libres ou des champs optionnels — aucun moule imposé. Seul
`therapie` forçait une structure ; c'est corrigé aux deux niveaux (Fachwissen
ET Case.medicalView, qui doivent rester cohérents entre eux pour un même cas).

## Contrat de COHÉSION (pipeline v4)

La *cohérence* vérifie que les chiffres ne se contredisent pas. La **cohésion**
vérifie que les parties du cas SE RÉPONDENT. `checkCaseCohesion.mjs` la mesure.

**Règle capitale — neutralisation des différentiels.** Chaque entrée de
`medicalView.differenzialdiagnosen` doit avoir dans `patientSheet.negativeFindings`
l'élément qui permet de l'écarter, en NOMMANT la DD entre parenthèses :

    "kein Fieber, kein Schüttelfrost (gegen septische Arthritis)"

Sans cela le candidat peut citer la DD mais pas la réfuter pendant l'entretien :
le cas devient injouable en jeu de rôle. **Audit du 08.09.2026 : 36 cas sur 41
échouaient sur ce seul point** — c'est le défaut dominant du corpus.

Les quatre autres liens contrôlés : chaque `pruefungsfallen` a sa réponse
(examinerSheet ou askedInExam) ; le Muster DÉRIVE du dossier (antécédents,
médicaments, allergies repris — et aucun chiffre qui n'existe pas ailleurs dans
le cas) ; les réponses de sonde sont de vraies répliques ; la chronologie de vie
est possible (aucune durée > âge).

## Outillage

- `loadCases.mjs` — transpile le TS via esbuild et rend les VRAIS objets.
  Avant lui, les validateurs relisaient `seedCases.ts` comme du texte et ne
  pouvaient contrôler qu'une poignée de motifs sur les cas intégrés.
- `checkCaseCohesion.mjs` — score de cohésion par cas + liens manquants.
- `makeStyleSample.py` / `STYLE_SAMPLE.ts` — extrait de référence (~75 Ko) donné
  aux agents à la place des fichiers de données (~1,5 Mo), qui les faisaient caler.
