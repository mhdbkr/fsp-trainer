import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthApiError } from '@supabase/supabase-js';

vi.stubEnv('VITE_AUTH_MODE', 'founder');

// vi.mock factories are hoisted above top-level const declarations, so the
// mock state must itself be created inside vi.hoisted() — otherwise `auth`/
// `from` are referenced before initialization (TDZ) when the factory runs.
const { listeners, auth, from } = vi.hoisted(() => {
  const listeners: Array<(ev: string, s: { user: { id: string; email?: string }; refresh_token?: string } | null) => void> = [];
  const auth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: vi.fn((cb: (ev: string, s: unknown) => void) => { listeners.push(cb); return { data: { subscription: { unsubscribe() {} } } }; }),
    signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    signUp: vi.fn(), signInWithPassword: vi.fn(), refreshSession: vi.fn(),
  };
  const from = vi.fn(() => ({ update: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) }));
  return { listeners, auth, from };
});
vi.mock('@/lib/supabase', () => ({ supabase: { auth, from } }));

import { useSession, signInWithMagicLink, initSession, __resetSessionForTests, signUpWithPassword, signInWithPassword, switchAccount, signOut } from './session';
import { listAccounts, getActiveUserId, upsertAccount, setActiveUserId } from './accounts';

describe('session', () => {
  beforeEach(() => { listeners.length = 0; useSession.setState({ user: null, status: 'loading' }); __resetSessionForTests(); localStorage.clear(); vi.clearAllMocks(); });

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

  it('signInWithMagicLink envoie un OTP e-mail avec redirection SANS fragment (PKCE)', async () => {
    const { supabase } = await import('@/lib/supabase');
    await signInWithMagicLink('x@y.z');
    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({ email: 'x@y.z', options: { emailRedirectTo: expect.stringMatching(/^https?:\/\/[^#]+\/$/) } });
  });

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

    it('switchAccount : jeton valide → refreshSession, actif changé, "switched"', async () => {
      upsertAccount({ userId: 'u2', email: 'b@x.de', displayName: 'B', refreshToken: 'r2' });
      auth.refreshSession.mockResolvedValue({ data: { session: { refresh_token: 'r2b', user: { id: 'u2' } } }, error: null });
      await expect(switchAccount('u2')).resolves.toBe('switched');
      expect(auth.refreshSession).toHaveBeenCalledWith({ refresh_token: 'r2' });
      expect(getActiveUserId()).toBe('u2');
      expect(listAccounts()[0].refreshToken).toBe('r2b');
    });

    it('switchAccount : jeton refusé (AuthApiError) → jeton=null, actif inchangé, "password-required"', async () => {
      setActiveUserId('u1');
      upsertAccount({ userId: 'u2', email: 'b@x.de', displayName: 'B', refreshToken: 'dead' });
      auth.refreshSession.mockResolvedValue({ data: { session: null }, error: new AuthApiError('Invalid Refresh Token', 400, 'refresh_token_not_found') });
      await expect(switchAccount('u2')).resolves.toBe('password-required');
      expect(getActiveUserId()).toBe('u1');
      expect(listAccounts().find((x) => x.userId === 'u2')?.refreshToken).toBeNull();
    });

    it('switchAccount : erreur transitoire (réseau) → jeton conservé, actif inchangé, "password-required"', async () => {
      setActiveUserId('u1');
      upsertAccount({ userId: 'u2', email: 'b@x.de', displayName: 'B', refreshToken: 'dead-or-valid' });
      auth.refreshSession.mockResolvedValue({ data: { session: null }, error: new Error('fetch failed') });
      await expect(switchAccount('u2')).resolves.toBe('password-required');
      expect(getActiveUserId()).toBe('u1');
      expect(listAccounts().find((x) => x.userId === 'u2')?.refreshToken).toBe('dead-or-valid');
    });

    it('switchAccount : pas de jeton → "password-required" sans appel réseau', async () => {
      upsertAccount({ userId: 'u2', email: 'b@x.de', displayName: 'B', refreshToken: null });
      await expect(switchAccount('u2')).resolves.toBe('password-required');
      expect(auth.refreshSession).not.toHaveBeenCalled();
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

  describe('mode public', () => {
    it('signOut (public) : signOut sans argument et purge la progression locale', async () => {
      vi.stubEnv('VITE_AUTH_MODE', 'public');
      vi.resetModules();
      const { signOut: signOutPublic } = await import('./session');
      const { db } = await import('@/db/db');
      await db.progress_events.put({ id: 'e', user_id: 'u', type: 't', subject_id: 's', occurred_at: '2026-01-01', payload: {} } as never);
      await signOutPublic();
      expect(auth.signOut).toHaveBeenCalledWith();
      expect(await db.progress_events.count()).toBe(0);
      vi.stubEnv('VITE_AUTH_MODE', 'founder');
    });
  });
});
