# Lot Q4 — composées d'`aktuell` (zoeliakie → malaria), garde anti-doublon, renvois, FreqBadge

Branche `feat/s3-q4-contenu`, base `origin/main` @ `0174bf6c`, puis fusion d'`origin/main` @ `ab235e57` (#85 S4-5 mergée) en `dcc2c3d2`. Contenu `98cb5d96` ; guide psy `b3423dc9` ; tests et gels de `cefa0f11` à `769af9eb` ; après fusion : `bf002ec3` (table unique des fréquences) et `d8c7d5e3` (ancre de mutation). **Statut : DONE_WITH_CONCERNS.** Tout est vert par code de sortie (§ 5). Les réserves sont au § 6 et dans « Non vérifié ». Une revue clinique doit suivre.

Incident : le disque s'est rempli pendant la batterie (ENOSPC). Les bundles esbuild de mes scripts d'analyse restaient dans `$TMPDIR`. `main` les a supprimés, et j'ai retiré les dossiers `fsp-*` laissés par les check interrompus à 05:43. La batterie a été relancée en entier après coup (§ 6) : les 11 échecs simultanés venaient du disque, sauf `checkProbeOverlap`, qui échoue déjà sur main (§ 6).

## 1. Composées d'`aktuell` — 47 traitées sur 25 cas

Mêmes règles qu'en Q3 :
- même signe : une question et sa relance ;
- signes différents : deux questions déclarées (`sucht`).

Compteur dans la trame jouée : 96 sur origin/main, **49** maintenant (+1 relance osteoporose, inchangée). Les 49 restantes commencent à endokarditis et vont à Q5. Le détail des coupes se lit par `git show 98cb5d96 -- app/src/data/seedCases.ts`.

## 2. Garde anti-doublon — une réplique jouée avant une question ne dit pas déjà ce qu'elle cherche

Quand la moitié d'une question était déjà dite par une réplique jouée plus haut, j'ai fait l'une de deux choses :
- retirer cette moitié de la question ;
- couper la phrase dans la réplique, comme `main` en Q3 (F.1).

Questions retirées ou réduites :

| Cas | Retiré | Déjà dit par |
|---|---|---|
| uterus-myomatosus | « Wie lange dauert Ihre Blutung » | le motif (neuf jours) |
| leistenhernie | « Geht das immer… » | la question suivante |
| schlafapnoe | « Sind Sie am Steuer eingenickt? » | `akt-allgemein-alltag` |
| influenza | la moitié « Fieber/Gliederschmerzen von Anfang an » | le motif |
| diabetes-typ1 | « Atmen schwerer » | `fach-pneumo-atemnot` (identique) |
| malaria | « Wann zurückgekommen » | déjà dit |
| metabolisches-syndrom | la moitié « Gewicht entwickelt » | dit trois fois |
| zoeliakie | « Nachts muss ich deswegen nicht aufstehen » (dans `akt-ausscheid-haeufigkeit`) | `fach-gastro-stuhl` (« Und nachts muss ich nicht raus ») |

Delir : j'avais d'abord retiré la question. Mais `fach-psych-tagesverlauf` revenait alors à sa place, avec le même doublon. La question est donc découpée, et ce sont `akt-verlauf` et `akt-einfluss` qui sont coupées.

Test `src/data/guides/reponseDoublon.test.ts` :
- il lit les signes avec `symptomsInText` ;
- sur les 130 cas, il est informatif, avec un plafond de 87 qui ne peut pas remonter (107 sur origin/main) ;
- sur les 29 cas relus par Q4, il est strict, sauf 6 faux positifs écrits avec leur raison (`ADMIS`) ;
- un contrôle vérifie que la lecture voit bien le défaut.

Limite : un signe propre au cas sans motif de lecture (`stuhl_nachts`, `kompression`) échappe au test. Ces doublons sont épinglés à la main dans `coherenceQ4.test.ts` : 33 tests sur 34 sont rouges avec le `seedCases.ts` d'origin/main, le test psy dépend du guide seul.

## 3. Renvois

