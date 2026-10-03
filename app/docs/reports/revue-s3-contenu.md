# Revue indépendante de `feat/s3-contenu` — liste unique pour le fixeur

> Quatre relectures lancées par `main` (le lead n'avait pas d'outil de dispatch) :
> langue (Sonnet), clinique (Sonnet), concision (Sonnet), branche (Opus).
> **Verdict commun : non mergeable en l'état.** Chemins relatifs au worktree ;
> `AC` = `app/src/data/guides/anamneseChapters.ts`, `AP` = `anamneseProbes.ts`,
> `SC` = `app/src/data/seedCases.ts`, `SY` = `app/src/data/guides/symptoms.ts`.

## Décisions de `main` qui tranchent les points ouverts

- **D1 — Règle D (Oberarzt).** La direction a exempté les salves d'examinateur de
  l'atomicité (Q11) : on ne les découpe pas. Mais la règle ne peut pas être
  « aveugle » : les salves de 2 et 3 « ? » restent **comptées dans un budget qui ne
  remonte jamais** (clé dédiée, ex. `D2`/`D3`), la découpe restant réservée aux
  salves incohérentes. Corrige aussi le comptage des « ? » cités entre guillemets.
- **D2 — Sonde neuve `akt-ausscheid-schlucken`.** On la garde (exemple de la
  direction). Pour tenir « un symptôme, une question », retire « Schlucken » de
  `akt-ausscheid-was` dans la même trame, sinon 11 cas sur 13 disent deux fois « nein ».
- **D3 — `akt-veraend-blutung`.** Rétablir le dépistage **par site** en relance
  (selles, urines, toux). La relance « diathèse » (Nasenbluten, blaue Flecken) est
  retirée : `fach-haem-blutung` la porte là où elle compte.
- **D4 — `miktion`.** Polyurie ≠ trouble mictionnel : sépare le concept
  (`polyurie` pour `fach-endo-durst`), pour que « Wasserlassen » ne disparaisse plus
  de `veg-ausscheidung` dans les 5 cas endocriniens.

## CRITIQUE / BLOQUANT

1. **[branche C1] La suite de mutation est rouge à HEAD.** Le fixture grave A=520,
   B=120 ; le contenu mesure A=519, B=119 (`919b43f` a baissé sans `--bless`). 3 tests
   échouent (`node --test scripts/checkQuestionAtomicity.test.mjs` → 6/9). Regrave,
   puis relance ; corrige les chiffres périmés du rapport (corpus 3 756, trame 8 542).
2. **[clinique] `case-oesophaguskarzinom` se contredit sur la durée** (`SC:1716`
   « seit Monaten » vs `:1711` / `:1686` / `akt-beginn` = 4 semaines). Correctif :
   « seit einigen Wochen immer öfter, inzwischen auch Weiches ».
