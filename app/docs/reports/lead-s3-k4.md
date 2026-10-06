# Rapport lot K4 — les questions du cas déclarent ce qu'elles posent ; les sondes reçoivent leurs `parts`

> `content-case-author` (lot K4) · 5 oct. 2026 · branche `feat/s3-k4-cas`, sommet `cf6dbe67` (contenu) puis le commit de ce rapport. Base : `feat/s3-k3-cohere` @ `29c805b0`. K3 (PR #78) n'est pas encore dans `origin/main` : `origin/main` n'est donc pas fusionné ; `merge-tree` est propre contre `origin/main` (`1443bb2c`) et contre `origin/feat/s3-k3-cohere` (`fa0be537`).
> **Dernier tour (6 oct.)** : relecture de langue des parts, garde-fou d'ouverture, contre-revue P2 — § G, en tête ; il prime sur F et sur la suite.
>
> **Fixeur (6 oct.)** : les revues Opus de `7e40d224` sont traitées — § F (en tête du rapport, il prime sur les sections qui suivent quand elles divergent). Sommet après fixeur : voir § F.4. `origin/main` (K3 #78, #80) est fusionné.
>
> Statut K4 initial : **DONE_WITH_CONCERNS**. Porte après montage à 0 ; `questionsMuettes` 794 → **1** (résidu justifié, sécurité) ; `nonReduit` 103 → **0**. Deux points sont arrêtés et soumis à main (§ 5) : la question de sécurité d'anorexia-nervosa, et gastroenteritis n° 27 / n° 31 (l'option (b) ne s'applique pas sans règle nouvelle). Une hausse de mesure est documentée au plancher : `brauchtViole` 19 → 22 (détecteur Q0, § 6).

## 0. Sommet

| Plancher (`coherence-budget.json`) | K3 (`29c805b0`) | **K4** | **Fixeur** |
|---|---:|---:|---:|
| doublons | 203 | **1** | 1 |
| doublonsCas | 24 | **0** | 0 |
| horsProfil | 44 | **2** | 2 |
| exigeAbsent | 0 | 0 | 0 |
| relancesOrphelines | 0 | 0 | 0 |
| brauchtViole | 19 | **22** (hausse de mesure documentée, § 6) | **21** ; **22** après le § G (faux positif Q0, § G.4) |
| ajouteSansReponse | 0 | 0 | 0 |
| questionsMuettes | 794 | **1** | **0** |
| nonReduit | 103 | **0** | 0 |
| casRetiresParR1 | 0 | 0 | 0 |

- Porte après montage (130 cas) : `doublons`, `horsProfil`, `exigeAbsent`, `relancesOrphelines`, `brauchtViole`, `ajouteSansReponse`, `casRetiresParR1` : **0**.
- Questions jouées (130 cas, ouverture et clôture exclues) : 7 453 → **7 301**.
- Restes de `brut` : `doublons` 1 = hodentorsion, `akt-ausstrahlung` et `fach-uro-flanke` (la mesure n'applique pas `SUCHT_AUSSER` ; le moteur, si — antérieur à K4) ; `horsProfil` 2 = les deux questions du cas gardées par décision K2 m3 (pankreaskarzinom, cml : `ausstrahlung`).
- `checkTrameSymptoms` : socle 10 → **1** constat (anorexia-nervosa n° 2, § 5), `relu` 118 → **86**. `checkQuestionAtomicity` : A 424 → **423**.
- **Mesure, ce qui revient à quoi.** La mesure lit désormais la déclaration d'une question du cas déclarée (§ 1.4). Rejouée sur le contenu de K3, cette seule règle donne doublons 196, doublonsCas 21, horsProfil 42 (au lieu de 203 / 24 / 44) : le reste de la baisse vient du contenu (déclarations, parts).

## G. Dernier tour du fixeur — relecture de langue des parts, garde-fou d'ouverture, contre-revue P2

> Contre-revue clinique de `6a373ccc` : mergeable. Relecture de langue : pas prête (4 bloquants, 16 importants). Ce tour applique ses remplacements, ajoute le garde-fou demandé par main et traite les P2 de la contre-revue. Commit au § G.6.

### G.1 Langue — les remplacements de la relecture, à l'identique

Les **61** remplacements de la relecture (B1–B4, I1–I15, tous les mineurs) sont appliqués mot pour mot dans `anamneseChapters.ts`. Chaque part est repérée par son texte actuel, et le script vérifie l'ancien texte ligne par ligne avant de remplacer. I14 change aussi le texte de la mère `fach-infekt-zecke` (« Haben Sie einen Zeckenstich oder einen Insektenstich bemerkt? … »), que la relecture désignait (l. 1893). Les textes des mères (« …Kamen sie plötzlich oder schleichend? », « Strahlen sie in die Leiste aus? »…) ne changent pas : la relecture ne les visait pas, et elles ne sont posées qu'entières.

**Arrêt, puis décision prise (à valider) : deux remplacements créent un texte identique dans deux chapitres.** « Hatten Sie Schüttelfrost? » (`fach-pneumo-fieber`, mineur l. 980) est aussi la part de `veg-schuettelfrost`. « Haben Sie Probleme mit dem Stuhlgang? » (`akt-begleit`, variante nerven, I1 l. 431) est aussi la part de `fach-neuro-blase`. `checkGuideDuplicates` (règle 2) refusait ces deux textes. Dans les deux paires, les deux parts déclarent **le même signe** (`schuettelfrost`, `stuhl`), donc r2 n'en pose qu'une par trame. Je l'ai vérifié sur les 130 trames jouées : aucune ne répète ces deux textes. La règle 2 tolère désormais **une part répétée qui déclare partout le même signe** : c'est la seule exception, et un signe différent la refait échouer. Test de mutation : `scripts/checkGuideDuplicates.test.mjs` (2 tests, la porte rougit si l'une des deux parts change de signe). **Proposition** : ajouter ce fichier à la liste `node --test` de `.github/workflows/quality.yml`. Je ne l'ai pas modifié : il est hors de mon périmètre. Si main préfère des textes distincts, ce sont ces deux textes-là qui changeraient.

Ancres de tests suivies (texte seul, aucune attente affaiblie) : `coherenceRevue.test.ts` (« Hatten Sie Schüttelfrost? », « Tut es weh oder juckt es? »).

### G.2 Garde-fou : une part qui peut ouvrir une question se dit seule

- **Heuristique** (`partNonAutonome`, `src/data/guides/phrases.ts`). Le libellé de dimension (« Herd — ») est retiré avant la lecture. Une part est autonome si les trois conditions tiennent :
  1. elle s'ouvre sur un interrogatif (« Wie… », « Seit wann… ») ou sur un verbe conjugué d'une **liste fermée** (`PART_VERBES`). Une part qui s'ouvre sur un verbe nouveau échoue, et l'auteur ajoute le verbe à la liste, sous revue ;
  2. elle ne commence pas par « und / oder / dabei / dazu / auch / sonst » ;
  3. elle n'a pas d'anaphore en tête : ni « es » ou « sie » en premier mot, ni « sie » minuscule en 2e ou 3e position.
- **Limite connue** : le « es » impersonnel après le verbe (« Brennt es… », « Tut es weh… ») n'est pas distingué d'un « es » anaphorique ; il est accepté.
- **Liste blanche explicite** `PART_RELANCE_SEULE` (2 parts) : « Und beim Gehen — sind Sie schon gestürzt? » (`akt-nerven-alltag`) et « Falls ein üppiges Essen: Gab es viel Fleisch oder Alkohol, besonders Bier? » (part goutte de `fach-rheuma-ausloeser`). Elles ne sont pas autonomes, et elles **n'ouvrent aucune question de la trame jouée** : c'est vérifié sur les 130 cas.
- **Où** :
  - `partsOuvertureFautes(cases)` (`anamneseChapters.ts`) contrôle toutes les parts des 130 trames brutes, FACH_RULES comprises (201 textes distincts), puis les 130 trames jouées pour la liste blanche ;
  - test `coherenceK4.test.ts`, bloc « garde-fou de langue » : 0 faute, les ellipses de la relecture refusées et leurs remplacements acceptés, aucune entrée morte dans la liste blanche ;
  - ligne **bloquante** de `checkCoherence` : « parts en ouverture (bloquant, 0 attendu) : 0 ».

| Mutation | `coherenceK4.test.ts` | `checkCoherence` |
|---|---|---|
| G1 « Übelkeit? » remise à la place de « War Ihnen dabei übel? » | rouge (1) | rouge (1) : « ✗ part non autonome (… « Übelkeit ») : « Übelkeit? » » |
| G2 « Und beim Gehen » retirée de la liste blanche | rouge (1) | rouge (1) : « commence par « Und » sans référent » |
| G3 une part qui ouvre (B1, « Hat sich beim Stuhlgang etwas verändert? ») déclarée « relance seulement » | — | rouge (1) : « case-bph : la part « relance seulement » … ouvre une question » |

### G.3 Contre-revue clinique, P2

| Point | Fait | Preuve (trame jouée) |
|---|---|---|
| adnexitis n° 3 (Oberbauch, Schulter) | `sucht: ['schulterschmerz']` (signe nouveau, `signesDefsCas.ts`) | `REVIENT` : `akt-ausstrahlung` « Strahlen die Schmerzen irgendwohin aus? » posée ; mutation (retour à `ausstrahlung`) rouge |
| metabolisches-syndrom : la cicatrisation | `fach-endo-haut-haare` reçoit ses parts `[haut_haare]` « Haben sich Haut, Haare oder Nägel verändert? » \| `[wundheilung]` « Heilen kleine Wunden schlechter als früher? » (découpe ; « Und » tombe) ; `PROBE_SUCHT` + `wundheilung` | `REVIENT` : « Heilen kleine Wunden schlechter als früher? » posée ; mutation (sans la part) rouge |
| sturz-im-alter n° 4 | `sucht: ['sturz', 'sturz_vorgeschichte']` | `PERDANTES` : la relance « Sind Sie schon gestürzt? » de `fach-neuro-koordination` ne revient plus ; mutation rouge |
| arterielle-hypertonie n° 5 | **laissée en l'état** (décision de main) | — |
| l. 423, « oder Schmerzen » sans part (`akt-begleit`, variante nerven) | **noté, non rattaché.** Aucune part n'a un texte où le rattacher proprement : il faudrait une part `schmerz` nouvelle (déclaration nouvelle) ou retoucher la question ouverte « Haben Sie außerdem noch andere Beschwerden bemerkt? ». Entière, la question pose toujours « oder Schmerzen » ; réduite, elle le perd. Renvoyé au lot de contenu. | — |

### G.4 Mesure

`brauchtViole` 21 → **22** : « den Achselhöhlen » (metabolisches-syndrom) revient. Depuis les parts de `fach-endo-haut-haare`, la réponse de la sonde ne précède plus la question du cas. C'est un faux positif du détecteur Q0 (l'article défini d'une partie du corps), et il était déjà au K4 initial. L'entrée `hausses` passe à 19 → 22 (19 = la valeur de main) et donne cette raison. Les autres compteurs ne changent pas : doublons 1, horsProfil 2, `questionsMuettes` 0, `nonReduit` 0, `doublonsMasques` 52 (informatif). Signes : 491 → **492** (`schulterschmerz`). Gels `fach-raw.txt` et `trame-actuelle.txt` régénérés (textes de part).

### G.5 Les questions posées après correction — les 14 cas de la relecture

Pour chaque sonde **réduite** (posée par ses parts), la question telle qu'elle est posée. « part suivante » : la première part est retirée, la question s'ouvre sur une part suivante (le cas visé par le garde-fou). Les sondes posées entières ne figurent pas.

**case-bph**

| Chapitre | Sonde | Question posée (↳ relances) | Ouvre sur |
|---|---|---|---|
| Aktuelle Beschwerden | `akt-ausscheid-was` | Veränderung — Hat sich beim Stuhlgang etwas verändert? ↳ Hat sich die Farbe Ihrer Haut oder Ihrer Augen verändert? ↳ Hat sich die Farbe Ihres Stuhls verändert? | **part suivante** |
| Vegetative Anamnese | `veg-schuettelfrost` | Schwitzen Sie nachts stark? ↳ Haben Sie starke Schweißausbrüche? | **part suivante** |

**case-prostatakarzinom**

| Chapitre | Sonde | Question posée (↳ relances) | Ouvre sur |
|---|---|---|---|
| Aktuelle Beschwerden | `akt-ausscheid-was` | Veränderung — Hat sich beim Stuhlgang etwas verändert? ↳ Hat sich die Farbe Ihrer Haut oder Ihrer Augen verändert? ↳ Hat sich die Farbe Ihres Stuhls verändert? | **part suivante** |
| Vegetative Anamnese | `veg-schuettelfrost` | Schwitzen Sie nachts stark? ↳ Haben Sie starke Schweißausbrüche? | **part suivante** |
| Fach | `fach-uro-drang` | Haben Sie plötzlichen, starken Harndrang? | 1re part |

**case-schlaganfall**

| Chapitre | Sonde | Question posée (↳ relances) | Ouvre sur |
|---|---|---|---|
| Aktuelle Beschwerden | `akt-begleit` | Begleitbeschwerden — War Ihnen dabei übel? ↳ Haben Sie außerdem noch andere Beschwerden bemerkt? | **part suivante** |
| Vegetative Anamnese | `veg-uebelkeit` | Mussten Sie sich übergeben? ↳ Falls ja: Wie sah das Erbrochene aus? ↳ Falls ja: Seit wann müssen Sie sich übergeben? ↳ Falls ja: Wie oft haben Sie sich übergeben? | **part suivante** |

**case-lagerungsschwindel**

| Chapitre | Sonde | Question posée (↳ relances) | Ouvre sur |
|---|---|---|---|
| Aktuelle Beschwerden | `akt-begleit` | Begleitbeschwerden — War Ihnen dabei übel? ↳ Haben Sie außerdem noch andere Beschwerden bemerkt? | **part suivante** |
| Vegetative Anamnese | `veg-uebelkeit` | Mussten Sie sich übergeben? ↳ Falls ja: Wie sah das Erbrochene aus? ↳ Falls ja: Seit wann müssen Sie sich übergeben? ↳ Falls ja: Wie oft haben Sie sich übergeben? | **part suivante** |

**case-vorhofflimmern**

| Chapitre | Sonde | Question posée (↳ relances) | Ouvre sur |
|---|---|---|---|
| Aktuelle Beschwerden | `akt-begleit` | Begleitbeschwerden — War Ihnen dabei schwindelig? ↳ War Ihnen dabei übel? ↳ Haben Sie außerdem noch andere Beschwerden bemerkt? | **part suivante** |
| Vegetative Anamnese | `veg-schuettelfrost` | Hatten Sie Schüttelfrost? ↳ Schwitzen Sie nachts stark? | 1re part |
| Vegetative Anamnese | `veg-uebelkeit` | Mussten Sie sich übergeben? ↳ Falls ja: Wie sah das Erbrochene aus? ↳ Falls ja: Seit wann müssen Sie sich übergeben? ↳ Falls ja: Wie oft haben Sie sich übergeben? | **part suivante** |
| Medikamente | `med-blutverduenner` | Nehmen Sie Kortison? | **part suivante** |

**case-synkope**

| Chapitre | Sonde | Question posée (↳ relances) | Ouvre sur |
|---|---|---|---|
| Aktuelle Beschwerden | `akt-begleit` | Begleitbeschwerden — War Ihnen dabei schwindelig? ↳ Haben Sie dabei geschwitzt? ↳ War Ihnen dabei übel? ↳ Haben Sie außerdem noch andere Beschwerden bemerkt? | **part suivante** |
| Vegetative Anamnese | `veg-schuettelfrost` | Hatten Sie Schüttelfrost? ↳ Schwitzen Sie nachts stark? | 1re part |
| Vegetative Anamnese | `veg-uebelkeit` | Mussten Sie sich übergeben? ↳ Falls ja: Wie sah das Erbrochene aus? ↳ Falls ja: Seit wann müssen Sie sich übergeben? ↳ Falls ja: Wie oft haben Sie sich übergeben? | **part suivante** |

**case-pneumonie**

| Chapitre | Sonde | Question posée (↳ relances) | Ouvre sur |
|---|---|---|---|
| Aktuelle Beschwerden | `akt-infekt-herd` | Herd — Haben Sie Halsschmerzen? ↳ Brennt es beim Wasserlassen? ↳ Haben Sie Durchfall? ↳ Ist Ihnen ein Ausschlag aufgefallen? ↳ Haben Sie irgendwo eine Wunde? | **part suivante** |
| Vegetative Anamnese | `veg-schuettelfrost` | Schwitzen Sie nachts stark? ↳ Haben Sie starke Schweißausbrüche? | **part suivante** |
| Fach | `fach-pneumo-fieber` | Hatten Sie Schüttelfrost? | **part suivante** |

**case-sinusitis**

| Chapitre | Sonde | Question posée (↳ relances) | Ouvre sur |
|---|---|---|---|
| Aktuelle Beschwerden | `akt-infekt-herd` | Herd — Haben Sie Halsschmerzen? ↳ Brennt es beim Wasserlassen? ↳ Haben Sie Durchfall? ↳ Ist Ihnen ein Ausschlag aufgefallen? ↳ Haben Sie irgendwo eine Wunde? | **part suivante** |
| Vegetative Anamnese | `veg-schuettelfrost` | Schwitzen Sie nachts stark? ↳ Haben Sie starke Schweißausbrüche? | **part suivante** |
| Fach | `fach-pneumo-fieber` | Hatten Sie Schüttelfrost? | **part suivante** |

**case-bronchialkarzinom**

| Chapitre | Sonde | Question posée (↳ relances) | Ouvre sur |
|---|---|---|---|
| Aktuelle Beschwerden | `akt-veraend-was` | Befund — Ist Ihnen eine Hautveränderung aufgefallen? ↳ Sind Ihnen blaue Flecken aufgefallen? ↳ Ist Ihnen eine Blutung aufgefallen? | **part suivante** |
| Aktuelle Beschwerden | `akt-veraend-blutung` | Schmerz und Blutung — Tut es weh oder juckt es? | 1re part |
| Vegetative Anamnese | `veg-schuettelfrost` | Hatten Sie Schüttelfrost? ↳ Haben Sie starke Schweißausbrüche? | 1re part |
| Fach | `fach-onko-blutung` | Haben Sie Blut im Stuhl bemerkt? ↳ Haben Sie Blut im Urin bemerkt? ↳ Haben Sie Blutungen aus der Scheide bemerkt? | 1re part |

**case-mammakarzinom**

| Chapitre | Sonde | Question posée (↳ relances) | Ouvre sur |
|---|---|---|---|
| Aktuelle Beschwerden | `akt-veraend-was` | Befund — Ist Ihnen eine Hautveränderung aufgefallen? ↳ Sind Ihnen blaue Flecken aufgefallen? ↳ Ist Ihnen eine Blutung aufgefallen? | **part suivante** |
| Aktuelle Beschwerden | `akt-veraend-blutung` | Schmerz und Blutung — Tut es weh oder juckt es? | 1re part |
| Vegetative Anamnese | `veg-ausscheidung` | Haben Sie Schwierigkeiten mit dem Stuhlgang? ↳ Falls ja: Seit wann, und wie oft täglich? Können Sie das Aussehen des Stuhls näher beschreiben? | 1re part |

**case-myokardinfarkt**

| Chapitre | Sonde | Question posée (↳ relances) | Ouvre sur |
|---|---|---|---|
| Aktuelle Beschwerden | `akt-beginn` | Beginn — Kamen die Schmerzen plötzlich oder schleichend? | **part suivante** |
| Vegetative Anamnese | `veg-schuettelfrost` | Hatten Sie Schüttelfrost? ↳ Schwitzen Sie nachts stark? | 1re part |
| Vegetative Anamnese | `veg-uebelkeit` | Mussten Sie sich übergeben? ↳ Falls ja: Wie sah das Erbrochene aus? ↳ Falls ja: Seit wann müssen Sie sich übergeben? ↳ Falls ja: Wie oft haben Sie sich übergeben? | **part suivante** |

**case-zoster**

| Chapitre | Sonde | Question posée (↳ relances) | Ouvre sur |
|---|---|---|---|
| Aktuelle Beschwerden | `akt-beginn` | Beginn — Kamen die Schmerzen plötzlich oder schleichend? | **part suivante** |
| Medikamente | `med-blutverduenner` | Nehmen Sie Blutverdünner? | 1re part |
| Fach | `fach-derma-beginn-ort` | Wo hat die Hautveränderung angefangen? ↳ Ist die Stelle größer geworden? | 1re part |
| Fach | `fach-derma-systemisch` | Haben Sie dazu Fieber? ↳ Haben Sie dazu Veränderungen im Mund oder im Genitalbereich bemerkt? | 1re part |

**case-diabetes**

| Chapitre | Sonde | Question posée (↳ relances) | Ouvre sur |
|---|---|---|---|
| Aktuelle Beschwerden | `akt-allgemein-art` | Art — Ist Ihnen schwindelig, oder spüren Sie etwas anderes? ↳ Können Sie es beschreiben? | **part suivante** |
| Vegetative Anamnese | `veg-schuettelfrost` | Hatten Sie Schüttelfrost? ↳ Schwitzen Sie nachts stark? | 1re part |
| Fach | `fach-endo-hals` | Haben Sie eine Schwellung am Hals oder ein Engegefühl bemerkt? ↳ Haben Sie eine Veränderung der Stimme bemerkt? | 1re part |
| Fach | `fach-endo-augen` | Haben sich Ihre Augen verändert — hervortretende Augen, Druckgefühl? | 1re part |
| Fach | `fach-endo-folgeschaeden` | Haben Sie Probleme mit den Nieren? | **part suivante** |
| Fach | `fach-endo-familie-therapie` | Werden Sie selbst schon wegen einer Zucker- oder Schilddrüsenerkrankung behandelt oder kontrolliert? | **part suivante** |

**case-hypothyreose**

| Chapitre | Sonde | Question posée (↳ relances) | Ouvre sur |
|---|---|---|---|
| Aktuelle Beschwerden | `akt-allgemein-art` | Art — Ist Ihnen schwindelig, oder spüren Sie etwas anderes? ↳ Können Sie es beschreiben? | **part suivante** |
| Vegetative Anamnese | `veg-schuettelfrost` | Hatten Sie Schüttelfrost? ↳ Schwitzen Sie nachts stark? | 1re part |
| Fach | `fach-endo-folgeschaeden` | Haben Sie Kribbeln oder Taubheit in den Füßen? ↳ Haben Sie Probleme mit den Nieren? | 1re part |
| Fach | `fach-endo-familie-therapie` | Werden Sie selbst schon wegen einer Zucker- oder Schilddrüsenerkrankung behandelt oder kontrolliert? | **part suivante** |

### G.6 Vérifications — codes de sortie

Sommet vérifié : `549c2c23` (code). Base : `origin/main` fusionnée à `3c4ce5fa`. Depuis, main n'a reçu que deux commits de registre (`app/docs/reports/serie3-avancement.md`) ; `merge-tree` contre `acc4d6dd` est propre, donc je n'ai pas refusionné.

| Commande | Code |
|---|---:|
| `checkCoherence.mjs` (mesure = plancher ; porte après montage et parts en ouverture à 0) | **0** |
| `checkBudgetFloor.mjs origin/main` (`brauchtViole` 19 → 22, hausse documentée) | **0** |
| `checkTrameSymptoms`, `checkQuestionAtomicity` (A 423, A2 48), `checkGuideDuplicates` | **0** |
| gels `fachRaw` / `trameActuelle` (dans vitest) | **0** |
| `npx tsc -b --noEmit` | **0** |
| `npx vitest run --dir src --maxWorkers=2` (179 fichiers, 1 872 tests) | **0** |
| `node scripts/check*.mjs` (23) | **0**, sauf `checkProbeOverlap` **1** (informatif, `\|\| true` en CI) |
| `node --test scripts/*.test.mjs` (183 tests, dont les 2 de `checkGuideDuplicates.test.mjs`) | **0** |
| `git merge-tree --write-tree origin/main HEAD` (`acc4d6dd`) | **0** |

Le premier vitest complet de ce tour sortait à 1 : 4 ancres de texte (« Hatten Sie dabei Schüttelfrost? », « Tut es weh, juckt es? » ×2) et le nombre de signes. Je les ai mises à jour, puis j'ai relancé vitest en entier : 0.

### G.7 Non vérifié

- **La langue des remplacements** : appliqués tels quels, sans relecture de ma part. Annexe F mise à jour : 110 parts qui ne sont pas des sous-chaînes de leur variante, au lieu de 83, puisque les compléments du cadre verbal en ajoutent.
- **L'heuristique du garde-fou** : elle est prouvée sur les 201 parts actuelles et sur les ellipses de la relecture, pas au-delà. Le « es » impersonnel n'est pas distingué.
- **CI** : `checkGuideDuplicates.test.mjs` n'est pas dans la liste `node --test` de `quality.yml` (proposition, § G.1).
- Navigateur, contenu publié : non faits.

## F. Fixeur — les revues Opus de `7e40d224` (décisions de main)

> Commit `1f14777b` (corrections), puis la fusion d'`origin/main` (K3 #78 et #80 mergés) et le commit de ce rapport. Règle tenue : **chaque correctif rend la question perdue**. Un test sur la **trame jouée** le prouve (`coherenceK4.test.ts`, tables `REVIENT` et `PERDANTES`).

### F.1 Clinique — la question perdue revient

| Constat | Cas, question | Déclaration avant → après | Ce qui revient (test `REVIENT`, trame jouée) |
|---|---|---|---|
| **P0** | nephrotisches-syndrom n° 4 « Flankenschmerzen, … dickere Wade oder Blut im Urin » | `…, urin_aspekt` → `…, haematurie` | `fach-nephro-aussehen` : « schaumig » |
| P1 | nierenkolik n° 3 « Schwellung im Hodensack » | `ausstrahlung, hodenschwellung` → `hodenschwellung` | `fach-uro-flanke` : l'irradiation vers l'aine (« Leiste ») |
| P1 | asthma n° 0, pertussis n° 4 « zwischen den Anfällen beschwerdefrei » | `verlauf` → `beschwerdefreies_intervall` | `akt-verlauf` : « anfallsartig » |
| P1 | tvt n° 0 « im Verhältnis zu Ihrem Flug » | `immobilisation` (braucht `beginn`) → `flug` (braucht `beginn`) | `fach-gefaess-immobilisation` : « unbeweglich » ; la question suit Beginn (test d'ordre) |
| P1 | mammakarzinom n° 1 « gerötet, überwärmt, Orangenhaut » | `brust` → `peau_orange` | `fach-gyn-brust` : « Absonderungen » |
| P1 | uterus-myomatosus n° 0 « wie lange, wie viele Binden » | `vaginalblutung` → `blutungsstaerke` | `fach-gyn-blutung` : « Zwischenblutungen » |
| P1 | malaria n° 6 (asplénie : Pneumokokken, Meningokokken) | `impfung` → `asplenie_impfung` | `fach-infekt-impfung` : « Impfungen » |
| P1 | malaria n° 3 « Moskitonetz, Mückenschutz » | `insektenstich` → `mueckenschutz` | `fach-infekt-zecke` : la part « Insektenstich » |
| P1 | lagerungsschwindel n° 1 « zu einer Seite hin schlimmer » | `lageabhaengig` → `seite_lagerung` (braucht `lageabhaengig`) | `akt-neuro-lage` : « Kopf drehen » ; la question suit (test d'ordre) |
| P1 | zystitis n° 3 « schon öfter eine Blasenentzündung » | `harnwegsinfekt` → `frueher, harnwegsinfekt` | `akt-frueher` sort (test `PERDANTES`) ; `aktuellSkip` : voir plus bas |
| P2 | myokardinfarkt : übel \| erbrochen | signe nouveau `erbrechen` ; `veg-uebelkeit` et `fach-gastro-uebelkeit` en deux parts | `veg-uebelkeit` : « übergeben » |
| P2 | commotio n° 3 (prodromes du sturz) | `unfallhergang, schwindel, schwitzen, herzrasen` → `unfallhergang, prodromi` | `fach-neuro-koordination` : « Schwindel » ; `veg-schuettelfrost` : « Schweiß » |
| P2 | ileus n° 5 (sang ; « Stuhlgang verändert ») | `stuhl_blut, stuhl` → `stuhl_blut, stuhlgewohnheit` | `fach-chir-ileus` : « heute Stuhlgang » |
| P2 | akutes-nierenversagen n° 1 | `uebelkeit, stuhlfrequenz` → `trinkmenge, stuhlfrequenz`, braucht **`erbrechen`** | la question suit ce qui demande le vomissement (test d'ordre) ; écart ci-dessous |
| P2 | hypothyreose n° 7 « nach einer Ihrer Entbindungen » | `postpartum` → `postpartum` (braucht `kinder`) | la question suit « Haben Sie Kinder? » (test d'ordre) |
| P2 | panikstoerung n° 0 (crises nocturnes) | `ausloeser`, `relu` → `ausloeser, naechtliche_anfaelle`, **sans `relu`** | déclarée au lieu de relue (`relu` 86 → 85) |

**Écarts à la lettre de la décision, à valider :**

- **ANV : `braucht ['erbrechen']`, pas `['uebelkeit']`.** La question présuppose le vomissement (« wie oft mussten Sie erbrechen »). Depuis le découpage übel \| erbrochen (P2 myokardinfarkt), c'est un signe distinct ; `braucht ['uebelkeit']` placerait la question après la seule nausée. `checkTrameSymptoms` lisait alors « erbrechen » (lu `uebelkeit`) comme un doublon de la Fach néphro : un signe de `braucht` est une présupposition (contrat §1 : « signes déjà cherchés avant elle »), le citer n'est pas le redemander. La porte exempte désormais `sucht` **et** `braucht` (`checkTrameSymptoms.mjs`, une ligne). Test de mutation : sans le `braucht`, la porte rougit (`checkTrameSymptoms.test.mjs`).
- **zystitis : `aktuellSkip` = `akt-ausscheid-was` et `akt-ausscheid-aussehen`.** Avec la seule Veränderung retirée, la part « Ist Ihnen eine ungewöhnliche Farbe im Stuhl aufgefallen? » d'`akt-ausscheid-aussehen` (jusque-là retirée par la Veränderung) revenait à sa place : la couleur des selles restait posée dans une cystite. J'ai étendu le saut à cette sonde, dans l'intention de la décision (« ni ictère ni couleur des selles »). Les selles restent demandées en végétatif (« Haben Sie Schwierigkeiten mit dem Stuhlgang? »). Test : les deux sondes sont absentes, la végétative demande le Stuhlgang. Le test FACH_COVERS reste exact sans changement (la paire `fach-uro-farbe -> akt-ausscheid-aussehen` ne s'applique plus à zystitis).
- **malaria, la tique** : `fach-infekt-zecke` revient par sa part « Insektenstich ». La part « Zecke » reste hors profil (r1, profil malaria sans `zecke`) : c'est voulu.
- **Le signe `erbrechen` (nouveau, base)** : 12 questions du cas qui demandaient le vomissement sous `uebelkeit` le déclarent désormais (gib n° 0, appendizitis n° 2, meningitis n° 2, otitis-media n° 5, ileus n° 1, schenkelhalsfraktur n° 2, leistenhernie n° 3, commotio n° 6, itp n° 5, diabetes-typ1 n° 3, pertussis n° 3, ptbs n° 5 ; `uebelkeit, erbrechen` quand la question demande les deux). `SIGNE_AFFINE` : `erbrechen → uebelkeit` (la lecture du texte lit « erbrechen » comme la nausée). La relance de la part « Mussten Sie sich übergeben? » est la relance de la sonde, découpée en trois (« Falls ja: Können Sie das Erbrochene beschreiben? » ↳ « Seit wann? » ↳ « Wie häufig? ») : en un seul morceau, la règle A comptait deux fois le même énoncé (sonde et part). À la relecture de langue.
- **anorexia-nervosa n° 2** (« …nach dem Essen übergeben? », `selbstinduziertes_erbrechen`) : dernier constat du socle `checkTrameSymptoms`, inchangé. Avec `erbrechen` désormais signe, un `SIGNE_AFFINE` `selbstinduziertes_erbrechen → erbrechen` laisserait r2 retirer « Mussten Sie sich übergeben? » en végétatif — non fait (hors de la liste de main) ; à décider en K5.

**D-1 — anorexia-nervosa n° 7** : déclarée `todeswunsch` (signe nouveau, `signesDefsCas.ts`), ajouté à `RISIKO_SIGNES` (`coherence.ts`). Interrogatoire gradué : le désir de mort en Aktuelle Beschwerden (la question du cas), puis l'idéation, le plan et le NOTFALL en Fach psy (`fach-psych-suizid` garde `suizid` et ses relances : signes différents, r2 ne touche rien). Test D-1 : `todeswunsch` est cherché une fois (aktuell), « konkrete Pläne » et « NOTFALL » sont posés, et la garantie de risque tient sur le cas (chaque signe de `RISIKO_SIGNES` de la trame brute est cherché par la trame jouée). Le test SÉCURITÉ des 10 cas psy attend `todeswunsch` en plus pour anorexia-nervosa. Mutation : `todeswunsch` hors de `RISIKO_SIGNES` → rouge. **`questionsMuettes` = 0.**

**D-2 — gastroenteritis n° 27 / n° 31** : résidu accepté, non traité.

### F.2 Mécanique

**I-1 — le texte d'une part.** Contrat `docs/contracts/frage-atomique.md` §10.4, précision ajoutée : une part est une découpe du texte de sa variante (question, relance ou alternative de la même variante), avec au plus un complément grammatical minimal (article, flexion, anaphore résolue par le nom qu'elle reprend dans la même variante), sans aucune notion clinique nouvelle ; tout autre texte relève du lot de contenu.
- `fach-derma-beginn-ort` : la part « Ist die Stelle größer geworden? » est rattachée au texte existant — c'est mot pour mot l'alternative de la sonde (une sous-chaîne, elle sort de la liste).
- `fach-onko-blutung` : « Blutungen im Urin » → « Haben Sie Blut im Urin bemerkt? ».
- La liste des **83 parts qui ne sont pas des sous-chaînes** de leur variante est en **annexe F** (81 textes distincts ; « Haben Sie außerdem noch andere Beschwerden bemerkt? » ×3). À signaler : ces trois parts `begleit` d'`akt-begleit` reprennent la question ouverte **par défaut** de la sonde (`akt-begleit` sans variante), pas le texte de la variante énumérative : c'est la même sonde, mais pas la même variante. À trancher par la relecture.

**I-2 — le critère est l'IDENTITÉ de la question (§10.1), pas « la fiche dit plus ».** perikarditis n° 0, myokarditis n° 2 → `einfluss` ; somatoforme-schmerzstoerung n° 6 → `nachtschmerz, einfluss`. Les trois retirent `akt-einfluss` (test `PERDANTES`). J'ai relu chaque ligne du § 2 qui suivait l'ancien critère :

| § 2, ligne | Décision | Raison (identité de la question) |
|---|---|---|
| eug n° 5, adnexitis n° 3 | **revient** à `ausstrahlung` | « Strahlt der Schmerz in die Schulter aus? » est la question de l'irradiation, adaptée au cas |
| metabolisches-syndrom n° 6 | **revient** à `haut_haare` | la question de la peau, adaptée (Nacken, Achseln) ; la cicatrisation n'en fait pas une autre question |
| arterielle-hypertonie n° 5 | **revient** à `schwitzen, herzrasen, blaesse, temperaturtoleranz` (D1) | une énumération déclare chaque signe qu'elle demande |
| lagerungsschwindel n° 4 | **revient** à `ausloeser` | « Gab es davor einen Sturz…? » est la question du déclencheur |
| perikarditis n° 0, myokarditis n° 2 | `einfluss` | décision de main |
| tvt n° 0 | `flug` (braucht `beginn`) | décision de main (P1) |
| commotio n° 6 | gardée (`erbrechen, entwicklung`) | « Wird der Kopfschmerz stärker? » présuppose la céphalée : autre question que son siège et son caractère |
| anaemie n° 1 | gardée (`vaginalblutung`) | Q-gyn : `frau-wechseljahre` n'est jamais perdue |
| endokarditis n° 6, urtikaria n° 4 | gardées (`allergie_reaktion`, braucht `allergie`) | autre question : elle présuppose l'allergie connue et demande la réaction |
| epilepsie n° 2, n° 3 | gardées | (e) : un antécédent n'est pas le symptôme du jour |
| malaria n° 0 | gardée (`aufenthalt`, braucht `reise`) | autre question : où, pas si |
| obstipation n° 1 | gardée (`blutungsquelle`, braucht `stuhl_blut`) | présuppose le sang : autre question |
| eug n° 0, karzinoid n° 6 | gardées | Q-gyn |
| zystitis n° 2 | gardée (`sexualkontakt`) | autre question que l'entrée en matière de la Sexualanamnese |
| pneumothorax n° 2, rheumatisches-fieber n° 3, diabetes-typ1 n° 1 | gardées | ajouts de signe, déjà conformes à l'identité |

Compteur **`doublonsMasques`** (informatif, hors plancher, pour K5) dans `coherenceMesure.mjs` / `checkCoherence.mjs` : une question du cas déclarée dont le texte nomme un signe qu'une autre question jouée cherche, hors sa déclaration et ses `SIGNE_AFFINE`. Valeur : **54**. `--case <id>` liste les siens. Test rouge d'abord (`checkCoherence.test.mjs` « K4 fixeur (I-2) »).

**I-3 — les tests des doublons renvoyés vérifient la trame jouée.** Table `PERDANTES` (`coherenceK4.test.ts`) : pour chaque doublon, la sonde perdante n'est plus posée **avec ce signe** dans la trame jouée, et un seul élément le cherche (zystitis ×4, lyme ×2, rheumatoide-arthritis, uterus ×2, schenkelhalsfraktur ×3, itp, zoeliakie, perikarditis, myokarditis, somatoforme). Les mutations des revues, rejouées sur `coherenceK4.test.ts` **seul** (sans le gel `trame-actuelle`) :

| Mutation | Résultat |
|---|---|
| M1 zystitis n° 0 `urin_aspekt` → `miktion` | rouge |
| M2 lyme n° 0 `erythem_ring` → `ausschlag` | rouge |
| M3 rheumatoide-arthritis n° 0 `einfluss` → `stress_ausloeser` | rouge |
| M4 uterus n° 4 sans `haematome` | rouge |
| M5 nephrotisches n° 4 revient à `urin_aspekt` (P0) | rouge |
| M6 (m-1) un signe des sondes repris dans `signesDefsCas` | rouge |
| M7 `todeswunsch` hors `RISIKO_SIGNES` | rouge |
| M8 zystitis sans le saut d'`akt-ausscheid-aussehen` | rouge |

Rejouées après les dernières corrections, chacune par `vitest run src/data/guides/coherenceK4.test.ts` sur le fichier muté puis restauré : code de sortie **1** pour les huit.

**m-1** : test « SIGNES de base et DEFS_CAS disjoints » (`DEFS_BASE` exporté de `signesDefs.ts`). **m-2** : renvoyé à K5.

### F.3 Mesure après le fixeur

| Compteur | K4 (`7e40d224`) | **Fixeur** |
|---|---:|---:|
| doublons | 1 | 1 |
| doublonsCas | 0 | 0 |
| horsProfil | 2 | 2 |
| exigeAbsent, relancesOrphelines, ajouteSansReponse | 0 | 0 |
| brauchtViole | 22 | **21** |
| questionsMuettes | 1 | **0** |
| sondesMuettes, nonReduit, casRetiresParR1 | 0 | 0 |
| doublonsMasques (informatif) | — | 54 |

- `brauchtViole` 22 → 21 : metabolisches-syndrom « den Achselhöhlen » disparaît ; hypothyreose « Ihrer Entbindungen » reste (faux positif du détecteur Q0 : la question est désormais après « Haben Sie Kinder? », qu'il ne lit pas comme l'antécédent). L'entrée `hausses` est réécrite en conséquence (de la valeur de la base à 21).
- Signes : 485 → **491** (`erbrechen` en base ; `signesDefsCas` 262 → 267).
- `checkTrameSymptoms` : 1 constat (anorexia-nervosa n° 2), `relu` 86 → **85**. `checkQuestionAtomicity` : inchangé (A 423, A2 48).
- Gels régénérés (`trame-actuelle.txt`, `fach-raw.txt`) : les parts übel \| erbrochen, les déclarations ci-dessus.

### F.4 Vérifications après fusion d'`origin/main` (`3c4ce5fa`, K3 #78 et #80 inclus) — codes de sortie

Sommet vérifié : `531b5885` (fusion) sur `1f14777b` (corrections). Chaque code est lu par `$?` juste après sa commande.

| Commande | Code |
|---|---:|
| `checkCoherence.mjs` (mesure = plancher ; porte après montage à 0) | **0** |
| `checkBudgetFloor.mjs origin/main` (`brauchtViole` 19 → 21, hausse documentée, `de` = valeur de main) | **0** |
| `checkTrameSymptoms.mjs` (socle 1 constat, `relu` 85) | **0** |
| `checkQuestionAtomicity.mjs` | **0** |
| `fachRaw` / `trameActuelle` (gels, dans vitest) | **0** |
| `npx tsc -b --noEmit` | **0** |
| `npx vitest run --dir src --maxWorkers=2` (179 fichiers, 1 866 tests) | **0** |
| `node scripts/check*.mjs` (23, hors `*.test.mjs`) | **0**, sauf `checkProbeOverlap` **1** (informatif, `\|\| true` en CI) |
| `checkTermRegister.mjs --require-all` | **0** |
| `node --test scripts/*.test.mjs` (181 tests) | **0** |
| `git merge-tree --write-tree origin/main HEAD` | **0** |

Avant la fusion, sur `1f14777b` : les mêmes, tous 0 (vitest 171 fichiers / 1 775 tests ; `checkBudgetFloor.mjs origin/feat/s3-k3-cohere` 0).

### F.5 Non vérifié (fixeur)

- La **langue** des parts (annexe F) et des trois relances découpées de « Mussten Sie sich übergeben? » : relecture de langue annoncée.
- Le **jugement clinique** des écarts signalés en F.1 (ANV `braucht ['erbrechen']`, zystitis `akt-ausscheid-aussehen`, les 12 questions passées à `erbrechen`) : contre-revue clinique annoncée.
- Les 54 `doublonsMasques` ne sont pas relus un à un (compteur informatif, K5).
- Navigateur, contenu publié : non faits (aucun serveur, aucune prod).

## 1. Ce qui est livré

### 1.1 Les questions du cas déclarent `sucht` (et `braucht`)

- **793** questions du cas sur 794 muettes reçoivent leur `sucht` ; 21 reçoivent un `braucht`. Chaque déclaration a été écrite sur le texte de la question, puis relue contre ce que le moteur en fait (§ 2, § 3).
- La règle tenue (identité, §10.1) : **deux questions cherchent le même signe ssi la fiche y répond par la même réplique.** Je l'ai rendue opératoire ainsi :
  - la question du cas reprend une sonde **dans sa forme adaptée au cas** (Zeichnung pour Ort, « um wie viel Uhr » pour Beginn, « Was haben Sie gemacht, als es losging » pour Auslöser) → le signe de la sonde ; r2 garde la question du cas (rang 0) et la met à la place de la sonde (précédent K3 : fibromyalgie) ;
  - la question du cas est **une autre question** que la sonde ouverte du chapitre (« Gallensteine bekannt ? » ≠ « Vorerkrankungen ? ») → un signe propre ; la sonde ouverte reste. *Fixeur (revue I-2)* : le critère est l'**identité de la question** (§10.1), pas « la fiche répond plus large » — une question adaptée au cas (« besser, wenn Sie sich nach vorne beugen ») est la question de la sonde (`einfluss`) ; § F.2 ;
  - **D1** : une énumération déclare chaque signe qu'elle demande ; les exemples d'un déclencheur ne sont pas déclarés (identité (f)) ;
  - **Q-gyn** : une sonde de la Frauenanamnese n'est jamais perdue — une question du cas qui la prolonge a son signe (`schwangerschaftstest`, `hitzewallung`) ;
  - **(e)** : un antécédent n'est pas le symptôme actuel (`naechtliche_anfaelle` ≠ `zungenbiss` de la crise du jour).
- **262 signes nouveaux**, propres aux questions du cas, dans `src/data/guides/signesDefsCas.ts` (étalés dans `DEFS`, `signesDefs.ts:269`). Tous de dépistage, sans banque : r1 et r3 n'y touchent pas. Chacun porte un commentaire (sa réplique). Ils sont réutilisés d'un cas à l'autre quand la réplique est de même nature (`nsar` ×9, `herz_vorgeschichte` ×10, `familie_aehnlich` ×10…). Test : aucun n'est mort (§ 7). Voir le concern § 5.4.
- **M3** : le cast `(q as { braucht?: string[] })` est retiré (`anamneseChapters.ts:1790`).

### 1.2 Lexique et profils

- Signe `gicht_ausloeser` (pertinence `gicht`), porté par une part de `fach-rheuma-ausloeser` (§ 1.3).
- `fazialis` : pertinence `lyme` → `lyme, meningitis` (la paralysie faciale complique une otite ; otitis-media n° 5).
- `SIGNE_AFFINE` (`signes.ts`) : `urin_aspekt` couvre aussi `blutung` ; `pruritus` → `juckreiz` ; `haematospermie` → `blutung`. Ce sont les lectures grossières du texte que ces signes fins couvrent (même mécanisme que `blutungsneigung` → `blutung`).
- Profils : un tag ajouté là où une question du cas déclarée sortait du profil (r1 la gardait en `anomalie`). Chaque ajout dit ce que la question demande :

| Cas | Tag | Question du cas |
|---|---|---|
| reizdarm | `gelenk` | n° 5, manifestations extra-intestinales (Gelenkschmerzen) |
| nephrotisches-syndrom | `gelenk` | n° 3, lupus (Gelenkschmerzen, Ausschlag, Licht) |
| ileus | `transit` | n° 5, sang / selles noires, transit changé |
| schenkelhalsfraktur | `anfall` | n° 1, morsure de langue, perte d'urine (chute inexpliquée) |
| alkoholentzug | `gastro` | n° 4, hématémèse, méléna |
| uterus-myomatosus | `harn` | n° 2, pollakiurie, nycturie (compression vésicale) |
| achalasie | `reise` | n° 7, Amérique du Sud (Chagas) ; la sonde « Ausland » de veg-fieber cède à la question du cas |
| hueftkopfnekrose | `gastro` | n° 7, poussée de la maladie intestinale connue |

### 1.3 Les `parts` (51 sondes) et la règle FACH_RULES

- `parts` découpées du texte de la sonde, sans texte nouveau : `med-blutverduenner`, `akt-ausscheid-was`, `akt-begleit` (3 variantes énumératives), `akt-infekt-herd`, `akt-veraend-was`, `akt-allgemein-art`, `akt-nerven-alltag`, `fach-gastro-stuhl`, `fach-gastro-speisen`, `fach-infekt-haut`, `fach-infekt-neuro`, `fach-infekt-zecke`, `fach-infekt-gelenke`, `fach-derma-systemisch`, `fach-derma-beginn-ort`, `fach-derma-muttermal`, `fach-endo-folgeschaeden`, `fach-endo-hals`, `fach-endo-augen`, `fach-endo-gewicht`, `fach-endo-familie-therapie`, `fach-pneumo-infekt`, `fach-pneumo-husten`, `fach-pneumo-allergie`, `fach-pneumo-orthopnoe`, `fach-haem-infekte`, `fach-haem-belastung`, `fach-haem-blutung`, `fach-neuro-sprache`, `fach-neuro-koordination`, `fach-neuro-blase`, `fach-neuro-anfallzeichen`, `fach-nephro-vorgeschichte`, `fach-nephro-menge`, `fach-nephro-uraemie`, `fach-uro-vorgeschichte`, `fach-uro-flanke`, `fach-uro-drang`, `fach-uro-sexualanamnese`, `fach-rheuma-systemisch`, `fach-rheuma-ausloeser`, `fach-onko-appetit`, `fach-onko-blutung`, `fach-gyn-brust`, `fach-ortho-bewegung`, `fach-ortho-sensomotorik`, `fach-ortho-schwellung`, `fach-ortho-mechanismus`, `fach-chir-ileus`, `fach-gefaess-thrombose`, `fach-gefaess-wunde`.
- **Découpe** : une part reprend les mots du texte de sa mère, avec le complément grammatical minimal (« Herd — Haben Sie Husten, Halsschmerzen … bemerkt? » → « Haben Sie Husten bemerkt? » / « Halsschmerzen? » / …). Dans les énumérations d'Aktuelle Beschwerden (Herd, Befund, Veränderung, Begleitbeschwerden), la première part est une phrase, les suivantes des relances courtes : le libellé de dimension (« Herd — ») les porte. La dernière part de `akt-begleit` est sa propre question ouverte (« Haben Sie außerdem noch andere Beschwerden bemerkt? »).
- Trois textes de part reprennent un nom de la même phrase pour ne pas commencer par une anaphore quand la première part tombe : « Ist der Husten trocken oder mit Auswurf? », « Hat sich die Rötung ausgebreitet, zum Beispiel ringförmig? », « Werden Sie wegen Zucker- oder Schilddrüsenerkrankungen schon behandelt oder kontrolliert? ». À relire (§ 9).
- **Points nommés par les revues** :
  - `akt-veraend-was` (itp, lymphom) : parts ; plus aucune non réduite ;
  - `fach-rheuma-ausloeser`, goutte, **option (b)** : part `gicht_ausloeser` qui porte « Falls ein üppiges Essen: … Bier? » et « Falls ein neues Medikament: … Wassertablette? ». Hors profil goutte, r1 la retire (test : aucune occurrence hors des cas `gicht`) ;
  - `fach-pneumo-infekt` (6 cas pneumo non infectieux) : parts ; la part « Reise » sort par r1 ;
  - `veg-ausscheidung` (gastro n° 27 / n° 31) : **non fait, arrêté** (§ 5.2).
- **`fach-rheuma-vorgeschichte`** : la relance « Gichtanfall oder Nierensteine? » est découpée en deux relances (goutte / calculs) ; la famille passe en relance n° 3. gicht n° 3 (« selbst schon einmal Nierensteine ») retire ainsi la seconde sans emporter la goutte.
- **FACH_RULES** (`adaptFach`) : une règle qui réécrit le texte emporte les `parts` de l'ancien texte, sauf si elle donne les siennes. Les réécritures concernées donnent les leurs (sensomotorik « im Arm / im Bein », uro-vorgeschichte féminine — qui déclare aussi `harnwegsinfekt, nierensteine`, sans la prostate —, uro-sexualanamnese féminine) ; `fach-gefaess-wunde` sans jambe déclare `durchblutung` seul. Le texte et l'applicabilité de FACH_RULES ne changent pas (I3).
- Atomicité : deux relances à deux « ? » sont découpées (`fach-nephro-menge`) ; les parts qui en auraient porté deux ont leur seconde phrase en relance.

### 1.4 La mesure (`coherenceMesure.mjs`)

Une question du cas **déclarée** se mesure par sa déclaration, comme une sonde depuis K1 ; une question muette se lit encore. Le contrat (§10.6) le prévoit : la dette `brut` comprend « les questions du cas lues par leur texte ». Test rouge d'abord (une mention « beim Fieber » comptait `fieber`), puis vert ; la mutation est la règle d'avant (§ 7).

## 2. Les déclarations relues contre ce que le moteur en fait

> **Fixeur (revue I-2)** : le critère de ce tableau (« la fiche y dit plus ») n'est pas celui du contrat. Chaque ligne a été relue contre l'identité de la question (§10.1) ; décisions au § F.2 (cinq lignes reviennent à la déclaration de la sonde).

Première passe : 794 déclarations écrites sur le texte. Puis chaque écart nouveau du moteur (retrait, réduction, déplacement causés par une question du cas) a été relu à côté de la **réponse de la fiche** à la sonde perdante : si la fiche y dit plus que ce que la question du cas obtient, ce n'est pas la même réplique, et la déclaration change. 25 déclarations ont été corrigées ainsi :

| Cas, question | Première déclaration | Corrigée en | Raison (réponse de la fiche) |
|---|---|---|---|
| commotio n° 6 « Wird der Kopfschmerz stärker? » | `kopfschmerz` | `uebelkeit, entwicklung` | présuppose la céphalée ; retirait `fach-neuro-kopfschmerz` (siège, caractère) |
| lagerungsschwindel n° 4 « Sturz auf den Kopf, HWS-Behandlung… » | `ausloeser` | `vorereignis` | la fiche répond à l'Auslöser par le changement de position, pas par ces événements |
| anaemie n° 1 « letzte Regelblutung, seit den Wechseljahren Blutung? » | `wechseljahre, vaginalblutung` | `vaginalblutung` | retirait `frau-wechseljahre` et ses relances (gynécologue, hormones) |
| metabolisches-syndrom n° 6 « Haut im Nacken, Achseln » | `haut_haare` | `acanthosis` | la fiche répond aussi la cicatrisation lente : `fach-endo-haut-haare` reste |
| endokarditis n° 6, urtikaria n° 4 (la réaction à l'allergie connue) | `allergie` | `allergie_reaktion`, `braucht allergie` | retiraient `all-allergie`, dont la réponse liste aussi noix, pollen, nickel |
| epilepsie n° 2 (réveils langue mordue, lit mouillé) | `zungenbiss, einnaessen` | `naechtliche_anfaelle` | des crises nocturnes **passées** (e), pas la crise du jour |
| epilepsie n° 3 (myoclonies, absences) | `krampf` | `anfallsformen` | idem |
| arterielle-hypertonie n° 5 (accès sueurs, palpitations, pâleur) | `schwitzen, herzrasen, blaesse, …` | `paroxysmen, temperaturtoleranz` | retirait `fach-kardio-herzrasen` (« Herzklopfen bei Stress ») |
| perikarditis n° 0, myokarditis n° 2 (pire couché, mieux penché) | `lageabhaengig` | `vorbeugezeichen` | `fach-kardio-atem` obtient aussi la dépendance respiratoire |
| eug n° 5, adnexitis n° 3 (épaule, sous les côtes) | `ausstrahlung` | `schulterschmerz` | adnexitis : la fiche irradie dans le bas du dos ; la question ouverte reste |
| malaria n° 0 « Wo in Malawi gelebt » | `reise` | `aufenthalt`, `braucht reise` | le voyage partait en Familien-/Sozialanamnese : la Fach le garde, la question suit |
| malaria n° 2 (prophylaxie « auch nach der Rückkehr ») | — | `braucht reise` | anaphore « nach der Rückkehr » |
| tvt n° 0 « im Verhältnis zu Ihrem Flug » | `beginn, immobilisation` | `immobilisation`, `braucht beginn` | remplaçait Beginn avant que le patient ait parlé du vol (Q0) |
| obstipation n° 1 « War das Blut hellrot … am Papier? » | `stuhl_blut` | `blutungsquelle`, `braucht stuhl_blut` | présuppose le sang : la question générale le demande d'abord |
| eug n° 0 « Schwangerschaftstest gemacht? » | `schwangerschaft` | `schwangerschaftstest`, `braucht schwangerschaft` | Q-gyn : `frau-schwanger` n'est jamais perdue (test `gynFusion`) |
| karzinoid n° 6 (bouffées ≠ ménopause) | `wechseljahre` | `hitzewallung` | idem |
| zystitis n° 2 « GV in den letzten Tagen? neuer Partner? » | `sexualanamnese` | `sexualkontakt` | retirait l'entrée en matière de la Sexualanamnese et la plaçait après la question MST |
| pneumothorax n° 2 | `ort, atemabhaengig` | `+ brustschmerz` | la fiche répond à `fach-pneumo-schmerz` par la même réplique |
| rheumatisches-fieber n° 3 (anneaux pâles) | `ausschlag` | `+ erythem_ring` | idem pour « ringförmig » |
| diabetes-typ1 n° 1 (lever nocturne, « früher auch? ») — déclaration antérieure | `polyurie` | `nykturie, polyurie` | la question demande la nycturie |
| sturz-im-alter n° 0, bauchaortenaneurysma n° 6, covid19 n° 7 | — | un signe retiré ou changé | sinon deux questions du cas du même signe (r2 retirait la seconde) |

Les déplacements (r2 met la question du cas à la place de la sonde retirée, 85 nouveaux) ont été relus pour la présupposition : les quatre réels sont corrigés ci-dessus (tvt, obstipation, malaria ×2). Le reste du détecteur Q0 est au § 6.

## 3. Les doublons renvoyés à K4 par les revues

| Revue | Résolution | Preuve |
|---|---|---|
| lyme : rougeur par les questions du cas puis par la Fach | n° 0 `erythem_ring`, n° 1 `ausschlag`, n° 3 `ausbreitung` : `fach-infekt-haut` retirée | test « doublons renvoyés » ; trame § 10 (n° 16, 17, 19 ; plus de « Hautveränderung » en Fach) |
| schenkelhalsfraktur : bewusstlos, unfallhergang, blutverdünner | n° 0 `unfallhergang, schwindel`, n° 1 `bewusstlos, …`, n° 4 `antikoagulation` ; `fach-ortho-mechanismus` réduite à « verletzt », `med-blutverduenner` à « Kortison » | idem ; trame § 10 (n° 17, 18, 21, 41, 44) |
| zystitis : aspect des urines ×3, HWI ×2 | n° 0 `urin_aspekt` retire `akt-ausscheid-harn-aussehen` et `fach-uro-farbe`, réduit `akt-ausscheid-was` ; n° 3 `harnwegsinfekt` réduit `fach-uro-vorgeschichte` aux calculs | idem ; trame § 10 |
| rheumatoide-arthritis : einfluss | n° 0 `einfluss` retire `akt-einfluss` | idem |
| pankreatitis, zoeliakie : aspect des selles | une seule question cherche `stuhlaussehen` dans chacun | idem |
| uterus n° 15 : haematome, blutungsneigung | n° 4 `blutungsneigung, haematome` retire `fach-haem-blutung` | idem |
| lymphom n° 13 : knoten | `knoten` cherché une fois (`fach-onko-knoten`) ; n° 6 « an anderen Stellen ebenfalls Knoten » déclare `lymphknoten` : d'autres sites, pas le nœud du motif (dont la Fach demande consistance et mobilité) | idem ; à relire |
| itp : blaue Flecken | `fach-haem-blutung` réduite à « blaue Flecken » (n° 1 pose le saignement) | idem |
| vaccination | `impfung` cherché une fois dans chacun des 130 cas | idem |
| tvt : hémoptysie | **documenté** : aucune question du cas de tvt ne la demande et tvt ne joue pas la Fach pneumo ; l'écrire serait inventer du texte | — |
| gib : bloc « Veränderung » (« beim Duschen », « Sonne ») | **non fait** : texte du gabarit de nature (`akt-beginn` / `akt-ausloeser` de `veraenderung`), à réécrire au lot de contenu ou dans les natures | trame de gib inchangée sur ce point |

## 4. Réponses écrites

**Aucune.** `ajouteSansReponse` reste à 0 ; r3 ajoute toujours 46 banques, les mêmes, avec leur réponse K2. Aucune déclaration n'a fait ajouter une sonde de banque.

## 5. Arrêts et concerns — à trancher par main

### 5.1 anorexia-nervosa n° 7 : laissée muette (résidu justifié)

> **Tranché (D-1)** : `todeswunsch`, signe de risque ; § F.1.

« Haben Sie in dieser Zeit manchmal daran gedacht, dass Sie nicht mehr leben möchten…? » cherche `suizid`. Déclarée, elle gagne (rang 0) contre `fach-psych-suizid`, qui perd l'idéation **et avec elle ses relances** « konkrete Pläne » et « NOTFALL ». La garantie de risque tiendrait (le signe reste cherché), mais le plan et l'intention ne seraient plus demandés : une perte de sécurité. Je ne force pas. Options : (a) la Fach psy garde `suizid` contre une question du cas (exception de rang pour `RISIKO_SIGNES`, amendement §10.4) ; (b) la question du cas reçoit les relances de plan (texte, lot de contenu) ; (c) la retirer du cas.

### 5.2 gastroenteritis n° 27 / n° 31 : l'option (b) ne s'applique pas à `veg-ausscheidung`

> **Tranché (D-2)** : résidu accepté.

J'ai fait la part « urinaire » (`urin_aspekt`) qui porte la relance « Falls ja: … Aussehen des Urins », puis je l'ai **retirée** :
- dans 24 cas, la miction est déjà demandée (Herd, Fach neuro…) mais pas l'aspect des urines : la question posée devenait « Falls ja: Seit wann, und wie oft täglich? … » toute seule ;
- dans 5 autres, cette relance suivait la question des selles (« Falls ja » renvoyait aux selles).

Une relance conditionnelle ne peut pas être une part : elle n'a de sens qu'après sa mère, et r1 / r2 ne savent pas lier deux parts. Pour la goutte, ça marche parce que la part ne reste jamais seule (la Fach rhumato garde toujours `ausloeser`). Ici, le doublon est **nominal** : la relance n'est posée que si le patient a des difficultés à uriner, ce qui n'est pas le cas en gastroenteritis. Une solution demanderait une règle nouvelle (une relance conditionnelle de précision retirée quand son signe est demandé ailleurs : amendement d'INV-84 / §10.4).

### 5.3 Ce qui reste du contenu, hors de mon périmètre (je n'invente pas de texte)

- anorexia-nervosa n° 2 (« …nach dem Essen übergeben? ») : déclarée `selbstinduziertes_erbrechen` ; le texte nomme encore la nausée. La reformulation prévue par la revue K1 (« … selbst herbei? ») est du texte : dernier constat du socle `checkTrameSymptoms`.
- anaphylaxie n° 3 « Haben Sie Ihr Asthmaspray dabei? » présuppose un asthme que l'entretien n'a pas encore fait dire (Vorerkrankungen). Préexistant, révélé par le détecteur Q0.
- zystitis : « Veränderung — Beim Stuhlgang? ↳ Haut oder Augen? ↳ Farbe des Stuhls? » — exact, mais hors sujet pour une cystite (le gabarit `ausscheidung` est fait pour les selles et le teint). Un `aktuellSkip` d'`akt-ausscheid-was` dans zystitis serait à décider (comme gib, itp, lymphom en K3). **Fait au fixeur** (avec `akt-ausscheid-aussehen`, § F.1).
- gib « beim Duschen », « Sonne » (§ 3) ; le seuil de Morgensteifigkeit de fibromyalgie (renvoyé de K3) : non faits.

### 5.4 262 signes nouveaux

C'est la conséquence directe de la règle d'identité et du `sucht` requis au type en K5 : une question ciblée a une réplique qu'aucune sonde n'a. 157 de ces signes ne servent qu’à un cas (105 en servent plusieurs). L'alternative serait un amendement de contrat (un signe « propre au cas », exempté de r2 entre cas), que je n'ai pas le droit de prendre. Le lexique passe de 222 à 485 signes ; aucune table ne grossit ailleurs (pas de banque, pas de pertinence, pas de `PROFIL_*`).

### 5.5 Style des parts, à relire

Les énumérations d'Aktuelle Beschwerden réduites se lisent en une question puis des relances courtes (lyme : « Herd — Haben Sie Husten bemerkt? ↳ Halsschmerzen? ↳ Brennen beim Wasserlassen? ↳ Durchfall? ↳ Eine Wunde? »). Quand la première part tombe, une relance courte ouvre la ligne sous son libellé (« Veränderung — Beim Stuhlgang? », zystitis). C'est exact (rien n'est redemandé), mais c'est une forme nouvelle à l'écran.

## 6. Mesure, plancher, gels

> *Fixeur* : `brauchtViole` 21, l'entrée `hausses` est désormais 19 → 21 (§ F.3).

**Plancher** : `coherence-budget.json` regravé à la main (le `--bless` refuse toute hausse), égal à la mesure (test « la mesure ÉGALE le plancher gravé »). Une entrée `hausses` documente `brauchtViole` 19 → 22 :
- c'est le **détecteur Q0** (informatif, précision ≈ 55 %), pas une présupposition nouvelle. Il tient pour « déjà dit » un nom présent dans la **réponse** d'une question précédente ; quand r2 retire une sonde au profit de la question du cas, sa réponse ne précède plus ;
- cinq constats nouveaux : quatre faux positifs (hepatitis-b « Ihren Impfpass », parkinson « die Schrift », alkoholentzug « die Gläser », nephrotisches-syndrom « Ihre Schuhe ») et une présupposition réelle, préexistante et masquée jusqu'ici (anaphylaxie « Ihr Asthmaspray », § 5.3) ;
- deux constats disparaissent : malaria « nach der Rückkehr » (`braucht reise`, r4b) et basaliom « der Mitte ». 19 − 2 + 5 = 22.

`checkBudgetFloor.mjs origin/feat/s3-k3-cohere` : 0, avec l'avertissement « hausse documentée, à relire en revue ».

**Écarts du moteur (130 cas)** :

| Règle : action | K3 | K4 |
|---|---:|---:|
| r1 : non-réduit | 38 | **0** |
| r1 : réduit | 100 | 137 |
| r1 : retiré | 40 | 42 |
| r1 : anomalie (question du cas hors profil, gardée) | 2 | 2 |
| r2 : non-réduit | 65 | **0** |
| r2 : réduit (+ relances) | 118 (+103) | 274 (+154) |
| r2 : retiré (+ relances) | 392 (+317) | 548 (+368) |
| r2 : déplacé (la question du cas prend la place) | 19 | 104 |
| r3 : ajouté | 46 | 46 |
| r4a : détaché | 147 | 151 (la relance goutte / calculs découpée) |
| r4b : déplacé (`braucht`) | 3 | 10 |

**Gel `trame-actuelle.txt`** : 116 cas sur 130 changent. Lignes de chapitre modifiées :

| Chapitre | Lignes | Chapitre | Lignes |
|---|---:|---|---:|
| aktuell | 77 | fach-pneumo | 6 |
| vegetativ | 22 | fach-haemato | 6 |
| medikamente | 15 | fach-gefaess | 6 |
| familie-sozial | 13 | fach-endo | 6 |
| fach-gastro | 12 | fach-rheuma | 5 |
| fach-infektio | 10 | fach-uro, fach-psy, fach-nephro | 4 chacun |
| noxen, fach-ortho, fach-neuro, fach-derma | 7 chacun | fach-onko, fach-chirurgie, allergien | 3 chacun |
| fach-gyn | 2 | vorerkrankungen, fach-kardio | 1 chacun |

Catégories : une question du cas prend la place d'une sonde (aktuell : Beginn, Auslöser, Früher, Verlauf, Ort ; noxen : alcool, drogues) ; une sonde réduite à ses parts (médicaments : Blutverdünner / Kortison ; végétative ; Fach) ; plus aucune question non réduite.

**Gel `fach-raw.txt`** (I3) : 111 empreintes changent. La Fach brute change **par le contenu** : `parts` ajoutées, relance « Gicht / Nierensteine » découpée, deux relances à deux « ? » découpées (`fach-nephro-menge`). Le texte et l'applicabilité de FACH_RULES sont inchangés ; le gel est régénéré, comme le prévoit son en-tête (« un lot qui change volontairement la Fach brute régénère le gel et dit pourquoi »).

**Autres socles** : `trame-symptoms-baseline.json` 10 → 1 constat, `relu` 118 → 86 (34 annotations sans objet retirées : la déclaration couvre le texte ; 2 posées, leistenhernie n° 0 et obstipation n° 4, une mention sans question) ; `atomicity-budget.json` A 424 → 423.

## 7. Tests

**Règles nouvelles, test rouge puis mutation** (`src/data/guides/coherenceK4.test.ts`, 6 tests, et `scripts/checkCoherence.test.mjs`) :

| Règle | Test | Mutation jouée | Résultat |
|---|---|---|---|
| la mesure lit la déclaration d'une question du cas déclarée | `checkCoherence.test.mjs` « K4 : une question du cas DÉCLARÉE se mesure par sa déclaration » | règle d'avant (le texte toujours lu) | rouge avant l'implémentation |
| une seule question du cas muette, le résidu justifié | coherenceK4 | zystitis n° 0 rendue muette | rouge |
| aucun signe de `signesDefsCas` mort ; tous de dépistage, sans banque | coherenceK4 | un signe `mutation_x` jamais déclaré | rouge |
| les doublons des revues : un signe, une question | coherenceK4 (table du § 3, + `impfung` dans les 130 cas) | `fach-haem-blutung` sans parts (itp) | rouge |
| les parts couvrent exactement la déclaration, FACH_RULES compris | coherenceK4 (130 Fach brutes) | règle féminine d'uro-vorgeschichte sans `sucht` | rouge |
| FACH_RULES : un texte réécrit emporte les parts | coherenceK4 (lumboischialgie) | la remise à zéro des parts retirée d'`adaptFach` | rouge |
| goutte, option (b) | coherenceK4 (gicht garde « Bier », aucun autre cas) | `gicht_ausloeser` de dépistage | rouge |

**Tests adaptés, avec la décision qui le justifie** (aucune attente affaiblie sans raison) :
- `coherence.fachCovers.test.ts` : quatre raisons passent de « non-réduit » à « réduit » (les parts) ou à « signe distinct » (`fach-neuro-kraft -> akt-nerven-alltag` : aucun signe commun) ;
- `coherence.test.ts` : rang égal joué sur deux sondes mono-signe (`fach-rheuma-ausloeser` porte la part goutte) ; relances détachées (#1 goutte, #2 calculs, #3 famille) ;
- `suchtDeclaration.test.ts` : la relance découpée ; la mutation INV-84 suit ;
- `fachNature.test.ts` : « une chute garde ses relances » joué sur osg-fraktur ; schenkelhalsfraktur : récit et perte de connaissance posés une fois par les questions du cas (revue K3) ; dissection : la malperfusion du pied est demandée une fois, par la question du cas n° 4 ;
- `symptoms.test.ts` : 485 signes ; la carte d'une variante qui énumère est son `enumere` ;
- `scripts/*.test.mjs` : ancres de mutation suivies (lignes de `seedCases.ts` désormais déclarées) ; la mutation « m6 » rend d'abord muette une question du cas (seules les muettes se lisent) ; « la mesure LIT le lexique » joue sur `ausstrahlung` ; `checkBudgetFloor` « tête `null` » écrit la tête à la main (elle rougissait par hasard : 103 > 5).

## 8. Vérifications (codes de sortie du script lui-même)

- `npx tsc -b --noEmit` : **0**.
- `npx vitest run --dir src --maxWorkers=2` : **0** (171 fichiers, 1 738 tests).
- `node scripts/check*.mjs` (23) : **tous 0**, sauf `checkProbeOverlap` (1, informatif, `|| true` en CI, comme en K3). `checkTermRegister --require-all` : 0. `checkCoherence` : 0.
- `node --test scripts/*.test.mjs` : **0** (179 tests).
- `node scripts/checkBudgetFloor.mjs origin/feat/s3-k3-cohere` : **0** (la hausse documentée est signalée). K3 n'est pas dans `origin/main`.
- `git merge-tree --write-tree origin/main HEAD` : **0** ; contre `origin/feat/s3-k3-cohere` : **0**.
- Chaque code est lu par `rc=$?` juste après la commande. (Une boucle de vérification intermédiaire lisait `$?` après une substitution `$(basename …)` : elle affichait 0 à tort ; relancé fichier par fichier, puis en entier.)

## 9. Non vérifié

- **La justesse clinique des 793 déclarations** et des 262 signes : c'est mon jugement, appuyé sur la réponse de la fiche pour chaque sonde perdante (§ 2). L'annexe donne la déclaration de chaque question du cas, à relire par la revue clinique.
- **Les textes de part** (§ 1.3) : découpés du texte de la sonde, avec le complément grammatical minimal ; trois reprennent un nom de la même phrase. Pas de relecture de langue.
- **Navigateur, deux onglets** : non fait (pas de serveur, pas de prod). Côté médecin, `checkGuideCoverage` (0) ; côté simulant, le Rollenskript lit `antworten`, que K4 ne touche pas.
- **Contenu publié** : `publishContent.mjs` non rejoué.
- **`graphify update app/src`** : pas de graphe dans ce worktree.

## 10. Trames jouées complètes — les cinq cas témoins (régénérées après le dernier tour, § G)

Ouverture et clôture exclues ; « ↳ » = relance.

**case-gastroenteritis**

```text
*Persönliche Daten*
1. Wie heißen Sie mit vollständigem Namen?
2. Könnten Sie Ihren Vor- und Nachnamen bitte langsam buchstabieren?
3. Wie alt sind Sie? Wann sind Sie geboren?
4. Wie groß sind Sie und wie viel wiegen Sie derzeit?
5. Haben Sie einen Hausarzt? Wie heißt er / sie?
6. Nur zur Sicherheit wiederhole ich kurz Ihre Daten: Sie heißen … , sind … Jahre alt, am … geboren, … groß und wiegen … kg. Ist das korrekt notiert?

*Aktuelle Beschwerden*
7. Was führt Sie heute zu uns?
8. Ort — Wo genau spüren Sie die Beschwerden?
   ↳ Können Sie mir zeigen, wo genau?
9. Beginn — Seit wann haben Sie das bemerkt? Kam es plötzlich oder hat es sich über Wochen entwickelt?
10. Charakter — Wie fühlt sich der Schmerz an: dumpf, stechend, brennend, drückend, krampfartig, pochend?
11. Intensität — Auf einer Skala von 1 bis 10, wobei 1 leichte und 10 unerträgliche Schmerzen bedeutet: Wie stark sind Ihre Schmerzen?
   ↳ Falls sehr stark: „Können Sie die Schmerzen bis zum Ende unseres Gesprächs (ca. 15 Minuten) ertragen, oder soll ich Ihnen ein Schmerzmittel geben?“ (Vor jedem Schmerzmittel zuerst nach Allergien und Unverträglichkeiten gegenüber Medikamenten fragen.)
12. Häufigkeit — Wie oft haben Sie am Tag Stuhlgang, und müssen Sie auch nachts zum Stuhlgang aufstehen?
   ↳ Mehr oder weniger als sonst?
13. Aussehen — Ist Ihnen Blut oder Schleim im Stuhl aufgefallen?
14. Verlauf — Ist es dauernd so, oder gibt es Tage, an denen es normal ist? Wird es schlimmer?
15. Auslöser — Ist Ihnen ein Auslöser aufgefallen — ein bestimmtes Essen, eine Reise, ein neues Medikament, Stress?
16. Einflussfaktoren — Gibt es etwas, das es bessert oder verschlimmert — Essen, Trinken, Bewegung, Medikamente?
17. Frühere Episoden — Hatten Sie solche Beschwerden schon einmal?
   ↳ Falls ja: Waren Sie deswegen schon bei einem Arzt? Welche Diagnose wurde damals gestellt?
18. Begleitbeschwerden — Haben Sie außerdem noch andere Beschwerden bemerkt?
19. Wie sieht Ihr Stuhl aus — wässrig oder breiig, welche Farbe, riecht er auffällig, schwimmt er oben?
20. Haben Sie Fieber gemessen? Hatten Sie Schüttelfrost oder Nachtschweiß?

*Fachanamnese Infectiologie*
21. Waren Sie kürzlich im Ausland? Wo, wie lange, und hatten Sie dort Beschwerden?
22. Was haben Sie dort gegessen und getrunken? Hatten Sie Eiswürfel in den Getränken, rohen Salat, ungeschältes Obst oder Leitungswasser?
23. Hatten Sie Kontakt zu kranken Personen oder zu Tieren?
   ↳ Arbeiten Sie mit vielen Menschen?
24. Sind Ihre Impfungen auf dem neuesten Stand?

*Vegetative Anamnese*
25. Haben Sie starke Schweißausbrüche?
26. Ist Ihnen übel? Mussten Sie sich übergeben?
   ↳ Falls ja: Können Sie das Erbrochene beschreiben? Seit wann, und wie häufig?
27. Haben Sie Schwierigkeiten beim Wasserlassen?
   ↳ Falls ja: Seit wann, und wie oft täglich? Können Sie das Aussehen des Urins näher beschreiben?
28. Haben Sie in letzter Zeit Gewichtsveränderungen bemerkt?
   ↳ Falls ja: Wie viel hat sich Ihr Gewicht verändert?
   ↳ Falls ja: In welchem Zeitraum war das?
29. Wie ist Ihr Appetit? Haben sich Ihre Essgewohnheiten kürzlich geändert?
30. Ist Ihr Schlaf erholsam? Haben Sie Probleme, ein- oder durchzuschlafen?
31. Trinken Sie genug? Wie oft müssen Sie Wasser lassen, und welche Farbe hat der Urin? Wird Ihnen beim Aufstehen schwindelig?

*Vorerkrankungen & Voroperationen*
32. Wie Sie vielleicht wissen, spielen sowohl erbliche als auch erworbene Krankheiten eine wichtige Rolle. Daher würde ich Ihnen gern einige Fragen zu Ihrer Vorgeschichte stellen — sind Sie einverstanden?
33. Gibt es bei Ihnen vorbestehende Erkrankungen, zum Beispiel Bluthochdruck, Zuckerkrankheit oder erhöhte Blutfettwerte?
   ↳ Falls ja: Welche, und seit wann sind sie bekannt? Werden sie behandelt?
34. Wurden Sie schon einmal operiert?
   ↳ Falls ja: Welche Eingriffe wurden durchgeführt, und wann? Traten dabei Komplikationen auf?

*Medikamente*
35. Nehmen Sie regelmäßig oder gelegentlich Medikamente ein?
   ↳ Falls ja: Welche Medikamente sind das?
   ↳ Falls ja: Seit wann nehmen Sie sie?
   ↳ Falls ja: In welcher Dosierung?
   ↳ Falls ja: Wie oft am Tag?
36. Nehmen Sie Blutverdünner oder Kortison?
37. Nehmen Sie frei verkäufliche Schmerzmittel, pflanzliche Mittel oder Nahrungsergänzung?
38. Haben Sie in den letzten Wochen oder Monaten Antibiotika eingenommen oder waren Sie im Krankenhaus?

*Allergien & Unverträglichkeiten*
39. Sind Sie allergisch gegen bestimmte Medikamente oder Nahrungsmittel?
   ↳ Falls ja: Beschreiben Sie bitte, wie Sie genau reagieren — an der Haut, an der Atmung, am Kreislauf?
40. Vertragen Sie bestimmte Speisen nicht (Laktose, Gluten)?

*Noxen / Genussmittel*
41. Rauchen Sie?
   ↳ Falls ja: Seit wann rauchen Sie?
   ↳ Falls ja: Wie viele Zigaretten ungefähr pro Tag?
   ↳ Falls aufgehört: Wann haben Sie aufgehört?
   ↳ Falls aufgehört: Wie viele Jahre haben Sie geraucht?
   ↳ Falls aufgehört: Wie viel haben Sie davor pro Tag geraucht?
42. Trinken Sie Alkohol?
   ↳ Falls ja: Welche Getränke bevorzugen Sie — Bier, Wein, Schnaps?
   ↳ Falls ja: Trinken Sie täglich oder nur zu besonderen Anlässen?
   ↳ Falls ja: Wie viel trinken Sie ungefähr pro Woche?
43. Wie Sie wissen, ist Cannabis inzwischen legalisiert. Daher muss ich Sie aus medizinischen Gründen routinemäßig fragen: Konsumieren Sie Drogen?

*Familien- & Sozialanamnese*
44. Haben Familienmitglieder — Großeltern, Eltern, Geschwister oder Kinder — chronische Erkrankungen?
   ↳ Falls ja: Welche Erkrankungen sind das?
   ↳ Falls ja: Seit wann sind sie bekannt?
45. Leben Ihre Eltern noch?
   ↳ Falls verstorben: Woran ist Ihre Mutter / Ihr Vater gestorben? (Avec empathie : „Mein herzliches Beileid.“)
   ↳ Falls verstorben: Wann war das?
46. Wie ist Ihr Familienstand? Haben Sie Kinder?
   ↳ Falls ja: Wie viele, und sind sie gesund?
47. Wohnen Sie allein oder mit jemandem? In einer Wohnung oder einem Haus, in welchem Stockwerk, mit Aufzug?
48. Haben Sie Haustiere, um die sich jemand kümmern muss?
49. Was arbeiten Sie beruflich, und arbeitet jemand in Ihrem Haushalt in einer Küche, in der Gastronomie oder in einem Kindergarten?
50. Arbeiten Sie dabei mit besonderen Stoffen — Staub, Chemikalien, Dämpfen?
51. Empfinden Sie Stress durch Ihre Arbeitssituation?
```

**case-fibromyalgie**

```text
*Persönliche Daten*
1. Wie heißen Sie mit vollständigem Namen?
2. Könnten Sie Ihren Vor- und Nachnamen bitte langsam buchstabieren?
3. Wie alt sind Sie? Wann sind Sie geboren?
4. Wie groß sind Sie und wie viel wiegen Sie derzeit?
5. Haben Sie einen Hausarzt? Wie heißt er / sie?
6. Nur zur Sicherheit wiederhole ich kurz Ihre Daten: Sie heißen … , sind … Jahre alt, am … geboren, … groß und wiegen … kg. Ist das korrekt notiert?

*Aktuelle Beschwerden*
7. Was führt Sie heute zu uns?
8. Können Sie mir bitte auf dieser Zeichnung einzeichnen, wo überall es wehtut? Ist es links und rechts gleich?
9. Beginn — Seit wann haben Sie die Schmerzen?
10. Charakter — Wie fühlt sich der Schmerz an: dumpf, stechend, brennend, drückend, krampfartig, pochend?
11. Intensität — Auf einer Skala von 1 bis 10, wobei 1 leichte und 10 unerträgliche Schmerzen bedeutet: Wie stark sind Ihre Schmerzen?
   ↳ Falls sehr stark: „Können Sie die Schmerzen bis zum Ende unseres Gesprächs (ca. 15 Minuten) ertragen, oder soll ich Ihnen ein Schmerzmittel geben?“ (Vor jedem Schmerzmittel zuerst nach Allergien und Unverträglichkeiten gegenüber Medikamenten fragen.)
12. Haben Sie diese Schmerzen ununterbrochen seit mehr als drei Monaten, oder gibt es bei Ihnen beschwerdefreie Phasen?
13. Auslöser — Gab es etwas Bestimmtes, das die Schmerzen ausgelöst hat? Was taten Sie, als sie begannen?
14. Einflussfaktoren — Gibt es etwas, das die Beschwerden bessert oder verschlimmert (Essen, Bewegung, Atmung, Körperhaltung)?
15. Begleitbeschwerden — Haben Sie außerdem noch andere Beschwerden bemerkt?
16. Haben Sie Schwierigkeiten, sich zu konzentrieren oder auf Wörter zu kommen? Passiert Ihnen das auch im Unterricht?
17. Wie lange sind Sie morgens steif — Minuten oder länger als eine Stunde? Bessert sich das durch Bewegung?
18. Sind Ihre Gelenke jemals sichtbar geschwollen, gerötet oder überwärmt gewesen — oder fühlen sie sich nur dick an?
19. Wie geht es Ihnen seelisch? Fühlen Sie sich in den letzten Wochen häufig niedergeschlagen oder freudlos?

*Fachanamnese Rhumatologie*
20. Kamen die Beschwerden plötzlich und anfallsartig, oder haben sie sich langsam über Wochen entwickelt?
21. Haben Sie Hautveränderungen bemerkt — Schuppenflechte, Knötchen unter der Haut oder an den Ohren?
22. Haben Sie Fieber, Augenentzündungen, Mund- oder Genitalgeschwüre, Durchfall oder eine Bindehautentzündung bemerkt?
23. Hatten Sie solche Gelenkbeschwerden schon einmal?

*Vegetative Anamnese*
24. Treten bei Ihnen Schüttelfrost, Nachtschweiß oder starke Schweißausbrüche auf?
25. Ist Ihnen übel? Mussten Sie sich übergeben?
   ↳ Falls ja: Können Sie das Erbrochene beschreiben? Seit wann, und wie häufig?
26. Haben Sie Schwierigkeiten beim Wasserlassen?
   ↳ Falls ja: Seit wann, und wie oft täglich? Können Sie das Aussehen des Urins näher beschreiben?
27. Haben Sie in letzter Zeit Gewichtsveränderungen bemerkt?
   ↳ Falls ja: Wie viel hat sich Ihr Gewicht verändert?
   ↳ Falls ja: In welchem Zeitraum war das?
28. Wie ist Ihr Appetit? Haben sich Ihre Essgewohnheiten kürzlich geändert?
29. Wie ist Ihr Schlaf? Fühlen Sie sich morgens erholt, wenn Sie aufgewacht sind?
30. Sind Ihre Impfungen auf dem neuesten Stand?

*Vorerkrankungen & Voroperationen*
31. Wie Sie vielleicht wissen, spielen sowohl erbliche als auch erworbene Krankheiten eine wichtige Rolle. Daher würde ich Ihnen gern einige Fragen zu Ihrer Vorgeschichte stellen — sind Sie einverstanden?
32. Gibt es bei Ihnen vorbestehende Erkrankungen, zum Beispiel Bluthochdruck, Zuckerkrankheit oder erhöhte Blutfettwerte?
   ↳ Falls ja: Welche, und seit wann sind sie bekannt? Werden sie behandelt?
33. Wurden Sie schon einmal operiert?
   ↳ Falls ja: Welche Eingriffe wurden durchgeführt, und wann? Traten dabei Komplikationen auf?
34. Waren Sie in letzter Zeit im Krankenhaus?

*Medikamente*
35. Nehmen Sie regelmäßig oder gelegentlich Medikamente ein?
   ↳ Falls ja: Welche Medikamente sind das?
   ↳ Falls ja: Seit wann nehmen Sie sie?
   ↳ Falls ja: In welcher Dosierung?
   ↳ Falls ja: Wie oft am Tag?
36. Nehmen Sie Blutverdünner oder Kortison?
37. Nehmen Sie frei verkäufliche Schmerzmittel, pflanzliche Mittel oder Nahrungsergänzung?
38. Nehmen Sie ein Medikament gegen erhöhte Cholesterinwerte oder haben Sie in letzter Zeit ein neues Medikament begonnen?

*Allergien & Unverträglichkeiten*
39. Sind Sie allergisch gegen bestimmte Medikamente oder Nahrungsmittel?
   ↳ Falls ja: Beschreiben Sie bitte, wie Sie genau reagieren — an der Haut, an der Atmung, am Kreislauf?
40. Vertragen Sie bestimmte Speisen nicht (Laktose, Gluten)?

*Noxen / Genussmittel*
41. Rauchen Sie?
   ↳ Falls ja: Seit wann rauchen Sie?
   ↳ Falls ja: Wie viele Zigaretten ungefähr pro Tag?
   ↳ Falls aufgehört: Wann haben Sie aufgehört?
   ↳ Falls aufgehört: Wie viele Jahre haben Sie geraucht?
   ↳ Falls aufgehört: Wie viel haben Sie davor pro Tag geraucht?
42. Trinken Sie Alkohol?
   ↳ Falls ja: Welche Getränke bevorzugen Sie — Bier, Wein, Schnaps?
   ↳ Falls ja: Trinken Sie täglich oder nur zu besonderen Anlässen?
   ↳ Falls ja: Wie viel trinken Sie ungefähr pro Woche?
43. Wie Sie wissen, ist Cannabis inzwischen legalisiert. Daher muss ich Sie aus medizinischen Gründen routinemäßig fragen: Konsumieren Sie Drogen?

*Familien- & Sozialanamnese*
44. Haben Familienmitglieder — Großeltern, Eltern, Geschwister oder Kinder — chronische Erkrankungen?
   ↳ Falls ja: Welche Erkrankungen sind das?
   ↳ Falls ja: Seit wann sind sie bekannt?
45. Leben Ihre Eltern noch?
   ↳ Falls verstorben: Woran ist Ihre Mutter / Ihr Vater gestorben? (Avec empathie : „Mein herzliches Beileid.“)
   ↳ Falls verstorben: Wann war das?
46. Wie ist Ihr Familienstand? Haben Sie Kinder?
   ↳ Falls ja: Wie viele, und sind sie gesund?
47. Was sind Sie von Beruf? Empfinden Sie Stress durch Ihre Arbeitssituation?
   ↳ Falls in Rente: Was haben Sie früher beruflich gemacht?
48. Arbeiten Sie dabei mit besonderen Stoffen — Staub, Chemikalien, Dämpfen?
49. Wohnen Sie allein oder mit jemandem? In einer Wohnung oder einem Haus, in welchem Stockwerk, mit Aufzug?
50. Haben Sie Haustiere, um die sich jemand kümmern muss?

*Frauenanamnese*
51. Verläuft Ihre Monatsblutung regelmäßig?
   ↳ Wann war Ihre letzte Regelblutung?
   ↳ Wie viele Tage liegen zwischen dem Beginn einer Blutung und dem Beginn der nächsten?
52. Besteht die Möglichkeit, dass Sie derzeit schwanger sind?
53. Verwenden Sie Verhütungsmethoden?
   ↳ Falls ja: Welche Methode verwenden Sie?
54. Haben die Wechseljahre bei Ihnen schon begonnen — Hitzewallungen, unregelmäßige Blutungen?
   ↳ Gehen Sie regelmäßig zum Frauenarzt?
```

**case-lyme**

```text
*Persönliche Daten*
1. Wie heißen Sie mit vollständigem Namen?
2. Könnten Sie Ihren Vor- und Nachnamen bitte langsam buchstabieren?
3. Wie alt sind Sie? Wann sind Sie geboren?
4. Wie groß sind Sie und wie viel wiegen Sie derzeit?
5. Haben Sie einen Hausarzt? Wie heißt er / sie?
6. Nur zur Sicherheit wiederhole ich kurz Ihre Daten: Sie heißen … , sind … Jahre alt, am … geboren, … groß und wiegen … kg. Ist das korrekt notiert?

*Aktuelle Beschwerden*
7. Was führt Sie heute zu uns?
8. Beginn — Seit wann haben Sie Fieber oder fühlen sich krank? Kam es schlagartig oder langsam?
9. Fieber — Haben Sie Fieber gemessen?
   ↳ Falls ja: Wie hoch war es?
   ↳ Falls ja: Wann ist das Fieber am höchsten?
10. Verlauf — Ist das Fieber dauerhaft, kommt es in Schüben, oder war es zwischendurch weg?
11. Herd — Haben Sie Husten bemerkt?
   ↳ Haben Sie Halsschmerzen?
   ↳ Brennt es beim Wasserlassen?
   ↳ Haben Sie Durchfall?
   ↳ Haben Sie irgendwo eine Wunde?
12. Auslöser — Gab es davor eine Erkältung, einen Eingriff, einen Zahnarztbesuch oder eine neue Verletzung?
13. Einflussfaktoren — Haben Sie schon etwas dagegen genommen — Paracetamol, Ibuprofen? Hat es geholfen?
14. Frühere Episoden — Hatten Sie so ein Fieber schon einmal?
   ↳ Falls ja: Waren Sie deswegen schon bei einem Arzt? Welche Diagnose wurde damals gestellt?
15. Begleitbeschwerden — Haben Sie außerdem noch andere Beschwerden bemerkt?
16. Hat die Rötung in der Mitte eine hellere Stelle, sodass sie wie eine Zielscheibe aussieht?
17. Seit wann haben Sie diese Rötung bemerkt, und wird sie größer?
18. Haben Sie Herzstolpern, Herzrasen oder Schwindel bemerkt, oder waren Sie schon einmal ohnmächtig?
19. Haben Sie ähnliche Rötungen auch an anderen Stellen des Körpers bemerkt?

*Fachanamnese Infectiologie*
20. Haben Sie einen Zeckenstich oder einen Insektenstich bemerkt? Waren Sie im Wald, im hohen Gras oder im Garten?
21. Haben Sie Gelenk- oder Muskelschmerzen? Wandern sie von Gelenk zu Gelenk?
22. Haben Sie Kopfschmerzen, Nackensteifigkeit, Missempfindungen oder eine Gesichtslähmung bemerkt?
23. Waren Sie kürzlich im Ausland? Wo, wie lange, und hatten Sie dort Beschwerden?
24. Hatten Sie Kontakt zu kranken Personen oder zu Tieren?
   ↳ Arbeiten Sie mit vielen Menschen? Haben Sie ungewöhnliche Lebensmittel gegessen — rohe Milch, rohes Fleisch?
25. Sind Ihre Impfungen auf dem neuesten Stand?

*Vegetative Anamnese*
26. Treten bei Ihnen Schüttelfrost, Nachtschweiß oder starke Schweißausbrüche auf?
27. Ist Ihnen übel? Mussten Sie sich übergeben?
   ↳ Falls ja: Können Sie das Erbrochene beschreiben? Seit wann, und wie häufig?
28. Haben Sie in letzter Zeit Gewichtsveränderungen bemerkt?
   ↳ Falls ja: Wie viel hat sich Ihr Gewicht verändert?
   ↳ Falls ja: In welchem Zeitraum war das?
29. Wie ist Ihr Appetit? Haben sich Ihre Essgewohnheiten kürzlich geändert?
30. Ist Ihr Schlaf erholsam? Haben Sie Probleme, ein- oder durchzuschlafen?

*Vorerkrankungen & Voroperationen*
31. Wie Sie vielleicht wissen, spielen sowohl erbliche als auch erworbene Krankheiten eine wichtige Rolle. Daher würde ich Ihnen gern einige Fragen zu Ihrer Vorgeschichte stellen — sind Sie einverstanden?
32. Gibt es bei Ihnen vorbestehende Erkrankungen, zum Beispiel Bluthochdruck, Zuckerkrankheit oder erhöhte Blutfettwerte?
   ↳ Falls ja: Welche, und seit wann sind sie bekannt? Werden sie behandelt?
33. Wurden Sie schon einmal operiert?
   ↳ Falls ja: Welche Eingriffe wurden durchgeführt, und wann? Traten dabei Komplikationen auf?
34. Waren Sie in letzter Zeit im Krankenhaus?

*Medikamente*
35. Nehmen Sie regelmäßig oder gelegentlich Medikamente ein?
   ↳ Falls ja: Welche Medikamente sind das?
   ↳ Falls ja: Seit wann nehmen Sie sie?
   ↳ Falls ja: In welcher Dosierung?
   ↳ Falls ja: Wie oft am Tag?
36. Nehmen Sie Blutverdünner oder Kortison?
37. Nehmen Sie frei verkäufliche Schmerzmittel, pflanzliche Mittel oder Nahrungsergänzung?

*Allergien & Unverträglichkeiten*
38. Sind Sie allergisch gegen bestimmte Medikamente oder Nahrungsmittel?
   ↳ Falls ja: Beschreiben Sie bitte, wie Sie genau reagieren — an der Haut, an der Atmung, am Kreislauf?
39. Vertragen Sie bestimmte Speisen nicht (Laktose, Gluten)?

*Noxen / Genussmittel*
40. Rauchen Sie?
   ↳ Falls ja: Seit wann rauchen Sie?
   ↳ Falls ja: Wie viele Zigaretten ungefähr pro Tag?
   ↳ Falls aufgehört: Wann haben Sie aufgehört?
   ↳ Falls aufgehört: Wie viele Jahre haben Sie geraucht?
   ↳ Falls aufgehört: Wie viel haben Sie davor pro Tag geraucht?
41. Trinken Sie Alkohol?
   ↳ Falls ja: Welche Getränke bevorzugen Sie — Bier, Wein, Schnaps?
   ↳ Falls ja: Trinken Sie täglich oder nur zu besonderen Anlässen?
   ↳ Falls ja: Wie viel trinken Sie ungefähr pro Woche?
42. Wie Sie wissen, ist Cannabis inzwischen legalisiert. Daher muss ich Sie aus medizinischen Gründen routinemäßig fragen: Konsumieren Sie Drogen?

*Familien- & Sozialanamnese*
43. Haben Familienmitglieder — Großeltern, Eltern, Geschwister oder Kinder — chronische Erkrankungen?
   ↳ Falls ja: Welche Erkrankungen sind das?
   ↳ Falls ja: Seit wann sind sie bekannt?
44. Leben Ihre Eltern noch?
   ↳ Falls verstorben: Woran ist Ihre Mutter / Ihr Vater gestorben? (Avec empathie : „Mein herzliches Beileid.“)
   ↳ Falls verstorben: Wann war das?
45. Wie ist Ihr Familienstand? Haben Sie Kinder?
   ↳ Falls ja: Wie viele, und sind sie gesund?
46. Was sind Sie von Beruf? Empfinden Sie Stress durch Ihre Arbeitssituation?
   ↳ Falls in Rente: Was haben Sie früher beruflich gemacht?
47. Arbeiten Sie dabei mit besonderen Stoffen — Staub, Chemikalien, Dämpfen?
48. Wohnen Sie allein oder mit jemandem? In einer Wohnung oder einem Haus, in welchem Stockwerk, mit Aufzug?
49. Haben Sie Haustiere, um die sich jemand kümmern muss?

*Frauenanamnese*
50. Verläuft Ihre Monatsblutung regelmäßig?
   ↳ Wann war Ihre letzte Regelblutung?
   ↳ Wie viele Tage liegen zwischen dem Beginn einer Blutung und dem Beginn der nächsten?
51. Besteht die Möglichkeit, dass Sie derzeit schwanger sind?
52. Verwenden Sie Verhütungsmethoden?
   ↳ Falls ja: Welche Methode verwenden Sie?
```

**case-zystitis**

```text
*Persönliche Daten*
1. Wie heißen Sie mit vollständigem Namen?
2. Könnten Sie Ihren Vor- und Nachnamen bitte langsam buchstabieren?
3. Wie alt sind Sie? Wann sind Sie geboren?
4. Wie groß sind Sie und wie viel wiegen Sie derzeit?
5. Haben Sie einen Hausarzt? Wie heißt er / sie?
6. Nur zur Sicherheit wiederhole ich kurz Ihre Daten: Sie heißen … , sind … Jahre alt, am … geboren, … groß und wiegen … kg. Ist das korrekt notiert?

*Aktuelle Beschwerden*
7. Was führt Sie heute zu uns?
8. Ort — Wo genau spüren Sie die Beschwerden?
   ↳ Können Sie mir zeigen, wo genau?
9. Beginn — Seit wann haben Sie das bemerkt? Kam es plötzlich oder hat es sich über Wochen entwickelt?
10. Charakter — Wie fühlt sich der Schmerz an: dumpf, stechend, brennend, drückend, krampfartig, pochend?
11. Intensität — Auf einer Skala von 1 bis 10, wobei 1 leichte und 10 unerträgliche Schmerzen bedeutet: Wie stark sind Ihre Schmerzen?
   ↳ Falls sehr stark: „Können Sie die Schmerzen bis zum Ende unseres Gesprächs (ca. 15 Minuten) ertragen, oder soll ich Ihnen ein Schmerzmittel geben?“ (Vor jedem Schmerzmittel zuerst nach Allergien und Unverträglichkeiten gegenüber Medikamenten fragen.)
12. Wie sieht Ihr Urin aus — trüb, ungewöhnlicher Geruch? Falls Blut dabei war: am Anfang, während oder am Ende des Wasserlassens?
13. Verlauf — Ist es dauernd so, oder gibt es Tage, an denen es normal ist? Wird es schlimmer?
14. Auslöser — Ist Ihnen ein Auslöser aufgefallen — ein bestimmtes Essen, eine Reise, ein neues Medikament, Stress?
15. Einflussfaktoren — Gibt es etwas, das es bessert oder verschlimmert — Essen, Trinken, Bewegung, Medikamente?
16. Begleitbeschwerden — Haben Sie außerdem noch andere Beschwerden bemerkt?

*Fachanamnese Urologie & Sexualanamnese*
17. Haben Sie Schmerzen oder ein Brennen beim Wasserlassen?
   ↳ Falls ja: Wo genau — vorne in der Harnröhre oder tief im Unterbauch?
18. Müssen Sie häufiger als sonst Wasser lassen, auch nachts? Kommt dabei nur wenig?
   ↳ Falls ja: Wie oft müssen Sie nachts aufstehen?
19. Haben Sie plötzlichen, starken Harndrang? Können Sie den Urin noch halten?
20. Haben Sie Schmerzen in der Flanke oder im Rücken? Strahlen sie in die Leiste aus?
21. Haben Sie Fieber oder Schüttelfrost?
22. Darf ich Ihnen ein paar Fragen zu Ihrer Partnerschaft stellen — das gehört zur Untersuchung dazu? Wie schützen Sie sich vor Geschlechtskrankheiten?
   ↳ Hatten Sie schon einmal eine sexuell übertragbare Erkrankung?
23. Haben Sie Schmerzen oder Blutungen beim oder nach dem Geschlechtsverkehr?
24. Hatten Sie schon einmal Nierensteine?

*Vegetative Anamnese*
25. Schwitzen Sie nachts stark?
   ↳ Haben Sie starke Schweißausbrüche?
26. Ist Ihnen übel? Mussten Sie sich übergeben?
   ↳ Falls ja: Können Sie das Erbrochene beschreiben? Seit wann, und wie häufig?
27. Haben Sie Schwierigkeiten mit dem Stuhlgang?
   ↳ Falls ja: Seit wann, und wie oft täglich? Können Sie das Aussehen des Stuhls näher beschreiben?
28. Haben Sie in letzter Zeit Gewichtsveränderungen bemerkt?
   ↳ Falls ja: Wie viel hat sich Ihr Gewicht verändert?
   ↳ Falls ja: In welchem Zeitraum war das?
29. Wie ist Ihr Appetit? Haben sich Ihre Essgewohnheiten kürzlich geändert?
30. Ist Ihr Schlaf erholsam? Haben Sie Probleme, ein- oder durchzuschlafen?
31. Sind Ihre Impfungen auf dem neuesten Stand?

*Vorerkrankungen & Voroperationen*
32. Wie Sie vielleicht wissen, spielen sowohl erbliche als auch erworbene Krankheiten eine wichtige Rolle. Daher würde ich Ihnen gern einige Fragen zu Ihrer Vorgeschichte stellen — sind Sie einverstanden?
33. Gibt es bei Ihnen vorbestehende Erkrankungen, zum Beispiel Bluthochdruck, Zuckerkrankheit oder erhöhte Blutfettwerte?
   ↳ Falls ja: Welche, und seit wann sind sie bekannt? Werden sie behandelt?
34. Wurden Sie schon einmal operiert?
   ↳ Falls ja: Welche Eingriffe wurden durchgeführt, und wann? Traten dabei Komplikationen auf?
35. Waren Sie in letzter Zeit im Krankenhaus?
36. Hatten Sie schon öfter eine Blasenentzündung — wie oft im letzten Jahr?
37. Ist bei Ihnen ein Diabetes bekannt?

*Medikamente*
38. Nehmen Sie regelmäßig oder gelegentlich Medikamente ein?
   ↳ Falls ja: Welche Medikamente sind das?
   ↳ Falls ja: Seit wann nehmen Sie sie?
   ↳ Falls ja: In welcher Dosierung?
   ↳ Falls ja: Wie oft am Tag?
39. Nehmen Sie Blutverdünner oder Kortison?
40. Nehmen Sie frei verkäufliche Schmerzmittel, pflanzliche Mittel oder Nahrungsergänzung?

*Allergien & Unverträglichkeiten*
41. Sind Sie allergisch gegen bestimmte Medikamente oder Nahrungsmittel?
   ↳ Falls ja: Beschreiben Sie bitte, wie Sie genau reagieren — an der Haut, an der Atmung, am Kreislauf?
42. Vertragen Sie bestimmte Speisen nicht (Laktose, Gluten)?

*Noxen / Genussmittel*
43. Rauchen Sie?
   ↳ Falls ja: Seit wann rauchen Sie?
   ↳ Falls ja: Wie viele Zigaretten ungefähr pro Tag?
   ↳ Falls aufgehört: Wann haben Sie aufgehört?
   ↳ Falls aufgehört: Wie viele Jahre haben Sie geraucht?
   ↳ Falls aufgehört: Wie viel haben Sie davor pro Tag geraucht?
44. Trinken Sie Alkohol?
   ↳ Falls ja: Welche Getränke bevorzugen Sie — Bier, Wein, Schnaps?
   ↳ Falls ja: Trinken Sie täglich oder nur zu besonderen Anlässen?
   ↳ Falls ja: Wie viel trinken Sie ungefähr pro Woche?
45. Wie Sie wissen, ist Cannabis inzwischen legalisiert. Daher muss ich Sie aus medizinischen Gründen routinemäßig fragen: Konsumieren Sie Drogen?

*Familien- & Sozialanamnese*
46. Haben Familienmitglieder — Großeltern, Eltern, Geschwister oder Kinder — chronische Erkrankungen?
   ↳ Falls ja: Welche Erkrankungen sind das?
   ↳ Falls ja: Seit wann sind sie bekannt?
47. Leben Ihre Eltern noch?
   ↳ Falls verstorben: Woran ist Ihre Mutter / Ihr Vater gestorben? (Avec empathie : „Mein herzliches Beileid.“)
   ↳ Falls verstorben: Wann war das?
48. Wie ist Ihr Familienstand? Haben Sie Kinder?
   ↳ Falls ja: Wie viele, und sind sie gesund?
49. Was sind Sie von Beruf? Empfinden Sie Stress durch Ihre Arbeitssituation?
   ↳ Falls in Rente: Was haben Sie früher beruflich gemacht?
50. Arbeiten Sie dabei mit besonderen Stoffen — Staub, Chemikalien, Dämpfen?
51. Wohnen Sie allein oder mit jemandem? In einer Wohnung oder einem Haus, in welchem Stockwerk, mit Aufzug?
52. Haben Sie Haustiere, um die sich jemand kümmern muss?
53. Hatten Sie in den letzten Tagen Geschlechtsverkehr? Gibt es einen neuen Partner?
54. Wie viel trinken Sie am Tag, und können Sie bei der Arbeit zur Toilette gehen, wenn Sie müssen?

*Frauenanamnese*
55. Verläuft Ihre Monatsblutung regelmäßig?
   ↳ Wann war Ihre letzte Regelblutung?
   ↳ Wie viele Tage liegen zwischen dem Beginn einer Blutung und dem Beginn der nächsten?
56. Besteht die Möglichkeit, dass Sie derzeit schwanger sind?
57. Verwenden Sie Verhütungsmethoden?
   ↳ Falls ja: Welche Methode verwenden Sie?
58. Haben Sie Ausfluss aus der Scheide oder Juckreiz im Intimbereich?
```

**case-schenkelhalsfraktur**

```text
*Persönliche Daten*
1. Wie heißen Sie mit vollständigem Namen?
2. Könnten Sie Ihren Vor- und Nachnamen bitte langsam buchstabieren?
3. Wie alt sind Sie? Wann sind Sie geboren?
4. Wie groß sind Sie und wie viel wiegen Sie derzeit?
5. Haben Sie einen Hausarzt? Wie heißt er / sie?
6. Nur zur Sicherheit wiederhole ich kurz Ihre Daten: Sie heißen … , sind … Jahre alt, am … geboren, … groß und wiegen … kg. Ist das korrekt notiert?

*Aktuelle Beschwerden*
7. Was führt Sie heute zu uns?
8. Ort — Wo genau spüren Sie die Beschwerden?
   ↳ Können Sie mir zeigen, wo genau?
9. Beginn — Seit wann haben Sie die Schmerzen? Kamen sie plötzlich oder schleichend?
10. Charakter — Wie fühlt sich der Schmerz an: dumpf, stechend, brennend, drückend, krampfartig, pochend?
11. Intensität — Auf einer Skala von 1 bis 10, wobei 1 leichte und 10 unerträgliche Schmerzen bedeutet: Wie stark sind Ihre Schmerzen?
   ↳ Falls sehr stark: „Können Sie die Schmerzen bis zum Ende unseres Gesprächs (ca. 15 Minuten) ertragen, oder soll ich Ihnen ein Schmerzmittel geben?“ (Vor jedem Schmerzmittel zuerst nach Allergien und Unverträglichkeiten gegenüber Medikamenten fragen.)
12. Verlauf — Sind die Schmerzen dauerhaft da oder treten sie anfallsartig auf?
   ↳ Falls anfallsartig: Wie lange dauert eine typische Episode? Wie oft treten die Episoden auf?
13. Auslöser — Gab es etwas Bestimmtes, das die Schmerzen ausgelöst hat? Was taten Sie, als sie begannen?
14. Einflussfaktoren — Gibt es etwas, das die Beschwerden bessert oder verschlimmert (Essen, Bewegung, Atmung, Körperhaltung)?
15. Frühere Episoden — Hatten Sie solche Beschwerden schon einmal?
   ↳ Falls ja: Waren Sie deswegen schon bei einem Arzt? Welche Diagnose wurde damals gestellt?
16. Begleitbeschwerden — Haben Sie außerdem noch andere Beschwerden bemerkt?
17. War Ihnen vor dem Sturz schwindelig oder schwarz vor Augen, oder sind Sie einfach gestolpert?
18. Waren Sie kurz bewusstlos? Haben Sie sich auf die Zunge gebissen oder Urin verloren? Erinnern Sie sich an alles?
19. Sind Sie mit dem Kopf aufgeschlagen? Hatten Sie danach Kopfschmerzen, Erbrechen oder Sehstörungen?
20. Konnten Sie nach dem Sturz noch aufstehen oder auftreten?
   ↳ Falls nein: Wie lange haben Sie am Boden gelegen?

*Fachanamnese Orthopédie/Trauma*
21. Haben Sie sich dabei noch woanders verletzt?
22. Sind die Schmerzen von Bewegung und Belastung abhängig, oder treten sie auch in Ruhe und nachts auf?
23. Strahlen die Schmerzen ins Bein aus — und wenn ja, bis wohin?
24. Haben Sie im Bein Kribbeln, ein Taubheitsgefühl oder weniger Kraft bemerkt?
25. Ist der Fuß kälter, blasser oder bläulich geworden?
26. Ist das Gelenk geschwollen, gerötet, überwärmt, oder haben Sie einen Bluterguss bemerkt?
27. Hatten Sie an dieser Stelle schon einmal Beschwerden, eine Verletzung oder eine Operation?

*Vegetative Anamnese*
28. Haben Sie Ihre Körpertemperatur in letzter Zeit gemessen? Haben Sie Fieber festgestellt?
   ↳ Falls Fieber: Seit wann haben Sie Fieber?
   ↳ Falls ja: Wie hoch war die Temperatur?
   ↳ Falls ja: Wo haben Sie gemessen (z. B. im Mund)?
29. Treten bei Ihnen Schüttelfrost, Nachtschweiß oder starke Schweißausbrüche auf?
30. Ist Ihnen übel?
31. Haben Sie Schwierigkeiten mit dem Stuhlgang oder beim Wasserlassen?
   ↳ Falls ja: Seit wann, und wie oft täglich? Können Sie das Aussehen von Stuhl oder Urin näher beschreiben?
32. Haben Sie in letzter Zeit Gewichtsveränderungen bemerkt?
   ↳ Falls ja: Wie viel hat sich Ihr Gewicht verändert?
   ↳ Falls ja: In welchem Zeitraum war das?
33. Wie ist Ihr Appetit? Haben sich Ihre Essgewohnheiten kürzlich geändert?
34. Ist Ihr Schlaf erholsam? Haben Sie Probleme, ein- oder durchzuschlafen?
35. Sind Ihre Impfungen auf dem neuesten Stand?

*Vorerkrankungen & Voroperationen*
36. Wie Sie vielleicht wissen, spielen sowohl erbliche als auch erworbene Krankheiten eine wichtige Rolle. Daher würde ich Ihnen gern einige Fragen zu Ihrer Vorgeschichte stellen — sind Sie einverstanden?
37. Gibt es bei Ihnen vorbestehende Erkrankungen, zum Beispiel Bluthochdruck, Zuckerkrankheit oder erhöhte Blutfettwerte?
   ↳ Falls ja: Welche, und seit wann sind sie bekannt? Werden sie behandelt?
38. Wurden Sie schon einmal operiert?
   ↳ Falls ja: Welche Eingriffe wurden durchgeführt, und wann? Traten dabei Komplikationen auf?
39. Waren Sie in letzter Zeit im Krankenhaus?
40. Haben Sie sich schon einmal einen Knochen gebrochen, zum Beispiel am Handgelenk oder an der Wirbelsäule, und wie ist das damals passiert?

*Medikamente*
41. Nehmen Sie regelmäßig oder gelegentlich Medikamente ein?
   ↳ Falls ja: Welche Medikamente sind das?
   ↳ Falls ja: Seit wann nehmen Sie sie?
   ↳ Falls ja: In welcher Dosierung?
   ↳ Falls ja: Wie oft am Tag?
42. Nehmen Sie Kortison?
43. Nehmen Sie frei verkäufliche Schmerzmittel, pflanzliche Mittel oder Nahrungsergänzung?
44. Wie viel haben Sie an diesem Tag getrunken und gegessen? Nehmen Sie Wassertabletten oder Blutdruckmittel?
45. Nehmen Sie Blutverdünner — Marcumar, eine der neuen Tabletten, Clopidogrel oder Spritzen?

*Allergien & Unverträglichkeiten*
46. Sind Sie allergisch gegen bestimmte Medikamente oder Nahrungsmittel?
   ↳ Falls ja: Beschreiben Sie bitte, wie Sie genau reagieren — an der Haut, an der Atmung, am Kreislauf?
47. Vertragen Sie bestimmte Speisen nicht (Laktose, Gluten)?

*Noxen / Genussmittel*
48. Rauchen Sie?
   ↳ Falls ja: Seit wann rauchen Sie?
   ↳ Falls ja: Wie viele Zigaretten ungefähr pro Tag?
   ↳ Falls aufgehört: Wann haben Sie aufgehört?
   ↳ Falls aufgehört: Wie viele Jahre haben Sie geraucht?
   ↳ Falls aufgehört: Wie viel haben Sie davor pro Tag geraucht?
49. Trinken Sie Alkohol?
   ↳ Falls ja: Welche Getränke bevorzugen Sie — Bier, Wein, Schnaps?
   ↳ Falls ja: Trinken Sie täglich oder nur zu besonderen Anlässen?
   ↳ Falls ja: Wie viel trinken Sie ungefähr pro Woche?
50. Wie Sie wissen, ist Cannabis inzwischen legalisiert. Daher muss ich Sie aus medizinischen Gründen routinemäßig fragen: Konsumieren Sie Drogen?

*Familien- & Sozialanamnese*
51. Haben Familienmitglieder — Großeltern, Eltern, Geschwister oder Kinder — chronische Erkrankungen?
   ↳ Falls ja: Welche Erkrankungen sind das?
   ↳ Falls ja: Seit wann sind sie bekannt?
52. Leben Ihre Eltern noch?
   ↳ Falls verstorben: Woran ist Ihre Mutter / Ihr Vater gestorben? (Avec empathie : „Mein herzliches Beileid.“)
   ↳ Falls verstorben: Wann war das?
53. Wie ist Ihr Familienstand? Haben Sie Kinder?
   ↳ Falls ja: Wie viele, und sind sie gesund?
54. Was sind Sie von Beruf? Empfinden Sie Stress durch Ihre Arbeitssituation?
   ↳ Falls in Rente: Was haben Sie früher beruflich gemacht?
55. Arbeiten Sie dabei mit besonderen Stoffen — Staub, Chemikalien, Dämpfen?
56. Wohnen Sie allein oder mit jemandem? In einer Wohnung oder einem Haus, in welchem Stockwerk, mit Aufzug?
57. Haben Sie Haustiere, um die sich jemand kümmern muss?
58. Sehen Sie gut, besonders in der Dämmerung? Liegen bei Ihnen zu Hause Teppiche, gibt es Haltegriffe im Bad und Licht im Flur?

*Frauenanamnese*
59. Wann hatten Sie Ihre letzte Regelblutung?
   ↳ Hatten Sie seitdem noch einmal eine Blutung?
60. Wie haben Sie die Wechseljahre erlebt — hatten Sie Beschwerden?
   ↳ Nehmen oder nahmen Sie Hormone ein — etwa Hormonersatz in den Wechseljahren, oder die Pille oder Spirale als Behandlung?
   ↳ Gehen Sie regelmäßig zum Frauenarzt?
```

## Annexe — la déclaration de chaque question du cas (130 cas)

`#n` = index dans `caseSpecificQuestions` ; aucune muette depuis le fixeur (anorexia-nervosa n° 7 : `todeswunsch`, D-1). État après le fixeur. Les questions déclarées avant K4 (67) gardent leur déclaration, sauf diabetes-typ1 n° 1 (§ 2). Les signes nouveaux sont décrits dans `src/data/guides/signesDefsCas.ts`.

| Cas | Questions du cas |
|---|---|
| leberzirrhose | #0 muedigkeit, leistung · #1 oedeme · #2 gelbfaerbung · #3 konzentration, gedaechtnis · #4 stuhlaussehen, urin_aspekt · #5 alkohol_dauer (braucht alkohol) · #6 entzug (braucht alkohol) |
| angina-pectoris | #0 stress_ausloeser · #1 episoden_haeufigkeit, entwicklung · #2 herz_vorgeschichte · #3 familie_herz |
| pankreatitis | #0 speisen · #1 gallensteine |
| gib | #0 erbrechen · #1 nsar · #2 orthostase |
| divertikulitis | #0 ort · #1 darm_vorgeschichte · #2 frueher · #3 miktion |
| cholezystitis | #0 speisen · #1 frueher · #2 gelbfaerbung |
| kolorektales-ca | #0 stuhlkaliber · #1 familie_krebs · #2 muedigkeit |
| gerd | #0 lageabhaengig, tageszeit · #1 schluck · #2 husten, stimme · #3 speisen |
| myokardinfarkt | #0 beginn · #1 schwitzen, uebelkeit · #2 angst · #3 herz_vorgeschichte · #4 familie_herz |
| oesophaguskarzinom | #0 schluck · #1 stimme · #2 odynophagie · #3 regurgitation |
| ulcus | #0 speisen · #1 nsar · #2 vorbehandlung |
| magenkarzinom | #0 fleischaversion · #1 schluck · #2 familie_krebs · #3 magen_vorgeschichte |
| appendizitis | #0 schmerzwanderung · #1 erschuetterung · #2 uebelkeit, erbrechen · #3 appetit |
| depression | #0 antrieb · #1 manie_vorgeschichte · #2 temperaturtoleranz, haut_haare |
| pneumonie | #0 impfung · #1 tumor_vorgeschichte · #2 antibiotika |
| pyelonephritis | #0 harnwegsinfekt · #1 diabetes_einstellung · #2 verwirrtheit · #3 harnwegs_eingriff |
| pavk | #0 gehstrecke · #1 durchblutung · #2 steigung · #3 wundheilung, ruheschmerz |
| lyme | #0 erythem_ring · #1 ausschlag · #2 herzrasen, schwindel, bewusstlos · #3 ausbreitung |
| osg-fraktur | #0 umknicken · #1 thrombose_vorgeschichte · #2 familie_thrombose |
| bandscheibenvorfall | #0 schwaeche · #1 pressschmerz |
| gicht | #0 nachtschmerz · #1 wunde, insektenstich · #2 episoden_haeufigkeit · #3 nierensteine |
| multiple-sklerose | #0 frueher · #1 waerme · #2 lhermitte · #3 farbsehen · #4 sattel · #5 zecke, erythem_ring |
| reizdarm | #0 defaekation_besserung · #1 stuhlfrequenz, stuhlaussehen · #2 nachtschmerz · #3 familie_krebs, familie_darm · #4 stress · #5 arthralgie, augenentzuendung, ausschlag |
| schlaganfall | #0 beginn · #1 medikament_indikation · #2 herz_vorgeschichte · #3 amaurosis · #4 kopfanprall |
| gallenkolik | #0 speisen · #1 gelbfaerbung, urin_aspekt, stuhlaussehen · #2 gallensteine |
| tvt | #0 flug (braucht beginn) · #1 thrombose_vorgeschichte · #2 familie_thrombose · #3 blutungsneigung, haematome · #4 atemnot, herzrasen, atemabhaengig |
| diabetes | #0 zuckergetraenke · #1 juckreiz, pilzinfektion · #2 harnwegsinfekt · #3 sehstoerung · #4 taubheit · #5 familie_endokrin · #6 essalltag, bewegung_alltag · #7 pankreas_vorgeschichte |
| hyperthyreose | #0 gewicht, appetit · #1 schwaeche · #2 vaginalblutung · #3 kontrastmittel, jodzufuhr · #4 schilddruesenhormone · #5 insulinbedarf, hypoglykaemie |
| copd | #0 husten · #1 exazerbationen, krankenhaus · #2 impfung · #3 oedeme, orthopnoe · #4 inhalationstechnik · #5 lungennoxen, berufsstoffe, passivrauchen |
| zystitis | #0 urin_aspekt · #1 fluor, juckreiz · #2 sexualkontakt · #3 frueher, harnwegsinfekt · #4 trinkmenge, miktion_aufschub · #5 diabetes_bekannt |
| migraene | #0 dauer · #1 bewegungsschmerz · #2 attackenverhalten · #3 schmerzmittel_frequenz · #4 stress_ausloeser · #5 beginn_art · #6 thrombose_vorgeschichte · #7 familie_aehnlich |
| asthma | #0 beschwerdefreies_intervall · #1 allergen_ausloeser · #2 belastung · #3 atopie · #4 familie_atopie · #5 vorbehandlung · #6 nsar_intoleranz, nasenpolypen · #7 leistung |
| herzinsuffizienz | #0 orthopnoe, dpn · #1 gewicht · #2 oedem_qualitaet · #3 adhaerenz · #4 nsar · #5 salzkonsum · #6 alltag_zuhause (braucht wohnsituation) |
| nierenkolik | #0 bewegungsdrang · #1 trinkmenge · #2 nierensteine, familie_niere · #3 hodenschwellung · #4 urinmenge |
| tonsillitis | #0 husten, schnupfen, stimme · #1 rachenbefund · #2 ort · #3 kieferklemme · #4 lymphknoten · #5 tonsillen_vorgeschichte · #6 agranulozytose_risiko |
| anaemie | #0 stuhl · #1 vaginalblutung · #2 nsar · #3 spiegelung · #4 familie_krebs · #5 haut_haare, zunge · #6 pica · #7 unvertraeglichkeit |
| vorhofflimmern | #0 beginn, verlauf · #1 alkohol_akut · #2 herz_vorgeschichte · #3 antikoagulation · #4 tia_vorgeschichte · #5 gewicht, schwitzen · #6 schnarchen, schlafapnoe, tagesschlaefrigkeit · #7 blutungs_vorgeschichte |
| erysipel | #0 hautbefund · #1 wunde · #2 fusspilz · #3 lymphangitis, lymphknoten · #4 frueher · #5 oedeme, gefaess_vorgeschichte, kompression · #6 nekrose_zeichen · #7 diabetes_einstellung |
| hypothyreose | #0 augenbrauen · #1 oedem_qualitaet · #2 vaginalblutung · #3 schilddruesen_vorgeschichte · #4 schilddruesen_noxen, kontrastmittel · #5 familie_endokrin, familie_autoimmun · #6 interesse · #7 postpartum (braucht kinder) |
| niereninsuffizienz | #0 kontrastmittel · #1 nierenvorgeschichte · #2 diabetes_einstellung · #3 harnstrahl, restharn · #4 atemnot, orthopnoe · #5 insulinbedarf |
| lymphom | #0 entwicklung · #1 halsschmerzen, husten, miktion · #2 alkoholschmerz · #3 pruritus · #4 vorinfekt, zecke · #5 obere_einflussstauung · #6 lymphknoten |
| lungenembolie | #0 atemabhaengig · #1 immobilisation · #2 thromboseprophylaxe · #3 thrombose_vorgeschichte, familie_thrombose · #4 bewusstlos · #5 antikoagulation, blutungs_vorgeschichte |
| eug | #0 schwangerschaftstest (braucht schwangerschaft) · #1 blutklumpen · #2 std_vorgeschichte · #3 eug_vorgeschichte · #4 schwindel, bewusstlos · #5 ausstrahlung · #6 schmerzwanderung · #7 blutgruppe |
| meningitis | #0 meningismus · #1 photophobie · #2 erbrechen, uebelkeit · #3 vorinfekt, liquorrhoe · #4 petechien · #5 krampf, schwaeche, sehstoerung, sprache · #6 kortison, immunsuppression, splenektomie · #7 kontakt |
| pankreaskarzinom | #0 beginn · #1 stuhlaussehen · #2 ausstrahlung · #3 pruritus · #4 diabetes_einstellung · #5 familie_krebs · #6 thrombose_vorgeschichte |
| zoster | #0 beginn · #1 prodromi · #2 ausbreitung · #3 windpocken · #4 augenentzuendung, sehstoerung · #5 hoerminderung, schwindel · #6 kortison, immunsuppression · #7 allodynie |
| osteoporose | #0 ausloeser · #1 koerpergroesse_verlust · #2 fraktur_vorgeschichte · #3 osteoporose_diagnostik · #4 kortisonstoss (braucht kortison) · #5 vorbehandlung · #6 familie_aehnlich |
| bph | #0 trinkmenge, diuretika · #1 oedeme, atemnot · #2 harnverhalt · #3 anticholinergika · #4 familie_krebs · #5 untersuchung_einverstaendnis |
| demenz | #0 beginn, beginn_art · #1 kurzzeitgedaechtnis · #2 alltag_haushalt · #3 alltag_finanzen · #4 adhaerenz · #5 orientierung_raum · #6 orientierung_zeit · #7 hilfe_zuhause, vorsorgevollmacht |
| bronchialkarzinom | #0 husten · #1 haemoptyse · #2 atemwegsinfekt · #3 stimme · #4 obere_einflussstauung · #5 lungennoxen, berufsstoffe · #6 familie_krebs · #7 knochenschmerz, kopfschmerz, sehstoerung, krampf |
| mammakarzinom | #0 beginn, entwicklung · #1 peau_orange · #2 lymphknoten · #3 brust_vorgeschichte · #4 menarche · #5 stillen · #6 familie_krebs · #7 knochenschmerz, husten |
| rheumatoide-arthritis | #0 einfluss · #1 fingerendgelenke · #2 gelenk_entzuendung · #3 feinmotorik · #4 naegel, daktylitis · #5 vorinfekt · #6 muedigkeit, leistung, fieber |
| morbus-crohn | #0 stuhl_blut · #1 stuhl_nachts · #2 stuhlaussehen · #3 reise · #4 antibiotika · #5 ulzera, ausschlag, augenentzuendung · #6 entzuendlicher_rueckenschmerz · #7 perianal |
| karpaltunnel | #0 ort · #1 tageszeit · #2 haendigkeit · #3 atrophie · #4 berufliche_belastung · #5 schilddruese_bekannt, diabetes_bekannt · #6 ortho_vorgeschichte |
| panikstoerung | #0 ausloeser, naechtliche_anfaelle · #1 angstinhalt · #2 erwartungsangst · #3 vermeidung · #4 koffein · #5 lebensbelastung · #6 vorbefunde |
| prostatakarzinom | #0 vorbehandlung · #1 urin_aspekt, haematospermie · #2 vorsorge_krebs · #3 ruheschmerz · #4 taubheit, schwaeche, inkontinenz · #5 familie_krebs · #6 harnverhalt |
| hepatitis-b | #0 prodromi · #1 taetowierung · #2 sexualanamnese · #3 drogen · #4 impfung · #5 verwirrtheit, tremor, blutungsneigung |
| parkinson | #0 tremor · #1 alkohol_besserung · #2 feinmotorik · #3 gang, sturz · #4 riechen · #5 traumschlaf · #6 stuhl · #7 neuroleptika |
| gonarthrose | #0 bewegungsschmerz, ruheschmerz · #1 treppensteigen · #2 steifigkeit · #3 mechanische_zeichen · #4 ortho_vorgeschichte · #5 gelenkpunktion · #6 gelenke |
| struma | #0 beginn, entwicklung · #1 schluckverschieblich · #2 atemnot, orthopnoe · #3 jod_ernaehrung · #4 jodzufuhr, kontrastmittel · #5 bestrahlung_hals · #6 familie_krebs · #7 lymphknoten |
| otitis-media | #0 nasenatmung · #1 charakter, lageabhaengig · #2 otorrhoe · #3 hoerminderung, tinnitus · #4 mastoiditis_zeichen · #5 schwindel, erbrechen, gang, fazialis · #6 frueher, ohr_vorgeschichte · #7 nasenspray |
| ileus | #0 voellegefuehl · #1 erbrechen · #2 frueher · #3 hernie · #4 verlauf · #5 stuhl_blut, stuhlgewohnheit · #6 familie_krebs · #7 herz_vorgeschichte |
| lagerungsschwindel | #0 charakter · #1 seite_lagerung (braucht lageabhaengig) · #2 hoerminderung, tinnitus · #3 kopfschmerz, nackenschmerz · #4 ausloeser · #5 gefaehrdung · #6 wohnung_sturzrisiko |
| synkope | #0 fremdanamnese · #1 anfallszeichen · #2 anfallsablauf · #3 ausloeser · #4 sturzhergang · #5 herz_vorgeschichte · #6 frueher · #7 familie_herz |
| zoeliakie | #0 stuhlaussehen · #1 speisen, unvertraeglichkeit · #2 diaet · #3 stuhl_nachts · #4 ausschlag, juckreiz · #5 ulzera, haut_haare, knochenschmerz · #6 anaemie_vorgeschichte · #7 familie_endokrin, familie_krebs, familie_aehnlich |
| schenkelhalsfraktur | #0 unfallhergang, schwindel · #1 bewusstlos, zungenbiss, einnaessen, anfallszeichen · #2 kopfanprall, kopfschmerz, erbrechen, sehstoerung · #3 trinkmenge, diuretika, antihypertensiva · #4 antikoagulation · #5 belastbarkeit, liegezeit · #6 sehvermoegen, wohnung_sturzrisiko · #7 fraktur_vorgeschichte |
| ulcus-cruris | #0 lageabhaengig · #1 gehstrecke · #2 thrombose_vorgeschichte · #3 oedeme · #4 ausloeser · #5 vorbehandlung · #6 kompression · #7 diabetes_bekannt, taubheit |
| leistenhernie | #0 einfluss · #1 reponierbarkeit · #2 inkarzeration · #3 erbrechen, windabgang, voellegefuehl · #4 ausstrahlung · #5 stuhl, miktion · #6 husten · #7 berufliche_belastung |
| alkoholentzug | #0 letzte_einnahme · #1 alkohol · #2 entzug (braucht alkohol) · #3 entzug_vorgeschichte · #4 haematemesis, stuhl_blut · #5 sehstoerung, gang · #6 sedativa |
| commotio | #0 anfallszeichen · #1 bewusstlos, fremdanamnese · #2 helm · #3 unfallhergang, prodromi · #4 nuechternheit · #5 hypoglykaemie · #6 erbrechen, entwicklung · #7 liquorrhoe, sehstoerung · #8 hilfe_zuhause |
| itp | #0 petechien · #1 blutungsneigung · #2 vaginalblutung · #3 vorinfekt, impfung · #4 thromboseprophylaxe · #5 kopfschmerz, erbrechen, sehstoerung, schwindel |
| uterus-myomatosus | #0 blutungsstaerke · #1 blutklumpen · #2 miktion_frequenz, nykturie, restharn · #3 muedigkeit, atemnot, schwindel · #4 blutungsneigung, haematome |
| akutes-nierenversagen | #0 urinmenge · #1 trinkmenge, stuhlfrequenz (braucht erbrechen) · #2 gewicht · #3 nsar · #4 antihypertensiva, diuretika · #5 kontrastmittel · #6 harnverhalt · #7 nierenvorgeschichte |
| fibromyalgie | #0 ort · #1 verlauf · #2 schlaf · #3 konzentration · #4 steifigkeit · #5 gelenk_entzuendung · #6 statin, medikament_neu · #7 stimmung, interesse |
| polymyalgia | #0 steifigkeit · #1 schwaeche · #2 kopfschmerz · #3 kopfhaut · #4 kieferclaudicatio · #5 sehstoerung · #6 gewicht, fieber, nachtschweiss · #7 statin, kortison |
| pneumothorax | #0 beginn_art · #1 ausloeser · #2 ort, atemabhaengig, brustschmerz · #3 frueher · #4 familie_aehnlich · #5 asthma, lungen_vorgeschichte |
| schlafapnoe | #0 schlaf · #1 schnarchen · #2 schlafapnoe · #3 dpn, herzrasen · #4 tagesschlaefrigkeit · #5 gefaehrdung · #6 alkohol_akut, sedativa · #7 blutdruck, medikament_neu |
| schizophrenie | #0 verfolgungswahn · #1 beziehungswahn · #2 halluzinationen · #3 imperative_stimmen · #4 ich_stoerung · #5 fremdbeeinflussung · #6 drogen |
| delir | #0 beginn, beginn_art · #1 vorzustand · #2 tageszeit · #3 halluzinationen · #4 medikament_neu, sedativa · #5 fieber, miktion · #6 hilfsmittel · #7 kognition_vorher |
| achalasie | #0 schluck · #1 verlauf, beginn_art · #2 regurgitation · #3 aspiration, husten · #4 vorbehandlung · #5 odynophagie, haematemesis, stuhl_blut · #6 gewicht, appetit · #7 reise |
| septische-arthritis | #0 gelenkpunktion · #1 latenz (braucht gelenkpunktion) · #2 ruheschmerz · #3 belastbarkeit · #4 kortison, immunsuppression · #5 wunde, insektenstich · #6 schwindel, verwirrtheit, atemnot, herzrasen |
| spinalkanalstenose | #0 gehstrecke · #1 einfluss · #2 einkaufswagenzeichen · #3 steigung · #4 durchblutung, wundheilung · #5 ruheschmerz · #6 ortho_vorgeschichte |
| hws-diskusprolaps | #0 pressschmerz · #1 armhebe_entlastung · #2 taubheit, schwaeche · #3 gang, feinmotorik · #4 tumor_vorgeschichte |
| laktoseintoleranz | #0 latenz_nach_essen · #1 dosisabhaengigkeit · #2 einfluss · #3 nahrungsmittelallergie · #4 nachtschmerz, stuhl_nachts · #5 stuhlaussehen · #6 stuhl_blut · #7 vorinfekt, antibiotika |
| tia | #0 beginn, dauer · #1 beginn_art · #2 rueckbildung · #3 entwicklung, episoden_haeufigkeit · #4 sehstoerung · #5 herz_vorgeschichte, antikoagulation · #6 gefaehrdung |
| diabetes-typ1 | #0 durst · #1 nykturie, polyurie · #2 gewicht, appetit · #3 uebelkeit, erbrechen · #4 sehstoerung · #5 pruritus, pilzinfektion, wundheilung · #6 familie_endokrin, familie_autoimmun · #7 vorinfekt, kortison |
| gastroenteritis | #0 essen_expo (braucht reise) · #1 beruf · #2 stuhl, stuhlaussehen · #3 miktion_frequenz, urin_aspekt, schwindel · #4 krankenhaus · #5 fieber, schuettelfrost, nachtschweiss |
| rheumatisches-fieber | #0 vorinfekt · #1 antibiotika · #2 gelenke · #3 ausschlag, erythem_ring · #4 hautknoetchen · #5 herzrasen, brustschmerz, atemnot, orthopnoe · #6 chorea, feinmotorik, stimmung |
| influenza | #0 beginn, beginn_art · #1 prodromi · #2 coronatest · #3 malariaprophylaxe (braucht reise) · #4 impfung · #5 atemnot, giemen · #6 urin_aspekt, myalgie |
| coxarthrose | #0 anlaufschmerz · #1 steifigkeit · #2 entwicklung · #3 leistung · #4 ortho_vorgeschichte · #5 gehstrecke · #6 nsar, magenschutz |
| metabolisches-syndrom | #0 essalltag, zuckergetraenke · #1 bewegung_alltag · #2 gewicht, abnehmversuche · #3 schnarchen, schlafapnoe, tagesschlaefrigkeit · #4 vorbefunde · #5 augenkontrolle · #6 haut_haare · #7 kortison, psychopharmaka, diuretika, antihypertensiva |
| karzinoid | #0 dauer, schwitzen · #1 ausloeser · #2 stuhl_nachts, stuhlfrequenz · #3 frueher · #4 vorbefunde, spiegelung · #5 herzrasen, atemnot, giemen · #6 hitzewallung · #7 familie_endokrin, nierensteine |
| abszess | #0 injektion · #1 latenz (braucht injektion) · #2 nekrose_zeichen · #3 frueher · #4 diabetes_einstellung · #5 kortison, immunsuppression · #6 taubheit, schwaeche · #7 impfung |
| anorexia-nervosa | #0 essalltag · #1 diaet · #2 selbstinduziertes_erbrechen · #3 abfuehrmittel, diuretika · #4 bewegung_alltag · #5 gewichtsphobie · #6 koerperbild · #7 todeswunsch |
| malaria | #0 aufenthalt (braucht reise) · #1 latenz (braucht reise) · #2 malariaprophylaxe (braucht reise) · #3 mueckenschutz · #4 verlauf · #5 urin_aspekt, stuhlaussehen, gelbfaerbung · #6 asplenie_impfung · #7 verwirrtheit, atemnot, blutungsneigung |
| endokarditis | #0 ausloeser · #1 herz_vorgeschichte · #2 endokarditis_hautzeichen · #3 miktion · #4 schwaeche, sprache, sehstoerung, kopfschmerz, flankenschmerz · #5 drogen, taetowierung · #6 allergie_reaktion (braucht allergie) |
| covid19 | #0 verlauf · #1 riechen, geschmack · #2 impfung · #3 atemnot · #4 atemabhaengig, beinschwellung · #5 kortison, immunsuppression, antikoagulation, diabetes_bekannt, herz_vorgeschichte, lungen_vorgeschichte · #6 risikopersonen · #7 herzrasen_frueher |
| anaphylaxie | #0 beginn · #1 insektenstich · #2 angiooedem, stimme, schluck · #3 giemen · #4 schwindel, bewusstlos, herzrasen · #5 antihypertensiva · #6 notfallset · #7 familie_aehnlich |
| reaktive-arthritis | #0 vorinfekt · #1 antibiotika · #2 latenz (braucht vorinfekt) · #3 sexualanamnese · #4 augenentzuendung · #5 herzrasen, atemnot, brustschmerz · #6 ausschlag, ulzera · #7 entzuendlicher_rueckenschmerz, fersenschmerz |
| pertussis | #0 husten · #1 charakter · #2 keuchen · #3 erbrechen, auswurf · #4 beschwerdefreies_intervall · #5 impfung · #6 risikopersonen · #7 antihypertensiva |
| colitis-ulcerosa | #0 stuhlfrequenz, stuhl_nachts · #1 stuhl_blut · #2 tenesmen · #3 rauchstopp (braucht rauchen) · #4 antibiotika, nsar, magenschutz · #5 arthralgie, gelenk_entzuendung, ausschlag, augenentzuendung, gelbfaerbung · #6 perianal, ulzera · #7 familie_darm, familie_krebs, spiegelung |
| chronische-pankreatitis | #0 stuhlaussehen · #1 pankreas_vorgeschichte · #2 alkohol_dauer (braucht alkohol) · #3 entzug · #4 gelbfaerbung, urin_aspekt, pruritus · #5 familie_aehnlich, familie_krebs |
| myokarditis | #0 vorinfekt · #1 sport · #2 einfluss · #3 herzrasen · #4 bewusstlos, sturz · #5 drogen · #6 familie_herz |
| nephrotisches-syndrom | #0 ort · #1 oedeme · #2 diabetes_bekannt, nierenvorgeschichte · #3 arthralgie, ausschlag, photosensibilitaet · #4 flankenschmerz, beinschwellung, haematurie · #5 nachtschweiss |
| akute-leukaemie | #0 beginn · #1 milz_druck · #2 berufsstoffe · #3 tumor_vorgeschichte, familie_krebs · #4 kopfschmerz, sehstoerung, verwirrtheit, taubheit · #5 infektneigung |
| endometriose | #0 zyklusbezug · #1 entwicklung · #2 schmerzmittel_frequenz, arbeitsausfall · #3 dyspareunie · #4 miktion, urin_aspekt · #5 vorbehandlung · #6 familie_aehnlich |
| ptbs | #0 ausloeser · #1 intrusionen · #2 vermeidung · #3 uebererregung · #4 entfremdung · #5 kopfschmerz, erbrechen · #6 konsumaenderung, sedativa |
| somatoforme-schmerzstoerung | #0 lebensbelastung · #1 vorbefunde · #2 krankheitskonzept · #3 schmerzmittel_frequenz, entzug · #4 sozialrecht · #5 gelenk_entzuendung, steifigkeit · #6 nachtschmerz, einfluss |
| hueftkopfnekrose | #0 kortison · #1 alkohol_dauer (braucht alkohol) · #2 projektion · #3 beweglichkeit · #4 gelenke · #5 verlauf · #6 thrombose_vorgeschichte, tumor_vorgeschichte, tauchen · #7 stuhl, stuhl_blut, schub |
| glomerulonephritis | #0 vorinfekt, latenz · #1 antibiotika · #2 kopfschmerz, sehstoerung, atemnot · #3 haemoptyse, petechien · #4 familie_niere · #5 ausloeser |
| nhl | #0 beginn, entwicklung · #1 lokalschmerz, verschieblichkeit · #2 alkoholschmerz · #3 nachtschweiss · #4 pruritus · #5 husten, atemnot, schluck, herzrasen · #6 beinschwellung |
| cml | #0 vorbefunde · #1 milz_druck, voellegefuehl · #2 ausstrahlung · #3 sehstoerung, kopfschmerz, atemnot, priapismus · #4 gicht, nierensteine · #5 blutbild_frueher · #6 berufsstoffe, strahlenexposition |
| adnexitis | #0 sexualanamnese · #1 std_vorgeschichte · #2 schmerzwanderung · #3 schulterschmerz |
| allergische-rhinitis | #0 allergen_ausloeser · #1 nasensekret · #2 augenentzuendung, juckreiz · #3 husten · #4 nahrungsmittelallergie · #5 nasenspray · #6 atopie, familie_atopie · #7 haustiere, beruf, wohnumfeld_allergene |
| typhus | #0 verlauf, beginn_art · #1 puls · #2 malariaprophylaxe · #3 impfung · #4 essen_expo (braucht reise) · #5 stuhl · #6 verwirrtheit · #7 ausschlag |
| obstipation | #0 stuhlfrequenz, stuhlaussehen · #1 blutungsquelle (braucht stuhl_blut) · #2 stuhlkaliber · #3 nachtschmerz · #4 medikament_neu · #5 abfuehrmittel · #6 familie_krebs · #7 stimmung, hilfe_zuhause |
| sturz-im-alter | #0 unfallhergang, schwindel · #1 bewusstlos · #2 liegezeit · #3 kopfanprall · #4 sturz, sturz_vorgeschichte · #5 orthostase · #6 sedativa, diuretika, medikament_neu · #7 wohnsituation, wohnung_sturzrisiko, hilfe_zuhause, haustiere |
| lumboischialgie | #0 ausloeser · #1 pressschmerz · #2 ruheschmerz · #3 entzuendlicher_rueckenschmerz · #4 vorinfekt, tumor_vorgeschichte · #5 nsar, magenschutz · #6 berufliche_belastung, stress · #7 krankheitskonzept |
| bauchaortenaneurysma | #0 miktion · #1 bewusstlos, schwitzen · #2 pulsation · #3 gefaess_vorgeschichte · #4 familie_gefaess · #5 brustschmerz, atemnot · #6 taubheit, schwaeche, stuhl · #7 hernie, haematome |
| aortendissektion | #0 beginn_art · #1 charakter · #2 schmerzwanderung · #3 ausloeser · #4 schwaeche, sprache, sehstoerung, taubheit, durchblutung · #5 blutdruck, adhaerenz · #6 gefaess_vorgeschichte, familie_gefaess · #7 drogen |
| perikarditis | #0 einfluss · #1 vorinfekt · #2 herz_vorgeschichte, nierenvorgeschichte, rheuma_vorgeschichte, tumor_vorgeschichte · #3 reise · #4 vorbehandlung |
| epilepsie | #0 aura · #1 anfallszeichen, kopfschmerz · #2 naechtliche_anfaelle · #3 anfallsformen · #4 schlafentzug, alkohol_akut, drogen · #5 neuro_vorgeschichte, familie_aehnlich · #6 medikament_neu, sedativa · #7 gefaehrdung |
| hodentorsion | #0 ort · #1 beginn · #2 hodenschwellung · #3 ausloeser · #4 frueher · #5 impfung |
| basaliom | #0 lokalblutung · #1 hautbefund · #2 uv_exposition · #3 dermato_eingriff · #4 hautvorgeschichte, immunsuppression · #5 familie_haut · #6 medikament_indikation · #7 lymphknoten |
| psoriasis | #0 naegel · #1 arthralgie, daktylitis · #2 steifigkeit · #3 fersenschmerz, entzuendlicher_rueckenschmerz · #4 medikament_neu · #5 vorinfekt · #6 lebensbelastung · #7 leistung, stimmung |
| urtikaria | #0 dauer · #1 atemnot, stimme, giemen, schluck · #2 schwindel, herzrasen, bewusstlos, uebelkeit, stuhl · #3 medikament_neu · #4 allergie_reaktion (braucht allergie) · #5 antihypertensiva · #6 angiooedem, familie_aehnlich · #7 einfluss |
| perniziose-anaemie | #0 taubheit · #1 gang · #2 zunge · #3 gedaechtnis, stimmung · #4 bauch_op, darm_vorgeschichte · #5 magenschutz, metformin · #6 schilddruese_bekannt, vitiligo, familie_aehnlich |
| opioidabhaengigkeit | #0 letzte_einnahme · #1 dosissteigerung · #2 applikationsweg · #3 sedativa, alkohol_akut · #4 ueberdosis · #5 entzug · #6 craving · #7 soziale_folgen |
| sinusitis | #0 beginn, verlauf · #1 lageabhaengig · #2 nasensekret · #3 zahn · #4 riechen, geschmack · #5 nasenspray · #6 augenentzuendung, sehstoerung · #7 meningismus, photophobie, kopfschmerz, schwindel, verwirrtheit |
| arterielle-hypertonie | #0 blutdruck · #1 adhaerenz · #2 ort · #3 sehstoerung, schwaeche, taubheit, sprache · #4 nsar, nasenspray, kortison, lakritz · #5 schwitzen, herzrasen, blaesse, temperaturtoleranz · #6 schnarchen, schlafapnoe, tagesschlaefrigkeit |

## Annexe F — les 110 parts qui ne sont pas des sous-chaînes de leur variante (revue I-1, état après la relecture de langue)

À la relecture de langue. Ce sont les parts absentes de la liste K3 (24) ; 83 au fixeur, 110 après les compléments du cadre verbal de la relecture (§ G.1). Ordre du fichier `anamneseChapters.ts`.

| Sonde | Champ | Texte |
|---|---|---|
| `akt-beginn` | text | Kamen die Schmerzen plötzlich oder schleichend? |
| `akt-allgemein-art` | text | Was genau spüren Sie: eher Müdigkeit oder Kraftlosigkeit? |
| `akt-allgemein-art` | text | Ist Ihnen schwindelig, oder spüren Sie etwas anderes? |
| `akt-begleit` | text | War Ihnen dabei übel? |
| `akt-begleit` | text | Haben Sie dabei doppelt gesehen? |
| `akt-begleit` | text | Sind Sie dabei bewusstlos geworden? |
| `akt-begleit` | text | Hat es dabei irgendwo gezuckt? |
| `akt-begleit` | text | Haben Sie außerdem noch andere Beschwerden bemerkt? |
| `akt-infekt-herd` | text | Haben Sie Husten bemerkt? |
| `akt-infekt-herd` | text | Haben Sie Halsschmerzen? |
| `akt-infekt-herd` | text | Brennt es beim Wasserlassen? |
| `akt-infekt-herd` | text | Haben Sie Durchfall? |
| `akt-infekt-herd` | text | Ist Ihnen ein Ausschlag aufgefallen? |
| `akt-infekt-herd` | text | Haben Sie irgendwo eine Wunde? |
| `akt-veraend-was` | text | Ist Ihnen ein Knoten oder eine Schwellung aufgefallen? |
| `akt-veraend-was` | text | Ist Ihnen eine Hautveränderung aufgefallen? |
| `akt-veraend-was` | text | Sind Ihnen blaue Flecken aufgefallen? |
| `akt-veraend-was` | text | Ist Ihnen eine Blutung aufgefallen? |
| `akt-veraend-blutung` | text | Tut es weh oder juckt es? |
| `akt-begleit` | text | Ist Ihnen dazu schwindelig? |
| `akt-begleit` | text | Haben Sie Probleme mit der Blase? |
| `akt-begleit` | text | Haben Sie Probleme mit dem Stuhlgang? |
| `akt-begleit` | text | Haben Sie außerdem noch andere Beschwerden bemerkt? |
| `akt-ausscheid-was` | text | Hat sich beim Wasserlassen etwas verändert? |
| `akt-ausscheid-was` | text | Hat sich beim Stuhlgang etwas verändert? |
| `akt-ausscheid-was` | text | Hat sich die Farbe Ihrer Haut oder Ihrer Augen verändert? |
| `akt-ausscheid-was` | text | Hat sich die Farbe Ihres Urins verändert? |
| `akt-ausscheid-was` | text | Hat sich die Farbe Ihres Stuhls verändert? |
| `akt-begleit` | text | Hatten Sie dabei Brustschmerzen? |
| `akt-begleit` | text | War Ihnen dabei schwindelig? |
| `akt-begleit` | text | Haben Sie dabei geschwitzt? |
| `akt-begleit` | text | War Ihnen dabei übel? |
| `akt-begleit` | text | Haben Sie außerdem noch andere Beschwerden bemerkt? |
| `veg-uebelkeit` | followUp | Falls ja: Wie sah das Erbrochene aus? |
| `veg-uebelkeit` | followUp | Falls ja: Seit wann müssen Sie sich übergeben? |
| `veg-uebelkeit` | followUp | Falls ja: Wie oft haben Sie sich übergeben? |
| `med-blutverduenner` | text | Nehmen Sie Kortison? |
| `fach-pneumo-husten` | text | Ist der Husten trocken oder mit Auswurf? |
| `fach-pneumo-husten` | text | Haben Sie sich in letzter Zeit öfter verschluckt? |
| `fach-pneumo-fieber` | text | Hatten Sie Schüttelfrost? |
| `fach-pneumo-infekt` | text | Hatten Sie kürzlich Kontakt zu kranken Menschen? |
| `fach-pneumo-infekt` | text | Sind Sie kürzlich verreist? |
| `fach-pneumo-allergie` | text | Wurde bei Ihnen schon einmal Asthma festgestellt? |
| `fach-gastro-stuhl` | text | Ist der Stuhl blutig oder teerschwarz? |
| `fach-gastro-stuhl` | text | Welche Farbe hat der Stuhl — sehr hell, gelblich? |
| `fach-gefaess-thrombose` | text | Gibt es Thrombosen oder Lungenembolien in Ihrer Familie? |
| `fach-nephro-menge` | text | Müssen Sie nachts zum Wasserlassen aufstehen? |
| `fach-nephro-uraemie` | text | Haben Sie Übelkeit? |
| `fach-nephro-uraemie` | text | Haben Sie weniger Appetit als sonst? |
| `fach-nephro-uraemie` | text | Haben Sie einen metallischen Geschmack im Mund? |
| `fach-nephro-vorgeschichte` | text | Ist bei Ihnen eine Nierenerkrankung bekannt? |
| `fach-nephro-vorgeschichte` | text | Ist in Ihrer Familie eine Nierenerkrankung bekannt — etwa Zystennieren oder eine Dialyse? |
| `fach-uro-flanke` | text | Strahlen die Schmerzen in die Leiste aus? |
| `fach-uro-vorgeschichte` | text | Hatten Sie schon einmal Nierensteine? |
| `fach-uro-vorgeschichte` | text | Hatten Sie schon einmal Probleme mit der Prostata? |
| `fach-gyn-brust` | text | Haben Sie in der Brust einen Knoten bemerkt? |
| `fach-gyn-brust` | text | Haben Sie Schmerzen in der Brust, Absonderungen aus der Brustwarze oder Hautveränderungen an der Brust bemerkt? |
| `fach-neuro-koordination` | text | Haben Sie Schwindel oder das Gefühl zu schwanken? |
| `fach-neuro-koordination` | text | Fühlen Sie sich beim Gehen unsicher? |
| `fach-neuro-sprache` | text | Haben Sie Schwierigkeiten beim Sprechen oder beim Finden von Wörtern? |
| `fach-neuro-sprache` | text | Haben Sie Schwierigkeiten beim Schlucken? |
| `fach-neuro-blase` | text | Haben Sie Probleme mit der Blase — können Sie sie zum Beispiel nicht richtig entleeren? |
| `fach-neuro-blase` | text | Haben Sie Probleme mit dem Stuhlgang? |
| `fach-neuro-blase` | text | Haben Sie manchmal plötzlich einen starken Drang, auf die Toilette zu müssen? |
| `fach-neuro-blase` | text | Kommt es vor, dass Sie ungewollt Urin verlieren? |
| `fach-ortho-bewegung` | text | Treten die Schmerzen auch in Ruhe und nachts auf? |
| `fach-ortho-sensomotorik` | text | Haben Sie Kribbeln oder ein Taubheitsgefühl bemerkt? |
| `fach-ortho-sensomotorik` | text | Haben Sie weniger Kraft bemerkt? |
| `fach-ortho-schwellung` | text | Ist das Gelenk geschwollen, gerötet oder wärmer als sonst? |
| `fach-rheuma-systemisch` | text | Haben Sie Fieber bemerkt? |
| `fach-rheuma-systemisch` | text | Haben Sie Augenentzündungen oder eine Bindehautentzündung bemerkt? |
| `fach-rheuma-systemisch` | text | Haben Sie Mund- oder Genitalgeschwüre bemerkt? |
| `fach-rheuma-systemisch` | text | Hatten Sie Durchfall? |
| `fach-haem-belastung` | text | Bekommen Sie bei Anstrengung schneller Luftnot als früher? |
| `fach-haem-belastung` | text | Bekommen Sie bei Anstrengung schneller Herzklopfen als früher? |
| `fach-haem-belastung` | text | Wird Ihnen bei Anstrengung schneller schwindelig als früher? |
| `fach-haem-infekte` | text | Hatten Sie in letzter Zeit häufiger Infekte? |
| `fach-haem-infekte` | text | Haben Sie in letzter Zeit Fieber bemerkt? |
| `fach-haem-infekte` | text | Heilen Wunden bei Ihnen in letzter Zeit schlechter? |
| `fach-onko-blutung` | text | Haben Sie Blut im Stuhl bemerkt? |
| `fach-onko-blutung` | text | Haben Sie Blut im Urin bemerkt? |
| `fach-onko-blutung` | text | Haben Sie beim Husten Blut bemerkt? |
| `fach-onko-blutung` | text | Haben Sie Blutungen aus der Scheide bemerkt? |
| `fach-onko-appetit` | text | Haben Sie ein Völlegefühl? |
| `fach-onko-appetit` | text | Hat Ihr Appetit nachgelassen? |
| `fach-endo-hals` | text | Haben Sie eine Schwellung am Hals oder ein Engegefühl bemerkt? |
| `fach-endo-hals` | text | Haben Sie Schluckbeschwerden bemerkt? |
| `fach-endo-hals` | text | Haben Sie eine Veränderung der Stimme bemerkt? |
| `fach-endo-augen` | text | Haben Sie Doppelbilder oder Sehstörungen? |
| `fach-endo-folgeschaeden` | text | Sehen Sie schlechter als früher? |
| `fach-endo-folgeschaeden` | text | Haben Sie Probleme mit den Nieren? |
| `fach-endo-familie-therapie` | text | Werden Sie selbst schon wegen einer Zucker- oder Schilddrüsenerkrankung behandelt oder kontrolliert? |
| `fach-infekt-zecke` | text | Haben Sie einen Zeckenstich bemerkt? |
| `fach-infekt-zecke` | text | Haben Sie einen Insektenstich bemerkt? |
| `fach-infekt-haut` | text | Hat sich die Rötung ausgebreitet, zum Beispiel ringförmig? |
| `fach-infekt-gelenke` | text | Wandern die Schmerzen von Gelenk zu Gelenk? |
| `fach-infekt-neuro` | text | Ist Ihr Nacken steif? |
| `fach-infekt-neuro` | text | Haben Sie Missempfindungen wie Kribbeln oder Taubheit bemerkt? |
| `fach-infekt-neuro` | text | Haben Sie eine Gesichtslähmung bemerkt? |
| `fach-derma-beginn-ort` | text | Wie hat sich die Hautveränderung seitdem ausgebreitet? |
| `fach-derma-systemisch` | text | Haben Sie dazu Gelenkschmerzen? |
| `fach-derma-systemisch` | text | Haben Sie dazu Veränderungen im Mund oder im Genitalbereich bemerkt? |
| `fach-derma-systemisch` | text | Haben Sie dazu Veränderungen an den Augen? |
| `fach-derma-muttermal` | text | Juckt das Muttermal? |
| `fach-derma-muttermal` | text | Blutet das Muttermal? |
| `?` | text | Haben Sie «X» Kribbeln oder ein Taubheitsgefühl bemerkt? |
| `?` | text | Haben Sie «X» weniger Kraft bemerkt? |
| `?` | text | Hatten Sie schon einmal einen Harnwegsinfekt oder eine Blasenentzündung, die immer wiederkam? |
| `?` | text | Hatten Sie schon einmal Nierensteine? |
| `?` | text | Hatten Sie schon einmal eine sexuell übertragbare Erkrankung? |
