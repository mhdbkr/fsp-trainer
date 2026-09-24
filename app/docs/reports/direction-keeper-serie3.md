# direction-keeper — Série 3 (FB2-J10 un symptôme, une question · J11 cadre « Für diesen Fall » · J12 étiquettes de dimension · J13 Familienstand)

> Revue faite le 17 sept. 2026 sur le **travail non commité** de `main` (`git status` : 11 fichiers modifiés,
> `symptoms.ts`, `symptoms.test.ts`, `checkTrameSymptoms.mjs` nouveaux). Doctrine : `app/docs/DIRECTION-STYLE.md` §4.
> Mesures : `node scripts/checkTrameSymptoms.mjs` (exit 0, `--show` sur pneumonie, copd, pyelonephritis,
> gastroenteritis, appendizitis, lymphom, hyperthyreose, diabetes-typ1, pertussis, polymyalgia,
> nephrotisches-syndrom, akutes-nierenversagen, leistenhernie), sonde scratchpad sur le même montage esbuild
> (questions du cas *précédant* une générale du même symptôme), sondes `getComputedStyle` dans le DOM de l'app
> (`playwright-cli -s=keeper3`, Vite 5173, `#/simulation/case-pneumonie/run`, guide + focus), captures
> scratchpad `aktuell.png`, `gruppe3.png`, `focus3.png`. Sorties de code : `vitest symptoms.test.ts` 11/11,
> `tsc -b` 0, `checkPlayedTrame` / `checkGuideCoverage` / `checkGuideDuplicates` / `checkCaseQuestionChapters` /
> `checkUiTells` tous exit 0. Cas confrontés : pneumonie (h 56, fièvre), copd (h 66, dyspnée), pyelonephritis
> (f 76, douleur), appendizitis (h 41, douleur), hyperthyreose (f, sans douleur), diabetes-typ1 (jeune, sans
> douleur). Lecture seule.

## Verdict court

Le mécanisme fait ce que Mehdi a demandé **dans le sens qu'il a joué** : sur la CAP, la fièvre n'est plus
posée qu'une fois (Aktuelle Beschwerden, DOM : 4 `li` contenant « Fieber », toutes dans `aktuell`, aucune en
Vegetativ) ; sur la BPCO c'est la Fach pneumo qui la pose et la Vegetativ se tait ; sur l'appendicite la
`fach-chir-fieber` `redundant` s'efface devant la Vegetativ ; sur la pyélonéphrite c'est l'Urologie. La règle
« premier chapitre qui cherche le symptôme gagne » est cliniquement juste dans ces quatre trames. Le cadre
« Für diesen Fall » (un titre, `.label` Plex Sans 11,5 px, pas de capitales), l'étiquette `.dim-tag` (Plex Sans
600, 11,5 px / 14 px en focus, `text-transform: none`, pas de mono) et la relance Ja/Nein de Familienstand
(DOM : « Wie viele, und sind sie gesund? » n'apparaît qu'après « Ja ») sont conformes à ADR-0016 et sobres.

Mais la règle n'est appliquée que **dans un sens**. Une question du cas placée dans `aktuell` (la majorité
des ★) qui pose un symptôme sans le déclarer (`sucht`) ne le réserve pas : la Fach ou la Vegetativ le
redemande trois lignes plus bas — et la porte CI ne regarde que *vers l'arrière* (« déjà cherché plus haut »),
donc elle ne peut pas l'attraper. C'est le défaut FB2-J10 lui-même, sur ~30 cas, dont deux fois « la fièvre
posée deux fois » et une fois « Übelkeit mot pour mot deux fois ». Et le backlog est déjà passé à ✅ « livré
et vérifié en prod » alors que rien n'est commité (0 commit d'avance, 18 entrées dans `git status`).

---

## Bloquants (à corriger avant « fait »)

