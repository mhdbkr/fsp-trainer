# Lot « Petits contenus » (série 3) : 1d, 3c, 3d, 3e

Branche `feat/s3-petits-contenus`. Elle est rebasée sur `origin/main` 66c7235b avant le premier push ; elle partait de f6cbe864.

## 1d. Cohésion : diagnostics différentiels non écartés

### Le détecteur (`scripts/checkCaseCohesion.mjs`, en TDD)

Le test `scripts/checkCaseCohesion.test.mjs` a été écrit d'abord. Il était rouge à l'import, faute des exports `RAISON`, `verifierListe` et `verdict`. Il passe maintenant : 7 tests sur 7.

| Règle | Avant | Après |
|---|---|---|
| Acronyme à minuscule initiale | `\b[A-Z]{2,}` ne voyait pas « pAVK » : aucune limite de mot entre p et A | Une minuscule initiale est permise (`pAVK`, `dsDNA`), avec un garde Unicode |
| Négatif qui ne nomme pas la DD | Accepté s'il porte « (gegen X) » nommant la DD, puisque l'annotation fait partie de la chaîne | Règle inchangée, désormais testée. Le contenu porte l'annotation (47 DD) |
| Réplique niée (`antworten`) | — | **Écartée, preuves à l'appui.** Sur les 173 DD, la règle « terme de la DD nié dans une réplique » n'attrapait que des faux (4 sur 4) : « Gegen Typhus nicht [geimpft] », « Leukämie gibt es in der Familie nicht », « gegen Medikamente nicht allergisch ». Un test fige ce refus. |
| Entrée non concurrente | `keine konkurrierende Diagnose`, `als Komplikation` | S'y ajoutent `keine Alternativdiagnose` et `keine Differenzialdiagnose im engeren Sinn`, déjà présents dans le contenu : myocardite de la grippe, mastocytose de l'anaphylaxie |
| DD sans négatif possible | — | Liste motivée `ddSansNegatif` dans `fixtures/case-cohesion-budget.json` : 110 entrées, une raison chacune, au format `catégorie — justification` (examen, imagerie, biologie, histologie, endoscopie, exclusion, tableau, comorbidité). La porte refuse une raison sans catégorie, un cas ou une DD inconnus, et une entrée devenue inutile parce qu'un négatif neutralise déjà la DD. Ce garde a servi une fois : voir CML ci-dessous. |
| Porte | `|| true` dans `quality.yml`, exit toujours 0 | Exit 1 si une catégorie dépasse son plafond ou si la liste est invalide. Les plafonds et l'effectif de la liste sont protégés par `checkBudgetFloor` (nouvelle entrée `case-cohesion-budget.json`). La CI lance aussi le test. |

### Avant et après, par catégorie

| Catégorie | origin/main | Détecteur corrigé, contenu inchangé | Final (budget) |
|---|---|---|---|
| DD non neutralisée | 173 | 58 (−110 liste motivée, −3 pAVK, −2 non concurrentes) | **0** |
| Arztbrief, antécédents | 44 | 44 | 44 |
| Arztbrief, médicaments | 19 | 19 | 19 |
| Arztbrief, allergies | 5 | 5 | 5 |
| Réponse de sonde trop courte | 16 | 16 | 16 |
| Piège sans réponse du jury | 6 | 6 | 6 |
| **Total** | **263** | 148 | **90** |

Répartition des 173 DD, classées une à une :
- 110 sans négatif possible (64 %), placées dans la liste motivée ;
- 47 faux positifs résolus par une annotation « (gegen X) » sur un négatif existant (27 %) ;
- 5 faux positifs du détecteur (3 %) ;
- 11 manques réels (6 %).

L'échantillon de 20 annonçait 15 % de manques réels, environ 25. Je n'en ai confirmé que 11 sans inventer de fait. Cinq candidats sont passés dans la liste, faute d'appui dans les répliques : fissure anale, polyneuropathie (fibromyalgie), amyotrophie névralgique, lupus (rhumatisme articulaire aigu), leptospirose. Pour cette dernière, les myalgies diffuses rendent faux un « keine Wadenschmerzen ».

