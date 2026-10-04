// L'encart rendu : il apparaît pour un candidat concerné, se ferme, et ne revient pas.
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { db } from '@/db/db';
import { AnnonceS4 } from './AnnonceS4';
import { annonceKey } from '@/lib/annonceS4';
import { DATE_NOUVELLE_REGLE } from '@/lib/program/parametres';

beforeEach(async () => { cleanup(); await Promise.all([db.training_events.clear(), db.meta.clear()]); });

const veille = () => new Date(`${DATE_NOUVELLE_REGLE}T00:00:00`).getTime() - 5 * 86_400_000;
const seed = () => db.training_events.put({ id: 'e1', at: veille(), kind: 'simulation', caseId: 'c1', teile: ['anamnese'], source: 'libre', spentMin: 5, scores: { anamnese: 92 } });

describe('AnnonceS4', () => {
  it('rien pour un candidat neuf', async () => {
    render(<AnnonceS4 />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('region', { name: 'Ce qui change' })).toBeNull();
  });
  it('annonce, se ferme, trace la clé locale, et ne revient pas au lancement suivant', async () => {
    await seed();
    const { unmount } = render(<AnnonceS4 />);
    await waitFor(() => expect(screen.getByRole('region', { name: 'Ce qui change' }).textContent).toContain('redevient acquis'));
    fireEvent.click(screen.getByRole('button', { name: 'Compris' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Ce qui change' })).toBeNull());
    expect((await db.meta.get(annonceKey('teile')))?.value).toBe(true);
    unmount();
    render(<AnnonceS4 />);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('region', { name: 'Ce qui change' })).toBeNull();
  });
});
