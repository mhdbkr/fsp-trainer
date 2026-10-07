# Lot Banque (série 3, point 1c — FB3-A2) : r5, « rien de déjà dit »

Branche `feat/s3-banque`. Le lot est parti de `f6cbe864`. Avant tout push, il a été rebasé une fois sur `origin/main` @ `ff9b3491`, pour intégrer #102 (Q9, questions du cas). `origin/main` a ensuite été fusionné par un merge (`a11e34cc`), comme demandé par le coordinateur ; ce merge n'apportait que des commits de registre. Les commits sont faits fichier par fichier, sans trailer.

**Statut : DONE_WITH_CONCERNS.** Tous les contrôles passent au code de sortie (§ 7). Il reste deux réserves :
- La passe C6 de 5 jours n'a pas pu tourner : le harnais sort en code 2 (§ 7).
- Trois propositions sortent de mon périmètre (§ 8).

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
- Aucune revue clinique formelle des 165 décisions. Je les ai seulement relues dans l'audit avant / après.
- La passe C6 de 5 jours (harnais en code 2).
