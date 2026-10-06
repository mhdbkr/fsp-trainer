# Lot Lc2 — fiches et Fachwissen des 12 cas gratuits

Branche `feat/s3-lc2-fiches-gratuites` (rebasée sur `origin/main` après la fusion de Lc1, #92) · retours
FB3-G6 / FB3-G7 (`app/docs/BACKLOG-FEEDBACK.md` l. 417-418) · méthode et défauts de référence :
`app/docs/reports/lead-s3-lc1.md`.

## 0. Hypothèses posées avant d'agir

1. **« Cas gratuits » = `tier === 1`** dans `seedCases.ts`. C'est la règle de `publishContent.mjs` (l. 31,
   `freeCases = cases.filter((c) => c.tier === 1)`) ; le brief parle de « tier 0 / C0 », mais le code n'a pas
   de tier 0. On obtient exactement 12 cas, ce qui confirme la règle. Leur Fachwissen est Free par dérivation
   (`tierFw`, même pathologie).
2. **« Fiche » = `medicalView`, « Fachwissen » = l'entrée `seedFachwissen`**, comme dans Lc1. Le type n'est
   pas modifié.
3. **Édition directe des seeds, pas `lotAssembler.py`** : l'assembleur insère des cas nouveaux et ne sait pas
   enrichir un cas existant (même constat que Lc1). L'émetteur TS de `lotAssembler.py` (`to_ts`, `esc`) a
   été réutilisé depuis un script hors dépôt. Un aller-retour à l'identique (charger → réémettre → recharger)
   redonne des objets strictement égaux.
4. **« Écrit avant la pipeline v3 »** : la date d'entrée de chaque cas (`git log -S` sur `seedCases.ts`) et
   la mesure placent la coupure au lot 7 (16 août 2026). Les 7 cas entrés avant ce lot font 3 à 7 Ko de fiche ;
   les 5 cas entrés à partir de lui font 9 à 18 Ko. C'est cette frontière que le lot traite.
5. **Étalon** : `case-diabetes` (lot 7), `case-copd` (lot 7) et `case-nierenkolik` (lot 9). Ce sont trois cas
   gratuits riches, de spécialités différentes, et deux d'entre eux étaient déjà l'étalon de Lc1. J'ai repris
   leur **structure**. Pour le volume, j'ai visé environ deux tiers de leurs rubriques en nombre, pas leur
   taille : ces fiches de 38-43 Ko sont elles-mêmes au-delà du « sans surcharger » demandé.

## 1. Mesure de départ (avant le lot, `origin/main` c66c5dff)

Mesure faite sur les vrais objets (`scripts/loadCases.mjs`). « Vorst. » est la longueur de la ligne
« Herr X ist ein N-jähriger Patient. Verdachtsdiagnose: <1ʳᵉ phrase> », calculée par la même règle que
`vorstellungsDiagnose`. « Coupée » veut dire que la ligne dépasse 200 caractères ou que la phrase n'a pas de
point final : dans les deux cas, le rendu ajoute « … ».

Les cas sont classés du plus pauvre au plus riche (fiche + Fachwissen).

| # | Cas | Entré | Fiche Ko | FW Ko | Fiche Diag/DD/Erst | FW Klinik/Klass/RedFl/Diag/DD/Fallen/Fragen | Vorst. | Visuel |
|---|---|---|---|---|---|---|---|---|
| 1 | gib | prototype 6.7 | 3,3 | 6,5 | 2/3/2 | 5/0/0/3/3/3/4 | 113, sans point | — |
| 2 | angina-pectoris | prototype 6.7 | 3,5 | 7,3 | 4/3/2 | 6/0/0/6/5/3/4 | 110, sans point | `fw-khk` V1 (arbre faux, § 3) |
| 3 | schlaganfall | lot 6, 5.8 | 4,1 | 9,2 | 4/6/6 | 8/4/4/5/6/6/7 | **463** | — |
| 4 | pyelonephritis | lot 2, 17.7 | 3,9 | 10,7 | 7/6/4 | 8/3/6/9/7/7/10 | 167, sans point | — |
| 5 | pneumonie | lot 2, 17.7 | 3,9 | 14,2 | 8/6/5 | 9/4/5/10/6/8/13 | **211** | — |
| 6 | depression | lot 2, 17.7 | 5,2 | 14,3 | 7/6/4 | 13/4/6/10/9/9/9 | **233** | `fw-depression` V1 |
| 7 | osg-fraktur | lot 4, 22.7 | 6,5 | 15,5 | 6/5/4 | 7/3/5/8/6/7/8 | **202** | — |
| 8 | zystitis | lot 8, 17.8 | 9,1 | 27,4 | 11/8/5 | 10/4/9/16/11/14/17 | **246** | — |
| 9 | nierenkolik | lot 9, 7.9 | 15,7 | 38,4 | 14/11/8 | 14/4/10/17/12/15/17 | **316** | — |
| 10 | copd | lot 7, 16.8 | 17,9 | 37,7 | 15/10/7 | 15/7/10/18/12/13/18 | **384** | — |
| 11 | diabetes | lot 7, 16.8 | 16,5 | 39,9 | 18/9/7 | 17/6/10/18/12/16/17 | **433** | — |
| 12 | migraene | lot 8, 17.8 | 17,1 | 42,8 | 17/12/7 | 22/7/13/21/15/18/16 | **285** | — |

