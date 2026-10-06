# S4-5 — la page Programme refaite · rapport du lead

**Statut : DONE_WITH_CONCERNS.** Les concerns sont des points de contrat à trancher par `main` (§4). Il n'y a pas de défaut ouvert.
Branche `feat/s4-5-programme`, worktree `doctopus-s4-5-programme`, partie de `origin/main` `cb15a90d`. Poussée, sans PR.
Aucun serveur Supabase n'a été lancé, rien n'a été déployé.

Sources : la proposition validée (`docs/superpowers/specs/2026-10-04-cas-entier-cadran.html`, « 4 · Programme »), ADR-0021, ADR-0022, `training-journal.md` §12.6, §12.7, §12.9, §13.5 et §13.6, et `DIRECTION-STYLE.md`.

## 0. Fixeur — revue `direction-keeper` de `2d85868d` (prime sur les §1 à §7 ci-dessous)

Corrections une par une, décisions de `main`. Commits : `bd95f860` (bloquant), `cb6c8f97` (majeurs et mineurs), `677dea62` (garde-fou navigateur), `ecae90ae` (rapport).

### Bloquant : « 776 protocoles » était faux — corrigé
- **Cause** : 776 était la somme des `Case.frequency` des 130 cas. Or plusieurs cas partagent une pathologie : Lumbaler et zervikaler Bandscheibenvorfall portent tous deux les 14 protocoles de « Bandscheibenvorfall (HWS/LWS) ». Par ailleurs, `Case.frequency` ne suit pas toujours la source (pAVK 20 contre 18, Gicht 22 contre 14, TVT 25 contre 8).
- **Correctif dans le code** :
  - `app/src/data/frequencesProtocoles.ts` est une copie de `apps/site/src/data/frequencies.json` : `n` = 580, les `n` par ville (Freiburg 91, Karlsruhe 169, Reutlingen 151, Stuttgart 182) et les 81 pathologies ;
  - le même fichier contient `CAS_PATHOLOGIE`, qui relie **82 cas** à leur pathologie source. **Je l'ai relue à la main** ; la source ne compte pas les 48 autres cas, qui sont hors calcul. Cas partagés : Bandscheibenvorfall (2 cas), Diabetes mellitus (2), Schilddrüsenerkrankung (Hyper-, Hypothyreose, Struma), CED (Crohn, Colitis), malignes Lymphom (2) ;
  - `frequencesProtocoles.test.ts` vérifie que la copie ne diverge pas de la source, et que chaque cas pointe une pathologie existante.
- `couverturePonderee` :
  - `base` = `n` de la source, ou `n` de la ville si elle est ventilée ;
  - une pathologie pèse **une fois**, avec la couverture **moyenne** de ses cas. C'est mon choix (voir la question 2 de la sous-section « Hypothèses du fixeur ») ;
  - sans aucune pathologie pesée, `pct` vaut `null`.
- **Contrat** : §12.7 (cinq tailles), §12.9 (textes), §13.6 (formule, base, source copiée) et INV-66 réécrits, plus `PROJECTION_FENETRE_JOURS` ajouté au tableau §13.
- **Tests** :
  - INV-66 réécrit : base = `n` de la ville ; pathologie partagée comptée une fois ; sur la table réelle, `base ≤ 580` et `base` = `n` de la ville ; les deux Bandscheibenvorfall donnent `round(100 × 14 / 580)` et non le double ;
  - EXAM_CLAIM et la propriété `0 ≤ pct ≤ 100` restent verts ;
  - mutations : INV-66a (`n` de toute la source pour une ville), INV-66b (portée muette), **INV-66c** (pathologie additionnée deux fois) et **INV-66d** (base = somme des fréquences), toutes tuées.
- **Affiché ailleurs en prod ?** Non. `couverturePonderee` n'était affichée par personne avant S4-5 : S4-1 n'en faisait que la mesure. Le cadran (S4-4) et l'accueil ne la lisent pas. Le seul chiffre de fréquence en prod est le `FreqBadge` des cartes de cas (« N apparitions dans les protocoles »), qui lit `Case.frequency` cas par cas, sans base. Il n'additionne rien, mais il montre `Case.frequency`, qui diverge de la source pour certains cas. **Non touché**, c'est du contenu : à signaler au pôle Contenu.

