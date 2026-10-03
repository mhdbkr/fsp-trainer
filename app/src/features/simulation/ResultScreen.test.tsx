import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
vi.mock('@/lib/sync/queue', () => ({ syncQueue: { push: vi.fn(async () => ({})) } }));
import { ResultScreen } from './SimulationRunner';

describe('ResultScreen', () => {
  it('le lien drill est ancré sur le cas', () => {
    render(<MemoryRouter><ResultScreen sim={{ id: 's', caseId: 'c1', date: Date.now(), passed: true, parts: {}, prioritizedCorrections: [], scope: 'full' } as never} c={{ id: 'c1', name: 'Ulcus', specialty: 'G' } as never} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Drill des termes du cas/ }).getAttribute('href')).toContain('case=c1');
  });

  it('I3 — un run interrompu après deux parties ne se lit pas « Cette partie »', () => {
    const p = { done: true, durationSec: 60, checklist: [], feeling: 50, contentPct: 40, officialPct: 40 };
    render(<MemoryRouter><ResultScreen sim={{ id: 's2', caseId: 'c1', date: Date.now(), passed: false, parts: { anamnese: p, dokumentation: p }, prioritizedCorrections: [], scope: 'teil' } as never} c={{ id: 'c1', name: 'Ulcus', specialty: 'G' } as never} /></MemoryRouter>);
    expect(screen.queryByText(/Cette partie/)).toBeNull();
    expect(screen.getByText(/Au moins une partie sous les 60%/)).toBeTruthy();
  });
});
