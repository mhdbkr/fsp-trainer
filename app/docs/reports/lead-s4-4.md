# S4-4 — le cadran `CaseDial` (rapport de tâche)

Branche `feat/s4-4-cadran` (base `origin/main` @ `f99364e1`). Statut : **DONE_WITH_CONCERNS** (après les trois revues : voir « Revues » et « À trancher »). Les trois points de la première version ont été tranchés par `main` le 5 oct. et appliqués.

## Livré
| Fichier | Rôle |
|---|---|
| `app/src/components/visuals/CaseDial.tsx` | la primitive : SVG (anneau intérieur = maîtrise, extérieur = trois arcs), ouverture, détail flottant, `CaseDialDetail` exporté |
| `app/src/components/visuals/CaseDialText.ts` | tous les mots, dérivés de `CaseDialData` seul |
| `app/src/styles/index.css` (bloc `.case-dial`) | variables de couleur, mouvement sous `no-preference` seulement |
| `app/src/features/cases/dialCarte.ts` | montage carte : « joué depuis la dernière visite », visite par compte |
| `app/src/features/cases/CasesPage.tsx` | `CaseCard` : le cadran 64 remplace `TeilDots` (les pastilles ne doublonnent plus) |

API : `<CaseDial data size={36|64|96|160} nom? vientDeSouder? action? />`. `CaseDialDetail` est exporté pour S4-3 (pré-simulation : détail déjà ouvert ; fin de partie : `vientDEtreJoue` fait dessiner l'arc, `vientDeSouder` soude l'anneau). Le lien d'action pointe `/simulation/:id/pre?teil=…` (le paramètre existe déjà).

## Décisions d'implémentation (hypothèses surfacées)
- **Emplacement.** Le brief disait `components/CaseDial*`, le contrat §12.7 `components/visuals/`. Décision de main (5 oct.) : `components/visuals/` ; fichiers déplacés (commit dédié), la règle B de `motionSafe.test.ts` s'applique et passe (aucune classe `transition-*`/`animate-*` Tailwind ; le mouvement vit dans `index.css` sous `no-preference` ET est coupé côté JS).
- **« À confirmer »** = `acquis` ∧ `solideDes ≤ aujourd'hui` (§13.2). Rendu : même couleur qu'« acquis », plus un **fil pétrole** de 2 unités sur l'arc (et sur la pastille du détail) ; dit « acquis, à confirmer » dans l'étiquette.
- **Faite — non mesurée** : arc neutre en pointillé. **Soudé** : un seul cercle (pas trois arcs bout à bout, qui laisseraient des coutures) ; il ne s'écarte pas à l'ouverture.
- **Mouvement réduit, « panneau »** : interprété comme le même détail en verre, sans fondu ni élévation, sans grossissement ni écart des arcs (`data-panneau`). Pas de tiroir latéral.
- **Animations « une fois »** : mémorisées pour l'onglet (clé `cas:Teil:lastAt`), sinon filtrer la liste redessine tout. Au premier passage (aucune visite connue) rien ne s'anime.
- Aucune lecture de la base ni du journal dans le composant (test INV-59 sur les imports).

## TDD
- RED : `CaseDial.test.tsx` (« Failed to resolve import ./CaseDial »), `dialCarte.test.ts` (« Failed to resolve import ./dialCarte »), 3 tests de la carte dans `CaseProgress.test.tsx` en échec avant le montage. **Honnêteté** : `CaseDialText.test.ts` a été écrit avant le module mais je n'ai pas lancé l'échec ; il est passé au premier run.
- Deux défauts trouvés **dans le navigateur**, pas par les tests, corrigés avec test : le pointillé « non mesurée » restait plein (`pathLength=1` et `dasharray 3 4`) ; les arcs se redessinaient quand la liste se remontait (filtre).
- GREEN : `CaseDialText` 20, `CaseDial` 32, `dialCarte` 6, cartes 5.

## Vérification par code de sortie (worktree, sur le dernier commit de code)
| Commande | Sortie |
|---|---|
| `tsc -b --noEmit` | 0 |
| `vitest run --dir src --maxWorkers=2` | 0 (154 fichiers, 1 453 tests ; rejoué sur `0416ad3a`, dernier commit de code) |
| `npm run test:c6` | 0 (6 fichiers, 59 tests) |
| `npm run build` (env du Supabase local) | 0 |
| `check*.mjs` de la CI (15 + `checkTermRegister --require-all` + `evalDoctopus --dry`), dont `checkUiTells` | 0 |
| `checkFixedOverlays.mjs` (copie, absent de `origin/main`) | 0 violation dans mes fichiers (voir « Non vérifié ») |