### Majeurs
1. **Carte** :
   - l'encart est **au-dessus** de la carte ;
   - seules les **6** spécialités les plus lourdes s'affichent (`VISIBLES`), puis « Voir les N autres spécialités » (bascule « Voir moins ») ;
   - les points sont des `CaseDial` **24 px**, la nouvelle taille de `CaseDialSize`, avec son test ;
   - **garde-fou** : `scripts/e2e/carteCouverture390.mjs`, une mesure dans le DOM sur les 130 cas réels, sans Supabase. Il sort à 0 avec 779 px pour un écran de 844 à 390 et 375 px, sans débord. Il sort à 1 sous la mutation `VISIBLES = 99` (1447 px) ;
   - pour tenir à 375 px (852 px avant), la ligne de spécialité passe à `min-h-9` sous `sm` (36 px, la rangée de points sous elle reste cliquable) et les points sont espacés de 3 px ;
   - test RTL structurel en plus : 6 spécialités, points de 24 px, aucun cadran ouvert ni repère quand la carte est fermée.
2. **Une seule action « lancer »** dans Aujourd'hui :
   - les lignes gardent « Fait » et perdent « Lancer » (`TaskList lancer={false}`) ;
   - le titre ouvre la tâche (`a[data-cta]`) ;
   - **la première tâche n'a pas de lien de titre**, parce que « Commencer par … » y mène déjà ;
   - test RTL : jamais deux liens vers la même adresse, un seul `a.btn-primary` ;
   - l'accueil est inchangé (`lancer` vaut `true` par défaut).
3. **L'encart ne propose plus de jouer.** Le nom de la spécialité est un bouton qui l'ouvre dans la carte, en dévoilant la spécialité si elle est au-delà des 6. **`cas.demande` (« Ajouter demain ») : proposition pour Mehdi, non codée.** Ce serait un événement synchronisé (`subject_id` = jour visé) que `buildTasks(D)` lirait comme une tâche demandée, avec sa migration serveur.
4. **« Jusqu'à l'examen » n'a plus qu'une phrase**, la projection. La phrase en pourcentage est retirée, et n'est déplacée nulle part. Sans projection, la section n'apparaît pas.
5. **Texte de l'encart**, aligné sur le contrat §12.9 :
   - « Psychiatrie : son seul cas n'est pas encore travaillé. « Depression » est tombé dans 30 des 580 protocoles relevés, tous centres. » ;
   - « Gastroenterologie : 11 des 17 cas ne sont pas encore travaillés. « Ulcus / Gastritis » est tombé dans 16 des 580 protocoles relevés, tous centres. » (capturé) ;
   - « Orthopädie : aucun des 11 cas n'est encore travaillé. » et « 1 des 9 cas n'est pas encore travaillé. » ;
   - avec une ville : « … dans 11 des 182 protocoles relevés à Stuttgart. » (le 96 de l'exemple n'est pas le `n` de Stuttgart).
6. **Pied d'Aujourd'hui** : « Ce plan est figé… » est supprimé. Il ne reste que « Replanifié à 14:02. », après une replanification (test).
7. **La semaine montre le travail hors plan** : un point plein par cas joué ce jour-là hors du plan, une seule fois par cas, et l'étiquette dit « 1 cas joué hors plan ». Un jour off où l'on a joué n'est plus « off ». Oracle, test RTL et mutation `S45-semaine-hors-plan`.

### Mineurs
- Semaine : `<span className="sr-only">` à la place de l'`aria-label` du `<li>`.
- `useUi.specialiteOuverte` retient la dernière spécialité ouverte. Elle est persistée dans `localStorage` (`fsp-programme-specialite`), comme `fsp-center`, et une spécialité retenue au-delà des 6 est dévoilée.
- En-tête : le `select` d'avancement porte `aria-label="Avancement"` (le libellé visible reste masqué sous `sm`).

