# Lot Lc1 — Leberzirrhose : fiche et Fachwissen au niveau des cas récents

Branche `feat/s3-lc1-leberzirrhose` · retours direction FB3-G6 / FB3-G7 (`app/docs/BACKLOG-FEEDBACK.md` l. 417-418).

## 0. Hypothèses posées avant d'agir

1. **« La fiche » = `medicalView` du cas** (page « Fiche clinique », `CaseDetailPage.tsx` l. 61-133 :
   Verdacht, DD, Diagnostik par étape, Therapie, Erstmaßnahmen). Avant ce lot, seule la thérapie y était
   détaillée (4 lignes de Diagnostik, 3 DD d'une ligne). `MedicalView` (`src/db/types.ts` l. 215) n'a pas
   de champ définition, étiologie ni classification. Ces rubriques vont dans le Fachwissen. Dans la fiche,
   Child-Pugh et MELD entrent dans la Diagnostik (Labor) et la Verdachtsdiagnose. Le type n'a pas été modifié.
2. **Édition directe des seeds**, pas `lotAssembler.py` : l'assembleur insère des cas nouveaux (liste
   `CASE_IDS` codée en dur, whitelist `MV` sans `patientWorte`). Il ne sait pas enrichir un cas existant.
   C'est la pratique des corrections de contenu (`fix(contenu)`, `fix(s3-q7)`).
3. **Étalon** : trois cas récents tier 1 ou gastro-entéro. `case-chronische-pankreatitis` (même spécialité,
   même patient alcoolique, fiche de 29 Ko), `case-copd` (tier 1, maladie chronique d'organe, 39 Ko) et
   `case-diabetes` (tier 1, 41 Ko). Je les ai pris comme gabarit de **structure**. Pour la longueur, j'ai visé
   environ deux tiers de l'étalon, parce que la direction demande « sans surcharger ».

## 1. Audit avant / après

Mesures sur les vrais objets (`scripts/loadCases.mjs`). Moyenne du corpus de 130 cas entre parenthèses.

| Rubrique | Avant | Après | Corpus |
|---|---|---|---|
| Fachwissen, taille JSON | 9,4 Ko | 20,3 Ko | 30,2 Ko |
| Définition / Ätiologie (car.) | 186 / 193 | 752 / 673 | 788 / 925 |
| Klinik / Diagnostik / DD | 7 / 7 / 4 | 9 / 14 / 7 | 13 / 14 / 11 |
| Klassifikation / Red Flags | 2 / 4 | 4 / 5 | 4 / 8 |
| Prüfungsfallen / askedInExam | 4 / 5 | 8 / 12 | — / 14 |
| Fiche (`medicalView`), taille | 4,5 Ko | 8,4 Ko | 13,2 Ko |
| Fiche : Diagnostik / DD / Erstmaßnahmen | 4 / 3 / 3 | 10 / 5 / 7 | 13 / 9 / 6 |

### 1.1 Ce qui manquait

- **Fachwissen** :
  - la définition et l'étiologie tenaient en deux phrases : rien sur les deux piliers (insuffisance
    hépatique, hypertension portale), ni sur la différence entre forme compensée et décompensée ;
  - la Klinik ne citait ni Sarkopenie, ni les signes hormonaux (Gynäkomastie, Bauchglatze), ni
    Splenomegalie, ni Foetor ;
  - aucune étape Anamnese/Klinik dans la Diagnostik ;
  - Labor sur une seule ligne : il manquait les paramètres de synthèse et le Koller-Test, la sérologie
    étiologique, le SAAG chiffré, l'élastographie et la place de l'ammoniaque ;
  - pas de West-Haven (encéphalopathie), pas de grades d'ascite ;
  - 5 questions d'examen seulement, sans les classiques « kardialer vs. hepatischer Aszites », « Syntheseparameter »,
    « SBP » ou « MELD ».
