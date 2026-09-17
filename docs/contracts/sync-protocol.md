# Protocole de synchronisation de la progression

**Modèle** — journal d'événements additifs, serveur autoritaire, `id` uuid v4 généré client. Tables : `progress_events` (serveur ET Dexie), `outbox` (Dexie, non acquittés).

**Synchronisé** : `simulation.completed`, `srs.reviewed`, `plan.done`, `case.layer_reached`, `program.configured`, et les collections Fachbegriffe (F1) : `term.favorited` / `term.unfavorited` (subject = termId, payload `{}`), `deck.created` (subject = deckId, `{ name, kind: 'manual'|'smart', query? }`), `deck.renamed` (`{ name }`), `deck.query_changed` (`{ query }`), `deck.deleted` (`{}`), `deck.term_added` / `deck.term_removed` (`{ termId }`). `deck-favorites` est un id réservé (jamais créé/supprimé/renommé). Projection : ordre `occurred_at`, puis `received_at` (absent = dernier), puis `id` ; dernier événement gagne par (deck), par (deck, terme), par (terme) — un `term_added` postérieur à `deck.deleted` est ignoré.
**Local uniquement** : Bogen en cours, session en pause, préférences d'affichage, simulations de **démo** (`sim-demo-*`, jamais migrées).

**Push** — `syncQueue.push(ev)` : écrit `progress_events` + `outbox` en une transaction, puis `flush()` sans bloquer l'appelant (les écrans ne dépendent jamais du réseau).
`flush()` : single-flight ; anonyme → no-op ; `POST /events` par lots de 100.
- 2xx : `acked` retirés de l'outbox ; **`received[id]` rétro-rempli** dans `progress_events` (sinon un appareil qui n'émet que garderait un curseur à l'époque) ; `rejected` retirés et journalisés — pas de rejeu.
- 4xx (lot) : tout le lot rejeté. 5xx / réseau : conservé, `attempts` **par ligne**, backoff 1 s × 2^max(attempts), plafond 5 min.
- Page pleine (100) → relance après levée du verrou : un backlog draine sans attendre le timer.
Déclencheurs : après chaque push, `online`, **au démarrage**, intervalle 2 min si outbox non vide.

**Pull** — `GET /events?since=<max received_at LOCAL>` (horloge **serveur** ; jamais `occurred_at` client, qui ferait rater les événements poussés en retard par un autre appareil). Insertion des ids inconnus (bulkGet), puis `rebuildProjections()` si nouveautés : `simulations`, `fachbegriffe.srs` (dernier `srs.reviewed` par terme, par `occurred_at`), `cases.layerProgress` (max). Déclencheurs : démarrage, après chaque flush, `online`.

**Conflits** — aucun par construction (additif). Seule mutation logique : SRS d'un terme → last-write-wins par `occurred_at`.
**Horloges** — `occurred_at` client (affichage) ; `received_at` serveur (curseur, quotas, ligue).
**Migration** — `migrateLocalProgress(uid)` : réattribue `user_id:'local'`, convertit simulations réelles / SRS non-`Neu` / couches / config programme ; idempotent (`meta.migratedLocal`).
**Vérifié** — deux appareils, un compte : une simulation jouée sur A apparaît sur un appareil C neuf sans intervention (Task 15).
