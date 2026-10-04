# Q-gyn — la Frauenanamnese se fond dans la Fach gynéco

Série 3, voie contenu · branche `feat/s3-qgyn` (base `origin/main`, Q2 mergé) · 4 oct. 2026
Retour d'usage : « la Frauenanamnese vers la fin entre en conflit de questions avec la Fachanamnese Gynäkologie ».

## Ce qui est fait, en une phrase

Quand la Fach **Gynäkologie** est jouée chez une patiente, il n'y a plus qu'**un bloc** : les sondes propres à la Frauenanamnese (régularité du cycle et dernière règle, grossesse possible, contraception, ménopause dès 45 ans) ouvrent le bloc gynéco, puis viennent les signes gynécologiques ; le chapitre « Frauenanamnese » n'est plus affiché à part. Sans Fach gynéco, la Frauenanamnese est un chapitre comme avant.

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
- `ImmersiveMode` : les notes du bloc fondu vont dans la rubrique du Bogen `frauen`.

Aucune sonde n'a changé d'id ; aucune réponse de fiche n'est orpheline (`checkProbeCoverage` exit 0 ; `fachSkip` ne dispense d'aucune réponse).

## 4. Ordre final du bloc (texte des questions, dans l'ordre)

Patiente de moins de 45 ans (cas de référence : adnexitis, 23 ans). `↳` = relance.

1. Verläuft Ihre Monatsblutung regelmäßig? ↳ Wann war Ihre letzte Regelblutung?
2. Besteht die Möglichkeit, dass Sie derzeit schwanger sind? *(eug : + « Haben Sie bereits einen Schwangerschaftstest gemacht? »)*
3. Verwenden Sie Verhütungsmethoden? ↳ Falls ja: Welche?
4. *(question du cas, adnexitis)* Haben die Unterbauchschmerzen kurz nach Ihrer letzten Periode begonnen?
5. Hat sich Ihre Blutung verändert — stärker, länger, Zwischenblutungen oder Blutungen nach dem Geschlechtsverkehr? *(alt : Wie stark blutet es — wie viele Binden brauchen Sie pro Tag?)* ↳ Falls die Periode schon aufgehört hat: Hatten Sie seitdem noch einmal eine Blutung?
6. Haben Sie Unterbauchschmerzen? ↳ Falls ja: Wo genau sitzen sie? ↳ Falls ja: Hängen sie mit Ihrem Zyklus zusammen?
7. Haben Sie Ausfluss bemerkt? ↳ Falls ja: Welche Farbe hat er? · Riecht er? · Juckt oder brennt es dabei? · Welche Konsistenz hat der Ausfluss? · Seit wann haben Sie ihn?
8. Haben Sie Schmerzen beim Geschlechtsverkehr oder beim Wasserlassen?
9. Wie viele Schwangerschaften und Geburten hatten Sie? ↳ Gab es Fehlgeburten oder Abbrüche? ↳ Falls Geburten: Haben Sie normal entbunden oder per Kaiserschnitt? ↳ Falls Kaiserschnitt: Aus welchem Grund wurde er gemacht?
10. Besteht ein Kinderwunsch, oder gab es Schwierigkeiten, schwanger zu werden? *(retirée après 55 ans)*
11. Haben Sie in der Brust einen Knoten, Schmerzen, Absonderungen aus der Brustwarze oder Hautveränderungen bemerkt?
12. Wann waren Sie zuletzt bei der Vorsorge — Krebsabstrich, Mammographie? ↳ Sind Sie gegen HPV geimpft?
13. Wurden Sie schon an der Gebärmutter oder den Eierstöcken operiert? ↳ Nehmen Sie, außer zur Verhütung, Hormone ein?

Variantes d'âge : **45–55 ans** — après la contraception, « Haben die Wechseljahre bei Ihnen schon begonnen — Hitzewallungen, unregelmäßige Blutungen? » (sans « Frauenarzt »). **> 55 ans** — pas de grossesse ni de contraception ; « Wann hatten Sie Ihre letzte Regelblutung? » puis « Wie sind Sie durch die Wechseljahre gekommen — hatten Sie Beschwerden? » ; plus de Kinderwunsch. Questions du cas : mammakarzinom ajoute « In welchem Alter hatten Sie Ihre erste Regel? » en tête et « Haben Sie schon einmal gestillt? » en fin de bloc (rubrique `fach`, après les opérations) ; endometriose n'a plus la ligne 8.

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

