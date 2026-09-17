# Fachbegriffe rafraîchi — F1 : collections & page A→Z

Date : 2026-09-17 · Statut : validé par la direction (chat) · Epic : #4 · Chantier ADR-0015 n° 2
Suite : F2 (ancrage au cas : barre de simulation, drill post-simulation, programme) · F3 (explication en contexte pré-générée, registre double)

## 1. Intention

Le glossaire de 2 266 termes est aujourd'hui une grille filtrable et un drill SM-2. La direction veut en faire un instrument personnel : **marquer** (favoris), **rassembler** (decks), **retrouver vite** (liste A→Z à curseur), **voir d'un coup d'œil où l'on en est** (étiquettes SRS), tout cela **par personne** et **sur tous ses appareils**.

Décisions prises en brainstorming :

| # | Décision | Pourquoi |
|---|---|---|
| D1 | Explication en contexte = **pré-générée** par la pipeline (F3), jamais d'IA à l'usage | statique d'abord, hors-ligne, relu par `fsp-language-reviewer` |
| D2 | Deux sortes de decks : **liste manuelle** (termes choisis) et **deck intelligent** (filtres enregistrés) ; **Favoris** = liste manuelle réservée | l'usage décrit (« deck du cas Meyer ») + la lentille vivante (« Gastro à revoir ») |
| D3 | Page = **une seule liste A→Z** ; decks en **onglets** ; curseur alphabétique vertical avec zoom au survol | la grille n'apportait rien qu'une ligne dense ne donne ; les onglets logent les decks sans 3ᵉ colonne sur mobile |
| D4 | Drill d'un deck : **le SRS reste le maître** — dus puis nouveaux du deck, jamais « tout revoir » | pas de second planning ; protège de la sur-révision (veto pédagogique) |
| D5 | Collections stockées en **événements + projections**, comme `srs.reviewed` | même mécanique, multi-appareils gratuit, additif donc sans conflit |

## 2. Modèle

### 2.1 Événements (contrat `docs/contracts/sync-protocol.md` — via `arch`)

Nouveaux `type` (ajout à la contrainte `progress_events.type`, au schéma zod de la fonction `events`, à `ProgressEventType`) :

| type | subject_id | payload |
|---|---|---|
| `term.favorited` | termId | `{}` |
| `term.unfavorited` | termId | `{}` |
| `deck.created` | deckId | `{ name, kind: 'manual' \| 'smart', query?: DeckQuery }` |
| `deck.renamed` | deckId | `{ name }` |
| `deck.query_changed` | deckId | `{ query: DeckQuery }` (smart seulement) |
| `deck.deleted` | deckId | `{}` |
| `deck.term_added` | deckId | `{ termId }` |
| `deck.term_removed` | deckId | `{ termId }` |

`DeckQuery = { q?: string; specialty?: Specialty; state?: Srs['state']; center?: Center }` — exactement les filtres de la page. `deckId` = uuid v4 client ; **`deck-favorites`** est un id réservé, jamais émis en `deck.created`/`deck.deleted`/`deck.renamed`. Nom : 1–40 caractères, espaces normalisés.

Projection (ordre `occurred_at`, puis `received_at`, puis `id` pour la stabilité) :
- `favorites` : ensemble des termIds dont le dernier événement `term.*` est `favorited`.
- `decks` : créé → existe ; `deleted` → n'existe plus (les `term_added` postérieurs à un `deleted` sont ignorés) ; `renamed`/`query_changed` → dernier gagne.
- `deck_terms` : par (deckId, termId), le dernier `term_added`/`term_removed` gagne.

