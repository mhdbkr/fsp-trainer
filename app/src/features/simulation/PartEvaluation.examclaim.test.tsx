// C6-A point 4 — garde EXAM_CLAIM : la grille de langue est celle de Doctopus.
// Aucune formulation n'affirme ce que le jury note (rien de sourcé, PR #48).
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { NOT_ENTERED, emptyLanguageGrid } from '@/lib/scoring';
import { PartEvaluation } from './PartEvaluation';

const props = {
  part: 'anamnese' as const, durationSec: 60, checklist: [], grid: emptyLanguageGrid(), feeling: NOT_ENTERED,
  onToggle: vi.fn(), onGrid: vi.fn(), onFeeling: vi.fn(), onSuivant: vi.fn(), onRetour: vi.fn(), suivant: null,
};

describe('EXAM_CLAIM — la grille est celle de Doctopus, pas « ce que le jury note »', () => {
  it('aucune formulation d\'examen officiel dans le bilan', () => {
    const { container } = render(<PartEvaluation {...props} />);
    expect(container.textContent).not.toMatch(/officiel|jury note|vraiment/i);
    expect(container.textContent).toContain('Grille Doctopus');
  });
});
