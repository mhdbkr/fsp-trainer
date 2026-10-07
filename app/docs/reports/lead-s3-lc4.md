# Lot Lc4 — les sept derniers cas pauvres et la concision de trois Fachwissen

Branche `feat/s3-lc4-fiches-reste`, partie de `origin/main` `3244f664` (Lc2 et Lc3 fusionnés), rebasée sur `019a1759`.
Retours FB3-G7 (`app/docs/BACKLOG-FEEDBACK.md`). Modèle direct : `lead-s3-lc3.md`.

## 0. Hypothèses posées avant d'agir

1. **Mêmes définitions que Lc3.** « Fiche » = `medicalView`, « Fachwissen » = l'entrée `seedFachwissen`, Prüfungsfallen =
   `case.pruefungsfallen`. Le type n'est pas modifié.
2. **Édition directe des seeds par script hors dépôt** : `medicalView`, `examinerSheet` et `pruefungsfallen` remplacés d'un
   tenant ; Muster clé par clé ; Fachwissen champ par champ. Un aller-retour à l'identique a été vérifié avant usage
   (objets chargés identiques octet pour octet).
3. **Libellés de thérapie inchangés** pour les dix Fachwissen touchés (`checkTherapieLabels`).
4. **Répliques du patient** : touchées seulement pour deux contradictions avérées (tvt, § 3). Les âges incohérents avec la
   date de naissance ne sont pas touchés (§ 8).
5. **Choix au-delà de (B)** : gerd, myokardinfarkt et cholezystitis avaient des Fachwissen de 32 à 35 écrans, avec des
   erreurs réparties dans tout le texte. Les corriger champ par champ revenait à les réécrire ; je les ai réécrits selon
   la même règle que (B). C'est un point à trancher (§ 8).

## 1. Mesure avant / après (objets chargés par `scripts/loadCases.mjs`)

Fiche et FW = longueur JSON. ES = sections de l'examinerSheet. PF = Prüfungsfallen. Vorst. = la première phrase de la
Verdachtsdiagnose dans la ligne de Fallvorstellung. Redites = méthode Lc2 (phrases d'au moins 4 mots de 4 lettres et plus,
recouvrement ≥ 0,7 du plus court ; fiche = `medicalView` + PF).

| Cas | Fiche | DD | Diag | Erst | ES | PF | notfall | FW | Redites fiche | Vorst. |
|---|---|---|---|---|---|---|---|---|---|---|
| multiple-sklerose | 9,3 → 5,9 k | 8 → 7 | 10 → 8 | 5 → 5 | 5 → 5 | 12 → 6 | false | 20,5 k (inchangé) | 1 → 0 | coupée → entière |
| reizdarm | 7,4 → 5,7 k | 9 → 8 | 14 → 9 | 6 → 5 | 5 → 5 | 10 → 5 | false | 18,4 k (inchangé) | 3 → 0 | coupée → entière |
| gallenkolik | 2,1 → 4,2 k | 5 → 5 | 4 → 6 | 3 → 5 | 3 → 5 | 5 → 5 | false | 10,0 → 8,6 k | 0 → 0 | sans point → entière |
| tvt | 4,1 → 4,9 k | 5 → 5 | 6 → 8 | 4 → 5 | 3 → 5 | 7 → 5 | false | 10,5 → 8,2 k | 0 → 0 | sans point → entière |
| gerd | 6,9 → 4,6 k | 3 → 4 | 3 → 7 | 2 → 5 | 2 → 5 | 0 → 4 | – → false | 40,7 → 6,9 k | 0 → 0 | sans point → entière |
| myokardinfarkt | 8,4 → 4,8 k | 3 → 3 | 3 → 5 | 1 → 5 | 2 → 5 | 1 → 5 | true | 45,6 → 7,1 k | 0 → 0 | sans point → entière |
| cholezystitis | 6,2 → 4,2 k | 3 → 4 | 3 → 6 | 2 → 5 | 2 → 5 | 0 → 4 | – → false | 41,0 → 6,2 k | 0 → 0 | sans point → entière |

**Volume.** Les fiches tiennent entre 4 et 6 k, comme celles de Lc3, sous la médiane C3 de 15 k : le gain vient des lignes
raisonnées sur le patient, pas du volume. Celles de multiple-sklerose et reizdarm baissent : PF qui recopiaient la fiche,
Diagnostik en double (iFOBT chez une patiente qui sera coloscopiée), Erstmaßnahmen en phrases.

## 2. (B) Concision de trois Fachwissen — mesure dans le DOM de l'app

**Méthode.** `vite` sur le port 5347, `VITE_AUTH_MODE=public`, URL Supabase factice (`http://127.0.0.1:9`) ;
`functions/v1/content` intercepté et servi avec les items construits comme dans `publishContent.mjs` (cas avec
`caseTermLinks`, FW, Aufklärungen, guides, Fachbegriffe, Muster) ; pilotage `playwright-core`, viewport 390 × 844,
attente du `h1` portant la `pathology`. Écrans = hauteur défilable / 844, au repos puis tous les `<details>` ouverts.
Redites = méthode de la direction sur `innerText` de `<main>` tout ouvert (lignes puis phrases ; mots de 4 lettres et
plus hors mots-outils ; paire si ≥ 70 % du plus court, segments d'au moins 4 jetons). Ma liste de mots-outils diffère
de celle de la direction : avant le lot je mesure 19/29/16 là où elle mesurait 16/26/18.

| FW | Écrans avant (repos / ouvert) | Après | Redites avant (direction / moi) | Après | Cible |
|---|---|---|---|---|---|
| fw-oesophaguskarzinom | 30,4 / 37,0 | **11,3 / 11,4** | 16 / 19 | **0** | ≤ 16, ≤ 5 |
| fw-kolorektales-ca | 32,6 / 32,6 | **10,4 / 10,4** | 26 / 29 | **0** | ≤ 16, ≤ 5 |
| fw-divertikulitis | 31,1 / 31,4 | **9,4 / 9,4** | 18 / 16 | **0** | ≤ 16, ≤ 5 |

**Coupé** : historique et biologie moléculaire (Vogelstein, Dukes, Savary-Miller, Hansen-Stock), listes exhaustives de
facteurs de risque et de DD, chiffres sans usage à l'oral (pourcentages, survies par sous-groupe, doses de chimiothérapie),
questions d'examen qui redisaient Diagnostik ou Thérapie, renvois au cas (« seit vier Wochen … 15 Kilogramm », « die
Patientin ist heiser »). **Gardé** : définition, classification utile (TNM, UICC, Siewert, Mellow-Pinkas, CDD, Hinchey),
clinique avec formes atypiques, Diagnostik par étape, thérapie par stade sous les mêmes libellés, pièges.

