# Rapport lot K3 — le moteur de cohérence au montage : **BLOQUÉ**

> `sim-engine-engineer` · 5 oct. 2026 · branche `feat/s3-k3-cohere`, base `origin/main` @ `967d9d20` (K2 #75 mergé).
> Statut : **BLOCKED** sur la condition de merge fixée par main : `ajouteSansReponse = 8`, pas 0 (§ 1).
> Je me suis arrêté là, comme demandé (« une seule sonde ajoutée sans réponse → arrête-toi et rapporte »). En chemin, j'ai trouvé des contradictions entre r4a et des décisions déjà testées (§ 2). Elles se tranchent en même temps.

## 0. Ce qui est sur la branche

| Commit | Contenu | État |
|---|---|---|
| `ea9ddaf4` | Gel I3. `fachChapterRaw` est exporté et `fachRaw.test.ts` enregistre une empreinte par cas de la Fach brute, prise **avant** K3. | vert ; reste vert après le branchement |
| `d07a5878` | WIP. `coherence.ts` (`cohere`, `profilEffectif`, `compteursApres`, `COHERENCE_ALLOWED` vide, `R2_EXEMPTES = {pers-name}`) est branché dans `playedTrame`, qui gagne `ecarts`. `FACH_COVERS`, `coveredByFach` et l'exception testiculaire codée en dur sont supprimés. `PhraseVariant` gagne `braucht` et `detacheDe`. L'index `cas:<n>` vit dans une table à côté, pour que la Fach brute reste identique. | `tsc -b` 0 ; **13 tests rouges** sur `--dir src/data` (§ 3) |

La branche n'est **pas poussée** et aucun rapport de porte n'est mergeable. `coherence.test.ts`, `coherence.fachCovers.test.ts`, la porte bloquante, le fixture et le gel régénéré ne sont **pas écrits** : ils dépendent des décisions ci-dessous.

**Mesure du WIP** (`compteursApresCas`, relue depuis la trame jouée, 130 cas) :

| Compteur | Valeur |
|---|---:|
| doublons | 0 |
| horsProfil | 0 |
| exigeAbsent | 0 |
| relancesOrphelines | 0 |
| brauchtViole | 0 |
| **ajouteSansReponse** | **8** |
| nonReduit (résidu) | 128 |
| casRetiresParR1 | 0 |

Écarts produits :

| Règle | Action | Nombre |
|---|---|---:|
| r4a | détache | 366 |
| r2 | retire | 419, + 318 relances |
| r2 | réduit | 105, + 159 relances |
| r2 | non-réduit | 94 |
| r2 | déplace | 21 |
| r1 | retire | 24, + 4 relances |
| r1 | non-réduit | 34 |
| r1 | anomalie (question du cas gardée) | 2 |
| r3 | ajoute | 53 |

Le moteur n'est pas encore idempotent sur 1 cas sur 130 : `case-gerd` (sonde de banque à relance hors signe). C'est corrigé dans le WIP ; la preuve par test reste à écrire.

## 1. BLOQUANT — r3 ajoute 8 sondes de banque sans réponse

### [BLOQUANT] La mesure de K2 lisait le texte des questions du cas ; `cohere` ne le lit pas (I2)
- **Où** : 8 questions du cas, dans `app/src/data/seedCases.ts`.
- **Constat** : chacune de ces questions **pose déjà** le signe exigé, mais ne le déclare pas, ou en déclare un autre. Le contrat le dit (§10.8, I2) : « une question du cas sans `sucht` est invisible ». Aucune unité ne cherche donc le signe, et r3 ajoute la banque. Or `checkCoherence` (K2) lisait ce texte et comptait le signe comme présent. K2 n'a donc pas écrit ces réponses, et sa mesure annonçait `ajouteSansReponse = 0`.
- **Preuve** (signe exigé → banque ajoutée ; question du cas qui le pose ; ligne) :

| Cas | Signe → banque | Question du cas qui le pose déjà | Ligne | `sucht` actuel |
|---|---|---|---|---|
| gerd | husten → `akt-atemnot-husten` | « Haben Sie nachts Husten oder eine heisere Stimme bemerkt? » | 1500 | — |
| niereninsuffizienz | atemnot → `akt-atemnot-belastung` | « Bekommen Sie Luftnot beim Treppensteigen, und schlafen Sie flach oder mit mehreren Kissen? » | 15219 | `['orthopnoe']` |
| akutes-nierenversagen | stuhlfrequenz → `akt-ausscheid-haeufigkeit` | « … wie oft mussten Sie erbrechen oder zur Toilette … » (végétative) | 33115 | — |
| karzinoid | stuhlfrequenz → `akt-ausscheid-haeufigkeit` | « Müssen Sie auch nachts wegen Durchfall aufstehen, und wie oft haben Sie insgesamt Stuhlgang am Tag? » | 43509 | `['stuhl']` |
| karzinoid | atemnot → `akt-atemnot-belastung` | « Bekommen Sie während dieser Rötungsanfälle Herzrasen oder Luftnot, … » | 43512 | — |
| colitis-ulcerosa | gelenk_entzuendung → `fach-rheuma-entzuendung` | « Haben Sie Schmerzen oder Schwellungen an Gelenken, rote Knoten an den Schienbeinen, … » | 48025 | — |
| glomerulonephritis | atemnot → `akt-atemnot-belastung` | « Haben Sie Kopfschmerzen, Sehstörungen oder Luftnot bemerkt? » | 52425 | — |
| arterielle-hypertonie | ort → `akt-ort` | « Wo sitzt der Kopfschmerz? » | 62005 | — |

Dans les 8 cas, `antworten[banque]` est absent (vérifié par cas). Écrire les réponses ne corrigerait que le compteur. Le doublon resterait visible, par exemple « Wo sitzt der Kopfschmerz? » suivi de « Ort — Wo genau spüren Sie die Beschwerden? ».

- **Correctif — trois options, à trancher par main :**
  - **A (recommandée)** : déclarer `sucht` sur ces 8 questions. C'est de la déclaration : aucun texte n'est inventé, `antworten` ne bouge pas. C'est le travail de K4, avancé pour 8 questions, et il faut écrire dans `seedCases.ts`, hors du périmètre que le brief K3 me donne.
    - **Simulé en mémoire** (surcouche sur une copie des cas, rien n'est écrit) : `ajouteSansReponse` passe de 8 à 0.
    - Effets annexes, cas par cas : akutes-nierenversagen, la question du cas prend la place de `veg-uebelkeit` (r2) ; karzinoid, `veg-ausscheidung` n'est plus réduite. Aucun autre écart ne bouge.
    - Déclarations simulées : gerd `['husten','stimme']` ; niereninsuffizienz `['atemnot','orthopnoe']` ; akutes-nierenversagen `['uebelkeit','stuhlfrequenz']` ; karzinoid 2 `['stuhlfrequenz']` ; karzinoid 5 `['herzrasen','atemnot','giemen']` ; colitis-ulcerosa `['gelenk_entzuendung']` ; glomerulonephritis `['kopfschmerz','sehstoerung','atemnot']` ; arterielle-hypertonie `['ort']`.
    - Pour colitis-ulcerosa, la question est une énumération. Par D1, elle déclare chaque signe qu'elle nomme : un relecteur doit compléter la liste.
  - **B** : faire écrire les 8 réponses par le pôle Contenu. Le compteur passe à 0, mais le doublon reste visible. Je ne la recommande pas.
  - **C** : laisser r3 « voir » le texte des questions muettes. C'est contraire à I2 et au principe « la déclaration remplace la lecture ». Je la déconseille.
- **Conséquence pour la mesure** : `checkCoherence` (K2) doit cesser de compter comme présent un signe que seul le texte d'une question muette porte. Sinon, sa projection `ajouteSansReponse` ment encore.

## 2. Contradictions contrat ↔ décisions déjà testées (à trancher avant le merge)

### [BLOQUANT] r4a détache des relances que des décisions testées gardent sous leur mère
- **Où** : la déclaration `followUpSucht` de K1 et le lexique `signesDefs.ts` (chapitre de chaque signe), face à 6 tests rouges : `adaptChapters.test.ts:34`, `fachNature.test.ts:64`, et 4 tests de `gynFusion.test.ts` (dont `:215`).
- **Constat** : le contrat (§10.4 r4a, INV-84) détache **toute** relance inconditionnelle qui déclare un autre signe que sa mère. Il la place dans le chapitre de **son** signe. Avec les déclarations de K1, cela produit **366 détachements**, dont certains contredisent des décisions de Q-gyn et de L0. D'autres posent une question loin de son contexte.
- **Preuve** (`ecarts` du WIP, relance → chapitre d'arrivée, nombre de cas) :

| Relance | Signe (chapitre du lexique) | Arrivée | Cas | Problème |
|---|---|---|---:|---|
| `veg-fieber#5` « Sind Ihre Impfungen auf dem neuesten Stand? » | impfung (`fach`, `signesDefs.ts:140`) | dans la Fach du cas, quelle qu'elle soit | 130 : 11 retirées par `fach-infekt-impfung`, 3 par la relance HPV de `fach-gyn-vorsorge` | fibromyalgie : la question arrive dans la Fach Rhumato ; dans 3 cas gynéco, le statut vaccinal général cède devant la seule question HPV (même signe `impfung`) |
| `frau-wechseljahre#1` « Gehen Sie regelmäßig zum Frauenarzt? » | vorsorge_gyn (`fach`, `:195`) | dans une Fach non gynéco | 32 | Q-gyn : la question reste en relance tant que la Frauenanamnese n'est pas fondue (`adaptChapters.test.ts:34`) |
| `frau-wechseljahre#2` (Hormone) | hormone (`fach`, `:197`) | idem | 12 | C1 Q-gyn |
| `fach-gyn-dyspareunie#2` (Wasserlassen) | miktion | végétative | 4 | « dyspareunie : une question, deux relances » (`gynFusion.test.ts:215`) |
| `fach-ortho-mechanismus#1` « Sind Sie dabei ohnmächtig geworden? » (+ `#2` « … noch woanders verletzt? », détachée dans la Fach) | bewusstlos (`aktuell`), begleitverletzung (`fach`) | Aktuelle Beschwerden ; Fach | 2 | « dabei » perd son antécédent (`fachNature.test.ts:64`) |
| `akt-anfall-bewusstsein#1-3` (Zungenbiss, Urin, Zeugen) | anfallszeichen, fremdanamnese | fin d'Aktuelle Beschwerden | 5 × 3 | « dabei » s'éloigne de la crise |
| `fach-psych-suizid#1` « Haben Sie sich selbst verletzt? » et `#2` « Haben Sie den Wunsch, sich zu verletzen? » | selbstverletzung, les deux | détachées, puis r2 retire `#2` | 10 | **sécurité** : la question du désir d'automutilation disparaît des 10 cas psy (le passé n'est pas l'intention) |

- **Correctif** : il faut une décision par relance. Trois voies :
  - (a) la relance est une **précision** : on retire son `followUpSucht` (K1) et elle reste sous sa mère ;
  - (b) le **chapitre du signe** est faux. C'est le cas, à mon avis, de `vorsorge_gyn` et `hormone`, qui vont en `frauenanamnese` (le repli I5 les fond ensuite dans la gynéco), et sans doute d'`impfung`, qui va en `vegetativ` ;
  - (c) la **granularité** est fausse : pour `selbstverletzung`, il faut un signe pour l'automutilation passée et un autre pour l'intention.
  - Les tests rouges suivent la décision : ou bien ils tombent, superseded, ou bien la déclaration change.
  - (b) touche `signesDefs.ts`, qui est dans mon périmètre. Je ne l'ai pas fait, parce que c'est un choix de lexique de K1, relu cliniquement.

### [MAJEUR] « Seit wann » disparaît des 6 cas rhumato
- **Où** : `probeSucht.ts:102`, `'fach-rheuma-verlauf': ['beginn']`.
- **Constat** : r2 donne `beginn` à la Fach (rang 1). Elle retire donc « Beginn — Seit wann haben Sie die Schmerzen? Kamen sie plötzlich oder schleichend? » (rang 2). Or la question Fach « Kamen die Beschwerden plötzlich und anfallsartig, oder … langsam über Wochen » ne demande pas la date de début.
- **Preuve** : `r2 retire akt-beginn ⇐ fach-rheuma-verlauf` dans 6 cas (fibromyalgie, gicht, rheumatoide-arthritis, polymyalgia, septische-arthritis, reaktive-arthritis).
- **Correctif** : déclarer le mode de début comme un signe distinct de la date (par exemple `beginn_art`), ou garder `verlauf`. Décision K1, relue cliniquement.

### [MAJEUR] La règle d'insertion pose « Ort » avant « Was führt Sie heute zu uns? »
- **Où** : `signesDefs.ts:100`. `motiv` est déclaré **après** les 11 dimensions, alors que `SIGNES` est « l'ordre de l'entretien » (§10.1).
- **Constat** : r3 insère `ort` « après la dernière question dont le premier signe le précède, à défaut en tête ». Aucune question ne précède `ort`, donc la banque arrive en tête, avant le motif. Annexe, gastroenteritis, lignes 7 et 8.
- **Correctif proposé** : `motiv` en tête de `DEFS`. C'est dans mon périmètre. `symptoms.test.ts:139` affirme aujourd'hui que les 11 premiers signes sont les dimensions et devra être adapté. À valider : cela change l'ordre du lexique de K0.

### [MINEUR] Égalité dans la règle d'insertion (r4a)
- Le contrat dit « dont le premier signe **précède** ». Prenons une relance qui partage le premier signe de sa mère : `fach-infekt-kontakt#1`, `[kontakt, essen_expo]`.
- En lecture stricte, elle est insérée **avant** sa mère. À rang égal, r2 lui donne `kontakt`, et « Hatten Sie Kontakt zu kranken Personen oder zu Tieren? » est retirée dans 11 cas.
- Le WIP lit « précède **ou égale** » : la relance se pose après sa mère, la mère garde `kontakt`, la relance passe en non-réduite. Pour r3, les deux lectures sont identiques, puisque aucune question n'a le signe absent en tête.
- **Proposition de contrat** : écrire « ≤ ».

### [MINEUR] Le test « CAP : la fièvre cherchée une seule fois, dans Aktuelle Beschwerden » est superseded
- `symptoms.test.ts:25`. Sous D4, la Fach l'emporte. Le contrat le dit en §11.4 : « Changement de comportement assumé ». Le test change, rien à trancher.

### [À ACTER] La sémantique du plancher `brut` après K3
- Le contrat (§10.6) dit que `brut` est mesuré **avant** montage. Main demande que `doublons`, `horsProfil` et `exigeAbsent` **baissent** (décision 8).
- Jusqu'à K2, la mesure tournait sur `playedTrame`, c'est-à-dire sur l'ancien montage. Mesurée sur la trame brute, sans `FACH_COVERS` ni `dedupeBySymptom`, elle **monterait**. Mesurée sur la trame jouée après `cohere`, elle baisse, et reste une dette réelle : les questions du cas muettes lues par le texte, et les non-réduites.
- Je propose de garder la mesure sur `playedTrame`, comme K0 à K2, et de l'écrire au contrat. À acter avant d'écrire le fixture.

## 3. Ce qui reste à faire après les décisions

- **Tests** :
  - `coherence.test.ts` : INV-81 à 88, 90 et 91, sur fixtures, plus gastroenteritis et fibromyalgie réels.
  - `coherence.fachCovers.test.ts` : il lit l'ancienne table dans `__snapshots__/fach-covers.txt`, gardé à cette fin.
  - Les mutations jouées à la main.
  - L'adaptation des 13 tests rouges :
    - gel de trame : régénéré, avec le diff par catégorie ;
    - INV-90 : passe à la forme K3 ;
    - Q-gyn et L0 : selon le § 2 ;
    - CAP : superseded ;
    - `adaptChapters` FB2-J4 : une question du cas gagnante est déplacée par r2, comme le faisait déjà `dedupeBySymptom` ;
    - `coherenceK1` : le pont urinaire disparaît, c'est la décision 3.
- **Scripts** :
  - Porte bloquante dans `checkCoherence.mjs` : 6 compteurs à 0, `casRetiresParR1 = 0`, `--case` affiche les écarts.
  - `quality.yml` sans `|| true`.
  - Fixture à la baisse.
  - Amendement r1 du contrat : `casRetiresParR1 = 0` ; une question du cas hors profil est gardée et comptée en anomalie, hors `horsProfil` après montage.
- **Nettoyage** : `SUCHT_MONTAGE` et `dedupeBySymptom` sont toujours là. Il faut les supprimer et faire lire `PROBE_SUCHT` à `phraseSymptoms`, puis vérifier l'effet sur `checkTrameSymptoms`.
- **Vérification à deux onglets** (médecin + simulant, headless).

**karpaltunnel** : `fach-ortho-schwellung` reste entière (`non-réduit`), comme K2 l'a demandé. Ses `parts` relèvent de K4.

**Décision 4** (fréquence des selles), effet vérifié dans le WIP : r3 ajoute `akt-ausscheid-haeufigkeit` à morbus-crohn, zoeliakie et chronische-pankreatitis, avec leurs réponses de K2.

## Annexe — les deux cas de la direction, cœur de la trame (Aktuelle Beschwerden, Fach, végétative)

Comparaison ligne à ligne avec la spec §3.3 (« une fois annotés ») :

| Affirmation de la spec | WIP K3 | Écart |
|---|---|---|
| gastro : `akt-ausscheid-schlucken` retiré (r1) | ✓ | |
| gastro : `fach-infekt-haut/neuro/gelenke` réduits ou retirés | gelenke retiré ; haut et neuro **non réduits** | pas de `parts` (K4) |
| gastro : Ort, Charakter, Intensität ajoutés (r3) | ✓ | Ort placé avant le motif (§ 2) |
| gastro : `stuhlfrequenz` présente | ✓ (plus effacée) | |
| gastro : « dort gegessen » déplacé après le voyage (r4b) | ✗ | `braucht` non déclaré (K4) |
| gastro : la relance alimentaire de `fach-infekt-kontakt` retirée (r2) | ✗ : détachée, puis non réduite | la question du cas doit déclarer `essen_expo` (K4) |
| fibro : « Welche Gelenke » et la relance Gicht/Nierensteine retirées (r1) | ✓ | |
| fibro : Ausstrahlung retirée (r1) | ✓ | |
| fibro : Auslöser, Früher, Fieber posés une fois | ✓ (Fach ; `veg-fieber` réduite au voyage) | |
| fibro : Ort, Verlauf, Steifigkeit, Entzündung posés une fois (la question du cas gagne) | ✗ | les questions du cas sont muettes (K4) |
| fibro : « Familie Rheuma » détachée vers `familie-sozial` | ✗ : retirée par r1 | `familie_rheuma` n'est pertinent que pour gelenk / arthritis (choix K2) |
| (nouveau) fibro : « Beginn — Seit wann » | ✗ : retirée | § 2 |

**case-gastroenteritis, avant K3** (montage gelé, `trame-actuelle.txt`) :
- **Aktuelle Beschwerden** : motiv · beginn · ausscheid-was · ausscheid-aussehen · ausscheid-schlucken · verlauf · ausloeser · einfluss · frueher · begleit · CAS « dort gegessen » · CAS « Wie sieht Ihr Stuhl aus » · CAS Fieber/Schüttelfrost/Nachtschweiß.
- **Fach Infektio** : haut · gelenke · neuro · reise · kontakt (↳ relance alimentaire) · impfung.
- **Végétative** : schuettelfrost (réduite à schwitzen) · uebelkeit · gewicht · appetit · schlaf · CAS Trinken/Urin.

**case-gastroenteritis, WIP K3** :
- **Aktuelle Beschwerden** : **ort (r3)** · motiv · beginn · **charakter (r3)** · **intensitaet (r3)** · ausscheid-was · **ausscheid-haeufigkeit** · **ausscheid-harn-haeufigkeit** · verlauf · ausloeser · einfluss · frueher · begleit · CAS ×3. `ausscheid-aussehen` est retiré (r2, `ausscheid-was`), `schlucken` aussi (r1).
- **Fach Infektio** : haut (non réduite) · neuro (non réduite) · reise · kontakt · **la relance de kontakt, détachée** · impfung. `gelenke` est retiré (r1).
- **Végétative** : schwitzen · uebelkeit · gewicht · appetit · schlaf · CAS.

**case-fibromyalgie, avant K3** :
- **Aktuelle Beschwerden** : motiv · ort · beginn · charakter · intensitaet · ausstrahlung · verlauf · ausloeser · einfluss · frueher · begleit · 6 CAS.
- **Fach Rhumato** : gelenke · morgensteifigkeit · entzuendung · verlauf · ausloeser · haut · systemisch · vorgeschichte (↳ Gicht/Nierensteine ↳ Familie).
- **Végétative** : fieber (5 relances) · schuettelfrost · uebelkeit · ausscheidung · gewicht · appetit · CAS Schlaf.

**case-fibromyalgie, WIP K3** :
- **Aktuelle Beschwerden** : motiv · ort · charakter · intensitaet · verlauf · einfluss · begleit · 6 CAS. Sont retirés : beginn, ausstrahlung, ausloeser, frueher.
- **Fach Rhumato** : morgensteifigkeit · entzuendung · verlauf · ausloeser · haut · systemisch · vorgeschichte · **« Sind Ihre Impfungen… » (détachée)** · **« Gehen Sie regelmäßig zum Frauenarzt? » (détachée)**. `gelenke` et les deux relances sont retirés (r1).
- **Végétative** : fieber réduite à « Waren Sie kürzlich im Ausland? » · schuettelfrost · uebelkeit · ausscheidung réduite à l'urine · gewicht · appetit · CAS Schlaf.

## Vérifications (par code de sortie, sommet `d07a5878`)

- `npx tsc -b --noEmit` : **0**.
- `npx vitest run --dir src/data --maxWorkers=2` : **1**. 13 tests rouges, attendus et listés au § 3.
- `fachRaw.test.ts` : **0**. La sortie de `fachChapterRaw` est identique avant et après le branchement (I3).
- Mesure du WIP, scripts jetables du scratchpad (montage réel, esbuild) : chiffres du § 0. Simulation de l'option A : § 1.

## Non vérifié

- Je n'ai lancé ni le vitest complet `--dir src`, ni les `check*.mjs`, ni `checkBudgetFloor`, ni `merge-tree`, ni le navigateur : j'arrête au blocage, avant la porte.
- La justesse clinique des propositions du § 2 (chapitres d'`impfung`, `vorsorge_gyn`, `hormone` ; granularité de `selbstverletzung` et de `beginn`) est mon jugement. Elle n'a pas été relue par un clinicien.
- Les 366 détachements n'ont pas tous été relus un à un. Le § 2 ne cite que les familles les plus fréquentes ou les plus graves. La table complète se régénère avec les `ecarts` de `playedTrame`.
