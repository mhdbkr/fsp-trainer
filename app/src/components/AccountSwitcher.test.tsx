import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dexie from 'dexie';

const session = vi.hoisted(() => ({ switchAccount: vi.fn(), signOut: vi.fn() }));
vi.mock('@/lib/auth/session', () => ({ ...session, AUTH_MODE: 'founder' }));
import { upsertAccount, setActiveUserId, listAccounts } from '@/lib/auth/accounts';
import { AccountSwitcher, forgetAccountOnDevice } from './AccountSwitcher';

describe('AccountSwitcher', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });

  it('affiche le compte actif et liste les autres au clic', () => {
    upsertAccount({ userId: 'u1', email: 'a@x.de', displayName: 'Anna', refreshToken: 'r' });
    upsertAccount({ userId: 'u2', email: 'b@x.de', displayName: 'Ben', refreshToken: 'r' });
    setActiveUserId('u1');
    render(<MemoryRouter><AccountSwitcher /></MemoryRouter>);
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
    render(<MemoryRouter><AccountSwitcher /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /anna/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /ben/i }));
    await waitFor(() => expect(session.switchAccount).toHaveBeenCalledWith('u2'));
  });

  it('clic en dehors du menu → le menu se ferme', () => {
    upsertAccount({ userId: 'u1', email: 'a@x.de', displayName: 'Anna', refreshToken: 'r' });
    upsertAccount({ userId: 'u2', email: 'b@x.de', displayName: 'Ben', refreshToken: 'r' });
    setActiveUserId('u1');
    render(<MemoryRouter><AccountSwitcher /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /anna/i }));
    expect(screen.getByRole('menu')).toBeTruthy();
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('touche Échap → le menu se ferme', () => {
    upsertAccount({ userId: 'u1', email: 'a@x.de', displayName: 'Anna', refreshToken: 'r' });
    upsertAccount({ userId: 'u2', email: 'b@x.de', displayName: 'Ben', refreshToken: 'r' });
    setActiveUserId('u1');
    render(<MemoryRouter><AccountSwitcher /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /anna/i }));
    expect(screen.getByRole('menu')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
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
