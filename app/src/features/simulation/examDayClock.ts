// Horloge murale du Prüfungstag (spec D3/§5.2).
// `remainingSec` est pur : remaining = target − (now − startedAt). Onglet gelé
// ou composant démonté ne gagnent pas de temps ; horloge reculée (now < startedAt)
// ⇒ échu (0). Interdit : compteur (`useTimer`) — cf. scripts/checkExamDay.mjs.

import { useEffect, useState } from 'react';

export function remainingSec(startedAt: number, targetSec: number, now: number): number {
  if (now < startedAt) return 0;
  return Math.max(0, targetSec - Math.floor((now - startedAt) / 1000));
}

export interface ExamDayClock {
  remaining: number;
  expired: boolean;
  alert: number | null;
}

export function useExamDayClock(
  startedAt: number | null,
  targetSec: number,
  alertsSec: number[] = [],
  nowFn: () => number = Date.now,
): ExamDayClock {
  const calc = () => (startedAt === null ? targetSec : remainingSec(startedAt, targetSec, nowFn()));
  const [remaining, setRemaining] = useState(calc);

  useEffect(() => {
    if (startedAt === null) return;
    const tick = () => setRemaining(calc());
    tick();
    const id = setInterval(tick, 500);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startedAt, targetSec]);

  const expired = startedAt !== null && remaining === 0;
  const alert = alertsSec.find((a) => remaining <= a && remaining > a - 60) ?? null;

  return { remaining, expired, alert };
}
