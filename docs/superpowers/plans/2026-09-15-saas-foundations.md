# Fondations SaaS Doctopus — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer FSP-Cockpit en socle SaaS — compte, profilage, contenu servi par plan, progression synchronisée, plans Free/Pro/Premium avec crédits, Stripe — sans perdre le hors-ligne ni toucher aux types de contenu.

**Architecture:** Supabase EU (Postgres + RLS + Auth + Edge Functions + Realtime) est la vérité pour l'identité, les droits et la progression ; le client React/Dexie reste hors-ligne d'abord. Le contenu sort du bundle vers `content_items` (payload jsonb, tier par ligne) ; la progression devient un journal d'événements additifs rejoués depuis une outbox Dexie. Quatre modules client isolés (`auth`, `entitlements`, `content`, `sync`) exposent des interfaces que le reste de l'app consomme sans connaître le serveur.

**Tech Stack:** React 18 · TypeScript · Vite · Dexie 4 · Zustand · `@supabase/supabase-js` v2 · Supabase CLI (local) · Deno Edge Functions · Zod · Stripe (Checkout, Portal, webhooks, `stripe` CLI) · Vitest + fake-indexeddb · playwright-cli.

**Spec:** `docs/superpowers/specs/2026-09-15-saas-foundations-design.md`

## Global Constraints

- Types de contenu (`Case`, `Fachwissen`, `Fachbegriff`, …) **inchangés** ; `payload jsonb` = l'objet TS tel quel (spec D8).
- Aucun `plan === 'pro'` dans le code : uniquement `has(feature)` / `limit(feature)` (spec §4.2).
- Aucun secret côté client ; seule la `anon key` Supabase est dans le bundle (spec §9.1).
- Le client n'écrit jamais dans `subscriptions`, `credit_ledger`, `content_items`, `stripe_events` (spec §9.3).
- `progress_events` : insert-only, `id` généré client, `on conflict do nothing` (spec §4.5).
- Grâce `past_due` : **7 jours**, constante serveur `PAST_DUE_GRACE_DAYS = 7` (spec §8).
- Free = tier 1 ; défaut d'un cas = tier 2 ; ~12 cas marqués `tier: 1` (spec §4.4). **Contenus dérivés** (fiche, Aufklärung, terme) : tier minimal des cas qui les référencent ; guides et termes sans pathologie = 1.
- Tous les validateurs `app/scripts/check*.mjs` et la CI restent verts ; vérifier par **code de sortie**.
- Commits stagés fichier par fichier (Mehdi édite en parallèle) ; pas de `git add -A`.
- Chemins relatifs à `app/` sauf mention contraire ; `supabase/` vit à `app/supabase/`.

---

## File Structure

```
app/
├── supabase/
│   ├── config.toml                          (Task 1)
│   ├── migrations/
│   │   ├── 20260915000001_identity.sql      (Task 2)   profiles + RLS
│   │   ├── 20260915000002_plans.sql         (Task 3)   plans, entitlements, subscriptions, tier_of()
│   │   ├── 20260915000003_credits.sql       (Task 3)   credit_ledger, credit_balances
│   │   ├── 20260915000004_content.sql       (Task 8)   content_versions, content_items
│   │   ├── 20260915000005_events.sql        (Task 12)  progress_events
│   │   └── 20260915000006_stripe.sql        (Task 17)  stripe_events
│   ├── seed.sql                             (Task 3)   plans + entitlements
│   ├── functions/
│   │   ├── _shared/
│   │   │   ├── supabase.ts                  (Task 9)   clients anon / service
│   │   │   ├── validate.ts                  (Task 9)   Zod → 400
│   │   │   └── ratelimit.ts                 (Task 13)
│   │   ├── content/index.ts                 (Task 9)
│   │   ├── events/index.ts                  (Task 13)
│   │   ├── checkout/index.ts                (Task 18)
│   │   ├── portal/index.ts                  (Task 18)
│   │   ├── stripe-webhook/index.ts          (Task 19)
│   │   ├── credits-consume/index.ts         (Task 20)
│   │   └── delete-account/index.ts          (Task 21)
│   └── tests/
│       ├── rls.test.ts                      (Task 4)   A ne lit pas B
│       ├── content.test.ts                  (Task 10)
│       ├── events.test.ts                   (Task 14)
│       └── stripe.test.ts                   (Task 19)
├── scripts/
│   ├── publishContent.mjs                   (Task 11)
│   └── testRls.mjs                          (Task 4)   lancé en CI
├── src/
│   ├── lib/
│   │   ├── supabase.ts                      (Task 5)   client unique
│   │   ├── auth/
│   │   │   ├── session.ts                   (Task 5)   useSession, signIn*, signOut
│   │   │   └── session.test.ts
│   │   ├── entitlements/
│   │   │   ├── index.ts                     (Task 6)   useEntitlements
│   │   │   ├── matrix.ts                    (Task 6)   has/limit purs
│   │   │   └── matrix.test.ts
│   │   ├── content/
│   │   │   ├── loader.ts                    (Task 10)  contentLoader.sync
│   │   │   ├── apply.ts                     (Task 10)  upsert/purge purs
│   │   │   └── apply.test.ts
│   │   └── sync/
│   │       ├── events.ts                    (Task 12)  types + factories
│   │       ├── queue.ts                     (Task 12)  syncQueue
│   │       ├── queue.test.ts
│   │       ├── projections.ts               (Task 15)  srs / simulations depuis events
│   │       └── projections.test.ts
│   ├── db/db.ts                             (Task 12)  version 2 : progress_events, outbox
│   ├── features/
│   │   ├── account/
│   │   │   ├── SignInPage.tsx               (Task 7)
│   │   │   ├── OnboardingPage.tsx           (Task 7)   4 champs
│   │   │   ├── AccountPage.tsx              (Task 18)  plan, crédits, portal, export, suppression
│   │   │   └── MigrationPrompt.tsx          (Task 16)
│   │   └── pricing/PricingPage.tsx          (Task 18)
│   ├── components/
│   │   ├── Gate.tsx                         (Task 6)   <Gate feature>
│   │   └── SyncBadge.tsx                    (Task 12)
│   └── main.tsx                             (Task 10, 16)
├── vitest.config.ts                         (Task 5)
└── .env.example                             (Task 5)
docs/contracts/
├── schema.sql                               (Task 22, généré)
├── openapi.yaml                             (Task 22)
├── entitlements.md                          (Task 22)
└── sync-protocol.md                         (Task 22)
```

---

## Tranche A — Socle : Supabase local, identité, droits (Tasks 1–7)

### Task 1: Projet Supabase local et outillage de test

**Files:**
- Create: `app/supabase/config.toml` (généré)
- Modify: `app/package.json` (scripts + devDeps)
- Modify: `.gitignore` (racine)

**Interfaces:**
- Produces: `npm run db:start`, `npm run db:reset`, `npm run db:test` ; Supabase local sur `http://127.0.0.1:54321`.

- [ ] **Step 1: Installer le CLI Supabase et Vitest**

```bash
cd app && npm i -D supabase vitest fake-indexeddb @vitest/coverage-v8
npx supabase --version
```
Expected: une version `2.x` s'affiche.

- [ ] **Step 2: Initialiser le projet local**

```bash
cd app && npx supabase init
```
Expected: `app/supabase/config.toml` créé. Ouvrir le fichier et s'assurer que `[auth] enable_signup = true` et `[auth.email] enable_confirmations = false` (les liens magiques ne sont pas cliqués en test).

- [ ] **Step 3: Ajouter les scripts npm**

Dans `app/package.json`, section `scripts`, ajouter :
```json
"db:start": "supabase start",
"db:stop": "supabase stop",
"db:reset": "supabase db reset",
"db:test": "vitest run --dir supabase/tests",
"test": "vitest run --dir src",
"test:watch": "vitest --dir src"
```

- [ ] **Step 4: Ignorer les artefacts locaux**

Ajouter à `.gitignore` (racine) :
```
app/supabase/.branches
app/supabase/.temp
app/.env
app/.env.local
```

- [ ] **Step 5: Démarrer et vérifier**

```bash
cd app && npm run db:start
```
Expected: sortie listant `API URL: http://127.0.0.1:54321`, `anon key: eyJ…`, `service_role key: eyJ…`. Noter ces trois valeurs pour `.env`.

- [ ] **Step 6: Commit**

```bash
git add app/package.json app/package-lock.json app/supabase/config.toml .gitignore
git commit -m "chore(saas): projet Supabase local + Vitest"
```

---

### Task 2: Migration identité — `profiles` + RLS

**Files:**
- Create: `app/supabase/migrations/20260915000001_identity.sql`

**Interfaces:**
- Produces: table `public.profiles` (colonnes de spec §4.1) ; trigger `handle_new_user` qui insère une ligne vide à l'inscription (les 4 champs restent NULL jusqu'au profilage → ils sont donc **nullables** en base ; l'obligation est portée par l'UI et par `profile_completed()`).

- [ ] **Step 1: Écrire la migration**

```sql
-- 20260915000001_identity.sql
create table public.profiles (
  id               uuid primary key references auth.users on delete cascade,
  display_name     text,
  target_land      text,
  exam_date        date,
  language_level   text check (language_level in ('B2','C1','C1+')),
  procedure_stage  text check (procedure_stage in
                     ('approbation_requested','gleichwertigkeit','fsp_planned','fsp_failed_once')),
  origin_specialty text,
  diploma_country  text,
  kp_intended      boolean,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create or replace function public.profile_completed(p public.profiles) returns boolean
language sql immutable as $$
  select p.target_land is not null and p.language_level is not null and p.procedure_stage is not null
$$;

-- une ligne de profil par utilisateur, créée à l'inscription
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
create policy "profiles: own read"   on public.profiles for select using (id = auth.uid());
create policy "profiles: own update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- pas d'insert/delete client : le trigger et la cascade s'en chargent
```

- [ ] **Step 2: Appliquer**

```bash
cd app && npm run db:reset
```
Expected: `Applying migration 20260915000001_identity.sql` puis `Finished supabase db reset`.

- [ ] **Step 3: Vérifier le trigger à la main**

```bash
cd app && npx supabase db query "insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000001','a@test.dev'); select count(*) from public.profiles;"
```
Expected: `count = 1`.

- [ ] **Step 4: Commit**

```bash
git add app/supabase/migrations/20260915000001_identity.sql
git commit -m "feat(saas): table profiles + trigger d'inscription + RLS"
```

---

### Task 3: Migrations plans / entitlements / subscriptions / crédits + seed

**Files:**
- Create: `app/supabase/migrations/20260915000002_plans.sql`
- Create: `app/supabase/migrations/20260915000003_credits.sql`
- Create: `app/supabase/seed.sql`

**Interfaces:**
- Produces: `plans`, `entitlements`, `subscriptions`, fonction `tier_of(uid uuid) returns int`, `credit_ledger`, vue matérialisée `credit_balances`, fonction `credit_balance(uid) returns int`.

- [ ] **Step 1: Migration plans**

```sql
-- 20260915000002_plans.sql
create table public.plans (
  id              text primary key,
  stripe_price_id text,
  monthly_credits int not null default 0
);
create table public.entitlements (
  plan_id     text references public.plans on delete cascade,
  feature     text not null,
  limit_value int,
  primary key (plan_id, feature)
);
create table public.subscriptions (
  user_id                uuid primary key references public.profiles on delete cascade,
  plan_id                text not null references public.plans,
  stripe_customer_id     text not null,
  stripe_subscription_id text unique,
  status                 text not null check (status in ('active','trialing','past_due','canceled','incomplete')),
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now()
);
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- Plan effectif : active/trialing → plan ; past_due → plan pendant 7 jours de grâce ; sinon free.
create or replace function public.effective_plan(uid uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when s.status in ('active','trialing') then s.plan_id
      when s.status = 'past_due' and s.updated_at > now() - interval '7 days' then s.plan_id
      else 'free' end
    from public.subscriptions s where s.user_id = uid
  ), 'free')
$$;

create or replace function public.tier_of(uid uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((
    select e.limit_value from public.entitlements e
    where e.plan_id = public.effective_plan(uid) and e.feature = 'content.tier'
  ), 1)
$$;

alter table public.plans          enable row level security;
alter table public.entitlements   enable row level security;
alter table public.subscriptions  enable row level security;
create policy "plans: public read"        on public.plans        for select using (true);
create policy "entitlements: public read" on public.entitlements for select using (true);
create policy "subscriptions: own read"   on public.subscriptions for select using (user_id = auth.uid());
-- aucune policy d'écriture : seules les Edge Functions (service role) écrivent
```

- [ ] **Step 2: Migration crédits**

```sql
-- 20260915000003_credits.sql
create table public.credit_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles on delete cascade,
  delta      int  not null,
  reason     text not null check (reason in
               ('monthly_grant','purchase','ai.arztbrief','ai.voice','community_protocol','league_reward','refund','demo_grant')),
  ref        text not null,
  created_at timestamptz not null default now(),
  unique (user_id, reason, ref)
);
create index on public.credit_ledger (user_id);

create materialized view public.credit_balances as
  select user_id, sum(delta)::int as balance from public.credit_ledger group by user_id;
create unique index on public.credit_balances (user_id);

create or replace function public.refresh_credit_balances() returns trigger
language plpgsql security definer as $$
begin
  refresh materialized view concurrently public.credit_balances;
  return null;
end $$;
create trigger credit_ledger_refresh after insert or delete on public.credit_ledger
  for each statement execute function public.refresh_credit_balances();

create or replace function public.credit_balance(uid uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce((select balance from public.credit_balances where user_id = uid), 0)
$$;

alter table public.credit_ledger enable row level security;
create policy "ledger: own read" on public.credit_ledger for select using (user_id = auth.uid());
-- la vue matérialisée n'a pas de RLS : on ne l'expose pas, on passe par credit_balance(uid)
revoke all on public.credit_balances from anon, authenticated;
```

- [ ] **Step 3: Seed des plans**

```sql
-- seed.sql
insert into public.plans (id, stripe_price_id, monthly_credits) values
  ('free',    null,              0),
  ('pro',     'price_PRO_TODO',  200),
  ('premium', 'price_PREM_TODO', 1000)
on conflict (id) do update set monthly_credits = excluded.monthly_credits;

insert into public.entitlements (plan_id, feature, limit_value) values
  ('free',    'content.tier',    1),
  ('free',    'credits.monthly', 0),
  ('pro',     'content.tier',    2),
  ('pro',     'sim.online',      null),
  ('pro',     'league',          null),
  ('pro',     'ai.arztbrief',    null),
  ('pro',     'credits.monthly', 200),
  ('premium', 'content.tier',    3),
  ('premium', 'sim.online',      null),
  ('premium', 'league',          null),
  ('premium', 'ai.arztbrief',    null),
  ('premium', 'ai.voice',        null),
  ('premium', 'credits.monthly', 1000)
on conflict (plan_id, feature) do update set limit_value = excluded.limit_value;
```
Les `price_*_TODO` sont remplacés en Task 18 par les vrais ids Stripe test.

- [ ] **Step 4: Appliquer et vérifier**

```bash
cd app && npm run db:reset && npx supabase db query "select public.tier_of('00000000-0000-0000-0000-000000000001'::uuid) as tier, public.credit_balance('00000000-0000-0000-0000-000000000001'::uuid) as credits;"
```
Expected: `tier = 1`, `credits = 0` (utilisateur sans abonnement — le seed.sql est rejoué par `db reset` ; l'utilisateur de test de Task 2 doit être recréé s'il a disparu, ce qui est attendu).

- [ ] **Step 5: Commit**

```bash
git add app/supabase/migrations/20260915000002_plans.sql app/supabase/migrations/20260915000003_credits.sql app/supabase/seed.sql
git commit -m "feat(saas): plans, entitlements, subscriptions, ledger de crédits, tier_of()"
```

---

### Task 4: Tests RLS automatisés (A ne lit pas B)

**Files:**
- Create: `app/supabase/tests/helpers.ts`
- Create: `app/supabase/tests/rls.test.ts`
- Create: `app/scripts/testRls.mjs`
- Modify: `.github/workflows/quality.yml`

**Interfaces:**
- Produces: `createTestUser(email): Promise<{ id, client }>` (client Supabase authentifié) ; `serviceClient()` ; job CI `rls`.

- [ ] **Step 1: Helper de test**

```ts
// app/supabase/tests/helpers.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
export const ANON = process.env.SUPABASE_ANON_KEY!;
export const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const serviceClient = (): SupabaseClient => createClient(URL, SERVICE, { auth: { persistSession: false } });

/** Crée (ou récupère) un utilisateur et rend un client authentifié en son nom. */
export async function createTestUser(email: string): Promise<{ id: string; client: SupabaseClient }> {
  const admin = serviceClient();
  const password = 'test-password-123';
  const { data: created } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  const id = created.user?.id ?? (await admin.auth.admin.listUsers()).data.users.find((u) => u.email === email)!.id;
  const client = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return { id, client };
}
```

