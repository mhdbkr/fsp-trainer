import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { freezeAt, resetClock } from '@/lib/clock';
import { remainingSec, useExamDayClock } from './horloge';

describe('remainingSec (horloge murale pure)', () => {
  it('décompte depuis le début', () => { expect(remainingSec(0, 1200, 1000)).toBe(1199); });
  it('horloge reculée ⇒ échu', () => { expect(remainingSec(1000, 1200, 0)).toBe(0); });
  it('plafonne à 0 au-delà de la cible', () => { expect(remainingSec(0, 1200, 3 * 3600 * 1000)).toBe(0); });
});

describe('useExamDayClock — lit `now` de lib/clock', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] }); });
  afterEach(() => { vi.useRealTimers(); resetClock(); });

  it('expire sans action après la cible (montre murale, pas un compteur)', () => {
    const avance = freezeAt(1_000_000_000);
    const { result } = renderHook(() => useExamDayClock(1_000_000_000 - 1199 * 1000, 1200));
    expect(result.current.expired).toBe(false);
    avance(1500);
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current.expired).toBe(true);
  });

  it('onglet gelé : sans intervalle, le retour de visibilité suffit à relire l’heure', () => {
    const avance = freezeAt(2_000_000_000);
    const { result } = renderHook(() => useExamDayClock(2_000_000_000, 1200));
    avance(30 * 60 * 1000);                                     // aucun intervalle ne tourne
    expect(result.current.expired).toBe(false);
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(result.current.expired).toBe(true);
    expect(result.current.remaining).toBe(0);
  });

  it('alerte à 300 s puis à 60 s, sinon `null`', () => {
    const base = 3_000_000_000;
    const avance = freezeAt(base + 600 * 1000);                 // reste 600 s
    const { result } = renderHook(() => useExamDayClock(base, 1200, [300, 60]));
    expect(result.current.alert).toBeNull();
    avance(310 * 1000);                                         // reste 290 s
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current.alert).toBe(300);
    avance(245 * 1000);                                         // reste 45 s
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current.alert).toBe(60);
  });
});
