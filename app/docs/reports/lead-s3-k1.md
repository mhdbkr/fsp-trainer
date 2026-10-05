# Rapport lot K1 — l'annotation des sondes générales

> `sim-engine-engineer` · 5 oct. 2026 · branche `feat/s3-k1-annotation`, base `origin/main` (contrat #69, K0 #72, Q-gyn #70 mergés). `git merge-tree --write-tree origin/main HEAD` : 0.
> Statut : **DONE_WITH_CONCERNS** — un code de sortie non nul voulu (`checkBudgetFloor` : trois hausses de mesure écrites au fixture, § 6), un choix à acter (le montage ne lit pas encore la déclaration, § 2.1), `parts` des sondes énumératives non livré (§ 2.7).
> Le montage ne change pas : le gel `trame-actuelle.txt` ne bouge que par DM2 (58 lignes, § 4).

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

1. **Le montage lit `SUCHT_MONTAGE`, pas `PROBE_SUCHT`.** « Aucun changement du montage » + « `PROBE_SUCHT` totale » sont incompatibles si `dedupeBySymptom` lit la table totale. J'ai renommé l'ancienne carte `SUCHT_MONTAGE` (symptoms.ts, gelée, 80 entrées + 2 pour la scission) ; `PROBE_SUCHT` (`probeSucht.ts`) est la déclaration, une seule, qui absorbe `SUCHT_AFFINE`. `dedupeBySymptom`, `phraseSymptoms` et les `parts` ne changent pas ; la mesure et la porte lisent `phraseSucht`. K3 supprime `SUCHT_MONTAGE` avec `dedupeBySymptom`. **Ce que K3 changera, mesuré** (montage branché sur la déclaration, gel régénéré puis rétabli) : 130 cas, 216 lignes, 210 questions retirées — dont `pers-name` ×130 (la question du nom est posée deux fois, avec épellation : même sonde deux fois ; r2 ne doit pas la toucher), `veg-fieber` ×12 et `veg-ausscheidung` ×21 réduits, `fach-rheuma-verlauf` / `-ausloeser` / `-vorgeschichte` ×18, `fach-pneumo-auswurf` ×8, `all-allergie` ×8 (déjà demandée par `fach-pneumo-allergie`) — et la moitié urinaire de la fréquence (`akt-ausscheid-harn-haeufigkeit`) qui devient visible dans 9 cas (la fréquence des selles dans 2). C'est le travail de K3 ; rien de cela n'est dans K1.
2. **`Signe` dérivé des clés de `signesDefs.ts`** (le contrat écrit l'union à la main) : un signe s'écrit une fois. 206 signes = 69 de K0 + 137 de K1, chacun avec son chapitre et `pertinence: screening` — **K2 affine**, K1 ne gate rien de plus (sauf `arthralgie`, § 6). Liste fermée, chaque ajout commenté dans `signesDefs.ts`.
3. **Sémantique de la déclaration.** La sonde dit ce que SON texte demande ; une relance qui demande autre chose le déclare (`followUpSucht`, parallèle à `followUp`, absent ou `[]` = précision qui hérite) ; une variante qui énumère autre chose que sa sonde (les trois `akt-begleit`) porte `enumere` ; `relu` (booléen de phrase) marque un texte qui NOMME un signe sans l'interroger. Le contrat ne nommait que `followUpSucht` et `relu` (de la question du cas) : **proposition de contrat** pour `enumere` et `relu` sur une phrase du bundle. Le refus de `relu` sur une énumération vise la question MÈRE (≥ 2 signes nommés non déclarés) ; sur une relance, `relu` couvre une mention unique.
4. **`phraseFollowUps` à côté de `phraseFollowUp`.** Le contrat fait rendre `{ text, sucht }` à `phraseFollowUp` ; ses quarante lecteurs (UI, 8 scripts, tests) attendent `string[]`. `phraseFollowUps` est le point de lecture structuré, `phraseFollowUp` en tire les textes. **Proposition de contrat** : acter les deux noms. `followUps` (la clé de la question du cas) n'est pas touchée : K4 / K5.
5. **Le critère de DM2** (§ 3) et **la levée de la décision « FSME en relance de la tique »** (§ 3).
6. **`SIGNE_AFFINE`** (`signes.ts`) : un signe affiné « couvre » le signe grossier que le texte lit (« Stuhlgang » dans la fréquence des selles est `stuhlfrequenz`, pas `stuhl`), sinon la porte crierait sur les banques mono-signe de K0. La règle d'identité ne change pas.
7. **`parts` des sondes énumératives : non livré.** Le § 10.10 le met dans la ligne K1 ; le brief ne le liste pas. Sur 72 sondes à ≥ 2 signes, 12 ont des `parts` ; 60 n'en ont pas (liste : `node` sur `PROBE_SUCHT`, ex. `akt-infekt-herd`, `fach-rheuma-systemisch`, `fach-endo-herz-nerven`, `fach-derma-systemisch`). `nonReduit` n'est mesurable qu'en K3 ; je laisse la rédaction à main (c'est du texte clinique).
8. **229 sondes, pas 227.** 230 − 3 (DM1) + 2 (scission). INV-79 le compte.
9. **Deux signes lus à tort par K0, non corrigés.** `symptomsInText` n'a pas de `\b` fiable devant une voyelle accentuée : « Ist Ihnen **ü**bel ? » et « **Ä**ngste » ne sont jamais lus (`uebelkeit`, `angst` pour « Ängste »). Les corriger déplacerait `trame-symptoms-baseline.json` ; ils restent signalés. Conséquence : la relance conditionnelle « Falls ja: Ist Ihnen während der Schmerzen übel ? » (`fach-neuro-kopfschmerz`) échappe à la porte ; elle est relue à la main (§ 3, classée précision).
10. **`« Kraftlosigkeit »` n'est plus `schwaeche`** (TEXT_RE) : c'est la fatigue d'`akt-allgemein-art`, pas le déficit moteur focal (frontière de K0, `symptoms.ts` en tête).

## 3. DM1, DM2

### DM1 — fusion avant suppression (INV-88)

Les 18 clés des 6 cas Chirurgie (cholezystitis, appendizitis, gallenkolik, ileus, leistenhernie, bauchaortenaneurysma) comparées une à une à la réponse générale. 16 réponses Fach sont contenues dans la générale. **Deux réponses générales s'enrichissent :**

| Cas · clé | Avant | Après |
|---|---|---|
| `case-appendizitis` · `veg-fieber` | « Gemessen habe ich nicht, ich habe kein Thermometer zu Hause, aber ich fühle mich heiß. Im Ausland … » | « … aber **ich glaube schon, dass ich etwas Fieber habe** — ich fühle mich heiß. Im Ausland … » (de `fach-chir-fieber`) |
| `case-leistenhernie` · `med-blutverduenner` | « Nein, Blutverdünner nehme ich nicht, und Kortison auch nicht. » | « Nein, Blutverdünner nehme ich nicht, **weder Marcumar noch Aspirin**, und Kortison auch nicht. » (de `fach-chir-blutverduenner`) |

Le gel ne bouge pas : ces trois sondes étaient déjà effacées de la trame par `yieldsToGeneral`. **La relance « Wichtig vor jeder Operation: Wann haben Sie die letzte Dosis genommen? »** (`fach-chir-blutverduenner`) part avec elle : elle n'a jamais été jouée. La rattacher à `med-blutverduenner` l'ajouterait aux 130 cas ; elle peut revenir comme relance Chirurgie si la direction la veut (à trancher). Le badge « ↻ déjà demandé » de `PhraseLine.tsx` n'a plus d'objet (une branche retirée, pas de refonte ; le reste est à l'Expérience). `followUp.test.ts` : 2 cas retirés.

### DM2 — critère et relances corrigées

Critère, appliqué aux **89 relances conditionnelles** (51 sondes) : une relance est une **précision** si elle interroge le même constat (quand, combien, où, quelle couleur, côté, un signe associé du même tableau) ; elle cherche **un autre signe** si elle interroge un antécédent, une famille, une vaccination, une allergie, une exposition, un autre domaine. Deux relances conditionnelles cherchaient un autre signe, **corrigées à la source** :

| Relance | Problème | Correction |
|---|---|---|
| `akt-intensitaet` · « Falls sehr stark: Vor jedem Schmerzmittel zuerst fragen : « Gibt es Allergien … ? » » | demande l'allergie (`all-allergie`) sous l'intensité | **réécrite** : la consigne rejoint la relance qui propose le Schmerzmittel (« … soll ich Ihnen ein Schmerzmittel geben ? » (Vor jedem Schmerzmittel zuerst nach Allergien … fragen.)), sans question de plus |
| `fach-infekt-zecke` · « Falls ja: Sind Sie gegen FSME geimpft ? » | demande la vaccination sous la tique | **promue** vers la question existante `fach-infekt-impfung` (même Fachanamnese) ; la fiche y répond déjà FSME (`lyme`, `meningitis`, testé) → rien de perdu |

**À acter par main : la relance FSME avait été posée par une décision de main (« FSME : en relance de la tique », test `fachNature`).** DM2, plus tardive et générale, la lève ; le test dit désormais « plus de relance, la vaccination est celle de `fach-infekt-impfung` ». Retour arrière possible en un commit si main préfère garder l'exception.

Gel : 53 cas (`akt-intensitaet↳2 → ↳1`) et 5 cas (`fach-infekt-zecke↳1 →` rien).

**Relances conditionnelles jugées précisions malgré un signe nommé** (marquées `relu` ou lues comme précision ; relecture clinique de K2 souhaitée) : Schüttelfrost et Nachtschweiß sous la fièvre (`fach-infekt-fieber`) ; « Juckt oder brennt es dabei ? » sous le Fluor ; « Ist Blut dabei ? » sous l'Auswurf (`akt-atemnot-husten`) ; Übelkeit et Licht-/Lärmempfindlichkeit sous le Kopfschmerz ; « Hitzewallungen » sous les Wechseljahre. Les 18 sondes `relu` : `all-allergie`, `frau-periode`, `akt-atemnot-nachts`, `akt-atemnot-husten`, `fach-pneumo-auswurf`, `fach-pneumo-orthopnoe`, `fach-pneumo-schmerz`, `fach-gefaess-immobilisation`, `fach-nephro-aussehen`, `fach-uro-farbe`, `fach-uro-strahl`, `fach-gyn-fluor`, `fach-gyn-brust`, `fach-neuro-aura`, `fach-haem-bsymptomatik`, `fach-onko-blutung`, `fach-endo-unterzucker`, `fach-infekt-fieber` — chacune une mention unique, jamais une énumération (la porte le refuse).

**`relancesOrphelines` conditionnelles = 0** (INV-84, test : « aucune relance conditionnelle du guide ne déclare un autre signe que sa mère »).

## 4. La déclaration, la scission, le gel

**Comptes.** 229 sondes déclarées : 157 mono-signe, 72 à plusieurs signes (D1). 55 relances inconditionnelles distinctes : **27 déclarent un autre signe** (20 sondes : antécédents et famille du rhumato, exposition de `akt-infekt-kontakt` / `fach-infekt-kontakt`, vaccins, Zeugen d'une crise…), 28 sont des précisions. 3 variantes `enumere` (`akt-begleit`), 18 `relu`. 1 `parts` aligné (`fach-endo-durst` + `nykturie`).

**Scission.** `akt-ausscheid-haeufigkeit` et `-aussehen` (selles) + `akt-ausscheid-harn-haeufigkeit` (`miktion_frequenz`, `nykturie`) et `-harn-aussehen` (`urin_aspekt`). Deux sondes plutôt que « question + relance » : les fiches répondent par organe et une banque (`stuhlfrequenz`, r3) doit être mono-signe. Paires INV-78 ajoutées : selles ≠ urines, pour la fréquence et pour l'aspect. Les 13 cas « ausscheidung » répondent aux quatre sondes :

| Cas | Ce qui bouge dans la fiche |
|---|---|
| zystitis, bph, prostatakarzinom, glomerulonephritis | leurs réponses urinaires passent aux clés `-harn-` ; les clés selles reprennent leur « Stuhlgang normal » (de `akt-ausscheid-was`) |
| pankreaskarzinom, hepatitis-b | la réplique mixte se coupe phrase à phrase (selles / urine) |
| oesophaguskarzinom, achalasie | la fréquence de blocage qu'ils avaient mise sous « Häufigkeit » rejoint `akt-ausscheid-schlucken` ; « Hochwürgen » aussi |
| kolorektales-ca, laktoseintoleranz, gastroenteritis, colitis-ulcerosa, obstipation | selles inchangées ; l'urine répond « rien de changé » (reprise de leur réplique « Veränderung ») |

Aucune information perdue : 19 tests par fragments de fiche (« bestimmt fünfzehnmal », « dunkel wie Bier », « Essensreste wieder hochwürgen »…). **Le montage ne change pas** : les moitiés urinaires gardent la carte de l'ancienne sonde commune (effacées par `akt-ausscheid-was`), la fréquence des selles reste effacée jusqu'à K3 (c'est le défaut que la direction a cité). Le simulant, lui, voit les quatre lignes (le Rollenskript lit `antworten` et `PROBE_BY_ID.frage`).

**Gel `trame-actuelle.txt`** (régénéré, `vitest -u` rouge avant) : **DM2 seul**, 58 lignes — 53 × `akt-intensitaet↳2 → ↳1`, 5 × `fach-infekt-zecke↳1 → ·`. DM1, la scission, la déclaration et `followUpSucht` ne le déplacent pas. `fach-covers.txt` : les ids urinaires s'ajoutent à `fach-uro-*` / `fach-nephro-*`.

## 5. Mesure avant / après (130 cas, `checkCoherence.mjs`)

| Compteur | K0 (plancher) | **K1** | Lecture |
|---|---:|---:|---|
| `doublons` | 279 | **273** | −6 : la déclaration remplace des signes lus à tort |
| `doublonsCas` | 24 | 24 | exact en K4 |
| `horsProfil` | 56 | **58** | +2, hausse de mesure (§ 6) |
| `exigeAbsent` | 58 | **67** | +9, hausse de mesure |
| `relancesOrphelines` | 0 | **0** | INV-84 |
| `brauchtViole` | 20 | 20 | K4 |
| `ajouteSansReponse` | 56 | **65** | +9 : la projection d'`exigeAbsent` |
| `questionsMuettes` | 825 | 825 | K4 |
| `sondesMuettes` | 148 | **0** | INV-79, total |

Les mesures des sondes sont désormais **exactes** (la déclaration remplace la lecture) ; celles des questions du cas lisent encore le texte, et le profil reste PROPOSÉ.

## 6. Hausses de mesure et `checkBudgetFloor`

Trois compteurs montent face à `origin/main`, avec leur raison au fixture (`hausses[2]`). **Ce n'est pas du contenu qui se dégrade : une mention lue comme une question masquait des manques.**
- `exigeAbsent` +9 : « atemnot » absent dans 8 cas tagués dyspnoe — la lecture le trouvait dans la relance allergique « Hautausschlag, Atemnot, Kreislaufprobleme » — ; « husten » dans bronchialkarzinom (lu dans « Blut beim Husten ») ; « gelenke » dans rheumatisches-fieber et malaria (lu dans `fach-infekt-gelenke`, qui cherche `arthralgie`) ; moins « ort » dans zystitis et erysipel (désormais cherché par `fach-uro-flanke` et `fach-derma-beginn-ort`).
- `ajouteSansReponse` +9 : la même projection — une banque sans réponse par manque nouvellement visible : **le travail de K2** (réponses de banque, par banque : `akt-charakter` 14, `akt-intensitaet` 14, `akt-ort` 11, `akt-atemnot-belastung` 8, `akt-atemnot-husten` 5, `fach-rheuma-gelenke` 5, `fach-rheuma-entzuendung` 4, `akt-ausscheid-haeufigkeit` 2, `-schlucken` 1, `-aussehen` 1).
- `horsProfil` +2 : `fach-infekt-gelenke` est déclarée `arthralgie` (pertinente pour `lyme`, `arthritis`, `gelenk`) ; hors profil dans zoster, abszess, anaphylaxie, basaliom (la lecture K0 ne la voyait pas), plus dans lyme et meningitis.

`node scripts/checkBudgetFloor.mjs origin/main` sort donc **1** (« Un fixture dégressif ne remonte jamais face à la base. Hausse de mesure : raison écrite au fixture, acceptée en revue »). C'est le chemin prévu par K0 : la revue accepte ou non. Si main refuse, la correction n'est pas de masquer le manque mais de le résoudre en K2 (profil + réponses) avant de merger K1. `--bless` garde désormais les `hausses` (il les supprimait).

## 7. Ce qui reste

- **K2** : `profil` des 130 cas ; les **65 réponses de banque** ci-dessus ; la **pertinence** des 137 signes de K1 (tous `screening`) ; `horsProfil` par signe (schluck 14, arthralgie 10, erythem_ring 8, fazialis 8, meningismus 5…) ; les tags trop larges de K0 (`hals`, `stein`, `meningitis`, `steifigkeit`).
- **K3** : supprimer `SUCHT_MONTAGE` et `dedupeBySymptom` (§ 2.1) ; r2 ne touche pas une même sonde posée deux fois (`pers-name`) ; r4a détache les 27 relances déclarées ; `parts` des 60 sondes à ≥ 2 signes sans `parts` ; lire `enumere` et `phraseFollowUps` ; `FACH_COVERS` (les ids urinaires ajoutés sont un pont).
- **K4** : `sucht` des 825 questions du cas (`--propose` pré-remplit : 241 sur 825 ont au moins un signe lu) ; corriger le `\b` devant voyelle accentuée (§ 2.9) ; `stripLabel` de la mesure prend « Wie sieht Ihr Stuhl aus » pour une étiquette (la question du cas n'est pas lue : `--propose` ne propose rien).
- **Pôle Contenu / main** : la relance « letzte Dosis » (§ 3) ; la relance FSME (§ 3) ; la relecture clinique des `relu`.
- **`CONTEXT.md`** (hors périmètre) : `enumere`, `followUpSucht`, `relu` (phrase), `SUCHT_MONTAGE`, `SIGNE_AFFINE`.

## 8. Vérifications (par code de sortie, sommet de branche)

- `node scripts/check*.mjs` du job `contrats` : **tous 0** — `checkProbeCoverage`, `checkMusterCoverage`, `checkCaseCoherence`, `checkGuideCoverage` (contrat guide ↔ fiche), `checkGuideDuplicates`, `checkUiTells`, `checkCaseQuestionChapters`, `checkPatientWorte`, `checkPlayedTrame`, `checkTrameSymptoms`, `checkQuestionAtomicity`, `checkTherapieLabels`, `checkFachwissenVisuals`, `checkAllergyConflicts`, `checkCaseTermLinks`, `checkTermRegister --require-all`, `checkBedeutung`, `checkCaseCohesion`, `checkQuestionOrder`, `checkCaseQuestionAnswers`, `checkCoherence`, `evalDoctopus --dry`.
  **Exceptions** : `checkBudgetFloor.mjs origin/main` **1** (§ 6, voulu) ; `checkProbeOverlap.mjs` **1** (informatif, `|| true`) : 5 répétitions non marquées sur `origin/main`, **7** ici — `fach-uro-frequenz` et `fach-endo-durst` recouvrent `akt-ausscheid-harn-haeufigkeit` (50 et 57 %). Je n'ai pas posé `deepens` : le badge « ↗ approfondit » renverrait vers une question que le montage cache.
- `node --test` : `checkQuestionAtomicity` (27), `checkTrameSymptoms`, `checkBudgetFloor`, `checkProbeCoverage`, `checkQuestionOrder`, `checkCaseQuestionAnswers`, `checkCoherence` (28 : 22 de K0, 6 de K1 dont `--propose` et deux mutations de la porte), `linkCaseTerms`, `checkCaseTermLinks`, `checkTermRegister`, `checkBedeutung` : **tous 0**. `atomicity-budget.json` regravé (A 426 → 424 : deux énoncés perdent un « ? » en trop).
- `npx tsc -b --noEmit` : **0**. `npx vitest run --dir src --maxWorkers=2` : **0** (153 fichiers, 1 427 tests). `git merge-tree --write-tree origin/main HEAD` : **0**. `quality.yml` : YAML valide.
- **Mutations qui rougissent** (`suchtDeclaration.test.ts`, 21 tests ; `checkCoherence.test.mjs`) : entrée retirée de `PROBE_SUCHT`, `sucht` vide, signe inconnu, sonde fantôme ; `fach-rheuma-systemisch` réduite à `fieber` ; `relu` posé sur cette énumération ; `relu` retiré de l'Auswurf ; `enumere` retiré d'`akt-begleit` ; « Falls ja: Gibt es in Ihrer Familie Rheuma oder Gicht? » remise sous `fach-rheuma-vorgeschichte` (INV-84) ; la précision de la raideur matinale traitée comme unité (INV-91) ; relance hors signe sans déclaration ; `followUpSucht` plus long que `followUp`. Côté porte (copie de travail) : sonde sans entrée → 1 ; relance conditionnelle qui déclare → 1 ; INV-78 (`stuhlfrequenz` dans `stuhl`) → 1.

## Non vérifié

- **Aucune vérification à deux onglets** (médecin + simulant, headless) : K1 ne touche ni `features/simulation`, ni `rolePlay.ts`, ni le montage. Ce que j'ai vérifié à la place : le gel de la trame (médecin) et `buildRollenskript(c.patientSheet)` sur zystitis, gastroenteritis, oesophaguskarzinom (simulant : question et réplique des quatre sondes, appariées). Un navigateur ne dirait rien de plus tant que le montage est inchangé ; il dira quelque chose en K3.
- **La justesse clinique** des 137 signes, de leurs granularités et des 18 `relu` : mon jugement sur 229 sondes et 89 relances conditionnelles, non relu par un clinicien.
- **La CI réelle** : le workflow n'a pas tourné sur GitHub.
- **`graphify update app/src`** : le graphe n'existe pas dans ce worktree ; non relancé.
- **Le contenu publié** : `publishContent.mjs` republiera `seedCases.ts` (28 lignes de fiches, 20 lignes de DM1) au merge sur `main` ; non rejoué.
