# Q-gyn — la Frauenanamnese se fond dans la Fach gynéco

Série 3, voie contenu · branche `feat/s3-qgyn` (base `origin/main`, Q2 mergé) · 4 oct. 2026
Retour d'usage : « la Frauenanamnese vers la fin entre en conflit de questions avec la Fachanamnese Gynäkologie ».

## Ce qui est fait, en une phrase

Quand la Fach **Gynäkologie** est jouée chez une patiente, il n'y a plus qu'**un bloc** : les sondes propres à la Frauenanamnese (régularité du cycle et dernière règle, grossesse possible, contraception, ménopause dès 45 ans) ouvrent le bloc gynéco, puis viennent les signes gynécologiques ; le chapitre « Frauenanamnese » n'est plus affiché à part. Pour les patientes sans Fach gynéco, la Frauenanamnese reste un chapitre : mêmes sondes, même ordre, même conseil ; seuls ses textes sont découpés en question + relances (une réplique, un « ? »).

## 1. Inventaire (mesuré sur la trame jouée, `playedTrame`)

5 cas sur 130 jouent la Fach gynéco : `case-eug` (35 ans), `case-mammakarzinom` (54), `case-uterus-myomatosus` (44), `case-endometriose` (31), `case-adnexitis` (23). Les 5 jouaient la Frauenanamnese en chapitre séparé, après `familie-sozial` (six chapitres après la Fach, avant l'Abschluss).

Paires qui cherchaient le même signe (16 occurrences sur 10 signes nommés, + 1 douleur-au-rapport) :

| Cas | Signes cherchés deux fois |
|---|---|
| eug | régularité du cycle (`frau-periode` ⇔ alternative de `fach-gyn-blutung`) |
| mammakarzinom | dernière règle · régularité · contraception · Frauenarzt/Vorsorge · hormones · gestité/parité · ménopause (7) |
| uterus-myomatosus | dernière règle · régularité · désir d'enfant · gestité/parité (4) |
| endometriose | régularité · contraception · douleur au rapport (2 + 1) |
| adnexitis | régularité · contraception (2) |

## 2. Paires départagées

| Paire | Décision | Où |
|---|---|---|
| `frau-periode` « regelmäßig ? letzte Regelblutung » ⇔ alternative de `fach-gyn-blutung` « Bekommen Sie Ihre Tage regelmäßig ? » | La régularité est dite UNE fois, en tête (`frau-periode`). L'alternative de la Blutung ne garde que « Wie stark blutet es — wie viele Binden ? ». | `anamneseChapters.ts` |
| `frau-wechseljahre` « Frauenarzt regelmäßig » ⊂ `fach-gyn-vorsorge` | Retirée de la ménopause **fondue** ; la Vorsorge la porte. Sans Fach gynéco, elle reste en relance de la ménopause. | `frauenQuestionsForAge(…, fused)` |
| `frau-periode` > 55 ans « seitdem noch einmal eine Blutung ? » = relance de `fach-gyn-blutung` | Gardée dans la relance de la Blutung (« Falls die Periode schon aufgehört hat »), retirée de la période fondue. | idem |
| « Hormone » de `fach-gyn-eingriffe` ⇔ Pille de `frau-verhuetung` ⇔ « Hormone genommen » de `frau-wechseljahre` > 55 ans | Contraception (Pille, Spirale) = `frau-verhuetung`. « Hormone » = relance de `fach-gyn-eingriffe` bornée « **außer zur Verhütung** ». Retirée de la ménopause fondue. | `fach-gyn-eingriffe` |
| `frau-verhuetung` ⇔ `fach-gyn-kinderwunsch` | **Pas la même chose** : usage d'une contraception ≠ désir d'enfant. Gardées toutes deux ; voir question clinique Q4. | — |
| Questions du cas (seedCases) qui doublonnaient | mammakarzinom : « erste und letzte Regel, Kinder, Alter, gestillt » (dont 2 déjà posées) → « Alter bei der ersten Regel » + « schon einmal gestillt ? » ; « Hormone — HRT oder Pille » (medikamente) supprimée. myomatosus : « Zyklus … letzte Regelblutung » et « Kinderwunsch/Familienplanung » supprimées. endometriose : « Haben Sie die Pille genommen — und wie waren die Schmerzen … » → « Wie waren die Schmerzen unter der Pille im Vergleich zu heute? ». adnexitis : « Spirale / Eingriff an der Gebärmutter » supprimée. | `seedCases.ts` |
| endometriose : question du cas « Schmerzen beim Geschlechtsverkehr — Anfang oder tief ? » (aktuell) ⇔ `fach-gyn-dyspareunie` | `fachSkip: ['fach-gyn-dyspareunie']` (mécanisme existant : retire la sonde de la trame jouée, la fiche garde sa réponse). | `seedCases.ts` |

## 3. Mécanisme (étend l'existant, rien de neuf)

- `fachChapterRaw` : si la Fach jouée est `fach-gyn` et la patiente `w`, `fuseFrauenIntoGyn` met les questions de la Frauenanamnese (modulées par l'âge, + questions du cas `frauenanamnese`) en tête de la Fach, titre « Frauen- und Fachanamnese Gynäkologie », conseil recomposé (conseil d'âge de la Frauenanamnese + ordre du bloc).
- `adaptChaptersRaw` : le chapitre `frauenanamnese` est filtré quand la Fach le porte (c'est le repli de chapitre au montage déjà là pour les hommes).
- `frauenQuestionsForAge(…, fused)` : ce que le bloc demande déjà plus bas n'est pas redit.
- `dedupeBySymptom` / `FACH_COVERS` n'ont pas bougé : aucune sonde frau-* n'a de symptôme déclaré, les paires sont départagées par le texte.
- `ImmersiveMode` / `bogenKeys.ts` : dans le bloc fondu, la tête (sondes `frau-*`) va dans la rubrique du Bogen `frauen`, les signes gynécologiques gardent leur rubrique de Fach ; `rolePlay.ts` : le simulant retrouve les répliques de la Frauenanamnese en tête de son onglet Fach.

Aucune sonde n'a changé d'id ; aucune réponse de fiche n'est orpheline (`checkProbeCoverage` exit 0 ; `fachSkip` ne dispense d'aucune réponse).

## 4. Ordre final du bloc (texte des questions, dans l'ordre) — après les revues

Patiente de moins de 45 ans (cas de référence : adnexitis, 23 ans). `↳` = relance.

1. Verläuft Ihre Monatsblutung regelmäßig? ↳ Wann war Ihre letzte Regelblutung? ↳ Wie viele Tage liegen zwischen dem Beginn einer Blutung und dem Beginn der nächsten?
2. Besteht die Möglichkeit, dass Sie derzeit schwanger sind? *(eug : « Haben Sie bereits einen Schwangerschaftstest gemacht? » juste après)*
3. Verwenden Sie Verhütungsmethoden? ↳ Falls ja: Welche Methode verwenden Sie?
4. Hat sich Ihre Blutung verändert — stärker, länger, Zwischenblutungen oder Blutungen nach dem Geschlechtsverkehr? *(alt : Wie stark blutet es — wie viele Binden brauchen Sie pro Tag?)* ↳ Falls Ihre Periode schon aufgehört hat: Hatten Sie seit Ihrer letzten Regelblutung noch einmal eine Blutung?
5. Haben Sie Unterbauchschmerzen? ↳ Falls ja: Wo genau sitzen die Schmerzen? ↳ Falls ja: Hängen die Schmerzen mit Ihrem Zyklus zusammen?
6. Haben Sie Ausfluss bemerkt? ↳ Falls ja: Welche Farbe hat er? · Hat der Ausfluss einen auffälligen Geruch? · Juckt oder brennt es dabei? · Welche Konsistenz hat der Ausfluss? · Seit wann bemerken Sie den Ausfluss?
7. Haben Sie Schmerzen beim Geschlechtsverkehr? ↳ Falls ja: Eher am Anfang oder tief im Inneren? ↳ Brennt oder schmerzt es beim Wasserlassen?
8. Wie viele Schwangerschaften und Geburten hatten Sie? ↳ Gab es dabei auch Fehlgeburten oder Schwangerschaftsabbrüche? ↳ Falls Geburten: Haben Sie normal entbunden oder per Kaiserschnitt? ↳ Falls Kaiserschnitt: Aus welchem Grund wurde der Kaiserschnitt gemacht? *(mammakarzinom : « Haben Sie schon einmal gestillt? » juste après)*
9. Besteht ein Kinderwunsch, oder gab es Schwierigkeiten, schwanger zu werden? *(retirée après 55 ans)*
10. Haben Sie in der Brust einen Knoten, Schmerzen, Absonderungen aus der Brustwarze oder Hautveränderungen bemerkt?
11. Wann waren Sie zuletzt bei der Vorsorge — Krebsabstrich? ↳ Sind Sie gegen HPV geimpft? *(HPV jusqu'à 35 ans ; « Mammographie » ajoutée dès 50 ans)*
12. Wurden Sie schon an der Gebärmutter, an den Eileitern oder an den Eierstöcken operiert? ↳ Nehmen oder nahmen Sie Hormone ein — etwa Hormonersatz in den Wechseljahren, oder die Pille oder Spirale als Behandlung?

Variantes d'âge : **45–55 ans** — après la contraception, « Haben die Wechseljahre bei Ihnen schon begonnen — Hitzewallungen, unregelmäßige Blutungen? » (sans « Frauenarzt »). **> 55 ans** — pas de grossesse ni de contraception ; rang 1 : « Wann hatten Sie Ihre letzte Regelblutung? ↳ Hatten Sie seitdem noch einmal eine Blutung? » (la Blutung de la Fach ne redit pas la relance), puis « Wie haben Sie die Wechseljahre erlebt — hatten Sie Beschwerden? » ; plus de Kinderwunsch ; le conseil du bloc ne parle ni de grossesse ni de contraception et ne redit pas l'alarme post-ménopausique. Questions du cas : mammakarzinom ajoute « In welchem Alter hatten Sie Ihre erste Regel? » juste après la régularité ; endometriose n'a plus la ligne 7 (`fachSkip`, sa question du cas la pose en « Aktuelle Beschwerden »).

## 5. Mesures avant / après

| | avant (`origin/main`) | après |
|---|---|---|
| Cas gynéco avec Frauenanamnese en chapitre séparé | 5 / 5 | 0 / 5 |
| Signes cherchés par deux questions (10 signes nommés, 5 cas) | 16 (eug 1, mamma 7, myomatosus 4, endometriose 2, adnexitis 2) | 0 |
| Répliques du bloc à plus d'un « ? » | 47 (9, 10, 10, 9, 9) | 0 |
| Questions du bloc (frau + fach + cas) | 13, 14, 13, 12, 14 | 13, 15, 12, 11, 13 |
| Budget atomicité **A** (fixture) | 448 | **426** (−22) |
| A2 · B · C · D · D2 · D3 · E | 48 · 113 · 0 · 0 · 453 · 12 · 0 | inchangés |
| Énoncés « à dire » (corpus) | 4 625 | 4 644 (+19 : des relances qui étaient dans le texte) |

Mesure : sonde jetable en scratchpad (non commitée), mêmes expressions que la garde, lancée sur un worktree `origin/main` puis sur `HEAD`.

## 6. Garde CI

`app/src/data/guides/gynFusion.test.ts` (vitest) — 35 tests (après revues) : les 5 cas réels + clones aux âges 23/35/47/52/58/76 ; aucun chapitre `frauenanamnese` séparé ; les sondes `frau-*` applicables à l'âge sont exactement les premières du bloc ; **12 signes nommés** (dont « opérations gynécologiques », ajouté à la revue) (`SIGNES`, chacun avec sa paire) cherchés par une seule question (texte + alternative + relances ; `abschluss` exclu) ; au plus un « ? » par réplique ; hors Fach gynéco la Frauenanamnese reste un chapitre.
`app/src/features/simulation/GynFusionDom.test.tsx` — rendu de `AnamneseGuide` en jsdom : un seul bloc titré « Frauen- und Fachanamnese Gynäkologie », ordre à l'écran, « Frauenarzt regelmäßig » absent.

Mutations (chacune lancée, puis revert par `git checkout`) :
- fusion coupée (`fusesFrauenanamnese` → `false`) : **4 rouges** (chapitre séparé, sondes, 2 signes).
- « Frauenarzt » rejoué dans la ménopause fondue : **2 rouges** (`gynécologue / dépistage`).
- régularité rejouée dans l'alternative de la Blutung : **4 rouges** (`régularité du cycle`, « ? »).
- rouge d'origine : le test seul, avant le montage, avait 6 rouges (commit `2777843e`).

## 7. Commits

`2777843e` test rouge · `66b11f26` montage + découpe des sondes · `be08c349` questions du cas · `52ebef3d` `fach-gyn-eingriffe` approfondit `vor-op` · `8020a2f6` budget A 448 → 426 · `366d2447` test DOM · `6b2374f1` endometriose `fachSkip`.

## 8. Hors du périmètre habituel du pôle Simulation (déclaré)

Le lot est de la voie contenu : `seedCases.ts` (5 cas), `fixtures/atomicity-budget.json` (`--bless` : une baisse, même commit de logique que le contrat l'exige), `ImmersiveMode.tsx` (1 entrée de table). Aucun contrat de `docs/contracts/` n'est modifié.

## 9. Questions laissées à un relecteur clinique gynéco (après la revue clinique)

Tranchées par la revue : HPV (≤ 35 ans) et mammographie (≥ 50 ans) ; hormones ; dyspareunie scindée ; Kaiserschnitt ; place du Kinderwunsch (`fach-gyn-schwangerschaften` ne bouge pas) ; opérations des trompes (EUG). Restent ouvertes :

1. **Hors Frauenanamnese, non traité (Fach ↔ motif)** : `fach-gyn-unterbauch` est posée à 3 patientes dont c'est le motif (eug, endometriose, adnexitis), `fach-gyn-brust` à mammakarzinom (motif : le nodule). Chantier « nature du motif » (`fach-nature-pairs.json`).
2. **myomatosus** : deux questions du cas en `aktuell` (« Wie lange dauert Ihre Blutung … Binden », « Blutklumpen ») précèdent la Blutung de la Fach ; seule l'alternative cite encore les Binden. Marquées `relu`, laissées.
3. **adnexitis** : la question du cas « neuer Partner / Kondome / Partnerbeschwerden » (familie-sozial) reste à trois items sous un « ? ». Recherche de risque IST, pas de contraception ; conservée.
4. **Âge de la ménopause** : 45–55 ans reste une approximation (mammakarzinom, 54 ans, ménopausée à 52, reçoit « Verläuft Ihre Monatsblutung regelmäßig? »). La relance « Falls Ihre Periode schon aufgehört hat » la rattrape.
5. **Fiches** : myomatosus (44 ans) garde dans sa réponse de Vorsorge une phrase sur le HPV et la mammographie que la règle d'âge ne fait plus demander (sur-réponse inoffensive).

## 10. Non vérifié

- **Deux onglets (médecin + simulant) en navigateur headless : non fait.** Le contenu vient du Edge Function `content` (Supabase) ; je n'ai pas démarré de pile locale. Substitut : rendu `AnamneseGuide` en jsdom (`GynFusionDom.test.tsx`), qui mesure le DOM de l'app, pas un module importé.
- **Côté simulant** : `rolePlay.ts` (`CHAPTER_META`) garde un chapitre « Frauenanamnese » pour les réponses des sondes `frau-*` ; la surbrillance suit la sonde (`setGuideProbe`), donc le suivi live marche, mais l'ordre de lecture de la fiche (Frauenanamnese à la fin) n'est plus l'ordre de jeu. Non touché, non mesuré dans un navigateur.
- Publication du contenu (`publishContent.mjs`) : non lancée ; le push sur `main` la fera.
- Les 4 échecs d'une exécution complète de `vitest --dir src` (StarButton, MarkWorked, relevance, PartEvaluation.examclaim) étaient dus à la charge (deux runs concurrents) : les 4 fichiers passent seuls, sur `origin/main` et sur la branche. Rejouée seule sur le dernier commit : `vitest run --dir src` exit 0 (142 fichiers, 1 261 tests).

## 11. Revues

Trois revues indépendantes de la branche au commit `f7abb30b`, puis une passe de correction (cette section). Les verdicts :

| Revue | Verdict | Constats |
|---|---|---|
| Clinique gynéco | **GO après 4 corrections**, aucun P0, ordre du bloc validé | C1 hormones · C2 longueur du cycle · C3 HPV/mammographie + fiches · C4 adnexitis ; décisions : dyspareunie scindée, opérations élargies, `fach-gyn-schwangerschaften` ne bouge pas ; mineurs : mammakarzinom, > 55 ans, conseil du bloc |
| Langue | **Acceptable, 3 corrections** | L1 Fehlgeburten/Schwangerschaftsabbrüche · L2 Geruch · L3 Pille de l'endometriose ; six mineurs (relances de Blutung, Unterbauch, Ausfluss, Methode, Wechseljahre, Kaiserschnitt) |
| Mécanique (Opus) | **Needs fixes**, 1 important | I1 garde lexicale contournable · m1 simulant · m2 notes du focus · m3 formulation « rien ne change » |

Corrections, un groupe par commit (test rouge d'abord pour la mécanique) :

- **I1** (`d67f6bb4` rouge, `679c971d` fix) — six reformulations qui passaient la garde (« Wann hatten Sie zuletzt Ihre Tage? », « Welche Verhütung benutzen Sie? », « Könnten Sie schwanger sein? », « Wann waren Sie zuletzt beim Gynäkologen? », « Waren Sie schon einmal schwanger? », « Nehmen Sie Östrogene oder Gestagene ein? ») : chacune, injectée, rougit maintenant. Lexique élargi, `(?<!außer zur )verhütung`, une exception nommée (`sauf: als Behandlung`, pour la question des hormones qui cite Wechseljahre, Pille, Spirale en exemples). La garde reste **lexicale** (12 signes nommés) : le moteur de cohérence du lot suivant la remplacera par une garde par signe.
- **m1** (`0e0219fa`) — `buildRollenskript(sheet, questions, frauInFach)` : les lignes `frauenanamnese` passent en tête de l'onglet `fach` (`ord − 10000`). `PatientScreen` passe `fusesFrauenanamnese(c, fach)` (exportée), à travers `PatientSheetView` et `RolePlayView` (deux fichiers hors périmètre, une prop chacun). Test : onglet séparé par défaut, fondu avec `true`, ordre exact.
- **m2** (`cada8b36`) — table chapitre → rubrique sortie d'`ImmersiveMode` (`bogenKeys.ts`) : dans `fach-gyn`, ce qui précède la première sonde `fach-gyn-*` va dans `frauen`, les signes gynécologiques gardent le comportement d'avant (Hauptbeschwerde). Test `bogenKeys.test.ts`.
- **m3** (`445e81b9`) — « Pour les patientes sans Fach gynéco, la Frauenanamnese reste un chapitre : mêmes sondes, même ordre, même conseil ; seuls ses textes sont découpés en question + relances » (rapport l. 8 et titre du test).
- **Clinique + langue** (`4daf75e4` rouge, `54e12ec3` fix) — un seul commit de code : les corrections de langue portent sur les mêmes lignes que les corrections cliniques et n'étaient pas séparables sans casser la lisibilité de l'historique ; un test par texte les garde. Table `GYN_APRES` (trois sujets) pour placer une question du cas après la sonde qu'elle prolonge, sans nouveau champ de schéma ; règles d'âge `fach-gyn-vorsorge` et `fach-gyn-blutung` dans `FACH_RULES`. Conséquence de l'élargissement des opérations : la question du cas d'EUG « … oder eine Operation an den Eileitern » perd cette moitié (le signe « opérations gynécologiques » entre dans la garde).

Budget d'atomicité : A = 426, A2 = 48, B = 113 — inchangés par les revues.
