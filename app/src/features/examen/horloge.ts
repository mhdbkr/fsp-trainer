// Horloge murale de l'Examen (simulation-run.md §11.2). Portée de `feat/pruefungstag` (examDayClock.ts).
// `remainingSec` est pur : reste = cible − (maintenant − début). Un onglet gelé ou un composant démonté ne gagne pas de
// temps ; une horloge reculée (maintenant < début) vaut échéance. Interdit ici : un compteur (`useTimer`).
import { useEffect, useState } from 'react';
import { now } from '@/lib/clock';

export function remainingSec(startedAt: number, targetSec: number, maintenant: number): number {
  if (maintenant < startedAt) return 0;
  return Math.max(0, targetSec - Math.floor((maintenant - startedAt) / 1000));
}

export interface ExamDayClock {
  remaining: number;
  expired: boolean;
  /** L'alerte en cours (en secondes : 300, 60…), pendant la minute qui la suit ; sinon `null`. */
  alert: number | null;
}

export function useExamDayClock(
  startedAt: number | null,
  targetSec: number,
  alertsSec: number[] = [],
  nowFn: () => number = now,
): ExamDayClock {
  // Le reste est DÉRIVÉ à chaque rendu, jamais gardé dans un état : un changement de Teil ne peut pas montrer, même un
  // rendu durant, le reste périmé du Teil précédent. L'intervalle et la visibilité ne servent qu'à re-rendre.
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
