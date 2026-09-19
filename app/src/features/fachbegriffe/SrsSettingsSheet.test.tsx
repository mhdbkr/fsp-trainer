import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { db } from '@/db/db';
import { SrsSettingsSheet } from './SrsSettingsSheet';
vi.mock('@/lib/sync/queue', async () => { const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events'); return { syncQueue: { push: vi.fn(async (input: { type: string; subject_id: string | null; payload: unknown }) => { const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...input } as never; await db.progress_events.put(ev); return ev; }) } }; });
vi.mock('@/lib/collections/drillContext', () => ({ loadDrillContext: async () => ({ budget: 10, remaining: 10, reviewsRemaining: 200, settings: { mode: 'auto' }, daily: { newPerDay: 13, maxReviewsPerDay: 200, source: 'auto', explain: 'auto : 13/jour = 10 × intensif' }, autoDaily: { newPerDay: 13, maxReviewsPerDay: 200, source: 'auto', explain: 'auto : 13/jour = 10 × intensif' }, relevance: { now: 0, favorites: [], deckTerms: [], recentSimulations: [], todayCaseIds: [], cases: [] } }) }));

describe('SrsSettingsSheet', () => {
  beforeEach(async () => { await db.meta.clear(); await db.progress_events.clear(); });
  it('affiche le calcul auto ; passer en manuel et enregistrer émet srs.settings_changed borné', async () => {
    render(<SrsSettingsSheet onClose={() => {}} />);
    expect(await screen.findByText(/auto : 13\/jour = 10 × intensif/)).toBeTruthy();
    // Mode auto : les chiffres du jour, pas une phrase générique (revue UX F2b).
    expect(screen.getByText(/Aujourd'hui :/).textContent).toMatch(/13 nouveaux · dus présentés : illimités/);
    fireEvent.click(screen.getByLabelText(/Manuel/));
    fireEvent.change(screen.getByLabelText(/Nouveaux termes par jour/), { target: { value: '99' } });
    fireEvent.change(screen.getByLabelText(/Dus présentés par jour/), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer/ }));
    await waitFor(async () => expect((await db.progress_events.toArray()).find((e) => e.type === 'srs.settings_changed')?.payload).toEqual({ mode: 'manual', newPerDay: 50, maxReviewsPerDay: 20 }));
  });

  // Revue charte F2b : inline dans « Ajuster », le Field « Fachbegriffe » porte
  // déjà le libellé — la feuille ne double pas son propre « Répétitions ».
  it('inline : pas de second libellé « Répétitions »', async () => {
    render(<SrsSettingsSheet inline onClose={() => {}} />);
    await screen.findByLabelText(/Automatique/);
    expect(screen.queryByText('Répétitions')).toBeNull();
    render(<SrsSettingsSheet onClose={() => {}} />);
    expect(await screen.findByText('Répétitions')).toBeTruthy();
  });
});
