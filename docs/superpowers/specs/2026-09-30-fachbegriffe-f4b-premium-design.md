# Fachbegriffe F4b — Couche premium : verre, étoile, decks flottants, mouvement · Spec

> Chantier 2 des retours du 28 sept. (n°4, 6, 7) + deux retours du 30 sept. (carte d'embarquement du drill, mini-fiche de création). Brainstorming validé section par section avec la direction le 30 sept. 2026. F4a (PR #51) est la base : ce chantier ne change ni les données, ni les événements, ni la logique ; il change la matière, la mise en page et le mouvement.

## 1. Décisions

| # | Décision | Pourquoi |
|---|---|---|
| P1 | **Une seule matière verre**, dérivée de `.glass` existant (`app/src/styles/index.css`) : deux densités, `glass-thin` (pilule, onglets) et `glass-full` (carte, tiroir) ; liseré de lumière en haut ; **aucune ombre portée** ; repli opaque existant conservé (`prefers-reduced-transparency`, pas de `backdrop-filter`). | Règles « Agentic Visuals » ; pas de deuxième système. |
| P2 | Le verre est réservé à ce qui **flotte** (bulle, onglets, confirmation, mini-fiche, tiroir de gestion). Les surfaces de lecture restent la charte « instrument clinique » (Bricolage/Plex/Plex Mono, pétrole, papier/encre). | La lecture prime. |
| P3 | **Étoile** : vide = cristal (incolore, liseré clair) ; pleine = **ambre glassy doux**, nouveau jeton `star` (jamais en texte courant). Le **corail** quitte l'étoile, réservé aux corrections/alertes. | Choix C de la direction. |
| P4 | **Bulle de sélection** = petite pilule verre à deux icônes (Expliquer, ★), labels au survol sur ordinateur ; après « Expliquer », elle **s'étend** en carte verre ; se rétracte à la fermeture. Cibles ≥ 44 px, `aria-label` conservés. | « La bulle est trop grosse, pas liquid glass. » |
| P5 | **Confirmation** = pilule verre en bas de l'écran, une ligne : « ★ Rangée dans Favoris · Révéler · Changer » ; toucher ouvre la miniature ; se ferme seule. Même pilule pour « Carte supprimée · Annuler » et les erreurs. | Choix A ; discret pendant un cas. |
| P6 | **Decks flottants** : ordinateur = onglets verre qui sortent du **bord gauche du tiroir latéral d'un terme** (`GlossaryDrawer` : fiche, Carte/Fiche, corbeille — précisé par la direction le 30 sept.) (Favoris, decks manuels, « ⋯ Decks ») ; onglet allumé = ce terme est rangé dans ce deck, toucher = ranger / retirer (défaut à confirmer) ; « ⋯ Decks » ouvre un tiroir de gestion (créer, renommer, supprimer + Annuler 5 s ; supprimer un deck ne supprime aucune carte). Téléphone = mêmes onglets en **bande horizontale** en haut du tiroir. Decks intelligents affichés avec leur icône, non rangeables à la main. | Choix C + A. Événements existants seulement (`deck.created`, `deck.renamed`, `deck.deleted`). |
| P7 | **Carte d'embarquement du drill** : titre (portée) ; trois relevés en mono (« à revoir », « nouveaux », « min environ ») ; budget du jour affiché seulement quand il limite (« Encore N nouveaux demain ») ; bascule de sens « Fachbegriff → Bedeutung » / « Bedeutung → Fachbegriff » **avec un exemple** tiré d'un terme du pool hors file du jour (jamais la 1re carte à venir) ; une action « Commencer » (le nombre est déjà dans les relevés) ; puce de spécialité prioritaire ; suppression de « Répétition espacée (SM-2), cartes bidirectionnelles » ; état vide « À jour ✓ — prochain terme dû le … ». | Retour 30 sept. : « informations parachutées ». |
| P8 | **Mini-fiche = la carte en train de se faire** : mot en grand (police du recto, crayon discret pour corriger), Bedeutung en italique éditable sur place (miroitement pendant la proposition IA), phrase de contexte en petit avec le mot surligné ; pastilles de mots d'abord pour une phrase (le mot choisi « vole » à sa place) ; pied : bande de decks + « Créer la carte »/« Ranger » ; champs sans bordure (soulignement fin au survol/focus). Ouverture : la pilule s'étend en carte (ancrée sous la sélection sur ordinateur, depuis le bas sur téléphone) ; après « Créer », la carte **se pose** dans la pilule de confirmation. Clavier : focus sur la Bedeutung, Entrée crée, Échap ferme. | Retour 30 sept. : disposition, apparence, animation, transparence. |
| P9 | **Mouvement** avec la bibliothèque **`motion`** (choix de la direction) : quatre gestes partagés — apparaître, s'étendre, glisser, se poser ; ressorts courts sans rebond sur le texte ; **interruptibles** (fermer pendant l'ouverture repart en sens inverse) ; `MotionConfig reducedMotion="user"` global → états instantanés. Import allégé (`LazyMotion` + `domMin`, mesuré : `domAnimation` et `domMax` coûtent plus) ; **budget +30 Ko gzip max** (relevé par la direction le 30 sept. ; +25 Ko n'est pas tenable avec `motion`) mesuré avant/après. | Ressorts et transitions partagées sans les réécrire à la main. |
| P10 | Les compteurs de la carte d'embarquement « comptent » une fois à l'apparition, jamais ensuite ; statiques sous mouvement réduit. | Vie sans distraction. |

## 2. Hors périmètre

Personnalisation des cartes (styles, ratios, éléments affichés) = chantier 3. Aucune donnée, aucun événement, aucune migration, aucune fonction serveur nouvelle. Pas de refonte des pages hors Fachbegriffe/drill.

## 3. Architecture

- `app/src/styles/index.css` : `glass-thin`, `glass-full` (dérivés de `.glass`), jeton `star` (Tailwind), liseré de lumière.
- `app/src/lib/motion.ts` : les quatre gestes (variantes + transitions) et le `MotionConfig` ; seul point d'import de `motion`.
- Composants touchés : `SelectionExplainer` (pilule), `StarButton` (cristal/ambre ; pleine → fiche du terme), `CardToast` (pilule), `NewCardSheet` (carte en devenir), `GlossaryDrawer` (verre + onglets sur son bord gauche / bande), nouveau `DeckRail` (onglets du terme, remplace `DeckChecklist`) et `DeckManager` (tiroir de gestion), `DrillPage` (carte d'embarquement), `App`/`Shell` (MotionConfig).
- Réutilisés sans changement : `addTermToDeck`, `moveTermToDeck`, `createDeck`, `renameDeck`, `deleteDeck`, `scheduleDeletion`/`cancelDeletion` (le « Annuler » d'un deck suit le même principe différé : rien n'est émis avant l'expiration).

## 4. Critères d'acceptation

- **AC-1** Une seule matière verre (`glass-thin`/`glass-full`), aucune `shadow-*` sur les éléments flottants refondus ; repli opaque sous `prefers-reduced-transparency` (mesuré).
- **AC-2** Étoile vide cristal / pleine ambre (`star`), contraste ≥ 3:1 sur fond clair et sombre ; aucun corail sur l'étoile.
- **AC-3** Bulle : pilule à 2 icônes ≤ 120 px de large ; « Expliquer » l'étend en carte ; cibles ≥ 44 px ; labels accessibles.
- **AC-4** Confirmation : pilule une ligne en bas ; Révéler / Changer / Annuler fonctionnent comme en F4a.
- **AC-5** Onglets sur le bord gauche du tiroir d'un terme : allumé = rangé, toucher = ranger / retirer ; gestion (créer, renommer, supprimer + Annuler) ; supprimer un deck ne supprime aucune carte ; téléphone = bande horizontale en haut du tiroir, `scrollWidth ≤ 390`.
- **AC-6** Carte d'embarquement : trois relevés, bascule avec exemples, une action, plus de mention SM-2 ; état vide avec date.
- **AC-7** Mini-fiche : mise en page « carte » (mot, Bedeutung, contexte), pastilles, deck, Créer ; ouverture depuis la pilule, fermeture inverse, « se pose » dans la confirmation.
- **AC-8** Chaque geste est interruptible ; sous `prefers-reduced-motion` aucun mouvement (mesuré : pas d'animation en cours après changement d'état).
- **AC-9** Bundle : +30 Ko gzip max (mesure `vite build` avant/après ; relevé de +25 à +30 Ko par la direction le 30 sept.).
- **AC-10** Aucune régression F4a : toutes les suites existantes vertes, preuve E2 F4a rejouée.

## 5. Preuves

Tests RTL de comportement (animations instantanées sous test) ; `front-design-keeper`, `ux-motion-designer`, accessibilité, `direction-keeper` ; preuve navigateur 390 px + ordinateur, clair/sombre, **capture vidéo** des gestes pour la direction.

## Décisions de la direction (30 sept., plan)

- Budget bundle relevé à **+30 Ko gzip** (P9, AC-9) : `motion` seul en prend ≈ 27 Ko.
- Les onglets de decks sortent du bord gauche du **tiroir latéral d'un terme** (`GlossaryDrawer`), pas de la liste de la page Fachbegriffe ; bande horizontale en haut du tiroir sur téléphone. Comportement proposé par le plan, à confirmer : onglet allumé = le terme est rangé, toucher = ranger / retirer, « ⋯ Decks » = gestion.
- **Revue de fin de branche (G1, 30 sept.)** — amende P6 et AC-5 : les **decks intelligents sont retirés des onglets** du tiroir d'un terme (ils se remplissent seuls, rien à y toucher ; ils restent visibles et gérables dans le tiroir de gestion et sur la page Fachbegriffe) ; les onglets = Favoris + decks manuels, puis le bouton de gestion **en dernier** (icône + « Gérer », nom accessible « Gérer les decks ») ; onglet allumé = texte pétrole + ✓, sans fond plein. **Une seule entrée de création de deck** : « Nouveau deck » dans le tiroir de gestion ouvre `DeckSheet` (manuel ou intelligent) ; le « + » des onglets de la page Fachbegriffe est retiré.
- Carte d'embarquement (revue direction, 30 sept.) : libellés Fachbegriff ↔ Bedeutung, exemple jamais tiré de la carte à venir, « min environ », « Commencer » sans nombre, sens mémorisé par compte.
