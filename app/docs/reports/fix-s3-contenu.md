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
2. **`akt-nerven-art` : « Zittern » est gardé.** La revue proposait de le
   remplacer par « Taubheit ». Or `case-parkinson` joue cette variante et y
   répond « das Zittern … eher diese Steifheit ». Question retenue : « ein
   Kribbeln, ein Zittern oder eine Schwäche » (3 items, règle B). Relances :
   « Wo spüren Sie das? » et « Auf einer Seite oder auf beiden? ».
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

## 6. Lignes CI à ajouter au merge (job `contrats` de `quality.yml`)

```yaml
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0            # checkBudgetFloor lit la base par git show
      # … après « Un symptôme, une question » :
      - name: Atomicité des questions — budget dégressif (A B C D D2 D3 E)
        run: node scripts/checkQuestionAtomicity.mjs
      - name: Aucun compteur dégressif ne remonte face à main
        run: node scripts/checkBudgetFloor.mjs origin/${{ github.base_ref || 'main' }}
      - name: Mutations — atomicité, trame, plancher (copie de travail)
        run: |
          node --test scripts/checkQuestionAtomicity.test.mjs
          node --test scripts/checkTrameSymptoms.test.mjs
          node --test scripts/checkBudgetFloor.test.mjs
      - name: Ordre des questions (informatif, contrat §3.6)
        run: node scripts/checkQuestionOrder.mjs || true
```

`checkBudgetFloor` est vacant pour CE merge : les deux fixtures n'existent pas
sur `main`. Il devient le verrou à partir du merge suivant.

## 7. Vérification finale (code de sortie, sans pipe, sur `71a9f16`)

- tous les `scripts/check*.mjs` : 0. Seul `checkProbeOverlap` sort à 1, et il
  est informatif (`|| true` en CI) : 8 avant mes correctifs, 8 après ;
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
