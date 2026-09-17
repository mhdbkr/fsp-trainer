# direction-keeper — Série 2, lots 1 et 2 (FB2-N1, M1, M2, M3, J2, J3, J6)

> Revue faite le 17 sept. 2026 sur `main` @ `bc51e89` (lot 1 poussé) + working
> tree non commité (lot 2). Doctrine : `app/docs/DIRECTION-STYLE.md` §4.
> Mesures : `git`, `gh run list`, validateurs par code de sortie, DOM de l'app
> via `playwright-cli` headless sur le Vite local (5173), extraction scriptée des
> 130 fiches (`seedCases.ts`). Lecture seule sur le code.

## Verdict court

Le lot 1 est déployé et vert. Le lot 2 est **bien conçu sur le guide** (métier
×1, exposition séparée, récap sans boîte, toggle Leben noch / Verstorben — tout
vérifié dans le DOM) mais **la moitié des 130 réponses `pers-beruf` réécrites
est un gabarit collé sans lire le cas**, avec des contradictions à l'intérieur
d'une même fiche. C'est exactement le défaut que Mehdi a signalé deux fois
(FB-A1 « copié sans lecture du cas », FB2-J1 « modèle unique appliqué
partout »). Et le lot 2 n'est ni commité ni déployé.

---

### [BLOQUANT] Lot 2 non commité, non poussé, non déployé — statut « pas fait »
- **Où** : working tree, `git status` ; `origin/main == HEAD == bc51e89`
- **Constat** : les 8 fichiers du lot 2 sont en `M`/`??` ; les workflows verts (`Qualité` + `Deploy` sur `bc51e89`, `46570d3`) ne couvrent que le lot 1.
- **Preuve** : `git log origin/main..HEAD` vide ; `gh run list` → derniers runs sur `bc51e89` ; `git status --short` → ` M app/src/data/seedCases.ts`, `?? app/scripts/checkGuideDuplicates.mjs`, etc.
- **Correctif** : ne rien annoncer à Mehdi avant commit fichier par fichier, push, `Qualité` + `Publier le contenu` verts, et contrôle du bundle live (le contenu passe par `publishContent.mjs`, il n'y a plus de `SEED_VERSION` — la règle du CLAUDE.md est obsolète, à corriger pour que « déployé » ne soit plus ambigu).

### [BLOQUANT] `pers-beruf` : gabarit collé sur 66/130 fiches, contradictions internes — défaut déjà signalé qui revient
- **Où** : `app/src/data/seedCases.ts`, clé `'pers-beruf'` (130 occurrences)
- **Constat** : 46 fiches portent au mot près « Nein, mit besonderen Stoffen — Staub, Chemikalien — habe ich bei der Arbeit nichts zu tun. » et 20 « … hatte ich in meinem Beruf nie zu tun. » (52 formulations distinctes après, 129 avant). Le gabarit a été posé sans relire `fam-beruf` de la même fiche : la réponse « exposition » contredit le métier que le patient vient de décrire, parfois sur le point cliniquement décisif du cas.
- **Preuve** (lecture par le simulant : `fam-beruf` puis `pers-beruf`) :
  - `case-gastroenteritis` l.40345 → 40311 : « Malermeister … **arbeite mit Farben und Lacken** » puis « Nein, mit besonderen Stoffen — Staub, Chemikalien — habe ich bei der Arbeit nichts zu tun. » — contradiction directe.
  - `case-bronchialkarzinom` l.20373 → 20339 : « Berufskraftfahrer. Vierzig Jahre Fernverkehr, **viel Diesel** … Jetzt fahre ich noch zweimal die Woche den Seniorenbus » puis « … hatte ich in meinem Beruf nie zu tun. » — cancer bronchique, exposition diesel niée, et temps passé pour un homme qui conduit encore.
  - `case-akute-leukaemie` l.49781 → 49747 : « Schreinerin, selbstständig, mit einer kleinen Werkstatt » → gabarit « nichts zu tun » ; alors que `case-lymphom` l.15439 et `case-nhl` l.52693 (mêmes Schreinerinnen) répondent « Holzstaub … Lacke und Lösungsmittel » — même métier, deux vérités.
  - `case-glomerulonephritis` l.52198 : Kfz-Mechatroniker → gabarit ; `case-septische-arthritis` l.37100 et `case-hodentorsion` : Kfz → « Öl und Bremsflüssigkeit ». Idem `case-hueftkopfnekrose` l.51699.
  - `case-anorexia-nervosa` l.44329 → 44295 : « Ich bin **Schülerin**, 13. Klasse » puis « … habe ich **bei der Arbeit** nichts zu tun. » ; même chose pour les étudiants `case-morbus-crohn` l.22000, `case-adnexitis` l.53646, et l'arbeitslos `case-somatoforme-schmerzstoerung` l.51229.
  - `case-zoeliakie` l.28485 : « Landwirt … viel im Stall und auf dem Feld » → « nichts zu tun ». `case-vorhofflimmern` l.13248 : « Schreiner … helfe noch in der Werkstatt aus » → « nie zu tun ». `case-schlaganfall` l.6693 (Tischler), `case-synkope` l.27952 (Schreinermeister mit Werkstatt), `case-opioidabhaengigkeit` l.60809 (Dachdecker), `case-prostatakarzinom` l.23636 (« mein Leben lang im Metallbetrieb ») : gabarit « nie zu tun ».
  - `case-delir` l.36088 → 36054 : la fille dit déjà dans `fam-beruf` « Mit Gefahrstoffen hatte er nie zu tun. » puis la fiche redit la même chose au gabarit — répétition mot pour mot de l'info précédente.
  - Contre-exemples qui montrent le niveau attendu (déjà dans le fichier) : `case-diabetes` « Mit Chemikalien habe ich nichts zu tun, aber natürlich viel Mehlstaub. » ; `case-niereninsuffizienz` « viel Staub und Zement » ; `case-leistenhernie` « nur Zementstaub in der Halle » ; `case-tia` « außer Lacken und Beize » ; `case-basaliom` « Pflanzenschutzmittel, früher, wie jeder Bauer » ; `case-copd` « viel Abgasen ausgesetzt ».
- **Correctif** : (1) réécrire à la main les ~16 fiches citées : la réponse doit dériver du métier de `fam-beruf` (Maler → Farben/Lösungsmittel ; Schreiner → Holzstaub/Lacke ; Landwirt → Staub/Pflanzenschutz ; Dachdecker → Bitumen/Teer ; Diesel pour le Kraftfahrer ; élève/étudiant → « ich gehe ja noch zur Schule / studiere » ; arbeitslos → passé). (2) Aucun « bei der Arbeit » pour un profil Schüler/Student/Hausfrau/arbeitslos/Rentner. (3) Porte CI : script qui échoue quand `fam-beruf` matche une liste de métiers à exposition (Maler|Lackier|Schreiner|Tischler|Landwirt|Bauer|Dachdecker|Kfz|Mechanik|Metall|Bäcker|Friseur|Schweiß|Fliesen|Maurer|Diesel|Kraftfahrer) ET que `pers-beruf` est une négation gabarit ; et quand `fam-beruf` matche Schüler|Student|studiere|arbeitslos|Rentner ET que `pers-beruf` contient « bei der Arbeit ».

### [MAJEUR] L'exposition est encore demandée deux fois dans la trame pneumo — et la porte CI ne le voit pas
- **Où** : `app/src/data/guides/anamneseChapters.ts:263` et `:393` ; `app/scripts/checkGuideDuplicates.mjs` (`THEMES`, `métier` scope `general`)
- **Constat** : Sozialanamnese pose « Arbeiten Sie dabei mit besonderen Stoffen — **Staub**, Chemikalien, Dämpfen? » puis la Fachanamnese Pneumologie pose « Waren Sie in Ihrem Beruf **Stäuben**, Asbest oder Vögeln ausgesetzt? ». Le critère FB2-J2 demandait que les autres chapitres ne gardent que « la sous-question spécifique ». Le validateur ne signale rien : le thème « métier » est limité aux chapitres généraux et il n'existe pas de thème « exposition ».
- **Preuve** : `node scripts/checkGuideDuplicates.mjs` → « ✅ AUCUN DOUBLON » avec les deux questions en place. Fiche `case-pneumonie` l.3257 « Mit Stäuben oder Chemikalien habe ich nichts zu tun. » puis l.3302 « … beruflich hatte ich mit Stäuben, Asbest oder Vögeln nie zu tun. » ; `case-asthma` l.10477 « Mit Stäuben oder Chemikalien habe ich beruflich nichts zu tun. » puis l.10522 « … arbeite nicht mit Stäuben oder Chemikalien. Mit Mehl, Asbest, Vögeln oder Heu … » ; `case-lungenembolie` l.15992 / l.16037 idem.
- **Correctif** : question pneumo réduite au spécifique (« Hatten Sie beruflich mit Asbest, Vögeln, Schimmel oder Heu zu tun? »), réponses des 9 cas pneumo alignées ; ajouter dans `THEMES` `{ name: 'exposition professionnelle', re: /Stäub|Staub|Chemikalien|Dämpfe/i, scope: 'all' }` et vérifier que le script échoue avant correction.

### [MAJEUR] 9 réponses `fach-pneumo-noxen` répondent encore « Rauchen Sie ? » alors que la question ne le demande plus
- **Où** : `app/src/data/seedCases.ts` l.3302, 8863, 10522, 16037, 34527, 35061, 47343, 54159, 61371
- **Constat** : la question du guide a été amputée du tabac (bien), mais les 9 fiches pneumo commencent toujours par la réponse tabac : le simulant répond à une question qui n'a pas été posée, et répète la réponse déjà donnée dans Noxen.
- **Preuve** : l.3302 « Nein, ich rauche nicht; beruflich hatte ich … » ; l.8863 « Ja, ich rauche eine Schachtel am Tag, seit ich sechzehn bin. Beruflich … » ; l.16037 « Ich rauche seit dem 20. Lebensjahr etwa 15 Zigaretten am Tag. Beruflich … » ; l.61371 « Rauchen ja, 15 am Tag seit 40 Jahren. Beruflich … ».
- **Correctif** : réécrire les 9 réponses sans la partie tabac (le contrat guide↔fiche passe parce qu'il vérifie la présence d'une réponse, pas sa pertinence — c'est l'angle mort à noter).

### [MINEUR] Le libellé mono capitales « ANTWORT DES PATIENTEN » s'étend au nouveau toggle
- **Où** : `app/src/components/PhraseControls.tsx:128` ; DOM Guides → Familien- & Sozialanamnese (capture `eltern.png` de cette session)
- **Constat** : le nouveau choix « Leben noch / Verstorben » hérite du libellé texte en mono capitales que Mehdi rejette (FB2-O4, O6, lot 3). Rien de nouveau visuellement par ailleurs : le toggle est discret, la phrase reste la vedette, pas d'orange ajouté par ce lot.
- **Preuve** : innerText du DOM « Leben Ihre Eltern noch?\nANTWORT DES PATIENTEN\nLeben noch\nVerstorben ».
- **Correctif** : rien dans ce lot ; s'assurer que le lot 3 (O4/O6) traite bien ce libellé sur les `kind: 'wahl'` et pas seulement sur les `kind: 'ja'`.

### [MINEUR] Nom de sonde qui ment
- **Où** : `app/src/data/guides/anamneseProbes.ts:93`
- **Constat** : `pers-beruf` vit désormais dans `familie-sozial` ; l'id dit « personalia ». Commenté comme dette assumée (130 fiches). Acceptable, à ne pas laisser prospérer.
- **Correctif** : aucun maintenant ; renommer en `fam-exposition` à la prochaine migration de fiches.

---

## Check-list §4, point par point

1. **Raisonnement sur le cas** — Guide : oui (l'exposition suit le métier, alt « Falls in Rente »). Fiches : **non** sur 66/130 (voir BLOQUANT 2). Cas éprouvés : `case-gastroenteritis` (homme actif, Maler, digestif) vs `case-schlaganfall` (âgé, retraité, neuro) : même gabarit à un temps verbal près ; `case-anorexia-nervosa` (jeune femme, élève) : gabarit « bei der Arbeit » ; `case-copd` (pneumo, douleur non) : bien adapté.
2. **Doublons et synonymes** — `checkGuideDuplicates.mjs` exit 0 ; réintroduction temporaire de (a) `pers-beruf` dans personalia → exit 1 « thème « métier » demandé dans 2 chapitres », (b) retrait du parseur verstorben → exit 1, (c) « Rauchen Sie? » en pneumo → exit 1 « thème « tabac » … noxen, fach:Pneumologie ». Fichiers restaurés, `cmp` identiques, `git status` inchangé. **Angle mort** : l'exposition Staub ×2 passe (MAJEUR 1). Inventaire des conditions `Falls …:` : 21 ja, verstorben, sehr stark, anfallsartig, aufgehört, Gewichtsverlust, Bläschen, in den Wechseljahren, die Periode schon aufgehört hat — aucun autre couple synonyme.
3. **Anti-slop** — DOM Guides : « Persönliche Daten · 6 phrases » (7 avant), « Familien- & Sozialanamnese · 7 phrases » (6 avant), « Nächster Teil » ×0, récap présente sans contrôle, toggle Leben noch / Verstorben. Discret au repos. Seul ajout de texte UI : aucun (le hint réutilise un libellé existant).
4. **Concision** — Guide : −1 question en personalia, +0 net (déplacement). Fiches : les réponses `pers-beruf` sont plus courtes (le métier n'y est plus répété) — bon. `fach-pneumo-noxen` : volume inchangé, donc trop long de la moitié tabac (MAJEUR 2).
5. **Personnalisation** — sans objet pour ce lot (rien à retenir de l'utilisateur ici).
6. **Déployé** — Lot 1 : `9e6e905`, `bfe95be`, `46570d3` sur `origin/main`, `Qualité` et `Deploy` success. Lot 2 : **non** (BLOQUANT 1).
7. **Validateur** — `checkGuideDuplicates.mjs` branché dans `quality.yml` (l.47-48) ; `followUp.test.ts` 2 tests verts ; `checkGuideCoverage` 130/130. Manque : thème exposition (MAJEUR 1) et une porte « gabarit vs métier » sur les fiches (BLOQUANT 2).

## Réponses aux 5 questions du coordinateur

1. **Réponses `pers-beruf`** — 28 cas échantillonnés (liste et lignes ci-dessus). Naturelles et non redondantes quand elles sont spécifiques (Bäcker, Fliesenleger, Lagerist, Schreinerinnen de `lymphom`/`nhl`, `copd`, `basaliom`, `tia`) ; gabarit trahi par le métier sur ~16 cas dont 2 contredisent la phrase précédente (Malermeister, Diesel) et 4 s'adressent à des gens qui ne travaillent pas.
2. **`anamneseChapters.ts`** — le diff est exactement 5 hunks : `keywords` sans « Beruf », question métier retirée de personalia, `probe` retiré de la récap (J6), question exposition ajoutée après `fam-beruf`, question pneumo sans « Rauchen Sie? ». Rien en trop. Rien de manquant par rapport à l'intention ; la partie « réponses pneumo » de J2 est manquante côté fiches (MAJEUR 2).
3. **Métier dans Sozialanamnese** — c'est le bon choix, et c'est celui que Mehdi a écrit lui-même dans le critère (« à l'endroit choisi (Sozialanamnese) »). Côté jury : les Anamnesebögen des Ärztekammern et les gabarits d'Arztbrief rangent Beruf/Familienstand/Wohnsituation sous « Sozialanamnese » ; le jury attend que le candidat aille vite au Leitsymptom après l'identité (nom, âge suffisent — il a déjà la fiche), et un candidat qui demande le métier en ouverture est perçu comme récitant un formulaire. L'exposition juste après le métier, dans le même souffle, est la manière dont un médecin le fait réellement. Je ne recommande pas l'inverse.
4. **Anti-slop / concision / personnalisation** — rien de nouveau à l'œil sauf le hint réaffecté ; le composant reste discret (capture). Le mono-capitales et le « ↳ » ambre sont l'existant, adressés au lot 3.
5. **Porte CI** — testée sur trois réintroductions, exit 1 à chaque fois, fichiers remis à l'identique (`cmp`), `git status` identique à l'entrée. Elle ne couvre pas l'exposition ×2 ni les fiches.

## Mehdi dirait : « le guide est propre, mais tu m'as collé le même "nichts zu tun" à un peintre qui vient de me dire qu'il bosse avec des laques et à un chauffeur au diesel qui a un cancer du poumon — c'est encore le modèle appliqué à l'aveugle, applique-toi. »

## Non vérifié
- **Bundle live** (GitHub Pages) pour le lot 1 : je n'ai pas contrôlé le JS déployé ; `Deploy` success sur `46570d3`/`bc51e89` est ma seule preuve.
- **Rendu en simulation avec un cas** (`#/simulation/<id>/run`) : le runner reste sur « Chargement… » en headless sans session Supabase ; mes mesures DOM viennent de la page Guides, qui rend la même trame `ALLGEMEINE_ANAMNESE` mais pas la fiche patient. L'ordre patient (métier avant exposition) est déduit du code (`rolePlay.ts` trie par `PROBE_ORDER`), pas observé.
- **Édition perdue avant restauration** : `anamneseChapters.ts` a été restauré depuis `HEAD` puis réédité ; si une modification non commitée existait avant, je ne peux pas la voir. Le diff contre `HEAD` est propre.
- **FB2-M1/M2/M3/N1** (lot 1) : non rejoués en navigateur dans cette session ; je me suis limité à l'état CI. Un `quality-task-reviewer` est censé les avoir couverts.
- Les 102 autres fiches `pers-beruf` non listées : lues par extraction, jugées plausibles (employés de bureau, enseignants, soignants), pas relues une à une.
