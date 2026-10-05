# Rapport lot K1 — l'annotation des sondes générales

> `sim-engine-engineer` · 5 oct. 2026 · branche `feat/s3-k1-annotation`, base `origin/main` (contrat #69, K0 #72, Q-gyn #70 mergés). `git merge-tree --write-tree origin/main HEAD` : 0.
> Statut : **DONE** après les décisions de main (5 oct.) : hausses de mesure acceptées et `checkBudgetFloor` précisé (§ 6), montage gelé jusqu'à K3 (§ 2.1), FSME levée (§ 3), `parts` renvoyé à K3 / K4 (§ 2.7), défaut de lecture des voyelles accentuées corrigé (§ 2.9, § 9).
> Le montage ne change pas au niveau des ids : le gel `trame-actuelle.txt` ne bouge que par le nombre de relances (DM2, 58 lignes, § 4 ; fixeur, 5 lignes, § 10).
> **Revues Opus (mécanique + clinique) appliquées par le fixeur : § 10.**

## 1. Livrables et commits

| # | Livrable | Commit | Fichiers principaux |
|---|---|---|---|
| 2 | DM1 — 3 sondes, `redundant`, `yieldsToGeneral`, 18 clés | `20e27536` | `anamneseProbes.ts`, `anamneseChapters.ts`, `symptoms.ts`, `seedCases.ts`, `PhraseLine.tsx`, `followUp.test.ts` |
| 3 | DM2 — relances conditionnelles hors signe | `f5be6ddf` | `anamneseChapters.ts`, `followUp.test.ts`, `fachNature.test.ts`, gel |
| 4 | Scission selles / urines | `32730224` | `anamneseProbes.ts`, `anamneseChapters.ts`, `seedCases.ts` (13 cas), `signes.ts`, `fach-covers.txt` |
| 1 | `PROBE_SUCHT` totale (229 sondes) + `followUpSucht` | `91df47f0` | `probeSucht.ts`, `signesDefs.ts` (nouveaux), `signes.ts`, `symptoms.ts`, `phrases.ts`, `anamneseChapters.ts` |
| 5 | `checkCoherence.mjs --propose` | `698adfb7` | `checkCoherence.mjs`, `coherenceMesure.mjs` (`proposer`), tests |
| 6 | INV-79 / INV-84 / INV-91 + mutations | `11db76ab`, `f35529c9` | `suchtCheck.ts`, `suchtDeclaration.test.ts`, `checkCoherence.mjs` |
| 7 | Mesure exacte, plancher, hausses | `b6091ef9`, `e1b8248c` | `coherenceMesure.mjs`, `coherence-budget.json`, `atomicity-budget.json` (A 426 → 424), `quality.yml` (commentaire) |

Les fichiers `seedCases.ts` ne reçoivent que : 18 clés retirées + 2 réponses enrichies (DM1) et 28 lignes de réponses (scission). Seul writer ; `git diff --stat origin/main...HEAD -- app/src/data/seedCases.ts` : 46 ajouts, 38 retraits.

## 2. Hypothèses et écarts au contrat (à acter par main)

1. **Le montage lit `SUCHT_MONTAGE`, pas `PROBE_SUCHT`.** « Aucun changement du montage » + « `PROBE_SUCHT` totale » sont incompatibles si `dedupeBySymptom` lit la table totale. J'ai renommé l'ancienne carte `SUCHT_MONTAGE` (symptoms.ts, gelée, 80 entrées + 2 pour la scission) ; `PROBE_SUCHT` (`probeSucht.ts`) est la déclaration, une seule, qui absorbe `SUCHT_AFFINE`. `dedupeBySymptom`, `phraseSymptoms` et les `parts` ne changent pas ; la mesure et la porte lisent `phraseSucht`. K3 supprime `SUCHT_MONTAGE` avec `dedupeBySymptom`. **Ce que K3 changera, mesuré** (montage branché sur la déclaration, gel régénéré puis rétabli) : 130 cas, 216 lignes, 210 questions retirées — dont `pers-name` ×130 (la question du nom est posée deux fois, avec épellation : même sonde deux fois ; **décision de main : K3 exempte `pers-name` (nom + épellation) de la règle 2**), `veg-fieber` ×12 et `veg-ausscheidung` ×21 réduits, `fach-rheuma-verlauf` / `-ausloeser` / `-vorgeschichte` ×18, `fach-pneumo-auswurf` ×8, `all-allergie` ×8 (déjà demandée par `fach-pneumo-allergie`) — et la moitié urinaire de la fréquence (`akt-ausscheid-harn-haeufigkeit`) qui devient visible dans 9 cas (la fréquence des selles dans 2). C'est le travail de K3 ; rien de cela n'est dans K1.
2. **`Signe` dérivé des clés de `signesDefs.ts`** (le contrat écrit l'union à la main) : un signe s'écrit une fois. 206 signes = 69 de K0 + 137 de K1, chacun avec son chapitre et `pertinence: screening` — **K2 affine**, K1 ne gate rien de plus (sauf `arthralgie`, § 6). Liste fermée, chaque ajout commenté dans `signesDefs.ts`.
3. **Sémantique de la déclaration.** La sonde dit ce que SON texte demande ; une relance qui demande autre chose le déclare (`followUpSucht`, parallèle à `followUp`, absent ou `[]` = précision qui hérite) ; une variante qui énumère autre chose que sa sonde (les trois `akt-begleit`) porte `enumere` ; `relu` (booléen de phrase) marque un texte qui NOMME un signe sans l'interroger. Le contrat ne nommait que `followUpSucht` et `relu` (de la question du cas) : **proposition de contrat** pour `enumere` et `relu` sur une phrase du bundle. Le refus de `relu` sur une énumération vise la question MÈRE (≥ 2 signes nommés non déclarés) ; sur une relance, `relu` couvre une mention unique.
4. **`phraseFollowUps` à côté de `phraseFollowUp`.** Le contrat fait rendre `{ text, sucht }` à `phraseFollowUp` ; ses quarante lecteurs (UI, 8 scripts, tests) attendent `string[]`. `phraseFollowUps` est le point de lecture structuré, `phraseFollowUp` en tire les textes. **Proposition de contrat** : acter les deux noms. `followUps` (la clé de la question du cas) n'est pas touchée : K4 / K5.
5. **Le critère de DM2** (§ 3) et **la levée de la décision « FSME en relance de la tique »** (§ 3).
6. **`SIGNE_AFFINE`** (`signes.ts`) : un signe affiné « couvre » le signe grossier que le texte lit (« Stuhlgang » dans la fréquence des selles est `stuhlfrequenz`, pas `stuhl`), sinon la porte crierait sur les banques mono-signe de K0. La règle d'identité ne change pas.
7. **`parts` des sondes énumératives : non livré.** Le § 10.10 le met dans la ligne K1 ; le brief ne le liste pas. Sur 72 sondes à ≥ 2 signes, 12 ont des `parts` ; 60 n'en ont pas (liste : `node` sur `PROBE_SUCHT`, ex. `akt-infekt-herd`, `fach-rheuma-systemisch`, `fach-endo-herz-nerven`, `fach-derma-systemisch`). `nonReduit` n'est mesurable qu'en K3 ; je laisse la rédaction à main (c'est du texte clinique).
8. **229 sondes, pas 227.** 230 − 3 (DM1) + 2 (scission). INV-79 le compte.
9. **Deux défauts de lecture de K0 — corrigés (§ 9).** `symptomsInText` n'avait pas de `\b` fiable devant une voyelle accentuée : « Ist Ihnen **ü**bel ? » et « **Ä**ngste » n'étaient jamais lus (`uebelkeit`, `angst` pour « Ängste »).
10. **`« Kraftlosigkeit »` n'est plus `schwaeche`** (TEXT_RE) : c'est la fatigue d'`akt-allgemein-art`, pas le déficit moteur focal (frontière de K0, `symptoms.ts` en tête).

## 3. DM1, DM2

### DM1 — fusion avant suppression (INV-88)

Les 18 clés des 6 cas Chirurgie (cholezystitis, appendizitis, gallenkolik, ileus, leistenhernie, bauchaortenaneurysma) comparées une à une à la réponse générale. 16 réponses Fach sont contenues dans la générale. **Deux réponses générales s'enrichissent :**

| Cas · clé | Avant | Après |
|---|---|---|
| `case-appendizitis` · `veg-fieber` | « Gemessen habe ich nicht, ich habe kein Thermometer zu Hause, aber ich fühle mich heiß. Im Ausland … » | « … aber **ich glaube schon, dass ich etwas Fieber habe** — ich fühle mich heiß. Im Ausland … » (de `fach-chir-fieber`) |
| `case-leistenhernie` · `med-blutverduenner` | « Nein, Blutverdünner nehme ich nicht, und Kortison auch nicht. » | « Nein, Blutverdünner nehme ich nicht, **weder Marcumar noch Aspirin**, und Kortison auch nicht. » (de `fach-chir-blutverduenner`) |

Le gel ne bouge pas : ces trois sondes étaient déjà effacées de la trame par `yieldsToGeneral`. **La relance « Wichtig vor jeder Operation: Wann haben Sie die letzte Dosis genommen? »** (`fach-chir-blutverduenner`) part avec elle : elle n'a jamais été jouée. La rattacher à `med-blutverduenner` l'ajouterait aux 130 cas ; elle peut revenir comme relance Chirurgie si la direction la veut. Le badge « ↻ déjà demandé » de `PhraseLine.tsx` n'a plus d'objet (une branche retirée, pas de refonte ; le reste est à l'Expérience). `followUp.test.ts` : 2 cas retirés.

### DM2 — critère et relances corrigées

Critère, appliqué aux **89 relances conditionnelles** (51 sondes) : une relance est une **précision** si elle interroge le même constat (quand, combien, où, quelle couleur, côté, un signe associé du même tableau) ; elle cherche **un autre signe** si elle interroge un antécédent, une famille, une vaccination, une allergie, une exposition, un autre domaine. Deux relances conditionnelles cherchaient un autre signe, **corrigées à la source** :

| Relance | Problème | Correction |
|---|---|---|
| `akt-intensitaet` · « Falls sehr stark: Vor jedem Schmerzmittel zuerst fragen : « Gibt es Allergien … ? » » | demande l'allergie (`all-allergie`) sous l'intensité | **réécrite** : la consigne rejoint la relance qui propose le Schmerzmittel (« … soll ich Ihnen ein Schmerzmittel geben ? » (Vor jedem Schmerzmittel zuerst nach Allergien … fragen.)), sans question de plus |
| `fach-infekt-zecke` · « Falls ja: Sind Sie gegen FSME geimpft ? » | demande la vaccination sous la tique | **promue** vers la question existante `fach-infekt-impfung` (même Fachanamnese) ; la fiche y répond déjà FSME (`lyme`, `meningitis`, testé) → rien de perdu |

**Accepté par main (5 oct.).** La relance FSME avait été posée par une décision antérieure (« FSME : en relance de la tique », test `fachNature`) ; DM2 la lève, le test dit « plus de relance, la vaccination est celle de `fach-infekt-impfung` ».

Gel : 53 cas (`akt-intensitaet↳2 → ↳1`) et 5 cas (`fach-infekt-zecke↳1 →` rien).

**Relances conditionnelles jugées précisions malgré un signe nommé** (marquées `relu` ou lues comme précision ; relecture clinique de K2 souhaitée) : Schüttelfrost et Nachtschweiß sous la fièvre (`fach-infekt-fieber`) ; « Juckt oder brennt es dabei ? » sous le Fluor ; « Ist Blut dabei ? » sous l'Auswurf (`akt-atemnot-husten`) ; Übelkeit (`relu` sur `fach-neuro-kopfschmerz` depuis la correction de la lecture, § 9) et Licht-/Lärmempfindlichkeit sous le Kopfschmerz ; « Hitzewallungen » sous les Wechseljahre. Les 19 sondes `relu` (les 18 d'origine + `fach-neuro-kopfschmerz`) : `all-allergie`, `frau-periode`, `akt-atemnot-nachts`, `akt-atemnot-husten`, `fach-pneumo-auswurf`, `fach-pneumo-orthopnoe`, `fach-pneumo-schmerz`, `fach-gefaess-immobilisation`, `fach-nephro-aussehen`, `fach-uro-farbe`, `fach-uro-strahl`, `fach-gyn-fluor`, `fach-gyn-brust`, `fach-neuro-aura`, `fach-neuro-kopfschmerz`, `fach-haem-bsymptomatik`, `fach-onko-blutung`, `fach-endo-unterzucker`, `fach-infekt-fieber` — chacune une mention unique, jamais une énumération (la porte le refuse).

**`relancesOrphelines` conditionnelles = 0** (INV-84, test : « aucune relance conditionnelle du guide ne déclare un autre signe que sa mère »).

## 4. La déclaration, la scission, le gel

**Comptes.** 229 sondes déclarées : 157 mono-signe, 72 à plusieurs signes (D1). 55 relances inconditionnelles distinctes : **27 déclarent un autre signe** (20 sondes : antécédents et famille du rhumato, exposition de `akt-infekt-kontakt` / `fach-infekt-kontakt`, vaccins, Zeugen d'une crise…), 28 sont des précisions. 3 variantes `enumere` (`akt-begleit`), 19 `relu`. 1 `parts` aligné (`fach-endo-durst` + `nykturie`).

**Scission.** `akt-ausscheid-haeufigkeit` et `-aussehen` (selles) + `akt-ausscheid-harn-haeufigkeit` (`miktion_frequenz`, `nykturie`) et `-harn-aussehen` (`urin_aspekt`). Deux sondes plutôt que « question + relance » : les fiches répondent par organe et une banque (`stuhlfrequenz`, r3) doit être mono-signe. Paires INV-78 ajoutées : selles ≠ urines, pour la fréquence et pour l'aspect. Les 13 cas « ausscheidung » répondent aux quatre sondes :

| Cas | Ce qui bouge dans la fiche |
|---|---|
| zystitis, bph, prostatakarzinom, glomerulonephritis | leurs réponses urinaires passent aux clés `-harn-` ; les clés selles reprennent leur « Stuhlgang normal » (de `akt-ausscheid-was`) |
| pankreaskarzinom, hepatitis-b | la réplique mixte se coupe phrase à phrase (selles / urine) |
| oesophaguskarzinom, achalasie | la fréquence de blocage qu'ils avaient mise sous « Häufigkeit » rejoint `akt-ausscheid-schlucken` ; « Hochwürgen » aussi |
| kolorektales-ca, laktoseintoleranz, gastroenteritis, colitis-ulcerosa, obstipation | selles inchangées ; l'urine répond « rien de changé » (reprise de leur réplique « Veränderung ») |

Aucune information perdue : 19 tests par fragments de fiche (« bestimmt fünfzehnmal », « dunkel wie Bier », « Essensreste wieder hochwürgen »…). **Le montage ne change pas au niveau des ids** : les moitiés urinaires gardent la carte de l'ancienne sonde commune (effacées par `akt-ausscheid-was`), la fréquence des selles reste effacée jusqu'à K3 (c'est le défaut que la direction a cité). Le simulant, lui, voit les quatre lignes (le Rollenskript lit `antworten` et `PROBE_BY_ID.frage`).

**Gel `trame-actuelle.txt`** (régénéré, `vitest -u` rouge avant) : **DM2 seul**, 58 lignes — 53 × `akt-intensitaet↳2 → ↳1`, 5 × `fach-infekt-zecke↳1 → ·`. DM1, la scission, la déclaration et `followUpSucht` ne le déplacent pas. `fach-covers.txt` : les ids urinaires s'ajoutent à `fach-uro-*` / `fach-nephro-*`.

## 5. Mesure avant / après (130 cas, `checkCoherence.mjs`)

| Compteur | K0 (plancher) | **K1** | Lecture |
|---|---:|---:|---|
| `doublons` | 279 | **278** | −1 : la déclaration remplace des signes lus à tort (273 avant la correction des accents, § 9) |
| `doublonsCas` | 24 | 24 | exact en K4 |
| `horsProfil` | 56 | **58** | +2, hausse de mesure (§ 6) |
| `exigeAbsent` | 58 | **67** | +9, hausse de mesure |
| `relancesOrphelines` | 0 | **0** | INV-84 |
| `brauchtViole` | 20 | 20 | K4 |
| `ajouteSansReponse` | 56 | **65** | +9 : la projection d'`exigeAbsent` |
| `questionsMuettes` | 825 | 825 | K4 |
| `sondesMuettes` | 148 | **0** | INV-79, total |

Les mesures des sondes sont désormais **exactes** (la déclaration remplace la lecture) ; celles des questions du cas lisent encore le texte, et le profil reste PROPOSÉ.

## 6. Hausses de mesure et `checkBudgetFloor` (acceptées par main)

Trois compteurs montent face à `origin/main`, **acceptées**, chacune avec son entrée dans `hausses` du fixture. **Ce n'est pas du contenu qui se dégrade : une mention lue comme une question masquait des manques.**
- `exigeAbsent` 58 → 67 : « atemnot » absent dans 8 cas tagués dyspnoe — la lecture le trouvait dans la relance allergique « Hautausschlag, Atemnot, Kreislaufprobleme » — ; « husten » dans bronchialkarzinom (lu dans « Blut beim Husten ») ; « gelenke » dans rheumatisches-fieber et malaria (lu dans `fach-infekt-gelenke`, qui cherche `arthralgie`) ; moins « ort » dans zystitis et erysipel.
- `ajouteSansReponse` 56 → 65 : la même projection, une banque sans réponse par manque nouvellement visible : **le travail de K2** (par banque : `akt-charakter` 14, `akt-intensitaet` 14, `akt-ort` 11, `akt-atemnot-belastung` 8, `akt-atemnot-husten` 5, `fach-rheuma-gelenke` 5, `fach-rheuma-entzuendung` 4, `akt-ausscheid-haeufigkeit` 2, `-schlucken` 1, `-aussehen` 1).
- `horsProfil` 56 → 58 : `fach-infekt-gelenke` est déclarée `arthralgie` (pertinente pour `lyme`, `arthritis`, `gelenk`) ; hors profil dans zoster, abszess, anaphylaxie, basaliom, plus dans lyme et meningitis.

**`checkBudgetFloor` n'est pas affaibli, il est précisé.** Une hausse face à la base n'est permise que si le fixture la documente dans `hausses` avec `compteur`, `de` (valeur de la base) et `a` (valeur de la branche) EXACTS et une `raison` non vide ; toute autre hausse échoue et le message nomme l'entrée attendue. Une hausse documentée est signalée (« à relire en revue »). `hausses` du fixture de cohérence passe au format plat (les entrées de K0 sont éclatées par compteur). `--head-dir` (tests) permet de mutiler la tête. Tests de mutation : non documentée → 1 ; chiffre différent (`de`, `a`, ou autre compteur) → 1 ; raison vide ou absente → 1 ; exacte → 0 ; une hausse documentée n'excuse pas une autre → 1 ; fixture réel contre lui-même → 0. `node scripts/checkBudgetFloor.mjs origin/main` sort **0**. `--bless` garde les `hausses` (il les supprimait).

## 7. Ce qui reste

- **K2** : `profil` des 130 cas ; les **65 réponses de banque** ci-dessus ; la **pertinence** des 137 signes de K1 (tous `screening`) ; `horsProfil` par signe (schluck 14, arthralgie 10, erythem_ring 8, fazialis 8, meningismus 5…) ; les tags trop larges de K0 (`hals`, `stein`, `meningitis`, `steifigkeit`).
- **K3** : supprimer `SUCHT_MONTAGE` et `dedupeBySymptom` (§ 2.1) ; **exempter `pers-name` de la règle 2** (nom + épellation, même sonde deux fois — décision de main) ; r4a détache les 27 relances déclarées ; `parts` des 60 sondes à ≥ 2 signes sans `parts` (renvoyé à K3 / K4 par main) ; lire `enumere` et `phraseFollowUps` ; `FACH_COVERS` (les ids urinaires ajoutés sont un pont).
- **K4** : `sucht` des 825 questions du cas (`--propose` pré-remplit : 241 sur 825 avaient au moins un signe lu avant la correction des accents) ; `stripLabel` de la mesure prend « Wie sieht Ihr Stuhl aus » pour une étiquette (la question du cas n'est pas lue : `--propose` ne propose rien).
- **Pôle Contenu / main** : la relance « letzte Dosis » (§ 3) ; la relecture clinique des `relu`.
- **`CONTEXT.md`** (hors périmètre) : `enumere`, `followUpSucht`, `relu` (phrase), `SUCHT_MONTAGE`, `SIGNE_AFFINE`.

## 8. Vérifications (par code de sortie, sommet de branche)

- `node scripts/check*.mjs` du job `contrats` : **tous 0** — `checkProbeCoverage`, `checkMusterCoverage`, `checkCaseCoherence`, `checkGuideCoverage` (contrat guide ↔ fiche), `checkGuideDuplicates`, `checkUiTells`, `checkCaseQuestionChapters`, `checkPatientWorte`, `checkPlayedTrame`, `checkTrameSymptoms`, `checkQuestionAtomicity`, `checkTherapieLabels`, `checkFachwissenVisuals`, `checkAllergyConflicts`, `checkCaseTermLinks`, `checkTermRegister --require-all`, `checkBedeutung`, `checkCaseCohesion`, `checkQuestionOrder`, `checkCaseQuestionAnswers`, `checkCoherence`, `evalDoctopus --dry`.
  `checkBudgetFloor.mjs origin/main` : **0** (trois hausses documentées signalées, § 6). **Exception** : `checkProbeOverlap.mjs` **1** (informatif, `|| true`) : 5 répétitions non marquées sur `origin/main`, **7** ici — `fach-uro-frequenz` et `fach-endo-durst` recouvrent `akt-ausscheid-harn-haeufigkeit` (50 et 57 %). Je n'ai pas posé `deepens` : le badge « ↗ approfondit » renverrait vers une question que le montage cache.
- `node --test` : `checkQuestionAtomicity` (27), `checkTrameSymptoms`, `checkBudgetFloor`, `checkProbeCoverage`, `checkQuestionOrder`, `checkCaseQuestionAnswers`, `checkCoherence` (29 : 22 de K0, 7 de K1 dont `--propose`, deux mutations de la porte et la garde des accents), `checkBudgetFloor` (19 dont 6 sur les `hausses`), `linkCaseTerms`, `checkCaseTermLinks`, `checkTermRegister`, `checkBedeutung` : **tous 0**. `atomicity-budget.json` regravé (A 426 → 424 : deux énoncés perdent un « ? » en trop).
- `npx tsc -b --noEmit` : **0**. `npx vitest run --dir src --maxWorkers=2` : **0** (153 fichiers, 1 432 tests ; sous charge 49, `horloge.test.tsx`, fichier non touché, a expiré une fois et passe seul). `git merge-tree --write-tree origin/main HEAD` : **0**. `quality.yml` : YAML valide.
- **Mutations qui rougissent** (`suchtDeclaration.test.ts`, 21 tests ; `checkCoherence.test.mjs`) : entrée retirée de `PROBE_SUCHT`, `sucht` vide, signe inconnu, sonde fantôme ; `fach-rheuma-systemisch` réduite à `fieber` ; `relu` posé sur cette énumération ; `relu` retiré de l'Auswurf ; `enumere` retiré d'`akt-begleit` ; « Falls ja: Gibt es in Ihrer Familie Rheuma oder Gicht? » remise sous `fach-rheuma-vorgeschichte` (INV-84) ; la précision de la raideur matinale traitée comme unité (INV-91) ; relance hors signe sans déclaration ; `followUpSucht` plus long que `followUp`. Côté porte (copie de travail) : sonde sans entrée → 1 ; relance conditionnelle qui déclare → 1 ; INV-78 (`stuhlfrequenz` dans `stuhl`) → 1.

## 9. Après les décisions de main : la lecture des voyelles accentuées

`\b` n'existe pas devant ä ö ü en JS (pas `\w`) : `/\b(übel|…)\b/` et `/\bängste\b/` ne matchaient jamais. Les deux motifs de `TEXT_RE` ancrent par un lookbehind ; « Übelkeit » est maintenant lue, « übelriechend » et « Überweisung » non. `DIM` et `SIG` de la mesure n'avaient pas le défaut (garde ajoutée côté node). Tests rouges sur l'ancien motif (symptoms.test.ts : lecture, faux positifs, garde « aucun `\b` contre une lettre accentuée », ancien motif ; checkCoherence.test.mjs : garde sur `DIM` / `SIG`).

Re-mesure : `doublons` 273 → **278** (5 doublons `uebelkeit` / `angst` que la lecture ne comptait pas ; face à la base, 279, le compteur reste en baisse ; entrée `hausses` de 273 à 278, plancher regravé à la main parce que `--bless` refuse une hausse). `horsProfil`, `exigeAbsent`, `ajouteSansReponse` inchangés. La porte voit la nausée de la relance conditionnelle de `fach-neuro-kopfschmerz` : `relu` (précision d'un tableau migraineux, comme les autres). `checkTrameSymptoms` voit 2 doublons nouveaux — `case-myokardinfarkt` (« war Ihnen übel ? », approfondit `veg-uebelkeit`) et `case-anorexia-nervosa` (vomissement provoqué) — marqués `relu: true` sans toucher le montage : `relu` 118 → 120 dans `trame-symptoms-baseline.json`, hausse documentée. Gel de la trame inchangé.

## Non vérifié

- **Aucune vérification à deux onglets** (médecin + simulant, headless) : K1 ne touche ni `features/simulation`, ni `rolePlay.ts`, ni le montage. Ce que j'ai vérifié à la place : le gel de la trame (médecin) et `buildRollenskript(c.patientSheet)` sur zystitis, gastroenteritis, oesophaguskarzinom (simulant : question et réplique des quatre sondes, appariées). Un navigateur ne dirait rien de plus tant que le montage est inchangé ; il dira quelque chose en K3.
- **La justesse clinique** des 137 signes, de leurs granularités et des 18 `relu` : mon jugement sur 229 sondes et 89 relances conditionnelles, non relu par un clinicien.
- **La CI réelle** : le workflow n'a pas tourné sur GitHub.
- **`graphify update app/src`** : le graphe n'existe pas dans ce worktree ; non relancé.
- **Le contenu publié** : `publishContent.mjs` republiera `seedCases.ts` (28 lignes de fiches, 20 lignes de DM1) au merge sur `main` ; non rejoué.

## 10. Revues et fixeur (5 oct. 2026)

### Revues

| Revue | Verdict | Constats |
|---|---|---|
| Mécanique (`k1-revue-meca`, Opus) | **Changements demandés** | I-1 plancher : une vieille entrée `hausses` excusait une hausse future ; I-2 `relu` éteignait de vrais doublons ; I-3 `relu` toléré sur une énumération dans une variante ou une relance ; m-1 à m-5 |
| Clinique (`k1-revue-clinique`, Opus) | **Changements demandés** | C1 atopie ≠ allergie médicamenteuse (sécurité) ; C2 hémoptysie ; C3 flanc ; C4 panique ; C5/C6 saignements trop grossiers ; C7 nycturie ; mineurs (DPN, ordre selles/urines, réponses de fiche, INV-88 goutte) |

Tout est appliqué ci-dessous. Une seule contradiction dans le brief : C4 (« `[['panikattacke']]` avec `relu` ») heurte I-3 (une relance qui nomme ≥ 2 signes ne prend jamais `relu`). Je l'ai résolue sans `relu` : `SIGNE_AFFINE.panikattacke = [angst, atemnot, herzrasen]`, utilisé par la porte seulement, car ces signes décrivent la crise. Le texte clinique est gardé. Signalé à main.

### Commits du fixeur

| Commit | Objet |
|---|---|
| `a2bc5688` | I-1 : `checkBudgetFloor` n'accepte qu'une entrée `hausses` **absente des `hausses` de la base** (test de mutation : garde retirée → rouge) ; l'entrée dormante `doublons` 273 → 278 est retirée (la base est à 279) |
| `0bff4991` | I-2 : `relu` retiré de `case-myokardinfarkt` et `case-anorexia-nervosa`, inscrits **constats ouverts** (`trame-symptoms-baseline.json`, `findings_note`), échéance **K4** (le montage ne bouge pas) ; pour l'anorexie, K4 reformule en « Führen Sie das Erbrechen manchmal selbst herbei? », avec un signe propre `purging`. Les relances Schüttelfrost / Nachtschweiß de `fach-infekt-fieber` sont supprimées (`veg-schuettelfrost`, 5 cas sur 5). `fach-neuro-kopfschmerz` garde `relu` (ICHD-3) |
| `f71953ee` | I-3 + clinique : voir ci-dessous |
| `bc3866f6` | Fiches : fréquence des selles (`case-kolorektales-ca`), « Auch » orphelin (`case-pankreaskarzinom`), diurétique de la goutte fusionné dans `akt-ausloeser` (INV-88, avant K3) |

**I-3.** `suchtCheck` refuse `relu` dès qu'**un** texte (la mère, une variante ou une relance) nomme au moins 2 signes et que l'un d'eux n'est pas déclaré. Deux mutations : la variante Schüttelfrost de la B-symptomatique, et une relance qui énumère. La règle a révélé 4 phrases, toutes corrigées :
- `fach-haem-bsymptomatik` : la variante perd Schüttelfrost, `relu` est retiré.
- `all-allergie` : la relance décrit la réaction (« an der Haut, an der Atmung, am Kreislauf ») sans nommer de plainte actuelle. Le déclarer aurait masqué les 8 `atemnot` absents.
- `fach-pneumo-orthopnoe` et `fach-onko-blutung` : déclarés (ci-dessous).

**Les nouveaux signes (9), dans `signesDefs.ts`, commentés.**

| Signe | Sonde(s) | Pourquoi |
|---|---|---|
| `atopie` | `fach-pneumo-allergie` → `[atopie, asthma]` (C1) | Sinon K3 retirerait `all-allergie` (allergie à la pénicilline) dans 8 cas. Paire INV-78 `all-allergie` ≠ `fach-pneumo-allergie` |
| `auswurf_aspekt`, `haemoptyse` | `fach-pneumo-auswurf` → `[auswurf_aspekt, haemoptyse]`, sans `relu` (C2) | Sur le modèle stuhl / stuhlaussehen ; c'est la seule hémoptysie de la Lungenembolie |
| `flankenschmerz` | `fach-uro-flanke` → `[flankenschmerz, ausstrahlung]` (C3) | La douleur du flanc n'est pas le `ort` de la plainte |
| `dpn` | relance « Wachen Sie nachts auf, weil Ihnen die Luft wegbleibt? » d'`akt-atemnot-nachts` (`followUpSucht`, `relu` retiré) ; `fach-pneumo-orthopnoe` → `[orthopnoe, dpn, schlafapnoe]` (`relu` retiré) | La DPN est distincte de l'orthopnée |
| `blutungsneigung`, `blutverlust`, `vaginalblutung`, `lokalblutung` | `fach-haem-blutung`, `fach-haem-blutverlust`, `fach-gyn-blutung`, `akt-veraend-was` / `-blutung` / `fach-derma-muttermal` ; `fach-onko-blutung` (selon son texte, D1) → `[stuhlaussehen, urin_aspekt, haemoptyse, vaginalblutung]`, sans `relu` (C5, m-1) | `blutung` reste le signe que **lit** le texte (TEXT_RE, questions du cas) ; `SIGNE_AFFINE` relie chaque signe fin à `blutung`. `PROFIL_EXIGE` / `PROFIL_EXCLUT` ne citaient pas `blutung` : rien à changer. Paires INV-78 : 4 sur les saignements, auswurf ≠ auswurf_aspekt, orthopnoe ≠ atemnot |

**Autres corrections.**
- C4 : la relance de panique → `[['panikattacke']]`.
- C6 : sous `akt-veraend-blutung` → `[['stuhlaussehen', 'urin_aspekt'], ['haemoptyse']]`.
- C7 : `fach-kardio-nykturie` `deepens: 'akt-ausscheid-harn-haeufigkeit'`.
- m-2 : `akt-allgemein-gewicht` → `[gewicht]`. Appétit et soif restent à sa relance, et le test des `parts` l'admet.
- `fach-rheuma-verlauf` → `beginn` ; `akt-neuro-lage` → `lageabhaengig`, plus `relu` pour « schwankt es », mention unique.
- `fach-endo-durst` garde `polyurie` (paire D4). Son texte dit maintenant « mehr Wasser lassen » au lieu de « häufiger », qui voulait dire `miktion_frequenz`.
- « Husten Sie dabei etwas ab? » déclare `auswurf` et perd son « Falls ja: » : une relance conditionnelle ne peut pas déclarer un autre signe (INV-84). C'est un doublon vrai avec `fach-pneumo-husten`, que K3 traite.
- Selles (fréquence, aspect) puis urines (fréquence, aspect). Nouvelle question : « …müssen Sie auch nachts zum Stuhlgang aufstehen? ».
- m-5 : « 229 sondes » partout (test, `signesDefs.ts`, fixture).

**Non fait, laissé à K3.**
- `fach-pneumo-fieber` et `fach-uro-fieber` déclarent tous deux `[fieber, schuettelfrost]`, mais seule la pneumo a des `parts`. En ajouter à l'uro toucherait le montage, gelé.
- Retirer le pont `FACH_COVERS` urinaire → selles (`anamneseChapters.ts`, bloc `FACH_COVERS`).
- `fach-uro-funktion` garde `blutung`, parce que son texte change selon le sexe.

### Compteurs avant / après le fixeur (130 cas)

| Compteur | K1 avant revue (`331196b8`) | **Après** | Lecture |
|---|---:|---:|---|
| `doublons` | 278 | **266** | −12 : −5 `verlauf` +6 `beginn` (rhumato, `fach-rheuma-verlauf`), −5 `auswurf`, −5 `blutung` +3 `lokalblutung` (vrai doublon `akt-veraend-was` / `-blutung`), −3 `ort` (flanc), −1 `atemnot` (panique), −1 `husten`, −1 `schwindel` |
| `doublonsCas` | 24 | 24 | |
| `horsProfil` | 58 | 58 | |
| `exigeAbsent` | 67 | **68** | +1 : « ort » dans zystitis, que `fach-uro-flanke` ne cherche plus (C3). Hausse face à `origin/main` 58 → 68 documentée |
| `ajouteSansReponse` | 65 | **66** | +1 : sa projection (`akt-ort`, zystitis). 56 → 66 documentée |
| `relancesOrphelines` / `brauchtViole` / `questionsMuettes` / `sondesMuettes` | 0 / 20 / 825 / 0 | 0 / 20 / 825 / 0 | |
| `trame-symptoms` constats / `relu` | 0 / 120 | **2 / 118** | I-2 : 2 constats ouverts (K4), hausse documentée ; `relu` revient à la base |
| `checkProbeOverlap` (informatif) | 7 | 8 | + `fach-nephro-menge` ~ `akt-ausscheid-haeufigkeit` (33 %) : lexical, c'est la nouvelle formulation « nachts zum Stuhlgang » ; pas de `deepens` (urines ≠ selles) |

Gel `trame-actuelle.txt` : 5 lignes, `fach-infekt-fieber↳2` → `fach-infekt-fieber` (ids inchangés) ; l'ordre selles / urines ne le déplace pas (les moitiés urinaires restent effacées par le montage gelé).
