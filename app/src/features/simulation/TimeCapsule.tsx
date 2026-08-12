import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { fmt } from './useTimer';
import { auraColor, computeAmbiance, type TimeAmbiance } from './timeAmbiance';

/** Le chrono est produit par PlayArea mais consommé jusque dans le mode focus
 *  (deux niveaux plus bas) : un contexte évite de faire transiter les props à
 *  travers des composants qui n'ont rien à voir avec le temps. */
export const TimeAmbianceContext = createContext<{ amb: TimeAmbiance; remaining: number } | null>(null);
export const useTimeAmbiance = () => useContext(TimeAmbianceContext);

export function TimeAmbianceProvider({ elapsed, target, children }: { elapsed: number; target: number; children: ReactNode }) {
  const amb = computeAmbiance(elapsed, target);
  return <TimeAmbianceContext.Provider value={{ amb, remaining: target - elapsed }}>{children}</TimeAmbianceContext.Provider>;
}

/** PERFORMANCE — l'état ne change qu'une fois par seconde ; la douceur vient de
 *  transitions CSS très longues (2 s) sur la couleur. Rien ne s'anime en boucle,
 *  rien ne clignote : la teinte dérive, c'est tout. */
const DRIFT = 'background 2000ms linear, border-color 2000ms linear, box-shadow 2000ms linear, color 2000ms linear';

/** Capsule de verre flottante : chrono + commandes. C'est LE seul objet qui
 *  porte le temps — le verre lui-même se teinte, aucun indicateur ajouté. */
export function TimeCapsule({ amb, remaining, controls, compact = false, className = '' }: {
  amb: TimeAmbiance; remaining: number; controls?: ReactNode; compact?: boolean; className?: string;
}) {
  const veil = 0.05 + amb.intensity * 0.22;  // teinte du verre
  const edge = 0.16 + amb.intensity * 0.46;  // liseré spéculaire coloré
  const glow = 0.10 + amb.intensity * 0.32;  // ombre portée teintée = flottement

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{
        backdropFilter: 'blur(22px) saturate(180%)',
        WebkitBackdropFilter: 'blur(22px) saturate(180%)',
        border: `1px solid ${auraColor(amb, edge)}`,
        // Deux ombres : une teintée et lointaine (l'objet lévite au-dessus de la
        // page), une neutre et proche (le contact). Plus le temps passe, plus la
        // première se colore — le flottement devient tendu sans rien clignoter.
        boxShadow: `inset 0 1px 0 0 rgb(255 255 255 / 0.55),
                    0 20px 44px -24px ${auraColor(amb, glow)},
                    0 3px 12px -6px rgb(4 30 27 / 0.18)`,
        transition: DRIFT,
      }}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `linear-gradient(142deg, ${auraColor(amb, veil)} 0%, ${auraColor(amb, veil * 0.3)} 58%, ${auraColor(amb, veil * 0.75)} 100%)`,
          transition: DRIFT,
        }}
      />
      <div className={`relative flex items-center justify-between gap-4 ${compact ? 'px-3.5 py-2' : 'px-5 py-3.5'}`}>
        <TimeFace amb={amb} remaining={remaining} compact={compact} />
        {controls}
      </div>
    </div>
  );
}

/** Le cadran lui-même. Chiffres en Bricolage (la display de la marque) et non
 *  en mono : le mono lit « appareil de mesure », la display lit « objet soigné ».
 *  Le libellé passe en sans, casse normale — plus une étiquette d'instrument. */
export function TimeFace({ amb, remaining, compact = false }: { amb: TimeAmbiance; remaining: number; compact?: boolean }) {
  return (
    <div className="flex flex-col leading-none">
      <span
        className={`font-display font-semibold tabular-nums ${compact ? 'text-[1.6rem]' : 'text-[2.15rem]'}`}
        style={{ color: auraColor(amb), letterSpacing: '-0.03em', transition: DRIFT }}
      >
        {amb.overtime ? `+${fmt(Math.abs(remaining))}` : fmt(remaining)}
      </span>
      <span
        className={`mt-1 font-medium ${compact ? 'text-[11px]' : 'text-[12.5px]'}`}
        style={{ color: auraColor(amb, 0.72), transition: DRIFT }}
      >
        {amb.label}
      </span>
    </div>
  );
}