- **psy (10 cas, guide)** : « Haben Sie schon etwas vorbereitet? » est posée juste après les plans. `followUpSucht` est mis à jour : `[[], [], ['suizidversuch'], [], ['selbstverletzung_wunsch'], ['selbstverletzung'], []]`. Cette relance cherche le même signe que la question mère, c'est-à-dire le plan et l'intention. L'ordre reste plans → préparatifs → tentative → NOTFALL. Test : `coherenceRevue.test.ts`.
- **opioidabhaengigkeit** : la question de l'overdose reçoit la relance « Falls ja: War das Absicht? », avec une réponse écrite (§ 4). L'overdose est retirée de la réponse `fach-psych-suizid`.
- **anorexia-nervosa** : les vomissements sont retirés d'`akt-einfluss`.
- **Sous-questions de Q2 reprises** :
  - mammakarzinom : « auf beiden Seiten » ;
  - morbus-crohn : « Wo genau? / Wie lange? », et le voyage est retiré de `veg-fieber` ;
  - karpaltunnel : « Um welche Uhrzeit? ».
- **Non reprise** : pankreaskarzinom. Le motif et `akt-einfluss` y répondent déjà, la reposer créerait deux doublons.

## 4. Réponses patient écrites, avec leur source

Tout le reste est fait de coupes dans des répliques existantes, sans texte nouveau.

| Cas · clé | Texte | Source |
|---|---|---|
| opioidabhaengigkeit · overdose | (zögert) Ja … einmal, vor vier Monaten. Da hat mich meine Frau kaum wach bekommen. Einen Rettungswagen hat sie nicht gerufen. Absicht war das nicht. | `vorerkrankungen[4]`, texte de main en Q3 |
| uterus-myomatosus · `akt-begleit` | Ja — mein Bauch ist dicker geworden, die Hosen kneifen. | `begleitsymptome[4]` |
| polymyalgia · `akt-begleit` | … ständig erschöpft und muss mich mehrmals am Tag hinlegen. | `begleit[4]` |
| achalasie · `akt-begleit` | … hinter dem Brustbein drückt es oft, eng und manchmal krampfartig, bis zwischen die Schulterblätter. | `begleit[1]` |
| diabetes-typ1 · `akt-begleit` | … nachts habe ich manchmal Wadenkrämpfe. | `begleit[6]` |
| akutes-nierenversagen · `pers-groesse` | 1,74 Meter, und ich wiege 79 Kilo. | `veg-gewicht` |

## 5. FreqBadge — `Case.frequency` lit la table des protocoles

J'ai repris le lien cas → pathologie de la PR #85, et `main` l'a accepté. #85 est mergée, et la fusion n'a eu aucun conflit. **Une seule table existe dans le dépôt : `src/data/frequencesProtocoles.ts`.** Mon script de calcul n'existe que dans le scratchpad.

`Case.frequency` reste le champ que lisent le badge, le tri et le programme. Il est désormais épinglé sur cette table dans `frequencesProtocoles.test.ts`, qui vérifie que `Case.frequency` est égal au total de la pathologie quand la source le compte. Ce test est rouge sur origin/main (`case-ulcus: expected 6 to be 16`).

**37 écarts corrigés** :

| Cas | Pathologie (source) | Avant | Après |
|---|---|---:|---:|
| case-ulcus | ulcus-gastritis | 6 | 16 |
| case-magenkarzinom | magenkarzinom | 15 | 12 |
| case-appendizitis | appendizitis | 14 | 13 |
| case-depression | depression | 15 | 30 |
| case-pyelonephritis | pyelonephritis | 14 | 13 |
| case-pavk | pavk | 20 | 18 |
| case-lyme | lyme-borreliose | 17 | 16 |
| case-osg-fraktur | osg-fraktur-distorsion | 12 | 10 |
| case-gicht | gicht-gichtanfall | 22 | 14 |
| case-multiple-sklerose | multiple-sklerose | 9 | 10 |
| case-reizdarm | reizdarm-funktionell | 7 | 10 |
| case-tvt | tvt | 25 | 8 |
| case-diabetes | diabetes-mellitus | 8 | 6 |
| case-copd | copd | 6 | 4 |
| case-migraene | migraene | 7 | 6 |
| case-asthma | asthma-bronchiale | 3 | 6 |
| case-hypothyreose | schilddruesenerkrankung | 0 | 6 |
| case-lungenembolie | lungenembolie | 14 | 4 |
| case-bph | benigne-prostatahyperplasie | 6 | 7 |
| case-morbus-crohn | ced | 3 | 5 |
| case-karpaltunnel | karpaltunnelsyndrom | 8 | 7 |
| case-gonarthrose | gonarthrose | 5 | 6 |
| case-struma | schilddruesenerkrankung | 2 | 6 |
| case-zoeliakie | zoeliakie-sprue | 6 | 7 |
| case-schenkelhalsfraktur | femurfraktur | 6 | 7 |
| case-alkoholentzug | alkoholabhaengigkeit | 6 | 4 |
| case-laktoseintoleranz | laktoseintoleranz | 8 | 7 |
| case-tia | tia | 6 | 4 |
| case-diabetes-typ1 | diabetes-mellitus | 14 | 6 |
| case-gastroenteritis | gastroenteritis | 6 | 7 |
| case-rheumatisches-fieber | rheumatisches-fieber | 9 | 8 |
| case-coxarthrose | koxarthrose | 12 | 8 |
| case-metabolisches-syndrom | metabolisches-syndrom | 7 | 6 |
| case-anorexia-nervosa | anorexia-nervosa | 7 | 5 |
| case-malaria | malaria | 6 | 5 |
| case-endokarditis | endokarditis | 5 | 4 |
| case-colitis-ulcerosa | ced | 2 | 5 |

