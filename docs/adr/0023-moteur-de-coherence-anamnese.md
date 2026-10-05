# ADR-0023 — Le moteur de cohérence de l'anamnèse

**Statut** : accepté — décisions D1 à D7 prises par la direction et DM1 à DM3
prises par main, le 4 oct. 2026 ; révisé après revue Opus (§ Revue)
· **Date** : 2026-10-04 · **Chantier** : série 3, lots K0–K5
· **Amende** : ADR-0019 (le lexique `Symptom` devient le lexique de signes, et
`sucht` devient obligatoire) · **Contrat** : `docs/contracts/frage-atomique.md` §10
· **Spec** : `docs/superpowers/specs/2026-10-04-moteur-coherence-anamnese.md`

## Contexte

Retours d'usage de la direction du 4 oct. sur deux cas joués :

- `case-gastroenteritis` (diarrhée et douleurs spasmodiques) : Ort, Charakter et
  Intensität ne sont jamais demandés. Les Schluckstörungen le sont. La
  fréquence des selles est effacée. « Was haben Sie **dort** gegessen » est posé
  avant toute question de voyage. Trois questions de borréliose sont posées dans
  une diarrhée.
- `case-fibromyalgie` (douleur généralisée) : Steifigkeit, gonflement, Verlauf,
  Auslöser, Fieber et Ort sont demandés deux ou trois fois. « Welche Gelenke »
  est posé à un patient sans arthrite. Gicht et Familie sont rangés en relance
  d'une question sans rapport.

La mesure sur le montage réel (130 cas, 8 492 questions affichées, spec §2) :
266 signes demandés au moins deux fois (~195 nets), 55 questions impertinentes,
44 signes attendus absents, 12 relances sans lien, 20 présuppositions d'ordre.
Un cas sur cinq est propre.

Les causes sont structurelles :

1. **La porte est aveugle aux signes.** `checkPlayedTrame.mjs` mesure des
   *mots* (Jaccard ≥ 0,6). Il tolère `deepens` (`:60-62`) et imprime « SANS
   DOUBLON » sur les deux trames citées.
2. **La plupart des questions sont muettes.** 82 sondes sur 230 déclarent ce
   qu'elles cherchent, contre 36 questions du cas sur 865.
3. **Un cas n'a pas de profil.** Seule `leitsymptomKategorie` le décrit : une
   nature unique. Un motif mixte perd une moitié.
4. **Les règles sont éparpillées.** `dedupeBySymptom` (premier arrivé),
   `FACH_COVERS` (carte sonde à sonde, sans entrée Rhumato), `redundant`. Aucune
   ne dit pourquoi elle a retiré une question.

## Décision

**Chaque question jouable déclare le signe qu'elle cherche. Chaque cas déclare
son profil clinique. Le montage applique des règles pures et déterministes, et
chaque écart est tracé. Une porte CI bloquante vérifie la trame après montage.**

1. **Le lexique de signes.** `Symptom` devient `Signe`. Règle d'identité,
   appliquée entre unités (question et relances de précision) : *deux unités
   cherchent le même signe si et seulement si la fiche y répondrait par la même
   réplique.*
2. **`sucht` obligatoire** sur toute sonde et toute question du cas.
   - Une relance hérite du signe de sa mère.
   - Si elle en cherche un autre, elle le déclare et devient une unité.
   - Les relances ont une forme unique : `followUp` (string), `followUps` et
     `followUpSucht`, lues par `phraseFollowUp` seul.
3. **Le profil clinique du cas** (`patientSheet.profil` : `tags`, `exige`,
   `exclut` avec sa raison). Il est déclaré et relu. Seuls la nature et `hoden`
   se dérivent des données du cas.
4. **`cohere(trame, profil) → { trame, ecarts }`**, appelé dans `playedTrame` à
   la place de `dedupeBySymptom`, **après** `FACH_RULES`, `aktuellSkip` et
   `fachSkip`, qui restent inchangés. Il applique :
   - r1 : hors profil ;
   - r4a : relances hors signe ;
   - r2 : un signe, une question, dans l'ordre D4 ;
   - r3 : un signe exigé et absent est ajouté depuis la banque, jamais par du
     texte inventé ;
   - r4b : aucune question avant le signe qu'elle présuppose.

   Chaque écart est tracé avec sa raison.
5. **La porte `checkCoherence.mjs`** (job `contrats`, bloquante). Après
   montage, six compteurs doivent valoir 0 dès K3, dont `ajouteSansReponse`.
   Le contenu brut est compté au plancher. Les exceptions sont nominatives et
   portent leur raison.
