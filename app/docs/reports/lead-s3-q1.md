# Lot Q1 — questions du cas : fautes P0 du chapitre `aktuell`

Branche `feat/s3-q1-aktuell` (base `origin/main` @ `76899950`, Q0 mergé). Statut : **DONE_WITH_CONCERNS** — tout est vert par code de sortie ; les réserves sont dans « Écarts » et « Non vérifié ».

Sources : `audit-questions-du-cas-serie3.md` (Synthèse 3, 4, 13, 17 ; §2 G3 ; §5 ; §6), `lead-s3-q0.md` (Revues), `docs/contracts/frage-atomique.md` §3.2, `DIRECTION-STYLE.md`. Numéros de ligne : `app/src/data/seedCases.ts` au sommet de la branche.

## Table cas × faute × correction × preuve

| Cas | Faute | Correction | Preuve |
|---|---|---|---|
| coxarthrose | « Beginnt der Schmerz wirklich im Knie… » contredit akt-ort (Leiste) | question retirée ; la projection vers le genou est dite par le patient dans `akt-ausstrahlung` / `fach-ortho-ausstrahlung` (« da merke ich es manchmal am deutlichsten… ») ; persona alignée sur la fiche | `git show 522233c6` ; fiche `antworten` du cas |
| coxarthrose | « den zweiten Stock » (fam-wohnen, rang 61) | « Fällt Ihnen das Ein- und Aussteigen… schwer ? » + relance « Wie kommen Sie Treppen hoch ? » | :42170 ; `checkQuestionOrder` : ORD et NP disparus |
| coxarthrose ×2 | questions d'examinateur « klagt zuerst über Knieschmerzen » | « Der Patient hält das Knie für sein Problem, der Schmerz zieht bis dorthin… » (liste + `examinerSheet`) | :42178, :42226 ; coïncide avec `schwierigeReaktionen` (« Weh tut mir doch das Knie ») |
| covid19 | « das mit dem Burnout » (dit en veg-schlaf, rang 36) | « Kennen Sie dieses Herzrasen schon von früher ? » ; ligne ajoutée aux `negativeFindings` | :45906, :45645 |
| reaktive-arthritis | « Ihrem Heuschnupfen » (dit en vor-erkrank) | comparaison retirée ; réponse existante `fach-rheuma-systemisch` | :46874 |
| influenza | « Ihr Notfallspray » (Asthma dit en vor-erkrank) | « Luftnot, Engegefühl, pfeifende Atmung ? » + relance « Falls ja: Was nehmen Sie dagegen… ? » | :41622 ; réponse `med-regelmaessig` |
| prostatakarzinom | « Sie nehmen seit Jahren Tamsulosin » (fach-uro-vorgeschichte, rang 29) | part des mots du patient (akt-motiv : « die Tabletten für die Prostata ») : « …am Anfang geholfen ? » + « Falls ja: Wie lange, und seit wann lässt die Wirkung nach ? » | :23863 ; `akt-frueher`, `fach-uro-vorgeschichte` |
| achalasie | « Sie nehmen Magenschutztabletten » (nom dit en vor-erkrank) | « Hat Ihnen schon ein Arzt etwas gegen die Beschwerden verordnet ? » + « Falls ja: Seit wann, und hat es geholfen ? » | :36745 ; `akt-einfluss`, `fach-gastro-sodbrennen`, `med-regelmaessig` |
| ptbs | « dem Motorrad » | `:50673` est la fiche examinateur, pas une réponse patient ; le Motorrad n'est introduit que par la réponse à la question d'ouverture du trauma. Mot retiré quand même (ordre-indépendant) | :50782 ; l'évitement est dans `begleitsymptome` (« Vermeidung : … Motorrad, Kreuzung, Club ») |
| metabolisches-syndrom | « Ihrer Netzhaut » (dit en fach-endo-augen) | « Waren Sie in letzter Zeit beim Augenarzt ? » + « Falls ja: Was hat er festgestellt… ? » | :42763 |
| rheumatoide-arthritis | « Sie haben eine Schuppenflechte » | **pas de faute** : dite en `fach-rheuma-haut` (rang 32) et `vor-erkrank` (rang 44), avant la question (rang 47) | `kw.mjs` sur la trame jouée |
| karpaltunnel | « Sie hatten… einen Bruch » | **pas de faute** : `akt-frueher` (rang 19), `fach-ortho-mechanismus`, `vor-op` (rang 41) avant la question (rang 44) | idem |
| malaria | « Sie haben keine Milz mehr » | **pas de faute** : `vor-erkrank` (rang 38) et `vor-op` (rang 39) avant la question (rang 41) | idem |
| hypothyreose | « Ihrer Entbindungen » | **pas de présupposition** : la Geburt est dite en `akt-frueher` (rang 20). Redondance avec cette réponse, hors liste → laissée (Q6) | idem |
| pankreatitis, chronische-pankreatitis, cholezystitis, bandscheibenvorfall, hws-diskusprolaps, nierenkolik, perikarditis, hodentorsion | l'irradiation est posée par la sonde jouée **et** par une question du cas qui nomme les territoires déjà dans la réponse de la sonde | question du cas retirée (la sonde jouée suffit et sa réponse nomme les mêmes territoires). chronische-pankreatitis : la moitié « Essen / Alkohol » est déjà dans `akt-einfluss` et `fach-gastro-speisen` | `git show 34c3335d` ; sonde `measure.mjs` (ci-dessous) |
| abszess | idem + versant neuro | garde « Haben Sie im Bein ein Kribbeln, ein Taubheitsgefühl oder eine Schwäche bemerkt ? » | :43872 ; réponse en `negativeFindings` |
| hueftkopfnekrose | idem + « das Knie selbst » avant que le genou soit nommé | ne garde que « Haben Sie den Eindruck, dass das Knie selbst das Problem ist ? », kapitel `fach` (après l'irradiation qui nomme le genou) | :51743 ; réponse `akt-ausstrahlung` (« Manchmal denke ich, das Knie selbst tut weh ») |
| pneumothorax | « Rauchen Sie ? … Cannabis ? » | retirée : `nox-rauchen` (+ relance) et `nox-drogen` (« …zum Beispiel Cannabis ? ») y répondent | `git show 68b1fe9f` ; trame jouée |
| karpaltunnel | « Ausschütteln » | retirée : `akt-einfluss` nomme le Ausschütteln | idem |
| diabetes | Kortison redemandé | « Hatten Sie jemals eine Bauchspeicheldrüsenentzündung ? » (le Kortison est dans `med-blutverduenner`) | :8027 |
| osteoporose | Kortison redemandé | ne garde que les Stoßtherapien (la dose et la durée sont dans `med-regelmaessig`) | :18906 ; fiche : « mehrfachen Kortison-Stoßtherapien » |
| osteoporose (bws) | seule irradiation jouée : « gürtelförmig » ; Beine, Arm, Hals/Kiefer non demandés alors que la fiche y répond | question ouverte « Strahlt der Schmerz irgendwohin aus ? » (aucun territoire : la garde G1 limite bws à Brustkorb/Rücken/Bauch), avant « gürtelförmig » | :18902 ; `irradiationRegion.test.ts` vert |
| leberzirrhose | nature `allgemein` pour une douleur | `leitsymptomKategorie: 'schmerz'` + `motiv.region: 'abdomen'` | :22 |
| leberzirrhose | 4 réponses manquantes | `akt-ort`, `akt-charakter`, `akt-intensitaet`, `akt-ausstrahlung` tirées du bloc `schmerz` ; `akt-verlauf` : « Er » → « Die Schmerzen » | :76 et suivantes ; `checkProbeCoverage` 0 |
| leberzirrhose | « Bauch dicker » double la question Schwellungen | la variante douleur ne pose plus Schwellungen : « Ist Ihr Bauch dicker geworden — passen die Hosen noch ? » + relance « Sind auch die Beine geschwollen ? » | :201 |
| leberzirrhose | rien ne demande Ikterus ni encéphalopathie | 2 questions courtes ; réponses déjà en `negativeFindings` | :203, :204 |
| leberzirrhose | `fach-gastro-speisen` (« in den letzten Stunden ») | `fachSkip` ; la réponse reste dans la fiche | :25 |

## Mesures avant / après

Sonde `playedTrame` (le montage réel, 130 cas) : `…/scratchpad/q1/dump.mjs` + `measure.mjs`, hors du dépôt.

| Mesure | Avant | Après |
|---|---|---|
| Cas avec une sonde d'irradiation **et** une question propre qui la repose | 10 | **1** (osteoporose, volontaire : question ouverte + « gürtelförmig ») |
| Cas à ≥ 2 sondes d'irradiation | 1 (hodentorsion, exception C-1 de Q0) | 1 (inchangé) |
| Questions du cas jouées | 874 | 866 (−11 retirées, +3 ajoutées) |
| `checkQuestionOrder` (informatif) | 28 candidats (ordinal 1 · SN 24 · affirmation 3) | **17** (ordinal 0 · SN 16 · affirmation 1) : les 8 de l'audit, plus hws « den Daumen » et hueftkopfnekrose « das Knie » |
| `checkQuestionAtomicity` A / B / C | 510 / 114 / 0 | **502 / 113 / 0** (gravé par `--bless`, `ae0e75b7`) ; ne monte pas |
| `checkProbeOverlap` (informatif, exit 1 au socle) | 5 répétitions non marquées | 5, sortie identique |

Candidats restants de `checkQuestionOrder` : malaria `Sie haben` et hypothyreose `Entbindungen` sont jugés faux positifs (voir table). Les 15 autres ne sont pas relus un à un ; quatre sondés (laktoseintoleranz, obstipation, anaphylaxie, sturz-im-alter) sont des faux positifs ou des mineurs (« Biene » est dit dès akt-motiv d'anaphylaxie).

## Vérifications (par code de sortie), sommet de la branche

- Tous les `app/scripts/check*.mjs` : 0, sauf `checkProbeOverlap` : **1, informatif, identique au socle**. `checkBudgetFloor.mjs origin/main` : 0.
- `node --test` (checkQuestionOrder, checkQuestionAtomicity, checkTrameSymptoms, checkBudgetFloor, checkProbeCoverage) : 62/62, exit 0.
- `npx tsc -b --noEmit` : 0. `npx vitest run --dir src/data --maxWorkers=2` : 11 fichiers, 210 tests, exit 0 ; `--dir src` : 131 fichiers, 1 180 tests, exit 0 (charge machine 6–14).

## Ce que j'ai volontairement laissé

- **Hodentorsion** garde ses deux sondes (exception écrite en revue C-1 de Q0) ; sa question propre est retirée.
- **Doublons hors de la liste de l'audit**, vus en passant, non touchés : achalasie « Bleibt das Essen… nur bei fester Nahrung stecken » (cas, rang 19) redit `akt-ausscheid-schlucken` (fest ou flüssig), et « Wie hat sich die Schluckstörung entwickelt » recoupe `akt-verlauf` ; hypothyreose « Entbindungen » redit `akt-frueher` ; leberzirrhose « Veränderung der Farbe von Stuhl oder Urin » (vegetativ) recoupe la relance de `fach-gastro-stuhl`. À Q3–Q6.
- **Orphelins** : les réponses `akt-allgemein-*` de leberzirrhose ne sont plus jouées (variante douleur) ; je les ai gardées, le simulateur lit toute la fiche (comme décidé en Q0).
- **Fiche Fachwissen et visuel de leberzirrhose** : intacts (Lc1).

## Écarts et propositions pour `main`

1. **Persona de coxarthrose** (texte français du simulateur) : elle ordonnait de répondre « au GENOU » à « où avez-vous mal ? », en contradiction avec `akt-ort` / `akt-motiv` (Leiste, Hüfte) — c'était la source de la contradiction relevée par l'audit. Je l'ai réécrite : Leiste d'abord, genou ressenti le plus. Hors de la lettre du brief (« aligne-les sur la fiche »), à valider.
2. **Test `checkQuestionOrder.test.mjs`** : le brief ne le citait pas, mais Q0 avait écrit « la porte sur les données réelles retrouve les 8 » et deux mutations sur ces données. Une fois les 8 fautes corrigées, ces trois tests échouaient. Ils prouvent désormais la détection sur les fixtures (textes réels) et que les 8 ne reviennent pas. Une mutation retrouve coxarthrose **et** covid19.
3. **Budget** : `atomicity-budget.json` regravé (`--bless`), seul changement du fichier.
4. **Trailer des commits** : `Co-Authored-By: Claude Sonnet 5.5`, pas « Opus 5.5 » comme demandé — c'est le modèle qui a écrit les commits, et la consigne d'attribution du harnais le fixe.
5. **Code, à ta décision** (hors périmètre) : la règle Fach `bws` (`anamneseChapters.ts:1724`) ne pose que « gürtelförmig » et masque la question neutre. La correction de fond est d'en faire une question ouverte avec relance ; ma question ajoutée à osteoporose est un contournement au niveau du cas. Contrat `frage-atomique.md` §3.6 : « 28 candidats » devient 17, et « 8/8 détectées » ne vaut plus que sur les fixtures.
6. **Skills non invoqués** : l'outil `Skill` est désactivé dans cette session. Je n'ai pas pu invoquer `dept-coordination` / `dept-contenu`. J'ai lu à la place `CLAUDE.md`, `DIRECTION-STYLE.md` et le contrat `frage-atomique.md`.

## Non vérifié

- Aucune vérification navigateur : l'affichage des relances ajoutées sous leur question et l'écran du simulateur ne sont pas vus. La relance sans condition (« Wie kommen Sie Treppen hoch ? ») est toujours visible par construction (`parseFollowUp` → `immer`) ; je ne l'ai pas vue à l'écran.
- Les réponses aux **questions du cas** ne sont pas couvertes par `checkProbeCoverage` (il ne lit que les sondes) : j'ai relu la fiche de chaque cas pour trouver la réponse, citée dans la table. La fiche covid19 a reçu une ligne, aucune autre n'a été inventée.
- La persona réécrite de coxarthrose n'a pas été jouée contre le modèle.
- Les 15 candidats restants de `checkQuestionOrder` ne sont pas tous relus.
