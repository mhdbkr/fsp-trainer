# ADR-0019 — La question est un type, pas une chaîne de caractères

**Statut** : proposé · **Date** : 2026-09-30 · **Chantier** : P0 série 3

## Contexte

Mesure sur le corpus complet (13,0 Mo, 53 286 chaînes, 130 cas chargés via
`loadCases.mjs`) — `app/docs/reports/audit-questions-composees-serie3.md` :

```
1 059 répliques à plus d'un « ? »  ·  322 à énumération ≥ 3 items
   75 alternatives collées dépendantes du cas
1 399 énoncés touchés sur 15 591 (9,0 %) — mais 1 293 textes DISTINCTS (ratio 1,08)
```

Le ratio 1,08 est le chiffre qui pilote tout : **il n'existe aucun gabarit
partagé**. Chaque correction est une correction ; rien ne se propage. Toute
promesse de correction en masse est fausse.

Le défaut est concentré, pas diffus : sondes 79 %, guide d'anamnèse 55 %,
questions du cas 44 %, Oberarzt 24 % — et les Muster et Aufklärungen sont
**propres** (0 occurrence : ils sont déclaratifs). Pire bloc :
`AKTUELL_VARIANT_PROBES` à 77 %, c'est-à-dire les sondes du motif de
consultation, les premières posées, celles qu'on récite sous stress.

Deux faits déterminent la forme de la réponse :

- **Aucune réplique ne peut être découpée par script.** Un split sur « ? »
  produit de l'allemand faux dans quatre situations toutes présentes au corpus
  (préfixe d'étiquette, subordonnée portée par la première question, ellipse de
  composé, relance conditionnelle).
- **Une question composée est souvent un arbre déguisé.** « Trugen Sie einen
  Helm? Sind Sie ohnmächtig geworden? » est une ouverture suivie de deux
  relances conditionnelles ; le texte a aplati un arbre.

Le doublon et la rupture d'ordre s'y greffent : 270 doublons échappent au
garde-fou (sur 104 des 130 cas) parce que `dedupeBySymptom` ne connaît que
**16 symptômes** et `PROBE_SUCHT` que **48 sondes sur 229** — `kopfschmerz`, le
doublon vécu par la direction, **n'existe pas dans le type `Symptom`**. Les
ruptures d'ordre, elles, sont **3 occurrences nettes**, pas ~500.

## Décision

1. **`Frage` devient un type de première classe** :
   `{ id, text (un seul « ? »), kapitel, braucht?, nachfragen?, variante?, deckt }`.
   `nachfragen` rend l'arbre visible au lieu de l'aplatir.
2. **Quatre portes bloquantes en CI** (exit ≠ 0), dans un seul script nouveau
   `checkQuestionAtomicity.mjs` plus `checkVarianteAufgeloest.mjs` :
   atomicité (un « ? »), énumération ≤ 3 items (`followUp` ≤ 2), alternative
   dépendante du cas interdite, variante toujours résolue.
3. **L'énumération d'irradiation est exemptée, et le validateur doit tenir la
   distinction.** `fach-kardio-ausstrahlung` est légitime — l'énumération *est*
   la question. `fach-ortho-durchblutung` (« die Hand oder der Fuß ») ne l'est
   pas — le cas **sait** si c'est la main ou le pied. Critère mécanique :
   ≥ 3 membres ou verbe d'irradiation ou préposition directionnelle ⇒ exempté ;
   exactement 2 membres latéralisables avec article répété ou barre oblique ⇒
   faute. Une faute de ce type est un **gabarit non résolu**, la faute
   `DIRECTION-STYLE.md` §2.1, et elle est interdite par la CI.
4. **Budget dégressif** plutôt que porte immédiate. Plancher mesuré inscrit dans
   `app/scripts/fixtures/atomicity-budget.json` (A=1059, B=322, C=75) ; le
   script échoue si un total remonte. C'est le seul moyen d'introduire la règle
   sans bloquer les 130 cas existants.
5. **La rupture d'ordre reste informative, jamais bloquante** (`|| true`).
   Justification mesurée et seule : 3 occurrences nettes en Tier A (précision
   3/3), 29 en Tier B (précision ~2/3) ; le coût du faux positif dépasse le
   gain.
6. **Le lexique `Symptom` passe de 16 à 27 concepts nommés par la mesure**, puis
   à ~36 par une **règle de mesure** (tout concept produisant ≥ 5 doublons
   échappés), jamais par intuition. `PROBE_SUCHT` est complété ; toute sonde
   dont le texte déclenche un motif du lexique doit déclarer `sucht`, et toute
   `caseSpecificQuestion` citant un concept doit déclarer `sucht` ou `relu`.
   C'est le geste à meilleur rendement de tout l'audit : il rend visibles 107
   des 270 doublons sans écrire un script nouveau.
7. **Le contrat sonde ↔ réponse est préservé** : l'union des `deckt` des
   questions issues d'un découpage égale le `deckt` d'origine. Découper une
   question sans découper la réponse fait échouer `checkProbeCoverage`.

Contrat : `docs/contracts/frage-atomique.md`.

## Alternatives écartées

- **Découper par script.** Mesuré impossible : quatre familles de faux
  positifs, toutes présentes. Le script ne fait que **proposer** sur les 322
  énumérations (~70 % du travail mécanique) ; 100 % de la relecture reste
  humaine.
- **Une porte d'atomicité immédiate.** Elle bloquerait les 130 cas dès le
  premier commit. Le budget dégressif est la seule introduction possible.
- **Faire de la rupture d'ordre une porte.** ~30 occurrences réelles contre une
  précision de ~2/3 au Tier B : la CI passerait son temps à refuser du contenu
  correct.
- **Étendre le lexique « à vue ».** Le contrat impose la mesure : le total ~36
  est un résultat, pas une cible.

## Conséquences

- Chantier C4 : `app/src/data/**`, `lib/caseQuestions.ts`, `rolePlay.ts`,
  `app/scripts/check*.mjs`. Sept lots à main humaine, par priorité (L1
  `AKTUELL_VARIANT_PROBES` d'abord).
- Ne sont **pas touchés**, mesurés propres : `caseMuster.ts`,
  `seedAufklaerungen.ts`, `arztbriefChapters.ts`, `vorstellungChapters.ts`,
  `musterModels.ts`, `musterBogen.ts`.
- Bénéfice non demandé, rendu possible : une question atomique est une carte de
  drill. « Mémoriser la trame » devient mesurable.
- Le contrat inscrit ses propres **limites** (§8) pour qu'aucun implémenteur ne
  conclue que la porte garantit la qualité : le détecteur ne distingue pas une
  énumération cliniquement légitime d'un empilement de rédaction, et rien ne
  mesure l'oralisabilité.
- Deux chiffres de l'audit se contredisent (5 ou 7 alternatives dépendantes du
  cas) ; le contrat ne recopie aucun des deux et fait trancher le validateur par
  la règle mécanique, avec un test de discrimination sur les 5 ids nommés.
