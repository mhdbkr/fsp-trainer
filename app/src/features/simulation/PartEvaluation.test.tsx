import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { emptyLanguageGrid } from '@/lib/scoring';
import { PartEvaluation } from './PartEvaluation';

// Re-revue 2, item 7 (décision de main, « zéro doublon ») : « Terminer la
// simulation → » vit dans l'EN-TÊTE collant, toujours visible. Le pied du
// bilan ne le répète pas.
const props = {
  part: 'anamnese' as const, durationSec: 60, checklist: [], grid: emptyLanguageGrid(), feeling: 50,
  onToggle: vi.fn(), onGrid: vi.fn(), onFeeling: vi.fn(), onSuivant: vi.fn(), onRetour: vi.fn(),
};

describe('PartEvaluation — le pied du bilan', () => {
  it('dernière partie : pas de « Terminer la simulation » en pied, « Revenir » reste', () => {
    render(<PartEvaluation {...props} suivant={null} />);
    expect(screen.queryByRole('button', { name: /Terminer la simulation/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Revenir à la partie/ })).toBeTruthy();
  });
  it('partie suivante disponible : elle seule avance', () => {
    render(<PartEvaluation {...props} suivant="Dokumentation" />);
    expect(screen.queryByRole('button', { name: /Terminer la simulation/ })).toBeNull();
    expect(screen.getByRole('button', { name: /Partie suivante — Dokumentation/ })).toBeTruthy();
  });
});
