# Doctopus — Fondations SaaS · spec de design

**Date** : 2026-09-15 · **Statut** : validé en brainstorming, en relecture
**Sous-projet** : #1 de la décomposition Doctopus (socle de tous les autres)

## 1. Objectif

Transformer FSP-Cockpit (app 100 % locale, contenu embarqué) en socle SaaS :
compte utilisateur, profilage d'inscription, contenu servi selon le plan,
progression synchronisée entre appareils, plans Free / Pro / Premium avec
crédits, paiement Stripe. **Sans perdre** ce qui fait la valeur de l'app :
hors-ligne complet après premier chargement, moteur de simulation inchangé,
types de contenu inchangés.

Hors périmètre (sous-projets ultérieurs) : Bereitschaftsindex, correction
d'Arztbrief, binôme en ligne, ligue, patient IA, site marketing. Ce spec
prépare leur place (événements, crédits, Realtime) sans les construire.

## 2. Décisions prises

| # | Décision | Alternatives écartées |
|---|---|---|
| D1 | **Un compte = une personne.** Les profils locaux disparaissent ; le profil actif migre vers le compte. | Compte-foyer multi-profils ; profils locaux liés à un compte |
| D2 | **Contenu hors du bundle**, servi par l'API selon l'entitlement, en cache Dexie, delta par version. | Tout dans le bundle + paywall client ; hybride Free embarqué |
| D3 | **Serveur autoritaire, écriture immédiate, file hors ligne.** Événements additifs ; SRS en last-write-wins par `occurred_at`. | CRDT ; sync manuelle |
| D4 | **Profilage minimal obligatoire** (4 champs), le reste progressif. Profil = parcours de procédure. | Questionnaire complet ; zéro profilage |
| D5 | **Trois plans** Free / Pro / Premium ; matrice d'entitlements unique côté serveur ; cœur illimité, IA en crédits. | Deux plans ; plan unique + crédits |
| D6 | **Auth par lien magique + Google.** | Mot de passe ; social uniquement |
| D7 | **Crédits en grand livre** (`credit_ledger`), jamais un solde stocké. | Colonne `credits` |
| D8 | **`payload jsonb` conserve les types TS actuels** — aucune refonte de `Case` & co. | Normalisation relationnelle du contenu |

Pile (décidée avant ce spec) : Supabase région EU (Postgres + Auth + RLS +
Edge Functions + Realtime), Stripe (Checkout + Customer Portal + webhooks),
dépôt privé.

## 3. Architecture

```
┌──────────────── client (app/, React + Dexie) ────────────────┐
│  UI ──▶ store (Zustand) ──▶ Dexie (cache local, hors-ligne)  │
│                                │                             │
│          ┌─────────────────────┴─────────────────────┐       │
│     contentLoader                              syncQueue     │
│     (contenu selon entitlement,               (file d'événements│
│      versionné, delta, cache)                  additifs, rejeu) │
└──────────┬──────────────────────────────────────────┬────────┘
           │ GET /content?since=v                     │ POST /events
           ▼                                          ▼
┌──────────────────── Supabase EU ─────────────────────────────┐
│  auth.users ── profiles                                      │
│  plans ── entitlements ── subscriptions                      │
│  credit_ledger (→ vue credit_balances)                       │
│  content_versions ── content_items (tier, payload jsonb)     │
│  progress_events (insert-only, id client)                    │
│  stripe_events (idempotence)                                 │
│  RLS partout                                                 │
└──────────────────────────┬───────────────────────────────────┘
                           │ webhooks
                     ┌─────┴─────┐
                     │  Stripe   │
                     └───────────┘
```

Trois principes :

1. Le serveur est la vérité pour **qui tu es, ce que tu as le droit de voir,
   ce que tu as fait**. Tout le reste reste client et hors-ligne.
2. Le contenu est une table versionnée, pas un bundle.
3. La progression est un journal d'événements additifs ; l'état se dérive.

## 4. Modèle de données

### 4.1 Identité et parcours

```sql
create table profiles (
  id               uuid primary key references auth.users on delete cascade,
  display_name     text,
  -- inscription (obligatoire)
  target_land      text not null,      -- code Kammer : 'BW','BY','NRW',…
  exam_date        date,               -- null = « pas encore »
  language_level   text not null check (language_level in ('B2','C1','C1+')),
  procedure_stage  text not null check (procedure_stage in
                     ('approbation_requested','gleichwertigkeit','fsp_planned','fsp_failed_once')),
  -- progressif
  origin_specialty text, diploma_country text, kp_intended boolean,
  created_at timestamptz default now(), updated_at timestamptz default now()
);
```

