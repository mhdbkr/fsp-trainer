# Lot VD — la phrase de Fallvorstellung tient entière dans les 130 cas

Branche `feat/s3-vd`, partie de `origin/main` 378b758a. Un seul writer. Aucune ligne du lot Âges touchée
(`personalia.geburtsdatum`, réplique `pers-alter`, `arztbrief.einleitung`) : seul le champ
`medicalView.verdachtsdiagnose` de 99 cas a changé, plus `caseTermLinks.json` régénéré.

## 1. Mesure avant / après

Règle de `vorstellungsDiagnose` (PreSimulationPage.tsx) : la ligne « Herr X ist ein N-jähriger Patient.
Verdachtsdiagnose: <1ʳᵉ phrase> » est coupée par « … » si elle dépasse 200 caractères ou si la phrase n'a pas
de point final. Mesure sur les objets chargés par `scripts/loadCases.mjs`.

| | Avant (378b758a) | Après |
|---|---|---|
| Lignes coupées par « … » | **99 / 130** | **0 / 130** |
| Longueur de la ligne, 99 cas (min / médiane / max) | 257 / 444 / 772 | 115 / 176 / 199 |
| Longueur de la ligne, 130 cas (min / médiane / max) | — | 115 / 174 / 199 |
| « Patient(in) » redit dans la 1ʳᵉ phrase | 17 | 0 |
| Code de classification dans la 1ʳᵉ phrase (ICD-10, F20.0…) | 8 | 0 |
| Abréviation écrite dans la 1ʳᵉ phrase (« bzw. ») | 1 | 0 |
| Longueur totale des 99 VD (caractères) | 46 563 | 49 740 |

La VD totale s'allonge de 7 % : la matière retirée de la première phrase est réécrite en phrases complètes
(« Begründet wird sie durch … », « Ausgelöst wurde er durch … ») au lieu d'une énumération après un tiret.

## 2. Méthode

1. **TDD.** Le test de garde de `vorstellungsSatz.test.ts` couvre désormais les 130 cas ; les listes Lc2
   (tier 1), Lc3 et Lc4 sont supprimées. Il collecte toutes les fautes avant d'échouer, pour voir la liste
   entière :
   - la phrase est entière (`offen === false`) ;
   - pas de « Patient » dans la première phrase (l'amorce le dit déjà) ;
   - pas de code de classification (`ICD`, `ICHD`, `DSM`, `X00.0`, `F00`) ;
   - pas d'abréviation écrite ni de symbole (« Z. n. », « i. v. », « bzw. », « z. B. », « ggf. », « evtl. »,
     `=`, `<`, `>`). La barre oblique n'est pas interdite par le test (§ 6).
   - RED au commit 7e57278b : 99 cas « coupée », 17 « Patient », 8 « code », 1 « abréviation ».
2. **Réécriture.** Chaque VD a été écrite à la main, cas par cas, en cinq lots de 20. Une sonde de scratchpad
   (non commitée) contrôlait pour chaque proposition :
   - la longueur de la ligne et le point final ;
   - les règles orales du test, plus `BMI`, `ca.` et `/` ;
   - les mots de six lettres ou plus répétés dans la première phrase ;
   - les mots de l'ancienne VD absents de la nouvelle. Chaque perte a été relue : ce sont des flexions
     (« progredienter » → « progrediente ») ou des reformulations ; aucun fait clinique n'est sorti.
