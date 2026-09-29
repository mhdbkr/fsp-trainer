import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { freshSrs } from '@/lib/srs';
import { CardFlip, cardFront } from './CardFlip';

const card = {
  id: 'fb-aszites', term: 'Aszites', translationSimple: 'Bauchwasser', specialty: 'Gastroenterologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs(0),
  register: { patient: 'Mein Bauch wird dicker.', vorstellung: 'Es zeigte sich ein Aszites.', anamnese: 'Ist Ihr Bauch dicker geworden?' },
} as never;
const personal = { id: 'pt-1', term: 'Übelkeit', translationSimple: '', personal: true, context: 'Sie berichtet über Übelkeit seit heute.', specialty: 'Allgemein', pathologyTags: [], centers: [], linkedCaseIds: [], srs: freshSrs(0) } as never;

describe('CardFlip (F4a §3.4, AC-8)', () => {
  it('Terme → sens : recto = terme ; verso (monté seulement une fois retourné) = la fiche complète', () => {
    const { rerender, container } = render(<CardFlip card={card} direction="term2simple" revealed={false} onFlip={() => {}} />);
    expect(screen.getByText('Aszites')).toBeTruthy();
    expect(container.textContent).not.toContain('Bauchwasser');
    rerender(<CardFlip card={card} direction="term2simple" revealed onFlip={() => {}} />);
    expect(screen.getByText('Bauchwasser')).toBeTruthy();
    expect(screen.getByText("Dans l'entretien")).toBeTruthy();
  });
  it('Sens → terme : recto = Bedeutung ; verso = le terme seul, jamais la fiche', () => {
    render(<CardFlip card={card} direction="simple2term" revealed onFlip={() => {}} />);
    expect(screen.getAllByText('Bauchwasser')).toHaveLength(1);
    expect(screen.getByText('Aszites')).toBeTruthy();
    expect(screen.queryByText("Dans l'entretien")).toBeNull();
  });
  it('carte personnelle sans Bedeutung, Sens → terme : contexte masqué au recto', () => {
    expect(cardFront(personal, 'simple2term')).toBe('Sie berichtet über … seit heute.');
    expect(cardFront(personal, 'term2simple')).toBe('Übelkeit');
  });
  it('miniature : pas de bouton Révéler, verso compact', () => {
    render(<CardFlip card={card} direction="term2simple" revealed size="mini" onFlip={() => {}} />);
    expect(screen.queryByRole('button', { name: /révéler/i })).toBeNull();
    expect(screen.queryByText("Dans l'entretien")).toBeNull();
    expect(screen.getByText('Bauchwasser')).toBeTruthy();
  });
});
