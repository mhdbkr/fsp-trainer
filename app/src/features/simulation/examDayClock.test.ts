import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as React from 'react';
import * as ReactDOM from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { remainingSec, useExamDayClock } from './examDayClock';

describe('remainingSec (horloge murale pure)', () => {
  it('décompte depuis startedAt', () => {
    expect(remainingSec(0, 1200, 1000)).toBe(1199);
  });

  it('horloge reculée (now < startedAt) ⇒ échu', () => {
    expect(remainingSec(1000, 1200, 0)).toBe(0);
  });

  it('plafonne à 0 au-delà de la cible', () => {
    expect(remainingSec(0, 1200, 3 * 3600 * 1000)).toBe(0);
  });
});

// renderHook minimal (sans @testing-library/react, hors périmètre pour ajouter
// une dépendance) : monte un composant qui expose le résultat du hook via ref.
function renderHook<T>(useHook: () => T) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOM.createRoot(container);
  const result: { current: T } = { current: undefined as unknown as T };

  function Wrapper() {
    result.current = useHook();
    return null;
  }

  act(() => {
    root.render(React.createElement(Wrapper));
  });

  return {
    result,
    unmount: () => act(() => root.unmount()),
  };
}

describe('useExamDayClock (horloge murale)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('expire sans action après le temps cible (montre murale, pas un compteur)', () => {
    const base = 1_000_000_000;
    const targetSec = 1200;
    const startedAt = base - 1199 * 1000;
    let now = base;
    const { result } = renderHook(() =>
      useExamDayClock(startedAt, targetSec, [], () => now),
    );

    expect(result.current.expired).toBe(false);

    now = base + 1500; // + 1.5 s → dépasse la seconde restante
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current.expired).toBe(true);
  });

  it('alerte à 300 s puis 60 s, sinon null', () => {
    const base = 2_000_000_000;
    const targetSec = 1200;
    const alertsSec = [300, 60];
    const startedAt = base;
    let now = base + (targetSec - 600) * 1000; // reste 600 s

    const { result } = renderHook(() =>
      useExamDayClock(startedAt, targetSec, alertsSec, () => now),
    );
    expect(result.current.alert).toBeNull();

    now = base + (targetSec - 290) * 1000; // reste 290 s ∈ (240, 300]
    act(() => {
      vi.advanceTimersByTime(600); // déclenche l'intervalle interne (500 ms)
    });
    expect(result.current.alert).toBe(300);

    now = base + (targetSec - 45) * 1000; // reste 45 s ≤ 60
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.alert).toBe(60);
  });
});