3. **Ce qui a été gardé dans la première phrase** quand il y tenait : le point de raisonnement décisif.
   - Risque suicidaire ou de passage à l'acte : schizophrenie, somatoforme-schmerzstoerung, ptbs,
     opioidabhaengigkeit.
   - Urgence : meningitis, septische-arthritis, tia, bauchaortenaneurysma, akute-leukaemie,
     schenkelhalsfraktur, polymyalgia. Le mot « Notfall » n'apparaît que là où l'ancienne VD le disait.
   - Décision thérapeutique : vorhofflimmern (> 48 h, sans anticoagulation), zoster (fenêtre de 72 h),
     leistenhernie (incarcération, opération urgente), typhus (exclure d'abord le paludisme).
4. **Ages.** Les âges redits dans la VD ont été retirés quand ils n'apportaient rien : l'amorce les dit
   déjà. Ils ont été gardés quand ils portent un raisonnement (tonsillitis : McIsaac à plus de 45 ans ;
   uterus-myomatosus : préménopause). 10 VD citent encore l'âge ; les 10 concordent avec `personalia.age`.
5. **Liens de termes.** `npm run content:link` : 8 cas gagnent un lien (fb-oral, fb-sekundaer,
   fb-rezidivierend, fb-depressiv, fb-thrombose, fb-anterograde-amnesie, fb-primaer). Aucun lien perdu.
   Une première version d'anaemie (« Eisenmangelanämie ») faisait perdre `fb-anaemie` : remise en
   « Anämie bei Eisenmangel ».
6. **Muster.** Aucun Muster (Vorstellung ou Arztbrief) ne reprenait mot pour mot l'ancienne première phrase.
   Dans la nouvelle version, seul uterus-myomatosus a une première phrase reprise mot pour mot
   (« Uterus myomatosus mit sekundärer Eisenmangelanämie », inchangée). Rien à aligner.
   40 Muster reprennent des fragments du raisonnement de l'ancienne VD : les faits n'ont pas changé, ils
   restent tels quels.

## 3. Dix exemples parmi les plus difficiles

Les lignes sont rendues par la règle de `vorstellungsDiagnose` ; l'amorce « Herr/Frau X ist … » est omise.

**hyperthyreose** (705 → 155 caractères)
- Avant : « Manifeste Hyperthyreose, am ehesten im Rahmen einer Immunhyperthyreose vom Typ Morbus Basedow… »
- Après : « Manifeste Hyperthyreose, am ehesten im Rahmen einer Immunhyperthyreose vom Typ Morbus Basedow. »
- La symptomatologie, l'orbitopathie, l'autoimmunité polyglandulaire et le besoin en insuline passent dans
  trois phrases suivantes.

**psoriasis** (772 → 195)
- Avant : « Schwerer Schub einer seit 17 Jahren bekannten Psoriasis vulgaris vom Plaque-Typ (Typ I, positive
  Familienanamnese) mit Nagelpsoriasis… »
- Après : « Schwerer Schub einer Psoriasis vulgaris mit Nagelbefall und Erstmanifestation einer
  Psoriasisarthritis: Indikation zur Systemtherapie. »

**sturz-im-alter** (758 → 177)
- Avant : « Sturz im Alter (geriatrisches Sturzsyndrom) mit rezidivierenden Stürzen, multifaktoriell… »
- Après : « Multifaktorielles geriatrisches Sturzsyndrom mit rezidivierenden Stürzen, zuletzt mit Kopfanprall
  unter Apixaban. »

**schizophrenie** (722 → 197)
- Avant : « Erstmanifestation einer paranoiden Schizophrenie (ICD-10 F20.0) bei einem 23-jährigen Patienten… »
- Après : « Erstmanifestation einer paranoiden Schizophrenie, ohne akute Fremdgefährdung, mit passiven
  Lebensüberdrussgedanken ohne Handlungsdruck. »
- Le code passe dans la deuxième phrase (« Kodiert als F20.0 nach ICD-10. »).

**demenz** (444 → 196)
- Avant : « Verdacht auf eine Demenz vom Alzheimer-Typ mit spätem Beginn (F00.1 / G30.1), derzeit leicht- bis
  mittelgradig ausgeprägt… »
- Après : « Wahrscheinliche Demenz vom Alzheimer-Typ mit spätem Beginn, leicht- bis mittelgradig, bei
  Alleinleben und gefährdeter Alltagskompetenz. »

**opioidabhaengigkeit** (393 → 194)
- Avant : « Opioidabhängigkeit (ICD-10 F11.2) von ärztlich verordnetem Oxycodon nach LWK-1-Berstungsfraktur mit
  aktuellem mittelschwerem… »
- Après : « Opioidabhängigkeit von verordnetem Oxycodon mit mittelschwerem Entzugssyndrom, bei passiven
  Todeswünschen und früherer Überdosierung. »

**vorhofflimmern** (372 → 184)
- Avant : « Tachyarrhythmia absoluta bei Vorhofflimmern (absolute Arrhythmie), aktuell seit vier Tagen und damit
  länger als 48 Stunden anhaltend… »
- Après : « Tachyarrhythmia absoluta bei Vorhofflimmern seit vier Tagen, also länger als 48 Stunden, bisher
  ohne orale Antikoagulation. »
- « bei bislang FEHLENDER oraler Antikoagulation » n'est plus redit plus loin.

**polymyalgia** (501 → 174)
- Avant : « Polymyalgia rheumatica mit begleitender Riesenzellarteriitis (Arteriitis temporalis) bei einer
  72-jährigen Patientin… »
- Après : « Polymyalgia rheumatica mit begleitender Riesenzellarteriitis und akuter Erblindungsgefahr nach
  Amaurosis fugax. »

**leistenhernie** (272 → 198)
- Avant : « Symptomatische, aktuell reponible Leistenhernie rechts — klinisch am ehesten eine indirekte
  (laterale) Hernie mit Ausstrahlung ins Skrotum… »
- Après : « Symptomatische, aktuell reponible Leistenhernie rechts nach vorübergehender Inkarzeration vor drei
  Tagen: dringliche Operationsindikation. »

**bauchaortenaneurysma** (704 → 187)
- Avant : « Symptomatisches infrarenales Bauchaortenaneurysma mit Verdacht auf drohende beziehungsweise gedeckte
  retroperitoneale Ruptur — Notfall… »
- Après : « Symptomatisches infrarenales Bauchaortenaneurysma mit Verdacht auf drohende oder gedeckte
  retroperitoneale Ruptur: ein Notfall. »

## 4. Mesure dans le DOM

Montage :
- vite sur le port 5317, avec `VITE_AUTH_MODE=public` et `VITE_SUPABASE_URL=http://fake-supabase.test` ;
- `functions/v1/content` intercepté, servant les 2 687 items construits par le mapping de
  `publishContent.mjs`, sur la branche ; toute autre requête vers l'URL factice est coupée ;
- playwright-core 1.63 en headless, 20 s par étape, script borné à 10 min, vite tué à la fin (port libéré,
  vérifié).

On lit le premier `<p>` de la carte « Phrases de Fallvorstellung » sur `/#/simulation/<id>/pre`. Les 15 cas
sont choisis parmi les plus longs avant le lot, les plus serrés après, et ceux qui avaient un code, un
« Patient » redit ou un point décisif.

| Cas | Ligne (car.) | « … » | « Patient » | Mot répété |
|---|---|---|---|---|
| gicht | 167 | non | 1 | — |
| hyperthyreose | 155 | non | 1 | — |
| karpaltunnel | 177 | non | 1 | — |
| schizophrenie | 197 | non | 1 | — |
| demenz | 196 | non | 1 | — |
| panikstoerung | 196 | non | 1 | — |
| vorhofflimmern | 184 | non | 1 | — |
| zoster | 187 | non | 1 | — |
| polymyalgia | 174 | non | 1 | — |
| akute-leukaemie | 181 | non | 1 | — |
| psoriasis | 195 | non | 1 | — |
| opioidabhaengigkeit | 194 | non | 1 | — |
| sturz-im-alter | 177 | non | 1 | — |
| bauchaortenaneurysma | 187 | non | 1 | — |
| lymphom | 166 | non | 1 | — |

Les longueurs du DOM sont identiques à celles du calcul. « Patient » vaut 1 : c'est celui de l'amorce.
« Mot répété » compte les mots de quatre lettres ou plus du diagnostic, hors mots-outils.

## 5. Erreurs cliniques repérées, non corrigées

Le sens de chaque VD est resté le même. Ces points sont à trancher par la revue clinique :

1. **psoriasis.** La première phrase dit « Schwerer Schub », la dernière « nach der Rule of Tens mittelschwer
   bis schwer ». Les deux étaient déjà dans l'ancienne VD.
2. **psoriasis.** « ASS-Einnahme » est donné comme déclencheur du Schub. Ce n'est pas un déclencheur
   classique (bêtabloquants, lithium, antipaludéens) : à vérifier.
3. **nephrotisches-syndrom.** « membranöse Glomerulonephritis » : le terme actuel est « membranöse
   Nephropathie », la lésion n'est pas proliférative.
4. **coxarthrose.** Coxarthrose « primäre », mais un alcool à 100 g/j est cité comme facteur favorisant.
   L'alcool est un facteur de risque de la nécrose de la tête fémorale, donc d'une coxarthrose secondaire.
   À vérifier, avec une éventuelle DD Hüftkopfnekrose.
5. **rheumatisches-fieber.** « zu erwartende erhöhte Entzündungsparameter » est compté comme critère
   mineur rempli avant tout résultat de laboratoire.

Une faute de langue a été corrigée en passant, car la phrase était réécrite : fibromyalgie, « dem typischen
Trias » → « der typischen Trias ».

## 6. Points à trancher

- **Garde plus large que le minimum demandé.** Le test interdit aussi les abréviations écrites et `=`, `<`,
  `>` dans la première phrase. La barre oblique n'est pas interdite : bandscheibenvorfall (hors des 99,
  non modifié) garde « L4/L5 », qui se lit « L4 L5 ». Toutes les phrases réécrites sont sans « / ».