### Hypothèses du fixeur (à relire)
1. **Le nom de la pathologie est cité entre guillemets** : « « Bandscheibenvorfall (HWS/LWS) » est tombé dans 14 des 580… ». Le texte de `main` écrit « Le Bandscheibenvorfall est tombé… ». La source ne donne ni article ni genre, et « Le Leberzirrhose » ou « La Depression est tombé » seraient faux. Les guillemets se lisent « le sujet » et gardent l'accord au masculin. Ajouter un article par pathologie à la table est possible si la direction le veut.
2. **Pathologie partagée** : son poids compte une fois, multiplié par la couverture **moyenne** de ses cas. C'est une lecture conservatrice : jouer la LWS ne couvre pas la HWS. L'autre lecture serait la couverture maximale.
3. **Ordre des 6 spécialités** : poids des pathologies **distinctes** de la spécialité, dans la ville si elle est ventilée.
4. La phrase « 21 cas les plus fréquents » de la projection compte toujours `freq ≥ SEUIL_FREQUENT` sur `Case.frequency`, inchangé depuis S4-2. Elle ne cite ni base ni protocoles, mais elle hérite de l'écart entre `Case.frequency` et la source, qui revient au pôle Contenu.
5. **Tests écrits après le code dans cette passe.** Leur mordant est prouvé par les mutations : 15 dans le harnais et 5 à la main sur le RTL (`VISIBLES = 99`, « Lancer » sur les lignes, second lien, points de 36 px, mémoire locale), toutes rouges.

### Échec CI de #85 (`e53b02f2`, test m6) — cause racine corrigée (`afc64c77`)
- **Symptôme en CI** : la ligne de k1 affichait « 52 min · Parmi les cas les plus vus à l'examen, et jamais travaillé. » au lieu de « Il te reste la Dokumentation et la Fallvorstellung · 32 min ».
- **Ce n'était ni le contenu de Q3 (#84), ni l'heure, ni la fenêtre « d'un trait ».** Le test passe en local, avec ou sans la fusion de `origin/main` (`3935db34`), en UTC comme en heure locale.
- **Cause** : `TaskList` relisait seule le plan (`useDayPlan(date)`) et le journal. Tant que ses requêtes n'étaient pas revenues, elle rendait les lignes sans ce qui reste, donc avec la raison figée, alors que la page avait déjà tout lu. Le test lisait le DOM juste après « Carte de couverture » : course perdue sur la machine de CI, gagnée en local. C'est un vrai défaut d'affichage, un flash de la raison périmée.
- **Correctif** : le Programme calcule `lectureDuPlan` une fois et la donne à `TaskList` (prop `lecture`). L'accueil est inchangé.
- **Test** : `ProgramPage.lecture.test.tsx` est déterministe, les requêtes de la liste n'y reviennent jamais. Il était **rouge avant le correctif**, avec la même sortie que la CI, et il est vert après. L'assertion m6 n'a pas été touchée.
- **Vérifications après fusion de `origin/main` `3935db34`** :

  | Vérification | Résultat |
  |---|---|
  | `tsc` | 0 |
  | vitest complet, **deux fois** | 0 et 0, 186 fichiers, 1928 tests |
  | `test:c6` | 0, 165 tests |
  | `npm run build` | 0 |
  | `checkUiTells` | 0 |
  | merge-tree | 0 |

### Vérifications du fixeur (codes de sortie, sur `677dea62`)

| Vérification | Résultat |
|---|---|
| `tsc -b --noEmit` | 0 |
| `vitest run --dir src --maxWorkers=2` | 0, 183 fichiers, 1907 tests |
| `npm run test:c6 -- --maxWorkers=2` | 0, 15 fichiers, 165 tests |
| `npm run build` | 0 |
| les 17 validateurs bloquants, `checkTermRegister --require-all`, `checkBudgetFloor origin/main` | tous à 0 |
| `parcours-mutations.mjs` complet | 0, baseline vert, **148/148 tuées** |
| `scripts/e2e/carteCouverture390.mjs` | 0 : 779 px pour un écran de 844, à 390 et 375 px ; 1 sous `VISIBLES = 99` |
| `git merge-tree --write-tree origin/main HEAD` | 0, sans conflit, contre `origin/main` `98ea2e95` |

