# Pipeline PHASE 2 — version efficiente (v2)

Remplace le pipeline v1 (7–13 agents `high` par cas, ~250–950k tokens pour 2–3 cas,
saturait souvent la session avant de finir).

## Principe

Trois étages, du moins cher au plus cher. **On ne paie un agent que pour ce qu'un
script ne peut pas faire.**

```
① RECHERCHE (1 agent medium / lot)      ← mutualisée, PAS par cas
   extrait les passages de protocole utiles pour les N pathologies du lot
   → résumé texte réutilisé par tous les étages suivants

② AUTHORING (1 agent high / lot)        ← par LOT, pas par cas
   produit Fachwissen + Cas + Muster pour les N pathologies d'un coup
   (schéma = tableau d'objets ; le contexte lourd n'est chargé qu'UNE fois)

③ GATE en 3 temps
   a. SCRIPTS (gratuit, instantané)  → checkProbeCoverage + checkMusterCoverage
                                       + checkCaseCoherence
                                       + checkCoherence (l'étape « cohérence », plus bas)
   b. VÉRIF CONSOLIDÉE (1 agent medium / cas) : 4 sous-verdicts en une passe
   c. ADVERSARIAL 4-lentilles (high)  → SEULEMENT si (b) doute, ou cas à risque
                                        (notfall, comorbidité lourde, oncologie)
```

## Pourquoi c'est moins cher, à qualité égale

| Levier | v1 | v2 |
|---|---|---|
| Lecture des protocoles | 6× par cas (auteur + 4 lentilles + fw) | **1× par lot** |
| Chargement schéma/instructions | 1× par cas | **1× par lot** |
| Vérification | 4 agents `high` / cas | scripts + **1 agent `medium`** / cas |
| Adversarial complet | systématique | **ciblé** (échantillon à risque) |
| Points de rupture / limite de session | 8–13 | **2–3** |

La qualité est préservée parce que **la rigueur ne venait pas du nombre d'agents**
mais du contrat : sondes obligatoires, chapitres Muster, schéma typé — tous
vérifiés mécaniquement par l'étage ③a, gratuitement et sans faille.

Preuve : `checkCaseCoherence.mjs` détecte tout seul le défaut BLOQUANT
(IMC 28,4 étiqueté « Adipositas ») que la lentille adversariale `high` avait mis
un run complet à trouver.

## Ce que les scripts couvrent (donc plus besoin d'agent)

- couverture des sondes d'anamnèse (`checkProbeCoverage`)
- couverture des chapitres Muster (`checkMusterCoverage`)
- cohérence identité/chiffres, Anrede vs sexe, IMC vs libellé,
  registre écrit vs oral, Konjunktiv I, abréviations (`checkCaseCoherence`)
- validité du type (tsc) + build

## Ce qui reste irréductiblement humain/agent

- **exactitude clinique** (DD pertinentes, thérapie conforme, classification)
- **fidélité au protocole réel** (le cas reflète-t-il un vrai vécu ?)
- **qualité de la langue** au-delà des heuristiques

→ c'est exactement ce que fait l'étage ③b en une seule passe consolidée.

## Contrats de contenu à respecter (rappel pour les prompts)

### `therapie` : RAISONNEMENT adaptatif, jamais un dictionnaire figé

⚠️ Ne PAS coder un mapping spécialité → labels et l'appliquer mécaniquement.
Les futurs lots vont croiser des pathologies (Néphrologie, Endocrinologie,
Rhumatologie, Dermatologie, Gynécologie…) qui n'entrent dans AUCUNE case d'un
tel dictionnaire — le risque est de retomber sur konservativ/interventionell/
chirurgisch par défaut, exactement le défaut qu'on corrige.

**La consigne, dans le prompt d'authoring, doit être une question à se poser
pour CHAQUE pathologie, pas une table à consulter :**
> « Comment un médecin structure-t-il réellement la prise en charge de CETTE
> pathologie précise, quand il l'explique à un collègue ? Choisis 2-4 sections,
> nomme-les comme un clinicien le ferait, dans l'ordre logique de sa démarche. »

Repères de LOGIQUE clinique (pas de spécialité — une pathologie peut suivre
plusieurs de ces logiques à la fois selon sa présentation) :

