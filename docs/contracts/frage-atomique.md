# Contrat — `Frage` : la question atomique

> Statut : proposé (P0 série 3) · Écrit par `lead-s3-contrats` · 30 sept. 2026
> Source mesurée : `app/docs/reports/audit-questions-composees-serie3.md`
> (13,0 Mo, 53 286 chaînes, 130 cas chargés via `loadCases.mjs`).
> Consommé par : C4 (contenu — questions atomiques), C2 (guide d'anamnèse).
> **Amendement K (4 oct. 2026, ADR-0023)** — moteur de cohérence : lexique de
> signes, `sucht` obligatoire, profil clinique, `cohere`, porte `checkCoherence`
> (§10) ; contradictions §11. Consommé par les lots K0–K5. Révisé après revue
> Opus (I1–I9, m1–m14, DM1–DM3 — ADR-0023 § Revue).
> **7 oct. 2026 — r5 « rien de déjà dit » (lot Banque, FB3-A2, ADR-0023
> § Amendement r5)** : une question de banque ne redemande pas ce qu'une
> réplique jouée a dit ; champ calculé `porte` ; INV-92 (§10.4–§10.11, §11.13).

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
  braucht?: Signe[];       // signes déjà cherchés avant elle (amendé K, §10.2 — était FrageId[])
  nachfragen?: Frage[];    // relances conditionnelles — l'arbre rendu visible
  variante?: VariantKey;   // résolu par le cas : Hand | Fuß, Bein | Arm…
  deckt: ProbeId[];        // contrat existant préservé
  sucht: [Signe, ...Signe[]]; // ce qu'elle CHERCHE — obligatoire ; requis AU TYPE dès K5 (plancher avant, §10.2)
  relu?: true;             // le texte NOMME un signe hors `sucht` sans l'interroger (jamais une énumération, D1)
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

### 3.6 Règle 6 — ordre (`braucht`) : détecteur de texte INFORMATIF ; ordre déclaré bloquant (amendement K)

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
- **Amendement K (4 oct. 2026)** : l'ordre **déclaré** (`braucht: Signe[]`)
  devient bloquant après montage — `cohere` (r4) déplace la question, la porte
  `checkCoherence` exige 0 violation (INV-85). Le **détecteur de texte**
  (anaphores, présuppositions) reste informatif : INV-47 tient, il ne sert
  qu'à proposer des `braucht` manquants.

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

> **Amendement K (4 oct. 2026)** — `Symptom` devient `Signe` (§10.1). La règle
> §5.4 (« couvrir tout concept ≥ 5 doublons échappés ») est **remplacée** par la
> règle d'identité §10.1 et la couverture totale §10.2 ; la cible §5.5
> (« toute sonde dont le texte déclenche un `TEXT_RE` ») est **remplacée** par
> « toute question jouable » (INV-79). Le texte ci-dessous reste comme
> historique de la mesure.

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
| **INV-46** | Toute sonde dont le `frage` déclenche un `TEXT_RE` du lexique étendu déclare `sucht`. *Remplacé par INV-79 (amendement K).* |
| **INV-47** | `checkFrageOrdnung.mjs` n'est **jamais** une porte bloquante : son job CI porte `|| true`. Test sur le workflow. |
| **INV-48** | Profondeur de `nachfragen` ≤ 2. |
| INV-77 → INV-91 | Moteur de cohérence — §10.9. (INV-49 est libre, mais INV-50 à INV-76 sont pris par d'autres contrats : la suite reprend à 77.) |

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

---

## 10. Amendement K — le moteur de cohérence (4 oct. 2026)

> ADR-0023 · spec `docs/superpowers/specs/2026-10-04-moteur-coherence-anamnese.md`
> (mesure : 130 cas, 8 492 questions affichées). Écrit par `platform-architect`,
> **révisé après la revue Opus** (I1–I9, m1–m14, décisions DM1–DM3 : ADR-0023
> § Revue). Aucun code n'est écrit ici : ce qui suit est opposable aux lots
> K0–K5.

### 10.0 Décisions — DÉCIDÉES le 4 oct. 2026

| # | Décision | Où elle s'applique |
|---|---|---|
| **D1** | Un signe cité dans une énumération compte comme demandé. | identité (c), §10.1 ; `relu` §10.2 |
| **D2** | Une douleur dans le **premier** symptôme du motif ajoute Ort, Charakter, Intensität même si la nature du cas n'est pas « douleur » ; pas une douleur accessoire. | tag `schmerz` déclaré, §10.3 ; r3 |
| **D3** | Une redite marquée `deepens` n'est plus tolérée : un signe, une question. | r2 ; `checkPlayedTrame` perd sa tolérance |
| **D4** | Conservation : question du cas > Fachanamnese > Aktuelle Beschwerden > végétative. | rang de r2, §10.4 |
| **D4-bis** | *(K3, décision de main, revue clinique P1-1)* Quand un signe **est** le motif **déclaré** du cas (`SIGNE_DU_MOTIF` : la fièvre d'un tableau `infekt` dont le profil porte `fieber`, la dyspnée d'un tableau `atemnot` dont le profil porte `dyspnoe` — revue R5 : pas sur la seule nature), la question d'Aktuelle Beschwerden l'emporte sur la Fach, qui se réduit à ses autres `parts` (`fach-pneumo-fieber` → « Hatten Sie dabei Schüttelfrost? »). Aucune question « Fieber » n'est plus posée après trois questions qui la présupposent. Tests : malaria, pneumonie. **Amendement K5 (revue K5, décision de main) — `MOTIF_DECLARE`** : quand la nature ne dit pas le motif, un **tag de profil** le déclare (`schwindel` : le patient consulte pour un vertige ; `sturz` : il consulte après une chute — lagerungsschwindel, commotio, epilepsie). Le signe du motif s'ajoute au `sucht` d'`akt-motiv` (règle d'identité : la fiche le dit en ouvrant), qui l'emporte sur la Fach comme ci-dessus. **Règle I3** : un signe ajouté ainsi ne fait **jamais** d'`akt-motiv` une perdante en r2 — une question du cas qui le déclare le garde, `akt-motiv` le cède sans écart et reste posée entière. Ne pas poser le tag quand la fiche ne dit pas le motif à l'ouverture (schlaganfall : la chute est dite à la coordination). Un tag de profil n'est **pas** un signe : `schwindel` / `sturz` tags et signes homonymes vivent dans deux tables (INV-78 ne les compare pas). | rang de r2, §10.4 |
| **D5** | Fach Infektiologie (gabarit borréliose) : le moteur la réduit d'abord, pas de scission. | r1 |
| **D6** | Q3–Q5 et Q7 continuent en déclarant `sucht` sur ce qu'ils touchent ; Q6 et Q8 gelés jusqu'à K3, puis absorbés. | ordre des lots, §10.10 |
| **D7** | Porte à 0 sur la trame jouée **après** montage dès K3 ; plancher (qui ne remonte jamais) sur le contenu brut jusqu'à K4. | §10.6 |
| **DM1** | Les sondes `fach-chir-fieber`, `fach-chir-uebelkeit` et `fach-chir-blutverduenner` sont **supprimées en K1**. Disparaissent avec elles : le champ `redundant`, `yieldsToGeneral` (`symptoms.ts:205-213`) et tout rang dérivé de `deepens`. Les 18 clés `antworten` correspondantes des 6 cas Chirurgie sont supprimées en K1, **après** fusion de toute réponse plus riche dans la réponse générale (INV-88). `followUp.test.ts` est adapté. | K1 |
| **DM2** | Toute relance **conditionnelle** qui cherche un autre signe que sa mère est corrigée **à la source en K1**. Si c'est une précision mal formulée, elle est réécrite ; sinon, elle est promue en question autonome du bon chapitre (la relance devient une unité). | K1 ; INV-84 |
| **DM3** | Le pipeline des futurs cas est la ligne K5 du §10.10 : `app/scripts/PIPELINE.md` et l'agent `.claude/agents/content-case-author.md`. | K5 |

### 10.1 Le lexique de signes

`Signe` remplace `Symptom` dans `app/src/data/guides/symptoms.ts` (un seul
lexique ; `type Symptom = Signe` reste comme alias déprécié jusqu'à K5).

```ts
export type Signe =
  // les 11 dimensions de plainte, dans l'ordre de l'entretien
  | 'ort' | 'beginn' | 'charakter' | 'intensitaet' | 'ausstrahlung' | 'verlauf'
  | 'ausloeser' | 'einfluss' | 'frueher' | 'begleit' | 'gelenke'
  // les 39 concepts actuels, affinés là où une réplique se dédouble
  | 'stuhl' | 'stuhlfrequenz' | 'stuhlaussehen' | 'miktion' | 'polyurie' | …
  // ajoutés par K0/K1 (liste fermée, chaque ajout commenté)
  | 'steifigkeit' | 'gelenk_entzuendung' | 'meningismus' | 'fazialis' | 'zecke'
  | 'erythem_ring' | 'essen_expo' | 'gicht' | 'nierensteine' | 'familie_rheuma' | …;

export type ProfilTag = LeitsymptomKategorie          // les 10 natures sont des tags
  | 'hoden'                                           // dérivé (§10.3)
  | 'diarrhoe' | 'reise' | 'arthritis' | 'generalisiert' | 'dysphagie' | …; // déclarés ; liste fermée, commentée
// Pas de tag de région à ce stade : la région reste l'affaire de FACH_RULES (I3).

export interface SigneDef {
  id: Signe;
  kapitel: KapitelId;                         // chapitre où il se cherche (r3, r4a ; repli §10.4)
  pertinence: 'screening' | [ProfilTag, ...ProfilTag[]];
  bank?: ProbeId;                             // sonde canonique mono-signe (r3)
}
export const SIGNE_DEF: Record<Signe, SigneDef>;
export const SIGNES: readonly Signe[];        // ordre de déclaration = ordre de l'entretien
export const PROFIL_EXIGE: Record<ProfilTag, Signe[]>;            // 'schmerz' → ort, charakter, intensitaet
export const PROFIL_EXCLUT: Partial<Record<ProfilTag, Signe[]>>;  // 'generalisiert' → ausstrahlung
// Une sonde qui ne cherche PAS un signe sous un tag donné (règle générique, pas une exception par cas) :
export const SUCHT_AUSSER: Partial<Record<ProbeId, Partial<Record<ProfilTag, Signe[]>>>>;
//   { 'fach-uro-flanke': { hoden: ['ausstrahlung'] } }  — « strahlen sie in die Leiste aus » n'a pas
//   d'antécédent pour une douleur du testicule (revue clinique C-1, anamneseChapters.ts:1855-1858)
```

La spec (§3.1) écrit deux champs optionnels, `screening?: true` et
`braucht?: ProfilTag[]`. Le contrat écrit **un seul** champ, `pertinence`
(écart tracé au §11.2).

**Règle d'identité (opposable).** *Deux unités cherchent le même signe si et
seulement si la fiche y répondrait par la même réplique.* Une **unité** est une
question mère et ses relances de précision. La règle s'applique **entre
unités**, jamais entre une mère et sa précision (I1, §10.2). Corollaires :

- (a) **granularité** : une question qui obtient une autre réplique cherche un
  autre signe. « Was hat sich am Stuhl verändert » (`stuhl`) n'est pas
  « Wie oft » (`stuhlfrequenz`) ;
- (b) **même signe, autres mots** : « Wie lange sind Sie morgens steif » et
  « Morgensteifigkeit ? » cherchent tous deux `steifigkeit` ;
- (c) **D1** : une énumération cherche **chaque** signe qu'elle nomme ;
- (d) une **dimension** dont l'objet est le motif cherche la dimension.
  « Seit wann haben Sie Fieber? » cherche `beginn` ;
- (e) un antécédent ou un fait familial est un autre signe que le symptôme
  actuel (`familie_rheuma`, `gicht`) ;
- (f) les exemples d'un Auslöser (« — ein Essen, eine Reise ») ne sont pas
  demandés.

**Cohérence statique du lexique** (INV-77) :
- chaque signe a un `SIGNE_DEF` ;
- un signe exigible (présent dans une valeur de `PROFIL_EXIGE`) a une `bank`,
  et `PROBE_SUCHT[bank]` vaut **exactement** `[signe]` ;
- `PROFIL_EXIGE[t]` ne contient que des signes pertinents pour `t` et aucun
  signe de `PROFIL_EXCLUT[t]` ;
- `PROFIL_EXCLUT` ne vise jamais un signe de dépistage (`screening`).

### 10.2 `sucht` — sonde, question du cas, relance

| Porteur | Déclaration | Lieu | Échéance bloquante |
|---|---|---|---|
| Sonde | `PROBE_SUCHT: Record<ProbeId, [Signe, ...Signe[]]>` — **totale** (230 − 3 sondes DM1 ; 82 aujourd'hui) | bundle | K1 |
| Question du cas | `CaseQuestion.sucht` — optionnel au type et compté au plancher jusqu'à K4 ; **requis au type (`[Signe, ...Signe[]]`) dès K5** | contenu | K5 |
| Relance | **hérite** du signe de sa mère (précision). Une relance qui cherche **un autre** signe le déclare dans `followUpSucht` (ci-dessous) et devient une **unité à part**. | les deux | discordance bloquante dès K1 (sondes), K5 (cas) |
| Ordre | `CaseQuestion.braucht?: [Signe, ...Signe[]]` ; sur une sonde : `PROBE_BRAUCHT: Partial<Record<ProbeId, Signe[]>>` | les deux | K4 |

**Relances — forme unique (I9).** Une seule forme vaut pour les sondes
(bundle) et pour les questions du cas (contenu publié) :

```ts
// CaseQuestion (contenu) :
followUp?: string;              // la PREMIÈRE relance — reste une string : un client ancien fait followUp.trim()
followUps?: string[];           // les relances suivantes (clé nouvelle, ignorée par un client ancien)
followUpSucht?: Signe[][];      // tableau parallèle de TOUTES les relances : index 0 = followUp, i ≥ 1 = followUps[i-1]
// PhraseVariant (bundle) : followUp?: string[] (inchangé) ; followUpSucht?: Signe[][] parallèle ;
// idem pour parts[].followUp.
// Entrée absente ou [] = précision, elle hérite du sucht de la mère.
```

- **Point de normalisation unique : `phraseFollowUp`** (`phrases.ts:38`). Il
  lit `followUp`, `followUps` et `followUpSucht`, et rend la liste ordonnée
  `{ text, sucht }`, où `sucht` est déclaré ou hérité. `groupFollowUps`,
  `PhraseLine`, les `check*.mjs` et `FachPatch` le consomment ; aucun autre
  lecteur de `followUp`. Le reliquat de Q3 (`followUp: string | string[]`)
  est remplacé par cette forme.
- **`relu`** ne dispense pas de `sucht`. Il marque une **discordance voulue** :
  le texte nomme un signe absent de `sucht`, parce qu'il le mentionne sans
  l'interroger. **Un `relu` sur une énumération est refusé** par la porte
  (D1, §10.6).
- **Discordance = échec** : si un `TEXT_RE` du lexique trouve, dans une
  question ou une relance, un signe absent de son `sucht` (déclaré ou hérité)
  et que `relu` n'est pas posé, la porte échoue. C'est ce qui empêche une
  relance hors signe de se cacher derrière l'héritage.
- **`braucht`** est en `Signe[]` (et non `FrageId[]`, §1) : une question
  nommée peut être retirée par r2 ; la dépendance porte sur l'information.

### 10.3 Le profil clinique du cas

```ts
export interface Profil {
  tags: [ProfilTag, ...ProfilTag[]];        // non vide
  exige?: Signe[];                          // en plus de PROFIL_EXIGE[tags]
  exclut?: Partial<Record<Signe, string>>;  // signe NON screening → raison écrite (non vide)
}
// PatientSheet.profil?: Profil — optionnel AU TYPE (contenu ancien), exigé PAR LA PORTE dès K2.
```

**Profil effectif**, calculé au montage et jamais écrit :

```
tags_derives = { leitsymptomOf(c) } ∪ ( /hoden|skrot/i sur schmerz.ort ? { 'hoden' } : ∅ )   // données du cas
tags_eff     = tags_derives ∪ profil.tags
exige_eff    = ⋃ PROFIL_EXIGE[t ∈ tags_eff] ∪ profil.exige
exclut_eff   = clés(profil.exclut) ∪ ⋃ PROFIL_EXCLUT[t ∈ tags_eff]
```

**Validité** (INV-80) :
- `exige_eff ∩ exclut_eff = ∅` ;
- aucun signe de dépistage dans `exclut` ;
- pour tout `s ∈ exige_eff`, `SIGNE_DEF[s].bank` existe, `s` est pertinent pour
  `tags_eff`, et la `bank` n'est ni dans `aktuellSkip` / `fachSkip`, ni visée
  par `SUCHT_AUSSER` sous un tag de `tags_eff`.

| Élément | Origine |
|---|---|
| tag de la nature (`leitsymptomOf`) et `hoden` | **dérivés** des données du cas, présents même sans profil |
| tous les autres tags, dont `schmerz` d'un motif mixte (D2) | **déclarés à la main**, pré-remplis par `measureCoherence.mjs --propose`, relus par spécialité |
| `exige`, `exclut` et leurs raisons | **déclarés à la main**, relus |
| `aktuellSkip`, `fachSkip` | **inchangés** : données du cas, sémantique conservée (la réponse d'une sonde `fachSkip` reste exigée, `types.ts:94-99`). Pas de migration vers `exclut`, pas de gel, pas de compteur. |

D2 ne se dérive pas. `leitsymptome[0]` est souvent **une** phrase qui porte
plusieurs symptômes : celui de `case-influenza` contient « Kopf- und
Gliederschmerzen », une douleur accessoire selon D2. Le tag `schmerz` d'un motif
mixte est donc déclaré et relu.

### 10.4 `cohere` — les règles

```ts
// app/src/data/guides/coherence.ts (nouveau) ; appelé par playedTrame à la place de dedupeBySymptom
export function cohere(
  trame: TrameChapter[],         // trame brute, ordonnée, APRÈS FACH_RULES, aktuellSkip et fachSkip
  profil: ProfilEffectif,        // tags_derives toujours présents ; profil.* absent = contenu sans profil
  caseId: string,
  ctx?: CohereCtx,               // antworten (r3), banque (r3), allowed, casIndex ; reponse? (r5, 7 oct.)
): { trame: TrameChapter[]; ecarts: Ecart[] };
// playedTrame(c) gagne un champ additif : { chapters, fach?, ecarts }
// CohereCtx.reponse?: (p: Phrase) => string | undefined — la réplique de la fiche (antworten des sondes,
//   frageAntworten au texte exact d'une question du cas) ; absent = r5 inactive.
// PhraseVariant.porte?: Signe[] — CALCULÉ par r5, jamais écrit à la main ni publié.
```

**Ce que `cohere` ne fait pas (I3).** `FACH_RULES` reste la couche
d'adaptation (`anamneseChapters.ts:1728`), inchangée : texte et applicabilité
par région, `motiv`, `kategorie`, sexe et âge. `aktuellSkip` et `fachSkip`
restent appliqués avant `cohere`, comme aujourd'hui. Ces trois mécanismes
s'appliquent **toujours**, avec ou sans profil (I2). Seul `FACH_COVERS` est
absorbé, par r2.

**Vocabulaire.**
- Une **unité** est une question mère et ses relances de précision. Les signes
  d'une unité sont ceux de la mère, moins ceux que `SUCHT_AUSSER` retire sous
  `tags_eff`.
- Le **rang** de conservation (D4) :
  - 0 : question du cas, quel que soit son chapitre ;
  - 1 : Fach, y compris les questions de la Frauenanamnese fondue dans la
    gynéco (Q-gyn) ;
  - 2 : `aktuell` ;
  - 3 : `vegetativ` ;
  - 4 : les autres chapitres (extension du contrat, hors D4).

  Une relance détachée garde le rang de son origine.
- L'**identifiant** d'une question est :
  - pour une sonde, son `probeId` ;
  - pour une question du cas, `cas:<index dans caseSpecificQuestions>` ;
  - pour une relance, `<id mère>#<rang>`.
- La **règle d'insertion** sert à r3 et r4a.
  - Le **chapitre cible** est `SIGNE_DEF[s].kapitel`.
  - Dans ce chapitre, on insère après la dernière question dont le premier
    signe précède `s` dans `SIGNES` **ou l'égale** (décision de main, K3 : une
    relance détachée se pose après la question de son signe, pas devant), et à
    défaut en tête du chapitre. Le motif (`motiv`) est le premier signe de
    `SIGNES` : il ouvre toujours son chapitre (K3).
  - **Repli (I5)** : si la cible est la Frauenanamnese fondue dans la gynéco,
    on insère dans le bloc gynéco fondu. Si le chapitre cible n'existe pas
    dans la trame (pas de Fach jouée, Frauenanamnese chez un homme), on insère
    **en fin d'Aktuelle Beschwerden**.

**Ordre d'exécution, en une passe** : r1 → r4a → r2 → r3 → r4b → r5 (r5 :
7 oct. 2026, sur l'ordre final de l'entretien).

**Précisions de K3 (revues Opus de `508639f6`, décisions de main).**
- Une relance hors signe est une unité à part : elle suit **sa** décision même si sa mère est
  retirée par r1 (revue B1).
- r3 : une banque à `parts` (jour / nuit) n'ajoute que les parts qu'aucune unité ne pose.
- Les parts gardées d'une même question se posent en **une** question — la première — et
  les suivantes en relances ; jamais recollées dans une même ligne (revue série 3, I4).
- r3 lève une erreur si la sonde de banque n'a ni phrase de guide ni question (jamais un id
  affiché comme question).

**Précision de K4 (revue mécanique I-1, décision de main) — le texte d'une `part`.** Une part
est une **découpe** du texte de sa variante (la question, une relance ou une alternative de la
même variante), avec au plus un **complément grammatical minimal** : un article, une flexion,
une anaphore résolue par le nom qu'elle reprend dans la même variante — **sans aucune notion
clinique nouvelle**. Tout autre texte est une question nouvelle : il relève du lot de contenu,
pas d'une part. Les parts qui ne sont pas de pures sous-chaînes sont listées au rapport du lot
qui les écrit, pour relecture de langue.

**Précision de K5 (revue K5, décision de main) — la part d'alarme.** Une part qui cherche un **signe d'alarme**
(`PART_ALARME`, liste fermée dans `coherence.ts` : `gang`) est posée en **question autonome**, jamais en relance d'une
autre part : commotio pose « Haben Sie Schwindel oder das Gefühl zu schwanken? », puis, à part, « Fühlen Sie sich beim
Gehen unsicher? ». Elle reste une découpe du texte de sa variante (règle ci-dessus).

**Sécurité (décision de main, K3).** Garantie opposable, testée : **tout signe
de risque cherché par la trame brute reste cherché par au moins une question
de la trame jouée**. `RISIKO_SIGNES` = `suizid`, `selbstverletzung` (l'acte),
`selbstverletzung_wunsch` (l'idéation d'automutilation) — l'idéation n'est
jamais confondue avec l'acte (signes distincts). r1 ne retire jamais une
question de risque (ces signes ne sont jamais hors profil) ; r2 s'applique
normalement : le gagnant D4 (la Fach psy devant Aktuelle Beschwerden) reste posé
et porte le signe.

| Règle | Décision déterministe | Écarts |
|---|---|---|
| **r1 — hors profil** *(inactive sans profil)* | Un signe `s` est hors profil si `s ∈ exclut_eff`, ou si `pertinence(s) ≠ 'screening'` et `pertinence(s) ∩ tags_eff = ∅`. **r1 ne retire jamais une question du cas (rang 0)** (décision de main, K3) : une question du cas hors profil est gardée, avec un écart `anomalie` (erreur de source à corriger : profil ou `sucht`) ; `casRetiresParR1 = 0`. Si tous les signes d'une unité sont hors profil, elle est retirée. Si une partie l'est, l'unité est réduite aux `parts` qui portent au moins un signe hors de l'ensemble hors profil. Sans `parts`, elle est **gardée entière** (résidu `nonReduit`). Une relance d'une autre unité suit sa propre décision. | `retire` / `reduit` / `non-reduit`, `cause: 'profil' \| 'exclut'` |
| **r4a — relances hors signe** | Une relance dont le `sucht` déclaré n'est pas inclus dans celui de sa mère est une unité à part (I1). Si elle est **inconditionnelle** (`parseFollowUp(...).kind === 'immer'`), elle est **détachée** et placée par la règle d'insertion dans le chapitre de son premier signe. Si elle est **conditionnelle**, c'est une **anomalie** : la porte la refuse. Le cas ne doit pas exister après K1 (DM2). | `detache` (`de`, `vers`) / `anomalie` |
| **r2 — un signe, une question (D3, D4)** | Les gagnants sont calculés **en une fois** sur l'état d'après r4a. Pour chaque signe cherché par au moins deux unités, le **gagnant** est l'unité de rang minimal ; à rang égal, la première dans l'ordre de la trame. Deux **questions du cas** du même signe forment une **anomalie comptée** (`doublonsCas`) : la première gagne. Chaque perdante perd le signe : elle est retirée si elle n'en garde aucun ; sinon elle est réduite aux `parts` qui portent **au moins un** signe qu'elle garde ; sans `parts`, elle passe en `non-reduit`. Une question du cas gagnante prend la place de la première perdante **retirée** du **même chapitre** placée au-dessus d'elle (`symptoms.ts:215-233`, conservé) ; si la perdante est réduite ou non réduite, elle reste posée et la question du cas reste à sa place (K3, revue clinique R6, décision de main). Une entrée de `COHERENCE_ALLOWED` (r2) garde le signe sur la question nommée. | `retire` / `reduit` / `non-reduit` (`cause` = id du gagnant) ; `deplace` ; `garde-exception` ; `anomalie` |
| **r3 — rien d'attendu absent** *(inactive sans profil)* | Pour chaque `s ∈ exige_eff` qu'aucune unité ne cherche, la sonde `SIGNE_DEF[s].bank` est insérée par la règle d'insertion. Si `antworten[bank]` manque, l'écart est marqué `sansReponse`, et ce marquage est **bloquant dès K3** (I6). **Jamais de texte inventé.** | `ajoute`, `cause` = tag ou `'exige'` |
| **r4b — ordre sans présupposition** | Pour chaque question à `braucht`, dans l'ordre de la trame : si un signe de `braucht` n'est cherché que **plus bas**, la question est déplacée juste après la dernière des premières questions qui cherchent ces signes. Un signe de `braucht` cherché nulle part, ou un cycle, est une anomalie. On itère jusqu'au point fixe, en au plus *n* passes ; une question ne se déplace qu'une fois par passe. | `deplace` (`de`, `vers`, `cause` = signe) / `anomalie` |
| **r5 — rien de déjà dit** *(7 oct. 2026 ; inactive sans `ctx.reponse`)* | Dans l'ordre final, chaque réplique jouée est lue par `ditsDe` (`symptoms.ts` : table fermée de motifs par signe, distincte de `TEXT_RE` ; présence ou absence ; l'absence et le chiffre d'une variation du poids sont **complets**). Une question de **banque** gardée dont un signe a été dit **plus haut** : **retirée** si tous ses signes sont dits ; **réduite** à ses `parts` si une partie l'est ; si la présence est dite sans les précisions, la part (ou la question) est **remplacée par sa première relance de précision qui se pose seule** (règle des auteurs ci-dessous), les suivantes en relances, sans leur condition ; une relance qui **déclare** un signe dit sort. Sinon, la question est **gardée entière, sans écart** (aucun `non-reduit` de plus). Une question qui demande une précision dans son texte (`PRECISION` : wie viel, seit wann, wo genau…) reste posée si seule la présence est dite. **Porteur** : la première réplique de l'entretien clinique qui a dit le signe (à défaut, celle des Personalia) le déclare dans `porte`, ajouté à son `sucht`. **Exclusions** : jamais une question du cas (rang 0) ; jamais un signe de `RISIKO_SIGNES` ; jamais une sonde de `SONDE_DIMENSION` (liste fermée dans `coherence.ts`) ; jamais un signe **exigé** dit aux seules Personalia, Eröffnung ou Abschluss (`HORS_ENTRETIEN`). Ne portent rien : la réplique d'une question du cas, celle d'une sonde d'antécédent (`akt-frueher`, `vor-`, `fam-`, `med-`, `nox-`, `all-` — identité (e)), un épisode passé dans la même phrase, un « dabei » hors d'Aktuelle Beschwerden. | `retire` / `reduit` (`cause` = id du ou des porteurs ; relances : `mere`) |

**Règle r5 pour les auteurs de contenu (7 oct. 2026).**
- **La réplique décide.** Une réplique de la fiche (`antworten`, `frageAntworten`) qui dit un signe, présent ou absent (« keinen Durchfall »), retire ou réduit la question de banque qui le demande plus loin. Écrire une réplique, c'est donc aussi écrire le guide : un signe cité à tort dans une réplique fait disparaître sa question.
- **Une question de banque n'a pas de place fixe.** Selon les répliques du cas, elle peut disparaître, se réduire à une `part` ou céder sa place à sa relance.
- **Une relance de précision doit pouvoir se poser seule**, puisque r5 peut l'ouvrir sans sa mère. Elle est autonome (`partNonAutonome` faux), fait au moins quatre mots et ne renvoie à rien de ce qui précède : ni `es`, `dabei`, `dann`, `davon`, `dort`, `dazu`, `beide`, ni un « das? » final. Écrire « Seit wann husten Sie? », pas « Seit wann? » ; écrire « Wechseln sich Durchfall und Verstopfung ab? », pas « Wechseln sich beide ab? ». Une relance qui ne se pose pas seule n'est pas fautive : la question reste alors posée entière.
- **Une question de banque à plusieurs signes** a des `parts`. Sans elles, r5 ne peut que la garder entière.

**Propriétés (opposables).**
- **Pure** : aucune entrée mutée, ni `Date`, ni hasard, ni E/S. Seuls les
  tables statiques et `COHERENCE_ALLOWED` sont lus.
- **Déterministe** : la même entrée donne la même trame et les mêmes écarts,
  ordre compris.
- **Idempotente**, **sous INV-77 et INV-80** : `cohere(cohere(t))` rend une
  trame égale et aucun écart `retire`, `reduit`, `ajoute`, `deplace` ou
  `detache`. INV-77 et INV-80 garantissent que ce que r3 ajoute est mono-signe,
  pertinent, ni exclu ni skippé : ni r1 ni r2 ne peut donc le retirer au
  passage suivant. Sans eux, l'idempotence n'est pas promise.
- **Sans texte inventé** et **sans toucher `antworten`**. r5 **lit** les
  répliques, sans les modifier. Une relance ouverte par r5 est une découpe de
  sa variante, au sens de la précision K4, et garde au plus le préfixe de
  dimension de sa mère.
- **r5 conserve r4b** : le porteur est joué avant la question qu'il remplace.
  Un `braucht` satisfait le reste.

### 10.5 Les écarts de cohérence

Le mot « journal » est réservé au journal d'entraînement (m10). Les traces de
`cohere` s'appellent des **écarts**.

```ts
export type EcartAction = 'retire' | 'reduit' | 'non-reduit' | 'ajoute' | 'deplace'
  | 'detache' | 'garde-exception' | 'anomalie' | 'profil-absent';
export interface Ecart {
  regle: 0 | 1 | 2 | 3 | 4 | 5;    // 0 = profil absent ; 5 = r5 (7 oct. 2026)
  action: EcartAction;
  question: string;                // identifiant §10.4
  signes: Signe[];
  mere?: string;                   // relance : id de la mère dont elle suit l'écart (même action)
  cause?: string;                  // id gagnant (r2), tag / 'exige' (r3), signe (r4b), 'profil' / 'exclut' (r1), id(s) du porteur (r5)
  de?: KapitelId; vers?: KapitelId;
  sansReponse?: true;              // r3
  raison: string;                  // phrase française, gabarit fixe par (regle, action)
}
```

- **Un écart par couple (question, action)** (I7, INV-87). Quand une mère est
  retirée ou réduite, chacune de ses relances de précision la suit et reçoit
  **son propre** écart, avec la même action et `mere` renseigné. Tout écart
  entre trame brute et trame jouée est couvert. Seuls `garde-exception`,
  `anomalie` et `profil-absent` existent sans écart visible.
- **Lisibles** par `node scripts/checkCoherence.mjs --case <id>`. K3 ne touche
  pas `features/simulation` : un affichage des écarts dans l'app relève du pôle
  Expérience, plus tard (m14).
- Exemple (r1) : `RETIRÉ fach-infekt-neuro : meningismus, fazialis — hors profil (tags : schmerz, diarrhoe, reise)`.

### 10.6 La porte `checkCoherence.mjs`

Elle tourne dans le job `contrats`, **après** `checkTrameSymptoms`, sur le
montage réel des cas. Elle est **bloquante** : son job ne porte pas
`|| true`, au contraire d'INV-47.

**Après montage — 0 dès K3 (D7, I6) :**

| Compteur | Définition |
|---|---|
| `doublons` | signes cherchés par ≥ 2 unités jouées, hors `garde-exception` et hors perdantes `non-reduit` |
| `horsProfil` | signes hors profil encore cherchés, hors `non-reduit`, hors exceptions et hors questions du cas gardées par r1 (écart `anomalie`, décision K3) |
| `exigeAbsent` | `s ∈ exige_eff` cherché par aucune unité |
| `relancesOrphelines` | anomalies r4a (relance conditionnelle hors signe) |
| `brauchtViole` | anomalies r4b, plus toute question placée avant un de ses `braucht` |
| `ajouteSansReponse` | sonde de banque ajoutée par r3 sans `antworten[bank]`. Ce compteur est le garde, puisque `checkProbeCoverage` ne voit pas r3. **K3 ne merge qu'à 0** ; les réponses sont écrites en K2. |

**Structure** :
- lexique cohérent (INV-77, dès K0) ;
- `PROBE_SUCHT` total et discordances (INV-79, dès K1 pour les sondes) ;
- **aucun `relu` sur une énumération** : un `relu` posé sur un texte qui
  énumère, au sens du §3.2, au moins 2 items dont un signe absent de `sucht`
  échoue (D1, m12) ;
- profil présent et valide (INV-80, dès K2).

**Avant montage — plancher** : `app/scripts/fixtures/coherence-budget.json`,
enregistré dans `checkBudgetFloor.mjs`. Les valeurs initiales sont mesurées par
K0. Aucun compteur ne remonte ; le correcteur met le fichier à jour dans le
**même commit**.

```json
{
  "mesureLe": "<K0>", "cas": 130,
  "brut":  { "doublons": 0, "doublonsCas": 0, "horsProfil": 0, "exigeAbsent": 0,
             "relancesOrphelines": 0, "brauchtViole": 0 },
  "residu": { "questionsMuettes": 0, "nonReduit": 0, "casRetiresParR1": 0 },
  "allowed": []
}
```

- `brut` est la dette de contenu : le moteur corrige l'affichage, ce compteur
  pousse à corriger la **source**.
- `residu` doit atteindre **0 à la fin de K4** ; à K5, il devient bloquant à 0.
  `casRetiresParR1` compte une question du cas retirée par r1 : **il vaut 0 par
  construction depuis K3** (r1 ne retire jamais une question du cas), et la
  porte échoue s'il remonte.
- **Où se mesure le plancher (décision de main, K3).** `brut` se mesure sur la
  trame **jouée** (après `cohere`) : ce que l'utilisateur voit. Il baisse avec K3
  et reste la dette de contenu que le moteur ne corrige pas (questions du cas
  lues par leur texte, questions non réduites faute de `parts`).
- **Hausse de mesure** : quand une déclaration remplace la lecture du texte, un
  doublon jusque-là invisible apparaît. La hausse est acceptée en revue, avec sa
  raison écrite au fixture (§3.4).

**Exceptions** — `COHERENCE_ALLOWED`, dans `app/src/data/guides/coherence.ts`.
Elles vivent dans `src` parce que `cohere` les lit à l'exécution.

```ts
export const COHERENCE_ALLOWED: ReadonlyArray<{
  caseId: string; question: string; signe: Signe; regle: 1 | 2;
  raison: string; relecteur: string;   // non vides
}>;
```

- Le script échoue :
  - sur une entrée sans `raison` ou sans `relecteur` ;
  - sur une entrée **périmée**, qui ne correspond à aucune action que `cohere`
    ferait sans elle ;
  - si la liste grossit sans entrée datée au fixture (`allowed` : id, date,
    raison), même règle qu'`ALLOWED_COMPOSED`.
- Ajout réservé à la direction. La liste est **vide au départ** : l'exception
  testiculaire est une règle générique (`SUCHT_AUSSER`, tag dérivé `hoden`),
  pas une entrée par cas (m11).

**r5 et la porte (7 oct. 2026).** La porte monte la trame par `playedTrame`,
dont le contexte fournit `reponse` : ses compteurs se mesurent donc **avec**
r5, et `porte` compte dans `sucht`. Aucun compteur n'est ajouté par ce lot.
Deux suites sont proposées, sans être écrites ici :
- (P-r5a) Le plafond des constats de banque (`PLAFOND_BANQUE = 122`) vit
  aujourd'hui dans `reponseDoublon.test.ts`. Il gagnerait à passer au fixture
  `coherence-budget.json` (`brut.redites`), sous `checkBudgetFloor`, pour avoir
  un seul mécanisme de plancher.
- (P-r5b) `COHERENCE_ALLOWED` reste `regle: 1 | 2`. r5 n'a pas d'exception
  nominative : une question que r5 retire à tort se corrige à la source (la
  réplique ou les `parts`), ou par un motif de `ditsDe`.

`checkPlayedTrame` (lexical, tolérance `deepens` **retirée**, D3) reste en
filet secondaire. `checkProbeOverlap` et `checkQuestionOrder` restent
informatifs.

### 10.7 Le pipeline de création d'un futur cas

1. **Déclarer.** L'auteur écrit le `profil` et, sur chaque question du cas,
   `sucht`, éventuellement `followUpSucht` et `braucht`.
   `node scripts/measureCoherence.mjs --propose --case <id>` pré-remplit.
2. **Lire les écarts.**
   `node scripts/checkCoherence.mjs --case <id>` affiche la trame jouée et
   ses écarts. L'auteur corrige la source pour :
   - une question du cas retirée ;
   - un `sansReponse` : il faut écrire la réponse dans `antworten` ;
   - un `non-reduit` : il faut écrire des `parts` ;
   - une anomalie ;
   - un écart r5 (7 oct.) : il vérifie que la réplique `cause` dit bien le
     signe, et que la relance ouverte se pose seule (§10.4, règle r5 pour les
     auteurs).
3. **Relire.** Le relecteur clinique lit les écarts de tout nouveau cas, et
   1 cas sur 5 d'un lot de reprise.
4. **Porte.** Le cas n'entre que si `checkCoherence` passe.

L'étape est inscrite en K5 dans `app/scripts/PIPELINE.md` et dans
`.claude/agents/content-case-author.md` (DM3).

### 10.8 Compatibilité avec le client existant

- **Le contenu est servi à distance** : `main.tsx:132` appelle
  `contentLoader.sync()`, qui lit la fonction `content`
  (`lib/content/loader.ts:8`) et s'appuie sur `content_items.payload` (`jsonb`).
  Un client hors-ligne peut donc combiner un bundle nouveau et un contenu
  ancien, ou l'inverse. La clause « sans profil » compte **dès K3** (INV-90).
- **Aucun changement de schéma SQL ni de protocole de sync.** `profil`,
  `sucht`, `followUps`, `followUpSucht` et `braucht` sont **additifs**.
  `followUp` reste une `string`, qu'un client ancien lit par `trim()`
  (`followUp.ts:30`) ; il ne voit que la première relance.
- **Contenu sans profil, client nouveau** (I2) :
  - FACH_RULES, `aktuellSkip`, `fachSkip`, les tags dérivés et `SUCHT_AUSSER`
    s'appliquent ;
  - le volet « hors profil » de r1 et r3 sont inactifs, avec un écart
    `profil-absent` ;
  - r2 et r4 s'appliquent ;
  - une question du cas sans `sucht` est invisible à r2, comme aujourd'hui.
- `playedTrame` garde sa forme et gagne `ecarts`.
- **r5 (7 oct. 2026)** : `porte` est un champ du `PhraseVariant` joué,
  **calculé** au montage. Il n'est jamais écrit dans `content_items` ni dans
  le bundle. Un client ancien ne le connaît pas ; il garde son ancienne
  trame, sans r5. `CohereCtx.reponse` et `Ecart.regle = 5` sont additifs.
  Sans `reponse`, r5 est inactive.
- Le Rollenskript et `antworten` ne sont pas touchés par `cohere`. Seul DM1
  supprime 18 clés, en K1 et après fusion.

### 10.9 Invariants

| Id | Propriété | Mutation qui doit la faire rougir |
|---|---|---|
| **INV-77** | Lexique cohérent (§10.1) : `SIGNE_DEF` total ; tout signe exigible a une `bank` mono-signe ; `PROFIL_EXIGE[t]` pertinent pour `t` et disjoint de `PROFIL_EXCLUT[t]` ; `PROFIL_EXCLUT` sans signe de dépistage. | mettre `ausstrahlung` dans `PROFIL_EXIGE['generalisiert']` ; ajouter `'stuhl'` à `PROBE_SUCHT[bank de stuhlfrequenz]` |
| **INV-78** | Granularité : les `sucht` déclarés des paires de discrimination sont **disjoints deux à deux** — `akt-ausscheid-was` / `akt-ausscheid-haeufigkeit`, `polyurie` / `miktion`, `schwaeche` / fatigue, `taubheit` / `fach-ortho-cauda`. Chaque lot qui touche le lexique ajoute **une** paire. | fusionner `stuhlfrequenz` dans `stuhl` : les deux sondes partagent un signe |
| **INV-79** | Toute sonde déclare un `sucht` non vide (dès K1), comme toute question du cas (plancher, puis requis au type à K5). Une relance hérite de sa mère ou déclare. Texte ↔ déclaration discordant ⇒ `relu`, et jamais sur une énumération. Remplace INV-46. | retirer une entrée de `PROBE_SUCHT` ; poser `relu` sur `fach-rheuma-systemisch` au lieu de `sucht: ['fieber', …]` |
| **INV-80** | Tout cas a un profil valide (§10.3) : tags non vides et connus ; `exige_eff ∩ exclut_eff = ∅` ; `exclut` sans signe de dépistage et à raisons non vides ; tout `s ∈ exige_eff` a une `bank` pertinente pour `tags_eff`, hors `aktuellSkip` / `fachSkip` / `SUCHT_AUSSER`. | supprimer `profil` de `case-gastroenteritis` ; mettre la `bank` de `ort` dans `aktuellSkip` d'un cas tagué `schmerz` |
| **INV-81** | **Pas deux unités du même signe** dans la trame jouée : gagnant D4 calculé en une fois après r4a, sauf exception ou `non-reduit`. Deux questions du cas du même signe sont comptées (`doublonsCas`). | désactiver r2 ; rétablir la tolérance `deepens` (`case-fibromyalgie` repose `verlauf` ×3) ; inverser les rangs Fach / `aktuell` (`akt-verlauf` gagne contre `fach-rheuma-verlauf`) |
| **INV-82** | **Aucune question hors profil** dans la trame jouée, sauf exception ou `non-reduit`. | désactiver r1 : `akt-ausscheid-schlucken` revient dans `case-gastroenteritis`, « Welche Gelenke » dans `case-fibromyalgie` |
| **INV-83** | **Tout signe exigé par le profil est demandé.** | désactiver r3 : `case-gastroenteritis` (tagué `schmerz`) n'a ni Ort, ni Charakter, ni Intensität ; faire insérer par r3 une autre sonde que la `bank` |
| **INV-84** | **Toute relance conditionnelle porte sur le signe de sa mère** (0 après K1, DM2). Une relance inconditionnelle hors signe est détachée vers le chapitre de son signe. | remettre « Falls ja: Gibt es in Ihrer Familie Rheuma oder Gicht? » sous `fach-rheuma-vorgeschichte` ; désactiver le détachement : la relance inconditionnelle « Gibt es in Ihrer Familie Rheuma oder Gicht? » reste sous `fach-rheuma-vorgeschichte` au lieu de rejoindre `familie-sozial` |
| **INV-85** | **Aucune question n'utilise un antécédent avant la question qui l'introduit** : aucune question placée avant un de ses `braucht`. | déclarer `braucht: ['reise']` sur le CAS « dort gegessen » et désactiver r4b |
| **INV-86** | **`cohere` est pure, déterministe et idempotente (sous INV-77 et INV-80)** : même entrée, même trame et mêmes écarts ; entrée gelée et intacte ; `cohere(cohere(t))` sans action. | trancher les égalités par `Math.random` ou l'ordre d'un `Set` non trié ; muter `trame` en place ; donner à une `bank` deux signes |
| **INV-87** | **Écarts complets** : un écart par couple (question, action) ; tout écart brut → joué est couvert ; les relances d'une mère retirée ou réduite ont chacune leur écart, lié par `mere`. | retirer une question sans écart ; retirer une mère sans écart pour ses relances ; écrire deux écarts pour un même retrait |
| **INV-88** | **Aucune réponse de fiche perdue** : `cohere` ne modifie jamais `antworten` ; tout signe d'une question retirée par r2 reste porté par une question gardée ; `ajouteSansReponse = 0` dès K3, mesuré par `checkCoherence` (pas par `checkProbeCoverage`) ; DM1 ne supprime une clé qu'après fusion de toute réponse plus riche dans la réponse générale. | exécuter r2 avant r1 (le gagnant est retiré, son signe orphelin) ; retirer la réponse de la `bank` de `stuhlfrequenz` dans `case-gastroenteritis` ; filtrer `antworten` dans le montage |
| **INV-89** | La porte est bloquante (pas de `\|\| true`) ; les 6 compteurs après montage valent 0 dès K3 ; le plancher `brut` / `residu` ne remonte jamais ; `COHERENCE_ALLOWED` n'a ni entrée sans raison, ni entrée périmée. | ajouter `\|\| true` au job ; augmenter un compteur du fixture ; ajouter une exception sans `raison` |
| **INV-90** | Contenu sans `profil` (compte dès K3) : FACH_RULES, `aktuellSkip`, `fachSkip`, tags dérivés et `SUCHT_AUSSER` s'appliquent ; seuls r1-hors-profil et r3 sont inactifs, avec un écart `profil-absent` ; r2 et r4 s'appliquent. | supprimer `profil` d'une fixture : une question hors profil est retirée (rouge), ou une sonde `fachSkip` réapparaît (rouge) |
| **INV-91** | **Une relance de précision n'est pas une unité** : elle hérite du signe de sa mère et n'est jamais comptée comme doublon de celle-ci. Une relance qui déclare un autre signe est une unité (r2 et r4a s'appliquent). | traiter « Länger oder kürzer als eine halbe Stunde? » (sous `fach-rheuma-morgensteifigkeit`) comme une unité : r2 la retire comme doublon de `steifigkeit` |
| **INV-92** *(7 oct. 2026)* | **r5 ne retire que ce qui a été dit.** Sur les 130 cas, les signes cherchés par la trame jouée sont les mêmes avec et sans r5. Tout signe perdu par une question l'a été parce qu'une réplique jouée **avant** elle le dit, et cette réplique le porte (`porte`). r5 ne touche jamais une question du cas, un signe de risque, une sonde de dimension, ni un signe exigé dit aux seules Personalia. Une réplique au passé, un facteur (« beim Husten ») ou une image ne valent pas réponse. INV-86 et INV-87 couvrent r5. | désactiver r5 (pankreatitis redemande « Übelkeit oder Erbrechen ») ; supprimer le porteur ; ôter le filtre du passé (myokarditis perd veg-fieber) ; ôter la polarité ; ôter la garde de dimension ou de précision ; compter une réplique jouée **après** la question |

### 10.10 Lots, ordre et tests de contrat

**Ordre sur `seedCases.ts`** (un seul writer, I8) :

```
Q-gyn → K0 → K1 → K2 → K3 → K4 → K5 → Q3 → Q4 → Q5 → Q7 → Lc1–Lc3 → reliquat L
```

- K0 ne touche pas `seedCases.ts` : il fait le lexique et les scripts.
- D6 est tenu. Q3–Q5 et Q7 ne sont pas gelés : ils passent **après** K5
  parce qu'ils partagent `seedCases.ts`, et ils profiteront du moteur. Ils
  déclarent `sucht` sur tout ce qu'ils touchent (le compteur
  `questionsMuettes` ne remonte pas).
- Q6 et Q8 sont absorbés par le moteur.

| Lot | Livrable de contrat | Tests |
|---|---|---|
| **K0** | lexique `Signe`, `SIGNE_DEF`, `PROFIL_*`, `SUCHT_AUSSER` ; `measureCoherence.mjs` (`--propose`) ; `checkCoherence.mjs` informatif ; `coherence-budget.json` dans `checkBudgetFloor.mjs` | `symptoms.test.ts` : INV-77, INV-78 (première paire) ; les chiffres de la spec §2 reproduits |
| **K1** | `PROBE_SUCHT` total ; `followUpSucht` sur les relances des sondes ; `parts` des sondes énumératives ; **DM1** (3 sondes, `redundant`, `yieldsToGeneral`, 18 clés après fusion, `followUp.test.ts`) ; **DM2** (relances conditionnelles hors signe corrigées à la source) ; `phraseFollowUp` normalisé (I9) | INV-79 (sondes), INV-84, INV-91 |
| **K2** | `profil` des 130 cas ; **réponses des sondes de banque exigées** écrites dans `antworten` | INV-80 ; pré-calcul de `ajouteSansReponse = 0` |
| **K3** | `cohere` au montage (remplace `dedupeBySymptom` et `FACH_COVERS`) ; `ecarts` ; porte bloquante après montage. **Merge seulement si `ajouteSansReponse = 0`.** Ne touche pas `features/simulation`. | `coherence.test.ts` : INV-81 à INV-88, INV-90 et INV-91, sur fixtures **et** sur `case-gastroenteritis` / `case-fibromyalgie` réels (trames de la spec §3.3 attendues ligne à ligne) ; `coherence.fachCovers.test.ts` : chaque paire de `FACH_COVERS` est retirée par r2 sur les cas qui jouent la Fach, ou l'écart est listé au rapport K3 avec sa raison ; sortie de `fachChapterRaw` (FACH_RULES) identique avant et après K3 (I3) |
| **K4** | `sucht` et `braucht` des questions du cas ; `parts` manquants ; `residu` → 0 | plancher |
| **K5** | `CaseQuestion.sucht` requis au type ; `residu` bloquant ; **DM3** : `app/scripts/PIPELINE.md` et `.claude/agents/content-case-author.md` | INV-89 complet ; `quality.yml` sans `\|\| true` |
| **Banque** *(7 oct. 2026)* | r5 et `ditsDe` ; `porte` ; `CohereCtx.reponse` (`ctxDuCas`) ; trois relances de banque rendues autonomes ; parts de `fach-uro-fieber` | `coherenceBanque.test.ts` : INV-92 (130 cas : mêmes signes avec et sans r5 ; chaque perte dite plus haut et portée), lecture et garde-fous ; `coherence.test.ts` : INV-86 sur 130 cas **avec** `reponse` ; `reponseDoublon.test.ts` : `PLAFOND_BANQUE` ≤ 122. **À écrire** (proposé au plan, hors de ce contrat) : (a) un test de la règle des auteurs, pour vérifier que toute relance de précision de la banque, sous une part ou une question mono-signe, se pose seule ; (b) P-r5a (§10.6). **À ajouter au pipeline** (DM3) : la règle r5 pour les auteurs (§10.4) dans `PIPELINE.md` et `content-case-author.md`. |

### 10.11 Ce que la porte ne voit pas

- **La justesse d'une déclaration.** Un `sucht` ou un profil faux passe la
  porte. Seule la relecture clinique des écarts l'attrape (§10.7).
- **Ce qui est désormais vu (m12)** : un `relu` posé sur une énumération. La
  porte le refuse (§10.6). Une énumération qui échappe au compteur d'items du
  §3.2 (moins de 2 items reconnus) échappe aussi à cette garde.
- **L'anaphore non déclarée.** Une question qui dit « dort » sans `braucht`
  n'est vue que par le détecteur de texte, qui reste informatif (INV-47,
  précision ~55 %).
- **La qualité d'une sonde de la banque** ajoutée dans un cas qu'elle ne
  connaît pas. La règle 5 (variante résolue) s'applique toujours.
- **La justesse d'une lecture r5 (7 oct.)**. La porte ne voit pas qu'une
  réplique a été lue comme disant un signe qu'elle ne dit pas : le signe passe
  pour porté, et `exigeAbsent` reste à 0. Seules la relecture clinique des
  écarts r5 et les tests de lecture de `coherenceBanque.test.ts` l'attrapent.
  À l'inverse, un signe dit mais non lu laisse la question posée : la panne
  est sûre.

---

## 11. Contradictions relevées — amendement K

1. **`symptoms.ts:16-19` contredit D1.** Le commentaire dit « citer n'est pas
   chercher ». **Tranché par D1** : le commentaire et le choix tombent en K1.
2. **Écart à la spec §3.1 (m2).** La spec écrit `SigneDef.screening?` et
   `SigneDef.braucht?`, un `braucht` dans **deux sens** (pertinence et ordre),
   et INV-C1 « `sucht` **ou** `relu` ». Le contrat écrit un seul champ,
   `pertinence`, garde `braucht` pour l'ordre, et exige `sucht` toujours
   (`relu` = discordance voulue).
3. **`checkPlayedTrame.mjs:60-62` tolère `deepens`**, comme le faisait la
   doc d'`AnamneseProbe.deepens` (`anamneseProbes.ts:26-32`). **Tranché par
   D3.** Les badges « ↗ approfondit / ↻ déjà demandé » (`PhraseLine.tsx:81-84`)
   n'ont plus d'objet : proposition au pôle Expérience, hors K3.
4. **`FACH_COVERS` (`anamneseChapters.ts:419-456`) est absorbé par r2.** Son
   commentaire (`:415-418`) laisse la fièvre à Aktuelle Beschwerden ; sous D4,
   `fach-infekt-fieber` l'emporte. **Changement de comportement assumé.**
   L'exception testiculaire devient la règle générique `SUCHT_AUSSER` (m11).
5. **`FACH_RULES` n'est pas absorbé** (I3). La spec §3.3 annonçait que r1
   remplacerait sa « partie nature ». **Tranché par main** : `FACH_RULES`
   reste la couche d'adaptation, inchangée ; r1 n'ajoute que l'exclusion par
   profil.
6. **D4 contredisait `redundant: true`.** **Tranché par DM1** : les trois
   sondes sont supprimées, avec `redundant` et `yieldsToGeneral`. La règle
   provisoire « rang de `deepens` + 0,5 » est retirée.
7. **D2 dit « le premier symptôme du motif », qui n'est pas un champ**
   (`case-influenza`). **Tranché** : le tag `schmerz` d'un motif mixte est
   déclaré et relu.
8. **Le §1 de ce contrat type `braucht?: FrageId[]`, et le code n'a aucun
   `braucht`.** **Tranché** : `Signe[]`.
9. **La spec rend INV-C7 bloquant tout en tolérant un résidu « sonde ajoutée
   sans réponse ».** **Tranché par I6** : bloquant dès K3, réponses écrites
   en K2, compté par `checkCoherence`.
10. **Le contrat avait numéroté ses invariants 40–48**, alors qu'INV-50 à 76
    sont pris ailleurs. Le moteur prend **INV-77 à INV-91**.
11. **La spec compte 38 `Symptom`, `symptoms.ts` en déclare 39.** K0 fera foi.
12. **Prémisse corrigée (m1).** La première version disait le contenu servi
    par le bundle. C'est faux : `main.tsx:132` → `contentLoader.sync()` →
    fonction `content`. La compatibilité « sans profil » est donc réelle dès
    K3.
13. **r5 lit du texte, alors qu'ADR-0023 a écarté « déduire signes et profil
    du texte »** (7 oct. 2026). Avec `porte`, une lecture de réplique peut
    satisfaire `exigeAbsent`. **Tranché : amendement, pas de nouvel ADR.**
    L'alternative écartée visait les **déclarations** d'une question, lues par
    `TEXT_RE` (précision de 50 à 74 %). r5 lit les **répliques**, avec une
    table fermée qui privilégie la précision, et un signe non lu laisse la
    question posée. INV-92 garantit qu'aucun signe ne quitte la trame. Reste
    ouvert : aucune revue clinique formelle des 165 décisions de r5 (rapport du
    lot, « Non vérifié »). Si la direction juge qu'une lecture de réplique ne
    doit pas satisfaire un signe **exigé**, la correction est locale : élargir
    à tous les chapitres la garde `portable` de r5 (`coherence.ts`), qui ne
    s'applique aujourd'hui qu'aux Personalia, à l'Eröffnung et à l'Abschluss.
    La décision lui revient.