Mesures DOM des Fachwissen des 7 cas (A) :

| FW | Avant | Après | Redites avant → après |
|---|---|---|---|
| fw-multiple-sklerose | 16,9 / 19,8 | inchangé | 16 → 16 |
| fw-reizdarm | 17,7 / 17,7 | inchangé | 5 → 5 |
| fw-gallenkolik | 10,4 / 10,4 | 9,6 / 9,6 | 2 → 0 |
| fw-tvt | 10,6 / 10,6 | 9,5 / 9,5 | 5 → 0 |
| fw-gerd | 32,5 / 35,9 | 8,0 / 8,0 | 33 → 0 |
| fw-myokardinfarkt | 34,2 / 34,2 | 8,1 / 8,1 | 22 → 0 |
| fw-cholezystitis | 35,0 / 35,8 | 7,1 / 7,4 | 21 → 0 |

## 3. Par cas : ce qui a changé et pourquoi

Méthode commune : VD en une première phrase complète (les 7 lignes de Fallvorstellung s'affichaient avec « … » ou sans
point) ; DD appliquées au patient ; Diagnostik par étape ; thérapie raisonnée sur ses médicaments, allergies, comorbidités
et sa situation ; Erstmaßnahmen de moins de quatre mots-clés ; ES en 5 sections dont « Aufklärung (2 Minuten) » ; PF sans
redite de la fiche ; Muster aligné (diagnose, diagnostik-therapie, diagnostik-procedere).

### gallenkolik — Heiner Hermann, 40 ans, boucher indépendant, IMC 30, Ramipril, Simvastatin, 10 PA, deux Ibuprofen ce matin
- **Pour le patient :** deux attaques depuis hier → la DD Cholezystitis devient « le prochain pas », Temperatur et CRP
  parce que l'Ibuprofen masque la fièvre ; NSAR en première ligne selon la S3, mais il en a déjà pris et prend du
  Ramipril → Metamizol et Butylscopolamin ; Kreatinin et Kalium ; EKG et Troponin (fumeur, HTA, hypercholestérolémie) ;
  cholécystectomie à planifier vite avec lui (indépendant) ; Aufklärung sur sa réplique « I hab doch koi Zeit ».
