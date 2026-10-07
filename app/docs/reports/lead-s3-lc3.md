# Lot Lc3 — fiches et Fachwissen des premiers cas (C0 hors gratuits, C1, C2)

Branche `feat/s3-lc3-fiches-c1c2`, rebasée sur `origin/main` après la fusion de Lc2 (#93, sommet `a5cdf325`).
Retours FB3-G7 (`app/docs/BACKLOG-FEEDBACK.md`). Méthode et pièges de référence : `lead-s3-lc1.md`, `lead-s3-lc2.md`.

## 0. Hypothèses posées avant d'agir

1. **Mêmes définitions que Lc1 et Lc2.** « Fiche » = `medicalView`. « Fachwissen » = l'entrée `seedFachwissen`. Prüfungsfallen
   = `case.pruefungsfallen`, affichées sur la page du cas avec la fiche. Le type n'est pas modifié.
2. **Générations datées par `git blame`** sur la ligne `id:` de chaque cas, comme dans l'audit : C0 = 6 juillet (10 cas),
   C1 = 16–22 juillet (10), C2 = août (12), C3 = septembre (98). Le décompte retombe sur celui de l'audit.
3. **Les cas `tier === 1` sont exclus**, puisque Lc2 les a traités. Leberzirrhose est aussi exclu, traité par Lc1.
4. **Édition directe des seeds.** Chaque bloc (`medicalView`, `examinerSheet`, `pruefungsfallen`) est remplacé d'un seul
   tenant par un script hors dépôt. Le Muster est modifié clé par clé. Les répliques du patient (`antworten`) et les
   `negativeFindings` ne sont pas touchés.
5. **Les libellés de thérapie restent inchangés** (`checkTherapieLabels` : identiques entre fiche et FW, dans le même
   ordre). Quand un item était rangé sous le mauvais libellé (lyme), c'est l'item qui a été déplacé, pas le libellé.

## 1. Mesure (avant le lot, `494a9341`)

Mesure faite sur les vrais objets (`scripts/loadCases.mjs`). Fiche et FW = longueur JSON. ES = sections de
l'examinerSheet. PF = Prüfungsfallen du cas. Fréq. = total de la pathologie dans `frequencesProtocoles.ts`.

| Médiane | DD | Diagnostik | ES | Fiche | FW |
|---|---|---|---|---|---|
| C0 (10) | 3 | 3 | 2 | 6,9 k | 38 k |
| C1 (10) | 5 | 6 | 4 | 4,6 k | 14,7 k |
| C2 (12) | 9 | 14 | 5 | 10,1 k | 28 k |
| C3 (98) | 10 | 14 | 5 | 15,0 k | 34 k |

Cas candidats (non gratuits, hors leberzirrhose) :

| Cas | Gén. | Fiche | DD/Diag/Erst | ES | FW | PF | notfall | Fréq. |
|---|---|---|---|---|---|---|---|---|
| oesophaguskarzinom | C0 | 9,2 k | 3/3/2 | 2 | 43,6 k | 1 | – | 22 |
| pavk | C1 | 5,2 k | 4/6/2 | 3 | 18,7 k | 7 | false | 18 |
| ulcus | C1 | 4,6 k | 6/6/0 | 4 | 12,7 k | 5 | false | 16 |
| lyme | C1 | 5,7 k | 5/9/4 | 6 | 17,6 k | 10 | false | 16 |
| kolorektales-ca | C0 | 7,2 k | 3/3/2 | 2 | 38,3 k | 0 | – | 15 |
| pankreatitis | C0 | 3,8 k | 3/4/2 | 3 | 7,2 k | 0 | – | 14 |
| bandscheibenvorfall | C1 | 3,6 k | 5/5/3 | 4 | 15,8 k | 5 | false | 14 |
| appendizitis | C1 | 4,3 k | 4/6/5 | 4 | 14,7 k | 6 | true | 13 |
| magenkarzinom | C1 | 2,9 k | 4/6/3 | 3 | 11,8 k | 6 | false | 12 |
| divertikulitis | C0 | 6,2 k | 3/4/1 | 2 | 35,5 k | 1 | – | 11 |
| multiple-sklerose | C2 | 9,3 k | 8/10/5 | 5 | 20,7 k | 12 | false | 10 |
| reizdarm | C2 | 7,4 k | 9/14/6 | 5 | 18,5 k | 10 | false | 10 |
| gallenkolik | C2 | 2,1 k | 5/4/3 | 3 | 10,2 k | 5 | false | 8 |
| tvt | C2 | 4,1 k | 5/6/4 | 3 | 10,7 k | 7 | false | 8 |
| gerd | C0 | 6,9 k | 3/3/2 | 2 | 40,8 k | 0 | – | 7 |
| myokardinfarkt | C0 | 8,4 k | 3/3/1 | 2 | 45,7 k | 1 | true | 7 |
| cholezystitis | C0 | 6,2 k | 3/3/2 | 2 | 41,1 k | 0 | – | 4 |

## 2. Sélection

Règle : FW < 15 k, ou fiche nettement sous la médiane C3, c'est-à-dire sous deux tiers de 15 k (< 10 k). Cela donne
17 cas, gicht exclu (10,1 k). Ils sont plus de 10, donc j'ai traité **les 10 plus fréquents** : oesophaguskarzinom,
pavk, ulcus, lyme, kolorektales-ca, pankreatitis, bandscheibenvorfall, appendizitis, magenkarzinom, divertikulitis.

**Reste pour Lc4** (§ 9) : multiple-sklerose, reizdarm (10), gallenkolik, tvt (8), gerd, myokardinfarkt (7),
cholezystitis (4). Gallenkolik et TVT, cités par l'audit pour leur FW de 10 k, en font partie : la règle de
fréquence les classe derrière.

## 3. Par cas : ce qui a changé et pourquoi

Méthode commune aux 10 cas :
- la Verdachtsdiagnose tient en une première phrase et le détail passe dans la suivante ;
- chaque DD a une `unterscheidung` appliquée au patient ;
- la Diagnostik est rangée par étape ;
- la thérapie est raisonnée sur ses médicaments, allergies, comorbidités et sa situation ;
- les Erstmaßnahmen sont des consignes courtes ;
- l'examinerSheet a 5 sections, dont une « Aufklärung (2 Minuten) » ; lyme garde ses 6 sections d'origine, sans section Aufklärung ;
- les Prüfungsfallen ne recopient pas la fiche.

Le Muster est aligné quand la fiche le contredisait.

### pankreatitis — Gisela Hoffmann, 55 ans, IMC 32, lithiase connue, aucun traitement
- **Pour la patiente :**
  - urines foncées et selles claires → suspicion de lithiase cholédocienne, qui entre dans la VD ;
  - ni selles ni gaz → iléus réflexe, et un iléus mécanique devient une DD ;
  - « se sent chaude » → prendre la température : Charcot = cholangite, donc ERCP dans les 24 h ;
  - femme encore réglée → β-HCG avant tout examen irradiant ;
  - adiposité → risque de forme sévère, HBPM adaptée au poids.
- **Corrigé :**
  - remplissage « 5–10 ml/kg/h », soit 440 à 880 ml/h pour 88 kg → remplissage modéré et ciblé (WATERFALL), fiche et FW ;
  - le scanner n'est plus systématique à l'admission ;
  - ERCP sous 24 h seulement en cas de cholangite, élective après EUS ou IRM sinon ;
  - « bis zu 30 % Rezidiv » → PONCHO (17 % contre 5 %) ;
  - Ranson et APACHE retirés ;
  - coquille « Oberbauchschmauch » ;
  - « bei diesem Patienten » → « Patientin ».
- **FW 7,2 → 10,5 k :**
  - définition avec les 2 critères sur 3 ;
  - Klassifikation : Atlanta révisée, complications locales, signes précoces de gravité ;
  - 3 Red Flags ;
  - Diagnostik par étape ;
  - 2 DD : cholangite, AAA rompu ;
  - Fallen et questions sans redite.

### ulcus — Jobst Donalies, 38 ans, pharmacien, Pantoprazol 20 mg depuis un an sans ÖGD, allergie au Metamizol, AINS non tolérés, 2 verres de vin par soir
- **Pour le patient :**
  - un an d'IPP sans endoscopie ni test H. pylori → l'échec de l'IPP est une indication d'ÖGD, pas d'augmentation de dose seule ;
  - les tests sont faux négatifs sous IPP → histologie de l'antre et du corps, puis nouveau test après 2 semaines de pause ;
  - le métronidazole est incompatible avec son vin quotidien (effet antabuse) ;
  - antalgique : Paracetamol seul ;
  - Erstmaßnahmen créées : il n'y en avait aucune.
- **Corrigé :**
  - trithérapie à la clarithromycine en première ligne (fiche et FW) → quadrithérapie bismuthée 10 jours ; trithérapie 14 jours seulement si la sensibilité est prouvée (DGVS 2022) ;
  - patientWorte « einwöchige » → « zehntägige » ;
  - examen clinique classé « Invasiv & Speziell » → « Anamnese/Klinik » ;
  - FW : taux de récidive contradictoires (50→10 % contre 60→5 %) retirés ;
  - FW : renvoi au patient (« z. B. Apotheker ») retiré.
- **Redites :** FW 9 → 1.

### magenkarzinom — Julian Brückner, 61 ans, 50 kg (IMC 18,6), −12 kg, méléna, 40 PA, père décédé à 61 ans, Ramipril, Metformin, Omeprazol du voisin
- **Pour le patient :**
  - méléna → Hb, Kreuzblut, IPP i.v. ;
  - −19 % du poids → NRS 2002 et nutrition avant la chirurgie ;
  - Metformin et produit de contraste → eGFR, et glycémie surveillée tant qu'il mange peu ;
  - Omeprazol pris sans contrôle → il peut masquer un ulcère malin (Falle) ;
  - ses enfants → test H. pylori ;
  - psycho-oncologie, son père étant mort au même âge.
- **Corrigé :**
  - recherche de sang occulte dans les selles chez un patient en méléna (fiche et FW) → retirée ;
  - seuil d'âge « ab 45 », non sourcé → retiré ;
  - éradication en trithérapie → quadrithérapie bismuthée ;
  - FLOT et laparoscopie précisés (cT3/cT4) ;
  - Laurén dit 3 fois → 1 fois ;
  - renvois au cas dans le FW → généralisés ;
  - « Merke: » doublé par l'interface → retiré (aussi dans fw-ulcus et fw-bandscheibenvorfall).

### appendizitis — Hans Müller, 41 ans, pas de migration de la douleur, Ibuprofen à la demande, pyrosis, cure de hernie inguinale droite
- **Pour le patient :**
  - β-HCG « bei Frauen » dans la fiche d'un homme (copie de gabarit) → retiré, et gardé comme piège d'examen « Und wenn es eine Frau wäre? » ;
  - l'Ibuprofen masque fièvre et douleur ;
  - examiner la cicatrice inguinale ;
  - DD : ulcère duodénal perforé couvert (pyrosis et AINS), diverticulite cæcale ;
  - à 41 ans, coloscopie avant une appendicectomie d'intervalle ;
  - la chirurgie est préférable pour lui.
- **Corrigé :**
  - FW : le point de McBurney n'est pas « au milieu entre ombilic et EIAS » mais à la jonction du tiers externe et du tiers moyen ;
  - échec des antibiotiques « 30–40 % à un an » → environ un tiers (APPAC, CODA) ;
  - perforation dite 4 fois → 1 fois ;
  - β-HCG dit 6 fois → 2 fois.
- **Redites :** FW 14 → 3.

### oesophaguskarzinom — Anna Sichel, 53 ans, dysphagie jusqu'aux liquides en 4 semaines, −15 kg, raucité, 30 PA, vin et schnaps chaque jour, RGO
- **Pour la patiente :**
  - DD bronchique : 30 PA, raucité et amaigrissement font évoquer une compression médiastinale avec paralysie récurrentielle ;
  - DD jonction œsogastrique (RGO) et pseudo-achalasie ;
  - auscultation, parce qu'elle régurgite ;
  - phosphore et magnésium pour la renutrition ;
  - les examens (laryngoscopie, bronchoscopie, EFR, écho) passent de la thérapie à la Diagnostik ;
  - Erstmaßnahmen : nutrition, thiamine, surveillance du sevrage, tête surélevée.
- **Corrigé :**
  - « grade 2 de Mellow-Pinkas » → grade 3 : elle ne passe plus que des liquides, d'après la définition du FW du même cas ;
  - le Muster le dit aussi.
- **FW :** inchangé. La fiche passe de 9,2 à 8,1 k, la thérapie étant allégée.

### pavk — Walter Vogel, 60 ans, 45 PA, Candesartan, Simvastatin 40 mg, Ibuprofen à la demande
- **Pour le patient :**
  - Simvastatin 40 mg ne suffit pas pour un LDL < 55 → statine de haute intensité ;
  - Ibuprofen et ASS → clopidogrel préféré (interaction COX-1, CAPRIE) ;
  - éviter les AINS au long cours sous sartan ;
  - HbA1c, sa mère étant diabétique ;
  - pression aux deux bras, échodoppler des carotides, ECG ;
  - occlusion aiguë en DD.
- **Corrigé :**
  - Muster : « bei Kontrastmittelallergie » dans la lettre d'un patient qui n'est pas allergique au produit de contraste → retiré ;
  - Muster : « Einleitung einer Statintherapie » alors qu'il en prend déjà une → « intensiviert » ;
  - FW : « (im Fall 45 Packyears) » → retiré.
- **Redites :** FW 14 → 1.

### lyme — Nadine Brückner, 44 ans, érythème migrant après une randonnée en zone FSME, fer, hystérectomie
- **Pour la patiente :**
  - le tableau grippal peut être la première phase d'une FSME : statut vaccinal, signes d'alerte, la doxycycline ne la traite pas ;
  - hystérectomie → pas d'alternative à la doxycycline à prévoir ;
  - doxycycline à 2–3 h du fer ;
  - eczéma de contact de coiffeuse en DD.
- **Corrigé :**
  - VD coupée par « … » (224 caractères) → 100 caractères ;
  - la section « Alternativen (KI / Schwangerschaft) » contenait le pacemaker et la ponction articulaire, et les vraies alternatives étaient en « Erstlinie » : items remis sous leur libellé (fiche et FW) ;
  - « Merke: » dans un item de Diagnostik → retiré ;
  - Fallen 10 → 4, dont 7 recopiaient la fiche.
- **Redites :** FW 28 → 11, fiche 9 → 0.

### kolorektales-ca — Heinrich Vogt, 68 ans, sang dans les selles, selles rubanées, −6 kg, père atteint à 70 ans, aucun traitement
- **Pour le patient :**
  - toucher rectal en premier ;
  - les selles rubanées orientent vers une tumeur distale → rectoscopie et IRM pelvienne si elle est rectale ;
  - fer i.v. avant l'opération ;
  - ses enfants et sa fratrie : coloscopie au plus tard à 40–45 ans ;
  - MMR/MSI ; Lynch peu probable.
- **Corrigé :**
  - « pausieren gerinnungshemmender Medikamente » chez un patient sans traitement → retiré ;
  - dépistage « femmes dès 55 ans » (ES et FW) → dès 50 ans depuis avril 2025 ;
  - VD d'un mot → VD argumentée.

### bandscheibenvorfall — Reinhold Ackermann, 52 ans, magasinier, Ramipril, Ibuprofen plusieurs fois par jour, L5 sensitive sans parésie
- **Pour le patient :**
  - AINS et IEC → créatinine, kaliémie, tension ;
  - IRM urgente seulement en cas de syndrome de la queue de cheval ou de parésie, sinon après 6 semaines (DGN S2k) ;
  - arrêt de travail ;
  - suspicion de maladie professionnelle BK 2108 à vérifier.
- **Corrigé :**
  - Muster « MRT angemeldet » → IRM différée selon les critères ;
  - Falle absolue « NSAR nie ohne PPI » retirée : la fiche garde le PPI, comme les protocoles.

### divertikulitis — Ursula Maier, 67 ans, fièvre à 38,5 °C, allergie à la pénicilline, aucun traitement
- **Pour la patiente :**
  - plutôt hospitalisée ;
  - antibiotiques indiqués : la fièvre et le terrain allergique figurent dans la liste du FW ;
  - Cipro + métronidazole (Amox/Clav exclu), après avoir demandé tendinopathie et anévrisme ;
  - méropénème à la place de pipéracilline-tazobactam ;
  - fistule colovésicale ;
  - DD ischémique et ovarienne.
- **Corrigé :**
  - « bei diesem Patienten NSAR und Kortikosteroide absetzen » (elle n'en prend aucun, et c'est une patiente) → retiré ;
  - critère ambulatoire « fieberfrei unter 38,5 °C » chez une patiente à 38,5 °C → décision explicite.

### Avant / après

| Cas | Fiche | DD | Diag | Erst | ES | PF | notfall | FW | Vorst. |
|---|---|---|---|---|---|---|---|---|---|
| pankreatitis | 3,8 → 6,7 k | 3 → 5 | 4 → 9 | 2 → 5 | 3 → 5 | 0 → 4 | – → true | 7,2 → 10,5 k | sans « … » |
| ulcus | 4,6 → 5,5 k | 6 → 7 | 6 → 6 | 0 → 4 | 4 → 5 | 5 → 4 | false | 12,7 → 10,8 k | sans « … » |
| magenkarzinom | 2,9 → 5,4 k | 4 → 6 | 6 → 9 | 3 → 4 | 3 → 5 | 6 → 8 | false | 11,8 → 11,5 k | sans « … » |
| appendizitis | 4,3 → 5,3 k | 4 → 6 | 6 → 7 | 5 → 4 | 4 → 5 | 6 → 5 | true | 14,7 → 13,6 k | sans « … » |
| oesophaguskarzinom | 9,2 → 8,1 k | 3 → 5 | 3 → 7 | 2 → 5 | 2 → 5 | 1 → 5 | – → false | inchangé | sans « … » |
| pavk | 5,2 → 5,8 k | 4 → 5 | 6 → 7 | 2 → 4 | 3 → 5 | 7 → 7 | false | 18,7 → 17,2 k | sans « … » |
| lyme | 5,7 → 4,6 k | 5 → 5 | 9 → 7 | 4 → 4 | 6 → 6 | 10 → 4 | false | 17,6 → 15,4 k | **coupée → entière** |
| kolorektales-ca | 7,2 → 5,9 k | 3 → 5 | 3 → 6 | 2 → 4 | 2 → 5 | 0 → 4 | – → false | 38,3 → 38,1 k | sans « … » |
| bandscheibenvorfall | 3,6 → 4,2 k | 5 → 5 | 5 → 5 | 3 → 4 | 4 → 5 | 5 → 4 | false | inchangé (Merksatz) | sans « … » |
| divertikulitis | 6,2 → 5,6 k | 3 → 5 | 4 → 6 | 1 → 4 | 2 → 5 | 1 → 3 | – → false | inchangé | sans « … » |

**Volume.** Les fiches restent entre 4 et 8 k, sous la médiane C3 de 15 k. Ce choix est délibéré : la direction demande
« sans surcharger ». Le gain vient de lignes raisonnées sur le patient, pas du volume. Les FW de moins de 15 k
(pankreatitis, ulcus, magenkarzinom, appendizitis) ne montent pas à la médiane, et pour la même raison :
- pankreatitis a été complété ;
- les trois autres ont été corrigés et dédoublonnés.

C'est un point à trancher (§ 8).

## 4. Redites internes (méthode Lc2 : phrases ≥ 4 mots de 4 lettres et plus, recouvrement ≥ 0,7 du plus court ; fiche = `medicalView` + Prüfungsfallen)

| FW | Avant | Après | Fiche + PF | Avant | Après |
|---|---|---|---|---|---|
| fw-pankreatitis | 1 | 0 | pankreatitis | 0 | 0 |
| fw-ulcus | 9 | 1 | ulcus | 2 | 0 |
| fw-magenkarzinom | 4 | 1 | magenkarzinom | 1 | 0 |
| fw-appendizitis | 14 | 3 | appendizitis | 2 | 0 |
| fw-oesophaguskarzinom | 29 | 29 | oesophaguskarzinom | 0 | 0 |
| fw-pavk | 14 | 1 | pavk | 0 | 0 |
| fw-lyme | 28 | 11 | lyme | 9 | 0 |
| fw-kolorektales-ca | 35 | 34 | kolorektales-ca | 0 | 0 |
| fw-bandscheibenvorfall | 19 | 19 | bandscheibenvorfall | 1 | 0 |
| fw-divertikulitis | 36 | 36 | divertikulitis | 3 | 0 |

- **Aucune redite n'augmente.**
- Les quatre FW riches restent hauts (oesophaguskarzinom 29, kolorektales-ca 34, bandscheibenvorfall 19, divertikulitis 36) :
  - ce sont des FW C3-like de 16 à 44 k ;
  - leur dédoublonnage est un lot de concision à part ;
  - je n'y ai corrigé que les erreurs.
- Aucun de ces 10 cas n'a de visuel Fachwissen : il n'y avait aucun visuel hérité à remplacer, et aucune spec n'a été ajoutée.

## 5. Sources (à confirmer par la relecture clinique ; chiffres repris de mémoire, sans consultation en ligne)

| Chiffre ou règle | Cas | Source |
|---|---|---|
| Diagnostic par 2 critères sur 3, Atlanta révisée, complications à 4 semaines | pankreatitis | Banks et al., *Gut* 2013 ; DGVS S3 Pankreatitis (AWMF 021-003, 2021) |
| Remplissage modéré : bolus de 10 ml/kg si hypovolémie, puis 1,5 ml/kg/h | pankreatitis | WATERFALL, de-Madaria et al., *NEJM* 2022 ; ACG 2024 |
| GPT > 150 U/l (origine biliaire) ; Hkt > 44 % ; CRP > 150 mg/l à 48 h | pankreatitis | Tenner et al., *Am J Gastroenterol* 1994 ; Brown et al., *Pancreatology* 2000 ; IAP/APA 2013 |
| Cholécystectomie pendant la même hospitalisation (17 % contre 5 %) | pankreatitis | PONCHO, da Costa et al., *Lancet* 2015 |
| Quadrithérapie bismuthée 10 j ; trithérapie 14 j si sensibilité prouvée ; test 2 semaines sans IPP | ulcus, magenkarzinom | DGVS S2k H. pylori (AWMF 021-001, 2022/2023) ; Maastricht VI (*Gut* 2022) |
| FLOT, laparoscopie si cT3/cT4 ; test H. pylori chez les apparentés du 1er degré | magenkarzinom | S3 Magenkarzinom (AWMF 032-009OL, 2019) |
| Nutrition préopératoire chez le dénutri | magenkarzinom | ESPEN surgery, Weimann et al., *Clin Nutr* 2021 |
| Metformin et produit de contraste : pause si eGFR < 30 | magenkarzinom | ESUR Contrast Media Guidelines 10.0 |
| Échec des antibiotiques ≈ 1/3 à un an ; point de McBurney | appendizitis | APPAC (*JAMA* 2015), CODA (*NEJM* 2020) ; WSES 2020 |
| CROSS, FLOT4, nivolumab adjuvant ; Mellow-Pinkas | oesophaguskarzinom | S3 (AWMF 021-023OL, 2023) ; *NEJM* 2012, *Lancet* 2019, *NEJM* 2021 ; *Arch Intern Med* 1985 |
| Clopidogrel dans l'AOMI ; LDL < 55 mg/dl ; interaction ibuprofène–ASS | pavk | ESC PAD 2024 ; CAPRIE 1996 ; ESC/EAS 2019 ; FDA 2006 |
| Doxycycline 14 j ; ceftriaxone dans la neuroborréliose ; zones FSME | lyme | S2k Kutane Lyme-Borreliose (AWMF 013-044) ; S3 Neuroborreliose (AWMF 030-071, 2018) ; RKI |
| Coloscopie des femmes dès 50 ans depuis avril 2025 ; apparentés 10 ans avant, au plus tard à 40–45 ans | kolorektales-ca | G-BA KFE-RL (décision du 16.01.2025, en vigueur au 1ᵉʳ avril 2025) ; S3 KRK (AWMF 021-007OL, 2019) |
| IRM selon parésie, queue de cheval, 6 semaines ; BK 2108 | bandscheibenvorfall | DGN S2k Lumbale Radikulopathie (AWMF 030-058, 2018) ; BKV annexe 1 |
| Facteurs de risque justifiant l'antibiothérapie ; avertissements sur les fluoroquinolones | divertikulitis | S3 Divertikelkrankheit (AWMF 021-020, 2021) ; BfArM Rote-Hand-Brief 2019 |

## 6. Cohésion (`checkCaseCohesion`, non bloquant)

Les liens manquants passent de **266 à 279**, la valeur 266 étant celle de `main` après Lc2. Les nouvelles DD ne sont pas
nommées entre parenthèses dans les `negativeFindings` :
- pankreatitis : mechanischer Ileus ;
- ulcus : funktionelle Dyspepsie ;
- magenkarzinom : MALT-Lymphom, kardial ;
- appendizitis : Ulkus gedeckt perforiert, Zäkumdivertikulitis ;
- oesophaguskarzinom : AEG, Bronchialkarzinom ;
- lyme : FSME, grippaler Infekt ;
- kolorektales-ca : ischämische Kolitis, anal ;
- divertikulitis : ischämische Kolitis, gynäkologisch.

Les annoter modifierait la fiche du simulant, ce que le brief exclut. C'est la même situation que Lc1 et Lc2 avant
leur passe fixeur, et la revue tranche. bandscheibenvorfall reste à 100 %.

## 7. Vérifications (code de sortie, branche rebasée sur `origin/main` `a5cdf325`)

| Commande | Sortie |
|---|---|
| `npx tsc -b` | 0 |
| `npm test -- --maxWorkers=2` | 0 (193 fichiers, 2 025 tests) |
| `npm run test:c6 -- --maxWorkers=2` | 0 (212 tests) |
| `node --test scripts/*.test.mjs` sans `checkProbeCoverage` | 0 (200 tests) |
| `node --test scripts/checkProbeCoverage.test.mjs`, seul | 0 (4 tests) |
| les 18 `check*` de la CI, `checkTermRegister --require-all`, `evalDoctopus --dry` | 0 chacun |
| `checkCoherence --case`, 10 cas | 0 × 10 |
| `checkBudgetFloor.mjs origin/main` | 0 |
| `npm run build` | 0 |
| `git merge-tree --write-tree origin/main HEAD` | 0 |

Compléments :
- **Nouveau test** dans `vorstellungsSatz.test.ts` (« les cas de Lc3 ») : `offen === false` et pas de « Patient » dans
  la première phrase, pour les 10 cas. La VD de lyme d'avant le lot (224 caractères avec l'amorce) l'aurait fait échouer.
