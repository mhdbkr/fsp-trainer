import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
vi.mock('@/lib/sync/queue', () => ({ syncQueue: { push: vi.fn(async () => ({})) } }));
import { ResultScreen } from './SimulationRunner';
import { db } from '@/db/db';
import type { TrainingEvent } from '@/db/types';

describe('ResultScreen', () => {
  it('le lien drill est ancré sur le cas', () => {
    render(<MemoryRouter><ResultScreen sim={{ id: 's', caseId: 'c1', date: Date.now(), passed: true, parts: {}, prioritizedCorrections: [], scope: 'full' } as never} c={{ id: 'c1', name: 'Ulcus', specialty: 'G' } as never} /></MemoryRouter>);
    expect(screen.getByRole('link', { name: /Drill des termes du cas/ }).getAttribute('href')).toContain('case=c1');
  });

  it('I3 — un run interrompu après deux parties ne se lit pas « Cette partie »', () => {
    const p = { done: true, durationSec: 60, checklist: [], feeling: 50, contentPct: 40, officialPct: 40 };
    render(<MemoryRouter><ResultScreen sim={{ id: 's2', caseId: 'c1', date: Date.now(), passed: false, parts: { anamnese: p, dokumentation: p }, prioritizedCorrections: [], scope: 'teil' } as never} c={{ id: 'c1', name: 'Ulcus', specialty: 'G' } as never} /></MemoryRouter>);
    expect(screen.queryByText(/Cette partie/)).toBeNull();
    expect(screen.getByText('Au moins une épreuve est sous 60 % : reprends-la.')).toBeTruthy();   // fixeur I4 : « partie » = le tout
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
      expect(c.textContent).toContain('Ta langue n\'est pas notée : le verdict complet viendra quand tu auras rempli la grille de langue.');   // fixeur I10
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

  // [S4] simulation-run.md §10.5, training-journal.md §13.3 : l'écran de fin montre le CAS (son cadran,
  // l'arc du Teil joué), plus un Teil annoncé comme un résultat isolé ; et la sortie « bilan » des
  // erreurs transversales.
  describe('S4 — écran de fin : le cadran du cas et la sortie « bilan »', () => {
    beforeEach(async () => { await db.training_events.clear(); await db.case_progress.clear(); });
    const p = { done: true, durationSec: 60, checklist: [], feeling: 50, contentPct: 80, officialPct: 80 };
    const seul = { id: 's9', caseId: 'c1', date: 9_000, passed: true, parts: { anamnese: p }, prioritizedCorrections: [], scope: 'teil', teil: 'anamnese', reihenfolge: ['anamnese'] };

    it('le cadran du cas est affiché ; un Teil seul n’est plus « une partie qui compte pour un tiers »', async () => {
      const { container } = render(<MemoryRouter><ResultScreen sim={seul as never} c={{ id: 'c1', name: 'Ulcus', specialty: 'G' } as never} /></MemoryRouter>);
      expect(await screen.findByRole('button', { name: /^Ulcus/ })).toBeTruthy();
      expect(container.textContent).not.toMatch(/Cette partie|un tiers/);
    });

    it('« cochée cette fois » / « encore manquée (n/5) » pour les items manqués d’habitude', async () => {
      const ev = (i: number, caseId: string, manquees: string[]): TrainingEvent => ({
        id: `te-s${i}`, at: 1_000 * i, kind: 'simulation', caseId, teile: ['anamnese'], source: 'libre', spentMin: 20,
        laufId: `s${i}`, scores: { anamnese: 70 }, manques: { anamnese: manquees },
      } as TrainingEvent);
      await db.training_events.bulkPut([
        ev(1, 'a', ['anam-allergien', 'anam-noxen']), ev(2, 'b', ['anam-allergien', 'anam-noxen']), ev(3, 'a', ['anam-allergien', 'anam-noxen']),
        ev(9, 'c1', ['anam-noxen']),
      ]);
      render(<MemoryRouter><ResultScreen sim={seul as never} c={{ id: 'c1', name: 'Ulcus', specialty: 'G' } as never} /></MemoryRouter>);
      expect(await screen.findByText(/cochée cette fois/)).toBeTruthy();
      expect(screen.getByText(/encore manquée \(4\/4\)/)).toBeTruthy();
    });
  });
});