- **Fiche (`medicalView`)** :
  - Diagnostik réduite à 4 libellés, sans examen clinique, sans SAAG, sans sérologie, sans échocardiographie
    (alors que la DD Rechtsherzinsuffizienz l'exige) ;
  - 3 DD d'une ligne, non rattachées au patient ;
  - 3 Erstmaßnahmen, sans ponction diagnostique ni prévention du sevrage.
- **Raisonnement sur CE patient**, absent :
  - il prend de l'**Aspirin-Brausetabletten** alors qu'il a des hématomes spontanés et peut-être des varices ;
  - il prend un **antihypertenseur non nommé** alors qu'il a de l'ascite (IEC et sartans à arrêter) ;
  - il **boit encore chaque jour** (3 bières) et sera hospitalisé : risque de sevrage, Thiamin avant toute
    perfusion glucosée.

### 1.2 Ce qui était faux ou contradictoire (corrigé)

| Où | Avant | Problème | Après |
|---|---|---|---|
| Fiche, Therapie § 1 | « …keine Benzodiazepine » | Chez un buveur quotidien hospitalisé, les benzodiazépines sont le traitement du sevrage. Les interdire sans nuance expose au delirium tremens | sevrage surveillé (CIWA-Ar), Thiamin avant glucose, Lorazepam/Oxazepam symptomgesteuert ; hors sevrage pas de benzodiazépines (encéphalopathie) |
| Fachwissen, Prüfungsfallen | « Es gibt keine kausale Therapie der Leberzirrhose — außer Lebertransplantation » | Contredit le libellé de thérapie « Kausale Therapie und Basismaßnahmen » de la même fiche | « Kausal ist die Behandlung der Ursache … sie stoppt das Fortschreiten ; die Zirrhose selbst beseitigt nur die Transplantation » |
| Visuel `timeline-dekompensation` | « Stadium 1 Varizenblutung → 2 Enzephalopathie → 3 SBP → 4 HRS » | Il n'existe aucun ordre de stades entre ces complications : la frise enseignait une séquence fausse | arbre « Leitzeichen → Komplikation → erster Schritt » (§ 3) |
| Visuel `anatomy-leberhautzeichen` | silhouette « body », 6 points | relique jugée cheap (FB3-G6) ; « Palmarerythem » posé sur `skin` hors silhouette | carte de syndrome (§ 3) |
| Merke ↔ Merksatz | merke « Fieber bei Aszites = SBP ausschließen » ; merksatz « Jede dekompensierte Zirrhose mit Fieber = SBP ausschließen … » | redite, alors que le commit 1c1acb0c annonçait déjà sa suppression | merke de l'arbre = les déclencheurs de décompensation ; merksatz = la synthèse en deux piliers |
| Fiche, Therapie § 3 | « Dauerprophylaxe mit Norfloxacin » | diverge du Fachwissen (« Norfloxacin oder Ciprofloxacin ») | aligné |
| Fachwissen, Therapie § 2 | « Bei refraktärem Aszites oder Hypotonie Betablocker, ACE-Hemmer/Sartane und NSAR absetzen » | Les IEC et sartans sont à arrêter dès qu'il y a de l'ascite, pas seulement si elle est réfractaire. Les bêtabloquants ne s'arrêtent pas par principe (Baveno VII : réduire si hypotension) | « Bei Aszites ACE-Hemmer, Sartane und NSAR absetzen ; Betablocker bei refraktärem Aszites mit Hypotonie reduzieren oder pausieren » |

### 1.3 Ce qui était en trop

Pas de texte clinique coupé : la thérapie, déjà riche et exacte, est conservée. Les quatre libellés sont
identiques entre la fiche et le cas (`checkTherapieLabels`). Les retouches portent sur des items :

- le sevrage, ajouté dans la fiche et dans le Fachwissen ;
- la transfusion restrictive (Hb cible 7-8 g/dl) dans l'hémorragie variqueuse ;
- Carvedilol bevorzugt.

Les 4 Red Flags d'origine sont repris **mot pour mot**, parce que l'arbre les cite et que la fixture de test
les porte. Le gauge Child-Pugh est inchangé : ses `ergänzt` sont déjà relus dans `reviewed.ts`.

### 1.4 Anamnèse et réponses du patient

Non touchées : aucune question, aucune réponse, aucun `negativeFindings`. `checkCoherence --case case-leberzirrhose`
sort à 0 (doublons 0, horsProfil 0, brauchtViole 0, résidu 0), et la trame jouée n'a pas bougé
(`trameActuelle.test.ts` est vert sans `-u`). La fiche corrigée ne contredit aucune réplique :

- les DD s'appuient sur les négatifs existants (Ikterus, Fieber, Gewichtsverlust, Knoten, Halsvenen,
  Orthopnoe, Diabetes) ;
- l'Aspirin s'appuie sur `med-blutverduenner` ;
- les « 3 Bier » s'appuient sur `nox-alkohol`.

## 2. Contenu ajouté (résumé)