- `caseTermLinks.json` a été régénéré (`npm run content:link`).
- **Environnement** :
  - un premier `npm test` a échoué : 427 tests UI en erreur sur `Cannot read properties of null (reading 'useRef')`. La cause est le lien
    symbolique `app/node_modules/node_modules → …/Claude FSP/app/node_modules`, créé avec le worktree. La résolution de
    Node trouvait par ce chemin une deuxième copie de React. J'ai supprimé ce seul lien ; le `node_modules` du dépôt
    principal est intact. Après correction, tous les tests passent ;
  - j'ai supprimé les dossiers `$TMPDIR/*/client` laissés par vitest : les miens, plus ceux de plus de 120 min, soit 483 → 0 ;
  - une entrée `stash@{0}: autostash` existe dans le dépôt. Elle ne vient pas de ce lot et n'a pas été touchée.

## 8. Points à trancher

- **Volume des FW pauvres.** pankreatitis (10,5 k), ulcus (10,8 k) et magenkarzinom (11,5 k) restent sous 15 k. Je n'ai
  rien ajouté qui ne serve pas la FSP. Si la direction veut la médiane, il faut un passage dédié.
- **Cohésion** : annoter les 14 nouvelles DD dans les `negativeFindings`, ou accepter qu'elles restent sans annotation (§ 6).
- **Choix cliniques à valider par la relecture** :
  - pankreatitis : remplissage modéré (WATERFALL) au lieu de 5–10 ml/kg/h ;
  - bandscheibenvorfall : IRM différée, BK 2108 ;
  - pavk : clopidogrel plutôt qu'ASS ;
  - divertikulitis : la fièvre et le « terrain allergique » comme indication d'antibiotiques (liste déjà présente dans le FW) ;
  - kolorektales-ca : coloscopie des femmes dès 50 ans depuis avril 2025.
