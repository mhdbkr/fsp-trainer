# Bilan de la base clinique — 10 septembre 2026

État de la base de cas cliniques de FSP-Cockpit à la clôture de la PHASE 2 (import de masse), avant d'ouvrir les autres chantiers du projet. Chiffres mesurés par script sur le dépôt à `1f2ab77` ; rien n'est estimé.

## 1. Chiffres clés

| | |
|---|---|
| Cas cliniques | **117** (seed v54) |
| Fiches Fachwissen | 117 (une par cas, liaison par pathologie) |
| Muster Arztbrief + Fallvorstellung | 117 / 117 |
| Aufklärungen | 16 fiches · 110 / 117 cas en référencent au moins une |
| Fachbegriffe | 2 266 (glossaire importé, SRS) |
| Sondes d'anamnèse | 40 générales + 4 féminines + 138 spécialisées (16 spécialités) |
| Prüfungsfallen | ≈ 11,6 par cas |
| Portes de contrat CI | 4 / 4 vertes (sondes, Muster, cohérence, guide ↔ fiche) |
| Protocoles d'examen couverts | **566 / 573 — 98 %** |

Vingt-deux lots produits depuis le début de la PHASE 2, dont dix (13 → 22) dans les cinq derniers jours, à raison de six cas par lot. Les huit derniers lots ont livré **44 cas conformes du premier coup** aux quatre contrats — le durcissement du prompt et de l'assembleur a stabilisé le pipeline.

## 2. Couverture des protocoles réels

Le signal de fréquence est dans les **titres** des protocoles (chaque protocole est titré par son diagnostic), pas dans leur corps. Mesure : [`checkProtocolCoverage.py`](../scripts/checkProtocolCoverage.py), avec une table d'alias tenue à la main pour absorber synonymes (`Podagra` = Gichtarthritis, `Sprue` = Zöliakie) et fautes de frappe (`Kolonkarzynom`, `Leberzirrohze`).

- 573 protocoles datés exploitables, 256 intitulés distincts, quatre centres (Freiburg, Karlsruhe, Reutlingen, Stuttgart), 2016 → 2025.
- **566 couverts (98 %)**.
- 7 restants, volontairement écartés : Oberschenkelfraktur (2), Klavikula-/Rippenfraktur, Unterschenkelfraktur, Schultergelenkluxation, Polytrauma — des traumatismes qui testent la prise en charge d'urgence et non le dialogue anamnestique que l'app entraîne — et « arterielle Hypertonie » comme titre isolé, qui n'est pas un motif de consultation.

Ce chiffre a bougé de 67 % à 87 % **sans ajout de cas**, uniquement par correction de la mesure (lot-18). Il dépend d'une table d'alias manuelle : toute pathologie ajoutée doit y être inscrite, sinon elle compte comme non couverte.

## 3. Corpus par spécialité

| Spécialité | Cas | ♀ | Notfall | sans protocole |
|---|---|---|---|---|
| Gastroenterologie | 17 | 8 | 1 | 1 |
| Infektiologie | 11 | 5 | 4 | 3 |
| Orthopädie | 10 | 2 | 1 | 0 |
| Kardiologie | 9 | 1 | 5 | 3 |
| Psychiatrie | 9 | 3 | 2 | 2 |
| Pneumologie | 8 | 0 | 2 | 1 |
| Neurologie | 8 | 4 | 3 | 2 |
| Rheumatologie | 6 | 3 | 2 | 1 |
| Endokrinologie | 6 | 3 | 0 | 2 |
| Chirurgie | 5 | 2 | 2 | 2 |
| Urologie | 5 | 2 | 2 | 1 |
| Hämatologie | 5 | 4 | 1 | 4 |
| Dermatologie | 5 | 3 | 2 | 3 |
| Gynäkologie | 5 | 5 | 1 | 4 |
| Nephrologie | 4 | 0 | 1 | 4 |
| Onkologie | 4 | 3 | 0 | 0 |

La distribution suit celle de l'examen : la gastro-entérologie domine parce qu'elle domine les protocoles. Plus aucune spécialité sous 4 cas. Les deux lots mixtes (21, 22) ont amené Nephro, Häma et Gyn de 2-3 à 4-5.

