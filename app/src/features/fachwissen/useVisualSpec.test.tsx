import { describe, it, expect } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Fachwissen } from '@/db/types';
import { useVisualSpec } from './useVisualSpec';

// fw-khk minimal mais fidèle aux refs citées par app/src/data/fachwissenVisuals/fw-khk.ts
const fwKhk: Fachwissen = {
  id: 'fw-khk',
  pathology: 'KHK',
  specialty: 'Kardiologie',
  definition: 'x',
  klinik: [
    { text: 'Stabile AP: reproduzierbar bei definierter Belastung' },
    { text: 'Instabile AP: neu, in Ruhe oder zunehmend → ACS!' },
  ],
  diagnostik: [{ stufe: 'Labor', text: 'Troponin' }],
  differenzialdiagnosen: [{ dd: 'Akuter Myokardinfarkt / ACS', unterscheidung: 'x' }],
  therapie: [
    { label: 'Kupierung des Angina-pectoris-Anfalls', items: ['x'], akut: true },
    {
      label:
        'Prognoseverbessernde Basistherapie (Risikofaktoren, Thrombozytenaggregationshemmung, Statin)',
      items: ['x'],
    },
    { label: 'Antianginöse Dauertherapie zur Symptomkontrolle', items: ['x'] },
    { label: 'Revaskularisation: PCI oder Bypass — Indikation und Verfahrenswahl', items: ['x'] },
  ],
} as unknown as Fachwissen;

const fwSansSpec: Fachwissen = {
  id: 'fw-sans-spec',
  pathology: 'Rien',
  specialty: 'Kardiologie',
  definition: 'x',
  klinik: [],
  diagnostik: [],
  differenzialdiagnosen: [],
  therapie: [],
} as unknown as Fachwissen;

function runHook<T>(hook: () => T): T {
  let result!: T;
  function Probe() {
    result = hook();
    return null;
  }
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => root.render(<Probe />));
  root.unmount();
  return result;
}

describe('useVisualSpec', () => {
  it('fw-khk : 3 blocs, has=true', () => {
    const result = runHook(() => useVisualSpec(fwKhk));
    expect(result.has).toBe(true);
    const total = [...result.blocksByAnchor.values()].reduce((n, l) => n + l.length, 0);
    expect(total).toBe(3);
  });

  it('fiche sans spec : has=false, collapsed vide', () => {
    const result = runHook(() => useVisualSpec(fwSansSpec));
    expect(result.has).toBe(false);
    expect(result.collapsed.size).toBe(0);
    expect(result.blocksByAnchor.size).toBe(0);
  });

  it('fw-khk : les blocs sont classés par anchor (klinik, differenzialdiagnosen, therapie)', () => {
    const result = runHook(() => useVisualSpec(fwKhk));
    expect(result.blocksByAnchor.get('klinik')?.[0].id).toBe('tree-ap');
    expect(result.blocksByAnchor.get('differenzialdiagnosen')?.[0].id).toBe('table-ap-acs');
    expect(result.blocksByAnchor.get('therapie')?.[0].id).toBe('toggles-therapie');
  });
});
