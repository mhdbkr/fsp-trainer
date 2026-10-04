# Contrat — `Frage` : la question atomique

> Statut : proposé (P0 série 3) · Écrit par `lead-s3-contrats` · 30 sept. 2026
> Source mesurée : `app/docs/reports/audit-questions-composees-serie3.md`
> (13,0 Mo, 53 286 chaînes, 130 cas chargés via `loadCases.mjs`).
> Consommé par : C4 (contenu — questions atomiques), C2 (guide d'anamnèse).

---

## 0. Questions ouvertes — décisions de DIRECTION, non tranchées ici

| # | Question | Comportement provisoire opposable |
|---|---|---|
| **Q11** | Les **471 questions d'Oberarzt** à plus d'un « ? » (`examinerQuestions`) relèvent-elles de la règle d'atomicité ? Un senior *enchaîne* réellement ses questions : toutes les salves ne sont pas des fautes de rédaction. | `examinerQuestions` est **hors périmètre de la Règle 1** et **dans le budget** (§4). Le compteur les voit baisser si la direction les corrige ; la porte ne les bloque pas. |
| **Q12** | Contenu de `ALLOWED_COMPOSED` — la liste nominative des questions composées légitimes. | Liste **vide au départ**, hors les exemptions mécaniques de la Règle 3 (§3.3). Chaque entrée est ajoutée par la direction avec sa raison écrite ; le validateur échoue si la liste grossit sans raison. |
| **Q13** | Le guide d'anamnèse affiche-t-il une question à la fois avec relances repliées (*progressive disclosure*), ou la liste entière ? | Hors périmètre de ce contrat. Le type `Frage` **permet** les deux ; le rendu est une décision de C5/direction. |

---

## 1. Le type

```ts
export type FrageId = string;       // stable, littéral dans le source
export type KapitelId =
  | 'eroeffnung' | 'personalia' | 'aktuell' | 'fach' | 'vegetativ'
  | 'vorerkrankungen' | 'medikamente' | 'allergien' | 'noxen'
  | 'familie-sozial' | 'frauenanamnese' | 'abschluss';

export interface Frage {
  id: FrageId;
  text: string;            // UNE question, UN seul « ? »
  kapitel: KapitelId;      // où elle vit dans la trame
  braucht?: FrageId[];     // ce qui doit déjà avoir été demandé
  nachfragen?: Frage[];    // relances conditionnelles — l'arbre rendu visible
  variante?: VariantKey;   // résolu par le cas : Hand | Fuß, Bein | Arm…
  deckt: ProbeId[];        // contrat existant préservé
  sucht?: Symptom[];       // ce qu'elle CHERCHE (lexique §5)
  relu?: true;             // relue : elle cite un concept sans le chercher
}
```

Notes de modèle :

- `nachfragen` **est** la structure. Une question composée est le plus souvent
  un arbre aplati : « Trugen Sie einen Helm? Sind Sie ohnmächtig geworden? »
  n'est pas une question, c'est une ouverture suivie de deux relances
  conditionnelles (`anamneseChapters.ts:1083`).
- `nachfragen` est récursif mais **plafonné à une profondeur de 2**
  (question → relance → relance de relance). Au-delà, c'est un chapitre.
- `deckt` remplace rien : c'est le contrat sonde ↔ réponse déjà en place
  (`checkProbeCoverage`). **Découper une question sans découper la réponse
  casse ce contrat** — c'est la contrainte la plus dure du chantier C4.
- `variante` n'atteint jamais l'écran non résolu (Règle 5).

---

## 2. Le contrat sonde ↔ réponse

Règle opposable, et préalable à tout découpage :

> Toute `Frage` issue d'un découpage doit laisser `deckt` **exhaustivement
> couvert** : l'union des `deckt` des questions issues d'un découpage est égale
> au `deckt` de la question d'origine. Aucune `ProbeId` ne se perd, aucune ne se
> duplique.

Corollaire mesuré : si la question empile trois items, la fiche de rôle empile
trois réponses. Un découpage de question **sans** découpage de la réponse
correspondante fait échouer `checkProbeCoverage` — la porte existe déjà et elle
est la garantie que le chantier ne peut pas dériver.

---

## 3. Les règles opposables et leurs validateurs

Un seul script nouveau : `app/scripts/checkQuestionAtomicity.mjs`, dans le job
`contrats`, **après** `checkTrameSymptoms.mjs`. Exit ≠ 0 = porte fermée.

### 3.1 Règle 1 — atomicité

> Toute réplique orale porte **au plus un** « ? ».

- Périmètre : classe **Q** de l'audit (sondes, guide d'anamnèse, questions du
  cas, `patient-frage`, guides `seedGuides`). `examinerQuestions` exclu (Q11).
