import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/db/db';
import { useExamDaySession } from './examDaySession';
import { ExamDaySetup } from './examDaySetup';

const mkCase = (id: string, name: string) => ({
  id,
  name,
  specialty: 'Innere Medizin',
  centers: ['Freiburg'],
  frequency: 3,
} as any);

describe('ExamDaySetup', () => {
  beforeEach(async () => {
    await db.cases.clear();
    await db.simulations.clear();
    useExamDaySession.setState({ state: null });
  });

  it('désactive « Fall ziehen » sans cas disponible', async () => {
    render(<MemoryRouter><ExamDaySetup /></MemoryRouter>);
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Fall ziehen/i }) as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
      expect(screen.getByText(/Kein Fall verfügbar/i)).not.toBeNull();
    });
  });

  it('tire un cas sans exposer nom/âge/motif, puis démarre avec withSimulant reflété', async () => {
    await db.cases.bulkAdd([mkCase('c1', 'Fall Eins'), mkCase('c2', 'Fall Zwei')]);

    render(<MemoryRouter><ExamDaySetup /></MemoryRouter>);

    const checkbox = await screen.findByRole('checkbox', { name: /Simulanten/i });
    fireEvent.click(checkbox);

    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /Fall ziehen/i }) as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
    });
    fireEvent.click(screen.getByRole('button', { name: /Fall ziehen/i }));

    await screen.findByText(/Fall gezogen/i);
    expect(screen.queryByText('Fall Eins')).toBeNull();
    expect(screen.queryByText('Fall Zwei')).toBeNull();

    const startBtn = await screen.findByRole('button', { name: /Prüfungstag starten/i });
    fireEvent.click(startBtn);

    await waitFor(() => expect(useExamDaySession.getState().state?.withSimulant).toBe(true));
  });
});
