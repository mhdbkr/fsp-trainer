import { describe, it, expect, vi, beforeEach } from 'vitest';

// La clé IA est stockée par compte en mode fondateur (audit I4) ; en mode
// public elle reste unique. Le module session est mocké via un handle hoisté
// (vi.hoisted) pour éviter la fragilité de vi.doMock + import dynamique sous
// charge (flake #33 constaté en CI parallèle) : chaque test règle mode.value
// puis vi.resetModules() + réimporte ./onlineAi, sans redéclarer le mock.
const mode = vi.hoisted(() => ({ value: 'founder' as 'founder' | 'public' }));

vi.mock('@/lib/auth/session', () => ({
  get AUTH_MODE() { return mode.value; },
}));

describe('onlineAi — clé par compte', () => {
  beforeEach(() => { localStorage.clear(); vi.resetModules(); });

  it('founder : la clé est namespacée par compte actif, deux comptes ne se voient pas', async () => {
    mode.value = 'founder';
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
    mode.value = 'founder';
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
    mode.value = 'public';
    const { getKey, setKey } = await import('./onlineAi');
    setKey('sk-public-key');
    expect(localStorage.getItem('doctopus-key')).toBe('sk-public-key');
    expect(getKey()).toBe('sk-public-key');
  });
});
