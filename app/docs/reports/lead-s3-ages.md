# Lot Âges (série 3) : la date de naissance suit l'âge

Branche `feat/s3-ages`, partie de `origin/main` 378b758a. Référence : **REFERENZDATUM = 2026-10-07**.

## Règle

L'âge (`personalia.age`) est la valeur de référence. Il n'a pas été modifié : 0 âge sur 130 a changé.
La date de naissance en découle. On a `âge = année(REFERENZDATUM) − année de naissance`, moins 1 si l'anniversaire n'est pas encore passé au 7 octobre.
Elle apparaît à trois endroits, qui doivent donner la même date :

| endroit | forme |
|---|---|
| `personalia.geburtsdatum` | `JJ.MM.AAAA` |
| réplique `antworten['pers-alter']` | « geboren am 1. März 1965 ». Le jour s'écrit en chiffres ou en ordinal, l'année en chiffres ou en lettres. |
| `arztbrief.einleitung` (`caseMuster.ts`) | « geboren am 01.03.1965 » |

## Mesure avant / après

| | avant (378b758a) | après |
|---|---|---|
| champ `geburtsdatum` présent | 24 | **130** |
| cas avec une date complète, quel que soit l'endroit | 26 | **130** |
| cas dont la date contredit l'âge | **13** | **0** |
| réplique `pers-alter` avec la date | 24 | **128** (2 exceptions motivées) |
| `einleitung` avec « geboren am » | 19 | **130** |
| garde `checkGeburtsdatum.mjs` | exit 1, 120 cas en écart | **exit 0**, 130 cas contrôlés |

## Les 13 corrections

On garde le jour et le mois ; seule l'année change. Chaque année a été recalculée par la garde, et non reprise de l'audit.