- [ ] **Step 2: Écrire le test qui échoue (avant que les tables de Task 3 aient une policy — il doit passer déjà ; le test « rouge » ici est celui d'une policy trop permissive qu'on simule)**

```ts
// app/supabase/tests/rls.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestUser, serviceClient } from './helpers';

let A: Awaited<ReturnType<typeof createTestUser>>;
let B: Awaited<ReturnType<typeof createTestUser>>;

beforeAll(async () => {
  A = await createTestUser('rls-a@test.dev');
  B = await createTestUser('rls-b@test.dev');
  const admin = serviceClient();
  await admin.from('profiles').update({ display_name: 'Alice', target_land: 'BW' }).eq('id', A.id);
  await admin.from('profiles').update({ display_name: 'Bob', target_land: 'BY' }).eq('id', B.id);
  await admin.from('credit_ledger').insert({ user_id: B.id, delta: 50, reason: 'demo_grant', ref: 'rls-test' });
});

describe('RLS — isolation entre utilisateurs', () => {
  it('A lit son profil et pas celui de B', async () => {
    const { data } = await A.client.from('profiles').select('id, display_name');
    expect(data?.map((p) => p.id)).toEqual([A.id]);
  });
  it('A ne peut pas modifier le profil de B (0 ligne, pas d\'erreur)', async () => {
    const { data } = await A.client.from('profiles').update({ display_name: 'Hacked' }).eq('id', B.id).select();
    expect(data).toEqual([]);
    const { data: b } = await serviceClient().from('profiles').select('display_name').eq('id', B.id).single();
    expect(b?.display_name).toBe('Bob');
  });
  it('A ne voit pas le ledger de B', async () => {
    const { data } = await A.client.from('credit_ledger').select('*');
    expect(data).toEqual([]);
  });
  it('A ne peut pas écrire dans le ledger', async () => {
    const { error } = await A.client.from('credit_ledger').insert({ user_id: A.id, delta: 999, reason: 'purchase', ref: 'x' });
    expect(error).not.toBeNull();
  });
  it('A ne peut pas se créer un abonnement', async () => {
    const { error } = await A.client.from('subscriptions').insert({ user_id: A.id, plan_id: 'premium', stripe_customer_id: 'cus_fake', status: 'active' });
    expect(error).not.toBeNull();
  });
  it('plans et entitlements sont lisibles anonymement', async () => {
    const { data } = await A.client.from('entitlements').select('plan_id, feature');
    expect(data!.length).toBeGreaterThan(5);
  });
});
```

- [ ] **Step 3: Script de lancement qui exporte les clés locales**

```js
// app/scripts/testRls.mjs — lance les tests d'intégration avec les clés du Supabase local
import { execSync } from 'node:child_process';
const status = execSync('npx supabase status -o env', { encoding: 'utf8' });
const env = Object.fromEntries(status.split('\n').filter((l) => l.includes('=')).map((l) => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim().replace(/^"|"$/g, '')]; }));
process.env.SUPABASE_URL = env.API_URL;
process.env.SUPABASE_ANON_KEY = env.ANON_KEY;
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SERVICE_ROLE_KEY;
execSync('npx vitest run --dir supabase/tests', { stdio: 'inherit', env: process.env });
```

- [ ] **Step 4: Lancer**

```bash
cd app && npm i @supabase/supabase-js && node scripts/testRls.mjs; echo "exit=$?"
```
Expected: `6 passed`, `exit=0`.

- [ ] **Step 5: Job CI**

Ajouter à `.github/workflows/quality.yml` un troisième job :
```yaml
  rls:
    name: RLS & intégration Supabase
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: app } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: app/package-lock.json }
      - uses: supabase/setup-cli@v1
        with: { version: latest }
      - run: npm ci
      - run: supabase start
      - run: node scripts/testRls.mjs
      - if: always()
        run: supabase stop
```

- [ ] **Step 6: Commit**

```bash
git add app/supabase/tests/helpers.ts app/supabase/tests/rls.test.ts app/scripts/testRls.mjs .github/workflows/quality.yml app/package.json app/package-lock.json
git commit -m "test(saas): RLS prouvée — A ne lit ni n'écrit B ; job CI Supabase local"
```

---

### Task 5: Client Supabase + module `auth/`

**Files:**
- Create: `app/src/lib/supabase.ts`
- Create: `app/src/lib/auth/session.ts`
- Create: `app/src/lib/auth/session.test.ts`
- Create: `app/vitest.config.ts`
- Create: `app/.env.example`

**Interfaces:**
- Produces: `supabase: SupabaseClient` (singleton) ; `useSession(): { user, status }` ; `signInWithMagicLink(email)`, `signInWithGoogle()`, `signOut()` ; `getAccessToken(): Promise<string|null>`.

- [ ] **Step 1: Config Vitest + env**

```ts
// app/vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: { environment: 'jsdom', setupFiles: ['fake-indexeddb/auto'], globals: true },
});
```
```bash
cd app && npm i -D jsdom
```
```
# app/.env.example
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=copier-depuis-supabase-status
```
Créer `app/.env` avec les valeurs réelles de `npx supabase status` (non commité).

- [ ] **Step 2: Test du store de session (échoue)**

```ts
// app/src/lib/auth/session.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const listeners: Array<(ev: string, s: { user: { id: string } } | null) => void> = [];
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn((cb) => { listeners.push(cb); return { data: { subscription: { unsubscribe() {} } } }; }),
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
}));

import { useSession, signInWithMagicLink, initSession } from './session';

describe('session', () => {
  beforeEach(() => { listeners.length = 0; useSession.setState({ user: null, status: 'loading' }); });

  it('démarre en loading puis passe anonymous sans session', async () => {
    expect(useSession.getState().status).toBe('loading');
    await initSession();
    expect(useSession.getState().status).toBe('anonymous');
  });

  it('passe authenticated quand Supabase émet SIGNED_IN', async () => {
    await initSession();
    listeners[0]('SIGNED_IN', { user: { id: 'u1' } });
    expect(useSession.getState().status).toBe('authenticated');
    expect(useSession.getState().user?.id).toBe('u1');
  });

  it('signInWithMagicLink envoie un OTP e-mail avec redirection', async () => {
    const { supabase } = await import('@/lib/supabase');
    await signInWithMagicLink('x@y.z');
    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({ email: 'x@y.z', options: { emailRedirectTo: expect.stringContaining('/auth/callback') } });
  });
});
```

- [ ] **Step 3: Lancer — doit échouer**

```bash
cd app && npx vitest run src/lib/auth; echo "exit=$?"
```
Expected: FAIL, `Cannot find module './session'`.

- [ ] **Step 4: Implémentation**

```ts
// app/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL as string;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
if (!url || !anon) throw new Error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants (voir .env.example)');
export const supabase = createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true } });
```
```ts
// app/src/lib/auth/session.ts
import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type SessionStatus = 'loading' | 'anonymous' | 'authenticated';
interface SessionState { user: User | null; status: SessionStatus }

/** État de session — l'anonyme est un état normal (tier 1), pas une erreur. */
export const useSession = create<SessionState>(() => ({ user: null, status: 'loading' }));

const apply = (user: User | null) => useSession.setState({ user, status: user ? 'authenticated' : 'anonymous' });

/** À appeler une fois au démarrage. */
export async function initSession(): Promise<void> {
  const { data } = await supabase.auth.getSession();
  apply(data.session?.user ?? null);
  supabase.auth.onAuthStateChange((_event, session) => apply(session?.user ?? null));
}

const redirect = () => `${window.location.origin}${import.meta.env.BASE_URL ?? '/'}#/auth/callback`;

export const signInWithMagicLink = (email: string) =>
  supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirect() } }).then(({ error }) => { if (error) throw error; });

export const signInWithGoogle = () =>
  supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirect() } }).then(({ error }) => { if (error) throw error; });

export const signOut = () => supabase.auth.signOut().then(({ error }) => { if (error) throw error; });

export const getAccessToken = async (): Promise<string | null> => (await supabase.auth.getSession()).data.session?.access_token ?? null;
```

- [ ] **Step 5: Lancer — doit passer**

```bash
cd app && npx vitest run src/lib/auth; echo "exit=$?"
```
Expected: `3 passed`, `exit=0`.

- [ ] **Step 6: Commit**

```bash
git add app/vitest.config.ts app/.env.example app/src/lib/supabase.ts app/src/lib/auth/session.ts app/src/lib/auth/session.test.ts app/package.json app/package-lock.json
git commit -m "feat(saas): client Supabase + module auth (magic link, Google, session store)"
```

---

### Task 6: Module `entitlements/` + composant `<Gate>`

**Files:**
- Create: `app/src/lib/entitlements/matrix.ts`
- Create: `app/src/lib/entitlements/matrix.test.ts`
- Create: `app/src/lib/entitlements/index.ts`
- Create: `app/src/components/Gate.tsx`

**Interfaces:**
- Consumes: `useSession`, `supabase`.
- Produces: `buildMatrix(rows): Matrix` ; `has(matrix, plan, feature): boolean` ; `limit(matrix, plan, feature): number|null` ; `useEntitlements(): { plan, has, limit, credits, refresh }` ; `loadEntitlements(): Promise<void>` ; `<Gate feature="…" fallback={…}>`.

- [ ] **Step 1: Test des fonctions pures (échoue)**

```ts
// app/src/lib/entitlements/matrix.test.ts
import { describe, it, expect } from 'vitest';
import { buildMatrix, has, limit } from './matrix';

const rows = [
  { plan_id: 'free', feature: 'content.tier', limit_value: 1 },
  { plan_id: 'pro', feature: 'content.tier', limit_value: 2 },
  { plan_id: 'pro', feature: 'sim.online', limit_value: null },
  { plan_id: 'pro', feature: 'credits.monthly', limit_value: 200 },
];
const m = buildMatrix(rows);

describe('entitlements matrix', () => {
  it('has : vrai si la feature existe pour le plan (limit null = illimité)', () => {
    expect(has(m, 'pro', 'sim.online')).toBe(true);
    expect(has(m, 'free', 'sim.online')).toBe(false);
  });
  it('has : vrai si limit > 0', () => {
    expect(has(m, 'pro', 'credits.monthly')).toBe(true);
    expect(has(m, 'free', 'credits.monthly')).toBe(false);
  });
  it('limit : la valeur, null si illimité, 0 si absente', () => {
    expect(limit(m, 'pro', 'content.tier')).toBe(2);
    expect(limit(m, 'pro', 'sim.online')).toBeNull();
    expect(limit(m, 'free', 'league')).toBe(0);
  });
  it('un plan inconnu se comporte comme free', () => {
    expect(limit(m, 'gold', 'content.tier')).toBe(1);
  });
});
```

- [ ] **Step 2: Lancer — échoue**

```bash
cd app && npx vitest run src/lib/entitlements; echo "exit=$?"
```
Expected: FAIL, module introuvable.

- [ ] **Step 3: Implémentation**

```ts
// app/src/lib/entitlements/matrix.ts
export type PlanId = 'free' | 'pro' | 'premium' | (string & {});
export interface EntitlementRow { plan_id: string; feature: string; limit_value: number | null }
/** plan → feature → limit (null = illimité). Absence = pas le droit. */
export type Matrix = Record<string, Record<string, number | null>>;

export function buildMatrix(rows: EntitlementRow[]): Matrix {
  const m: Matrix = {};
  for (const r of rows) (m[r.plan_id] ??= {})[r.feature] = r.limit_value;
  return m;
}
const planOf = (m: Matrix, plan: string) => m[plan] ?? m['free'] ?? {};
export function limit(m: Matrix, plan: string, feature: string): number | null {
  const p = planOf(m, plan);
  return feature in p ? p[feature] : 0;
}
export function has(m: Matrix, plan: string, feature: string): boolean {
  const l = limit(m, plan, feature);
  return l === null || l > 0;
}
```
```ts
// app/src/lib/entitlements/index.ts
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/auth/session';
import { getMeta, setMeta } from '@/db/db';
import { buildMatrix, has as hasIn, limit as limitIn, type Matrix, type PlanId } from './matrix';

interface EntState { plan: PlanId; matrix: Matrix; credits: number; loaded: boolean }
const store = create<EntState>(() => ({ plan: 'free', matrix: {}, credits: 0, loaded: false }));

/** Charge la matrice publique, le plan effectif et le solde ; met en cache dans meta. */
export async function loadEntitlements(): Promise<void> {
  const cached = await getMeta<EntState | null>('entitlements', null);
  if (cached) store.setState({ ...cached, loaded: true });
  try {
    const { data: rows } = await supabase.from('entitlements').select('plan_id, feature, limit_value');
    const matrix = rows ? buildMatrix(rows) : store.getState().matrix;
    const uid = useSession.getState().user?.id;
    let plan: PlanId = 'free', credits = 0;
    if (uid) {
      // Wrappers sans argument : agissent uniquement sur auth.uid() (les
      // fonctions paramétrées sont révoquées côté client — revue Tasks 2-3).
      const [{ data: p }, { data: c }] = await Promise.all([
        supabase.rpc('my_plan'),
        supabase.rpc('my_credits'),
      ]);
      plan = (p as PlanId) ?? 'free'; credits = (c as number) ?? 0;
    }
    const next = { plan, matrix, credits, loaded: true };
    store.setState(next);
    await setMeta('entitlements', next);
  } catch { /* hors ligne : on garde le cache */ }
}

/** Realtime : se rafraîchit quand l'abonnement ou le ledger de l'utilisateur change. */
export function watchEntitlements(): () => void {
  const uid = useSession.getState().user?.id;
  if (!uid) return () => {};
  const ch = supabase.channel(`ent-${uid}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${uid}` }, () => loadEntitlements())
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'credit_ledger', filter: `user_id=eq.${uid}` }, () => loadEntitlements())
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}

export function useEntitlements() {
  const s = store();
  return {
    plan: s.plan, credits: s.credits, loaded: s.loaded,
    has: (feature: string) => hasIn(s.matrix, s.plan, feature),
    limit: (feature: string) => limitIn(s.matrix, s.plan, feature),
    refresh: loadEntitlements,
  };
}
export const getEntitlements = () => ({ ...store.getState(), has: (f: string) => hasIn(store.getState().matrix, store.getState().plan, f), limit: (f: string) => limitIn(store.getState().matrix, store.getState().plan, f) });
```
```tsx
// app/src/components/Gate.tsx
import type { ReactNode } from 'react';
import { useEntitlements } from '@/lib/entitlements';
/** Rend l'enfant si le plan a la feature, sinon le fallback (offre contextuelle). */
export function Gate({ feature, fallback = null, children }: { feature: string; fallback?: ReactNode; children: ReactNode }) {
  const { has } = useEntitlements();
  return <>{has(feature) ? children : fallback}</>;
}
```

- [ ] **Step 4: Lancer — passe**

```bash
cd app && npx vitest run src/lib/entitlements && npx tsc -b --noEmit; echo "exit=$?"
```
Expected: `4 passed`, tsc silencieux, `exit=0`.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/entitlements app/src/components/Gate.tsx
git commit -m "feat(saas): module entitlements (matrice unique, has/limit) + <Gate>"
```

---

### Task 7: Écrans connexion + profilage (4 champs) + route callback

**Files:**
- Create: `app/src/features/account/SignInPage.tsx`
- Create: `app/src/features/account/OnboardingPage.tsx`
- Create: `app/src/features/account/AuthCallback.tsx`
- Modify: `app/src/main.tsx` (routes ; appel `initSession()` et `loadEntitlements()` au boot)
- Modify: `app/src/components/Sidebar.tsx` (entrée « Compte » / « Se connecter »)

**Interfaces:**
- Consumes: `signInWithMagicLink`, `signInWithGoogle`, `useSession`, `supabase`, `loadEntitlements`.
- Produces: routes `/signin`, `/onboarding`, `/auth/callback` ; `saveProfile(fields)`.

- [ ] **Step 1: Page de connexion**

```tsx
// app/src/features/account/SignInPage.tsx
import { useState } from 'react';
import { signInWithMagicLink, signInWithGoogle } from '@/lib/auth/session';
import { Icon } from '@/components/icons';

export function SignInPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null);
    try { await signInWithMagicLink(email.trim()); setSent(true); }
    catch (err) { setError((err as Error).message); }
  };
  return (
    <div className="mx-auto max-w-md space-y-6 py-12">
      <div>
        <div className="label">Doctopus</div>
        <h1 className="text-2xl font-bold">Se connecter</h1>
        <p className="text-sm text-slate-500">Un lien par e-mail, pas de mot de passe. Ta progression te suit sur tous tes appareils.</p>
      </div>
      {sent ? (
        <div className="card p-4 text-sm">Lien envoyé à <b>{email}</b>. Ouvre-le sur cet appareil.</div>
      ) : (
        <form onSubmit={submit} className="card space-y-3 p-4">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ton@email.de" className="input w-full" autoFocus />
          <button type="submit" className="btn-primary w-full justify-center">Recevoir le lien</button>
          {error && <p className="text-xs text-signal-600">{error}</p>}
        </form>
      )}
      <button onClick={() => signInWithGoogle()} className="btn-outline w-full justify-center gap-2"><Icon name="google" className="h-4 w-4" />Continuer avec Google</button>
    </div>
  );
}
```
Si l'icône `google` n'existe pas dans `components/icons`, l'ajouter (SVG « G » monochrome, 16×16).

