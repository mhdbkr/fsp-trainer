# S4-4 — le cadran `CaseDial` (rapport de tâche)

Branche `feat/s4-4-cadran` (base `origin/main` @ `f99364e1`). Statut : **DONE_WITH_CONCERNS** (trois points à trancher, voir plus bas).

## Livré
| Fichier | Rôle |
|---|---|
| `app/src/components/CaseDial.tsx` | la primitive : SVG (anneau intérieur = maîtrise, extérieur = trois arcs), ouverture, détail flottant, `CaseDialDetail` exporté |
| `app/src/components/CaseDialText.ts` | tous les mots, dérivés de `CaseDialData` seul |
| `app/src/styles/index.css` (bloc `.case-dial`) | variables de couleur, mouvement sous `no-preference` seulement |
| `app/src/features/cases/dialCarte.ts` | montage carte : « joué depuis la dernière visite », visite par compte |
| `app/src/features/cases/CasesPage.tsx` | `CaseCard` : le cadran 64 remplace `TeilDots` (les pastilles ne doublonnent plus) |

API : `<CaseDial data size={36|64|96|160} nom? vientDeSouder? action? />`. `CaseDialDetail` est exporté pour S4-3 (pré-simulation : détail déjà ouvert ; fin de partie : `vientDEtreJoue` fait dessiner l'arc, `vientDeSouder` soude l'anneau). Le lien d'action pointe `/simulation/:id/pre?teil=…` (le paramètre existe déjà).

## Décisions d'implémentation (hypothèses surfacées)
- **Emplacement.** Le contrat §12.7 dit `components/visuals/` (règle B de `motionSafe.test.ts`), le brief dit `components/CaseDial*`. J'ai suivi le brief et me suis appliqué la règle B : aucune classe `transition-*`/`animate-*` Tailwind, le mouvement vit dans `index.css` sous `@media (prefers-reduced-motion: no-preference)` ET est coupé côté JS.
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
| `vitest run --dir src --maxWorkers=2` | 0 (153 fichiers, 1 422 tests) |
| `npm run test:c6` | 0 (6 fichiers, 59 tests) |
| `npm run build` (env du Supabase local) | 0 |
| `check*.mjs` de la CI (15 + `checkTermRegister --require-all` + `evalDoctopus --dry`), dont `checkUiTells` | 0 |
| `checkFixedOverlays.mjs` | voir « Non vérifié » |

## Vérification navigateur
`vite preview` du build de **ce** worktree (port 4477, `index.html` servi identique à `dist/`), Supabase local de main (jamais arrêté, pas de `db:reset`), `playwright-cli` headless. Les `case_progress` de 8 cas ont été écrits dans l'IndexedDB de la session de test (vierge, entamé, couvert, solide, prêt soudé, à confirmer, acquis à date future, non mesurée), puis les `liveQuery` réveillées ; les mesures ci-dessous sont lues dans le DOM de l'app.
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

## À trancher (DONE_WITH_CONCERNS)
1. **Contraste de « acquis » en clair : 2,0:1 sur le papier** (`#6bbdb0` sur `#f4f5f2`), sous les 3:1 des éléments graphiques (WCAG 1.4.11). La couleur n'est jamais seule (étiquette, détail, chiffre), mais l'arc seul est faible. Je n'ai pas changé la palette validée par la direction. Proposition : `brand-400` `#379e8f` en clair (2,98 sur papier, 3,26 sur blanc, déjà la valeur sombre). Fragile : 3,09 ; solide : 6,7 ; sombre : tout ≥ 5,1. Le « vierge » (1,4:1 clair) est volontairement discret.
2. **Chemin contractuel** : amender §12.7 (`components/CaseDial.tsx`, hors `visuals/`) ou déplacer le fichier.
3. **Détail « en panneau » en mouvement réduit** : lecture sobre retenue (voir plus haut). À confirmer par la direction.

## Non vérifié
- **`checkFixedOverlays.mjs` n'existe pas sur `origin/main`** (fichier non suivi dans le dépôt de Mehdi). Exécuté sur une copie : **aucune violation dans mes fichiers** (le détail du cadran porte son `<Portal>`). Il signale 10 autres manquements préexistants : `features/cases/CasePreviewPanel.tsx:23-24`, `features/fachbegriffe/{CaseTermsPanel,DeckSheet,SrsSettingsSheet}.tsx` et `.reveal`/`.stagger` dans `styles/index.css` — des fichiers que Mehdi modifie en ce moment dans l'arbre principal ; je n'y ai pas touché.
- Appui long sur un **vrai appareil** (iOS Safari : `touch-callout`, menu contextuel) : testé seulement en émulation Chromium.
- Lecteur d'écran réel (VoiceOver/NVDA) : l'étiquette est vérifiée par le DOM, pas à l'oreille.
- Les cadrans 36, 96 et 160 ne sont montés nulle part dans l'app (S4-2/S4-3/S4-5) ; leur rendu n'est vérifié que par les tests (`width/height`, centre masqué à 36).
- Aucune donnée réelle d'utilisateur : les états viennent de lignes `case_progress` écrites pour le test, pas d'un journal rejoué.

## Pour les suivants
- S4-3 : `<CaseDialDetail data />` pour le détail déjà ouvert ; `action={false}` si on est déjà dans le cas ; fin de partie : `dialData(cp, { lauf })` donne `vientDEtreJoue`, et `vientDeSouder` se dérive de `pretAt` vs début de partie.
- Le pointillé et le fil « à confirmer » sont invisibles à 36 px : le détail et l'étiquette portent l'information.