6. **Le pipeline des futurs cas** : déclarer, lire les écarts, relire, porte.
   Il est inscrit en K5 dans `PIPELINE.md` et `content-case-author`.

### Décisions — DÉCIDÉES le 4 oct. 2026

| # | Décision |
|---|---|
| **D1** | Un signe cité dans une énumération compte comme demandé. |
| **D2** | Une douleur dans le premier symptôme du motif ajoute Ort, Charakter et Intensität, même si la nature n'est pas « douleur ». Une douleur accessoire n'en ajoute pas. |
| **D3** | Une redite marquée `deepens` n'est plus tolérée. |
| **D4** | Conservation : question du cas > Fachanamnese > Aktuelle Beschwerden > végétative. |
| **D5** | Fach Infektiologie : le moteur la réduit d'abord, pas de scission. |
| **D6** | Q3–Q5 et Q7 continuent en déclarant `sucht` (ils passent après K5, I8). Q6 et Q8 sont gelés jusqu'à K3, puis absorbés. |
| **D7** | Porte à 0 après montage dès K3 ; plancher sur le contenu brut jusqu'à K4. |
| **DM1** | `fach-chir-fieber`, `fach-chir-uebelkeit` et `fach-chir-blutverduenner` sont supprimées en K1, avec `redundant` et `yieldsToGeneral`. Les 18 clés `antworten` des 6 cas Chirurgie sont supprimées après fusion de toute réponse plus riche dans la réponse générale. `followUp.test.ts` est adapté. |
| **DM2** | Toute relance conditionnelle qui cherche un autre signe que sa mère est corrigée à la source en K1. Elle est réécrite si c'est une précision mal formulée, sinon promue en question autonome. |
| **DM3** | Le pipeline des futurs cas est la ligne K5 : `app/scripts/PIPELINE.md` et `.claude/agents/content-case-author.md`. |

## Alternatives écartées

- **Seuil lexical plus fin dans `checkPlayedTrame`.** Il mesure des mots, et la
  direction voit des signes. Il reste en filet secondaire.
- **Déduire signes et profil du texte.** La précision relue est de 50 à 74 %
  (spec §2.4) : elle ne suffit pas pour une porte. Le texte **propose**, la
  déclaration fait foi.
- **Corriger cas par cas.** 13 des 15 pires cas viennent de deux gabarits ; une
  règle au montage les règle tous, et protège les futurs cas.
- **Prolonger `FACH_COVERS` et `dedupeBySymptom`.** Deux mécanismes qui se
  recouvrent, sans trace.
- **Absorber `FACH_RULES` dans r1.** Écarté à la revue (I3) : `FACH_RULES`
  adapte le texte et l'applicabilité par région, `motiv`, sexe et âge, ce qu'un
  profil ne porte pas.
- **Scinder la Fach Infektiologie maintenant (D5).**
- **Laisser `cohere` reformuler une question réduite** : ce serait du texte
  inventé par un programme.
- **Une relance structurée en objet (`{ text, sucht }`) dans le contenu
  publié** : un client ancien fait `followUp.trim()`. D'où des champs
  parallèles additifs (I9).

## Conséquences

- **Retirés** :
  - `dedupeBySymptom` (`symptoms.ts:194`) ;
  - `FACH_COVERS` et `coveredByFach` (`anamneseChapters.ts:419-462`) ;
  - la tolérance `deepens` de `checkPlayedTrame.mjs:60-62` ;
  - la règle « citer n'est pas chercher » (`symptoms.ts:16-19`) ;
  - `redundant`, `yieldsToGeneral` et les 3 sondes de DM1.
- **Inchangés** : `FACH_RULES`, `aktuellSkip` et `fachSkip`, avec leur
  sémantique.
- **Comportement changé** :
  - dans un cas fébrile, la fièvre se pose dans la Fach (D4) ;
  - les badges « ↗ approfondit / ↻ déjà demandé » n'ont plus d'objet, ce qui
    est une proposition au pôle Expérience, hors K3 ;
  - l'affichage des écarts dans l'app relève lui aussi du pôle Expérience,
    plus tard.
- **Volume** : 148 sondes et 829 questions du cas à annoter, après une
  proposition mécanique et avec une revue par spécialité.
- **Compatibilité** : le contenu est servi à distance (`contentLoader.sync()`).
  Tous les champs sont additifs, sans schéma SQL ni protocole de sync. Sans
  profil, seuls le volet hors profil de r1 et r3 sont inactifs.
- **Ordre sur `seedCases.ts`** : Q-gyn → K0 → K1 → K2 → K3 → K4 → K5 → Q3 →
  Q4 → Q5 → Q7 → Lc1–Lc3 → reliquat L.
