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
  // Le reste est DÉRIVÉ à chaque rendu (jamais mis en cache dans un état) :
  // un changement de partie ou de cible ne peut donc pas montrer, même un
  // rendu durant, le reste périmé de la partie précédente — ce qui ferait
  // enchaîner deux transitions d'un coup. L'intervalle ne sert qu'à re-rendre.
  const [, setTick] = useState(0);

  useEffect(() => {
    if (startedAt === null) return;
    const tick = () => setTick((t) => t + 1);
    const id = setInterval(tick, 500);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [startedAt, targetSec]);

  const remaining = startedAt === null ? targetSec : remainingSec(startedAt, targetSec, nowFn());
  const expired = startedAt !== null && remaining === 0;
  const alert = alertsSec.find((a) => remaining <= a && remaining > a - 60) ?? null;

  return { remaining, expired, alert };
}
