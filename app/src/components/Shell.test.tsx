import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom';
import { useUi } from '@/store/ui';
import { Shell, isAtBottom } from './Shell';

// Enveloppe seule : les panneaux globaux n'ont rien à voir avec le défilement.
vi.mock('./Sidebar', () => ({ Sidebar: () => null }));
vi.mock('./CommandPalette', () => ({ CommandPalette: () => null }));
vi.mock('./GlossaryDrawer', () => ({ GlossaryDrawer: () => null }));
vi.mock('./TermHoverCard', () => ({ TermHoverCard: () => null }));
vi.mock('./Doctopus', () => ({ Doctopus: () => null }));
vi.mock('./SelectionExplainer', () => ({ SelectionExplainer: () => null }));
vi.mock('./ResumeSessionBar', () => ({ ResumeSessionBar: () => null }));

function setScroll(el: HTMLElement, v: { scrollHeight: number; clientHeight: number; scrollTop: number }) {
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: v.scrollHeight });
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: v.clientHeight });
  Object.defineProperty(el, 'scrollTop', { configurable: true, writable: true, value: v.scrollTop });
}

describe('isAtBottom', () => {
  it('une page sans défilement n\'est jamais « en bas »', () => {
    expect(isAtBottom({ scrollHeight: 500, clientHeight: 800, scrollTop: 0 })).toBe(false);
    expect(isAtBottom({ scrollHeight: 800, clientHeight: 800, scrollTop: 0 })).toBe(false);
  });
  it('page longue : vrai à moins de 120 px du bas, faux sinon', () => {
    expect(isAtBottom({ scrollHeight: 2000, clientHeight: 800, scrollTop: 1150 })).toBe(true);
    expect(isAtBottom({ scrollHeight: 2000, clientHeight: 800, scrollTop: 0 })).toBe(false);
  });
});

describe('Shell — atPageBottom (revue de branche F2b, I1)', () => {
  beforeEach(() => useUi.setState({ atPageBottom: false }));

  it('bas d\'une page longue → navigation vers une page courte : atPageBottom repasse à false', () => {
    render(
      <MemoryRouter initialEntries={['/cas']}>
        <Routes>
          <Route element={<Shell />}>
            <Route path="/cas" element={<Link to="/fachbegriffe/drill">drill</Link>} />
            <Route path="/fachbegriffe/drill" element={<p>Drill</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
    const main = screen.getByRole('main');
    setScroll(main, { scrollHeight: 2000, clientHeight: 800, scrollTop: 1200 });
    fireEvent.scroll(main);
    expect(useUi.getState().atPageBottom).toBe(true);

    // Nouvelle page, courte : plus de défilement.
    setScroll(main, { scrollHeight: 600, clientHeight: 800, scrollTop: 0 });
    act(() => { fireEvent.click(screen.getByText('drill')); });
    expect(screen.getByText('Drill')).toBeTruthy();
    expect(useUi.getState().atPageBottom).toBe(false);
  });

  it('un scroll sur une page sans défilement ne met jamais atPageBottom à true', () => {
    render(
      <MemoryRouter initialEntries={['/x']}>
        <Routes><Route element={<Shell />}><Route path="/x" element={<p>court</p>} /></Route></Routes>
      </MemoryRouter>,
    );
    const main = screen.getByRole('main');
    setScroll(main, { scrollHeight: 500, clientHeight: 800, scrollTop: 0 });
    fireEvent.scroll(main);
    expect(useUi.getState().atPageBottom).toBe(false);
  });
});