Deux déséquilibres secondaires : **Pneumologie sans aucune patiente** (0 ♀ sur 8) et **Nephrologie sans aucune** (0 ♀ sur 4) ; Kardiologie 1 ♀ sur 9. À corriger dans les prochains cas de ces spécialités plutôt que par un lot dédié.

## 4. Provenance

- **95 cas** (81 %) s'appuient sur au moins un protocole réel ; 33 portent la marque `Complément`, dont **22 n'ont aucun centre** — cas construits depuis le savoir médical parce que la pathologie n'est jamais tombée dans les quatre centres (nephrotisches Syndrom, Endometriose, CML…). La convention `Complément` existe dans le type `Center`, est filtrable dans la liste des cas, a son style : l'utilisateur peut distinguer les deux.
- Chaque cas trace ses protocoles source dans `sourceProtocol` (texte) et `sourceDates` (dates ISO d'examen).
- **Correctif de confidentialité (lot-19)** : quatre dates de naissance de patients avaient fui des fiches de protocole vers `sourceDates` (1957, 1971, 1982, 2003). Retirées ; l'assembleur écarte désormais toute date antérieure à 2016. Audit du corpus : aucune date avant 2016.

## 5. Complétude interne — anomalies relevées

| Constat | Portée | Gravité |
|---|---|---|
| Deux références d'Aufklärung pendantes : `auf-appendektomie` (Appendizitis) et `auf-echokardiographie` (Endokarditis) n'existent pas dans `seedAufklaerungen` | 2 cas | faible — créer les deux fiches ou retirer les références |
| 7 cas sans aucune Aufklärung (Cholezystitis, Depression, Pneumonie, Pyelonephritis, Schlaganfall, Gallenkolik, Anaphylaxie) | 7 cas | faible |
| 5 cas de la phase 1 sans champ `geschlecht` (Leberzirrhose, Angina, GIB, kolorektales Ca, Myokardinfarkt) — le sexe n'est pas exploitable par le code pour ces cas | 5 cas | faible — 5 lignes à ajouter |
| Champ `difficulty` jamais renseigné | 117 cas | à décider : supprimer le champ ou le calculer |
| Champ `examinerQuestions` quasi inutilisé (0,3 / cas) — les questions vivent dans `examinerSheet` et `pruefungsfallen` | 117 cas | cosmétique — retirer le champ du type |
| 16 Aufklärungen pour 117 cas : les examens courants sont couverts (Gastroskopie, Koloskopie, Koronarangiographie, Bronchoskopie, Lumbalpunktion, CT, MRT, Sonographie, ERCP, Laparoskopie, Transfusion…) mais il manque **Echokardiographie (TTE/TEE)**, **Knochenmarkpunktion**, **Nierenbiopsie**, **Gelenkpunktion**, **Pleurapunktion**, **Zystoskopie** — six examens qu'au moins un cas du corpus prescrit et que l'examinateur fait expliquer | transversal | **moyenne** |

## 6. Profil des patients

64 ♂ · 48 ♀ · 5 non renseignés. Âge de 19 à 90, médiane 53 ; 12 cas sous 30 ans, 16 à 70 ans et plus. 29 cas Notfall.

## 7. Ce qui manque — cas pertinents à ajouter

Confrontation du corpus à une liste de référence de thèmes FSP classiques (construite de mémoire, cinquante thèmes absents identifiés), pondérée par les mentions dans les protocoles locaux (diagnostics différentiels, questions d'examinateur). **Ces comptes sont des mentions, pas des titres** : ils indiquent ce que les examinateurs *évoquent*, pas ce qu'ils *tirent au sort*.

**Priorité 1 — classiques à fort poids local, absents du corpus**

| Thème | Spécialité | Mentions |
|---|---|---|
| Lumbago / Lumboischialgie | Ortho | 17 |
| Bauchaortenaneurysma | Kardio / Chir | 15 |
| Basaliom (weißer Hautkrebs) | Derma / Onko | 12 |
| Perniziöse Anämie / Vitamin-B12-Mangel | Häma | 11 |
| Psoriasis / Psoriasisarthritis | Derma / Rheuma | 10 |
| Drogenabhängigkeit (Opioide, Cannabis) | Psych | 9 |
| Hodentorsion | Uro | 5 |
| Akute Sinusitis | HNO | 5 |
| Perikarditis | Kardio | 4 |
| Urtikaria | Derma | 4 |
| Epilepsie / erster Krampfanfall | Neuro | 3 |
| Aortendissektion | Kardio | 3 |

**Priorité 2 — classiques d'examen jamais évoqués localement, mais attendus d'un candidat C1** : Tuberkulose, Sarkoidose, Polyneuropathie, HIV-Primoinfektion, Mononukleose, distale Radiusfraktur, Cushing, Morbus Addison, Hyperparathyreoidismus, CLL, Plasmozytom, Spondylitis ankylosans, SLE, bipolare Störung, generalisierte Angststörung, Bulimie, Ovarialzyste/-torsion, Zervixkarzinom, Neurodermitis, Hörsturz, Glaukom.

**Fiches Fachwissen sans cas** — quatre thèmes transversaux qui ne se présentent pas comme motif de consultation mais que l'examinateur teste à travers d'autres cas : **Sepsis / septischer Schock** (37 mentions, exclu des cas à dessein), **arterielle Hypertonie / hypertensive Krise**, **Schmerztherapie nach WHO-Stufenschema**, **Antikoagulation (DOAK, Bridging)**. Une fiche seule coûte un tiers d'un cas.

**Proposition** : deux lots de 6 cas (Priorité 1) + un lot de 4 fiches transversales + les 6 Aufklärungen manquantes. Le corpus passerait à ~129 cas et couvrirait l'essentiel des thèmes classiques. Au-delà, le rendement marginal chute : la Priorité 2 relève d'un choix éditorial (élargir vers la médecine générale) plus que de la préparation FSP.

## 8. Qualité — ce qui a été vérifié, ce qui ne l'a pas été

**Vérifié systématiquement, sur les 117 cas**
- Les quatre contrats structurels (sondes, Muster, cohérence, guide ↔ fiche) par CI.
- Sur les lots 13 → 22 : vérification indépendante des libellés thérapeutiques, sondes, chapitres, étapes diagnostiques et dates, en plus du `selfCheck` de l'agent — ce dernier a signalé sans corriger à deux reprises (lots 15, 16), d'où la vérification externe.
- Cohérence arithmétique (BMI, Packungsjahre, grammes d'alcool, chronologies) : déclarée par les agents, auditée par sondage.

**Non vérifié systématiquement**
- **Relecture médicale** par un pair : les lots 1 → 12 ont bénéficié d'agents de vérification (avec des faux positifs), les lots 13 → 22 uniquement de la porte déterministe. Les agents `fsp-clinical-reviewer` et `fsp-language-reviewer` existent mais n'ont pas été passés sur les 66 cas récents.
- **Registre linguistique** (Konjunktiv I, C1, registre oral vs écrit) : jamais audité en masse.
- **Longueur** : les cas récents sont nettement plus longs que ceux de la phase 1 (hints de 4 à 6 Ko → fiches de 40 Ko). L'agent `fsp-concision-editor` n'a pas été passé.

## 9. Risques et décisions en attente

1. **Noms de patients.** 53 cas sur 117 portent un nom complet repris verbatim des protocoles, 23 de plus un nom de famille. À la FSP le patient est un acteur sous identité fictive : ces noms sont très probablement des identités simulées, pas des personnes réelles. Le risque est donc modéré, mais c'est une reprise verbatim d'un matériel tiers dans un dépôt public. **Décision non délégable** : pseudonymiser (script simple, une passe) ou assumer.
2. **Provenance et licence des protocoles.** Point ouvert depuis la feuille de route de production, inchangé.
3. **Relecture médicale des lots 13 → 22.** Recommandée avant publication ; les agents existent, le coût est d'environ une heure par lot.

## 10. Conclusion

La base est **complète pour une première version** : 117 cas, 98 % des protocoles réels des cinq dernières années, toutes les spécialités à 4 cas ou plus, contrats structurels verts, pipeline stabilisé. Ce qui reste relève de trois natures différentes, à ne pas confondre :

- **Extension** (Priorité 1, fiches transversales, Aufklärungen) — deux à trois lots, production automatisable, rendement encore bon.
- **Hygiène** (références pendantes, sexe manquant, champs inutilisés) — une heure de travail.
- **Décisions** (noms, licence, relecture) — les tiennes.

Rien de ce qui précède ne bloque l'ouverture des autres chantiers du projet. Les deux points de la section 9 sont ceux à trancher avant toute publication.

---

## Annexe — les 117 cas

**Gastroenterologie (17)** — Achalasie · Akute Pankreatitis · Chronische Pankreatitis · Chronische funktionelle Obstipation · Colitis ulcerosa · Divertikulitis · GERD · Kolorektales Karzinom · Laktoseintoleranz · Leberzirrhose · Magenkarzinom · Morbus Crohn · Obere GI-Blutung · Reizdarmsyndrom · Ulcus ventriculi / Gastritis · Zöliakie · Ösophaguskarzinom

**Infektiologie (11)** — Akute Otitis media ⟨C⟩ · Akute Tonsillitis · Akute infektiöse Gastroenteritis · Akutes rheumatisches Fieber · Bakterielle Meningitis ⟨C⟩ · COVID-19 · Influenza · Lyme-Borreliose · Malaria tropica · Typhus abdominalis · Virushepatitis B ⟨C⟩

**Orthopädie (10)** — Coxarthrose · Gonarthrose · Hüftkopfnekrose · Karpaltunnelsyndrom · Lumbale Spinalkanalstenose · Lumbaler Bandscheibenvorfall · Osteoporose mit Wirbelkörperfraktur · Schenkelhalsfraktur · Sprunggelenkfraktur · Zervikaler Bandscheibenvorfall

**Kardiologie (9)** — Akute Myokarditis · Angina pectoris / KHK · Chronische Herzinsuffizienz · Infektiöse Endokarditis · Myokardinfarkt · pAVK · Synkope ⟨C⟩ · Tiefe Beinvenenthrombose · Vorhofflimmern

**Psychiatrie (9)** — Alkoholentzugssyndrom · Anhaltende somatoforme Schmerzstörung · Anorexia nervosa · Delir · Demenz vom Alzheimer-Typ · Depression · Panikstörung mit Agoraphobie · PTBS · Schizophrenie ⟨C⟩

**Pneumologie (8)** — Allergische Rhinitis · Ambulant erworbene Pneumonie · Asthma bronchiale · COPD · Lungenembolie · Obstruktives Schlafapnoe-Syndrom · Pertussis · Spontanpneumothorax ⟨C⟩

**Neurologie (8)** — BPPV ⟨C⟩ · Commotio cerebri · Ischämischer Schlaganfall · Migräne · Morbus Parkinson ⟨C⟩ · Multiple Sklerose · Sturz im Alter · TIA

**Rheumatologie (6)** — Fibromyalgiesyndrom · Gichtarthritis · Polymyalgia rheumatica mit Riesenzellarteriitis · Reaktive Arthritis · Rheumatoide Arthritis · Septische Arthritis

**Endokrinologie (6)** — Diabetes mellitus Typ 1 · Diabetes mellitus Typ 2 · Hyperthyreose (Basedow) · Hypothyreose (Hashimoto) ⟨C⟩ · Metabolisches Syndrom · Struma nodosa

**Chirurgie (5)** — Akute Cholezystitis · Appendizitis · Cholelithiasis mit Gallenkolik · Leistenhernie ⟨C⟩ · Mechanischer Ileus ⟨C⟩

**Urologie (5)** — Akute Pyelonephritis · Akute Zystitis · Benigne Prostatahyperplasie · Nephrolithiasis mit Nierenkolik · Prostatakarzinom

**Hämatologie (5)** — Akute Leukämie · CML ⟨C⟩ · Eisenmangelanämie ⟨C⟩ · ITP ⟨C⟩ · Non-Hodgkin-Lymphom

**Dermatologie (5)** — Anaphylaktischer Schock · Erysipel ⟨C⟩ · Herpes zoster ⟨C⟩ · Ulcus cruris venosum ⟨C⟩ · Weichteilabszess

**Gynäkologie (5)** — Adnexitis · Endometriose ⟨C⟩ · Extrauteringravidität · Mammakarzinom ⟨C⟩ · Uterus myomatosus

**Nephrologie (4)** — Akute Glomerulonephritis ⟨C⟩ · Akutes Nierenversagen · Chronische Niereninsuffizienz ⟨C⟩ · Nephrotisches Syndrom ⟨C⟩

**Onkologie (4)** — Bronchialkarzinom · Hodgkin-Lymphom · Karzinoid-Syndrom · Pankreaskarzinom

⟨C⟩ = `Complément`, sans protocole source dans les quatre centres.
