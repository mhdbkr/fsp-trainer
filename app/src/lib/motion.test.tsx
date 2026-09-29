import { describe, it, expect, beforeAll, vi } from 'vitest';
import { useContext, useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MotionConfigContext } from 'motion/react';
import { AnimatePresence, m, appear, MotionRoot, flyFrom, settleOrClose, expand, useCountUp } from './motion';

// jsdom n'a pas matchMedia : une requête pilotable, avec son événement `change`
// (motion l'écoute une fois, au premier useReducedMotion).
const listeners = new Set<() => void>();
const mql = { matches: false, media: '(prefers-reduced-motion)', onchange: null,
  addEventListener: (_: string, f: () => void) => listeners.add(f), removeEventListener: (_: string, f: () => void) => listeners.delete(f),
  addListener() {}, removeListener() {}, dispatchEvent: () => false };
const setReduce = (on: boolean) => { mql.matches = on; listeners.forEach((f) => f()); };

function Config() {
  const c = useContext(MotionConfigContext);
  return <span data-testid="cfg">{`${c.reducedMotion}|${c.skipAnimations}`}</span>;
}
function Toggle() {
  const [open, setOpen] = useState(true);
  return (<>
    <button type="button" onClick={() => setOpen((o) => !o)}>basculer</button>
    <AnimatePresence>{open && <m.div key="b" data-testid="b" {...appear}>x</m.div>}</AnimatePresence>
  </>);
}

describe('MotionRoot (F4b P9, AC-8)', () => {
  beforeAll(() => { window.matchMedia = (() => mql) as never; });

  it('reducedMotion="user" ; sans préférence, les animations tournent', () => {
    render(<MotionRoot><Config /></MotionRoot>);
    expect(screen.getByTestId('cfg').textContent).toBe('user|false');
  });
  it('prefers-reduced-motion : skipAnimations → états instantanés', () => {
    setReduce(true);
    render(<MotionRoot><Config /></MotionRoot>);
    expect(screen.getByTestId('cfg').textContent).toBe('user|true');
    setReduce(false);
  });
  it('interruptible : fermer puis rouvrir pendant la sortie garde UN élément, qui finit visible', async () => {
    render(<MotionRoot><Toggle /></MotionRoot>);
    fireEvent.click(screen.getByText('basculer'));   // sortie en cours
    fireEvent.click(screen.getByText('basculer'));   // réouverture pendant la sortie
    expect(screen.getAllByTestId('b')).toHaveLength(1);
    await waitFor(() => expect(screen.getByTestId('b').style.opacity).toBe('1'));
  });
});

describe('gestes (F4b P8/P9)', () => {
  const rect = (left: number, top: number) => ({ left, top, width: 10, height: 10, right: left + 10, bottom: top + 10, x: left, y: top, toJSON() {} }) as DOMRect;
  it('se poser : descend de dy en se réduisant ; sans dy, sortie ordinaire (s\'étendre à l\'envers)', () => {
    expect(settleOrClose(120)).toMatchObject({ opacity: 0, scale: 0.3, y: 120 });
    expect(settleOrClose(undefined)).toBe(expand.exit);
  });
  it('voler : part du rectangle d\'origine, annule le vol précédent ; rien sous mouvement réduit', () => {
    const cancel = vi.fn();
    const el = { getBoundingClientRect: () => rect(100, 40), getAnimations: () => [{ cancel }], animate: vi.fn() } as unknown as HTMLElement;
    flyFrom(el, rect(30, 200));
    expect(cancel).toHaveBeenCalled();
    expect(vi.mocked(el.animate).mock.calls[0][0]).toEqual([{ transform: 'translate(-70px, 160px)', opacity: 0.6 }, { transform: 'none', opacity: 1 }]);
    mql.matches = true;
    flyFrom(el, rect(30, 200));
    expect(el.animate).toHaveBeenCalledTimes(1);
    mql.matches = false;
  });
});

describe('compter (F4b P10)', () => {
  function Count({ to }: { to: number }) { return <span data-testid="n">{useCountUp(to, 50)}</span>; }
  it('compte de 0 à la valeur à l\'apparition, puis affiche les changements tels quels', async () => {
    const { rerender } = render(<Count to={42} />);
    expect(screen.getByTestId('n').textContent).toBe('0');
    await waitFor(() => expect(screen.getByTestId('n').textContent).toBe('42'));
    rerender(<Count to={7} />);
    expect(screen.getByTestId('n').textContent).toBe('7');
  });
  it('mouvement réduit : la valeur tout de suite', () => {
    mql.matches = true;
    render(<Count to={42} />);
    expect(screen.getByTestId('n').textContent).toBe('42');
    mql.matches = false;
  });
});