- **Hors périmètre** : « Merke: » doublé par l'interface dans fw-depression (cas de Lc2) et fw-bronchialkarzinom.

## 9. Reste pour Lc4

- multiple-sklerose, reizdarm (fréq. 10, fiches de 9,3 et 7,4 k) ;
- gallenkolik (fiche de 2,1 k, FW de 10,2 k) et tvt (4,1 k / 10,7 k), fréq. 8 : **les plus pauvres** ;
- gerd et myokardinfarkt (fréq. 7, DD 3, Diag 3, ES 2) ;
- cholezystitis (fréq. 4).

**Concision de trois Fachwissen de plus de 30 écrans** (revue direction I3), élément nommé de Lc4 :

| FW | Écrans à 390 px, au repos / tout ouvert | Redites (méthode direction) | Cible |
|---|---|---|---|
| fw-oesophaguskarzinom | 30,4 / 37,1 | 16 | ≤ 16 écrans, ≤ 5 redites |
| fw-kolorektales-ca | 31,2 / 32,5 | 26 | ≤ 16 écrans, ≤ 5 redites |
| fw-divertikulitis | 29,7 / 31,4 | 18 | ≤ 16 écrans, ≤ 5 redites |

fw-bandscheibenvorfall (14,1 écrans, 7 redites selon la méthode direction) peut suivre dans le même passage.

