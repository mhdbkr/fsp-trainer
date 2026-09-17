import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlphabetRail } from './AlphabetRail';

const setReducedMotion = (v: boolean) => { window.matchMedia = vi.fn().mockImplementation((q: string) => ({ matches: q.includes('reduce') ? v : false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never; };
afterEach(() => { setReducedMotion(false); });

describe('AlphabetRail', () => {
  it('26 lettres ; lettres vides désactivées ; clic → onJump', () => {
    setReducedMotion(false);
    const onJump = vi.fn();
    render(<AlphabetRail available={new Set(['A', 'K'])} onJump={onJump} />);
    expect(screen.getAllByRole('button')).toHaveLength(26);
    expect(screen.getByRole('button', { name: 'B' }).getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'K' }));
    expect(onJump).toHaveBeenCalledWith('K');
    fireEvent.click(screen.getByRole('button', { name: 'B' }));
    expect(onJump).toHaveBeenCalledTimes(1);
  });
  it('survol : la lettre pointée grossit (scale 1.6), voisines 1.25 ; rien sous reduced-motion', () => {
    setReducedMotion(false);
    const { unmount } = render(<AlphabetRail available={new Set(['A', 'B', 'C', 'D'])} onJump={() => {}} />);
    fireEvent.mouseMove(screen.getByRole('button', { name: 'C' }));
    expect(screen.getByRole('button', { name: 'C' }).style.transform).toContain('scale(1.6)');
    expect(screen.getByRole('button', { name: 'B' }).style.transform).toContain('scale(1.25)');
    expect(screen.getByRole('button', { name: 'A' }).style.transform).toBe('');
    unmount();
    setReducedMotion(true);
    render(<AlphabetRail available={new Set(['A', 'B', 'C'])} onJump={() => {}} />);
    fireEvent.mouseMove(screen.getByRole('button', { name: 'B' }));
    expect(screen.getByRole('button', { name: 'B' }).style.transform).toBe('');
  });
});