- **Fachwissen** :
  - Definition : les deux piliers, compensée ou décompensée, risque de HCC ;
  - Ätiologie : MASLD/MASH, causes rares, Cirrhose cardiaque, médicaments ;
  - Risikofaktoren chiffrés ;
  - Klinik en 9 entrées, dont 3 `atypisch` (HE, Varizenblutung en première manifestation, forme compensée
    pauci-symptomatique) ;
  - Klassifikation : Child-Pugh avec survie à 1 an, MELD/MELD-Na, West-Haven, grades d'ascite IAC ;
  - Diagnostik en 14 entrées sur les 4 étapes : anamnèse en grammes, Koller-Test, De-Ritis, sérologie,
    ammoniaque, élastographie, SAAG ≥ 1,1 g/dl, Zellzahl ≥ 250/µl, Biopsie transjugulaire ;
  - 7 DD avec critère : HCC, Rechtsherzinsuffizienz (SAAG ≥ 1,1 et protéines ≥ 2,5 g/dl), Peritonealkarzinose,
    nephrotisches Syndrom, Pfortaderthrombose/Budd-Chiari, Alkoholhepatitis, Verschlussikterus ;
  - Prognose chiffrée : survie médiane > 12 ans si compensée, environ 2 ans si décompensée ; HCC 1-4 %/an ;
    recompensation sous abstinence ;
  - 8 Prüfungsfallen et 12 questions d'examen.
- **Fiche** :
  - Verdachtsdiagnose détaillée (décompensation, Syntheseschwäche, Child-Pugh et MELD selon le laboratoire).
    Sa tête « Leberzirrhose » est inchangée (test D1, Examen) ;
  - 5 DD rattachées au patient ;
  - 10 étapes de Diagnostik : anamnèse complémentaire, examen clinique, CIWA-Ar, TSH sous L-Thyroxin,
    NT-proBNP, échocardiographie, ponction à l'admission malgré un Quick bas, ÖGD ;
  - thérapie complétée pour CE patient : arrêt de l'Aspirin, réévaluation de l'antihypertenseur, sevrage ;
  - 7 Erstmaßnahmen.

## 3. Visuels (`src/data/fachwissenVisuals/fw-leberzirrhose.ts`, contrat `docs/contracts/fachwissen-visuals.md`)

| Bloc | Kind | Anchor | Replie | Sources |
|---|---|---|---|---|
| `syndrome-zirrhose` « Leberinsuffizienz und portale Hypertension » | `syndrome-map`, 4 rayons (Syntheseschwäche · Portale Hypertension · Entgiftungsstörung · Allgemein), 11 items | `klinik` | les 7 entrées Klinik typiques (les 2 `atypisch` restent dépliées) | `klinik` exactes |
| `gauge-child-pugh` | `score-gauge` (inchangé) | `klassifikation` | `Child-Pugh` | 5 `ergänzt` déjà relus |
| `tree-dekompensation` « Dekompensation: vom Leitzeichen zur Komplikation » | `decision-tree`, 8 nœuds, profondeur 3, un seul `signal` (Varizenblutung, « Notfall ») | `redFlags` | les 4 Red Flags d'origine (la 5ᵉ, Entzug, reste visible) | `redFlags`, `diagnostik:Invasiv & Speziell`, `therapie:<Komplikationen>` |

- Aucun nouveau `ergänzt` : `reviewed.ts` est inchangé, aucun relecteur requis pour la CI.
- 4 rayons, parce que la grille 3 × 3 du composant les place en croix autour du centre. Avec 5 ou 6 rayons,
  les coins supérieurs sont remplis de façon asymétrique.
- Le composant `AnatomyMap` reste dans le registre. Plus aucune spec ne l'utilise, mais le supprimer est
  une décision de design, pas de contenu.
- Le validateur (règle 11, mots français) a refusé « Zunahme **des** Bauchumfangs » : l'article allemand
  « des » est pris pour du français. Le libellé du visuel est devenu « wachsender Bauchumfang ». C'est une
  limite du validateur, relevée pour son propriétaire.
- Test adapté : `FachwissenDetailPage.test.tsx`, « fw-leberzirrhose : decision-tree (anchor redFlags) précède
  Klassifikation & Scores, Red Flags est un `<details>` fermé ». La fixture porte le libellé de thérapie et
  l'étape `Invasiv & Speziell` cités par l'arbre.
