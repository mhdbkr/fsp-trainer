// ============================================================================
// L'accès au temps, centralisé et injectable.
//
// Prérequis de tout le module Programme : tant que le code lit l'heure
// directement (`Date.now()`, `new Date()`), aucun test ne peut jouer « le jour
// 2 », et l'invariant INV-12 (la phase d'un jour figé ne change plus) n'est pas
// vérifiable. Toute lecture du temps dans `lib/program*`, `lib/journal.ts` et
// les vues du programme passe par ici.
// ============================================================================

import { format } from 'date-fns';

type Source = () => number;

const REAL: Source = () => Date.now();
let source: Source = REAL;

/** Instant courant, en epoch ms. */
export const now = (): number => source();

/** Instant courant, en `Date`. Une NOUVELLE instance à chaque appel. */
export const nowDate = (): Date => new Date(source());

/** Jour courant au format ISO `yyyy-MM-dd` — la clé d'un `DayPlan`. */
export const todayKey = (): string => format(nowDate(), 'yyyy-MM-dd');

/** Clé de jour d'un instant quelconque (epoch ms ou `Date`). */
export const dayKey = (t: number | Date): string => format(t instanceof Date ? t : new Date(t), 'yyyy-MM-dd');

/** Injecte une source de temps (tests, rejeu d'un parcours). */
export function setClock(fn: Source): void { source = fn; }

/** Rend l'horloge réelle. À appeler dans le `afterEach` de tout test. */
export function resetClock(): void { source = REAL; }

/**
 * Fige l'horloge à `t` et rend un avanceur.
 *
 *   const advance = freezeAt('2026-10-01T08:00:00Z');
 *   advance(24 * 3600_000);   // on est le 2 octobre
 */
export function freezeAt(t: number | string | Date): (deltaMs: number) => number {
  let current = typeof t === 'number' ? t : new Date(t).getTime();
  source = () => current;
  return (deltaMs: number) => (current += deltaMs);
}

/** Un jour en millisecondes — évite le `24 * 3600 * 1000` recopié. */
export const DAY_MS = 86_400_000;
