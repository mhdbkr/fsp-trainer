# Version fondateur — comptes immédiats et switch sans login · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sur `main`, permettre à 2–quelques personnes de créer un compte immédiatement (e-mail + mot de passe, sans lien magique), de partager un appareil avec bascule instantanée sans re-login, chacune avec une base locale entièrement séparée.

**Architecture:** Un registre local (`localStorage`) des comptes connus sur l'appareil garde le dernier jeton de rafraîchissement de chaque compte ; basculer = `setSession` + reload. Le nom de la base Dexie est résolu au chargement du module depuis le compte actif (`fsp-cockpit-<userId>`). Un mode `VITE_AUTH_MODE=founder|public` pilote l'écran d'entrée ; en `public`, rien ne change.

**Tech Stack:** React 18, Vite 7, Zustand, Dexie, @supabase/supabase-js (auth password), Vitest (jsdom + fake-indexeddb), playwright-cli.

Spec : `docs/superpowers/specs/2026-09-16-fondateur-comptes-design.md` · ADR-0015.

## Global Constraints

- Branche de travail : `feat/fondateur-comptes` depuis `main` (worktree `../doctopus-fondateur`, copier `app/.env` et `app/supabase/.env`).
- Répertoire de travail des commandes : `app/`. Node ≥ 22. Vérifier par **code de sortie**.
- `npm run typecheck`, `npx vitest run --dir src`, `npm run build` : exit 0 après chaque tâche.
- Ne pas toucher `docs/contracts/` (aucun contrat ne change : pas de nouvelle table serveur).
- Stager fichier par fichier (`git add <fichier>`), jamais `git add -A`.
- Mode `public` = comportement actuel strictement inchangé (AC-8).
- Aucune donnée d'avancement globale : toute lecture passe par la base du compte actif.
- Clés `localStorage` : `fsp.accounts` (JSON `KnownAccount[]`), `fsp.activeUserId` (string).
- Nom de base : `fsp-cockpit-<userId>` ; `fsp-cockpit` si aucun compte actif.
- Mot de passe : minimum 8 caractères (validation côté client + réglage Supabase).
- Jamais le contexte Stripe live ; `grantFounder.mjs` n'est jamais appelé en CI.

---

### Task 1 : Registre local des comptes (`accounts.ts`)

**Files:**
- Create: `app/src/lib/auth/accounts.ts`
- Test: `app/src/lib/auth/accounts.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface KnownAccount { userId: string; email: string; displayName: string; color: string; refreshToken: string | null; lastActiveAt: number }
  export const ACCOUNT_COLORS: readonly string[];            // 'petrol','coral','indigo','amber','rose','emerald','sky','violet'
  export function listAccounts(): KnownAccount[];              // triés par lastActiveAt desc
  export function getActiveUserId(): string | null;
  export function setActiveUserId(id: string | null): void;
  export function upsertAccount(a: Omit<KnownAccount,'color'|'lastActiveAt'> & Partial<Pick<KnownAccount,'color'|'lastActiveAt'>>): KnownAccount;
  export function setRefreshToken(userId: string, token: string | null): void;
  export function forgetAccount(userId: string): void;         // retire du registre ; si actif → active = null
  export function initials(name: string): string;
  ```

- [ ] **Step 1 : écrire le test qui échoue**

```ts
// app/src/lib/auth/accounts.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { listAccounts, getActiveUserId, setActiveUserId, upsertAccount, setRefreshToken, forgetAccount, initials, ACCOUNT_COLORS } from './accounts';

describe('accounts registry', () => {
  beforeEach(() => localStorage.clear());

  it('est vide au départ, sans compte actif', () => {
    expect(listAccounts()).toEqual([]);
    expect(getActiveUserId()).toBeNull();
  });

  it('upsert ajoute un compte avec une couleur et le rend listable', () => {
    const a = upsertAccount({ userId: 'u1', email: 'a@x.de', displayName: 'Anna', refreshToken: 'r1' });
    expect(ACCOUNT_COLORS).toContain(a.color);
    expect(listAccounts()).toHaveLength(1);
    expect(listAccounts()[0].refreshToken).toBe('r1');
  });

  it('upsert du même userId met à jour sans dupliquer et garde la couleur', () => {
    const a = upsertAccount({ userId: 'u1', email: 'a@x.de', displayName: 'Anna', refreshToken: 'r1' });
    upsertAccount({ userId: 'u1', email: 'a@x.de', displayName: 'Anna B.', refreshToken: 'r2' });
    const list = listAccounts();
    expect(list).toHaveLength(1);
    expect(list[0].displayName).toBe('Anna B.');
    expect(list[0].refreshToken).toBe('r2');
    expect(list[0].color).toBe(a.color);
  });

  it('deux comptes reçoivent des couleurs différentes', () => {
    const a = upsertAccount({ userId: 'u1', email: 'a@x.de', displayName: 'A', refreshToken: null });
    const b = upsertAccount({ userId: 'u2', email: 'b@x.de', displayName: 'B', refreshToken: null });
    expect(a.color).not.toBe(b.color);
  });

  it('liste triée par dernière activité décroissante', () => {
    upsertAccount({ userId: 'u1', email: 'a@x.de', displayName: 'A', refreshToken: null, lastActiveAt: 10 });
    upsertAccount({ userId: 'u2', email: 'b@x.de', displayName: 'B', refreshToken: null, lastActiveAt: 20 });
    expect(listAccounts().map((x) => x.userId)).toEqual(['u2', 'u1']);
  });

  it('setRefreshToken ne touche que le compte visé', () => {
    upsertAccount({ userId: 'u1', email: 'a@x.de', displayName: 'A', refreshToken: 'r1' });
    upsertAccount({ userId: 'u2', email: 'b@x.de', displayName: 'B', refreshToken: 'r2' });
    setRefreshToken('u1', null);
    const byId = Object.fromEntries(listAccounts().map((x) => [x.userId, x.refreshToken]));
    expect(byId).toEqual({ u1: null, u2: 'r2' });
  });

  it('actif : set/get ; forget du compte actif remet actif à null', () => {
    upsertAccount({ userId: 'u1', email: 'a@x.de', displayName: 'A', refreshToken: null });
    setActiveUserId('u1');
    expect(getActiveUserId()).toBe('u1');
    forgetAccount('u1');
    expect(listAccounts()).toEqual([]);
    expect(getActiveUserId()).toBeNull();
  });

  it('survit à un JSON corrompu dans localStorage', () => {
    localStorage.setItem('fsp.accounts', '{not json');
    expect(listAccounts()).toEqual([]);
  });

  it('initiales : deux mots max, majuscules, ? si vide', () => {
    expect(initials('anna berg')).toBe('AB');
    expect(initials('Mehdi')).toBe('M');
    expect(initials('  ')).toBe('?');
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run src/lib/auth/accounts.test.ts`
Expected: FAIL — `Cannot find module './accounts'`

- [ ] **Step 3 : implémentation minimale**

