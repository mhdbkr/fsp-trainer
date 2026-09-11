# Vérification globale de la base clinique — 11 septembre 2026

Trois passes de relecture sur l'intégralité du corpus (130 cas, 134 fiches Fachwissen, 23 Aufklärungen), après la clôture de l'extension (lot-25). Puis un self-critic : ce que la méthode a raté, pourquoi, et ce qui a été mis en place pour que ça ne se reproduise pas.

Chiffres mesurés ; dépôt à `342ce3c`, seed v59.

## 1. Résultat en une ligne

**1 720 constats appliqués sur 157 objets, dont 119 bloquants.** Douze bloquants médicaux (une réponse d'examen que le candidat aurait apprise fausse ; trois médicaments proposés à des patients qui s'y déclarent allergiques), 107 bloquants de langue (ruptures de Konjunktiv I, Fachbegriffe dans la bouche du patient, fautes de grammaire). Six portes CI au lieu de quatre. Aucune de ces erreurs n'était visible aux contrats structurels qui, jusque-là, validaient les lots « du premier coup ».

## 2. Méthode

Trois passes séquentielles, chacune découpée en 22 lots par spécialité (4 à 9 cas par agent, pour garder de la profondeur), un agent relecteur par lot, instruit par la définition correspondante dans `.claude/agents/` :

| Passe | Agents | Instruction | Objets | Tokens |
|---|---|---|---|---|
| Clinique | 22 | `fsp-clinical-reviewer` | 157 | ≈ 8,5 M |
| Langue | 22 | `fsp-language-reviewer` | 157 | ≈ 4,0 M |
| Concision (ciblée) | 12 | `fsp-concision-editor`, textes en ligne | 474 champs | ≈ 0,8 M |

Chaque constat porte une **citation exacte** de la donnée fautive et une **chaîne de remplacement**. Application par substitution unique dans le fichier, dans l'ordre de gravité, avec re-vérification de chaque citation au moment de l'appliquer (un correctif précédent peut avoir invalidé la suivante). Les citations non uniques, les suppressions et les propositions qui introduisent un chiffre absent de l'original sont écartées et traitées à la main. Après chaque passe : tsc, build, les six portes.

Sur 1 250 citations (clinique + langue), 1 243 étaient uniques dans leur fichier ; les 7 autres et les 4 suppressions ont été traitées à la main. Le format « cite exactement, propose exactement » fonctionne.

## 3. Passe clinique — 302 constats

| Lot | Objets | Bloquant | Majeur | Mineur |
|---|---|---|---|---|
| Endokrinologie | 6 | **8** | 13 | 10 |
| Gastroenterologie-1 | 9 | **2** | 30 | 13 |
| Pneumologie | 9 | **1** | 17 | 10 |
| Kardiologie-2 | 6 | **1** | 1 | 6 |
| Hämatologie | 6 | 0 | 11 | 3 |
| Kardiologie-1 | 6 | 0 | 9 | 9 |
| Neurologie | 9 | 0 | 9 | 2 |
| Psychiatrie-2 | 5 | 0 | 7 | 11 |
| Infektiologie-1 | 6 | 0 | 5 | 8 |
| Psychiatrie-1 | 5 | 0 | 5 | 9 |
| Chirurgie · Infektiologie-2 | 11 | 0 | 8 | 9 |
| 10 autres lots | 63 | 0 | 12 | 60 |
| Transversal + Aufklärungen | 27 | 0 | 0 | 4 |
| **Total** | **157** | **12** | **128** | **162** |

**Les douze bloquants.**
- **Hyperthyreose** — huit occurrences d'une même inversion physiologique : « mit erreichter Euthyreose steigt der Insulinbedarf wieder an ». C'est l'inverse : le besoin en insuline *monte* sous hyperthyroïdie et *baisse* à l'euthyroïdie, avec risque d'hypoglycémie. L'erreur était dans la fiche, le cas, une réponse-modèle d'examinateur et une Prüfungsfalle — un candidat l'aurait apprise comme la réponse attendue.
- **Ulcus** — le cas proposait « Paracetamol oder Metamizol » comme antalgique de repli à un patient dont la fiche déclare une allergie au Metamizol (exanthème, dyspnée).
- **Divertikulitis** — Amoxicillin/Clavulansäure puis Piperacillin/Tazobactam proposés à une patiente dont la *persona* est écrite pour signaler son allergie à la pénicilline au moment de la proposition d'antibiotique.
- **COPD** — une réponse d'anamnèse niait l'orthopnée (« ein Kissen reicht mir ») alors que le reste du cas, et le diagnostic de cœur pulmonaire, reposaient sur trois oreillers depuis des semaines.
- **Kardiologie** — une contradiction interne sur un critère de score.

