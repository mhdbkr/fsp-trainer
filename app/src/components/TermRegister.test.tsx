import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TermRegister, registerLine } from './TermRegister';

const reg = { translationSimple: 'Bauchwasser', register: { patient: 'Wasser im Bauch', vorstellung: 'Sonographisch zeigte sich ein Aszites.', anamnese: 'Ist Ihr Bauch dicker geworden?' } };
describe('TermRegister (F3 §3.3)', () => {
  it('full : colonnes Vorstellung / Anamnese + parole patient', () => {
    render(<TermRegister term={reg} />);
    expect(screen.getByText('Vorstellung')).toBeTruthy();
    expect(screen.getByText('Anamnese')).toBeTruthy();
    expect(screen.getByText('Sonographisch zeigte sich ein Aszites.')).toBeTruthy();
    expect(screen.getByText('Ist Ihr Bauch dicker geworden?')).toBeTruthy();
    expect(screen.getByText(/Wasser im Bauch/)).toBeTruthy();
  });
  it('sans register : « Reformulation · … », jamais présentée comme parole patient (D6)', () => {
    render(<TermRegister term={{ translationSimple: 'zum Bauch gehörend' }} />);
    expect(screen.getByText('Reformulation')).toBeTruthy();
    expect(screen.queryByText('Vorstellung')).toBeNull();
  });
  it('registerLine', () => {
    expect(registerLine(reg)).toBe('Wasser im Bauch');
    expect(registerLine({ translationSimple: 'x' })).toBe('x');
  });
  it('sans register et sans texte : pas de ligne "Reformulation" vide (I-1)', () => {
    const { container } = render(<TermRegister term={{ translationSimple: '' }} />);
    expect(screen.queryByText('Reformulation')).toBeNull();
    expect(container.textContent).toBe('');
  });
});
