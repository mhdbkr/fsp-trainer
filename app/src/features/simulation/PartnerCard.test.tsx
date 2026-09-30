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

describe('PartnerCard — le choix ENTRE dans la simulation', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it('« Seul » entre directement, au Teil demandé', () => {
    render(<MemoryRouter><PartnerCard caseId="c1" teil="fallvorstellung" /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /seul/i }));
    expect(nav.navigate).toHaveBeenCalledWith('/simulation/c1/run?teil=fallvorstellung');
  });

  it('en simulation complète, l’entrée ne porte aucun Teil', () => {
    render(<MemoryRouter><PartnerCard caseId="c1" teil={null} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /seul/i }));
    expect(nav.navigate).toHaveBeenCalledWith('/simulation/c1/run');
  });

  it('« Avec un simulant » ouvre une fiche qui porte le Teil, puis entre', () => {
    render(<MemoryRouter><PartnerCard caseId="c1" teil="anamnese" /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /simulant/i }));
    // Le lien patient portait `caseId` seul : le simulant ne savait pas quel
    // rôle ouvrir (audit §5).
    const lien = screen.getByRole('link', { name: /2ᵉ fenêtre/i }) as HTMLAnchorElement;
    expect(lien.href).toContain('teil=anamnese');
    fireEvent.click(screen.getByRole('button', { name: /entrer/i }));
    expect(nav.navigate).toHaveBeenCalledWith('/simulation/c1/run?teil=anamnese');
  });

  it('« Avec ton IA » ouvre la feuille EN PORTANT le Teil', () => {
    render(<MemoryRouter><PartnerCard caseId="c1" teil="anamnese" /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /ton ia/i }));
    expect(useUi.getState().externalAiCaseId).toBe('c1');
    // `openExternalAi(caseId)` ne prenait qu'un `caseId` : le pont IA ne savait
    // pas quelle partie jouer (contrat `ai-bridge.md`).
    expect(useUi.getState().externalAiTeil).toBe('anamnese');
  });

  it('en Dokumentation, l’IA n’est pas proposée — ce serait un choix qui n’en est pas un', () => {
    render(<MemoryRouter><PartnerCard caseId="c1" teil="dokumentation" /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: /ton ia/i })).toBeNull();
    expect(screen.getByRole('button', { name: /seul/i })).toBeTruthy();
  });

  it('les trois choix vivent dans UN seul cadre', () => {
    render(<MemoryRouter><PartnerCard caseId="c1" teil={null} /></MemoryRouter>);
    const cadre = screen.getByRole('region', { name: /avec qui tu joues/i });
    for (const n of [/seul/i, /simulant/i, /ton ia/i]) {
      expect(cadre.querySelector('button')).toBeTruthy();
      expect(screen.getByRole('button', { name: n })).toBeTruthy();
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