### Les 11 négatifs ajoutés

Chacun est compatible avec les répliques et avec le texte `unterscheidung` du cas.

| Cas | DD | Négatif | Appui |
|---|---|---|---|
| pankreatitis | Mechanischer Ileus | keine Voroperationen am Bauch (gegen mechanischen Ileus durch Briden) | `vor-op` : « operiert wurde ich noch nie » |
| magenkarzinom | Kardiale Ursache (Hinterwandinfarkt) | keine Zunahme des Druckgefühls bei körperlicher Belastung (gegen Hinterwandinfarkt) | DD : « ohne Belastungsbezug » ; `schmerz.verstaerker` : après le repas |
| appendizitis | Gedeckt perforiertes Ulcus duodeni | kein Schmerzbeginn in der Magengrube, kein schlagartiger Vernichtungsschmerz (gegen …) | `akt-beginn` : « anfangs nicht so stark » ; Leitsymptom au rectum droit, sans migration |
| synkope | Karotissinussyndrom | ajouté au négatif des déclencheurs : keine Kopfdrehung, kein enger Kragen (… sowie Karotissinussyndrom) | `akt-ausloeser` : effort dans l'escalier ; DD : « anamnestisch nicht gegeben » |
| pneumothorax | Perikarditis | keine Besserung im Sitzen oder beim Vornüberbeugen, keine Verschlechterung im Liegen (gegen Perikarditis) | DD : « Körperhaltung ohne Einfluss » ; `linderer` : Schonatmung, Ruhe |
| malaria | HIV-Primoinfektion | kein ungeschützter Geschlechtsverkehr, kein neuer Partner (gegen HIV-Primoinfektion) | Exemple du brief ; DD : « die Patientin verneint » |
| akute-leukaemie | Medikamentös-toxische Knochenmarkschädigung | außer Clarithromycin und Ibuprofen keine neuen Medikamente, kein Metamizol, keine Thyreostatika (gegen …) | `med-regelmaessig` et `med-otc` ; L-Thyroxin, pas de thyréostatique |
| endometriose | Uterus myomatosus | keine Myome bekannt, Ultraschall vor einem Jahr unauffällig (gegen Uterus myomatosus) | `akt-frueher` et `fach-gyn-vorsorge` |
| ptbs | Depressive Episode | kein Morgentief, kein morgendliches Früherwachen (gegen eine depressive Episode als Hauptdiagnose) | `fach-psych-tagesverlauf` : « Ein richtiges Morgentief habe ich nicht » |
| obstipation | Beckenbodendyssynergie | keine manuelle Nachhilfe beim Stuhlgang nötig (gegen …) | DD : « keine manuelle Hilfe » ; aucune réplique contraire |
| sinusitis | Riesenzellarteriitis | kein Schläfenschmerz, kein Kauschmerz der Kaumuskulatur (nur Aufbissschmerz der Zähne), keine Schulter- oder Beckengürtelschmerzen (gegen …) | DD. **Nuance par rapport au brief** : le patient a un « Aufbissschmerz beim Kauen » d'origine dentaire, donc un « kein Kauschmerz » nu aurait contredit la fiche. |

Exemples du brief non repris tels quels :
- **abszess / Atherom** : le négatif existait déjà (« keine seit Monaten bestehende … Schwellung »). Je l'ai annoté plutôt que de le dupliquer.
- **malaria / HIV** et **sinusitis / RZA** : ajoutés, voir le tableau.

### Les 47 annotations « (gegen X) »

Elles portent sur 44 négatifs existants, dont 3 servent deux DD. Le principe : un négatif déjà présent écarte la DD, il ne la nommait pas.

Exemples :
- « nie geraucht » contre la COPD (asthma) ;
- « kein Kontakt zu Tuberkulose » contre la Darmtuberkulose (crohn) ;
- « keine Unterzuckerungen » contre l'Hypoglykämie (tia) ;
- « (gegen Blasenkarzinom) » devient « Harnblasenkarzinom », « Lupus » devient « Lupusnephritis », « Tumor und Metastase » devient « Wirbelmetastase und Plasmozytom » ;
- « kein Blut im Stuhl » contre l'Amöbenruhr et un kolorektales Karzinom (gastroenteritis).