Non touchés :
- 48 cas sans pathologie dans la source ;
- 24 cas dont la pathologie a un total `null` (pathologies rares, que la source ne compte pas).

Ces 72 cas gardent leur valeur actuelle, qui ne vient pas de la source. C'est à trancher par `main` (§ 6).

**INV-65** (`tests/invariants.apprentissage.test.ts`, exception de périmètre accordée par `main`) : les fréquences alignées déplacent la projection. Valeurs mesurées par une sonde temporaire, retirée depuis :
- au rythme proposé, la projection tombe le **30 oct.** ;
- au rythme actuel, elle tombe le **16 oct.**

L'examen du scénario « veto pédagogique », fixé jusqu'ici au 30 oct., tombait donc le jour même. Il est maintenant placé au **23 oct.**, à mi-chemin des deux dates : le rythme actuel tient l'examen, le rythme proposé le manque. `apresExamen === true` et la phrase « après ton examen du 23 oct. (au lieu du … ) » restent exigées, sans aucune assertion affaiblie, avec sept jours de marge de chaque côté.

**Mutation I6/INV-88** (`scripts/checkCoherence.test.mjs`) : l'ancre visait la réplique de zoeliakie coupée au § 2. Elle est alignée sur le nouveau texte, qui est unique dans le fichier, et la mutation fait toujours rougir la porte.

## 6. Mesures et vérifications (HEAD `d8c7d5e3`, arbre fusionné)

| Vérification | Résultat |
|---|---|
| `tsc -b` | exit 0 |
| `vitest run --dir src` | exit 0 — 188 fichiers, 1 966 tests |
| `npm run test:c6` | exit 0 — 15 fichiers, 165 tests |
| `node --test scripts/*.test.mjs` | exit 0 — 199/199 (1 échec avant l'alignement de l'ancre I6) |
| `npm run build` | exit 0 |
| `checkBudgetFloor.mjs origin/main` | exit 0 |
| `git merge-tree --write-tree origin/main HEAD` | exit 0, à jour avec `ab235e57` |
| 21 `check*.mjs` de la CI, plus `checkTermRegister --require-all` et `evalDoctopus --dry` | exit 0, sauf `checkProbeOverlap` |
| `checkProbeOverlap` (informatif en CI, `\|\| true`) | exit 1, **9 répétitions non marquées, autant sur main** : préexistant |
| `checkCoherence` (la porte) | exit 0 |

| Compteur | origin/main | Q4 |
|---|---:|---:|
| Composées d'`aktuell` (trame jouée) | 96 (+1) | 49 (+1) |
| Atomicité A / A2 / B | 360 / 41 / 106 | 326 / 37 / 96 (`--bless`, note `q4`) |
| `relu` | 84 | 83 (`--bless`) |
| Garde anti-doublon | 107 | 87 (plafond) |
| `doublonsMasques` (informatif) | 51 | 49 |
| `checkCaseQuestionAnswers` | 73 | 73 |

### Réserves

1. **72 cas sans fréquence sourcée** (§ 5). Le badge affiche pour eux une valeur que la source ne contient pas. À trancher par `main` : soit masquer le badge, soit garder la valeur héritée.
2. **Justesse clinique des `sucht`** : la porte ne la voit pas. Elle relève de la relecture clinique.
3. **Q8 non traité**, faute de temps après l'incident disque.