### 4.2 Plans et droits

```sql
create table plans (
  id              text primary key,   -- 'free' | 'pro' | 'premium'
  stripe_price_id text,               -- null pour free
  monthly_credits int not null default 0
);

create table entitlements (
  plan_id     text references plans,
  feature     text,                   -- 'content.tier','sim.online','league',
                                      -- 'ai.arztbrief','ai.voice','credits.monthly'
  limit_value int,                    -- null = illimité / booléen vrai
  primary key (plan_id, feature)
);

create table subscriptions (
  user_id                uuid primary key references profiles on delete cascade,
  plan_id                text not null references plans,
  stripe_customer_id     text not null,
  stripe_subscription_id text unique,
  status                 text not null,   -- miroir Stripe : active|trialing|past_due|canceled|incomplete
  current_period_end     timestamptz,
  updated_at             timestamptz default now()
);
-- absence de ligne = free
```

`entitlements` est **l'unique** définition des droits. Client et Edge
Functions interrogent `has(feature)` ; aucun `plan === 'pro'` dans le code.

### 4.3 Crédits

```sql
create table credit_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles on delete cascade,
  delta      int not null,
  reason     text not null,   -- monthly_grant|purchase|ai.arztbrief|ai.voice|community_protocol|league_reward|refund
  ref        text not null,   -- id de l'objet consommateur ou de l'événement Stripe
  created_at timestamptz default now(),
  unique (user_id, reason, ref)
);
create materialized view credit_balances as
  select user_id, sum(delta) as balance from credit_ledger group by user_id;
-- rafraîchie par trigger après insert
```

### 4.4 Contenu

```sql
create table content_versions (
  version      int primary key,
  published_at timestamptz default now(),
  notes        text
);

create table content_items (
  id      text primary key,          -- 'case-diabetes','fw-copd','fb-<slug>',…
  kind    text not null,             -- case|fachwissen|fachbegriff|aufklaerung|guide|muster
  tier    int  not null default 1,   -- 1 free, 2 pro, 3 premium
  version int  not null references content_versions,
  payload jsonb not null,            -- l'objet TS actuel, tel quel
  deleted boolean not null default false
);
create index on content_items (kind, tier);
create index on content_items (version);
```

Publication : `app/scripts/publishContent.mjs` lit les fichiers TS validés
par la CI, attribue le `tier` et pousse un nouveau `version`. Règle de tier :
- **cas** : champ `tier` optionnel dans `seedCases.ts`, défaut 2 ; ~12 cas
  (un par spécialité majeure) marqués 1 ;
- **contenus dérivés** (fiche Fachwissen, Aufklärung, Fachbegriff) : tier
  minimal des cas qui les référencent — le Free est un *échantillon complet*
  (12 cas avec leur fiche, leurs termes, leurs Aufklärungen), pas un catalogue
  de fiches offert. Sans cas Free → 2 ;
- **Fachbegriffe** : Free = spécialité `Allgemein` (vocabulaire de base, ~1 200
  termes) ; les termes de spécialité sont Pro — le JSON n'a pas de lien
  terme ↔ cas, et « spécialité ayant un cas Free » ouvrirait 91 % du glossaire ;
- **guides** : 1. La CI reste
la porte de qualité ; la base est un miroir.

### 4.5 Progression

```sql
create table progress_events (
  id          uuid primary key,                 -- généré CLIENT
  user_id     uuid not null references profiles on delete cascade,
  type        text not null,                    -- simulation.completed|srs.reviewed|plan.done|case.layer_reached|program.configured
  subject_id  text,                             -- caseId, fachbegriffId, planId
  payload     jsonb not null,
  occurred_at timestamptz not null,             -- horloge client
  received_at timestamptz not null default now()
);
create index on progress_events (user_id, occurred_at);
create index on progress_events (user_id, type, subject_id);
```

Insert-only ; `on conflict (id) do nothing`. Projections (client, et serveur
plus tard) : état SRS d'un terme = dernier `srs.reviewed` par `occurred_at` ;
streak/stats = agrégats sur `simulation.completed`.

### 4.6 Idempotence Stripe

```sql
create table stripe_events (event_id text primary key, received_at timestamptz default now());
```

### 4.7 Non synchronisé (local uniquement)

Bogen en cours, session de simulation en pause (`simSession`), préférences
d'affichage, assistance/couche/Muster choisis. Éphémère ou par appareil.

### 4.8 RLS

