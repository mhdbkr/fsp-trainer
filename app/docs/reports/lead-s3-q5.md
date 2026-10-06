# Lot Q5 — composées d'`aktuell` (endokarditis → fin), garde anti-doublon, doublons de Q4 § 7a ; lot Q8 — natures de motif

Branche `feat/s3-q5-contenu`, base `origin/main` @ `4624d4d3` (Q3 et Q4 mergés). Commits de `8ec32183` à `b9933833`, un fichier par commit, sans trailer. `origin/main` n'a depuis que 4 commits de registre (`serie3-avancement.md`) : `merge-tree` à 0, aucune fusion nécessaire.

**Statut (fixeur) : DONE** — voir F, qui prime. Premier passage : DONE_WITH_CONCERNS, tout vert par code de sortie (§ 7). Les réserves sont au § 8 : un écart à la lettre du brief (tvt), trois textes patient nouveaux à valider, et la garde « banque » qui reste haute pour des raisons structurelles. Une revue clinique et une relecture de langue suivent.

## F. Fixeur — revues Opus de `61edf409` (décisions de main)

> Clinique : mergeable après 2 P1. Langue : 1 bloquant, 6 importants. Décisions de `main` : tvt (saut entier de « Befund ») accepté ; les constats « banque » relèvent d'un futur lot de guide. **Cette section prime sur la suite quand elles divergent.** Statut : **DONE**, avec quatre écarts motivés (F.3).

### F.1 Clinique

| Point | Fait |
|---|---|
| P1-1 myokardinfarkt | `akt-begleit` → « Mir ist ganz elend, ich kann es gar nicht richtig beschreiben. » |
| P1-2 lyme | « Wird die Rötung größer? » retirée ; `akt-verlauf` → « Das grippige Gefühl ist gleichbleibend. » ; `frageAntworten` de la question Zielscheibe → « Ja, außen ist sie rot und in der Mitte heller. » ; les deux anciens `ADMIS` retirés — voir F.3-b |
| P2 angina-pectoris | `veg-schuettelfrost` → « Nein, kein Schüttelfrost, kein Nachtschweiß. Nur bei den Anfällen schwitze ich manchmal. » |
| P2 sturz-im-alter | `frageAntworten` : Kopf → « Ja, mit der linken Schläfe an den Wannenrand — da ist eine kleine Beule. » ; bewusstlos → « Nein, weg war ich nicht, ich weiß alles noch — ich habe mich mit dem rechten Arm abgestützt. » |
| P2 pertussis | « Zwischendurch huste ich fast gar nicht. » coupée de la description de l'accès, DÉPLACÉE en `frageAntworten` de « Wie geht es Ihnen zwischen den Anfällen … » |
| P2 malaria | réponse du voyage + « Ein Moskitonetz hatte ich nur manchmal. » (voir F.4) |
| P2 kolorektales-ca, oesophaguskarzinom | question du cas « Ist Ihnen eine Gelbfärbung der Haut oder der Augen aufgefallen? » (`gelbfaerbung`), réponse « Nein. » |
| P2 tvt | question du cas « Haben Sie sich am Bein gestoßen oder beim Sport etwas gezerrt? » (`unfallhergang`) ; réponse « Nein, gestoßen habe ich mich nicht, und beim Sport habe ich mir auch nichts gezerrt. » — NEG « kein vorangegangenes Trauma, kein Sturz, keine Sportverletzung am Bein » |
| Doublon itp | « Hatten Sie auch Nasenbluten? » (akt-beginn et akt-einfluss disent le Zahnfleischbluten) ; réponse écrite « Ja, letzte Woche zweimal. » (`begleitsymptome[1]`) |
| Doublon sinusitis | « Wird der Druck im Gesicht schlimmer, wenn Sie sich bücken … » RETIRÉE (akt-intensitaet et akt-einfluss le disent) |
| Doublon bronchialkarzinom | « Heiser seit drei Wochen, » coupé d'`akt-begleit` ; DÉPLACÉ en `frageAntworten` de « Ist Ihre Stimme heiser geworden? » (« Ja, seit drei Wochen. Meine Frau sagt, ich klinge am Telefon fremd. » — `begleitsymptome`) |
| Doublon typhus | « Fühlen Sie sich benommen oder verwirrt … » RETIRÉE (le motif dit « ganz weggetreten », fach-infekt-neuro la description) |
| Doublon malaria | « Malariaprophylaxe habe ich nicht genommen. » coupé de `med-regelmaessig` (la question du cas sur la prophylaxie suit) |
| Rapport | **11 cas** reçoivent un `aktuellSkip` (le § 5.3 disait 13 par erreur) : tvt, mammakarzinom, bronchialkarzinom, kolorektales-ca, oesophaguskarzinom, achalasie, laktoseintoleranz, colitis-ulcerosa, obstipation, bph, prostatakarzinom |

### F.2 Langue

- **Bloquant** : sturz-im-alter `akt-anfall-ablauf` au texte exact ; aucune réplique de sturz-im-alter (`antworten`, `frageAntworten`) ne cite plus « Anfall » (épinglé dans `coherenceQ5`).
- **Importants**, au texte exact : la relance de la fin du malaise (sturz) ; la relance « Falls nein » de l'aura (epilepsie) ; gib (question, clé `frageAntworten`, réponse) ; `followUps: ['Reichte schon das Bücken?']` (osteoporose) ; les cinq `akt-begleit` (myokardinfarkt : texte du P1-1 ; mammakarzinom : voir F.3-a) ; la réponse du nœud inguinal (nhl).
- **Mineurs** : tous, au texte exact, y compris `fach-neuro-anfallzeichen` (texte, parts et catalogue `anamneseProbes.ts` : « Erinnern Sie sich an alles, was davor und danach war? », « Haben Sie dabei Urin verloren? »).

### F.3 Écarts motivés

- **a. mammakarzinom, `akt-begleit`** : la version clinique (« … doch, in der Achsel habe ich etwas getastet ») faisait de la question du cas suivante (« Haben Sie Knoten in der Achselhöhle … getastet? ») un doublon. J'ai pris la version de langue, comme prévu : « Nein, sonst nichts. Ich fühle mich eigentlich ganz gesund — deshalb erschreckt mich dieser Knoten ja so. »
- **b. lyme, `ADMIS`** : une fois « Wird die Rötung größer? » retirée, plus aucune question du cas ne portait `ausschlag` ; la part « Ist Ihnen ein Ausschlag aufgefallen? » d'akt-infekt-herd et la Fach Infekt (« Haben Sie eine Hautveränderung oder Rötung bemerkt? ») revenaient — deux doublons du motif (mesuré). La question de l'anneau déclare donc `['erythem_ring', 'ausschlag']` (elle demande l'aspect de la rougeur ; son `relu` devient sans objet). Ses deux constats (`pers-hausarzt` « wegen des Ausschlags », `akt-beginn` « die Rötung … dazugekommen ») sont admis avec leur **vraie** raison : la réplique nomme la rougeur, la question en demande l'aspect en cocarde. Les anciennes raisons sont retirées.
- **c. nhl** : « Wann und wie ist Ihnen der Knoten aufgefallen? » fait monter A2 (deux interrogatifs coordonnés, budget 32 → 33) et le motif dit déjà « seit zwei Wochen ». La question reste « Wie ist Ihnen der Knoten aufgefallen? » ; la réponse est le texte de langue (« Vor zwei Wochen, beim Duschen — da war er auf einmal da. … »).
- **d. gib** : la question cite « Erbrechen » (lu `uebelkeit`, demandé plus bas par fach-gastro-uebelkeit) : `relu: true`. Pour ne pas dépasser le socle `relu`, l'annotation devenue sans objet de la question des chutes de sturz-im-alter (elle déclare `sturz`) est retirée ; le socle descend à 82 (`--bless`).

### F.4 Ce qui reste à signaler

- **malaria** : « Ein Moskitonetz hatte ich nur manchmal. » est maintenant dit avant la question du cas « Haben Sie unter einem Moskitonetz geschlafen …? » (familie-sozial). La garde ne le voit pas (signe propre au cas). C'est le texte demandé ; si `main` préfère, la phrase revient à la seule question du cas.
- **Garde « banque »** : 367 → **369**, hausse écrite à la main dans `reponseDoublon.test.ts` — deux textes imposés reprennent ce que le motif a dit (pneumonie « das Fieber und der Husten reichen mir », appendizitis « ich glaube, ich habe Fieber »). Diff mesuré constat par constat contre `61edf409` : ces deux lignes seulement.

### F.5 Vérifications — sommet du fixeur (avant ce commit de rapport)

| Commande | Code |
|---|---:|
| `npx tsc -b` | 0 |
| `npx vitest run --dir src --maxWorkers=2` | 0 — 191 fichiers, 2 017 tests |
| `npm run test:c6` | 0 — 183 tests |
| 21 `check*.mjs` + `checkTermRegister --require-all` + `evalDoctopus --dry` | 0, sauf `checkProbeOverlap` 1 (9, comme `main`) |
| `node --test scripts/*.test.mjs` | 0 — 199/199 (ancres de mutation parkinson et lyme alignées) |
| `checkBudgetFloor.mjs origin/main` (@ `e2c6b3ff`) | 0 |
| `npm run build` | 0 |
| `git merge-tree --write-tree origin/main HEAD` | 0 |

Compteurs : atomicité A / A2 / B 295 / 32 / 80 (inchangés) ; `checkCaseQuestionAnswers` 70 ; `relu` 82 ; garde, questions du cas : 0 non admis ; banque 369.

## 0. Hypothèses et écarts, dits avant tout

1. **Lieu d'écriture.** Comme Q3 et Q4 (lots de reprise), le contenu est édité dans `src/data/seedCases.ts` et les guides, pas par un JSON de lot passé à `lotAssembler.py` : il n'y a aucun cas nouveau. La porte `checkCoherence` a été relue cas par cas (`--case`) après chaque groupe d'éditions.
2. **tvt (Q8) — écart à la lettre.** Le brief dit « saute la part (aktuellSkip de la part) ». `aktuellSkip` ne connaît que des sondes (`frage-atomique.md` § 10.8 : « inchangés, sémantique conservée ») ; un saut de part serait un changement de contrat. J'ai sauté **toute** la sonde `akt-veraend-was` pour tvt : ses quatre parts étaient hors sujet ou redites (« Knoten oder Schwellung » : le motif dit « dick geschwollen » ; « Hautveränderung » : `akt-begleit` et `akt-veraend-entwicklung` disent la couleur ; « Blutung » : sans objet). Aucune information de la fiche n'est perdue. Si `main` veut le saut de part, c'est une proposition de contrat (une entrée `sonde~signe`), non faite ici.
3. **sturz-im-alter (Q8) — « renommer, jamais sauter ».** Aucune déclaration par cas n'existe pour changer le mot d'une sonde d'`aktuell` sans toucher au schéma. J'ai pris le mécanisme du moteur fait pour cela (rang 0, R6) : une question du cas qui déclare le signe de la sonde la remplace **à sa place**. C'est déjà ainsi que Q3 a remplacé « Wann war der erste Anfall? ». Le guide n'est modifié que là où la variante entière était fausse (Veränderung, § 5).
4. **malaria (Q8).** Même mécanisme : une question du cas déclare `reise` et prend la place d'`akt-infekt-kontakt` (5ᵉ question). J'ai écarté une règle générale « D4-bis pour `reise` » : elle aurait fait reposer, sous `akt-infekt-kontakt`, les relances « Kontakt / Essen » que la Fach Infekt pose ensuite (mesuré sur malaria et typhus).
5. **Aucun fait clinique inventé.** Les coupes retirent ; les déplacements reprennent le texte de la fiche ; les rares textes nouveaux sont listés au § 6 avec leur source.

## 1. Avant / après

| Compteur | `origin/main` | Q5 |
|---|---:|---:|
| Composées d'`aktuell` dans les questions du cas (A + A2 + B) | **49 + 1** (A 30, A2 4, B 16, dont la relance d'osteoporose) | **0** |
| `checkQuestionAtomicity` A / A2 / B | 326 / 36 / 96 | **295 / 32 / 80** (`--bless`, note `q5`) |
| Garde anti-doublon, questions du cas (non admis / plafond) | 81 / 81 | **0 / 0** — 31 constats, tous admis avec leur raison (9 de Q4, 22 de Q5) |
| Garde anti-doublon, questions de banque (plafond) | 442 | **367** |
| `doublonsMasques` (informatif) | 49 | 44 |
| `presuppositionsTexte` (informatif) | 20 | 21 (+1 : anaphylaxie « nach dem Stich », que le motif établit) |
| `checkCaseQuestionAnswers` (plancher) | 73 | **70** (`--bless`) |
| Lexique | 492 signes | 490 (`arbeitsausfall`, `zahn` devenus morts) |
| `relu` | 83 | 83 |
| Porte `checkCoherence` | 0 | 0 |
| FACH_COVERS (paires appliquées / gardées) | 71 / 23 | 68 / 21 (sondes de variante sautées, § 5) |