Idempotence : rejouer le journal dans n'importe quel ordre d'arrivée donne le même état (les tests le prouvent en mélangeant l'ordre).

### 2.2 Tables Dexie (base du compte, `db.ts` version 3)

```
decks:       'id, kind, name'                 // { id, name, kind, query?, createdAt, updatedAt }
deck_terms:  '[deckId+termId], deckId, termId' // { deckId, termId, addedAt }
favorites:   'termId'                          // { termId, since }
```

`rebuildProjections()` reconstruit les trois tables à partir de `progress_events` (comme `fachbegriffe.srs`). Aucune écriture directe hors projection : l'UI émet un événement via `syncQueue.push`, la projection incrémentale applique l'événement localement dans la même transaction (pas d'attente réseau).

### 2.3 Sélecteurs (`lib/collections.ts`)

```
listDecks(): Deck[]                                   // Favoris d'abord, puis manuels (createdAt), puis smart
termsOfDeck(deck, all: Fachbegriff[]): Fachbegriff[]  // manual → jointure deck_terms ; smart → applyQuery(query, all)
applyQuery(q: DeckQuery, all): Fachbegriff[]          // la même fonction que les filtres de la page
isFavorite(termId): boolean
toggleFavorite(termId), createDeck(name, kind, query?), renameDeck, setDeckQuery, deleteDeck, addToDeck, removeFromDeck
```

Toutes ces mutations = un événement + projection locale ; retour immédiat.

## 3. Interface

### 3.1 Page `/fachbegriffe`

- **En-tête** : eyebrow « Vocabulaire », titre, « n termes · k dus aujourd'hui », bouton **Drill** (global) — devient « Drill · <deck> (k) » quand un onglet deck est actif.
- **Onglets** (rangée défilable horizontalement, `role="tablist"`) : **Tous · ★ Favoris (n) · decks manuels · decks intelligents · +**. `+` ouvre une feuille : nom, type (liste / intelligent), et pour intelligent les filtres. Onglet actif = paramètre d'URL `?deck=<id>` (partageable, restaurable).
- **Barre de filtres** : recherche, spécialité, état, centre. Sur un deck intelligent, la barre montre la requête du deck ; la modifier fait apparaître **« Enregistrer dans le deck »** / **« Annuler »**.
- **Liste A→Z** (virtualisée) groupée par première lettre du terme (Ä→A, Ö→O, Ü→U, ß→S pour le groupement ; tri `localeCompare('de')`) : en-tête de lettre collant. **Ligne** : terme (technique, gras, `text-brand`) · formulation patient (une ligne, tronquée) · à droite : **étiquette SRS** (chip : Neu bleu-ciel / Gelernt émeraude / Zu wiederholen ambre — jetons `srsTone` partagés) · **étoile** (bouton 44 px, `aria-pressed`, toggle sans ouvrir le tiroir) · dans un deck manuel : bouton « Retirer ». Clic sur la ligne → tiroir Glossaire.
- **Curseur alphabétique** (droite, `role="listbox"`-like avec `aria-label="Aller à la lettre"`) : 26 lettres, celles sans terme grisées et `aria-disabled`. Clic → défilement instantané au premier terme de la lettre (pas de smooth : instrument, pas de manège). Survol souris ou glisser tactile : la lettre pointée `scale(1.6)`, ses deux voisines `scale(1.25)`, transition 120 ms `transform` seulement ; une bulle affiche la lettre au glisser tactile. `prefers-reduced-motion` → pas d'échelle, surbrillance seule. Zone tactile ≥ 44 px de large. Le curseur suit la liste **filtrée** (les lettres se grisent quand un filtre les vide).
- **Menu ligne / tiroir** : « ★ Favori » · « Ajouter à un deck… » (liste des decks manuels + « Nouveau deck ») · dans un deck : « Retirer de ce deck ».
- **Gestion d'un deck** (icône ⋯ sur l'onglet actif) : Renommer · Supprimer (confirmation) · pour smart : Modifier les filtres. Favoris : ni renommage ni suppression.
- **États vides** : deck manuel vide → « Ajoute des termes depuis une fiche ou avec ★ » ; deck intelligent vide → « Aucun terme ne correspond aujourd'hui » ; Favoris vide → « Marque un terme d'une ★ pour le retrouver ici ».

### 3.2 Tiroir Glossaire (`GlossaryDrawer`)

Ajouts dans l'en-tête : étoile (toggle) et bouton « Ajouter à un deck… ». Étiquette SRS colorée sous le terme. Le reste inchangé (F3 y ajoutera le registre double).

### 3.3 Drill (`/fachbegriffe/drill?deck=<id>`)

Même écran, file restreinte au deck : dus (priorité existante) puis nouveaux. Rien → écran « Rien à réviser dans <deck> aujourd'hui · prochain terme dû : <date> » + lien « Drill global ». Chaque note émet `srs.reviewed` comme aujourd'hui (un deck ne change rien au SRS).

### 3.4 Charte

Instrument clinique : typographies et jetons existants ; densité de ligne 44 px ; aucune nouvelle couleur (les trois tons SRS existent) ; mouvement : seul le zoom du curseur, `transform` uniquement, interruptible ; `front-design-keeper` et `ux-motion-designer` relisent avant PR.

## 4. Critères d'acceptation

| AC | Critère | Preuve |
|---|---|---|
| AC-1 | ★ sur une ligne → événement `term.favorited` dans `outbox` + ligne visible dans l'onglet Favoris sans rechargement | test composant + Dexie |
| AC-2 | Favori posé par A invisible chez B (bases distinctes) ; visible sur le 2ᵉ appareil de A après sync | navigateur, 2 contextes |
| AC-3 | Créer un deck manuel, ajouter 3 termes (tiroir), renommer, retirer 1, supprimer → projections exactes ; rejouer les mêmes événements dans un ordre mélangé donne le même état | tests `projections` |
| AC-4 | Deck intelligent « Kardiologie + Zu wiederholen » : un terme noté « Gut » au drill en sort sans action | test intégration Dexie |
| AC-5 | Curseur : clic « K » → premier terme en K aligné en haut (mesure DOM ±4 px) ; lettres vides `aria-disabled` ; sous `prefers-reduced-motion` aucun `transform: scale` | navigateur |
| AC-6 | Drill d'un deck : file ⊆ deck, dus avant nouveaux, jamais « pas encore dû » | test unitaire de la file |
| AC-7 | 2 266 termes : premier rendu de la liste < 200 ms, ≤ 60 lignes montées à la fois (virtualisation) | navigateur, mesure DOM |
| AC-8 | 390 px : onglets défilables, curseur ≥ 44 px de large et utilisable au doigt, `scrollWidth ≤ innerWidth` | navigateur |
| AC-9 | Contrat : `sync-protocol.md`, contrainte SQL, zod de `events`, `ProgressEventType` alignés ; `testRls` vert ; appliqué au projet EU avant « fait » | CI + MCP |
| AC-10 | Mode `public` et tests existants : aucune régression | vitest |

## 5. Hors périmètre

F2 (barre de simulation, drill post-simulation, programme), F3 (contexte, registre double), import/export, partage de decks entre comptes, réordonnancement manuel, deck intelligent « termes d'un cas » (arrive avec F2), tags libres.

## 6. Risques

| Risque | Parade |
|---|---|
| Liste de 2 266 lignes lente | virtualisation (`@tanstack/react-virtual`, déjà courant) ; AC-7 |
| Événements de deck reçus avant `deck.created` (ordre réseau) | projection idempotente par ordre `occurred_at` ; AC-3 |
| Contrainte `type` en prod : événement inconnu rejeté | migration appliquée au projet EU **avant** le déploiement front (ordre de livraison dans le plan) |
| Curseur illisible en sombre | jetons `text-slate` existants + surbrillance `brand` ; relecture charte |
