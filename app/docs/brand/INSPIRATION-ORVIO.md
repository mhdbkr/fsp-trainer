# Inspiration ORVIO — analyse profonde et transposition Doctopus

Date : 2026-09-17 (mis à jour 25/09) · Demandé par la direction · Sert de brief à `brand-strategist`, `brand-creative-director`, `front-design-keeper`, `site-implementer`.
Source : 16 planches d'une identité fictive « ORVIO — biotech » (logo, palette, typographie, papeterie, pitch deck, social, packaging).

**Seconde référence** : « Auros » (`auros.global`) — fiche de style, jetons W3C, CSS et Tailwind archivés dans **`references/auros/`**, analysés en §6 ci-dessous et dans `references/README.md` (ce que les jetons machine apprennent en plus de la fiche).

## 1. Ce qui fait tenir cette identité (les six décisions)

### 1.1 Un symbole construit, pas dessiné
Six cercles de trois tailles, tangents, disposés en anneau irrégulier ; chacun percé d'un cercle intérieur. Le logo est **un système géométrique** : grille de construction visible (planche « OR »), rapports de taille fixes, tangence exacte. Il se décline sans redessin — plein, contour, verre 3D, motif rogné, favicon — parce qu'il n'a **aucun détail** qui ne survivrait pas à 16 px.

Ce que la planche « Connection / Human focus / Continuity / Diversity » apprend : le symbole porte **quatre significations nommées**, chacune attachée à une propriété formelle (liaison = tangence ; diversité = trois tailles ; continuité = anneau ; humain = le vide central). C'est le récit qui rend la forme mémorisable — pas l'inverse.

### 1.2 Trois couleurs, deux registres
| Rôle | Valeur | Emploi |
|---|---|---|
| Dark Green `#002D2B` | fond profond, texte sur clair | l'autorité, la nuit du laboratoire |
| Ash Grey `#AED0C9` | fond intermédiaire, verre teinté | la matière |
| Anti-flash White `#E5EBEA` | fond clair, texte sur sombre | le papier |

**Aucune couleur d'accent.** Toute l'énergie vient du **contraste de valeur** (sombre ↔ clair) et de la **matière** (verre, bulles). Deux registres alternent strictement : **planche sombre** (vision, manifeste) / **planche claire** (données, produit). Jamais de dégradé de teinte, seulement des dégradés de **luminosité** dans la même famille.

### 1.3 Une typographie unique, tenue par la casse et le décalage
Geist Sans, seule. La hiérarchie ne vient pas des graisses mais de deux gestes :
- **Capitales** pour les titres-slogans (« FROM MOLECULES TO MIRACLES », « SHAPING A SMARTER SUSTAINABLE TOMORROW ») ; **bas-de-casse** pour les titres éditoriaux (« Targeted Molecular Innovation », « Effectiveness of Therapy… »).
- **Décalage en escalier** : chaque ligne d'un titre est indentée davantage que la précédente. C'est LA signature typographique — reconnaissable sans logo.
Le corps de texte est petit, gris-vert, en colonnes étroites, très aéré. Les micro-étiquettes (« VISION », « THE SCIENCE BEHIND », « Pitch Deck · Bio Tech ») sont en capitales, petites, en coin.

### 1.4 La grille montrée
Les lignes de construction (hairlines) restent **visibles** sur les planches de marque, le badge, les posts. Elles disent « précision » sans le prononcer. Dans les slides, elles deviennent la grille du graphique. Marges larges et constantes, un seul système de colonnes.

### 1.5 La matière : verre, sphères, bulles
Trois textures récurrentes, toujours en **fond** ou en **objet héros**, jamais en décoration parasite :
- **sphères translucides** superposées (verre dépoli) — vision, badge, deck ;
- **macro de bulles / huile dans l'eau** — photo, vert-teal, utilisée en fond de site et de couverture ;
- **le logo en verre 3D**, réfractant — l'unique moment « wow », réservé à la couverture et au hero.
La 3D est **localisée** (un objet), pas globale. Le reste est plat.

### 1.6 Les applications disent la crédibilité
Ampoule, portoir de tubes, badges de scientifiques, écran de conférence, cartes de visite : la marque se prouve en **objets du métier**. Le pitch deck alterne slogan sombre / problème en cercles / science en quadrants / courbe de données / vision. Le graphique lui-même est dans la charte (courbes lisses, deux tons, annotation en encart sombre).

## 2. Ce qu'il ne faut PAS copier
- Le vert biotech : c'est **leur** territoire (cellule, molécule). Doctopus est un **instrument d'examen**, pas un laboratoire.
- La 3D en verre partout : coûteuse, lente, et elle contredit « rapide et net » ; ORVIO l'utilise avec parcimonie — nous encore plus.
- L'absence d'accent : ORVIO n'a pas d'alerte, de « dû », de score, d'erreur à signaler. Une app d'entraînement **doit** avoir une couleur de signal.
- Les slogans en capitales partout : dans une app dense, les capitales fatiguent ; à réserver au site et aux moments de marque.

