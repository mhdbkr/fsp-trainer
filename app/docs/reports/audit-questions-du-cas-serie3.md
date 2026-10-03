# Audit des questions « pour ce cas » (lecture seule) — branche `feat/s3-lot0-fach-nature` @165bed94

## Synthèse

1. **Inventaire.** 130 cas déclarent 874 questions « pour ce cas », et les 874 s'affichent (aucune perdue au montage). Répartition : `aktuell` 523, `vorerkrankungen` 107, `medikamente` 89, `familie-sozial` 84, `vegetativ` 35, `noxen` 18, `frauenanamnese` 11, `allergien` 5, `fach` 2. On en compte 3 à 9 par cas (8 dans 57 cas). L'inventaire complet est en annexe.
2. **Ordre d'affichage.** Les questions du cas viennent en fin de chapitre (397) ou prennent la place d'une question générale quand elles déclarent `sucht` (477). Les questions `aktuell` passent **avant** la Fachanamnese (`anamneseChapters.ts:1786`). C'est la cause structurelle de la plupart des présuppositions trouvées.
3. **G2, région incohérente : une seule vraie faute, aucun copier-coller entre cas.** Une seule question est identique dans deux cas, et c'est légitime (anaemie et obstipation). « Beginnt der Schmerz wirklich im Knie… » (`seedCases.ts:42163`, case-coxarthrose) n'a pas été copiée d'un autre cas. C'est une **contradiction interne** :
   - la question et la question d'examinateur (`:42175` et `:42223`, « klagt zuerst über Knieschmerzen ») supposent un patient qui se plaint d'abord du genou, scénario classique de douleur projetée ;
   - or la fiche dit le contraire : « meine linke Hüfte macht mich fertig » (`:41918`), Leiste à la localisation, genou seulement en irradiation.
   - Les 48 autres constats lexicaux sont légitimes : diagnostics différentiels, signes d'alarme, dépistage.
4. **G3, présuppositions : 8 vraies dans 8 cas.**
   - coxarthrose « den zweiten Stock » (`:42167`) ;
   - covid19 « das mit dem Burnout » (`:45902`) ;
   - reaktive-arthritis « Ihrem Heuschnupfen » (`:46870`) ;
   - influenza « Ihr Notfallspray » (`:41618`) ;
   - prostatakarzinom « Sie nehmen seit Jahren Tamsulosin » (`:23857`) ;
   - achalasie « Sie nehmen Magenschutztabletten » (`:36740`) ;
   - ptbs « dem Motorrad » (`:50779`, atténué par `:50673`) ;
   - metabolisches-syndrom « Ihrer Netzhaut » (`:42760`, mineur).
5. **Pourquoi `checkQuestionOrder` a laissé passer « zweiten Stock » : quatre filtres indépendants.**
   - Le Tier A ne lit que les possessifs.
   - `RE_DEF` (`checkQuestionOrder.mjs:51`) exige le nom juste après l'article ; l'adjectif de « den zweiten Stock » le bloque.
   - Longueur minimale de 8 ou 10 lettres, alors que « Stock » en a 5.
   - Le lemme « stock » apparaît dans 81 fiches (`fam-wohnen`), bien au-dessus du seuil `maxDf` (3, 8 ou 13 selon le tier).
   - Burnout est coupé par la longueur minimale. Heuschnupfen apparaît dans 44 fiches. Tamsulosin et Magenschutz n'ont pas d'article.
6. **Extension proposée du détecteur, mesurée.** Quatre règles :
   - jusqu'à 2 adjectifs entre l'article ou le possessif et le nom ;
   - nombre ordinal suivi d'un nom (Stock, Etage…) ;
   - phrase affirmative en début de question (« Sie nehmen / Sie haben / Sie hatten… ») ;
   - au lieu du seuil de fréquence, exclure les mots déjà présents dans les questions générales de la trame.
   
   Résultat : 28 candidats dont 8 vrais (environ 29 %), et les 8 cas du point 4 sont tous attrapés. Le détecteur reste donc informatif, pas bloquant.
7. **Questions composées parmi les questions du cas : 271 sur 874 (31 %), dans 100 cas.**
   - Plus d'un « ? » (règle A) : 211 sur 510 au budget. Énumération trop longue (règle B) : 60 sur 114.
   - Par chapitre : `aktuell` 163, puis `vorerkrankungen` 29, `familie-sozial` 28, `medikamente` 24, `vegetativ` 12, `noxen` 8.
   - 40 d'entre elles ont la forme « question fermée ? + question en W- ? ». Elles deviendraient une relance « Falls ja » si `CaseQuestion` acceptait un champ `followUp`, absent aujourd'hui (`types.ts:305`, `anamneseChapters.ts:1679`).