```ts
// app/src/lib/auth/accounts.ts
// ============================================================================
// Registre LOCAL des comptes connus sur cet appareil (mode fondateur).
// Plusieurs personnes partagent un ordinateur : chacune a un compte Supabase
// réel ; on garde ici le dernier jeton de rafraîchissement de chacune pour
// basculer sans mot de passe. Aucune donnée d'avancement ici — seulement
// l'annuaire. La base Dexie de chaque compte est `fsp-cockpit-<userId>`.
// ============================================================================

export interface KnownAccount {
  userId: string;
  email: string;
  displayName: string;
  color: string;
  refreshToken: string | null;   // null = expiré/révoqué → mot de passe demandé
  lastActiveAt: number;
}

export const ACCOUNT_COLORS = ['petrol', 'coral', 'indigo', 'amber', 'rose', 'emerald', 'sky', 'violet'] as const;

const KEY_ACCOUNTS = 'fsp.accounts';
const KEY_ACTIVE = 'fsp.activeUserId';

const read = (): KnownAccount[] => {
  try {
    const raw = localStorage.getItem(KEY_ACCOUNTS);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? (v as KnownAccount[]) : [];
  } catch { return []; }
};
const write = (list: KnownAccount[]) => localStorage.setItem(KEY_ACCOUNTS, JSON.stringify(list));

export const listAccounts = (): KnownAccount[] => read().sort((a, b) => b.lastActiveAt - a.lastActiveAt);

export const getActiveUserId = (): string | null => localStorage.getItem(KEY_ACTIVE);
export const setActiveUserId = (id: string | null): void => {
  if (id) localStorage.setItem(KEY_ACTIVE, id); else localStorage.removeItem(KEY_ACTIVE);
};

const pickColor = (taken: string[]): string =>
  ACCOUNT_COLORS.find((c) => !taken.includes(c)) ?? ACCOUNT_COLORS[taken.length % ACCOUNT_COLORS.length];

export function upsertAccount(
  a: Omit<KnownAccount, 'color' | 'lastActiveAt'> & Partial<Pick<KnownAccount, 'color' | 'lastActiveAt'>>,
): KnownAccount {
  const list = read();
  const i = list.findIndex((x) => x.userId === a.userId);
  const prev = i >= 0 ? list[i] : undefined;
  const next: KnownAccount = {
    userId: a.userId, email: a.email, displayName: a.displayName,
    refreshToken: a.refreshToken,
    color: a.color ?? prev?.color ?? pickColor(list.map((x) => x.color)),
    lastActiveAt: a.lastActiveAt ?? Date.now(),
  };
  if (i >= 0) list[i] = next; else list.push(next);
  write(list);
  return next;
}

export function setRefreshToken(userId: string, token: string | null): void {
  const list = read();
  const a = list.find((x) => x.userId === userId);
  if (!a) return;
  a.refreshToken = token;
  write(list);
}

export function forgetAccount(userId: string): void {
  write(read().filter((x) => x.userId !== userId));
  if (getActiveUserId() === userId) setActiveUserId(null);
}

export const initials = (name: string): string =>
  name.trim().split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';
```

- [ ] **Step 4 : lancer, vérifier le succès**

Run: `npx vitest run src/lib/auth/accounts.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5 : commit**

```bash
git add src/lib/auth/accounts.ts src/lib/auth/accounts.test.ts
git commit -m "feat(fondateur): registre local des comptes connus sur l'appareil (annuaire + jetons, sans données d'avancement)"
```

---

### Task 2 : Une base Dexie par compte

**Files:**
- Modify: `app/src/db/db.ts:12-26` (constructeur) — ajouter la résolution du nom + `deleteAccountDb`
- Test: `app/src/db/dbName.test.ts`

**Interfaces:**
- Consumes: `getActiveUserId()` (Task 1)
- Produces:
  ```ts
  export const DB_BASE_NAME = 'fsp-cockpit';
  export function dbNameFor(userId: string | null): string;   // 'fsp-cockpit' | `fsp-cockpit-${userId}`
  export function deleteAccountDb(userId: string): Promise<void>;
  ```
  et `db` (singleton) ouvre désormais `dbNameFor(getActiveUserId())`.

- [ ] **Step 1 : test qui échoue**

```ts
// app/src/db/dbName.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import Dexie from 'dexie';
import { dbNameFor, deleteAccountDb, DB_BASE_NAME } from './db';