- Exception : `ALLOWED_COMPOSED`, liste nominative d'ids, chaque entrée avec sa
  raison écrite (Q12). **Le script échoue si la liste grossit.**
- Hors périmètre, non touchés, mesurés propres (0 occurrence A/B) :
  `caseMuster.ts`, `seedAufklaerungen.ts`, `arztbriefChapters.ts`,
  `vorstellungChapters.ts`, `musterModels.ts`, `musterBogen.ts`, et la classe D
  en général (réponses patient, `negativeFindings`).

### 3.2 Règle 2 — énumération

> Une question à un seul « ? » n'énumère pas plus de **3** items cliniques
> distincts. Au-delà, `parts` est obligatoire.
> Un `followUp` / `nachfragen` est plafonné à **2** items.
>
> **Amendement Q0 (3 oct. 2026)** — `CaseQuestion.followUp?: string` : une
> question propre au cas porte la même relance que les questions générales
> (même rendu, même règle). Une relance qui n'a de sens qu'après un « oui »
> commence par `Falls ja:` (ou `Falls <condition>:`), sinon `parseFollowUp` la
> classe *toujours visible*. C'est la cible des 40 questions « fermée ? + W- ? »
> du lot Q2 : une question, une relance, un seul `id`.

Algorithme de comptage, repris littéralement du détecteur d'audit (il est la
définition, pas une approximation) :

1. retrait du préfixe d'étiquette (`Begleitbeschwerden — `) ;
2. troncature au premier « ? » ;
3. découpe sur `,` / `und` / `oder` / `bzw.` / `sowie` ;
4. conservation des segments de ≤ 6 mots contenant un substantif capitalisé de
   ≥ 4 lettres hors stoplist ;
5. dédoublonnage par préfixe de 5 caractères (`Kopfschmerzen` / `Kopfweh` = 1) ;
6. seuil : ≥ 4 items ⇒ échec (≥ 3 ⇒ échec sur un `followUp`).

Le mécanisme de réduction **existe déjà** : `parts` dans
`app/src/data/guides/symptoms.ts` (« si une partie seulement a été cherchée, la
question se réduit à ce qui reste »). Aucune primitive nouvelle n'est créée.

### 3.3 Règle 3 — alternative dépendante du cas

> Aucune question ne contient `<article> N oder <article> M` ni `N/den M`, où
> `N` et `M` sont deux termes du lexique anatomique.
> **L'énumération d'irradiation est exemptée.**

La distinction que le validateur doit tenir, telle que l'audit la dimensionne :

| Sonde | Verdict | Pourquoi |
|---|---|---|
| `fach-kardio-ausstrahlung` — « Strahlen sie in den linken Arm, den Hals, den Unterkiefer oder den Rücken aus? » | **légitime** | l'énumération **est** la question : on cherche où ça irradie |
| `fach-uro-flanke` — « Schmerzen in der Flanke oder im Rücken? » | **légitime** (audit §6.3 L4) | idem, topographie cherchée |
| `fach-ortho-durchblutung` — « …dass die Hand **oder** der Fuß kälter… » | **faute** | le cas **sait** si c'est la main ou le pied — gabarit non résolu |
| `fach-ortho-belastung` — « Können Sie das Bein/den Arm noch belasten? » | **faute** | idem |
| `fach-neuro-kraft` — « Ist ein Arm oder Bein schwächer geworden? » | **faute** | idem |

