# Lot S3 « Fachwissen au plancher » (points 1a et 1b)

Branche `feat/s3-fw-plancher-r`, worktree `doctopus-s3-fwp`, rebasée sur origin/main `66c7235b` (avec #100 et #101).

## 0. Hypothèses et décisions

- **Reprise de `478e88c5`.** Le commit de la session précédente est jugé tenable et repris (cherry-pick sans le
  trailer). Il couvre les quatre exigences : les formes d'explication au patient, l'impératif en « . » accepté, la
  réponse entre parenthèses en défaut et le compteur de l'`examinerSheet`. Il va un peu plus loin : il compte aussi
  « vs. » et les questions sans verbe conjugué. Ce second ajout est gardé, car il attrape « Welche Diagnostik in welcher
  Reihenfolge? ». En contrepartie, il dépend d'une liste fermée de verbes ; « hält » y manquait et faisait passer une
  question complète de zoeliakie pour télégraphique. Corrigé en TDD (`876a16c5`) plutôt qu'en réécrivant la question.
- **« Könnten Sie … erklären »** ne compte que si la question vise le patient (« Könnten Sie der Patientin das
  Karpaltunnelsyndrom erklären? »). « Können Sie die Operation erklären? » s'adresse au jury : le test le garde hors du
  compte.
- **Les cinq « limites »** (pertussis, alkoholentzug, bronchialkarzinom, anorexia-nervosa, sturz-im-alter) gardent leur
  question de conseil, qui teste un savoir de jury. Une explication au patient est ajoutée à côté.
- **fw-bandscheibenvorfall** n'a pas été touché (périmètre de #100). Depuis la fusion de #100, il a une explication au
  patient.
- **Rebase.** #100 a été fusionnée pendant le lot et touchait la même ligne du budget. La branche a été rebasée, pas
  fusionnée ; elle n'avait pas encore été poussée. Au premier commit, le budget mesuré était de 31 (le message du
  commit dit encore « 47 → 32 »).

## 1. Mesures (objets chargés par `scripts/loadCases.mjs`)

| Compteur | origin/main, ancienne règle | Nouvelle règle, avant contenu | Après |
|---|---|---|---|
| Fachwissen sans explication au patient | 45 | 31 | **0** |
| `examinerQuestions` mal formées | 199 | 38 | **0** |
| Questions d'`examinerSheet` télégraphiques | non mesuré | 83 (82 après le correctif « hält ») | **0** |
| Fachwissen sous 5 questions | 0 | 0 | 0 |

Ce que comptent les 38 `examinerQuestions` : 15 réponses entre parenthèses (dont 2 en « — Und? »), 13 questions de
moins de 4 mots (dont le « vs. ») et 10 questions sans verbe conjugué.

**Questions par Fachwissen** (`askedInExam`) : de 1 890 à 1 921. Le minimum passe de 5 (pankreatitis) à 6, et le
plancher des 5 reste strict. Pour les 31 fiches touchées : leberzirrhose 12→13 · khk 6→7 · pankreatitis 5→6 · gib 9→10
· ulcus 7→8 · appendizitis 11→12 · depression 10→11 · pneumonie 13→14 · pavk 10→11 · lyme 12→13 · gicht 15→16 ·
schlaganfall 11→12 · hyperthyreose 15→16 · erysipel 15→16 · bronchialkarzinom 14→15 · rheumatoide-arthritis 16→17 ·
morbus-crohn 17→18 · struma 15→16 · schenkelhalsfraktur 18→19 · alkoholentzug 18→19 · akutes-nierenversagen 19→20 ·
hws-diskusprolaps 16→17 · gastroenteritis 16→17 · anorexia-nervosa 14→15 · endokarditis 15→16 ·
reaktive-arthritis 13→14 · pertussis 10→11 · chronische-pankreatitis 14→15 · typhus 13→14 · sturz-im-alter 13→14 ·
opioidabhaengigkeit 12→13. Les 103 autres ne bougent pas.

## 2. Budgets

| Fixture | Clé | origin/main | Après |
|---|---|---|---|
| `fachwissen-floor-budget.json` | sansExplication | 45 | **0** |
| | questionsMalFormees | 199 | **0** |
| | sheetMalFormees | (nouvelle) | **0** |
| `atomicity-budget.json` (`--bless`) | B | 54 | 53 |
| | D2 | 453 | 450 |

