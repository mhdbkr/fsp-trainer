# Rapport lot K0 — le lexique de signes et la mesure de cohérence

> `sim-engine-engineer` · 4-5 oct. 2026 · branche `feat/s3-k0-lexique`, **rebasée sur `origin/main` @ `ff87f4e0`** (contrat #69 et Q-gyn #70 mergés ; les hashes cités sont ceux d'après rebase)
> Statut : **DONE_WITH_CONCERNS** (concerns = écarts au contrat §10 listés en § 2, à acter par main) — revue Opus de l'ancien sommet (rapport `6c70ccd3` d'avant rebase) : *Needs fixes*, corrigée au § 7, I3 compris.
> K0 ne branche rien sur le montage et ne touche pas `seedCases.ts` : aucun comportement visible ne change (gel § 6).

## 1. Livrables et commits

| # | Livrable | Commit | Fichiers |
|---|---|---|---|
| 1-2 | Lexique `Signe` (69), `SIGNE_DEF`, `PROFIL_EXIGE/EXCLUT`, `SUCHT_AUSSER`, INV-77 / INV-78 avec leurs mutations | `81798838`, `339e607e` | `app/src/data/guides/signes.ts` (nouveau), `symptoms.ts`, `symptoms.test.ts` |
| 4 | Gel du montage actuel (`FACH_COVERS` + `dedupeBySymptom`, 130 cas) | `0a553e30` | `trameActuelle.test.ts`, `__snapshots__/trame-actuelle.txt`, `__snapshots__/fach-covers.txt` |
| 3 | `checkCoherence.mjs` en mode MESURE, plancher | `e25043ec` | `app/scripts/checkCoherence.mjs`, `coherenceMesure.mjs`, `checkCoherence.test.mjs`, `fixtures/coherence-budget.json` |
| 3 | Plancher suivi par `checkBudgetFloor` | `081bfe19` | `checkBudgetFloor.mjs`, `checkBudgetFloor.test.mjs` |
| 5 | CI | `24309d59` | `.github/workflows/quality.yml` |

## 2. Hypothèses et écarts au contrat (à acter)

Chacun est un choix de K0, pas une décision de fond ; aucun ne contredit D1-D7 / DM1-DM3.