**CML** : « (gegen eine akute myeloische Leukämie) » neutralisait aussi, par le seul mot « Leukämie », la DD « chronische myelomonozytäre Leukämie », listée comme biologique. Le garde de la liste a rougi. L'annotation est devenue « (gegen eine Blastenkrise oder AML) ».

### Les autres sous-totaux, listés et non corrigés

Ce sont surtout des faux positifs du détecteur. Ils restent gelés au budget.
- **Arztbrief (68)** : négations déjà rendues (« keine Blutverdünner » ↔ « Antikoagulanzien … nicht »), synonymes (« Antihypertensivum », « Refluxsymptomatik », « Pollinosis »), IMC ou statut vaccinal (qui ne relèvent pas de cette section), éléments présents ailleurs dans l'Arztbrief (« ELSEWHERE » : 52). Les seuls oublis réels sont mineurs : tisanes (pertussis, reaktive-arthritis). Aucune correction ciblée ne vaut une réécriture de Muster.
- **Réponses de sonde courtes (16)** : toutes valent `nox-drogen` = « Nein, nie. ». C'est une réponse juste ; le seuil de 12 caractères est un faux positif.
- **Pièges sans réponse du jury (6)** : quatre conseils de calcul d'IMC ou de paquets-années, un comportement (« Empathie beim Alkoholthema »), une consigne d'anamnèse (pavk). Aucun n'appelle une réponse du jury.

### Effet de bord traité

L'ajout d'« Oberbauch » dans un négatif d'appendizitis faisait passer la fréquence documentaire de « oberb » de 26/130 à 27/130, donc au-dessus de 0,2. Une question du cas de leucémie perdait alors son mot distinctif, et `checkCaseQuestionAnswers` passait de 60 à 61, au-dessus du plancher. Le négatif dit désormais « Magengrube ».

## 3c. Nephrotisches Syndrom

« membranöse Glomerulonephritis (heute: membranöse Nephropathie) » à la première mention seulement :
- **fw-nephrotisches-syndrom** : dans l'`aetiologie`, fondue dans la parenthèse existante (« (heute: membranöse Nephropathie; häufigste primäre Ursache, …) ») ;
- **case-nephrotisches-syndrom** : dans la `verdachtsdiagnose`, au datif : « bei membranöser Glomerulonephritis (heute: membranöse Nephropathie) ».

Les autres occurrences ne bougent pas, Muster compris. `npm run content:link` lie désormais `fb-nephropathie` au cas. C'est le seul lien changé, et `checkCaseTermLinks` l'exigeait.

## 3d. Epilepsie

**Choix** : les myoclonies datent de la scolarité et sont devenues plus fréquentes l'an dernier. L'âge de la première crise tonico-clonique ne change pas.

**Pourquoi** :
- L'EMJ débute entre 12 et 18 ans au pic (de 8 à 36 ans aux extrêmes). Les myoclonies matinales précèdent la première crise généralisée de plusieurs années, 3,3 ans en moyenne, et passent souvent pour de la maladresse ou de la fatigue.
- Le cas porte déjà ce motif : « als Wackeligkeit vom Wenigschlafen abgetan ».
- Une première crise à 27 ans, provoquée par le manque de sommeil et l'alcool chez un patient aux myoclonies méconnues depuis l'adolescence, est le tableau typique d'un diagnostic tardif.
- Changer l'âge de la première crise aurait détruit le pivot du cas (« erster beobachteter Anfall ») et ses répliques : « Umgekippt bin ich noch nie », « heute war zum ersten Mal ».
- `personalia.age` (27) et la date de naissance restent intacts, et `checkGeburtsdatum` reste vert.