- **« Verdacht auf » en tête.** Après « Verdachtsdiagnose: », trois VD ont perdu leur « Verdacht auf »
  initial, sans changer le degré de certitude :
  - demenz : « Wahrscheinliche Demenz » ;
  - nhl : « Malignes Lymphom, am ehesten vom Non-Hodgkin-Typ » ;
  - glomerulonephritis : « bei Verdacht auf ».

  Les VD qui commencent par « Dringender Verdacht » le gardent (bronchial-, mamma-, prostatakarzinom,
  anorexia-nervosa) : « dringend » est le point clinique.
- **Écritures abrégées gardées à l'oral.** « Crescendo-TIA » (tia), « (Peri-)Myokarditis » (myokarditis),
  « Ann-Arbor-Stadium III » et « I » (lymphom, nhl), « ARCO-Stadium I bis II » (hueftkopfnekrose). Ce sont
  des stades et des sigles qui se prononcent, pas des codes.
- **Âges dans la VD.** 10 VD citent encore l'âge du patient, en accord avec `personalia.age`. Si le lot
  Âges change un âge (et pas seulement la date de naissance), ces VD sont à relire : tonsillitis,
  vorhofflimmern, pankreaskarzinom, demenz, otitis-media, uterus-myomatosus, anorexia-nervosa,
  myokarditis, adnexitis, et pyelonephritis (hors lot).