## 3. Transposition Doctopus — ce qu'on prend, ce qu'on adapte

La charte actuelle (« instrument clinique » : Bricolage Grotesque / IBM Plex / Plex Mono, pétrole + corail + papier/encre, readouts mono) est **compatible** avec ORVIO sur l'essentiel — même famille d'esprit (précision, calme, sérieux). Ce qu'ORVIO apporte en plus :

| Principe ORVIO | Décision Doctopus |
|---|---|
| Symbole **construit** sur grille, quatre sens nommés | Construire le symbole Doctopus (pieuvre) de la même manière : cercles/tentacules tangents sur grille, **trois tailles**, un vide central ; nommer quatre sens (**écoute** — anamnèse ; **structure** — Vorstellung ; **mémoire** — SRS ; **calme** — le jour J). Il doit tenir à 16 px et en contour. |
| Deux registres sombre/clair, **valeur** plutôt que teinte | Adopter la règle : **fond pétrole profond** pour les moments de marque (accueil du site, écran de résultat, Akademie), **papier** pour le travail (cas, drill, programme). Dégradés de luminosité seulement, dans la famille pétrole. |
| Une couleur de matière (Ash Grey) | Ajouter un **ton intermédiaire** pétrole clair (verre teinté) entre pétrole et papier — il manque aujourd'hui ; il servira aux panneaux, aux cartes flottantes, aux sphères de fond. |
| Pas d'accent | **Garder le corail** comme unique signal (dû, erreur, ★ favori — déjà `signal`), jamais en décoration. C'est notre différence assumée. |
| Une seule fonte, hiérarchie par casse + escalier | Garder Bricolage (titres) + Plex (texte) + Plex Mono (readouts) ; **adopter l'escalier** pour les titres de marque (site, résultats, Akademie), en bas-de-casse dans l'app, en capitales sur le site. |
| Grille visible (hairlines) | Reprendre les **hairlines de construction** comme motif de fond discret : écrans de marque, cartes de résultat, badges — elles disent « instrument » mieux qu'un texte. |
| Matière : sphères + verre, localisée | **Liquid glass en signature du hero et des transitions, pas comme matière de page** (déjà dans la vision §6). Sphères translucides pétrole en fond des écrans de marque ; le logo en verre 3D une seule fois : le hero du site. Aucune 3D dans l'app. |
| Applications métier | Nos objets : la **salle d'examen**, le **Bogen**, la **fiche de rôle**, le **badge de candidat**, l'**écran de résultat**. Les personnages SVG (ADR-0013) remplacent les ampoules : c'est là que Doctopus a une matière propre. |
| Graphique dans la charte | Le Bereitschaftsindex et les courbes de progression : deux tons (pétrole / pétrole clair), courbes lisses, annotation en encart sombre, grille hairline — exactement la planche « Effectiveness of Therapy ». |

## 4. Ce que ça change concrètement (par ordre d'effet)
1. **Symbole** : reconstruire le logo sur grille, trois tailles, quatre sens nommés — livrable : planche de construction + 4 sens + favicon 16 px.
2. **Palette** : ajouter le ton intermédiaire ; documenter la règle sombre/clair par type d'écran.
3. **Titres en escalier** : composant `Stair` (site + écrans de marque), jamais dans les tableaux ni les listes.
4. **Hairlines** : jeton de fond `grid-hairline` pour les surfaces de marque.
5. **Hero du site** : logo en verre 3D + sphères, une fois ; le reste plat et rapide.
6. **Graphiques** : gabarit unique pour toutes les courbes de l'app.

## 5. Garde-fous (direction-keeper, front-design-keeper)
- Rien de tout cela ne touche la **densité** de l'app de travail : lignes 44 px, readouts mono, contrastes ≥ 4,5:1 ; le style marque ne coule pas dans les écrans denses.
- « Fait » = visible en prod sur au moins un écran de marque **et** un écran de travail, sans régression de vitesse (hero < 3 s mobile).
- Aucune ressemblance littérale avec ORVIO (vert biotech, cercles percés en anneau, photos de bulles) : on prend la **méthode**, pas les formes.

---

## 6. Seconde référence : « Auros » (Refero) — la grammaire d'interface sombre

Source : `DESIGN.md` (extraction Refero) — terminal fintech « abyssal », canvas teal presque noir, orbes de données bioluminescents.

### 6.1 Ce qu'elle apporte de plus qu'ORVIO
ORVIO donne l'**identité** (symbole, matière, escalier) ; Auros donne la **mécanique d'écran** :

