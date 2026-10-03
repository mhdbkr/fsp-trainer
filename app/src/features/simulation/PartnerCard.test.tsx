import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const session = vi.hoisted(() => ({ switchAccount: vi.fn() }));
vi.mock('@/lib/auth/session', () => ({ ...session, AUTH_MODE: 'founder' }));
const nav = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => nav.navigate };
});
import { upsertAccount, setActiveUserId } from '@/lib/auth/accounts';
import { useUi } from '@/store/ui';
import { DoctorCard, PartnerCard } from './SimulationSetup';

// ============================================================================
// T4 — « Avec qui tu joues » : UN cadre, conscient du Teil. Avant, deux `.card`
// sœurs dont aucune ne savait quelle partie allait être jouée, et dont le lien
// patient ne portait pas le Teil.
// ============================================================================

describe('PartnerCard — choisir avec qui jouer, puis DÉMARRER', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  // Retour de la direction (3 oct.) : « Seul » lançait la partie au clic, et le
  // bouton de départ avait disparu. Choisir un partenaire SÉLECTIONNE ; seul
  // « Démarrer la simulation » entre dans la partie.
  it('choisir « Seul » ne lance rien : la partie démarre sur « Démarrer »', () => {
    render(<MemoryRouter><PartnerCard caseId="c1" teil="fallvorstellung" /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /seul/i }));
    expect(nav.navigate).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /seul/i }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: /démarrer la simulation/i }));
    expect(nav.navigate).toHaveBeenCalledWith('/simulation/c1/run?teil=fallvorstellung', { viewTransition: true });
  });

  it('le bouton « Démarrer » est là dès l’arrivée, « Seul » choisi par défaut', () => {
    render(<MemoryRouter><PartnerCard caseId="c1" teil={null} /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /seul/i }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: /démarrer la simulation/i }));
    expect(nav.navigate).toHaveBeenCalledWith('/simulation/c1/run', { viewTransition: true });
  });

  it('« Avec un simulant » montre une fiche qui porte le Teil ; « Démarrer » entre', () => {
    render(<MemoryRouter><PartnerCard caseId="c1" teil="anamnese" /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /simulant/i }));
    expect(nav.navigate).not.toHaveBeenCalled();
    const lien = screen.getByRole('link', { name: /2ᵉ fenêtre/i }) as HTMLAnchorElement;
    expect(lien.href).toContain('teil=anamnese');
    fireEvent.click(screen.getByRole('button', { name: /démarrer la simulation/i }));
    expect(nav.navigate).toHaveBeenCalledWith('/simulation/c1/run?teil=anamnese', { viewTransition: true });
  });

  it('« Avec ton IA » sélectionne sans rien ouvrir : l’IA se lance DEPUIS la partie', () => {
    render(<MemoryRouter><PartnerCard caseId="c1" teil="anamnese" /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /ton ia/i }));
    expect(nav.navigate).not.toHaveBeenCalled();
    expect(useUi.getState().externalAiCaseId).toBeFalsy();
    fireEvent.click(screen.getByRole('button', { name: /démarrer la simulation/i }));
    expect(nav.navigate).toHaveBeenCalledWith('/simulation/c1/run?teil=anamnese', { viewTransition: true });
  });

  it('un seul bouton de départ à l’écran (zéro doublon)', () => {
    render(<MemoryRouter><PartnerCard caseId="c1" teil="anamnese" /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /simulant/i }));
    expect(screen.getAllByRole('button', { name: /démarrer|entrer/i })).toHaveLength(1);
  });

  it('en Dokumentation, l’IA n’est pas proposée — ce serait un choix qui n’en est pas un', () => {
    render(<MemoryRouter><PartnerCard caseId="c1" teil="dokumentation" /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: /ton ia/i })).toBeNull();
    expect(screen.getByRole('button', { name: /seul/i })).toBeTruthy();
  });

  it('les choix et le départ vivent dans UN seul cadre', () => {
    render(<MemoryRouter><PartnerCard caseId="c1" teil={null} /></MemoryRouter>);
    const cadre = screen.getByRole('region', { name: /avec qui tu joues/i });
    for (const n of [/seul/i, /simulant/i, /ton ia/i, /démarrer la simulation/i]) {
      expect(cadre.contains(screen.getByRole('button', { name: n }))).toBe(true);
    }
  });
});

describe('DoctorCard — le médecin crédité', () => {
  beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); });
  it('affiche le compte actif comme médecin et permet de choisir un autre', async () => {
    upsertAccount({ userId: 'u1', email: 'a@x.de', displayName: 'Anna', refreshToken: 'r' });
    upsertAccount({ userId: 'u2', email: 'b@x.de', displayName: 'Ben', refreshToken: 'r' });
    setActiveUserId('u1');
    session.switchAccount.mockResolvedValue('switched');
    render(<MemoryRouter><DoctorCard /></MemoryRouter>);
    expect(screen.getByText(/le médecin/i)).toBeTruthy();
    expect(screen.getByRole('radio', { name: /anna/i })).toHaveProperty('checked', true);
    fireEvent.click(screen.getByRole('radio', { name: /ben/i }));
    await waitFor(() => expect(session.switchAccount).toHaveBeenCalledWith('u2'));
  });
});