### [BLOQUANT] La modulation ne réserve pas le symptôme d'une question du cas placée AVANT la générale — FB2-J10 revient sur ~30 cas
- **Où** : `app/src/data/guides/symptoms.ts:108-135` (`dedupeBySymptom` : `own` → `return [q]` sans que `phraseSymptoms(q)` soit non vide pour une ★ sans `sucht`, donc rien n'entre dans `asked`) ; `scripts/checkTrameSymptoms.mjs:61-77` (`review` ne compare une ★ qu'aux questions **déjà vues**, jamais aux suivantes).
- **Constat** : toute ★ d'`aktuell` qui interroge un symptôme sans `sucht` laisse la Fach / la Vegetativ le redemander. Le validateur passe (exit 0) sur ces trames.
- **Preuve** (`--show`) :
  - `case-gastroenteritis` : `[aktuell] ★ Haben Sie Fieber gemessen? Hatten Sie Schüttelfrost oder Nachtschweiß?` → `[fach-infektio] Haben Sie Fieber gemessen? Wie hoch, seit wann…` → `[vegetativ] Treten bei Ihnen Schüttelfrost, Nachtschweiß…` : **fièvre ×2, Schüttelfrost ×2, Nachtschweiß ×2** — le constat de la CAP, à l'identique. (Au passage : cette ★ n'est pas annotée et le guide l'accepte.)
  - `case-diabetes-typ1` : `[aktuell] ★ Ist Ihnen übel, mussten Sie erbrechen, oder haben Sie Bauchschmerzen?` → `[vegetativ] Ist Ihnen übel? Mussten Sie sich übergeben?` ; plus `Schwellungen — … Hat sich die Urinmenge verändert?` → `★ Wie oft müssen Sie nachts zum Wasserlassen aufstehen` → `[vegetativ] … beim Wasserlassen?` : **miktion ×3**.
  - `case-copd` : `[aktuell] ★ Husten Sie schon seit Jahren, fast jeden Morgen, oder ist der Husten neu?` → `[fach-pneumo] Haben Sie Husten? Seit wann…` ; `★ … mit wie vielen Kissen schlafen Sie` → `[fach-pneumo] Wie viele Kissen brauchen Sie zum Schlafen?`.
  - `case-pertussis` : **cinq** ★ sur la toux (« Wie hat der Husten angefangen », « Kommt der Husten in Anfällen », « Keuchen », « Müssen Sie sich nach dem Husten übergeben? »…) puis `[fach-pneumo] Haben Sie Husten? Seit wann…` et `[vegetativ] Mussten Sie sich übergeben?`.
  - `case-appendizitis` : `★ Kam die Übelkeit oder das Erbrechen erst, nachdem die Schmerzen begonnen hatten?` et `★ Haben Sie seit Beginn der Schmerzen komplett die Lust auf Essen verloren?` → `[vegetativ] Ist Ihnen übel? … Wie ist Ihr Appetit?`.
  - `case-meningitis` (« erbrochen im Schwall » → « Mussten Sie sich übergeben? »), `case-delir` (« Hat er Fieber … Wasserlassen » → Körpertemperatur + Wasserlassen), `case-akutes-nierenversagen` (« kommt nichts / kein Harndrang » → `fach-nephro` « Hat sich die Menge verändert » → `★ Wie viel Urin … an einem Tag` : **urine ×3**), `case-hepatitis-b`, `case-typhus`, `case-karzinoid`, `case-zoeliakie`, `case-allergische-rhinitis`, `case-pneumothorax`, `case-endometriose`, `case-otitis-media`…
  - Sonde scratchpad (même montage esbuild que la porte, texte ★ ∩ `TEXT_RE` puis générale *postérieure* portant le symptôme, faux positifs « schlaf » exclus) : **44 paires sur 32 cas**.
- **Correctif** : (1) dans `dedupeBySymptom`, une ★ marque `asked` avec ses symptômes **lus** (`symptomsInText`) ou déclarés — pas seulement `sucht` ; ou, plus fidèle à la doctrine « relu à la main », exiger `sucht` sur toute ★ qui cite un symptôme de la carte, quel que soit son rang ; (2) porte : la `review` compare chaque ★ aussi aux questions **suivantes** de la trame (symétrique) ; (3) relire les ~30 cas listés par la sonde et annoter (`sucht`) ou reformuler.