- **Visuels hérités** : aucun des 12 cas n'utilise `anatomy-map`. La seule silhouette du corpus était celle de
  Lc1. Les deux specs V1 des cas gratuits (`fw-khk`, `fw-depression`) sont conformes au contrat, mais l'arbre
  de `fw-khk` enseignait une erreur (§ 3).
- **Verdachtsdiagnose** : 12 sur 12 sont rendues avec « … ». 9 sont coupées parce que trop longues ; 3 sont
  assez courtes mais n'ont pas de point final.
- **Redites** : dans les fiches pauvres, les 2 à 4 lignes de Diagnostik ne font que répéter la thérapie. Dans
  trois Fachwissen (pyelonephritis, pneumonie, osg-fraktur), la fiche générale renvoie au patient du cas
  (« Fall Häberle », « hier: Diabetes mellitus und Z. n. Zytostatikatherapie », « hier Rivaroxaban »), si bien
  que le raisonnement du cas est écrit deux fois, une fois dans la fiche et une fois dans le Fachwissen.

## 2. Ce que le lot traite

- **Les 7 cas d'avant le lot 7, enrichis du plus pauvre au plus riche** : la fiche est entièrement réécrite
  pour gib, angina-pectoris, schlaganfall et pyelonephritis, révisée pour pneumonie, depression et
  osg-fraktur. Le Fachwissen est réécrit ou complété par corrections ciblées.
- **Les 12 cas : la Verdachtsdiagnose est restructurée.** La première phrase tient dans la Fallvorstellung et
  finit par un point ; le détail passe dans les phrases suivantes, sans perte de contenu.
- **Les 5 cas riches** (zystitis, nierenkolik, copd, diabetes, migraene) : seule leur Verdachtsdiagnose a été
  modifiée. J'ai relu leur thérapie à la recherche d'une erreur dangereuse et n'en ai trouvé aucune (§ 7).
  Leur audit clinique complet est hors de ce lot (§ 8).

### 2.1 Avant / après par cas

| Cas | Fiche Ko | FW Ko | Fiche Diag/DD/Erst | FW Klinik/Klass/RedFl/Diag/DD/Fallen/Fragen | Vorst. |
|---|---|---|---|---|---|
| gib | 3,3 → 7,0 | 6,5 → 13,6 | 2/3/2 → 8/6/6 | 5/0/0/3/3/3/4 → 8/3/5/11/7/8/11 | 113 → 160 . |
| angina-pectoris | 3,5 → 6,9 | 7,3 → 13,2 | 4/3/2 → 8/6/5 | 6/0/0/6/5/3/4 → 8/3/4/10/8/8/10 | 110 → 131 . |
| schlaganfall | 4,1 → 6,6 | 9,2 → 13,0 | 4/6/6 → 9/7/6 | 8/4/4/5/6/6/7 → 9/5/5/9/8/9/11 | 463 → 178 . |
| pyelonephritis | 3,9 → 5,3 | 10,7 → 12,0 | 7/6/4 → 8/6/6 | 8/3/6/9/7/7/10 → 8/3/6/10/8/9/11 | 167 → 166 . |
| pneumonie | 3,9 → 5,4 | 14,2 → 15,6 | 8/6/5 → 8/6/5 | 9/4/5/10/6/8/13 → idem, 4 réponses réécrites, +1 Falle | 211 → 149 . |
| depression | 5,2 → 5,5 | 14,3 → 16,8 | 7/6/4 → 8/6/4 | 13/4/6/10/9/9/9 → 13/5/6/11/10/11/10 | 233 → 193 . |
| osg-fraktur | 6,5 → 6,9 | 15,5 → 15,8 | 6/5/4 → 7/5/4 | 7/3/5/8/6/7/8 → idem, +1 Falle | 202 → 147 . |
| zystitis · nierenkolik · copd · diabetes · migraene | inchangé | inchangé | inchangé | inchangé | 246/316/384/433/285 → 176/171/173/143/164 . |