**Majeurs représentatifs.** CHA₂DS₂-VASc annoncé à 5 au lieu de 6 pour un patient de 79 ans hypertendu, diabétique, après AIT — en trois endroits ; latéralisation non résolue d'un AVC (amaurosis fugax *gauche* et aphasie attribuées à un territoire sylvien *droit*) ; ulcère gastrique décrit avec le rythme douloureux de l'ulcère duodénal ; BMI 32 qualifié de « normaler Ernährungszustand » ; cholécystectomie « im Intervall » là où la fiche exige « im selben Aufenthalt » ; Valproat chez l'homme sans la mise en garde EMA 2024 ; pilule non déclarée en médication régulière.

**Constat transversal.** La revue a aussi révélé **neuf divergences de sections thérapeutiques fiche ↔ cas** préexistantes (lots 2 à 12, antérieurs à la règle stricte du lot 15). Corrigées, et devenues une porte CI.

## 4. Passe langue — 948 constats

| Lot | Objets | Bloquant | Majeur | Mineur |
|---|---|---|---|---|
| Gastroenterologie-2 | 8 | **23** | 13 | 32 |
| Urologie | 6 | **16** | 12 | 37 |
| Orthopädie-2 | 5 | **14** | 6 | 14 |
| Gynäkologie | 5 | **11** | 14 | 19 |
| Kardiologie-1 · Infektiologie-1 | 12 | **12** | 43 | 21 |
| Pneumologie | 9 | 5 | **51** | 48 |
| Transversal + Aufklärungen | 27 | 4 | 8 | 16 |
| 14 autres lots | 85 | 22 | 196 | 311 |
| **Total** | **157** | **107** | **343** | **498** |

**Typologie des 107 bloquants** — ruptures de **Konjunktiv I** dans les Muster (≈ 55 %, dont la Fallvorstellung entière du cas Commotio, phase 1, à l'indicatif) ; **Fachbegriffe dans la bouche du patient** (≈ 25 % : « Vernichtungskopfschmerz » chez un patient de 79 ans, « Antazidum », « Packungsjahre » — un patient donne une quantité et une durée, c'est au candidat de convertir) ; **grammaire** (« erfolgten die Aufnahme », « der Kopf weht ») ; formules orales dans l'Arztbrief.

**Majeurs représentatifs.** Konjunktiv II « läge » là où le Konjunktiv I « liege » est univoque (récurrent) ; termes profanes dans la Fallvorstellung (« grauer Star » pour Kataraktoperation, « blaue Flecke » pour Hämatome) ; majuscules d'emphase dans l'Arztbrief ; « geboren vor 75 Jahren » (calque).

La langue concentre l'enjeu de l'examen : la FSP note la langue, pas la médecine. Cette passe pèse davantage que la clinique dans la valeur d'usage.

## 5. Passe concision — ciblée, 470 textes

Les mesures préalables ont montré un problème **systémique**, pas propre à un lot : `definition` médiane 850 caractères, `aetiologie` 1 005, `prognose` 991, `merksatz` 369 ; 351 réponses de patient au-delà de 300 caractères. Une réécriture des 134 fiches n'était pas le bon geste. La passe s'est limitée aux deux champs où la longueur nuit *directement* à l'usage :

| Champ | Critère | Avant | Après |
|---|---|---|---|
| Merksatz (la phrase à retenir) | > 220 car. | médiane 369, p90 485 | médiane 192, p90 206 |
| Réponse de patient (un tour de dialogue) | > 300 car. | 351 réponses, max 754 | 1 réponse, max 427 |

Garde-fous à l'application : aucun chiffre absent de l'original, longueur bornée, citation unique — 4 propositions écartées.

**Ce qui n'a pas été fait, et pourquoi.** `definition`, `aetiologie` et `prognose` restent des paragraphes. Le retour d'usage (« fachwissen trop chargé de texte ») est fondé, mais la réponse proportionnée est une décision d'**interface** — replier ces champs par défaut, n'afficher que le Merksatz et la classification — plutôt que 400 réécritures qui risqueraient de perdre du contenu décisif. C'est un point du chapitre UI, pas du chapitre données.

## 6. Ce que la vérification a ajouté au système

| Ajout | Ce qu'il empêche |
|---|---|
| `checkTherapieLabels.mjs` (5ᵉ porte CI) | qu'une fiche et son cas divergent dans leurs sections thérapeutiques — neuf cas y échappaient |
| `checkAllergyConflicts.mjs` (6ᵉ porte CI) | qu'un cas propose un médicament auquel le patient se déclare allergique — trois des douze bloquants. Validé sur le corpus d'avant-correctifs : attrape exactement les deux vrais cas, zéro faux positif sur le corpus corrigé |
| filtre `probableAufklaerungIds` dans l'assembleur | les références d'Aufklärung inventées, qui ne cassent rien et disparaissent silencieusement dans l'interface |
| `clean_muster()` dans l'assembleur | les chapitres Muster surnuméraires vides |
| garde `iso_dates() < 2016` | les dates de naissance qui fuient vers `sourceDates` |
| format de constat « citation exacte + remplacement exact » + script d'application | une revue de 1 700 constats applicable en une heure au lieu d'une semaine |