describe('nom de base par compte', () => {
  beforeEach(() => localStorage.clear());

  it('anonyme → base historique', () => {
    expect(dbNameFor(null)).toBe(DB_BASE_NAME);
    expect(DB_BASE_NAME).toBe('fsp-cockpit');
  });

  it('compte → base suffixée', () => {
    expect(dbNameFor('u1')).toBe('fsp-cockpit-u1');
  });

  it('deleteAccountDb supprime seulement la base visée', async () => {
    const a = new Dexie('fsp-cockpit-a'); a.version(1).stores({ t: 'id' }); await a.open(); await a.table('t').put({ id: 1 }); a.close();
    const b = new Dexie('fsp-cockpit-b'); b.version(1).stores({ t: 'id' }); await b.open(); await b.table('t').put({ id: 1 }); b.close();
    await deleteAccountDb('a');
    expect(await Dexie.exists('fsp-cockpit-a')).toBe(false);
    expect(await Dexie.exists('fsp-cockpit-b')).toBe(true);
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run src/db/dbName.test.ts`
Expected: FAIL — `dbNameFor is not a function` (ou export manquant)

- [ ] **Step 3 : implémentation**

Dans `app/src/db/db.ts`, remplacer l'en-tête et le constructeur :

```ts
import Dexie, { type Table } from 'dexie';
import type {
  Case, Fachbegriff, Fachwissen, AufklaerungItem, Guide, Simulation, PlanEntry, Meta,
} from './types';
import type { ProgressEvent, OutboxRow } from '@/lib/sync/events';
import { getActiveUserId } from '@/lib/auth/accounts';

// ============================================================================
// IndexedDB via Dexie. Tout est local, aucune requête réseau à l'exécution.
// UNE BASE PAR COMPTE (ADR-0015, spec fondateur D4) : le nom est résolu ici,
// au chargement du module, depuis le compte actif du registre local. Basculer
// de compte = changer `fsp.activeUserId` puis recharger la page — le
// singleton `db` ne change jamais de base à chaud.
// ============================================================================
export const DB_BASE_NAME = 'fsp-cockpit';
export const dbNameFor = (userId: string | null): string => (userId ? `${DB_BASE_NAME}-${userId}` : DB_BASE_NAME);

/** « Oublier ce compte sur cet appareil » : supprime sa base, et elle seule. */
export const deleteAccountDb = (userId: string): Promise<void> => Dexie.delete(dbNameFor(userId));

export class FspDatabase extends Dexie {
  // … (déclarations de tables inchangées) …
  constructor(name: string = dbNameFor(getActiveUserId())) {
    super(name);
    // … (this.version(1)/(2) inchangés) …
  }
}
```

Garder tout le reste du fichier tel quel (`export const db = new FspDatabase();` inclus).

- [ ] **Step 4 : lancer tout, vérifier**

Run: `npx vitest run src/db/dbName.test.ts && npx vitest run --dir src && npm run typecheck`
Expected: exit 0 (les tests existants ouvrent toujours `fsp-cockpit` car le registre est vide en test)

- [ ] **Step 5 : commit**

```bash
git add src/db/db.ts src/db/dbName.test.ts
git commit -m "feat(fondateur): une base Dexie par compte, nom résolu depuis le compte actif ; deleteAccountDb"
```

---

### Task 3 : Session — mot de passe, capture des jetons, bascule, déconnexion sans purge

**Files:**
- Modify: `app/src/lib/auth/session.ts` (tout le fichier après `initSession`)
- Modify: `app/src/lib/auth/session.test.ts` (mock + nouveaux cas)
- Modify: `app/src/vite-env.d.ts` (typer `VITE_AUTH_MODE`)

**Interfaces:**
- Consumes: Task 1 (`upsertAccount`, `setRefreshToken`, `setActiveUserId`, `getActiveUserId`, `listAccounts`)
- Produces:
  ```ts
  export const AUTH_MODE: 'founder' | 'public';                         // import.meta.env.VITE_AUTH_MODE ?? 'public'
  export function signUpWithPassword(p: { email: string; password: string; displayName: string }): Promise<void>;
  export function signInWithPassword(p: { email: string; password: string }): Promise<void>;
  export function switchAccount(userId: string): Promise<'switched' | 'password-required'>;
  export function signOut(): Promise<void>;                              // founder : garde la base, jeton=null ; public : purge comme avant
  ```

- [ ] **Step 1 : étendre le mock et écrire les tests qui échouent**

Remplacer le bloc `vi.mock` en tête de `session.test.ts` par :

```ts
const listeners: Array<(ev: string, s: { user: { id: string; email?: string }; refresh_token?: string } | null) => void> = [];
const auth = {
  getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
  onAuthStateChange: vi.fn((cb) => { listeners.push(cb); return { data: { subscription: { unsubscribe() {} } } }; }),
  signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
  signOut: vi.fn().mockResolvedValue({ error: null }),
  signUp: vi.fn(), signInWithPassword: vi.fn(), setSession: vi.fn(),
};
const from = vi.fn(() => ({ update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) }));
vi.mock('@/lib/supabase', () => ({ supabase: { auth, from } }));
```

Ajouter les imports : `import { listAccounts, getActiveUserId, upsertAccount, setActiveUserId } from './accounts';` et étendre l'import de `./session` avec `signUpWithPassword, signInWithPassword, switchAccount, signOut`.

Ajouter dans `beforeEach` : `localStorage.clear(); vi.clearAllMocks();` (garder les lignes existantes). Puis ces cas :

```ts
  describe('mode fondateur', () => {
    it('signUp ouvre la session, enregistre le compte et le rend actif', async () => {
      auth.signUp.mockResolvedValue({ data: { user: { id: 'u1', email: 'a@x.de' }, session: { refresh_token: 'r1', user: { id: 'u1', email: 'a@x.de' } } }, error: null });
      await signUpWithPassword({ email: 'a@x.de', password: 'secret123', displayName: 'Anna' });
      expect(auth.signUp).toHaveBeenCalledWith({ email: 'a@x.de', password: 'secret123', options: { data: { display_name: 'Anna' } } });
      expect(from).toHaveBeenCalledWith('profiles');
      expect(listAccounts()[0]).toMatchObject({ userId: 'u1', displayName: 'Anna', refreshToken: 'r1' });
      expect(getActiveUserId()).toBe('u1');
    });

    it('signUp sans session (confirmation e-mail encore active côté serveur) lève une erreur explicite', async () => {
      auth.signUp.mockResolvedValue({ data: { user: { id: 'u1' }, session: null }, error: null });
      await expect(signUpWithPassword({ email: 'a@x.de', password: 'secret123', displayName: 'A' })).rejects.toThrow(/confirmation/i);
    });

    it('signInWithPassword enregistre le compte (displayName depuis les metadata)', async () => {
      auth.signInWithPassword.mockResolvedValue({ data: { session: { refresh_token: 'r9', user: { id: 'u2', email: 'b@x.de', user_metadata: { display_name: 'Ben' } } } }, error: null });
      await signInWithPassword({ email: 'b@x.de', password: 'secret123' });
      expect(listAccounts()[0]).toMatchObject({ userId: 'u2', displayName: 'Ben', refreshToken: 'r9' });
      expect(getActiveUserId()).toBe('u2');
    });

    it('TOKEN_REFRESHED réécrit le jeton du compte courant seulement', async () => {
      upsertAccount({ userId: 'u1', email: 'a@x.de', displayName: 'A', refreshToken: 'old1' });
      upsertAccount({ userId: 'u2', email: 'b@x.de', displayName: 'B', refreshToken: 'old2' });
      await initSession();
      listeners[0]('TOKEN_REFRESHED', { user: { id: 'u1' }, refresh_token: 'new1' });
      const byId = Object.fromEntries(listAccounts().map((x) => [x.userId, x.refreshToken]));
      expect(byId).toEqual({ u1: 'new1', u2: 'old2' });
    });

    it('switchAccount : jeton valide → setSession, actif changé, "switched"', async () => {
      upsertAccount({ userId: 'u2', email: 'b@x.de', displayName: 'B', refreshToken: 'r2' });
      auth.setSession.mockResolvedValue({ data: { session: { refresh_token: 'r2b', user: { id: 'u2' } } }, error: null });
      await expect(switchAccount('u2')).resolves.toBe('switched');
      expect(auth.setSession).toHaveBeenCalledWith({ access_token: '', refresh_token: 'r2' });
      expect(getActiveUserId()).toBe('u2');
      expect(listAccounts()[0].refreshToken).toBe('r2b');
    });

    it('switchAccount : jeton refusé → jeton=null, actif inchangé, "password-required"', async () => {
      setActiveUserId('u1');
      upsertAccount({ userId: 'u2', email: 'b@x.de', displayName: 'B', refreshToken: 'dead' });
      auth.setSession.mockResolvedValue({ data: { session: null }, error: { message: 'Invalid Refresh Token' } });
      await expect(switchAccount('u2')).resolves.toBe('password-required');
      expect(getActiveUserId()).toBe('u1');
      expect(listAccounts().find((x) => x.userId === 'u2')?.refreshToken).toBeNull();
    });

    it('switchAccount : pas de jeton → "password-required" sans appel réseau', async () => {
      upsertAccount({ userId: 'u2', email: 'b@x.de', displayName: 'B', refreshToken: null });
      await expect(switchAccount('u2')).resolves.toBe('password-required');
      expect(auth.setSession).not.toHaveBeenCalled();
    });

    it('signOut (founder) : scope local, jeton=null, compte gardé, actif=null', async () => {
      upsertAccount({ userId: 'u1', email: 'a@x.de', displayName: 'A', refreshToken: 'r1' });
      setActiveUserId('u1');
      await signOut();
      expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
      expect(listAccounts()[0].refreshToken).toBeNull();
      expect(getActiveUserId()).toBeNull();
    });
  });
```

Le fichier de test doit forcer le mode : en tête, avant les imports de `./session`, ajouter `vi.stubEnv('VITE_AUTH_MODE', 'founder');`. Ajouter un dernier cas, dans un `describe('mode public')` séparé qui fait `vi.stubEnv('VITE_AUTH_MODE', 'public')` puis `vi.resetModules()` et ré-importe dynamiquement `./session` : `signOut` doit appeler `auth.signOut()` sans argument et vider `db.progress_events` (utiliser `const { db } = await import('@/db/db'); await db.progress_events.put({ id: 'e', user_id: 'u', type: 't', subject_id: 's', occurred_at: '2026-01-01', payload: {} } as never); await signOut(); expect(await db.progress_events.count()).toBe(0)`).

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run src/lib/auth/session.test.ts`
Expected: FAIL — `signUpWithPassword` n'est pas exporté

- [ ] **Step 3 : implémentation**

Dans `app/src/vite-env.d.ts` (créer si absent) :

```ts
/// <reference types="vite/client" />
interface ImportMetaEnv { readonly VITE_SUPABASE_URL: string; readonly VITE_SUPABASE_ANON_KEY: string; readonly VITE_AUTH_MODE?: 'founder' | 'public' }
interface ImportMeta { readonly env: ImportMetaEnv }
```

Dans `session.ts`, après l'import de `supabase`, ajouter :

```ts
import { upsertAccount, setRefreshToken, setActiveUserId, getActiveUserId, listAccounts } from './accounts';

/** founder : comptes immédiats + bascule locale (ADR-0015). public : comportement SaaS. */
export const AUTH_MODE: 'founder' | 'public' = import.meta.env.VITE_AUTH_MODE === 'founder' ? 'founder' : 'public';
```

Dans `initSession`, remplacer la dernière ligne (`supabase.auth.onAuthStateChange(...)`) par :

```ts
  supabase.auth.onAuthStateChange((event, session) => {
    apply(session?.user ?? null);
    // Rotation des jetons : seul le dernier est valide → on le garde pour ce compte.
    if (AUTH_MODE === 'founder' && session?.user && session.refresh_token && (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN')) {
      setRefreshToken(session.user.id, session.refresh_token);
    }
  });
```

Puis ajouter, avant `clearLocalProgress` :

```ts
// ── Mode fondateur : mot de passe, sans lien magique ────────────────────────
type SessionLike = { refresh_token: string; user: { id: string; email?: string; user_metadata?: Record<string, unknown> } };

const remember = (s: SessionLike, displayName: string) => {
  upsertAccount({ userId: s.user.id, email: s.user.email ?? '', displayName, refreshToken: s.refresh_token });
  setActiveUserId(s.user.id);
};

export async function signUpWithPassword(p: { email: string; password: string; displayName: string }): Promise<void> {
  const { data, error } = await supabase.auth.signUp({ email: p.email, password: p.password, options: { data: { display_name: p.displayName } } });
  if (error) throw error;
  if (!data.session) throw new Error('Le serveur exige une confirmation par e-mail : désactiver « Confirm email » dans Supabase Auth (spec §4).');
  await supabase.from('profiles').update({ display_name: p.displayName }).eq('id', data.session.user.id);
  remember(data.session as SessionLike, p.displayName);
}

export async function signInWithPassword(p: { email: string; password: string }): Promise<void> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: p.email, password: p.password });
  if (error) throw error;
  const s = data.session as SessionLike;
  const name = (s.user.user_metadata?.display_name as string | undefined) ?? s.user.email?.split('@')[0] ?? 'Moi';
  remember(s, name);
}

/** Bascule sans mot de passe. L'appelant recharge la page après 'switched'. */
export async function switchAccount(userId: string): Promise<'switched' | 'password-required'> {
  const a = listAccounts().find((x) => x.userId === userId);
  if (!a?.refreshToken) return 'password-required';
  const { data, error } = await supabase.auth.setSession({ access_token: '', refresh_token: a.refreshToken });
  if (error || !data.session) { setRefreshToken(userId, null); return 'password-required'; }
  setRefreshToken(userId, data.session.refresh_token);
  setActiveUserId(userId);
  return 'switched';
}
```

Remplacer `signOut` par :

```ts
export const signOut = async () => {
  if (AUTH_MODE === 'founder') {
    // La base locale est celle du compte : rien à purger. On invalide juste le jeton local.
    const id = getActiveUserId();
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
    if (id) setRefreshToken(id, null);
    setActiveUserId(null);
    return;
  }
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  await clearLocalProgress();
};
```

- [ ] **Step 4 : lancer, vérifier**

Run: `npx vitest run src/lib/auth && npm run typecheck`
Expected: exit 0

- [ ] **Step 5 : commit**

```bash
git add src/lib/auth/session.ts src/lib/auth/session.test.ts src/vite-env.d.ts
git commit -m "feat(fondateur): session par mot de passe, capture des jetons, bascule de compte, déconnexion sans purge en mode founder"
```

---

### Task 4 : Écran d'entrée `FounderGate` et séquence de démarrage

**Files:**
- Create: `app/src/features/auth/FounderGate.tsx`
- Test: `app/src/features/auth/FounderGate.test.tsx`
- Modify: `app/src/main.tsx:95-110` (séquence de boot)

**Interfaces:**
- Consumes: Task 3 (`AUTH_MODE`, `signUpWithPassword`, `signInWithPassword`, `switchAccount`), Task 1 (`listAccounts`, `initials`)
- Produces: `export function FounderGate(props: { onDone: () => void }): JSX.Element` — rendu plein écran ; appelle `onDone` (= `location.reload()`) après création, connexion ou bascule réussie.

- [ ] **Step 1 : test qui échoue**

```tsx
// app/src/features/auth/FounderGate.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const session = { signUpWithPassword: vi.fn(), signInWithPassword: vi.fn(), switchAccount: vi.fn() };
vi.mock('@/lib/auth/session', () => ({ ...session, AUTH_MODE: 'founder' }));
import { upsertAccount } from '@/lib/auth/accounts';
import { FounderGate } from './FounderGate';

describe('FounderGate', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

  it('sans compte connu : formulaire de création ; soumission → signUp → onDone', async () => {
    session.signUpWithPassword.mockResolvedValue(undefined);
    const onDone = vi.fn();
    render(<FounderGate onDone={onDone} />);
    expect(screen.getByRole('heading', { name: /créer mon compte/i })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/prénom/i), { target: { value: 'Anna' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'a@x.de' } });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /créer/i }));
    await waitFor(() => expect(session.signUpWithPassword).toHaveBeenCalledWith({ email: 'a@x.de', password: 'secret123', displayName: 'Anna' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('mot de passe < 8 : bloqué côté client, pas d\'appel', () => {
    render(<FounderGate onDone={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/prénom/i), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'a@x.de' } });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: /créer/i }));
    expect(session.signUpWithPassword).not.toHaveBeenCalled();
    expect(screen.getByText(/8 caractères/i)).toBeTruthy();
  });

  it('« j\'ai déjà un compte » bascule sur le formulaire de connexion', async () => {
    session.signInWithPassword.mockResolvedValue(undefined);
    const onDone = vi.fn();
    render(<FounderGate onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: /déjà un compte/i }));
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'a@x.de' } });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));
    await waitFor(() => expect(session.signInWithPassword).toHaveBeenCalledWith({ email: 'a@x.de', password: 'secret123' }));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('comptes connus listés en tête ; clic → switchAccount → onDone', async () => {
    upsertAccount({ userId: 'u1', email: 'a@x.de', displayName: 'Anna', refreshToken: 'r1' });
    session.switchAccount.mockResolvedValue('switched');
    const onDone = vi.fn();
    render(<FounderGate onDone={onDone} />);
    fireEvent.click(screen.getByRole('button', { name: /anna/i }));
    await waitFor(() => expect(session.switchAccount).toHaveBeenCalledWith('u1'));
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('bascule refusée → champ mot de passe pour ce compte, e-mail pré-rempli', async () => {
    upsertAccount({ userId: 'u1', email: 'a@x.de', displayName: 'Anna', refreshToken: null });
    session.switchAccount.mockResolvedValue('password-required');
    session.signInWithPassword.mockResolvedValue(undefined);
    render(<FounderGate onDone={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /anna/i }));
    await waitFor(() => expect(screen.getByLabelText(/mot de passe/i)).toBeTruthy());
    expect((screen.getByLabelText(/e-mail/i) as HTMLInputElement).value).toBe('a@x.de');
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));
    await waitFor(() => expect(session.signInWithPassword).toHaveBeenCalledWith({ email: 'a@x.de', password: 'secret123' }));
  });

  it('erreur serveur affichée', async () => {
    session.signUpWithPassword.mockRejectedValue(new Error('User already registered'));
    render(<FounderGate onDone={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/prénom/i), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'a@x.de' } });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /créer/i }));
    await waitFor(() => expect(screen.getByText(/already registered/i)).toBeTruthy());
  });
});
```

Si `@testing-library/react` n'est pas installé : `npm i -D @testing-library/react@16` (vérifier `grep testing-library package.json` d'abord).

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run src/features/auth/FounderGate.test.tsx`
Expected: FAIL — module `./FounderGate` introuvable

- [ ] **Step 3 : implémentation**

```tsx
// app/src/features/auth/FounderGate.tsx
import { useState } from 'react';
import { listAccounts, initials } from '@/lib/auth/accounts';
import { signUpWithPassword, signInWithPassword, switchAccount } from '@/lib/auth/session';

// Écran unique de première ouverture en mode fondateur (ADR-0015) : créer un
// compte en trois champs, ou reprendre un compte connu sur cet appareil sans
// mot de passe. Aucun lien magique. `onDone` = recharger l'app (la base Dexie
// du compte est résolue au chargement du module).

const DOT: Record<string, string> = {
  petrol: 'bg-brand-500', coral: 'bg-signal-500', indigo: 'bg-indigo-500', amber: 'bg-amber-500',
  rose: 'bg-rose-500', emerald: 'bg-emerald-500', sky: 'bg-sky-500', violet: 'bg-violet-500',
};
type Mode = 'create' | 'signin';

export function FounderGate({ onDone }: { onDone: () => void }) {
  const known = listAccounts();
  const [mode, setMode] = useState<Mode>('create');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<void>) => {
    setError(null); setBusy(true);
    try { await fn(); onDone(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères.'); return; }
    if (mode === 'create') void run(() => signUpWithPassword({ email: email.trim(), password, displayName: name.trim() }));
    else void run(() => signInWithPassword({ email: email.trim(), password }));
  };

  const resume = async (userId: string, accountEmail: string) => {
    setError(null);
    const r = await switchAccount(userId);
    if (r === 'switched') { onDone(); return; }
    setMode('signin'); setEmail(accountEmail);
    setError('Reconnexion nécessaire pour ce compte : saisis son mot de passe.');
  };

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <div className="label">Doctopus · FSP Trainer</div>
          <h1 className="text-2xl font-bold">{mode === 'create' ? 'Créer mon compte' : 'Se connecter'}</h1>
          <p className="text-sm text-slate-500">Chaque personne a son compte : sa progression, ses simulations, son programme. Rien n'est partagé.</p>
        </div>

        {known.length > 0 && (
          <div className="card space-y-1 p-3">
            <div className="label mb-1">Sur cet appareil</div>
            {known.map((a) => (
              <button key={a.userId} type="button" onClick={() => resume(a.userId, a.email)} disabled={busy}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-slate-100 dark:hover:bg-white/10">
                <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white ${DOT[a.color] ?? 'bg-brand-500'}`}>{initials(a.displayName)}</span>
                <span className="flex-1"><span className="block font-semibold">{a.displayName}</span><span className="block text-xs text-slate-500">{a.email}</span></span>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={submit} className="card space-y-3 p-4">
          {mode === 'create' && (
            <label className="block text-sm"><span className="label">Prénom</span>
              <input aria-label="Prénom" required value={name} onChange={(e) => setName(e.target.value)} className="input w-full" autoFocus /></label>
          )}
          <label className="block text-sm"><span className="label">E-mail</span>
            <input aria-label="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input w-full" /></label>
          <label className="block text-sm"><span className="label">Mot de passe</span>
            <input aria-label="Mot de passe" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="input w-full" /></label>
          <button type="submit" disabled={busy} className="btn-primary w-full justify-center">{mode === 'create' ? 'Créer et commencer' : 'Se connecter'}</button>
          {error && <p className="text-xs text-signal-600">{error}</p>}
        </form>

        <button type="button" onClick={() => { setMode(mode === 'create' ? 'signin' : 'create'); setError(null); }} className="w-full text-center text-sm text-slate-500 hover:underline">
          {mode === 'create' ? "J'ai déjà un compte" : 'Créer un nouveau compte'}
        </button>
      </div>
    </div>
  );
}
```

Note : `minLength={8}` sur l'input bloque la soumission native ; en test jsdom, `fireEvent.click` déclenche `submit` sans validation native — le contrôle JS `password.length < 8` reste nécessaire (test 2).

Dans `main.tsx`, ajouter les imports `import { FounderGate } from '@/features/auth/FounderGate'; import { AUTH_MODE } from '@/lib/auth/session'; import { getActiveUserId } from '@/lib/auth/accounts';` et, **avant** la chaîne `initSession()…`, remplacer le début de la chaîne par :

```tsx
function renderFounderGate() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode><FounderGate onDone={() => location.reload()} /></React.StrictMode>,
  );
}

// Mode fondateur : pas de compte actif sur cet appareil → écran d'entrée, rien
// d'autre ne démarre (ni sync, ni contenu). Un compte actif → séquence normale.
if (AUTH_MODE === 'founder' && !getActiveUserId()) {
  renderFounderGate();
} else {
  initSession()
    .then(() => loadEntitlements())
    // … (le reste de la chaîne, inchangé, jusqu'au .catch) …
}
```

Garde-fou dans la chaîne normale, juste après `initSession()` : `.then(() => { if (AUTH_MODE === 'founder' && useSession.getState().status !== 'authenticated') { setActiveUserId(null); location.reload(); throw new Error('halt'); } })` — un compte actif dont la session est morte au boot renvoie à l'écran d'entrée au lieu d'ouvrir l'app en anonyme (importer `useSession` et `setActiveUserId`). Le `.catch` existant doit ignorer `halt` : `if ((e as Error).message === 'halt') return;` en tête.

- [ ] **Step 4 : lancer, vérifier**

Run: `npx vitest run src/features/auth && npm run typecheck && npm run build`
Expected: exit 0

- [ ] **Step 5 : vérification manuelle rapide**

Dans `app/.env` ajouter `VITE_AUTH_MODE=founder`. `npm run dev` (port libre) → ouvrir → l'écran « Créer mon compte » s'affiche ; sans réglage Supabase « Confirm email = off », la création renvoie le message explicite de la Task 3. Retirer/garder la variable selon l'environnement.

- [ ] **Step 6 : commit**

```bash
git add src/features/auth/FounderGate.tsx src/features/auth/FounderGate.test.tsx src/main.tsx
git commit -m "feat(fondateur): écran d'entrée FounderGate (créer / se connecter / reprendre un compte connu) branché au démarrage en mode founder"
```

---

### Task 5 : `AccountSwitcher` (barre + dock) et « Oublier ce compte »

**Files:**
- Create: `app/src/components/AccountSwitcher.tsx`
- Test: `app/src/components/AccountSwitcher.test.tsx`
- Modify: `app/src/components/Sidebar.tsx:57-80` (`AccountLink` → délègue en mode founder)
- Modify: `app/src/features/account/AccountPage.tsx:20-35` (masquer Stripe en founder ; bouton « Oublier ce compte sur cet appareil »)

**Interfaces:**
- Consumes: Task 1 (`listAccounts`, `getActiveUserId`, `forgetAccount`, `initials`), Task 2 (`deleteAccountDb`), Task 3 (`switchAccount`, `signOut`, `AUTH_MODE`)
- Produces: `export function AccountSwitcher({ dock }: { dock?: boolean }): JSX.Element` ; `export async function forgetAccountOnDevice(userId: string): Promise<void>` (registre + base ; si actif → reload)

- [ ] **Step 1 : test qui échoue**

```tsx
// app/src/components/AccountSwitcher.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Dexie from 'dexie';

const session = { switchAccount: vi.fn(), signOut: vi.fn() };
vi.mock('@/lib/auth/session', () => ({ ...session, AUTH_MODE: 'founder' }));
import { upsertAccount, setActiveUserId, listAccounts } from '@/lib/auth/accounts';
import { AccountSwitcher, forgetAccountOnDevice } from './AccountSwitcher';

describe('AccountSwitcher', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

  it('affiche le compte actif et liste les autres au clic', () => {
    upsertAccount({ userId: 'u1', email: 'a@x.de', displayName: 'Anna', refreshToken: 'r' });
    upsertAccount({ userId: 'u2', email: 'b@x.de', displayName: 'Ben', refreshToken: 'r' });
    setActiveUserId('u1');
    render(<AccountSwitcher />);
    fireEvent.click(screen.getByRole('button', { name: /anna/i }));
    expect(screen.getByRole('menuitem', { name: /ben/i })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /ajouter un compte/i })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /se déconnecter/i })).toBeTruthy();
  });

  it('choisir un autre compte → switchAccount(u2)', async () => {
    upsertAccount({ userId: 'u1', email: 'a@x.de', displayName: 'Anna', refreshToken: 'r' });
    upsertAccount({ userId: 'u2', email: 'b@x.de', displayName: 'Ben', refreshToken: 'r' });
    setActiveUserId('u1');
    session.switchAccount.mockResolvedValue('switched');
    render(<AccountSwitcher />);
    fireEvent.click(screen.getByRole('button', { name: /anna/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /ben/i }));
    await waitFor(() => expect(session.switchAccount).toHaveBeenCalledWith('u2'));
  });

  it('forgetAccountOnDevice retire du registre et supprime la base de ce compte seulement', async () => {
    upsertAccount({ userId: 'u1', email: 'a@x.de', displayName: 'A', refreshToken: 'r' });
    upsertAccount({ userId: 'u2', email: 'b@x.de', displayName: 'B', refreshToken: 'r' });
    for (const id of ['u1', 'u2']) { const d = new Dexie(`fsp-cockpit-${id}`); d.version(1).stores({ t: 'id' }); await d.open(); d.close(); }
    await forgetAccountOnDevice('u1');
    expect(listAccounts().map((x) => x.userId)).toEqual(['u2']);
    expect(await Dexie.exists('fsp-cockpit-u1')).toBe(false);
    expect(await Dexie.exists('fsp-cockpit-u2')).toBe(true);
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run src/components/AccountSwitcher.test.tsx`
Expected: FAIL — module introuvable

- [ ] **Step 3 : implémentation**

```tsx
// app/src/components/AccountSwitcher.tsx
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { listAccounts, getActiveUserId, forgetAccount, initials, setActiveUserId } from '@/lib/auth/accounts';
import { switchAccount, signOut } from '@/lib/auth/session';
import { deleteAccountDb } from '@/db/db';
import { Icon } from '@/components/icons';

// Bascule de compte sans login (mode fondateur). Basculer recharge l'app :
// la base Dexie et tous les stores repartent propres pour l'autre personne.

const DOT: Record<string, string> = {
  petrol: 'bg-brand-500', coral: 'bg-signal-500', indigo: 'bg-indigo-500', amber: 'bg-amber-500',
  rose: 'bg-rose-500', emerald: 'bg-emerald-500', sky: 'bg-sky-500', violet: 'bg-violet-500',
};

const toGate = () => { setActiveUserId(null); location.reload(); };

/** Oublier sur cet appareil : registre + base locale. Les données restent sur le serveur. */
export async function forgetAccountOnDevice(userId: string): Promise<void> {
  const wasActive = getActiveUserId() === userId;
  forgetAccount(userId);
  await deleteAccountDb(userId);
  if (wasActive) location.reload();
}

export function AccountSwitcher({ dock = false }: { dock?: boolean }) {
  const [open, setOpen] = useState(false);
  const accounts = listAccounts();
  const activeId = getActiveUserId();
  const active = accounts.find((a) => a.userId === activeId);
  if (!active) return null;
  const others = accounts.filter((a) => a.userId !== activeId);

  const go = async (userId: string) => {
    const r = await switchAccount(userId);
    if (r === 'switched') location.reload(); else toGate();   // la porte demandera le mot de passe
  };
  const out = async () => { await signOut(); location.reload(); };

  const avatar = <span className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white ${DOT[active.color] ?? 'bg-brand-500'}`}>{initials(active.displayName)}</span>;

  return (
    <div className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
        className={dock ? 'grid h-11 w-11 place-items-center rounded-2xl hover:bg-slate-100 dark:hover:bg-white/10' : 'btn-ghost w-full justify-center gap-2 md:justify-start'}>
        {avatar}{!dock && <span className="hidden md:inline">{active.displayName}</span>}
      </button>
      {open && (
        <div role="menu" className="absolute bottom-full left-0 z-30 mb-2 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {others.map((a) => (
            <button key={a.userId} role="menuitem" onClick={() => go(a.userId)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/10">
              <span className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold text-white ${DOT[a.color] ?? 'bg-brand-500'}`}>{initials(a.displayName)}</span>{a.displayName}
            </button>
          ))}
          <button role="menuitem" onClick={toGate} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-white/10"><Icon name="plus" className="h-4 w-4" />Ajouter un compte</button>
          <NavLink role="menuitem" to="/account" onClick={() => setOpen(false)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-white/10"><Icon name="user" className="h-4 w-4" />Mon compte</NavLink>
          <button role="menuitem" onClick={out} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">Se déconnecter</button>
        </div>
      )}
    </div>
  );
}
```

Vérifier que l'icône `plus` existe dans `components/icons` (`grep -n "plus" src/components/icons.tsx`) ; sinon utiliser `user`.

Le `NavLink` en test : le composant est rendu hors router dans le test 1 → envelopper le rendu de test dans `<MemoryRouter>` (`import { MemoryRouter } from 'react-router-dom'`) pour les trois tests qui rendent le composant.

Dans `Sidebar.tsx`, en tête de `AccountLink` :

```tsx
import { AccountSwitcher } from '@/components/AccountSwitcher';
import { AUTH_MODE } from '@/lib/auth/session';
// …
function AccountLink({ dock = false }: { dock?: boolean }) {
  if (AUTH_MODE === 'founder') return <AccountSwitcher dock={dock} />;
  // … (inchangé) …
```

Dans `AccountPage.tsx` : importer `AUTH_MODE` et `forgetAccountOnDevice` ; conditionner le bloc Plan (`{AUTH_MODE === 'public' && (…bloc plan/portal…)}`) ; ajouter sous « Se déconnecter » :

```tsx
{AUTH_MODE === 'founder' && user && (
  <button onClick={() => { if (confirm('Oublier ce compte sur cet appareil ? Ta progression reste sur le serveur.')) void forgetAccountOnDevice(user.id); }}
    className="w-full text-xs text-slate-500 hover:underline">Oublier ce compte sur cet appareil</button>
)}
```

- [ ] **Step 4 : lancer, vérifier**

Run: `npx vitest run src/components/AccountSwitcher.test.tsx && npx vitest run --dir src && npm run typecheck && npm run build`
Expected: exit 0

- [ ] **Step 5 : commit**

```bash
git add src/components/AccountSwitcher.tsx src/components/AccountSwitcher.test.tsx src/components/Sidebar.tsx src/features/account/AccountPage.tsx
git commit -m "feat(fondateur): AccountSwitcher (barre + dock), oublier un compte sur l'appareil, page compte sans Stripe en mode founder"
```

---

### Task 6 : Pré-simulation — carte « Le médecin » = qui s'entraîne

**Files:**
- Modify: `app/src/features/simulation/SimulationSetup.tsx:98-112` (`RolesCard`)
- Test: `app/src/features/simulation/RolesCard.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`listAccounts`, `getActiveUserId`, `initials`), Task 3 (`switchAccount`, `AUTH_MODE`)
- Produces: rien de nouveau ; `RolesCard` exporté pour le test (`export function RolesCard`).

- [ ] **Step 1 : test qui échoue**

```tsx
// app/src/features/simulation/RolesCard.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const session = { switchAccount: vi.fn() };
vi.mock('@/lib/auth/session', () => ({ ...session, AUTH_MODE: 'founder' }));
import { upsertAccount, setActiveUserId } from '@/lib/auth/accounts';
import { RolesCard } from './SimulationSetup';

describe('RolesCard — le médecin', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
  it('affiche le compte actif comme médecin et permet de choisir un autre', async () => {
    upsertAccount({ userId: 'u1', email: 'a@x.de', displayName: 'Anna', refreshToken: 'r' });
    upsertAccount({ userId: 'u2', email: 'b@x.de', displayName: 'Ben', refreshToken: 'r' });
    setActiveUserId('u1');
    session.switchAccount.mockResolvedValue('switched');
    render(<MemoryRouter><RolesCard caseId="c1" /></MemoryRouter>);
    expect(screen.getByText(/le médecin/i)).toBeTruthy();
    expect(screen.getByRole('radio', { name: /anna/i })).toHaveProperty('checked', true);
    fireEvent.click(screen.getByRole('radio', { name: /ben/i }));
    await waitFor(() => expect(session.switchAccount).toHaveBeenCalledWith('u2'));
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run src/features/simulation/RolesCard.test.tsx`
Expected: FAIL — `RolesCard` non exporté / carte absente

- [ ] **Step 3 : implémentation**

Dans `SimulationSetup.tsx` : `export function RolesCard(...)` ; imports `listAccounts, getActiveUserId, initials` depuis `@/lib/auth/accounts`, `switchAccount, AUTH_MODE` depuis `@/lib/auth/session`. Dans la grille `sm:grid-cols-2`, **avant** la carte « Le simulant », ajouter :

```tsx
        {/* Rôle médecin = le compte qui s'entraîne (mode fondateur) */}
        {AUTH_MODE === 'founder' && <DoctorCard />}
```

et, en bas du fichier :

```tsx
const DOT: Record<string, string> = {
  petrol: 'bg-brand-500', coral: 'bg-signal-500', indigo: 'bg-indigo-500', amber: 'bg-amber-500',
  rose: 'bg-rose-500', emerald: 'bg-emerald-500', sky: 'bg-sky-500', violet: 'bg-violet-500',
};

function DoctorCard() {
  const accounts = listAccounts();
  const activeId = getActiveUserId();
  const choose = async (userId: string) => {
    if (userId === activeId) return;
    const r = await switchAccount(userId);
    if (r === 'switched') location.reload();
    else { const { setActiveUserId } = await import('@/lib/auth/accounts'); setActiveUserId(null); location.reload(); }
  };
  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-3 dark:border-brand-900/40 dark:bg-brand-900/10">
      <div className="flex items-center gap-2 font-semibold text-brand-700 dark:text-brand-300">
        <Icon name="user" className="h-4 w-4" />Le médecin
      </div>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Qui s'entraîne ? La simulation, l'évaluation et le programme vont à ce compte.</p>
      <div role="radiogroup" className="mt-2 flex flex-wrap gap-1.5">
        {accounts.map((a) => (
          <label key={a.userId} className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-2 py-1 text-xs ${a.userId === activeId ? 'border-brand-400 bg-white dark:bg-slate-900' : 'border-transparent hover:border-slate-300'}`}>
            <input type="radio" name="doctor" aria-label={a.displayName} checked={a.userId === activeId} onChange={() => choose(a.userId)} className="sr-only" />
            <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold text-white ${DOT[a.color] ?? 'bg-brand-500'}`}>{initials(a.displayName)}</span>{a.displayName}
          </label>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4 : lancer, vérifier**

Run: `npx vitest run src/features/simulation/RolesCard.test.tsx && npm run typecheck && npm run build`
Expected: exit 0

- [ ] **Step 5 : commit**

```bash
git add src/features/simulation/SimulationSetup.tsx src/features/simulation/RolesCard.test.tsx
git commit -m "feat(fondateur): pré-simulation — carte « Le médecin » = compte qui s'entraîne, bascule en un clic"
```

---

### Task 7 : `grantFounder.mjs` — accès complet sans Stripe

**Files:**
- Create: `app/scripts/grantFounder.mjs`
- Modify: `app/scripts/testRls.mjs` (un cas : grant → `my_plan()` = premium)
- Modify: `app/package.json` (script `"founder:grant": "node scripts/grantFounder.mjs"`)

**Interfaces:**
- Consumes: env `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (comme `publishContent.mjs`)
- Produces: CLI `node scripts/grantFounder.mjs <email>` → exit 0 si la ligne `subscriptions` est posée ; exit 2 si env manquant ; exit 3 si e-mail inconnu.

- [ ] **Step 1 : écrire le cas d'intégration qui échoue**

Dans `testRls.mjs`, repérer le helper de création d'utilisateur (`grep -n "createUser\|admin.createUser" scripts/testRls.mjs`) et ajouter, à la fin des cas :

```js
// ── Fondateur : abonnement posé sans Stripe → plan premium ───────────────────
{
  const { execFileSync } = await import('node:child_process');
  const email = `founder-${Date.now()}@test.local`;
  const { data: created } = await admin.auth.admin.createUser({ email, password: 'secret123', email_confirm: true });
  execFileSync('node', ['scripts/grantFounder.mjs', email], { stdio: 'inherit', env: process.env });
  const { data: session } = await anonClient().auth.signInWithPassword({ email, password: 'secret123' });
  const as = clientWithJwt(session.session.access_token);
  const { data: plan } = await as.rpc('my_plan');
  assert.equal(plan, 'premium', 'grantFounder → my_plan() = premium');
  await admin.auth.admin.deleteUser(created.user.id);
  console.log('ok: grantFounder → premium');
}
```

(Adapter `admin`, `anonClient`, `clientWithJwt`, `assert` aux noms réels du fichier — les lire d'abord ; ne pas inventer.)

- [ ] **Step 2 : lancer, vérifier l'échec**

Run (Supabase local démarré, fonctions servies) : `node scripts/testRls.mjs; echo exit=$?`
Expected: exit ≠ 0 — `grantFounder.mjs` introuvable

- [ ] **Step 3 : implémentation**

```js
// app/scripts/grantFounder.mjs
// Pose un abonnement premium actif SANS Stripe pour un compte fondateur.
// Usage : SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… node scripts/grantFounder.mjs <email>
// Jamais en CI. Jamais sur le contexte Stripe live (aucun appel Stripe ici).
import { createClient } from '@supabase/supabase-js';

const email = process.argv[2];
const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!email) { console.error('usage: grantFounder.mjs <email>'); process.exit(2); }
if (!url || !key) { console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY requis'); process.exit(2); }

const admin = createClient(url, key, { auth: { persistSession: false } });
const { data: users, error: e1 } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (e1) { console.error(e1.message); process.exit(1); }
const user = users.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!user) { console.error(`aucun utilisateur ${email}`); process.exit(3); }

const { error: e2 } = await admin.from('subscriptions').upsert({
  user_id: user.id, plan_id: 'premium', status: 'active',
  stripe_customer_id: `founder:${user.id}`, stripe_subscription_id: null, current_period_end: null,
}, { onConflict: 'user_id' });
if (e2) { console.error(e2.message); process.exit(1); }
console.log(`ok: ${email} → premium (fondateur)`);
```

Vérifier que le plan `premium` existe : `grep -n "'premium'" supabase/migrations/20260915000002_plans.sql` ; sinon utiliser l'identifiant réel du plan le plus élevé.

- [ ] **Step 4 : lancer, vérifier**

Run: `node scripts/testRls.mjs; echo exit=$?`
Expected: `ok: grantFounder → premium`, exit=0

- [ ] **Step 5 : commit**

```bash
git add scripts/grantFounder.mjs scripts/testRls.mjs package.json
git commit -m "feat(fondateur): grantFounder.mjs — abonnement premium actif sans Stripe ; cas d'intégration RLS"
```

---

### Task 8 : Déploiement Pages et documentation

**Files:**
- Modify: `.github/workflows/deploy.yml:27-35` (env + Node 22)
- Modify: `app/.env.example` (ajouter `VITE_AUTH_MODE`)
- Modify: `docs/contracts/team-protocol.md` (section worktree .env : mentionner `VITE_AUTH_MODE`)
- Modify: `CONTEXT.md` (vocabulaire : compte connu, compte actif, base par compte)
- Modify: `app/docs/ROADMAP-PRODUCTION.md` (une ligne : mode founder / public)

- [ ] **Step 1 : deploy.yml**

Dans le job `build`, `node-version: 22`, et après `- run: npm ci` :

```yaml
      - run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          VITE_AUTH_MODE: founder
```

(remplacer la ligne `- run: npm run build` existante).

- [ ] **Step 2 : .env.example**

Ajouter : `VITE_AUTH_MODE=founder   # founder = app personnelle (ADR-0015) · public = SaaS`

- [ ] **Step 3 : CONTEXT.md** — ajouter sous le vocabulaire :

```
- **Compte connu** : compte Supabase réel déjà ouvert sur cet appareil, inscrit au registre local (`fsp.accounts`) avec son dernier jeton.
- **Compte actif** : celui dont la base Dexie (`fsp-cockpit-<userId>`) est ouverte ; un seul à la fois ; changer = recharger.
- **Mode founder / public** : `VITE_AUTH_MODE` — comptes immédiats et bascule locale / parcours SaaS (lien magique, Stripe).
```

- [ ] **Step 4 : team-protocol.md et ROADMAP** — dans la section « .env des worktrees », ajouter `VITE_AUTH_MODE=founder` à la liste des variables à copier ; dans la roadmap, une ligne sous les verrous : « Le mode `public` est le chemin de production ; `founder` ne doit jamais être déployé sur le domaine commercial. »

- [ ] **Step 5 : vérifier et committer**

Run: `cd app && npm run build; echo exit=$?` → 0.

```bash
git add .github/workflows/deploy.yml app/.env.example CONTEXT.md docs/contracts/team-protocol.md app/docs/ROADMAP-PRODUCTION.md
git commit -m "chore(fondateur): Pages avec variables Supabase + mode founder ; vocabulaire et protocole"
```

Puis dire à la direction : créer les secrets GitHub `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` (Settings → Secrets and variables → Actions) avec les valeurs du projet EU.

---

### Task 9 : Preuve navigateur (AC-1, 2, 3, 5, 6, 10)

**Files:**
- Create: `app/scripts/e2e/founder.spec.md` (scénario + mesures, résultats collés)

Pré-requis : Supabase local démarré (`npx supabase start`), « Confirm email » désactivé en local (`supabase/config.toml` → `[auth.email] enable_confirmations = false`, vérifier par `grep -n enable_confirmations supabase/config.toml`), `app/.env` avec `VITE_AUTH_MODE=founder`, `npm run dev` sur un port libre.

- [ ] **Step 1 : AC-1** — playwright-cli : ouvrir `/` → `FounderGate` visible ; remplir Anna / `anna@test.local` / `secret123` → clic « Créer et commencer » → mesurer depuis le DOM le temps jusqu'à la présence de `[data-page="home"]` (ou du titre « Guten Tag ») : **< 10 s**. Consigner.

- [ ] **Step 2 : AC-2** — avatar → « Ajouter un compte » → créer Ben / `ben@test.local` / `secret123`. Puis avatar → « Anna » : mesurer le délai jusqu'au rendu de l'accueil avec « Anna » dans l'avatar : **< 3 s**, sans champ mot de passe. Répéter Ben → Anna.

- [ ] **Step 3 : AC-3 / AC-10** — en tant qu'Anna, faire une simulation courte (Autonome, terminer) ; noter son id dans l'historique. Basculer sur Ben : l'historique est vide ; via `javascript_tool` dans la page de Ben : `(await (await import('dexie')).default.exists('fsp-cockpit-<idAnna>'))` = true et `indexedDB.databases()` liste deux bases ; dans la base de Ben, `progress_events.count()` = 0 et `outbox.count()` = 0. Mesurer depuis le DOM de l'app, pas via un import `/src/…`.

- [ ] **Step 4 : AC-5** — dans Supabase Studio local (ou `psql`) : `delete from auth.refresh_tokens where user_id = '<idBen>'` ; basculer Anna → Ben : la porte demande le mot de passe de Ben, e-mail pré-rempli ; saisir `secret123` → app de Ben ouverte, historique de Ben intact.

- [ ] **Step 4b : AC-4** — second contexte navigateur (nouveau profil playwright, même serveur) : porte → « J'ai déjà un compte » → `anna@test.local` / `secret123` → l'historique montre la simulation faite à l'étape 3 après la sync (attendre `[data-sync="idle"]` ou le badge de sync au repos) ; consigner le délai.

- [ ] **Step 5 : AC-6** — page Compte de Ben → « Oublier ce compte sur cet appareil » → porte affichée avec Anna seule ; `indexedDB.databases()` ne contient plus `fsp-cockpit-<idBen>` ; celle d'Anna existe.

- [ ] **Step 6 : consigner et committer**

Écrire chaque mesure (valeur, commande, capture) dans `app/scripts/e2e/founder.spec.md`.

```bash
git add scripts/e2e/founder.spec.md
git commit -m "test(fondateur): preuve navigateur AC-1/2/3/5/6/10 (playwright-cli, mesures DOM)"
```

---

### Task 10 : Fin de branche

- [ ] `npm run typecheck && npx vitest run --dir src && npm run build` → exit 0 ; `node scripts/testRls.mjs` → exit 0.
- [ ] `quality-branch-reviewer` (Opus) sur `main..HEAD` ; `security-auditor` (jetons en localStorage, `setSession`, script service-role) ; `ux-user-advocate` sur la porte et la bascule. Un seul fixeur, re-revue.
- [ ] `gh pr create --base main --title "feat(fondateur): comptes immédiats et bascule sans login (ADR-0015)"`, CI verte, merge par la direction.
- [ ] Après merge : rappeler à la direction les deux réglages hors code (Supabase « Confirm email = off » sur le projet EU ; secrets GitHub) et `npm run founder:grant <email>` pour chaque personne.
