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

import { useSession, signInWithMagicLink, initSession, __resetSessionForTests } from './session';

describe('session', () => {
  beforeEach(() => { listeners.length = 0; useSession.setState({ user: null, status: 'loading' }); __resetSessionForTests(); });

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
