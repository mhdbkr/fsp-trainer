# Contrat — `Frage` : la question atomique

> Statut : proposé (P0 série 3) · Écrit par `lead-s3-contrats` · 30 sept. 2026
> Source mesurée : `app/docs/reports/audit-questions-composees-serie3.md`
> (13,0 Mo, 53 286 chaînes, 130 cas chargés via `loadCases.mjs`).
> Consommé par : C4 (contenu — questions atomiques), C2 (guide d'anamnèse).
> **Amendement K (4 oct. 2026, ADR-0023)** — moteur de cohérence : lexique de
> signes, `sucht` obligatoire, profil clinique, `cohere`, porte `checkCoherence`
> (§10) ; contradictions §11. Consommé par les lots K0–K5.

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
  sucht: Signe[];          // ce qu'elle CHERCHE — OBLIGATOIRE, non vide (amendé K, §10.2)
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
| INV-77 → INV-90 | Moteur de cohérence — §10.9. (INV-49 est libre, mais INV-50 à INV-76 sont pris par d'autres contrats : la suite reprend à 77.) |

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
> (mesure : 130 cas, 8 492 questions affichées). Écrit par `platform-architect`.
> Aucun code n'est écrit ici : ce qui suit est opposable aux lots K0–K5.

### 10.0 Décisions de la direction — DÉCIDÉES le 4 oct. 2026

| # | Décision | Où elle s'applique |
|---|---|---|
| **D1** | Un signe cité dans une énumération compte comme demandé. | règle d'identité (c), §10.1 ; `relu` §10.2 |
| **D2** | Une douleur dans le **premier** symptôme du motif ajoute Ort, Charakter, Intensität même si la nature du cas n'est pas « douleur » ; pas une douleur accessoire. | tag `schmerz` déclaré, §10.3 ; r3 |
| **D3** | Une redite marquée `deepens` n'est plus tolérée : un signe, une question. | r2 ; `checkPlayedTrame` perd sa tolérance |
| **D4** | Conservation : question du cas > Fachanamnese > Aktuelle Beschwerden > végétative. | rang de r2, §10.4 |
| **D5** | Fach Infektiologie (gabarit borréliose) : le moteur la réduit d'abord, pas de scission. | r1 |
| **D6** | Q3–Q5 et Q7 continuent en déclarant `sucht` sur ce qu'ils touchent ; Q6 et Q8 gelés jusqu'à K3. | §10.10 |
| **D7** | Porte à 0 sur la trame jouée **après** montage dès K3 ; plancher (qui ne remonte jamais) sur le contenu brut jusqu'à K4. | §10.6 |

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
  | 'diarrhoe' | 'reise' | 'arthritis' | 'generalisiert' | 'dysphagie' | …; // liste fermée, commentée

export interface SigneDef {
  id: Signe;
  kapitel: KapitelId;                         // chapitre où il se cherche (r3, r4)
  pertinence: 'screening' | [ProfilTag, ...ProfilTag[]];
  bank?: ProbeId;                             // sonde canonique (r3) — requise si le signe est exigible
}
export const SIGNE_DEF: Record<Signe, SigneDef>;
export const SIGNES: readonly Signe[];        // ordre de déclaration = ordre de l'entretien
export const PROFIL_EXIGE: Record<ProfilTag, Signe[]>;            // 'schmerz' → ort, charakter, intensitaet
export const PROFIL_EXCLUT: Partial<Record<ProfilTag, Signe[]>>;  // 'generalisiert' → ausstrahlung
```

*Écart volontaire à la spec §3.1* : la spec écrit `screening?: true` et
`braucht?: ProfilTag[]` (deux champs optionnels). Le contrat écrit **un** champ
`pertinence`. Le compilateur garantit ainsi qu'un signe est l'un ou l'autre, et
le mot `braucht` garde un seul sens, l'ordre (§10.2).

**Règle d'identité (opposable).** *Deux questions cherchent le même signe si
et seulement si la fiche y répondrait par la même réplique.* Corollaires :

- (a) **granularité** : une question qui obtient une autre réplique cherche un
  autre signe. « Was hat sich am Stuhl verändert » (`stuhl`) n'est pas
  « Wie oft » (`stuhlfrequenz`) ;
- (b) **même signe, autres mots** : « Wie lange sind Sie morgens steif » et
  « Morgensteifigkeit ? » cherchent tous deux `steifigkeit` ;
- (c) **D1** : une énumération cherche **chaque** signe qu'elle nomme.
  « Haben Sie Fieber, Augenentzündungen… ? » cherche `fieber` ;
- (d) une **dimension** dont l'objet est le motif cherche la dimension, pas le
  symptôme. « Seit wann haben Sie Fieber? » cherche `beginn` ;
- (e) un antécédent ou un fait familial est un autre signe que le symptôme
  actuel (`familie_rheuma`, `gicht`) ;
- (f) les exemples d'un Auslöser (« — ein Essen, eine Reise ») ne sont pas
  demandés.

**Cohérence statique du lexique** (INV-77) :
- chaque signe a un `SIGNE_DEF` ;
- un signe exigible (présent dans une valeur de `PROFIL_EXIGE`) a une `bank` ;
  `PROBE_SUCHT[bank]` vaut **exactement** `[signe]`, et le `kapitel` de la
  `bank` n'est ni `fach` ni `frauenanamnese` (son chapitre existe dans toute
  trame) ;
- `PROFIL_EXIGE[t]` ne contient que des signes pertinents pour `t` (screening,
  ou `t ∈ pertinence`) et aucun signe de `PROFIL_EXCLUT[t]`.

Ces trois conditions rendent `cohere` idempotente : ce que r3 ajoute, ni r1 ni
r2 ne peut le retirer au passage suivant.

### 10.2 `sucht` obligatoire — sonde, question du cas, relance

| Porteur | Déclaration | Lieu | Échéance bloquante |
|---|---|---|---|
| Sonde | `PROBE_SUCHT: Record<ProbeId, [Signe, ...Signe[]]>` — **totale** (230/230 ; 82 aujourd'hui) | bundle | K1 |
| Relance d'une sonde | `followUp?: Array<string \| { text: string; sucht: [Signe, ...Signe[]] }>` (aussi dans `parts[].followUp`) ; `string` = muette, comptée | bundle | K1 (sondes) |
| Question du cas | `CaseQuestion.sucht: [Signe, ...Signe[]]` (36/865 aujourd'hui) | contenu | plancher jusqu'à K4, requis au type à K5 |
| Relance d'une question du cas | `CaseQuestion.followUpSucht?: [Signe, ...Signe[]]` — **champ séparé**, `followUp` reste une `string` | contenu | idem |
| Ordre | `CaseQuestion.braucht?: [Signe, ...Signe[]]` ; sur une sonde : `PROBE_BRAUCHT: Partial<Record<ProbeId, Signe[]>>` | les deux | K4 |

- **Pourquoi `followUpSucht` à part** : les questions du cas voyagent dans le
  contenu publié (`content_items.payload`). Un client ancien lit
  `followUp.trim()` (`followUp.ts:30`). Un objet à la place de la chaîne le
  ferait planter, alors qu'un champ de plus est ignoré. Les sondes vivent dans
  le bundle et n'ont pas cette contrainte.
- **`relu`** ne dispense plus de `sucht`. Il marque une **discordance
  voulue** : le texte nomme un signe que `sucht` ne porte pas, parce qu'il le
  mentionne sans l'interroger (« rheumatisches Fieber » en Vorerkrankung, le
  motif rappelé). Une énumération n'est jamais `relu` (D1).
- **Discordance = échec** : si un `TEXT_RE` du lexique trouve un signe absent
  de `sucht` et que `relu` n'est pas posé, la porte échoue. C'est l'extension de
  `checkTrameSymptoms` à tout signe qui a un motif de texte.
- **Une relance précise sa mère** : `relance.sucht ⊆ mère.sucht`. Sinon r4.
- **`braucht`** est en `Signe[]`, pas en `FrageId[]` comme l'écrivait le §1 :
  une question nommée peut être retirée par r2 au profit d'une autre qui
  cherche le même signe. La dépendance porte sur l'information, pas sur la
  phrase.

### 10.3 Le profil clinique du cas

```ts
export interface Profil {
  tags: [ProfilTag, ...ProfilTag[]];        // non vide
  exige?: Signe[];                          // en plus de PROFIL_EXIGE[tags]
  exclut?: Partial<Record<Signe, string>>;  // signe → raison écrite (obligatoire, non vide)
}
// PatientSheet.profil?: Profil — optionnel AU TYPE (contenu ancien), exigé PAR LA PORTE dès K2.
```

**Profil effectif**, calculé au montage et jamais écrit :

```
tags_eff   = profil.tags ∪ { leitsymptomOf(c) }      // la nature est le seul tag dérivé
exige_eff  = ⋃ PROFIL_EXIGE[t ∈ tags_eff] ∪ profil.exige
exclut_eff = clés(profil.exclut) ∪ ⋃ PROFIL_EXCLUT[t ∈ tags_eff]
valide     ⇔ exige_eff ∩ exclut_eff = ∅
```

| Élément | Origine |
|---|---|
| tag de la nature (`leitsymptomKategorie`, ou `schmerz` par défaut) | **dérivé** (`leitsymptomOf`, existant) |
| tous les autres tags, dont `schmerz` d'un motif mixte (D2) | **déclaré à la main**, pré-rempli par `measureCoherence.mjs --propose` (motif, `begleitsymptome`, bloc `schmerz`, soupçon, DD, négations), relu par spécialité |
| `exige`, `exclut` et leurs raisons | **déclarés à la main**, relus |
| `aktuellSkip`, `fachSkip` | **gelés** : appliqués par r1 et journalisés (`cause: 'skip'`), sans nouvelle entrée (compteur au plancher). Un nouveau cas utilise `exclut`. La réponse d'une sonde `fachSkip` reste exigée (sémantique inchangée, `types.ts:94-99`). |

D2 ne se dérive pas. `leitsymptome[0]` est souvent **une** phrase qui porte
plusieurs symptômes. Celui de `case-influenza` contient « Kopf- und
Gliederschmerzen », une douleur accessoire selon D2. Le tag `schmerz` d'un motif
mixte est donc un jugement clinique **déclaré**, que la proposition mécanique
suggère.

### 10.4 `cohere` — les quatre règles

```ts
// app/src/data/guides/coherence.ts (nouveau) ; appelé par playedTrame à la place de dedupeBySymptom
export function cohere(
  trame: TrameChapter[],              // la trame brute, ordonnée (Fach insérée après 'aktuell')
  profil: ProfilEffectif | undefined, // undefined = contenu sans profil (§10.8)
  caseId: string,
): { trame: TrameChapter[]; journal: JournalEntry[] };
// playedTrame(c) gagne un champ additif : { chapters, fach?, journal }
```

**Vocabulaire.**
- Une **unité** est une question mère et ses relances. Les signes d'une unité
  sont le `sucht` de la mère.
- Le **rang** de conservation suit D4 :
  - 0 : question du cas, quel que soit son chapitre ;
  - 1 : Fach ;
  - 2 : `aktuell` ;
  - 3 : `vegetativ` ;
  - 4 : les autres chapitres. Ce rang est une extension du contrat, hors D4.
- Une sonde `redundant: true` prend le rang de sa `deepens` + 0,5 : elle cède à
  la version générale, qu'elle déclare plus riche (voir §11.6).
- L'**identifiant** d'une question est :
  - pour une sonde, son `probeId` ;
  - pour une question du cas, `cas:<index dans caseSpecificQuestions>` ;
  - pour une relance, `<id mère>#<rang>`.
- La **règle d'insertion** sert à r3 et r4. Dans le chapitre cible, on insère
  après la dernière question dont le premier signe précède le signe inséré
  dans `SIGNES`. À défaut, on insère en tête du chapitre.

**Ordre d'exécution, en une passe** : r1 → r4a → r2 → r3 → r4b. Les relances
sont détachées avant r2, pour qu'elles concourent au rang de leur origine.

| Règle | Décision déterministe | Journal |
|---|---|---|
| **r1 — hors profil** | Un signe `s` est hors profil si `s ∈ exclut_eff`, ou si `pertinence(s) ≠ 'screening'` et `pertinence(s) ∩ tags_eff = ∅`. Pour chaque question **et** chaque relance : si tous ses signes sont hors profil, elle est retirée ; si une partie l'est, elle est réduite aux `parts` dont le `sucht` n'est pas inclus dans les signes hors profil ; sans `parts`, elle est **gardée entière** (résidu). Une sonde de `aktuellSkip` / `fachSkip` est retirée. | `retire` / `reduit` / `non-reduit`, `cause: 'profil' \| 'exclut' \| 'skip'` |
| **r4a — relances** | Une relance dont le `sucht` n'est pas inclus dans celui de sa mère : si elle est **inconditionnelle** (`parseFollowUp(...).kind === 'immer'`), elle est **détachée** et devient une question du chapitre `SIGNE_DEF[premier signe].kapitel`, placée par la règle d'insertion, au rang de son origine. Si elle est **conditionnelle** (`Falls …:`), elle reste en place et devient une **anomalie**, parce qu'on ne peut pas lever sa condition sans réécrire le texte. | `detache` (`de`, `vers`) / `anomalie` |
| **r2 — un signe, une question (D3, D4)** | Pour chaque signe cherché par au moins deux unités, le **gagnant** est l'unité de rang minimal. À rang égal, c'est la première dans l'ordre de la trame. Les perdantes perdent ce signe : retrait, réduction par `parts`, ou `non-reduit` sans `parts`. Une question du cas gagnante prend la place de la première perdante du **même chapitre** placée au-dessus d'elle (comportement de `symptoms.ts:215-233` conservé). Une entrée de `COHERENCE_ALLOWED` (r2) garde le signe sur la question nommée. | `retire` / `reduit` / `non-reduit` (`cause` = id du gagnant) ; `deplace` pour la prise de place ; `garde-exception` |
| **r3 — rien d'attendu absent** | Pour chaque `s ∈ exige_eff` qu'aucune unité ne cherche, la sonde `SIGNE_DEF[s].bank` est insérée dans `SIGNE_DEF[s].kapitel` par la règle d'insertion. Elle est ajoutée même si la fiche n'a pas de réponse (`antworten[bank]` absent) : l'entrée est alors marquée `sansReponse` (résidu). **Jamais de texte inventé** : seule une sonde de la banque entre. | `ajoute`, `cause` = tag ou `'exige'` |
| **r4b — ordre sans présupposition** | Pour chaque question à `braucht`, dans l'ordre de la trame : si un signe de `braucht` n'est cherché que **plus bas**, la question est déplacée juste après la dernière des premières questions qui cherchent ces signes. Un signe de `braucht` cherché nulle part, ou un cycle, est une anomalie. On itère jusqu'au point fixe, en au plus *n* passes ; une question ne se déplace qu'une fois par passe. | `deplace` (`de`, `vers`, `cause` = signe) / `anomalie` |

**Propriétés (opposables).**
- **Pure** : aucune entrée mutée, ni `Date`, ni hasard, ni E/S. Seuls les
  tables statiques du lexique et `COHERENCE_ALLOWED` sont lus.
- **Déterministe** : la même entrée donne la même trame et le même journal,
  ordre compris.
- **Idempotente** : `cohere` appliquée à sa propre sortie rend une trame égale
  et un journal sans aucune entrée `retire`, `reduit`, `ajoute`, `deplace` ou
  `detache`.
- **Sans texte inventé** : on retire, on réduit par `parts` rédigés à la main,
  on ajoute une sonde de la banque.
- **Ne touche jamais `antworten`** : le simulant peut toujours répondre à une
  question retirée.

### 10.5 Le journal de cohérence

```ts
export type JournalAction = 'retire' | 'reduit' | 'non-reduit' | 'ajoute' | 'deplace'
  | 'detache' | 'garde-exception' | 'anomalie' | 'profil-absent';
export interface JournalEntry {
  regle: 0 | 1 | 2 | 3 | 4;        // 0 = profil absent
  action: JournalAction;
  question: string;                // identifiant §10.4
  signes: Signe[];                 // signes concernés par l'action
  cause?: string;                  // id gagnant (r2), tag / 'exige' (r3), signe (r4b), 'profil' / 'exclut' / 'skip' (r1)
  de?: KapitelId; vers?: KapitelId;
  sansReponse?: true;              // r3 : la fiche n'a pas la réponse
  raison: string;                  // phrase française, gabarit fixe par (regle, action)
}
```

- **Complet** (INV-87) : tout écart entre trame brute et trame jouée (question
  absente, réduite, ajoutée, déplacée, détachée) a **exactement une** entrée.
  Une entrée sans écart n'existe que pour `garde-exception`, `anomalie` et
  `profil-absent`.
- **Lisible** : `node scripts/checkCoherence.mjs --case <id>` affiche la trame
  jouée suivie du journal. En dev, l'affichage sous le guide d'anamnèse est
  **permis** ; le rendu est une décision du pôle Expérience.
- Exemple (r1) : `RETIRÉ fach-infekt-neuro : meningismus, fazialis — hors profil (tags : schmerz, diarrhoe, reise)`.

### 10.6 La porte `checkCoherence.mjs`

Elle tourne dans le job `contrats`, **après** `checkTrameSymptoms`, sur le
montage réel des 130 cas. Elle est **bloquante** : son job ne porte pas
`|| true`, au contraire d'INV-47. Exit ≠ 0 ferme la porte.

**Après montage (D7) — 0 dès K3 :**

| Compteur | Définition |
|---|---|
| `doublons` | signes cherchés par ≥ 2 unités de la trame jouée, hors `garde-exception` et hors perdantes `non-reduit` (comptées en résidu) |
| `horsProfil` | signes hors profil encore cherchés, hors `non-reduit` (résidu) et hors exceptions |
| `exigeAbsent` | `s ∈ exige_eff` cherché par aucune unité |
| `relancesOrphelines` | anomalies r4a : relance conditionnelle hors signe de sa mère |
| `brauchtViole` | anomalies r4b, plus toute question placée avant un de ses `braucht` |

**Structure** : lexique cohérent (INV-77, dès K0) ; `PROBE_SUCHT` total
(INV-79, dès K1) ; profil présent et valide sur les 130 cas (INV-80, dès K2).

**Avant montage — plancher** : `app/scripts/fixtures/coherence-budget.json`,
enregistré dans `checkBudgetFloor.mjs`. Les valeurs initiales sont mesurées par
K0. Aucun compteur ne remonte ; le correcteur met le fichier à jour dans le
**même commit** que sa correction.

```json
{
  "mesureLe": "<K0>", "cas": 130,
  "brut":  { "doublons": 0, "horsProfil": 0, "exigeAbsent": 0, "relancesOrphelines": 0, "brauchtViole": 0 },
  "residu": { "questionsMuettes": 0, "relancesMuettes": 0, "nonReduit": 0,
              "ajouteSansReponse": 0, "skips": 0, "casRetiresParR1": 0 },
  "allowed": []
}
```

- `brut` est la dette de contenu : combien de corrections le moteur fait. Le
  moteur corrige l'affichage ; ce compteur pousse à corriger la **source**.
- `residu` doit atteindre **0 à la fin de K4**. À K5, il devient bloquant à 0
  et `CaseQuestion.sucht` devient requis au type. `casRetiresParR1` compte une
  question du cas retirée par r1 : c'est une erreur de source, puisqu'elle a été
  écrite pour ce patient, donc le profil ou `sucht` est faux.
- **Hausse de mesure** : quand une déclaration remplace la lecture du texte, un
  doublon jusque-là invisible devient visible. La hausse est acceptée en revue,
  avec sa raison écrite dans le fixture, comme pour l'atomicité (§3.4).

**Exceptions** — `COHERENCE_ALLOWED`, dans `app/src/data/guides/coherence.ts`.
Elles vivent dans `src` parce que `cohere` les lit à l'exécution : la red flag
voulue doit rester affichée.

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
  - si la liste grossit sans entrée datée au fixture (`allowed` : id, date, raison), même règle
    qu'`ALLOWED_COMPOSED`.
- Ajout réservé à la direction (spec §3.6).
- **Entrée initiale imposée** : l'exception « douleur testiculaire »
  (`anamneseChapters.ts:1855-1858`, revue clinique C-1).
  `fach-uro-flanke` ne dit pas où irradie une douleur du testicule, donc
  `akt-ausstrahlung` reste. Elle migre du code vers la liste, une entrée par
  cas concerné.

`checkPlayedTrame` (lexical, tolérance `deepens` **retirée**, D3) reste en
filet secondaire. `checkProbeOverlap` et `checkQuestionOrder` restent
informatifs.

### 10.7 Le pipeline de création d'un futur cas

1. **Déclarer.** L'auteur écrit `profil` (tags, `exige`, `exclut` et ses
   raisons) et, sur chaque question du cas, `sucht`, éventuellement
   `followUpSucht` et `braucht`. `node scripts/measureCoherence.mjs --propose
   --case <id>` pré-remplit, et l'auteur accepte ou corrige dans la source.
2. **Lire le journal.**
   `node scripts/checkCoherence.mjs --case <id>` affiche la trame jouée et
   le journal. Ce que le journal révèle, l'auteur le corrige dans la source :
   - une question du cas retirée ;
   - une sonde ajoutée `sansReponse` : il faut écrire la réponse dans
     `antworten` ;
   - un `non-reduit` : il faut écrire des `parts` ;
   - une anomalie.
3. **Relire.** Le relecteur clinique lit le journal de tout nouveau cas, et
   1 cas sur 5 d'un lot de reprise.
4. **Porte.** Le cas n'entre que si `checkCoherence` passe (CI identique). Un
   futur cas ne peut pas entrer avec une question muette, sans profil, avec une
   sonde exigée sans réponse, ou avec une entrée `brut` qui fait remonter le
   plancher.

L'inscription de cette étape dans `app/scripts/PIPELINE.md` et dans l'agent
`content-case-author` est **hors du périmètre de ce contrat**. C'est une
proposition au coordinateur, à réaliser en K5.

### 10.8 Compatibilité avec le client existant

- **Aucun changement de schéma SQL ni de protocole de sync.** Les cas voyagent
  en `content_items.payload` (`jsonb`). `profil`, `sucht`, `followUpSucht` et
  `braucht` sont des champs **additifs**, qu'un client ancien ignore.
- **Contenu ancien, client nouveau** (cache hors-ligne d'avant K2) : `profil`
  absent ⇒ `cohere` n'applique **ni r1 ni r3**. Elle écrit une entrée
  `profil-absent` et applique r2 et r4. Aucun retrait massif sur un appareil
  qui n'a pas encore tiré le contenu. Une question du cas sans `sucht` est
  invisible à r2, comme aujourd'hui.
- `playedTrame` garde sa forme et gagne `journal`. Le guide et le focus ne
  changent pas de point d'entrée.
- Le Rollenskript et `antworten` ne sont pas touchés (§10.4).
- *Non vérifié* : sur `main`, aucun module de `app/src` n'appelle
  `content_since` (grep vide au 4 oct.). Les cas semblent servis par le bundle,
  et la clause « contenu ancien » protège le futur tirage de contenu, pas le
  présent.

### 10.9 Invariants

| Id | Propriété | Mutation qui doit la faire rougir |
|---|---|---|
| **INV-77** | Lexique cohérent (§10.1) : `SIGNE_DEF` total ; tout signe exigible a une `bank` mono-signe hors `fach` / `frauenanamnese` ; `PROFIL_EXIGE[t]` pertinent pour `t` et disjoint de `PROFIL_EXCLUT[t]`. | ajouter `'stuhl'` à `PROBE_SUCHT[bank de stuhlfrequenz]` ; mettre `ort` dans `PROFIL_EXIGE['generalisiert']` |
| **INV-78** | Discrimination de la granularité : `akt-ausscheid-was` ≠ `akt-ausscheid-haeufigkeit` ; `polyurie` ≠ `miktion` ; `schwaeche` ≠ fatigue ; `taubheit` ≠ `fach-ortho-cauda` ; et `fach-rheuma-morgensteifigkeit` = CAS « morgens steif » (fibromyalgie). | fusionner `stuhlfrequenz` dans `stuhl` : `akt-ausscheid-haeufigkeit` disparaît de `case-gastroenteritis` |
| **INV-79** | Toute question jouable déclare un `sucht` non vide : sondes 230/230 (dès K1), questions du cas et relances (plancher, puis K5). Texte ↔ déclaration discordant ⇒ `relu`. Remplace INV-46. | retirer une entrée de `PROBE_SUCHT` ; retirer `fieber` du `sucht` de `fach-rheuma-systemisch` |
| **INV-80** | Tout cas a un `profil` valide : tags non vides et connus, `exige_eff ∩ exclut_eff = ∅`, toute raison d'`exclut` non vide. | supprimer `profil` de `case-gastroenteritis` ; `exclut: { ort: '' }` |
| **INV-81** | **Pas deux questions du même signe** dans la trame jouée. Le gagnant est celui de D4, sauf exception ou résidu `non-reduit`. | désactiver r2 ; rétablir la tolérance `deepens` : `case-fibromyalgie` repose `verlauf` ×3 ; inverser les rangs Fach / `aktuell` : `akt-verlauf` gagne contre `fach-rheuma-verlauf` |
| **INV-82** | **Aucune question hors profil** dans la trame jouée, sauf exception ou résidu. | désactiver r1 : `akt-ausscheid-schlucken` revient dans `case-gastroenteritis`, « Welche Gelenke » dans `case-fibromyalgie` |
| **INV-83** | **Tout signe exigé par le profil est demandé.** | désactiver r3, ou retirer le tag `schmerz` (D2) : `case-gastroenteritis` perd Ort, Charakter, Intensität |
| **INV-84** | **Toute relance conditionnelle porte sur le signe de sa mère** (`sucht ⊆ mère.sucht`). Une relance inconditionnelle hors signe est détachée. | remettre « Gibt es in Ihrer Familie Rheuma oder Gicht? » en relance `Falls ja:` de `fach-rheuma-vorgeschichte` |
| **INV-85** | **Aucune question n'utilise un antécédent avant la question qui l'introduit** : aucune question n'est placée avant un de ses `braucht` (« dort », « damals », pronom). | déclarer `braucht: ['reise']` sur le CAS « dort gegessen » et désactiver r4b |
| **INV-86** | **`cohere` est pure, déterministe et idempotente** : même entrée, même trame et même journal, en ordre et en valeur ; entrée gelée en profondeur et intacte ; `cohere(cohere(t))` sans action. | trancher les égalités par `Math.random` ou l'ordre d'un `Set` non trié ; muter `trame` en place ; ajouter par r3 une sonde de `bank` multi-signe |
| **INV-87** | **Journal complet** : tout écart brut → joué a exactement une entrée avec `regle` et `raison` non vide. | retirer une question sans écrire au journal ; écrire deux entrées pour un même retrait |
| **INV-88** | **Aucune réponse de fiche perdue** : `cohere` ne modifie jamais `antworten` ; tout signe qu'une question retirée par r2 cherchait reste porté par une question gardée ; toute sonde ajoutée par r3 a sa réponse (plancher `ajouteSansReponse`, bloquant à K5, `checkProbeCoverage`). | exécuter r2 avant r1, si bien que le gagnant est retiré et son signe orphelin ; filtrer `antworten` dans le montage |
| **INV-89** | La porte est bloquante (pas de `\|\| true`), les 5 compteurs après montage valent 0 dès K3, le plancher `brut` / `residu` ne remonte jamais, et `COHERENCE_ALLOWED` n'a ni entrée sans raison ni entrée périmée. | ajouter `\|\| true` au job ; augmenter un compteur du fixture ; ajouter une exception sans `raison` |
| **INV-90** | Contenu sans `profil` : r1 et r3 sont inactives, une entrée `profil-absent` est écrite, r2 et r4 s'appliquent. | supprimer `profil` d'une fixture de cas : aucune question retirée pour « hors profil » |

### 10.10 Tests de contrat à écrire

| Fichier | Lot | Prouve |
|---|---|---|
| `app/src/data/guides/symptoms.test.ts` (étendu) | K0–K1 | INV-77, INV-78, INV-79 (sondes) |
| `app/scripts/measureCoherence.mjs` (pérennise `measure.mjs`) | K0 | reproduit les chiffres de la spec §2 ; `--propose` |
| `app/src/data/guides/coherence.test.ts` | K3 | INV-81 à INV-88 et INV-90, sur fixtures **et** sur `case-gastroenteritis` / `case-fibromyalgie` réels (les deux trames de la spec §3.3 attendues ligne à ligne) ; idempotence et pureté (entrée `structuredClone` + `deepFreeze`) |
| `app/src/data/guides/coherence.fachCovers.test.ts` | K3 | **non-régression `FACH_COVERS`** : pour chaque paire de la carte actuelle, la sonde de variante est retirée par r2 sur les cas qui jouent la Fach. Sinon l'écart est listé au rapport K3 avec sa raison. La carte est absorbée, pas perdue. |
| `app/scripts/checkCoherence.mjs` | K0 (informatif) → K3 (bloquant après montage) → K5 (résidu bloquant) | INV-80, INV-89 ; `--case <id>` |
| `app/scripts/checkBudgetFloor.mjs` | K0 | enregistre `coherence-budget.json` |
| `.github/workflows/quality.yml` | K0 / K3 | ordre `checkTrameSymptoms` → `checkCoherence` ; pas de `\|\| true` à partir de K3 |

**D6** : Q3–Q5 et Q7 continuent. Toute question qu'ils touchent porte `sucht`,
ce que le compteur `questionsMuettes` vérifie : il ne remonte pas. Q6 et Q8 ne
s'ouvrent pas avant le merge de K3.

### 10.11 Ce que la porte ne voit pas

- **La justesse d'une déclaration.** Un `sucht` faux ou un profil faux passe
  la porte. Seule la relecture clinique les attrape (relecture du journal,
  §10.7).
- **L'anaphore non déclarée.** Une question qui dit « dort » sans `braucht`
  n'est vue que par le détecteur de texte, qui reste informatif (INV-47,
  précision ~55 %).
- **La qualité d'une sonde de la banque** ajoutée dans un cas qu'elle ne
  connaît pas. La règle 5 (variante résolue) s'applique toujours.

---

## 11. Contradictions relevées — amendement K

1. **`symptoms.ts:16-19` contredit D1.** Le code écrit : « une question qui
   ne fait que citer un symptôme parmi d'autres signes (« Fieber,
   Augenentzündung, Geschwüre… » en rhumato) n'est pas une question sur ce
   symptôme ». La direction a tranché l'inverse. **Tranché par D1** : le
   commentaire et le choix tombent en K1, et `fach-rheuma-systemisch`,
   `akt-infekt-herd` et `akt-begleit` reçoivent `sucht` et des `parts`.