- **Prompt Oberarzt.** Il lit la VD. Il n'a pas été mesuré à nouveau : la VD s'allonge de 7 % en moyenne
  (§ 1).

## 7. Vérifications (code de sortie)

| Commande | Sortie |
|---|---|
| `npx tsc -b` | 0 |
| `npm test` (193 fichiers, 2 024 tests) | 0 |
| `npm run test:c6` (17 fichiers, 212 tests) | 0 |
| les 19 `scripts/check*.mjs` bloquants de la CI, plus `checkTermRegister --require-all` | 0 chacun |
| `evalDoctopus.mjs --dry` | 0 |
| `node --test`, les 15 fichiers de la CI, chacun lancé seul (dont `checkProbeCoverage.test.mjs`) | 0 chacun |
| `checkCoherence.mjs --case`, 22 cas touchés | 0 × 22 |
| `checkBudgetFloor.mjs origin/main` | 0 |
| `npm run build` | 0 |
| `npm run content:link` | 0 |
| `git merge-tree --write-tree origin/main HEAD` (origin/main c3f0d058) | 0 |
| Mesure DOM, 15 cas | 0 |

Hors CI bloquante :
- `checkCaseCohesion`, `checkQuestionOrder`, `checkCaseQuestionAnswers` : 0.
- `checkProbeOverlap` : 1. Ce script ne lit pas la Verdachtsdiagnose ; il tourne avec `|| true` en CI.

Les 22 cas passés à `checkCoherence --case` : gicht, hyperthyreose, herzinsuffizienz, vorhofflimmern,
lymphom, meningitis, demenz, panikstoerung, schizophrenie, delir, polymyalgia, tia, diabetes-typ1,
anorexia-nervosa, somatoforme-schmerzstoerung, opioidabhaengigkeit, psoriasis, sturz-im-alter,
bauchaortenaneurysma, typhus, leistenhernie, akute-leukaemie.

Nettoyage : les sondes et le paquet d'items sont restés dans le scratchpad. Les 5 dossiers vitest
`$TMPDIR/<nanoid>/client` créés par ce worktree ont été supprimés ; ils ont été identifiés par le chemin
`doctopus-s3-vd` qu'ils contiennent. Ceux d'un autre worktree n'ont pas été touchés.
