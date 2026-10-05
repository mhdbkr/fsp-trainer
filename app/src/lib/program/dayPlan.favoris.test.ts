import { describe, it, expect } from 'vitest';
import { drillFavorisNote } from './dayPlan';

// Lot F point 4 : la tâche drill dit « dont N favoris de ta séance », N > 0 seulement.
// Lu à l'AFFICHAGE (état courant) : le plan figé (INV-55) n'en dépend pas.
describe('drillFavorisNote', () => {
  it('rien à 0', () => expect(drillFavorisNote(0)).toBeNull());
  it('singulier / pluriel', () => {
    expect(drillFavorisNote(1)).toBe('dont 1 favori de ta séance');
    expect(drillFavorisNote(4)).toBe('dont 4 favoris de ta séance');
  });
});