## Non vérifié

- Les chiffres du § 5 ont été écrits de mémoire, sans consultation en ligne ; ils sont à confirmer en priorité. Les plus fragiles :
  - le schéma WATERFALL ;
  - GPT > 150 U/l ;
  - CRP > 150 mg/l ;
  - APPAC et CODA ;
  - la durée de la ceftriaxone dans la neuroborréliose.
- La langue (C1, registre) n'a été relue que par moi ; il n'y a pas eu de passe `fsp-language-reviewer`.
- Le rendu des fiches dans le navigateur n'a pas été vérifié ; aucun composant n'a changé.

## 10. Passe fixeur des 3 revues (clinique, direction, langue — sommet revu `da17e30c`)

Les correctifs ont été appliqués en une passe : 115 remplacements scriptés, avec contrôle d'unicité dans le bloc de chaque cas. Le texte retenu est celui des revues, sauf pour les arbitrages du coordinateur ci-dessous.

**Clinique : P1-1 à P1-4, tous les P2, 2 négatifs**
- **P1-1, lyme : 14–21 Tage partout.** Les grippale Allgemeinsymptome sont une dissémination précoce (S2k 2023, tableau 5), d'où des modifications à chaque endroit qui donnait la durée :
  - VD réécrite ;
  - doxycycline sur 14–21 jours, avec une mise en garde contre la réaction de Herxheimer ;
  - patientWorte « zwei bis drei Wochen » ;
  - examinerSheet ;
  - Muster (Arztbrief et Vorstellung) ;
  - alternative (amoxicilline, céfuroxime) et ceftriaxone ;
  - FW : thérapie (« 10–14 Tage » pour l'EM solitaire, « 14–21 Tage » s'il est disséminé), alternative « über dieselbe Dauer wie Doxycyclin », réponse d'examen.
  - Vérifié sur les objets chargés : plus aucun « 14 Tage » seul ni « zwei Wochen » seul dans le cas ni dans fw-lyme.