## 7. Doublons préexistants vus sans être traités (pour la revue clinique et Q5)

**a. Relevés à la main sur les cas Q4.** Ils sont invisibles pour la garde, parce que ce sont des signes propres au cas :

| Cas | Où | Ce qui est redit |
|---|---|---|
| itp | `akt-begleit` | Zahnfleisch, Nasenbluten |
| delir | `akt-begleit` | Tiere |
| delir | `akt-einfluss` | Brille |
| achalasie | `akt-beginn` | schleichend |
| rheumatisches-fieber | `akt-verlauf` | wandert |
| laktoseintoleranz | `akt-ausloeser` | latence |
| malaria | `akt-infekt-fieber` | Rhythmus |
| karpaltunnel | motif | nachts aufwachen |
| mammakarzinom | `fam-familie` | — |

Je n'avais pas consigné les autres observations faites à la main pendant la session interrompue par la panne disque, et je ne peux pas les reconstituer. La liste mécanique ci-dessous est complète pour les signes que la garde sait lire.

**b. Relevé mécanique complet** (`reponseDoublon.test.ts`, sortie `console.info`, 87 constats) :
- 6 sont sur des cas Q4 : ce sont les faux positifs admis, avec leur raison dans `ADMIS` ;
- 81 sont sur des cas hors Q4, à traiter en Q5 et après.

Format : cas · signe · sonde jouée avant → question du cas qui le redemande.