Les sondes du candidat C6 (`parcours-lib.mjs`, `parcours-actes.mjs`) ouvrent une ligne :
- par son titre (`a[data-cta]`) ;
- ou, pour la première tâche, par « Commencer par … » (`a[data-commencer]`, qui porte aussi `data-cta`) ;
- ou, sur l'accueil, par son bouton.

`programmeInvariants.mjs` trouve la spécialité par `data-specialite`, après « Voir les N autres » si besoin. Ces trois scripts n'ont passé que `node --check` ici : **la passe navigateur de `main` les rejoue.**

Captures refaites : `s4-5-programme-390.png` et `s4-5-programme-1280.png`. Le serveur `vite` et le navigateur sont arrêtés.

---

## 1. Ce que fait la page, dans l'ordre

| Bloc | Ce qui est rendu | Composants réutilisés |
|---|---|---|
| **1 · Aujourd'hui** | Le plan figé du jour, l'avancement et une action, « Commencer par … ». Elle mène à la première tâche non faite et part de ce qui reste. « Replanifier » reste la seule action sur le jour figé. | `TaskList`/`TaskLine`, `lectureDuPlan`, `taskLink`, `sessionDuJour`, `planProgress` |
| **2 · La semaine** | Du lundi au dimanche, un point par cas prévu. Le point est plein quand la tâche est faite, à moitié plein quand une partie l'a fait avancer (jamais « manqué », INV-52). Il est creux quand la tâche reste à faire, gris pour la projection non figée. Les jours off sont neutres. Un jour passé sans plan reste vide, jamais « en retard ». | `evaluerTache`, `useProjectedDays`, `isWorkingDay` |
| **3 · Jusqu'à l'examen** | La projection sur le rythme réel, puis la couverture pondérée (§13.6). S'il n'y a rien à projeter, la phrase n'apparaît pas. | `consequenceRythme` (S4-2), `computeCaseProgress`, `couverturePonderee`, `phraseCouverture` |
| **Carte de couverture** | Un cadran miniature par cas (`CaseDial` 36, non ouvrable), sans aucun pourcentage. Les spécialités et les cas sont rangés par poids de protocoles. Toucher une spécialité l'agrandit en cadrans 64 ouvrables ; la toucher encore la referme. L'encart dit une seule chose, avec une action et une fréquence sourcée. | `CaseDial`, `dialData`, `couverturePonderee`, `frequencesDeRepli` |

Ce qui a quitté la page :
- le champ spécialités × Teile (ADR-0021) ;
- le calendrier semaine/mois et la navigation d'un jour à l'autre : la semaine les remplace, et le carnet des jours passés revient à l'Historique (S4-6) ;
- la frise n'y était déjà plus (elle est sur l'accueil, voir §5).

Les sections RattrapageLine et RythmeCard restent en tête, sans changement.

## 2. Les textes affichés