Le budget d'atomicité baisse parce que des salves de l'`examinerSheet` (« Warum ein CT? Und mit oder ohne
Kontrastmittel? ») sont devenues une seule question. Sans cette baisse, deux tests de mutation de
`checkQuestionAtomicity.test.mjs` restaient verts à tort : la mutation +1 restait sous le budget.

## 3. Explications au patient ajoutées (31)

Chaque explication est la dernière question de l'`askedInExam` de sa fiche. La réponse est donnée entre guillemets, dans
la bouche du médecin. Les faits viennent du cas lié (`patientSheet`, `medicalView.patientWorte`), par exemple :

- le diabète de type 1 et l'insuline réduite de la patiente hyperthyroïdienne ;
- le Ramipril/HCT ajouté il y a trois mois (gicht) ;
- l'ASS 100 à remplacer par un anticoagulant (schlaganfall) ;
- l'épouse enceinte de 31 SA qui tousse (pertussis) ;
- le bac (anorexia) ;
- l'Auslandssemester avant l'immunosuppression (morbus-crohn) ;
- Amlodipine, Tamsulosine, Zolpidem et la cataracte (sturz).

Les répliques n'ont aucun Fachbegriff, sauf les noms de maladie d'usage courant (Borreliose, Keuchhusten,
Morbus Crohn). Elles ne font aucune fausse promesse (« wahrscheinlich », « meist », « Sicher sagen kann ich es erst
nach … », « nicht immer ganz »).

| Fachwissen | Frage |
|---|---|
| leberzirrhose | Wie erklären Sie dem Patienten die Erkrankung und warum er ganz auf Alkohol verzichten muss? |
| khk | Wie erklären Sie dem Patienten die Verdachtsdiagnose und die weitere Abklärung? |
| pankreatitis | Wie erklären Sie der Patientin die Erkrankung und die Behandlung? |
| gib | Wie erklären Sie dem Patienten den schwarzen Stuhl und die Magenspiegelung? |
| ulcus | Wie erklären Sie dem Patienten die Diagnose und die Behandlung? |
| appendizitis | Wie erklären Sie dem Patienten die Diagnose und die Operation? |
| depression | Wie erklären Sie dem Patienten seine Erkrankung? |
| pneumonie | Wie erklären Sie dem Patienten, warum er stationär aufgenommen wird? |
| pavk | Wie erklären Sie dem Patienten die Erkrankung und was er selbst tun kann? |
| lyme | Wie erklären Sie der Patientin die Diagnose und die Behandlung? |
| gicht | Wie erklären Sie dem Patienten den Gichtanfall und wie er weiteren Anfällen vorbeugt? |
| schlaganfall | Wie erklären Sie dem Patienten den Schlaganfall und warum Sie keine Zeit verlieren dürfen? |
| hyperthyreose | Wie erklären Sie der Patientin die Schilddrüsenüberfunktion und die Behandlung? |
| erysipel | Wie erklären Sie dem Patienten die Erkrankung und warum auch der Fußpilz behandelt wird? |
| bronchialkarzinom | Der Patient fragt, ob er Lungenkrebs hat. Was antworten Sie? |
| rheumatoide-arthritis | Wie erklären Sie dem Patienten die Erkrankung und warum die Behandlung früh beginnen muss? |
| morbus-crohn | Wie erklären Sie dem Patienten die Diagnose und was sie für seinen Alltag bedeutet? |
| struma | Wie erklären Sie der Patientin den Befund und das weitere Vorgehen? |
| schenkelhalsfraktur | Wie erklären Sie der Patientin die Verletzung und die Operation? |
| alkoholentzug | Wie erklären Sie dem Patienten die Entzugsbehandlung? |
| akutes-nierenversagen | Wie erklären Sie dem Patienten die Nierenschwäche und die Änderung seiner Tabletten? |
| hws-diskusprolaps | Wie erklären Sie dem Patienten die Diagnose und wann eine Operation nötig wird? |
| gastroenteritis | Wie erklären Sie dem Patienten die Ursache des Durchfalls und was er zu Hause beachten muss? |
| anorexia-nervosa | Wie erklären Sie der Patientin, warum Sie sich Sorgen machen, obwohl sie sich gesund fühlt? |
| endokarditis | Wie erklären Sie dem Patienten die Erkrankung und warum er mehrere Wochen behandelt werden muss? |
| reaktive-arthritis | Wie erklären Sie der Patientin, warum ihre Gelenke nach der Halsentzündung schmerzen? |
| pertussis | Wie erklären Sie dem Patienten, warum er ein Antibiotikum bekommt, obwohl der Husten bleibt? |
| chronische-pankreatitis | Wie erklären Sie der Patientin die Erkrankung und warum sie keinen Alkohol mehr trinken darf? |
| typhus | Wie erklären Sie dem Patienten die Diagnose und warum er isoliert wird? |
| sturz-im-alter | Wie erklären Sie dem Patienten, warum er gestürzt ist und was sich jetzt ändert? |
| opioidabhaengigkeit | Wie erklären Sie dem Patienten die Abhängigkeit und die Behandlung, ohne ihm Vorwürfe zu machen? |