- [ ] **Step 2: Callback + profilage**

```tsx
// app/src/features/account/AuthCallback.tsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/lib/auth/session';
import { supabase } from '@/lib/supabase';
import { loadEntitlements } from '@/lib/entitlements';

/** Cible du lien magique / OAuth : attend la session, puis route vers l'onboarding si le profil est incomplet. */
export function AuthCallback() {
  const nav = useNavigate();
  const status = useSession((s) => s.status);
  const uid = useSession((s) => s.user?.id);
  useEffect(() => {
    if (status !== 'authenticated' || !uid) return;
    (async () => {
      await loadEntitlements();
      const { data } = await supabase.from('profiles').select('target_land, language_level, procedure_stage').eq('id', uid).single();
      const complete = !!(data?.target_land && data?.language_level && data?.procedure_stage);
      nav(complete ? '/' : '/onboarding', { replace: true });
    })();
  }, [status, uid, nav]);
  return <div className="py-12 text-center text-slate-400">Connexion…</div>;
}
```
```tsx
// app/src/features/account/OnboardingPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/auth/session';

export const LAENDER = [['BW','Baden-Württemberg'],['BY','Bayern'],['BE','Berlin'],['BB','Brandenburg'],['HB','Bremen'],['HH','Hamburg'],['HE','Hessen'],['MV','Mecklenburg-Vorpommern'],['NI','Niedersachsen'],['NRW','Nordrhein-Westfalen'],['RP','Rheinland-Pfalz'],['SL','Saarland'],['SN','Sachsen'],['ST','Sachsen-Anhalt'],['SH','Schleswig-Holstein'],['TH','Thüringen']] as const;
const STAGES = [['approbation_requested','J\'ai déposé ma demande d\'Approbation'],['gleichwertigkeit','Je suis en Gleichwertigkeitsprüfung'],['fsp_planned','Ma FSP est planifiée'],['fsp_failed_once','J\'ai déjà passé la FSP une fois']] as const;

export interface ProfileFields { target_land: string; exam_date: string | null; language_level: 'B2'|'C1'|'C1+'; procedure_stage: string }

export async function saveProfile(uid: string, f: ProfileFields): Promise<void> {
  const { error } = await supabase.from('profiles').update(f).eq('id', uid);
  if (error) throw error;
}

export function OnboardingPage() {
  const nav = useNavigate();
  const uid = useSession((s) => s.user?.id)!;
  const [f, setF] = useState<ProfileFields>({ target_land: 'BW', exam_date: null, language_level: 'B2', procedure_stage: 'fsp_planned' });
  const [noDate, setNoDate] = useState(true);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveProfile(uid, { ...f, exam_date: noDate ? null : f.exam_date });
    nav('/', { replace: true });
  };
  const Seg = <T extends string>({ value, options, onChange }: { value: T; options: readonly (readonly [T, string])[]; onChange: (v: T) => void }) => (
    <div className="flex flex-wrap gap-2">{options.map(([v, l]) => (
      <button type="button" key={v} onClick={() => onChange(v)} className={`seg ${value === v ? 'seg-on' : ''}`}>{l}</button>))}</div>
  );
  return (
    <form onSubmit={submit} className="mx-auto max-w-lg space-y-6 py-10">
      <div><div className="label">Bienvenue</div><h1 className="text-2xl font-bold">Quatre questions, et Doctopus s'adapte à toi.</h1></div>
      <div className="card space-y-5 p-5">
        <label className="block space-y-1.5"><span className="label">Land où tu passes la FSP</span>
          <select value={f.target_land} onChange={(e) => setF({ ...f, target_land: e.target.value })} className="input w-full">{LAENDER.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></label>
        <div className="space-y-1.5"><span className="label">Date d'examen</span>
          <div className="flex items-center gap-3">
            <input type="date" disabled={noDate} value={f.exam_date ?? ''} onChange={(e) => setF({ ...f, exam_date: e.target.value })} className="input" />
            <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={noDate} onChange={(e) => setNoDate(e.target.checked)} />Pas encore</label>
          </div></div>
        <div className="space-y-1.5"><span className="label">Niveau d'allemand actuel</span>
          <Seg value={f.language_level} options={[['B2','B2'],['C1','C1'],['C1+','Au-delà de C1']] as const} onChange={(v) => setF({ ...f, language_level: v })} /></div>
        <div className="space-y-1.5"><span className="label">Où en es-tu dans la procédure ?</span>
          <Seg value={f.procedure_stage} options={STAGES} onChange={(v) => setF({ ...f, procedure_stage: v })} /></div>
      </div>
      <button type="submit" className="btn-primary w-full justify-center py-3 text-base">Commencer</button>
    </form>
  );
}
```
Si les classes `seg` / `seg-on` / `input` n'existent pas dans `index.css`, ajouter `.input { @apply rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900; }` et `.seg-on { @apply border-brand-500 bg-brand-50 text-brand-700; }` (`.seg` existe déjà).

- [ ] **Step 3: Routes et boot**

Dans `app/src/main.tsx` : importer `SignInPage`, `OnboardingPage`, `AuthCallback`, `initSession`, `loadEntitlements`. Ajouter dans les enfants du Shell : `{ path: 'signin', element: <SignInPage /> }`, `{ path: 'onboarding', element: <OnboardingPage /> }`, `{ path: 'auth/callback', element: <AuthCallback /> }`. Remplacer le boot :
```ts
ensureSeeded()
  .then(() => initSession())
  .then(() => loadEntitlements())
  .then(() => useProfiles.getState().load())   // retiré en Task 16
  .then(() => { ReactDOM.createRoot(…).render(…) });
```
Dans `Sidebar.tsx`, ajouter sous « Stats » une entrée : si `useSession().status === 'authenticated'` → lien « Compte » vers `/account` (page en Task 18 ; en attendant lien vers `/onboarding`), sinon lien « Se connecter » vers `/signin`.

- [ ] **Step 4: Vérifier en navigateur (Supabase local, Inbucket pour les e-mails)**

```bash
cd app && npm run dev &  # si pas déjà lancé
playwright-cli -s=saas open 'http://localhost:5173/#/signin'
playwright-cli -s=saas eval '() => { document.querySelector("input[type=email]").value="e2e@test.dev"; document.querySelector("input[type=email]").dispatchEvent(new Event("input",{bubbles:true})); document.querySelector("form button").click(); return "sent"; }'
```
Puis ouvrir `http://127.0.0.1:54324` (Inbucket), boîte `e2e`, cliquer le lien → l'app doit atterrir sur `/onboarding`. Remplir, « Commencer » → `/`. Vérifier :
```bash
cd app && npx supabase db query "select target_land, language_level, procedure_stage from public.profiles where target_land is not null;"
```
Expected: une ligne avec les valeurs saisies.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/account/SignInPage.tsx app/src/features/account/OnboardingPage.tsx app/src/features/account/AuthCallback.tsx app/src/main.tsx app/src/components/Sidebar.tsx app/src/index.css app/src/components/icons.tsx
git commit -m "feat(saas): connexion (magic link + Google), callback, profilage 4 champs"
```

---

## Tranche B — Contenu hors du bundle (Tasks 8–11)

### Task 8: Migration contenu — `content_versions`, `content_items`, RLS par tier

**Files:**
- Create: `app/supabase/migrations/20260915000004_content.sql`

**Interfaces:**
- Produces: tables du spec §4.4 ; policy `content: read by tier` ; fonction `content_since(since int) returns setof content_items` (filtre tier + version).

- [ ] **Step 1: Migration**

```sql
-- 20260915000004_content.sql
create table public.content_versions (
  version      int primary key,
  published_at timestamptz not null default now(),
  notes        text
);
create table public.content_items (
  id      text primary key,
  kind    text not null check (kind in ('case','fachwissen','fachbegriff','aufklaerung','guide','muster')),
  tier    int  not null default 2 check (tier between 1 and 3),
  version int  not null references public.content_versions,
  payload jsonb not null,
  deleted boolean not null default false
);
create index on public.content_items (kind, tier);
create index on public.content_items (version);

alter table public.content_versions enable row level security;
alter table public.content_items    enable row level security;
create policy "versions: public read" on public.content_versions for select using (true);
-- lecture par tier ; les lignes deleted restent visibles pour que le client purge
create policy "content: read by tier" on public.content_items for select
  using (tier <= public.tier_of(auth.uid()));
-- pas d'écriture client

/** Delta : tout ce qui a changé après `since`, dans le tier autorisé. */
create or replace function public.content_since(since int)
returns setof public.content_items
language sql stable security invoker as $$
  select * from public.content_items where version > since
$$;
```
`tier_of(null)` (anonyme) renvoie 1 via `coalesce` — le Free sans compte fonctionne.

- [ ] **Step 2: Appliquer et tester la policy à la main**

```bash
cd app && npm run db:reset && npx supabase db query "insert into public.content_versions(version) values (1); insert into public.content_items(id,kind,tier,version,payload) values ('c-free','case',1,1,'{}'),('c-pro','case',2,1,'{}'); set role anon; select id from public.content_items;"
```
Expected: une seule ligne `c-free`.

- [ ] **Step 3: Commit**

```bash
git add app/supabase/migrations/20260915000004_content.sql
git commit -m "feat(saas): tables de contenu versionnées, lecture RLS par tier"
```

---

### Task 9: Edge Function `content` + helpers partagés

**Files:**
- Create: `app/supabase/functions/_shared/supabase.ts`
- Create: `app/supabase/functions/_shared/validate.ts`
- Create: `app/supabase/functions/content/index.ts`

**Interfaces:**
- Produces: `GET /functions/v1/content?since=<int>` → `{ version: number, items: ContentItem[] }` (items filtrés par le tier de l'appelant, `deleted` inclus) ; helpers `userClient(req)`, `serviceClient()`, `parse(schema, data)`.

- [ ] **Step 1: Helpers**

```ts
// app/supabase/functions/_shared/supabase.ts
import { createClient } from 'npm:@supabase/supabase-js@2';
const URL = Deno.env.get('SUPABASE_URL')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
/** Client qui agit AU NOM de l'appelant (RLS appliquée). Anonyme si pas d'Authorization. */
export const userClient = (req: Request) =>
  createClient(URL, ANON, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } }, auth: { persistSession: false } });