- case-myokardinfarkt · schwitzen · akt-begleit → « Waren Sie dabei kaltschweißig, und war Ihnen übel? »
- case-myokardinfarkt · uebelkeit · akt-begleit → « Waren Sie dabei kaltschweißig, und war Ihnen übel? »
- case-myokardinfarkt · angst · akt-begleit → « Hatten Sie dabei ein Gefühl von Angst oder sogar Todesangst? »
- case-appendizitis · uebelkeit · akt-begleit → « Ist Ihnen übel, oder mussten Sie erbrechen? »
- case-appendizitis · appetit · akt-begleit → « Haben Sie seit Beginn der Schmerzen komplett die Lust auf Essen verloren? »
- case-lyme · ausschlag · pers-hausarzt → « Seit wann haben Sie diese Rötung bemerkt, und wird sie größer? »
- case-lyme · ausschlag · akt-beginn → « Seit wann haben Sie diese Rötung bemerkt, und wird sie größer? »
- case-lyme · ausschlag · akt-infekt-herd → « Seit wann haben Sie diese Rötung bemerkt, und wird sie größer? »
- case-diabetes · juckreiz · akt-begleit → « Haben Sie Juckreiz oder einen Pilzbefall im Intimbereich oder im Mund bemerkt? »
- case-diabetes · sehstoerung · akt-begleit → « Sehen Sie zwischendurch verschwommen? »
- case-hyperthyreose · gewicht · pers-groesse → « Haben Sie abgenommen, obwohl Sie normal oder sogar mehr essen? »
- case-hyperthyreose · gewicht · akt-motiv → « Haben Sie abgenommen, obwohl Sie normal oder sogar mehr essen? »
- case-copd · husten · akt-beginn → « Husten Sie schon seit Jahren, fast jeden Morgen, oder ist der Husten neu aufgetreten? »
- case-herzinsuffizienz · gewicht · pers-groesse → « Haben Sie sich gewogen? »
- case-herzinsuffizienz · gewicht · akt-begleit → « Haben Sie sich gewogen? »
- case-herzinsuffizienz · gewicht · fach-kardio-brust → « Haben Sie sich gewogen? »
- case-tonsillitis · husten · akt-begleit → « Haben Sie zusätzlich zu den Halsschmerzen Husten, Schnupfen oder Heiserkeit? »
- case-lymphom · husten · akt-begleit → « Hatten Sie zusätzlich zum Fieber Halsschmerzen, Husten oder Brennen beim Wasserlassen — also Hinweise auf einen Infekt? »
- case-lymphom · husten · fach-onko-blutung → « Hatten Sie zusätzlich zum Fieber Halsschmerzen, Husten oder Brennen beim Wasserlassen — also Hinweise auf einen Infekt? »
- case-lymphom · miktion · veg-fieber → « Hatten Sie zusätzlich zum Fieber Halsschmerzen, Husten oder Brennen beim Wasserlassen — also Hinweise auf einen Infekt? »
- case-lymphom · miktion · veg-ausscheidung → « Hatten Sie zusätzlich zum Fieber Halsschmerzen, Husten oder Brennen beim Wasserlassen — also Hinweise auf einen Infekt? »
- case-lungenembolie · bewusstlos · akt-begleit → « Ist Ihnen kurz schwarz vor Augen geworden, oder sind Sie ohnmächtig geworden? »
- case-eug · schwindel · akt-motiv → « Ist Ihnen schwindelig oder schwarz vor Augen geworden — sind Sie schon einmal ohnmächtig geworden? »
- case-eug · schwindel · akt-begleit → « Ist Ihnen schwindelig oder schwarz vor Augen geworden — sind Sie schon einmal ohnmächtig geworden? »
- case-eug · bewusstlos · akt-begleit → « Ist Ihnen schwindelig oder schwarz vor Augen geworden — sind Sie schon einmal ohnmächtig geworden? »
- case-meningitis · uebelkeit · akt-begleit → « Haben Sie erbrochen — kam das Erbrechen im Schwall, ohne dass Ihnen vorher übel war? »
- case-bronchialkarzinom · husten · akt-veraend-was → « Hat sich Ihr Husten verändert — klingt er anders als Ihr gewohnter Raucherhusten, und seit wann genau? »
- case-bronchialkarzinom · husten · akt-beginn → « Hat sich Ihr Husten verändert — klingt er anders als Ihr gewohnter Raucherhusten, und seit wann genau? »
- case-bronchialkarzinom · husten · akt-veraend-blutung → « Hat sich Ihr Husten verändert — klingt er anders als Ihr gewohnter Raucherhusten, und seit wann genau? »
- case-bronchialkarzinom · husten · akt-ausloeser → « Hat sich Ihr Husten verändert — klingt er anders als Ihr gewohnter Raucherhusten, und seit wann genau? »
- case-bronchialkarzinom · husten · akt-frueher → « Hat sich Ihr Husten verändert — klingt er anders als Ihr gewohnter Raucherhusten, und seit wann genau? »
- case-rheumatoide-arthritis · fieber · veg-fieber → « Fühlen Sie sich müde und weniger leistungsfähig, und haben Sie erhöhte Temperaturen gemessen? »
- case-parkinson · sturz · akt-ausloeser → « Sind Sie schon einmal gestürzt? »
- case-parkinson · stuhl · fach-neuro-blase → « Haben Sie regelmäßig Stuhlgang, und seit wann besteht die Verstopfung? »
- case-struma · orthopnoe · akt-einfluss → « Bekommen Sie schlecht Luft, besonders wenn Sie flach liegen? »
- case-schenkelhalsfraktur · bewusstlos · akt-ausloeser → « Waren Sie kurz bewusstlos? »
- case-leistenhernie · stuhl · akt-veraend-was → « Müssen Sie beim Stuhlgang oder beim Wasserlassen stark pressen? »
- case-schlafapnoe · schlaf · akt-motiv → « Schlafen Sie ausreichend lange? »
- case-achalasie · reise · veg-fieber → « Waren Sie jemals in Mittel- oder Südamerika? »
- case-achalasie · reise · veg-fieber → « Waren Sie jemals in Mittel- oder Südamerika? »
- case-hws-diskusprolaps · taubheit · akt-begleit → « Haben Sie Kribbeln, ein pelziges Gefühl oder Kraftverlust in der Hand — rutschen Ihnen Gegenstände aus der Hand? »
- case-gastroenteritis · stuhl · akt-motiv → « Wie sieht Ihr Stuhl aus — wässrig oder breiig, welche Farbe, riecht er auffällig, schwimmt er oben? »
- case-gastroenteritis · stuhl · akt-verlauf → « Wie sieht Ihr Stuhl aus — wässrig oder breiig, welche Farbe, riecht er auffällig, schwimmt er oben? »
- case-gastroenteritis · stuhl · akt-einfluss → « Wie sieht Ihr Stuhl aus — wässrig oder breiig, welche Farbe, riecht er auffällig, schwimmt er oben? »
- case-endokarditis · miktion · akt-infekt-herd → « War der Urin verfärbt? Brennt es beim Wasserlassen, oder haben Sie Schmerzen in der Flanke? »
- case-anaphylaxie · bewusstlos · akt-einfluss → « Ist Ihnen schwindlig oder schwarz vor Augen geworden, haben Sie Herzrasen? Sind Sie ohnmächtig geworden? »
- case-pertussis · husten · akt-beginn → « Wie hat der Husten angefangen — wie bei einer Erkältung, bevor die Anfälle kamen? »
- case-myokarditis · herzrasen · akt-begleit → « Wie äußert sich das Herzstolpern genau — ein Aussetzer mit anschließend kräftigem Schlag, oder anhaltendes Herzrasen? Auch in Ruhe? »
- case-myokarditis · bewusstlos · akt-motiv → « Was ist gestern beim Training genau passiert: Wurde es Ihnen schwarz vor Augen, waren Sie bewusstlos, sind Sie gestürzt? »
- case-ptbs · kopfschmerz · akt-motiv → « Ist der Kopfschmerz morgens am stärksten, nimmt er im Liegen zu, oder mussten Sie sich schon nüchtern erbrechen? »
- case-hueftkopfnekrose · stuhl · veg-ausscheidung → « Wie geht es Ihrem Darm im Moment — Durchfall, Blut im Stuhl, ein neuer Schub? »
- case-glomerulonephritis · kopfschmerz · akt-motiv → « Haben Sie Kopfschmerzen, Sehstörungen oder Luftnot bemerkt? »
- case-glomerulonephritis · kopfschmerz · akt-beginn → « Haben Sie Kopfschmerzen, Sehstörungen oder Luftnot bemerkt? »
- case-glomerulonephritis · kopfschmerz · akt-verlauf → « Haben Sie Kopfschmerzen, Sehstörungen oder Luftnot bemerkt? »
- case-glomerulonephritis · kopfschmerz · akt-einfluss → « Haben Sie Kopfschmerzen, Sehstörungen oder Luftnot bemerkt? »
- case-nhl · husten · akt-veraend-blutung → « Haben Sie Husten, Luftnot, Schluckbeschwerden oder Herzrasen bemerkt? »
- case-nhl · husten · akt-ausloeser → « Haben Sie Husten, Luftnot, Schluckbeschwerden oder Herzrasen bemerkt? »
- case-nhl · husten · akt-begleit → « Haben Sie Husten, Luftnot, Schluckbeschwerden oder Herzrasen bemerkt? »
- case-nhl · atemnot · akt-begleit → « Haben Sie Husten, Luftnot, Schluckbeschwerden oder Herzrasen bemerkt? »
- case-nhl · schluck · akt-veraend-was → « Haben Sie Husten, Luftnot, Schluckbeschwerden oder Herzrasen bemerkt? »
- case-nhl · schluck · akt-begleit → « Haben Sie Husten, Luftnot, Schluckbeschwerden oder Herzrasen bemerkt? »
- case-nhl · herzrasen · akt-begleit → « Haben Sie Husten, Luftnot, Schluckbeschwerden oder Herzrasen bemerkt? »
- case-allergische-rhinitis · husten · akt-beginn → « Haben Sie vor allem nachts Husten oder ein Pfeifen beim Ausatmen? »
- case-allergische-rhinitis · juckreiz · akt-motiv → « Jucken, tränen oder röten sich Ihre Augen dabei? Juckt es auch im Gaumen oder in den Ohren? »
- case-allergische-rhinitis · juckreiz · akt-begleit → « Jucken, tränen oder röten sich Ihre Augen dabei? Juckt es auch im Gaumen oder in den Ohren? »
- case-typhus · stuhl · akt-infekt-herd → « Hatten Sie zuerst Verstopfung oder Durchfall? »
- case-typhus · stuhl · akt-frueher → « Hatten Sie zuerst Verstopfung oder Durchfall? »
- case-typhus · ausschlag · akt-infekt-herd → « Ist Ihnen ein Ausschlag am Bauch aufgefallen, blassrote Flecken? »
- case-obstipation · stimmung · med-regelmaessig → « Wie geht es Ihnen mit der Stimmung, seit Ihre Frau gestorben ist? Wie kommen Sie zu Hause zurecht? »
- case-sturz-im-alter · schwindel · akt-anfall-ablauf → « Erzählen Sie mir bitte ganz genau, was passiert ist: Was haben Sie gemacht, als Sie gestürzt sind — und wie sind Sie gefallen: gestolpert, weggeknickt, schwindelig, schwarz vor Augen? »
- case-sturz-im-alter · schwindel · akt-begleit → « Erzählen Sie mir bitte ganz genau, was passiert ist: Was haben Sie gemacht, als Sie gestürzt sind — und wie sind Sie gefallen: gestolpert, weggeknickt, schwindelig, schwarz vor Augen? »
- case-sturz-im-alter · sturz · akt-einfluss → « Sind Sie in den letzten zwölf Monaten schon einmal gestürzt oder beinahe gestürzt — auch wenn nichts passiert ist? »
- case-sturz-im-alter · sturz · akt-frueher → « Sind Sie in den letzten zwölf Monaten schon einmal gestürzt oder beinahe gestürzt — auch wenn nichts passiert ist? »
- case-sturz-im-alter · sturz · fach-neuro-koordination → « Sind Sie in den letzten zwölf Monaten schon einmal gestürzt oder beinahe gestürzt — auch wenn nichts passiert ist? »
- case-sturz-im-alter · sturz · fach-neuro-anfall → « Sind Sie in den letzten zwölf Monaten schon einmal gestürzt oder beinahe gestürzt — auch wenn nichts passiert ist? »
- case-bauchaortenaneurysma · bewusstlos · akt-motiv → « Ist Ihnen schwarz vor Augen geworden, sind Sie zusammengebrochen oder haben Sie plötzlich geschwitzt? »
- case-bauchaortenaneurysma · bewusstlos · akt-ausloeser → « Ist Ihnen schwarz vor Augen geworden, sind Sie zusammengebrochen oder haben Sie plötzlich geschwitzt? »
- case-urtikaria · schluck · akt-veraend-was → « Haben Sie Atemnot, ein Engegefühl im Hals, Heiserkeit, ein Pfeifen beim Atmen oder Schwierigkeiten beim Schlucken? »
- case-urtikaria · schwindel · akt-begleit → « Ist Ihnen schwindelig, haben Sie Herzrasen, waren Sie kurz weggetreten? Haben Sie Bauchkrämpfe, Übelkeit oder Durchfall? »
- case-urtikaria · stuhl · akt-veraend-was → « Ist Ihnen schwindelig, haben Sie Herzrasen, waren Sie kurz weggetreten? Haben Sie Bauchkrämpfe, Übelkeit oder Durchfall? »
- case-perniziose-anaemie · taubheit · akt-motiv → « Kribbeln Ihre Füße auf beiden Seiten gleich, so als würden Strümpfe einschlafen? »
- case-perniziose-anaemie · taubheit · akt-beginn → « Kribbeln Ihre Füße auf beiden Seiten gleich, so als würden Strümpfe einschlafen? »
- case-perniziose-anaemie · taubheit · akt-verlauf → « Kribbeln Ihre Füße auf beiden Seiten gleich, so als würden Strümpfe einschlafen? »
- case-perniziose-anaemie · taubheit · akt-einfluss → « Kribbeln Ihre Füße auf beiden Seiten gleich, so als würden Strümpfe einschlafen? »
- case-perniziose-anaemie · gedaechtnis · akt-begleit → « Sind Sie in letzter Zeit vergesslicher, gereizter oder niedergeschlagener als sonst? »
- case-arterielle-hypertonie · schwitzen · veg-schuettelfrost → « Haben Sie anfallsartige Schweißausbrüche mit Herzrasen und Blässe, oder vertragen Sie Wärme schlecht? »
- case-arterielle-hypertonie · herzrasen · veg-schuettelfrost → « Haben Sie anfallsartige Schweißausbrüche mit Herzrasen und Blässe, oder vertragen Sie Wärme schlecht? »

## Non vérifié

- Les parcours navigateur (`parcours-candidat`, `parcours-mutations`, `e2e/programmeInvariants`, `carteCouverture390`) n'ont pas été lancés. Ils demandent un serveur, et la marge disque est mince. Or les fréquences changent l'ordre des cas et le plan du jour lu par la page Programme de #85 : c'est à vérifier en CI.
- La justesse clinique des déclarations `sucht` et des coupes : revue clinique à faire.
- Le registre de la série (`serie3-avancement.md`) n'a pas été mis à jour : il est tenu par `main`.
