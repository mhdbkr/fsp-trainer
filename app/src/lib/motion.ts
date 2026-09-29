// ============================================================================
// Mouvement de Doctopus (F4b P9) — SEUL point d'import de `motion`.
// Quatre gestes partagés : apparaître, s'étendre, glisser, se poser (+ voler :
// FLIP natif du mot choisi, sans coût de bundle). Ressort court sans rebond
// (le texte ne rebondit jamais). Interruptibles par construction : motion
// repart de la valeur COURANTE — fermer pendant l'ouverture repart en sens
// inverse (AnimatePresence).
// `MotionRoot` (monté une fois dans Shell) : LazyMotion strict + `domMin`
// (animate + exit, sans gestes ni layout : budget AC-9 mesuré — `domMax`
// coûte +13 Kio de plus) ; MotionConfig reducedMotion="user" et, sous
// prefers-reduced-motion, skipAnimations → états instantanés (pas seulement
// les transforms). Tests unitaires : composants rendus SANS MotionRoot →
// aucune fonction d'animation chargée, AnimatePresence retire tout de suite.
// ============================================================================
import { createElement, type ReactNode } from 'react';
import { LazyMotion, MotionConfig, domMin, useReducedMotion, type Transition } from 'motion/react';

export { AnimatePresence } from 'motion/react';
export * as m from 'motion/react-m';

/** Ressort court, sans rebond. */
export const spring: Transition = { type: 'spring', visualDuration: 0.26, bounce: 0 };

/** Apparaître : fondu + 4 px. */
export const appear = {
  initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 4 }, transition: spring,
} as const;

/** S'étendre : la surface grandit depuis son ancre (donner `style={{ transformOrigin }}`). */
export const expand = {
  initial: { opacity: 0, scale: 0.85 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.85 }, transition: spring,
} as const;

/** Glisser : entre et sort par un bord. */
export function slide(edge: 'left' | 'right' | 'bottom') {
  const off = edge === 'bottom' ? { y: 24 } : { x: edge === 'left' ? -24 : 24 };
  return { initial: { opacity: 0, ...off }, animate: { opacity: 1, x: 0, y: 0 }, exit: { opacity: 0, ...off }, transition: spring } as const;
}

/** Se poser : la carte créée descend de `dy` px en se réduisant, jusqu'à la
 *  pilule de confirmation (bas de l'écran). `dy` absent → sortie ordinaire. */
export const settleOrClose = (dy: number | undefined) =>
  dy === undefined ? expand.exit : { opacity: 0, scale: 0.3, y: dy, transition: spring };

/** Le mouvement est-il permis ? Non sous prefers-reduced-motion, ni sans matchMedia (tests). */
const mayMove = () => typeof window !== 'undefined' && !!window.matchMedia && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
/** Voler (FLIP natif, WAAPI) : `el` part de `from` et rejoint sa place. Sans
 *  mouvement réduit seulement ; un nouveau vol annule le précédent. */
export function flyFrom(el: HTMLElement | null, from: DOMRect | null) {
  if (!el || !from || typeof el.animate !== 'function' || !mayMove()) return;
  const to = el.getBoundingClientRect();
  el.getAnimations().forEach((a) => a.cancel());
  el.animate(
    [{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px)`, opacity: 0.6 }, { transform: 'none', opacity: 1 }],
    { duration: 260, easing: 'cubic-bezier(0.32, 0.72, 0, 1)' },
  );
}

export function MotionRoot({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion() ?? false;
  return createElement(LazyMotion, { features: domMin, strict: true },
    createElement(MotionConfig, { reducedMotion: 'user', skipAnimations: reduce }, children));
}