| cas | âge | avant → après | endroits corrigés |
|---|---|---|---|
| magenkarzinom | 61 | 01.03.1962 → **1965** | champ, réplique |
| osg-fraktur | 34 | 03.09.1991 → **1992** | champ, réplique |
| reizdarm | 52 | 14.07.1968 → **1974** | champ, réplique, Arztbrief |
| schlaganfall | 79 | 12.02.1942 → **1947** | champ (date ajoutée dans la réplique et l'Arztbrief) |
| tvt | 52 | 04.04.1971 → **1974** | champ (date ajoutée dans la réplique et l'Arztbrief) |
| diabetes | 50 | 03.02.1975 → **1976** | réplique, Arztbrief (champ ajouté) |
| copd | 66 | 24.07.1957 → **1960** | champ, réplique, Arztbrief |
| asthma | 27 | 12.03.1997 → **1999** | champ, réplique, Arztbrief |
| nierenkolik | 79 | 12.03.1942 → **1947** | champ, réplique (« zwölften März 1947 »), Arztbrief |
| lymphom | 47 | 14.03.1977 → **1979** | champ, réplique (« neunzehnhundertneunundsiebzig »), Arztbrief |
| pankreaskarzinom | 63 | 18.07.1961 → **1963** | champ, réplique, Arztbrief |
| karpaltunnel | 52 | 15.09.1973 → **1974** | champ, réplique, Arztbrief |
| panikstoerung | 38 | 04.03.1986 → **1988** | champ, réplique, Arztbrief |

`case-hyperthyreose` n'avait la date (04.02.1977) que dans la réplique, et elle était juste. Le champ a été ajouté.

## Les 104 cas complétés

Il s'agit de 103 cas sans aucune date, plus `case-demenz`, dont la réplique ne donne que le mois.

**Règle de génération** (script ponctuel, gardé dans le scratchpad et non dans `app/scripts/`) :
- **Même patient, même date.** Si deux cas ont le même nom et le même âge, ils reçoivent la même date. Il y a 8 reprises : tia = schlaganfall, bronchialkarzinom = copd, nhl = lymphom, glomerulonephritis = morbus-crohn, itp = otitis-media, uterus-myomatosus = lyme, hueftkopfnekrose = pertussis, psoriasis = rheumatoide-arthritis. Un même nom avec un âge différent désigne une autre personne et reçoit sa propre date.
- **Jour et mois** : tirés d'un hachage SHA-256 de l'identifiant du cas. Le tirage est donc reproductible. Le jour reste valide pour le mois, et on écarte tout couple jour.mois déjà pris. Au total, 110 couples jour.mois sont distincts sur 130. Les doublons viennent des 8 reprises et de l'amas « 12.03 / 14.03 » des dates existantes, qui a été conservé. Les 12 mois sont représentés, de 6 à 13 cas par mois hors mars.
- **Demenz** : le mois de mars est imposé par la réplique (« Geboren bin ich im März »), ce qui donne 20.03.1943.
- **Année** : calculée à partir de l'âge et de REFERENZDATUM, avec la même formule que la garde.

**Réplique** : on garde la forme existante et on n'y ajoute que la date.

| forme | cas |
|---|---|
| « Ich bin N Jahre alt, geboren am 1. Mai 1968. » | 86 |
| « Ich bin N, geboren am 30. Dezember 1970. » | 14 |
| schenkelhalsfraktur, fibromyalgie, karzinoid : la phrase « Geboren am … » est ajoutée en fin de réplique | 3 |
| somatoforme-schmerzstoerung : « Ich bin 32, geboren am 17. Januar 1994. Zweiunddreißig, … » | 1 |

Cela fait 102 cas du lot, plus schlaganfall et tvt, soit 104 répliques complétées.

**Arztbrief** : « , geboren am JJ.MM.AAAA, » est inséré juste après « Herrn/Frau Prénom Nom ». Exemple : « über Herrn Karl Aupperle, geboren am 01.05.1968, einen 58-jährigen Patienten ». Il y a 111 insertions et 9 corrections d'année.

Dates attribuées (âge → date) : leberzirrhose 58 → 01.05.1968 · angina-pectoris 64 → 13.11.1961 · pankreatitis 55 → 30.12.1970 · gib 71 → 29.04.1955 · divertikulitis 67 → 14.01.1959 · cholezystitis 49 → 30.05.1977 · kolorektales-ca 68 → 05.10.1958 · gerd 42 → 26.10.1983 · myokardinfarkt 59 → 08.03.1967 · oesophaguskarzinom 53 → 17.11.1972 · ulcus 38 → 22.09.1988 · appendizitis 41 → 10.04.1985 · depression 55 → 26.07.1971 · pneumonie 56 → 07.09.1970 · pyelonephritis 76 → 02.08.1950 · pavk 60 → 24.11.1965 · lyme 44 → 03.04.1982 · bandscheibenvorfall 52 → 10.06.1974 · gicht 45 → 22.08.1981 · multiple-sklerose 34 → 22.06.1992 · gallenkolik 40 → 10.11.1985 · migraene 39 → 26.06.1987 · tonsillitis 65 → 08.11.1960 · vorhofflimmern 68 → 05.02.1958 · hypothyreose 45 → 25.10.1980 · lungenembolie 58 → 09.08.1968 · eug 35 → 19.08.1991 · meningitis 34 → 20.04.1992 · zoster 63 → 25.07.1963 · osteoporose 55 → 02.05.1971 · bph 73 → 21.02.1953 · demenz 83 → 20.03.1943 · bronchialkarzinom 66 → 24.07.1960 · mammakarzinom 54 → 06.01.1972 · rheumatoide-arthritis 41 → 04.11.1984 · gonarthrose 69 → 05.04.1957 · struma 54 → 12.06.1972 · otitis-media 34 → 10.01.1992 · ileus 64 → 22.10.1961 · lagerungsschwindel 58 → 20.02.1968 · synkope 68 → 01.02.1958 · zoeliakie 46 → 27.05.1980 · schenkelhalsfraktur 90 → 11.06.1936 · alkoholentzug 45 → 03.07.1981 · itp 34 → 10.01.1992 · uterus-myomatosus 44 → 03.04.1982 · akutes-nierenversagen 79 → 15.07.1947 · fibromyalgie 53 → 02.02.1973 · polymyalgia 72 → 09.07.1954 · pneumothorax 23 → 16.09.2003 · schlafapnoe 61 → 18.08.1965 · schizophrenie 23 → 16.05.2003 · delir 81 → 17.05.1945 · achalasie 38 → 22.05.1988 · septische-arthritis 68 → 08.09.1958 · spinalkanalstenose 71 → 02.06.1955 · hws-diskusprolaps 68 → 08.02.1958 · laktoseintoleranz 29 → 28.03.1997 · tia 79 → 12.02.1947 · diabetes-typ1 24 → 03.08.2002 · gastroenteritis 54 → 20.08.1972 · rheumatisches-fieber 48 → 16.08.1978 · influenza 45 → 21.10.1980 · coxarthrose 57 → 09.04.1969 · metabolisches-syndrom 53 → 04.06.1973 · karzinoid 48 → 01.12.1977 · abszess 31 → 08.01.1995 · anorexia-nervosa 19 → 17.09.2007 · malaria 44 → 04.08.1982 · endokarditis 63 → 13.09.1963 · covid19 56 → 30.08.1970 · anaphylaxie 53 → 23.07.1973 · reaktive-arthritis 48 → 26.03.1978 · pertussis 42 → 30.11.1983 · colitis-ulcerosa 54 → 23.04.1972 · chronische-pankreatitis 43 → 06.11.1982 · myokarditis 28 → 05.08.1998 · nephrotisches-syndrom 58 → 06.12.1967 · akute-leukaemie 49 → 22.04.1977 · endometriose 31 → 13.02.1995 · ptbs 35 → 29.05.1991 · somatoforme-schmerzstoerung 32 → 17.01.1994 · hueftkopfnekrose 42 → 30.11.1983 · glomerulonephritis 26 → 14.03.2000 · nhl 47 → 14.03.1979 · cml 56 → 07.11.1969 · adnexitis 23 → 20.12.2002 · allergische-rhinitis 25 → 10.05.2001 · typhus 47 → 17.07.1979 · obstipation 73 → 27.10.1952 · sturz-im-alter 75 → 08.07.1951 · lumboischialgie 42 → 18.09.1984 · bauchaortenaneurysma 71 → 05.12.1954 · aortendissektion 63 → 07.03.1963 · perikarditis 34 → 06.04.1992 · epilepsie 27 → 23.11.1998 · hodentorsion 19 → 27.06.2007 · basaliom 71 → 23.06.1955 · psoriasis 41 → 04.11.1984 · urtikaria 53 → 07.04.1973 · perniziose-anaemie 66 → 19.12.1959 · opioidabhaengigkeit 38 → 24.06.1988 · sinusitis 58 → 23.08.1968 · arterielle-hypertonie 45 → 08.12.1980.

## Garde

`app/scripts/checkGeburtsdatum.mjs` (avec `checkGeburtsdatum.test.mjs`, 10 tests `node --test`), branchée dans `.github/workflows/quality.yml` :
- `REFERENZDATUM` est l'**unique** constante de l'année. La décaler d'un an décale l'année de naissance des 130 cas, sans toucher aux âges.
- Pour chacun des 130 cas, sans exception :
  - le champ est présent, au format JJ.MM.AAAA, et la date est valide ;
  - l'âge est cohérent avec REFERENZDATUM ;
  - l'`einleitung` porte « geboren am » à la même date ;
  - toute date de la réplique est identique à celle du champ.
- Réplique sans date, admise seulement pour `REPLIQUE_SANS_DATE`, une liste motivée de 2 cas :
  - `case-demenz` : il ne retrouve pas son année (« das müsste ich zu Hause nachschauen »), c'est un trait clinique ;
  - `case-delir` : le patient confus ignore son âge et sa fille le corrige. Surtout, la réplique est au plafond O3 du prompt externe (11 979 / 12 000 signes) : la date le dépassait (12 004), ce que `prompt.corpus.test.ts` refuse.
- TDD : les deux commits de la garde sont au RED (exit 1, 120 cas) ; les commits de contenu la font passer au GREEN.

## Codes de sortie (sommet de la branche)

| commande | exit |
|---|---|
| `npx tsc -b` | 0 |
| `npm test` (vitest, 193 fichiers, 2 025 tests) | 0 |
| `npm run test:c6` (17 fichiers, 212 tests) | 0 |
| les 26 `node scripts/check*.mjs` de la CI | 0, sauf `checkProbeOverlap` (1) |
| les 16 `node --test` de la CI, dont `checkGeburtsdatum.test.mjs` | 0 |
| `node --test scripts/checkProbeCoverage.test.mjs` (lancé seul) | 0 |
| `node scripts/checkBudgetFloor.mjs origin/main` | 0 |
| `npm run build` | 0 |
| `npm run content:link` | 0 (aucun fichier modifié) |
| `git merge-tree --write-tree origin/main HEAD` (main = c3f0d058) | 0 |
| `git merge-tree --write-tree feat/s3-vd HEAD` | 0 |

`checkProbeOverlap` est informatif en CI (`|| true`). Il rapporte 9 recouvrements entre sondes `fach-*`, qui sont hors de ce lot : aucune sonde n'a été touchée.

## Points à trancher (première passe — tranchés, voir « Passe 2 »)

1. **Dates de consultation passées dans l'Arztbrief (23 cas).** L'`einleitung` de 23 cas date la consultation d'une session d'examen (2021–2025), par exemple « vorstellte am 15.06.2021 » pour nierenkolik.
   - Avec REFERENZDATUM, l'âge de la fiche est l'âge d'aujourd'hui, pas celui de cette date. Exemple : nierenkolik avait 74 ans le 15.06.2021.
   - Avant le lot, nierenkolik, lymphom, pankreaskarzinom et panikstoerung étaient cohérents avec leur date de consultation (c'était l'origine de leur « écart »). Les 19 autres n'avaient pas de date de naissance.
   - Cas concernés : nierenkolik, tonsillitis, lymphom, nhl, pankreaskarzinom, panikstoerung, uterus-myomatosus, fibromyalgie, schlafapnoe, spinalkanalstenose, laktoseintoleranz, tia, diabetes-typ1, gastroenteritis, rheumatisches-fieber, metabolisches-syndrom, anorexia-nervosa, endokarditis, colitis-ulcerosa, hueftkopfnekrose, epilepsie, hodentorsion, psoriasis.
   - Proposition : remplacer ces dates par « am Aufnahmetag », qui est le gabarit majoritaire. La garde pourrait ensuite interdire toute date de consultation antérieure à REFERENZDATUM. Ce lot ne l'a pas fait, car c'est hors du périmètre demandé.
2. **Cliquet PASTE_MAX.** `case-opioidabhaengigkeit` passe à 10 016 signes, soit 16 de plus que le seuil de pièce jointe ChatGPT. La cause est la date ajoutée.
   - Il a été ajouté à `OVER_PASTE_MAX` dans `prompt.corpus.test.ts`, avec un commentaire.
   - Deux options : accepter, ou faire raccourcir une autre de ses répliques par le pôle Contenu. Cette seconde voie est interdite à ce lot.
3. **case-karzinoid** : la réplique comique « Ach, Sie wollten das Alter, nicht das Geburtsdatum? » est maintenant suivie de « Geboren am 1. Dezember 1977. ». La relecture langue doit dire si l'enchaînement reste naturel.
4. **Amas « 12.03 / 14.03 »** dans les dates existantes : 13 cas sur 26 tombent le 12 ou le 14 mars. Ils ont été conservés, comme le brief le demandait. Il faudra les varier si la direction le souhaite.

## Passe 2 — arbitrages du coordinateur appliqués

Les trois points ont été tranchés. delir, demenz et l'amas de mars sont validés tels quels.

### 1. Plus aucune date de consultation dans les Muster

- **Mesure.** Le premier décompte, « 23 cas », ne retenait que les dates qui contredisaient l'âge. Le nouveau contrôle trouve **28 dates dans 26 cas** :
  - 26 dans les `arztbrief.einleitung` ;
  - 1 dans la Vorstellung de `case-diabetes-typ1` (`persoenliche-daten`) ;
  - 1 deuxième date dans l'`einleitung` de `case-cml` (« eines am 03.09.2026 erhobenen Blutbildes »).
  - anaemie, endometriose et cml portaient des dates de 2026, pourtant cohérentes avec l'âge. Elles sont retirées aussi.
  - Aucune autre forme de date n'a été trouvée dans les Muster, ni « 15. Juni 2021 » ni « 03.09. ».
- **Remplacement.** La phrase garde sa grammaire ; seule la date change :
  - « am Aufnahmetag » pour une admission (Notaufnahme, notfallmäßig, Klinik), en 11 endroits : nierenkolik, pankreaskarzinom, panikstoerung, tia, diabetes-typ1, gastroenteritis, rheumatisches-fieber, metabolisches-syndrom, endokarditis, epilepsie, hodentorsion (« am Aufnahmetag um 7:30 Uhr ») ;
  - « am heutigen Tag » pour une consultation ambulatoire (Ambulanz, Sprechstunde), en 15 endroits : tonsillitis, anaemie, lymphom, uterus-myomatosus, fibromyalgie, schlafapnoe, spinalkanalstenose, laktoseintoleranz, anorexia-nervosa, colitis-ulcerosa, endometriose, hueftkopfnekrose, nhl, cml, psoriasis ;
  - « heute » dans la Vorstellung orale de diabetes-typ1 : « der sich heute auf Überweisung seines Hausarztes … vorgestellt hat » ;
  - pour cml, la date de la prise de sang devient relative : « wegen eines vor einer Woche erhobenen auffälligen Blutbildes ». Les deux dates d'origine étaient séparées de 7 jours.
- **Garde.** Nouvelle règle dans `checkGeburtsdatum.mjs` : dans les Muster `arztbrief` et `vorstellung`, aucune date au format jj.mm.aaaa, sauf celle qui suit « geboren am ».
  - Le test est passé au RED (26 cas, 28 dates), puis au GREEN. `checkGeburtsdatum.test.mjs` compte maintenant 11 tests.
- **Vérifié sans rien modifier.**
  - **examinerSheet** : 5 dates, toutes des dates de protocole d'examen (lymphom ; karzinoid ×4 : « Diese Frage wurde in Freiburg am 18.03.2025 … gestellt »). Ce ne sont pas des dates de consultation, elles sont légitimes, au même titre que `pruefungsfallen`.
  - Aucune date de consultation dans les autres Muster de Vorstellung.

### 2. opioidabhaengigkeit : sans exception

- Le cas est retiré de `OVER_PASTE_MAX`. `prompt.corpus.test.ts` est revenu **identique à main**.
- **Réplique raccourcie** : `akt-psych-antrieb`, sur 17 signes.
  - Avant : « Ja, aufstehen fällt mir schon lange schwer, ~~nicht nur heute~~. Und Freude, ehrlich, an nicht mehr viel. … »
  - Après : « Ja, aufstehen fällt mir schon lange schwer. Und Freude, ehrlich, an nicht mehr viel. … »
  - « nicht nur heute » répétait « schon lange ». Aucun fait clinique n'est perdu, et la voix est conservée (« ehrlich », l'anecdote de la pêche).
- Le prompt patient du cas mesure **9 999 signes**, sous le seuil PASTE_MAX de 10 000. Il ne reste qu'un signe de marge.

### 3. case-karzinoid

- Avant : « Achtundvierzig. — Ach, Sie wollten das Alter, nicht das Geburtsdatum? Achtundvierzig Jahre, ja. Geboren am 1. Dezember 1977. »
- Après : « Achtundvierzig. — Ach so, das Geburtsdatum wollen Sie auch? Geboren am 1. Dezember 1977. »
- Le ton d'origine est gardé : l'âge vient d'abord, seul, puis la patiente se rattrape. L'âge est toujours dit en lettres.

### Codes de sortie (passe 2)

| commande | exit |
|---|---|
| `npx tsc -b` | 0 |
| `npm test` (2 025 tests) | 0 |
| `npm run test:c6` | 0 |
| les 26 `node scripts/check*.mjs` de la CI | 0, sauf `checkProbeOverlap` (1) : informatif (`\|\| true`), même 9 recouvrements `fach-*` qu'en passe 1, hors périmètre |
| les 16 `node --test` de la CI, dont `checkGeburtsdatum.test.mjs` (11/11) | 0 |
| `node --test scripts/checkProbeCoverage.test.mjs` (lancé seul) | 0 |
| `node scripts/checkBudgetFloor.mjs origin/main` | 0 |
| `npm run build` | 0 |
| `npm run content:link` | 0 (aucun fichier modifié) |
| `git merge-tree` contre origin/main et contre feat/s3-vd | 0 |

## Passe 3 — correctifs de la revue langue

La revue langue n'a relevé aucune faute bloquante. Tous ses correctifs et suggestions sont appliqués.

### Mineurs

- **Weidel** (somatoforme-schmerzstoerung, `pers-alter`) : la date passe après l'écho. La réplique devient « Ich bin 32. Zweiunddreißig, und ich fühle mich wie sechzig. Geboren bin ich am 17. Januar 1994. »
- **Kaiser** (metabolisches-syndrom) : le bilan est ambulatoire (ambulante Polygraphie, aucune admission). L'`einleitung` passe donc à « am heutigen Tag ».
- **opioidabhaengigkeit `akt-psych-antrieb`** : « das Aufstehen » remplace « aufstehen ».
  - Cela ajoute 4 signes et aurait fait passer le prompt à 10 003. Pour compenser, le « schon » de remplissage de la même réplique est retiré : « das mache ich ~~schon~~ seit Monaten nicht mehr ». Aucun fait clinique n'est perdu, et la tournure « schon lange » du début reste en place.
  - Le prompt patient mesure **9 997 signes**, sous le seuil de 10 000.

### Suggestions

- **karzinoid** : la réplique devient « Achtundvierzig. — Ach so, das Geburtsdatum wollen Sie auch noch? Geboren am 1. Dezember 1977. »
- **Lisele Müller, 90 ans** (schenkelhalsfraktur) : la réplique devient « Ich bin neunzig. Neunzig Jahre, ja. Geboren am elften Juni sechsunddreißig. »
- **nierenkolik** : la date s'écrit désormais tout en lettres, comme lymphom : « geboren am zwölften März neunzehnhundertsiebenundvierzig ». Pour ce patient de 79 ans, c'est la forme orale la plus naturelle.
  - *Reste* : `case-prostatakarzinom` porte le même mélange (« zwölften März 1953 »). Cette réplique est antérieure au lot et n'a pas été touchée ; elle est à harmoniser si tu le souhaites.

### « am Aufnahmetag » en ambulatoire, un défaut antérieur au lot

J'ai lu chaque `einleitung` en même temps que le `diagnostik-therapie` de son cas, pour savoir s'il prévoit une admission.

- **Passent à « am heutigen Tag » (19)**, parce que la consultation en Ambulanz ou en Sprechstunde n'aboutit à aucune admission :
  - angina-pectoris, depression, pavk, reizdarm, hyperthyreose, bronchialkarzinom, morbus-crohn, karpaltunnel, otitis-media, zoeliakie, leistenhernie, achalasie, hws-diskusprolaps, coxarthrose, ptbs, perniziose-anaemie ;
  - multiple-sklerose, diabetes et migraene, dont le texte écarte l'admission : « Eine stationäre Aufnahme war nicht erforderlich », et « nach Hause entlassen » pour migraene.
  - S'y ajoute **metabolisches-syndrom**, vu plus haut (« in unserer Klinik »), soit 20 au total.
  - **Conséquence pour perniziose-anaemie** : `diagnostik-therapie` disait « noch am Aufnahmetag eine parenterale Substitution ». Cela devient « noch am Vorstellungstag », pour rester cohérent avec la nouvelle `einleitung`.
- **Gardent « am Aufnahmetag »** :
  - **itp** : admission depuis l'Ambulanz (« die stationäre Aufnahme sowie eine Erstlinientherapie », 11 000 plaquettes/µl avec saignements des muqueuses). Le cas est listé dans `AUFNAHME_AUS_AMBULANZ` ;
  - **rheumatisches-fieber** : admission (« in unserer Klinik », « stationäre Aufnahme mit Bettruhe »).
- **« am heutigen Tage » → « am heutigen Tag »** (8) : erysipel, hypothyreose, zoster, rheumatoide-arthritis, prostatakarzinom, hepatitis-b, commotio, karzinoid.

### Garde

Le test a d'abord été commité au RED, puis la garde (27 cas en écart), avant les correctifs qui la font passer au GREEN. `checkGeburtsdatum.test.mjs` compte maintenant 12 tests.

- La réplique accepte « Geboren bin ich am … ».
- Elle lit aussi l'année abrégée en lettres (« sechsunddreißig »). L'année retenue est la plus récente qui ne dépasse pas REFERENZDATUM.
- **Nouvelle règle** : une `einleitung` qui mentionne Sprechstunde ou Ambulanz ne doit pas contenir « Aufnahmetag », sauf si le cas figure dans la liste motivée `AUFNAHME_AUS_AMBULANZ` (aujourd'hui `case-itp`).
- **Nouvelle règle** : « am heutigen Tage » est interdit.
- **Limite** : la règle Aufnahmetag ne détecte pas une `einleitung` qui dit seulement « in unserer Klinik » sans préciser Ambulanz ou Sprechstunde. C'était le cas de Kaiser, corrigé à la main.

### Codes de sortie (passe 3)

| commande | exit |
|---|---|
| `npx tsc -b` | 0 |
| `npm test` (2 025 tests) | 0 |
| `npm run test:c6` | 0 |
| les 26 `node scripts/check*.mjs` de la CI | 0, sauf `checkProbeOverlap` (1) : informatif, mêmes 9 recouvrements `fach-*` |
| les 16 `node --test` de la CI, dont `checkGeburtsdatum.test.mjs` (12/12) | 0 |
| `node --test scripts/checkProbeCoverage.test.mjs` (lancé seul) | 0 |
| `node scripts/checkBudgetFloor.mjs origin/main` | 0 |
| `npm run build` | 0 |
| `npm run content:link` | 0 (aucun fichier modifié) |
| `git merge-tree` contre origin/main et contre feat/s3-vd | 0 |