/** Client service role — uniquement pour les écritures que le client n'a pas le droit de faire. */
export const serviceClient = () => createClient(URL, SERVICE, { auth: { persistSession: false } });
export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type' } });
export const cors = () => new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, POST, OPTIONS' } });
```
```ts
// app/supabase/functions/_shared/validate.ts
import { z, type ZodTypeAny } from 'npm:zod@3';
export { z };
export class BadRequest extends Error { constructor(public issues: unknown) { super('bad request'); } }
/** Valide ou lève BadRequest — chaque fonction répond 400, jamais stocké. */
export function parse<T extends ZodTypeAny>(schema: T, data: unknown): z.infer<T> {
  const r = schema.safeParse(data);
  if (!r.success) throw new BadRequest(r.error.flatten());
  return r.data;
}
export const handle = (fn: (req: Request) => Promise<Response>) => async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, POST, OPTIONS' } });
  try { return await fn(req); }
  catch (e) {
    if (e instanceof BadRequest) return new Response(JSON.stringify({ error: 'bad_request', issues: e.issues }), { status: 400, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
    console.error(e);
    return new Response(JSON.stringify({ error: 'internal' }), { status: 500, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
  }
};
```

- [ ] **Step 2: Fonction content**

```ts
// app/supabase/functions/content/index.ts
import { userClient, json } from '../_shared/supabase.ts';
import { z, parse, handle } from '../_shared/validate.ts';

const Query = z.object({ since: z.coerce.number().int().min(0).default(0) });

Deno.serve(handle(async (req) => {
  const url = new URL(req.url);
  const { since } = parse(Query, Object.fromEntries(url.searchParams));
  const sb = userClient(req);
  const [{ data: v }, { data: items, error }] = await Promise.all([
    sb.from('content_versions').select('version').order('version', { ascending: false }).limit(1).single(),
    sb.rpc('content_since', { since }),
  ]);
  if (error) throw error;
  return json({ version: v?.version ?? 0, items: items ?? [] });
}));
```

- [ ] **Step 3: Servir localement et appeler**

```bash
cd app && npx supabase functions serve --no-verify-jwt &
sleep 3 && curl -s 'http://127.0.0.1:54321/functions/v1/content?since=0' | head -c 300; echo
```
Expected: `{"version":1,"items":[{"id":"c-free",…}]}` (données de test de Task 8 ; anonyme → tier 1 seulement).

- [ ] **Step 4: Commit**

```bash
git add app/supabase/functions/_shared app/supabase/functions/content
git commit -m "feat(saas): edge function content (delta par version, filtrée par tier) + helpers"
```

---

### Task 10: Module `content/` — loader, application au cache, remplacement de `ensureSeeded`

**Files:**
- Create: `app/src/lib/content/apply.ts`
- Create: `app/src/lib/content/apply.test.ts`
- Create: `app/src/lib/content/loader.ts`
- Modify: `app/src/data/seed.ts` (garder `wireLinks`, `demoSimulations`, `demoPlan` ; exporter `wireLinks`)
- Modify: `app/src/main.tsx`

**Interfaces:**
- Consumes: `getAccessToken`, `getEntitlements`, `wireLinks(cases, fachbegriffe, fachwissen, aufklaerungen)`.
- Produces: `applyContent(db, items, allowedTier): Promise<{ upserted: number; removed: number }>` ; `contentLoader.sync(): Promise<{ version; changed }>` ; `FirstLoadRequired` (erreur typée).

- [ ] **Step 1: Test de `applyContent` (échoue)**

```ts
// app/src/lib/content/apply.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/db';
import { applyContent } from './apply';

const item = (id: string, kind: string, tier: number, deleted = false) => ({ id, kind, tier, version: 1, deleted, payload: { id, name: id, specialty: 'Kardiologie', pathology: id } });

describe('applyContent', () => {
  beforeEach(async () => { await db.cases.clear(); await db.fachwissen.clear(); await db.meta.clear(); });

  it('upsert les items dans la table de leur kind', async () => {
    const r = await applyContent(db, [item('case-a', 'case', 1), item('fw-a', 'fachwissen', 1)], 1);
    expect(r.upserted).toBe(2);
    expect(await db.cases.get('case-a')).toBeTruthy();
    expect(await db.fachwissen.get('fw-a')).toBeTruthy();
  });
  it('supprime les items deleted', async () => {
    await applyContent(db, [item('case-a', 'case', 1)], 1);
    const r = await applyContent(db, [item('case-a', 'case', 1, true)], 1);
    expect(r.removed).toBe(1);
    expect(await db.cases.get('case-a')).toBeUndefined();
  });
  it('purge du cache ce qui dépasse le tier autorisé (perte de droits)', async () => {
    await applyContent(db, [item('case-free', 'case', 1), item('case-pro', 'case', 2)], 2);
    const r = await applyContent(db, [], 1);
    expect(r.removed).toBe(1);
    expect(await db.cases.get('case-pro')).toBeUndefined();
    expect(await db.cases.get('case-free')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Lancer — échoue**

```bash
cd app && npx vitest run src/lib/content; echo "exit=$?"
```
Expected: FAIL, module introuvable.

- [ ] **Step 3: Implémentation**

```ts
// app/src/lib/content/apply.ts
import type { FspDB } from '@/db/db';
export interface ContentItem { id: string; kind: 'case'|'fachwissen'|'fachbegriff'|'aufklaerung'|'guide'|'muster'; tier: number; version: number; payload: unknown; deleted: boolean }

const TABLE: Record<ContentItem['kind'], keyof FspDB | null> = { case: 'cases', fachwissen: 'fachwissen', fachbegriff: 'fachbegriffe', aufklaerung: 'aufklaerungen', guide: 'guides', muster: null };

/** Applique un delta au cache Dexie. Le tier est stocké avec l'objet (`_tier`) pour pouvoir purger en cas de perte de droits. */
export async function applyContent(db: FspDB, items: ContentItem[], allowedTier: number): Promise<{ upserted: number; removed: number }> {
  let upserted = 0, removed = 0;
  const musterById = new Map<string, unknown>();
  await db.transaction('rw', [db.cases, db.fachwissen, db.fachbegriffe, db.aufklaerungen, db.guides], async () => {
    for (const it of items) {
      if (it.kind === 'muster') { musterById.set(it.id, it.payload); continue; }
      const table = db.table(TABLE[it.kind]!);
      if (it.deleted) { await table.delete(it.id); removed++; continue; }
      // Fachbegriffe : préserver le SRS local (il vit dans l'objet)
      const prev = it.kind === 'fachbegriff' ? await table.get(it.id) : undefined;
      await table.put({ ...(it.payload as object), ...(prev?.srs ? { srs: prev.srs } : {}), _tier: it.tier });
      upserted++;
    }
    // Muster : fusionnés dans le cas correspondant (musterSaetze), comme le faisait ensureSeeded
    for (const [caseId, muster] of musterById) {
      const c = await db.cases.get(caseId.replace(/^muster-/, ''));
      if (c) { await db.cases.put({ ...c, musterSaetze: muster as never }); }
    }
    // Purge : tout ce dont le tier dépasse le droit courant
    for (const t of [db.cases, db.fachwissen, db.fachbegriffe, db.aufklaerungen, db.guides]) {
      const over = await t.filter((r: { _tier?: number }) => (r._tier ?? 1) > allowedTier).primaryKeys();
      if (over.length) { await t.bulkDelete(over); removed += over.length; }
    }
  });
  return { upserted, removed };
}
```
```ts
// app/src/lib/content/loader.ts
import { db, getMeta, setMeta } from '@/db/db';
import { getAccessToken } from '@/lib/auth/session';
import { getEntitlements } from '@/lib/entitlements';
import { wireLinks } from '@/data/seed';
import { applyContent, type ContentItem } from './apply';

export class FirstLoadRequired extends Error { constructor() { super('Premier chargement : connexion requise'); } }
const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/content`;

async function relink() {
  const [cases, fachbegriffe, fachwissen, aufklaerungen] = await Promise.all([db.cases.toArray(), db.fachbegriffe.toArray(), db.fachwissen.toArray(), db.aufklaerungen.toArray()]);
  wireLinks(cases, fachbegriffe, fachwissen, aufklaerungen);
  await db.transaction('rw', [db.cases, db.fachbegriffe, db.fachwissen, db.aufklaerungen], async () => {
    await db.cases.bulkPut(cases); await db.fachbegriffe.bulkPut(fachbegriffe); await db.fachwissen.bulkPut(fachwissen); await db.aufklaerungen.bulkPut(aufklaerungen);
  });
}

export const contentLoader = {
  /** Delta depuis la version locale. Hors ligne : no-op si un cache existe, FirstLoadRequired sinon. */
  async sync(): Promise<{ version: number; changed: number }> {
    const local = await getMeta<number>('contentVersion', 0);
    const tier = getEntitlements().limit('content.tier') ?? 3;
    let res: Response;
    try {
      const token = await getAccessToken();
      res = await fetch(`${FN}?since=${local}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    } catch {
      if (local === 0) throw new FirstLoadRequired();
      return { version: local, changed: 0 };
    }
    if (!res.ok) { if (local === 0) throw new FirstLoadRequired(); return { version: local, changed: 0 }; }
    const { version, items } = (await res.json()) as { version: number; items: ContentItem[] };
    const { upserted, removed } = await applyContent(db, items, tier);
    if (upserted || removed) await relink();
    await setMeta('contentVersion', version);
    return { version, changed: upserted + removed };
  },
};
```
Dans `app/src/data/seed.ts` : `export function wireLinks(…)` (retirer le `function` interne → `export`), et **retirer** de `ensureSeeded` le chargement des tables de contenu (garder uniquement le seed des `simulations`/`plan` de démo si vides, ou le supprimer entièrement si Task 16 les migre — ici : garder pour ne pas casser la démo, il sera nettoyé en Task 16).

Dans `main.tsx` : remplacer `ensureSeeded()` par
```ts
contentLoader.sync().catch((e) => { if (e instanceof FirstLoadRequired) { renderFirstLoadScreen(); throw e; } })
```
où `renderFirstLoadScreen` monte un composant minimal « Doctopus a besoin d'une connexion pour le premier chargement » + bouton `location.reload()`. Ordre du boot : `initSession()` → `loadEntitlements()` → `contentLoader.sync()` → render.

- [ ] **Step 4: Lancer — passe**

```bash
cd app && npx vitest run src/lib/content && npx tsc -b --noEmit; echo "exit=$?"
```
Expected: `3 passed`, `exit=0`.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/content app/src/data/seed.ts app/src/main.tsx
git commit -m "feat(saas): contentLoader — delta, purge par tier, remplace ensureSeeded"
```

---

### Task 11: Script de publication du contenu + attribution des tiers

**Files:**
- Create: `app/scripts/publishContent.mjs`
- Modify: `app/src/data/seedCases.ts` (ajouter `tier: 1` sur ~12 cas)
- Modify: `app/src/db/types.ts` (`Case.tier?: 1|2|3`)
- Modify: `.github/workflows/quality.yml` (job `publish` sur `main` après `contrats` + `build` verts)

**Interfaces:**
- Consumes: `loadCases.mjs` (existant) ; `seedFachwissen`, `seedAufklaerungen`, `seedGuides`, `fachbegriffe.json`, `CASE_MUSTER`.
- Produces: `node scripts/publishContent.mjs --dry` (compte) ; sans `--dry` : insère `content_versions` + upsert `content_items` via service role.

- [ ] **Step 1: Type + tiers**

Dans `types.ts`, interface `Case` : ajouter `tier?: 1 | 2 | 3; // 1 = Free ; défaut 2`. Dans `seedCases.ts`, ajouter `tier: 1,` juste après `id:` sur ces 12 cas (un par spécialité majeure, fréquents aux protocoles) : `case-angina-pectoris`, `case-pneumonie`, `case-zystitis`, `case-diabetes`, `case-gib`, `case-depression`, `case-schlaganfall`, `case-osg-fraktur`, `case-pyelonephritis`, `case-copd`, `case-migraene`, `case-nierenkolik`. (Adapter si un id diffère : vérifier par `grep -n "id: 'case-…'"`.)

- [ ] **Step 2: Script**

```js
// app/scripts/publishContent.mjs — publie le contenu validé par la CI vers content_items
import { createClient } from '@supabase/supabase-js';
import { loadAll } from './loadCases.mjs';   // rend { cases, fachwissen, muster }
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const dry = process.argv.includes('--dry');
const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!dry && (!url || !key)) { console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY requis'); process.exit(2); }

// Les seeds sont du TS : on les transpile à la volée avec esbuild (déjà dépendance de Vite).
const load = (rel) => { const out = execSync(`npx esbuild src/data/${rel} --bundle --format=esm --platform=node --outfile=/dev/stdout --log-level=silent`, { encoding: 'utf8', maxBuffer: 64e6 }); return import(`data:text/javascript;base64,${Buffer.from(out).toString('base64')}`); };

const { cases, fachwissen: fw, muster } = await loadAll();
const auf = (await load('seedAufklaerungen.ts')).seedAufklaerungen();
const guides = (await load('seedGuides.ts')).seedGuides();
const fbRaw = JSON.parse(readFileSync('src/data/fachbegriffe.json', 'utf8'));
// Même mapping que seedFachbegriffe() — le payload doit être l'objet Fachbegriff, pas la ligne compacte.
const fb = fbRaw.map((r) => ({ id: r.id, term: r.t, translationSimple: r.s, definitionDetailed: r.def, pronunciation: r.p, specialty: r.sp, pathologyTags: r.tags ?? [], centers: r.c, linkedCaseIds: [], sp: r.sp }));

// Tier des contenus DÉRIVÉS : le Free est un échantillon COMPLET (12 cas avec
// leur fiche, leurs termes, leurs Aufklärungen), pas un catalogue de fiches
// offert. Règle : tier minimal des cas qui référencent l'item ; aucun cas Free
// → Pro. Les guides restent Free : questions génériques, sans contenu clinique.
const freeCases = cases.filter((c) => c.tier === 1);
const freePathologies = new Set(freeCases.map((c) => c.pathology));
const freeAuf = new Set(freeCases.flatMap((c) => c.probableAufklaerungIds ?? []));
const freeSpecialties = new Set(freeCases.map((c) => c.specialty));
const tierFw  = (f) => (freePathologies.has(f.pathology) ? 1 : 2);
const tierAuf = (a) => (freeAuf.has(a.id) ? 1 : 2);
// Fachbegriffe : Free = 'Allgemein' (vocabulaire de base, 1 204 termes) ; les
// termes de spécialité sont Pro (« spécialité ayant un cas Free » ouvrait 91 %).
const tierFb  = (b) => (b.sp === 'Allgemein' ? 1 : 2);

const items = [
  ...cases.map((c) => ({ id: c.id, kind: 'case', tier: c.tier ?? 2, payload: c })),
  ...fw.map((f) => ({ id: f.id, kind: 'fachwissen', tier: tierFw(f), payload: f })),
  ...auf.map((a) => ({ id: a.id, kind: 'aufklaerung', tier: tierAuf(a), payload: a })),
  ...guides.map((g) => ({ id: g.id, kind: 'guide', tier: 1, payload: g })),
  ...fb.map(({ sp, ...b }) => ({ id: b.id, kind: 'fachbegriff', tier: tierFb({ sp }), payload: b })),
  ...Object.entries(muster).map(([caseId, m]) => ({ id: `muster-${caseId}`, kind: 'muster', tier: (cases.find((c) => c.id === caseId)?.tier ?? 2), payload: m })),
];
const byKind = items.reduce((a, i) => ((a[i.kind] = (a[i.kind] ?? 0) + 1), a), {});
const free = (k) => items.filter((i) => i.kind === k && i.tier === 1).length;
console.log('items :', byKind, '| Free → cas', free('case'), '· fiches', free('fachwissen'), '· Aufklärungen', free('aufklaerung'), '· termes', free('fachbegriff'));
if (dry) process.exit(0);

const sb = createClient(url, key, { auth: { persistSession: false } });
const { data: last } = await sb.from('content_versions').select('version').order('version', { ascending: false }).limit(1).maybeSingle();
const version = (last?.version ?? 0) + 1;
const { error: ve } = await sb.from('content_versions').insert({ version, notes: process.env.GITHUB_SHA ?? 'local' });
if (ve) throw ve;
// upsert par lots ; les items disparus sont marqués deleted
const ids = new Set(items.map((i) => i.id));
const { data: existing } = await sb.from('content_items').select('id').eq('deleted', false);
const gone = (existing ?? []).filter((e) => !ids.has(e.id)).map((e) => ({ id: e.id, deleted: true, version }));
for (let i = 0; i < items.length; i += 200) {
  const { error } = await sb.from('content_items').upsert(items.slice(i, i + 200).map((it) => ({ ...it, version, deleted: false })));
  if (error) throw error;
}
if (gone.length) { const { error } = await sb.from('content_items').upsert(gone); if (error) throw error; }
console.log(`✅ version ${version} publiée — ${items.length} items, ${gone.length} supprimés`);
```

- [ ] **Step 3: Dry-run puis publication locale**

```bash
cd app && node scripts/publishContent.mjs --dry; echo "exit=$?"
```
Expected: compte par kind, `Free → cas 12 · fiches 12 · Aufklärungen ≤ 23 · termes ≈ (Allgemein + 12 pathologies)`, `exit=0`. Vérifier que le nombre de fiches Free est **exactement** égal au nombre de cas Free dont la pathologie a une fiche.
```bash
cd app && eval "$(npx supabase status -o env | sed 's/^/export /')" && SUPABASE_URL=$API_URL node scripts/publishContent.mjs && npx supabase db query "select kind, tier, count(*) from public.content_items group by 1,2 order by 1,2;"
```
Expected: `✅ version 1 publiée`, puis la table par kind/tier.

- [ ] **Step 4: Vérifier l'app en invité**

```bash
playwright-cli -s=saas open 'http://localhost:5173/#/cas' && playwright-cli -s=saas eval 'async () => { await new Promise(r=>setTimeout(r,2500)); const n=(await (await import("/src/db/db.ts")).db.cases.count()); return {cases:n}; }'
```
Expected: `cases: 12` (invité = tier 1). Vérifier aussi que le bundle ne contient plus les seeds : `npm run build && ls -la dist/assets | sort -k5 -n | tail -3` — le plus gros fichier JS doit avoir fondu (< 2 Mo au lieu de > 13 Mo). **Note :** `seedCases.ts` reste dans le dépôt (source de vérité validée par la CI) mais n'est plus importé par `main.tsx` ; il ne doit plus apparaître dans `dist/`.

- [ ] **Step 5: Job CI de publication (sur `main` uniquement, secrets requis)**

```yaml
  publish:
    name: Publier le contenu
    needs: [contrats, build]
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: app } }
    env:
      SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
      SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm, cache-dependency-path: app/package-lock.json }
      - run: npm ci
      - run: node scripts/publishContent.mjs
```
(Les secrets sont à créer dans GitHub quand le projet Supabase cloud existe — jusque-là le job échoue proprement sur `exit 2`, ce qui est voulu.)

- [ ] **Step 6: Commit**

```bash
git add app/scripts/publishContent.mjs app/src/data/seedCases.ts app/src/db/types.ts .github/workflows/quality.yml
git commit -m "feat(saas): publication du contenu vers Supabase (versions, tiers, suppressions) + 12 cas Free"
```

---

## Tranche C — Progression synchronisée (Tasks 12–16)

### Task 12: Dexie v2 (`progress_events`, `outbox`) + types d'événements + `syncQueue`

**Files:**
- Modify: `app/src/db/db.ts`
- Create: `app/src/lib/sync/events.ts`
- Create: `app/src/lib/sync/queue.ts`
- Create: `app/src/lib/sync/queue.test.ts`
- Create: `app/src/components/SyncBadge.tsx`

**Interfaces:**
- Produces: tables Dexie `progress_events` (`id, user_id, type, subject_id, occurred_at`) et `outbox` (`id, attempts`) ; types `ProgressEvent`, `ProgressEventType` ; `syncQueue.push(input)`, `syncQueue.flush()`, `syncQueue.pull(since?)`, `useSyncStatus()`.

- [ ] **Step 1: Dexie v2**

Dans `db.ts`, après le `this.version(1).stores({...})` existant, ajouter :
```ts
this.version(2).stores({
  progress_events: 'id, user_id, type, subject_id, occurred_at, [user_id+type+subject_id]',
  outbox: 'id, attempts',
});
```
et déclarer `progress_events!: Table<ProgressEvent, string>; outbox!: Table<OutboxRow, string>;` (types importés de `@/lib/sync/events`).

- [ ] **Step 2: Types**

```ts
// app/src/lib/sync/events.ts
export type ProgressEventType = 'simulation.completed' | 'srs.reviewed' | 'plan.done' | 'case.layer_reached' | 'program.configured';
export interface ProgressEvent {
  id: string;            // uuid client
  user_id: string;       // 'local' tant qu'anonyme ; réattribué à la migration
  type: ProgressEventType;
  subject_id: string | null;
  payload: unknown;
  occurred_at: string;   // ISO
  received_at?: string;  // posé par le serveur
}
export interface OutboxRow { id: string; attempts: number; lastError?: string; rejected?: boolean }
export type NewEvent = Pick<ProgressEvent, 'type' | 'subject_id' | 'payload'> & { occurred_at?: string };
export const newId = () => crypto.randomUUID();
```

- [ ] **Step 3: Test de la file (échoue)**

```ts
// app/src/lib/sync/queue.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db/db';

const post = vi.fn();
vi.mock('@/lib/auth/session', () => ({ getAccessToken: vi.fn().mockResolvedValue('tok'), useSession: { getState: () => ({ user: { id: 'u1' } }) } }));
vi.stubGlobal('fetch', post);

import { syncQueue } from './queue';

describe('syncQueue', () => {
  beforeEach(async () => { await db.progress_events.clear(); await db.outbox.clear(); post.mockReset(); });

  it('push écrit l\'événement localement ET dans l\'outbox', async () => {
    await syncQueue.push({ type: 'plan.done', subject_id: 'p1', payload: {} });
    expect(await db.progress_events.count()).toBe(1);
    expect(await db.outbox.count()).toBe(1);
  });
  it('flush envoie par lot et vide l\'outbox sur ack', async () => {
    await syncQueue.push({ type: 'plan.done', subject_id: 'p1', payload: {} });
    const ev = await db.progress_events.toCollection().first();
    post.mockResolvedValue({ ok: true, status: 200, json: async () => ({ acked: [ev!.id], rejected: [] }) });
    const r = await syncQueue.flush();
    expect(r.acked).toBe(1);
    expect(await db.outbox.count()).toBe(0);
  });
  it('flush garde en outbox sur 5xx et incrémente attempts', async () => {
    await syncQueue.push({ type: 'plan.done', subject_id: 'p1', payload: {} });
    post.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
    await syncQueue.flush();
    const row = await db.outbox.toCollection().first();
    expect(row!.attempts).toBe(1);
  });
  it('flush retire et marque rejected sur 4xx (pas de rejeu infini)', async () => {
    await syncQueue.push({ type: 'plan.done', subject_id: 'p1', payload: {} });
    const ev = await db.progress_events.toCollection().first();
    post.mockResolvedValue({ ok: true, status: 200, json: async () => ({ acked: [], rejected: [{ id: ev!.id, reason: 'unknown type' }] }) });
    const r = await syncQueue.flush();
    expect(r.rejected).toBe(1);
    expect(await db.outbox.count()).toBe(0);
  });
  it('pull insère les événements distants sans doublon', async () => {
    post.mockResolvedValue({ ok: true, status: 200, json: async () => ({ events: [{ id: 'r1', user_id: 'u1', type: 'plan.done', subject_id: 'x', payload: {}, occurred_at: '2026-01-01T00:00:00Z' }] }) });
    expect(await syncQueue.pull()).toBe(1);
    expect(await syncQueue.pull()).toBe(0);
    expect(await db.progress_events.count()).toBe(1);
  });
});
```

- [ ] **Step 4: Lancer — échoue**

```bash
cd app && npx vitest run src/lib/sync; echo "exit=$?"
```
Expected: FAIL, `./queue` introuvable.

- [ ] **Step 5: Implémentation**

```ts
// app/src/lib/sync/queue.ts
import { create } from 'zustand';
import { db } from '@/db/db';
import { getAccessToken, useSession } from '@/lib/auth/session';
import { newId, type NewEvent, type ProgressEvent } from './events';

const FN = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/events`;
const BATCH = 100;
const backoffMs = (attempts: number) => Math.min(300_000, 1000 * 2 ** attempts);

interface SyncState { pending: number; online: boolean; lastError: string | null }
export const useSyncStatus = create<SyncState>(() => ({ pending: 0, online: typeof navigator === 'undefined' ? true : navigator.onLine, lastError: null }));
const refreshPending = async () => useSyncStatus.setState({ pending: await db.outbox.where('attempts').aboveOrEqual(0).count() });

const uid = () => useSession.getState().user?.id ?? 'local';
const auth = async () => { const t = await getAccessToken(); return t ? { Authorization: `Bearer ${t}`, 'content-type': 'application/json' } : null; };

let flushing = false;
let nextAllowed = 0;

export const syncQueue = {
  /** Écrit localement (l'UI se met à jour) et enfile. Ne bloque jamais sur le réseau. */
  async push(input: NewEvent): Promise<ProgressEvent> {
    const ev: ProgressEvent = { id: newId(), user_id: uid(), occurred_at: input.occurred_at ?? new Date().toISOString(), type: input.type, subject_id: input.subject_id, payload: input.payload };
    await db.transaction('rw', [db.progress_events, db.outbox], async () => {
      await db.progress_events.put(ev);
      await db.outbox.put({ id: ev.id, attempts: 0 });
    });
    await refreshPending();
    void syncQueue.flush();
    return ev;
  },

  /** POST par lots ; ack → retire ; 4xx/rejected → marque et retire ; 5xx/réseau → garde avec backoff. */
  async flush(): Promise<{ acked: number; rejected: number }> {
    if (flushing || Date.now() < nextAllowed) return { acked: 0, rejected: 0 };
    const headers = await auth();
    if (!headers) return { acked: 0, rejected: 0 };          // anonyme : rien ne part
    flushing = true;
    let acked = 0, rejected = 0;
    try {
      const rows = await db.outbox.filter((r) => !r.rejected).limit(BATCH).toArray();
      if (!rows.length) return { acked, rejected };
      const events = await db.progress_events.bulkGet(rows.map((r) => r.id));
      const body = events.filter(Boolean).map((e) => ({ ...e!, user_id: undefined }));
      let res: Response;
      try { res = await fetch(FN, { method: 'POST', headers, body: JSON.stringify({ events: body }) }); }
      catch (e) { await bump(rows, String(e)); return { acked, rejected }; }
      if (res.status >= 500) { await bump(rows, `HTTP ${res.status}`); return { acked, rejected }; }
      if (res.status >= 400) { await reject(rows.map((r) => r.id), `HTTP ${res.status}`); rejected += rows.length; return { acked, rejected }; }
      const out = (await res.json()) as { acked: string[]; rejected: { id: string; reason: string }[] };
      await db.outbox.bulkDelete(out.acked); acked += out.acked.length;
      await reject(out.rejected.map((r) => r.id), out.rejected.map((r) => r.reason).join('; ')); rejected += out.rejected.length;
      nextAllowed = 0;
      useSyncStatus.setState({ lastError: null });
      if (rows.length === BATCH) void syncQueue.flush();
    } finally { flushing = false; await refreshPending(); }
    return { acked, rejected };
  },

  /** Rapatrie les événements des autres appareils (idempotent). */
  async pull(since?: string): Promise<number> {
    const headers = await auth();
    if (!headers) return 0;
    const last = since ?? (await db.progress_events.orderBy('occurred_at').reverse().first())?.occurred_at ?? '1970-01-01T00:00:00Z';
    let res: Response;
    try { res = await fetch(`${FN}?since=${encodeURIComponent(last)}`, { headers }); } catch { return 0; }
    if (!res.ok) return 0;
    const { events } = (await res.json()) as { events: ProgressEvent[] };
    const fresh = [] as ProgressEvent[];
    for (const e of events) if (!(await db.progress_events.get(e.id))) fresh.push(e);
    if (fresh.length) await db.progress_events.bulkPut(fresh);
    return fresh.length;
  },
};

async function bump(rows: { id: string; attempts: number }[], err: string) {
  const attempts = (rows[0]?.attempts ?? 0) + 1;
  await db.outbox.bulkPut(rows.map((r) => ({ ...r, attempts, lastError: err })));
  nextAllowed = Date.now() + backoffMs(attempts);
  useSyncStatus.setState({ lastError: err });
}
async function reject(ids: string[], reason: string) {
  if (!ids.length) return;
  console.warn('[sync] événements rejetés', ids, reason);
  await db.outbox.bulkDelete(ids);
}

/** Déclencheurs : reconnexion, intervalle si outbox non vide. À appeler une fois au boot. */
export function startSyncLoop(): () => void {
  const onOnline = () => { useSyncStatus.setState({ online: true }); nextAllowed = 0; void syncQueue.flush().then(() => syncQueue.pull()); };
  const onOffline = () => useSyncStatus.setState({ online: false });
  window.addEventListener('online', onOnline); window.addEventListener('offline', onOffline);
  const timer = window.setInterval(() => { if (useSyncStatus.getState().pending > 0) void syncQueue.flush(); }, 120_000);
  void refreshPending();
  return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); window.clearInterval(timer); };
}
```
```tsx
// app/src/components/SyncBadge.tsx
import { useSyncStatus } from '@/lib/sync/queue';
import { useSession } from '@/lib/auth/session';
/** Pastille discrète : hors ligne · en attente · synchronisé. Rien si invité. */
export function SyncBadge() {
  const { pending, online } = useSyncStatus();
  const authed = useSession((s) => s.status === 'authenticated');
  if (!authed) return null;
  const label = !online ? 'Hors ligne' : pending > 0 ? `${pending} à synchroniser` : 'Synchronisé';
  const dot = !online ? 'bg-slate-400' : pending > 0 ? 'bg-amber-400' : 'bg-emerald-500';
  return <span className="label flex items-center gap-1.5 text-slate-400" title={label}><span className={`h-1.5 w-1.5 rounded-full ${dot}`} />{label}</span>;
}
```
Monter `<SyncBadge />` dans `Sidebar.tsx` sous la ligne « OFFLINE · LOCAL » existante (la remplacer). Appeler `startSyncLoop()` dans `main.tsx` après le render.

- [ ] **Step 6: Lancer — passe**

```bash
cd app && npx vitest run src/lib/sync && npx tsc -b --noEmit; echo "exit=$?"
```
Expected: `5 passed`, `exit=0`.

- [ ] **Step 7: Commit**

```bash
git add app/src/db/db.ts app/src/lib/sync/events.ts app/src/lib/sync/queue.ts app/src/lib/sync/queue.test.ts app/src/components/SyncBadge.tsx app/src/components/Sidebar.tsx app/src/main.tsx
git commit -m "feat(saas): syncQueue — outbox Dexie, flush par lots avec backoff, pull idempotent, pastille"
```

---

### Task 13: Migration `progress_events` + Edge Function `events` (ingestion validée, rate-limitée)

**Files:**
- Create: `app/supabase/migrations/20260915000005_events.sql`
- Create: `app/supabase/functions/_shared/ratelimit.ts`
- Create: `app/supabase/functions/events/index.ts`

**Interfaces:**
- Produces: table `progress_events` (spec §4.5) ; `POST /events {events[]}` → `{ acked: string[], rejected: {id,reason}[] }` ; `GET /events?since=ISO` → `{ events[] }` ; `rateLimit(key, max, windowSec)`.

- [ ] **Step 1: Migration**

```sql
-- 20260915000005_events.sql
create table public.progress_events (
  id          uuid primary key,
  user_id     uuid not null references public.profiles on delete cascade,
  type        text not null check (type in ('simulation.completed','srs.reviewed','plan.done','case.layer_reached','program.configured')),
  subject_id  text,
  payload     jsonb not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now()
);
create index on public.progress_events (user_id, occurred_at);
create index on public.progress_events (user_id, type, subject_id);

alter table public.progress_events enable row level security;
create policy "events: own read"   on public.progress_events for select using (user_id = auth.uid());
create policy "events: own insert" on public.progress_events for insert with check (user_id = auth.uid());
-- pas d'update/delete : journal insert-only

-- rate limiting simple : compteur par (clé, fenêtre)
create table public.rate_limits (key text, window_start timestamptz, count int not null default 0, primary key (key, window_start));
create or replace function public.rate_hit(k text, max_hits int, window_sec int) returns boolean
language plpgsql security definer set search_path = public as $$
declare ws timestamptz := to_timestamp(floor(extract(epoch from now()) / window_sec) * window_sec); c int;
begin
  insert into public.rate_limits(key, window_start, count) values (k, ws, 1)
    on conflict (key, window_start) do update set count = public.rate_limits.count + 1 returning count into c;
  return c <= max_hits;
end $$;
```

- [ ] **Step 2: Helper + fonction**

```ts
// app/supabase/functions/_shared/ratelimit.ts
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
export class TooMany extends Error {}
/** Lève TooMany au-delà de `max` appels par `windowSec` pour la clé. */
export async function rateLimit(sb: SupabaseClient, key: string, max: number, windowSec: number) {
  const { data, error } = await sb.rpc('rate_hit', { k: key, max_hits: max, window_sec: windowSec });
  if (error) throw error;
  if (!data) throw new TooMany();
}
```
```ts
// app/supabase/functions/events/index.ts
import { userClient, serviceClient, json } from '../_shared/supabase.ts';
import { z, parse, handle } from '../_shared/validate.ts';
import { rateLimit, TooMany } from '../_shared/ratelimit.ts';

const Event = z.object({
  id: z.string().uuid(),
  type: z.enum(['simulation.completed','srs.reviewed','plan.done','case.layer_reached','program.configured']),
  subject_id: z.string().max(200).nullable(),
  payload: z.record(z.unknown()),
  occurred_at: z.string().datetime(),
});
const Body = z.object({ events: z.array(Event).min(1).max(100) });

Deno.serve(handle(async (req) => {
  const sb = userClient(req);
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);
  try { await rateLimit(serviceClient(), `events:${user.id}`, 600, 60); } catch (e) { if (e instanceof TooMany) return json({ error: 'rate_limited' }, 429); throw e; }

  if (req.method === 'GET') {
    const since = new URL(req.url).searchParams.get('since') ?? '1970-01-01T00:00:00Z';
    // Curseur sur received_at (horloge SERVEUR) — cf. fix Task 12 : occurred_at est
    // l'horloge client et ferait rater les événements poussés en retard.
    const { data, error } = await sb.from('progress_events').select('*').gt('received_at', since).order('received_at').limit(1000);
    if (error) throw error;
    return json({ events: data });
  }

  const { events } = parse(Body, await req.json());
  const acked: string[] = []; const rejected: { id: string; reason: string }[] = [];
  // insertion une à une : un événement invalide ne doit pas faire échouer le lot
  for (const e of events) {
    const { error } = await sb.from('progress_events').upsert({ ...e, user_id: user.id }, { onConflict: 'id', ignoreDuplicates: true });
    if (error) rejected.push({ id: e.id, reason: error.message }); else acked.push(e.id);
  }
  return json({ acked, rejected });
}));
```

- [ ] **Step 3: Appliquer et tester**

```bash
cd app && npm run db:reset && npx supabase functions serve --no-verify-jwt &
sleep 3; TOKEN=$(node -e "
const {createClient}=require('@supabase/supabase-js');const s=require('child_process').execSync('npx supabase status -o env',{encoding:'utf8'});const g=k=>s.match(new RegExp(k+'=\"?([^\"\\n]+)'))[1];
const admin=createClient(g('API_URL'),g('SERVICE_ROLE_KEY'));(async()=>{await admin.auth.admin.createUser({email:'ev@test.dev',password:'pw-123456',email_confirm:true}).catch(()=>{});const c=createClient(g('API_URL'),g('ANON_KEY'));const {data}=await c.auth.signInWithPassword({email:'ev@test.dev',password:'pw-123456'});console.log(data.session.access_token)})()")
curl -s -X POST http://127.0.0.1:54321/functions/v1/events -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{"events":[{"id":"11111111-1111-4111-8111-111111111111","type":"plan.done","subject_id":"p1","payload":{},"occurred_at":"2026-09-15T10:00:00Z"},{"id":"bad","type":"plan.done","subject_id":null,"payload":{},"occurred_at":"x"}]}'; echo
```
Expected: `{"error":"bad_request",…}` (le lot entier est invalide car `bad` n'est pas un uuid — c'est voulu : la validation est par lot). Relancer avec seulement le premier événement → `{"acked":["1111…"],"rejected":[]}` ; relancer encore → même réponse (idempotent, `ignoreDuplicates`).

- [ ] **Step 4: Commit**

```bash
git add app/supabase/migrations/20260915000005_events.sql app/supabase/functions/_shared/ratelimit.ts app/supabase/functions/events/index.ts
git commit -m "feat(saas): journal progress_events (insert-only, RLS) + edge function events avec rate limit"
```

---

### Task 14: Test d'intégration événements (idempotence, isolation, GET since)

**Files:**
- Create: `app/supabase/tests/events.test.ts`

- [ ] **Step 1: Test**

```ts
// app/supabase/tests/events.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { createTestUser, URL } from './helpers';

const FN = `${URL}/functions/v1/events`;
let A: Awaited<ReturnType<typeof createTestUser>>, B: Awaited<ReturnType<typeof createTestUser>>;
const tok = async (u: typeof A) => (await u.client.auth.getSession()).data.session!.access_token;
const post = async (u: typeof A, events: unknown[]) => fetch(FN, { method: 'POST', headers: { Authorization: `Bearer ${await tok(u)}`, 'content-type': 'application/json' }, body: JSON.stringify({ events }) }).then((r) => r.json());
const ev = (id: string) => ({ id, type: 'plan.done', subject_id: 'p', payload: {}, occurred_at: '2026-09-15T10:00:00Z' });

beforeAll(async () => { A = await createTestUser('ev-a@test.dev'); B = await createTestUser('ev-b@test.dev'); });

describe('events', () => {
  it('ack puis idempotent au rejeu', async () => {
    const id = crypto.randomUUID();
    expect((await post(A, [ev(id)])).acked).toEqual([id]);
    expect((await post(A, [ev(id)])).acked).toEqual([id]);
    const { data } = await A.client.from('progress_events').select('id').eq('id', id);
    expect(data!.length).toBe(1);
  });
  it('B ne voit pas les événements de A via GET', async () => {
    const r = await fetch(`${FN}?since=1970-01-01T00:00:00Z`, { headers: { Authorization: `Bearer ${await tok(B)}` } }).then((r) => r.json());
    expect(r.events.every((e: { user_id: string }) => e.user_id === B.id)).toBe(true);
  });
  it('un type inconnu est refusé en 400', async () => {
    const r = await fetch(FN, { method: 'POST', headers: { Authorization: `Bearer ${await tok(A)}`, 'content-type': 'application/json' }, body: JSON.stringify({ events: [{ ...ev(crypto.randomUUID()), type: 'hack' }] }) });
    expect(r.status).toBe(400);
  });
  it('sans token → 401', async () => {
    const r = await fetch(FN, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ events: [ev(crypto.randomUUID())] }) });
    expect(r.status).toBe(401);
  });
});
```

- [ ] **Step 2: Lancer (fonctions servies)**

```bash
cd app && (npx supabase functions serve --no-verify-jwt >/dev/null 2>&1 &) && sleep 3 && node scripts/testRls.mjs; echo "exit=$?"
```
Expected: `10 passed` (6 RLS + 4 events), `exit=0`. Ajouter `supabase functions serve &` + `sleep 5` au job CI `rls` avant `node scripts/testRls.mjs`.

- [ ] **Step 3: Commit**

```bash
git add app/supabase/tests/events.test.ts .github/workflows/quality.yml
git commit -m "test(saas): ingestion d'événements — idempotence, isolation, validation, auth"
```

---

### Task 15: Projections + branchement des écritures existantes sur `syncQueue`

**Files:**
- Create: `app/src/lib/sync/projections.ts`
- Create: `app/src/lib/sync/projections.test.ts`
- Modify: `app/src/features/simulation/SimulationRunner.tsx:185-191`
- Modify: `app/src/features/fachbegriffe/DrillPage.tsx:96`
- Modify: `app/src/hooks/useData.ts` (`useSimulations`)
- Modify: `app/src/lib/program.ts` (écriture de `ProgramConfig` → événement `program.configured`)

**Interfaces:**
- Consumes: `syncQueue.push`, `db.progress_events`.
- Produces: `latestSrs(events, fachbegriffId): Srs | null` ; `simulationsFrom(events): Simulation[]` ; `rebuildProjections(): Promise<void>` (reconstruit `simulations`, `fachbegriffe.srs`, `cases.layerProgress` depuis le journal — utilisé après `pull`).

- [ ] **Step 1: Test des projections pures (échoue)**

```ts
// app/src/lib/sync/projections.test.ts
import { describe, it, expect } from 'vitest';
import { latestSrs, simulationsFrom } from './projections';
import type { ProgressEvent } from './events';

const e = (type: ProgressEvent['type'], subject_id: string, payload: unknown, occurred_at: string): ProgressEvent => ({ id: crypto.randomUUID(), user_id: 'u', type, subject_id, payload, occurred_at });

describe('projections', () => {
  it('latestSrs : le plus récent par occurred_at gagne (last-write-wins)', () => {
    const evs = [
      e('srs.reviewed', 'fb-1', { interval: 1, easeFactor: 2.5, dueDate: 1, repetitions: 1, lapses: 0, state: 'Gelernt' }, '2026-01-02T00:00:00Z'),
      e('srs.reviewed', 'fb-1', { interval: 6, easeFactor: 2.6, dueDate: 2, repetitions: 2, lapses: 0, state: 'Gelernt' }, '2026-01-03T00:00:00Z'),
      e('srs.reviewed', 'fb-1', { interval: 0, easeFactor: 2.5, dueDate: 0, repetitions: 0, lapses: 0, state: 'Neu' }, '2026-01-01T00:00:00Z'),
    ];
    expect(latestSrs(evs, 'fb-1')?.interval).toBe(6);
    expect(latestSrs(evs, 'fb-2')).toBeNull();
  });
  it('simulationsFrom : une Simulation par événement simulation.completed', () => {
    const sim = { id: 's1', caseId: 'c1', date: 1, parts: {}, notes: {}, prioritizedCorrections: [] };
    const out = simulationsFrom([e('simulation.completed', 'c1', sim, '2026-01-01T00:00:00Z'), e('plan.done', 'p', {}, '2026-01-01T00:00:00Z')]);
    expect(out).toEqual([sim]);
  });
});
```

- [ ] **Step 2: Lancer — échoue**

```bash
cd app && npx vitest run src/lib/sync/projections; echo "exit=$?"
```

- [ ] **Step 3: Implémentation**

```ts
// app/src/lib/sync/projections.ts
import { db } from '@/db/db';
import type { Simulation, Srs, Layer } from '@/db/types';
import type { ProgressEvent } from './events';

export function latestSrs(events: ProgressEvent[], fachbegriffId: string): Srs | null {
  let best: ProgressEvent | null = null;
  for (const e of events) if (e.type === 'srs.reviewed' && e.subject_id === fachbegriffId && (!best || e.occurred_at > best.occurred_at)) best = e;
  return best ? (best.payload as Srs) : null;
}
export const simulationsFrom = (events: ProgressEvent[]): Simulation[] =>
  events.filter((e) => e.type === 'simulation.completed').map((e) => e.payload as Simulation);

/** Reconstruit les tables dérivées depuis le journal (après un pull). */
export async function rebuildProjections(): Promise<void> {
  const events = await db.progress_events.toArray();
  const sims = simulationsFrom(events);
  await db.simulations.bulkPut(sims);
  // SRS : dernier état par terme
  const byTerm = new Map<string, ProgressEvent>();
  for (const e of events) if (e.type === 'srs.reviewed' && e.subject_id) { const p = byTerm.get(e.subject_id); if (!p || e.occurred_at > p.occurred_at) byTerm.set(e.subject_id, e); }
  await db.transaction('rw', db.fachbegriffe, async () => {
    for (const [id, e] of byTerm) { const fb = await db.fachbegriffe.get(id); if (fb) await db.fachbegriffe.update(id, { srs: e.payload as Srs }); }
  });
  // Couche atteinte par cas : max
  const layerByCase = new Map<string, Layer>();
  for (const e of events) if (e.type === 'case.layer_reached' && e.subject_id) layerByCase.set(e.subject_id, Math.max(layerByCase.get(e.subject_id) ?? 0, (e.payload as { layer: Layer }).layer) as Layer);
  await db.transaction('rw', db.cases, async () => { for (const [id, layer] of layerByCase) await db.cases.update(id, { layerProgress: layer }); });
}
```
Branchements :
- `SimulationRunner.tsx` ligne 185 : remplacer `await db.simulations.put(sim);` par `await db.simulations.put(sim); await syncQueue.push({ type: 'simulation.completed', subject_id: c.id, payload: sim });` et après la mise à jour du cas (l.191) ajouter `await syncQueue.push({ type: 'case.layer_reached', subject_id: c.id, payload: { layer } });`. Retirer `profileId: useProfiles.getState().activeId` (Task 16 supprime les profils ; mettre `profileId: undefined` en attendant).
- `DrillPage.tsx` ligne 96 : après `await db.fachbegriffe.update(card.id, { srs: newSrs });` ajouter `await syncQueue.push({ type: 'srs.reviewed', subject_id: card.id, payload: newSrs });`.
- `program.ts` : là où `setMeta(programKey(id), config)` est appelé, ajouter `await syncQueue.push({ type: 'program.configured', subject_id: null, payload: config });`.
- `queue.ts` : dans `pull`, après `bulkPut(fresh)`, appeler `await rebuildProjections()` (import).

- [ ] **Step 4: Lancer — passe + validateurs**

```bash
cd app && npx vitest run src && npx tsc -b --noEmit && for s in checkProbeCoverage checkMusterCoverage checkCaseCoherence checkGuideCoverage checkTherapieLabels checkAllergyConflicts; do node scripts/$s.mjs >/dev/null 2>&1 || { echo "❌ $s"; exit 1; }; done; echo "exit=$?"
```
Expected: tous verts, `exit=0`.

- [ ] **Step 5: Vérification bout en bout (deux appareils = deux contextes Playwright)**

```bash
playwright-cli -s=dev1 open 'http://localhost:5173/#/signin'   # se connecter e2e@test.dev (Inbucket), jouer une simulation courte, terminer
playwright-cli -s=dev2 open 'http://localhost:5173/#/signin'   # même compte, autre contexte
playwright-cli -s=dev2 eval 'async () => { const {db}=await import("/src/db/db.ts"); await new Promise(r=>setTimeout(r,3000)); return { sims: await db.simulations.count(), events: await db.progress_events.count() }; }'
```
Expected: `sims ≥ 1, events ≥ 1` sur le second contexte sans avoir joué dessus.

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/sync/projections.ts app/src/lib/sync/projections.test.ts app/src/lib/sync/queue.ts app/src/features/simulation/SimulationRunner.tsx app/src/features/fachbegriffe/DrillPage.tsx app/src/lib/program.ts
git commit -m "feat(saas): projections depuis le journal + écritures existantes routées par syncQueue"
```

---

### Task 16: Migration depuis la bêta locale + suppression des profils locaux

**Files:**
- Create: `app/src/features/account/MigrationPrompt.tsx`
- Create: `app/src/lib/sync/migrateLocal.ts`
- Create: `app/src/lib/sync/migrateLocal.test.ts`
- Modify: `app/src/main.tsx` (retirer `useProfiles.load()`)
- Delete (après migration) : `app/src/store/profile.ts`, écrans/composants de profils dans `Sidebar.tsx`, `SimulationSetup.tsx` (section « Répartition des rôles » → « Le simulant »), `hooks/useData.ts` (`useSimulations` filtre par profil → par `user_id`).

**Interfaces:**
- Produces: `migrateLocalProgress(uid): Promise<{ events: number }>` — convertit `simulations` (profil actif ou sans profil), `fachbegriffe.srs` non-neufs, `cases.layerProgress`, `meta program:*` en `progress_events` et les enfile ; réattribue `user_id:'local'` → `uid`.

- [ ] **Step 1: Test (échoue)**

```ts
// app/src/lib/sync/migrateLocal.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db/db';
vi.mock('@/lib/auth/session', () => ({ getAccessToken: vi.fn().mockResolvedValue(null), useSession: { getState: () => ({ user: { id: 'u1' } }) } }));
import { migrateLocalProgress } from './migrateLocal';

describe('migrateLocalProgress', () => {
  beforeEach(async () => { await Promise.all([db.simulations.clear(), db.fachbegriffe.clear(), db.cases.clear(), db.progress_events.clear(), db.outbox.clear()]); });
  it('convertit simulations, SRS appris et couches en événements attribués à uid', async () => {
    await db.simulations.put({ id: 's1', caseId: 'c1', date: 1700000000000, parts: {}, notes: {}, prioritizedCorrections: [] } as never);
    await db.fachbegriffe.put({ id: 'fb1', term: 'x', srs: { interval: 3, easeFactor: 2.5, dueDate: 1, repetitions: 1, lapses: 0, state: 'Gelernt' } } as never);
    await db.fachbegriffe.put({ id: 'fb2', term: 'y', srs: { interval: 0, easeFactor: 2.5, dueDate: 0, repetitions: 0, lapses: 0, state: 'Neu' } } as never);
    await db.cases.put({ id: 'c1', layerProgress: 2 } as never);
    const r = await migrateLocalProgress('u1');
    expect(r.events).toBe(3);                       // 1 sim + 1 srs (fb2 Neu ignoré) + 1 layer
    const evs = await db.progress_events.toArray();
    expect(evs.every((e) => e.user_id === 'u1')).toBe(true);
    expect(await db.outbox.count()).toBe(3);
  });
  it('est idempotent (rejouer ne duplique pas)', async () => {
    await db.simulations.put({ id: 's1', caseId: 'c1', date: 1, parts: {}, notes: {}, prioritizedCorrections: [] } as never);
    await migrateLocalProgress('u1'); await migrateLocalProgress('u1');
    expect(await db.progress_events.count()).toBe(1);
  });
});
```

- [ ] **Step 2: Implémentation**

```ts
// app/src/lib/sync/migrateLocal.ts
import { db, getMeta, setMeta } from '@/db/db';
import { syncQueue } from './queue';
import type { NewEvent } from './events';

/** Convertit la progression de la bêta locale en événements (idempotent via meta 'migratedLocal'). */
export async function migrateLocalProgress(uid: string): Promise<{ events: number }> {
  if (await getMeta<boolean>('migratedLocal', false)) return { events: 0 };
  // réattribue ce qui a été produit en invité
  await db.progress_events.where('user_id').equals('local').modify({ user_id: uid });
  const toPush: NewEvent[] = [];
  for (const s of await db.simulations.toArray()) toPush.push({ type: 'simulation.completed', subject_id: s.caseId, payload: s, occurred_at: new Date(s.date).toISOString() });
  for (const fb of await db.fachbegriffe.toArray()) if (fb.srs && fb.srs.state !== 'Neu') toPush.push({ type: 'srs.reviewed', subject_id: fb.id, payload: fb.srs, occurred_at: new Date(fb.srs.dueDate || Date.now()).toISOString() });
  for (const c of await db.cases.toArray()) if (c.layerProgress) toPush.push({ type: 'case.layer_reached', subject_id: c.id, payload: { layer: c.layerProgress } });
  for (const key of (await db.meta.toCollection().primaryKeys()).filter((k) => String(k).startsWith('program:'))) toPush.push({ type: 'program.configured', subject_id: null, payload: await getMeta(String(key), null) });
  for (const ev of toPush) await syncQueue.push(ev);
  await setMeta('migratedLocal', true);
  return { events: toPush.length };
}
```
```tsx
// app/src/features/account/MigrationPrompt.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, getMeta } from '@/db/db';
import { useSession } from '@/lib/auth/session';
import { migrateLocalProgress } from '@/lib/sync/migrateLocal';

/** Au premier lancement après mise à jour : propose de reprendre la progression locale dans le compte. */
export function MigrationPrompt() {
  const nav = useNavigate();
  const status = useSession((s) => s.status); const uid = useSession((s) => s.user?.id);
  const [show, setShow] = useState(false); const [count, setCount] = useState(0);
  useEffect(() => { (async () => {
    if (await getMeta('migratedLocal', false) || await getMeta('migrationDismissed', false)) return;
    const n = await db.simulations.count(); setCount(n); setShow(n > 0);
  })(); }, []);
  if (!show) return null;
  const accept = async () => { if (status === 'authenticated' && uid) { await migrateLocalProgress(uid); setShow(false); } else nav('/signin'); };
  const later = async () => { await db.meta.put({ key: 'migrationDismissed', value: true }); setShow(false); };
  return (
    <div className="card mb-4 flex items-center justify-between gap-4 border-brand-300 p-4">
      <div><div className="font-semibold">Reprendre ta progression</div><div className="text-sm text-slate-500">{count} simulation{count > 1 ? 's' : ''} sur cet appareil. Crée ton compte pour les retrouver partout.</div></div>
      <div className="flex gap-2"><button onClick={later} className="btn-outline">Plus tard</button><button onClick={accept} className="btn-primary">{status === 'authenticated' ? 'Reprendre' : 'Créer mon compte'}</button></div>
    </div>
  );
}
```
Monter `<MigrationPrompt />` en tête de la page d'accueil. Dans `AuthCallback`, après `loadEntitlements()`, appeler `migrateLocalProgress(uid)` si `simulations.count() > 0` et non migré.

Suppression des profils : retirer `useProfiles` de `main.tsx`, `Sidebar.tsx` (bloc « Profil actif »), `SimulationSetup.tsx` (garder uniquement la carte « Le simulant »), `SimulationRunner.tsx` (`profileId`), `useData.ts` (`useSimulations` → `db.simulations.orderBy('date').reverse().toArray()` sans filtre), `program.ts` (`programKey` → constante `'program'`). Supprimer `store/profile.ts`. Garder les `demoSimulations` de `seed.ts` uniquement si `progress_events` est vide **et** invité (sinon retirer l'appel).

- [ ] **Step 3: Lancer — passe**

```bash
cd app && npx vitest run src && npx tsc -b --noEmit && npm run build >/dev/null; echo "exit=$?"
```
Expected: tout vert, `exit=0`. `grep -rn "useProfiles" src` doit être vide.

- [ ] **Step 4: Commit**

```bash
git add app/src/lib/sync/migrateLocal.ts app/src/lib/sync/migrateLocal.test.ts app/src/features/account/MigrationPrompt.tsx app/src/features/account/AuthCallback.tsx app/src/main.tsx app/src/components/Sidebar.tsx app/src/features/simulation/SimulationSetup.tsx app/src/features/simulation/SimulationRunner.tsx app/src/hooks/useData.ts app/src/lib/program.ts app/src/data/seed.ts app/src/features/home/HomePage.tsx
git rm -q app/src/store/profile.ts
git commit -m "feat(saas): migration de la progression locale vers le compte ; suppression des profils locaux (D1)"
```

---

## Tranche D — Stripe et crédits (Tasks 17–21)

### Task 17: Migration `stripe_events` + compte Stripe test + prix

**Files:**
- Create: `app/supabase/migrations/20260915000006_stripe.sql`
- Modify: `app/supabase/seed.sql` (vrais `price_…` test)

- [ ] **Step 1: Migration**

```sql
-- 20260915000006_stripe.sql
create table public.stripe_events (event_id text primary key, type text, received_at timestamptz not null default now());
alter table public.stripe_events enable row level security;  -- aucune policy : service role uniquement
```

- [ ] **Step 2: Produits Stripe (mode test) — action Mehdi guidée**

```bash
brew install stripe/stripe-cli/stripe && stripe login
stripe products create --name "Doctopus Pro" ; stripe prices create --product <prod_id> --unit-amount 1900 --currency eur --recurring interval=month
stripe products create --name "Doctopus Premium" ; stripe prices create --product <prod_id> --unit-amount 3900 --currency eur --recurring interval=month
```
Les montants (19 € / 39 €) sont des **placeholders de test** ; les prix réels sont une décision produit hors de ce plan. Copier les deux `price_…` dans `seed.sql` à la place de `price_PRO_TODO` / `price_PREM_TODO`. Créer `app/supabase/.env` (non commité) avec `STRIPE_SECRET_KEY=sk_test_…` et `STRIPE_WEBHOOK_SECRET=` (rempli à Task 19).

- [ ] **Step 3: Appliquer et commit**

```bash
cd app && npm run db:reset && npx supabase db query "select id, stripe_price_id from public.plans;"
git add app/supabase/migrations/20260915000006_stripe.sql app/supabase/seed.sql
git commit -m "feat(saas): table stripe_events + prix test dans le seed"
```

---

### Task 18: Edge Functions `checkout` + `portal` ; pages Pricing et Compte

**Files:**
- Create: `app/supabase/functions/checkout/index.ts`
- Create: `app/supabase/functions/portal/index.ts`
- Create: `app/src/features/pricing/PricingPage.tsx`
- Create: `app/src/features/account/AccountPage.tsx`
- Modify: `app/src/main.tsx` (routes `/pricing`, `/account`, `/merci`)

**Interfaces:**
- Produces: `POST /checkout {plan}` → `{ url }` ; `POST /portal` → `{ url }` ; `callFn(name, body)` helper client dans `lib/supabase.ts`.

- [ ] **Step 1: Fonctions**

```ts
// app/supabase/functions/checkout/index.ts
import Stripe from 'npm:stripe@16';
import { userClient, serviceClient, json } from '../_shared/supabase.ts';
import { z, parse, handle } from '../_shared/validate.ts';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
const Body = z.object({ plan: z.enum(['pro', 'premium']), returnUrl: z.string().url() });

Deno.serve(handle(async (req) => {
  const sb = userClient(req);
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);
  const { plan, returnUrl } = parse(Body, await req.json());
  const admin = serviceClient();
  const { data: p } = await admin.from('plans').select('stripe_price_id').eq('id', plan).single();
  if (!p?.stripe_price_id) return json({ error: 'plan_not_purchasable' }, 400);
  // un customer Stripe par utilisateur, réutilisé
  const { data: sub } = await admin.from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
  const customer = sub?.stripe_customer_id ?? (await stripe.customers.create({ email: user.email, metadata: { user_id: user.id } })).id;
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription', customer, line_items: [{ price: p.stripe_price_id, quantity: 1 }],
    success_url: `${returnUrl}#/merci`, cancel_url: `${returnUrl}#/pricing`,
    metadata: { user_id: user.id, plan }, subscription_data: { metadata: { user_id: user.id, plan } },
    automatic_tax: { enabled: true }, customer_update: { address: 'auto' },
  });
  return json({ url: session.url });
}));
```
```ts
// app/supabase/functions/portal/index.ts
import Stripe from 'npm:stripe@16';
import { userClient, serviceClient, json } from '../_shared/supabase.ts';
import { z, parse, handle } from '../_shared/validate.ts';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
Deno.serve(handle(async (req) => {
  const sb = userClient(req);
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);
  const { returnUrl } = parse(z.object({ returnUrl: z.string().url() }), await req.json());
  const { data: sub } = await serviceClient().from('subscriptions').select('stripe_customer_id').eq('user_id', user.id).maybeSingle();
  if (!sub) return json({ error: 'no_subscription' }, 404);
  const s = await stripe.billingPortal.sessions.create({ customer: sub.stripe_customer_id, return_url: `${returnUrl}#/account` });
  return json({ url: s.url });
}));
```
Dans `lib/supabase.ts`, ajouter :
```ts
export async function callFn<T>(name: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body });
  if (error) throw error; return data as T;
}
```

- [ ] **Step 2: Pages**

```tsx
// app/src/features/pricing/PricingPage.tsx
import { callFn } from '@/lib/supabase';
import { useSession } from '@/lib/auth/session';
import { useEntitlements } from '@/lib/entitlements';
import { useNavigate } from 'react-router-dom';

