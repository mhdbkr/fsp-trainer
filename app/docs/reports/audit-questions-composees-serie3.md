# Audit — questions composées, doublons de sondes, ruptures d'ordre (série 3)

> Mesures par script jetable : tokenizer TS sur 13 fichiers de contenu (13,0 Mo,
> 53 286 chaînes) **plus** chargement réel des 130 cas via `app/scripts/loadCases.mjs`
> (esbuild). Le doublon et la rupture d'ordre n'existent que dans le **parcours joué**,
> pas dans la source — d'où la double passe.

## Totaux

```
Corpus : 13,0 Mo · 53 286 chaînes · 15 591 énoncés « à dire » (hors notes FR/fiches)

A. plus d'un « ? » dans une réplique ......... 1 059
B. un « ? » + énumération ≥ 3 items .........   322
C. alternative collée (en question) .........    75   (+379 en déclaratif, non bloquant)
Énoncés touchés A|B|C ....................... 1 399 / 15 591  (9,0 %)
Textes DISTINCTS parmi eux .................. 1 293  (ratio 1,08)

Doublons de sondes (concept × cas) .......... 438 bruts
  neutralisés par PROBE_SUCHT ...............  110
  ÉCHAPPENT au garde-fou ....................  270  (2,1/cas, sur 104/130 cas)
  dont hors des 16 symptômes de symptoms.ts ..  107

Ruptures d'ordre — Tier A strict .............   3  (dont le Glukosesensor cité par la direction)
                   Tier B ....................  29 / 23 cas
```

**Le ratio 1,08 est le chiffre stratégique** : 1 293 textes distincts pour 1 399
occurrences. **Il n'existe aucun gabarit partagé** dont la correction se propagerait.
Chaque correction est une correction.

## 1. Classes d'énoncés

Mélanger fausse tout — trois classes séparées :

| Classe | Contenu | n |
|---|---|---|
| **Q** — à dire à l'oral | sondes, guide anamnèse, questions du cas, questions Oberarzt | 3 926 |
| **D** — déclaratif | Muster, Aufklärung, réponses patient, guides Arztbrief/Vorstellung | 11 665 |
| **N** — hors périmètre | `persona` FR, `pruefungsfallen`, `examinerSheet` | 22 554 |

Filtrage indispensable : exclusion des chaînes françaises (14 506 `persona`/`rollenskript`),
sinon elles polluent tous les compteurs.

## 2. Les trois règles du détecteur

**A** — `(text.match(/\?/g)||[]).length >= 2`. Aucune heuristique : deux points
d'interrogation = deux questions.

**B** — un seul « ? » mais ≥ 3 items cliniques hétérogènes. La charge mnémonique ne vient
pas de la diversité d'appareils mais du **nombre d'entités à retenir dans une respiration**.
Algorithme : retrait du préfixe d'étiquette (`Begleitbeschwerden — `), troncature au premier
« ? », découpe sur `, / und / oder / bzw. / sowie`, conservation des segments de ≤ 6 mots
contenant un substantif capitalisé ≥ 4 lettres hors stoplist, dédoublonnage par préfixe de
5 caractères (`Kopfschmerzen`/`Kopfweh` = 1 item). Seuil ≥ 3.

**C** — alternative collée dépendante du cas, sur les seuls énoncés interrogatifs :
`art` (deux membres articulés), `body` (deux termes anatomiques à ≤ 22 car. de `oder`),
`slash` (`Bein/den Arm`). Le motif `Xxx- oder yyy` (ellipse de composé) est compté à part
(`C'`) : c'est de l'allemand correct en déclaratif.

## 3. Distribution — le défaut est concentré, pas diffus

