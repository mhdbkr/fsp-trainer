# Lot Banque (série 3, point 1c — FB3-A2) : r5, « rien de déjà dit »

Branche `feat/s3-banque`. Le lot est parti de `f6cbe864`. Avant tout push, il a été rebasé une fois sur `origin/main` @ `ff9b3491`, pour intégrer #102 (Q9, questions du cas). `origin/main` a ensuite été fusionné par des merges, comme demandé par le coordinateur : `a11e34cc` (registre), puis `4077ac85` (#103, fw-plancher), sans conflit. La passe fixeur de la revue clinique est au § 9 et **prime sur les sections précédentes** quand elles divergent. Les commits sont faits fichier par fichier, sans trailer.

**Statut (passe fixeur) : voir § 9.** Premier passage : DONE_WITH_CONCERNS (passe C6 en code 2, propositions hors périmètre).

## 1. Cause

Le moteur `cohere` (r1 → r4a → r2 → r3 → r4b) ne lit que les **questions**, c'est-à-dire leur `sucht`. Il ne lit jamais les **répliques** de la fiche.
- r2 dédoublonne entre questions.
- Aucune règle ne sait que la réplique d'une question jouée plus tôt a déjà dit le signe.

Le défaut n'est pas un `sucht` manquant. Les sondes de banque déclarent bien leur signe (par exemple `fach-gastro-uebelkeit` → `uebelkeit`, `erbrechen`). Le signe n'était simplement jamais extrait de la réplique. La garde Q4 (`reponseDoublon.test.ts`) lisait déjà les répliques, mais le moteur, lui, ne le faisait pas.

## 2. Règle : r5, dans `coherence.ts`, après r4b, dans l'ordre final de l'entretien

### Ce que fait r5

- **La lecture.** `ditsDe(réplique)` (`symptoms.ts`) est distincte de `TEXT_RE`, qui sert la porte et la mesure. Elle donne la présence ou l'absence d'un signe, phrase par phrase.
  - Une absence (« keinen Durchfall », « wie immer ») vaut réponse, et répond aussi aux précisions : le signe est dit « complet ».
  - Le chiffre d'une variation du poids est lui aussi « complet ».
- **La question de banque** dont un signe a déjà été dit :
  - tous ses signes sont dits : elle est **retirée** ;
  - une partie seulement : elle est **réduite** à ses `parts` ;
  - la présence est dite, mais pas les précisions : ses **relances de précision rédigées s'ouvrent sans leur condition**, désormais remplie (« Falls ja: Wie viel …? » devient « Wie viel …? ») ;
  - aucun cas ne s'applique : elle est **gardée entière**, sans écart « non réduit ».
- **Aucun texte inventé.** La forme « Sie sagten … — und …? » n'a pas été nécessaire.
- **Le porteur.** La question dont la réplique a dit le signe le **porte**, via le champ `PhraseVariant.porte`, compté dans `sucht`. Le signe reste donc cherché une seule fois : r2, r3, `exigeAbsent` et la porte sont inchangés.

### Les garde-fous de précision

| Garde-fou | Effet |
|---|---|
| Facteur | « beim Husten » ne vaut pas réponse |
| Épisode passé | « vor drei Wochen … » dans la même phrase, ou sondes d'antécédents `akt-frueher`, `vor-`, `fam-`, `med-`, `nox-`, `all-` (règle (e) de l'identité) |
| Image | « wie ein Gewicht » ne vaut pas réponse |
| Poids du jour, distance | « wiege 70 Kilo » et « Kilometer » ne valent pas réponse |
| Température | « 37,4 Grad » n'est pas un poids |
| Impression | « mir ist warm » n'est pas « Fieber » |
| Chute évitée | « fast gestürzt » n'est pas une chute |
| « dabei » | hors d'Aktuelle Beschwerden, « dabei » renvoie au sujet de la question |
| `SONDE_DIMENSION` | les 10 sondes qui demandent une dimension (mesure, effort, localisation, Festes / Flüssiges) restent posées |
| `PRECISION` | une question qui demande « wie viel / seit wann / wo genau » reste posée si seule la présence est dite |

### Ce que r5 ne touche jamais

- les questions du cas ;
- les signes de risque (`RISIKO_SIGNES`) ;
- un signe exigé par le profil, s'il n'est porté que par les Personalia (même périmètre que la mesure).

### Modifications de banque (dans `anamneseChapters.ts`, pas dans le contenu des cas)