### [BLOQUANT] « Livré et vérifié en prod » écrit dans le backlog avant tout commit
- **Où** : `app/docs/BACKLOG-FEEDBACK.md` (diff : J10–J13 ✅, « puis la série 3 du 17 sept. (J10–J13 + porte `checkTrameSymptoms`) » dans « Livrés et vérifiés en prod »).
- **Constat** : `git log origin/main..HEAD` = 0, `git status --short` = 18 entrées. Ni commit, ni push, ni workflow, ni bundle live. C'est l'anti-pattern §5.1 (déclarer « fait » sur `tsc`+tests). Statut réel : **pas fait**.
- **Correctif** : ✅ et phrase « livrés » retirés jusqu'au run Qualité vert + bundle live contrôlé (`index-*.js` contenant `dim-tag` et le nouveau texte `fam-stand`).

## Améliorations (MAJEUR)

- **Deux têtes « Was genau — … » restent noyées dans le texte** alors que toutes leurs voisines deviennent des étiquettes : `phrases.ts:47` `NOT_DIM` exclut « Was », et les variantes `veraenderung` (« Was genau — Was ist Ihnen aufgefallen: ein Knoten… ») et `ausscheidung` (« Was genau — Was hat sich verändert: beim Wasserlassen… ») commencent par cette tête. Sonde sur `AKTUELL_VARIANTS` : 41 dimensions étiquetées, 2 non. Dans un cas de tuméfaction ou de trouble de l'élimination, la première question est la seule sans étiquette — faute d'application visible. Correctif : renommer la tête (« Befund », « Art ») ou l'admettre explicitement.
- **Gewicht ×2 en néphro** : `fach-nephro-oedeme` (« Sind Ihre Augenlider morgens geschwollen … Haben Sie rasch an Gewicht zugenommen? ») n'est mappé que sur `oedeme` ; `case-nephrotisches-syndrom` pose avant « Gewicht und Appetit — Hat sich Ihr Gewicht verändert » et `case-akutes-nierenversagen` la ★ « Wie viel Gewicht haben Sie verloren oder zugenommen? » (`sucht: ['gewicht']`). Ajouter `gewicht` à la sonde ou couper la phrase en `parts`.
- **Ordre inversé quand une ★ `sucht` remplace une générale** : la ★ est ajoutée **en fin** de chapitre, les restes de générales restent en tête. `case-polymyalgia` Vegetativ : « Waren Sie kürzlich im Ausland? » → « Hatten Sie Schüttelfrost? » → … → `★ Haben Sie ungewollt Gewicht verloren, Fieber gemessen oder nachts stark geschwitzt?` — on demande les frissons avant la fièvre. Même chose `case-leistenhernie` (« Erbrechen, Stuhlverhalt » en fin de Vegetativ). Correctif : insérer la ★ à la place de la première générale qu'elle remplace.
- **Répétition hors carte, déjà relevée au lot 4** : `case-leistenhernie` `[noxen] Rauchen Sie?` puis `★ Husten Sie chronisch? Seit wann, und wie viel rauchen Sie?` ; `case-gastroenteritis` `Aussehen — Wie sieht es aus: Farbe, Blut, Schleim…` puis `★ Wie sieht Ihr Stuhl aus — wässrig oder breiig, welche Farbe…` puis `★ Haben Sie Blut oder Schleim im Stuhl gesehen?` (Blut/Schleim ×3). La carte `PROBE_SUCHT` ne couvre ni le tabac ni l'aspect des selles : le « un symptôme, une question » s'arrête à 15 symptômes.
- **`vertieft` posé sur des questions qui ne sont pas des approfondissements** : `case-influenza` « Hatten Sie zuerst Schnupfen und Niesen, oder standen Fieber… » et `case-lungenembolie` « Waren Sie … operiert, bettlägerig, im Gips oder auf einer langen Reise » (vorerkrankungen) sont des questions propres, pas des relectures d'une générale ; l'annotation sert ici à faire taire la porte. À l'inverse `case-vorhofflimmern` `sucht: ['gewicht']` sur une ligne à quatre informations (« Gewicht verloren, schwitzen, zittern, Wärme ») remet une ligne multi-infos que la passe du lot 4 avait bannie.

## Mineur (polish)