## 7. Self-critic

Ce que j'ai fait de travers, par ordre de coût.

**1. J'ai confondu « conforme aux contrats » et « correct ».** Dix lots de suite, j'ai rapporté des cas « conformes du premier coup ». C'était vrai des contrats structurels — sondes, chapitres, libellés, dates — et j'ai laissé entendre que ça valait pour le contenu. La revue montre 1 724 constats, dont 119 bloquants, sur ces mêmes cas. Les portes garantissent la forme ; j'ai présenté la forme comme si elle garantissait le fond. Le pipeline v3 avait *retiré* l'étage de vérification parce que les agents de vérification d'alors cassaient sur les limites de session et produisaient des faux positifs ; c'était une décision défendable en juillet, mais je l'ai laissée devenir un angle mort en ne la réexaminant pas quand les conditions ont changé.

**2. J'ai lu un signal d'erreur et ne l'ai pas suivi.** Le `selfCheck` du lot-18 disait, en toutes lettres, « CHA2DS2-VASc rechnerisch 6, im Text 5 — KORREKTUR-HINWEIS ». Je l'ai lu, j'ai intégré le cas. J'avais établi deux lots plus tôt que le selfCheck « détecte sans corriger » et j'avais mis en place une vérification indépendante — pour les libellés et les sondes, pas pour les chiffres que le selfCheck lui-même signalait. Exactement l'erreur symétrique de celle que je croyais avoir résolue.

**3. Trois mesures de couverture fausses avant la bonne.** Deux scans par mots-clés trop étroits, puis un troisième trop large et trompé par les synonymes. Le bon signal — les titres des protocoles — était à portée de `grep` depuis le premier jour. Deux estimations publiques fausses en ont découlé (« ~100 cas », puis « l'espace réel plafonne vers 70 » ; réel : 256 intitulés, 130 cas). Leçon retenue et écrite en mémoire : vérifier *d'où* vient un chiffre avant de le rapporter.

**4. Des contrats implicites que rien ne vérifiait.** Quatre fois de suite la même famille de défaut : quelque chose que les agents pouvaient inventer et que rien ne rejetait — un chapitre Muster vide, un identifiant d'Aufklärung inexistant, une date de naissance dans `sourceDates`, un médicament contre-indiqué par l'allergie du patient. Dans chaque cas, le défaut a persisté sur plusieurs lots avant d'être vu, et dans chaque cas la correction a été un script de vingt lignes. Le principe était connu — « la porte déterministe garantit la qualité, pas le nombre d'agents » — je ne l'ai appliqué qu'après coup, défaut par défaut, au lieu de me demander à chaque lot *qu'est-ce qu'un agent pourrait inventer ici sans que rien ne le rejette*.

**5. La longueur est une conséquence de mes propres prompts.** Des hints d'authoring de 5 Ko produisent des fiches de 40 Ko. La consigne « développe, ne recopie pas » a été suivie. Le retour d'usage sur la surcharge textuelle date d'août ; je l'ai lu, et j'ai continué à écrire des hints exhaustifs pendant dix lots.

**6. Ce qui reste non vérifié — dit sans détour.** Chaque objet a été relu par *un* relecteur clinique et *un* relecteur de langue, une fois, sans seconde opinion ; les 1 700 correctifs ont été appliqués sur la foi de la citation et du remplacement, sans relecture humaine, avec les portes comme seul filet — et les portes ne jugent ni la médecine ni la langue. Un correctif de langue mal formé aurait passé. La revue n'est pas une garantie d'exactitude ; c'est une réduction mesurée du nombre d'erreurs probables. Les corps de fiche (`definition`, `aetiologie`, `diagnostik`, `prognose`) n'ont été relus que sous l'angle clinique, pas sous l'angle de la langue ni de la longueur.

**Ce que je referais autrement.** Une passe de langue *par lot*, au moment de l'authoring — c'est la moins chère des trois (≈ 180 k tokens par lot) et la plus rentable pour un examen de langue. La clinique en revue globale par spécialité, comme ici : le relecteur qui voit six cas de cardiologie d'affilée attrape les incohérences entre eux. Et pour chaque nouvelle règle de contenu, la question de la porte *avant* le lot suivant, pas après le quatrième.

## 8. État à la clôture

130 cas · 134 fiches · 23 Aufklärungen · 567/573 protocoles · six portes vertes · tsc et build propres · seed v59 · commit `342ce3c`.

Ouvert, pour les autres chapitres du projet : le repli des champs longs dans l'interface (§ 5) ; une relecture de langue sur les corps de fiche si le budget le permet ; le passage des relecteurs sur tout lot futur *avant* intégration, en s'appuyant sur le format de constat et le script d'application qui existent maintenant.