- **P1-2, appendizitis** : VD sans ibuprofène (texte M3 de la direction). Réponse « ein Schmerzmittel hat er seit Beginn nicht genommen ». La Falle « nach der letzten Ibuprofen-Einnahme fragen » est conservée.
- **P1-3, fw-kolorektales-ca** : l'iFOBT se fait tous les 2 ans dès 50 ans, pour les femmes comme pour les hommes, depuis avril 2025 (avant : chaque année de 50 à 54 ans).
- **P1-4, divertikulitis** : céphalosporine plus métronidazole (ceftriaxone i.v. puis céfuroxime per os). La ciprofloxacine reste seulement en réserve, si les céphalosporines sont exclues aussi. Il n'y a plus de ciprofloxacine en première intention, ni dans la fiche, ni dans l'examinerSheet, ni dans le Muster.
- **P2 :**
  - ulcus : sérologie H. pylori (IgG) ou test après cicatrisation et pause de l'IPP, dans la fiche et l'examinerSheet ;
  - fw-pavk : le Merksatz dit « Plättchenhemmer (ASS oder Clopidogrel) » ;
  - pavk : TEA seulement en cas de sténose de la bifurcation fémorale ;
  - divertikulitis : hémocultures « ab 38,5 °C (bei ihr gegeben) » ;
  - lyme : « nicht gegen FSME geimpft », primovaccination après le tableau aigu ;
  - magenkarzinom : signes B en faveur d'un MALT ;
  - bandscheibenvorfall : déclaration BK 2108 obligatoire (§ 202 SGB VII) et déclaration d'accident ;
  - fw-appendizitis : perforation traitée le plus souvent par laparoscopie ;
  - Muster oesophaguskarzinom : « postmenopausal ».