Les fiches pyelonephritis, pneumonie et depression gagnent peu de volume, pour deux raisons. D'abord, elles
avaient déjà une structure correcte. Ensuite, le gain vient surtout de lignes qui raisonnent sur le patient
et remplacent des lignes génériques. L'enrichissement réel est décrit au § 2.2.

### 2.2 Raisonnement sur CE patient (ajouté aux fiches)

- **gib** (71 ans, Ibuprofen 600 plusieurs fois par jour + ASS 100 + Ramipril) :
  - l'ASS sans indication de prévention secondaire connue est arrêté définitivement ;
  - le Ramipril est pausé tant que dure l'hypovolémie (risque d'IRA) ;
  - les douleurs du genou seront traitées sans AINS ;
  - le patient vit seul : le fils est impliqué dans la surveillance des signes d'alerte ;
  - le vertige orthostatique sert de signe de choc, il n'y a donc pas de test de Schellong ;
  - l'hémoglobine est recontrôlée, car la première valeur sous-estime la perte.
- **angina-pectoris** (64 ans, diabétique sous Metformin, 30 PY, IMC 30) :
  - CCS II ;
  - imagerie d'ischémie plutôt que Belastungs-EKG (ESC 2024) ;
  - SGLT2-Hemmer ou GLP-1-RA à cause de la KHK ;
  - pontage seulement en cas d'atteinte pluritronculaire avec diabète ;
  - Metformin pausé seulement si eGFR < 30 ;
  - le père a fait un infarctus à 60 ans : cas limite de la définition (§ 6).
