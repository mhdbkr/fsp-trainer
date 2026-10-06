# Rapport lot K5 — `sucht` requis, porte complète, reliquats K4, pipeline des futurs cas

> `sim-engine-engineer` (lot K5, dernier lot du moteur de cohérence, ADR-0023) · 6 oct. 2026 · branche `feat/s3-k5-pipeline`, worktree `doctopus-s3-k5`. Base : `origin/main` @ `ee18372b` (K3 et K4 inclus), puis fusion d'`origin/main` @ `a23b64ed` (#82 « d'un trait », zones disjointes). Contrat opposable : `docs/contracts/frage-atomique.md` §10.10, ligne K5.
>
> **Fixeur (6 oct.)** : les revues Opus de `f5cc6d7a` sont traitées au § F, en tête ; il prime sur la suite.
>
> **Statut initial : DONE_WITH_CONCERNS.** Les cinq livrables sont faits et la porte est verte au sommet. Deux points s'écartent de la lettre du brief : le mécanisme d'anorexia (§ 4.1) et schlaganfall, que je n'ai pas traité comme une chute (§ 4.2). Je les soumets à main.

## F. Fixeur — les revues Opus de `f5cc6d7a` (décisions de main)

> Revue clinique : mergeable (4 questions changent, dans les 4 cas annoncés, sans perte). Revue mécanique : Needs fixes, aucun bloquant. Cette section **prime** sur la suite quand elles divergent. Sommet : § F.7.

### F.1 Mécanique

