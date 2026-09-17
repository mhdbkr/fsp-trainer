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
});
