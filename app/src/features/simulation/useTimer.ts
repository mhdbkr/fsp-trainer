import { useEffect, useRef, useState } from 'react';

// Chrono par partie (compte à rebours à partir d'une durée cible).
// `initialElapsed` : reprend là où la partie s'était arrêtée (session persistante).
// `onChange` : remonte le temps écoulé au parent pour le sauvegarder.
export function useTimer(targetSec: number, initialElapsed = 0, onChange?: (sec: number) => void, autoStart = false) {
  const [elapsed, setElapsed] = useState(initialElapsed);
  const [running, setRunning] = useState(autoStart);
  const ref = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (running) {
      ref.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    } else if (ref.current) {
      clearInterval(ref.current);
    }
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [running]);

  // Remonte le temps écoulé au parent (pour la persistance) à chaque changement.
  useEffect(() => { onChangeRef.current?.(elapsed); }, [elapsed]);

  const remaining = targetSec - elapsed;
  const reset = () => { setElapsed(0); setRunning(false); };

  return { elapsed, remaining, running, start: () => setRunning(true), pause: () => setRunning(false), reset, setRunning };
}

export function fmt(sec: number): string {
  const sign = sec < 0 ? '-' : '';
  const a = Math.abs(sec);
  return `${sign}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
}