2. **`checkPlayedTrame.mjs:60-62` tolère `deepens`** (« Une Fach approfondit
   une question générale par contrat : toléré »), comme le faisait
   `AnamneseProbe.deepens` (« On ne supprime pas la question »,
   `anamneseProbes.ts:26-32`). **Tranché par D3** : la tolérance est retirée.
   Les badges « ↗ approfondit / ↻ déjà demandé » (`PhraseLine.tsx:81-84`)
   n'ont plus d'objet ; c'est une proposition au pôle Expérience.
3. **`FACH_COVERS` (`anamneseChapters.ts:419-456`) est absorbé par r2.** Son
   commentaire (`:415-418`) laisse la fièvre à « Aktuelle Beschwerden » quand le
   motif est la fièvre. Sous D4, `fach-infekt-fieber` (rang 1) l'emporte sur
   `akt-infekt-fieber` (rang 2). **Changement de comportement assumé** : la
   Fach suit immédiatement `aktuell`, et la version Fach est la plus riche
   (hauteur, durée, schübe). L'exception testiculaire (`:1855-1858`) migre dans
   `COHERENCE_ALLOWED` (§10.6).
4. **Le §1 de ce contrat type `braucht?: FrageId[]`, la spec écrit `Signe[]`,
   et le code n'a aucun `braucht`.** **Tranché ici** (§10.2) : `Signe[]`,
   parce qu'une question nommée peut être retirée par r2.