- « Wechseln sich Durchfall und Verstopfung ab? »
- « Seit wann husten Sie? »
- `fach-uro-fieber` découpée en `parts`.

`phrases.ts` accepte désormais en ouverture `lassen`, `bleiben`, `wechseln` et « ab + interrogatif ».

### Un seul code pour les trois modes

`ctxDuCas.reponse` lit `antworten` et `frageAntworten`, les mêmes que le patient simulé, le simulant et l'amorce IA. Le guide médecin (`AnamneseGuide`, `ImmersiveMode`) lit `playedTrame`.

## 3. Avant / après

### Ensemble

| | Avant (sans r5) | Après |
|---|---|---|
| Constats banque | 369 | **122** |
| Cas touchés | 114 | 73 |
| Cas ramenés à 0 | — | 41 |

- La lecture ne compte plus un signe **porté** (sans être demandé) : avec l'ancienne lecture, on aurait 144.
- `PLAFOND_BANQUE` passe de 369 à **122**.
- Le relevé des cas Q4 passe de 84 à 20 lignes.
- 165 questions de banque sont touchées : 49 retirées, 116 réduites ou ouvertes sur leurs précisions.

### Par signe

| Signe | Avant | Après |
|---|---|---|
| gewicht | 80 | 20 |
| fieber | 46 | 19 |
| uebelkeit | 38 | 6 |
| stuhl | 32 | 11 |
| miktion | 27 | 11 |
| schuettelfrost | 22 | 0 |
| schwitzen | 16 | 10 |
| sturz | 10 | 1 |
| nachtschweiss | 9 | 0 |
| atemnot | 9 | 8 |
| appetit | 9 | 1 |
| ausschlag | 5 | 0 |

### Pires cas

| Cas | Avant | Après |
|---|---|---|
| malaria | 9 | 3 |
| akutes-nierenversagen | 8 | 1 |
| covid19 | 8 | 2 |
| synkope | 7 | 1 |
| obstipation | 7 | 1 |
| niereninsuffizienz | 6 | 0 |
| akute-leukaemie | 6 | 0 |
| nierenkolik | 5 | 0 |
| morbus-crohn | 5 | 0 |

## 4. Exemples

| Cas | Réplique déjà jouée | Avant | Après |
|---|---|---|---|
| pankreatitis | « Mir ist sehr übel, ich habe mehrmals erbrochen » | « Leiden Sie an Übelkeit oder Erbrechen? » | « Wie lange nach dem Essen ist Ihnen übel? » + Wie oft / Wie viel / Wie sah das Erbrochene aus — Kaffeesatz, Blut? |
| commotio | motif « mir ist übel » | « War Ihnen dabei übel? » | retirée ; reste « Haben Sie außerdem noch andere Beschwerden bemerkt? » |
| rheumatoide-arthritis | « keinen Durchfall » | « … oder Durchfall bemerkt? » | « Haben Sie Fieber bemerkt? » + Augen, Geschwüre |
| nierenkolik | « Fieber und Schüttelfrost » | « Haben Sie Fieber oder Schüttelfrost? » | retirée |
| adnexitis | « brennt es beim Wasserlassen » | relance « Brennt oder schmerzt es beim Wasserlassen? » | relance retirée, la question reste |
| copd | « Vor einem halben Jahr waren es noch 81 » | « Gewichtsveränderungen? » | retirée |
| pneumothorax (faux positif) | « schlimmer beim Husten » | question de la toux | **gardée** |
| myokarditis (faux positif) | « vor drei Wochen Corona, Fieber » | veg-fieber | **gardée** |

## 5. Les 122 constats restants, par catégorie

| Constats | Catégorie | Raison |
|---|---|---|
| 58 | Mots-clés lus par la mesure, mais non dits pour le moteur | facteur, image, poids du jour, Kilometer, « Erbrechen » lu comme nausée, sueur nocturne lue comme Schweißausbrüche, « Stuhlgang » sans diarrhée, « dabei », passé ; angst et schlaf ne sont pas lus |
| 41 | Sondes de dimension | voulu |
| 9 | Poids exigé, dit aux seules Personalia | voir proposition P2 |
| 8 | Questions sans `parts` pour ce qui reste | fach-endo-temperatur, fach-derma-empfinden ×4, fach-pneumo-schmerz ×2, fach-onko-bsymptomatik « wie viel in welcher Zeit » (lymphom) |
| 5 | Répliques de questions du cas | elles ne peuvent pas porter le signe : l'identité d'une question du cas est son objet |
| 1 | Antécédent | — |