| Table | Lecture | Écriture |
|---|---|---|
| `profiles` | `id = auth.uid()` | UPDATE `id = auth.uid()` (colonnes de profil) |
| `subscriptions`, `credit_ledger`, `stripe_events` | `user_id = auth.uid()` (ledger, subs) | **Edge Functions uniquement** (service role) |
| `content_items` | `tier <= tier_of(auth.uid())` ; anonyme = 1 ; `deleted` inclus (pour purger) | Edge Functions / script de publication |
| `progress_events` | `user_id = auth.uid()` | INSERT `user_id = auth.uid()` ; pas d'UPDATE/DELETE |
| `plans`, `entitlements`, `content_versions` | publique | admin |

`tier_of(uid)` : fonction SQL `security definer` qui lit `subscriptions` →
`entitlements('content.tier')`, 1 par défaut.

## 5. Composants client

Quatre modules dans `app/src/lib/`, chacun consommé par son interface seule.

### `auth/`
```ts
useSession(): { user: User | null; status: 'anonymous' | 'authenticated' | 'loading' }
signInWithMagicLink(email: string): Promise<void>
signInWithGoogle(): Promise<void>
signOut(): Promise<void>
```
Enveloppe Supabase Auth. L'anonyme est un état normal (tier 1).

### `entitlements/`
```ts
useEntitlements(): { plan: PlanId; has(feature: string): boolean; limit(feature: string): number | null; credits: number; refresh(): Promise<void> }
```
Charge `plans` + `entitlements` + `subscriptions` (ligne propre) +
`credit_balances` ; cache dans `meta` ; s'abonne en Realtime à sa ligne
`subscriptions` et à `credit_ledger` pour se rafraîchir sans rechargement.

### `content/`
```ts
contentLoader.sync(): Promise<{ version: number; changed: number }>
```
`GET /content?since=<meta.contentVersion>` → upsert dans les tables Dexie
existantes, suppression des `deleted`, **purge des lignes dont le tier n'est
plus autorisé** (le serveur ne les renvoie pas ; le client compare son cache
au tier courant), puis `wireLinks()` existant, puis `meta.contentVersion =
version`. Remplace `ensureSeeded()`. Déclencheurs : démarrage, changement
d'entitlement, bouton « Mettre à jour le contenu ». Hors ligne : no-op.

### `sync/`
```ts
syncQueue.push(event: Omit<ProgressEvent,'id'|'user_id'|'received_at'>): Promise<void>
syncQueue.flush(): Promise<{ acked: number; rejected: number }>
syncQueue.pull(since?: Date): Promise<number>
```
Tables Dexie : `progress_events` (miroir local, source des projections),
`outbox` (non acquittés). `push` = écrit les deux. `flush` = `POST /events`
par lots de 100 ; 2xx → retire de l'outbox ; 4xx → marque `rejected`,
journalise, retire ; 5xx/réseau → garde, backoff exponentiel (1 s → 5 min).
Déclencheurs : `online`, fin de simulation, intervalle 2 min si outbox non
vide. `pull` au démarrage et après chaque `flush`.

### Écrans nouveaux (frontend, hors modules)

Connexion (e-mail / Google), profilage 4 champs, page Compte (plan, crédits,
lien Portal, export JSON, suppression), paywall contextuel (composant
`<Gate feature="…">` qui rend l'enfant ou l'offre), pastille hors-ligne /
synchronisé dans la barre, écran unique « connexion requise au premier
lancement ».

## 6. Edge Functions

| Fonction | Rôle | Entrée validée (Zod) |
|---|---|---|
| `content` | Delta de contenu selon tier | `since: int` |
| `events` | Ingestion d'événements | `events: ProgressEvent[]` (≤ 100), types connus, payload par type |
| `checkout` | Crée une session Stripe Checkout | `plan: 'pro' \| 'premium'` |
| `portal` | Lien Customer Portal | — |
| `stripe-webhook` | Miroir des abonnements + grant mensuel | signature Stripe ; idempotence `stripe_events` |
| `delete-account` | Stripe cancel → cascade → e-mail | confirmation |
| `credits-consume` *(interne)* | Débit atomique après succès IA — utilisé par les sous-projets IA | `reason, ref, amount` |

Règle : `past_due` conserve les droits Pro 7 jours (constante serveur).

## 7. Flux

**Fin de simulation** : `SimulationRunner.finish()` → `syncQueue.push(simulation.completed)` → Dexie immédiat (UI) + outbox → `flush()` → ack → outbox vidée. Hors ligne : reste en outbox, rejoué à `online`.

**Paiement** : pricing → `checkout` → Stripe Checkout → retour `/merci` → webhook → `stripe-webhook` (signature, idempotence, upsert `subscriptions`, `monthly_grant` si nouveau cycle) → Realtime → `useEntitlements.refresh()` → `contentLoader.sync()` → contenu Pro visible sans rechargement.