5. **La spec INV-C1 (« `sucht` **ou** `relu` ») contredit le mandat** de
   rendre `sucht` obligatoire. **Tranché ici** : `sucht` toujours ; `relu`
   n'est que la marque d'une discordance voulue (§10.2).
6. **D4 contredit `redundant: true`.** Trois sondes en sont marquées :
   `fach-chir-fieber`, `fach-chir-uebelkeit` et `fach-chir-blutverduenner`.
   Elles se déclarent plus pauvres que leur version générale, et
   `symptoms.ts:205-213` les fait céder. Le rang strict D4 (Fach > végétative)
   les ferait gagner. **Tranché ici** : elles prennent le rang de leur
   `deepens` + 0,5 et cèdent, ce qui est le comportement actuel. *Question à la
   direction* : supprimer plutôt ces trois sondes en K1 ?
7. **D2 dit « le premier symptôme du motif », mais ce n'est pas un champ.**
   `leitsymptome[0]` de `case-influenza` porte la fièvre **et** « Kopf- und
   Gliederschmerzen », la douleur accessoire que D2 exclut. **Tranché ici** : le
   tag `schmerz` d'un motif mixte est déclaré à la main et relu (§10.3), pas
   dérivé.
8. **La spec emploie `braucht` dans deux sens.** `SigneDef.braucht` désigne la
   pertinence par tag, et `CaseQuestion.braucht` l'ordre. **Tranché ici** : le
   premier devient `pertinence`.
9. **La spec rend INV-C7 bloquant** (« toute sonde ajoutée par r3 a sa
   réponse »), **mais en même temps** elle tolère « sonde ajoutée sans réponse »
   en résidu jusqu'à K4. **Tranché par D7** : résidu au plancher jusqu'à K4,
   bloquant à K5 (INV-88).
10. **Ce contrat a numéroté ses invariants 40–48 ; la suite naturelle INV-49
    déborde** sur INV-50–76, pris ailleurs (`training-journal.md`,
    `simulation-run.md`…). Le moteur prend **INV-77 à INV-90**.
11. **Le décompte du lexique diffère.** La spec compte « les 38 `Symptom`
    existants », alors que `symptoms.ts` en déclare **39** (16 + 21 + `schub`,
    `waerme`). Le décompte est sans effet sur la conception ; K0 fera foi.