**Les 9 mentions** :
- **Cas (7)** : antécédents, réponse écrite de la question « Zucken Ihnen morgens … » (« seit der Schulzeit, da war es selten; im letzten Jahr bestimmt zehnmal »), VD, DD « provozierter Anfall », Diagnostik, Therapie, réponse attendue du jury.
- **Muster (2)** : Arztbrief et Fallvorstellung.
- Les deux « ein Jahr Anfallsfreiheit » parlent du permis de conduire. Ils restent.

**Le reste du cas est cohérent** :
- crise fébrile à 2 ans ;
- cousin épileptique depuis l'adolescence ;
- manque de sommeil et alcool comme déclencheurs ;
- valproate chez un **homme**, avec la mise en garde EMA 2024 déjà présente.

**Sources** :
- Hirsch E. et al., *ILAE definition of the Idiopathic Generalized Epilepsy Syndromes: Position statement by the ILAE Task Force on Nosology and Definitions*, Epilepsia 2022;63:1475–1499 (EMJ : début à l'adolescence, myoclonies matinales, crises généralisées plus tardives) ;
- [IntechOpen, chapitre EMJ](https://www.intechopen.com/chapters/46260) (début de 8 à 36 ans, pic de 12 à 18 ans ; myoclonies avant la première crise de 3,3 ans en moyenne) ;
- [ILAE Lectures 2015, p. 418](https://icnapedia.org/elibrary/ilae2015/files/basic-html/page418.html) (myoclonies discrètes prises pour de la maladresse ; les rechercher activement).

## 3e. Petits suivis

- **prostatakarzinom** : « geboren am 12. März 1953 » (73 ans au 7 octobre 2026). `checkGeburtsdatum` donne exit 0.
- **fw-antikoagulation**, Merke : « Marcumar: Ziel-INR meist 2–3, Antidot Vitamin K und PPSB, Bridging nur bei hohem Thromboembolierisiko. DOAK: feste Dosis nach Nierenfunktion, kein Bridging, nie bei mechanischer Herzklappe. ASS ist kein Antikoagulans. Bei Blutung: absetzen, Antidot geben, bei Magen-Darm-Blutung endoskopieren. »
  - Vérification clinique : « kein Bridging » ne vaut que pour les DOAK. Pour la Marcumar, le bridging se fait seulement en cas de haut risque (valve mécanique, thrombose récente), d'où l'ajout.
  - « meist 2–3 » : la valve mitrale mécanique vise 2,5–3,5.
  - « Endoskopie » ne vaut que pour une hémorragie digestive, d'où la précision.
- **fw-tia**, Merke : « Eine TIA ist ein Warnsignal, keine Entwarnung: Die Symptome sind weg, die Gefahr bleibt. Das Schlaganfallrisiko ist in den ersten 48 Stunden am höchsten, deshalb sofort stationär abklären. … Die Sekundärprophylaxe folgt der Ursache: bei Vorhofflimmern orale Antikoagulation, bei Arteriosklerose Plättchenhemmer und Statin, bei symptomatischer Karotisstenose Operation innerhalb von zwei Wochen. » Plus de « = », de « → » ni de « SOFORT ».

## Codes de sortie

Mesurés sur la tête rebasée ; `origin/main` n'apportait que des fichiers hors périmètre.

| Commande | Exit |
|---|---|
| `npx tsc -b` | 0 |
| `npm test` | 0 (193 fichiers, 2024 tests). Un premier passage, sous une charge de 80 à 95, a donné 3 échecs par délai dépassé (profil.test, DrillJournal.test) ; ces fichiers passent isolés, puis le passage complet passe. |
| `npm run test:c6` | 0 (17 fichiers, 212 tests) |
| `npm run build` | 0 |
| `npm run content:link` | 0 |
| 25 `scripts/check*.mjs` de la CI, dont `checkCaseCohesion` (bloquant) et `checkGeburtsdatum` | 0 |
| `checkProbeOverlap` (informatif) | 1, sortie identique à `origin/main` |
| `checkQuestionOrder`, `checkTrameSymptoms`, `checkCoherence` | sortie identique à `origin/main` |
| `node --test` (226 tests, sans `checkProbeCoverage.test`) | 0 |
| `node --test scripts/checkProbeCoverage.test.mjs`, lancé seul | 0 |
| `node scripts/checkCoherence.mjs --case <id>` sur les 46 cas touchés | 0 × 46 |
| `node scripts/checkBudgetFloor.mjs origin/main` | 0 |
| `git merge-tree` contre `origin/main` | propre |
| `git merge-tree` contre `origin/feat/s3-q9-und` | propre. Sur l'arbre fusionné : cohésion, réponses des questions (59/59), trame, cohérence, atomicité, liens, sondes, Geburtsdatum, floor et leurs tests, tous à 0. |

Les branches fw-plancher, banque et ui-petits ne sont pas poussées : merge-tree n'a pas pu tourner contre elles.

## Points à trancher

1. **Règle « répliques »** : je la refuse, preuves à l'appui (4 faux sur 4). Il faut confirmer que l'annotation explicite est la seule voie.
2. **11 manques réels** contre environ 25 attendus : je n'ai pas complété la liste par des négatifs inventés.
3. **Arztbrief, sondes courtes, pièges** (90 constats) : ce sont des faux positifs du détecteur, gelés au budget. Affiner le détecteur (négation, document entier, réponse brève légitime) relève d'un lot à part.
4. `extractCohesionGaps.mjs`, l'outil d'extraction, garde l'ancienne tokenisation et n'est pas en CI.

## Passe fixeur des revues (clinique et langue)

### Fusion de `origin/main`

`origin/main` a été fusionnée dans la branche par un merge, sans rebase ni force. Elle apportait #100, #101 et #102 (Q9).
- La fusion s'est faite sans conflit.
- Aucun `--bless` n'a été nécessaire : aucun budget ne remonte.
- `checkCaseQuestionAnswers` donne 59 candidats pour un plancher de 59.

### Revue clinique

**P1**
- **P1-1, typhus.** L'éruption ne sert plus d'argument contre la dengue, puisque le cas a des roséoles.
  - L'annotation devient « (gegen Rickettsiose und Hepatitis) », selon l'arbitrage.
  - Nouveau négatif : « kein schlagartiger Fieberbeginn, das Fieber stieg von Tag zu Tag (gegen Denguefieber) ». Il s'appuie sur le Leitsymptom.
- **P1-2, perniziöse.**
  - Le régime n'écarte plus qu'une carence en B12 : « (gegen einen ernährungsbedingten Vitamin-B12-Mangel) ».
  - La carence en folates passe sur le négatif alcool : « (gegen toxische Ursachen und einen alkoholbedingten Folsäuremangel) ».
- **P1-3, karzinoid.** L'annotation revient à « — gegen Nahrungsmittelintoleranzen ». La Zöliakie entre dans `ddSansNegatif` en catégorie `biologie`.
- **P1-4 et P2-1, Merke de fw-antikoagulation**, fusionnés en un seul texte : « … perioperatives Bridging nur bei hohem Thromboembolierisiko … Bei schwerer Blutung: absetzen, Antidot geben, bei Magen-Darm-Blutung endoskopieren. »

**P2**
- **P2-2, Merke fw-tia** : « bei symptomatischer hochgradiger Karotisstenose ».
- **P2-3, ptbs**, selon l'arbitrage : « kein Morgentief, kein Früherwachen (gegen ein somatisches Syndrom; die depressive Symptomatik bleibt als Komorbidität zu werten) ».
- **P2-4, nephrotisches-syndrom** : « (gegen Linksherz- und Globalinsuffizienz) ».
- **P2-5, akute-leukaemie** : l'annotation est gardée sous la forme de la revue langue (point 2). La DD se tranche bien au status ganglionnaire ; le négatif dit lui-même qu'il est faible.
- **P2-6, karzinoid** : ajout de « kein Knoten am Hals getastet ». La réplique `fach-onko-knoten` l'appuie (« Nicht am Hals »). La mention « familiäres » disparaît, puisque l'absence de nodule couvre aussi la forme sporadique.
- **P2-7, anaphylaxie** : ajout de « Käse » au négatif alimentaire. L'Arztbrief l'appuie : « vorher nichts gegessen ».
- **P2-8, épilepsie** : « seit der Jugend » dans les 9 mentions (7 dans le cas, 2 dans le Muster), avec les formes de la revue langue (points 3 à 6).
- **P2-9, obstipation** : le négatif est aligné sur la réplique : « beim Pressen etwas schmerzhaft, sonst keine Schmerzen beim Stuhlgang … ». La DD « Hämorrhoidalblutung / Analfissur », qui disait « kein Schmerz beim Stuhlgang », est harmonisée en « beim Pressen nur leicht schmerzhaft, kein Brennen oder Stechen ».

**Échantillon `ddSansNegatif`**
- **kolorektales-ca, « Analfissur ».** La sonde de la trame `akt-veraend-blutung` (« Tut es weh, juckt es, oder blutet es? ») pose déjà la question. La réplique devient « Wehtun tut es eigentlich nicht, auch nicht beim Stuhlgang, nur das leichte Ziehen … ». Le négatif « keine Schmerzen beim Stuhlgang (gegen Analfissur) » est ajouté et l'entrée est retirée de la liste.
- **metabolisches-syndrom, « Hypogonadismus ».** Aucune sonde du cas ne pose la question : la Fach du cas est l'endocrinologie, et seule la sonde urologique `fach-uro-funktion` demande l'érection. L'entrée reste dans la liste. **Manque de contenu, lot à part.**
- **delir, « Harnverhalt und Obstipation »** : passe en catégorie `comorbidité`.

### Revue langue

- **Important (struma)** : « (gegen ein Lymphom oder eine lymphogene Metastasierung) ». Une conséquence : la DD « Zervikale Lymphknotenschwellung » n'est plus nommée. Elle entre dans `ddSansNegatif` en catégorie `examen`, puisque la mobilité à la déglutition et la palpation tranchent.
- **Mineurs**
  - 2 : leucémie, voir plus haut.
  - 3 à 6 : épilepsie, avec « seit der Jugend ».
  - 7 : ptbs, couvert par l'arbitrage.
  - 8 : « keine Kauclaudicatio », dans le négatif et dans la DD de sinusitis.
  - 9 : « keine manuelle Unterstützung der Stuhlentleerung nötig ».
  - 10 : « außer ».
  - 11 : perniziöse, couvert par l'arbitrage.
  - 12 : listes coordonnées par « und » (chronische-pankreatitis, adnexitis, glomerulonephritis). Typhus est couvert par l'arbitrage.

### Effectifs

| Mesure | Valeur |
|---|---|
| DD non neutralisées | 0 |
| `ddSansNegatif` | 111 (110 + Zöliakie + Lymphknotenschwellung − Analfissur) |
| Autres catégories | inchangées : 44 / 19 / 5 / 16 / 6 |

### Codes de sortie de la passe

| Commande | Exit |
|---|---|
| `npx tsc -b` | 0 |
| `npm test` (2024 tests) | 0 |
| `npm run test:c6` (212 tests) | 0 |
| `npm run build` | 0 |
| `npm run content:link` | 0, sans diff |
| 27 `check*.mjs` de la CI, dont `checkCaseCohesion` (bloquant), `checkGeburtsdatum` et `checkBudgetFloor origin/main` | 0 |
| `checkProbeOverlap` (informatif) | 1, sortie identique à `origin/main` |
| `node --test` (228 tests) | 0 |
| `checkProbeCoverage.test.mjs`, lancé seul | 0 |
| `checkCoherence --case` sur les 18 cas retouchés | 0 × 18 |
| `git merge-tree` contre `origin/main` | propre |
| `git merge-tree` contre `origin/feat/s3-fw-plancher-r` | 1 conflit, dans `app/scripts/fixtures/atomicity-budget.json` |

Le conflit sur `atomicity-budget.json` existe **déjà entre `origin/main` et fw-plancher-r**. Cette branche ne touche pas ce fichier, et `seedCases` et `seedFachwissen` fusionnent sans conflit.