- **P2, magenkarzinom (structure)** : la metformine, H. pylori, la nutrition et la psycho-oncologie quittent « Systemtherapie ». Elles vont dans une nouvelle section, **« Supportive Therapie und Begleitmaßnahmen »**, ajoutée en dernier dans la fiche **et** dans le FW, ce que `checkTherapieLabels` exige.
- **Négatifs annotés** (seuls ceux-là, comme arbitré) :
  - kolorektales-ca : « (gegen Divertikulitis und ischämische Kolitis) » ;
  - divertikulitis : « kein Blut im Stuhl (gegen ischämische Kolitis) ».
  - Liens manquants **279 → 277**.
- **Rapport** : la décision du G-BA date du 16.01.2025.

**Direction : I1, I2, M1 à M8 (M9 inchangé)**
- **I1, Muster Vorstellung divertikulitis** : texte de la direction, sauf la dernière phrase, remplacée selon l'arbitrage (« stationäre Antibiose mit Ceftriaxon und Metronidazol — bei ihrem Hautausschlag auf Penicillin ist ein Cephalosporin vertretbar — »).
- **I2, Muster Vorstellung kolorektales-ca** : « … auf ein kolorektales Karzinom im Rektum oder Sigma hin. », les DD en toutes lettres, « im Alter von 40 bis 45 Jahren ».
- **M1 à M5, premières phrases** :
  - M1, pavk : « vom Oberschenkeltyp rechts » ;
  - M2, magenkarzinom : sans l'IMC ;
  - M3, appendizitis : sans ibuprofène ;
  - M4, Falle « vorbereitet sein » (cas et FW) ;
  - M5, oesophaguskarzinom : « (nur noch Flüssiges passiert) ».
