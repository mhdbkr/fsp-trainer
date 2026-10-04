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

  it('C6-A — une langue non notée n\'affiche pas « langue 0 % » ni ne pèse dans le score', () => {
    const p = { done: true, durationSec: 60, checklist: [], feeling: -1, contentPct: 30, officialPct: 0, languageGrid: { aussprache: -1, wortschatz: -1, grammatik: -1, redefluss: -1, kommunikation: -1 } };
    render(<MemoryRouter><ResultScreen sim={{ id: 's3', caseId: 'c1', date: Date.now(), passed: false, parts: { anamnese: p }, prioritizedCorrections: [], scope: 'teil' } as never} c={{ id: 'c1', name: 'Ulcus', specialty: 'G' } as never} /></MemoryRouter>);
    expect(screen.queryByText(/langue/)).toBeNull();
    expect(screen.getByText(/contenu 30%/)).toBeTruthy();
    expect(screen.getByText(/score moyen 30%/)).toBeTruthy();
  });

  it('EXAM_CLAIM — le seuil de 60 % est celui de Doctopus, pas « la règle FSP »', () => {
    const p = { done: true, durationSec: 60, checklist: [], feeling: 50, contentPct: 80, officialPct: 80 };
    const { container } = render(<MemoryRouter><ResultScreen sim={{ id: 's4', caseId: 'c1', date: Date.now(), passed: true, parts: { anamnese: p }, prioritizedCorrections: [], scope: 'full' } as never} c={{ id: 'c1', name: 'Ulcus', specialty: 'G' } as never} /></MemoryRouter>);
    expect(container.textContent).toContain('seuil Doctopus');
    expect(container.textContent).not.toMatch(/règle FSP|officiel/);
  });

  describe('verdict : « Réussi sur le contenu » tant que la langue n\'est pas notée (décision direction, 4 oct.)', () => {
    const vide = { aussprache: -1, wortschatz: -1, grammatik: -1, redefluss: -1, kommunikation: -1 };
    const notee = { aussprache: 4, wortschatz: 4, grammatik: 4, redefluss: 4, kommunikation: 4 };
    const rendu = (grid: object | undefined, passed = true) => render(<MemoryRouter><ResultScreen sim={{ id: 'v', caseId: 'c1', date: Date.now(), passed, parts: { anamnese: { done: true, durationSec: 60, checklist: [], feeling: -1, contentPct: 80, officialPct: grid === notee ? 80 : 0, languageGrid: grid } }, prioritizedCorrections: [], scope: 'teil', teil: 'anamnese' } as never} c={{ id: 'c1', name: 'Ulcus', specialty: 'G' } as never} /></MemoryRouter>).container;

    it('langue non notée : « Réussi sur le contenu », jamais le verdict complet', () => {
      const c = rendu(vide);
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Réussi sur le contenu');
      expect(c.textContent).toContain('langue non notée');
      expect(c.textContent).not.toMatch(/Bestanden|Au-dessus du seuil Doctopus/);
    });
    it('langue notée : le verdict complet, sans « Bestanden » (EXAM_CLAIM)', () => {
      const c = rendu(notee);
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Au-dessus du seuil Doctopus');
      expect(c.textContent).not.toMatch(/Bestanden|langue non notée/);
    });
    it('non réussi : inchangé, que la langue soit notée ou non', () => {
      rendu(vide, false);
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Encore un effort');
    });
  });
});
