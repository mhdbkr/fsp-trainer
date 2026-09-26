import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/serverAi', async (o) => ({ ...(await o<typeof import('@/lib/serverAi')>()), serverAiAvailable: () => true }));
vi.mock('@/lib/onlineAi', async (o) => ({ ...(await o<typeof import('@/lib/onlineAi')>()), canAskAi: () => true, hasKey: () => false, askConversation: vi.fn() }));

import { Doctopus } from './Doctopus';
import { useUi } from '@/store/ui';
import { askConversation } from '@/lib/onlineAi';

describe('Doctopus (F3)', () => {
  it('serveur dispo sans clé : pas de réglages imposés, bouton Demander actif, section « Repli (optionnel) »', async () => {
    useUi.getState().openDoctopus('Aszites');
    render(<Doctopus />);
    expect((screen.getByRole('button', { name: /Demander/ }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.queryByText(/Ajoute ta clé/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'gear' }));
    expect(await screen.findByText('Repli (optionnel)')).toBeTruthy();
  });

  it('cap la saisie à 2 000 caractères avec compteur visible près de la limite (review B4a)', async () => {
    useUi.getState().openDoctopus();
    render(<Doctopus />);
    const textarea = screen.getByPlaceholderText(/Une question/) as HTMLTextAreaElement;
    expect(textarea.maxLength).toBe(2000);
    fireEvent.change(textarea, { target: { value: 'a'.repeat(1850) } });
    expect(await screen.findByText('1850/2000')).toBeTruthy();
  });

  it('réponse interrompue après un flux partiel : texte marqué + erreur honnête (review B4b)', async () => {
    (askConversation as unknown as ReturnType<typeof vi.fn>).mockImplementation(async (_turns: unknown, onToken?: (d: string) => void) => {
      onToken?.('Les œdèmes sont');
      throw new Error('panne réseau');
    });
    useUi.getState().openDoctopus();
    render(<Doctopus />);
    fireEvent.change(screen.getByPlaceholderText(/Une question/), { target: { value: "Qu'est-ce que l'œdème ?" } });
    fireEvent.click(screen.getByRole('button', { name: /Demander/ }));
    expect(await screen.findByText(/Les œdèmes sont/)).toBeTruthy();
    expect(await screen.findByText(/réponse interrompue/)).toBeTruthy();
    expect(await screen.findByText('panne réseau')).toBeTruthy();
  });
});