- **Corrigé :** « kein klassisches Morphin (Sphinkter Oddi) » → opioïdes permis (Pethidin, Buprenorphin, S3) ;
  CA 19-9 et AFP retirés de la Diagnostik (réponse d'examen : pas de marqueurs pour diagnostiquer) ; Falle générique
  « Metamizol-Allergie » (il est allergique aux noisettes) retirée ; Muster « Es wurden eine … » ; FW : NSAR en
  première ligne, critères d'opération des calculs asymptomatiques (porcelaine, > 3 cm, polype ≥ 1 cm).

### tvt — Anna Müller, 52 ans, vol de 12 h, pilule œstroprogestative, diabète de type 1, Ramipril, 15 PA, varices opérées, père thromboses
- **Pour la patiente :** la pilule était déjà défavorable (fumeuse de plus de 35 ans, diabète, HTA) ; sous DOAK, une
  contraception reste nécessaire (stérilet) ; Kreatinin pour le DOAK (diabète, Ramipril) ; DD thrombophlébite
  superficielle (varices) ; Apixaban à la dose de la notice ; ambulatoire possible sans embolie ; vols futurs.
- **Corrigé :** Marcumar-Bridging → DOAK en première ligne ; D-Dimer seulement si probabilité faible ;
  Thrombophilie-Test non en phase aiguë, seulement s'il change la conduite (et non « wegen des jungen Alters » à 52 ans) ;
  compression pour les symptômes (bénéfice sur le syndrome post-thrombotique discuté) ; Falle sans réponse « pAVK nicht
  durch Pulstasten » remplacée.
- **Répliques (contradictions avérées, corrigées) :** `fach-gefaess-vorgeschichte` disait « operiert wurden meine Gefäße
  noch nie » alors que `vor-op` cite la Varizenoperation → « die wurden vor ein paar Jahren operiert. An den Schlagadern
  wurde nie etwas gemacht » ; `fach-gefaess-gehstrecke` « Gehen tut mir schon länger weh » pour une douleur de 3 jours →
  « seit drei Tagen ».

### gerd — Sabine Wolf, 42 ans, IMC 29, 10 PA, café, gras, vin le week-end, pilule, toux nocturne
- **Pour la patiente :** l'ancienne thérapie parlait de « diesem Patienten » et de ses « üppigen Mahlzeiten am späten
  Abend » (absentes de ses répliques) → réécrite sur ses déclencheurs à elle ; perte de poids et arrêt du tabac ;
  tête du lit surélevée (symptômes nocturnes) ; ECG de repos (fumeuse sous pilule), pas de Troponin sans douleur aiguë ;
  pas d'ÖGD d'emblée ; toux persistante → fonction pulmonaire.
- **Corrigé :** l'âge (« über 45–50 Jahre ») n'est pas un Alarmsymptom de la S2k 2023 (sept occurrences dans le FW) ;
  le test aux IPP ne prouve pas le RGO ; trithérapie « französisch/italienisch » retirée ; DD eosinophile Ösophagitis
  ajoutée et annotée sur « keine Schluckbeschwerden ».

### myokardinfarkt — Dieter Fischer, 59 ans, chef de chantier, Amlodipin, hypercholestérolémie SANS statine, 40 PA, frère infarctus à 55 ans
- **Pour le patient :** la VD disait STEMI avant l'ECG alors que le Muster disait « entscheidet das EKG » → « akutes
  Koronarsyndrom, am ehesten STEMI » ; tension aux deux bras avant Heparin (hypertendu) ; statine à forte dose dès le
  séjour (il n'en a pas) ; IEC pour l'HTA ; arrêt du tabac ; piste d'une hypercholestérolémie familiale (frère).
- **Corrigé :** « MONA-B » → oxygène seulement si SpO₂ < 90 %, nitrés si PAS > 90 mmHg, morphine si douleur forte ;
  « nur Infarktarterie, Rest FFR-gesteuert im Intervall » → revascularisation complète pendant l'index-PCI ou sous
  45 jours ; délais 60/90/120 min et lyse en 10 min ; Prasugrel préféré.

### cholezystitis — Rosa Schneider, 49 ans, cuisinière, IMC 34,5, pilule, fièvre et frissons, presque rien bu
- **Pour la patiente :** « diesem Patienten » partout → réécrit ; perfusion (déshydratée) ; hémocultures (frissons) ;
  β-HCG (règles régulières) ; thromboprophylaxie (obésité, pilule, chirurgie) ; antibiothérapie arrêtée dans les 24 h
  après l'opération si forme légère (Tokyo 2018).
- **Corrigé :** Morphin « wegen Sphincter Oddi zurückhaltend » retiré ; DD Cholangitis bei Choledocholithiasis ajoutée et
  annotée sur deux négatifs existants (« keine Gelbfärbung … (gegen Cholangitis) », « kein dunkler Urin … (gegen
  Choledocholithiasis) »).

### multiple-sklerose — Gabriela Hubert, 34 ans, pilule, allergie poisson (angio-œdème), seule au 2e sans ascenseur
- **Pour la patiente :** une aggravation lente sur 3 mois est inhabituelle pour un Schub → Kortisonstoß seulement si
  l'IRM montre une activité, et la DD inclut une Raumforderung spinale ; l'allergie au poisson n'est pas une
  contre-indication au gadolinium ; Kategorien der Immuntherapie (S2k) ; contraception et tératogénicité.
- **Corrigé :** VD d'une seule longue phrase coupée par « … » ; PF 12 → 6 (six recopiaient la fiche) ; « ggf. »,
  capitales d'insistance et « (ausdrücklich!) » retirés de l'ES ; DD « funktionelle Störung » retirée au profit de la
  Raumforderung.

### reizdarm — Frida Zimmermann, 52 ans, ménopausée, cholécystectomie, enzymes et laxatif végétal, 4 cafés
- **Pour la patiente :** ballonnement nouveau après la ménopause → DD Ovarialprozess explicite ; iFOBT retiré de la
  Diagnostik (test de dépistage, elle sera coloscopiée ; la question d'examen garde l'explication) ; Macrogol à la place
  du laxatif végétal, enzymes arrêtées ; Amitriptylin prudent vu la constipation.
- **Corrigé :** sous-type « Mischtyp mit Obstipationsprädominanz » (inexistant) → « Mischtyp », à confirmer par le
  journal des selles ; ES « völliges Fehlen von Alarmsymptomen » contredisait « Beginn nach 50 = Alarmzeichen » ;
  DD Hyperthyreose → Schilddrüsenfunktionsstörung (la constipation évoque plutôt une hypothyroïdie).

## 4. Sources

| Point | Cas | Source | Vérifié en ligne |
|---|---|---|---|
| NSAR en première ligne, spasmolytiques, opioïdes (Buprenorphin, Pethidin) ; cholécystectomie sous 24 h dans la cholécystite ; antibiotiques si sepsis, cholangite, abcès, perforation ; calculs asymptomatiques (porcelaine, > 3 cm, polypes ≥ 1 cm) | gallenkolik, cholezystitis | S3 Gallensteine, AWMF 021-008 (2018) | oui, résumé ArsMedici 2018 |
| Liste des Alarmsymptome (sans l'âge) ; l'efficacité des IPP ne prouve pas le diagnostic ; IPP en dose standard 4–8 semaines ; ÖGD après échec ≥ 8 semaines et en cas de reflux pluriannuel | gerd | S2k GERD, DGVS, AWMF 021-013 (2023) | oui, dgvs.de |
| Revascularisation complète à l'index-PCI ou sous 45 jours ; prétraitement P2Y12 IIb dans le STEMI | myokardinfarkt | ESC ACS 2023 | oui (résumés publiés) |
| ECG en 10 min ; 60/90/120 min ; lyse en 10 min ; ASS, UFH 70–100 UI/kg ; O₂ si SpO₂ < 90 % ; Prasugrel préféré ; LDL < 55 mg/dl ; IEC ; algorithme 0/1 h | myokardinfarkt | ESC ACS 2023 | non, de mémoire |
| DOAK en première ligne ; anticoagulation dès probabilité élevée ; ≥ 3 mois si facteur transitoire ; compression pour les symptômes ; pas de thrombophilie en phase aiguë ; pas de recherche étendue de cancer | tvt | S2k Venenthrombose und Lungenembolie, AWMF 065-002 (2023) | version vérifiée ; contenu de mémoire (PDF non lisible) |
| Apixaban 10 mg × 2 pendant 7 jours puis 5 mg × 2 | tvt | Fachinformation Eliquis | non, de mémoire |
| Pilule combinée : fumeuse > 35 ans, diabète, HTA | tvt | WHO Medical Eligibility Criteria (2015) | non, de mémoire |
| Critères diagnostiques et grades (leucocytes > 18 000/µl, > 72 h) ; durée des antibiotiques | cholezystitis | Tokyo Guidelines 2018 | non, de mémoire |
| Methylprednisolon 1000 mg 3–5 jours, escalade ; catégories d'efficacité 1–3 | multiple-sklerose | S2k MS, NMOSD, MOGAD, DGN, AWMF 030-050 (2021, mise à jour 2023) | non, de mémoire |
| Critères de Rome IV, FODMAP, hypnothérapie, Amitriptylin | reizdarm | S3 Reizdarmsyndrom, AWMF 021-016 (2021) | non, de mémoire |
| Faits gardés dans les FW de (B) | oesophagus, KRK, divertikulitis | repris des FW existants (S3 2023, S3 KRK, G-BA 2025, S3 Divertikel 2021) | voir `lead-s3-lc3.md` § 5 |

## 5. Cohésion (`checkCaseCohesion`, non bloquant)

**277 → 277** liens manquants sur le corpus.
- Neutralisées par annotation de négatifs existants : eosinophile Ösophagitis (gerd), Cholangitis et Choledocholithiasis
  (cholezystitis).
- Toujours non neutralisée : tvt « Oberflächliche Thrombophlebitis », qu'aucun négatif ne contredit ; aucun négatif inventé.
- multiple-sklerose « pAVK » est un faux négatif du validateur : les négatifs portent « (gegen pAVK) », mais l'acronyme
  après une minuscule (« pAVK ») échappe à sa regex.
- La Falle sans réponse de tvt (« pAVK nicht durch Pulstasten ») a disparu.

## 6. Liens de termes

`caseTermLinks.json` régénéré. gerd est tombé à 4 termes (< 8, `checkCaseTermLinks` en échec) parce que l'ancienne fiche,
écrite pour un autre patient, citait Gastrektomie, Osteoporose, etc. J'ai écrit sa VD et sa Diagnostik avec les termes du
cas (Pyrosis, Regurgitation, Reflux, Refluxösophagitis, Hiatushernie) : 9 termes. Les autres restent au-dessus de 8 :
myokardinfarkt 19 → 12, multiple-sklerose 18 → 11, cholezystitis 27 → 19, reizdarm 20 → 16, tvt 8 → 12,
gallenkolik 11 → 24.

## 7. Vérifications (code de sortie)

| Commande | Sortie |
|---|---|
| `npx tsc -b` | 0 |
| `npm test -- --maxWorkers=2` | 0 (193 fichiers, 2 025 tests) |
| `npm run test:c6 -- --maxWorkers=2` | 0 (17 fichiers, 212 tests) |
| `node --test` (scripts/*.test.mjs sans checkProbeCoverage) | 0 (200 tests) |
| `node --test scripts/checkProbeCoverage.test.mjs`, seul | 0 (4 tests) |
| les 18 `check*` de la CI | 0 chacun |
| `checkTermRegister --require-all`, `evalDoctopus --dry` | 0, 0 |
| `checkCoherence --case`, 10 cas (7 de A, 3 de B) | 0 × 10 |
| `checkBudgetFloor.mjs origin/main` | 0 |
| `npm run build` | 0 |
| `git merge-tree --write-tree origin/main HEAD` | 0 |
| `npm run content:link` | 0 |

- **Test de garde** étendu (`vorstellungsSatz.test.ts`, « les cas de Lc3 et Lc4 ») : les 7 phrases de Fallvorstellung
  tiennent sans « … » et sans « Patient ». Avant le lot, les 7 auraient échoué.
- Nettoyage : les 4 dossiers vitest `$TMPDIR/<nanoid>/client` de ce lot sont supprimés. Les 3 autres, de moins de
  120 min, viennent d'autres sessions et n'ont pas été touchés. Les scripts de travail restent hors dépôt (scratchpad),
  et le serveur vite de mesure est arrêté.

## 8. Points à trancher

- **Concision étendue à gerd, myokardinfarkt et cholezystitis** (hypothèse 5) : de 32–35 écrans à 7–8, redites de
  21–33 à 0. Si la direction préfère des versions plus longues, la marge sous 16 écrans est large.
- **fw-multiple-sklerose** reste à 16,9 écrans et 16 redites, et **fw-reizdarm** à 17,7 écrans et 5 redites : je n'y ai
  pas touché. Ce serait un lot de concision séparé, avec fw-bandscheibenvorfall.
- **Âges incohérents avec la date de naissance** (non touchés) : reizdarm « 52 ans, née le 14.07.1968 » (58 ans en 2026),
  tvt « 52 ans, née le 04.04.1971 » (55 ans). Ce défaut est sans doute général à tous les cas datés ; il demande une
  décision.
- **Choix cliniques à faire valider en revue :**
  - gallenkolik : Metamizol plutôt qu'un AINS ;
  - tvt : Apixaban et stérilet ;
  - cholezystitis : arrêt des antibiotiques dans les 24 h après l'opération ;
  - multiple-sklerose : Kortisonstoß conditionné à l'IRM ;
  - reizdarm : iFOBT retiré.
- **Validateur** : la regex d'acronymes de `checkCaseCohesion` ne voit pas « pAVK » (§ 5).

## Non vérifié

- Les sources du § 4 marquées « de mémoire » n'ont pas été relues dans le texte. Les plus fragiles :
  - S2k VTE 2023, dont le PDF dépasse la taille lisible en ligne ;
  - classe de recommandation de la vaccination antigrippale (ESC 2023) ;
  - catégories de la S2k MS.
- Je suis le seul à avoir relu la langue (C1, registre) ; il n'y a pas eu de passe `fsp-language-reviewer`.
- Rendu des pages de cas (fiche, ES) non mesuré dans le navigateur ; seules les pages Fachwissen l'ont été.

## 9. Passe fixeur clinique + langue (sommet revu `93f32ad1`)

109 remplacements scriptés, chacun unique dans le bloc de son cas, de son Fachwissen ou de son Muster. Le texte retenu est
celui des revues, sauf pour les arbitrages du coordinateur ci-dessous.

**Clinique : P1-1 à P1-6, tous les P2, négatifs de reizdarm**
- **P1-1, reizdarm** : la DD Schilddrüse ne dit plus « sie hat davon nichts » alors qu'elle est constipée ; la
  Unterfunktion peut expliquer la constipation, la Überfunktion est verneint, le TSH tranche.
- **P1-2 et P1-3, reizdarm** : l'ES n'a plus d'iFOBT. La recherche d'agents pathogènes dans les selles, Lamblien compris,
  fait partie de la Basisdiagnostik (S3 2021) dans la fiche, l'ES et les deux Muster. Le H2-Atemtest n'est fait que si le
  journal montre un lien avec le lait.
- **P1-4, multiple-sklerose** : les patientWorte ne promettent plus la cortisone (« entscheiden wir nach dem MRT, ob … »).
- **P1-5, multiple-sklerose** : « Erstdiagnose einer schubförmigen Multiplen Sklerose » remplace « Erstmanifestation »,
  et la réponse dit que la progression sur trois mois est inhabituelle.
- **P1-6, fw-oesophaguskarzinom** : cT2 N0 = opération ou traitement multimodal selon le Tumorboard. Le libellé de
  thérapie est inchangé.
- **P2** :
  - tvt :
    - anticoagulation provisoire si l'échographie n'est pas disponible rapidement (fiche et FW) ;
    - Apixaban sans adaptation rénale (GFR ≥ 15) ;
    - Hormonspirale (fiche et ES) ;
    - fin de la réplique `fach-gefaess-gehstrecke` : « beim Gehen etwas mehr ».
  - gallenkolik :
    - justification du Metamizol : deux Ibuprofen pris il y a quelques heures, et les AINS réduisent le risque de
      cholécystite ;
    - hémochromatose comme cause héréditaire (ES et FW).
  - cholezystitis :
    - arrêt de l'antibiothérapie dans les 24 h pour les grades Tokyo I et II (fiche et FW) ;
    - cholangite et sepsis distingués ;
    - antibiothérapie du FW alignée sur la S3.
  - gerd : Los Angeles A « bis 5 mm ».
  - myokardinfarkt :
    - question familiale « Mann vor 55, Frau vor 60 » ;
    - hypercholestérolémie familiale « besonders bei LDL über 190 mg/dl ».
  - multiple-sklerose :
    - Methylprednisolon 500–1000 mg selon le Schub clinique, l'IRM étant co-décisionnelle dans cette situation unclare ;
    - la DD « funktionelle Störung » retirée de l'ES au profit de la spinale Raumforderung.
  - reizdarm :
    - Rom IV : deux critères sur trois ;
    - ÖGD avec Duodenalbiopsien pour le diagnostic positif ;
    - « Schilddrüsenfunktionsstörung » à la place de « Hyperthyreose » dans l'ES ;
    - CED : « CRP und Calprotectin stehen aus ».
  - FW raccourcis :
    - oesophagus : sm1 pour l'adénocarcinome ;
    - kolorektales-ca : le tiers supérieur du rectum se traite comme un côlon.
- **Négatifs de reizdarm** :
  - annotés : Giardiasis, Clostridioides-difficile-Infektion, chronisch-entzündliche Darmerkrankung (deux constats) ;
  - parenthèse fausse corrigée : « (gegen funktionelle Dyspepsie als Ursache der Bauchschmerzen) ».

**Langue : les 6 Important et tous les Mineurs**
- **Muster MS et Reizdarm** : texte de la revue langue, avec les décisions cliniques reportées.
  - MS : la cortisone est décidée après l'IRM.
  - Reizdarm : Erreger einschließlich Lamblien, Gastroskopie mit Duodenalbiopsien, pas d'iFOBT.
- **Les autres Important** :
  - Fallvorstellung de gallenkolik : « intravenös, weil der Patient … eingenommen hat » ;
  - patientWorte diagnostik de gerd : « schreiben wir zur Sicherheit eine Herzstromkurve; … » ;
  - VD de la SEP : Sensibilitätsstörung, Parese, Retrobulbärneuritis, Dissemination in Ort und Zeit ;
  - ES de gallenkolik : « Heute müssen wir erst … ausschließen ».
- **Parenthèses dans les réponses de l'ES** : les trois reformulations proposées (cholezystitis, gerd, tvt).
- **Mineurs** :
  - Beta-HCG, Milligramm, Milligramm pro Deziliter à l'oral ;
  - « Ulkus » partout dans gerd et cholezystitis, DD comprise ; l'annotation « (gegen Ulcus) » des négatifs est passée à
    « (gegen Ulkus) » pour garder la DD neutralisée ;
  - « ÖGD » et « Endoskopie » côté médecin ; les merksätze gardent « Spiegelung » ;
  - Konjunktiv dans le Muster de gallenkolik ;
  - accords, prépositions et « das D-Dimer » ;
  - « Umfangsdifferenz », « vor dem 50. Lebensjahr » ;
  - patientWorte de gallenkolik : « verstopft », et l'antalgique n'est plus conditionné.
- **Harmonisation des ES de Reizdarm et SEP** :
  - 14 débuts de réponse en majuscule, 2 paires de guillemets ASCII en guillemets allemands ;
  - « warm und kalt », « ANA und ENA », « Aquaporin-4- und MOG-Antikörper », « NMOSD oder die MOG-Antikörper-Erkrankung » ;
  - virgule dans « Abführlösung, bis der Stuhl klar ist », « gutartigen und gut behandelbaren ».

**Arbitrage gerd et pilule : premier cas.** La patiente mentionne la pilule (`frau-verhuetung` : « Ich nehme die Pille. ») :
- « orales Kontrazeptivum (Pille) » est ajouté à `medikamente` ;
- la Basistherapie dit « Als Raucherin über 35 mit kombinierter Pille: Verhütung mit der Frauenärztin überdenken » ;
- les deux Muster `medikation` citent l'oral Kontrazeptivum, pour la cohésion avec l'Arztbrief ;
- aucune réplique n'est inventée.

**Non touché**, comme arbitré : les âges incohérents avec la date de naissance (lot Âges).

**Vérifications après la passe (code de sortie)**

| Commande | Sortie |
|---|---|
| `npx tsc -b` | 0 |
| `npm test -- --maxWorkers=2` | 0 (193 fichiers, 2 025 tests) |
| `npm run test:c6 -- --maxWorkers=2` | 0 (212 tests) |
| `node --test` sans checkProbeCoverage, puis checkProbeCoverage seul | 0 (200), 0 (4) |
| les 18 `check*` de la CI, `checkTermRegister --require-all`, `evalDoctopus --dry` | 0 chacun |
| `checkCoherence --case`, 10 cas | 0 × 10 |
| `checkBudgetFloor.mjs origin/main` (`8690fc4d`) | 0 |
| `npm run build` | 0 |
| `git merge-tree --write-tree origin/main HEAD` | 0 |
| `npm run content:link` | 0 (reizdarm 16 → 17, multiple-sklerose 11 → 12 termes) |

- **Mesures DOM après la passe** (écrans au repos / ouvert, redites) :
  - B : oesophaguskarzinom 10,4 / 11,5, kolorektales-ca 10,5 / 10,5, divertikulitis 9,4 / 9,4 ;
  - A : gallenkolik 9,5 / 9,7, tvt 9,5 / 9,5, gerd 8,0 / 8,0, myokardinfarkt 8,1 / 8,1, cholezystitis 7,2 / 7,4 ;
  - 0 redite partout.
- Redites fiche + PF : 0 sur les 7 cas.
- Cohésion : 277 liens manquants, inchangé.
- La première phrase de chaque VD tient en 69 à 130 caractères : aucune ligne de Fallvorstellung coupée.
- Note : le dossier de travail du lot (scripts hors dépôt) avait disparu entre les deux passes ; les outils de remplacement
  et de mesure ont été réécrits pour cette passe, à la même méthode.

## 10. Passe fixeur direction (sommet revu `4bb2fff7`)

La revue a jugé les sections justes, mais les questions d'examen coupées trop court. Les sections ne bougent pas : seules
des questions ciblées sont ajoutées. Les textes allemands de la revue ont été relus avant d'être appliqués (§ 10.3).

### 10.1 Contenu

- **B1** :
  - fw-myokardinfarkt : « Ist ein erhöhtes Troponin gleichbedeutend mit einem Herzinfarkt? » et l'explication de
    l'infarctus et du cathéter au patient ;
  - fw-gerd : l'explication au patient, sans ÖGD d'emblée ;
  - fw-cholezystitis : « Wann operieren Sie? » (doublon de la Thérapie) remplacé par l'explication de l'opération, et la
    troisième Charcot des pièges remplacée par le test de grossesse.
- **I1** : explication au patient pour fw-divertikulitis, avec la coloscopie « vier bis sechs Wochen später » alignée sur
  la fiche ; annonce du diagnostic pour fw-kolorektales-ca ; spiegelung et suspicion pour fw-oesophaguskarzinom.
- **I2** : la DD Cholangitis de fw-gallenkolik ne redit plus la Charcot.
- **I3** : DD appliquées à la patiente. Reizdarm : Zöliakie, Laktose/Fruktose, Divertikelkrankheit, infektiöse Ursachen.
  MS : NMOSD. Chaque fait cité vient du `patientSheet`.
- **I4** : le Cave de la SEP dit « „Doppelbilder“ beim Fragen erklären: „Sehen Sie einen Gegenstand manchmal doppelt?“ »
  (elle n'a pas de diplopie).
- **I5** : examinerQuestions en phrases complètes pour myokardinfarkt, gerd, cholezystitis et divertikulitis. Trois
  formulations de la revue ont été allongées pour passer la nouvelle garde (4 mots et « ? ») :
  - « Nennen Sie die Alarmsymptome. » → « Welche Alarmsymptome kennen Sie? » ;
  - « Wann operieren Sie? » → « Wann operieren Sie die Patientin? » (cholezystitis et divertikulitis, deux patientes).
- **M1** : deux DD de la SEP en phrase complète. **M2** : « Keine notfallmäßige Aufnahme nötig » retiré des
  Erstmaßnahmen. **M3** : VD de reizdarm sans double deux-points ; le texte de la revue rallongeait la ligne de
  Fallvorstellung à 204 caractères (test de garde rouge), d'où « mit Bauchschmerzen seit sechs Monaten, die … ».
  **M4** : « retrosternalem Ruheschmerz » dans la VD de myokardinfarkt seulement. **M5** : Muster de gerd sans
  pléonasme. **M6** : rien.
- **Plancher**, deux questions ajoutées au-delà des textes de la revue :
  - fw-myokardinfarkt était à 5 après B1, d'où « Wie gehen Sie bei einem akuten Koronarsyndrom ohne ST-Hebung vor? »
    (0/1-Stunden-Algorithmus, sofortige ou 24-Stunden-Angiographie selon le risque, GRACE au-dessus de 140, ESC 2023) ;
  - fw-cholezystitis était à 5, d'où « Welche Komplikationen drohen bei einer akuten Cholezystitis? » ;
  - fw-gallenkolik et fw-tvt n'avaient pas d'explication au patient : une chacun.

| Fachwissen | askedInExam avant → après | Explication au patient | Écrans DOM (repos / ouvert) | Redites |
|---|---|---|---|---|
| oesophaguskarzinom | 6 → 7 | oui | 10,5 / 11,8 | 0 |
| kolorektales-ca | 6 → 7 | oui | 10,8 / 10,8 | 0 |
| divertikulitis | 5 → 6 | oui | 9,7 / 9,7 | 0 |
| gerd | 5 → 6 | oui | 8,3 / 8,3 | 0 |
| myokardinfarkt | 3 → 6 | oui | 9,1 / 9,1 | 0 |
| cholezystitis | 5 → 6 | oui | 7,8 / 7,8 | 0 |
| gallenkolik | 7 → 8 | oui | 9,7 / 10,0 | 0 |
| tvt | 5 → 6 | oui | 9,8 / 9,8 | 0 |

Redites des fiches et des Prüfungsfallen : 0 sur les 7 cas.

### 10.2 Gardes CI (I6)

- **`scripts/checkFachwissenFloor.mjs`**, ajouté dans `quality.yml`, à côté de l'étape de checkAllergyConflicts ;
  son test est lancé dans le bloc `node --test`. Seule mon étape a été ajoutée au `quality.yml` du worktree, sans
  toucher aux lignes non commitées du dépôt principal.
  - **Strict, au moins 5 `askedInExam`** : sur le corpus mesuré, aucun Fachwissen n'est en dessous une fois Lc4
    corrigé ; le seul était fw-myokardinfarkt (3). La règle peut donc être stricte, sans budget.
  - **Budget de l'explication au patient** : regex `/erklären Sie|in einfachen Worten|ohne Fachbegriffe|teilen Sie .* mit/`,
    insensible à la casse pour reconnaître « Erklären Sie … ». **47** Fachwissen sur 134 n'en ont pas (budget 47).
  - **Budget des `examinerQuestions` mal formées** (sans « ? » final, ou de moins de 4 mots) : **199** questions sur
    2 086, dans 107 cas (budget 199).
  - Fixture `scripts/fixtures/fachwissen-floor-budget.json`, ajouté aux fixtures de `checkBudgetFloor.mjs` : il ne peut
    pas remonter face à la base.
- **`scripts/checkFachwissenFloor.test.mjs`** (`node --test`, 4 tests) : chaque règle rougit, le sain passe, le corpus
  sort à 0.
- **`vorstellungsSatz.test.ts`** sur les 130 cas : **99 cas échouent**. Leur phrase de Fallvorstellung se termine par
  « … ». Les listes Lc2, Lc3 et Lc4 sont gardées ; l'extension au corpus sera un lot à part. Cas concernés :
  gicht, hyperthyreose, asthma, herzinsuffizienz, tonsillitis, anaemie, vorhofflimmern, erysipel, hypothyreose, niereninsuffizienz, lymphom, lungenembolie, eug, meningitis, pankreaskarzinom, zoster, osteoporose, bph, demenz, bronchialkarzinom, mammakarzinom, rheumatoide-arthritis, morbus-crohn, karpaltunnel, panikstoerung, prostatakarzinom, hepatitis-b, parkinson, gonarthrose, struma, otitis-media, ileus, lagerungsschwindel, synkope, zoeliakie, schenkelhalsfraktur, ulcus-cruris, leistenhernie, alkoholentzug, commotio, itp, uterus-myomatosus, akutes-nierenversagen, fibromyalgie, polymyalgia, pneumothorax, schlafapnoe, schizophrenie, delir, achalasie, septische-arthritis, spinalkanalstenose, hws-diskusprolaps, tia, diabetes-typ1, gastroenteritis, rheumatisches-fieber, influenza, coxarthrose, metabolisches-syndrom, karzinoid, abszess, anorexia-nervosa, malaria, endokarditis, covid19, anaphylaxie, reaktive-arthritis, pertussis, colitis-ulcerosa, chronische-pankreatitis, myokarditis, nephrotisches-syndrom, akute-leukaemie, endometriose, ptbs, somatoforme-schmerzstoerung, hueftkopfnekrose, glomerulonephritis, nhl, cml, adnexitis, allergische-rhinitis, typhus, obstipation, sturz-im-alter, lumboischialgie, bauchaortenaneurysma, aortendissektion, perikarditis, epilepsie, hodentorsion, basaliom, psoriasis, urtikaria, perniziose-anaemie, opioidabhaengigkeit, sinusitis, arterielle-hypertonie.

### 10.3 Relecture des textes de la revue avant application

- Explication de l'infarctus : « Arterie » → « Schlagader ».
- Explication de la divertikulitis : « einige Wochen später » → « vier bis sechs Wochen später ».
- Les autres explications ne contiennent aucun Fachbegriff. Les annonces du kolorektales-ca et de l'oesophaguskarzinom
  gardent le Fachbegriff dans la consigne au jury, hors guillemets.

### 10.4 Vérifications (code de sortie)

| Commande | Sortie |
|---|---|
| `npx tsc -b` | 0 |
| `npm test -- --maxWorkers=2` | 0 (193 fichiers, 2 025 tests) |
| `npm run test:c6 -- --maxWorkers=2` | 0 (212 tests) |
| `node --test` sans checkProbeCoverage, puis checkProbeCoverage seul | 0 (204), 0 (4) |
| les 19 `check*` de la CI, dont `checkFachwissenFloor` ; `checkTermRegister --require-all` ; `evalDoctopus --dry` | 0 chacun |
| `checkCoherence --case`, 10 cas | 0 × 10 |
| `checkBudgetFloor.mjs origin/main` (`adcc4b04`) | 0 (nouveau fixture : rien à comparer) |
| `npm run build` | 0 |
| `git merge-tree --write-tree origin/main HEAD` | 0 |
| `npm run content:link` | 0, `caseTermLinks.json` inchangé |

Cohésion : 277 liens manquants, inchangé.

**Non vérifié** : les textes ajoutés par cette passe n'ont été relus ni par la revue clinique ni par la revue langue ;
ce delta est annoncé pour une relecture par le coordinateur. Je n'ai pas lancé le YAML de `quality.yml` sur un runner ;
la modification reprend la forme des étapes voisines.

## 11. Passe fixeur des mini-revues (delta `4bb2fff7..67b716e3`)

21 remplacements, chacun unique dans son bloc. Là où les deux revues se recoupent, le fond vient de la revue clinique et
la forme de la revue langue.

**Clinique : P1-1 à P1-3, P2-1 à P2-8**
- **P1-1, délai de la coloscopie après une divertikulitis.** J'ai vérifié en ligne la S3 Divertikelkrankheit/Divertikulitis
  2021 (AWMF 021-020, dgvs.de, Empf. 5.12) : « Nach Ausheilung einer konservativ behandelten Divertikulitis (i.d.R.
  nach 6-8 Wochen) sollte die Indikation zur Koloskopie in Abhängigkeit von klinisch-anamnestischen Faktoren
  (protrahierter Verlauf, persistierende Beschwerden, Alter des Patienten, Bildgebung) gestellt werden. »
  - Le délai est aligné sur « in der Regel nach 6–8 Wochen » aux 5 endroits : FW Thérapie, FW question
    « Warum keine Koloskopie », FW explication au patient, fiche du cas, ES du cas. Le Muster est aligné lui aussi.
  - L'indication dépend du cas. Dans la fiche : « bei ihr trotz der Koloskopie vor zwei Jahren wegen Alter, Fieber und
    CT-Befund zu prüfen ». Le piège du FW, « nie auf die Koloskopie im Intervall verzichten », devient « nach der
    Abheilung die Indikation zur Koloskopie aktiv stellen ».
  - La réponse « Warum keine Koloskopie » est raccourcie (« Gespiegelt wird erst nach der Abheilung, wenn ein Karzinom
    auszuschließen ist. ») pour ne pas redoubler la Thérapie.
- **P1-2 et I-3, NSTE-ACS.** Réponse à la première personne, avec « Null-Eins-Stunden-Algorithmus ».
  - Très haut risque (instabilité ou choc, douleur réfractaire, troubles du rythme menaçant le pronostic vital,
    insuffisance cardiaque aiguë, complications mécaniques) : angiographie immédiate, sous deux heures.
  - NSTEMI confirmé, modifications dynamiques du ST ou GRACE au-dessus de 140 : sous 24 heures.
  - Risque bas : sélective, après diagnostic non invasif.
- **P1-3, I-4 et M-6, annonce du Darmkrebs.** Déroulé SPIKES en phrases conjuguées ; dans la partie entre guillemets :
  « … bösartig ist. Es handelt sich um Darmkrebs. »
- **P2** :
  - P2-1, reizdarm : la DD Divertikelkrankheit inclut la forme symptomatique sans inflammation (SUDD).
  - P2-2 et I-1, MS : texte de l'arbitrage (contre une NMOSD à AQP4, sans exclure une MOGAD).
  - P2-3 et M-9, explication du cathéter : texte de P2-3, avec « Herzstromkurve » au lieu de « EKG » dans la bouche du
    médecin et « weiten die verschlossene Stelle mit einem Ballon ».
  - P2-4, P2-5, M-1, M-2 et I-2, gallenkolik et cholezystitis : « verschließt kurzzeitig », « Weil solche Anfälle
    meistens wiederkommen », « in einer geplanten Operation », « mit einer Kamera und feinen Instrumenten »,
    « in aller Regel normal leben und essen ».
  - P2-6 et M-3, TVT : signes de saignement, « wählen Sie sofort den Notruf 112 ».
  - P2-7, GERD : signes d'alerte.
  - P2-8, DD Cholangitis : Charcot et conduite d'urgence.

**Langue : I-1 à I-4, M-1 à M-10**
- Appliqués avec les points cliniques ci-dessus.
- M-7 : « biliodigestive Fistel », « verlaufen diese Komplikationen oft beschwerdearm ».
- M-8 : « Myokardschädigung », « ist … erforderlich ».
- M-10 : « Die Ursache kann eine Engstelle sein ».
- Non fait, comme arbitré : « ÖGD » reste tel quel. Les variantes « non bloquantes » de la revue n'ont pas été reprises.

**« Wann operieren Sie die Patientin? ».** Aucun validateur ni affichage n'apparie `examinerQuestions` avec les `frage`
de l'examinerSheet :
- `ExaminerSheetView` ne lit `examinerQuestions` qu'en repli (`fallback`), quand il n'y a pas d'examinerSheet ;
- `externalAi/prompt.ts` prend les questions de l'examinerSheet en priorité ;
- `checkQuestionAtomicity` et `checkCaseCohesion` les lisent séparément.

Les répliques « Wann operieren Sie? » restent donc inchangées.

**Mesures DOM après la passe** (écrans au repos / ouvert, redites, questions) :

| Fachwissen | Écrans | Redites | Questions |
|---|---|---|---|
| oesophaguskarzinom | 10,5 / 11,8 | 0 | 7 |
| kolorektales-ca | 11,0 / 11,0 | 0 | 7 |
| divertikulitis | 8,9 / 9,9 | 0 | 6 |
| gerd | 8,4 / 8,4 | 0 | 6 |
| myokardinfarkt | 9,4 / 9,4 | 0 | 6 |
| cholezystitis | 7,9 / 7,9 | 0 | 6 |
| gallenkolik | 9,7 / 10,1 | 0 | 8 |
| tvt | 9,9 / 9,9 | 0 | 6 |

Chacun a une question d'explication au patient. `checkFachwissenFloor` reste à 47 sans explication et à 199 questions mal
formées. La cohésion est à 277, inchangée.

**Vérifications (code de sortie)** :

| Commande | Sortie |
|---|---|
| `npx tsc -b` | 0 |
| `npm test -- --maxWorkers=2` | 0 (2 025 tests) |
| `npm run test:c6 -- --maxWorkers=2` | 0 (212 tests) |
| `node --test` sans checkProbeCoverage, puis checkProbeCoverage seul | 0 (204), 0 (4) |
| les 19 `check*` de la CI, `checkTermRegister --require-all`, `evalDoctopus --dry` | 0 chacun |
| `checkCoherence --case`, 10 cas | 0 × 10 |
| `checkBudgetFloor.mjs origin/main` (`ccf94204`) | 0 |
| `npm run build` | 0 |
| `git merge-tree --write-tree origin/main HEAD` | 0 |
| `npm run content:link` | 0 (`caseTermLinks.json` régénéré) |

**Non vérifié** : les seuils ESC 2023 du NSTE-ACS sont repris de la revue clinique, sans relecture du texte de l'ESC.