## 4. Questions du jury corrigées (105 textes, 120 occurrences)

Le remplacement est borné au bloc du cas et compté : le script refuse tout écart entre les occurrences attendues dans
les objets chargés et celles trouvées dans le texte. Un même texte, dans `examinerQuestions` et dans
`examinerSheet`, reçoit la même réécriture. Règles appliquées :

- une phrase complète qui finit par « ? » (« . » pour une consigne) ;
- aucune réponse entre parenthèses ;
- la relance « Und …? » rendue autonome, parce que le simulant la lit sans contexte ;
- le genre du patient vérifié : « Wann operieren Sie die Patientin / den Patienten? ».

| Cas | Avant | Après |
|---|---|---|
| angina-pectoris | Welche Diagnostik in welcher Reihenfolge? | Welche Diagnostik veranlassen Sie, und in welcher Reihenfolge? |
|  | Verdachtsdiagnose und Begründung? | Wie lautet Ihre Verdachtsdiagnose, und wie begründen Sie sie? |
|  | Nicht-kardiale Differenzialdiagnosen? | Welche nicht-kardialen Differenzialdiagnosen kommen in Betracht? |
| pankreatitis | Zwei häufigste Ursachen? | Was sind die zwei häufigsten Ursachen einer akuten Pankreatitis? |
|  | Wichtigster Laborwert? | Welcher Laborwert ist für die Diagnose am wichtigsten? |
| gib | Was ist Meläna? | Was versteht man unter einer Meläna? |
|  | Häufigste Ursachen? | Was sind die häufigsten Ursachen einer oberen GI-Blutung? |
|  | Vorgehen beim kreislaufinstabilen Patienten? | Wie gehen Sie beim kreislaufinstabilen Patienten vor? |
|  | Verdachtsdiagnose und häufigste Ursachen? | Wie lautet Ihre Verdachtsdiagnose, und was sind die häufigsten Ursachen? |
| divertikulitis | Warum keine Koloskopie im akuten Schub? | Warum machen Sie im akuten Schub keine Koloskopie? |
|  | Welche Differenzialdiagnosen? | Welche Differenzialdiagnosen kommen in Betracht? |
|  | Wann operieren Sie? | Wann operieren Sie die Patientin? |
| cholezystitis | Wann operieren Sie? | Wann operieren Sie die Patientin? |
| gallenkolik | Wann operieren Sie? | Wann operieren Sie den Patienten? |
| kolorektales-ca | Screening-Empfehlung Koloskopie? | Was empfehlen Sie zur Vorsorgekoloskopie? |
|  | Was ist CEA? | Was ist CEA, und wozu bestimmen Sie es? |
|  | Wie stagen Sie? | Wie führen Sie das Staging durch? |
|  | Verdachtsdiagnose und Warnzeichen? | Wie lautet Ihre Verdachtsdiagnose, und welche Warnzeichen hat der Patient? |
|  | Wie behandeln Sie? | Wie behandeln Sie den Patienten? |
| gerd | Wie behandeln Sie? | Wie behandeln Sie die Patientin? |
| ulcus | Wie behandeln Sie? | Wie behandeln Sie den Patienten? |
| oesophaguskarzinom | Risikofaktoren des Ösophaguskarzinoms? | Welche Risikofaktoren des Ösophaguskarzinoms kennen Sie? |
|  | Adeno- vs. Plattenepithelkarzinom? | Wie unterscheiden sich Adeno- und Plattenepithelkarzinom? |
|  | Palliative Optionen? | Welche palliativen Optionen gibt es? |
|  | Welche palliativen Optionen? | Welche palliativen Optionen gibt es? |
|  | Verdachtsdiagnose und Alarmkonstellation? | Wie lautet Ihre Verdachtsdiagnose, und welche Alarmzeichen sehen Sie? |
|  | Diagnostik und Staging? | Wie gehen Sie bei Diagnostik und Staging vor? |
| magenkarzinom | Was ist Ihre Verdachtsdiagnose und welche Differenzialdiagnosen stellen Sie (z. B. Gallenwegs-, Gallenblasen-, Pankreaskarzinom, Ulcus ventriculi)? | Was ist Ihre Verdachtsdiagnose, und welche Differenzialdiagnosen stellen Sie? |
|  | Warum ein CT bzw. Röntgen-Thorax — welche Metastasen suchen Sie (Lungen-, Lebermetastasen)? | Warum veranlassen Sie ein CT bzw. ein Röntgen des Thorax, und welche Metastasen suchen Sie? |
|  | Warum ein CT bzw. Röntgen des Thorax? | Warum veranlassen Sie ein CT bzw. ein Röntgen des Thorax? |
|  | Was ist Iberogast (vom Hausarzt verordnet)? | Der Hausarzt hat Iberogast verordnet. Was ist das? |
|  | Was ist neben der Diagnostik noch wichtig (psychoonkologische Unterstützung)? | Was ist für den Patienten neben der Diagnostik noch wichtig? |
| appendizitis | Welche Laborwerte möchten Sie anfordern? Welche Informationen liefert ein Blutbild (Leukozyten, Erythrozyten, Thrombozyten)? | Welche Laborwerte möchten Sie anfordern? Welche Informationen liefert ein Blutbild? |
|  | Klären Sie den Patienten über eine laparoskopische Appendektomie auf (Stichwort: Schlüssellochoperation). | Klären Sie den Patienten über eine laparoskopische Appendektomie auf. |
|  | Welche Differenzialdiagnosen? | Welche Differenzialdiagnosen kommen in Betracht? |
| depression | Worauf müssen Sie achten, bevor Sie ein Antidepressivum verordnen (bipolare Störung, EKG/QTc)? | Worauf müssen Sie achten, bevor Sie ein Antidepressivum verordnen? |
|  | Welches standardisierte Screening-Instrument verwenden Sie? (PHQ-9) | Welches standardisierte Screening-Instrument verwenden Sie? |
| pneumonie | Was erwarten Sie bei der körperlichen Untersuchung (Inspektion, Palpation, Perkussion, Auskultation)? | Was erwarten Sie bei der körperlichen Untersuchung? |
|  | Welche Therapie und welches Antibiotikum bei Penicillinallergie? | Wie behandeln Sie, und welches Antibiotikum geben Sie bei Penicillinallergie? |
| pyelonephritis | Warum eine Pyelonephritis und nicht eine Zystitis? | Warum denken Sie an eine Pyelonephritis und nicht an eine Zystitis? |
|  | Welche Spasmolytika? | Welche Spasmolytika setzen Sie ein? |
|  | Welches Spasmolytikum? | Welches Spasmolytikum setzen Sie ein? |
|  | Welches Analgetikum — Achtung Novalginallergie? | Welches Analgetikum geben Sie bei ihrer Novalginallergie? |
| multiple-sklerose | Wie lautet Ihre Verdachtsdiagnose und welche Differenzialdiagnosen kommen in Betracht? (Spinalkanalstenose, Bandscheibenvorfall, Polyneuropathie, pAVK, Wirbelsäulenfraktur, Migräne, Hypothyreose, Vitamin-B12-Mangel) | Wie lautet Ihre Verdachtsdiagnose, und welche Differenzialdiagnosen kommen in Betracht? |
| zystitis | Warum eine Zystitis und nicht eine Pyelonephritis? | Warum denken Sie an eine Zystitis und nicht an eine Pyelonephritis? |
|  | Warum kein Ciprofloxacin? | Warum geben Sie kein Ciprofloxacin? |
| migraene | Und wie eine Borreliose? Wie eine FSME? | Wie schließen Sie eine Borreliose und eine FSME aus? |
| leistenhernie | Wie wurde die Hernie behandelt? (Frage an einen Patienten mit Leistenhernie in der Vorgeschichte — Stuttgart, 15.05.2023) | Wie wurde die frühere Leistenhernie des Patienten behandelt? |
| hws-diskusprolaps | Woran müssen Sie bei Schmerzen mit Ausstrahlung in den Arm unbedingt auch denken? (Angina pectoris, koronare Herzkrankheit) | Woran müssen Sie bei Schmerzen mit Ausstrahlung in den Arm unbedingt auch denken? |
| anaphylaxie | Warum nicht zuerst Kortison und ein Antihistaminikum? | Warum geben Sie nicht zuerst Kortison und ein Antihistaminikum? |
| myokarditis | Die wichtigste Komplikation beim rheumatischen Fieber? | Was ist die wichtigste Komplikation beim rheumatischen Fieber? |
| ptbs | Welche Untersuchungen führen Sie bei dieser Patientin durch? — Und? (neurologische Untersuchung) | Welche Untersuchungen führen Sie bei dieser Patientin durch? |
|  | Haben Sie andere Differenzialdiagnosen? — Und? (Panikattacke, Depression, Hypothyreose/Hyperthyreose, Anämie) | Welche weiteren Differenzialdiagnosen kommen in Betracht? |
| somatoforme-schmerzstoerung | Ist das Psychosomatik? | Halten Sie die Beschwerden für psychosomatisch? |
| aortendissektion | Warum kein Vasodilatator ohne Betablocker? | Warum geben Sie keinen Vasodilatator ohne Betablocker? |
| epilepsie | Warum ein EKG bei einem Krampfanfall? | Warum schreiben Sie bei einem Krampfanfall ein EKG? |
| basaliom | Was tun Sie, wenn der Tumor im Schnittrand liegt (R1)? | Was tun Sie, wenn der Tumor bis in den Schnittrand reicht? |
| pavk | Verdachtsdiagnose und Begründung? | Wie lautet Ihre Verdachtsdiagnose, und wie begründen Sie sie? |
| lyme | Warum Lyme-Borreliose? | Warum denken Sie an eine Lyme-Borreliose? |
| bandscheibenvorfall | Ihre Verdachtsdiagnose? | Wie lautet Ihre Verdachtsdiagnose? |
|  | Welche Differenzialdiagnosen? | Welche Differenzialdiagnosen kommen in Betracht? |
|  | Warum MRT und kein Röntgen — und wann? | Warum veranlassen Sie ein MRT und kein Röntgen, und wann? |
| gicht | Und die Dauertherapie? | Wie sieht die Dauertherapie aus? |
| reizdarm | Und eine Laktoseintoleranz? | Wie schließen Sie eine Laktoseintoleranz aus? |
|  | Warum eine digital-rektale Untersuchung? | Warum führen Sie eine digital-rektale Untersuchung durch? |
| schlaganfall | Warum? | Was spricht für diese Diagnose? |
|  | Welche Sekundärprophylaxe bei diesem Patienten? | Welche Sekundärprophylaxe wählen Sie bei diesem Patienten? |
| herzinsuffizienz | Welche Therapie gegen das Vorhofflimmern? Warum Apixaban und nicht Marcumar? | Wie behandeln Sie das Vorhofflimmern, und warum wählen Sie Apixaban statt Marcumar? |
| nierenkolik | Warum ein CT? Und mit oder ohne Kontrastmittel? | Warum veranlassen Sie ein CT, und mit oder ohne Kontrastmittel? |
|  | Welche Analgetika? Welche Spasmolytika? | Welche Analgetika und welche Spasmolytika setzen Sie ein? |
|  | Welches Antibiotikum, und wie lange? | Welches Antibiotikum geben Sie, und wie lange? |
| tonsillitis | Warum ein Röntgen-Thorax bei einer Halsentzündung? | Warum veranlassen Sie bei einer Halsentzündung ein Röntgen-Thorax? |
| lymphom | Und laborchemisch? | Wie unterscheiden Sie die beiden laborchemisch? |
| karpaltunnel | Welche Tests genau? | Welche klinischen Tests führen Sie genau durch? |
|  | Was noch? | Was veranlassen Sie darüber hinaus? |
|  | Und welches Labor? | Welche Laborwerte bestimmen Sie? |
| panikstoerung | Und gegenüber einer generalisierten Angststörung? | Wie grenzen Sie die Patientin gegenüber einer generalisierten Angststörung ab? |
| hepatitis-b | Und eine alkoholische Hepatitis? | Kommt auch eine alkoholische Hepatitis in Betracht? |
| schenkelhalsfraktur | Und die Aufklärung über die Hüftoperation? | Klären Sie die Patientin bitte auch über die Hüftoperation auf. |
| ulcus-cruris | Wann biopsieren Sie? | Wann entnehmen Sie eine Biopsie? |
| commotio | Warum kein Tumor? | Warum denken Sie nicht an einen Tumor? |
| itp | Und das von-Willebrand-Syndrom? | Wie grenzen Sie das von-Willebrand-Syndrom ab? |
|  | Wozu die Sonographie des Abdomens? | Wozu dient die Sonographie des Abdomens? |
| uterus-myomatosus | Wozu dienen GnRH-Analoga? | Wozu dienen GnRH-Analoga bei Myomen? |
| polymyalgia | Und gegen eine Fibromyalgie? | Wie grenzen Sie die Erkrankung gegen eine Fibromyalgie ab? |
| spinalkanalstenose | Und die Polyneuropathie? | Wie grenzen Sie die Polyneuropathie ab? |
| influenza | Besteht eine Meldepflicht? | Besteht für die Influenza eine Meldepflicht? |
| metabolisches-syndrom | Und das Cushing-Syndrom? | Wie schließen Sie ein Cushing-Syndrom aus? |
| covid19 | Ist COVID-19 meldepflichtig? | Ist eine COVID-19-Erkrankung meldepflichtig? |
| chronische-pankreatitis | Welche Bildgebung, in welcher Reihenfolge? Wozu die ERCP? | Welche Bildgebung veranlassen Sie in welcher Reihenfolge, und wozu dient die ERCP? |
| nephrotisches-syndrom | Wann antikoagulieren Sie? | Wann antikoagulieren Sie den Patienten? |
|  | Und die kausale Therapie? | Wie sieht die kausale Therapie aus? |
| akute-leukaemie | Welches Antibiotikum? Und warum nicht Piperacillin/Tazobactam? | Welches Antibiotikum geben Sie, und warum nicht Piperacillin/Tazobactam? |
| hueftkopfnekrose | Wozu das CT? | Wozu veranlassen Sie das CT? |
| nhl | Was bedeutet R-CHOP? | Wofür steht das Schema R-CHOP? |
| adnexitis | Labor — welche Parameter? Und welche Abstriche? | Welche Laborparameter bestimmen Sie, und welche Abstriche nehmen Sie ab? |
|  | Und die Nachsorge? | Wie sieht die Nachsorge aus? |
| typhus | Warum die Blutkulturen vor dem Antibiotikum? | Warum nehmen Sie die Blutkulturen vor dem Antibiotikum ab? |
|  | Wie behandeln Sie? | Wie behandeln Sie den Patienten? |
|  | Warum nicht gleich Ciprofloxacin? | Warum geben Sie nicht gleich Ciprofloxacin? |
| lumboischialgie | Warum kein Paracetamol, und warum keine Opioide? | Warum geben Sie kein Paracetamol und keine Opioide? |
| perikarditis | Warum kein Kortison? | Warum geben Sie kein Kortison? |
| hodentorsion | Welche Spätfolgen und welche Nachsorge? | Welche Spätfolgen drohen, und wie sieht die Nachsorge aus? |
| psoriasis | Und für die Haut? | Welche Differenzialdiagnosen bedenken Sie für die Haut? |
| urtikaria | Stationär oder nach Hause? | Nehmen Sie die Patientin stationär auf, oder kann sie nach Hause? |