| Type | classe | n | A | B | C | % A\|B\|C |
|---|---|---:|---:|---:|---:|---:|
| `sondes` (`anamneseProbes.ts`) | Q | 227 | **136** | 43 | 16 | **79,3 %** |
| `guide-anamnese` (`anamneseChapters.ts`) | Q | 496 | **199** | 71 | 22 | **55,0 %** |
| `case-questions` (`caseSpecificQuestions`) | Q | 877 | **214** | **163** | 35 | **44,5 %** |
| `oberarzt` (`examinerQuestions`) | Q | 2 074 | **471** | 32 | 1 | 24,3 % |
| `guide-seedGuides` | Q | 163 | 23 | 3 | 0 | 16,0 % |
| `patient-frage` | Q | 36 | 5 | 4 | 1 | 25,0 % |
| `muster` (`caseMuster.ts`) | D | 2 780 | 0 | 0 | 0 | **0,0 %** (127 `C'`) |
| `aufklaerung` | D | 326 | 0 | 0 | 0 | **0,0 %** (9 `C'`) |
| `patient-antworten` | D | 6 615 | 8 | 5 | 0 | 0,2 % |
| `patient-negativ` | D | 1 713 | 0 | 0 | 0 | 0,0 % (193 `C'`) |

**Lecture.** 3 705 énoncés portent 1 386 des 1 399 occurrences : le défaut est **dans
l'oral posé par le candidat**. Les Muster et Aufklärungen sont **propres** au sens A/B — ils
sont déclaratifs ; leurs `C'` sont des ellipses de composés correctes (`Nacht- oder
Ruheschmerz`), **à ne pas toucher**.

### Profil fin des 229 sondes
```
nombre de « ? » par sonde : {1: 92, 2: 125, 3: 11, 4: 1}
→ 137 sondes sur 229 (60 %) posent au moins deux questions

BASE_PROBES ............... 24/36  (67 %)
FRAUEN_PROBES ..............  3/4  (75 %)
AKTUELL_VARIANT_PROBES .... 27/35  (77 %)   ← le pire bloc
FACH_PROBES ............... 83/154 (54 %)

Fachanamnesen : Angiologie 7/8 · Gastro 6/7 · Kardio 7/10 · Urologie 7/10
                Infektio 5/8 · Psychiatrie 6/10 · Chirurgie 4/7 · Gynäko 5/9
```
`AKTUELL_VARIANT_PROBES` à 77 % est le point le plus sensible : ce sont les sondes du
**motif de consultation**, les premières posées, celles qu'on récite sous stress.