3. **[langue B1] `AC:143`** — relance à deux questions, et « er » renvoie à *Husten*
   (une toux n'a pas de couleur). →
   `'Falls ja: Ist er trocken, oder husten Sie etwas ab?'`,
   `'Falls Sie etwas abhusten: Welche Farbe hat das?'`, `'Ist auch Blut dabei?'`
4. **[langue B2] `AC:336`** — `'Wo genau, und auf einer oder auf beiden Seiten?'` →
   `'Wo genau spüren Sie das?'` + `'Auf einer Seite oder auf beiden?'`
5. **[langue B3] `AC:246` (miroir `AP:363`)** — la question elle-même est double.
   → question `Was genau war anders: eine Schwäche oder ein Taubheitsgefühl?`, relance
   en tête `'Auf welcher Seite war das?'`. Le validateur l'a laissée passer : voir I4.

## IMPORTANT — mécanique (branche)

- **I1** Exemption nominative contourne le budget (`checkQuestionAtomicity.mjs:89-92`,
  `:218`) : ajouter un id à `ALLOWED_COMPOSED` → exit 0. Le script doit échouer si la
  liste grossit (contrat §3.1, Q12). L'exemption `fach-uro-flanke` ne sert qu'à masquer
  2 constats A et son test « doesNotMatch » ne prouve rien.
- **I2** Une clé retirée du fixture désactive sa règle (`:272-273`, `NaN > 0`).
- **I3** `--bless` fait remonter le budget sans garde (`:241-251`). Verrou : refuser
  toute hausse face à la version de `main` (étape CI proposée par le relecteur, à
  reporter dans ton rapport, tu n'écris pas `.github/`).
- **I4** Le validateur lit le catalogue, pas la **trame jouée** (`:123-148`,
  `abschlussChapterFor()` sans cas) : 5 textes à ≥ 2 « ? » s'affichent 56 fois sans
  être comptés — dont **un créé par la branche** : le recollage des `parts` par
  `join(' ')` (`SY:234`) produit « Hatten Sie Schüttelfrost? Schwitzen Sie nachts
  stark…? » dans 6 cas endocriniens. Parcours `playedTrame(c)` comme
  `checkQuestionOrder`.
- **I5** Cause de I4 : `SY:51` déclare `schwitzen` pour `veg-schuettelfrost` sans part
  correspondante ; même défaut latent `SY:64` (`akt-allgemein-gewicht` / `durst`).
  Invariant à ajouter : union des `parts.sucht` = `PROBE_SUCHT[probe]`.
- **I6** → D4.
- **I7** → D1. Contre-exemple non attrapé : `SC:6502` (`case-reizdarm`).
- **I8** Règle C : `RE_ART` exige un article sur chaque membre, donc
  `fach-neuro-kraft` (« ein Arm oder Bein », `AP:217`) et `fach-ortho-sensomotorik`
  passent — alors que l'INV-42 exige l'échec de `fach-neuro-kraft`. Faux positif
  `case-cholezystitis` (`SC:1138`, irradiation exemptée).

## MAJEUR — clinique

- **8 doublons masqués par `relu: true`** — supprimer la question du cas pour
  `case-osteoporose` (`SC:18879`), `case-lungenembolie` (`SC:16236`),
  `case-perikarditis` (`SC:57473`, même motif que la question supprimée dans
  hypertonie : arbitrage à rendre cohérent), et la 2ᵉ question de
  `case-uterus-myomatosus` (Binden) ; supprimer aussi `SC:32460` (mot pour mot
  `fach-gyn-blutung`). Ajouter `sucht` pour que la version Fach s'efface :
  `case-lyme` (`sucht: ['ausschlag']`, `SC:4484-4487`), `case-sturz-im-alter`
  (`SC:55543`), `case-tia` (`SC:39375`). **`case-somatoforme-schmerzstoerung`
  (`SC:51231`)** : suicidalité posée deux fois — garde la version **Fach** (elle porte
  le « NOTFALL »), supprime celle du cas.
- **`case-multiple-sklerose` (`SC:6015`)** : le doublon Taubheit devient un triple
  doublon Blase. Coupe « — merken Sie noch, wann die Blase voll ist ». Et l'Uhthoff est
  demandé 3 fois : la nouvelle relance de `akt-nerven-tageszeit` est mot pour mot la
  2ᵉ moitié de `fach-neuro-verlauf`.
- **`akt-veraend-blutung`** → D3 (`AC:316-320`, `AP:375`). Le « nein 12/15 » du tri est
  faux : 5/15 positifs.
- **`akt-anfall-bewusstsein` (`AC:396-400`)** : le Zungenbiss et l'Einnässen ont
  disparu, et `case-panikstoerung` ne les pose nulle part ailleurs alors que `SC:22994`
  les liste en négatifs attendus. →
  `'Falls ja: Haben Sie sich dabei verletzt — Zungenbiss? Ist Urin abgegangen?'`,
  `'Hat jemand gesehen, was passiert ist?'`

## À CORRIGER — langue et concision

Les deux relectures convergent sur plusieurs items ; applique la version la plus
courte **qui reste une seule question orale complète**.

- `AC:393` (miroir `AP:394`) `akt-anfall-dauer` : « eher Sekunden oder eher Minuten »
  oriente et exclut les heures (FA paroxystique). → `Wie lange dauert ein Anfall —
  Sekunden, Minuten oder Stunden?`
- `AC:275` (miroir `AP:368`) : `Haben Sie Ihre Temperatur gemessen, und wie hoch war
  sie?` · `AC:277` : `…ist das Fieber am höchsten?`
- `AC:286` : les deux relances ont perdu « in letzter Zeit » →
  `'Hatten Sie in den letzten Wochen Kontakt zu kranken Menschen oder zu Tieren?'`,
  `'Haben Sie in dieser Zeit etwas Ungewöhnliches gegessen?'`
- `AC:367` (miroir `AP:384`) : `Wie oft müssen Sie am Tag auf die Toilette, und wie
  oft nachts?` — et une seule relance `'Mehr oder weniger als sonst?'` (Drang/Tröpfeln
  sont couverts par `fach-uro-drang`/`-strahl`).
- `AC:214` (miroir `AP:359`) : liste de noms nus → phrase orale. La relance redit
  `fach-psych-konzentration` : retire-la.
- `AC:97` : « lokalisiert » (Fachbegriff) → `Bleiben die Schmerzen an einer Stelle,
  oder ziehen sie woandershin?`
- `AC:204` `akt-psych-stimmung` : → `Wie ist Ihre Stimmung im Moment?` ; relance
  retirée (c'est `akt-verlauf`).
- `AC:209` `akt-psych-antrieb` : relance mot pour mot `fach-psych-interesse` → retirée.
- `AC:334` `akt-nerven-art` (22 → 31 mots) : → question `Was genau spüren Sie: ein
  Kribbeln, eine Taubheit oder eine Schwäche?` + relances courtes (voir B2).
- `AC:339` `akt-nerven-alltag` : relance unique `'Sind Sie dabei schon gestürzt?'`
- `AC:176/178` `akt-allgemein-gewicht` : reprendre l'original `'Und Ihr Appetit, Ihr
  Durst?'`
- `AC:256/258` `akt-neuro-lage` : `Dreht sich alles, oder schwankt es?`
- `AC:388/390` `akt-anfall-ablauf` : retirer « genau » et « wieder ».
- `AC:71/74` `akt-ort` : relance → `'Können Sie mir zeigen, wo genau?'` (sans redire
  « wo es wehtut »).
- `AC:371` (miroir `AP:385`) : le `text:` et la `frage` divergent (« Geruch ») —
  aligne-les ; une seule phrase orale.
- `SC:6015`, `SC:18879`, `SC:14566`, `SC:31378` (« Zuckersensor » plutôt que
  « Sensor »), `SC:9153` (« einen Bus ») : voir la relecture langue ; `SC:6015` et
  `SC:18879` sont de toute façon traités par la clinique ci-dessus.
- `SC:61740` `case-arterielle-hypertonie` : question suggestive → `Wo sitzt der
  Kopfschmerz?`

**Objectif mesurable (concision)** : aucun des 27 items ne doit dépasser son total
d'origine (question + relances). Total visé ≈ 400 mots (498 aujourd'hui).

## Mineurs, à consigner (ne pas corriger sauf s'ils tombent en chemin)

M1 deux découpes fusionnent deux interrogations sous un seul « ? » (couvert ci-dessus
pour `AC:275` et `AC:367`) · M2 les tests de mutation réécrivent `SC` en place (un
SIGKILL laisse le fichier muté : travaille sur une copie) · M3 budget compté au total
(une régression compensée passe : écris la limite dans le fixture) · M4 aucun compteur
ne suit `relu: true` — **ajoute-le** : une annotation ne doit pas pouvoir éteindre
`checkTrameSymptoms` en silence · M5 une faute présente dans la sonde et dans le guide
compte deux fois · « 81 relu » du rapport = 69 annotations / 71 questions distinctes.
Pré-existants hors branche : `case-uterus-myomatosus:32459` (dernière règle redemandée),
`case-hypothyreose` (Haarausfall ↔ `fach-endo-haut-haare`), 10 constats Tier B.