## 5. Vérifications (code de sortie, sommet rebasé sur `66c7235b`)

| Commande | Sortie |
|---|---|
| `node --test scripts/checkFachwissenFloor.test.mjs`, test seul face à l'ancien validateur | 1 (RED : exports absents) |
| idem avec le nouveau validateur | 0 (GREEN, 7 tests) |
| échantillon « hält » ajouté, puis verbe ajouté | 1, puis 0 |
| `npx tsc -b` | 0 |
| `npm test -- --maxWorkers=2` | 0 (193 fichiers, 2 024 tests). Un premier passage après le rebase est sorti à 1 : un timeout de 5 s dans `FachwissenDetailPage.test.tsx` (fw-khk), sous la charge des agents parallèles. Le fichier seul passe 3 fois sur 3, et le passage complet suivant sort à 0. |
| `npm run test:c6 -- --maxWorkers=2` | 0 (212 tests) |
| `node --test` sans checkProbeCoverage, puis checkProbeCoverage seul | 0 (222), 0 (4) |
| les 21 `check*` de la CI, `checkTermRegister --require-all`, `evalDoctopus --dry` | 0 chacun |
| `checkBudgetFloor.mjs origin/main` | 0 |
| `npm run build` | 0 |
| `npm run content:link` | 0 (`caseTermLinks.json` inchangé) |
| `git merge-tree --write-tree` contre origin/main | 0 |
| contre feat/s3-banque, feat/s3-petits-contenus, fix/s3-ui-petits (branches locales, sans branche distante) | 0, 0, 0 |
| contre origin/feat/s3-q9-und | **1** : conflit dans `atomicity-budget.json` seulement (voir § 6) |