## 6. Aucun signe d'alarme perdu

`coherenceBanque.test.ts` (18 tests) vérifie sur les 130 cas :
- les signes cherchés sont les **mêmes avec et sans r5** : aucun signe ne quitte la trame ;
- chaque signe perdu par une question est dit par une réplique jouée **avant** elle, et porté.

Autres propriétés vérifiées :
- r5 est pure et idempotente (INV-86) et rend ses écarts complets (INV-87).

Preuves complémentaires :
- **TDD.** 7 tests sur 11 étaient rouges avant le code.
- **Mutations.** Six mutations du moteur ont été tuées : r5 désactivée, sans porteur, sans filtre du passé, sans polarité, sans garde de dimension, sans garde de précision.

## 7. Codes de sortie

Les contrôles ont tourné sur `df1c45fe`. Le merge `a11e34cc` n'ajoute que de la documentation ; `checkCoherence`, `checkBudgetFloor` et `checkPlayedTrame` ont été relancés dessus.

| Contrôle | Code |
|---|---|
| `npx tsc -b` | 0 |
| `npm test` (2042 tests) | 0 |
| `npm run test:c6` (212 tests) | 0 |
| `npm run build` | 0 |
| les 23 `scripts/check*.mjs` du job `contrats`, dont `checkCoherence` sur tous les cas, avec `checkTermRegister --require-all` et `evalDoctopus --dry` | 0 |
| les 17 `node --test`, dont `checkProbeCoverage.test.mjs` lancé seul | 0 |
| `checkBudgetFloor.mjs origin/main` | 0 |
| `git merge-tree` contre origin/main, feat/s3-q9-und, feat/s3-petits-contenus, feat/s3-fw-plancher-r | 0 |

- **Budgets.** Aucun fixture n'est touché et aucun `--bless` n'a été passé : la mesure de cohérence est au plancher sur tous les compteurs.
- **Fusions à blanc.** Avec petits-contenus et avec fw-plancher-r, les tests Banque, le gel de la trame, le plafond et `checkCoherence` restent verts (code 0).
- **Harnais de mutations.** `parcours-mutations.mjs` ne couvre pas le moteur ; d'où les mutations manuelles du § 6.
- **Passe C6 de 5 jours.** `parcours-candidat.mjs --days 5` sort en **code 2** (harnais en défaut). Message : « Supabase local injoignable ou fonction « content » froide (supabase functions serve ?) ». Supabase local tourne, mais `edge_runtime` est arrêté. Rien n'a été démarré, conformément au brief.

## 8. Points à trancher

- **P1 — contrat (hors périmètre).** Inscrire r5 dans ADR-0023 et `frage-atomique.md` §10.4 : la règle, le porteur et `porte`, `SONDE_DIMENSION`, `HORS_ENTRETIEN`. Je propose ce changement, je ne l'ai pas écrit.
- **P2 — mesure (hors périmètre).** `coherenceMesure.mjs` ignore les Personalia (`ECARTE`) quand il cherche les signes exigés. S'il comptait un porteur des Personalia, r5 pourrait retirer 9 questions de poids de plus.
- **P3 — banque.** Découper en `parts` `fach-endo-temperatur`, `fach-derma-empfinden` et `fach-pneumo-schmerz` : 8 constats.
- **Relecture de langue conseillée** sur les relances devenues des questions : « Seit wann haben Sie Fieber? », « Wo genau — vorne in der Harnröhre …? », et sur les deux relances de banque reformulées.

## Non vérifié

- La vérification à deux onglets (médecin et simulant) dans un navigateur headless n'a pas été faite. Le guide lit `playedTrame`, couvert par les tests unitaires, et l'écran du simulant ne lit que la fiche. Aucune mesure n'a été prise dans le DOM de l'app.
- ~~Aucune revue clinique formelle des 165 décisions~~ : la revue clinique les a relues toutes (§ 9). Sa passe fixeur n'a pas été relue par elle.
- La passe C6 de 5 jours (harnais en code 2, fonction `content` locale sans réponse).

## 9. Passe fixeur de la revue clinique (7 oct. 2026)

La revue clinique a relu les 165 décisions de r5 : aucun P0, aucun signe d'alarme perdu, 2 P1 et 7 P2. Le sommet relu était `4771218e` (ADR-0023 et `frage-atomique.md` §10.4 amendés par l'architecte, INV-92). Cette section **prime** sur les précédentes : les chiffres à jour sont ici.