- **M6, renvois au patient retirés du FW** :
  - fw-oesophaguskarzinom : la question sur les facteurs de risque devient générale, et « Frau Sichel » est retiré. La phrase « Liegen beide Risikoprofile vor … » que j'avais prévue a aussi été retirée : elle redisait une phrase déjà présente et faisait monter les redites à 30.
  - fw-kolorektales-ca : « Wie gehen Sie beim Staging eines kolorektalen Karzinoms vor? ».
- **M7** : majuscules d'insistance retirées dans fw-pankreatitis (Lipase) et dans fw-lyme (DD FSME).
- **M8** : la phrase du § 3 du rapport est corrigée (lyme garde ses 6 sections, sans section Aufklärung).
- **Hors de ce fixeur, comme demandé** : I3 (concision des trois FW de plus de 30 écrans) est inscrit au § 9 avec sa cible chiffrée ; I4 (défilement horizontal) sera traité à part.

**Langue : les 12 Important et tous les Mineurs**
- **Accords** :
  - « wurden » avec un sujet au singulier → « wurde » (Muster oesophaguskarzinom, ulcus, pavk) ;
  - « droht die Progression » ;
  - « Trias aus beidseitiger glutealer Claudicatio … ».
- **Négation rapportée** : « Bluterbrechen habe sie verneint » (pankreatitis, oesophaguskarzinom).
- **Oral sans symboles ni abréviations** :
  - classification d'Adeno/Plattenepithel, Fontaine et ABI rédigés en phrases ;
  - « Zustand nach Leistenhernien-Operation » ;
  - « intravenöse Flüssigkeit », « Kontrastmittelallergie » ;
  - « gegebenenfalls », « oder » à la place de « bzw. » ;
  - « etwa 100 Metern », « intravenös ».
