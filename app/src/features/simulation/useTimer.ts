import { useEffect, useRef, useState } from 'react';

// Chrono simple par partie (compte à rebours à partir d'une durée cible).
export function useTimer(targetSec: number) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (running) {
      ref.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    } else if (ref.current) {
      clearInterval(ref.current);
    }
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running]);

  const remaining = targetSec - elapsed;
  const reset = () => { setElapsed(0); setRunning(false); };

  return { elapsed, remaining, running, start: () => setRunning(true), pause: () => setRunning(false), reset, setRunning };
}

export function fmt(sec: number): string {
  const sign = sec < 0 ? '-' : '';
  const a = Math.abs(sec);
  return `${sign}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
}
