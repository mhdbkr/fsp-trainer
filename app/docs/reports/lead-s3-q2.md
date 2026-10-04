# Lot Q2 — relances : une relance, une question

Branche `feat/s3-q2-relances` (base `origin/main` @ `1f704587`, Q0 et Q1 mergés). Statut : **DONE_WITH_CONCERNS** — tout est vert par code de sortie ; les réserves sont dans « Écarts », « Laissé » et « Non vérifié ».

Sources : `audit-questions-du-cas-serie3.md` (Synthèse 7 ; §6 ligne Q2), `lead-s3-q0.md` et `lead-s3-q1.md` (Revues), `docs/contracts/frage-atomique.md` §3.2, `DIRECTION-STYLE.md`.

## Mesures avant / après

| Compteur | Socle (`origin/main`) | Q2 | Détail |
|---|---|---|---|
| `checkQuestionAtomicity` A | 502 | **448** (−54) | −11 relances du guide ; −43 questions du cas (11 + 11 + 11 + 10) |
| A2 (nouvelle règle) | — | **48** | 51 à la première mesure → 48 après les 3 relances ; la règle corrigée en revue (I-1) mesure 56 → 48 après 8 corrections |
| B | 113 | 113 | inchangé (voir « hueftkopfnekrose » ci-dessous : une hausse évitée) |
| C, D, E | 0 | 0 | |
| D2 / D3 | 453 / 12 | 453 / 12 | |
| corpus « à dire » | 4 559 | 4 633 | +66 : chaque relance découpée est un énoncé de plus |
| `checkCaseQuestionAnswers` (nouveau) | — | **104** à la première mesure → **74** | voir A.1 |

A et B baissent ou tiennent ; A2 est une clé nouvelle (voir A.2).

## A. Mécanique

### A.1 `checkCaseQuestionAnswers.mjs` — la fiche répond-elle ? (`9d338220` ; mots de remplissage dans `0a3dbfeb`)