8. **G1, « Arm, Schulter oder Rücken » : déjà corrigé sur `main`.** Ce texte était l'ancienne question d'irradiation du chapitre « Aktuelle Beschwerden » (douleur), remplacée par une formulation neutre au commit `e80dfa3c` du 30 septembre (aujourd'hui `anamneseChapters.ts:95`). Si la direction le voit encore, la version déployée date d'avant ce commit.
9. **G1 sur la branche : 0 incohérence de territoire.** 82 questions d'irradiation jouées, dont 60 neutres et 22 qui nomment des territoires, tous cohérents avec la région. Mais l'irradiation est **posée deux fois** :
   - 17 cas ont la question neutre `akt-ausstrahlung` **et** une question de Fach qui nomme les territoires (ortho, kardio, uro-flanke) ;
   - 9 cas ont en plus leur propre question d'irradiation, soit une troisième pose pour 5 d'entre eux.
10. **G1, extension de la règle L0 : sans nouveau mécanisme.**
    - Ajouter 3 entrées à `FACH_COVERS` (`anamneseChapters.ts:419`) : `fach-ortho-ausstrahlung`, `fach-kardio-ausstrahlung` et `fach-uro-flanke` couvrent `akt-ausstrahlung`. Gain : 17 cas.
    - Utiliser les champs existants `aktuellSkip` / `fachSkip` pour les 9 cas qui ont leur propre question.
    - Ajouter un test CI « territoire ⊂ `motiv.region` » dans `fachNature.test.ts`.
11. **G4, cause exacte.** `anamneseChapters.ts:675` n'a pas le préfixe « Falls ja: ». `parseFollowUp` le classe alors `immer`, c'est-à-dire relance inconditionnelle (`followUp.ts:28-30`), et `FollowUpGroupView` l'affiche toujours (`PhraseControls.tsx:124-125`). La relance s'affiche dans les 130 trames. La correction tient en un mot ; « Falls ja » range ensuite cette relance sous le même interrupteur que la relance « Getränke ».
12. **G4, relances sœurs touchées par la même cause.**
    - Sûres, avec le nombre de cas où elles sont jouées : `vegetativ` :566 (90), Fach gastro :859 (16), Fach onko :1292 (4), atemnot :143 ×2 (3), Fach uro :988, Fach neuro :1086 et :1101 (9), Fach chirurgie :1413 et :1418, Fach infektio :1486 (5), Fach kardio :759 (9), infekt :274 ×2 (8).
    - À arbitrer : Fach psy :1464 (automutilation) et la note « Vor jedem Schmerzmittel » :91 (52 cas), qui devrait être rattachée à la branche « sehr stark ».
13. **G5, case-leberzirrhose.** La nature déclarée du motif est `allgemein` (`seedCases.ts:20`), alors que le premier symptôme est « diffuse Bauchschmerzen », que le bloc douleur est rempli et que le patient dit lui-même « wegen des dicken Bauchs und der Schmerzen ». Le chapitre joué est donc celui de la fatigue : jamais de localisation, de caractère ni d'intensité.
    - Il manque 4 réponses : `akt-ort`, `akt-charakter`, `akt-intensitaet`, `akt-ausstrahlung`.
    - « Ist Ihr Bauch dicker geworden? » (`:194`) répète « Schwellungen — … der Bauch » posée juste avant. La réponse est déjà donnée (« Hosen passen nimmer »).
    - La question Fach gastro « in den letzten Stunden gegessen » ne convient pas à une évolution sur 3 mois.
14. **G6, fiche et Fachwissen de leberzirrhose.**
    - Fachwissen de 9,4 k caractères, contre une médiane de 34 k ; la thérapie en représente 47 %. 4 diagnostics différentiels et 7 lignes de clinique.
    - Fiche du cas : 3 diagnostics différentiels, 4 lignes de diagnostic, thérapie de 3,2 k caractères, pas de champ `notfall`.
    - Le « bonhomme » vient du composant `AnatomyMap` avec `figure: 'body'` (`anatomyFigures.ts:25-28` : un cercle et 5 traits). Seul `fw-leberzirrhose.ts:133-146` l'utilise. C'est un pilote T6 du 16 septembre, pas un vestige de l'ancien projet. Il contient en plus une erreur : le Palmarerythem est placé sur la région « skin ».
15. **G7, les premiers cas.** Ils forment 4 générations, datées par `git blame` :
    - C0 démo, 6 juillet : 10 cas ;
    - C1 pilote, 16–22 juillet : 10 cas ;
    - C2 pipeline v2, août : 12 cas ;
    - C3 septembre : 98 cas.
    
    | Médiane | C0 | C3 |
    |---|---|---|
    | DD | 3 | 10 |
    | Lignes de diagnostic | 3 | 14 |
    | Sections de la fiche examinateur | 2 | 5 |
    | Taille de la fiche du cas | 6,2 k | 15 k |
    
    Fachwissen de moins de 15 k : GIB 7k, Pankreatitis 7k, KHK 7k, Leberzirrhose 9k, Schlaganfall 9k, Gallenkolik 10k, TVT 11k, Pyelonephritis 11k, Magenkarzinom 12k, Ulcus 13k (Pneumonie, Depression, Appendizitis ≈ 15k). Les réponses du patient sont complètes partout : 0 sonde jouée sans réponse.
16. **Autre nature déclarée à arbitrer.** Le premier symptôme est une douleur mais la nature déclarée ne l'est pas dans 6 autres cas : commotio, gastroenteritis, laktoseintoleranz, arterielle-hypertonie, tvt, lyme. C'est une décision clinique, pas une faute certaine.
17. **Répétitions (§2.2) parmi les questions du cas : environ 6 nettes.**
    - pneumothorax redemande « Rauchen Sie? » (`:34665`) ;
    - karpaltunnel « Ausschütteln » (`:22747`) répète la question Einfluss de la trame ;
    - Kortison est redemandé dans diabetes (`:8021`) et osteoporose (`:18899`) ;
    - leberzirrhose « Bauch dicker » (`:194`).
    
    `checkPlayedTrame` ne les voit pas : son seuil de recouvrement est de 0,6.
18. **Plan.** 9 lots dans l'ordre d'affichage, plus 3 lots G7 ensuite :
    - Q0 : code et règles mécaniques ;
    - Q1 : fautes P0 du chapitre `aktuell` ;
    - Q2–Q5 : questions composées de `aktuell` ;
    - Q6–Q8 : chapitres suivants ;
    - puis G7 (Lc1–Lc3).
    
    Les lots Q1 à Q8 font tomber le budget d'atomicité de A 510 à environ 299 et de B 114 à environ 54.
19. **Rien n'a été modifié dans le worktree** (`git status` propre). Toutes les mesures ont tourné sur une copie dans le dossier de travail, `…/scratchpad/audit-qdc/` : `inventory.tsv` (874 lignes : cas, chapitre, position, numéro dans la trame, ligne source, texte), `compound.tsv` (271 lignes) et les scripts `app/scripts/_*.mjs`.

---

## 1. Inventaire — méthode
J'ai rejoué `playedTrame(c)` sur chaque cas, avec le chapitre Fach inséré après `aktuell` comme dans `anamneseChapters.ts:1786`, et retenu les questions marquées « propres au cas ». La position est notée `rang/longueur du chapitre`. `#n` est le rang dans toute la trame (abréviations : akt, veg, vor, med, all, nox, fam, frau, FACH). `*` signale une question composée (règle A ou B). `L` donne la plage de lignes dans `app/src/data/seedCases.ts`. Le tableau complet, cas par cas, est en annexe.

## 2. Détecteurs

### G2 — région ou organe
- Premier détecteur : la région nommée dans la question est-elle absente du contexte du cas (nom, pathologie, symptômes, douleur, DD) ? 23 constats sur la carte du corps, 106 avec les organes, tous légitimes à la relecture. Exemples : Achseln/Leisten dans tonsillitis :12482 (adénopathies), Wade dans nephrotisches-syndrom :49310 (TVT), Schulter dans hueftkopfnekrose :51742 (ostéonécrose multifocale).
- Deuxième détecteur : la question affirme-t-elle un siège de douleur différent du siège déclaré, avec des marqueurs comme « wirklich » ou « eigentlich » ? 25 constats, une seule vraie faute : **coxarthrose :42163**. Les autres sont des DD voulus (Wade dans ulcus-cruris pour une claudication, Schulter-Nacken dans perikarditis…).
- Latéralité (links/rechts) : 16 questions, aucune contradiction.

### G3 — présuppositions
Les 8 cas du point 4 ont tous été vérifiés tour par tour (premier endroit de la trame où le fait apparaît) :

| Cas | Question | Fait introduit pour la première fois à |
|---|---|---|
| coxarthrose | `aktuell`, rang 26 | jamais avant `fam-wohnen` (familie-sozial) |
| covid19 | `aktuell`, rang 24 | `veg-schlaf`, rang 36 |
| reaktive-arthritis | `aktuell`, rang 24 | `vor-erkrank`, rang 44 |
| influenza | `aktuell`, rang 23 | `vor-erkrank`, rang 38 |
| prostatakarzinom | `aktuell`, rang 20 | `fach-uro-vorgeschichte`, rang 29 |
| achalasie | `aktuell`, rang 23 | `vor-erkrank`, rang 36 |

Faux positifs écartés :
- hypothyreose « Entbindungen » (déjà dans `akt-frueher`), schlafapnoe « Ihre Ehefrau » (« meine Frau » en `aktuell`, rang 22) ;
- karpaltunnel, rheumatoide-arthritis, malaria, spinalkanalstenose : le fait est déjà donné plus tôt ;
- « Augenbrauen », la seule occurrence du Tier A, est un faux positif.

### Questions composées
Sur les 271 : `aktuell` compte 19 cas mécaniques et 110 cas cliniques en règle A, plus 34 en règle B ; les autres chapitres comptent 21 cas mécaniques et 87 cas cliniques. La règle C ne touche aucune question du cas.

## 3. G1 — où le texte est construit
- Chapitre « Aktuelle Beschwerden », version douleur : `anamneseChapters.ts:95`, neutre depuis `e80dfa3c`.
- Fach : `FACH_RULES` (`:1709` pour ortho, `:1726` pour kardio selon `thorakal`). La nature du motif (`Who.motiv.region`) n'est déclarée que dans 13 cas ; 40 cas de douleur n'en ont pas, sans conséquence aujourd'hui parce que les territoires ortho et kardio sont bien protégés (`measureFachNature` : 0 sur 91).
- `fach-uro-flanke` se joue tel quel dans hodentorsion, zystitis, bph et prostatakarzinom. C'est le prochain candidat pour une règle de `FACH_RULES` selon la région.

## 4. G4 — relances sœurs
La liste du point 12 est complète. Elle vient d'un parcours de tous les chapitres : généraux, les 10 versions de « Aktuelle Beschwerden », et la Fach. Un 2ᵉ cas mineur : « Falls Sie etwas abhusten: » (`:143`) produit un interrupteur libellé « Sie etwas abhusten ».

## 5. Premiers cas (G5–G7)
- **leberzirrhose, ce qui sert la FSP sans surcharger :**
  - nature du motif en `schmerz` et 4 réponses tirées du bloc douleur existant ;
  - fusionner les questions « Bauch » ;
  - 2 questions d'alarme, Ikterus et encéphalopathie : les réponses existent déjà dans les constats négatifs, mais rien ne les demande ;
  - `fachSkip: ['fach-gastro-speisen']` ;
  - dans la fiche : `notfall`, des DD complétés (5–6) et une ligne « Komplikationen » (varices, SBP, HE, HRS) ;
  - remplacer la silhouette par une `syndrome-map` « hypertension portale ↔ insuffisance hépatique ».
- **Fiches à aligner ensuite, par ordre de visibilité** (les cas « tier 1 » sont gratuits) : angina-pectoris et gib (C0, tier 1, Fachwissen de 7 k), puis pankreatitis, puis les cas C1/C2 du tableau. Pour angina-pectoris, pankreatitis, cholezystitis, kolorektales-ca et gerd, il manque aussi `pruefungsfallen` ; pour les 8 cas C0 et urtikaria, il manque `notfall`.

## 6. Plan de lots

| Lot | Contenu | Éd. | Nature | Gain mesuré |
|---|---|---|---|---|
| Q0 | Préfixe « Falls ja » à :675 et sur 12 relances sœurs, plus un test DOM ; `CaseQuestion.followUp` ; +3 `FACH_COVERS` ; extension de `checkQuestionOrder` (règles du point 6) ; garde CI G1 | ~20 | Mécanique | G4 13→0 ; doublons d'irradiation 17→0 ; présuppositions détectées 1→8 |
| Q1 | `aktuell`, fautes P0 : 8 présuppositions ; coxarthrose ×3 (question, 2 questions d'examinateur) ; 9 irradiations via `aktuellSkip`/`fachSkip` ; 6 répétitions ; leberzirrhose ×7 | ~33 | Clinique | G2 1→0 ; G3 8→0 ; irradiation 9→0 ; G5 |
| Q2 | 40 questions composées → relance « Falls ja » (toutes les chapitres) | 40 | Mécanique relue | A −40 |
| Q3–Q5 | `aktuell` composées cliniques (A 110, B 34), cas tier 1 d'abord, puis dans l'ordre du fichier | 3×~40 | Clinique | A −110, B −34 |
| Q6 | `vegetativ` + `vorerkrankungen` (A cliniques 23, B 9) | ~32 | Clinique | |
| Q7 | `medikamente`, `allergien`, `noxen` (A 18, B 10) | ~28 | Clinique | |
| Q8 | `familie-sozial`, `frauenanamnese`, `fach` (A 20, B 7) + arbitrage des 6 natures de motif | ~33 | Clinique | Budget A ≈299, B ≈54 |
| Lc1–Lc3 | G6/G7 : leberzirrhose (fiche, Fachwissen, visuel), puis les fiches C0 tier 1, puis C1/C2 de moins de 15 k | ~35 chacun | Clinique | Fachwissen 9 k → médiane |

## Annexe — inventaire, cas par cas
```
leberzirrhose (5) akt 12*,13/13 · veg 5/5 · nox 4,5/5  L194–198
angina-pectoris (4) akt 12,13/13 · vor 5/5 · fam 8/8  L424–427
pankreatitis (3) akt 11,12/12 · vor 5/5  L612–614
gib (3) akt 10,11/11 · med 4/4  L785–787
divertikulitis (4) akt 11,12/12 · vor 5,6/6  L963–966
cholezystitis (4) akt 12,13,14/14 · vor 5/5  L1138–1141
kolorektales-ca (3) akt 9,10/10 · fam 8*/8  L1308–1310
gerd (4) akt 11,12,13,14/14  L1483–1486
myokardinfarkt (5) akt 12,13,14/14 · vor 5/5 · fam 8/8  L1658–1662
oesophaguskarzinom (4) akt 9,10,11,12/12  L1848–1851
ulcus (3) akt 11,12/12 · med 4/4  L2104–2106
magenkarzinom (4) akt 12,13/13 · vor 5/5 · fam 8*/8  L2416–2419
appendizitis (4) akt 12,13,14,15/15  L2761–2764
depression (3) akt 5/5 · veg 7/7 · vor 5/5  L3090–3092
pneumonie (3) vor 5/5 · med 4,5/5  L3438–3440
pyelonephritis (4) akt 12/12 · vor 5,6,7/7  L3800–3803
pavk (4) akt 12,13,14,15/15  L4155–4158
lyme (4) akt 10,11,12,13/13  L4484–4487
osg-fraktur (3) akt 12/12 · vor 5/5 · fam 8/8  L4874–4876
bandscheibenvorfall (3) akt 12,13*,14/14  L5177–5179
gicht (4) akt 12,13,14/14 · vor 5/5  L5547–5550
multiple-sklerose (6) akt 8,9,10,11,12/12 · vor 5/5  L6015–6020
reizdarm (6) akt 11,12,13,14/14 · fam 8,9/9  L6491–6496
schlaganfall (5) akt 8,9,10/10 · vor 5/5 · med 4/4  L6888–6892
gallenkolik (3) akt 12,13/13 · vor 5/5  L7220–7222
tvt (5) akt 9,10/10 · vor 5,6/6 · fam 8/8  L7474–7586
diabetes (8) akt 12,13*,14/14 · veg 7/7 · vor 5/5 · med 4/4 · fam 8,9/9  L8014–8021
hyperthyreose (6) akt 12/12 · FACH 2*/10 · med 4,5,6*/6 · frau 5/5  L8575–8580
copd (6) akt 8,9*/9 · vor 5*,6/6 · med 4/4 · fam 8*/8  L9151–9156
zystitis (6) akt 10*/10 · vor 5,6/6 · fam 8*,9/9 · frau 4/4  L9661–9666
migraene (8) akt 11,12,13,14,15/15 · vor 5/5 · med 4/4 · fam 8/8  L10230–10237
asthma (8) akt 8,9,10*,11*/11 · med 4*/4 · all 3*,4*/4 · fam 8/8  L10821–10828
herzinsuffizienz (7) akt 10,11*,12*/12 · veg 5*/7 · med 4,5/5 · fam 8*/8  L11389–11395
nierenkolik (6) akt 12,13,14,15/15 · fam 8*,9/9  L11940–11945
tonsillitis (7) akt 12,13,14,15*,16/16 · vor 5/5 · med 4/4  L12478–12484
anaemie (8) akt 10,11*,12/12 · veg 8*/8 · vor 5/5 · med 4/4 · fam 8/8 · frau 3/3  L13011–13018
vorhofflimmern (8) akt 9,10/10 · veg 2,9*/9 · vor 5,6*,7/7 · med 4/4  L13516–13523
erysipel (8) akt 7,8*,9*,10*,11*/11 · vor 5*,6,7/7  L14048–14055
hypothyreose (8) akt 12,13,14/14 · vor 5,6/6 · med 4/4 · fam 8*/8 · frau 5/5  L14582–14589
niereninsuffizienz (6) akt 12,13/13 · vor 5,6*,7/7 · med 4/4  L15157–15162
lymphom (7) akt 9,10,11,12,13/13 · veg 7/7 · fam 8/8  L15740–15746
lungenembolie (6) akt 12,13/13 · vor 5/5 · med 4,5/5 · fam 8*/8  L16252–16257
eug (8) akt 12,13,14*,15,16/16 · vor 5,6/6 · frau 4/4  L16787–16794
meningitis (8) akt 12*,13,14,15,16,17*/17 · med 4*/4 · fam 8/8  L17312–17319
pankreaskarzinom (7) akt 11,12*,13,14*/14 · vor 5,6*/6 · fam 8*/8  L17841–17847
zoster (8) akt 11,12,13,14,15,16/16 · vor 5/5 · med 4*/4  L18364–18371
osteoporose (7) akt 12*/12 · vor 5,6,7*/7 · med 4*,5/5 · fam 8/8  L18895–18901
bph (6) akt 10*,11,12/12 · vor 5/5 · med 4*/4 · fam 8/8  L19429–19434
demenz (8) akt 5,6,7*,8*,9,10/10 · med 4/4 · fam 8*/8  L20022–20029
bronchialkarzinom (8) akt 9,10*,11*,12*,13,14*/14 · fam 8*,9/9  L20590–20597
mammakarzinom (8) akt 9,10,11/11 · veg 8/8 · vor 5/5 · med 4/4 · fam 8*/8 · frau 5/5  L21151–21158
rheumatoide-arthritis (7) akt 12*,13,14*,15,16/16 · veg 8/8 · vor 5/5  L21694–21700
morbus-crohn (8) akt 11*,12,13,14,15,16/16 · veg 1*/7 · med 4/4  L22222–22229
karpaltunnel (8) akt 11,12*,13,14*,15/15 · vor 5*,6/6 · fam 8*/8  L22745–22752
panikstoerung (7) akt 8*,9,10*,11,12,13*/13 · fam 8/8  L23313–23319
prostatakarzinom (7) akt 10,11,12*/12 · vor 5,6,7/7 · fam 8/8  L23857–23863
hepatitis-b (6) akt 11,12*/12 · vor 5*/5 · nox 4/4 · fam 8*,9/9  L24374–24379
parkinson (8) akt 8*,9,10,11*,12*/12 · veg 7,8/8 · med 4*/4  L24938–24945
gonarthrose (7) akt 12,13,14,15,16*/16 · vor 5*,6/6  L25480–25486
struma (8) akt 11,12*,13,14/14 · veg 7/7 · vor 5/5 · med 4/4 · fam 8/8  L26010–26017
otitis-media (8) akt 12,13,14*,15,16,17/17 · vor 5*/5 · med 4/4  L26547–26554
ileus (8) akt 12*,13*,14,15/15 · vor 5,6*,7/7 · fam 8/8  L27100–27107
lagerungsschwindel (7) akt 8,9,10*,11,12/12 · fam 8*,9/9  L27638–27644
synkope (8) akt 9*,10,11,12,13/13 · vor 5,6/6 · fam 8/8  L28149–28156
zoeliakie (8) akt 11,12*,13,14,15*,16/16 · vor 5/5 · fam 8/8  L28696–28703
schenkelhalsfraktur (8) akt 12,13*,14*,15*/15 · vor 5/5 · med 4*,5*/5 · fam 8*/8  L29290–29297
ulcus-cruris (8) akt 9,10*,11,12,13,14*/14 · vor 5*,6*/6  L29844–29851
leistenhernie (8) akt 11,12*,13*,14/14 · veg 4*,8*/8 · nox 4/4 · fam 8/8  L30344–30351
alkoholentzug (7) akt 5,6/6 · veg 7/7 · vor 5/5 · med 4/4 · nox 4,5/5  L30862–30868
commotio (9) akt 8,9*,10,11,12*,13*/13 · vor 5,6/6 · fam 8/8  L31399–31407
itp (6) akt 9,10,11*/11 · vor 5/5 · med 4/4 · frau 4*/4  L31941–31946
uterus-myomatosus (7) akt 9*,10,11*,12,13*/13 · fam 8*/8 · frau 4*/4  L32483–32489
akutes-nierenversagen (8) akt 6*,13*/13 · veg 6*,7/7 · vor 5*,6/6 · med 4*,5*/5  L32995–33002
fibromyalgie (8) akt 12*,13,14*,15*,16,17*/17 · veg 7*/7 · med 4/4  L33544–33551
polymyalgia (8) akt 12,13*,14,15,16*,17*/17 · veg 1/8 · med 4*/4  L34133–34140
pneumothorax (7) akt 12,13,14,15/15 · vor 5/5 · nox 4*/4 · fam 8/8  L34661–34667
schlafapnoe (8) akt 13*,14,15*/15 · veg 5*,6*,7/7 · med 4/4 · nox 4*/4  L35190–35197
schizophrenie (7) akt 5*,6,7*,8,9,10*/10 · nox 4/4  L35667–35673
delir (8) akt 8,9*,10*,11,12/12 · vor 5/5 · med 4/4 · fam 8/8  L36220–36227
achalasie (8) akt 9,10,11*,12*,13,14/14 · veg 3/4 · fam 8/8  L36736–36743
septische-arthritis (7) akt 12*,13,14,15,16,17/17 · med 4*/4  L37260–37266
spinalkanalstenose (7) akt 12,13*,14*,15,16*,17/17 · vor 5*/5  L37821–37827
hws-diskusprolaps (6) akt 12,13,14,15,16/16 · vor 5/5  L38356–38361
laktoseintoleranz (8) akt 9,10*,11,12*,13,14,15/15 · med 4/4  L38892–38899
tia (7) akt 8,9,10,11,12*,13/13 · med 4/4  L39396–39402
diabetes-typ1 (8) akt 12*,13,14*,15,16*/16 · FACH 2/10 · med 4/4 · fam 8*/8  L39905–39912
gastroenteritis (6) akt 11*,12,13*/13 · veg 6*/6 · med 4/4 · fam 8/8  L40460–40465
rheumatisches-fieber (7) akt 12,13,14,15,16*,17/17 · med 4*/4  L40997–41003
influenza (7) akt 10,11*,12*,13*,14/14 · vor 5*/5 · fam 8/8  L41613–41619
coxarthrose (8) akt 12,13,14,15,16*,17/17 · vor 5*/5 · med 4/4  L42163–42170
metabolisches-syndrom (8) akt 12*,13*,14*,15/15 · veg 7*/7 · vor 5*,6/6 · med 4*/4  L42755–42762
karzinoid (8) akt 12,13*,14,15,16/16 · vor 5*/5 · fam 8*/8 · frau 5*/5  L43346–43353
abszess (8) akt 11,12*,13*/13 · vor 5,6/6 · med 4,5,6/6  L43863–43870
anorexia-nervosa (8) akt 5,6*,7,8*,9*,10,11/11 · med 4*/4  L44442–44449
malaria (8) akt 10,11,12*,13*/13 · vor 5/5 · med 4/4 · fam 8,9*/9  L44955–44962
endokarditis (7) akt 11*,12*,13*/13 · vor 5*/5 · med 4*/4 · all 3/3 · nox 4*/4  L45419–45425
covid19 (8) akt 10,11,12,13,14/14 · vor 5,6*/6 · fam 8/8  L45895–45902
anaphylaxie (8) akt 10,11*,12*,13*,14*/14 · med 4/4 · all 3/3 · fam 8/8  L46391–46398
reaktive-arthritis (8) akt 12*,13,14,15*,16*,17/17 · med 4*/4 · fam 8/8  L46866–46873
pertussis (8) akt 8,9*,10,11*,12/12 · vor 5/5 · med 4/4 · fam 8*/8  L47347–47354
colitis-ulcerosa (8) akt 9,10*,11,12*,13*/13 · med 4/4 · nox 4/4 · fam 8*/8  L47680–47844
chronische-pankreatitis (7) akt 11,12/12 · veg 7/7 · vor 5*/5 · nox 4*,5*/5 · fam 8/8  L48368–48374
myokarditis (7) akt 12*,13*,14,15*,16/16 · nox 4*/4 · fam 8/8  L48848–48854
nephrotisches-syndrom (6) akt 12*,13*,14,15,16/16 · vor 5/5  L49306–49311
akute-leukaemie (6) akt 10*,11,12*,13/13 · vor 5*/5 · fam 8/8  L49795–49800
endometriose (7) akt 12,13,14,15,16/16 · med 4/4 · fam 8/8  L50303–50309
ptbs (7) akt 9,10,11*,12*,13,14/14 · nox 4*/4  L50673–50783
somatoforme-schmerzstoerung (7) akt 9*,10*,11/11 · vor 5*/5 · med 4/4 · fam 8,9/9  L51256–51262
hueftkopfnekrose (8) akt 12*,13,14,15/15 · veg 8/8 · med 4*/4 · nox 4/4 · fam 8/8  L51738–51745
glomerulonephritis (6) akt 10,11,12,13/13 · med 4/4 · fam 8/8  L52224–52229
nhl (7) akt 9,10*,11,12*,13/13 · veg 8,9/9  L52724–52730
cml (7) akt 10,11,12,13*,14/14 · vor 5/5 · fam 8/8  L53183–53189
adnexitis (6) akt 12,13/13 · vor 5/5 · fam 8/8 · frau 4,5/5  L53661–53666
allergische-rhinitis (8) akt 8,9,10*,11,12*/12 · med 4/4 · all 3*/3 · fam 8/8  L54110–54117
typhus (8) akt 10*,11*,12,13*,14,15/15 · vor 5/5 · med 4/4  L54570–54577
obstipation (8) akt 9,10,11/11 · veg 6/6 · med 4,5/5 · fam 8,9*/9  L55067–55074
sturz-im-alter (8) akt 8,9,10*,11,12/12 · vor 5/5 · med 4*/4 · fam 8*/8  L55574–55581
lumboischialgie (8) akt 12,13,14,15,16/16 · vor 5/5 · med 4/4 · fam 8/8  L56047–56054
bauchaortenaneurysma (8) akt 12,13,14,15,16*,17/17 · vor 5*/5 · fam 8/8  L56549–56556
aortendissektion (8) akt 12,13,14,15,16*/16 · med 4/4 · nox 4/4 · fam 8/8  L57041–57048
perikarditis (6) akt 12,13,14/14 · veg 1/8 · vor 5*/5 · med 4/4  L57506–57511
epilepsie (8) akt 8*,9*,10,11*/11 · vor 5*/5 · med 4/4 · nox 4*/4 · fam 8*/8  L57982–57989
hodentorsion (7) akt 12,13*,14,15,16,17/17 · vor 5*/5  L58444–58450
basaliom (8) akt 7*,8*/8 · veg 8/8 · vor 5,6*/6 · med 4/4 · fam 8,9*/9  L58872–58879
psoriasis (8) akt 7,8*,9,10,11/11 · med 4/4 · fam 8,9*/9  L59368–59375
urtikaria (8) akt 7,8*,9*,10*/10 · med 4,5*,6/6 · fam 8/8  L59815–59822
perniziose-anaemie (7) akt 10,11,12*,13/13 · vor 5/5 · med 4/4 · fam 8/8  L60306–60312
opioidabhaengigkeit (8) med 4,5,6,7*,8,9,10*/10 · fam 8*/8  L60802–60809
sinusitis (8) akt 10,11,12*,13*,14,15,16/16 · med 4/4  L61302–61309
arterielle-hypertonie (7) akt 12,13,14*,15*/15 · veg 6/6 · med 4,5*/5  L61775–61781
```
Pour tvt, colitis-ulcerosa et ptbs, la plage de lignes est large parce que la première occurrence du texte se trouve ailleurs dans le bloc du cas. Les numéros exacts de chaque question sont dans `inventory.tsv`.

Points à confirmer :
- **G1 :** la version déployée est-elle antérieure à `e80dfa3c` ?
- **Arbitrage clinique :** la nature du motif de leberzirrhose (`schmerz` recommandée) et des 6 autres cas du point 16.

---
Note de `main` (3 oct.) : G1 — `e80dfa3c` est dans `main` et la prod a été redéployée depuis (run du 3 oct., 18 h 30) ; « Arm, Schulter oder Rücken » ne se joue plus. Une capture ancienne ou un service worker en cache explique la vue de la direction.