- **Risque assumé** : le moteur corrige l'affichage ; le compteur brut, au
  plancher, pousse à corriger la source.

## Revue

Revue Opus du contrat (4 oct. 2026) : *Request changes*, fond jugé solide. Les
décisions ci-dessous sont celles de main, appliquées au contrat §10–§11.

| Point | Décision | Où |
|---|---|---|
| **I1** — une relance de précision hérite du signe de sa mère ; l'identité ne vaut qu'entre unités | **Accepté.** Une relance qui déclare un autre signe est une unité (r2, r4a). | §10.1, §10.2 ; INV-91 |
| **I2** — sans profil, `aktuellSkip`, `fachSkip` et `FACH_RULES` s'appliquent toujours | **Accepté.** Seuls le volet hors profil de r1 et r3 sont inactifs. | §10.4, §10.8 ; INV-90 |
| **I3** — `FACH_RULES` reste la couche d'adaptation, inchangée ; seul `FACH_COVERS` est absorbé ; pas de tag de région | **Accepté.** Test : sortie de `fachChapterRaw` identique avant et après K3. | §10.4, §10.10 ; §11.5 |
| **I4** — INV-80 couvre `exige_eff` (`bank` existante, pertinente, ni skippée ni exclue) ; idempotence corrigée | **Accepté.** L'idempotence n'est promise que sous INV-77 et INV-80. | §10.3, §10.4 ; INV-80, INV-86 |
| **I5** — repli d'insertion déterministe ; Frauen fondue au rang de la Fach | **Accepté.** La contrainte « `bank` hors `fach` / `frauenanamnese` » de la première version tombe. | §10.4 |
| **I6** — K3 ne merge qu'avec `ajouteSansReponse = 0` ; réponses en K2 ; garde dans `checkCoherence` | **Accepté.** | §10.4, §10.6, §10.10 ; INV-88, INV-89 |
| **I7** — un écart par couple (question, action) ; les relances suivent leur mère | **Accepté** (champ `mere`). | §10.5 ; INV-87 |
| **I8** — ordre des lots sur `seedCases.ts` | **Accepté.** | §10.10 |
| **I9** — `followUp` reste une `string` ; `followUps?` et `followUpSucht?: Signe[][]` ; normalisation par `phraseFollowUp` | **Accepté.** La forme vaut aussi pour les sondes (bundle) et remplace le reliquat Q3. | §10.2 |
| **m1** — prémisse « contenu servi par le bundle » fausse | **Accepté.** Corrigé ; INV-90 compte dès K3. | §10.8 ; §11.12 |
| **m2** — tracer l'écart à la spec | **Accepté.** | §11.2 |
| **m3** — gagnants de r2 calculés en une fois après r4a ; `part` mixte gardé s'il porte un signe conservé | **Accepté.** | §10.4 |
| **m4** — deux questions du cas du même signe | **Accepté** : anomalie comptée (`doublonsCas`). | §10.4, §10.6 |
| **m5** — mutations d'INV-77, INV-83 et INV-84 | **Accepté.** | §10.9 |
| **m6** — INV-78 en disjonction deux à deux, une paire par lot | **Accepté.** | §10.9 |
| **m7** — `fachSkip` garde sa sémantique, `skips` sort du résidu | **Accepté, et étendu à `aktuellSkip`**, même nature de donnée du cas (I2). Les deux ne sont ni gelés ni comptés. | §10.3, §10.6 |
| **m8** — `exclut` ne vise pas un signe de dépistage | **Accepté.** | §10.1, §10.3 ; INV-77, INV-80 |
| **m9** — titre du §3.6 et type de `sucht` | **Accepté.** | §1, §3.6 |
| **m10** — « journal » réservé au journal d'entraînement | **Accepté** : les traces s'appellent des **écarts** (`Ecart`, `ecarts`). | §10.5 ; `CONTEXT.md` |
| **m11** — l'exception testiculaire reste générique | **Accepté** : `SUCHT_AUSSER` et le tag dérivé `hoden`. `COHERENCE_ALLOWED` est vide au départ. | §10.1, §10.6 |
| **m12** — porte contre un `relu` sur une énumération | **Accepté.** | §10.6, §10.11 |
| **m13** — `phraseFollowUp` point de normalisation unique | **Accepté** (avec I9). | §10.2 |
| **m14** — K3 ne touche pas `features/simulation` | **Accepté.** | §10.5, §10.10 |
| Questions de la première version (sondes `redundant`, relances conditionnelles et D7) | **Closes** par DM1 et DM2. | §10.0 |