**Aujourd'hui**
- Titre : « Aujourd'hui · mardi 6 oct. »
- Avancement : « 0/2 fait · 100 min prévues » (format inchangé : le candidat C6 le lit)
- Action : « Commencer par Leberzirrhose bei Alkoholabhängigkeit »
- Sans plan : « Ce jour sera figé à sa première ouverture. »
- Jour off : « Jour off — récupère bien. »
- Plan fini : « Journée terminée. Rien d'autre n'est proposé — c'est voulu. »
- Pied : « Ce plan est figé. Cocher marque fait ; rien ne prend la place. » (« Replanifiée à 14:02. » s'ajoute après une replanification), avec le bouton « Replanifier la journée ».

**La semaine** (étiquette accessible de chaque jour ; les points sont `aria-hidden`, et chaque point porte un `title` du type « Leberzirrhose · entamé »)
- « lundi 12 oct. : 2 cas prévus, 1 fait »
- « mercredi 14 oct., aujourd'hui : 2 cas prévus, 1 entamé »
- « jeudi 15 oct. : 2 cas en projection, non figée »
- « samedi 17 oct. : off » (on voit « off »)
- « lundi 5 oct. : aucun cas prévu »

**Jusqu'à l'examen**
- « À ton rythme des deux dernières semaines, tu auras travaillé les 21 cas les plus fréquents le 29 oct., avec 34 jours de marge pour les reprendre. »
- Variantes :
  - fenêtre plus courte : « À ton rythme de ces 9 derniers jours, … » ;
  - un seul cas : « le cas le plus fréquent … pour le reprendre » ;
  - date égale à l'examen : « …, le jour de ton examen. » ;
  - date après l'examen : « …, après ton examen du 2 déc. ». La date recule, sans alarme et sans marge négative.
- « Les cas que tu as travaillés représentent 28 % des protocoles, d'après 776 protocoles, toutes villes. »

**Carte de couverture**
- Bouton de spécialité : le nom seul à l'écran. L'étiquette accessible dit « Orthopädie : 11 cas, dont 11 pas encore travaillés ».
- Encart : « Orthopädie : 11 cas pas encore travaillés sur 11. Lumbaler Bandscheibenvorfall revient dans 14 protocoles, d'après 776 protocoles, toutes villes. » avec [Lancer] (étiquette « Lancer Lumbaler Bandscheibenvorfall », lien `/simulation/<id>/pre`).
- Si la table ventilée existe : « … d'après 96 protocoles ventilés de Stuttgart. »

**Jours off (ProgramSetup)** : un groupe « Jours off » et sept boutons « lundi » … « dimanche », chacun avec `aria-pressed` (vrai = jour off).

Aucun texte ne passe la garde EXAM_CLAIM (`jury|officiel|règle FSP|Bestanden|attendu|exigé`), tests à l'appui. Aucun « % » dans la carte (test).

## 3. TDD : rouge, puis vert, puis mutation

| Bloc | Rouge | Vert | Mutations |
|---|---|---|---|
| Lecture pure (`lib/program/pageProgramme.ts`, `phraseFrequence`) | `tests/invariants.page-programme.test.ts` : le module était absent, donc aucun test ne tournait | `0a4d3954`, 17 tests | **9 ajoutées au harnais, 9/9 tuées** : `S45-semaine-off`, `-entame`, `-drill`, `S45-projection-soir`, `-cas`, `-jours`, `-apres`, `S45-encart-poids`, `-portee` |
| Page (RTL, `ProgramPage.test.tsx`) | 9/9 rouges (page non refaite) | `86e7f0cd` → `a128d89b`, 9/9 | à la main, sur l'arbre committé puis restauré, toutes tuées : raison toujours affichée (m6) · `aria-pressed` retiré · carte rangée par ordre alphabétique · « Commencer par » sans le reste · repères présents sur un cadran non ouvrable |
| `Projection.test.tsx`, `Today.test.tsx` | réécrits sur la semaine (le calendrier n'existe plus) | 61/61 dans `features/program` | — |

Mutations par oracle :
- `S45-projection-soir` : la projection lirait le journal du jour. Elle n'est alors plus « recalculée chaque soir ».
- `S45-projection-cas` : le drill compterait dans le rythme.
- `S45-encart-poids` : l'encart compterait les cas au lieu de les peser. La couverture ne serait plus pondérée.

## 4. Hypothèses et silences du contrat — à trancher par `main`

1. **La projection « jusqu'à l'examen » n'est pas écrite au contrat** (§13.5 ne définit que la carte de rythme). Voici ce que j'ai retenu, selon la proposition validée et la projection de S4-2 :
   - la fenêtre : `PROJECTION_FENETRE_JOURS = 14` jours calendaires finissant hier, à partir du début du programme. C'est un **nouveau paramètre** (`parametres.ts`), **à ajouter au tableau §13**. Sous `RYTHME_MIN_JOURS` (3) jours ouvrés, rien n'est projeté ;
   - le rythme : les minutes des **parties de cas** (`partieJouee`) divisées par les jours ouvrés de la fenêtre. Le drill et les coches nues n'y entrent pas, parce que le travail projeté est du travail de cas ;
   - le travail et la date : `consequenceRythme` de S4-2 au rythme réel. Le nombre de cas fréquents est `freq ≥ SEUIL_FREQUENT`, et « travaillé » veut dire chaque Teil non solide joué une fois, à sa durée apprise ;
   - « recalculée chaque soir » : le rythme et la progression sont relus sur le journal **d'avant aujourd'hui** (`computeCaseProgress`). Rien de ce qui se fait dans la journée ne change la phrase ;
   - la marge se compte en jours calendaires. Sans date d'examen, ou une fois l'examen passé, il n'y a pas de phrase.
2. **Contradiction relevée : le pourcentage de la couverture pondérée.** Le contrat (§13.6) fixe le texte « … représentent {pct} % des protocoles … », dont l'affichage revient à S4-5. Le brief interdit tout pourcentage dans la carte. J'ai placé la phrase dans « Jusqu'à l'examen », **hors de la carte** : elle y répond à « où en suis-je avant l'examen ». Si `main` la veut ailleurs ou ne la veut pas, c'est une ligne de `ProgramPage.tsx` à changer.
3. **« Ajouter Vorhofflimmern demain ? » n'est pas réalisable sans contrat.** Aucun mécanisme ne pose un cas dans un jour futur : le plan d'un jour ne lit que le journal d'avant (INV-55), et `replanifier()` ne prend pas de cas. L'encart propose donc **« Lancer »** (la pré-simulation), qui existe déjà. **Proposition de contrat** : un événement synchronisé `cas.demande` (`subject_id` = jour visé), que `buildTasks(D)` lirait comme une tâche demandée, plus sa migration serveur.
4. **Choix de l'encart.** Il retient la spécialité où les cas jamais travaillés (`couverture = 0`) pèsent le plus en protocoles, puis le cas le plus lourd de cette spécialité. Le contrat ne dit rien du choix, seulement de la phrase (§12.9).
5. **Portée.** Tant que la table `FrequenceProtocoles` n'est pas publiée dans l'app (proposition au pôle Contenu, §13.6), tout est « toutes villes » (`frequencesDeRepli`). La ville est lue dans `targetCenter`. La phrase de la proposition, « Elle revient souvent dans les protocoles de ta ville », n'est donc pas dite : elle serait fausse.
6. **m6 de S4-2 et le « mineur de S4-2 » §7 sont le même point.** La correction : une tâche **entamée** n'affiche plus sa raison figée. La ligne dit « Il te reste … », sur le Programme et sur l'accueil. Le héros de l'accueil dit aussi « Il te reste la Dokumentation et la Fallvorstellung » au lieu de la raison. La raison commune ne compte plus les tâches entamées. Une tâche d'un trait entamée garde sa raison, parce qu'elle dit ce qu'elle exige.
7. **`CaseDial`, deux retouches de la primitive**, dans le périmètre `app/src` :
   - un signe **non ouvrable** garde sa taille. La boîte de 44 px est la cible tactile d'une commande, et un signe n'en est pas une. Sans ce changement, 130 cadrans de 36 px occuperaient 44 px chacun. Seul autre appelant non ouvrable : la pré-simulation, en 96 px, inchangée ;
   - un signe non ouvrable ne rend plus ses repères A/D/F : ils n'étaient jamais visibles, mais ils gonflaient le texte de la page.
8. **Le cadran sur la ligne de tâche** : la maquette d'« Aujourd'hui » en montre un. **Je ne l'ai pas fait**, car ce n'est pas dans le brief et cela touche aussi l'accueil. Les lignes gardent leur pastille de type. C'est à proposer comme lot à part.
9. **Commit non vert isolément.** `86e7f0cd` ajoute `ProgramPage.test.tsx`, qui teste aussi m6 et `aria-pressed`. Ces deux corrections arrivent dans les deux commits suivants (`c64c2580`, `a128d89b`). La branche est verte à chaque point de passage à partir de `a128d89b`.

## 5. Constats hors périmètre (rien modifié)

- **[À TRANCHER] La page Stats monte encore `CoverageField`**, le champ spécialités × Teile avec ses chiffres (`features/stats/StatsPage.tsx:136`). ADR-0021 fait quitter l'axe des Teile de la surface. Le composant et `lib/program/coverage.ts` sont donc **conservés** pour Stats. Leur retrait est un choix produit (S4-6 ou statistiques).
- **La frise** n'était déjà plus sur la page Programme. Elle est sur l'accueil (`TrajectoryStrip`, `HomePage.tsx`). La décision (c) la place dans l'Historique, sans projection : c'est le périmètre de S4-6.

## 6. Absorbés

- **Q-6 (débord à 390 px)** : mesuré dans le DOM de l'app (`playwright-cli`, `getBoundingClientRect`).
  - **Avant**, avec l'ancien `ProgramPage` remis en place le temps de la mesure : à 390 et à 375 px, la barre de navigation du calendrier (`div.flex items-center gap-1`, de 97 à 399 px) et le bouton « Aujourd'hui » (de 319 à 399 px) dépassaient. `main.scrollWidth` valait 335 pour une largeur de 326.
  - **Après** : à 390 et à 375 px, carte refermée ou spécialité agrandie, **aucun élément** ne sort de l'écran. `main.scrollWidth` vaut 326 (respectivement 311), soit la largeur de `main`, et `document.scrollWidth` égale la largeur d'écran.
  - La cause était le calendrier, qui a quitté la page.
  - Sur l'accueil à 390 px, rien ne déborde : seule la ligne décorative du héros dépasse, et elle est rognée par sa carte (`overflow-hidden`).
- **`aria-pressed` sur les jours off** : `ProgramSetup.tsx`, avec un groupe nommé, le nom du jour et `type="button"`. La sonde `programmeInvariants.mjs` lit désormais `aria-pressed` au lieu de la classe du bouton.
- **m6 / mineur §7 de S4-2** : voir §4.6.

Le candidat C6 (`parcours-candidat.mjs`, en CI) lit la page. Les sélecteurs qu'il utilise sont conservés :
- « N/M faits · X min prévues » ;
- les lignes `div.rounded-xl.border.transition-colors`, avec « Marquer faite » et `a.btn-primary` ;
- « Avancement », « Rattraper » / « Laisser » / « Compris », « Jour off », « Journée terminée ».

L'encart évite volontairement la classe des lignes. La preuve P3b de `programmeInvariants.mjs` lisait le champ : elle lit maintenant le cadran du cas dans la spécialité agrandie, avec la même exigence (les Teile jamais joués disent « pas encore travaillé », le Teil joué non).

## 7. Vérifications (codes de sortie, sur `e502095e`)

| Vérification | Résultat |
|---|---|
| `tsc -b --noEmit` | 0 |
| `vitest run --dir src --maxWorkers=2` | 0, 182 fichiers, 1902 tests |
| `npm run test:c6 -- --maxWorkers=2` | 0, 15 fichiers, 161 tests |
| `npm run build` | 0 |
| les validateurs bloquants de la CI (`checkProbeCoverage` … `checkCoherence`, `checkTermRegister --require-all`, `checkBudgetFloor origin/main`), exécutés un par un | tous à 0 (`checkFixedOverlays.mjs` n'existe pas sur cette branche) |
| `parcours-mutations.mjs` complet | 0, baseline vert, **144/144 tuées** (dont les 9 `S45-*`) |
| `git merge-tree --write-tree origin/main HEAD` | 0, sans conflit, contre `origin/main` `a6a345db` (`main` a bougé depuis la création de la branche) |

Navigateur : `vite` (port 5291) lancé avec une URL Supabase factice, sans réseau. Contenu et parties écrits dans l'IndexedDB de la session (130 cas, 16 parties), puis mesures lues dans le DOM. Captures : `s4-5-programme-390.png` et `s4-5-programme-1280.png`. Le navigateur et `vite` sont arrêtés.

## Non vérifié

- **Le candidat C6 navigateur** (`parcours-candidat.mjs`) et `programmeInvariants.mjs` n'ont pas été rejoués : ils demandent un Supabase local. La nouvelle sonde n'a passé que `node --check`.
- **Thème sombre** : non capturé. Les classes `dark:` sont posées sur les points de la semaine et sur l'encart.
- **Lecteur d'écran réel** : seules les étiquettes et `aria-expanded` sont vérifiés, par RTL.
- **Un cadran 64 ouvert** dans la carte agrandie à 375 px : le panneau de détail est celui de S4-4 (`min(288, vw - 16)`), mais son ouverture n'a pas été mesurée ici.
- **Coût** de `computeCaseProgress` sur un gros journal, recalculé à chaque changement du journal : non mesuré en navigateur.