**Migration depuis la bêta** : au premier lancement, si des profils locaux existent : « Créer mon compte et reprendre ma progression » (profil actif → `progress_events` → push) ou « Plus tard » (invité). Autres profils : export JSON.

## 8. Erreurs et cas limites

| Situation | Comportement |
|---|---|
| Hors ligne, cache présent | Tout fonctionne ; pastille ; rejeu à la reconnexion |
| Hors ligne, cache vide (1er lancement) | Écran bloquant unique + réessayer |
| Événement rejeté 4xx | `rejected`, journalisé, retiré ; pas de rejeu infini |
| 5xx / réseau | Conservé, backoff exponentiel |
| `past_due` | Droits conservés 7 j + bandeau + lien Portal ; puis Free **sans perte de données** |
| Annulation / expiration | Free en fin de période ; purge du cache tier > 1 au prochain `sync()` |
| Webhook dupliqué | `stripe_events` insert-or-ignore avant traitement |
| Crédits insuffisants | 409 **avant** l'appel IA ; débit écrit après succès, même transaction |
| SRS concurrent deux appareils | Deux événements conservés ; projection = plus récent |
| Horloge client fausse | `received_at` fait foi (quotas, ligue) ; `occurred_at` pour l'affichage |
| Suppression de compte | Export proposé → Stripe cancel → cascade → confirmation |

## 9. Sécurité

1. Aucun secret côté client (anon key seule) ; Stripe, IA, service role en Edge Functions.
2. RLS sur toutes les tables, **prouvée en CI** (deux utilisateurs de test : A ne lit ni n'écrit B → 0 ligne).
3. Seules les Edge Functions écrivent `subscriptions`, `credit_ledger`, `content_items`, `stripe_events`.
4. Rate limiting par utilisateur sur `events` et sur toute fonction IA.
5. Validation Zod à l'entrée de chaque fonction ; 400 sinon, jamais stocké.

## 10. Tests

**CI (chaque push)**
- Vitest : `syncQueue` (push/flush/rejet/backoff/idempotence), `contentLoader` (delta, `deleted`, purge de tier), `useEntitlements` (matrice fixture), projection SRS (last-write-wins).
- Supabase local (`supabase start`) : migrations up/down ; **tests RLS** ; Edge Functions en HTTP réel ; `stripe trigger` pour création / renouvellement / échec / résiliation / remboursement → état attendu de `subscriptions` et du ledger.
- Contrat : `docs/contracts/openapi.yaml` ↔ réponses réelles.

**Parcours (pré-release, playwright headless)**
- Invité → lien magique → profilage → contenu Free → simulation → événement en base → Checkout test → contenu Pro sans rechargement → Portal → résiliation → Free.
- Même parcours avec `setOffline(true)` au milieu : simulation terminée, outbox vidée à la reconnexion.

**Jugement (à la demande)** : `ops-security-auditor` (schéma, fonctions) ; `fsp-ux-auditor` + avocat de l'utilisateur (inscription, paywall).

## 11. Critères d'acceptation

- [ ] Un invité sans compte joue une simulation complète hors ligne après un premier chargement.
- [ ] Un compte créé par lien magique voit son profil (4 champs) et sa progression sur un second appareil.
- [ ] Un événement produit hors ligne apparaît en base après reconnexion, une seule fois même si rejoué.
- [ ] Le contenu tier 2 n'est **jamais** présent dans le bundle ni dans le cache d'un compte Free (vérifié par test).
- [ ] Un paiement test Stripe débloque le contenu Pro sans rechargement ; une résiliation le retire en fin de période.
- [ ] Le solde de crédits est la somme du ledger ; une double soumission du même `(reason, ref)` est refusée.
- [ ] Les tests RLS prouvent l'isolation entre deux utilisateurs.
- [ ] `docs/contracts/schema.sql`, `openapi.yaml`, `entitlements.md`, `sync-protocol.md` existent et sont à jour.

## 12. Impacts sur l'existant

- `data/seed.ts` : `ensureSeeded()` → `contentLoader.sync()` ; `SEED_VERSION` devient `content_versions`.
- `store/profile.ts` et écrans de profils : supprimés après migration.
- Écritures dans `simulations`, `fachbegriffe.srs`, `plan`, `cases.layerProgress` : passent par `syncQueue.push`.
- `hooks/useData.ts` : `useSimulations` lit `progress_events` projetés.
- `db/db.ts` : tables `progress_events`, `outbox` ; `simulations` conservée comme projection.
