import { describe, it, expect, vi, beforeEach } from 'vitest';

// La clé IA est stockée par compte en mode fondateur (audit I4) ; en mode
// public elle reste unique. Le module session est mocké : seul AUTH_MODE compte.
describe('onlineAi — clé par compte', () => {
  beforeEach(() => { localStorage.clear(); vi.resetModules(); });

  it('founder : la clé est namespacée par compte actif, deux comptes ne se voient pas', async () => {
    vi.doMock('@/lib/auth/session', () => ({ AUTH_MODE: 'founder' }));
    const { setActiveUserId } = await import('@/lib/auth/accounts');
    const { getKey, setKey, hasKey } = await import('./onlineAi');
    setActiveUserId('u1'); setKey('sk-aaaaaaaaaaaa');
    expect(localStorage.getItem('doctopus-key:u1')).toBe('sk-aaaaaaaaaaaa');
    expect(localStorage.getItem('doctopus-key')).toBeNull();
    setActiveUserId('u2');
    expect(getKey()).toBe(''); expect(hasKey()).toBe(false);
    setActiveUserId('u1');
    expect(getKey()).toBe('sk-aaaaaaaaaaaa');
  });

  it('founder : l\'ancienne clé non namespacée migre vers le compte actif à la première lecture', async () => {
    vi.doMock('@/lib/auth/session', () => ({ AUTH_MODE: 'founder' }));
    localStorage.setItem('doctopus-key', 'sk-legacy');
    const { setActiveUserId } = await import('@/lib/auth/accounts');
    const { getKey } = await import('./onlineAi');
    setActiveUserId('u1');
    expect(getKey()).toBe('sk-legacy');
    expect(localStorage.getItem('doctopus-key:u1')).toBe('sk-legacy');
    expect(localStorage.getItem('doctopus-key')).toBeNull();
    setActiveUserId('u2');
    expect(getKey()).toBe('');                       // migrée une seule fois, vers u1
  });

  it('public : clé unique, inchangée', async () => {
    vi.doMock('@/lib/auth/session', () => ({ AUTH_MODE: 'public' }));
    const { getKey, setKey } = await import('./onlineAi');
    setKey('sk-public-key');
    expect(localStorage.getItem('doctopus-key')).toBe('sk-public-key');
    expect(getKey()).toBe('sk-public-key');
  });
});