| Logique de la pathologie | Sections typiques (à adapter, jamais copier tel quel) |
|---|---|
| Geste chirurgical/traumato/procédural | Konservativ / Interventionell / Chirurgisch |
| Infection aiguë | Erstlinie / Alternative (Allergie, Résistance, Grossesse) / Schwerer Verlauf |
| Maladie chronique gérée à vie (HTA, IRC, Diabetes) | Ersteinstellung / Langzeitmanagement / Eskalation bei Komplikation |
| Trouble psychiatrique | Psychotherapie / Pharmakotherapie / Krisenintervention |
| Cancer | (Neo)adjuvant / Kurativ (chirurgisch) / Palliativ |
| Maladie auto-immune/inflammatoire chronique | Akuttherapie (Schub) / Basistherapie / Eskalation (Biologika) |
| Maladie endocrinienne (substitution) | Substitution / Medikamentöse Einstellung / Interventionell-chirurgisch (bei Tumor) |
| Insuffisance d'organe progressive (rein, foie, cœur) | Konservativ (Diät, RAAS-Blockade…) / Ersatztherapie (Dialyse…) / Transplantation |
| Dermatose | Topisch / Systemisch / Interventionell (Lichttherapie, Chirurgie) |

Si aucune ligne du tableau ne convient : c'est normal, **invente les 2-4
sections qui reflètent VRAIMENT cette pathologie** — c'est le principe, pas
l'exception. Le champ `akut?: boolean` reste disponible pour surligner une
section contenant une urgence (ex. Suizidalität, Cauda-equina, Sepsis).

### `diagnostik` : l'axe par étape reste fixe (c'est un vrai standard universel)

Contrairement à `therapie`, l'axe `Anamnese/Klinik → Labor → Apparativ &
Bildgebung → Invasiv & Speziell` n'est PAS un moule arbitraire : c'est l'ordre
dans lequel un médecin raisonne réellement, quelle que soit la spécialité — on
le garde donc **fixe**. Ce qui varie légitimement d'un cas à l'autre, c'est
quelles étapes sont remplies : un cas psychiatrique pur peut n'avoir presque
rien en Bildgebung, un cas traumatologique presque tout en Bildgebung/Invasiv
— c'est normal, les étapes vides ne s'affichent pas.

### `name` du cas : court et sans spoiler

Pas de stade, pas de Weber, pas de niveau radiculaire dans le titre — le
détail se découvre en jouant le cas.

### Audit fait sur les autres champs (rien d'autre à corriger)

`klassifikation`, `risikofaktoren`, `klinik`, `redFlags`, `pruefungsfallen`,
`askedInExam`, `prognose`, `erstmassnahmen`, `patientSheet.schmerz` sont déjà
des listes libres ou des champs optionnels — aucun moule imposé. Seul
`therapie` forçait une structure ; c'est corrigé aux deux niveaux (Fachwissen
ET Case.medicalView, qui doivent rester cohérents entre eux pour un même cas).

## Contrat de COHÉSION (pipeline v4)

La *cohérence* vérifie que les chiffres ne se contredisent pas. La **cohésion**
vérifie que les parties du cas SE RÉPONDENT. `checkCaseCohesion.mjs` la mesure.

**Règle capitale — neutralisation des différentiels.** Chaque entrée de
`medicalView.differenzialdiagnosen` doit avoir dans `patientSheet.negativeFindings`
l'élément qui permet de l'écarter, en NOMMANT la DD entre parenthèses :

    "kein Fieber, kein Schüttelfrost (gegen septische Arthritis)"

Sans cela le candidat peut citer la DD mais pas la réfuter pendant l'entretien :
le cas devient injouable en jeu de rôle. **Audit du 08.09.2026 : 36 cas sur 41
échouaient sur ce seul point** — c'est le défaut dominant du corpus.

Les quatre autres liens contrôlés : chaque `pruefungsfallen` a sa réponse
(examinerSheet ou askedInExam) ; le Muster DÉRIVE du dossier (antécédents,
médicaments, allergies repris — et aucun chiffre qui n'existe pas ailleurs dans
le cas) ; les réponses de sonde sont de vraies répliques ; la chronologie de vie
est possible (aucune durée > âge).

## Outillage

- `loadCases.mjs` — transpile le TS via esbuild et rend les VRAIS objets.
  Avant lui, les validateurs relisaient `seedCases.ts` comme du texte et ne
  pouvaient contrôler qu'une poignée de motifs sur les cas intégrés.
- `checkCaseCohesion.mjs` — score de cohésion par cas + liens manquants.
- `makeStyleSample.py` / `STYLE_SAMPLE.ts` — extrait de référence (~75 Ko) donné
  aux agents à la place des fichiers de données (~1,5 Mo), qui les faisaient caler.

## Étape « cohérence » — le moteur de l'anamnèse (ADR-0023, contrat `frage-atomique.md` §10.7, DM3)

Le cas n'entre que si `checkCoherence` sort à **0**. La porte relit la trame **jouée** (après `cohere`) : un signe,
une question ; rien hors profil ; rien d'exigé d'absent ; rien avant ce qu'il présuppose. Le **résidu** est
bloquant à 0 : une question du cas sans `sucht` ne compile plus (`CaseQuestion.sucht` est requis au type) et
fait échouer la porte.

### Ce que l'auteur déclare (dans le JSON du lot, repris par `lotAssembler.py`)

- `patientSheet.profil` : `tags` (liste fermée `PROFIL_TAGS`, `signes.ts`) ; `exige` ; `exclut` (signe **non**
  de dépistage → raison écrite). La nature et `hoden` se dérivent : ne pas les écrire.
- Sur **chaque** question du cas : `sucht` (non vide), `braucht` si elle présuppose un fait (« dort », « nach der
  Rückkehr », « beim Sturz », « Ihr Asthmaspray »). Sa relance (`followUp`, une seule chaîne) est une précision du
  même signe : **une relance qui cherche un autre signe devient une question du cas à part** (le type d'une question du
  cas n'a pas de `followUpSucht`).

### Les commandes, dans l'ordre (vérifier le CODE DE SORTIE du script, jamais un message lu dans un pipe)

```
node scripts/checkCoherence.mjs --propose --case <id>   # une AIDE : les signes lus dans le texte (50–74 %), rien n'est écrit ;
                                                        # sort à 1 tant qu'une question du cas est muette (résidu bloquant)
