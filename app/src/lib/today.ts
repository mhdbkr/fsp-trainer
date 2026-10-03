// « Aujourd'hui », réactif (re-revue I-1). `todayKey()` lu pendant un rendu fige
// la date au dernier rendu : une app ouverte à 23 h rendait encore la veille à
// 1 h. Ce store change quand `watchDayPlan` rouvre le jour ; les écrans le lisent.
import { create } from 'zustand';
import { todayKey } from '@/lib/clock';

export const useToday = create<{ day: string }>(() => ({ day: todayKey() }));

/** Relit l'horloge ; ne notifie que si le jour a changé. */
export const refreshToday = (): void => {
  const day = todayKey();
  if (useToday.getState().day !== day) useToday.setState({ day });
};