### Les 10 alternatives collées des sondes (exhaustif)
```
L118 fach-kardio-ausstrahlung  « Strahlen sie in den linken Arm, den Hals, den Unterkiefer oder den Rücken aus? »
L119 fach-kardio-atem          « Hängen die Beschwerden mit dem Atmen, dem Essen oder der Körperlage zusammen? »
L181 fach-uro-flanke           « Haben Sie Schmerzen in der Flanke oder im Rücken? Strahlen sie in die Leiste aus? »
L194 fach-ortho-ausstrahlung   « Strahlen die Schmerzen aus — zum Beispiel ins Bein oder in den Arm? Bis wohin genau? »
L195 fach-ortho-sensomotorik   « Haben Sie Kribbeln, Taubheitsgefühl oder Kraftverlust in Arm oder Bein bemerkt? »
L198 fach-ortho-durchblutung   « …dass die Hand oder der Fuß kälter, blasser oder bläulich geworden ist? »   ← cité par la direction
L201 fach-ortho-belastung      « Können Sie das Bein/den Arm noch belasten? … was hilft oder verschlimmert? »  ← cité par la direction
L217 fach-neuro-kraft          « Ist ein Arm oder Bein schwächer geworden? … »
L220 fach-neuro-blase          « Haben Sie Probleme mit der Blase oder dem Stuhlgang — … »
L287 fach-gyn-eingriffe        « Wurden Sie schon an der Gebärmutter oder den Eierstöcken operiert? … »
```
**Distinction que le validateur doit tenir** : `fach-kardio-ausstrahlung` (l'irradiation —
l'énumération **est** la question, elle est clinique et légitime) contre
`fach-ortho-durchblutung` (le cas **sait** si c'est la main ou le pied — trou de rédaction).
Seuls `fach-ortho-*` et `fach-neuro-kraft` relèvent du second groupe.

### Les deux exemples de la direction, retrouvés mécaniquement
- `anamneseChapters.ts:1083` — `followUp: ['Trugen Sie einen Helm? Sind Sie dabei ohnmächtig
  geworden? Haben Sie sich noch woanders verletzt?']` → A, 3 « ? ». **Un `followUp` est le
  pire endroit possible** : c'est la relance, dite quand le patient a déjà répondu.
- `anamneseChapters.ts:246` — `Begleitbeschwerden — Hatten Sie dabei Kopfschmerzen, Übelkeit,
  Doppelbilder, Bewusstlosigkeit oder ein Zucken?` → B, 5 items.

### Pires occurrences (extrait)
| type | chemin:ligne | ? | items | texte |
|---|---|---:|---:|---|
| sondes | `anamneseProbes.ts:107` | **4** | 2 | « Leiden Sie an Übelkeit oder Erbrechen? Wie sah es aus (wie Kaffeesatz, mit Blut)? Wie lange nach dem Essen? Geht es Ihnen danach besser? » |
| oberarzt | `seedCases.ts:9150` | 4 | 1 | « Was macht der Patient beruflich? Ist er im Ruhestand? Wo hat er früher gearbeitet? Was bedeutet „Senioren“? » |
| guide | `seedGuides.ts:55` | 4 | 1 | « Trinken Sie Alkohol? Welche Getränke (Bier, Wein, Schnaps)? Täglich oder zu Anlässen? Wie viel pro Woche? » |
| guide | `seedGuides.ts:63` | 4 | 2 | « Wohnung oder Haus? Welche Etage? Aufzug? Haustiere? » |
| sondes | `anamneseProbes.ts:369` | 1 | **7** | « Was genau ist Ihnen aufgefallen: Knoten, Hautveränderung, blaue Flecken, Blutung, Schlucken, Stuhl, Gelbfärbung? » |
| case-q | `seedCases.ts:42722` | 1 | **6** | « Nehmen Sie Medikamente, die das Gewicht oder den Zucker beeinflussen können — Kortison, Tabletten gegen seelische Beschwerden, Wassertabletten oder Betablocker? » |
| sondes | `anamneseProbes.ts:211` | 1 | **6** | « Haben Sie Fieber, Augenentzündungen, Mund- oder Genitalgeschwüre, Durchfall oder eine Bindehautentzündung bemerkt? » |
| sondes | `anamneseProbes.ts:187` | 3 | 0 | « Darf ich Ihnen ein paar Fragen zu Ihrer Partnerschaft stellen…? Wie verhüten Sie, und wie schützen Sie sich…? Hatten Sie schon einmal eine Geschlechtskrankheit? » |

## 4. Doublons de sondes

### 4.1 Où ils naissent
Trois couches, le doublon naît à leur jonction :
1. **`anamneseProbes.ts`** — 229 sondes (`{id, kapitel, frage, deepens?, redundant?}`) en
   4 blocs ; `PROBE_ORDER` fige l'ordre, `kapitel` fige le chapitre.
2. **`lib/rolePlay.ts`** — `buildRollenskript(sheet, caseQuestions)` : source primaire
   `patientSheet.antworten` (~48 entrées/cas), puis `frageAntworten` classés par
   `classifyLine()` (8 regex), puis `negativeFindings`. **Une réponse dont l'`id` n'est pas
   reconnu tombe dans `'aktuell'` par défaut.**
3. **`anamneseChapters.ts`** — assemble les `Phrase`, **insère la Fachanamnese après
   « Aktuelle Beschwerden »**, applique `dedupeBySymptom` (`guides/symptoms.ts`).
   `lib/caseQuestions.ts` (6 lignes) normalise : une `caseSpecificQuestion` en chaîne nue
   atterrit dans `'aktuell'`.

**La cause.** Les 154 `FACH_PROBES` ont été rédigées comme une anamnèse spécialisée
*autonome* — elles redemandent ce que la trame générale a déjà demandé. Le projet en est
conscient (`deepens` sur 29 sondes, `redundant` sur 3, et `checkProbeOverlap.mjs`). Mais
**`checkProbeOverlap` compare des `frage` par similarité lexicale sonde-à-sonde, dans la
source** — pas des concepts dans le parcours joué. Le second garde-fou
(`dedupeBySymptom` + `checkTrameSymptoms.mjs`) travaille bien au niveau du parcours, mais sur
une carte `PROBE_SUCHT` qui ne couvre que **48 sondes sur 229 et 16 symptômes**. Tout le
reste passe.

### 4.2 Mesure
```
cas avec ≥ 1 doublon non marqué ................ 116 / 130
doublons bruts (concept × cas) ................. 438   (3,4/cas)
  neutralisés au runtime par PROBE_SUCHT .......  110
  ÉCHAPPENT ....................................  270   (2,1/cas, 104 cas)
    dont hors des 16 symptômes de symptoms.ts ...  107

Concepts qui échappent : blutung 44 · stuhl 36 · oedeme 21 · fieber 20 · husten 12
  ausschlag 11 · atemnot 11 · juckreiz 11 · schwaeche 10 · taubheit 10 · miktion 9
  sturz 8 · schwindel 8 · bewusstlos 8 · stimmung 7 · suizid 7 · reise 7 …

Paires de chapitres : aktuell→fach 165 · aktuell→vegetativ 156 · vegetativ→fach 90
  (trois paires = 411 des 438)
```
`blutung` (44) et `stuhl` (36) sont pourtant **dans** `PROBE_SUCHT` : ils échappent parce
que les **questions propres au cas** ne déclarent ni `sucht` ni `relu`.

### 4.3 Le cas cité par la direction
`case-migraene` :
```
familie-sozial / (case) « Gibt es in Ihrer Familie auch jemanden mit ähnlichen Kopfschmerzen? »
fach / fach-neuro-kopfschmerz « Haben Sie Kopfschmerzen? Wo genau — einseitig oder beidseitig? … »
```
**`kopfschmerz` n'existe pas dans le type `Symptom`** de `symptoms.ts` — donc ni
`dedupeBySymptom` ni `checkTrameSymptoms` ne peuvent le voir. Le doublon
`Begleitbeschwerden → Fachanamnese` signalé est la même mécanique (`anamneseChapters.ts:246`
`akt-begleit` puis `fach-neuro-kopfschmerz`) : **structurellement invisible au garde-fou
actuel**.

### 4.4 Dix doublons hors lexique actuel
```
case-depression      stimmung    aktuell + fach   akt-psych-stimmung / akt-psych-antrieb / fach-psych-stimmung
case-depression      suizid      aktuell + fach   akt-psych-sicherheit / fach-psych-suizid   ← la question la plus délicate de l'entretien, posée deux fois
case-lyme            ausschlag   aktuell + fach   akt-infekt-herd / fach-infekt-haut
case-multiple-skl.   taubheit    aktuell ×3       akt-neuro-ausfall / akt-nerven-art / (case)  ← trois fois le même, dans le même chapitre
case-multiple-skl.   schwaeche   aktuell + fach   akt-neuro-ausfall / akt-nerven-art / fach-neuro-kraft
case-multiple-skl.   sehstoerung vorerk. + fach   (case) / fach-neuro-sehen
case-schlaganfall    taubheit    aktuell + fach   akt-neuro-ausfall / fach-neuro-sensibilitaet / fach-neuro-aura
case-schlaganfall    schwaeche   aktuell + fach   akt-neuro-ausfall / fach-neuro-kraft
case-schlaganfall    sturz       aktuell + fach   (case) / fach-neuro-koordination
case-bandscheiben…   schwaeche   aktuell + fach   (case) / fach-ortho-sensomotorik
```

## 5. Ruptures d'ordre clinique

### 5.1 La règle mécanique
Le symptôme n'est pas la bonne unité : il faut détecter une **présupposition non satisfaite**.

> Dans une question du parcours, tout **syntagme nominal défini ou possessif**
> (`Ihr|Ihre|Ihrem|Ihren|Ihrer|der|die|das|dem|den` + substantif capitalisé) présuppose que
> son référent est déjà introduit. Si le lemme **n'apparaît nulle part plus tôt dans le
> parcours** (question posée ou réponse obtenue) **et** apparaît **plus tard** (réponse
> ultérieure, ou champ `vorerkrankungen`/`medikamente`/`voroperationen`), la question
> présuppose une information non encore recueillie.

Parcours trié par index de chapitre puis `PROBE_ORDER` ; `intro` alimenté après chaque tour
par les substantifs de la question **et** de la réponse ; lemmatisation par troncature à
7 caractères ; filtrage par fréquence documentaire (`df`) sur les 130 cas.

| Seuil | Définition | Occ. | Cas | Précision |
|---|---|---:|---:|---|
| **Tier A** | `Ihr…` + substantif ≥ 10 car. + `df ≤ 3` | **3** | 3 | 3/3 |
| **Tier B** | substantif ≥ 8 car. + `df ≤ 8` | **29** | 23 | ~2/3 |
| brut | tout SN défini, `df ≤ 13` | 58 | 40 | ~1/2 |

### 5.2 Tier A — les trois cas nets
```
case-commotio / aktuell — « Glukosesensor » (df=1, fait déclaré dans vorerkrankungen)
  « Wann haben Sie zuletzt gegessen, und was hat Ihr Glukosesensor kurz vor dem Unfall angezeigt? »
  seedCases.ts:31370 — le diabète de type 1 (Insulinpumpe + Glukosesensor) n'est déclaré
  qu'en seedCases.ts:31094, chapitre « vorerkrankungen », DEUX CHAPITRES PLUS LOIN.
  → exactement l'exemple de la direction, retrouvé mécaniquement.

case-hypothyreose / aktuell — « Augenbrauen » (df=1)
  « Verlieren Sie vermehrt Haare, und sind Ihre Augenbrauen außen dünner geworden? »

case-ileus / aktuell — « Stuhlgewohnheit » (df=1)
  « Haben Sie Blut oder schwarzen, teerartigen Stuhl bemerkt, und hat sich Ihre
    Stuhlgewohnheit in den letzten Monaten verändert? »
```

### 5.3 Tier B — extraits
```
case-pyelonephritis / vorerkrankungen — « Harnwege » (df=2)
case-diabetes / vorerkrankungen — « Blutzucker » (df=6, fait en fiche)
case-nierenkolik / fach — « Harnstrahl » (df=2)
case-hypothyreose / vorerkrankungen — « Entbindungen » (df=6)
case-demenz / aktuell — « Vergesslichkeit » (df=2)
case-schenkelhalsfraktur / familie-sozial — « Dämmerung » (df=1)
case-hepatitis-b / vorerkrankungen — « Impfpass » (df=8)
```
Faux positifs typiques du Tier B : `Ihre Stimmung` (thématisé par le motif de consultation),
`die Lunge`, `den Zehen`, `die Belastung` — génériques que la troncature ne distingue pas.

**Ordre de grandeur à retenir : ~30, pas ~500.** La rupture d'ordre est **rare et
ponctuelle** ; le défaut de masse est la question composée (1 399) et le doublon (270).
38/58 des candidats bruts sont dans `aktuell` — logique, c'est le premier chapitre
substantiel. Les 11 en `vorerkrankungen` sont plus intéressants : ils présupposent un fait
de la fiche que le patient n'a pas encore donné.

## 6. Recommandation

### 6.1 Découpage automatique : **aucun contenu ne peut être découpé par script**
Un split naïf sur `?` produit de l'allemand faux, dans quatre situations toutes présentes :
- **préfixe d'étiquette** (`Begleitbeschwerden — Hatten Sie dabei…?`) : il ne se duplique pas ;
- **subordonnée portée par la première question** (`…wegen des Darms, der Lunge oder der
  Gelenke? Wie viel und wie lange?`, `seedCases.ts:51694`) : la seconde perd son référent ;
- **ellipse de composé** (`Schlaf- oder Beruhigungsmittel`, `Bein/den Arm`) : couper produit
  `Schlaf-` orphelin ;
- **relance conditionnelle** (`followUp`) : la scinder change la logique d'affichage, pas
  seulement le texte.

Plus le ratio 1,08 : **pas de gabarit partagé**, donc pas de propagation.

### 6.2 Semi-automatisable — les 322 énumérations (règle B)
Le mécanisme existe déjà : `symptoms.ts` supporte `parts` (« si une partie seulement a été
cherchée, la question se réduit à ce qui reste »). Un script peut **proposer** la découpe
(le découpage syntaxique sur `, / oder` est fiable ici : les items sont des substantifs nus),
un humain valide. Volume : 322 énoncés, dont 163 dans `caseSpecificQuestions` et 71 dans
`anamneseChapters.ts`. **~70 % du travail mécanique, 100 % de la relecture reste humaine.**

### 6.3 Main humaine obligatoire — par priorité
| Lot | Volume | Pourquoi humain |
|---|---:|---|
| **L1** `AKTUELL_VARIANT_PROBES` > 1 « ? » | 27 sondes | Motif de consultation, premières questions ; 77 % du bloc. Découper change l'OPQRST. |
| **L2** `BASE_PROBES` + `FRAUEN_PROBES` > 1 « ? » | 27 sondes | Tronc commun joué sur 130 cas ; chaque correction se propage partout. |
| **L3** `followUp` > 1 « ? » | extrait des 199 | Une relance = une question, par définition. |
| **L4** alternatives dépendantes du cas | 7 sondes | Exigent une variante par région anatomique = décision clinique. **Ne PAS toucher** `fach-kardio-ausstrahlung` / `fach-uro-flanke` : l'énumération y **est** la question. |
| **L5** `examinerQuestions` > 1 « ? » | 471 | Question Arzt-Arzt : l'Oberarzt enchaîne réellement. Décider au cas par cas : salve authentique ou empilement de rédaction. |
| **L6** 270 doublons échappés | 104 cas | Chaque doublon = arbitrage `deepens`/`redundant`/`sucht`/`relu`/suppression. Clinique. |
| **L7** 3 ruptures Tier A | 3 cas | Réécriture ou déplacement de chapitre. Une heure. |

**À ne pas toucher** : `caseMuster.ts` (0 défaut A/B ; ses 127 `C'` sont du bon allemand
écrit), `seedAufklaerungen.ts` (0/9 idem), `arztbriefChapters.ts`, `vorstellungChapters.ts`,
`musterModels.ts`, `musterBogen.ts`.

### 6.4 Le validateur CI
Un seul script nouveau, `app/scripts/checkQuestionAtomicity.mjs`, dans le job `contrats`
après `checkTrameSymptoms.mjs` :
```
Règle 1 — atomicité. Toute réplique orale porte AU PLUS un « ? ».
  Exception nominative : liste ALLOWED_COMPOSED d'ids relue par la direction, chaque
  entrée avec sa raison écrite. Le script échoue si la liste grossit.

Règle 2 — énumération. Une question à un « ? » n'énumère pas plus de 3 items cliniques
  distincts. Au-delà : `parts` obligatoire. Un followUp est plafonné à 2 items.

Règle 3 — alternative dépendante du cas. Aucune question ne contient
  « <article> N oder <article> M » ni « N/den M » où N et M sont deux termes du lexique
  anatomique. L'énumération d'irradiation est explicitement exemptée (pas d'article
  répété sur chaque membre).

Règle 4 — budget dégressif. Compteur de référence dans
  app/scripts/fixtures/atomicity-budget.json ; le script ÉCHOUE si le total remonte.
  On part du plancher mesuré (A=1059, B=322, C=75) et on le fait baisser lot par lot.
  C'est le seul moyen d'introduire la règle sans bloquer les 130 cas existants.
```

Deux extensions aux validateurs existants, dans le même lot :
- **`guides/symptoms.ts`** — porter `Symptom` de 16 à ~36 concepts et compléter
  `PROBE_SUCHT` (48 sondes sur 229 déclarent aujourd'hui ce qu'elles cherchent).
  **Le levier à meilleur rendement de tout l'audit** : il rend visibles 107 des 270 doublons
  échappés, sans écrire un nouveau script.
- **`checkCaseQuestionChapters.mjs`** — exiger `sucht` ou `relu` sur toute
  `caseSpecificQuestion` citant un concept de la carte étendue. Ferme la voie principale par
  laquelle `blutung` (44) et `stuhl` (36) passent.
- **Rupture d'ordre** — **ne PAS en faire une porte bloquante** : 3 occurrences en Tier A,
  précision ~2/3 en Tier B ; le coût du faux positif dépasse le gain. Job informatif
  (`|| true`), à côté de `checkCaseCohesion.mjs` et `checkProbeOverlap.mjs`.

### 6.5 Ce que le détecteur ne voit pas
La règle B ne distingue pas une énumération *cliniquement légitime* (les 5 items d'un
dépistage B-Symptomatik) d'un empilement de rédaction — seule une relecture tranche. La
lemmatisation par troncature à 7 caractères confond des composés allemands proches. Le
détecteur C n'attrape pas une alternative portée par le contexte sans marqueur lexical
(`Ist es links oder ist es rechts schlimmer?`). Et rien ici ne mesure l'**oralisabilité
réelle** : une question courte peut rester imprononçable.