- **schlaganfall** (79 ans, VHF sous ASS seul, chute dans l'escalier) :
  - un hématome sous-dural est ajouté au DD ;
  - la contre-indication « choc à la tête » est vérifiée avant la lyse ;
  - l'horloge redémarre après une AIT complète ;
  - pas d'attente du bilan de coagulation sans anticoagulant ;
  - CHA₂DS₂-VASc 6, Apixaban sans réduction de dose, début selon la taille de l'infarctus ;
  - l'âge et le risque de chute ne contre-indiquent pas l'anticoagulation ;
  - pas de recherche de FOP à 79 ans avec un VHF ;
  - écho-Doppler carotidien, parce que l'Amaurosis fugax gauche peut venir d'une sténose.
- **pyelonephritis** (76 ans, Metamizol-Allergie, Asthma, Metformin, Zystitis il y a 2 semaines) :
  - hospitalisation motivée par les vomissements, l'âge et le fait de vivre seule, et pas par le seul diabète ;
  - fluoroquinolones en second choix chez la personne âgée ;
  - AINS évités (rein, asthme) ;
  - question du traitement antibiotique de la cystite précédente (résistances) ;
  - HbA1c, parce qu'il décide du caractère « compliqué ».
- **pneumonie** (56 ans, allergie à la pénicilline, Metformin + Lisinopril + HCT, Codein) :
  - CRB-65 à 0 pour l'âge, le lieu de prise en charge se décide donc sur la SpO₂ et la comorbidité ;
  - fluoroquinolone avec contrôle de la glycémie (dysglycémies du diabétique) et du QT ;
  - Codein arrêté (toux productive) ;
  - Lisinopril et HCT pausés si exsiccose ;
  - radiographie de contrôle à cause des antécédents tumoraux ;
  - bilan allergologique ultérieur de l'étiquette « pénicilline ».
- **depression** (55 ans, père suicidé, 40-60 g d'alcool/jour, Oxazepam en hausse, HCT) :
  - facteurs de risque suicidaire pondérés ;
  - plan de crise, stock d'Oxazepam limité, jamais associé à l'alcool ;
  - Sertralin plutôt que Citalopram (QT) ;
  - natrémie contrôlée sous SSRI + HCT ;
  - marqueurs d'alcool (GGT, MCV, CDT).
- **osg-fraktur** (Rivaroxaban 20 mg, Faktor-V-Leiden) :
  - heure de la dernière prise ;
  - pause avant chirurgie et délai avant rachianesthésie ;
  - Piritramid si la douleur est à 8/10.

## 3. Erreurs corrigées

| Où | Avant | Problème | Après |
|---|---|---|---|
| Visuel `fw-khk`, `tree-ap` | « Troponin erhöht oder EKG-Veränderungen? » → ja « Akutes Koronarsyndrom », nein « Instabile Angina pectoris » | L'angor instable **est** un ACS (la fiche le dit elle-même dans ses Prüfungsfallen). Une instabile AP peut aussi avoir des modifications ECG sans troponine. L'arbre enseignait l'inverse | Racine « neu, in Ruhe oder zunehmend? » → « ST-Hebungen? » → STEMI (signal) / « hs-Troponin erhöht? » → NSTEMI / instabile AP « ebenfalls ein ACS ». Le `merke` le dit. Le bloc ne replie plus la stufe Labor (il n'en couvrait que le Troponin, la question portait un collage « zusätzlich Lipide, HbA1c erheben ») |
| Visuel `fw-khk`, `table-ap-acs` | colonne « Instabile AP / ACS » : « Troponin↑ » | faux pour l'angor instable | 3 colonnes Stabile AP / Instabile AP / NSTEMI-STEMI ; Troponin « Normal / Normal / Erhöht » |
| fw-khk, Revaskularisation | « Bypass … bei Diabetes mellitus » | Le diabète seul n'indique pas un pontage, c'est l'atteinte pluritronculaire avec diabète qui l'indique | « Mehrgefäßerkrankung mit Diabetes mellitus » (fiche et FW) |
| Fiche angina | « vorher Nierenwerte kontrollieren und Metformin pausieren » | Pause systématique non recommandée (ESUR) | « Metformin nur bei eGFR unter 30 ml/min oder akuter Nierenschädigung pausieren » |
| fw-pneumonie | « Immunsuppression (Diabetes mellitus, Strahlentherapie/Zytostatika) → stationäre, ggf. intensivmedizinische Aufnahme » ; « Diabetes mellitus (Immunschwäche) » | Le diabète n'est pas une immunosuppression ; une chimiothérapie terminée il y a 2 ans non plus. Ni l'un ni l'autre ne justifie à lui seul une réanimation | Critères S3 : CRB-65, SpO₂ < 90 %, comorbidité instable, prise en charge à domicile. « Schwere Immunsuppression » est définie (laufende Chemo mit Neutropenie, Transplantation…) |
| fw-pneumonie | « Cephalosporine nur bei gesicherter Verträglichkeit » | La réactivité croisée avec les C3G est surestimée | « selten; Einsatz je nach Art und Schwere der früheren Reaktion ». La fiche du cas garde le choix d'une fluoroquinolone |
| fw-depression | « Können wir entlassen? Bei Suizidalität NEIN » | Contredisait la conduite du cas (désir de mort passif, sans plan, capable de s'engager → ambulatoire avec consultation psychiatrique) | réponse graduée : stationär si plan, intention ou absence de capacité d'engagement ; sinon ambulant avec Krisenplan et revue sous quelques jours |
| fw-depression, Prognose | « etwa 10–15 % … versterben durch Suizid » | chiffre historique (Guze & Robins 1970), surestimé | 2 % (ambulatoire) à 9 % (hospitalisé pour suicidalité), Bostwick & Pankratz 2000 |
| fw-depression, Diagnostik | PHQ-9/BDI/HAMD rangés en `Labor` | mauvaise étape | `Anamnese/Klinik` |
| fw-gib, Sekundärprophylaxe | « französische Tripeltherapie » en première ligne | DGVS 2022 : quadrithérapie bismuthée en première ligne (résistance à la clarithromycine) | quadrithérapie bismuthée 10 jours ; trithérapie avec clarithromycine seulement si la sensibilité est prouvée ; contrôle ≥ 4 semaines après, PPI arrêté depuis 2 semaines |
| fw-pyelonephritis, Klassifikation | « kompliziert bei … Diabetes mellitus » | S3 HWI : seul le diabète **instable** rend l'infection compliquée | nuancé ; l'hospitalisation dépend de la sévérité (§ 6 pour l'examinerSheet) |
| fiche schlaganfall | DD, Diagnostik et thérapie sans le patient | absence de la chute (hématome sous-dural), de la règle de l'horloge, de la dose et du délai de l'anticoagulation | voir § 2.2 |
| fiche gib | « Erstmaßnahmen: NOTFALL … / dann Anamnese fortsetzen » | 2 lignes, sans PPI, sans arrêt des médicaments en cause | 6 étapes |

Aucune contre-indication dangereuse du type « keine Benzodiazepine » n'a été trouvée dans les 12 fiches.

## 4. Redites retirées

- Le Fachwissen ne renvoie plus au patient du cas : « Fall Häberle » ×3 (pyelonephritis), « (hier: Diabetes
  mellitus und Z. n. Zytostatikatherapie) » (pneumonie), « hier Rivaroxaban » et « bei diesem Patienten »
  (osg-fraktur). Le raisonnement sur le patient vit dans la fiche seule.
- Dans chaque fiche réécrite, un fait n'apparaît qu'une fois par rubrique :
  - la ÖGD, ses biopsies et le test Helicobacter sont en Diagnostik, la thérapie ne parle que d'hémostase ;
  - le délai de l'anticoagulation figure une seule fois dans la Sekundärprophylaxe (schlaganfall) ;
  - l'entretien de l'antidépresseur figure une seule fois en Pharmakotherapie (depression, retiré de la
    rubrique Basis du FW).
- Les Erstmaßnahmen sont des consignes courtes ; la thérapie § 1 garde le détail (doses, seuils).

## 5. Visuels (`docs/contracts/fachwissen-visuals.md`)

- Aucune spec nouvelle. Aucun des 12 cas n'avait de visuel hérité à remplacer, et le contrat exige qu'un
  libellé `ergänzt` soit relu avant toute ajout (`reviewed.ts` inchangé).
- `fw-khk.ts` : deux blocs réécrits (§ 3). Toutes les `source` pointent vers des entrées que la fiche garde mot
  pour mot : les deux Klinik « Stabile AP… » / « Instabile AP… », la DD « Akuter Myokardinfarkt / ACS », la
  stufe Labor et les 4 libellés de thérapie. Les fixtures de `FachwissenDetailPage.test.tsx` et
  `useVisualSpec.test.tsx` résolvent donc toujours. Le bloc `toggles-therapie` n'a pas changé.
- `fw-depression.ts` n'a pas changé. Les 9 entrées qu'il cite (Klinik, Klassifikation, Red Flag, 2 DD,
  3 thérapies) sont gardées mot pour mot.
- Le test D7 (« un bloc qui throw déplie le texte qu'il remplaçait ») reste vrai. Son commentaire, qui citait
  `diagnostik:Labor` comme seul `replaces`, a été corrigé.
- `checkFachwissenVisuals` : `OK 3 specs / 9 blocs / 5 ergänzt relus`, exit 0.

## 6. Écarts transmis à la relecture clinique

- **Cohésion** (`checkCaseCohesion`, non bloquant) : 263 → 271 liens manquants. Le détail par cas :
  - angina-pectoris 100 % → 95,2 % ;
  - gib 100 % → 95,1 % ;
  - schlaganfall 100 % → 98,6 % ;
  - pneumonie 98,6 % → 97,1 %.

  Les nouvelles DD ne sont pas nommées entre parenthèses dans les `negativeFindings` :
  - angina : Aortenklappenstenose, mikrovaskuläre/vasospastische Angina, muskuloskelettal ;
  - gib : Ulcus duodeni, erosive Gastritis, Pseudomeläna ;
  - schlaganfall : Subdurales Hämatom ;
  - pneumonie : poststenotische Pneumonie.

  Les annoter modifierait la fiche du simulant, ce que le brief exclut. C'est la même situation que Lc1 avant
  sa passe fixeur. Deux propositions :
  - schlaganfall : annoter « kein Kopftrauma beim Sturz (… ; gegen subdurales Hämatom) » ;
  - gib : annoter « keine vorherige Magenspiegelung » n'aide pas. Les trois DD de la gib relèvent de l'ÖGD et
    n'ont pas de négatif anamnestique propre ; la revue peut les accepter comme telles ou les retirer.
- **examinerSheet de pyelonephritis** : « bei bekanntem Diabetes mellitus, **also** eine komplizierte
  Harnwegsinfektion », et la Prüfungsfalle du cas « Diabetes mellitus macht die Pyelonephritis zur
  komplizierten Form ». Selon la S3 HWI, un diabète à métabolisme stable ne rend pas l'infection compliquée.
  Le Fachwissen et la fiche portent désormais la nuance ; l'examinateur, le Muster (« komplizierte
  Harnwegsinfektion ») et la Falle ne la portent pas. Je ne les ai pas modifiés : ce ne sont pas des
  répliques, mais l'hospitalisation reste juste pour d'autres raisons, et l'HbA1c du cas est inconnu. À
  trancher : nuancer les trois, ou les laisser comme hypothèse de travail.
- **Antécédent familial du cas angina** : le père a fait un infarctus « mit 60 ». La question du cas demande
  « vor dem 60. Lebensjahr », et l'examinateur compte ce fait comme une « positive Familienanamnese ». La
  définition stricte (homme du premier degré < 55 ans) l'exclut. La fiche dit « Grenzfall … im Gespräch
  trotzdem nennen » et le FW enseigne la définition. La question et l'examinateur n'ont pas été modifiés.
- **pneumonie** : le cas dit « Z. n. Prostatakarzinom … (Prostatektomie + Zytostatikatherapie) ». Une
  chimiothérapie après prostatectomie pour un cancer localisé est inhabituelle. Le fait vient de l'anamnèse
  et n'a pas été touché. La fiche ne le traite plus comme une immunosuppression en cours.
- **Muster et Arztbrief de référence** : non modifiés. Ils citent un sous-ensemble des DD et des examens
  désormais présents dans les fiches ; je n'y ai relevé aucune contradiction, hors le point pyelonephritis
  ci-dessus.

## 7. Les 5 cas riches — relecture de la thérapie seule

zystitis, nierenkolik, copd, diabetes et migraene : j'ai relu la thérapie de la fiche en entier, en la
confrontant aux médicaments et aux allergies du cas.

- **zystitis** : allergie à la pénicilline, d'où Fosfomycin ou Nitrofurantoin, Pivmecillinam exclu.
- **nierenkolik** : Metformin, AINS prudents tant que la créatinine est inconnue, Harnableitung avant le
  traitement du calcul.
- **copd** : O₂ cible 88-92 %, Prednisolon 40 mg pendant 5 jours, Anthonisen I.
- **diabetes** : SGLT2 évités devant les infections urinaires récidivantes.
- **migraene** : triptan contre-indiqué dans la migraine hémiplégique ou avec aura du tronc cérébral, pas
  dans l'aura visuelle ; pas d'œstrogène après une TVP.

Je n'ai trouvé aucune erreur dangereuse. Leur Fachwissen, leurs DD et leur Diagnostik n'ont pas été
audités (§ 8).

## 8. Reste pour un lot suivant

- **Audit clinique complet des 5 cas riches** (Fachwissen, DD, Diagnostik, chiffres) contre la grille de Lc1.
  Le cas `zystitis` est le plus léger des cinq (fiche 9,1 Ko). Ces cinq fiches sont déjà plus longues que
  l'étalon « deux tiers » : leur lot à elles serait plutôt de **concision**.
- **Visuels V1** pour les 7 Fachwissen enrichis, sur le modèle de Lc1 : arbre Forrest/Leitzeichen pour gib,
  jauge CHA₂DS₂-VASc pour schlaganfall, arbre « ambulant ou stationär » pour pneumonie. Chaque seuil absent de
  la fiche serait un `ergänzt` à faire relire.
- Les réserves du § 6.

## 9. Sources médicales (pour la revue clinique)

| Chiffre ou règle | Où | Source |
|---|---|---|
| Transfusion < 7 g/dl (cible 7-9), < 8 g/dl si maladie CV (cible ≥ 10) ; Erythromycin 250 mg 30-120 min avant ; ÖGD < 24 h ; PPI fort 72 h, puis 2×/j jusqu'à J14 ; ASS en prévention secondaire repris en 3-5 jours ; anticoagulation vers J7 ; Glasgow-Blatchford 0-1 → ambulatoire | gib | ESGE Guideline NVUGIH, Gralnek et al., *Endoscopy* 2021 ; DGVS S2k « Gastrointestinale Blutung » (AWMF 021-028) |
| Récidive selon Forrest : 55 / 43 / 22 / 10 / 5 % | fw-gib | Laine & Peterson, *NEJM* 1994 |
| Quadrithérapie bismuthée 10 jours en 1ʳᵉ ligne, contrôle ≥ 4 semaines, PPI arrêté 2 semaines | fw-gib | DGVS S2k « Helicobacter pylori und gastroduodenale Ulkuskrankheit », Fischbach et al., *Z Gastroenterol* 2023 (AWMF 021-001) |
| Varices : ÖGD < 12 h, Terlipressin, Ceftriaxon 1 g ; létalité à 6 semaines 15-20 % | fw-gib | Baveno VII, de Franchis et al., *J Hepatol* 2022 |
| Létalité de l'hémorragie non variqueuse 2-10 % | fw-gib | ESGE 2021 (introduction) |
| Imagerie d'ischémie plutôt que Belastungs-EKG ; probabilité clinique ; DAPT 6 mois ; LDL < 55 mg/dl et −50 % ; SGLT2/GLP-1-RA chez le coronarien diabétique | angina, fw-khk | ESC Guidelines « Chronic coronary syndromes » 2024 ; NVL Chronische KHK (version 7, 2024) ; ESC Diabetes/CVD 2023 ; ESC/EAS Dyslipidaemias 2019 |
| CCS I-IV | fw-khk | Campeau, *Circulation* 1976 |
| Antécédent familial : homme < 55 ans, femme < 65 ans | fw-khk | ESC Prevention 2021 ; Herold, *Innere Medizin* |
| Pontage si pluritronculaire + diabète | fw-khk | ESC/EACTS Myocardial revascularization 2018 (FREEDOM) |
| Metformin et produit de contraste : pause si eGFR < 30 ou IRA | angina | ESUR Contrast Media Guidelines 10.0 (2018) |
| Arrêt du tabac : mortalité −36 % chez le coronarien | fw-khk | Critchley & Capewell, *JAMA* 2003 |
| Alteplase 0,9 mg/kg (max 90, 10 % en bolus), < 4,5 h ; Tenecteplase ; TA < 185/110 puis < 180/105 pendant 24 h, sans lyse ≤ 220/120 ; pas d'attente de l'INR sans anticoagulant ; horloge remise à zéro après une AIT ; O₂ si SpO₂ < 95 % ; fièvre > 37,5 °C | schlaganfall | DGN S2e « Akuttherapie des ischämischen Schlaganfalls » (AWMF 030-046, 2022) ; AHA/ASA 2019 ; ESO 2023 (Tenecteplase) |
| Thrombectomie < 6 h, jusqu'à 24 h avec mismatch | fw-schlaganfall | DAWN / DEFUSE-3 2018 ; DGN 2022 |
| DOAK précoce selon la taille de l'infarctus (≤ 48 h petit ou moyen, 6-7 j grand) | schlaganfall | ELAN, Fischer et al., *NEJM* 2023 ; ESC AF 2024 |
| CHA₂DS₂-VASc ; Apixaban : réduction si 2 critères sur 3 (≥ 80 ans, ≤ 60 kg, créatinine ≥ 1,5 mg/dl) | schlaganfall | ESC AF 2020/2024 ; RCP Eliquis |
| OAK : risque d'AVC −64 % (≈ deux tiers) | fw-schlaganfall | Hart et al., *Ann Intern Med* 2007 |
| ASS + Clopidogrel 21 jours après AVC mineur ou AIT à haut risque | fw-schlaganfall | CHANCE 2013 / POINT 2018 ; DGN Sekundärprophylaxe 2022 |
| TEA si sténose ≥ 50 % NASCET symptomatique, < 2 semaines | schlaganfall | S3 Karotisstenose (AWMF 004-028, 2020) ; ESVS 2023 |
| Diabète stable ≠ compliqué ; Cefpodoxim 200 mg ×2 ou Ceftibuten 400 mg 10 j, Cipro 500-750 ×2 7-10 j, Levo 750 5 j ; FQ si résistance < 10 % ; ≥ 10⁴ UFC/ml | pyelonephritis | S3 « Harnwegsinfektionen » (AWMF 043-044, mise à jour 2017/2024) ; EAU Urological Infections 2024 |
| Mises en garde FQ (tendons, aorte, SNC) | pyelonephritis, pneumonie | BfArM Rote-Hand-Brief 08.04.2019 |
| CRB-65 / CURB-65, critères d'hospitalisation, stabilité clinique, 5-7 jours, FQ si allergie à la pénicilline | pneumonie | S3 « Ambulant erworbene Pneumonie » (AWMF 020-020, 2021) |
| Létalité CURB-65 : 0-1 < 3 %, 3 ≈ 15 %, 4-5 40-57 % | fw-pneumonie | Lim et al., *Thorax* 2003 |
| SpO₂ cible 92-96 % (88-92 % si hypercapnie) | pneumonie | S3 « Sauerstoff in der Akuttherapie beim Erwachsenen » (AWMF 020-021, 2021) |
| ICD-10 F32 ; combinaison si épisode modéré à sévère ; entretien 6-12 mois ; natrémie sous SSRI | depression | NVL Unipolare Depression (version 3.2, 2022) |
| Citalopram max 40 mg, 20 mg après 65 ans | fw-depression | Rote-Hand-Brief Citalopram 2011 (BfArM) |
| Suicide sur la vie : 2,2 % à 8,6 % | fw-depression | Bostwick & Pankratz, *Am J Psychiatry* 2000 |
| Rechute 50 % / 90 % | fw-depression | inchangé ; source classique (APA, Kupfer 1991) |
| Rivaroxaban : pause de 48 h avant chirurgie, 72 h avant ponction neuraxiale à dose thérapeutique | osg-fraktur | ESAIC/ESRA 2022 ; DGAI S1 « Rückenmarksnahe Regionalanästhesien und Thromboembolieprophylaxe » 2021 |
| Alcool : 0,5 l de bière à 5 % ≈ 20 g | gib, depression | calcul (0,5 × 0,05 × 0,8 × 1000) |
| IMC : 23,7 (gib) · 30,0 (angina) · 25,1 (pyelo) · 24,8 (depression) · 24,5 (osg) ; 30 PY (1 paquet × 30 ans) | fiches | calcul |

## 10. Vérifications (code de sortie, branche rebasée sur `origin/main` 595c8b7c)

| Commande | Sortie |
|---|---|
| `npx tsc -b` | 0 |
| `npx vitest run --dir src --maxWorkers=2` | 0 (193 fichiers, 2 023 tests) |
| `npm run test:c6 -- --maxWorkers=2` | 0 (17 fichiers, 212 tests) |
| `node --test scripts/*.test.mjs`, sans `checkProbeCoverage.test.mjs` | 0 (200 tests) |
| `node --test scripts/checkProbeCoverage.test.mjs`, lancé seul | 0 (4 tests) |
| les 18 `check*` de la CI (ProbeCoverage, MusterCoverage, CaseCoherence, GuideCoverage, GuideDuplicates, UiTells, CaseQuestionChapters, PatientWorte, PlayedTrame, TrameSymptoms, QuestionAtomicity, Examen, TherapieLabels, FachwissenVisuals, AllergyConflicts, CaseTermLinks, Bedeutung, Coherence) | 0 chacun |
| `checkTermRegister --require-all` | 0 |
| `checkCoherence --case` × 12 cas gratuits | 0 × 12 |
| `checkBudgetFloor.mjs origin/main` | 0 |
| `npm run build` | 0 |
| `git merge-tree --write-tree origin/main HEAD` | 0 (aucun conflit) |

- `caseTermLinks.json` a été régénéré (`npm run content:link`) après le rebase.
- Le seul conflit avec Lc1 portait sur ce fichier généré : la branche a été rebasée sur `main` (qui contient
  #92), puis le fichier a été régénéré.

## Non vérifié

- **Chiffres de mémoire, sans consultation en ligne pendant ce lot** (même réserve que Lc1). Ils sont cités
  avec leur source au § 9, et la revue clinique doit les confirmer en priorité :
  - Forrest 55/43/22/10/5 % ;
  - létalité de l'hémorragie digestive 2-10 % et des varices 15-20 % ;
  - CURB-65 ;
  - Bostwick & Pankratz ;
  - −36 % au sevrage tabagique et −64 % sous OAK ;
  - délais de pause du Rivaroxaban (48 / 72 h) ;
  - schémas oraux de la S3 HWI ;
  - PPI 2×/j jusqu'à J14 (ESGE 2021) ;
  - classement « diabète stable = non compliqué » de la S3 HWI.
- Le lien « Wortfindungsstörungen → hémisphère gauche » suppose un droitier ; la latéralité du patient
  n'est pas connue.
- Le rendu navigateur des deux blocs `fw-khk` réécrits (390 px, mode sombre, clavier) n'a pas été mesuré. Les
  tests jsdom sont verts. La revue design doit passer `playwright-cli` sur `/fachwissen/fw-khk`.
- La qualité de langue (registre C1, Fachsprache) n'a été relue que par moi : il n'y a pas eu de passe
  `fsp-language-reviewer`.
- Le prompt Oberarzt (Q-8, `PASTE_MAX`) n'a pas été mesuré cas par cas. Il ne lit que la Verdachtsdiagnose et
  les noms des DD de `medicalView` ; `prompt.corpus.test.ts` est vert.
