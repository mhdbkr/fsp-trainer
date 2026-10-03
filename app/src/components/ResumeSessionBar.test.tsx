import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useSimSession } from '@/store/simSession';
import { ResumeSessionBar } from './ResumeSessionBar';

const pause = (teil?: string) => useSimSession.setState({
  minimized: true,
  snapshot: { caseId: 'c1', caseName: 'Ulcus ventriculi', results: {}, active: 'anamnese', ...(teil ? { teil } : {}) } as never,
});
const renderBar = () => render(<MemoryRouter initialEntries={['/']}><ResumeSessionBar /></MemoryRouter>);

describe('ResumeSessionBar (Re-revue 2)', () => {
  afterEach(() => useSimSession.setState({ snapshot: null, minimized: false }));

  it('chrome flottante = rôle 1 : `.glass glass-edge`, plus de `bg-white` + filet blanc invisible', () => {
    pause('anamnese');
    const { container } = renderBar();
    const pill = container.querySelector('.glass');
    expect(pill?.classList.contains('glass-edge')).toBe(true);
    expect(pill?.className).not.toMatch(/bg-white|shadow-e3/);
  });

  it('un Teil seul : le Teil est écrit UNE fois, sans « … seule » (tournure supprimée par TaskLabel)', () => {
    pause('anamnese');
    const { container } = renderBar();
    expect(container.textContent).not.toMatch(/seule/);
    expect(container.textContent?.match(/Anamnese/g)?.length).toBe(1);
  });

  it('simulation complète : la partie active et le compte des parties', () => {
    pause();
    const { container } = renderBar();
    expect(container.textContent).toMatch(/Anamnese · 0\/3 parties/);
  });

  it('✕ : nom accessible et cible de 44 px', () => {
    pause('anamnese');
    renderBar();
    const x = screen.getByRole('button', { name: 'Abandonner la session' });
    expect(x.className).toMatch(/\bh-11\b/);
    expect(x.className).toMatch(/\bw-11\b/);
  });
});
