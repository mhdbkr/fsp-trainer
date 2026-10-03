// ============================================================================
// Démarrage du journal : ce qui doit être vrai AVANT que le jour ne se fige.
// Appelé par `main.tsx`, une fois, avant le premier rendu.
//
// B-C1 (revue s3-programme) : la v5 ajoute trois projections VIDES et
// `rebuildProjections` ne tournait qu'après un pull rapportant du neuf. Pour un
// utilisateur existant (Mehdi, Lydia) : historique vide, `case_progress` vide,
// et le plan du jour figé là-dessus reproposait des cas déjà solides.
// D-I2 (décision main) : un pull BORNÉ avant `ensureDayPlan`, pour qu'un second
// appareil reprenne le plan déjà figé par le premier. Hors ligne, on matérialise
// quand même : le délai est court et le pull tardif se reconstruit tout seul.
// ============================================================================

import { rebuildJournal } from '@/lib/journal';
import { ensureDayPlan } from '@/lib/program/dayPlan';
import type { DayPlan } from '@/db/types';
import { now } from '@/lib/clock';
import { syncQueue } from './queue';

export const BOOT_PULL_MS = 2500;

export async function bootJournal(pullMs = BOOT_PULL_MS): Promise<DayPlan | null> {
  let pulled = 0;
  if (typeof navigator === 'undefined' || navigator.onLine) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    pulled = await Promise.race([
      syncQueue.pull().catch(() => 0),
      new Promise<number>((r) => { timer = setTimeout(() => r(0), pullMs); }),
    ]);
    clearTimeout(timer);
  }
  // Un pull qui a rapporté du neuf a déjà tout reconstruit (rebuildProjections).
  // Sinon on reconstruit le journal ici, TOUJOURS : c'est O(n) sur le journal
  // local, et « vide ou incomplet » ne se détecte pas mieux qu'en reconstruisant.
  if (!pulled) await rebuildJournal();
  return ensureDayPlan();
}

/** Millisecondes jusqu'au prochain minuit LOCAL (DST compris : `setHours(24)`). */
export const msToNextDay = (t: number): number => { const d = new Date(t); d.setHours(24, 0, 0, 0); return d.getTime() - t; };

/**
 * I1 — le jour se matérialise aussi APRÈS le démarrage : au retour au premier
 * plan (app restée ouverte d'un jour à l'autre, onglet en veille) et à minuit.
 * `ensureDayPlan` est idempotente : sur un jour déjà figé, elle ne fait que le
 * relire. Jamais appelée par un rendu (contrat §3.2). Rend le désabonnement.
 */
export function watchDayPlan(): () => void {
  const open = () => { void ensureDayPlan().catch((e) => console.warn('[programme]', e)); };
  const onVisible = () => { if (document.visibilityState !== 'hidden') open(); };
  let timer: ReturnType<typeof setTimeout>;
  const arm = () => { timer = setTimeout(() => { open(); arm(); }, msToNextDay(now()) + 1000); };
  document.addEventListener('visibilitychange', onVisible);
  arm();
  return () => { document.removeEventListener('visibilitychange', onVisible); clearTimeout(timer); };
}
