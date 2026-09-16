import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const session = vi.hoisted(() => ({ switchAccount: vi.fn() }));
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