const PLANS = [
  { id: 'free', name: 'Free', price: '0 €', lines: ['12 cas cliniques', 'Glossaire complet', 'Simulations locales illimitées'] },
  { id: 'pro', name: 'Pro', price: '— €/mois', lines: ['Tous les cas', 'Binôme en ligne', 'Ligue', '200 crédits IA / mois'] },
  { id: 'premium', name: 'Premium', price: '— €/mois', lines: ['Tout Pro', '1 000 crédits IA / mois', 'Patient vocal (bientôt)'] },
] as const;

export function PricingPage() {
  const nav = useNavigate(); const authed = useSession((s) => s.status === 'authenticated'); const { plan } = useEntitlements();
  const buy = async (id: 'pro' | 'premium') => {
    if (!authed) return nav('/signin');
    const { url } = await callFn<{ url: string }>('checkout', { plan: id, returnUrl: window.location.origin + import.meta.env.BASE_URL });
    window.location.href = url;
  };
  return (
    <div className="mx-auto max-w-4xl space-y-6 py-8">
      <div><div className="label">Tarifs</div><h1 className="text-2xl font-bold">Choisis ton rythme</h1></div>
      <div className="grid gap-4 md:grid-cols-3">{PLANS.map((p) => (
        <div key={p.id} className={`card flex flex-col p-5 ${plan === p.id ? 'border-brand-500' : ''}`}>
          <div className="text-lg font-bold">{p.name}</div><div className="font-display text-3xl">{p.price}</div>
          <ul className="my-4 flex-1 space-y-1 text-sm text-slate-600">{p.lines.map((l) => <li key={l}>· {l}</li>)}</ul>
          {p.id === 'free' ? <span className="text-xs text-slate-400">{plan === 'free' ? 'Ton plan actuel' : ''}</span>
            : plan === p.id ? <span className="btn-outline justify-center">Ton plan actuel</span>
            : <button onClick={() => buy(p.id)} className="btn-primary justify-center">Choisir {p.name}</button>}
        </div>))}</div>
      <p className="text-xs text-slate-400">Résiliable à tout moment depuis ton compte. Les prix affichés seront fixés avant le lancement.</p>
    </div>
  );
}
```
```tsx
// app/src/features/account/AccountPage.tsx
import { Link } from 'react-router-dom';
import { callFn } from '@/lib/supabase';
import { useSession, signOut } from '@/lib/auth/session';
import { useEntitlements } from '@/lib/entitlements';
import { db } from '@/db/db';