## 2. Q5 — les composées, cas par cas

Mêmes gestes que Q3 et Q4 : une question et sa relance quand le signe est le même (« Falls ja: » quand la relance n'a de sens qu'après un oui) ; deux questions déclarées quand les signes diffèrent. Une moitié déjà dite par une réplique jouée plus haut est **retirée**, pas reposée. Quand c'est la réplique qui disait d'avance ce que la question du cas demande (le défaut que les revues relèvent lot après lot), la phrase est **coupée** de la réplique et, si elle portait une information, **déplacée** en `frageAntworten` de la question qui la demande — même texte, au plus un « Ja, » ou une anaphore résolue.

### endokarditis
- #2 A → Q « Haben Sie an den Fingernägeln, den Fingerkuppen oder den Handflächen Veränderungen bemerkt? » ↳ Falls ja: Wie sehen sie aus? ↳ Falls ja: Tun diese Stellen weh? (endokarditis_hautzeichen)
- #3 A → « War Ihr Urin verfärbt? » (urin_aspekt) · « Brennt es beim Wasserlassen? » (miktion) ; la flanque est posée par #4
- #4 B → « Hatten Sie plötzlich Lähmungen, Sprach- oder Sehstörungen? » (schwaeche, sprache, sehstoerung) · « Hatten Sie plötzlich starke Kopfschmerzen? » (kopfschmerz) · « Hatten Sie plötzlich Bauch- oder Flankenschmerzen? » (flankenschmerz)
- coupes : akt-infekt-herd (urine, « das hatte ich Ihnen ja schon gesagt » faux), akt-verlauf (Luftnot), akt-einfluss (Luftnot), veg-uebelkeit (Appetit)
- akt-begleit : « Ja — die Glieder tun mir weh. » (begleitsymptome[0] Gliederschmerzen) — tout le reste est demandé plus loin (nuit : veg-schuettelfrost ; urine, ongles : cas ; Luftnot : fach-kardio-luft)
- déplacé : « Flach liegen kann ich noch, ich habe zwei Kissen, wie immer. » fach-kardio-luft → fach-kardio-oedeme (qui demande les coussins)
### anaphylaxie
- #0 A2 → « Wie viele Minuten nach dem Stich haben die Beschwerden begonnen? » (beginn) ; « Wann genau gestochen » est dit par le motif (« vor ungefähr zwanzig Minuten »)
- #1 A → « Steckte ein Stachel in der Haut? » ↳ Falls ja: Wie haben Sie ihn entfernt? (insektenstich) ; « Biene oder Wespe » retiré : le motif dit « eine Biene »
- #2 A → « Sind auch Ihre Augenlider geschwollen? » (angiooedem ; lèvres et langue dites par le motif) · « Haben Sie ein Kloßgefühl im Hals, oder fällt Ihnen das Schlucken schwer? » (schluck) · « Sind Sie heiser? » (stimme)
- #4 A → « Ist Ihnen schwarz vor Augen geworden? » ↳ Falls ja: Sind Sie ohnmächtig geworden? (bewusstlos) · « Haben Sie Herzrasen? » (herzrasen) ; « schwindlig » retiré : le motif le dit
- coupes : akt-einfluss « Wenn ich aufstehe, wird mir schwarz vor Augen. » ; akt-begleit « Mir ist übel, und im Bauch zieht es … Das Herz rast. Mir ist schwindlig, » (übel : veg-uebelkeit ; Bauch : veg-ausscheidung ; Herz, schwarz : questions du cas)
- réponses : begleitsymptome[0] « Schwindel, Schwarzwerden vor den Augen beim Absteigen vom Fahrrad, Herzrasen » ; NEG « kein Bewusstseinsverlust » ; begleitsymptome[2] Kloßgefühl, Heiserkeit, Schluckbeschwerden ; [4] Stachel
### reaktive-arthritis
- #0 B → « Hatten Sie in den letzten Wochen einen Infekt — Halsschmerzen, Durchfall, Blasenentzündung? » : texte EXACT de la clé `frageAntworten` existante, dont la réplique écrite (angine à streptocoques) devient ainsi celle de la question ; « Fieber » retiré (motif), « Brennen beim Wasserlassen » ⊂ Blasenentzündung
- #5 B → « Haben Sie Herzstolpern, Luftnot oder Schmerzen in der Brust bemerkt? » : idem, clé `frageAntworten` existante (« Nein. Mit dem Fieber schlägt das Herz schneller … ») ; `relu` retiré (le texte ne nomme plus l'Herzrasen fébrile)
- #6 B → « Haben Sie einen Hautausschlag bemerkt, etwa Pusteln an Händen oder Füßen? » ↳ Haben Sie Knötchen unter der Haut bemerkt? (ausschlag) · « Haben Sie Bläschen oder wunde Stellen im Mund bemerkt? » (ulzera) — NEG « kein Ausschlag, keine Pusteln … keine Aphthen, keine Knötchen unter der Haut »
- akt-begleit → « Sonst … nein, mir fällt nichts ein. » (fièvre : motif ; steif : fach-rheuma-morgensteifigkeit ; Schlaf : veg-schlaf)
- fach-rheuma-systemisch → « Fieber ja, bis 39. Durchfall habe ich keinen. » (la sonde jouée ne pose plus que fièvre et diarrhée ; yeux, bouche : questions du cas ; Wasserlassen : veg-ausscheidung ; Intimbereich : sexualanamnese)
### pertussis
- #1 A → « Können Sie mir einen Anfall beschreiben? » ↳ Wie viele Hustenstöße kommen hintereinander? ↳ Bekommen Sie zwischen den Hustenstößen Luft? (charakter) ; « Kommt der Husten in Anfällen? » retiré : le motif, akt-beginn et akt-verlauf le disent
- #3 A → « Müssen Sie sich nach dem Husten übergeben? » (erbrechen) · « Würgen Sie nach dem Husten Schleim hoch? » (auswurf)
- doublon garde : akt-beginn disait tout le début (le rhume) que la question du cas #0 demande → akt-beginn « Angefangen hat es vor etwa sechs Wochen, Anfang August. » ; le texte est DÉPLACÉ en `frageAntworten` de #0 (« Ja, wie eine ganz normale Erkältung: … seit gut vier Wochen kommt er in richtigen Anfällen. »)
- akt-verlauf : coupé « Erst die Erkältung, dann wurde der Husten stärker, und » et « weil ich jetzt kaum noch schlafe und abgenommen habe » (veg-schlaf, veg-gewicht)
- akt-frueher : « mit Anfällen und Erbrechen » → « mit solchen Anfällen » (l'Erbrechen est demandé par #3)
- akt-begleit → « Ich bin tagsüber völlig erschöpft. » (VEG « tagsüber erschöpft ») ; le reste est demandé plus loin (intervalle : #4 ; Fieber, Luftnot, Gewicht, Rippe : Fach / végétative)
- fach-pneumo-husten : la sonde jouée ne pose plus que « Sind Sie heiser? ↳ verschluckt? » et sa réplique racontait la toux → « Heiser bin ich nicht, und verschluckt habe ich mich auch nicht. » (NEG « keine Heiserkeit », « kein Verschlucken ») ; la description de l'accès est DÉPLACÉE en `frageAntworten` de #1 (« Stakkato, ein Hustenstoß nach dem anderen, ohne dass ich Luft holen kann. Zwischendurch huste ich fast gar nicht. » — Leit « stakkatoartige », réplique d'origine)
- fach-pneumo-giemen : coupé « Es ist einfach nur dieser Hustenanfall bis zum Erbrechen. »
### colitis-ulcerosa
- #5 B → « Haben Sie Schmerzen oder Schwellungen an Gelenken bemerkt? » (arthralgie, gelenk_entzuendung) · « Haben Sie Beschwerden an den Augen oder Hautveränderungen an den Beinen bemerkt? » (augenentzuendung, ausschlag — texte EXACT d'une clé `frageAntworten` existante, sa réplique écrite s'y rattache) · « Ist Ihnen eine Gelbfärbung der Haut oder der Augen aufgefallen? » (gelbfaerbung — NEG « keine Gelbfärbung »)
- #6 A → « Haben Sie Beschwerden am After — Knoten, Eiter, Schmerzen beim Sitzen? » (perianal — clé `frageAntworten` existante) · « Haben Sie wunde Stellen im Mund? » (ulzera — NEG « keine Mundaphthen »)
- akt-begleit → « Ich bin völlig erschöpft — ich schaffe den Alltag mit meinem Sohn kaum noch. » (begleitsymptome[0]) ; genou/cheville coupés (la question du cas les demande), poids et température coupés (végétative)
- akt-ausloeser : coupé « Ich war nicht verreist, » (veg-fieber demande le voyage)
### myokarditis
- #3 A → « Wie äußert sich das Herzstolpern genau? » ↳ Ist es ein Aussetzer mit einem kräftigen Schlag danach, oder ein anhaltendes Herzrasen? ↳ Kommt es auch in Ruhe? (herzrasen)
- #4 A → « Was ist gestern beim Training genau passiert? » ↳ Waren Sie bewusstlos? (bewusstlos) ; « schwarz vor Augen » retiré (le motif le dit) ; « sind Sie gestürzt » retiré : la question ouverte l'obtient (fach-kardio-synkope : « umgefallen bin ich auch nicht »), `sturz` n'est plus déclaré
- doublons : akt-ausloeser racontait le Corona et la reprise du sport que #0 et #1 demandent → « Einen richtigen Auslöser gab es nicht. » ; texte DÉPLACÉ en `frageAntworten` de #0 (« Ja, vor drei Wochen hatte ich Corona, fünf Tage Fieber. ») et #1 (« Ja. Danach war ich eine Woche fit, dann bin ich wieder ins Training — und ein paar Tage später fing das an. »)
- akt-begleit décrivait l'Herzstolpern que #3 demande → « Ich bin völlig platt, ich habe keine Kraft mehr. » (begleitsymptome[2] Leistungsknick, Erschöpfung) ; description DÉPLACÉE en `frageAntworten` de #3 ; Treppe (fach-kardio-luft) et Temperatur (veg-fieber) coupés
- `frageAntworten` de #4 : réplique de fach-kardio-synkope (sonde retirée par #4), reprise telle quelle
- fach-kardio-belastung : coupé « und dann kommt die Luftnot dazu » (fach-kardio-luft)
- ADMIS (garde) : bewusstlos · akt-motiv — le motif dit « schwarz vor Augen » (présyncope), la relance demande la perte de connaissance
### nephrotisches-syndrom
- #0 A RETIRÉE : « Wo hat die Schwellung angefangen — an den Augen oder an den Beinen? Und wandert sie im Laufe des Tages? » — les deux moitiés sont dites avant (akt-beginn : « Zuerst waren es nur morgens die geschwollenen Augen … Seit etwa drei Wochen sind dann die Beine dazugekommen » ; akt-allgemein-tageszeit : « Die Schwellung wandert allerdings: morgens sind die Augen dick, abends die Beine. ») ; aucune sonde ne revient
- #1 A → « Passen Ihre Schuhe und Ihre Ringe noch? » ↳ Spannt die Hose am Bauch? (oedeme)
- akt-begleit disait tout ce que #1 demande (Bauch, Schuhe, Ehering) → « Nur diese Müdigkeit, wie gesagt. » (la fatigue est dite par akt-allgemein-art ; appétit : fach-nephro-uraemie ; Treppe : fach-pneumo-atemnot)
- akt-allgemein-alltag : coupé « Treppensteigen, schon der erste Stock, da komme ich außer Atem. » (fach-pneumo-atemnot)
### akute-leukaemie
- #0 A → « Ging es Ihnen vor einem Monat noch gut? » (beginn) ; « Seit wann genau … Tage, Wochen oder Monate? » retiré : le motif dit « Seit drei Wochen bin ich völlig kraftlos »
- #4 B → « Haben Sie Kopfschmerzen oder Sehstörungen bemerkt? » (kopfschmerz, sehstoerung) · « Haben Sie Verwirrtheit oder Taubheitsgefühle bemerkt? » (verwirrtheit, taubheit)
- akt-allgemein-schwellung : coupé « Nur unter den Rippen links habe ich manchmal so ein Druckgefühl. » (la question du cas `milz_druck` le demande)
- akt-allgemein-tageszeit : coupé « wegen dem Schwitzen nachts » (veg-schuettelfrost, fach-haem-bsymptomatik)
- akt-verlauf : « Erst nur müde, dann Luftnot auf der Treppe, dann die Flecken und das Zahnfleischbluten, … » → « Erst nur müde, dann die Flecken, … » (fach-haem-belastung, fach-haem-blutung)
- akt-begleit → « Das Zahnfleisch ist entzündet. » (begleitsymptome[4]) ; blass, Herzrasen, Luftnot, Blutungen, Nachtschweiß sont demandés par la Fach hämato
### endometriose
- #2 A2 RETIRÉE : « Wie viele Schmerztabletten brauchen Sie pro Regel, und wie viele Tage im Monat können Sie deswegen nicht arbeiten? » — les deux moitiés sont dites avant (motif : « ich liege jeden Monat zwei, drei Tage flach » ; akt-einfluss : « Ibuprofen nehme ich vier am Tag, hilft nur wenig ») ; signe `arbeitsausfall` devenu mort, retiré de `signesDefsCas.ts`
- doublons préexistants (signes propres au cas, invisibles pour la garde) :
  - « Sind die Regelschmerzen über die Jahre gleich geblieben, oder sind sie stärker geworden? » RETIRÉE (entwicklung) : motif « Die werden jedes Jahr schlimmer », akt-beginn « Seitdem wird es von Regel zu Regel schlimmer »
  - akt-verlauf disait ce que #0 (zyklusbezug) demande → « Es hängt an der Regel. Seit einem Jahr zieht es aber auch dazwischen. »
  - akt-einfluss et akt-begleit disaient la dyspareunie que #3 demande : coupés (« und — das ist mir unangenehm — beim Verkehr, ganz tief drin » ; « Und wie gesagt, die Schmerzen beim Verkehr. ») — la fiche dit l'évitement (begleitsymptome[0])
  - akt-begleit → « Ich bin ständig müde, auch wenn ich keine Regel habe. » (übel : veg-uebelkeit ; Durchfall : veg-ausscheidung ; Blutung : fach-gyn-blutung)
### ptbs
- #3 A → « Sind Sie schreckhafter als früher? » ↳ Fühlen Sie sich ständig auf der Hut? (uebererregung)
- ADMIS (garde) : kopfschmerz · akt-motiv → « Ist der Kopfschmerz morgens am stärksten, nimmt er im Liegen zu, … » — la question demande les caractères d'alarme du Kopfschmerz que le motif nomme, pas sa présence
### somatoforme-schmerzstoerung
- #1 A → « Welche Untersuchungen wurden bereits gemacht? » ↳ Haben Sie die Befunde dabei? (vorbefunde) ; « Was haben Ihnen die Ärzte gesagt? » retiré : le motif le dit (« Dreizehn Fachärzte, alle sagen, ich hätte nichts »)
- #2 A → « Was glauben Sie selbst, woher die Schmerzen kommen? » (krankheitskonzept) ; « Was erwarten Sie von uns heute? » retiré : le motif le dit (« weil ich ein neues MRT von den Knien möchte »)
- akt-beginn : « Das kommt vom Heben im Lager. » DÉPLACÉ en `frageAntworten` de #2 (le patient donnait sa théorie avant qu'on la lui demande)
- akt-begleit → « Manchmal sehe ich verschwommen, wenn der Kopf schlimm ist — der Augenarzt hat aber nichts gefunden. Und der Magen macht Probleme von den Tabletten. » (Schlaf, Erschöpfung, Konzentration : Fach psy ; Gewicht, Appetit : végétative)
- veg-fieber : coupé « Nachtschweiß auch nicht. » (veg-schuettelfrost)
### nhl
- #1 A → « Ist der Knoten gerötet, oder fühlt er sich warm an? » (lokalschmerz) · « Lässt sich der Knoten mit den Fingern hin- und herbewegen, oder sitzt er fest? » (verschieblichkeit) ; « Tut der Knoten weh » retiré : le motif dit « Er tut nicht weh » — NEG « keine Schmerzen, keine Rötung und keine Überwärmung », Leit « verschieblicher »
- #5 B → « Haben Sie Husten oder Luftnot bemerkt? » (husten, atemnot) · « Haben Sie Schluckbeschwerden oder Herzrasen bemerkt? » (schluck, herzrasen)
- doublon préexistant : « Seit wann haben Sie den Knoten in der Leiste bemerkt, und ist er seitdem größer, kleiner oder gleich geblieben? » — le motif dit les deux (« seit zwei Wochen … er wird größer ») → « Wie ist Ihnen der Knoten aufgefallen? » (beginn) · « Wie groß war der Knoten, als er Ihnen aufgefallen ist? » (entwicklung)
- garde (7 constats) : akt-begleit disait Husten, Herzrasen, Atemnot, Schluck → « Ja: Ich bin ständig müde und erschöpft, und abends fühle ich mich oft fiebrig. » ; akt-veraend-was : coupé « Schlucken geht ganz normal, und beim Stuhlgang oder mit der Haut – also gelb oder so – ist mir nichts aufgefallen. » ; akt-veraend-blutung : coupé « Und sonst, im Stuhl, im Urin, beim Husten oder aus der Nase, da ist mir noch nie Blut aufgefallen. » (fach-haem-blutverlust) ; akt-ausloeser : « beim Husten oder Pressen » → « beim Pressen » (le test de la hernie, NEG « keine Größenzunahme beim Husten oder Pressen »)
- `frageAntworten` (textes déplacés) : « Wie ist Ihnen der Knoten aufgefallen? » → « Beim Duschen. Da war er plötzlich da. Vorher hatte ich da nie etwas bemerkt. » (akt-beginn) ; « Wie groß war der Knoten … » → « Vielleicht wie eine Haselnuss. Jetzt ist er wie eine Walnuss. » (akt-verlauf, coupé là) ; « Haben Sie Husten oder Luftnot bemerkt? » → « Den trockenen Husten habe ich schon seit Jahren, das ist der Holzstaub. Atemnot habe ich keine. » (akt-begleit) ; « Haben Sie Schluckbeschwerden oder Herzrasen bemerkt? » → « Nein — kein Herzrasen, keine Schluckbeschwerden. » (akt-begleit)
### cml
- #3 B → « Haben Sie Sehstörungen, Kopfschmerzen oder Luftnot bemerkt? » (sehstoerung, kopfschmerz, atemnot) · « Haben Sie ungewöhnliche Dauererektionen bemerkt? » (priapismus)
- doublon préexistant RETIRÉ : « Haben Sie ein Druck- oder Völlegefühl unter dem linken Rippenbogen, und werden Sie beim Essen schneller satt als früher? » — dit quatre fois avant (akt-beginn « dann kam das Druckgefühl im Bauch dazu », akt-allgemein-gewicht « ich werde schnell satt », akt-allgemein-schwellung « Der Bauch ist links oben eben gedrückt », akt-begleit « nach der halben Portion bin ich satt »)
### allergische-rhinitis
- #2 A → « Sind Ihre Augen auch gerötet, oder tränen sie? » (augenentzuendung) · « Juckt es auch im Gaumen oder in den Ohren? » (juckreiz) ; « Jucken … Ihre Augen » retiré : le motif dit « die Augen jucken furchtbar »
- #4 B → « Kribbelt oder schwillt es Ihnen im Mund nach rohem Obst, Nüssen oder Karotten? » (nahrungsmittelallergie ; begleitsymptome « nach rohen Äpfeln und Haselnüssen »)
- doublons préexistants : « In welcher Jahreszeit … draußen schlimmer als drinnen — … im Winter beschwerdefrei? » RETIRÉE (akt-beginn « jedes Jahr von Ende März bis in den Juli », akt-ausloeser « Draußen ist es am schlimmsten … im Winter hab ich gar nichts ») ; « Haben Sie vor allem nachts Husten oder ein Pfeifen beim Ausatmen? » → « Husten Sie auch tagsüber oder nach körperlicher Anstrengung? » (le motif dit « seit zwei Wochen huste ich auch noch, vor allem nachts » ; le sifflement est demandé par fach-pneumo-giemen ; réponse : fach-pneumo-husten « vor allem nachts und nach dem Joggen. Tagsüber im Büro huste ich kaum »)
- akt-begleit → « Die Nase ist nachts komplett zu, und ich rieche und schmecke seit etwa zwei Wochen kaum noch etwas. » (begleitsymptome[1], [3]) ; yeux, toux, oppression : questions du cas / fach-pneumo-atemnot
- ADMIS (garde) : juckreiz · akt-motiv (le motif dit les yeux, la question le palais et les oreilles) ; husten · akt-motiv et husten · akt-beginn (le motif dit la toux nocturne, la question la toux de jour et d'effort)
### typhus
- #0 A → « Ist Ihr Fieber Tag für Tag höher geworden, oder kam es plötzlich? » (verlauf, beginn_art) ; « Bleibt es jetzt konstant hoch? » retiré : le motif le dit (« Seit zwei Tagen ist es konstant bei 39,4 »)
- #1 A → « Haben Sie Ihren Puls beim Fieber gemessen? » ↳ Falls ja: Wie hoch war er? (puls) ; « Ist Ihnen ein langsamer Puls aufgefallen? » suggérait la réponse
- akt-begleit disait la Smartwatch à 62 que #1 demande → « Gliederschmerzen am Anfang. Und der Bauch ist aufgebläht, richtig gespannt. » ; texte DÉPLACÉ en `frageAntworten` de #1 ; la toux (dite par akt-infekt-herd) n'est pas redite
- akt-infekt-herd : la sonde jouée ne demande plus selles ni éruption (questions du cas) → coupé « Durchfall — … ohne Blut. » (DÉPLACÉ en `frageAntworten` de « Hatten Sie zuerst Verstopfung oder Durchfall? ») et « Ausschlag habe ich keinen bemerkt » ; « das hatte ich schon gesagt » coupé (rien ne l'avait dit avant)
- akt-infekt-fieber : coupé Schüttelfrost / Schwitzen (veg-schuettelfrost les demande, sa réplique les dit)
- veg-uebelkeit : coupé « Ich habe einfach keinen Appetit. » (veg-appetit)
- ADMIS (garde) : stuhl · akt-frueher — la réplique dit une diarrhée d'un voyage passé, la question l'ordre constipation / diarrhée d'aujourd'hui (règle (e))
### sturz-im-alter (Q5 #0 A2 + Q8)
- Q8 — les sondes « Anfall » RENOMMÉES, aucune sautée : chaque sonde reçoit une question du cas qui déclare son signe et prend sa place (rang 0, R6 — le mécanisme qui a déjà remplacé « Wann war der erste Anfall? » en Q3) :
  - akt-anfall-ablauf (anfallsablauf) → « Erzählen Sie mir bitte ganz genau, was passiert ist: Was haben Sie gemacht, als Sie gestürzt sind? » ↳ Sind Sie gestolpert, oder ist Ihnen schwindelig geworden? ↳ Falls schwindelig: Wie fängt dieser Schwindel an — schlagartig oder langsam? ↳ Und wie hört er wieder auf? (anfallsablauf, unfallhergang, schwindel) — c'est aussi la composée #0 (A2) découpée
  - akt-anfall-dauer (dauer) → « Wie lange dauert so ein Schwindel — Sekunden, Minuten oder Stunden? » ↳ Wie oft passiert das? (`braucht: ['anfallsablauf']`)
  - akt-einfluss (einfluss) → « Gibt es etwas, das die Hüftschmerzen bessert oder verschlimmert? » — la réplique de la fiche parlait déjà de la hanche, pas d'un « Anfall »
  - akt-frueher (frueher) → « Sind Sie in den letzten zwölf Monaten schon einmal gestürzt oder beinahe gestürzt — auch wenn nichts passiert ist? » (frueher, sturz, sturz_vorgeschichte) : la question existante (vorerkrankungen) passe en aktuell ; sa réplique est celle d'akt-frueher (la chute du couloir)
- L'ordre joué devient : motif → Ort → Wann → Charakter → Intensität → Hergang → Dauer/Häufigkeit → bewusstlos → Auslöser → Einfluss (hanche) → chutes antérieures → Begleit → Liegezeit → Kopf. Avant, les sondes « Anfall » étaient posées avant que le patient ait dit le moindre malaise.
- « Wird Ihnen beim Aufstehen … schwindelig oder schwarz vor den Augen? » (orthostase) RETIRÉE : la réplique de Dauer la dit (« vor allem morgens und nachts, wenn ich aufstehe »)
- `frageAntworten` (textes déplacés) : Hergang ← akt-ausloeser + Leit (« Ich bin nachts aufgestanden, zur Toilette. Dabei wurde mir schwarz vor Augen, wie öfter in letzter Zeit. Im Bad bin ich dann auf dem Vorleger weggerutscht und auf die linke Seite gefallen. ») ; Dauer ← akt-anfall-dauer (texte exact) ; Hüftschmerzen ← akt-einfluss (texte exact) ; chutes ← akt-frueher (texte exact)
- akt-ausloeser → « Ich musste dringend zur Toilette, da war ich in Eile. » (fach-neuro-blase : « wenn es drückt, muss ich schnell gehen — deshalb war ich heute Nacht auch in Eile », coupé là)
- akt-begleit → « Nein — keine Luftnot, keine Brustschmerzen, und übel war mir auch nicht. » (NEG « kein Brustschmerz, keine Luftnot … », « keine Übelkeit ») ; la Beule (question du cas Kopf) et le Schwindel (dit plus haut) coupés
- fach-neuro-koordination → « Beim Gehen fühle ich mich unsicher, ich halte mich an den Möbeln fest. Kein Karussell im Kopf. » (la sonde jouée ne pose plus que la marche)
- fach-neuro-anfall → « Nein, einen Krampfanfall hatte ich noch nie. »
- fach-neuro-verlauf : coupé « Der Schwindel beim Aufstehen ist seit etwa drei Monaten jeden Tag da … » — CONTRADICTION avec akt-anfall-dauer (« Regelmäßig, … aber nicht jeden Tag »)
- ADMIS (garde) : bewusstlos · Hergang (« schwarz vor Augen » = présyncope, la question demande la perte de connaissance) ; sturz · Hüftschmerzen (« seit dem Sturz » = la chute d'aujourd'hui, la question demande les chutes antérieures)
### lumboischialgie
- #7 A2 → « Was erwarten Sie von uns heute? » (krankheitskonzept) ; « Was befürchten Sie selbst … » retiré : le motif le dit (« Ich habe Angst, dass da eine Bandscheibe kaputt ist »)
- doublons préexistants : akt-beginn racontait le geste que #0 demande → « Vor vier Tagen, am Morgen. Ganz plötzlich. » (Leit « akut … einschießende ») ; le récit est DÉPLACÉ en `frageAntworten` de #0 ; akt-einfluss : coupé « Husten oder Niesen merk ich kaum. » (#1 pressschmerz le demande) ; akt-begleit → « Ich steh schief, und meine Frau musste mir die Socken anziehen. Sonst nichts. » (raideur matinale : #3 ; Kribbeln/Taubheit/Schwäche : fach-ortho-sensomotorik)
### bauchaortenaneurysma
- #6 B → « Haben Sie ein Kribbeln, eine Taubheit oder eine Schwäche im Bein bemerkt? » (taubheit, schwaeche) · « Haben Sie Probleme beim Wasserlassen oder beim Stuhlgang? » (stuhl, `relu` : la miction est déclarée par #0)
- garde : « Ist Ihnen schwarz vor Augen geworden, sind Sie zusammengebrochen oder haben Sie plötzlich geschwitzt? » → « Sind Sie gestern Abend zusammengebrochen, oder haben Sie plötzlich geschwitzt? » (le motif dit « gestern Abend wurde mir beim Aufstehen kurz schwarz vor Augen ») ; akt-ausloeser : coupé « Gestern Abend wurde mir beim Aufstehen ein paar Sekunden schwarz vor Augen. Hingefallen bin ich nicht. »
- akt-begleit racontait le battement abdominal que #2 (pulsation) demande → « Seit heute Morgen ist mir ein bisschen übel. » ; le texte est DÉPLACÉ en `frageAntworten` de #2 (« Ja, das fällt mir schon länger auf, seit ein paar Wochen: … wie ein zweites Herz. Ich dachte, das ist normal in meinem Alter. ») ; « Fieber habe ich nicht » coupé (veg-fieber)
- akt-beginn : coupé « Ich habe nichts Schweres gehoben, bin nicht gestürzt, es kam einfach so. » (akt-ausloeser le dit)
- ADMIS (garde) : bewusstlos · akt-motiv (« schwarz vor Augen » = présyncope ; la question demande l'effondrement)
### aortendissektion
- #4 B → « Haben Sie Lähmungen, Sprach- oder Sehstörungen bemerkt? » (schwaeche, sprache, sehstoerung) · « Fühlt sich ein Bein kalt oder taub an? » (durchblutung, taubheit)
- doublons préexistants (signes propres au cas) : akt-beginn disait la soudaineté maximale et le sac de ciment que #0 (beginn_art) et #3 (ausloeser) demandent → « Vor ungefähr zwei Stunden, so gegen zwei. » ; textes DÉPLACÉS en `frageAntworten` de #0 (« Von einer Sekunde auf die andere, wie ein Schlag — sofort mit voller Wucht. ») et #3 (« Ich habe im Garten einen Zementsack angehoben, und dann — zack, war der Schmerz da. »)
- « Ist der Schmerz gewandert — vom Brustbein in den Rücken …? » RETIRÉE (schmerzwanderung) : akt-ort, akt-ausstrahlung et akt-verlauf le disent ; akt-verlauf : coupé « Nur der Ort hat sich verändert — es wandert nach hinten und nach unten. »
- akt-begleit : coupé « Und seit einer halben Stunde ist das linke Bein kalt und kribbelt. » → DÉPLACÉ en `frageAntworten` de « Fühlt sich ein Bein kalt oder taub an? » (« Ja, seit einer halben Stunde ist das linke Bein kalt und kribbelt. »)
### epilepsie
- #0 B → « Hatten Sie vorher ein Vorgefühl — ein aufsteigendes Gefühl im Bauch, ein Déjà-vu oder einen Geruch? » ↳ Falls nein: Wurde Ihnen vorher schwarz vor Augen, mit Schwitzen oder Herzklopfen? (aura — le prodrome, épileptique ou syncopal)
- #1 A → « Wie lange waren Sie danach verwirrt? » ↳ Sind Sie danach eingeschlafen? (anfallszeichen) · « Haben Sie jetzt Muskelkater oder Kopfschmerzen? » (kopfschmerz)
- #3 A → « Zucken Ihnen morgens manchmal die Arme, sodass Ihnen etwas aus der Hand fällt? » ↳ Haben Sie kurze Aussetzer, in denen Sie nicht ansprechbar sind? (anfallsformen)
- doublons : akt-frueher racontait les réveils avec la langue mordue que #2 (naechtliche_anfaelle) demande → « Umgekippt bin ich noch nie. » ; texte DÉPLACÉ en `frageAntworten` de #2 ; fach-neuro-koordination racontait les myoclonies que #3 demande → « Gehen geht normal, ich bin nicht wackelig. » ; texte DÉPLACÉ en `frageAntworten` de #3 ; akt-einfluss → « Ich habe noch nichts genommen. » (Zunge, Muskelkater : #1) ; akt-begleit redisait le déroulé (akt-anfall-ablauf) → « Davon weiß ich nichts. Meine Freundin sagt, die Lippen waren blau, und ich hatte Schaum vor dem Mund. »
### hodentorsion
- #1 A RETIRÉE : « Wann genau hat der Schmerz angefangen — können Sie mir die Uhrzeit sagen? Sind Sie davon aufgewacht? » — elle prenait la place d'akt-beginn, dont la réplique dit déjà l'heure et le réveil (« so um halb vier. Ich bin davon aufgewacht … Ich weiß die Zeit genau ») ; akt-beginn est de nouveau posée entière (« Seit wann haben Sie die Schmerzen? Kamen sie plötzlich oder schleichend? »)
- akt-begleit disait le gonflement, la rougeur et la position haute que #3 (hodenschwellung) demande → « Mir ist übel, ich habe mich um halb fünf einmal übergeben. Sonst nichts. » ; texte DÉPLACÉ en `frageAntworten` de #3 ; « Fieber habe ich nicht » coupé (fach-uro-fieber, veg)
### basaliom
- #0 A → « Blutet die Stelle auch von selbst, ohne Rasieren? » ↳ Bildet sich immer wieder eine Kruste, die dann aufbricht? (lokalblutung) — « … oder nur beim Rasieren » est dit par le motif (« Jedes Mal beim Rasieren blutet es wieder »)
- #1 A → « Wie sieht die Stelle aus? » ↳ Glänzt sie, oder sehen Sie kleine rote Äderchen darauf? ↳ Hat sie in der Mitte eine Delle? ↳ Ist sie braun oder schwarz? (hautbefund)
- akt-veraend-was : coupé « Blutet immer wieder, vor allem beim Rasieren. » (le motif le dit, #0 le demande)
### psoriasis
- #1 A « Haben Sie Gelenkschmerzen oder Schwellungen? Ist ein ganzer Finger oder eine ganze Zehe dick wie eine Wurst? » → « Ist auch eine Zehe so dick wie eine Wurst geworden? » (daktylitis, arthralgie) — le motif dit les douleurs et le doigt en saucisse (« mein linker Mittelfinger ist dick wie eine Wurst, und die Zehen und das rechte Knie tun auch weh ») ; la question garde ses deux signes, sinon fach-derma-systemisch reposerait « Gelenkschmerzen » (mesuré)
- doublons préexistants : les ongles, que #0 demande, étaient dits par akt-veraend-was, akt-begleit et fach-derma-aussehen : coupés ; akt-begleit → « Naja — ich ziehe mich zurück, ehrlich gesagt. » (doigt et genou gonflés : fach-rheuma-entzuendung ; sommeil : veg-schlaf) ; fach-derma-systemisch : coupé « Aber die Gelenke — der Finger, die Zehen, das Knie, die Ferse. »
- résidus d'anciens gabarits coupés : akt-veraend-was « Schlucken und Stuhlgang sind normal. » ; akt-veraend-blutung « Blut im Stuhl oder Urin oder beim Husten habe ich keines bemerkt. » (relances retirées en K3 R3)
### urtikaria
- #1 B → « Haben Sie Atemnot oder ein Pfeifen beim Atmen? » (atemnot, giemen) · « Haben Sie ein Engegefühl im Hals, Heiserkeit oder Schwierigkeiten beim Schlucken? » (stimme, schluck)
- #2 A → « Ist Ihnen schwindelig, haben Sie Herzrasen, oder waren Sie kurz weggetreten? » (schwindel, herzrasen, bewusstlos) · « Haben Sie Bauchkrämpfe, Übelkeit oder Durchfall? » (uebelkeit, stuhl)
- #7 B → « Wird es schlimmer bei Wärme, Kälte oder Druck? » ↳ Und beim Kratzen oder in der Sonne? (einfluss)
- garde : akt-begleit disait « Ich bekomme gut Luft, mir ist nicht schwindelig, und der Bauch ist ruhig. Das habe ich heute Morgen als Erstes geprüft, weil ich so Angst hatte. » → coupé (questions #1, #2) ; akt-veraend-was : coupé « Schlucken geht bei mir problemlos, und beim Stuhlgang oder mit der Hautfarbe, also gelb oder so, ist mir nichts aufgefallen. » ; akt-veraend-blutung : coupé « und im Stuhl, im Urin oder beim Husten habe ich auch kein Blut gesehen »
### perniziose-anaemie
- #2 A → « Brennt Ihre Zunge, oder ist sie glatt oder rot geworden? » ↳ Können Sie scharfe oder saure Speisen essen? (zunge) ; akt-begleit le disait (« Meine Zunge brennt seit sechs Wochen, ganz glatt und rot ») : DÉPLACÉ en `frageAntworten`
- garde : « Kribbeln Ihre Füße auf beiden Seiten gleich, so als würden Strümpfe einschlafen? » → « Bis wohin reicht das Kribbeln an den Beinen? » (le motif dit « beide Füße » ; la question demande l'extension en chaussette — Leit « strumpfförmig bis über die Knöchel ») ; akt-begleit : coupé « Und ich bin so vergesslich und gereizt geworden. » (#3), « Beim Treppensteigen Herzklopfen und Luftnot. » (fach-haem-belastung) → « Meine Tochter sagt, ich sehe gelblich aus. »
- doublon préexistant : la marche dans le noir que #1 demande était dite par akt-beginn (« nachts auf dem Weg zur Toilette taste ich mich an der Wand entlang ») et akt-einfluss (« Im Dunkeln wird das Gehen viel schlimmer … ») : coupés, textes DÉPLACÉS en `frageAntworten` de #1
- ADMIS (garde) : taubheit · akt-motiv / akt-beginn / akt-verlauf / akt-einfluss — les répliques disent le fourmillement des pieds ; la question en demande l'extension
### sinusitis
- #2 A → « Welche Farbe hat der Schnupfen — klar und wässrig oder gelbgrün und zäh? » ↳ Läuft er nach vorne heraus oder hinten den Hals hinunter? (nasensekret) ; `frageAntworten` : « Gelbgrün und zäh. Und der Schleim läuft hinten den Hals runter, morgens huste ich was Gelbes hoch. » (Leit « gelbgrüner zäher Schnupfen » + akt-begleit, DÉPLACÉ)
- #3 A RETIRÉE : « Tun Ihnen die oberen Backenzähne weh? Waren Sie in den letzten Monaten beim Zahnarzt … ? » — akt-ort le dit (« Und die oberen Backenzähne rechts tun auch weh »), akt-ausloeser aussi (la sonde demande « einen Zahnarztbesuch » ; réplique « Beim Zahnarzt war ich schon länger nicht, da wurde nichts gemacht ») ; signe `zahn` devenu mort, retiré de `signesDefsCas.ts`
- doublons : akt-begleit disait l'odorat (#4), l'écoulement postérieur (#2) et « Am Auge ist nichts geschwollen » (#5) → « Das rechte Ohr ist zu, wie im Flugzeug. » ; odorat DÉPLACÉ en `frageAntworten` de #4 (« Das Riechen ist seit drei Tagen fast weg. Das Essen schmeckt deshalb ganz fade. » — VEG « schmeckt wegen der Riechminderung fade ») ; akt-infekt-herd : coupé « Husten habe ich morgens, mit etwas gelbem Auswurf, das hatte ich ja schon erzählt. » (rien ne l'avait dit ; la sonde jouée ne demande plus la toux)
### arterielle-hypertonie
- #3 B → « Haben Sie Sehstörungen oder ein Flimmern vor den Augen bemerkt? » (sehstoerung) · « Haben Sie eine Lähmung, ein Taubheitsgefühl oder Schwierigkeiten beim Sprechen bemerkt? » (schwaeche, taubheit, sprache)
- #6 A → « Schnarchen Sie? » (schnarchen) · « Hat Ihre Frau bei Ihnen nachts Atemaussetzer bemerkt? » (schlafapnoe) · « Nicken Sie tagsüber ungewollt ein? » (tagesschlaefrigkeit — ≠ la fatigue, que akt-allgemein-art dit déjà)
- doublon préexistant : « Wie hoch war der Blutdruck heute beim Betriebsarzt, und kennen Sie Ihre üblichen Werte? » → « Kennen Sie Ihre üblichen Blutdruckwerte? » (le motif dit « zweihundert zu hundertzwanzig »)
- akt-begleit : coupé « Morgens beim Aufstehen etwas schwindelig, so ein Schwanken. » (akt-allgemein-art le dit) et « Sehen und sprechen kann ich normal. » (#3)
- veg-schuettelfrost : coupé « Diese Schweißausbrüche mit Herzrasen, nach denen Sie fragen — nein, das habe ich nicht. » (répondait à la question du cas posée APRÈS)
- veg-schlaf → « Ich schlafe schlecht, das heißt: Ich schlafe schon, aber ich wache wie gerädert auf. » ; ronflement, apnées, somnolence DÉPLACÉS en `frageAntworten` des trois questions du cas (posées avant, en aktuell)
- ADMIS (garde) : schwitzen · veg-schuettelfrost — la réplique nie la sueur nocturne ; la question demande les accès de sueur avec palpitations et pâleur (phéochromocytome)
### osteoporose (relance)
- « Reichte zum Beispiel schon Husten, Niesen oder Bücken? » (3 items > plafond 2 des relances) → ↳ « Reichte zum Beispiel schon Husten oder Niesen? » ↳ « Oder schon das Bücken? » — « Niesen » reste (décision de main en Q3)

## 3. Garde anti-doublon

### 3.1 Questions du cas — les 81 constats non admis

Traités par les mêmes gestes ; ceux qui restent sont des faux positifs de la lecture par mots-clés (le mot grossier est dit, la question demande le signe fin), chacun écrit dans `ADMIS` de `reponseDoublon.test.ts` avec sa raison. Le plafond passe à **0** et la liste vaut maintenant pour les 130 cas (une entrée qui ne sert plus fait rougir le test).

- diabetes (T1) akt-begleit : coupé « Überall Juckreiz, die Haut ist trocken. Beim Lesen sehe ich verschwommen. » (questions du cas) ; puis « Ich muss ständig aufs Klo … » (akt-allgemein-schwellung le dit déjà) → « Ja: Die Schürfwunde am Schienbein geht seit drei Wochen nicht zu. »
- copd (T1) akt-beginn : « Den Husten und den Schleim habe ich dagegen schon seit Jahren, jeden Morgen — das ist für mich nichts Neues. » DÉPLACÉ en `frageAntworten` de « Husten Sie schon seit Jahren … ? » ; akt-ausloeser : coupé « aber Fieber hatte ich nicht » (fach-pneumo-fieber)
- myokardinfarkt akt-begleit (« Mir ist übel, ich schwitze kalt und habe schreckliche Angst. » — les trois sont demandés par les questions du cas) → « Sonst ist mir nichts aufgefallen — nur dieser Schmerz. » (texte nouveau, à valider)
- appendizitis akt-begleit → « Ich fühle mich heiß. » (übel, Appetit : questions du cas)
- lyme : « Seit wann haben Sie diese Rötung bemerkt, und wird sie größer? » → « Wird die Rötung größer? » (akt-beginn la date) ; akt-infekt-herd : coupé « Einen Ausschlag — na, außer der roten Stelle am Oberschenkel, die ich ja schon erwähnt hab. »
- hyperthyreose pers-groesse : « — vor zwei Monaten waren es noch 62 » DÉPLACÉ en `frageAntworten` de la question du poids (« Ja, wie gesagt — vor zwei Monaten waren es noch 62 Kilo. Und ich esse eher mehr als früher. »)
- herzinsuffizienz : pers-groesse « — vor drei Wochen waren es noch 82. Das ist ja das Verrückte, … » et akt-begleit « Ich habe sechs Kilo zugenommen in drei Wochen. » → DÉPLACÉS en `frageAntworten` de « Haben Sie sich gewogen? »
- tonsillitis akt-begleit → « Kopf- und Gliederschmerzen wie bei Grippe. » ; Schnupfen, Husten, « heiße Kartoffel » DÉPLACÉS en `frageAntworten` de la question #0 ; les ganglions (question #4) coupés
- lymphom : veg-fieber coupé « Dabei fehlt mir sonst nichts: kein Halsweh, kein Brennen beim Wasserlassen, keine Erkältung. » ; akt-begleit coupé « Und der trockene Husten ist schlimmer geworden. » → les deux DÉPLACÉS en `frageAntworten` de la question des signes d'infection ; veg-ausscheidung : coupé « und beim Wasserlassen habe ich keine Beschwerden … » ; fach-onko-blutung « kein Blut beim Husten » → « kein Blut im Auswurf »
- lungenembolie akt-begleit : coupé « Beim Aufstehen wurde mir kurz schwarz vor Augen. » (question du cas)
- eug : « Ist Ihnen schwindelig oder schwarz vor Augen geworden — sind Sie schon einmal ohnmächtig geworden? » → « Ist Ihnen schwarz vor Augen geworden? » ↳ Sind Sie schon einmal ohnmächtig geworden? (bewusstlos ; le motif dit « schwindelig ») ; akt-begleit : coupé « beim Aufstehen schwindelig, einmal schwarz vor Augen »
- meningitis akt-begleit → « Fieber, Schüttelfrost. » (Erbrechen im Schwall, Licht, Nacken : questions du cas)
- bronchialkarzinom : « … Raucherhusten, und seit wann genau? » → « Hat sich Ihr Husten verändert — klingt er anders als Ihr gewohnter Raucherhusten? » ↳ Falls ja: Seit wann? ; akt-beginn → « Das Blut kam vor zehn Tagen zum ersten Mal. », le récit du changement de toux DÉPLACÉ en `frageAntworten` ; résidus coupés (Schlucken/Stuhlgang/gelb ; Blut im Stuhl/Urin/Nase)
- rheumatoide-arthritis : « … und haben Sie erhöhte Temperaturen gemessen? » → « Fühlen Sie sich müde und weniger leistungsfähig? » (veg-fieber demande la mesure, avant)
- parkinson : akt-ausloeser coupé « Kein Sturz, kein Unfall, » ; « Haben Sie regelmäßig Stuhlgang, und seit wann besteht die Verstopfung? » → « Haben Sie regelmäßig Stuhlgang? » ↳ Falls nein: Seit wann besteht die Verstopfung? ; fach-neuro-blase : la constipation DÉPLACÉE en `frageAntworten` (« Nein, mit dem Stuhlgang habe ich seit Jahren Verstopfung, alle zwei bis drei Tage. »), reste « Den Stuhl kann ich ganz normal halten. »
- struma akt-einfluss : le décubitus et le second oreiller DÉPLACÉS en `frageAntworten` de « Bekommen Sie schlecht Luft, besonders wenn Sie flach liegen? » (« Luftnot eigentlich nicht. Aber wenn ich flach liege, wird das Engegefühl schlimmer — deshalb schlafe ich seit ein paar Wochen mit einem zweiten Kissen. » — NEG « keine Luftnot », begleit « im flachen Liegen ein zunehmendes Engegefühl »)
- schenkelhalsfraktur akt-ausloeser : coupé « Ohnmächtig war ich nicht. »
- hws-diskusprolaps akt-begleit → « Sonst ist mir nichts aufgefallen. » ; Kribbeln et faiblesse DÉPLACÉS en `frageAntworten` de la question du cas
- hueftkopfnekrose veg-ausscheidung → « Wasserlassen ist normal. » ; l'intestin DÉPLACÉ en `frageAntworten` de la question du cas
- glomerulonephritis : « Haben Sie Kopfschmerzen, Sehstörungen oder Luftnot bemerkt? » → « Haben Sie Sehstörungen oder Luftnot bemerkt? » (le motif dit les céphalées)
- obstipation (familie-sozial, A) → « Wie geht es Ihnen mit der Stimmung, seit Ihre Frau gestorben ist? » (stimmung) · « Wie kommen Sie zu Hause zurecht? » (hilfe_zuhause)

### 3.2 Questions de banque

442 → **367**. Les cas tier 1 d'abord, puis les cas relus par Q5. Ce qui reste est surtout **structurel** : le motif dit la plainte que la Fach redemande (« Haben Sie Husten? » après « ich huste seit drei Tagen », `veg-gewicht` après un motif de poids, `akt-infekt-fieber` « gemessen? » après « hohes Fieber »). Une coupe dans le motif serait une faute ; c'est un sujet de guide (D4-bis étendu ?), pas de contenu.

- angina-pectoris akt-begleit → « Sonst ist mir nichts aufgefallen. » (Kurzatmigkeit : fach-kardio-luft ; Ausstrahlung : fach-kardio-ausstrahlung)
- gib akt-verlauf : coupé « erbrochen habe ich einmal » (fach-gastro-uebelkeit)
- pneumonie : akt-begleit → « Sonst ist mir nichts aufgefallen. » ; akt-einfluss, akt-verlauf : douleur respiratoire coupée (fach-pneumo-schmerz) ; akt-infekt-fieber : Schüttelfrost coupé (fach-pneumo-fieber) ; akt-infekt-herd : toux coupée (fach-pneumo-husten) ; fach-pneumo-orthopnoe : « und weil ich schwitze » coupé
- pyelonephritis akt-begleit → « Ich bin seit zwei, drei Tagen immer müder. » (begleitsymptome[2])
- schlaganfall akt-begleit (la part jouée demande l'Übelkeit) → « Übel war mir nicht. » (NEG « keine Übelkeit ») ; Schwindel, Vorhang, Wörter : fach-neuro-koordination, question du cas amaurosis, fach-neuro-sprache
- migraene akt-begleit → « Am Tag vor dem Anfall habe ich dauernd gegähnt und Heißhunger auf Süßes gehabt. » (übel, Licht, Flimmern : veg-uebelkeit, fach-neuro-kopfschmerz, fach-neuro-aura)
- nierenkolik akt-begleit → « Das Herz klopft mir bis zum Hals, und ich bin ganz schwach. »

## 4. Doublons préexistants listés en Q4 § 7a — tous traités

- itp akt-begleit → « Seit einigen Tagen bin ich etwas müde. » (begleitsymptome[3]) ; gencives et épistaxis DÉPLACÉS en `frageAntworten` de « Blutet Ihr Zahnfleisch … Nasenbluten? », la règle forte en `frageAntworten` de la question de frauenanamnese
- delir : akt-begleit coupé « Er sieht Tiere im Zimmer … » → DÉPLACÉ en `frageAntworten` de la question des hallucinations ; akt-einfluss coupé « Seine Brille und sein Hörgerät … » → DÉPLACÉ en `frageAntworten` de la question Brille/Hörgerät
- achalasie akt-beginn → « Angefangen hat es vor etwa drei Jahren. » ; « ganz langsam und schleichend … bei fast jeder Mahlzeit » DÉPLACÉ en `frageAntworten` de la question de l'évolution
- rheumatisches-fieber akt-verlauf : migration DÉPLACÉE en `frageAntworten` de la question « Wandern die Schmerzen … »
- laktoseintoleranz akt-ausloeser : latence DÉPLACÉE en `frageAntworten` de la question de latence ; reste « Ja, es hängt am Essen — an der Milch. Komischerweise … »
- malaria akt-infekt-fieber : « ohne festen Rhythmus – manchmal steigt es zweimal am Tag » DÉPLACÉ en `frageAntworten` de la question du rythme
- karpaltunnel : « Wachen Sie nachts von den Beschwerden auf? ↳ Wie oft … ↳ Um welche Uhrzeit … » → « Um welche Uhrzeit wachen Sie meistens davon auf? » (le motif dit « ich wache jede Nacht mehrmals davon auf »)
- mammakarzinom (+ Q8) : `aktuellSkip: ['akt-beginn', 'akt-ausloeser']` (le motif dit quand et comment : « vor drei Wochen beim Duschen … getastet » ; Auslöser « Verletzung, Sonne … » hors sujet, sa réplique redisait la question du cas brust_vorgeschichte) ; « Wann haben Sie den Knoten bemerkt? ↳ Haben Sie ihn selbst ertastet? » RETIRÉE (motif) ; akt-frueher « so eine Veränderung » → question du cas « Hatten Sie so einen Knoten schon einmal? » (frueher, relances de la sonde ; réplique d'akt-frueher en `frageAntworten`) ; akt-veraend-was ne redit plus le motif ; akt-verlauf : « eher etwas größer » DÉPLACÉ en `frageAntworten` de la question entwicklung ; akt-begleit → « Sonst ist mir nichts aufgefallen. » (mamelon : akt-veraend-was ; aisselle : question du cas, `frageAntworten`) ; fam-familie : la tante DÉPLACÉE ; la question du cas devient « Gab es außer Ihrer Mutter noch jemanden in Ihrer Familie mit Brustkrebs oder Eierstockkrebs? » (le motif dit la mère ; relances de Q4 gardées)

## 5. Q8 — natures de motif

### 5.1 Les cinq points nommés

| Cas | Avant | Après |
|---|---|---|
| tvt | « Befund — … Ist Ihnen eine Blutung aufgefallen? » posée | `aktuellSkip: ['akt-veraend-was', …]` (écart § 0.2) |
| sturz-im-alter | Ablauf / Dauer / Einfluss / Frühere : « so ein Anfall », posées avant que le patient ait dit un malaise | renommées et replacées (§ 2, sturz-im-alter) ; « Anfall » n'est plus dit |
| gib | « Hatten Sie so eine Veränderung schon einmal? » | « Hatten Sie so eine Blutung schon einmal? » (question du cas, signe `frueher`, relances de la sonde) |
| mammakarzinom | « Auslöser — … Sonne … » ; « so eine Veränderung » | `aktuellSkip` `akt-ausloeser` ; « Hatten Sie so einen Knoten schon einmal? » |
| malaria | voyage à la 19ᵉ question (5ᵉ de la Fach) | « Waren Sie in den letzten Monaten im Ausland? » ↳ Wo? ↳ Wie lange? ↳ Wann zurück? à la **5ᵉ** question, avant le foyer ; la latence suit |

Au passage, **malaria** : la réplique d'`akt-infekt-kontakt` disait « Prophylaxe habe ich die ganze Zeit genommen, jeden Tag Tabletten » — **contradiction** avec la fiche (« keine Malariaprophylaxe eingenommen », `fach-infekt-reise`, le diagnostic). Corrigée : « Eine Prophylaxe habe ich nicht genommen. »

### 5.2 Le guide (une variante par nature, dans `anamneseChapters.ts`)

- **Veränderung, Frühere Episoden** : « Hatten Sie so eine Veränderung schon einmal? » → « Hatten Sie so etwas schon einmal? » (le mot des natures neurologique et nerveuse). Un nodule, une plaie, un saignement ne sont pas « une Veränderung » ; le cas qui a le mot juste le pose (gib, mammakarzinom).
- **Veränderung, Auslöser** : « eine Verletzung, Sonne, ein neues Medikament, eine Ernährungsumstellung? » → « eine Verletzung, ein Infekt, ein neues Medikament? ». Mesuré : aucune réplique des cas qui la jouent ne parle de soleil ; quatre parlent d'une infection (itp, lymphom, nhl, struma). Les cas cutanés gardent le soleil par la Fach dermato (`fach-derma-ausloeser`, gagnante en r2).

### 5.3 Arbitrage — les gabarits hors sujet, cas par cas

Relevé : pour chaque cas d'une nature autre que `schmerz`, les sondes d'`aktuell` jouées (script de mesure, scratchpad). Aucune **nature** n'est changée : celle déclarée reste juste au regard du premier symptôme (arbitrage K2 des 6 cas du point 16 : commotio, gastroenteritis, laktoseintoleranz, arterielle-hypertonie, tvt, lyme — relus, aucun gabarit absurde restant après ce lot). Ce sont des **sondes** qui ne vont pas au cas ; elles sont sautées par `aktuellSkip`.

| Cas | Nature | Sondes sautées | Pourquoi |
|---|---|---|---|
| tvt | veraenderung | `akt-veraend-was` | § 0.2 |
| mammakarzinom | veraenderung | `akt-beginn`, `akt-ausloeser` | le motif dit quand et comment (« vor drei Wochen beim Duschen getastet ») ; Auslöser « Sonne » ; sa réplique redisait `brust_vorgeschichte` |
| bronchialkarzinom | veraenderung | `akt-veraend-was`, `akt-veraend-blutung` | une toux n'est ni une « Hautveränderung » ni « juckt es » |
| kolorektales-ca, oesophaguskarzinom, achalasie, obstipation | ausscheidung | `akt-ausscheid-was`, `akt-ausscheid-harn-aussehen` | ouverture « Hat sich beim Wasserlassen etwas verändert? » / « Blut im Urin? » à une dysphagie ou un trouble du transit (réplique : « das hatte ich ja gesagt ») ; la miction reste dépistée en végétatif (`veg-ausscheidung`) |
| laktoseintoleranz, colitis-ulcerosa | ausscheidung | idem | idem ; la **diurèse du jour reste** (décision R2 : diarrhée → hydratation, `coherenceRevue` I2) |
| bph, prostatakarzinom | ausscheidung | `akt-ausscheid-was`, `akt-ausscheid-aussehen` | « Stuhlgang verändert? » / « Farbe im Stuhl? » en ouverture d'un trouble mictionnel ; les selles restent en végétatif |

Mesure après : aucune question d'urine en ouverture d'une dysphagie, aucune question de selles en ouverture d'une prostate, plus de « Sonne » ni de « so eine Veränderung » en Aktuelle Beschwerden (`coherenceQ5.test.ts`).

**Vu sans être changé** : hyperthyreose (`allgemein`, motif « anfallsartiges Herzrasen ») pourrait relever d'`anfall` ; akutes-nierenversagen (`allgemein`, motif d'oligurie) joue `akt-ausscheid-aussehen` (sang dans les selles) — à arbitrer cliniquement, pas fait faute de consensus évident.

## 6. Réponses patient — ce qui n'est ni une coupe ni un déplacement à l'identique

| Cas · où | Texte | Source |
|---|---|---|
| endokarditis · `akt-begleit` | Ja — die Glieder tun mir weh. | `begleitsymptome[0]` (Gliederschmerzen) |
| myokardinfarkt · `akt-begleit` | Sonst ist mir nichts aufgefallen — nur dieser Schmerz. | **nouveau** : les trois signes de la réplique sont demandés par les questions du cas — à valider |
| angina-pectoris, pneumonie, hws-diskusprolaps, mammakarzinom · `akt-begleit` | Sonst ist mir nichts aufgefallen. | **nouveau** (même figure que leistenhernie, Q4 F.7-d) : tout `begleitsymptome` est demandé plus loin — à valider |
| pertussis · `fach-pneumo-husten` | Heiser bin ich nicht, und verschluckt habe ich mich auch nicht. | NEG « keine Heiserkeit », « kein Verschlucken » (la sonde jouée ne pose plus que ces deux parts) |
| pertussis · `akt-begleit` | Ich bin tagsüber völlig erschöpft. | VEG « tagsüber erschöpft » |
| myokarditis · `akt-begleit` | Ich bin völlig platt, ich habe keine Kraft mehr. | `begleitsymptome[2]` |
| colitis-ulcerosa · `akt-begleit` | Ich bin völlig erschöpft — ich schaffe den Alltag mit meinem Sohn kaum noch. | `begleitsymptome[0]` |
| akute-leukaemie · `akt-begleit` | Das Zahnfleisch ist entzündet. | `begleitsymptome[4]` |
| nephrotisches-syndrom · `akt-begleit` | Nur diese Müdigkeit, wie gesagt. | `akt-allgemein-art` la dit déjà |
| pyelonephritis · `akt-begleit` | Ich bin seit zwei, drei Tagen immer müder. | `begleitsymptome[2]` |
| itp · `akt-begleit` | Seit einigen Tagen bin ich etwas müde. | `begleitsymptome[3]` |
| schlaganfall · `akt-begleit` | Übel war mir nicht. | NEG « keine Übelkeit » (la part jouée demande l'Übelkeit) |
| sturz-im-alter · `akt-begleit` | Nein — keine Luftnot, keine Brustschmerzen, und übel war mir auch nicht. | NEG « kein Brustschmerz, keine Luftnot … », « keine Übelkeit » |
| sturz-im-alter · `akt-ausloeser` | Ich musste dringend zur Toilette, da war ich in Eile. | `fach-neuro-blase` (« … deshalb war ich heute Nacht auch in Eile », coupé là) |
| sturz-im-alter · `frageAntworten` Hergang | Ich bin nachts aufgestanden, zur Toilette. Dabei wurde mir schwarz vor Augen, wie öfter in letzter Zeit. Im Bad bin ich dann auf dem Vorleger weggerutscht und auf die linke Seite gefallen. | `akt-ausloeser` d'origine + Leit (« beim Aufstehen zur Toilette … ausgerutscht und auf die linke Seite gestürzt ») |
| lumboischialgie · `akt-beginn` | Vor vier Tagen, am Morgen. Ganz plötzlich. | Leit « akut … einschießende » |
| sinusitis · `frageAntworten` Riechen | Das Riechen ist seit drei Tagen fast weg. Das Essen schmeckt deshalb ganz fade. | `akt-begleit` d'origine + VEG « schmeckt wegen der Riechminderung fade » |
| struma · `frageAntworten` | Luftnot eigentlich nicht. Aber wenn ich flach liege, wird das Engegefühl schlimmer — deshalb schlafe ich seit ein paar Wochen mit einem zweiten Kissen. | NEG « keine Luftnot » ; `begleitsymptome` (« im flachen Liegen ein zunehmendes Engegefühl … zweiten Kissen ») ; `akt-einfluss` d'origine |
| delir · `frageAntworten` Brille | (Die Tochter: Ja, normalerweise beides. Aber das Hörgerät ist im Krankenhaus verloren gegangen, und die Brille liegt zu Hause.) | `akt-einfluss` d'origine ; « normalerweise beides » est ce que la phrase d'origine présupposait |
| laktoseintoleranz, colitis-ulcerosa · `akt-ausscheid-harn-haeufigkeit` | So oft wie immer, da hat sich nichts verändert. | reformulation de la réplique (« Mit dem Wasserlassen ist … nichts verändert ») pour qu'elle réponde à la fréquence |
| malaria · `akt-infekt-kontakt` | Eine Prophylaxe habe ich nicht genommen. | correction de contradiction (§ 5.1) |
| gib · `frageAntworten` | So schwarzen Stuhl hatte ich noch nie; das Brennen im Magen aber schon länger. | réplique d'`akt-frueher`, telle quelle |

Tous les autres textes sont des coupes, ou des déplacements à l'identique (listés au § 2 à § 4 avec la réplique d'origine).

## 7. Vérifications — HEAD `b9933833` (avant le commit de ce rapport)

| Commande | Code |
|---|---:|
| `npx tsc -b` | **0** |
| `npx vitest run --dir src --maxWorkers=2` (191 fichiers, 2 017 tests) | **0** |
| `npm run test:c6 -- --maxWorkers=2` (16 fichiers, 183 tests) | **0** |
| 21 `check*.mjs` de la CI + `checkTermRegister --require-all` + `evalDoctopus --dry` | **0**, sauf `checkProbeOverlap` **1** : 9 répétitions, autant que sur `main` (informatif, `\|\| true` en CI) |
| `node --test scripts/*.test.mjs` | **0** — 199/199 (trois ancres de mutation alignées sur la question de parkinson découpée) |
| `node scripts/checkBudgetFloor.mjs origin/main` (@ `bed75a6c`) | **0** |
| `npm run build` | **0** |
| `git merge-tree --write-tree origin/main HEAD` | **0** |
| `df -h /` pendant la batterie | 60 Gi libres ; aucun fichier temporaire laissé (les deux `fsp-mut-*` de `$TMPDIR` datent du 3 et du 5 oct., ils ne sont pas à moi) |

Gels régénérés, chacun dit au commit : `trame-actuelle.txt` (composées, doublons, renommages, sauts), `doublon-banque-q4.txt` (−2 lignes, aucune ajoutée). Tests adaptés : `coherence.fachCovers` (68 / 21), `symptoms` (490 signes), `coherenceQ4` (karpaltunnel), `reponseDoublon` (plafonds, `ADMIS`). Nouveau : `coherenceQ5.test.ts` (11 tests).

## 8. Réserves (DONE_WITH_CONCERNS)

1. **tvt** : saut de la sonde entière, pas de la part (§ 0.2) — à confirmer, ou proposition de contrat.
2. **Textes « Sonst ist mir nichts aufgefallen. »** (5 cas) : plausibles, mais ce sont des négatifs écrits ; la revue clinique dira si l'un d'eux doit plutôt garder un signe demandé plus bas (le standard de `main` sur copd en garde un).
3. **Questions retirées entières** parce que tout était dit avant (nephrotisches-syndrom #0, endometriose ×2, cml, allergische-rhinitis, hodentorsion, mammakarzinom « Wann bemerkt », sinusitis « Backenzähne », aortendissektion « gewandert ») : l'information reste obtenue par la réplique qui la disait ; à confirmer que la question ciblée n'avait pas une valeur d'apprentissage propre.
4. **Banque 367** : surtout structurel (§ 3.2) — relève du guide, pas d'un lot de contenu.
5. **ADMIS** : 22 nouvelles entrées (présyncope ≠ perte de connaissance ×4, signe grossier dit / signe fin demandé, deux faux positifs de lecture). La porte ne voit pas leur justesse.

## Non vérifié

- Les parcours navigateur (`parcours-candidat`, `parcours-mutations`, `e2e/*`) n'ont pas été lancés (aucun serveur, consigne). Les questions renommées de sturz-im-alter et la question de voyage de malaria n'ont pas été vues à l'écran.
- La justesse clinique des `sucht` et des `ADMIS` : revue clinique.
- Le registre `serie3-avancement.md` n'est pas mis à jour (tenu par `main`).
- Les trois `frageAntworten` orphelines antérieures (itp ×2, copd ×1), relevées par `coherenceQ5`, ne sont pas traitées.