## Vérification navigateur
`vite preview` du build de **ce** worktree (port 4477, `index.html` servi identique à `dist/`), Supabase local de main (jamais arrêté, pas de `db:reset`), `playwright-cli` headless. Les `case_progress` de 8 cas ont été écrits dans l'IndexedDB de la session de test (vierge, entamé, couvert, solide, prêt soudé, à confirmer, acquis à date future, non mesurée), puis les `liveQuery` réveillées ; les mesures ci-dessous sont lues dans le DOM de l'app.
- (Mesures prises avant le changement de couleur et le déplacement de fichiers ; le comportement n'a pas changé, tests et build rejoués après.)
- Étiquettes rendues, ex. : `Heftige Flankenschmerzen… : 81 en moyenne sur 2 Teile. Anamnese : pas encore travaillé. Dokumentation : acquis, 82, hier. …`
- Survol souris : détail ouvert 346 ms après `pointerover` (300 ms + rendu, machine à charge 15-28) ; `transform` du svg `matrix(1.14…)`, groupes d'arcs `translate(4.33, -2.5)`, `(0, 5)`, `(-4.33, -2.5)`. Se referme en quittant.
- Texte lu dans le détail : « Solide si tu refais 80 ou plus à partir du jeudi 8 oct. » ; « Pour souder l'anneau : rejoue le cas en Autonome et avec la grille de langue remplie. » ; « Prochaine reprise : lundi 12 oct. »
- Tactile (Chromium, iPhone 15, 390 px, `Input.dispatchTouchEvent`) : rien à 250 ms, ouvert à ~529 ms après `pointerdown` sous charge ; `navigator.vibrate` appelé avec `[12]` ; détail 288 px dans l'écran, pas de défilement horizontal (`scrollWidth` 390) ; un tap ailleurs referme.
- Clavier : Entrée ouvre et le focus entre sur l'action ; Échap ferme et le focus revient sur le cadran.
- Mouvement réduit (`emulateMedia`) : `data-mouvement="reduit"`, svg `transform: none`, groupes `none`, `data-panneau="true"`, durées de transition 1e-6 s.
- Animations (visite simulée 4 jours plus tôt) : 12 `.cd-trace` (`animation-name: cd-trace`), 1 anneau soudé `cd-souder, cd-pulse` (0,8 s / 0,52 s), `finished` après 2 s, `stroke-dashoffset: 0`. Deuxième passage (visite = maintenant) : 0 tracé, 0 soudure.

### Captures (dossier `scratchpad/s4-4/`)
`s4-4-liste-1280-clair-ferme.png` · `…-clair-ouvert.png` · `…-sombre-ferme.png` · `…-sombre-ouvert.png` · `…-clair-ouvert-mouvement-reduit.png` · `s4-4-liste-390-clair-ferme.png` · `…-390-clair-ouvert.png` · `…-390-sombre-ferme.png` · `…-390-sombre-ouvert.png` · `s4-4-planche-etats-clair.png` · `s4-4-planche-etats-sombre.png`. Les deux planches (clones SVG agrandis des cadrans rendus, une par état) sont aussi commitées dans `app/docs/reports/`.
Chemin complet : `/private/tmp/claude-501/-Users-MehdiBoukari-Downloads-FSP-VB-Claude-FSP/fab928bf-94b4-4f3f-b28b-69e62e6e776f/scratchpad/s4-4/`.

## Revues de `2696e7ce` et corrections (fixeur)
Trois verdicts reçus : **Direction : PAS PRÊT** (l'intention « élargit les cercles et dévoile des détails » n'était pas atteinte sur la carte) ; **Charte : tient**, 3 corrections ; **Mécanique (Opus) : Needs fixes**, INV-59 respecté. Un commit par groupe :
| Commit | Contenu |
|---|---|
| `8b35a03b` mécanique | I2 clic `detail 0` (Entrée/Espace/lecteur d'écran) au lieu de keydown ; m5 Tab depuis le détail rend le focus au cadran ; m3 un seul `MediaQueryList` : `useReducedMotion` réexporté par `lib/motion` (une ligne dans `lib/motion.ts`, demandée par main) ; I1/I3 tests du chemin visite → page → carte → arc ; m1 bornes. Tests écrits rouges d'abord (10 échecs avant le code). Mutation « `visite={null}` sur la carte » : 2 tests meurent. |
| `bbe2a899` direction D2-D4 | `ProgressBadge` retiré de la carte ; « Simuler » = libellé + `?teil=` de `actionSuivante` (un seul `.btn-primary`), détail de la carte sans second bouton ; « Pour être prêt : rejoue-le d'un trait, en Autonome, grille de langue remplie » ; « Fait — non mesuré » (cas, masculin) ; difficulté nommée et rangée à droite de la ligne des centres. |
| `86321bbd` direction D1/D5 + charte | l'ouverture (voir ci-dessous) ; chiffre et anneau intérieur en `--cd-discret` tant que `couverture < 3` ; liseré pétrole sur le bord de l'arc « à confirmer » (assumé, repris par la pastille du détail) ; C1 palette lue par `theme('colors.…')`, plus aucun hex, un seul gris, `rounded-card`, `var(--ease-out)`, focus global ; C2 police rendue ≥ 11 px. |
| `8f44ac6f` | m4 `CaseCard` mémoïsée ; le détail se referme quand le focus quitte le cadran. |
| `0416ad3a` | le cadran ouvert reste entier près du bord d'écran (défaut vu à 390 px) ; pieds de carte alignés. |

**L'ouverture (D1)**, mesurée dans le DOM : le cadran 64 grandit à 96 px (`matrix(1.5…)`) sans bousculer la grille (la carte passe au-dessus), les arcs s'écartent de 9 unités (`translate(7.79, -4.5)`…) et passent de 7 à 9 d'épaisseur, les repères « A 78 / D 70 / F 54 » apparaissent en IBM Plex Sans à 11,0 px rendus, le panneau naît du cadran (`transform-origin` au centre du cadran, ressort de `lib/motion`) et ses lignes arrivent l'une après l'autre (`--i`). Échantillonnage image par image : échelle monotone 1 → 1,5 en ~420 ms ; panneau opacité 0,26 → 1 et échelle 0,57 → 1 ; **fermer à mi-course** repart de l'échelle courante (1,358 → 1,03 → 1), sans saut. Sous mouvement réduit (OS réduit, page rechargée) : `--cd-echelle: 1`, svg `none`, arcs `none`, épaisseur 7, aucun repère, panneau `none` et ses lignes sans animation.

**Écarts assumés par rapport aux revues**
- Charte « `.cd-sub` en mono, `letter-spacing: 0.06em` » **non appliqué** : ADR-0016 et `checkUiTells` rejettent le mono espacé en libellé. `.cd-sub` reste en Sans, et n'existe plus qu'à 160 px (à 96 px « maîtrise » ne tient pas à 11 px dans l'anneau).
- I1 : la garde existait déjà (`if (!cases || !progress) return Chargement`, avant le rendu de la grille) ; la revue lisait `cpOf` qui tolère `undefined`. Le test à progression retardée la verrouille maintenant.
- m3 : le réglage est lu par `useReducedMotion` de motion, **non réactif** à un changement en cours de session (comme `MotionRoot`) ; le CSS, lui, suit en direct.
- m4 : 130 cartes, une frappe dans le filtre : 88-150 ms avant, 90-310 ms après `memo` jusqu'à la 2e image, **sur une machine à charge 15-85**. Le coût vient du montage des cartes que le filtre fait apparaître (~1-2 ms/carte), pas du re-rendu des cartes inchangées. Mesure non concluante en valeur absolue ; `memo` gardée (sans coût), pas d'autre optimisation.
- m2 (pour le contrat, à inscrire par main) : `vientDEtreJoue` a **une seconde source** sur la carte : « Teil dont `lastAt` > dernière visite locale » (`localStorage` `doctopus-cas-visite`, par compte en mode fondateur), en plus de `Lauf.teileGespielt` en fin de partie. Comparaison de dates, pas une mesure.

## Décisions de main appliquées (5 oct.)
1. **Contraste de « acquis » en clair** : `--cd-acquis` passe de `#6bbdb0` (2,0:1) à `#379e8f` (2,98:1 sur le papier, 3,26:1 sur blanc), par la variable ; sombre inchangé. Lu dans le DOM : `stroke: rgb(55, 158, 143)` en clair et en sombre. Test : la variable est dans `:root`, le composant ne code aucune couleur. Planches d'états recapturées (commitées). Les captures 390/1280 de la section précédente ont été prises AVANT ce changement, seul l'arc « acquis » en clair diffère.
2. **Chemin** : `components/visuals/` (voir plus haut).
3. **Mouvement réduit** : le détail en verre, immobile, est retenu.

## À trancher
Rien de bloquant. Le « vierge » reste volontairement discret (1,4:1 en clair), il n'est jamais un signal d'erreur. Le bouton unique de la carte porte des libellés longs (« Reprendre par la Fallvorstellung ») : ils passent sur deux lignes dans les colonnes étroites ; à juger.

## Non vérifié
- **`checkFixedOverlays.mjs` n'existe pas sur `origin/main`** (fichier non suivi dans le dépôt de Mehdi). Exécuté sur une copie : **aucune violation dans mes fichiers** (le détail du cadran porte son `<Portal>`). Il signale 10 autres manquements préexistants : `features/cases/CasePreviewPanel.tsx:23-24`, `features/fachbegriffe/{CaseTermsPanel,DeckSheet,SrsSettingsSheet}.tsx` et `.reveal`/`.stagger` dans `styles/index.css` — des fichiers que Mehdi modifie en ce moment dans l'arbre principal ; je n'y ai pas touché.
- Appui long sur un **vrai appareil** (iOS Safari : `touch-callout`, menu contextuel) : testé seulement en émulation Chromium.
- Lecteur d'écran réel (VoiceOver/NVDA) : l'étiquette est vérifiée par le DOM, pas à l'oreille.
- Les cadrans 36, 96 et 160 ne sont montés nulle part dans l'app (S4-2/S4-3/S4-5) ; leur rendu n'est vérifié que par les tests (`width/height`, centre masqué à 36).
- Aucune donnée réelle d'utilisateur : les états viennent de lignes `case_progress` écrites pour le test, pas d'un journal rejoué.

## Pour les suivants
- S4-3 : `<CaseDialDetail data />` pour le détail déjà ouvert ; `action={false}` si on est déjà dans le cas ; fin de partie : `dialData(cp, { lauf })` donne `vientDEtreJoue`, et `vientDeSouder` se dérive de `pretAt` vs début de partie.
- Le pointillé et le fil « à confirmer » sont invisibles à 36 px : le détail et l'étiquette portent l'information.

## Vérification navigateur refaite après les revues (build de ce worktree, `vite preview` port 4477)
Supabase local de main : saturé par la charge de la machine pendant la séance (HTTP 000/500/503/546, conteneurs « unhealthy ») ; je ne l'ai ni redémarré ni touché. Pour les sessions de test, les requêtes vers `127.0.0.1:54321` ont été **coupées côté navigateur** (`context.route(...).abort()`), le contenu (12 cas synthétiques + `contentVersion=1`) et les `case_progress` étant écrits dans l'IndexedDB de la session ; le chemin d'amorçage hors ligne de l'app est donc exercé, pas le pull du serveur.
- **Souris** : survol → ouvert 305-332 ms après `pointerover` ; sortie → fermé ; clic bref de souris (detail 1) : n'ouvre rien.
- **Doigt (iPhone 15 émulé, 390 px, `Input.dispatchTouchEvent`)** : appui long → ouvert, vibration 12 ms, détail 288 px dans l'écran, `scrollWidth` 390 ; tap ailleurs → fermé. Le cadran proche du bord droit se décale pour rester entier.
- **Clavier** : Entrée ouvre, Échap ferme (focus rendu au cadran), Espace ouvre, Tab referme.
- **Clic synthétique** (`element.click()`, detail 0) : ouvre et referme (desktop et mobile).
- **Mouvement réduit** : voir plus haut.
- Captures (`scratchpad/s4-4/`) : `s4-4-liste-1280-{clair,sombre}-{ferme,ouvert}.png`, `s4-4-liste-390-{clair,sombre}-{ferme,ouvert}.png`, `s4-4-liste-1280-clair-ouvert-mouvement-reduit.png` (prise avant la dernière retouche de décalage, comportement inchangé), séquence d'ouverture ralentie (CDP `Animation.setPlaybackRate 0,1`) `s4-4-ouverture-1-debut.png`, `-2-milieu.png`, `-3-fin.png`, planches d'états (commitées dans `app/docs/reports/`).
- La planche d'états montre l'état `acquis` en `#379e8f` (clair et sombre) et le liseré « à confirmer ».

### Non vérifié (ajouts)
- Le pull réel du contenu depuis le Supabase local (indisponible, voir ci-dessus).
- Le seuil de 11 px est vérifié par le calcul `font-size × taille rendue / 120` dans le DOM, pas par mesure de pixels.
- L'appui long sur un vrai iPhone.