export function AccountPage() {
  const user = useSession((s) => s.user); const { plan, credits } = useEntitlements();
  const portal = async () => { const { url } = await callFn<{ url: string }>('portal', { returnUrl: window.location.origin + import.meta.env.BASE_URL }); window.location.href = url; };
  const exportJson = async () => {
    const data = { exportedAt: new Date().toISOString(), events: await db.progress_events.toArray() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `doctopus-${Date.now()}.json` }); a.click();
  };
  const remove = async () => {
    if (!confirm('Supprimer définitivement ton compte et ta progression ? Exporte d\'abord si tu veux garder une copie.')) return;
    await callFn('delete-account', { confirm: true }); await signOut(); window.location.hash = '#/';
  };
  return (
    <div className="mx-auto max-w-xl space-y-6 py-8">
      <div><div className="label">Compte</div><h1 className="text-2xl font-bold">{user?.email}</h1></div>
      <div className="card space-y-3 p-5">
        <div className="flex items-center justify-between"><span>Plan</span><b className="capitalize">{plan}</b></div>
        <div className="flex items-center justify-between"><span>Crédits IA</span><b className="font-mono">{credits}</b></div>
        {plan === 'free' ? <Link to="/pricing" className="btn-primary justify-center">Passer à Pro</Link> : <button onClick={portal} className="btn-outline justify-center">Gérer l'abonnement · factures</button>}
      </div>
      <div className="card space-y-3 p-5">
        <button onClick={exportJson} className="btn-outline w-full justify-center">Exporter ma progression (JSON)</button>
        <button onClick={() => signOut()} className="btn-outline w-full justify-center">Se déconnecter</button>
        <button onClick={remove} className="w-full text-xs text-signal-600 hover:underline">Supprimer mon compte</button>
      </div>
    </div>
  );
}
```
Routes dans `main.tsx` : `pricing`, `account`, `merci` (composant inline : « Merci ! Ton accès se débloque dans quelques secondes. » + lien accueil). Mettre à jour le lien « Compte » de `Sidebar.tsx` vers `/account`.

- [ ] **Step 3: Vérifier en local (Checkout test)**

```bash
cd app && npx supabase functions serve --env-file supabase/.env --no-verify-jwt &
playwright-cli -s=saas open 'http://localhost:5173/#/pricing'
```
Connecté, cliquer « Choisir Pro » → redirection vers `checkout.stripe.com` (carte test `4242 4242 4242 4242`). Après paiement, retour `/merci`. (Le déblocage effectif arrive avec le webhook, Task 19.)

- [ ] **Step 4: Commit**

```bash
git add app/supabase/functions/checkout app/supabase/functions/portal app/src/lib/supabase.ts app/src/features/pricing/PricingPage.tsx app/src/features/account/AccountPage.tsx app/src/main.tsx app/src/components/Sidebar.tsx
git commit -m "feat(saas): checkout et portal Stripe ; pages Tarifs et Compte (export, déconnexion, suppression)"
```

---

### Task 19: Edge Function `stripe-webhook` + tests de transitions

**Files:**
- Create: `app/supabase/functions/stripe-webhook/index.ts`
- Create: `app/supabase/tests/stripe.test.ts`

**Interfaces:**
- Produces: `POST /stripe-webhook` (signature vérifiée, idempotence `stripe_events`) ; `upsertSubscriptionFromStripe(sub)` ; grant mensuel `credit_ledger(monthly_grant, ref = invoice.id)`.

- [ ] **Step 1: Fonction**

```ts
// app/supabase/functions/stripe-webhook/index.ts
import Stripe from 'npm:stripe@16';
import { serviceClient, json } from '../_shared/supabase.ts';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
const SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
const STATUS: Record<string, string> = { active: 'active', trialing: 'trialing', past_due: 'past_due', canceled: 'canceled', unpaid: 'past_due', incomplete: 'incomplete', incomplete_expired: 'canceled', paused: 'canceled' };

