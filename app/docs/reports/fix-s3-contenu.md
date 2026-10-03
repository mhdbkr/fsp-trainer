# Correctifs de revue — `feat/s3-contenu` (fixeur `fix-s3-contenu`)

Liste traitée : `app/docs/reports/revue-s3-contenu.md` (committée telle quelle,
`01ac9e8`). Writer unique du worktree `doctopus-s3-contenu`, HEAD de départ
`104246b`. Aucun relecteur lancé : la re-revue revient à `main`.

**Statut : DONE_WITH_CONCERNS** — tous les items sont traités. Trois écarts
assumés par rapport au texte de la revue (§ 4) et deux mineurs non corrigés
(§ 5).

## 1. Item → commit

| item | commit | preuve |
|---|---|---|
| (artefact) revue consolidée | `01ac9e8` | — |
| **C1** budget regravé A=519 B=119 ; chiffres du rapport du lead corrigés (corpus 3 756, trame 8 542) | `7890f22` | suite de mutation 6/9 → 9/9 |
| **Clinique** `case-oesophaguskarzinom` : « seit einigen Wochen immer öfter, inzwischen auch Weiches » | `823e805` | aligné sur akt-motiv / akt-beginn / Leitsymptome |
| **B1** `akt-atemnot-husten` · **B2** `akt-nerven-art` · **B3** `akt-neuro-ausfall` (+ sonde) | `4cfb0a5` | une question par réplique |
| **M2** mutations sur copie de travail (`scripts/mutationSandbox.mjs`) | `51949ab` | md5 de `seedCases.ts` identique après les suites |
| **I1 I2 I3 I4 I7 I8 + D1** | `c8ce56a` | 8 tests rouges sur `51949ab` (le message de commit dit `4cfb0a5` : même validateur), 18/18 verts |
| **I5 + D4 (I6)** | `4d6bd5a` | 3 vitest rouges sur `c8ce56a`, verts (14/14) |
| **M4** compteur `relu` + `--bless` gardé (socle) | `ba6af6d` | 2 tests rouges sur `4d6bd5a`, 5/5 verts |
| **I3** verrou « face à main » (`checkBudgetFloor.mjs`) | `0c1c0bd` | 5/5 ; face à `c8ce56a~1` il montre la hausse de mesure A 519→524, C 5→8 |
| **Majeurs cliniques** (doublons masqués, MS, D2, D3, `akt-anfall-bewusstsein`) | `8eb5629` | informations vérifiées dans la trame jouée (§ 3) |
| **Langue / concision** (27 items + SC:61740, 14566, 31378, 9153) | `71a9f16` | tableau § 2 |

### Détail des correctifs mécaniques (tous rouge → vert)

- **I1** `ALLOWED_COMPOSED` est vide (contrat Q12) ; son nombre est le compteur
  **E** du budget. Ajouter une entrée → exit 1. `fach-uro-flanke` passe par le
  critère mécanique (Flanke/Rücken ne sont pas des membres), ce qui démasque
  ses deux constats A.