Critère mécanique qui sépare les deux groupes *(amendé à l'intégration, série 3 :
l'ancienne exigence d'un « article répété sur chaque membre » contredisait INV-42 —
« ein Arm oder Bein » n'en porte pas et doit échouer)* :

```
FAUTE (bloqué) : EXACTEMENT 2 membres, l'un SUPÉRIEUR (Hand, Arm), l'autre
                 INFÉRIEUR (Fuß, Bein), au singulier, reliés par « oder » ou
                 « / » — article ou préposition FACULTATIFS
                 (« die Hand oder der Fuß », « ein Arm oder Bein »,
                 « in Arm oder Bein », « das Bein/den Arm »).
EXEMPTÉ        : ≥ 3 territoires énumérés ; verbe d'irradiation en début de mot
                 (ausstrahlen, strahlt … aus, zieht/ziehen — pas « anziehen »,
                 « beziehen ») ; deux régions du MÊME membre (« am Bein oder am
                 Fuß », case-erysipel).
```

Une faute Règle 3 est un **gabarit non résolu** : la correction est une
`variante` résolue par le cas, pas une reformulation. C'est la faute
`DIRECTION-STYLE.md` §2.1 — un modèle copié sans lecture du cas — et elle est
**interdite par la CI**.

Le motif `Xxx- oder yyy` (ellipse de composé : `Schlaf- oder Beruhigungsmittel`,
`Nacht- oder Ruheschmerz`) est compté à part et **n'est jamais une faute** :
c'est de l'allemand correct. 379 occurrences en déclaratif, à ne pas toucher.

### 3.4 Règle 4 — budget dégressif

> Compteur de référence dans `app/scripts/fixtures/atomicity-budget.json`.
> Le script **échoue si un total remonte**.

Plancher mesuré, qui est la valeur initiale du fichier :

```json
{
  "mesureLe": "2026-09-30",
  "corpus": { "fichiers": 13, "enonces": 15591 },
  "A_multiQuestion": 1059,
  "B_enumeration": 322,
  "C_alternativeCasDependante": 75,
  "total_ABC_occurrences": 1399,
  "textesDistincts": 1293
}
```

- C'est **le seul moyen** d'introduire la règle sans bloquer les 130 cas
  existants.
- Un lot corrigé fait baisser un compteur ; le correcteur met le fichier à jour
  dans le **même commit** que la correction.
- Le ratio `textesDistincts / total = 1,08` est inscrit dans le fichier comme
  fait, pas comme cible : **il n'existe aucun gabarit partagé**, donc aucune
  correction ne se propage. Toute promesse de correction en masse est fausse.

### 3.5 Règle 5 — variante résolue

> Aucune `variante` non résolue ne peut atteindre l'écran.

Validateur : `checkVarianteAufgeloest.mjs`, sur les 130 cas chargés. Une `Frage`
à `variante` définie dont le cas ne fournit pas la clé ⇒ exit ≠ 0.

### 3.6 Règle 6 — ordre (`braucht`) : INFORMATIVE, jamais bloquante

> `braucht` est satisfait par l'ordre de la trame.

- Validateur : `checkFrageOrdnung.mjs`, lancé avec `|| true`, à côté de
  `checkCaseCohesion.mjs` et `checkProbeOverlap.mjs`.
- **Justification mesurée, et c'est la seule raison** : Tier A strict = **3
  occurrences nettes**, précision 3/3 ; Tier B = 29 occurrences, précision ~2/3.
  Ordre de grandeur **~30, pas ~500**. Le coût du faux positif dépasse le gain.
- Les 3 occurrences Tier A sont nommées et corrigées à la main par C4 :
  `case-commotio` (« Glukosesensor », `seedCases.ts:31370`, le diabète déclaré
  deux chapitres plus loin, `:31094`), `case-hypothyreose` (« Augenbrauen »),
  `case-ileus` (« Stuhlgewohnheit »).
- **Amendement Q0 (3 oct. 2026)** : le validateur est
  `checkQuestionOrder.mjs`, étendu à 4 règles (jusqu'à 2 adjectifs entre
  article/possessif et nom ; ordinal + nom ; affirmation en tête, « Sie nehmen /
  haben / hatten… » ; exclusion des lemmes déjà posés par la trame, au lieu du
  seuil de fréquence). Mesure : 8/8 présuppositions de l'audit des questions du
  cas détectées (Q0, 28 candidats, précision ≈ 50 % sur échantillon). Après Q1,
  les 8 sont corrigées : la preuve de détection vit sur les fixtures, et un test
  sur les données réelles garantit qu'elles ne reviennent pas ; 19 candidats
  restent (dont 2 faux positifs connus). Toujours informatif.

---

## 4. Ce qui est automatisable — la mesure a tranché contre l'intuition

> **Aucune réplique ne peut être découpée par script.**

Un split sur « ? » produit de l'allemand faux dans quatre situations **toutes
présentes au corpus** :

1. **préfixe d'étiquette** (`Begleitbeschwerden — Hatten Sie dabei…?`) : il ne
   se duplique pas ;
2. **subordonnée portée par la première question** (`…wegen des Darms, der Lunge
   oder der Gelenke? Wie viel und wie lange?`, `seedCases.ts:51694`) : la
   seconde perd son référent ;
3. **ellipse de composé** (`Schlaf- oder Beruhigungsmittel`, `Bein/den Arm`) :
   couper produit `Schlaf-` orphelin ;
4. **relance conditionnelle** (`followUp`) : la scinder change la logique
   d'affichage, pas seulement le texte.

**Semi-automatisable** : les 322 énumérations (Règle 2) → passage en `parts`.
Un script **propose**, un humain **valide**. ~70 % du travail mécanique ; 100 %
de la relecture reste humaine. 163 des 322 sont dans `caseSpecificQuestions`,
71 dans `anamneseChapters.ts`.

**Ordre des lots à main humaine** (priorité décroissante, dimensionnée par
l'audit) :

| Lot | Volume | Cible |
|---|---:|---|
| L1 | 27 sondes | `AKTUELL_VARIANT_PROBES` > 1 « ? » — 77 % du bloc, les premières posées |
| L2 | 27 sondes | `BASE_PROBES` + `FRAUEN_PROBES` > 1 « ? » — tronc commun sur 130 cas |
| L3 | extrait des 199 | `followUp` > 1 « ? » — une relance = une question, par définition |
| L4 | 5 sondes | alternatives dépendantes du cas (§3.3, colonne « faute ») |
| L5 | 471 | `examinerQuestions` — Q11, hors porte |
| L6 | 104 cas | 270 doublons échappés (§5) |
| L7 | 3 cas | ruptures d'ordre Tier A (§3.6) |

---

## 5. Le lexique `Symptom` et `PROBE_SUCHT`

### 5.1 La cause mesurée

`dedupeBySymptom` ne connaît que **16 symptômes** et `PROBE_SUCHT` ne couvre que
**48 sondes sur 229**. `kopfschmerz` — le doublon vécu par la direction sur
`case-migraene` — **n'existe pas dans le type `Symptom`** : il était
structurellement invisible.

```
438 doublons bruts (concept × cas) · 110 neutralisés · 270 échappent (104 cas)
  dont 107 hors des 16 symptômes actuels
Trois paires de chapitres portent 411 des 438 :
  aktuell → fach 165 · aktuell → vegetativ 156 · vegetativ → fach 90
```

Porter le lexique et compléter `PROBE_SUCHT` **rend visibles 107 des 270
doublons sans écrire un seul script nouveau**. C'est le premier geste de C4.

### 5.2 Les 16 concepts existants (inchangés)

```
fieber · schuettelfrost · nachtschweiss · reise · kontakt · uebelkeit
stuhl · miktion · gewicht · appetit · schlaf · husten · oedeme
orthopnoe · blutung · schwindel
```

### 5.3 Les 11 concepts à ajouter — nommés par la mesure

Chacun est tiré de la liste des concepts qui **échappent** au garde-fou, avec
son volume mesuré :

| Concept | Occurrences échappées | Preuve |
|---|---:|---|
| `ausschlag` | 11 | `case-lyme` : `akt-infekt-herd` / `fach-infekt-haut` |
| `atemnot` | 11 | liste §4.2 de l'audit |
| `juckreiz` | 11 | liste §4.2 |
| `schwaeche` | 10 | `case-multiple-sklerose`, `case-schlaganfall`, `case-bandscheiben…` |
| `taubheit` | 10 | `case-multiple-sklerose` (**3× dans le même chapitre**), `case-schlaganfall` |
| `sturz` | 8 | `case-schlaganfall` : `(case)` / `fach-neuro-koordination` |
| `bewusstlos` | 8 | liste §4.2 |
| `stimmung` | 7 | `case-depression` : `akt-psych-stimmung` / `akt-psych-antrieb` / `fach-psych-stimmung` |
| `suizid` | 7 | `case-depression` : `akt-psych-sicherheit` / `fach-psych-suizid` — **la question la plus délicate de l'entretien, posée deux fois** |
| `kopfschmerz` | — | `case-migraene`, cité par la direction ; `anamneseChapters.ts:246` `akt-begleit` puis `fach-neuro-kopfschmerz` |
| `sehstoerung` | — | `case-multiple-sklerose` : `(case)` / `fach-neuro-sehen` |

Soit **27 concepts nommés**.

### 5.4 La règle qui porte le lexique de 27 à ~36

Aucun autre concept n'est inventé ici. La complétion est **pilotée par la
mesure**, pas par l'intuition :

> Le lexique `Symptom` doit couvrir **tout concept produisant ≥ 5 doublons
> échappés** sur le corpus des 130 cas, tel que mesuré par
> `app/scripts/measureProbeDuplicates.mjs` (script d'audit à pérenniser).
> C4 exécute la mesure, lit la queue de distribution (`reise 7 …`) et ajoute les
> concepts restants avec leur volume. Le total attendu est de l'ordre de 36 ;
> **c'est un résultat, pas une cible.**

### 5.5 `PROBE_SUCHT` — la complétion

- Aujourd'hui : **48 sondes sur 229** déclarent ce qu'elles cherchent.
- Cible opposable : **toute sonde dont le `frage` déclenche un `TEXT_RE` du
  lexique étendu déclare `sucht`**. Validateur : extension de
  `checkTrameSymptoms.mjs`, exit ≠ 0 sur une sonde muette.
- `blutung` (44) et `stuhl` (36) sont **déjà** dans `PROBE_SUCHT` : ils
  échappent parce que les **questions propres au cas** ne déclarent ni `sucht`
  ni `relu`. D'où la seconde extension :
  **`checkCaseQuestionChapters.mjs` exige `sucht` ou `relu` sur toute
  `caseSpecificQuestion` citant un concept de la carte étendue.** C'est la voie
  principale par laquelle 80 des 270 doublons passent.

---

## 6. Invariants — propriétés testables

| Id | Propriété |
|---|---|
| **INV-40** | Aucune `Frage` de classe Q hors `ALLOWED_COMPOSED` ne contient deux « ? ». |
| **INV-41** | Aucune `Frage` à un « ? » n'énumère > 3 items ; aucun `nachfragen` n'en énumère > 2. |
| **INV-42** | Aucune question ne porte une alternative dépendante du cas au sens §3.3 ; `fach-kardio-ausstrahlung` et `fach-uro-flanke` passent, `fach-ortho-durchblutung`, `fach-ortho-belastung` et `fach-neuro-kraft` échouent. **Test de discrimination obligatoire sur ces 5 ids.** |
| **INV-43** | Les compteurs A, B, C ne remontent jamais au-dessus du plancher enregistré. |
| **INV-44** | `⋃ deckt(questions issues d'un découpage) === deckt(question d'origine)` — aucune `ProbeId` perdue ni dupliquée. |
| **INV-45** | Aucune `variante` non résolue n'atteint l'écran, sur les 130 cas. |
| **INV-46** | Toute sonde dont le `frage` déclenche un `TEXT_RE` du lexique étendu déclare `sucht`. |
| **INV-47** | `checkFrageOrdnung.mjs` n'est **jamais** une porte bloquante : son job CI porte `|| true`. Test sur le workflow. |
| **INV-48** | Profondeur de `nachfragen` ≤ 2. |

---

## 7. Tests de contrat à écrire (C4)

| Fichier | Ce qu'il prouve |
|---|---|
| `app/scripts/checkQuestionAtomicity.mjs` | INV-40, INV-41, INV-42, INV-43 — porte CI, exit ≠ 0 |
| `app/scripts/checkVarianteAufgeloest.mjs` | INV-45 — porte CI |
| `app/scripts/checkFrageOrdnung.mjs` | INV-47 — job informatif `|| true` |
| `app/src/data/guides/atomicity.discriminate.test.ts` | INV-42 sur les 5 ids nommés — le cœur de la règle 3 |
| `app/src/data/guides/probeCoverage.test.ts` | INV-44 (extension de `checkProbeCoverage`) |
| `app/src/data/guides/symptoms.test.ts` | INV-46 + les 27 concepts nommés présents dans `Symptom` |
| `app/src/data/guides/frage.test.ts` | INV-48 |
| `.github/workflows/quality.yml` | ordre : `checkTrameSymptoms` → `checkQuestionAtomicity` ; `checkFrageOrdnung` hors porte |

---

## 8. Ce que le détecteur ne voit pas — limites inscrites au contrat

Écrites ici pour qu'aucun implémenteur ne conclue à tort que la porte garantit
la qualité :

- La Règle 2 **ne distingue pas** une énumération cliniquement légitime (les 5
  items d'un dépistage B-Symptomatik) d'un empilement de rédaction. Seule une
  relecture tranche.
- La lemmatisation par troncature à 7 caractères confond des composés allemands
  proches.
- La Règle 3 n'attrape pas une alternative portée par le contexte sans marqueur
  lexical (`Ist es links oder ist es rechts schlimmer?`).
- Rien ici ne mesure l'**oralisabilité réelle** : une question courte peut
  rester imprononçable.

---

## 9. Contradictions relevées entre sources — non tranchées en silence

1. **Combien d'alternatives dépendantes du cas : 5 ou 7 ?**
   L'audit §3 écrit « Seuls `fach-ortho-*` et `fach-neuro-kraft` relèvent du
   second groupe » — soit **5 ids** (`fach-ortho-ausstrahlung`,
   `fach-ortho-sensomotorik`, `fach-ortho-durchblutung`, `fach-ortho-belastung`,
   `fach-neuro-kraft`). L'audit §6.3 lot L4 écrit « **7 sondes** ». Le dossier
   d'analyse §1.3 ne nomme que 2 exemples.
   **Non tranché ici.** Ce contrat retient les **5 ids nommés** comme corpus de
   test de discrimination (INV-42) et laisse le validateur produire la liste
   complète par la règle mécanique §3.3 : c'est le script qui doit trancher,
   pas un chiffre recopié. `fach-ortho-ausstrahlung` (« ins Bein oder in den
   Arm? Bis wohin genau? ») est **ambigu** au regard du critère — 2 membres,
   article répété, mais verbe d'irradiation présent : il tombe du côté exempté
   par la Règle 3 et du côté fautif par la Règle 1 (2 « ? »). C'est le cas
   qui doit être écrit en premier dans le test de discrimination.
2. **`fach-uro-flanke` compté comme alternative collée puis exempté.**
   L'audit §3 le liste parmi les 10 alternatives collées ; §6.3 L4 écrit « Ne
   PAS toucher `fach-kardio-ausstrahlung` / `fach-uro-flanke` ». **Tranché ici
   par le critère mécanique** (§3.3) : 2 membres mais **pas** d'article répété
   latéralisable, préposition topographique → exempté. Il est inscrit au test
   de discrimination comme cas *légitime*.
3. **Sondes : `C = 16` (tableau §3) vs `10 alternatives collées` (liste
   exhaustive §3).** Le tableau compte des **occurrences** sur les 227 énoncés
   du fichier (`followUp` inclus), la liste compte des **sondes**. Ce ne sont
   pas les mêmes unités. Le budget §3.4 enregistre les **occurrences** (75 au
   total corpus) ; les lots humains comptent des **sondes**. Inscrit ici pour
   qu'aucun compteur ne soit comparé au mauvais.
4. **Le dossier d'analyse §1.3 saute le point 4** de sa propre énumération
   (1, 2, 3, 5). Aucun contenu manquant repéré ailleurs ; signalé pour que
   personne ne cherche une consigne absente.