async function upsertSubscription(admin: ReturnType<typeof serviceClient>, sub: Stripe.Subscription) {
  const user_id = sub.metadata.user_id; const plan_id = sub.metadata.plan;
  if (!user_id || !plan_id) { console.warn('subscription sans metadata', sub.id); return; }
  const { error } = await admin.from('subscriptions').upsert({
    user_id, plan_id, stripe_customer_id: String(sub.customer), stripe_subscription_id: sub.id,
    status: STATUS[sub.status] ?? 'incomplete', current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature') ?? '';
  let event: Stripe.Event;
  try { event = await stripe.webhooks.constructEventAsync(await req.text(), sig, SECRET); }
  catch (e) { return json({ error: 'bad_signature' }, 400); }
  const admin = serviceClient();
  // idempotence : un événement Stripe n'est traité qu'une fois
  const { error: dup } = await admin.from('stripe_events').insert({ event_id: event.id, type: event.type });
  if (dup) return json({ received: true, duplicate: true });

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.subscription) await upsertSubscription(admin, await stripe.subscriptions.retrieve(String(s.subscription)));
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await upsertSubscription(admin, event.data.object as Stripe.Subscription); break;
    case 'invoice.paid': {
      // nouveau cycle payé → grant mensuel, idempotent par invoice.id
      const inv = event.data.object as Stripe.Invoice;
      if (!inv.subscription) break;
      const sub = await stripe.subscriptions.retrieve(String(inv.subscription));
      const user_id = sub.metadata.user_id; const plan_id = sub.metadata.plan;
      const { data: p } = await admin.from('plans').select('monthly_credits').eq('id', plan_id).single();
      if (user_id && p?.monthly_credits) await admin.from('credit_ledger').insert({ user_id, delta: p.monthly_credits, reason: 'monthly_grant', ref: inv.id }).then(({ error }) => { if (error && !error.message.includes('duplicate')) throw error; });
      break;
    }
    case 'charge.refunded': {
      const ch = event.data.object as Stripe.Charge;
      const user_id = (await stripe.customers.retrieve(String(ch.customer)) as Stripe.Customer).metadata?.user_id;
      const { data: p } = user_id ? await admin.from('subscriptions').select('plan_id').eq('user_id', user_id).maybeSingle() : { data: null };
      const { data: plan } = p ? await admin.from('plans').select('monthly_credits').eq('id', p.plan_id).single() : { data: null };
      if (user_id && plan?.monthly_credits) await admin.from('credit_ledger').insert({ user_id, delta: -plan.monthly_credits, reason: 'refund', ref: ch.id }).then(() => {});
      break;
    }
  }
  return json({ received: true });
});
```

- [ ] **Step 2: Brancher le CLI Stripe en local**

```bash
stripe listen --forward-to http://127.0.0.1:54321/functions/v1/stripe-webhook
```
Copier le `whsec_…` affiché dans `app/supabase/.env` (`STRIPE_WEBHOOK_SECRET`), relancer `functions serve --env-file supabase/.env`.

- [ ] **Step 3: Test de transitions (fixtures déclenchées par `stripe trigger`)**

```ts
// app/supabase/tests/stripe.test.ts
import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { createTestUser, serviceClient } from './helpers';

// Prérequis : `stripe listen` actif et fonctions servies avec .env. Skippé sinon.
const enabled = !!process.env.STRIPE_TESTS;
const trigger = (ev: string, overrides: string[] = []) => execSync(`stripe trigger ${ev} ${overrides.map((o) => `--override ${o}`).join(' ')}`, { stdio: 'pipe' });
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe.skipIf(!enabled)('stripe webhook', () => {
  let U: Awaited<ReturnType<typeof createTestUser>>;
  beforeAll(async () => { U = await createTestUser('stripe@test.dev'); });

  it('subscription.created avec metadata → ligne subscriptions active', async () => {
    trigger('customer.subscription.created', [`subscription:metadata.user_id=${U.id}`, 'subscription:metadata.plan=pro']);
    await wait(3000);
    const { data } = await serviceClient().from('subscriptions').select('plan_id,status').eq('user_id', U.id).single();
    expect(data).toMatchObject({ plan_id: 'pro', status: 'active' });
  });
  it('invoice.paid → grant mensuel idempotent', async () => {
    trigger('invoice.paid', [`subscription:metadata.user_id=${U.id}`, 'subscription:metadata.plan=pro']);
    await wait(3000);
    const { data } = await serviceClient().from('credit_ledger').select('delta').eq('user_id', U.id).eq('reason', 'monthly_grant');
    expect(data!.length).toBe(1); expect(data![0].delta).toBe(200);
  });
  it('subscription.deleted → canceled → plan effectif free', async () => {
    trigger('customer.subscription.deleted', [`subscription:metadata.user_id=${U.id}`, 'subscription:metadata.plan=pro']);
    await wait(3000);
    const { data } = await serviceClient().rpc('effective_plan', { uid: U.id });
    expect(data).toBe('free');
  });
});
```

- [ ] **Step 4: Lancer**

```bash
cd app && STRIPE_TESTS=1 node scripts/testRls.mjs; echo "exit=$?"
```
Expected: les tests Stripe passent (3) en plus des précédents. En CI ils sont **skippés** (pas de `STRIPE_TESTS`) — ils tournent localement avant chaque release, ce qui est documenté dans le job.

- [ ] **Step 5: Vérifier le déblocage sans rechargement**

Depuis `/pricing` connecté : payer en test → `/merci` → observer dans les 5 s que la Sidebar affiche « Pro » et que `db.cases.count()` passe de 12 à > 100 (Realtime → `loadEntitlements` → `contentLoader.sync`). Pour ce dernier enchaînement, dans `entitlements/index.ts::loadEntitlements`, après `store.setState(next)`, si `next.plan !== prev.plan` appeler `contentLoader.sync()` (import dynamique pour éviter le cycle).

- [ ] **Step 6: Commit**

```bash
git add app/supabase/functions/stripe-webhook app/supabase/tests/stripe.test.ts app/src/lib/entitlements/index.ts
git commit -m "feat(saas): webhook Stripe idempotent — abonnements, grant mensuel, remboursement ; resync du contenu au changement de plan"
```

---

### Task 20: Edge Function `credits-consume` (débit atomique, 409 avant l'appel IA)

**Files:**
- Create: `app/supabase/functions/credits-consume/index.ts`
- Create: `app/supabase/migrations/20260915000007_credits_consume.sql`

**Interfaces:**
- Produces: fonction SQL `consume_credits(uid, amount, reason, ref) returns int` (solde après, ou exception `insufficient_credits`) ; `POST /credits-consume {amount, reason, ref}` → `{ balance }` ou 409. **Interne** : appelée par les futures fonctions IA, exposée ici pour les tests.

- [ ] **Step 1: Migration (atomicité en SQL, pas en TypeScript)**

```sql
-- 20260915000007_credits_consume.sql
create or replace function public.consume_credits(uid uuid, amount int, reason text, ref text) returns int
language plpgsql security definer set search_path = public as $$
declare bal int;
begin
  if amount <= 0 then raise exception 'invalid_amount'; end if;
  -- verrou par utilisateur : deux débits concurrents ne peuvent pas passer sous zéro
  perform pg_advisory_xact_lock(hashtext(uid::text));
  select coalesce(sum(delta), 0) into bal from public.credit_ledger where user_id = uid;
  if bal < amount then raise exception 'insufficient_credits' using detail = bal::text; end if;
  insert into public.credit_ledger (user_id, delta, reason, ref) values (uid, -amount, reason, ref)
    on conflict (user_id, reason, ref) do nothing;   -- même ref = déjà débité, pas de double débit
  select coalesce(sum(delta), 0) into bal from public.credit_ledger where user_id = uid;
  return bal;