- **Amendement à proposer** à `arch-fachwissen-visuals` : contrat § 7, test 6, remplacer
  `[data-visual="timeline"]` par `[data-visual="decision-tree"]`. La règle testée (anchor `redFlags`) est
  inchangée. Je n'ai pas édité le contrat, qui est hors de mon périmètre.

## 4. Q-8 (PASTE_MAX)

`case-leberzirrhose` n'est pas dans `OVER_PASTE_MAX`, et `prompt.corpus.test.ts` est vert. Longueurs
mesurées après le lot (`buildPromptPaket` + `promptText`, bundle esbuild des vraies sources) : **patient
4 646**, **Oberarzt 2 662** caractères, pour une borne `PASTE_MAX` de 10 000. Le prompt patient ne lit rien de
`medicalView`. Le prompt Oberarzt n'en lit que la Verdachtsdiagnose et les noms des DD.

## 5. Sources médicales

- DGVS, S2k-Leitlinie « Komplikationen der Leberzirrhose » (AWMF 021-017) : stufenschéma de l'ascite
  (NaCl 5 g, Spironolacton 100 → 400 mg, rapport 100 : 40, Albumin 6-8 g/l au-delà de 5 l), SBP
  (≥ 250 PMN/µl, Albumin 1,5/1 g/kg), varices, HE, HRS, restriction hydrique sous 125 mmol/l.
- Baveno VII (de Franchis et al., J Hepatol 2022) : élastographie < 10 / > 15 kPa, Carvedilol, transfusion
  restrictive (Hb 7-8 g/dl), notion de recompensation.
- EASL Clinical Practice Guidelines « Decompensated cirrhosis » (J Hepatol 2018) : ponction à chaque
  admission, coagulopathie non contre-indicatrice, IEC et sartans à éviter en cas d'ascite.
- AASLD/EASL Practice Guideline « Hepatic encephalopathy » (2014) : West-Haven, ammoniaque.
- D'Amico et al., J Hepatol 2006 : survie médiane, compensée contre décompensée.
- Herold, *Innere Medizin* (éd. courante), et AMBOSS « Leberzirrhose » : Child-Pugh (seuils, survie à 1 an),
  Koller-Test, signes cutanés et hormonaux, MELD.
- S3-Leitlinie « Alkoholbezogene Störungen » (AWMF 076-001) : traitement du sevrage, Thiamin avant glucose.

## 6. Vérifications (code de sortie)

| Commande | Sortie |
|---|---|
| `npx tsc -b` | 0 |
| `npx vitest run --dir src --maxWorkers=2` | 0 (193 fichiers, 2 022 tests) |
| `npm run test:c6 -- --maxWorkers=2` | 0 (17 fichiers, 212 tests) |
| `node --test scripts/*.test.mjs` hors `checkProbeCoverage.test.mjs` | 0 (200 tests) |
| `node --test scripts/checkProbeCoverage.test.mjs`, lancé seul | 0 (4 tests) |
| les 18 `check*` de la CI, plus `checkTermRegister --require-all` | 0 chacun |
| `checkCoherence.mjs` (porte complète) et `--case case-leberzirrhose` | 0 et 0 |
| `checkBudgetFloor.mjs origin/main` | 0 |
| `npm run build` | 0 |

Les 18 `check*` sont : ProbeCoverage, MusterCoverage, CaseCoherence, GuideCoverage, GuideDuplicates,
UiTells, CaseQuestionChapters, PatientWorte, PlayedTrame, TrameSymptoms, QuestionAtomicity, Examen,
TherapieLabels, FachwissenVisuals, AllergyConflicts, CaseTermLinks, Bedeutung et Coherence.

`checkProbeCoverage.test.mjs`, lancé avec tous les autres fichiers, a bloqué 14 minutes : son processus
fils, dans le bac à sable de mutation, restait à 0 % de CPU. Lancé seul, il passe en quelques secondes. Le
même blocage se produit dans le worktree `doctopus-s3-f-favoris` (processus de plus de 23 h), indépendamment
de ce lot. C'est une contention du bac à sable, préexistante, à signaler au propriétaire de
`mutationSandbox.mjs`. La CI l'exécute seul (`quality.yml` l. 81, un fichier par commande) : c'est le cas
qui passe.

`caseTermLinks.json` a été régénéré (`linkCaseTerms.mjs`) :
+12 termes liés au cas (portal, Caput medusae, Gynäkomastie, Palmarerythem, Splenomegalie,
Thrombozytopenie…). Le registre (`--require-all`) et les Bedeutung restent valides.