1. **`signes.ts` à côté de `symptoms.ts`.** Le lexique vit dans `signes.ts` ; `symptoms.ts` le réexporte (`export * from './signes'`) et garde `type Symptom = Signe`. Le chemin d'import du contrat (`symptoms`) tient ; `symptoms.ts` aurait dépassé 500 lignes.
2. **`SigneDef.kapitel: KapitelId | 'fach'`.** Le contrat écrit `KapitelId`, qui n'a pas `fach` (`lib/checklists.ts:24`) ; or §10.4 parle d'un chapitre cible « Fach jouée ». `SigneKapitel` ajoute `fach`. **Proposition de contrat : amender §10.1.**
3. **INV-77 lit `SUCHT_AFFINE`, pas `PROBE_SUCHT`.** Le contrat écrit `PROBE_SUCHT[bank] = [signe]`. Écrire les banques dans `PROBE_SUCHT` change `dedupeBySymptom` (ex. `akt-ausscheid-haeufigkeit` : `['stuhl','miktion']` → `['stuhlfrequenz']` rend la fréquence des selles visible, c'est le correctif de K3, pas de K0). K0 déclare donc les banques et les paires INV-78 dans `SUCHT_AFFINE` ; K1 la fusionne dans `PROBE_SUCHT` total.
4. **`SigneDef.id` est dérivé**, pas écrit : les définitions sont un `Record<Signe, …>` (le compilateur refuse un signe sans définition ou en double), `SIGNES` = ordre de déclaration.
5. **`measureCoherence.mjs --propose` n'est pas livré** : il figure au §10.10 (ligne K0) mais pas dans la demande de lot. `profilPropose()` existe (c'est la moitié « profil » de `--propose`) et `checkCoherence.mjs --case <id>` affiche le profil proposé ; la proposition de `sucht` des 148 sondes / 829 questions reste à faire, **avant K1**.
6. **Fixture : trois ajouts additifs** à la forme du contrat : `brut.ajouteSansReponse` (projection), `residu.sondesMuettes` (148, descend à 0 en K1) et `source`. `nonReduit` et `casRetiresParR1` valent `null` (non mesurables avant K3) ; `checkBudgetFloor` ignore un `null` de base mais refuse qu'un entier de base devienne `null`.
7. **Pertinence calibrée au strict nécessaire.** Sur 69 signes, 12 sont tag-gated (`ausstrahlung`, `gelenke`, `gelenk_entzuendung`, `steifigkeit`, `schluck`, `zecke`, `erythem_ring`, `meningismus`, `fazialis`, `gicht`, `nierensteine`, `familie_rheuma`) ; les 57 autres sont `screening`. C'est ce que la mesure de la spec gate. Affiner = relecture clinique en K1/K2 (§10.3).
8. **`akt-ausscheid-haeufigkeit` est banque de `stuhlfrequenz`** (« Wie oft müssen Sie am Tag auf die Toilette, und wie oft nachts ? »). Le texte cherche aussi la fréquence mictionnelle d'un cas d'urologie. **Ouvert pour K1** : décider si cette sonde déclare aussi un signe de fréquence mictionnelle (alors elle n'est plus mono-signe) ou si une banque mono-signe est ajoutée.
9. **`charakter` s'ajoute à ce que « schmerz » exige** (le contrat §10.1 : `ort, charakter, intensitaet`), alors que la mesure de la spec ne comptait que Ort et Intensität. C'est tout l'écart sur (c), § 4.

## 3. Le lexique

**69 signes** (ordre = ordre de l'entretien ; `SIGNES`). Les 39 d'origine gardent leur id ; rien n'est renommé.

- **11 dimensions** : `ort beginn charakter intensitaet ausstrahlung verlauf ausloeser einfluss frueher begleit gelenke`.
- **39 d'origine** : `fieber schuettelfrost nachtschweiss reise kontakt uebelkeit stuhl miktion gewicht appetit schlaf husten oedeme orthopnoe blutung schwindel kopfschmerz atemnot brustschmerz bewusstlos sehstoerung krampf taubheit schwaeche herzrasen schwitzen durst juckreiz ausschlag schluck gelbfaerbung sturz stimmung angst suizid gedaechtnis polyurie schub waerme`.
- **19 ajoutés** (commentés dans `signes.ts`) : `stuhlfrequenz stuhlaussehen nykturie inkontinenz urin_aspekt` (granularité de `stuhl` / `miktion`) · `steifigkeit gelenk_entzuendung gicht nierensteine familie_rheuma` (rhumato) · `essen_expo zecke erythem_ring meningismus fazialis` (exposition, gabarit borréliose) · `konzentration nitro` · `muedigkeit sattel` (paires INV-78 : ≠ `schwaeche`, ≠ `taubheit`).
- **Chapitre cible** : `aktuell` 30 (dont 10 dimensions), `fach` 29 (dont la dimension `gelenke`), `vegetativ` 9, `familie-sozial` 1 (relance de Gicht / Familie, §10.1 (e)). Chaque entrée porte sa pertinence et, pour 21 signes, une `bank`.
- **27 tags** (`PROFIL_TAGS`) : les 10 natures, `hoden` (dérivé) et 16 déclarés (`diarrhoe reise fieber dyspnoe husten gewichtsverlust dysphagie hals gelenk arthritis steifigkeit generalisiert lyme meningitis gicht stein`). `PROFIL_EXIGE` : `schmerz → ort charakter intensitaet`, `diarrhoe → stuhlfrequenz stuhlaussehen`, `arthritis → gelenke gelenk_entzuendung`, et un signe pour `reise fieber dyspnoe husten gewichtsverlust dysphagie`. `PROFIL_EXCLUT` : `generalisiert → ausstrahlung`. `SUCHT_AUSSER` : `fach-uro-flanke { hoden: ausstrahlung }` (l'exception testiculaire, devenue règle).
- **Vérifié** (`lexiqueIncoherences`, dans `symptoms.test.ts` ET en tête de `checkCoherence.mjs`) : `SIGNE_DEF` total ; toute banque est une sonde réelle qui ne cherche que son signe ; ce qu'un tag exige lui est pertinent, ne figure pas dans son exclusion, a une banque ; `PROFIL_EXCLUT` ne vise aucun signe de dépistage ; `SUCHT_AUSSER` vise un signe que la sonde cherche ; 4 paires INV-78 disjointes (`akt-ausscheid-was` / `-haeufigkeit`, `fach-endo-durst` / `fach-uro-miktion`, `fach-neuro-kraft` / `fach-haem-leistung`, `fach-neuro-sensibilitaet` / `fach-ortho-cauda`).
- **Mutations qui rougissent** (`symptoms.test.ts`, 9) : `ausstrahlung` exigé par `generalisiert` ; `stuhl` ajouté à la banque de `stuhlfrequenz` ; banque sans signe ; `PROFIL_EXCLUT` sur un signe de dépistage ; signe sans définition ; tag exigeant un signe non pertinent ; `SUCHT_AUSSER` sur un signe que la sonde ne cherche pas ; `stuhlfrequenz` fusionné dans `stuhl` ; `polyurie` fusionnée dans `miktion`.

## 4. Mesure initiale sur les 130 cas (6 542 unités jouées)

`node scripts/checkCoherence.mjs` — lecture du texte (signes) et profil PROPOSÉ depuis la fiche : **une boussole** (précision relue de la spec : 74 % / 70 % / 50 %), exacte quand les déclarations remplacent la lecture.

| Compteur du contrat | Spec §2 | K0 | Exact dès | Écart |
|---|---:|---:|---|---|
| `doublons` | 266 (101 cas) | **279** (102 cas) | K1 sondes / K4 cas | **266** à la première mesure (reproduit la spec), 265 après m1, 276 après m6 (hausse de mesure), **279 après Q-gyn** (3 × `blutung`) : § 7 |
| `doublonsCas` (≥ 2 questions du cas) | 5 « cas × cas » | **24** (20 avant m6) | K4 | autre définition : la spec ne comptait que les doublons dont **toutes** les unités sont du cas ; le contrat compte tout signe cherché par ≥ 2 questions du cas |
| `horsProfil` | 55 (24 cas) | **56** (25 cas) | K2 | +1 : `ausstrahlung` hors de ses tags dans `case-leistenhernie` (deux autres cas urologiques absorbés par `stein` / `hoden`) |
| `exigeAbsent` | 44 (25 cas) | **58** (25 cas) | K2 | **+14 = `charakter`**, que le contrat ajoute à « schmerz » (§ 2.9) ; Ort 13, Intensität 14 : identiques |
| `relancesOrphelines` (conditionnelles, r4a) | (d) 12 | **0** | K1 / K5 | les 12 de la spec sont **toutes sans condition** : r4a les détache, elles ne sont pas des anomalies. 6 cas, 2 relances chacun : `gicht`, `rheumatoide-arthritis`, `fibromyalgie`, `polymyalgia`, `septische-arthritis`, `reaktive-arthritis` |
| `brauchtViole` | 20 (17 cas) | **20** (17 cas) | K4 | identique (anaphore « dort » + détecteur Q0) |
| `ajouteSansReponse` (projection r3) | — | **56** (25 cas) | K3 | nouveau |

Repères : relances sans condition lisant un autre signe (large) **39**, comme la spec (d'). Relances **conditionnelles** lues large : 234, **non comptées** (les exemples d'une réaction allergique « Hautausschlag, Atemnot » y sont lus comme des signes : du bruit). Distribution du score par cas (a+b+c+d+e) : `0` 24 · `1-3` 57 · `4-6` 27 · `7-10` 20 · `>10` 2 (spec : 24 · 58 · 30 · 17 · 1).

Résidu de contenu (fixture) : `questionsMuettes` **825** (829 avant Q-gyn, qui a déclaré `sucht` sur 4 questions ; 36 sur 865 déclaraient `sucht` dans la spec) · `sondesMuettes` **148** (82 sur 230 déclarées) · `nonReduit`, `casRetiresParR1` : **non mesurable avant K3**.

- **Hors profil par signe** (inchangé par la revue) : schluck 14 · gelenke 9 · erythem_ring 8 · fazialis 8 · meningismus 5 · zecke 3 · ausstrahlung 2 · gelenk_entzuendung 2 · gicht 2 · nierensteine 2 · familie_rheuma 1 (la spec : mêmes, ausstrahlung 1).
- **Signes doublés** : stuhl 35 · fieber 24 · miktion 17 · schwitzen 14 · atemnot 13 · blutung 12 · ausschlag 12 · sehstoerung 12 · husten 11 (la spec : miktion 16, reise 10, ausschlag 9 ; `reise` tombe à 6 parce que « Urlaub » n'est plus lu comme un voyage).
- **Projection `ajouteSansReponse` par banque** : `akt-intensitaet` 14 · `akt-charakter` 14 · `akt-ort` 13 · `akt-atemnot-husten` 4 · `fach-rheuma-entzuendung` 4 · `fach-rheuma-gelenke` 3 · `akt-ausscheid-haeufigkeit` 2 · `akt-ausscheid-schlucken` 1 · `akt-ausscheid-aussehen` 1. C'est le travail d'écriture de K2 pour que K3 puisse merger à 0.

### Les cas les plus touchés

| Cas | Nature | Score | doublons | hors profil | absents | relances | ordre |
|---|---|---:|---:|---:|---:|---:|---:|
| fibromyalgie | schmerz | 17 | 8 | 7 | 0 | 2 | 0 |
| gastroenteritis | ausscheidung | 11 | 1 | 5 | 4 | 0 | 1 |
| commotio | neurologisch | 10 | 7 | 0 | 3 | 0 | 0 |
| covid19 | infekt | 10 | 3 | 4 | 3 | 0 | 0 |
| influenza | infekt | 10 | 4 | 3 | 3 | 0 | 0 |
| malaria | infekt | 10 | 4 | 3 | 1 | 0 | 2 |
| polymyalgia | schmerz | 10 | 6 | 2 | 0 | 2 | 0 |
| sturz-im-alter | anfall | 10 | 6 | 0 | 3 | 0 | 1 |
| typhus | infekt | 10 | 5 | 5 | 0 | 0 | 0 |
| reaktive-arthritis | schmerz | 9 | 7 | 0 | 0 | 2 | 0 |
| rheumatoide-arthritis | schmerz | 9 | 7 | 0 | 0 | 2 | 0 |
| gicht | schmerz | 8 | 6 | 0 | 0 | 2 | 0 |
| lyme | infekt | 8 | 4 | 1 | 3 | 0 | 0 |
| erysipel | veraenderung | 7 | 3 | 0 | 3 | 0 | 1 |
| hepatitis-b | ausscheidung | 7 | 3 | 4 | 0 | 0 | 0 |

Les deux cas de la direction sont #1 et #2 (la spec : #1 et #3). Par nature, le score moyen par cas : `infekt` 7,6 (8 cas) · `neurologisch` 6,2 · `anfall` 5,4 · `ausscheidung` 3,8 · `veraenderung` 3,7 · `schmerz` 2,4 (53 cas). La Fach Infekt (gabarit borréliose) et la rhumato restent les gabarits fautifs.

`node scripts/checkCoherence.mjs --case gastroenteritis` rend la trame jouée avec, pour chaque constat, sa `RAISON` : ex. « le tag « diarrhoe » exige « stuhlfrequenz » ; aucune unité ne le cherche » ; « « schluck » n'est pertinent que pour [dysphagie, hals] ; profil proposé : [ausscheidung, schmerz, diarrhoe, reise, gewichtsverlust, stein] » ; « « dort » avant toute question sur « reise » ».

## 5. Ce qui reste

- **Avant K1** : `measureCoherence.mjs --propose` (sondes, relances) — écart § 2.5. Décision ouverte sur `akt-ausscheid-haeufigkeit` (§ 2.8).
- **K1** : `PROBE_SUCHT` total (148 sondes muettes → 0), qui absorbe `SUCHT_AFFINE` ; `followUpSucht` ; `parts` des sondes énumératives (`*-systemisch`, `akt-infekt-herd`, `akt-begleit`) ; DM1 ; DM2 (la mesure stricte trouve **0** relance conditionnelle hors signe et **12** inconditionnelles, toutes rhumato : DM2 vise donc les conditionnelles que la lecture ne voit pas, d'où `followUpSucht` déclaré, pas lu) ; `phraseFollowUp`. Le gel `trame-actuelle.txt` est à régénérer par DM1 (`vitest -u`) : son diff dit quels cas bougent.
- **K2** : `profil` des 130 cas (proposé par `profilPropose`, relu) ; **les 56 réponses de banque** (liste § 4) ; INV-80. Les tags `hals` (57 cas), `stein` (45), `meningitis` (27), `steifigkeit` (32) sortent très larges de la lecture : c'est là que la relecture clinique pèsera.
- **K3** : `cohere` (remplace `dedupeBySymptom` et `FACH_COVERS`) ; `nonReduit` et `casRetiresParR1` deviennent mesurables ; K3 compare à `trame-actuelle.txt` et `fach-covers.txt`. Il lui faudra la sortie brute de `fachChapterRaw` (non exportée, I3) : le gel porte la Fach jouée, pas la Fach brute, donc il ne dit pas quelle paire de `FACH_COVERS` a tiré sur chaque cas.
- **K4** : `sucht` des 829 questions, `braucht` (`brauchtViole` 20, `doublonsCas` 20). **K5** : `sucht` requis au type, porte bloquante.

## 6. Vérifications (par code de sortie, sommet de branche, après la revue et le rebase I3)

- `node scripts/check*.mjs` du job `contrats` : **tous 0** — `checkProbeCoverage`, `checkMusterCoverage`, `checkCaseCoherence`, `checkGuideCoverage`, `checkGuideDuplicates`, `checkUiTells`, `checkCaseQuestionChapters`, `checkPatientWorte`, `checkPlayedTrame`, `checkTrameSymptoms`, `checkQuestionAtomicity`, `checkBudgetFloor.mjs origin/main`, `evalDoctopus.mjs --dry`, `checkTherapieLabels`, `checkFachwissenVisuals`, `checkAllergyConflicts`, `checkCaseTermLinks`, `checkTermRegister --require-all`, `checkBedeutung`, `checkCaseCohesion`, `checkQuestionOrder`, `checkCaseQuestionAnswers`, `checkCoherence`. **Une exception** : `checkProbeOverlap.mjs` sort 1 (5 répétitions non marquées, ex. `fach-pneumo-giemen` / `akt-atemnot-geraeusch` 67 %) ; son job porte `|| true` et K0 ne touche ni `anamneseProbes.ts` ni `seedCases.ts` (`git diff 0cb840d5 --stat` vide sur les deux) : préexistant : rejoué sur `origin/main` @ `ff87f4e0` (worktree jetable), il sort 1 aussi.
- `node --test` : `checkQuestionAtomicity`, `checkTrameSymptoms`, `checkBudgetFloor` (13 tests, dont 4 nouveaux), `checkProbeCoverage`, `checkQuestionOrder`, `checkCaseQuestionAnswers`, `checkCoherence` (22 : 12 de la mesure + 10 de la porte), `linkCaseTerms`, `checkCaseTermLinks`, `checkTermRegister`, `checkBedeutung` : **tous 0**.
- `npx tsc -b --noEmit` : **0**. `npx vitest run --dir src/data --maxWorkers=2` : **0** (271 tests, main inclus). `git merge-tree --write-tree origin/main HEAD` : **0** (aucun conflit).
- **Aucun comportement changé** : `trameActuelle.test.ts` fige la structure de la trame jouée des 130 cas (1 610 lignes, relances comptées depuis m5) et la table `FACH_COVERS` (61 entrées) ; il reste vert sur toute la branche. Ses mutations rougissent : une entrée `FACH_COVERS` vidée (test de la table), la réduction par `parts` de `dedupeBySymptom` désactivée (test de la trame).
- Mutations de la porte (`checkCoherence.test.mjs`, copie de travail) : lexique abîmé INV-77 → 1 ; INV-78 → 1 ; motif de lecture hors lexique → 1 ; la mesure lit le lexique (`schluck` en dépistage → `horsProfil` baisse) ; plancher dépassé → 1 ; `--bless` refuse la hausse et laisse le fixture intact ; `--case` inconnu → 2.

## 7. Revue Opus du sommet d'avant rebase (`640bd4ff`) — verdict *Needs fixes* ; fixeur (5 oct.)

Verdict de la revue : aucun changement de comportement (trame des 130 cas byte-identique) ; INV-77 / INV-78 et `--bless` solides. Corrections, un commit par item, test rouge d'abord :

| Item | Commit | Correction | Preuve |
|---|---|---|---|
| **I1** | `8ed2d982` | `checkCoherence.test.mjs` vérifie l'ÉGALITÉ de la mesure `--json` (`brut` et `residu`) au fixture, plus seulement `≤` | mutation : lecture de `stuhl` désactivée → la mesure tombe sous le plancher et l'égalité rougit |
| **I2** | `72788723` | `akt-ausscheid-was` : `stuhl, miktion` + `gelbfaerbung, urin_aspekt, stuhlaussehen` (D1) | test rouge puis vert ; INV-78 (`-was` / `-haeufigkeit`) reste disjoint |
| **m2** | `db8c2acc` | `fach-endo-durst` : + `nykturie` | idem |
| **m1** | `cbab9db3` | `gedaechtnis` distinct de `konzentration` (faux doublon de `case-demenz` disparu) ; `konzentration` lit aussi « Konzentrationsprobleme » (le motif `konzentrier` la ratait) | doublons 266 → 265, `--bless` |
| **m3** | `42ce121c` | `checkBudgetFloor.test.mjs` : base entière + tête `null` → 1 ; base `null` + tête entière → 0 | mutation du garde (`h !== null` toléré) → le premier test rougit |
| **m4** | `2258146b` | le commentaire de `quality.yml` dit ce qui bloque (plancher, égalité, structure du lexique) ; seul l'affichage est informatif | — |
| **m5** | `f5ba69de` | la clé du gel compte les relances (`↳n`, `phraseFollowUp`) | 2 385 marqueurs ; hors `↳n`, le snapshot est identique octet pour octet à l'ancien |
| **m6** | `ee376809` | une seule lecture : la mesure appelle `symptomsInText` ; `SIG` ne garde que `kontakt`, `oedeme`, `polyurie` (sans motif dans `TEXT_RE`) et les ajouts de K0 | mutation de `TEXT_RE` (`stuhl`) → la mesure change et l'égalité rougit |
| **m7** | ce rapport | `akt-ausscheid-aussehen` (« Blut, Schleim oder eine ungewöhnliche Farbe aufgefallen ? ») a la **même ambiguïté selles / urine** que `akt-ausscheid-haeufigkeit` (§ 2.8) : elle est banque de `stuhlaussehen` mais cherche aussi `urin_aspekt`. **Scission en K1**, avec `akt-ausscheid-haeufigkeit` | — |

**m6 est une hausse de mesure**, acceptée et écrite au fixture (`hausses[0]`) : `doublons` 265 → **276**, `doublonsCas` 20 → **24**. Ce n'est pas du contenu qui se dégrade : la table parallèle `SIG` était plus fine que `TEXT_RE` sur quelques signes, et plus large sur d'autres.
- Nouveaux (15 doublons) : `krampf` ×5 (« oder ein Zucken ? » dans `akt-begleit`, puis `fach-neuro-anfall` ; signe jusque-là non lu, la table l'appelait `krampf_anfall`), `sehstoerung` ×4 (`fach-endo-augen` / `-folgeschaeden`), `ausschlag` ×3, `blutung`, `schwindel`, `miktion` ×1.
- Disparus (5) : `reise` ×4 (« Urlaub » n'est plus un voyage ; la question « Wird es im Urlaub besser ? » n'est plus non plus une anaphore, sinon `brauchtViole` passait à 23) et `konzentration` ×1.
- Deux corrections de lecture qui vont avec : `TEXT_RE` `schlaf` ne lit plus « nach Ruhe oder Schlaf » (Einfluss ; 13 faux doublons, la porte `checkTrameSymptoms` reste à 0 constat, relu 118/118) ; les parties d'une question réduite par `parts` (une même sonde) ne sont plus des unités concurrentes.
- **Reste du travail pour K1** : `TEXT_RE` reste moins précise que l'ancienne table sur des cas non triés (« Rötung » lu comme `ausschlag`). Elle sera remplacée par la déclaration.

**I3 — fait (rebase sur main après Q-gyn #70).** `git fetch && git rebase origin/main` : **rebase, pas merge — aucun conflit** (16 commits rejoués, `origin/main` @ `ff87f4e0`). Commit `1a8a8438`.
- **Gel `trame-actuelle.txt` régénéré** (`vitest -u`, rouge avant) : 50 cas changent, et seulement des sondes `frau-*` / `fach-gyn-*` — 5 cas perdent le chapitre `frauenanamnese`, fondu dans la Fach gynéco (eug, mammakarzinom, uterus-myomatosus, endometriose, adnexitis) ; 45 cas de patientes gagnent des relances sur `frau-periode`, `frau-verhuetung`, `frau-wechseljahre`. `fach-covers.txt` est inchangé. Aucune autre sonde ne bouge.
- **Mesure** : `doublons` **276 → 279** = exactement 3 × `blutung` nouveaux (`frau-periode` / `fach-gyn-blutung` dans case-eug, case-mammakarzinom, case-adnexitis), accepté avec sa raison au fixture (`hausses[1]` : « Fusion Q-gyn ; retirés par la règle 2 en K3 »). Les autres lignes du diff de mesure ne changent pas le compte : mêmes signes doublés, rangs décalés par la fusion, et `frau-periode` qui rejoint le doublon `blutung` déjà existant d'uterus-myomatosus et d'endometriose (3 → 4 unités, 1 doublon). `questionsMuettes` **829 → 825** (baisse : 4 questions du cas déclarent `sucht` dans uterus-myomatosus et adnexitis). Les 5 autres compteurs sont inchangés (`doublonsCas` 24, `horsProfil` 56, `exigeAbsent` 58, `relancesOrphelines` 0, `brauchtViole` 20, `ajouteSansReponse` 56).

## Non vérifié

- **Aucune vérification à deux onglets** (médecin + simulant) : K0 ne touche ni `features/simulation`, ni `rolePlay.ts`, ni le montage ; le gel de la trame est la preuve utile ici, un navigateur ne dirait rien de plus.
- **La CI réelle** : `quality.yml` parse (Ruby `YAML.load_file`) et les commandes ajoutées tournent en local, mais le workflow n'a pas tourné sur GitHub. `npx vitest run --dir src` complet (job `build`) n'a pas été lancé, seulement `--dir src/data`.
- **La justesse clinique des pertinences et des tags** : 12 signes tag-gated et 16 tags déclarés sont mon calibrage sur les 130 cas, non relu par un clinicien. Les chiffres (b), (c), (e) sont des estimations à 50-70 %.
- **`graphify update app/src`** : le graphe n'existe pas dans ce worktree ; non relancé.