- Cadre « Für diesen Fall » avec **une seule** question (pneumonie, Vorerkrankungen) : un cadre + un titre pour une ligne est plus lourd que le libellé d'avant ; garder le libellé en ligne quand `items.length === 1`.
- Dans le cadre, la puce pleine de chaque ★ répète la puce du titre (trois disques identiques dans `gruppe3.png`).
- `.dim-tag` : `backdrop-filter: blur(10px)` sur fond papier uni n'a rien à flouter ; trois ombres pour une pastille de 28 px. Visuellement acceptable (capture `aktuell.png`), mais la pastille sur sa propre ligne double la hauteur du chapitre (662 px pour 10 questions) — une pastille en ligne, avant le texte, garderait la compacité que Mehdi réclame (§2.4).
- Commentaires : `phrases.ts:44` et `index.css:170` citent **FB2-J11** pour l'étiquette de dimension (c'est **J12**) ; `types.ts:281` « peut cherche ».
- Reliquat « Waren Sie kürzlich im Ausland? Sind Sie regelmäßig geimpft? » comme ligne autonome de Vegetativ (pyelonephritis 76 ans, lymphom, polymyalgia) : correct, mais « geimpft » y est un passager clandestin de la partie voyage.

## Points validés

- J10, sens joué par Mehdi : CAP → fièvre ×1 (DOM), BPCO → Fach pneumo, appendicite → Vegetativ (`redundant` efface la Fach), pyélonéphrite → Urologie ; `FACH_COVERS` sans la fièvre est cohérent avec la variante infekt.
- `parts` rédigés à la main (veg-fieber, veg-schuettelfrost, veg-ausscheidung, akt-allgemein-gewicht, B-Symptomatik haem/onko) : phrases complètes, pas de recoupage automatique ; `alts` retirées sur une question réduite (pas d'alt qui redemande ce qui est parti).
- `playedTrame` mémoïsé, point d'entrée unique guide + focus ; `checkPlayedTrame`, `checkGuideCoverage`, `checkGuideDuplicates` toujours verts.
- J11 : DOM pneumonie → 2 cadres, 2 titres, **0** libellé par ligne ; `.label` Plex Sans, `text-transform: none`.
- J12 : 8 étiquettes dans `aktuell` (Beginn, Fieber, Verlauf, Herd, Auslöser, Einflussfaktoren, Frühere Episoden, Begleitbeschwerden), texte affiché = question seule ; focus : « Beginn » 14 px au-dessus de la question, sobre (`focus3.png`).
- J13 : « Wie ist Ihr Familienstand? Haben Sie Kinder? » + Ja/Nein → « Wie viele, und sind sie gesund? » (DOM).
- 3 questions du cas supprimées à raison (« Haben Sie Fieber gemessen, und wurde Ihnen jemals eine Spritze ins Kniegelenk gegeben? » → gardée sans la fièvre ; TB-Ausland de `perikarditis` déplacée en Vegetativ avec `sucht`).
- Porte CI branchée dans `quality.yml` après `checkPlayedTrame`.

**Mehdi dirait :** « tu m'as enlevé la fièvre en double sur la CAP mais sur la gastro-entérite et le diabète tu me la redemandes pareil, et la porte laisse passer — c'est le même défaut, tu l'as corrigé pour le cas que j'ai joué, pas pour l'app. »

## Non vérifié

- Aucun déploiement : pas de commit, pas de run CI, pas de bundle live — les points 6 et 7 de la check-list sont par construction « pas fait ».
- Les captures d'un autre agent dans le scratchpad (`gruppe.png`, `focus.png`, `familienstand.png`, `full.png`, `v.png`) n'ont pas été utilisées ; seules `aktuell.png`, `gruppe3.png`, `focus3.png` (prises ici) font foi.
- Mode sombre du `.dim-tag` (`.dark .dim-tag`) non mesuré ; seul le focus (fond sombre) l'a été.
- `PatientScreen` / `ExaminerSheetView` (côté simulant) : les ★ y sont listées depuis `caseSpecificQuestions` brut, sans la modulation — non joué.
- `app/public/` et `package-lock.json` racine non suivis par git : hors périmètre, non examinés.
- Le chevauchement chrono / raccourcis clavier en haut du focus (`focus3.png`) est antérieur à ce lot.
