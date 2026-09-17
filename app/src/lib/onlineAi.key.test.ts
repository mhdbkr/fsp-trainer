import { describe, it, expect, vi, beforeEach } from 'vitest';

// La clé IA est stockée par compte en mode fondateur (audit I4) ; en mode
// public elle reste unique. Le module session est mocké via un handle hoisté
// (getter : AUTH_MODE est lu à l'appel dans onlineAi.ts, sans état de module),
// donc imports STATIQUES — un resetModules + import dynamique rechargeait le SDK
// à chaque test et dépassait le timeout sous charge (flake constaté).
const mode = vi.hoisted(() => ({ value: 'founder' as 'founder' | 'public' }));

vi.mock('@/lib/auth/session', () => ({
  get AUTH_MODE() { return mode.value; },
}));

import { setActiveUserId } from '@/lib/auth/accounts';
import { getKey, setKey, hasKey } from './onlineAi';

describe('onlineAi — clé par compte', () => {
  beforeEach(() => { localStorage.clear(); mode.value = 'founder'; });

  it('founder : la clé est namespacée par compte actif, deux comptes ne se voient pas', async () => {
    mode.value = 'founder';
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
    setActiveUserId('u1');
    expect(getKey()).toBe('sk-legacy');
    expect(localStorage.getItem('doctopus-key:u1')).toBe('sk-legacy');
    expect(localStorage.getItem('doctopus-key')).toBeNull();
    setActiveUserId('u2');
    expect(getKey()).toBe('');                       // migrée une seule fois, vers u1
  });

  it('public : clé unique, inchangée', async () => {
    mode.value = 'public';
    setKey('sk-public-key');
    expect(localStorage.getItem('doctopus-key')).toBe('sk-public-key');
    expect(getKey()).toBe('sk-public-key');
  });
});
