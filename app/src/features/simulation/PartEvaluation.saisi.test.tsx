// C6-A point 3 — le bilan, lu dans le DOM rendu : curseurs vides, score
// « contenu seul ».
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NOT_ENTERED, emptyLanguageGrid } from '@/lib/scoring';
import { PartEvaluation } from './PartEvaluation';
import type { ChecklistItem } from '@/db/types';

const items = (n: number, coches: number): ChecklistItem[] =>
  Array.from({ length: n }, (_, i) => ({ id: `i${i}`, label: `Critère ${i}`, checked: i < coches }) as ChecklistItem);
const props = {
  part: 'anamnese' as const, durationSec: 60, checklist: items(10, 3), grid: emptyLanguageGrid(), feeling: NOT_ENTERED,
  onToggle: vi.fn(), onGrid: vi.fn(), onFeeling: vi.fn(), onSuivant: vi.fn(), onRetour: vi.fn(), suivant: null,
};

describe('PartEvaluation — rien de saisi, rien de compté', () => {
  it('30 % de critères cochés donnent 30 %, et le libellé dit sur quoi', () => {
    render(<PartEvaluation {...props} />);
    expect(screen.getByText('Score de la partie').parentElement!.textContent).toContain('30%');
    expect(screen.getByText(/Calculé sur : contenu seul/)).toBeTruthy();
  });
  it('aucun curseur n\'affiche de valeur : « — » pour les 5 critères et pour le ressenti', () => {
    render(<PartEvaluation {...props} />);
    expect(screen.getAllByText('—/5')).toHaveLength(5);
    expect(screen.getByTestId('ressenti-valeur').textContent).toBe('—');
  });
  it('noter un critère appelle onGrid avec cette note, les autres restent non saisis', () => {
    const onGrid = vi.fn();
    render(<PartEvaluation {...props} onGrid={onGrid} />);
    fireEvent.change(screen.getByLabelText(/Wortschatz/), { target: { value: '4' } });
    expect(onGrid).toHaveBeenCalledWith({ ...emptyLanguageGrid(), wortschatz: 4 });
  });
  it('un clic sur le curseur sans le déplacer le saisit quand même', () => {
    const onFeeling = vi.fn();
    render(<PartEvaluation {...props} onFeeling={onFeeling} />);
    fireEvent.pointerUp(screen.getByLabelText('Ressenti'));
    expect(onFeeling).toHaveBeenCalledTimes(1);
  });
  it('tout saisi : la langue et le ressenti comptent, le libellé le dit', () => {
    const grid = { aussprache: 5, wortschatz: 5, grammatik: 5, redefluss: 5, kommunikation: 5 };
    render(<PartEvaluation {...props} grid={grid} feeling={100} />);
    expect(screen.getByText(/Calculé sur : contenu, langue et ressenti/)).toBeTruthy();
    expect(screen.getByText('Score de la partie').parentElement!.textContent).toContain('62%');   // 30·.55 + 100·.30 + 100·.15
  });
});
