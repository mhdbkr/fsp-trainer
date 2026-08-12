import { useEffect, useState } from 'react';

/** ---------------------------------------------------------------------------
 *  Conscience du temps par la SURFACE, pas par des signaux : le verre de la
 *  capsule chrono se teinte seul, très lentement. Aucun clignotement, aucune
 *  onde, aucun effet — la couleur seule porte l'information.
 *
 *  Charte : le rouge est `signal` (#d84a24), l'accent unique réservé aux
 *  « points de bascule ». En dépassement il ne clignote pas, il FONCE.
 *  --------------------------------------------------------------------------- */

export type TimePhase = 'ruhig' | 'aktiv' | 'knapp' | 'ueberzogen';

export interface TimeAmbiance {
  progress: number;   // 0→1, part du temps imparti consommée (borné)
  overshoot: number;  // 0→1, ampleur du dépassement
  phase: TimePhase;
  intensity: number;  // 0→1, présence de la teinte sur le verre
  h: number; s: number; l: number;
  overtime: boolean;
  label: string;
}

// Arrêts en HSL — et non en RVB : interpoler du pétrole vers l'ambre en RVB
// traverse un kaki boueux. En HSL la teinte balaie 172° → 33° et donne une
// vraie chauffe vert → doré → ambre en gardant la saturation.
const STOPS: [number, [number, number, number]][] = [
  [0, [172, 72, 30]],   // brand-500 — calme
  [0.75, [33, 94, 42]], // amber-600 — ça se resserre
  [1, [13, 72, 50]],    // signal-500 — bascule
];

function lerpTint(t: number): [number, number, number] {
  const p = Math.min(Math.max(t, 0), 1);
  for (let i = 1; i < STOPS.length; i++) {
    const [pos1, c1] = STOPS[i - 1];
    const [pos2, c2] = STOPS[i];
    if (p <= pos2) {
      const k = pos2 === pos1 ? 0 : (p - pos1) / (pos2 - pos1);
      return [0, 1, 2].map((j) => c1[j] + (c2[j] - c1[j]) * k) as [number, number, number];
    }
  }
  return STOPS[STOPS.length - 1][1];
}

const PHASE_LABEL: Record<TimePhase, string> = {
  ruhig: 'Temps maîtrisé',
  aktiv: 'Temps maîtrisé',
  knapp: 'Bientôt la fin',
  ueberzogen: 'Temps dépassé',
};

export function computeAmbiance(elapsed: number, target: number): TimeAmbiance {
  const safeTarget = Math.max(target, 1);
  const ratio = elapsed / safeTarget;
  const progress = Math.min(ratio, 1);
  const overtime = ratio > 1;
  const overshoot = overtime ? Math.min(ratio - 1, 1) : 0;

  const phase: TimePhase = overtime ? 'ueberzogen' : progress >= 0.8 ? 'knapp' : progress >= 0.55 ? 'aktiv' : 'ruhig';

  // Courbe retardée : pendant la première moitié la teinte doit rester
  // franchement verte et discrète — elle ne doit pas peser sur l'entretien.
  const intensity = overtime ? 0.8 + 0.2 * overshoot : Math.pow(progress, 1.9) * 0.8;
  let [h, s, l] = lerpTint(overtime ? 1 : Math.pow(progress, 2.1));

  // En dépassement, le rouge ne s'agite pas : il s'enfonce vers le sombre.
  if (overtime) {
    h = 13 - 5 * overshoot;
    s = 72 - 6 * overshoot;
    l = 50 - 19 * overshoot;
  }

  return { progress, overshoot, phase, intensity, h: +h.toFixed(1), s: +s.toFixed(1), l: +l.toFixed(1), overtime, label: PHASE_LABEL[phase] };
}

/** Couleur prête à l'emploi. La clarté est corrigée par une variable CSS selon
 *  le thème (le pétrole à 30 % de clarté s'éteint sur fond encre) : la teinte
 *  reste lisible en clair COMME en sombre, sans recalcul JS. */
export function auraColor(amb: TimeAmbiance, alpha = 1): string {
  return `hsl(${amb.h} ${amb.s}% calc(${amb.l}% + var(--aura-l-boost, 0%)) / ${alpha})`;
}

/** Réplique la logique de teinte pour un `elapsed` donné sans rendre de vue —
 *  utile aux surfaces annexes (mode focus) qui suivent le même chrono. */
export function useOvertimeAnnounce(overtime: boolean, holdMs = 6000): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!overtime) return;
    setOn(true);
    const t = window.setTimeout(() => setOn(false), holdMs);
    return () => window.clearTimeout(t);
  }, [overtime, holdMs]);
  return on;
}
