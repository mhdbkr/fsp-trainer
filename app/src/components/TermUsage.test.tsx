import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TermUsage } from './TermUsage';

const base = { register: { patient: 'Mein Bauch wird immer dicker.', vorstellung: 'Sonographisch zeigte sich ein Aszites.', anamnese: 'Ist Ihr Bauch dicker geworden?' } };

describe('TermUsage — direction (copie)', () => {
  it('« Vorstellung » (tag de marque, F4c) avec la phrase Fallvorstellung/Arztbrief', () => {
    render(<TermUsage term={base as never} />);
    expect(screen.getByText('Vorstellung', { selector: '.dim-tag' })).toBeTruthy();
    expect(screen.getByText('Fallvorstellung ou Arztbrief : là, avec le Fachbegriff.')).toBeTruthy();
  });
  it('parole patient commençant par une majuscule : entourée de guillemets', () => {
    render(<TermUsage term={base as never} />);
    expect(screen.getByText('« Mein Bauch wird immer dicker. »')).toBeTruthy();
  });
  it('parole patient commençant par une minuscule (fragment) : jamais entourée de guillemets', () => {
    const term = { register: { ...base.register, patient: 'hat sich verschlechtert.' } };
    render(<TermUsage term={term as never} />);
    expect(screen.getByText('hat sich verschlechtert.')).toBeTruthy();
    expect(screen.queryByText(/«/)).toBeNull();
  });
});
