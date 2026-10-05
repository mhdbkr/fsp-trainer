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
import { DoctorCard, PartnerCard, StartButton } from './SimulationSetup';

// ============================================================================
// T4 — « Avec qui tu joues » : UN cadre, conscient du Teil. Avant, deux `.card`
// sœurs dont aucune ne savait quelle partie allait être jouée, et dont le lien
// patient ne portait pas le Teil.
// ============================================================================

describe('StartButton — le départ, en haut de la pré-simulation', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  // Retours de la direction (3 oct.) : le bouton de départ avait disparu, puis
  // il était « enfoui au milieu de la page ». Il vit désormais dans l'en-tête,
  // sous le nom du cas — hors du cadre « Avec qui tu joues ».
  // [S4] simulation-run.md §10.1, §10.3 : un seul bouton, « Démarrer » ; l'entrée porte le DÉPART
  // (`?depart=`), jamais un périmètre — la partie a toujours les trois Teile (INV-70).
  it('entre dans la partie, par le Teil de départ demandé', () => {
    render(<MemoryRouter><StartButton caseId="c1" depart="fallvorstellung" /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /démarrer/i }));
    expect(nav.navigate).toHaveBeenCalledWith('/simulation/c1/run?depart=fallvorstellung', { viewTransition: true });
  });

  it('R-C4 : lancée depuis une tâche du plan, l’entrée porte la tâche', () => {
    render(<MemoryRouter><StartButton caseId="c1" depart="anamnese" taskId="tA" /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /démarrer/i }));
    expect(nav.navigate).toHaveBeenCalledWith('/simulation/c1/run?depart=anamnese&task=tA', { viewTransition: true });
  });

  it('sans départ, l’entrée ne porte aucun Teil (la partie commence par l’Anamnese)', () => {
    render(<MemoryRouter><StartButton caseId="c1" depart={null} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /démarrer/i }));
    expect(nav.navigate).toHaveBeenCalledWith('/simulation/c1/run', { viewTransition: true });
  });
});

describe('PartnerCard — choisir avec qui jouer (sans lancer)', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); });

  it('choisir « Seul » ne lance rien ; « Seul » est choisi par défaut', () => {
    render(<MemoryRouter><PartnerCard caseId="c1" depart="fallvorstellung" /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /seul/i }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: /seul/i }));
    expect(nav.navigate).not.toHaveBeenCalled();
  });

  it('le cadre ne contient AUCUN bouton de départ (il est en haut de page)', () => {
    render(<MemoryRouter><PartnerCard caseId="c1" depart="anamnese" /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /simulant/i }));
    expect(screen.queryByRole('button', { name: /démarrer|entrer/i })).toBeNull();
  });

  it('« Avec un simulant » montre une fiche qui porte le Teil de départ, sans lancer', () => {
    render(<MemoryRouter><PartnerCard caseId="c1" depart="anamnese" /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /simulant/i }));
    expect(nav.navigate).not.toHaveBeenCalled();
    const lien = screen.getByRole('link', { name: /2ᵉ fenêtre/i }) as HTMLAnchorElement;
    expect(lien.href).toContain('teil=anamnese');
    // [S4] la partie porte les trois Teile : le simulant joue tous ses rôles.
    expect(screen.getByText(/le patient \(anamnèse\) puis le médecin examinateur/)).toBeTruthy();
  });

  it('« Avec ton IA » sélectionne sans rien ouvrir : l’IA se lance DEPUIS la partie', () => {
    render(<MemoryRouter><PartnerCard caseId="c1" depart="anamnese" /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /ton ia/i }));
    expect(nav.navigate).not.toHaveBeenCalled();
    expect(useUi.getState().externalAiCaseId).toBeFalsy();
    expect(screen.getByRole('button', { name: /ton ia/i }).getAttribute('aria-pressed')).toBe('true');
  });

  it('départ en Dokumentation, l’IA n’est pas proposée — ce serait un choix qui n’en est pas un', () => {
    render(<MemoryRouter><PartnerCard caseId="c1" depart="dokumentation" /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: /ton ia/i })).toBeNull();
    expect(screen.getByRole('button', { name: /seul/i })).toBeTruthy();
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