## 7. Écarts transmis à la relecture clinique

- **Cohésion** (`checkCaseCohesion`, non bloquant) : le score passe de 96,9 % à 93,9 %. Les DD
  « Peritonealkarzinose » et « Akute Alkoholhepatitis » ne sont pas nommées entre parenthèses dans les
  `negativeFindings`. Les faits qui les écartent sont déjà dans le cas (pas de Gewichtsverlust, pas d'Ikterus,
  pas de Fieber), mais les annoter modifierait les puces négatives de la fiche du simulant, ce que le brief
  exclut. Proposition à trancher : annoter
  « keine Gelbfärbung … (Ikterus; gegen akute Alkoholhepatitis) » et « keine ungewollte Gewichtsabnahme …
  (gegen … Peritonealkarzinose) », ou retirer ces deux DD.
- **Plausibilité de l'anamnèse, hors périmètre** : « 10 Flaschen Bier + 3 Flaschen Schnaps täglich » font
  plus de 800 g d'alcool par jour si les bouteilles de schnaps sont des 0,7 l. Cela dépasse la capacité
  d'élimination. Le chiffre vient du protocole réel (Reutlingen 20.11.2024). La fiche ne le convertit donc
  volontairement pas en grammes.
- Muster et Arztbrief de référence non modifiés. Ils citent 3 DD, et la fiche en a maintenant 5 : c'est
  cohérent, le Muster est un sous-ensemble.

## 8. Passe fixeur — revues Opus de `73359ffc` (clinique : 3 P1 ; direction/design : 4 majeurs)

Les §§ 1.4 et 7 décrivent l'état du sommet `73359ffc`. Les deux réserves qui y figuraient ont été tranchées
par la revue clinique, puis appliquées ici.

**P1 cliniques, appliqués mot pour mot**
- Rein : dans la fiche (surveillance), arrêter les diurétiques et donner de l'albumine 1 g/kg pendant 2 jours,
  puis parler de SHR seulement sans amélioration. Le Fachwissen suit (« Akute Nierenschädigung und
  hepatorenales Syndrom … »).
- Arbre :
  - feuille rénale « Akute Nierenschädigung — hepatorenales Syndrom? » ;
  - PBS « Sofort, vor dem Kulturergebnis » ;
  - HE avec glycémie, Thiamin, delirium de sevrage et hématome sous-dural (CCT), passage en soins intensifs à
    partir du grade III ;
  - ces trois feuilles en `warn`. L'hémorragie variqueuse garde `signal`, avec « Notfall: » déplacé dans le texte.
- Le Merke est allégé (« Jede Dekompensation hat einen Auslöser — immer suchen. »), parce que la feuille HE
  énumère désormais les déclencheurs.
- Provenance (règle D8) : les gestes de la feuille HE (glycémie, Wernicke, delirium, CCT, grade III) sont
  ajoutés à l'item HE de la thérapie du Fachwissen, que la feuille cite. Sinon l'arbre aurait porté des
  données absentes de la fiche.

**P2 cliniques et concision**
- Valeurs : survie Child-Pugh à 1 an corrigée à 100/80/45 % ; listing « ab MELD ≥ 15 oder ab der ersten
  Dekompensation » ; sel « etwa 5 g/Tag, nicht strenger » ; paramètres de synthèse et Child-Pugh dissociés ;
  liste des déclencheurs de HE complétée.
- Coupes : Baclofen, ostéoporose, l'item Child-Pugh redondant, et la ponction diagnostique dans la thérapie
  (Fachwissen et fiche). La ponction reste en Diagnostik et dans les Erstmaßnahmen.
- **ÖGD de dépistage — interprétation.** La consigne était ambiguë : elle demandait de retirer la ligne 158
  (Diagnostik) et en même temps d'y garder la mention « noch während des stationären Aufenthalts ». J'ai gardé
  l'ÖGD en Diagnostik (l. 158, avec ce complément), parce que c'est là que l'examinateur l'attend
  (`examinerSheet`, « Welche Untersuchungen ordnen Sie an » → ÖGD) et que le Muster la cite aussi. L'item de
  thérapie (l. 188) prend la version clinique, mais commence par « Je nach ÖGD-Befund: » au lieu de redire
  le dépistage. Si la revue voulait l'inverse, il suffit de déplacer une phrase.