Cohésion (`checkCaseCohesion`, non bloquant) : 263 liens manquants. Le chiffre de main n'a pas été relevé avant le lot.

## 6. Points à trancher

1. **Conflit avec feat/s3-q9-und.** Le seul conflit est dans `atomicity-budget.json`. Q9 insère une clé `A3` juste au-dessus
   de la ligne `B`, que ce lot abaisse. `seedCases.ts` fusionne sans conflit. À la seconde fusion, il faut garder les
   clés de Q9, puis relancer `checkQuestionAtomicity.mjs --bless` sur le résultat.
2. **Les `askedInExam` des Fachwissen ne sont pas gardés sur la forme.** Mesurés avec les mêmes DEFAUTS, 88 questions
   sur 1 921 (39 fiches) sont mal formées : 49 donnent une réponse ou une source entre parenthèses (« (Freiburg
   08.07.2020) »), 17 sont télégraphiques et 22 n'ont pas de verbe. Dix sont la copie exacte de questions de cas
   corrigées ici :
   - « Welche Diagnostik in welcher Reihenfolge? » (khk) ;
   - « Wann operieren Sie? » (divertikulitis) ;
   - « Was bedeutet R-CHOP? » (nhl), …
   Hors périmètre ; ce serait un lot à part, avec un quatrième budget.