| Principe Auros | Pourquoi c'est juste |
|---|---|
| **Pile de surfaces dans une seule teinte** : abyss `#012624` (canvas) → deep `#011d1c` (creux) → kelp `#003734` (carte levée). **Aucune ombre portée.** | La hiérarchie se lit comme des profondeurs d'eau, pas comme du papier surélevé. Zéro bruit visuel. C'est la traduction en composants du « dégradé de luminosité seulement » d'ORVIO. |
| **Couleur rationnée** : blancs/argents portent tout le contenu ; le chromatique est réservé à un dégradé de bouton signature et aux grands chiffres en rose-lavande. | Une seule zone brille par écran. |
| **Une fonte, un seul poids d'affichage (500)** — pas de gras, pas de léger ; tracking négatif fort aux grandes tailles (−0,04 em à 61 px), positif aux étiquettes en capitales (0,08–0,15 em). | « Confiance mécanique » : la hiérarchie vient de la taille et de la casse, pas de la graisse. Même leçon qu'ORVIO. |
| **Deux rayons seulement** : cartes 16 px, petits éléments 6 px. | Vocabulaire de forme fermé — pas de pilules molles. |
| **Interlignage 1,0 au-dessus de 36 px, 1,4 pour le corps.** | Le contraste de rythme fait la typographie. |
| **Étiquettes en capitales espacées** au-dessus des titres (« EXPLORE », « AUROS »). | Lisibilité d'instrument — identique aux micro-étiquettes ORVIO. |
| **Chiffres géants** en accent pâle comme ponctuation lumineuse. | Le score, le Bereitschaftsindex, le compteur de dus : voilà où l'accent vit. |
| Base 4 px, densité spacieuse, sections à 68 px, cartes 36–48 px de marge. | Rythme cinématographique — pour le **site**, pas pour l'app dense. |

### 6.2 Ce qu'on ne prend pas
- Le rose-lavande et le dégradé aurora : c'est leur signature ; la nôtre est le **corail**.
- Le « pas de photo, pas de gens » absolu : Doctopus a des **personnages** (ADR-0013) — ils sont notre matière.
- La sphère de particules 3D : notre moment « wow » est déjà arbitré (liquid glass sur le hero, une fois).
- La densité spacieuse dans les écrans de travail (cas, drill, programme) : 44 px de ligne, readouts mono — non négociable.

### 6.3 Synthèse : la direction Doctopus en une page

**Identité (ORVIO)** — symbole construit sur grille avec quatre sens nommés ; titres en escalier ; hairlines de construction ; matière (verre teinté, sphères) localisée sur les surfaces de marque.

**Grammaire d'écran (Auros)** — pile de surfaces pétrole sans ombre ; couleur rationnée ; un poids d'affichage ; deux rayons ; 1,0 / 1,4 ; étiquettes en capitales espacées ; grands chiffres en accent.

**Ce qui reste Doctopus** — le **corail** comme unique signal (dû, erreur, ★, jour J) ; **Bricolage / Plex / Plex Mono** (Plex Mono = les readouts d'instrument que ni ORVIO ni Auros n'ont) ; les **personnages** ; la **densité** des écrans de travail.

**Règle des deux registres**, désormais explicite :
| Registre | Écrans | Canvas | Texte | Accent |
|---|---|---|---|---|
| **Marque (sombre)** | site, accueil, résultat de simulation, Akademie, Bereitschaftsindex | pile pétrole abyss → deep → kelp (à définir dans nos jetons : `petrol-950/900/800`) | papier `#F4F5F2` titres, gris-vert corps | corail pour les chiffres et le signal |
| **Travail (clair)** | cas, drill, Fachbegriffe, programme, simulation | papier | encre | corail pour dû / erreur / ★ ; pétrole pour l'action |

### 6.4 Jetons à ajouter (proposition pour `tailwind.config.js` — à valider par `front-design-keeper`)
```
petrol-950  #06201F   canvas de marque (abyss)
petrol-900  #04191A   creux (deep)
petrol-800  #0B3330   carte levée (kelp)
petrol-200  #B9D6D1   verre teinté (ton intermédiaire ORVIO « Ash »)
radius : cards 16 px · small 6 px (remplace toute valeur > 16 px sur les surfaces de marque)
display : weight 500 uniquement ; tracking −0,04 em ≥ 48 px ; étiquettes 0,10 em capitales
```
(valeurs dérivées de la teinte pétrole existante ; les hex exacts sont à caler sur le `brand-500` actuel, pas copiés d'Auros.)

### 6.5 Ordre de réalisation (chantier « identité », un seul à la fois, ADR-0015)
1. Jetons + règle des deux registres (petit, mécanique, testable par `checkUiTells`).
2. Symbole sur grille + quatre sens + favicon.
3. Écran de **résultat de simulation** en registre marque (premier écran réel : grands chiffres corail, pile de surfaces, escalier) — c'est là que la direction juge.
4. Site : hero (verre, une fois) + composants Auros.