- `scripts/caseQuestionAnswersDetect.mjs` (fonction pure) + `checkCaseQuestionAnswers.mjs` (informatif, sort toujours 0, `--report`, `--case`, `--bless` qui ne grave qu'une baisse) + fixture `scripts/fixtures/case-question-answers.json` + `checkCaseQuestionAnswers.test.mjs` (6 cas sur fixtures, la porte sur les données réelles, une mutation : une question du cas sans réponse fait monter le compteur et `--bless` refuse).
- **Règle.** Une question (avec sa relance) est répondue si (a) une entrée `frageAntworten` de la fiche a pour `frage` le texte exact de la question — **le champ explicite est un champ qui existe déjà, aucun changement de type** (le cas `tvt` l'utilisait déjà) ; ou (b) un mot de contenu distinctif de la question figure dans la fiche. Mot de contenu = substantif (majuscule hors début de phrase) de ≥ 5 lettres hors mots-outils, par sa racine de 5 lettres ; distinctif = sa racine figure dans ≤ 20 % des fiches. La persona et les `schwierigeReaktionen` ne comptent pas comme réponse. Une question sans mot distinctif n'est pas jugeable : comptée à part (438), pas déclarée trouée.
- **Plancher.** Suivi par `checkBudgetFloor.mjs` (nouveau fixture dans `FIXTURES`, test de mutation ajouté) **et** par le test (`node --test`, bloquant en CI : le compteur ne dépasse pas le fixture). Dans `quality.yml` : l'étape informative (`|| true`) et le test dans l'étape « Mutations ».
- **Mesure.** 104 candidats sur 865 questions à la première version fonctionnelle (110 avant d'écarter le premier mot de chaque phrase, qui prend une majuscule sans être un substantif : « Wurde », « Fühlen »). Ce n'est pas le « ≈ 129 / 866 » attendu : la mesure dépend du filtre de fréquence, et c'est le seul qui sépare le substantif clinique du substantif de dialogue (« Schmerzen », « Beschwerden »).
- **Précision, relue.** Sur 83 candidats (après retrait de mots de remplissage : `Beispiel`, `Zeitraum`, `Hinweise`, `Rahmen`, `Dinge`, `Verhältnis`, `Umfeld`, `Angehörigen`), j'ai relu la fiche de chaque cas (3 phrases les plus proches de la question). **9 vrais trous, 74 faux positifs ou dépistages négatifs déjà dits par un synonyme** : « Zielscheibe » (la fiche dit « ringförmig, in der Mitte heller »), « Diclofenac » (la fiche dit « Ibuprofen 600 »), « Kortisonstoß » (« mehrfachen Kortison-Stoßtherapien »)… Le détecteur lexical ne voit pas les synonymes ; il garde sa valeur de **filet** (le compteur ne remonte pas) plus que de **détecteur** (≈ 11 % de précision). Les « ≈ 20 vrais trous » attendus ne sont pas là : les fiches répondent presque partout, comme l'audit le disait pour les sondes.

### A.2 Règle A2 : deux interrogatifs coordonnés sous un seul « ? » (`0649e06a`)

- `checkQuestionAtomicity.mjs` : clé **A2**, disjointe de A (elle ne lit que les énoncés à un seul « ? » et pas l'Oberarzt). Premier interrogatif en tête de proposition (début, virgule, tiret, deux-points, parenthèse, éventuellement précédé d'une préposition : « Seit wann »), second introduit par « und / oder » : « Wann hat es begonnen, **und wie** lange dauert es ? ». Le « wie » comparatif suivi d'un substantif (« oder wie Kaffeesatz ») est écarté.
- **Mesure : 51 nouveaux constats**, aucun ne vient d'une régression de contenu ni de validateur — c'est une meilleure mesure : 41 questions du cas, 7 énoncés de chapitres de guide (dont 3 relances : médicaments, tabac, parents décédés), 3 sondes (`pers-groesse`, `akt-ausscheid-haeufigkeit`, `fach-derma-beginn-ort`). Un faux positif écarté (le « wie » comparatif).
- **Budget : la clé A2 est gravée à la main à 51, avec sa justification dans le fixture (`q2`).** `--bless` refuse toute hausse, A/B/C/D* ne bougent pas. Les 3 relances de guide sont corrigées dans ce lot (A2 : 51 → 48). Tests de mutation : relance en W-coordonnés → rouge ; sonde → rouge ; deux « ? » → règle A et pas A2 ; comparatif → vert. Un test existant (« relance propre : *Seit wann, und wie oft ?* ») devenait faux : remplacé.
- **Revue I-1 (voir « Revues »)** : le second interrogatif peut lui aussi suivre une préposition (« und seit wann », « und in welchem Bein ») ; la regex n'y voyait que le premier. Corrigée (`PREP` dans `RE_W2`), mesure **56** (+8), les 8 sont corrigés dans le même commit → **48**. Les trous connus d'A2 sont écrits dans le commentaire de la règle (juxtaposition sans « und », `anamneseChapters.ts:178` ; garde du « wie » comparatif).

## B. Contenu

### B.4 Les 9 relances reportées par la revue Q0 + 3 (`780f173b`)

Chaque relance devient une phrase d'une question ; « Falls ja » est repris sur chacune (les « ja » partagent le même interrupteur). Rien n'est retiré.

| Source | Avant | Après |
|---|---|---|
| nox-alkohol | « Trinken Sie täglich oder nur zu besonderen Anlässen ? Wie viel pro Woche ? » | deux relances |
| fach-gastro-uebelkeit | « Wie oft, wie viel ? Wie sah es aus… ? Wie lange nach dem Essen ? » | quatre relances ; les trois du vomissement sous « Falls Sie sich übergeben haben » (revue langue), le délai sous « Falls ja » |
| fach-neuro-kopfschmerz | « Übel ? Licht- oder lärmempfindlich ? » | deux relances |
| fach-onko-knoten ×2 | « hart oder weich ? verschieben oder fest ? » / « weh ? größer ? » | quatre relances |
| fach-chir-op | « Wann war das, und weswegen ? Komplikationen bei der Narkose ? » | trois relances |
| fach-infekt-fieber | « Schüttelfrost oder Nachtschweiß ? » | deux relances (deux symptômes) |
| fach-neuro-kraft | « Dinge fallen, oder mit dem Fuß hängen ? » | deux relances (bras / jambe) |
| fach-psych-suizid | « sich selbst verletzt, oder den Wunsch… ? » | deux relances toujours inconditionnelles (décision Q0 maintenue) **+ « Haben Sie konkrete Pläne, sich das Leben zu nehmen ? »** inconditionnelle (revue clinique : la note NOTFALL en dépend) |
| veg-fieber | « Seit wann ? Wie hoch… ? Wo gemessen ? » + « Ausland ? Geimpft ? » | « Falls Fieber : Seit wann haben Sie Fieber ? », deux relances « Falls ja » ; la partie `reise` devient **la question « Waren Sie kürzlich im Ausland ? »**, et les vaccins une **question autonome** (« Sind Ihre Impfungen auf dem neuesten Stand ? », relance inconditionnelle de la question complète ; en trame réduite, `fach-infekt-impfung` la pose déjà). Le voyage reste découplé de la fièvre (décision Q0) |
| *(A2)* med-regelmaessig | « Welche, seit wann, in welcher Dosierung und wie oft ? » | quatre relances |
| *(A2)* nox-rauchen | « Seit wann, und wie viele Zigaretten ? » + « Falls aufgehört : Wann ? Wie viele Jahre und wie viel ? » | cinq relances |
| *(A2)* fam-eltern | « Falls verstorben : Woran, und wann ? » | deux relances ; « Woran ist Ihre Mutter / Ihr Vater gestorben ? » |

Test vitest ajouté (`followUp.test.ts`) : chaque relance ci-dessus est une phrase à un « ? », la partie `reise`.

### B.3 Les questions « fermée ? + question en W- ? » (4 commits de 10–11 cas)

La liste vient d'un parcours des 203 questions du cas à plusieurs « ? » : forme « première phrase fermée, seconde en W- » = **43** (l'audit en annonçait 40 ; les 3 de plus ont une première phrase à choix ou ouverte plutôt qu'un oui/non : `schizophrenie`, `colitis-ulcerosa`, `typhus`, `spinalkanalstenose`, `schlafapnoe` végétatif — j'ai gardé le même geste). Pour chacune : la question fermée garde son `id` et ses `sucht` / `relu`, la seconde phrase devient `followUp` (« Falls ja: … », « Falls nein: … » quand la suite concerne le non, **sans condition quand elle ne dépend pas de la réponse**, comme `leistenhernie` « Wie oft haben Sie Stuhlgang ? »). La fiche répond déjà (les secondes phrases existaient).

`hyperthyreose`, `herzinsuffizienz`, `niereninsuffizienz`, `pankreaskarzinom`, `bronchialkarzinom` ×2, `mammakarzinom`, `morbus-crohn`, `karpaltunnel` ×2, `panikstoerung` (`bec4edfa`) · `hepatitis-b`, `schenkelhalsfraktur`, `ulcus-cruris` ×2, `leistenhernie` ×2, `itp`, `uterus-myomatosus`, `akutes-nierenversagen` ×2, `polymyalgia` (`75248f4e`) · `schlafapnoe` ×2, `schizophrenie`, `delir`, `septische-arthritis`, `spinalkanalstenose`, `rheumatisches-fieber`, `influenza`, `anorexia-nervosa` ×2, `reaktive-arthritis` (`2130bd81`) · `colitis-ulcerosa`, `chronische-pankreatitis` ×2, `myokarditis` ×2, `hueftkopfnekrose`, `typhus`, `sturz-im-alter`, `bauchaortenaneurysma`, `basaliom` (`1f238caa`).

Gain mesuré : **A −43** (11 + 11 + 11 + 10). Après chaque commit, `checkTrameSymptoms` : 0 (une relance qui cite un symptôme rouvrirait la porte ; aucune ne l'a fait).

**Sous-questions que la relance unique ne porte plus** (le brief : « une relance = une question »). Là où la seconde phrase empilait plusieurs demandes, j'ai gardé celle qui sert le diagnostic du cas ; les autres ne sont plus dans le texte, la fiche les contient toujours : `pankreaskarzinom` (où, ce qui soulage), `bronchialkarzinom` (fréquence du sang, sa couleur — dans la fiche ; l'infection préalable de la voix), `mammakarzinom` (atteinte des deux côtés), `morbus-crohn` (où, combien de temps à l'étranger), `karpaltunnel` (heure du réveil), `panikstoerung` (ce que le médecin a dit), `hepatitis-b` (où ; la stérilité de l'aiguille — déjà dans la fiche), `schenkelhalsfraktur` / `sturz-im-alter` (qui a aidé / appelé le SAMU), `ulcus-cruris` (quand, quelle jambe), `leistenhernie` (nausées), `akutes-nierenversagen` (depuis quand les antalgiques), `polymyalgia` (douleur de la vision), `schlafapnoe` (la suite des pauses), `septische-arthritis` (par qui), `rheumatisches-fieber` (quel antibiotique), `influenza` (« wenn nicht — was hält Sie davon ab ? »), `reaktive-arthritis` (durée, fin de traitement), `chronische-pankreatitis` (traitement), `myokarditis` (date de l'infection), `hueftkopfnekrose` (durée du Kortison), `basaliom` (« Ihr Vater im Gesicht » — c'était aussi une présupposition, la relance est neutre). Si la direction veut en garder une, il n'y a pas de place : `CaseQuestion.followUp` est une chaîne. Une liste de relances par question serait une extension de contrat (§3.2) — proposée plus bas, non faite.

**hueftkopfnekrose, hausse évitée.** La question devenait une question à un seul « ? » et cinq items (« Tabletten, Infusionen oder Spritzen, zum Beispiel wegen des Darms, der Lunge oder der Gelenke ») : elle passait de A à B (+1). Exemples retirés (« als Tabletten, Infusionen oder Spritzen ? », 3 items) ; la fiche dit maintenant « als Infusion » et « Dosis » (les mots de la question), ce que `checkCaseQuestionAnswers` demandait.

### B.5 Les trous réels (`0a3dbfeb`)

Neuf fiches complétées, chaque ligne cohérente avec le reste de la fiche (lue en entier autour de l'ajout) :

| Cas | Question | Ajout |
|---|---|---|
| angina-pectoris | Herzkatheter / Stent | `negativeFindings` : « kein früherer Herzkatheter, kein Stent, keine Bypass-Operation » (la fiche disait « operiert wurde ich noch nie ») |
| myokardinfarkt | idem | idem, « (Erstereignis) » |
| magenkarzinom | Helicobacter / Gastritis | négatif : aucune gastrite ni Helicobacter connus (cohérent avec « keine frühere Magenspiegelung ») |
| mammakarzinom | Knoten am Schlüsselbein / Hals | négatif |
| zoeliakie | Blutarmut / Eisenmangel | négatif : aucune anémie connue, jamais d'Eisentabletten (le DD de la fiche dit « keine Anämiezeichen » ; la microcytose est une trouvaille du labo, pas une anamnèse) |
| rheumatisches-fieber | Knötchen unter der Haut | négatif (nodules sous-cutanés) |
| itp | Impfung | négatif : aucune vaccination ces dernières semaines |
| bph | Beruhigungsmittel | « Schlaf- oder Beruhigungsmittel » ajouté à la liste des médicaments niés |
| eug | Blutgruppe / Rhesusfaktor | `frageAntworten` au texte exact : « Ja, A positiv. Das steht in meinem Mutterpass von der Geburt meines Sohnes. » (accouchement il y a huit ans dans la fiche ; la thérapie dit « bei Rhesus-negativer Patientin », donc rien à changer) |

Et `hueftkopfnekrose` : « als Infusion », « in einer Dosis von 60 mg » (la fiche disait « intravenös » et « 60 mg »).

**Code (hors de la liste du brief, justifié).** `lib/rolePlay.ts` : quand `frageAntworten` a pour `frage` le texte exact d'une question du cas, le Rollenskript n'affiche plus **deux** lignes (l'improvisée et l'écrite) mais une seule — la ligne écrite, qui reçoit la relance (`nachfrage`). C'est ce qui fait du champ existant un pointeur propre ; sans quoi `eug` aurait montré sa question deux fois. +1 test (`rolePlay.test.ts`). `tvt` utilisait déjà ce champ pour une de ses questions : **elle perd sa ligne en double** (comportement changé, voulu — revue m-5).

## Revues (sommet : voir la dernière ligne de `git log`)

Trois revues indépendantes de `978ce9e3`, puis passage fixeur.

- **Mécanique (Opus) : Request changes léger.** 1 important, 5 mineurs.
- **Clinique : conforme avec réserves ; sécurité psy intacte** (la note NOTFALL, la relance « automutilation » inconditionnelle et le seuil « sehr stark » ne bougent pas).
- **Langue : OK sous 3 corrections** et une série de mineurs.

### Mécanique

| # | Point | Correction | Preuve |
|---|---|---|---|
| I-1 | A2 ne voit pas un second interrogatif précédé d'une préposition (« und seit wann », « und in welchem Bein ») : `RE_W2` sans `PREP` | `RE_W2` reprend `PREP` ; le commentaire dit que c'est le SECOND interrogatif qui ne voyait pas la préposition. Les 8 constats révélés sont corrigés : 6 relances du guide (`veg-gewicht`, `fam-familie`, `fach-gyn-fluor`, `fach-haem-bsymptomatik` ×2, `fach-endo-gewicht`) et deux questions du cas (`anaemie` : « wie oft und seit wann », `typhus` : la prophylaxie à cinq sous-questions → « Haben Sie eine Malariaprophylaxe genommen ? » + « Falls ja: Welches Präparat… ? ») | test **rouge d'abord** (« …, und seit wie vielen Tagen ? », « …, und in welchem Bein ? » rendaient 0), puis vert ; `1779de07` ; mesure 56 → **48**. Le test « relance propre » qui contenait justement « …, und seit wie vielen Tagen schon ? » est remplacé par une relance propre |
| m-1 | `Bubble` n'affichait `nachfrage` que sur la ligne à improviser ; `rolePlay.ts` la place sur la ligne écrite → relance invisible pour le simulant | `RolePlayView.tsx` : la relance suit aussi la réponse | `RolePlayView.test.tsx` (rendu jsdom), rouge d'abord ; `9a8314ec` |
| m-2 | note `q2` du fixture : « 51 mesurés → 48 après correction » | réécrite, avec le compte à 56 de I-1 | `atomicity-budget.json` |
| m-3 | trous connus d'A2 non documentés | commentaire de la règle : juxtaposition sans « und » (`anamneseChapters.ts:178`, « Wie viele Kilo, in welchem Zeitraum ? »), garde du « wie » comparatif (suivi d'une majuscule seulement), « wann und wo » | `checkQuestionAtomicity.mjs` |
| m-4 | pertes de sens : schlafapnoe (présupposition), niereninsuffizienz (Blutabnahme absorbée) | voir clinique 7 | |
| m-5 | `tvt` perd sa ligne en double | **vrai, et voulu** : une de ses questions pointe déjà `frageAntworten` ; le Rollenskript n'en montre plus qu'une. Rapport corrigé (« n'a pas été touché » était faux) | |

Budget avant / après les corrections de revue : A 448 / 448, **A2 48 / 48** (56 mesurés après I-1, 48 après leurs corrections), B 113 / 113 ; `checkCaseQuestionAnswers` 74 / 74 (non jugeables 438 → 439).

### Clinique (`755a4f0a`)

1. **influenza** : « Falls nein: Was hält Sie davon ab, sich gegen Grippe impfen zu lassen? » (la date du dernier vaccin n'y est plus).
2. **anorexia** : « Was würde passieren, wenn die Waage zwei Kilo mehr anzeigen würde? » **sans** « Falls ja » (elle fait tomber le déni, à poser aussi sur un « non »).
3. **karpaltunnel** : « Was hat Ihr Hausarzt zuletzt zum Blutzucker gesagt? » sans condition (la patiente dit « nein, mais grenzwertig »).
4. **hepatitis-b** : « Falls ja: Wann war das? » (la date du tatouage = incubation ; la stérilité est dans la fiche).
5. **bronchialkarzinom** : « Falls ja: Wie viel Blut war es etwa? » (signe d'alarme ; la couleur est dans la fiche).
6. **suizid** : relance **inconditionnelle** « Haben Sie konkrete Pläne, sich das Leben zu nehmen? » (la note NOTFALL en dépend ; elle n'était que dans `alts`). Test : `immer`, une seule.
7. **schlafapnoe** : question fermée neutre « Schlafen Sie ausreichend lange? » + « Falls ja: Fühlen Sie sich morgens trotzdem wie gerädert? » (la fiche dit huit heures). **niereninsuffizienz** : « Falls ja: Wann war Ihre letzte Blutabnahme? » rétablie (la fiche : contrôle manqué il y a un an). *Perdu :* « Wie viele Stunden liegen Sie im Bett ? » (schlafapnoe).

### Langue (`755a4f0a` pour les trois libellés de condition, `7dd6e65e` pour le reste)

8. `akutes-nierenversagen` : « Falls ja: Wie viel haben Sie abgenommen oder zugenommen? »
9. `schizophrenie` : la relance qui répétait la mère est remplacée par « Seit wann haben Sie dieses Gefühl, beobachtet zu werden? »
10. gastro : « Falls Sie sich übergeben haben: Wie sah das Erbrochene aus — wie Kaffeesatz, mit Blut? » et « Falls ja: Wie lange nach dem Essen ist Ihnen übel? ». Le parseur accepte le libellé (24 caractères ≤ 40) et en fait l'interrupteur « Sie sich übergeben haben » (test) ; j'ai mis **sous la même condition** les deux autres relances du vomissement (« Wie oft müssen Sie sich übergeben ? », « Wie viel erbrechen Sie… ? »), qui ne valaient aussi que sous un vomissement. Le libellé du toggle reste lourd ; à reprendre avec le parseur si la direction le voit.
- **Mineurs appliqués** : hyperthyreose « Wie viele Kilo haben Sie abgenommen? » ; herzinsuffizienz « Falls ja: Wie viel haben Sie zugenommen? » ; uterus-myomatosus « Wie viele Schwangerschaften hatten Sie? » ; rheumatisches-fieber « Wie lange haben Sie es eingenommen? » ; chronische-pankreatitis « Seit wie vielen Jahren trinken Sie so viel? » ; myokarditis « Wie viele Tage nach dem Infekt haben die Brustschmerzen angefangen? » ; typhus « Blut, Schleim, sehr dünn? » ; schlafapnoe « eine Zeit lang » ; delir « Was sieht oder hört er dabei? » ; veg-fieber « Falls Fieber: Seit wann haben Sie Fieber? » (liste de garde et partie `fieber`) ; onko « es » au lieu de « er » (le test de la liste G4 suit : « Tut es beim Tasten weh ») ; nox-rauchen « Falls aufgehört: Wie viel haben Sie davor pro Tag geraucht? » ; vaccins : question autonome « Sind Ihre Impfungen auf dem neuesten Stand? » (relance inconditionnelle du veg-fieber complet ; `fach-infekt-impfung` la pose en trame réduite d'infection ; la partie `reise` n'a plus de relance).
- **Ignoré** : `:22767` (traité en clinique 3) ; `:30366` (leistenhernie : la relance « Wie oft haben Sie Stuhlgang ? » porte un autre fil que la question, elle reste telle quelle).

### Hors Q2 (tracé par `main` pour Q3)

`CaseQuestion.followUp` en `string | string[]` (amendement §3.2) pour `hueftkopfnekrose`, `ulcus-cruris`, `akutes-nierenversagen` — non fait ici.

## Vérifications (par code de sortie) — après les corrections de revue

- Tous les `app/scripts/check*.mjs` : **0**, sauf `checkProbeOverlap` : **1, informatif, identique au socle**.
- `checkBudgetFloor.mjs origin/main` : 0. `checkQuestionAtomicity` : 0, A 448 / A2 48 / B 113 / C 0 / D2 453 / D3 12 (socle : A 502, B 113 ; A2 n'existait pas).
- Informatifs avant / après : `checkQuestionOrder` 19 / 19 ; `checkCaseQuestionAnswers` — / 74 ; `checkTrameSymptoms` 0 / 0.
- `node --test` (checkQuestionAtomicity, checkBudgetFloor, checkCaseQuestionAnswers, checkQuestionOrder, checkTrameSymptoms, checkProbeCoverage) : **74/74**, exit 0.
- `npx tsc -b --noEmit` : 0. `npx vitest run --dir src/data --maxWorkers=2` : 11 fichiers, 218 tests, exit 0. `RolePlayView.test.tsx` + `rolePlay.test.ts` : 7/7.
- `git merge-tree --write-tree origin/main HEAD` : exit 0.
- `vitest --dir src` complet (avant les corrections de revue, charge machine 15–42) : 4 échecs **temporels** (timeouts de 5 s dans `SelectionExplainer`, `TermHoverCard`, `FachbegriffePage`, budget de perf de `sync/boot.test.ts`), dans des fichiers qui n'importent ni `rolePlay`, ni `seedCases`, ni `anamneseChapters` ; même nature que l'échec de `FachbegriffePage` signalé en Q1. **Non rejoué** après les corrections de revue : à relancer en CI.

## Laissé, et pourquoi

1. **Relances de guide à deux « ? » hors de la liste de Q0** : 24 entrées de A (les variantes de `akt-frueher` « Waren Sie deswegen schon bei einem Arzt ? Welche Diagnose… ? » ×10, `akt-verlauf`, `veg-uebelkeit`, `veg-ausscheidung` ×3, `vor-erkrank`, `vor-op`, `frau-wechseljahre`, `fach-nephro-menge`, `fach-gyn-schwangerschaften`, `fach-haem-blutung`, `fach-derma-aussehen`, `akt-psych-sicherheit`, `akt-beginn`) + 22 énoncés de `seedGuides/guide-anamnese-v4` (relances et questions). Aucun lot du plan (Q3–Q8) ne les couvre : ils portent sur les questions **du cas**. À confier à un lot « relances du guide » (la même opération, une trentaine de chaînes).
2. **A2 : 41 questions du cas, 3 sondes** (`pers-groesse`, `akt-ausscheid-haeufigkeit`, `fach-derma-beginn-ort`), 4 énoncés de chapitres (`akt-ausscheid-haeufigkeit`, `fach-derma-beginn-ort`, `fach-gastro-spiegelung`, `pers-groesse`) : Q3–Q8 pour les premières (cliniques) ; les sondes touchent le catalogue — un lot de plus.
3. **Les 74 candidats de `checkCaseQuestionAnswers`** : relus un par un, réponse trouvée par synonyme. Le plancher les garde ; un détecteur par synonymes serait un autre chantier.
4. **Dépistages négatifs laissés au silence** : une question dont la réponse est « nein » (ex. « Haben Sie Knoten am Hals getastet ? » dans un cas où rien n'en parle) n'a pas d'entrée ; le simulant répond non. J'ai complété ceux que la mesure signalait (angina, itp, rheuma…), pas ceux que le détecteur ne voit pas.
5. **`bph` « Wären Sie damit einverstanden ? »** (toucher rectal) : question de consentement du candidat, pas de fait à lire dans la fiche ; candidate à tort, laissée.

## Écarts et propositions pour `main`

1. **Trailer des commits** : `Co-Authored-By: Claude Sonnet 5.5`, pas « Opus 5.5 » comme demandé (même choix qu'en Q1 : c'est le modèle qui a écrit les commits, et la consigne d'attribution du harnais le fixe).
2. **Contrat `frage-atomique.md`** : à compléter par `main` — règle A2 (§6.4) et le champ explicite (`frageAntworten` au texte exact) dans le contrat de couverture. Aucune modification de contrat faite ici.
3. **Extension de contrat proposée** : `CaseQuestion.followUp?: string | string[]` (plusieurs relances à une même condition, comme `Phrase.followUp`). Elle rendrait la vingtaine de sous-questions ci-dessus récupérables sans casser « une relance = une question ». Non faite : §3.2 est amendé par `main`.
4. **`veg-fieber`, question de fond** (pas de code) : la sonde canonique `veg-fieber` (`anamneseProbes.ts:56`) empile encore fièvre, durée et voyage dans une seule `frage` : à voir avec le lot qui reprendra les sondes.
5. **Skills** : l'outil `Skill` est désactivé dans cette session, `dept-coordination` / `dept-contenu` non invoqués (lus à la place : `CLAUDE.md`, `DIRECTION-STYLE.md`, contrat, rapports Q0 et Q1).

## Non vérifié

- Aucune vérification navigateur : l'affichage des nouvelles relances « Falls ja » groupées (jusqu'à 5 sous un même interrupteur : gastro, tabac) et de la ligne écrite d'`eug` dans le Rollenskript n'est vu que par tests jsdom.
- L'allemand des 43 relances et des 12 relances de guide est relu par moi seul : pas de passe d'un relecteur de langue.
- La relecture « 9 vrais trous » repose sur les trois phrases de fiche les plus proches de chaque question (recouvrement de racines) : un trou dont la réponse partage un mot avec une autre phrase de la fiche a pu m'échapper.
