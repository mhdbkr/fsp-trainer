// M9 (revue s3-programme) : la direction a demandé l'historique « accessible
// depuis la barre latérale ». `NAV` est la source unique de la barre et de ⌘K.
import { describe, it, expect } from 'vitest';
import { NAV } from '@/components/nav';

describe('M9 — l\'Historique est une destination de premier niveau', () => {
  it('NAV porte /historique, juste après le Programme', () => {
    const i = NAV.findIndex((n) => n.to === '/programme');
    expect(NAV[i + 1]?.to).toBe('/historique');
  });
});
