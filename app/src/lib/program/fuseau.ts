// ============================================================================
// Les bornes d'un jour, au fuseau DU PLAN.
// Contrat : training-journal.md §12.3 (`jourDe`, m-g), §12.4 (`debutJour`, `finJour`, m11).
//
// Un plan se fige sur l'appareil qui l'ouvre, mais la complétion de ses tâches se
// dérive sur TOUS les appareils (INV-51) : le jour d'un événement se lit donc au
// fuseau écrit dans le plan (`DayPlan.tz`), jamais à celui de l'appareil qui lit.
// Un plan série 3 n'a pas de `tz` : il se lit au fuseau local, comme avant.
// ============================================================================

import { startOfDay, parseISO } from 'date-fns';
import { dayKey } from '@/lib/clock';

const formateurs = new Map<string, Intl.DateTimeFormat>();
const formateur = (tz: string): Intl.DateTimeFormat => {
  let f = formateurs.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    formateurs.set(tz, f);
  }
  return f;
};

/** Le fuseau de l'appareil qui matérialise (écrit dans `DayPlan.tz`). */
export const fuseauLocal = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Un fuseau venu de la synchro n'est pas cru sur parole : un identifiant IANA que `Intl` connaît, et rien d'autre. */
export function fuseauValide(tz: unknown): tz is string {
  if (typeof tz !== 'string' || tz.length === 0 || tz.length > 64) return false;
  try { formateur(tz); return true; } catch { return false; }
}

interface Mur { y: number; m: number; d: number; h: number; mi: number; s: number }
function mur(t: number, tz: string): Mur {
  const p: Record<string, number> = {};
  for (const x of formateur(tz).formatToParts(t)) if (x.type !== 'literal') p[x.type] = Number(x.value);
  return { y: p.year, m: p.month, d: p.day, h: p.hour, mi: p.minute, s: p.second };
}

/** Le jour (`yyyy-MM-dd`) de l'instant `at`, au fuseau `tz` ; sans fuseau (ou fuseau illisible), le fuseau local. */
export function jourDe(at: number, tz?: string): string {
  if (!tz || !fuseauValide(tz)) return dayKey(at);
  const w = mur(at, tz);
  return `${String(w.y).padStart(4, '0')}-${String(w.m).padStart(2, '0')}-${String(w.d).padStart(2, '0')}`;
}

/** L'écart (ms) entre l'heure murale de `tz` à l'instant `t`, lue comme si c'était de l'UTC, et `t` lui-même. */
function ecart(t: number, tz: string): number {
  const w = mur(t, tz);
  return Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi, w.s) - Math.floor(t / 1000) * 1000;
}

/** Minuit local du jour `date` (`yyyy-MM-dd`) au fuseau `tz` ; sans fuseau, minuit local de l'appareil. */
export function debutJour(date: string, tz?: string): number {
  if (!tz || !fuseauValide(tz)) return startOfDay(parseISO(date)).getTime();
  const [y, m, d] = date.split('-').map(Number);
  const mural = Date.UTC(y, m - 1, d);
  let t = mural - ecart(mural, tz);
  t = mural - ecart(t, tz);                           // le décalage au bon instant (heure d'été comprise)
  return t;
}

/** Le début du jour suivant : un jour dure 23, 24 ou 25 h selon l'heure d'été. */
export function finJour(date: string, tz?: string): number {
  const suivant = new Date(`${date}T12:00:00Z`);
  suivant.setUTCDate(suivant.getUTCDate() + 1);
  return debutJour(suivant.toISOString().slice(0, 10), tz);
}