`app/src/data/guides/gynFusion.test.ts` (vitest) — 13 tests : les 5 cas réels + clones aux âges 23/35/47/52/58/76 ; aucun chapitre `frauenanamnese` séparé ; les sondes `frau-*` applicables à l'âge sont exactement les premières du bloc ; **11 signes nommés** (`SIGNES`, chacun avec sa paire) cherchés par une seule question (texte + alternative + relances ; `abschluss` exclu) ; au plus un « ? » par réplique ; hors Fach gynéco la Frauenanamnese reste un chapitre.
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

## 9. Questions laissées à un relecteur clinique gynéco

1. **HPV après 26 ans** : « Sind Sie gegen HPV geimpft? » reste posée à tous les âges (mammakarzinom, 54 ans). À limiter par âge ?
2. **Hormone** : la relance « außer zur Verhütung » est-elle la bonne borne ? Pour une patiente de 45–55 ans, la THS n'est plus demandée que par cette relance (la ménopause 45–55 ne la porte pas).
3. **Dyspareunie + Wasserlassen** : `fach-gyn-dyspareunie` pose deux douleurs (rapport, miction) sous un seul « ? » ; la miction recoupe `veg-ausscheidung` (déjà marqué `deepens`). À scinder ?
4. **Ordre Verhütung → Kinderwunsch** : la contraception est en 3, le désir d'enfant en 10 ; cliniquement adjacents. Les rapprocher exige de sortir `fach-gyn-schwangerschaften` de son rang (gestité avant désir d'enfant).
5. **Kaiserschnitt** : la relance « Aus welchem Grund » remplace le « Warum? » de la relance d'origine (deux « ? »). L'indication de la césarienne suffit-elle ?
6. **Hors Frauenanamnese, non traité (Fach ↔ motif)** : `fach-gyn-unterbauch` (« Haben Sie Unterbauchschmerzen? ») est posée à 3 patientes dont c'est le motif (eug, endometriose, adnexitis), `fach-gyn-brust` à mammakarzinom (motif : le nodule). C'est le chantier « nature du motif » (`fach-nature-pairs.json`), pas celui-ci.
7. **myomatosus** : deux questions du cas en `aktuell` (« Wie lange dauert Ihre Blutung … Binden », « Blutklumpen ») précèdent la Blutung de la Fach ; seule l'alternative cite encore les Binden. Marquées `relu`, laissées.
8. **adnexitis** : la question du cas « neuer Partner / Kondome / Partnerbeschwerden » (familie-sozial) reste à trois items sous un « ? ». Recoupe la contraception par le seul mot « Kondome » ; c'est une recherche de risque IST, pas de contraception — conservée.
9. **eug** : « Operation an den Eileitern » (vorerkrankungen) recoupe en partie `fach-gyn-eingriffe` (Gebärmutter/Eierstöcke) ; organe différent, conservée.

## 10. Non vérifié

- **Deux onglets (médecin + simulant) en navigateur headless : non fait.** Le contenu vient du Edge Function `content` (Supabase) ; je n'ai pas démarré de pile locale. Substitut : rendu `AnamneseGuide` en jsdom (`GynFusionDom.test.tsx`), qui mesure le DOM de l'app, pas un module importé.
- **Côté simulant** : `rolePlay.ts` (`CHAPTER_META`) garde un chapitre « Frauenanamnese » pour les réponses des sondes `frau-*` ; la surbrillance suit la sonde (`setGuideProbe`), donc le suivi live marche, mais l'ordre de lecture de la fiche (Frauenanamnese à la fin) n'est plus l'ordre de jeu. Non touché, non mesuré dans un navigateur.
- Publication du contenu (`publishContent.mjs`) : non lancée ; le push sur `main` la fera.
- Les 4 échecs d'une exécution complète de `vitest --dir src` (StarButton, MarkWorked, relevance, PartEvaluation.examclaim) étaient dus à la charge (deux runs concurrents) : les 4 fichiers passent seuls, sur `origin/main` et sur la branche. Rejouée seule sur le dernier commit : `vitest run --dir src` exit 0 (142 fichiers, 1 261 tests).