**Réserves tranchées**
- Les négatifs sont annotés « (Ikterus; gegen akute Alkoholhepatitis) », avec une nouvelle puce « keine bekannte
  Krebserkrankung (gegen Peritonealkarzinose) ». La cohésion passe à **97,0 %** (64 liens sur 66) ;
  `checkCoherence` et `checkProbeCoverage` restent à 0.
- Schnaps : « 3 kleine Flaschen Schnaps (Flachmann) » dans les noxes et la réaction de l'examinateur ;
  « 3 kleinen Flaschen Schnaps (Flachmann) » dans l'Arztbrief de référence ; « 3 kleinen Flaschen Schnaps »
  dans le Muster (`caseMuster.ts`, Arztbrief et Vorstellung).
- Dans la réplique `nox-alkohol`, j'ai écrit « drei kleine Flaschen Schnaps, so Flachmänner, » plutôt que
  « (Flachmann) » : dans le corpus, une parenthèse dans une réplique est une didascalie (« (zögernd) »). C'est
  la seule réplique du patient modifiée, sur demande de la revue.

**Design**
- Verdachtsdiagnose : « Leberzirrhose bei Alkoholabhängigkeit, dekompensiert mit Aszites und Beinödemen;
  spontane Hämatome bei vermuteter Syntheseschwäche. » Avec la phrase d'amorce, elle fait environ 190
  caractères, sous la borne de 200 de `vorstellungsDiagnose`, et finit par un point : elle n'est pas coupée.
- Doublons retirés ; « ASS » utilisé partout ; « des letzten Alkoholkonsums » ; deux Prüfungsfallen
  reformulées (ASS/NSAR ; « „Keine Benzodiazepine bei Zirrhose“ ist falsch … »).
- Rayons de la carte renommés « Leberinsuffizienz: Synthese » et « Leberinsuffizienz: Entgiftung » ; item
  « Sarkopenie, Gewichtsverlust durch Aszites verdeckt ».
- **Anti-retour de la silhouette.** Plus aucune spec n'utilise `anatomy-map` : le validateur refuse donc le
  kind avec le message `kind déprécié: anatomy-map (<bloc>) — utiliser syndrome-map`. Il n'y a pas de
  plafond, puisque le compte est à zéro. La règle est prouvée par la fixture négative
  `scripts/fixtures/visuals-anatomy/` (silhouette par ailleurs valide, refs exactes) et par un test vitest dans
  `checkFachwissenVisuals.test.ts`.
- Contrat `docs/contracts/fachwissen-visuals.md` : l'exemple du §1.10 est la `syndrome-map` ; le §1.3 est
  marqué déprécié ; le test 6 du §7 vise `decision-tree` ; une ligne est ajoutée au tableau des amendements.
- Contraste des feuilles `signal` (4,30:1) : non touché, comme demandé.

**Vérifications de la passe fixeur (code de sortie)**

| Commande | Sortie |
|---|---|
| `tsc -b` | 0 |
| vitest complet | 0 (2 023 tests) |
| `test:c6` | 0 (212 tests) |
| `node --test`, hors `checkProbeCoverage.test.mjs` | 0 (200 tests) |
| `checkProbeCoverage.test.mjs`, seul | 0 (4 tests) |
| les 18 `check*`, plus `checkTermRegister --require-all` | 0 chacun |
| `checkCoherence --case` | 0 |
| `checkBudgetFloor origin/main` | 0 |
| build | 0 |

`caseTermLinks.json` est régénéré.

## Non vérifié

- Chiffres repris de mémoire des sources ci-dessus, sans consultation en ligne pendant ce lot : survie à
  1 an selon Child-Pugh (corrigée à 100/80/45 % par la revue clinique), mortalité à 3 mois selon MELD, survie médiane selon D'Amico, survie
  à 5 ans après transplantation (70-80 %), seuils d'alcool (20/40 g), détection de l'ascite (clinique à
  partir d'environ 1 l, échographique dès 50-100 ml). La relecture clinique doit les confirmer.
- Disponibilité actuelle de la Norfloxacine en Allemagne (Ciprofloxacine gardée comme alternative).
- Rendu navigateur (390 px, sombre, axe) de la carte de syndrome et de l'arbre : non mesuré dans ce lot. Les
  tests jsdom des composants sont verts. La revue design doit passer `playwright-cli` sur `/fachwissen/fw-leberzirrhose`.
