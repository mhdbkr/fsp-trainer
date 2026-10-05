# Rapport lot K2 — le profil clinique des 130 cas et les réponses des sondes exigées

> `sim-engine-engineer` · 5 oct. 2026 · branche `feat/s3-k2-profils`, base `origin/main` @ `81914bc4` (contrat #69, K0 #72, K1 #74) ; `origin/main` a avancé à `5fd18f32` (docs seulement), `git merge-tree --write-tree origin/main HEAD` : 0.
> Statut : **DONE_WITH_CONCERNS** — concerns = la liste de relecture clinique (§ 7), non relue.
> Le montage ne change pas : le gel `trame-actuelle.txt` est intact, et la trame jouée des 130 cas est identique avec ou sans profil (INV-90, § 6 bis).

## 1. Livrables et commits

| # | Livrable | Commit | Fichiers |
|---|---|---|---|
| 1, 3 | Type `Profil`, `profilIncoherences` (INV-80), `tagsEffectifs` ; la mesure lit le profil DÉCLARÉ ; `linkCaseTerms` ignore le profil ; deux déclarations et deux pertinences corrigées (§ 2.3) | `81ccdac9` | `db/types.ts`, `guides/signes.ts`, `coherenceMesure.mjs`, `checkCoherence.mjs`, `linkCaseTerms.mjs`, `probeSucht.ts`, `signesDefs.ts` |
| 1, 2 | Profils des 130 cas + 35 réponses de banque, 9 lots dans l'ordre du fichier | `95e2464e` `58b8d05a` `112faf87` `432b2d5a` `7170d174` `4a53c8e6` `6a255ccc` `782a82e8` `169a5a47` | `seedCases.ts` (seul writer) |
| 3, 4 | La porte exige le profil (INV-80) ; tests et mutations (INV-80, INV-88 / I6, INV-90) ; plancher K2 | `206da09b` | `checkCoherence.mjs`, `checkCoherence.test.mjs`, `profil.test.ts` (nouveau), `coherence-budget.json` |
| 5 | Ce rapport | (ce commit) | `app/docs/reports/lead-s3-k2.md` |

Chaque lot de `seedCases.ts` porte les profils et les réponses de ses cas ; le message de commit liste ses arbitrages et ses réponses. Le fichier final est identique octet pour octet à celui qui a été vérifié avant découpage.

## 2. Hypothèses et écarts (à acter)

1. **La nature est répétée en tête de `tags`.** Le contrat exige `tags` non vide alors que la nature se dérive. Écrire la nature rend le profil lisible seul et garantit la non-vacuité ; l'union avec les tags dérivés la rend sans effet.
2. **INV-90 en K2 = « le montage ne lit pas le profil ».** `cohere` n'existe pas encore : la clause du contrat (r1 et r3 inactifs, écart `profil-absent`) appartient à K3. En K2 : (a) la trame jouée des 130 cas est identique avec et sans profil (`profil.test.ts`) ; (b) sans profil, la mesure garde la **proposition** de K0/K1 (test de `checkCoherence.test.mjs`) ; (c) la porte, elle, refuse un cas sans profil (INV-80, « exigé par la porte dès K2 »).
3. **Quatre retouches du lexique et des déclarations** (K1 laissait la pertinence à K2 ; les deux déclarations empêchent r3 d'ajouter une question **déjà posée** par la Fach, que r2 ne verrait pas) :
   - `fach-gastro-stuhl` → `['stuhl', 'stuhlaussehen']` : « Welche Farbe (blutig, teerschwarz, hell) » est l'aspect des selles (D1). Sans elle, r3 aurait ajouté « Ist Ihnen Blut, Schleim oder eine ungewöhnliche Farbe im Stuhl aufgefallen? » à `case-zoeliakie`. Coût : 3 doublons vrais deviennent visibles (§ 6).
   - `fach-infekt-gelenke` → `['arthralgie', 'gelenke']` : « Wandern sie von Gelenk zu Gelenk? » est le schéma articulaire. Sans elle, r3 aurait ajouté « Welche Gelenke … von Gelenk zu Gelenk? » sous la même question dans `case-rheumatisches-fieber`.
   - `gelenke` pertinent aussi pour `lyme` (la Lyme-Arthritis se cherche par le schéma articulaire).
   - `gelenk_entzuendung` pertinent aussi pour `generalisiert` : devant une douleur diffuse, « ein Gelenk jemals geschwollen? » écarte l'arthrite (DD de la fibromyalgie, question du cas comprise) ; « Welche Gelenke » reste exclu.
4. **Règle de déclaration d'un tag qui exige.** Un tag n'est déclaré que si la question de banque qu'il ferait ajouter a un sens dans le cas. Quand le signe **est** le motif, la banque est absurde (« Haben Sie Husten? » à un patient venu pour une toux) : `case-bronchialkarzinom` ne porte pas `husten`, ses dimensions sont celles de la nature `veraenderung`. De même `diarrhoe` n'est pas posé sur le sevrage opioïde.
5. **(Résolu, § 9.)** Questions du cas encore muettes, lues hors profil (3) : `case-pankreaskarzinom` (« … gürtelförmig in den Rücken ausstrahlen ») et `case-cml` (« … in die linke Schulter ausstrahlen ») lisent `ausstrahlung` ; `case-karzinoid` (famille : « … Nierensteine ») lit `nierensteine`. Ce sont des questions de DD légitimes : leur `sucht` se déclare en K4, pas en déformant le profil. Si K3 merge avant K4, r1 les retirera (`casRetiresParR1` = 3, erreur de source assumée et datée).
6. **(Résolu, § 9.)** `veg-ausscheidung` restait grossière (`stuhl`, `miktion`) alors que son texte demande « Aussehen, wie oft? ». Choix de K1, non touché : la déclarer en entier changerait les 130 trames. Conséquence : dans `case-morbus-crohn`, `case-zoeliakie` et `case-chronische-pankreatitis`, r3 ajoutera la fréquence des selles alors que la question végétative la frôle. **Proposition pour K3** : décider si `veg-ausscheidung` déclare `stuhlfrequenz` (r2 la réduirait alors partout où l'Aktuell pose la fréquence).

## 3. Arbitrages des natures de motif (D2, ancien Q8)

**Règle appliquée.** Le tag `schmerz` d'un motif d'une autre nature est déclaré quand une douleur est **le premier symptôme** du motif (D2, lettre), ou quand la douleur est **constitutive** du premier symptôme (une tuméfaction « douloureuse » : la douleur n'est pas un second symptôme). Il n'est pas déclaré pour la douleur d'un syndrome fébrile ou d'un sevrage, ni pour une douleur nommée après le premier symptôme.

| Cas | Nature | `schmerz` | Raison |
|---|---|---|---|
| leberzirrhose | schmerz | (nature) | déjà `schmerz` ; douleur abdominale diffuse, pas généralisée au corps : pas de `generalisiert` |
| gastroenteritis | ausscheidung | **oui** | « krampfartige Bauchschmerzen … zusammen mit wässrigen Durchfällen » : la douleur vient en premier (D2, cas cité par la direction) |
| commotio | neurologisch | **oui** | la céphalée (5/10) est le premier symptôme, l'amnésie le second |
| arterielle-hypertonie | allgemein | **oui** | « drückende Kopfschmerzen im Hinterkopf (6/10) » est le premier symptôme ; la PA est un constat |
| zystitis | ausscheidung | **oui** | « brennende Schmerzen beim Wasserlassen » est le premier leitsymptom |
| tvt | veraenderung | **oui** | « geschwollene … Wade **mit ziehenden Schmerzen** » : douleur constitutive ; Ort et Charakter servent le DD (Baker, déchirure) |
| erysipel | veraenderung | **oui** | « … überwärmte und **schmerzhafte** Schwellung (6/10, 8/10 debout) » : même figure que la TVT |
| leistenhernie | veraenderung | **oui** | la douleur est un leitsymptom à part entière (le second, quantifié 3–6/10), et la question du cas sur l'irradiation au scrotum la présuppose |
| lyme | infekt | non | « grippeähnliche Beschwerden mit Kopf-, Gliederschmerzen » : douleurs du syndrome grippal ; le signe-guide est l'érythème |
| influenza, covid19 | infekt | non | douleur accessoire d'un syndrome fébrile (le contrat §10.3 cite influenza) |
| laktoseintoleranz | ausscheidung | non — **à relire** | premier symptôme : les ballonnements ; les crampes (5/10) suivent dans la même phrase. Le DD tient au rythme laitier, pas à la Schmerzanalyse |
| sinusitis | infekt | non — **à relire** | premier symptôme : le rhume ; la douleur faciale (6/10) est le 4e élément. Argument contraire : c'est un critère de la sinusite bactérienne |
| sturz-im-alter | anfall | non — **à relire** | premier symptôme : le malaise orthostatique ; la douleur de hanche est sa conséquence. Argument contraire : l'exclusion d'une fracture du col |
| colitis-ulcerosa | ausscheidung | non | les crampes sont le 3e leitsymptom |
| glomerulonephritis | ausscheidung | non | céphalée = 3e élément, signe de l'HTA |
| opioidabhaengigkeit | psychisch | non | douleurs musculaires du sevrage ; ni `diarrhoe` (signe du sevrage déjà quantifié à l'ouverture) |
| fibromyalgie | schmerz | (nature) | `generalisiert` (exclut l'irradiation), `steifigkeit` ; **exclut `gelenke`** avec sa raison : « Welche Gelenke » n'a pas d'objet. La tuméfaction articulaire reste pertinente (DD de l'arthrite, question du cas) |

**Autres tags non évidents.** `lyme` posé en DD : multiple-sklerose (neuroborréliose), rheumatoide-arthritis (Lyme-Arthritis), lymphom (adénopathie après piqûre, question du cas), meningitis (FSME / neuroborréliose, « Zeckenstich » dans l'anamnèse dirigée de la fiche), rheumatisches-fieber (Lyme-Arthritis ; l'« ringförmig » de la Fach Infekt y sert l'érythème marginé). `meningitis` : otitis-media et sinusitis (complication intracrânienne). `gicht` en DD d'une mono / oligoarthrite aiguë : septische-arthritis, reaktive-arthritis ; cml (accès goutteux dans la fiche). `stein` : les 6 cas d'urologie, gallenkolik, cholezystitis, bauchaortenaneurysma (DD de la douleur du flanc). `hals` (19, contre 57 proposés) : neurologie à déficit (schlaganfall, tia, MS, parkinson, lagerungsschwindel), thyroïde, œsophage / reflux / signes d'alarme digestifs, ORL, cou (lymphom, nhl, bronchialkarzinom avec dysphonie), angio-œdème (anaphylaxie, urtikaria). `steifigkeit` (10, contre 32) : rhumatisme inflammatoire et arthrose, plus les questions du cas sur la raideur matinale (lumboischialgie, morbus-crohn, somatoforme) ; pas la goutte ni l'arthrite septique.

## 4. Les profils des 130 cas

« Tags déclarés en plus » = ce que le profil ajoute à la nature dérivée (`hoden` se dérive pour hodentorsion). Aucun cas n'a besoin d'`exige` propre. « r3 ajoutera » = les signes exigés qu'aucune unité ne cherche (37), avec leur banque : leur réponse est désormais dans la fiche.

| # | Cas | Nature (dérivée) | Tags déclarés en plus | exige | exclut | r3 ajoutera (K3) |
|---|---|---|---|---|---|---|
| 1 | leberzirrhose | schmerz | — | — | — | — |
| 2 | angina-pectoris | schmerz | dyspnoe | — | — | — |
| 3 | pankreatitis | schmerz | — | — | — | — |
| 4 | gib | veraenderung | — | — | — | — |
| 5 | divertikulitis | schmerz | fieber | — | — | — |
| 6 | cholezystitis | schmerz | fieber, stein | — | — | — |
| 7 | kolorektales-ca | ausscheidung | gewichtsverlust | — | — | — |
| 8 | gerd | schmerz | hals, husten | — | — | — |
| 9 | myokardinfarkt | schmerz | — | — | — | — |
| 10 | oesophaguskarzinom | ausscheidung | dysphagie, hals, gewichtsverlust | — | — | — |
| 11 | ulcus | schmerz | hals | — | — | — |
| 12 | magenkarzinom | allgemein | hals, gewichtsverlust | — | — | — |
| 13 | appendizitis | schmerz | fieber | — | — | — |
| 14 | depression | psychisch | — | — | — | — |
| 15 | pneumonie | infekt | fieber, dyspnoe, husten | — | — | — |
| 16 | pyelonephritis | schmerz | fieber, stein | — | — | — |
| 17 | pavk | schmerz | — | — | — | — |
| 18 | lyme | infekt | lyme | — | — | — |
| 19 | osg-fraktur | schmerz | gelenk | — | — | — |
| 20 | bandscheibenvorfall | schmerz | — | — | — | — |
| 21 | gicht | schmerz | gelenk, arthritis, gicht | — | — | — |
| 22 | multiple-sklerose | nerven | hals, lyme | — | — | — |
| 23 | reizdarm | schmerz | — | — | — | — |
| 24 | schlaganfall | neurologisch | hals | — | — | — |
| 25 | gallenkolik | schmerz | stein | — | — | — |
| 26 | tvt | veraenderung | schmerz | — | — | ort→akt-ort, charakter→akt-charakter, intensitaet→akt-intensitaet |
| 27 | diabetes | allgemein | gewichtsverlust | — | — | — |
| 28 | hyperthyreose | allgemein | hals, gewichtsverlust | — | — | — |
| 29 | copd | atemnot | dyspnoe, husten | — | — | — |
| 30 | zystitis | ausscheidung | schmerz, stein | — | — | ort→akt-ort, charakter→akt-charakter, intensitaet→akt-intensitaet |
| 31 | migraene | schmerz | — | — | — | — |
| 32 | asthma | atemnot | dyspnoe, husten | — | — | — |
| 33 | herzinsuffizienz | atemnot | dyspnoe, husten | — | — | — |
| 34 | nierenkolik | schmerz | fieber, stein | — | — | — |
| 35 | tonsillitis | schmerz | fieber, dysphagie, hals | — | — | schluck→akt-ausscheid-schlucken |
| 36 | anaemie | allgemein | dyspnoe, gewichtsverlust | — | — | — |
| 37 | vorhofflimmern | anfall | dyspnoe | — | — | — |
| 38 | erysipel | veraenderung | schmerz, fieber | — | — | charakter→akt-charakter, intensitaet→akt-intensitaet |
| 39 | hypothyreose | allgemein | hals | — | — | — |
| 40 | niereninsuffizienz | allgemein | dyspnoe, gewichtsverlust | — | — | — |
| 41 | lymphom | veraenderung | fieber, hals, lyme, gewichtsverlust | — | — | — |
| 42 | lungenembolie | atemnot | dyspnoe, husten | — | — | — |
| 43 | eug | schmerz | — | — | — | — |
| 44 | meningitis | schmerz | fieber, meningitis, lyme | — | — | — |
| 45 | pankreaskarzinom | ausscheidung | gewichtsverlust | — | — | — |
| 46 | zoster | schmerz | — | — | — | — |
| 47 | osteoporose | schmerz | — | — | — | — |
| 48 | bph | ausscheidung | stein | — | — | — |
| 49 | demenz | psychisch | gewichtsverlust | — | — | — |
| 50 | bronchialkarzinom | veraenderung | dyspnoe, hals, gewichtsverlust | — | — | atemnot→akt-atemnot-belastung |
| 51 | mammakarzinom | veraenderung | — | — | — | — |
| 52 | rheumatoide-arthritis | schmerz | gelenk, arthritis, steifigkeit, lyme | — | — | — |
| 53 | morbus-crohn | schmerz | diarrhoe, steifigkeit, gewichtsverlust | — | — | stuhlfrequenz→akt-ausscheid-haeufigkeit |
| 54 | karpaltunnel | nerven | — | — | — | — |
| 55 | panikstoerung | anfall | dyspnoe | — | — | — |
| 56 | prostatakarzinom | ausscheidung | stein, gewichtsverlust | — | — | — |
| 57 | hepatitis-b | ausscheidung | reise, gelenk, gewichtsverlust | — | — | — |
| 58 | parkinson | nerven | hals | — | — | — |
| 59 | gonarthrose | schmerz | gelenk, steifigkeit | — | — | — |
| 60 | struma | veraenderung | dysphagie, hals | — | — | — |
| 61 | otitis-media | schmerz | fieber, meningitis | — | — | — |
| 62 | ileus | schmerz | — | — | — | — |
| 63 | lagerungsschwindel | neurologisch | hals | — | — | — |
| 64 | synkope | anfall | dyspnoe | — | — | — |
| 65 | zoeliakie | schmerz | diarrhoe, gewichtsverlust | — | — | stuhlfrequenz→akt-ausscheid-haeufigkeit |
| 66 | schenkelhalsfraktur | schmerz | gelenk | — | — | — |
| 67 | ulcus-cruris | veraenderung | — | — | — | — |
| 68 | leistenhernie | veraenderung | schmerz | — | — | ort→akt-ort, charakter→akt-charakter, intensitaet→akt-intensitaet |
| 69 | alkoholentzug | psychisch | — | — | — | — |
| 70 | commotio | neurologisch | schmerz | — | — | ort→akt-ort, charakter→akt-charakter, intensitaet→akt-intensitaet |
| 71 | itp | veraenderung | — | — | — | — |
| 72 | uterus-myomatosus | veraenderung | dyspnoe | — | — | atemnot→akt-atemnot-belastung |
| 73 | akutes-nierenversagen | allgemein | diarrhoe | — | — | stuhlaussehen→akt-ausscheid-aussehen |
| 74 | fibromyalgie | schmerz | generalisiert, steifigkeit | — | gelenke | — |
| 75 | polymyalgia | schmerz | gelenk, steifigkeit, gewichtsverlust | — | — | — |
| 76 | pneumothorax | schmerz | dyspnoe, husten | — | — | — |
| 77 | schlafapnoe | allgemein | — | — | — | — |
| 78 | schizophrenie | psychisch | — | — | — | — |
| 79 | delir | neurologisch | fieber, gewichtsverlust | — | — | — |
| 80 | achalasie | ausscheidung | dysphagie, hals, gewichtsverlust | — | — | — |
| 81 | septische-arthritis | schmerz | gelenk, arthritis, fieber, gicht | — | — | — |
| 82 | spinalkanalstenose | schmerz | — | — | — | — |
| 83 | hws-diskusprolaps | schmerz | — | — | — | — |
| 84 | laktoseintoleranz | ausscheidung | diarrhoe | — | — | stuhlfrequenz→akt-ausscheid-haeufigkeit |
| 85 | tia | neurologisch | hals | — | — | — |
| 86 | diabetes-typ1 | allgemein | dyspnoe, gewichtsverlust | — | — | atemnot→akt-atemnot-belastung |
| 87 | gastroenteritis | ausscheidung | schmerz, diarrhoe, reise, gewichtsverlust | — | — | ort→akt-ort, charakter→akt-charakter, intensitaet→akt-intensitaet, stuhlfrequenz→akt-ausscheid-haeufigkeit |
| 88 | rheumatisches-fieber | schmerz | gelenk, arthritis, fieber, lyme | — | — | gelenk_entzuendung→fach-rheuma-entzuendung |
| 89 | influenza | infekt | fieber, husten | — | — | — |
| 90 | coxarthrose | schmerz | gelenk, steifigkeit | — | — | — |
| 91 | metabolisches-syndrom | allgemein | dyspnoe | — | — | atemnot→akt-atemnot-belastung |
| 92 | karzinoid | schmerz | diarrhoe, dyspnoe, gewichtsverlust | — | — | — |
| 93 | abszess | schmerz | fieber | — | — | — |
| 94 | anorexia-nervosa | psychisch | gewichtsverlust | — | — | — |
| 95 | malaria | infekt | reise, fieber, gelenk | — | — | — |
| 96 | endokarditis | infekt | fieber, dyspnoe, gewichtsverlust | — | — | — |
| 97 | covid19 | infekt | fieber, husten, dyspnoe | — | — | atemnot→akt-atemnot-belastung |
| 98 | anaphylaxie | atemnot | dyspnoe, hals | — | — | — |
| 99 | reaktive-arthritis | schmerz | gelenk, arthritis, steifigkeit, fieber, gicht | — | — | — |
| 100 | pertussis | atemnot | husten | — | — | — |
| 101 | colitis-ulcerosa | ausscheidung | diarrhoe, gelenk, arthritis, dyspnoe, gewichtsverlust | — | — | gelenke→fach-rheuma-gelenke, atemnot→akt-atemnot-belastung |
| 102 | chronische-pankreatitis | schmerz | diarrhoe, gewichtsverlust | — | — | stuhlfrequenz→akt-ausscheid-haeufigkeit |
| 103 | myokarditis | schmerz | dyspnoe | — | — | — |
| 104 | nephrotisches-syndrom | allgemein | dyspnoe | — | — | atemnot→akt-atemnot-belastung |
| 105 | akute-leukaemie | allgemein | fieber, dyspnoe, gewichtsverlust | — | — | — |
| 106 | endometriose | schmerz | — | — | — | — |
| 107 | ptbs | schmerz | — | — | — | — |
| 108 | somatoforme-schmerzstoerung | schmerz | gelenk, steifigkeit | — | — | — |
| 109 | hueftkopfnekrose | schmerz | gelenk | — | — | — |
| 110 | glomerulonephritis | ausscheidung | dyspnoe | — | — | — |
| 111 | nhl | veraenderung | fieber, hals, gewichtsverlust | — | — | — |
| 112 | cml | allgemein | gicht, gewichtsverlust | — | — | — |
| 113 | adnexitis | schmerz | fieber | — | — | — |
| 114 | allergische-rhinitis | atemnot | husten | — | — | — |
| 115 | typhus | infekt | reise, fieber | — | — | — |
| 116 | obstipation | ausscheidung | — | — | — | — |
| 117 | sturz-im-alter | anfall | gewichtsverlust | — | — | — |
| 118 | lumboischialgie | schmerz | steifigkeit | — | — | — |
| 119 | bauchaortenaneurysma | schmerz | stein | — | — | — |
| 120 | aortendissektion | schmerz | — | — | — | — |
| 121 | perikarditis | schmerz | fieber | — | — | — |
| 122 | epilepsie | anfall | — | — | — | — |
| 123 | hodentorsion | schmerz | stein | — | — | — |
| 124 | basaliom | veraenderung | — | — | — | — |
| 125 | psoriasis | veraenderung | gelenk, arthritis, steifigkeit | — | — | gelenke→fach-rheuma-gelenke, gelenk_entzuendung→fach-rheuma-entzuendung |
| 126 | urtikaria | veraenderung | hals | — | — | — |
| 127 | perniziose-anaemie | allgemein | dyspnoe, gewichtsverlust | — | — | — |
| 128 | opioidabhaengigkeit | psychisch | gewichtsverlust | — | — | — |
| 129 | sinusitis | infekt | fieber, meningitis | — | — | — |
| 130 | arterielle-hypertonie | allgemein | schmerz | — | — | charakter→akt-charakter, intensitaet→akt-intensitaet |


## 5. Réponses ajoutées (35)

Toutes dans `antworten`, sous le commentaire « K2 (ADR-0023) : réponses des sondes de banque que le profil exige (r3) ».

| Cas | Sonde | Réponse écrite |
|---|---|---|
| tvt | `akt-ort` | In der rechten Wade, am ganzen Unterschenkel hinten. Manchmal zieht es bis in die Kniekehle hoch. |
| tvt | `akt-charakter` | Es zieht, und dazu spannt es, als wäre die Haut zu eng. Stechend oder brennend ist es nicht. |
| tvt | `akt-intensitaet` | Ungefähr sechs von zehn. Beim Gehen und Stehen eher mehr, wenn ich das Bein hochlege, etwas weniger. |
| zystitis | `akt-ort` | Es brennt vorne in der Harnröhre, wenn ich Wasser lasse. Und dazu drückt es dumpf im Unterbauch, gleich über dem Schambein. |
| zystitis | `akt-charakter` | Beim Wasserlassen brennt und sticht es richtig. Danach bleibt so ein dumpfer, krampfartiger Druck unten im Bauch. |
| zystitis | `akt-intensitaet` | Ungefähr fünf von zehn. Beim Wasserlassen selbst ist es am schlimmsten. |
| leistenhernie | `akt-ort` | Hier in der rechten Leiste, direkt über der Beule. Manchmal zieht es bis in den rechten Hoden hinunter. |
| leistenhernie | `akt-charakter` | Es zieht und drückt, als ob da ein Fremdkörper drin wäre. Stechend oder krampfartig ist es nicht. |
| leistenhernie | `akt-intensitaet` | In Ruhe so drei bis vier von zehn, beim schweren Heben bis sechs. Vor drei Tagen, als die Beule nicht mehr zurückging, war es kurz eine Acht. |
| commotio | `akt-ort` | Eigentlich im ganzen Kopf, am meisten links oben, da, wo die Beule ist. Ein bisschen zieht es auch in den Nacken. |
| commotio | `akt-charakter` | Dumpf und drückend, wie ein Reifen um den Kopf. Direkt an der Beule sticht es, wenn ich sie berühre. |
| commotio | `akt-intensitaet` | Ungefähr fünf von zehn. Seit dem Sturz gleich stark, mehr geworden ist es nicht. |
| gastroenteritis | `akt-ort` | Im mittleren Bauch und unten im Unterbauch, so verteilt. Einen einzelnen Punkt kann ich nicht zeigen. |
| gastroenteritis | `akt-charakter` | Krampfartig. Das zieht sich in Wellen zusammen und lässt dann wieder nach. |
| gastroenteritis | `akt-intensitaet` | So sechs von zehn, wenn die Krämpfe kommen. |
| erysipel | `akt-charakter` | Es brennt und spannt, als wäre die Haut zu eng. Wenn man draufdrückt, sticht es. |
| erysipel | `akt-intensitaet` | Im Liegen ungefähr sechs von zehn, im Stehen bis acht. |
| arterielle-hypertonie | `akt-charakter` | Drückend und dumpf, als hätte ich einen zu engen Helm auf. |
| arterielle-hypertonie | `akt-intensitaet` | Morgens beim Aufwachen ungefähr sechs von zehn. Nachmittags ist fast nichts mehr da. |
| tonsillitis | `akt-ausscheid-schlucken` | Stecken bleibt nichts, es tut nur furchtbar weh. Festes Essen kriege ich kaum runter, Trinken geht in kleinen Schlucken, kalt am besten. Meinen Speichel kann ich schlucken. |
| bronchialkarzinom | `akt-atemnot-belastung` | Nur bei Anstrengung. Nach etwa hundert Metern in der Ebene oder nach einer Treppe muss ich stehen bleiben — vor einem halben Jahr bin ich noch den Hang zum Garten hoch. Im Sitzen habe ich keine Luftnot. |
| uterus-myomatosus | `akt-atemnot-belastung` | Nur bei Anstrengung. Wenn ich die Treppe in den dritten Stock hochgehe, muss ich zwischendurch stehen bleiben. In Ruhe habe ich keine Luftnot. |
| diabetes-typ1 | `akt-atemnot-belastung` | Nur bei Anstrengung. Beim Treppensteigen in den dritten Stock bin ich oben aus der Puste, das kannte ich früher nicht. In Ruhe ist alles gut. |
| metabolisches-syndrom | `akt-atemnot-belastung` | Nur bei Anstrengung. Die Treppe in den dritten Stock, da muss ich zweimal stehen bleiben. In Ruhe oder im Liegen habe ich keine Luftnot. |
| covid19 | `akt-atemnot-belastung` | Seit gestern bei jeder Anstrengung, schon auf der Treppe ins Schlafzimmer — dann rast das Herz, und die Brust wird eng. Im Sitzen bekomme ich Luft. |
| colitis-ulcerosa | `akt-atemnot-belastung` | Nur bei Anstrengung. Auf der Treppe bin ich schnell außer Atem. In Ruhe nicht. |
| colitis-ulcerosa | `fach-rheuma-gelenke` | Das rechte Knie und der linke Knöchel, seit ungefähr zwei Wochen. Sonst keine. Gewandert ist das nicht, die beiden tun seitdem weh. |
| nephrotisches-syndrom | `akt-atemnot-belastung` | Nur bei Anstrengung, schon beim ersten Stock komme ich außer Atem. In Ruhe nicht, und flach liegen kann ich auch. |
| morbus-crohn | `akt-ausscheid-haeufigkeit` | Vier- bis sechsmal am Tag, und nachts muss ich auch zwei-, dreimal raus. Das geht jetzt seit ungefähr fünf Monaten so. |
| zoeliakie | `akt-ausscheid-haeufigkeit` | Drei- bis viermal am Tag. Nachts muss ich deswegen nicht aufstehen. |
| chronische-pankreatitis | `akt-ausscheid-haeufigkeit` | Vier- bis sechsmal am Tag, seit ungefähr drei Monaten. Nachts muss ich deswegen nicht raus, nachts gehe ich nur zum Wasserlassen. |
| akutes-nierenversagen | `akt-ausscheid-aussehen` | Nein. Der Durchfall war wässrig, aber Blut oder Schleim war nicht dabei, und schwarz war er auch nicht. |
| rheumatisches-fieber | `fach-rheuma-entzuendung` | Ja, das rechte Knie und das rechte Sprunggelenk sind dick geschwollen, richtig rot und heiß. Anfassen kann ich sie kaum, schon die Bettdecke tut weh. |
| psoriasis | `fach-rheuma-gelenke` | Mehrere: der linke Mittelfinger — der ist dick wie eine Wurst —, die zweite und dritte Zehe rechts und das rechte Knie, dazu die rechte Ferse. Gewandert ist das nicht, es ist nach und nach dazugekommen und geblieben. |
| psoriasis | `fach-rheuma-entzuendung` | Geschwollen ja, der ganze Mittelfinger und das rechte Knie. Ob sie rot oder warm sind, ist mir nicht aufgefallen. Anfassen kann ich sie schon. |

## 6. Mesure avant / après (`checkCoherence.mjs --json`, 130 cas)

| Compteur | K1 (`origin/main`) | **K2** | Lecture |
|---|---:|---:|---|
| `doublons` | 266 | **282** | +16, hausse documentée : `fach-gastro-stuhl` (+3) puis `veg-ausscheidung` (+13) déclarent l'aspect et la fréquence (§ 9) ; doublons vrais, retirés par r2 en K3 |
| `doublonsCas` | 24 | 24 | K4 |
| `horsProfil` | 58 | **75** | +17, hausse documentée (78 avant les compléments du § 9) : le profil déclaré remplace la proposition (hals 57 → 19, stein 45 → 9, meningitis 27 → 3, steifigkeit 32 → 10) ; 26 nouveaux, 6 levés par un tag motivé ; détail au fixture |
| `exigeAbsent` | 68 | **37** | exact : ce que r3 ajoutera en K3 (tableau § 4) |
| `relancesOrphelines` | 0 | 0 | |
| `brauchtViole` | 20 | 20 | K4 |
| **`ajouteSansReponse`** | 66 | **0** | **I6 tenu** : K3 peut merger |
| `questionsMuettes` / `sondesMuettes` | 825 / 0 | 822 / 0 | 3 questions du cas déclarées (§ 9) |

`checkBudgetFloor.mjs origin/main` : 0, deux hausses signalées « à relire en revue », chacune écrite au fixture avec `de` / `a` exacts et sa raison. `--bless` refusant toute hausse, le plancher est regravé à la main.

**Le montage ne bouge pas** : `trameActuelle.test.ts` (gel des 130 trames) vert sans régénération ; INV-90 vérifie la trame de chaque cas avec et sans profil. Les deux déclarations corrigées ne touchent pas `SUCHT_MONTAGE`, que lit encore `dedupeBySymptom`.

## 6 bis. Tests et mutations (INV-80, INV-88 / I6, INV-90)

- `profil.test.ts` (vitest, 9) : les 130 profils valides ; mutations qui rougissent : profil supprimé de `case-gastroenteritis` ; `akt-ort` dans `aktuellSkip` d'un cas tagué `schmerz` ; la banque visée par `SUCHT_AUSSER` ; `exclut` d'un signe de dépistage ; `exclut` sans raison ; exige ∩ exclut ; tag inconnu ; exige non pertinent. Arbitrages D2 relus (6 cas oui, 6 cas non) ; fibromyalgie. INV-90 : trame identique sans profil, 130 cas.
- `checkCoherence.test.mjs` (33, dont 4 nouveaux) : la mesure suit le profil déclaré et, sans lui, la proposition ; la porte rougit (exit 1) sur un profil supprimé et sur une banque skippée ; **INV-88 / I6** : `ajouteSansReponse` vaut 0 au plancher, et retirer la réponse de la banque de `stuhlfrequenz` de `case-gastroenteritis` le fait passer à 1 (exit 1).

## 7. Liste de relecture clinique

**Profils non évidents** (à trancher par le relecteur clinique, par spécialité) :
1. Les trois `schmerz` refusés « à relire » : laktoseintoleranz, sinusitis, sturz-im-alter (§ 3). Les déclarer ajoute 3 réponses (`akt-ort`, `-charakter`, `-intensitaet`) ; les fiches ont un bloc `schmerz` complet.
2. Les trois `schmerz` par douleur constitutive ou seconde : tvt, erysipel, leistenhernie.
3. `steifigkeit` retiré de gicht et septische-arthritis : r1 y retirera « Sind die Gelenke morgens steif? ».
4. `gicht` / `nierensteine` hors profil dans rheumatoide-arthritis et polymyalgia : r1 réduira les relances de `fach-rheuma-vorgeschichte`.
5. `lyme` en DD (MS, RA, lymphom, meningitis, rheumatisches-fieber) et `meningitis` en complication (otitis-media, sinusitis).
6. `arthritis` sur colitis-ulcerosa (arthrite périphérique, genou et cheville) et psoriasis (dactylite) ; `gelenk` seul sur malaria, hepatitis-b (arthralgies), polymyalgia (DD d'une polyarthrite du sujet âgé), somatoforme (genoux).
7. `dyspnoe` posé sur une dyspnée d'effort de la liste des signes d'accompagnement (anémies, uterus-myomatosus, diabetes-typ1, metabolisches-syndrom, colitis-ulcerosa, nephrotisches-syndrom, glomerulonephritis, karzinoid) ; refusé à aortendissektion (« Gefühl der Atemnot aus Angst, ohne echte Luftnot »).
8. `husten` non posé quand la toux est le motif (bronchialkarzinom) ou un fond tabagique (diabetes, lymphom, nhl, leistenhernie).

**Réponses ajoutées** (35, § 5) : toutes reprennent des faits de la fiche (bloc `schmerz`, signes d'accompagnement, signes niés, réponses voisines), sans fait nouveau. Les deux à regarder de près :
- `case-psoriasis` · `fach-rheuma-entzuendung` : la fiche ne dit ni rougeur ni chaleur des articulations ; la réponse dit « ist mir nicht aufgefallen ».
- `case-tonsillitis` · `akt-ausscheid-schlucken` : odynophagie sans dysphagie mécanique, salive avalée (cohérent avec les signes niés du phlegmon).

## 8. Vérifications (par code de sortie, sommet `206da09b`)

- `node scripts/check*.mjs` du job `contrats` : **tous 0** — `checkAllergyConflicts`, `checkBedeutung`, `checkCaseCoherence`, `checkCaseCohesion`, `checkCaseQuestionAnswers`, `checkCaseQuestionChapters`, `checkCaseTermLinks` (après exclusion du profil : `caseTermLinks.json` inchangé), `checkFachwissenVisuals`, `checkGuideCoverage`, `checkGuideDuplicates`, `checkMusterCoverage`, `checkPatientWorte`, `checkPlayedTrame`, `checkProbeCoverage`, `checkQuestionAtomicity`, `checkQuestionOrder`, `checkTermRegister --require-all`, `checkTherapieLabels`, `checkTrameSymptoms`, `checkUiTells`, `checkCoherence`, `evalDoctopus --dry`, `checkBudgetFloor.mjs origin/main`. **Exception** : `checkProbeOverlap` 1 (informatif, `|| true`), 8 répétitions comme à K1, inchangé.
- `node --test` : `checkCoherence` (33), `checkBudgetFloor`, `linkCaseTerms`, `checkCaseTermLinks`, `checkProbeCoverage`, `checkCaseQuestionAnswers`, `checkTrameSymptoms`, `checkQuestionOrder`, `checkQuestionAtomicity` : **tous 0**.
- `npx tsc -b --noEmit` : **0**. `npx vitest run --dir src/data --maxWorkers=2` : **0** (16 fichiers, 337 tests, gel compris). `git merge-tree --write-tree origin/main HEAD` : **0**.

## 9. Compléments après les décisions de main (5 oct.)

Main a **accepté** les quatre retouches du § 2.3 et demandé deux compléments, un commit chacun :

| Commit | Complément | Effet mesuré |
|---|---|---|
| `8cee3903` | Les 3 questions du cas de DD déclarent leur `sucht` : pankreaskarzinom et cml `['ausstrahlung']`, karzinoid `['familie_endokrin', 'nierensteine']` (énumération familiale, D1 et (e)). **Déclarer ne suffisait pas** : `ausstrahlung` et `nierensteine` ne sont pertinents que sous `stein` (ou `schmerz`…) ; r1 les aurait retirées quand même. Tag `stein` motivé : pankreaskarzinom (ictère obstructif, DD lithiase du cholédoque), cml (lithiase urique ; la question voisine nomme les Nierenkoliken), karzinoid (lithiase d'une NEM 1). **À relire.** | horsProfil 78 → 75 ; questionsMuettes 825 → 822 |
| `5804647e` | `veg-ausscheidung` → `stuhl, miktion, stuhlfrequenz, stuhlaussehen, miktion_frequenz, urin_aspekt` ; ses deux `parts` suivent (test I5). La relance « Falls ja: wie oft täglich? … Aussehen » reste une précision. | doublons 269 → 282 (+13 vrais : avec les relances de saignement de la variante `veraenderung`) |

**Le montage gelé ne voit pas encore l'effet du second** : `dedupeBySymptom` filtre les `parts` sur `SUCHT_MONTAGE` ; dans morbus-crohn, zoeliakie et chronische-pankreatitis, la végétative reste réduite à l'urine et `exigeAbsent` reste 37. En K3, sans `dedupeBySymptom`, sa partie selles portera `stuhlfrequenz` et r3 n'ajoutera pas la banque. Les réponses `akt-ausscheid-haeufigkeit` (3 cas) et `akt-ausscheid-aussehen` (akutes-nierenversagen) écrites au § 5 restent : inoffensives, et nécessaires tant que le montage est gelé. Hausses du fixture mises à jour, exactes : doublons 266 → 282, horsProfil 58 → 75. Sommet : `checkCoherence` 0, `checkBudgetFloor.mjs origin/main` 0, tous les `check*.mjs` 0 (sauf `checkProbeOverlap`, 8, informatif, inchangé), `checkCoherence.test.mjs` 0, `tsc` 0, `vitest --dir src/data` 337/337, gel intact.

## Non vérifié

- **La justesse clinique** des 130 profils et des 35 réponses : mon jugement, non relu (§ 7).
- **Aucune vérification à deux onglets** : le montage ne change pas (gel et INV-90) ; le simulant gagne 35 répliques que le Rollenskript lit dans `antworten`, non rejouées dans un navigateur.
- **`npx vitest run --dir src`** complet (job `build`) non lancé, seulement `src/data`. La CI réelle n'a pas tourné.
- **Le contenu publié** : `publishContent.mjs` republiera les 130 fiches (`profil` additif) au merge ; non rejoué.
- **`graphify update app/src`** : pas de graphe dans ce worktree.
