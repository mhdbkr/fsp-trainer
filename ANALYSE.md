# ANALYSE.md — Lecture profonde des ressources FSP (PHASE 0)

> Document de synthèse produit **avant** toute ligne de code, à valider avant de démarrer le prototype.
> Objectif : comprendre la structure réelle de l'examen, consolider le contenu tombable, et proposer des fonctionnalités.
>
> **Interface = français · Termes médicaux = allemand** (convention retenue pour toute l'app).

---

## 0. Ce qui a été lu (et ce que chaque source apporte à l'app)

| Source | Nature | Ce qu'on en extrait pour l'app |
|---|---|---|
| **Livre Rogoveanu** — *Fachsprachprüfung erfolgreich bestehen!* (636 p.) | Manuel de référence | Structure de l'examen · schéma Anamnese (Kap. 2) · tactiques de communication (Kap. 2.4) · Arztbrief Konjunktiv I / Passiv (Kap. 3) · Fallvorstellung (Kap. 4) · **16 Aufklärungen (Kap. 5)** · Fachwissen par pathologie (Kap. 6–19) · 5 simulations complètes (Kap. 20) · Fachterminologie (Kap. 21) · encarts **« LittleDoc meint »** et **« Cave!/Tipp »** = pièges d'examen |
| **4 protocoles** (`00 FSP Freiburg/Karlsruhe/Reutlingen/Stuttgart.md`) | Retours réels de candidats | **580 comptes-rendus** datés, fiches patient pré-remplies, vraies questions patient/examinateur, Fachbegriffe par cas, tendances par centre |
| **`FSP Stutgart prot.pdf`** (83 p.) | Protocoles Stuttgart complémentaires | Cas supplémentaires + questions Arzt-Arzt |
| **Templates école ODAK** (`Anamnese - V4`, `Arztbrief-Vorstellung`) | Modèles pédagogiques | Trame d'anamnèse (sections I→XII) · trame Arztbrief/Fallvorstellung avec Redemittel prêts à l'emploi (Konjunktiv I) |
| **4 ODAK spécialité** (Kardiologie, Urologie, Hämatologie, Schilddrüse) | Fiches structurées | Fachwissen : Definition / Klinik / DD / Diagnostik (non-invasif→invasif) / Therapie (konservativ/interventionell/chirurgisch) |
| **12 PDF cliniques** (Gastro, GI-Blutung, Pankreatitis, Cholezystitis, Divertikulitis, Kolorektales Ca, Pneumo, Asthma, Ortho, Handgelenkfraktur, Gicht, GDUK) | Fiches pathologie | Matière des Fachwissen et des fiches de cas |
| **`Fachbegriffe_FSP.csv`** (2 249 lignes, déjà nettoyé) | Glossaire | **Import direct** : Terme · Traduction FR · Spécialité · État · Centres · Prononciation |
| **`anki_FSP.txt`** (2 268 cartes TSV, `#html:true`) | Deck Anki brut | Complément du CSV : audio `[sound:…]`, image, **définition détaillée allemande** (champ 6), indice mnémo à nettoyer dans le champ 0 |

> ⚠️ **Aucun fichier illisible.** Les 24 PDF ont été extraits (PyMuPDF). Les 3 PDF « scannés » de l'école (Freiburg/Karlsruhe/Reutlingen/Stuttgart *Anamnesebogen*) sont pauvres en texte (261–1030 car.) : ce sont des formulaires-images. Le contenu utile est de toute façon couvert par le template ODAK V4. À signaler si tu veux qu'on en fasse l'OCR image plus tard.

---

## 1. Structure exacte de l'examen

La FSP dure **~60 min, en 3 unités de ~20 min**. Le candidat est **médecin** ; **un examinateur joue le patient**, les autres observent. (Dans notre binôme : Mehdi = Arzt, l'épouse = Patientin jouant depuis la fiche patient — et rôles inversés pour alterner.)

| # | Partie | Durée | Rôles | Attendu |
|---|---|---|---|---|
| **1** | **Anamnese** (Arzt-Patienten-Gespräch) | ~20 min | Candidat = Arzt / Examinateur = Patient | Mener l'entretien d'admission complet, **sans Fachchinesisch** (registre patient), prendre des notes manuscrites, énoncer une **Verdachtsdiagnose** au patient |
| **2** | **Dokumentation** (Arztbrief) | ~20 min | Candidat seul | Rédiger un Arztbrief à un collègue **à partir des seules notes** : anamnèse en **Konjunktiv I**, mesures diagnostiques/thérapeutiques en **Passiv**, formules d'ouverture/clôture formelles |
| **3** | **Fallvorstellung** (Arzt-Arzt-Gespräch) | ~20 min | Candidat = jeune médecin / Examinateurs = Ober-/Chefarzt | Présenter le cas **en Fachsprache**, structure AZ/EZ → anamnèse → VD/DD → Diagnostik → Therapie → Prognose ; puis **répondre aux questions** des examinateurs et **clarifier des Fachbegriffe** |

**Points structurants tirés du livre :**
- **Un seul squelette de notes** (prises pendant l'Anamnese) alimente **à la fois** le Arztbrief ET la Fallvorstellung → le livre recommande explicitement de **s'entraîner à la Fallvorstellung d'abord** (sur les notes), puis d'écrire le Arztbrief. *(Design app : notes = source unique, deux sorties.)*
- **Aufklärung à la demande** : à tout moment les examinateurs peuvent interrompre (« *Klären Sie den Patienten über eine Gastroskopie auf* ») → doit être disponible en surcouche pendant la simulation.
- **Taux d'échec ~44 %** : l'enjeu est la **langue + communication**, pas le savoir médical pur.

### 1.1 Schéma de l'Anamnese (les 6 axes de l'app dérivent de là)

**Allgemeinanamnese** (ordre canonique du livre + template ODAK V4) :
1. **Gesprächsbeginn** — se présenter + demander le **Einverständnis** (gérer le refus)
2. **Personalia** — Name (buchstabieren), Alter/Geburtsdatum, Größe, Gewicht, Beruf, Hausarzt
3. **Aktuelle Anamnese** — motif, `Seit wann`, description
4. **Vegetative Anamnese** — Fieber/Schüttelfrost/Nachtschweiß, Gewicht, Appetit, Stuhl/Miktion, Schlaf, Psyche/Stress
5. **Vorerkrankungen / Voroperationen**
6. **Medikamente** (Dosierung, 0-0-0)
7. **Allergien / Unverträglichkeiten** (ne pas oublier les **Medikamentenallergien**)
8. **Noxen** — Tabak (**py = paquets-années**), Alkohol (« *Konsum* », pas « *Abusus* »), Drogen
9. **Familienanamnese**
10. **Sozialanamnese** — Familienstand, Kinder, Wohnung/Etage/Aufzug, Haustiere, Beruf
11. **Schlussformeln** — Schlussfrage → vorläufige Einschätzung (VD) → erste Maßnahme → Verabschiedung

**Spezielle Anamnese** (déclenchée par le motif — nourrit les *sous-guides de spécialité*) :
- **Schmerzanalyse (OPQRST-like)** : Ort · Charakter (dumpf/stechend/kolikartig…) · Intensität (1–10) · Ausstrahlung (in + **Akk.**) · Dauer/Verlauf · Einflussfaktoren · Begleitbeschwerden. *(« Schmerzen in + Dativ », « Ausstrahlung in + Akkusativ » = pièges de grammaire signalés.)*
- Batteries de questions spécifiques : **Kardiologie, Pneumologie, Gastroenterologie, Nephrologie, Neurologie, Gynäkologie, Sexual-, Haut-, Orthopädie (DMS!), Hämatologie, Onkologie, Infektiologie, Psychiatrie** (chaque bloc avec ses Risikofaktoren).

**Notfall-Handlung** : après l'anamnèse actuelle → rassurer le patient → parler aux examinateurs → demander à poursuivre. Urgences fréquentes en examen : **Myokardinfarkt, Lungenembolie, Schlaganfall, obere GI-Blutung, Hämorrhagie** (+ Suizidalität : reste stationnaire mais Rücksprache *après* l'anamnèse).

### 1.2 Tactiques de communication (Kap. 2.4 — mini-guide dédié)

Situations-types + parades (répliques modèles à intégrer comme « guide communication » et comme **questions patient** en simulation) :
1. Patient **ohnmächtig / bewusstlos**
2. Patient **sans Krankheitseinsicht** (orientation Ort/Zeit/Person/Situation)
3. Patient **refuse de coopérer** (veut l'Oberarzt)
4. Patient **parle mal** : trop vite / trop lent / trop bas / **dialecte** / interrompt / trop bavard
5. Patient **exige un diagnostic immédiat** (« Ai-je un cancer ? »)
6. Patient **exige un traitement immédiat**

### 1.3 Arztbrief & Fallvorstellung (règles de registre)

- **Arztbrief** : anrede formelle (`Sehr geehrte Frau Prof. …,` puis minuscule `wir berichten…`) · anamnèse rapportée en **Konjunktiv I** (`Der Patient leide an…`, `Tabakabusus wurde mit … py bejaht`) · **Passiv** pour les mesures (`Blut wurde abgenommen`, `EKG wurde geschrieben`, `CT wurde geplant`) · **Schlussformeln obligatoires** (perdre des points si oubli). Abréviations clés : AZ, EZ, Z. n., V. a., b. B., o. g., py.
- **Fallvorstellung** : mêmes contenus mais **oral en Fachsprache**, avec Schlüsselsätze (`Herr X ist ein y-jähriger Patient, der sich … vorstellte`). On a le **droit de poser des questions** (`Das weiß ich leider nicht. Was meinen Sie, Frau X?`).

---

## 2. Schéma répétable de l'Aufklärung + inventaire des actes

Le livre (Kap. 5) montre un **squelette identique réutilisé pour chaque acte**, avec un **bloc « Standardrisiken » quasi copié-collé** (accès veineux + produit de contraste) et un **bloc spécifique** par acte. C'est exactement le modèle « blocs standards + bloc spécifique » demandé.

### 2.1 Les 7 blocs standards (répétables)

| Bloc | Contenu-type (Redemittel du livre) |
|---|---|
| **1. Einleitung / Begrüßung** | « *Guten Tag Herr/Frau X, ich habe gerade mit dem Oberarzt gesprochen: Bei Ihnen ist eine … nötig.* » |
| **2. Metakommunikation** | « *Ich versuche Sie über alles aufzuklären. Wenn ich zu schnell spreche … sagen Sie mir bitte Bescheid.* » |
| **3. Warum / Was ist es** | Explication vulgarisée de l'examen/OP et de son but |
| **4. Ablauf** | Déroulement concret (« *Sie werden in eine Röhre geschoben …* ») |
| **5. Vorbereitung** | Nüchternheit, Metformin/KM, Ausweise, Antikoagulation, etc. |
| **6a. Standardrisiken** (communs) | Allergie/KM · Gefäßverletzung/Hämatom · Nachblutung → Transfusion → risque HIV/HBV/HCV · Infektion Einstichstelle · Schilddrüsenüberfunktion (KM, TSH-Test) · Niereninsuff. (KM) |
| **6b. Spezifische Risiken** | Propres à l'acte (ex. Perforation/Blutung en endoscopie) |
| **7. Abschluss** | « *Haben Sie Fragen?* » → **Einverständnis + Unterschrift**. Rappel : aufklärung **24 h avant**, sauf Notfall |

> Design app : les blocs 1–5 + 6a + 7 sont **hérités/pré-remplis** (visuellement distincts), seul **6b** (+ ajustements de 3/4/5) est propre à l'acte. Les **questions probables du patient** (extraites des protocoles) sont attachées à chaque acte et réutilisées en simulation.

### 2.2 Les 16 actes du livre (Kap. 5)

Röntgen · Computertomografie (CT) · MRT · Angiografie · Phlebografie · Sonografie · Kontrastmittelsonografie · Sonografisch gesteuerte Feinnadelpunktion · Skelettszintigrafie · Schilddrüsenszintigrafie · **ÖGD (Gastroskopie)** · **ERCP** · Kapselendoskopie · **Koloskopie** · Laparoskopie · **Allgemeine OP-Aufklärung**.

### 2.3 Actes fréquents dans les protocoles à ajouter au catalogue
Extraits des cas réels et non isolés dans le livre : **Koronarangiografie/PTCA**, **Aszitespunktion**, **Lumbalpunktion**, **Bronchoskopie**, **Gelenkpunktion**, **Reposition/Osteosynthese de fracture**, **Bluttransfusion**, **PEG**. → mandat pour les monter sur le même squelette.

---

## 3. Inventaire consolidé des cas cliniques

**580 comptes-rendus** datés extraits des 4 protocoles, normalisés en **~80 pathologies distinctes**. Comptes par centre : Freiburg 91 · Karlsruhe 169 · Reutlingen 151 · Stuttgart 182. *(Codes centres : `Fr Ka Re St`.)*

### 3.1 Cas les plus fréquents (le cœur à monter en priorité)

| Fréq. | Pathologie | Répartition centres | Spécialité |
|---:|---|---|---|
| 30 | **Depression** | Fr1 Ka11 Re7 St11 | Psychiatrie |
| 26 | **Leberzirrhose** | Fr8 Ka3 Re9 St6 | Gastro/Hepato |
| 22 | **Ösophaguskarzinom** | Fr1 Ka9 St12 | Gastro/Onko |
| 19 | **Obere GI-Blutung** | Fr1 Ka8 Re6 St4 | Gastro |
| 18 | **pAVK** | Fr2 Ka5 Re7 St4 | Gefäßmedizin |
| 17 | **Pneumonie** | Fr6 Ka5 Re2 St4 | Pneumo |
| 16 | **Lyme-Borreliose** | Fr4 Ka3 Re4 St5 | Infektio |
| 16 | **Ulcus / Gastritis** | Ka2 Re5 St9 | Gastro |
| 15 | **Kolorektales Karzinom** | Fr1 Ka6 Re3 St5 | Gastro/Onko |
| 14 | **Gicht / Gichtanfall** | Fr1 Ka4 Re5 St4 | Rheuma/Endokrino |
| 14 | **Bandscheibenvorfall (HWS/LWS)** | Fr2 Ka5 Re4 St3 | Ortho/Neuro |
| 14 | **Akute Pankreatitis** | Fr1 Ka4 Re5 St4 | Gastro |
| 13 | **Appendizitis** | Fr2 Ka9 St2 | Chirurgie |
| 13 | **Pyelonephritis** | Ka4 Re7 St2 | Uro/Nephro |
| 12 | **Magenkarzinom** | Fr4 St8 | Gastro/Onko |
| 11 | **Divertikulitis** | Fr1 Ka5 St5 | Gastro |
| 11 | **Angina pectoris / KHK** | Ka6 Re5 | Kardio |
| 10 | **Multiple Sklerose** | Fr1 Ka2 Re4 St3 | Neuro |
| 10 | **Reizdarm / funktionell** | Fr3 Ka1 Re2 St4 | Gastro |
| 10 | **OSG-Fraktur / Distorsion** | Ka5 Re4 St1 | Ortho |

### 3.2 Fréquents (8→4)
Osteoporose 9 · TVT 8 · Cholezystolithiasis 8 · Koxarthrose 8 · Rheumatisches Fieber 8 · **Fibromyalgie 8 (spécialité Reutlingen)** · Zöliakie/Sprue 7 · GERD 7 · Benigne Prostatahyperplasie 7 · Myokardinfarkt 7 · Laktoseintoleranz 7 · Femurfraktur 7 · Gastroenteritis 7 · **Karpaltunnelsyndrom 7 (spécialité Reutlingen)** · Schilddrüsenerkrankung 6 · Asthma bronchiale 6 · Gonarthrose 6 · Migräne 6 · Influenza 6 · Diabetes mellitus 6 · Metabolisches Syndrom 6 · Malaria 5 · Panikattacke 5 · Karzinoid 5 · CED (Crohn/Colitis) 5 · Abszess 5 · Anorexia nervosa 5 · TIA 4 · Akute Cholezystitis 4 · Akutes Koronarsyndrom 4 · Endokarditis 4 · Lungenembolie 4 · Alkoholabhängigkeit 4 · COPD 4.

### 3.3 Moins fréquents mais présents (≤3)
Tonsillitis · Reaktive Arthritis · Pankreaskarzinom · Anaphylaktischer Schock · COVID-19 · Malignes Lymphom · Nephrolithiasis · Hepatitis · PTBS · Pertussis · Polymyalgia rheumatica · Alzheimer · Akutes Abdomen · Rheumatoide Arthritis · Myokarditis · Extrauteringravidität · Schlafapnoe-Syndrom · Divertikulose · Schulterluxation · Klavikula-/Rippenfraktur · Allergische Rhinitis · Harnwegsinfekt · Herzinsuffizienz · Leistenhernie · Arterielle Hypertonie · Schlaganfall · Typhus.

### 3.4 Tendances par centre (signal fort pour les filtres)
- **Reutlingen** : nette dominante **rhumato/ortho-douleur** — Fibromyalgie (8, quasi exclusif), Karpaltunnelsyndrom (7, exclusif), Endokarditis (4), pAVK, Pankreatitis.
- **Stuttgart** : **onco-gastro** — Ösophagus- (12) et Magenkarzinom (8), Ulcus (9), Depression (11).
- **Karlsruhe** : volume élevé et large — Depression (11), Appendizitis (9), Ösophaguskarzinom (9), GI-Blutung (8).
- **Freiburg** : **hépato** — Leberzirrhose (8) + Pneumonie (6).
- **Transversaux (tous centres)** : Depression, Leberzirrhose, pAVK, GI-Blutung, Lyme-Borreliose, Kolorektales Ca, Bandscheibenvorfall, Akute Pankreatitis, Gicht, TVT, MS.

### 3.5 Cas classiques FSP **absents des protocoles** mais tombables → à ajouter (mandat)
Couverts par le livre/ODAK, à monter pour ne pas laisser d'angle mort :
**Herzinsuffizienz** (global), **Lungenembolie** (à étoffer), **Schlaganfall** (à étoffer), **Cholezystitis akut** (PDF dédié), **Hämorrhoiden**, **Leistenhernie** (à étoffer), **Nephrolithiasis/Urolithiasis** (à étoffer), **Chronische Niereninsuffizienz**, **Diabetes mellitus Typ 1** (acidocétose), **Hyperthyreose / Struma** (ODAK Schilddrüse), **Anämien** (ODAK Hämatologie), **Akute Leukämie**, **Malignes Melanom**, **Herpes Zoster**, **Glaukom/Katarakt**, **Cluster-Kopfschmerz** (Fall 5 du livre), **Epilepsie**, **Meningitis**, **Bronchialkarzinom**, **COPD-Exazerbation**. Les **5 simulations intégralement rédigées du livre** (Divertikulitis, Akute Cholezystitis, Leistenhernie, Reaktive Arthritis, Cluster-Kopfschmerzen) fournissent des cas « clés en main » avec questions d'examen.

---

## 4. Fachbegriffe — état des lieux pour le drill natif

- **Source d'import propre** : `Fachbegriffe_FSP.csv`, **2 249 termes**, colonnes `Terme, Traduction, Spécialité, État, Centres, Prononciation`.
- Répartition par spécialité : **Général 1195**, Gastro 166, Ortho 159, Pneumo 138, Cardio 137, Infectio 112, Uro 84, Neuro 84, Hémato 51, Endocrino 50, Psy 44, Anatomie 29.
- **Enrichissement depuis `anki_FSP.txt`** (2 268 cartes) : champ 6 = **définition détaillée en allemand** (HTML à nettoyer), champ 4 = prononciation IPA, champs audio/image (on ignore les binaires en local pour le prototype). Le champ 0 contient un **indice mnémo** (ex. `abdominal<br><br>z B g`) → à **nettoyer** pour ne garder que le terme.
- **Le drill Anki est réimplémenté DANS l'app** (SM-2), plus d'Anki externe.
- **Cartes bidirectionnelles** imposées : `patient→technique` (reformulation → terme) ET `technique→patient` (terme → reformulation simple) — jamais de traduction unidirectionnelle sèche.
- **Rattachement automatique** : `Spécialité` + `Centres` permettent de filtrer, et le **linking terme→cas** se fait par correspondance terme ↔ Fachbegriffe listés dans chaque protocole de cas.

---

## 5. Modèle de données proposé (aligné sur le prompt, prêt pour l'interconnexion)

Entités reliées **bidirectionnellement** : `Case ↔ Specialty ↔ Fachwissen ↔ Fachbegriff ↔ Aufklaerung ↔ Simulation ↔ Score`.

- **Case** — `id, name, pathology, specialty, centers[], frequency, difficulty, patientSheet{Personalia, Allergien, Unverträglichkeiten, Noxen, Vorerkrankungen, Voroperationen, Medikamente, Familienanamnese, Sozialanamnese, Leitsymptome, Begleitsymptome, vegetativeAnamnese, réponses-type}, medicalView{Verdachtsdiagnose, DD[+critères distinctifs], Diagnostik, Therapie}, linkedFachwissenId, linkedFachbegriffeIds[], probableAufklaerungIds[], caseSpecificQuestions[], examinerQuestions[], status, lastSimulationId`
- **Fachbegriff** — `id, term, translationSimple, definitionDetailed, pronunciation, specialty, pathologyTags[], centers[], linkedCaseIds[], srs{interval, easeFactor, dueDate, repetitions, lapses}` (**SM-2**), `direction` (bidirectionnel)
- **Fachwissen** — `id, pathology, specialty, definition, ätiologie, risikofaktoren, klinik(+atypies signalées), diagnostik(ordonné non-invasif→invasif), differenzialdiagnosen(+critères), therapie{konservativ, interventionell, chirurgisch}, prognose, prüfungsfallen[], askedInExam[], linkedCaseIds[], keyFachbegriffeIds[], linkedAufklaerungIds[]`
- **AufklaerungItem** — `id, name, category(Untersuchung|OP|Therapie), blocks{einleitung, metakommunikation, warum, ablauf, vorbereitung, standardRisiken, spezifischeRisiken, abschluss}, patientQuestions[{q, modelAnswer}], linkedCaseIds[]`
- **Guide** — `id, title, type(anamnese|arztbrief|fallvorstellung|kommunikation|spezialguide), specialty|null, sections[toggles], content`
- **Simulation** — `id, caseId, date, role(Mehdi|Épouse), parts{anamnese, dokumentation, fallvorstellung, aufklaerung}{done, durationSec, checklist[], scores{}}, notes(croquis), prioritizedCorrections[]`

**Liens automatiques terme→glossaire** : un composant `<AutoLinkedText>` scanne tout texte médical affiché, repère les termes présents dans la table `Fachbegriff` (index Aho-Corasick/trie), et les rend cliquables (aperçu au survol → fiche). C'est **du code, automatique**, jamais du balisage manuel.

**Les 6 axes** (pour heatmap & scoring) : `Anamnese · Dokumentation · Fallvorstellung · Aufklärung · Fachbegriffe · Fundamentales Wissen`.

---

## 6. Évaluation — proposition (checklist → % + ressenti, pilote les révisions)

Pas de note 1–5 sèche. Pour **chaque partie**, une **checklist de critères concrets cochables** (dérivés des attentes FSP réelles) → **score = % de critères cochés** (barre verte ≥80 / orange 50–79 / rouge <50) **+ un curseur « ressenti » Fragile→Solide**. Les deux dimensions alimentent la heatmap et la **détection auto des points faibles** (remontée sur l'accueil + suggestions de termes/révisions).

- **Anamnese** : Eröffnung+Einverständnis · aktuelle Beschwerden (Schmerzanalyse complète) · vegetative Anamnese · Vorerkrankungen/OP/Medikamente/Allergien · Noxen (py) · Familien-+Sozialanamnese · registre patient (kein Fachchinesisch) · Empathie · contrôle du dialogue (patient difficile) · **VD énoncée**.
- **Dokumentation** : Anrede+Schlussformeln · **Konjunktiv I** (anamnèse) · **Passiv** (Maßnahmen) · complétude des rubriques · DD listées · Diagnostik cohérente · Therapie · orthographe des Fachbegriffe.
- **Fallvorstellung** : Fachsprache · structure AZ/EZ→VD/DD→Diagnostik→Therapie→Prognose · fluidité · questions des examinateurs gérées · savoir dire « je ne sais pas » proprement.
- **Aufklärung** : blocs standards couverts · Standardrisiken + spezifische Risiken mentionnés · registre patient · **Einverständnis** obtenu · questions patient gérées.

Checklists **régénérées à neuf** à chaque simulation.

---

## 7. Fonctionnalités proposées (au-delà du cahier des charges)

1. **« Prüfer-Modus » / vue examinateur pour l'épouse.** Un écran séparé (idéal sur 2ᵉ appareil ou split-screen) affiche **uniquement** la fiche patient jouable + les répliques difficiles à déclencher (« demande l'Oberarzt », « parle en dialecte », « exige un traitement ») **et** les questions d'examen Arzt-Arzt à poser en partie 3. L'épouse devient un vrai examinateur scénarisé, sans rien connaître de la médecine.

2. **Bloc de notes « Kürzel-Sketch » à double sortie automatique.** Le canvas d'anamnèse est structuré par rubriques (mêmes cases que le Arztbrief). En fin d'anamnèse, un bouton **« → Arztbrief »** et **« → Fallvorstellung »** transforment les mêmes notes en (a) texte Konjunktiv I à trous, (b) trame orale Fachsprache — matérialisant « une saisie, deux formats » du livre. Un dictionnaire d'abréviations médicales (Z. n., V. a., py, b. B.) auto-complète pendant la prise de notes.

3. **Détecteur de « Fachchinesisch » en temps réel.** Pendant l'anamnèse, si l'utilisateur tape/prononce un terme technique du glossaire, l'app **surligne** et propose la **reformulation patient** (« Dyspnoe → Sie bekommen schwer Luft »). Inverse en Fallvorstellung : suggère de **remonter** en Fachsprache. Entraîne le double registre, qui est le vrai piège de la FSP.

4. **« Cave-Radar » : agrégation des pièges d'examen.** Extraction automatique de tous les encarts **« LittleDoc meint / Cave! / Tipp »** du livre + des **questions réellement posées** dans les protocoles, indexés par pathologie. Avant chaque simulation, un flash « **3 pièges probables sur ce cas** » ; après, révision ciblée des pièges ratés.

5. **Générateur de « Fall du jour » pondéré par faiblesse + fréquence + centre cible.** L'algorithme du bouton « Session du jour » ne tire pas au hasard : il combine (fréquence du cas) × (faiblesse d'axe détectée) × (centre visé, ex. si Mehdi passe à Reutlingen → boost Fibromyalgie/Karpaltunnel) × (SRS des termes du cas dus). Immersion « un clic » vraiment personnalisée.

6. **Timeline des protocoles.** Chaque cas montre sa **chronologie réelle d'apparition** (dates + centres) → visualise les vagues (ex. Ösophaguskarzinom très présent à Stuttgart fin 2024) et aide à parier sur les cas « en vogue ».

7. **Mode « Blitz-Aufklärung ».** Puisque l'Aufklärung tombe **à l'improviste**, un mode d'entraînement flash : l'app crie « *Klären Sie über eine Koloskopie auf!* » avec chrono de 3 min, et check les 7 blocs. Réutilise le catalogue Aufklärung.

8. **Export / Import JSON-CSV dès le prototype** (déjà prévu) — mais aussi **snapshot de session partageable** entre les deux appareils du binôme via fichier local (pas de cloud).

---

## 8. Plan de construction proposé (après validation)

**PHASE 1 — Prototype cliquable** (React + TS + Vite · Dexie/IndexedDB · Zustand · React Router · Tailwind · Recharts · date-fns) :
1. Schéma Dexie complet + seed de démo (8–10 cas gastro/cardio, ~40 Fachbegriffe, 3–4 Fachwissen, 3 Aufklärungen dont **Gastroskopie** + **Koronarangiographie**, guides standards, quelques simulations pour peupler les stats).
2. Tous les écrans navigables + interconnexion réelle (auto-linking terme→glossaire fonctionnel).
3. **1 cas monté de bout en bout** : **Leberzirrhose** (fiche patient réelle du protocole Reutlingen 20.11.2024 déjà repérée) — fiche patient jouable, Fachwissen, Aufklärungen probables (ÖGD, Aszitespunktion), simulation complète (Anamnese→Doku→Fallvorstellung + Aufklärung à la demande), drill des termes du cas.
4. Drill Fachbegriffe SM-2 fonctionnel + page Cas cliniques avec filtres/tri/aperçu/lancement.
5. Fonctions d'import JSON/CSV branchées.

**PHASE 2 — Remplissage en masse** (après validation du prototype) : import des 2 249 Fachbegriffe (CSV) enrichis Anki, montage des ~80 pathologies × leurs cas (580 comptes-rendus), tous les guides, Fachwissen depuis livre + ODAK, ajout des cas manquants tombables (§3.5), catalogue Aufklärung complet (§2.2–2.3).

---

### ✅ En attente de ta validation
Dis-moi si : (a) la structure d'examen et le schéma Aufklärung te conviennent, (b) l'inventaire des cas est complet à tes yeux (ou s'il manque un cas), (c) le système d'évaluation te va, (d) lesquelles des 8 fonctionnalités proposées tu veux dans le prototype. Je démarre la PHASE 1 dès ton feu vert.