- **I2** clé absente ou non entière → exit 2 (le `NaN > 0` qui taisait la règle).
- **I3** `--bless` refuse toute hausse et **conserve les notes du fixture** (le
  `--bless` d'origine effaçait `serie3` et `question_ouverte_B`) ;
  `checkBudgetFloor.mjs` refuse toute hausse face à la base git.
- **I4** le validateur lit `playedTrame(c)` pour les 130 cas. Chaque texte
  distinct absent du catalogue compte une fois. Il compte les 5 textes à 2 « ? »
  affichés 56 fois, ainsi que les 778 conclusions propres aux cas que
  `abschlussChapterFor()` sans cas ne voyait pas (aucune n'est fautive).
  Corpus 3 758 → 4 543.
- **I5** invariant testé : union des `parts.sucht` = `PROBE_SUCHT[probe]`.
  `veg-schuettelfrost` a désormais trois parties, et `akt-allgemein-gewicht`
  porte `durst`. `dedupeBySymptom` pose chaque partie restante **seule** : le
  `join(' ')` est supprimé.
- **D1 / I7** salves d'Oberarzt comptées : **D2 = 453**, **D3 = 12** (dont
  `case-reizdarm`, SC:6502). Un « ? » cité entre guillemets (« Der Patient
  fragt: „…?“ ») n'est plus compté (−1 A, `guide-kommunikation`).
- **I8** la règle C suit le contrat §3.3 : il faut un membre supérieur et un
  membre inférieur (Hand/Arm ↔ Fuß/Bein), au singulier, avec un article
  facultatif. Le verbe d'irradiation exempte. INV-42 est tenu :
  `fach-neuro-kraft` et `fach-ortho-sensomotorik` échouent ;
  `case-cholezystitis` et `case-erysipel` passent. Le second n'était pas dans
  la revue : « am Bein oder am Fuß » y désigne un seul membre. Bug corrigé au
  passage : `\b` ne voit pas de fin de mot après « ß », donc « der Fuß »
  n'était jamais attrapé.
- **D4** nouveau concept `polyurie` pour `fach-endo-durst` et pour la question
  « levers nocturnes » de `case-diabetes-typ1`. « Wasserlassen » revient dans
  la Vegetative Anamnese des cas endocriniens.
- **M4** 122 annotations `relu` au départ, 115 à l'arrivée. Le compteur ne
  remonte jamais.

## 2. Budget final et mesure de concision

**Budget** (`atomicity-budget.json`) : A=522 · B=118 · C=8 · D=0 · D2=453 · D3=12 · E=0,
sur 4 538 énoncés. Socle trame : 0 constat, **relu 115**.

Deux mouvements de sens opposé :
- **Hausse de mesure.** Elle est écrite à la main, avec sa raison dans
  `revue_s3`. A passe de 519 à 525 (+5 textes de trame, +2 `fach-uro-flanke`,
  −1 citation) et C de 5 à 8 (INV-42).
- **Baisse de contenu.** A redescend de 525 à 522 (recollage, doublons
  supprimés) et B de 119 à 118.

**Concision des 27 items.** On compte les mots du corps de la question (sans
étiquette) et de ses relances ; `akt-ausscheid-aussehen` inclut la sonde neuve
`akt-ausscheid-schlucken`, qui en est issue. La revue annonçait « 498 » avec
un comptage non précisé.

| | total |
|---|---:|
| origine (`eb493bb`) | 497 |
| avant correctif (`104246b`) | 505 |
| **après** (`71a9f16`) | **451** |

**Aucun des 27 items ne dépasse son total d'origine.** Onze le dépassaient au
départ. La cible « ≈ 400 » n'est pas atteinte : aller plus bas oblige à couper
des relances qui portent une information absente ailleurs dans la trame.

```
akt-ort 15→12 · ausstrahlung 15→9 · atemnot-belastung 18→18 · atemnot-nachts 23→21
atemnot-husten 21→21 · allgemein-alltag 15→15 · allgemein-tageszeit 17→17
allgemein-gewicht 23→23 · allgemein-schwellung 14→14 · psych-stimmung 19→6
psych-antrieb 19→8 · psych-schlaf 15→13 · neuro-ausfall 18→18 · neuro-dauer 14→14
neuro-lage 21→18 · infekt-fieber 15→15 · infekt-kontakt 20→20 · veraend-entwicklung 16→16
veraend-blutung 22→21 · nerven-art 21→21 · nerven-alltag 17→16 · nerven-tageszeit 17→16
ausscheid-haeufigkeit 20→18 · ausscheid-aussehen(+schlucken) 18→18 · anfall-ablauf 18→18
anfall-dauer 13→13 · anfall-bewusstsein 33→32
```

## 3. Aucune information clinique perdue (vérifié dans la trame jouée)

- **Relances psy retirées.** Les relances Freude, Konzentration et « Momente
  besser » sont retirées. `fach-psych-interesse` et `fach-psych-konzentration`
  sont présentes dans la trame des 10 cas psychiatriques ; `akt-verlauf` est
  dans la même variante.
- **Questions de cas supprimées.** Chaque version conservée a été vérifiée
  présente dans la trame :
  - osteoporose → `fach-ortho-cauda` ;
  - lungenembolie → `akt-beginn` + `akt-ausloeser` ;
  - perikarditis → `fach-kardio-luft`, `-oedeme` et `-synkope` ;
  - somatoforme → `fach-psych-suizid` ;
  - uterus SC:32460 → `fach-gyn-blutung`.
- **`sucht` sur `case-sturz-im-alter`.** Ce `sucht` aurait effacé toute la
  question « Krampfanfall ». `fach-neuro-anfall` reçoit donc des `parts` : la
  trame de sturz garde « Hatten Sie schon einmal einen Krampfanfall? ». TIA
  garde Zungenbiss et Urin (question du cas + `fach-neuro-anfallzeichen`).
- **`akt-veraend-blutung` (D3).** La relance diathèse est retirée. Dans les cas
  hémato de cette catégorie (itp, nhl), `akt-veraend-blutung` s'efface devant
  `fach-haem-blutung`, qui pose donc bien la diathèse là où elle compte.
- **`case-panikstoerung`.** Zungenbiss et Urin sont posés, et c'est le seul cas
  qui joue `akt-anfall-bewusstsein`.

## 4. Écarts assumés par rapport au texte de la revue (à trancher par `main`)

1. **`case-uterus-myomatosus`, question « Binden » : non supprimée.** Le cas
   écrit lui-même « Die Blutung QUANTIFIZIEREN … Genau das erwarten die
   Prüfer ». `fach-gyn-blutung` demande seulement si le saignement a changé ;
   la question du cas quantifie (Binden, Dauer, nächtlicher Wechsel). Son
   annotation `relu` est donc légitime : elle approfondit la question Fach.
   SC:32460, lui, est supprimé.
2. ~~**`akt-nerven-art` : « Zittern » est gardé.**~~ **ANNULÉ par `main`
   (re-revue) — l'arbitrage reposait sur un fait faux.** J'avais lu la carte
   des réponses (`case-parkinson` a une réponse `akt-nerven-art`), pas la
   trame jouée : mesuré sur les 130 cas, seule `case-karpaltunnel` joue cette
   question. Corrigé en « ein Kribbeln, eine Taubheit oder eine Schwäche »
   (`cf49a64`).
3. **Versions prescrites plus longues que l'origine : j'ai pris la plus courte
   qui reste une seule question complète.** Cela concerne B1, `infekt-fieber`,
   `infekt-kontakt`, `anfall-dauer`, `anfall-bewusstsein` et `neuro-ausfall`.
   Exemples :
   - B1 : « Welche Farbe hat der Auswurf? » + « Ist Blut dabei? » ;
   - `infekt-fieber` : « Wie hoch war die Temperatur, als Sie gemessen
     haben? », une seule interrogation au lieu de deux fusionnées (M1) ;
   - `anfall-dauer` : « Sekunden, Minuten, Stunden? » sans « oder » (13
     mots, égal à l'origine) ;
   - `anfall-bewusstsein` : trois relances plutôt qu'une relance à deux « ? »,
     qui aurait fait remonter A.

   Autres choix :
   - `akt-ausscheid-aussehen` perd « schaumig » et « Geruch » dans la
     question. Les cas où c'est positif (laktose : « schäumt », zystitis :
     « riecht streng ») le disent dans leur réponse. Les garder coûtait B+1 ou
     un dépassement du total d'origine.
   - `akt-nerven-tageszeit` : la relance n'est plus « Wärme/Anstrengung »
     (mot pour mot `fach-neuro-verlauf`) mais « Gibt es Haltungen oder
     Situationen, in denen es stärker wird? ». `case-karpaltunnel` n'a pas
     `fach-neuro-verlauf` ; la posture y est le signe clé.
   - `case-lyme` : `sucht` est posé sur SC:4485 (« Seit wann … wird sie
     größer? »), l'équivalent de « bemerkt? ausgebreitet? » de la Fach.

## 5. Mineurs consignés, non corrigés

- **M1** : couvert pour AC:275. AC:367 garde « …, und wie oft nachts? », la
  version prescrite.
- **M3** : le budget reste compté au total par règle. Une régression compensée
  par un gain ailleurs passe toujours.
- **M5** : une faute présente dans la sonde et dans le guide compte deux fois.
- **« 81 relu » du rapport du lead** : le compteur mesure maintenant 122 au
  départ et 115 à l'arrivée.
- **Pré-existants** :
  - `case-uterus-myomatosus:32459` : non traité ;
  - `case-hypothyreose` Haarausfall : résolu en chemin (SC:14566 ne demande
    plus que les sourcils) ;
  - 10 constats Tier B : non traités.

## 6. Lignes CI à ajouter au merge

Remplacées par la version définitive de la re-revue (§ R4 ci-dessous) : la
première version comparait à `origin/main` y compris sur `push`, et
`checkBudgetFloor` sortait à 0 sur une ref introuvable.

## 7. Vérification finale (code de sortie, sans pipe, sur `71a9f16`)

- tous les `scripts/check*.mjs` : 0. Seul `checkProbeOverlap` sort à 1, et il
  est informatif (`|| true` en CI) : 8 avant mes correctifs, 8 après — **face
  à `104246b`, pas face à `main`** (corrigé en re-revue : voir § R2, m-5) ;
- `node --test` : atomicité 18/18, trame 5/5, plancher 5/5 ;
- `npx tsc -b --noEmit` : 0 ;
- `npx vitest run --dir src/data` : 64/64 ;
- `checkBudgetFloor main` : 0 (vacant) ;
- trame jouée : 8 568 questions, aucune paire ≥ 0,6.

## Non vérifié

- **Rendu dans le DOM de l'app.** Il n'a pas été observé : relances en
  retrait, parties posées une à une, Supabase local toujours à l'arrêt. Les
  effets sont mesurés hors DOM, par le montage réel en esbuild.
- **Relecture langue.** Le détail de la relecture langue sur SC:14566, 31378
  et 9153 n'était pas dans la liste consolidée. Les corrections sont déduites
  des mots cités (« Zuckersensor », « einen Bus ») et de la clinique ; une
  relecture langue doit les confirmer.

---

# Re-revue de `715e416` — correctifs (fixeur `fix-s3-contenu`)

Verdict de la re-revue : *Request changes*, deux relectures indépendantes.
Même worktree, même méthode (tests rouges d'abord pour le mécanique, mutations
sur copie de travail uniquement). HEAD final : `cf49a64` + ce rapport.

## R1. Mécanique — item → commit (rouge → vert)

| item | commit | preuve |
|---|---|---|
| **I-1** guillemets retirés avant comptage pour l'**Oberarzt seulement** | `83cb99f` | test rouge sur `715e416` (« „Wie groß sind Sie?“ Wie viel wiegen Sie? » sortait à 0) → vert |
| ↳ vrai positif démasqué : `seedGuides` k9 (suicidalité, deux questions du candidat) | `38f6870` | A 522 → 523 (hausse écrite à la main, `rerevue_s3`) → 522 après correction du contenu |
| **I-2** `checkBudgetFloor` : ref introuvable = exit 2 (`git rev-parse --verify`) ; seul un fichier absent d'une ref valide est ignoré | `83cb99f` | `checkBudgetFloor.mjs no-such-ref` : 0 → **2** ; test rouge → vert |
| **I-3** `sucht: []` n'exempte plus `checkTrameSymptoms` (`q.sucht?.length`) ; `CaseQuestion.sucht` typé `[string, ...string[]]` | `83cb99f` | mutation `relu: true → sucht: []` sur `case-lyme` : 0 → **1**. Le type vit dans `src/db/types.ts`, hors de mon périmètre initial, modifié sur demande explicite de `main` |
| **m-1** `--rule` / `--corpus` documentés comme loupes (exit 0 par construction), **jamais en CI** | `83cb99f` | en-tête du script |
| **m-2** commentaire aligné sur INV-42 ; amendement du contrat proposé | `83cb99f` | § R3 |
| **m-3** `RE_IRRAD` en début de mot (`\b(aus)?strahl…`, `\bzieh(t|en)\b`) : « anziehen », « beziehen » n'exemptent plus | `83cb99f` | mutation « … mit einem Arm oder Bein schlechter anziehen? » : non signalée → signalée |
| **m-4** `case-erysipel` dans le test INV-42 | `83cb99f` | garde-fou (vert d'emblée) |
| **m-5** `checkProbeOverlap` : les 4 recouvrements nouveaux face à `main` marqués `deepens` | `d132c34` | voir § R2 |

Suites finales : atomicité **20/20**, trame **6/6**, plancher **6/6**.

## R2. `checkProbeOverlap` face à `main` (m-5)

Le « 8 avant, 8 après » du § 7 était vrai face à `104246b`, **faux face à
`main`**. Mesure face à `main` : **11 → 5**.
- **4 nouveaux, arbitrés en `deepens`** (chacun approfondit la question
  générale) :
  - `fach-kardio-nykturie` → `akt-ausscheid-haeufigkeit` (introduit par ma
    reformulation « wie oft nachts ») ;
  - `fach-kardio-synkope` → `akt-anfall-bewusstsein` ;
  - `fach-derma-muttermal` → `akt-veraend-blutung` ;
  - `fach-onko-leistung` → `akt-allgemein-alltag`.
- **4 restants, préexistants sur `main`** : `fach-psych-antrieb`,
  `fach-psych-suizid`, `fach-pneumo-giemen`, `fach-gefaess-immobilisation`.
- **1 nouveau, laissé non marqué (faux positif lexical)** :
  `fach-nephro-infekt` ↔ `akt-infekt-kontakt`. Il vient de « in den letzten
  Wochen », la formulation demandée par `main` (m4). Les deux sondes ne sont
  jouées ensemble dans **aucune** des 130 trames (les 4 cas néphro ne jouent
  pas `akt-infekt-kontakt`). Un `deepens` afficherait « approfondit Kontakt und
  Reise » dans le guide : ce serait faux. **À trancher par `main`.**

## R3. Proposition d'amendement du contrat `frage-atomique` §3.3 (m-2)

Le §3.3 exige un « article répété sur chaque membre », alors qu'INV-42 exige
que `fach-neuro-kraft` (« ein Arm oder Bein », sans article répété) échoue.
Le script suit INV-42. Proposition de texte pour le §3.3 :

```
FAUTE (bloqué) : EXACTEMENT 2 membres, l'un SUPÉRIEUR (Hand, Arm), l'autre
                 INFÉRIEUR (Fuß, Bein), au singulier, reliés par « oder » ou
                 « / » — article ou préposition FACULTATIFS
                 (« die Hand oder der Fuß », « ein Arm oder Bein »,
                 « in Arm oder Bein », « das Bein/den Arm »).
EXEMPTÉ        : ≥ 3 territoires énumérés ; verbe d'irradiation en début de mot
                 (ausstrahlen, strahlt … aus, zieht/ziehen) ; deux régions du
                 MÊME membre (« am Bein oder am Fuß », case-erysipel).
```

Contrat hors de mon périmètre : c'est une proposition, à appliquer par le
propriétaire de `docs/contracts/`.

## R4. Clinique et langue — `cf49a64`

- **Décision de `main`.** `akt-nerven-art` devient « ein Kribbeln, eine
  Taubheit oder eine Schwäche » (guide et sonde). La relance « pelzig und
  taub » n'est pas rétablie : Taubheit est dans la question, et la relance
  aurait fait dépasser le total d'origine (21).
- **M2.** Le Zungenbiss n'est plus gardé par « Falls ja » : « Haben Sie sich
  dabei verletzt, etwa auf die Zunge gebissen? ». La réponse de
  `case-panikstoerung` reçoit « auf die Zunge gebissen auch nicht. Eingenässt
  habe ich auch nie. ».
- **M3.** La question de cas de `case-tia` est supprimée. Sa trame garde
  `akt-begleit`, `fach-neuro-anfall` (rétablie) et `fach-neuro-anfallzeichen`.
- **M4.** « Und beim Gehen — sind Sie schon gestürzt? ». La question perd
  « dadurch » pour tenir 17 mots.
- **M5.** La phrase Schlucken sort de **13** réponses à `akt-ausscheid-was`
  (la revue en comptait 12), réécrites une par une, à la main. Pour
  oesophaguskarzinom et achalasie, la réponse ne dévoile plus la sonde
  suivante.
- **m2.** « Sekunden, Minuten oder Stunden? ». La relance devient « Wie oft
  passiert das? » pour tenir 13 mots.
- **m3.** Deux concepts, `schub` et `waerme`. `fach-neuro-verlauf` reçoit des
  `parts`, et la question Uhthoff de `case-multiple-sklerose` déclare
  `sucht: ['waerme']`. La trame MS garde « Kamen die Beschwerden schubweise…? »
  ; la chaleur n'est plus demandée qu'une fois. La relance devient
  « Körperhaltungen ».
- **m4.** « Haben Sie Fieber gemessen? » + « Wie hoch war es? » ; « Waren Sie
  in den letzten Wochen im Ausland? ». La relance contact perd « in dieser
  Zeit » pour tenir 20 mots.
- **m5.** « Husten Sie dabei etwas ab? », « Falls Sie etwas abhusten: Welche
  Farbe hat das? », « Ist Blut dabei? ».
- **m6.** `case-tvt` reçoit « Bluten Sie leicht aus der Nase, oder bekommen
  Sie schnell blaue Flecken? », avec sa réponse de fiche (`frageAntworten`) :
  « Nein, Nasenbluten habe ich eigentlich nie … ».
- **m7.** `case-commotio` : deux questions de cas, « Wann haben Sie zuletzt
  gegessen? » et « Was hat Ihr Zuckersensor kurz vor dem Unfall angezeigt? ».

**Concision des 27** : 497 (origine) → **448**. Aucun item ne dépasse son
total d'origine.

## R5. Lignes CI définitives (job `contrats` de `quality.yml`)

```yaml
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0            # checkBudgetFloor lit la base par git show
      # … après « Un symptôme, une question » :
      - name: Atomicité des questions — budget dégressif (A B C D D2 D3 E)
        run: node scripts/checkQuestionAtomicity.mjs          # jamais --rule / --corpus (loupes, exit 0)
      - name: Aucun compteur dégressif ne remonte face à la base
        run: |
          if [ "${{ github.event_name }}" = "pull_request" ]; then
            BASE="origin/${{ github.base_ref }}"
          else
            BASE="${{ github.event.before }}"
            # premier push d'une branche : « before » vaut 40 zéros
            if [ "$BASE" = "0000000000000000000000000000000000000000" ]; then BASE=origin/main; fi
          fi
          node scripts/checkBudgetFloor.mjs "$BASE"           # ref introuvable = exit 2
      - name: Mutations — atomicité, trame, plancher (copie de travail)
        run: |
          node --test scripts/checkQuestionAtomicity.test.mjs
          node --test scripts/checkTrameSymptoms.test.mjs
          node --test scripts/checkBudgetFloor.test.mjs
      - name: Ordre des questions (informatif, contrat §3.6)
        run: node scripts/checkQuestionOrder.mjs || true
```

`checkBudgetFloor` est vacant pour CE merge : les deux fixtures n'existent pas
sur `main`. Il devient le verrou dès le merge suivant.

## R6. Vérification finale (code de sortie, sans pipe, sur `cf49a64`)

- **`scripts/check*.mjs`** : tous à 0, sauf `checkProbeOverlap`, informatif,
  à 1 (5 constats, contre 11 sur `main`).
- **Budget** : A=522 · B=118 · C=8 · D=0 · D2=453 · D3=12 · E=0, sur 4 543
  énoncés ; socle trame 0 constat, `relu` **115**.
- **Trame jouée** : 8 570 questions, aucune paire ≥ 0,6.
- **`node --test scripts/*.test.mjs`** : les 8 fichiers à 0 (atomicité 20,
  trame 6, plancher 6, bedeutung 4, caseTermLinks 9, termRegister 9,
  linkCaseTerms 31, registerLots 3).
- **`npx tsc -b --noEmit`** : 0.
- **`npx vitest run --dir src`** : **557/557** (88 fichiers). Un passage
  intermédiaire a sorti 9 échecs : 8 timeouts et rendus d'UI, plus
  `prompt.corpus.test.ts` en timeout, avec une charge machine de 115–148. Ce
  dernier, relancé seul, passe 2/2 en 3,7 s. Le passage complet suivant, à
  charge normale, est vert : ce n'était pas un vrai échec.
- **`checkBudgetFloor main`** : 0 (vacant) ; **`checkBudgetFloor no-such-ref`** : 2.

## R7. À trancher par `main`, et non vérifié

- **À trancher** : `fach-nephro-infekt` ↔ `akt-infekt-kontakt` (§ R2),
  l'amendement du §3.3 (§ R3), et la question Binden d'`uterus-myomatosus`
  (§ 4, point 1, non contestée en re-revue).
- **Commits groupés** : `cf49a64` regroupe les items clinique et langue,
  parce qu'ils touchent les mêmes fichiers. Chaque item y est énuméré, mais
  il n'y a pas un commit par correctif.
- **Non vérifié** : le rendu dans le DOM de l'app (Supabase local toujours à
  l'arrêt).
