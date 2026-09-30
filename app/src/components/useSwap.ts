// ============================================================================
// useSwap — l'état de SORTIE qui manquait à l'app (audit identité & mouvement
// §5, série 3).
//
// LE DÉFAUT, une fois pour toutes. Huit endroits de l'app écrivent la même
// faute : une animation d'ENTRÉE (`.reveal`, `animate-fade-in`, une rotation)
// et aucune animation de SORTIE. Le contenu sortant est remplacé dans le même
// commit React que l'entrant. Il y a deux états pour trois moments — il manque
// « je pars ». Symptôme mesuré au Drill : la face recto porte déjà le mot
// SUIVANT au frame 0 d'une rotation de 500 ms, donc il apparaît à ~250 ms, de
// biais, en pleine rotation (DrillPage.tsx:185-186, CardFlip sans clé).
//
// LA CORRECTION, comme primitive. On ne corrige pas le Drill : on donne le
// troisième moment à tout le monde. `useSwap` retient la valeur AFFICHÉE
// pendant la durée de sortie, puis commet la plus récente. L'appelant ne
// change pas sa logique d'état (`setIdx(i + 1)` reste un simple setter) : il
// lit `value`/`leaving` au lieu de lire son état brut.
//
//   const { value: shown, leaving } = useSwap(idx, { idx, total });
//   <div className={leaving ? 'swap-out' : 'swap-in'}>…</div>
//
// PHYSIQUE ET INTERRUPTION. La sortie dure exactement `ms` à partir du PREMIER
// changement : un second changement pendant la sortie ne la rallonge pas, il
// est simplement pris en compte à l'échéance (on saute à la valeur la plus
// récente). Cliquer vite ne fige donc jamais l'affichage sur une valeur
// périmée — c'est la différence entre interruptible et « mis en file ».
//
// MOUVEMENT RÉDUIT. `prefers-reduced-motion: reduce` met la durée à 0 : le
// commit est synchrone, `leaving` ne passe jamais à vrai, donc `.swap-out`
// n'est jamais posée. `.swap-in` l'est (c'est la branche « pas en sortie »
// de l'appelant) ; la garde globale en `*` d'index.css ramène son animation
// à 0,001 ms. Pas de retard, donc pas de clignotement — c'est la faute qu'on
// corrige, pas une qu'on déplace.
//
// Autres consommateurs attendus (même défaut, mêmes lignes) :
// ImmersiveMode.tsx:248 · PhraseLine.tsx:69 · PhraseControls.tsx:73,169,181 ·
// AufklaerungPage.tsx:129,189 · WeekCalendar.tsx:101.
// ============================================================================
import { useEffect, useRef, useState, type Key } from 'react';

/** Durée de sortie par défaut, alignée sur `.swap-out` (index.css). */
export const SWAP_MS = 180;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);

export function useSwap<T>(key: Key, value: T, ms: number = SWAP_MS): { value: T; leaving: boolean } {
  // La préférence est relue à chaque rendu : elle peut changer en cours de
  // session (réglage système), et la lire une fois au montage laisserait un
  // composant animé chez quelqu'un qui vient de demander l'inverse.
  const duration = prefersReducedMotion() ? 0 : ms;

  // La clé actuellement À L'ÉCRAN. Elle retarde sur `key` pendant la sortie.
  const [displayedKey, setDisplayedKey] = useState<Key>(key);
  const leaving = displayedKey !== key && duration > 0;

  // Hors sortie on suit la valeur VIVANTE : si la clé n'a pas bougé mais que
  // son contenu a changé (file de drill remplie après coup, Bedeutung éditée
  // en session), l'écran doit le voir tout de suite. On ne fige qu'en sortant.
  const held = useRef<T>(value);
  if (!leaving) held.current = value;

  const latestKey = useRef(key);
  latestKey.current = key;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (displayedKey === key) return;
    if (duration === 0) { setDisplayedKey(key); return; }
    // Sortie déjà en cours : on ne la relance pas (sinon deux clics rapprochés
    // repousseraient l'échéance indéfiniment et l'écran se figerait). À
    // l'échéance on commet la clé la PLUS RÉCENTE, pas celle qui a déclenché.
    if (timer.current !== undefined) return;
    timer.current = setTimeout(() => {
      timer.current = undefined;
      setDisplayedKey(latestKey.current);
    }, duration);
  }, [key, displayedKey, duration]);

  // Démontage pendant une sortie : pas de setState sur un composant parti.
  useEffect(() => () => { if (timer.current !== undefined) clearTimeout(timer.current); }, []);

  return { value: leaving ? held.current : value, leaving };
}
