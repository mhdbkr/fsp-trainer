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
