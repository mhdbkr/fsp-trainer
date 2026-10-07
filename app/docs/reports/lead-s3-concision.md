# Lot Concision — fw-multiple-sklerose, fw-reizdarm, fw-bandscheibenvorfall

Branche `feat/s3-concision`, partie de `origin/main` `47819d1d`. Modèle direct : `lead-s3-lc4.md` (volet B, §§ 9 à 11).
`seedCases.ts` n'est pas touché.

## 0. Hypothèses posées avant d'agir

1. **Même règle que Lc4 (B)** : les sections restent, le texte est réécrit champ par champ ; seuls les trois blocs
   `seedFachwissen` changent. Le type n'est pas modifié.
2. **Leçon de la revue direction Lc4** : une question est retirée si elle redit une section ; elle est remplacée par une
   question de raisonnement sur le cas, pas supprimée sèchement. Chaque Fachwissen garde au moins 6 questions, dont une
   explication en mots simples que reconnaît la regex `EXPLICATION` de `checkFachwissenFloor`.
3. **Libellés de thérapie inchangés** (`checkTherapieLabels` vert sans toucher `seedCases.ts`).
4. **Les décisions cliniques déjà arbitrées dans Lc4** sont reprises telles quelles (pas d'iFOBT au Reizdarm, Erreger avec
   Lamblien, H2-Atemtest conditionnel, Methylprednisolon 500–1000 mg, cortisone décidée après l'IRM).

## 1. Mesure dans le DOM de l'app, avant / après

**Méthode.** `vite` sur le port 5389, `VITE_AUTH_MODE=public`, URL Supabase factice (`http://127.0.0.1:9`) ;
`functions/v1/content` intercepté et servi avec les items construits comme dans `publishContent.mjs` ; `playwright-core`
headless, viewport 390 × 844, timeout de 20 s par étape, script borné à 10 min, attente du `h1` portant la `pathology`.
Écrans = hauteur défilable / 844, au repos puis tous les `<details>` ouverts. Redites = `innerText` de `<main>` tout
ouvert, découpé en lignes puis en phrases ; jetons de 4 lettres et plus hors mots-outils ; paire si recouvrement ≥ 70 % du
plus court, segments d'au moins 4 jetons. Débordement = tout élément de `<main>` dont le bord droit dépasse la largeur
du viewport.

| Fachwissen | Écrans avant (repos / ouvert) | Après | Redites avant (direction / moi) | Après | Questions | Débordement |
|---|---|---|---|---|---|---|
| fw-multiple-sklerose | 16,9 / 19,8 | **9,3 / 11,0** | 16 / 19 | **1** | 14 → 8 | 0 → 0 |
| fw-reizdarm | 17,7 / 17,7 | **10,3 / 10,3** | 5 / 5 | **0** | 12 → 7 | 0 → 0 |
| fw-bandscheibenvorfall | 14,7 / 14,7 | **9,0 / 9,0** | 7 / 11 | **0** | 8 → 7 | 1,7 px → **0** |

La redite restante de la SEP rapproche l'explication au patient (« das Kribbeln, die Schwäche im Bein ») de la carte
« Cas liés » : ce n'est pas du texte du Fachwissen. Ma liste de mots-outils diffère de celle de la direction, d'où les
deux comptes « avant ».

## 2. Ce qui a été coupé, et pourquoi

**Partout.** Les listes exhaustives (facteurs de risque doublés dans l'étiologie, DD sans lien avec le motif), les
chiffres sans usage à l'oral, les phrases qui redisaient une autre section (merksatz ↔ Prüfungsfallen ↔ questions),
les mentions de protocoles (« in den Protokollen wiederkehrend … »).

**fw-multiple-sklerose**
- Étiologie et facteurs de risque : HLA-DRB1*15:01, microbiome, gradient nord-sud ; la liste EBV, vitamine D, tabac
  n'apparaît qu'une fois (facteurs de risque).
- Klinik : la Charcot-Trias, la Marcus-Gunn-Pupille (reprise dans la question Optikusneuritis).
- Klassifikation : l'EDSS (chiffres 4,0, 6,0, 7,0) ; McDonald réduit à la règle utile.
- Diagnostik : la liste de 12 gestes d'examen, l'OCT, la MRZ-Reaktion, l'IgG-Index, l'urodynamique.
- Thérapie : la dose « 2000 mg/Tag » d'escalade (non retrouvée dans la S2k 2023 consultée) ; « Ocrelizumab einzige
  Option PPMS » ; les listes d'antispastiques et d'antalgiques réduites aux classiques.
- Prognose : la liste des facteurs défavorables en double du « günstig ».
- Prüfungsfallen 10 → 4 : celles qui redisaient la Klinik ou une question.

**fw-reizdarm**
- Définition : la prévalence 10–15 %.
- Étiologie : « leaky gut », la phrase « nicht psychosomatisch » (portée par la question d'examen).
- Klinik : l'échelle de Bristol en double (elle reste dans les sous-types).
- Diagnostik 17 → 8 : l'iFOBT (contredit l'arbitrage Lc4 P1-2), le H2-Atemtest systématique, la liste des cinq gestes
  d'examen abdominal.
- DD 12 → 9 : Divertikelkrankheit, funktionelle Dyspepsie, Pankreasinsuffizienz ; « Hyperthyreose » devient
  « Schilddrüsenfunktionsstörung » (les deux sens, comme dans la fiche).
- Thérapie : Simeticon (pas de recommandation dans la S3 2021), Rifaximin recadré.
- Prognose : « un tiers / un tiers / un tiers ».
- Prüfungsfallen 10 → 4.

**fw-bandscheibenvorfall**
- Définition et étiologie : la morphologie en double (elle reste dans la Klassifikation), « degenerative
  Bandscheibendegeneration ».
- Klinik : L5 et S1 en double de la Segmentzuordnung, le « Zufallsbefund » (devenu Prüfungsfalle).
- Klassifikation : les Kraftgrade passent dans une question d'examen.
- Thérapie : « NSAR stets mit PPI » devient « bei Magen-Darm-Risiko mit PPI » (DGN 2018) ; Paracetamol retiré.
- Prüfungsfallen 7 → 3 : celles qui redisaient la thérapie, la DD ou la Segmentzuordnung.

**Gardé** dans les trois : définition, classification utile (McDonald 2017, Verlaufsformen, Schub ; Rom IV, sous-types,
définition S3 ; morphologie, Segment- und Dermatomzuordnung), clinique avec formes atypiques, Red Flags, Diagnostik par
étape, DD avec le critère qui tranche, thérapie sous les mêmes libellés, pièges.

## 3. Questions d'examen

| Fachwissen | Gardées (reformulées) | Ajoutées | Retirées, car elles redisaient une section |
|---|---|---|---|
| multiple-sklerose | VD (alignée sur la fiche : schubförmig, spinale Raumforderung à exclure), Parese/Plegie et Hypästhesie/Parästhesie fusionnées, Optikusneuritis, Pille, Aufnahme | « Warum punktieren Sie, wenn das MRT schon typisch ist? », « Bekommt die Patientin sofort eine Kortison-Stoßtherapie? », explication en mots simples | Verlaufsformen, Schub, MRT, Diagnosesicherung, Therapie, Uhthoff/Lhermitte, Prognose |
| reizdarm | VD et Ausschlussdiagnose, psychosomatisch, Zöliakie/Laktose, 6 kg, Cannabis | « Warum untersuchen Sie diese Patientin auch gynäkologisch? », explication en mots simples | Rom IV, CED, Labor, iFOBT, Therapie, Koloskopie-Aufklärung (l'Aufklärung liée la couvre) |
| bandscheibenvorfall | MRT statt Röntgen, Lasègue, Reichweite der Ausstrahlung | Kraftgrade, Bettruhe, Arbeitsunfall et BK 2108 (repris de la fiche), explication en mots simples | Notfall, konservative Therapie, DD, L5/S1, körperliche Untersuchung |

**Explication au patient.** Aucune des trois fiches n'avait de question reconnue par la regex (la SEP disait « Wie
klären Sie … auf? », le Reizdarm « Ein Patient fragt: … »). Les trois ont maintenant « Wie erklären Sie … in einfachen
Worten? », réponse entre guillemets sans Fachbegriff : Abwehrsystem, Schutzhülle der Nerven ; Darm überempfindlich,
Darm und Nerven ; Polster zwischen den Wirbeln, Nerv. `checkFachwissenFloor` passe de 47 à 45 Fachwissen sans
explication : l'ancienne question iFOBT du Reizdarm (« Erklären Sie bitte das Verfahren ») comptait déjà. Le budget est
abaissé à 45 dans `scripts/fixtures/fachwissen-floor-budget.json`.

## 4. Sources

- **S2k Multiple Sklerose 2023** (DGN, AWMF 030-050). Le PDF de l'AWMF répond 404 ; vérifié par des sources secondaires :
  - trois catégories d'efficacité : Kategorie 1 Interferon-beta, Glatirameracetat, Dimethylfumarat, Teriflunomid ;
    Kategorie 2 Cladribin, Fingolimod, Ozanimod ; Kategorie 3 Alemtuzumab, Ocrelizumab, Natalizumab ([KVB, Wirkstoffziel
    MS](https://www.kvb.de/fileadmin/kvb/Mitglieder/Verordnungen/Arzneimittel/Wirkstoffziele-DS/KVB-WSV-WZ29-Multiple-Sklerose-MS-Therapeutika.pdf),
    [PTA heute 2021](https://www.ptaheute.de/aktuelles/2021/05/28/einmal-ms-arzneimittel-immer-ms-arzneimittel)) ;
  - Methylprednisolon 500–1000 mg/j sur trois à cinq jours ([PMC4609048](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4609048/)),
    déjà retenu par la revue clinique Lc4 pour la fiche.
- **S3 Reizdarmsyndrom 2021** (DGVS/DGNM, AWMF 021-016). Le texte intégral (Thieme) est protégé contre les robots ;
  vérifié sur la synthèse [Ars Medici 19/2021](https://www.rosenfluh.ch/media/arsmedici/2021/19/Reizdarmsyndrom-S3-Leitlinie-ueberarbeitet-und-aktualisiert.pdf) :
  diagnostic positif après exclusion des DD, Low-FODMAP, probiotiques choisis, Pfefferminzöl, Prucaloprid et Linaclotid
  pour l'obstipation, Rifaximin pour le RDS réfractaire non obstipé, aucune recommandation pour Simeticon.
- **DGN S2k Lumbale Radikulopathie 2018** (AWMF 030/058), texte intégral lu ([miroir Uniklinikum Dresden](https://www.uniklinikum-dresden.de/de/das-klinikum/universitaetscentren/usc/termine-aktuelles/030058l_S2k_Lumbale_Radikulopathie_201804.pdf)) :
  - Bettruhe seulement en phase aiguë, mobilisation précoce ;
  - NSAR, « ggf. Muskelrelaxanzien », opioïdes de courte durée si douleur forte ;
  - PPI « bei gastrointestinalen Risiken » ;
  - IRM en cas de red flags ou sans réponse après six à huit semaines ;
  - OP absolue : Cauda, Blasen-Mastdarm-Lähmung, parésie progressive sous 3/5, avec des « Hinweise » pour une OP dans les
    48 heures ; OP relative : douleur malgré six à douze semaines de traitement conservateur ;
  - 90 % de reprise du travail après environ six semaines.
- **NVL Nicht-spezifischer Kreuzschmerz 2017** ([version patient, leitlinien.de](https://leitlinien.de/medien/kreuzschmerz/pdf/kreuzschmerz-2aufl-vers1-pll.pdf)) :
  activité plutôt que repos au lit, pas d'imagerie sans signe d'alerte.

## 5. Le débordement de 2 px de fw-bandscheibenvorfall

**Cause : le contenu.** En colonne unique (mobile), la grille `grid gap-4 lg:grid-cols-3` prend la largeur min-content de
son contenu. Deux jetons insécables l'élargissaient à 311,7 px pour 294 disponibles ; toutes les cartes finissaient à
391,7 px dans un viewport de 390 :
- `Husten-/Press-/Niesabhängigkeit` dans la Diagnostik : 226 px pour 208 ; « -/ » n'offre aucun point de coupure ;
- `Bandscheibendegeneration:` dans l'étiologie : 250 px pour 248.

Les deux formulations sont réécrites (« Husten- und Pressschmerz », « Degeneration der Bandscheibe »). Après : 0 élément
au-delà du viewport, au repos comme tout ouvert. Aucun composant n'a été modifié.

**Constat annexe, non corrigé (§ 7).** Le `h1` de la page coupe mal les longs composés allemands. « Lumbaler
Bandscheibenvorfall » dépasse sa boîte de 2 px, dans la marge de 16 px, donc sans effet visible. Mesuré sur les 134
titres à 390 px, 19 dépassent, dont « Alkoholentzugssyndrom » (+57 px), « Immunthrombozytopenie (ITP) » (+73) et
« Antikoagulation und Thrombozytenaggregationshemmung » (+250).

## 6. Vérifications (code de sortie)

| Commande | Sortie |
|---|---|
| `npx tsc -b` | 0 |
| `npm test -- --maxWorkers=2` | 0 (193 fichiers, 2 025 tests) |
| `npm run test:c6 -- --maxWorkers=2` | 0 (17 fichiers, 212 tests) |
| `node --test` sans checkProbeCoverage, puis checkProbeCoverage seul | 0 (219), 0 (4) |
| les 25 `check*` de la CI, dont `checkFachwissenFloor`, `checkTherapieLabels`, `checkFachwissenVisuals` ; `checkTermRegister --require-all` | 0 chacun, sauf `checkProbeOverlap` : 1 (`\|\| true` en CI ; il ne lit pas les Fachwissen) |
| `evalDoctopus --dry` | 0 |
| `checkBudgetFloor.mjs origin/main` | 0 |
| `npm run build` | 0 |
| `git merge-tree --write-tree origin/main HEAD` / `origin/feat/s3-vd HEAD` | 0 / 0 |
| `npm run content:link` | 0, `caseTermLinks.json` inchangé |

Cohésion : 263 liens manquants avant et après (le Fachwissen de `origin/main` remis en place le temps d'une mesure).
Les trois cas sont inchangés : SEP 1 lien manquant, Reizdarm 0, Bandscheibenvorfall 0.

## 7. Points à trancher

1. **`h1` des Fachwissen (composant).** 19 titres débordent à 390 px (§ 5). Il y a trois remèdes, chacun change l'allure
   des titres : `lang="de"` avec `hyphens-auto` (coupe aussi des titres qui tiennent aujourd'hui sur des espaces),
   `break-words` (coupe sans tiret), ou `text-2xl` sur mobile. C'est un choix de design, hors du périmètre de ce lot.
2. **Délai de l'OP élective du Bandscheibenvorfall.** Le Fachwissen dit « sechs bis zwölf Wochen » (DGN 2018), la fiche
   « etwa sechs Wochen ». Ce n'est pas une contradiction, mais c'est un écart ; la fiche n'est pas touchée, comme demandé.
3. **Muskelrelaxans.** Le Fachwissen garde « nur kurzfristig » (DGN Radikulopathie : « ggf. »), comme la fiche. La NVL
   déconseille les myorelaxants dans le Kreuzschmerz non spécifique, mais pas dans la radiculopathie.

## Non vérifié

- Les textes réécrits n'ont été relus ni par la revue clinique ni par la revue langue.
- La S2k MS 2023 et la S3 Reizdarm 2021 n'ont pas pu être lues en texte intégral (PDF AWMF en 404, Thieme protégé) :
  les points retenus viennent de sources secondaires citées au § 4.
- Je n'ai pas lancé `quality.yml` sur un runner.

## 8. Passe fixeur des revues (sommet revu `118bc5ff`)

Les remplacements ont été faits par script, chacun unique dans le bloc de son Fachwissen. Dans `seedCases.ts`, ils sont
limités aux lignes autorisées par le coordinateur (5160, 5164, 5177, 5226, 5227).

**Clinique : P1-1 à P1-3, P2-1 à P2-6**
- **P1-1, cas bandscheibenvorfall** : le délai de l'OP élective est aligné sur la DGN.
  - l. 5177 : « radikulärem Schmerz trotz sechs bis zwölf Wochen konservativer Therapie bei passendem MRT-Befund » ;
  - l. 5226 : « radikulärem Schmerz, der trotz sechs bis zwölf Wochen konservativer Therapie anhält ».
- **P1-2 et I7, réponse du Reizdarm** : à la première personne. Le seul signe d'alerte est le début après 50 ans ; Blut,
  Gewichtsverlust, Fieber et les plaintes nocturnes sont nommés absents. La question devient « Wie lautet Ihre
  Verdachtsdiagnose, und was schließen Sie vorher aus? ». Elle ne dit plus « Ausschlussdiagnose », et la réponse dit
  que le diagnostic est posé positivement selon Rom IV, après des exclusions ciblées.
- **P1-3 et I2, explication au patient du Reizdarm** : le texte de l'arbitrage, qui commence par « Die Untersuchungen
  haben gezeigt: … » et dit « gutartig ». La question devient « Wie erklären Sie der Patientin nach der Abklärung die
  Diagnose in einfachen Worten? ». Elle se place donc après la coloscopie, ce qui rend la réassurance cohérente. La
  prudence du cas (« sieht es nicht nach … aus ») reste dans la fiche, avant la coloscopie.
- **P2-1, cas** : PPI seulement en cas de risque digestif (l. 5160 et 5227).
- **P2-2** : le seuil « Kraftgrad unter 3 » est ajouté à la ligne Operativ.
- **P2-3** : la réponse et le cas (l. 5164) parlent de la présentation au Durchgangsarzt, au lieu d'« Unfallmeldung » et
  d'« Unfallanzeige ».
- **P2-4** : Ofatumumab est ajouté en catégorie 3, avec « primär progrediente MS: Ocrelizumab ».
- **P2-5** : Rifaximin est marqué « (off label) ».
- **P2-6** : le texte de l'arbitrage : « Stress kann sie auslösen und verstärken, ist aber nicht die alleinige Ursache,
  und die Beschwerden sind real. »

**Langue : I1 à I11 et tous les Mineurs**
- **I1** : « … sich Ihr Intimbereich taub anfühlt, kommen Sie bitte sofort in die Notaufnahme. »
- **I3** : « Den Bandscheibenvorfall zeigt das MRT … die meisten Vorfälle heilen konservativ aus. » Le Fallstrick
  « Nicht vorschnell operieren » est supprimé : c'était la solution de la revue contre la redite.
- **I4 à I6 et I8** : les textes de la revue sont repris (Janda à l'oral, VD de la SEP, Optikusneuritis,
  Zöliakie/Laktose avec Duodenalbiopsien).
- **I5** : la phrase « Das sind Herde an verschiedenen Orten zu verschiedenen Zeiten » redisait le merksatz (mesuré). Elle
  devient « Damit ist eine Dissemination in Ort und Zeit gegeben », la formulation de la fiche.
- **I9 et I10** : textes de la revue (« erst die Stufenbiopsie sichert die Diagnose », « Darmgerichtete Hypnosetherapie »).
- **I11, redites de la SEP** : le merksatz est gardé, le Fallstrick « Ohne die Frage nach früheren … » est supprimé, et
  le Fallstrick Uhthoff est réduit au texte de la revue. Il reste 8 questions, dont l'explication au patient.
- **Mineurs** : les 25 lignes du tableau de la revue, sauf la l. 2607, remplacée par l'arbitrage P2-6.
- **Fallstrick 2600 du Reizdarm** : supprimé, comme arbitré (doublon du merksatz).

**Mesures DOM après la passe** (même méthode qu'au § 1)

| Fachwissen | Écrans (repos / ouvert) | Redites | Questions | Débordement |
|---|---|---|---|---|
| multiple-sklerose | 9,4 / 11,1 | 1 (carte « Cas liés », comme au § 1) | 8 | 0 |
| reizdarm | 10,5 / 10,5 | 0 | 7 | 0 |
| bandscheibenvorfall | 9,1 / 9,1 | 0 | 7 | 0 |

Chacun garde une question d'explication au patient. `checkFachwissenFloor` : 45 sans explication (budget 45).

**Vérifications (code de sortie)**

| Commande | Sortie |
|---|---|
| `npx tsc -b` | 0 |
| `npm test -- --maxWorkers=2` | 0 (2 025 tests) |
| `npm run test:c6 -- --maxWorkers=2` | 0 (212 tests) |
| `node --test` sans checkProbeCoverage, puis checkProbeCoverage seul | 0 (219), 0 (4) |
| les 25 `check*` de la CI, `checkTermRegister --require-all`, `evalDoctopus --dry` | 0 chacun, sauf `checkProbeOverlap` : 1 (`\|\| true` en CI, inchangé) |
| `checkBudgetFloor.mjs origin/main` | 0 |
| `npm run build` | 0 |
| `git merge-tree --write-tree origin/main HEAD` (VD déjà fusionnée ; `origin/feat/s3-q9-und` n'existe pas encore) | 0 |
| `git merge-tree --write-tree origin/feat/s3-vd HEAD` | 0 |
| `npm run content:link` | 0, `caseTermLinks.json` inchangé |

Cohésion : 263 liens manquants, inchangé ; bandscheibenvorfall à 100 %.

**Non vérifié** : les textes de cette passe n'ont pas été relus de nouveau. Le Muster et les patientWorte du cas
bandscheibenvorfall n'ont pas été vérifiés sur le PPI et le Durchgangsarzt, parce que le périmètre autorisé dans
`seedCases.ts` se limite aux cinq lignes ; `checkCoherence` et `checkCaseCoherence` sont verts.