node scripts/checkCoherence.mjs --case <id>             # la trame jouée du cas, chaque écart et sa raison
node scripts/checkCoherence.mjs                         # la porte des 130+ cas ; echo $? → 0
node scripts/checkTrameSymptoms.mjs && node scripts/checkQuestionAtomicity.mjs && node scripts/checkGuideDuplicates.mjs
npx tsc -b                                              # `sucht` requis, signe inconnu refusé
npx vitest run src/data/guides/trameActuelle.test.ts -u # la trame jouée a bougé : régénérer le gel, dire pourquoi au commit
node scripts/checkCoherence.mjs --bless                 # le plancher a BAISSÉ : le graver (une hausse est refusée)
node scripts/checkBudgetFloor.mjs origin/main           # aucun plancher ne remonte face à main
```

Le contrat (§10.7) nomme `measureCoherence.mjs --propose` : la commande réelle est `checkCoherence.mjs --propose`.

Lire, dans `--case`, les blocs informatifs **doublons masqués** et **présuppositions lues dans le TEXTE** : ce ne
sont pas des portes (précision ≈ 55 %), ce sont des déclarations (`sucht`, `braucht`) à proposer.

### Corriger la SOURCE, jamais la porte

| Écart lu dans `--case` | Correction |
|---|---|
| `GARDÉ cas:<n> … hors profil` (anomalie r1) | le profil ou le `sucht` est faux : r1 ne retire jamais une question du cas |
| `SANS RÉPONSE` (r3) | écrire la réponse de la sonde de banque dans `antworten` |
| `NON RÉDUIT` | écrire les `parts` de la sonde (voir les règles des parts) |
| `ANOMALIE … relance conditionnelle` | DM2 : la relance « Falls ja » porte sur le signe de sa mère, sinon c'est une question à part |
| `DOUBLON DU CAS` | deux questions du cas cherchent le même signe : en retirer une, ou en déclarer une autre |
| `brauchtViole` | le `braucht` déclaré n'est cherché nulle part plus haut, ou en cycle |

### Les règles de déclaration (apprises en K2–K4, tenues par les revues)

1. **Le critère est l'IDENTITÉ de la question, pas « la fiche en dit plus ».** Deux questions cherchent le même
   signe si la fiche y répond par la même réplique (§10.1). Une question adaptée au cas (« besser, wenn Sie sich nach
   vorne beugen ? ») est la question de la sonde (`einfluss`) : elle prend sa place (rang 0). Une autre question
   (« Gallensteine bekannt ? » ≠ « Vorerkrankungen ? ») a son propre signe, et la sonde reste.
2. **Avant de créer un signe**, montrer que la sonde la plus proche n'a pas déjà la réplique : lire
   `antworten[<sonde>]` de la fiche. Si la sonde obtient déjà ce que la question demande, c'est le signe de la sonde
   (anorexia-nervosa n° 2 : la fiche répond à `veg-uebelkeit` « Erbrechen … ja … nach dem Essen » → la question
   déclare aussi `erbrechen`). Un signe nouveau va dans `signesDefsCas.ts`, de dépistage, sans banque, commenté par sa
   réplique, et il doit servir (test « aucun signe mort »).
3. **Une déclaration retire.** Le signe déclaré retire la sonde perdante et ses relances de précision : relire ce
   que la réponse de la sonde perdante contenait (revue K4, P0 : « schaumig » perdu par nephrotisches-syndrom).
4. **D1** : une énumération déclare chaque signe qu'elle demande ; les exemples d'un Auslöser (« — ein Essen, eine
   Reise ») ne sont pas demandés. Un `relu` sur une énumération est refusé.
5. **(e)** : un antécédent ou un fait familial n'est pas le symptôme du jour (`naechtliche_anfaelle` ≠ `zungenbiss`).
6. **`relu`** marque une mention sans question (le texte nomme un signe qu'il n'interroge pas) ; jamais pour faire
   taire une porte. Une annotation devenue sans objet (la déclaration couvre le texte) se retire.
7. **Q-gyn** : une sonde de la Frauenanamnese n'est jamais perdue ; une question du cas qui la prolonge a son signe.
8. **Déclarer le signe AFFINÉ.** Une question qui précise un signe qu'une autre question demande déjà (le motif)
   déclare le signe fin, pas le grossier : « Ist der Schwindel zu einer Seite hin schlimmer? » → `seite_lagerung`
   (`braucht: ['lageabhaengig']`), jamais `schwindel`. Déclarer le grossier lui ferait prendre la question générale ou
   le motif (r2) ; `SIGNE_AFFINE` fait accepter à la porte de discordance le mot grossier que le texte contient.

### Les règles des `parts` (sondes énumératives)

- Une part est une **découpe** du texte de sa variante (question, relance ou alternative de la même variante), avec
  **au plus un complément grammatical minimal** (article, flexion, anaphore résolue par le nom qu'elle reprend), sans
  aucune notion clinique nouvelle. Tout autre texte est une question nouvelle : il relève du lot de contenu.
- **Une part qui peut ouvrir la question est une question autonome** : elle s'ouvre sur un interrogatif ou un verbe
  de `PART_VERBES`, sans « und / oder / dabei », sans anaphore en tête (`partNonAutonome`, ligne bloquante de
  `checkCoherence`). Une part qui n'est qu'une relance va dans `PART_RELANCE_SEULE`, et ne doit jamais ouvrir.
- Les parts gardées se posent en une question, la première, puis les suivantes en relances — jamais recollées.
- **Une part d'alarme** (`PART_ALARME` : `gang`) ouvre sa propre question, jamais une relance (§10.4, K5).

### Sécurité psy (décision de main, K3 ; K4 D-1)

- `RISIKO_SIGNES` = `suizid`, `selbstverletzung`, `selbstverletzung_wunsch`, `todeswunsch` : r1 ne les met jamais
  hors profil, et tout signe de risque de la trame brute reste cherché par la trame jouée (test SÉCURITÉ).
- **Une question du cas ne déclare pas `suizid`** si elle ne porte pas elle-même le plan, l'intention et le NOTFALL :
  au rang 0, elle retirerait `fach-psych-suizid` et ses relances. Le désir de mort passif se déclare **`todeswunsch`**
  (interrogatoire gradué : la question du cas en Aktuelle Beschwerden, puis l'idéation, le plan et le NOTFALL en Fach).
  L'idéation n'est jamais l'acte (`selbstverletzung_wunsch` ≠ `selbstverletzung`).

### Rangs et places (D4, D4-bis, R6)

- **D4** : question du cas > Fach > Aktuelle Beschwerden > végétative ; à rang égal, la première dans la trame.
- **D4-bis** : le signe qui **est** le motif se pose en Aktuelle Beschwerden, la Fach se réduit à ses autres parts.
  Il est déclaré par un tag : `fieber` (nature `infekt`), `dyspnoe` (nature `atemnot`) ; K5 : `schwindel` (le patient
  consulte pour un vertige) et `sturz` (il consulte après une chute : commotio, epilepsie « vom Stuhl gekippt ») — la
  question d'ouverture (`akt-motiv`) l'obtient, la Fach ne redemande pas « Haben Sie Schwindel …? » ni « Sind Sie schon
  gestürzt? ». Une question du cas qui déclare ce signe le garde : `akt-motiv` le cède et reste posée (I3). Ne pas poser le tag
  si la chute n'est pas dite à l'ouverture (schlaganfall : la fiche la dit à la coordination ; la question « beim
  Sturz » se pose en Fach, `kapitel: 'fach'`, et déclare `braucht: ['sturz']`).
- **R6** : une question du cas gagnante prend la place de la première perdante **retirée** du même chapitre placée
  au-dessus d'elle ; si la perdante est seulement réduite, la question du cas reste à sa place.

### Relire

Le relecteur clinique lit les écarts (`--case`) de tout nouveau cas, et d'un cas sur cinq d'un lot de reprise.
La porte ne voit pas la justesse d'une déclaration : un `sucht` faux passe (§10.11).