| Point | Fait | Preuve (test, puis mutation rouge) |
|---|---|---|
| **I1** `lotAssembler.py` perdait le profil | `SHEET` + `profil`, `aktuellSkip`, `fachSkip`, `leitsymptomKategorie`, `motiv` | `scripts/lotAssembler.test.mjs` : le JSON assemblé garde les cinq champs, et un champ inventé tombe toujours. Le test est ajouté à `node --test` dans `quality.yml`. Mutation : `SHEET` sans `profil` → rouge |
| **I2** `followUpSucht` n'existe pas sur une question du cas | retiré des consignes de `PIPELINE.md` et de `content-case-author.md` : « une relance qui cherche un autre signe devient une question du cas à part » | proposition de contrat, § F.6 |
| **I3** `akt-motiv` perdante → `nonReduit` | option robuste : un signe ajouté par `MOTIF_DECLARE` n'est jamais perdu par `akt-motiv`. Une question du cas qui le déclare le garde ; `akt-motiv` le cède sans écart et reste posée entière (`motifAjoute`, `coherence.ts`). La relecture de la trame jouée (`compteursApres`) ne rajoute pas le motif : elle lit ce que la trame déclare | `coherenceK5.test.ts` « I3 » : lagerungsschwindel + « Haben Sie Schwindel? » (`sucht: ['schwindel']`) → porte à 0, `nonReduit` 0, `akt-motiv` posée, `schwindel` cherché une fois. Rouge avant (`nonReduit` 1) ; mutation (cession retirée) → rouge |
| **I3** règle « déclarer le signe AFFINÉ » | `PIPELINE.md`, règle 8 | — |
| **I4** le détecteur de texte relisait les questions à `braucht` | l'anaphore (`coherenceMesure.mjs`) et le détecteur Q0 (`checkCoherence.mjs`) ignorent une question qui déclare `braucht` ; chaque constat cite le texte de sa question | `checkCoherence.test.mjs` « I4 » (pur et corpus : hypothyreose « Entbindungen », `braucht kinder`, ne sort plus). Mutations : anaphore → rouge ; filtre Q0 → rouge. `presuppositionsTexte` 22 → **21** |
| **I5** contrat | `frage-atomique.md` §10.0 D4-bis : `MOTIF_DECLARE` (tag de profil, motif ajouté au `sucht` d'`akt-motiv`), la règle I3, « un tag n'est pas un signe » | ce PR |

### F.2 Mineurs 1 à 8

1. `doublonsMasques` = **51** (§ 0 corrigé).
2. Le test INV-89 lit le **bloc entier** de l'étape et l'en-tête du job ; il refuse `|| true` et `continue-on-error`. Mutations : `continue-on-error: true` posé sur l'étape du vrai `quality.yml` → rouge ; posé sur le job (dans le test) → rouge.
3. Mutation `sondesMuettes` : une sonde privée de son entrée `PROBE_SUCHT` donne exit 1 et « sondesMuettes = 1 : résidu bloquant à 0 », même avec un plancher complaisant. Sans la garde, la mutation de la porte rougit le test. L'exception sans relecteur a son contrôle « seulement ce défaut ».
4. Le montage (`caseQuestionsByKapitel`) et `PatientSheetView.tsx` lisent la forme `CaseQuestionLue`.
5. epilepsie : traité (§ F.4).
6. `PIPELINE.md` : `--propose` sort à 1 tant qu'une question est muette.
7. Chaque constat du détecteur de texte cite sa question (I4).
8. INV-78 : un tag de profil n'est pas un signe. C'est écrit dans `signes.ts`, à côté des tags, et au contrat (D4-bis).

### F.3 Le tri des 21 présuppositions lues dans le TEXTE (informatif)

**1 vrai positif** : anaphylaxie, « Pfeift es beim Atmen? Haben Sie Ihr Asthmaspray dabei und schon benutzt? ». La question présuppose un asthme qui n'a pas encore été dit. Il est renvoyé au lot de contenu (§ F.5).

**20 faux positifs** : le détecteur lit l'article défini d'un nom que la question introduit elle-même. Ce sont :
- erysipel « Ihren Zehen »
- hypothyreose « Ihre Augenbrauen »
- hepatitis-b « Ihren Impfpass »
- parkinson « die Schrift »
- schenkelhalsfraktur « der Dämmerung »
- alkoholentzug « die Gläser »
- akutes-nierenversagen « die Packung »
- schlafapnoe « Ihre Ehefrau »
- laktoseintoleranz « wegen der Bauchschmerzen »
- metabolisches-syndrom « der Augenarzt » et « den Achselhöhlen »
- abszess « die letzte Tetanusimpfung »
- anorexia-nervosa « die Waage »
- malaria « Sie haben keine Milz mehr »
- anaphylaxie « das Insekt »
- pertussis « Ihrem Impfpass »
- nephrotisches-syndrom « Ihre Schuhe »
- allergische-rhinitis « das Nasensekret »
- obstipation « wegen Bauchschmerzen »
- sturz-im-alter « dem Boden »

Malaria est classé faux positif sur décision de main.

### F.4 Clinique

| Cas | Fait | Trame jouée / preuve |
|---|---|---|
| **epilepsie** | tag `sturz` (identité : l'ouverture dit « vom Stuhl gekippt ») | `akt-motiv~motiv,sturz` ; coordination : « Haben Sie Schwindel oder das Gefühl zu schwanken? », puis à part « Fühlen Sie sich beim Gehen unsicher? » (part d'alarme) ; « gestürzt » n'est plus redemandé. Les myoclonies restent demandées par la question du cas (`anfallsformen`). Le figement « question entière » d'epilepsie est retiré du test. Mutation (sans le tag) → rouge |
| **schlaganfall** | n° 4 « beim Sturz » : `kapitel: 'fach'` (et toujours `braucht: ['sturz']`) | le Rollenskript du simulant la range sous la Fach (test). Mutation (`aktuell`) → rouge |
| **commotio** | **appliqué**, la mécanique le permet proprement : `PART_ALARME` (`gang`, liste fermée, `coherence.ts`). Une part d'alarme ouvre sa propre question dans `poser`, au lieu d'une relance. Contrat §10.4 amendé (« Précision de K5 — la part d'alarme ») | « Haben Sie Schwindel oder das Gefühl zu schwanken? », puis à part « Fühlen Sie sich beim Gehen unsicher? ». La part d'alarme ne change que commotio et epilepsie au gel. Le guide indexe ses lignes par position, donc deux questions de la même sonde ne se confondent pas. Mutation (`PART_ALARME` vide) → rouge |

Le gel `trame-actuelle.txt` est régénéré. Par rapport à `f5cc6d7a`, trois cas changent : commotio (part d'alarme), epilepsie (tag et part d'alarme) et schlaganfall (n° 4 en Fach). Le plancher est inchangé, et le socle `checkTrameSymptoms` reste à 0.

### F.5 Lot de contenu — listé, non traité

- **anaphylaxie** : scinder « Haben Sie Ihr Asthmaspray dabei? » (présupposition de l'asthme ; seul vrai positif du détecteur).
- **anorexia-nervosa** : un `followUp` sur la n° 2 ; la réponse `veg-uebelkeit` est à raccourcir.
- **schlaganfall** : la réponse `akt-einfluss`.
- **Doublons** : hypothyreose, malaria.
- **sturz-im-alter** : « Anfall ».

### F.6 Propositions de contrat (non appliquées)

- **§10.2, le trou de `followUpSucht`.** Le contrat annonce `followUps` et `followUpSucht` sur `CaseQuestion` (I9). Le type ne les a pas : une question du cas n'a qu'un `followUp: string`, qui hérite de sa mère. Il faut soit ajouter les deux champs (additifs, au type et à l'assembleur), soit écrire au contrat qu'une relance hors signe d'une question du cas devient une question du cas à part. C'est la consigne que donne aujourd'hui `PIPELINE.md`.
- **Un tag dédié `krampfanfall → krampf`** (`MOTIF_DECLARE`), pour la crise dite à l'ouverture d'epilepsie. Non implémenté.

### F.7 Vérifications au sommet — codes de sortie

Sommet vérifié : `fbb15c82`, avec `origin/main` @ `3187dd4f` fusionné (registre seulement). Chaque code a été lu par `$?` juste après sa commande.

| Commande | Code |
|---|---:|
| `npx tsc -b` | **0** |
| `npx vitest run --dir src --maxWorkers=2` (181 fichiers, 1 893 tests) | **0** |
| `npm run test:c6 -- --maxWorkers=2` (14 fichiers, 144 tests) | **0** |
| `node scripts/check*.mjs` (23) | **0**, sauf `checkProbeOverlap` **1** (informatif, `\|\| true` en CI, inchangé depuis K4) |
| `checkTermRegister.mjs --require-all` · `checkGuideCoverage.mjs` · `checkCoherence.mjs` | **0** · **0** · **0** |
| `node --test scripts/*.test.mjs` (199 tests, dont `lotAssembler.test.mjs`) | **0** |
| `checkBudgetFloor.mjs origin/main` | **0** |
| `npm run build` | **0** |
| `git merge-tree --write-tree origin/main HEAD` | **0** |

Le premier passage complet, sur `bd50f14c`, sortait à 1 sur deux points :
- `tsc` : `l.frage` est optionnel dans le test du Rollenskript ;
- le gel `fach-raw.txt` : schlaganfall n° 4, passée en `kapitel: 'fach'`, entre dans la Fach brute (11 → 12 questions, seule empreinte qui change).

Les deux sont corrigés dans `fbb15c82`, puis la batterie a été rejouée en entier.

## 0. Sommet

| Commit | Contenu |
|---|---|
| `56c0672d` | le type : `CaseQuestion.sucht` requis, alias `Symptom` retiré, lecteurs tolérants |
| `fa725078` | les reliquats K4 : anorexia, motif déclaré en Fach neuro, `braucht` de schlaganfall |
| `1c27700d` | la porte : résidu bloquant, `brauchtViole` exact (m-2), INV-89 complet, CI |
| `a7ba1dca` | DM3 : `PIPELINE.md` et `content-case-author.md` |
| `aa024964` | fusion d'`origin/main` (#82) — **sommet vérifié** |

Le commit de ce rapport vient ensuite. Le plancher (`coherence-budget.json`) évolue ainsi :

| Compteur | K4 | **K5** |
|---|---:|---:|
| doublons · doublonsCas · horsProfil | 1 · 0 · 2 | 1 · 0 · 2 |
| exigeAbsent · relancesOrphelines · ajouteSansReponse | 0 · 0 · 0 | 0 · 0 · 0 |
| **brauchtViole** | 22 (détecteur de texte compris) | **0** (r4b exact) |
| questionsMuettes · sondesMuettes · nonReduit · casRetiresParR1 | 0 · 0 · 0 · 0 | 0 · 0 · 0 · 0 — **bloquants** |
| *informatif* doublonsMasques | 52 | **51** (« 47 » dans la première rédaction : mesuré avant que la trame jouée n'écrive le motif d'`akt-motiv` ; revue K5, mineur 1) |
| *informatif* presuppositionsTexte (nouveau) | — | **22** |

Les autres fixtures :
- `checkTrameSymptoms` : le socle passe de 1 à **0** constat, `relu` de 85 à **84** ;
- gel `trame-actuelle.txt` : **4 cas** changent (anorexia-nervosa, lagerungsschwindel, commotio, schlaganfall) ;
- gel `fach-raw.txt` : inchangé.

## 1. Le type

- **`CaseQuestion`** (`src/db/types.ts`) devient `{ frage; kapitel; sucht: [Signe, ...Signe[]]; relu?; followUp?; braucht?: [Signe, ...Signe[]] }`. La forme chaîne sort du contenu écrit : une chaîne n'a pas de `sucht`, donc « requis » l'exclut.
  - Les 861 questions du cas étaient déjà déclarées : 0 chaîne, 0 sans `sucht` (mesuré sur `seedCases()`).
  - `tsc` sort à 0 sans toucher au contenu.
- **`CaseQuestionLue`** est nouveau : `string | (Omit<CaseQuestion,'sucht'> & { sucht? })`. C'est la forme qu'un contenu publié ancien peut encore servir (§10.8). Les lecteurs l'acceptent :
  - `cqText`, `cqFollowUp` et `cqKapitel` ;
  - `buildRollenskript` ;
  - `RolePlayView`, `ExaminerSheetView` et `CaseQuestionList`.

  `Case.caseSpecificQuestions` reste en `CaseQuestion[]`, strict : c'est ce qui contrôle le contenu écrit.
- **L'alias `Symptom = Signe` est retiré** (`symptoms.ts`). Ses usages sont migrés vers `Signe` : `types.ts`, `TEXT_RE` et `symptomsInText`.
- **La tolérance est vérifiée au montage.** Je monte un cas réel avec une chaîne nue et une question sans `sucht` ajoutées. Résultat : pas d'erreur, les deux questions sont posées, et le reste de la trame ne bouge pas (`coherenceK5.test.ts`).
- **Publication et chargement.** `publishContent.mjs` et `lib/content/apply.ts` ne lisent ni `sucht` ni `caseSpecificQuestions` : le payload passe tel quel (grep, aucune occurrence). Un contenu ancien ne casse donc ni la publication ni le chargement. En revanche, `publishContent.mjs` n'a pas été rejoué (§ Non vérifié).
- **Fixtures de test.** Les fixtures qui décrivent un contenu ancien sont typées `CaseQuestionLue` : `rolePlay.test`, `RolePlayView.test`, `CaseQuestionFollowUp.test`, et le `mk` d'`adaptChapters.test` et de `symptoms.test`. Leurs attentes ne changent pas.

## 2. La porte (`checkCoherence.mjs`, INV-89)

- **Le résidu est bloquant à 0, quel que soit le fixture.** Sont concernés `questionsMuettes`, `sondesMuettes` et `nonReduit`, en plus de `casRetiresParR1`, qui l'était déjà. Un plancher complaisant ne l'excuse plus.
- **`--propose` sur une question muette sort maintenant à 1.** La porte est rouge, mais la proposition est quand même écrite. Le test `--propose` est adapté en conséquence.
- **`quality.yml`.** L'étape `checkCoherence.mjs` n'avait déjà pas de `|| true`. J'ai fait deux modifications, loin de la zone `checkUiTells` / `checkFixedOverlays` :
  - un commentaire INV-89 au-dessus de l'étape ;
  - `node --test scripts/checkGuideDuplicates.test.mjs` dans la liste des tests de mutation (suivi K4, G.1).

  Les quatre étapes informatives du même job gardent leur `|| true` : `checkCaseCohesion`, `checkProbeOverlap`, `checkQuestionOrder` et `checkCaseQuestionAnswers`. Le contrat le veut ainsi : INV-47, §3.6 (« le détecteur de texte reste informatif »), §10.6 (« au contraire d'INV-47 »). « Sans `|| true` » vise donc l'étape de la porte. C'est ce que lit le test.
- **INV-89 complet** (`checkCoherence.test.mjs`) :
  - une exception valide (raison, relecteur, datée, active : `case-gastroenteritis|fach-infekt-fieber|fieber`) passe la porte. C'est le témoin ;
  - chaque défaut rougit **seul**, avec le message exact attendu : sans raison, sans relecteur, non datée au fixture, périmée ;
  - un test relit `quality.yml` : la porte est lancée sans `|| true`, et `checkCoherence.test`, `checkGuideDuplicates.test` et `checkBudgetFloor.test` sont lancés par `node --test`.
- La liste `COHERENCE_ALLOWED` est vide : aucune entrée n'est sans raison ni périmée.

## 3. Le détecteur de présupposition (m-2)

- **`brauchtViole` du plancher est désormais l'exact r4b du montage.** Il compte les anomalies et toute question placée avant un de ses `braucht`. Cette valeur égale celle de la porte après montage : 0.
- **Le détecteur de texte devient informatif, sans plancher : `info.presuppositionsTexte` = 22.** Il réunit l'anaphore « dort » et le détecteur Q0. Il reste lisible dans la synthèse et dans `--case` (bloc « présuppositions lues dans le TEXTE »), pour proposer des `braucht`.
- **Une hausse de faux positifs ne bloque plus.** Le test ajoute un « dort » dans une question du cas de parkinson : `presuppositionsTexte` passe à 23, et l'exit reste à 0.
- `doublonsMasques` reste informatif (51).

## 4. Les reliquats « Pour K5 »

### 4.1 anorexia-nervosa — fait, par la déclaration et non par `SIGNE_AFFINE` (à valider)

- **Ce que demande le brief.** `SIGNE_AFFINE selbstinduziertes_erbrechen → erbrechen`, pour que « Mussten Sie sich übergeben? » soit retirée et « Ist Ihnen übel? » gardée.
- **Pourquoi la lettre ne suffit pas.** `cohere` ne lit pas `SIGNE_AFFINE`. Cette table ne sert qu'à la porte de discordance (`suchtCheck.ts`, `checkTrameSymptoms`). Je l'ai vérifié : avec la seule entrée `SIGNE_AFFINE`, le test anorexia reste rouge, et « übergeben » est toujours posé. Faire lire `SIGNE_AFFINE` par r2 casserait INV-78 : `stuhlfrequenz → stuhl` ferait retirer `akt-ausscheid-was` par `akt-ausscheid-haeufigkeit`.
- **Ce que j'ai fait, dans le contrat (règle d'identité §10.1).** La question n° 2 déclare désormais `sucht: ['selbstinduziertes_erbrechen', 'erbrechen']`. La fiche répond en effet à `veg-uebelkeit` : « Übel ist mir nicht, nein. (Pause) Erbrechen … ja, das schon, aber nur wegen dem Völlegefühl. Zwei- oder dreimal die Woche, nach dem Essen. » C'est la réplique que la question n° 2 obtient.
- **Résultat (trame jouée).** En végétative, il ne reste que « Ist Ihnen übel? » ; `erbrechen` n'est cherché qu'une fois, par la n° 2. Le dernier constat du socle `checkTrameSymptoms` est résolu (1 → 0).

### 4.2 Fach neuro — fait pour lagerungsschwindel et commotio ; **pas pour schlaganfall (contradiction)**

**Mécanisme.** Il est déclaratif, n'ajoute aucun texte et reste dans le contrat : c'est D4-bis étendu, sans règle nouvelle.
- Deux tags de profil nouveaux, `schwindel` (le patient consulte pour un vertige) et `sturz` (il consulte après une chute). La nature ne les distingue pas : les trois cas sont « neurologisch », comme tia.
- Une table `MOTIF_DECLARE` (`coherence.ts`) : `schwindel → schwindel`, `sturz → sturz`.
- La question d'ouverture `akt-motiv` cherche le signe du motif déclaré. C'est la règle d'identité : la fiche y répond « Mir ist seit vier Tagen immer wieder ganz schrecklich schwindelig » (lagerungsschwindel) et « Ich bin heute Nachmittag mit dem Fahrrad gestürzt » (commotio).
- D4-bis fait gagner Aktuelle Beschwerden pour un signe du motif, au rang 0,5. La Fach se réduit donc à ses autres `parts`.
- La trame jouée affiche ce que cherche `akt-motiv` (`akt-motiv~motiv,schwindel`). Tout lecteur de la trame le voit, par exemple le test INV-88.

**Trames jouées après K5 :**

| Cas | `fach-neuro-koordination` posée |
|---|---|
| lagerungsschwindel (`+schwindel`) | « Fühlen Sie sich beim Gehen unsicher? ↳ Sind Sie schon gestürzt? » |
| commotio (`+sturz`) | « Haben Sie Schwindel oder das Gefühl zu schwanken? ↳ Fühlen Sie sich beim Gehen unsicher? » |
| schlaganfall (inchangée) | « Haben Sie Schwindel, Gangunsicherheit oder das Gefühl zu schwanken? Sind Sie schon gestürzt? », puis « Haben Sie sich beim Sturz von der Kellertreppe den Kopf gestoßen? » |

À commotio, le vertige reste demandé : c'est le test K4 `REVIENT` (P2), qui tient toujours.

### [MAJEUR] schlaganfall : la chute n'est pas le motif — la règle « après une chute » ne s'applique pas

- **Où** : `seedCases.ts`, `case-schlaganfall` (`antworten`, caseSpecificQuestions n° 4).
- **Constat** : la fiche ne dit pas la chute à l'ouverture. Elle la dit en réponse à la coordination.
- **Preuve** :
  - `antworten['akt-motiv']` = « Seit heute Vormittag hängt mein linker Mundwinkel, mein linker Arm ist schwach und ich spreche verwaschen. … » — aucune chute ;
  - `antworten['fach-neuro-koordination']` = « Mir ist immer wieder schwindelig und ich schwanke; bei einem Anfall bin ich sogar die Kellertreppe hinuntergestürzt. »

  Retirer « Sind Sie schon gestürzt? » supprimerait la seule question qui obtient la chute.
- **Correctif appliqué** : je ne pose pas le tag `sturz`. La question n° 4 « … beim Sturz von der Kellertreppe … » présupposait une chute qui n'avait pas encore été dite (elle était posée en Aktuelle Beschwerden, avant la Fach). Elle déclare donc `braucht: ['sturz']`, et r4b la place juste après la coordination. L'annotation `relu` de cette question n'a plus d'objet et est retirée (`relu` 85 → 84).
- **À trancher par main** : garder ce traitement, ou réécrire l'ouverture de la fiche (texte, lot de contenu).

**epilepsie** : d'abord signalé sans être traité. **Traité au fixeur** (décision de main, § F.4) : tag `sturz`.

## 5. DM3 — le pipeline des futurs cas

**`app/scripts/PIPELINE.md`** gagne la section « Étape « cohérence » » et une ligne ③a. Elle contient :
- **les commandes exactes**, à vérifier par code de sortie : `checkCoherence --propose --case`, `--case`, la porte, les portes voisines, `tsc`, le gel, `--bless` et `checkBudgetFloor origin/main` ;
- **la table des corrections à la source** ;
- **les règles de déclaration** :
  - le critère est l'identité de la question, pas « la fiche en dit plus » ;
  - avant de créer un signe, montrer que la sonde la plus proche n'a pas déjà la réplique ;
  - une déclaration retire la sonde perdante et ses relances ;
  - D1, (e), `relu` et Q-gyn ;
- **les règles des parts** : une découpe avec au plus un complément grammatical minimal ; une part qui ouvre la question est une question autonome ;
- **la sécurité psy** : `RISIKO_SIGNES`, `todeswunsch`, jamais `suizid` sans le plan et le NOTFALL ;
- **D4, D4-bis (avec K5) et R6.**

L'écart de nom avec le contrat est signalé : le contrat écrit `measureCoherence.mjs --propose`, la commande réelle est `checkCoherence.mjs --propose`.

**`.claude/agents/content-case-author.md`** reçoit deux modifications chirurgicales :
- dans les entrées, l'étape de `PIPELINE.md` ;
- dans le livrable, un paragraphe « Étape cohérence » : ce qu'il faut déclarer dans le JSON, les commandes à lancer après `lotAssembler.py`, l'exit 0 exigé, la correction à la source, et les écarts à porter au rapport pour la relecture clinique.

## 6. Tests : rouge, puis mutation

**Rouge d'abord.**
- `coherenceK5.test.ts` : 4 tests sur 7 étaient rouges, et `tsc` signalait 2 directives `@ts-expect-error` inutilisées.
- `checkCoherence.test.mjs` : 6 rouges.
- Les tests INV-89 par défaut et la mutation r4b sont des gardes nouvelles sur un comportement existant. La preuve qu'ils mordent est la mutation ci-dessous.

| Mutation (fichier muté, puis restauré) | Commande | Résultat |
|---|---|---|
| M1 `sucht?` optionnel au type | `tsc -b` | **1** (directive inutilisée) |
| M1b forme chaîne rétablie | `tsc -b` | **1** |
| M2 résidu non bloquant | `node --test` (résidu) | **rouge** (2 tests) |
| M3 m-2 annulé (le détecteur de texte compte au plancher) | `node --test` (m-2) | **rouge** (2) |
| M4a contrôle « raison / relecteur » retiré | `node --test` (INV-89) | **rouge** (2) |
| M4b contrôle de péremption retiré | idem | **rouge** (1) |
| M4c contrôle de datation retiré | idem | **rouge** (1) |
| M5 `\|\| true` sur l'étape de cohérence (vrai `quality.yml`) | `node --test` (quality.yml) | **rouge** |
| M5b `checkGuideDuplicates.test` retiré de la CI | idem | **rouge** |
| M6 `MOTIF_DECLARE` vidé | `vitest coherenceK5` | **rouge** (2) |
| M6b D4-bis sans le motif déclaré | `checkCoherence` | **1** |
| M7 anorexia sans `erbrechen` | `vitest coherenceK5` | **rouge** |
| M8 schlaganfall sans `braucht` | `vitest coherenceK5` | **rouge** |
| M9 lagerungsschwindel sans tag | `vitest coherenceK5` | **rouge** |
| `SIGNE_AFFINE` seul (la lettre du brief) | `vitest coherenceK5 -t anorexia` | **rouge** (§ 4.1) |

**Tests adaptés, avec leur raison :**
- `checkTrameSymptoms.test.mjs` : l'ancre du socle passe à `[]`. Le socle est vide, et l'attente reste exacte.
- `checkCoherence.test.mjs`, `--propose` : il sort à 1 sur une question muette (résidu bloquant).

## 7. Vérifications — codes de sortie, sommet `aa024964`

| Commande | Code |
|---|---:|
| `npx tsc -b` | **0** |
| `npx vitest run --dir src --maxWorkers=2` (181 fichiers, 1 889 tests) | **0** |
| `npm run test:c6 -- --maxWorkers=2` (14 fichiers, 144 tests) | **0** |
| `node scripts/check*.mjs` (23) | **0**, sauf `checkProbeOverlap` **1** : informatif, `\|\| true` en CI, déjà 1 en K4 (rapport K4 § G.6) |
| `checkTermRegister.mjs --require-all` | **0** |
| `checkGuideCoverage.mjs` (contrat guide ↔ fiche) | **0** |
| `node --test scripts/*.test.mjs` (195 tests) | **0** |
| `checkBudgetFloor.mjs origin/main` | **0** |
| `checkCoherence.mjs` | **0** |
| `npm run build` | **0** |
| `git merge-tree --write-tree origin/main HEAD` | **0** |

Chaque code a été lu par `$?` juste après sa commande.

## 8. Hors de mon périmètre d'écriture déclaré (demandé par le brief)

Le brief l'exigeait pour ces fichiers :
- `src/db/types.ts` ;
- `src/lib/caseQuestions.ts`, `src/components/RolePlayView.tsx` (et son test) : la forme lue tolérante ;
- `scripts/*` et les fixtures ;
- `.github/workflows/quality.yml` ;
- `.claude/agents/content-case-author.md` ;
- `seedCases.ts` : trois déclarations et deux tags.

Je n'ai rien touché d'autre.

## 9. Propositions de contrat (à main, non appliquées)

- **§10.0 D4-bis** : ajouter « le motif peut aussi être déclaré par un tag quand la nature ne le dit pas (`MOTIF_DECLARE` : `schwindel`, `sturz`) ; `akt-motiv` le cherche (identité) ».
- **§10.6** :
  - `brauchtViole` du plancher = l'exact r4b ;
  - le détecteur de texte, informatif, est rapporté sous `info.presuppositionsTexte`, sans plancher ;
  - le résidu est bloquant à 0 dans la porte elle-même.
- **§10.7** : la commande s'appelle `checkCoherence.mjs --propose`, et non `measureCoherence.mjs`.
- **§10.6 / INV-89** : préciser que « sans `|| true` » vise l'étape de la porte. Les étapes INV-47 gardent le leur.

## Non vérifié

- **Navigateur, deux onglets (médecin + simulant), en headless** : non fait. Le brief impose de n'ouvrir ni serveur ni prod.
  - Côté médecin : `checkGuideCoverage` 0, et les trames jouées des 4 cas sont citées au § 4.
  - Côté simulant : le Rollenskript lit `antworten`, que K5 ne touche pas, et son type d'entrée devient le type tolérant (tests `rolePlay.test`, `RolePlayView.test` verts).
- **Contenu publié** : `publishContent.mjs` n'a pas été rejoué, et aucun contenu ancien réel n'a été chargé depuis la fonction `content`. La tolérance est prouvée au montage, sur un cas réel augmenté d'une chaîne et d'une question sans `sucht`.
- **Le jugement clinique** des trois décisions du § 4 : la déclaration `erbrechen` d'anorexia, les tags `schwindel` et `sturz`, le `braucht` de schlaganfall. Il est à faire par la relecture clinique.
- **Les 51 `doublonsMasques`** n'ont pas été relus un à un (informatif). Les 21 `presuppositionsTexte` sont triés au § F.3.
- **`graphify update app/src`** : il n'y a pas de graphe dans ce worktree.