end $$;
revoke all on function public.consume_credits(uuid, int, text, text) from anon, authenticated;
```

- [ ] **Step 2: Fonction**

```ts
// app/supabase/functions/credits-consume/index.ts
import { userClient, serviceClient, json } from '../_shared/supabase.ts';
import { z, parse, handle } from '../_shared/validate.ts';
const Body = z.object({ amount: z.number().int().min(1).max(1000), reason: z.enum(['ai.arztbrief', 'ai.voice']), ref: z.string().min(1).max(200) });
Deno.serve(handle(async (req) => {
  const { data: { user } } = await userClient(req).auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);
  const { amount, reason, ref } = parse(Body, await req.json());
  const { data, error } = await serviceClient().rpc('consume_credits', { uid: user.id, amount, reason, ref });
  if (error?.message.includes('insufficient_credits')) return json({ error: 'insufficient_credits', balance: Number(error.details ?? 0) }, 409);
  if (error) throw error;
  return json({ balance: data });
}));
```

- [ ] **Step 3: Test (ajouter à `events.test.ts` ou nouveau bloc dans `stripe.test.ts` — ici dans `rls.test.ts` pour rester sans Stripe)**

Ajouter à `app/supabase/tests/rls.test.ts` :
```ts
describe('crédits', () => {
  it('débit atomique, 409 si insuffisant, idempotent par ref', async () => {
    const admin = serviceClient();
    await admin.from('credit_ledger').insert({ user_id: A.id, delta: 5, reason: 'demo_grant', ref: 'credits-test' });
    const tok = (await A.client.auth.getSession()).data.session!.access_token;
    const call = (body: unknown) => fetch(`${URL}/functions/v1/credits-consume`, { method: 'POST', headers: { Authorization: `Bearer ${tok}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    expect((await (await call({ amount: 3, reason: 'ai.arztbrief', ref: 'job-1' })).json()).balance).toBe(2);
    expect((await (await call({ amount: 3, reason: 'ai.arztbrief', ref: 'job-1' })).json()).balance).toBe(2);   // même ref : pas de double débit
    expect((await call({ amount: 3, reason: 'ai.arztbrief', ref: 'job-2' })).status).toBe(409);
  });
});
```
(`URL` est exporté par `helpers.ts`.)

- [ ] **Step 4: Lancer et commit**

```bash
cd app && npm run db:reset && (npx supabase functions serve --env-file supabase/.env --no-verify-jwt >/dev/null 2>&1 &) && sleep 4 && node scripts/testRls.mjs; echo "exit=$?"
git add app/supabase/migrations/20260915000007_credits_consume.sql app/supabase/functions/credits-consume app/supabase/tests/rls.test.ts
git commit -m "feat(saas): consume_credits atomique (verrou, 409 avant appel IA, idempotent par ref)"
```

---

### Task 21: Edge Function `delete-account`

**Files:**
- Create: `app/supabase/functions/delete-account/index.ts`

- [ ] **Step 1: Fonction**

```ts
// app/supabase/functions/delete-account/index.ts
import Stripe from 'npm:stripe@16';
import { userClient, serviceClient, json } from '../_shared/supabase.ts';
import { z, parse, handle } from '../_shared/validate.ts';
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, { apiVersion: '2024-06-20' });
Deno.serve(handle(async (req) => {
  const { data: { user } } = await userClient(req).auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);
  parse(z.object({ confirm: z.literal(true) }), await req.json());
  const admin = serviceClient();
  const { data: sub } = await admin.from('subscriptions').select('stripe_subscription_id').eq('user_id', user.id).maybeSingle();
  if (sub?.stripe_subscription_id) await stripe.subscriptions.cancel(sub.stripe_subscription_id).catch((e) => console.warn('stripe cancel', e.message));
  // la cascade profiles → subscriptions/ledger/events est déclenchée par la suppression de auth.users
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;
  return json({ deleted: true });
}));
```

- [ ] **Step 2: Test manuel puis commit**

Depuis `/account` d'un compte de test : « Supprimer mon compte » → confirmer → `select count(*) from profiles where id = '<uid>'` doit rendre 0, ainsi que `progress_events`.
```bash
git add app/supabase/functions/delete-account
git commit -m "feat(saas): suppression de compte (Stripe cancel + cascade)"
```

---

## Tranche E — Contrats et clôture (Task 22)

### Task 22: `docs/contracts/` + parcours pré-release + critères d'acceptation

**Files:**
- Create: `docs/contracts/schema.sql` (généré)
- Create: `docs/contracts/openapi.yaml`
- Create: `docs/contracts/entitlements.md`
- Create: `docs/contracts/sync-protocol.md`
- Create: `app/scripts/dumpSchema.mjs`
- Modify: `app/docs/ROADMAP-PRODUCTION.md` (état)

- [ ] **Step 1: Schéma généré (source de vérité = migrations)**

```js
// app/scripts/dumpSchema.mjs — docs/contracts/schema.sql est GÉNÉRÉ, jamais édité à la main
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const sql = execSync('npx supabase db dump --local --schema public', { encoding: 'utf8', maxBuffer: 32e6 });
writeFileSync('../docs/contracts/schema.sql', `-- GÉNÉRÉ par app/scripts/dumpSchema.mjs — ne pas éditer\n${sql}`);
console.log('docs/contracts/schema.sql écrit');
```
```bash
cd app && mkdir -p ../docs/contracts && node scripts/dumpSchema.mjs
```

- [ ] **Step 2: OpenAPI**

```yaml
# docs/contracts/openapi.yaml
openapi: 3.1.0
info: { title: Doctopus Edge Functions, version: 1.0.0 }
servers: [{ url: "{supabase_url}/functions/v1" }]
components:
  securitySchemes: { bearer: { type: http, scheme: bearer } }
  schemas:
    ContentItem: { type: object, required: [id, kind, tier, version, payload, deleted], properties: { id: {type: string}, kind: {type: string, enum: [case, fachwissen, fachbegriff, aufklaerung, guide, muster]}, tier: {type: integer}, version: {type: integer}, payload: {type: object}, deleted: {type: boolean} } }
    ProgressEvent: { type: object, required: [id, type, subject_id, payload, occurred_at], properties: { id: {type: string, format: uuid}, type: {type: string, enum: [simulation.completed, srs.reviewed, plan.done, case.layer_reached, program.configured]}, subject_id: {type: [string, "null"]}, payload: {type: object}, occurred_at: {type: string, format: date-time} } }
paths:
  /content:
    get:
      summary: Delta de contenu depuis une version, filtré par le tier de l'appelant (anonyme = 1)
      parameters: [{ name: since, in: query, schema: { type: integer, default: 0 } }]
      responses: { "200": { content: { application/json: { schema: { type: object, properties: { version: {type: integer}, items: { type: array, items: { $ref: "#/components/schemas/ContentItem" } } } } } } } }
  /events:
    post:
      security: [{ bearer: [] }]
      summary: Ingestion d'événements de progression (≤ 100, insert-only, idempotent par id)
      requestBody: { content: { application/json: { schema: { type: object, properties: { events: { type: array, maxItems: 100, items: { $ref: "#/components/schemas/ProgressEvent" } } } } } } }
      responses:
        "200": { content: { application/json: { schema: { type: object, properties: { acked: {type: array, items: {type: string}}, rejected: {type: array, items: {type: object, properties: {id: {type: string}, reason: {type: string}}}} } } } } }
        "400": { description: lot invalide }
        "401": { description: non authentifié }
        "429": { description: rate limit (600/min) }
    get:
      security: [{ bearer: [] }]
      parameters: [{ name: since, in: query, schema: { type: string, format: date-time } }]
      responses: { "200": { content: { application/json: { schema: { type: object, properties: { events: { type: array, items: { $ref: "#/components/schemas/ProgressEvent" } } } } } } } }
  /checkout:
    post: { security: [{ bearer: [] }], requestBody: { content: { application/json: { schema: { type: object, required: [plan, returnUrl], properties: { plan: {type: string, enum: [pro, premium]}, returnUrl: {type: string, format: uri} } } } } }, responses: { "200": { content: { application/json: { schema: { type: object, properties: { url: {type: string} } } } } } } }
  /portal:
    post: { security: [{ bearer: [] }], requestBody: { content: { application/json: { schema: { type: object, required: [returnUrl], properties: { returnUrl: {type: string, format: uri} } } } } }, responses: { "200": { content: { application/json: { schema: { type: object, properties: { url: {type: string} } } } } }, "404": { description: pas d'abonnement } } }
  /credits-consume:
    post: { security: [{ bearer: [] }], requestBody: { content: { application/json: { schema: { type: object, required: [amount, reason, ref], properties: { amount: {type: integer, minimum: 1}, reason: {type: string, enum: [ai.arztbrief, ai.voice]}, ref: {type: string} } } } } }, responses: { "200": { content: { application/json: { schema: { type: object, properties: { balance: {type: integer} } } } } }, "409": { description: crédits insuffisants } } }
  /delete-account:
    post: { security: [{ bearer: [] }], requestBody: { content: { application/json: { schema: { type: object, required: [confirm], properties: { confirm: {type: boolean, const: true} } } } } }, responses: { "200": { description: supprimé } } }
  /stripe-webhook:
    post: { summary: Webhook Stripe (signature vérifiée, idempotent par event.id), responses: { "200": { description: reçu }, "400": { description: signature invalide } } }
```

- [ ] **Step 3: Entitlements et protocole de sync**

```markdown
<!-- docs/contracts/entitlements.md -->
# Matrice d'entitlements — source : table `entitlements` (seed.sql)

| Feature | Free | Pro | Premium | Sens de `limit_value` |
|---|---|---|---|---|
| `content.tier` | 1 | 2 | 3 | tier maximal lisible |
| `sim.online` | — | ∞ | ∞ | binôme en ligne |
| `league` | — | ∞ | ∞ | ligue |
| `ai.arztbrief` | — | ∞ | ∞ | accès à la feature (coût en crédits) |
| `ai.voice` | — | — | ∞ | accès (coût en crédits) |
| `credits.monthly` | 0 | 200 | 1000 | grant à chaque `invoice.paid` |

Règles : `null` = illimité ; absence = pas le droit ; `has(f)` = `limit(f) === null || limit(f) > 0`.
Plan effectif : `effective_plan(uid)` — `active`/`trialing` → plan ; `past_due` → plan pendant 7 jours ; sinon `free`.
Le client lit cette table pour afficher ; le serveur la lit pour autoriser. **Aucune autre définition.**
```
```markdown
<!-- docs/contracts/sync-protocol.md -->
# Protocole de synchronisation de la progression

**Modèle** : journal d'événements additifs, serveur autoritaire, id généré client (uuid v4).

**Ce qui se synchronise** : `simulation.completed`, `srs.reviewed`, `plan.done`, `case.layer_reached`, `program.configured`.
**Ce qui reste local** : Bogen en cours, session en pause, préférences d'affichage.

**Push** : `syncQueue.push` écrit `progress_events` (Dexie) + `outbox`, puis `flush()` — `POST /events` par lots de 100.
- 2xx : `acked` retirés de l'outbox ; `rejected` retirés et journalisés (pas de rejeu).
- 4xx (lot) : tout le lot rejeté.
- 5xx / réseau : conservé ; backoff 1 s × 2^n, plafond 5 min.
Déclencheurs : après chaque push, `online`, intervalle 2 min si outbox non vide.

**Pull** : `GET /events?since=<max received_at local>` (horloge SERVEUR, jamais `occurred_at` client) au démarrage et après chaque flush ; insertion des ids inconnus ; puis `rebuildProjections()`.

**Conflits** : aucun par construction (additif). Seule mutation logique : SRS d'un terme → last-write-wins par `occurred_at`.
**Horloge** : `occurred_at` client (ordre d'affichage) ; `received_at` serveur (quotas, ligue).
**Migration** : `migrateLocalProgress(uid)` convertit la bêta locale, idempotent (`meta.migratedLocal`).
```

- [ ] **Step 4: Parcours pré-release complet (les deux, en ligne puis hors ligne)**

Parcours A — `playwright-cli -s=rel` : invité (12 cas) → `/signin` → lien Inbucket → onboarding → 12 cas → simulation → `select count(*) from progress_events` = 1 → `/pricing` → Checkout test → `/merci` → cas > 100 sans rechargement → `/account` → Portal → résilier → `stripe trigger customer.subscription.deleted` → au prochain `sync()` cas = 12.
Parcours B — même session : `playwright-cli -s=rel eval '() => { window.dispatchEvent(new Event("offline")); }'` (et couper le réseau du contexte via `--offline` si disponible) → jouer une simulation → `db.outbox.count()` = 1 → `online` → outbox = 0, événement en base.

Cocher les critères d'acceptation du spec §11 dans une section « Vérification » ajoutée en fin de ce plan, avec la preuve (commande + sortie) pour chacun.

- [ ] **Step 5: Commit**

```bash
git add docs/contracts app/scripts/dumpSchema.mjs app/docs/ROADMAP-PRODUCTION.md docs/superpowers/plans/2026-09-15-saas-foundations.md
git commit -m "docs(contracts): schema.sql généré, openapi, entitlements, protocole de sync ; parcours pré-release vérifiés"
```

---

## Self-Review

**Couverture du spec** — D1→Task 16 · D2→Tasks 8–11 · D3→Tasks 12–15 · D4→Task 7 · D5→Tasks 3, 6, 18 · D6→Task 5, 7 · D7→Tasks 3, 20 · D8→Task 11 (payload = objet TS) · §4.8 RLS→Tasks 2, 3, 4, 8, 13 · §5 quatre modules→Tasks 5, 6, 10, 12 · §6 sept fonctions→Tasks 9, 13, 18, 19, 20, 21 · §7 flux→Tasks 15, 19, 16 · §8 cas limites→Tasks 10 (FirstLoadRequired, purge), 12 (rejet/backoff), 3 (past_due), 19 (webhook dupliqué, refund), 20 (409), 15 (LWW), 21 (suppression) · §9 sécurité→Tasks 4, 9 (Zod), 13 (rate limit) · §10 tests→Tasks 4, 5, 6, 10, 12, 14, 15, 16, 19, 20, 22 · §11 critères→Task 22 · §12 impacts→Tasks 10, 15, 16.

**Trou comblé (décision Mehdi, 2026-09-15)** : le spec §4.4 ne disait pas quel tier pour fiches/glossaire/Aufklärung. Décision : le Free est un **échantillon complet** — les contenus dérivés prennent le tier minimal des cas qui les référencent (fiche ↔ `pathology`, Aufklärung ↔ `probableAufklaerungIds`, terme ↔ `pathologyTags`) ; sans cas Free → Pro. Exceptions Free : guides (génériques) et termes sans pathologie (vocabulaire de base). Implémenté en Task 11.

**Cohérence des types** — `ProgressEvent` (Task 12) est utilisé tel quel en 13 (Zod miroir), 15, 16, 22. `getEntitlements().limit('content.tier')` (Task 6) consommé en Task 10. `useSession`/`getAccessToken` (Task 5) consommés en 6, 10, 12. `callFn` (Task 18) défini avant usage. `URL` exporté par `helpers.ts` (Task 4) utilisé en 14, 20.

**Placeholders** — les `price_*_TODO` du seed sont remplacés en Task 17 (action explicite) ; les prix « — €/mois » de la page Tarifs sont volontairement non fixés (décision produit hors plan) et le texte le dit à l'utilisateur.
