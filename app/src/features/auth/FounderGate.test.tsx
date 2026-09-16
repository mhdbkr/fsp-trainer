import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// vi.mock est hoisté au-dessus des imports/const : référencer une const plate
// ici lève "Cannot access 'session' before initialization" (TDZ). vi.hoisted
// exécute l'initialiseur avant le hoisting du mock — seule déviation par
// rapport au brief, nécessaire pour que le test s'exécute sous Vitest 5.
const session = vi.hoisted(() => ({ signUpWithPassword: vi.fn(), signInWithPassword: vi.fn(), switchAccount: vi.fn() }));
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

  it('double clic rapide sur un compte : un seul appel à switchAccount', async () => {
    upsertAccount({ userId: 'u1', email: 'a@x.de', displayName: 'Anna', refreshToken: 'r1' });
    let resolveSwitch: (v: string) => void = () => {};
    session.switchAccount.mockReturnValueOnce(new Promise((resolve) => { resolveSwitch = resolve; }));
    const onDone = vi.fn();
    render(<FounderGate onDone={onDone} />);
    const tile = screen.getByRole('button', { name: /anna/i });
    fireEvent.click(tile);
    fireEvent.click(tile);
    expect(session.switchAccount).toHaveBeenCalledTimes(1);
    resolveSwitch('switched');
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('erreur serveur affichée', async () => {
    session.signUpWithPassword.mockRejectedValue(new Error('Database error saving new user'));
    render(<FounderGate onDone={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/prénom/i), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'a@x.de' } });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /créer/i }));
    await waitFor(() => expect(screen.getByText(/database error/i)).toBeTruthy());
  });

  it('« User already registered » → message français + bouton « Se connecter » qui garde l\'e-mail', async () => {
    session.signUpWithPassword.mockRejectedValue(Object.assign(new Error('User already registered'), { status: 422 }));
    session.signInWithPassword.mockResolvedValue(undefined);
    render(<FounderGate onDone={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/prénom/i), { target: { value: 'A' } });
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: 'a@x.de' } });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: /créer/i }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/cet e-mail a déjà un compte/i));
    expect(screen.queryByText(/already registered/i)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));
    expect(screen.getByRole('heading', { name: /se connecter/i })).toBeTruthy();
    expect((screen.getByLabelText(/e-mail/i) as HTMLInputElement).value).toBe('a@x.de');
    expect(screen.getByLabelText(/mot de passe/i).getAttribute('autocomplete')).toBe('current-password');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('avec des comptes connus : titre « Qui s\'entraîne ? », liste d\'abord, création sous « Nouveau compte »', () => {
    upsertAccount({ userId: 'u1', email: 'a@x.de', displayName: 'Anna', refreshToken: 'r1' });
    render(<FounderGate onDone={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /qui s'entraîne/i })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: /créer mon compte/i })).toBeNull();
    const list = screen.getByRole('button', { name: /anna/i });
    const sub = screen.getByRole('heading', { name: /nouveau compte/i });
    expect(list.compareDocumentPosition(sub) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByLabelText(/mot de passe/i).getAttribute('autocomplete')).toBe('new-password');
    expect(screen.getByLabelText(/e-mail/i).getAttribute('autocomplete')).toBe('email');
  });

  it('sans compte connu : titre « Créer mon compte », pas de sous-titre « Nouveau compte »', () => {
    render(<FounderGate onDone={vi.fn()} />);
    expect(screen.getByRole('heading', { name: /créer mon compte/i })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: /nouveau compte/i })).toBeNull();
  });
});