3. **« Erklären Sie die Weber-Klassifikation. » compte comme une explication au patient.** La forme `erklären Sie`,
   exigée par le brief, attrape aussi les explications adressées au jury. Le compteur est donc optimiste. Les 31 fiches
   corrigées ici ont, elles, une vraie explication au patient.
4. **La liste fermée de verbes (`sansVerbe`).** Une question complète dont le verbe manque à la liste rougit en CI,
   maintenant que le budget est à 0. La correction se fait dans la liste. Le cas s'est produit une fois avec « hält ».

## Non vérifié

- Les 31 explications et les 105 réécritures n'ont été relues ni par `fsp-clinical-reviewer` ni par
  `fsp-language-reviewer`. Leur relecture est à prévoir avant la fusion. Points cliniques à confirmer :
  - le délai de Doxycyclin, « zwei bis drei Wochen », est repris de la fiche du cas lyme ;
  - l'antibiotique de la pertussis à six semaines est justifié par le contact avec une femme enceinte, comme dans la
    fiche du cas ;
  - la durée « vier bis sechs Wochen » pour l'endocardite.
- Je n'ai fait aucun contrôle en navigateur ni en production : le lot n'est pas déployé.
- Quelques dossiers `client` de vitest restent dans `$TMPDIR` (environ 20 Mo chacun). Ils ne sont pas supprimés, car
  ils ne sont pas attribuables avec certitude à ce lot (d'autres agents tournent en parallèle).
