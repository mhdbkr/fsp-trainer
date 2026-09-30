import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { useSwap } from './useSwap';

// jsdom n'implémente pas matchMedia : on le pose, et on le pilote.
let reduced = false;
beforeEach(() => {
  reduced = false;
  vi.stubGlobal('matchMedia', (q: string) => ({
    matches: q.includes('prefers-reduced-motion') && reduced,
    media: q, onchange: null,
    addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false,
  }));
  vi.useFakeTimers();
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

function Probe({ ms = 180 }: { ms?: number }) {
  const [n, setN] = useState(0);
  const { value, leaving } = useSwap(n, `carte-${n}`, ms);
  return (
    <div>
      <output data-testid="shown">{value}</output>
      <output data-testid="leaving">{String(leaving)}</output>
      <button onClick={() => setN((x) => x + 1)}>suivant</button>
    </div>
  );
}

const click = () => act(() => { screen.getByText('suivant').click(); });
const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const shown = () => screen.getByTestId('shown').textContent;
const leaving = () => screen.getByTestId('leaving').textContent;

describe('useSwap — le troisième moment', () => {
  it('retient la valeur affichée pendant la sortie : le contenu suivant n’apparaît pas au frame 0', () => {
    render(<Probe />);
    expect(shown()).toBe('carte-0');

    click();
    // C'EST le bug corrigé : sans état de sortie, on lirait déjà « carte-1 ».
    expect(shown()).toBe('carte-0');
    expect(leaving()).toBe('true');

    tick(179);
    expect(shown()).toBe('carte-0');

    tick(1);
    expect(shown()).toBe('carte-1');
    expect(leaving()).toBe('false');
  });

  it('interruptible : une sortie déjà en cours n’est jamais rallongée, et commet la valeur la PLUS RÉCENTE', () => {
    render(<Probe />);
    click();            // 0 → 1, sortie démarrée à t=0
    tick(100);
    click();            // 1 → 2 pendant la sortie
    expect(shown()).toBe('carte-0');

    // L'échéance reste celle du PREMIER changement : t=180, pas t=280.
    tick(80);
    expect(shown()).toBe('carte-2');   // on saute à la plus récente, pas de file d'attente
    expect(leaving()).toBe('false');
  });

  it('cliquer plus vite que la durée de sortie ne fige jamais l’affichage', () => {
    render(<Probe />);
    for (let i = 0; i < 10; i++) { click(); tick(50); }
    // 10 changements en 500 ms : l'affichage a suivi, il n'est pas resté sur carte-0.
    tick(200);
    expect(shown()).toBe('carte-10');
  });

  it('clé inchangée, valeur changée : l’écran suit TOUT DE SUITE (on ne fige qu’en sortant)', () => {
    // Le piège : la file du drill est vide au montage (`queue[0]` vaut undefined)
    // et se remplit ensuite SANS que l'index bouge. Un hook qui ne réagirait
    // qu'au changement de clé resterait bloqué sur la valeur initiale — et
    // l'écran entier disparaîtrait. C'est exactement ce qui a cassé les 10 tests
    // de DrillPage à la première version de useSwap.
    function Live() {
      const [v, setV] = useState('vide');
      const { value, leaving } = useSwap(0, v);
      return (<div>
        <output data-testid="shown">{value}</output>
        <output data-testid="leaving">{String(leaving)}</output>
        <button onClick={() => setV('rempli')}>remplir</button>
      </div>);
    }
    render(<Live />);
    expect(shown()).toBe('vide');
    act(() => { screen.getByText('remplir').click(); });
    expect(shown()).toBe('rempli');
    expect(leaving()).toBe('false');
  });

  it('mouvement réduit : commit synchrone, `leaving` jamais vrai — pas de retard, donc pas de clignotement', () => {
    reduced = true;
    render(<Probe />);
    click();
    expect(shown()).toBe('carte-1');
    expect(leaving()).toBe('false');
  });

  it('démontage pendant une sortie : aucun setState après coup', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = render(<Probe />);
    click();
    unmount();
    tick(500);
    expect(err).not.toHaveBeenCalled();
    err.mockRestore();
  });
});