### 9.1 Corrections

Chaque correction a un test de `coherenceBanque.test.ts` (« passe fixeur ») qui échouait avant elle : 11 rouges, puis 28 verts sur 28. La garde (b) de la règle des auteurs est un cliquet, vert dès l'origine.

| Point | Correction | Où |
|---|---|---|
| **P1-1** appendizitis | Une phrase hésitante (« ich glaube », « wohl », « vielleicht », « vermutlich ») ne dit pas `fieber` ; « fiebrig / heiß » n'étaient déjà pas lus. `PRECISION` lit « gemessen » : la question de la mesure de `veg-fieber` reste posée quand la fièvre n'est dite que présente (la mesure n'est pas la présence) | `symptoms.ts` (`DOUTE`), `coherence.ts` (`PRECISION`) |
| **P1-2** tia | `PASSE` lit `vorher`, `davor`, `zuvor` : « Gestürzt … habe ich mich vorher nicht » ne dit plus les chutes des attaques ; « Sind Sie schon gestürzt? » revient | `symptoms.ts` |
| **P2-1** nhl | Ce qui suit une didascalie conditionnelle « (Wenn … gefragt …) » ou « (auf Nachfrage) » n'est pas lu : la quantification du critère B (« Wie viele Kilo …? In welchem Zeitraum? ») revient | `symptoms.ts` (`SUR_DEMANDE`) |
| **P2-2** lymphom, bronchialkarzinom | `PRECISION` lit « so stark, dass » : la question du Wäschewechsel reste posée (part, ou relance qui ne sort pas) quand le patient dit seulement qu'il transpire la nuit | `coherence.ts` |
| **P2-3** nierenkolik | La part `fieber` de `fach-uro-fieber` reçoit deux relances : « Falls ja: Wie hoch war das Fieber? » et « Falls ja: Seit wann haben Sie Fieber? ». Elles sont atomiques : la forme proposée, « Wie hoch …, und seit wann? », dépassait le budget d'atomicité (règle A2, `checkQuestionAtomicity` en code 1). Nierenkolik : « Wie hoch war das Fieber? » + « Seit wann haben Sie Fieber? » | `anamneseChapters.ts` |
| **P2-4** pneumonie | `lireReponse` dit si un « seit … » est dans la proposition du signe ; alors « Seit wann …? » ne s'ouvre pas, et s'il ne reste rien à préciser, la part sort. Pneumonie : « Ist der Husten trocken oder mit Auswurf? » ouvre | `symptoms.ts`, `coherence.ts` |
| **P2-5** pankreatitis, hodentorsion, migraene | Relances réordonnées : `fach-gastro-uebelkeit` (part `erbrechen` en tête, Kaffeesatz / Blut d'abord), `veg-uebelkeit` (« Wie oft », l'aspect, puis « Seit wann »). Pankreatitis ouvre sur « Wie sah das Erbrochene aus — wie Kaffeesatz, mit Blut? » ; hodentorsion sur « Wie oft haben Sie sich übergeben? » | `anamneseChapters.ts` |
| **P2-6** aortendissektion | L'inversion « Schlecht war mir » dit la nausée : `veg-uebelkeit` est retirée | `symptoms.ts` |
| **Langue** | « Falls ja: Wo genau spüren Sie das Brennen — vorne in der Harnröhre oder eher tief im Unterbauch? » | `anamneseChapters.ts` |
| **Règle des auteurs** | (a) Dans les 130 trames, toute question ouverte par r5 se pose seule (`promouvable`, exporté). (b) Cliquet : 50 relances de précision de la banque, sous une part ou une question mono-signe, ne se posent pas seules ; leur nombre ne remonte pas | `coherenceBanque.test.ts` |
| Idempotence | Une relance de précision demandée (« so stark, dass ») ne sort pas à la seconde passe (INV-86 l'a relevé) | `coherence.ts` |

### 9.2 Écart motivé (P1-2) : la réplique d'`akt-ausloeser` reste lue

La consigne demandait aussi de ne jamais lire `sturz` / `unfallhergang` dans la réplique d'`akt-ausloeser`. Je ne l'ai pas fait. `PASSE` suffit à corriger tia. Exclure `akt-ausloeser` ferait revenir « Hatten Sie in letzter Zeit einen Unfall oder einen Sturz? » juste après « Kein Sturz, kein Unfall » dans **6 cas** :
- spinalkanalstenose, hws-diskusprolaps, coxarthrose, hueftkopfnekrose : `akt-ausloeser` est la seule réplique en cause ;
- karpaltunnel, gonarthrose : en partie seulement.

Ces 6 cas, la revue les a jugés justes (« la série des `fach-ortho-mechanismus` »). **À trancher** si l'exclusion reste voulue.

### 9.3 Mesure après la passe

| | Avant (sans r5) | Premier passage | Après la passe fixeur |
|---|---|---|---|
| Constats banque | 369 | 122 | **131** |
| Cas touchés | 114 | 73 | **77** |
| Cas ramenés à 0 | — | 41 | **37** |
| Questions de banque touchées | — | 165 | **160** (49 retirées, 111 réduites ou ouvertes) |

- `PLAFOND_BANQUE` : 122 → **131**. C'est une hausse écrite à la main, voulue par la revue :
  - 8 questions « gemessen? » de `veg-fieber` gardées quand la fièvre n'est dite que présente (divertikulitis, cholezystitis, adnexitis ×3, perikarditis ×3) ;
  - 1 chute de tia.
- Avec l'ancienne lecture (signe porté compté), on aurait 153.
- Par signe :
  - fieber passe de 19 à 28 (questions de mesure gardées) ;
  - uebelkeit de 6 à 5 ;
  - sturz de 1 à 2 ;
  - les autres signes sont inchangés.

Les 131 constats restants, par catégorie :

| Constats | Catégorie |
|---|---|
| 59 | mots-clés que la lecture du moteur ne tient pas pour dits ; dont la fièvre supposée d'appendizitis et la chute « vorher » de tia |
| 41 | sondes de dimension |
| 16 | questions gardées entières ou demandant une précision : 8 « gemessen? », 8 sans `parts` pour ce qui reste |
| 9 | poids exigé, dit aux seules Personalia |
| 5 | répliques de questions du cas |
| 1 | antécédent |

### 9.4 Notes de suivi, sans traitement

- **P2-7.** Sous une question réduite, le patient joue sa réplique entière : magenkarzinom (« Wie sind Ihr Appetit und Ihr Durst? » reçoit « Ja, zwölf Kilo hab ich abgenommen … ») et lymphom (« Ja, alles: … »). C'est le revers de la garantie « rien ne se perd ». Suivi : lot de contenu ou simulant.
- **Contradiction de contenu dans tia.** Le nombre de chutes diffère selon la réplique :
  - « einmal bin ich sogar gestürzt » (`akt-neuro-lage`) ;
  - « Zweimal bin ich deshalb gestürzt » (`fach-neuro-koordination`) ;
  - « vor acht Tagen gestürzt » (`fam-wohnen`).

  Il faut fixer un seul nombre. Suivi : lot de contenu ; je n'y ai pas touché.
- **Point P1 du § 8.** Il est fait : l'architecte a amendé ADR-0023 et `frage-atomique.md` (INV-92).

### 9.5 Codes de sortie (sommet `38d30aaa`, après le merge de #103)

| Contrôle | Code |
|---|---|
| `npx tsc -b` | 0 |
| `npm test` (2052 tests) | 0 |
| `npm run build` | 0 |
| les 23 `scripts/check*.mjs` du job `contrats`, dont `checkCoherence` sur tous les cas (au plancher), `checkQuestionAtomicity`, `checkTermRegister --require-all`, `evalDoctopus --dry` | 0 |
| les 17 `node --test`, dont `checkProbeCoverage.test.mjs` lancé seul | 0 |
| `checkBudgetFloor.mjs origin/main` | 0 |
| `npm run test:c6` (212 tests, 3e passage, charge machine basse) | 0 |
| passe C6 de 5 jours (`parcours-candidat.mjs --days 5`) | **2** (harnais) |

- **Budgets.** Aucun fixture n'est touché, aucun `--bless`.
- **`test:c6`.** Les deux premiers passages, sous une charge machine de 30 à 72 (autres lots en parallèle), ont échoué sur des minuteries :
  - INV-E13 seul (examen), qui passe seul (29 / 29) ;
  - puis six délais d'environ 900 s.
  Le troisième, à charge basse, passe : 212 / 212, code 0.
- **Passe C6 de 5 jours : code 2, deux fois.** Message du harnais : « fonction « content » froide ». La fonction `content` ne répond pas à `?since=0` en 15 s, ni en 20 s, mesuré par `curl` avec la clé anon locale. Je n'ai rien démarré ni relancé.