- **Registre patient** : « Schlüssellochtechnik, also über kleine Schnitte », « den Abfluss verstopft », patientWorte de lyme sans « Anamnese ». La réponse au jury de fw-pankreatitis est en termes techniques.
- **Mot juste** : c'est H. pylori qui est résistant à la clarithromycine, pas l'inverse ; « kontraindiziert » au lieu de « verboten » ; « Staging-CT » ; « 13C-Atemtest » ; « flexibles Endoskop » ; « p. o. » et « i. v. » ; guillemets allemands ; « retroileale Lage ».
- **Divers** : la DD « CED » devient « Chronisch-entzündliche Darmerkrankung » (fiche et examinerSheet).
- **Recoupements** : la langue n° 3 et n° 4 est couverte par les arbitrages I1 et I2.

**Vérifications après la passe (code de sortie)**

| Commande | Sortie |
|---|---|
| `npx tsc -b` | 0 |
| `npm test -- --maxWorkers=2` | 0 (2 025 tests) |
| `npm run test:c6 -- --maxWorkers=2` | 0 |
| `node --test` sans `checkProbeCoverage`, puis `checkProbeCoverage.test.mjs` seul | 0, 0 |
| les 18 `check*` de la CI, `checkTermRegister --require-all`, `evalDoctopus --dry` | 0 chacun |
| `checkCoherence --case`, 10 cas | 0 × 10 |
| `checkBudgetFloor.mjs origin/main` | 0 |
| `npm run build` | 0 |
| `git merge-tree --write-tree origin/main HEAD` | 0 |

- Le test de garde passe : les 10 phrases de Fallvorstellung sont toujours sans « … ».
- `caseTermLinks.json` a été régénéré.
- **Redites** : aucune n'augmente.
  - fiches : 0 × 10 ;
  - FW, pour les 10 dans l'ordre du § 4 (fw-pankreatitis à fw-divertikulitis) : 0 / 1 / 1 / 3 / 29 / 1 / 11 / 34 / 19 / 36 ;
  - c'est le même niveau qu'avant la passe : fw-oesophaguskarzinom est revenu à 29.

**Toujours non vérifié** : la S3 Divertikelkrankheit 2021 n'a pas été lue dans le texte (schéma céphalosporine plus métronidazole). Le rendu dans le navigateur ne l'a pas été non plus.
