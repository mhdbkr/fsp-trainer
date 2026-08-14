import { createContext, useContext } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { fmt } from './useTimer';
import { auraColor, computeAmbiance, type TimeAmbiance } from './timeAmbiance';

/** Le chrono est produit par SimulationRunner mais consommé jusque dans le mode
 *  focus : un contexte évite de faire transiter les props à travers des
 *  composants qui n'ont rien à voir avec le temps. */
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

/** Verre teinté par le temps, partagé par les DEUX étiquettes de l'en-tête.
 *  `strength` dose la présence de la teinte : l'étiquette titre en reçoit une
 *  version atténuée pour rester un fond, pas un signal — seul le chrono porte
 *  la couleur à pleine force. */
export function timeGlass(amb: TimeAmbiance, strength = 1): CSSProperties {
  const veil = (0.05 + amb.intensity * 0.20) * strength;
  const edge = (0.16 + amb.intensity * 0.46) * strength;
  const glow = (0.10 + amb.intensity * 0.32) * strength;
  const side = auraColor(amb, Math.max(edge, 0.08));
  return {
    // Vrai verre = BEAUCOUP de flou et PEU d'opacité. L'inverse (peu de flou,
    // surface opaque) donne du plastique dépoli. On dissout donc le texte de la
    // page par un flou large plutôt qu'en masquant, et `saturate` fait ressortir
    // les couleurs qui transparaissent — c'est ce qui donne la matière.
    backdropFilter: 'blur(30px) saturate(185%)',
    WebkitBackdropFilter: 'blur(30px) saturate(185%)',
    backgroundColor: 'rgb(var(--glass-base))',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: side,
    backgroundImage: `linear-gradient(142deg, ${auraColor(amb, veil)} 0%, ${auraColor(amb, veil * 0.25)} 55%, ${auraColor(amb, veil * 0.7)} 100%)`,
    boxShadow: [
      'inset 0 1px 0 0 rgb(255 255 255 / 0.55)',
      `0 20px 44px -24px ${auraColor(amb, glow)}`,
      '0 3px 12px -6px rgb(4 30 27 / 0.18)',
    ].join(', '),
    transition: DRIFT,
  };
}

/** Le cadran. Chiffres en Bricolage (display de la marque) et non en mono : le
 *  mono lit « appareil de mesure », la display lit « objet soigné ». */
export function TimeFace({ amb, remaining, size = 'md' }: { amb: TimeAmbiance; remaining: number; size?: 'md' | 'sm' | 'xl' }) {
  const digits = size === 'xl' ? 'text-[2.6rem]' : size === 'sm' ? 'text-[1.3rem]' : 'text-[1.6rem]';
  const label = size === 'sm' ? 'text-[10.5px]' : 'text-[11.5px]';
  return (
    <div className="flex flex-col leading-none">
      <span className={`font-display font-semibold tabular-nums ${digits}`}
        style={{ color: auraColor(amb), letterSpacing: '-0.03em', transition: DRIFT }}>
        {amb.overtime ? `+${fmt(Math.abs(remaining))}` : fmt(remaining)}
      </span>
      <span className={`mt-0.5 font-medium ${label}`} style={{ color: auraColor(amb, 0.72), transition: DRIFT }}>
        {amb.label}
      </span>
    </div>
  );
}

/** Mode focus : AUCUN cadre. Les chiffres flottent, posés sur une nappe de
 *  couleur très large et très diluée — l'information de temps devient une
 *  ambiance de pièce plutôt qu'un objet d'interface. Le dégradé est étalé sur
 *  une grande surface justement pour qu'aucun bord ne soit perceptible. */
export function FocusTimeAura({ amb, remaining }: { amb: TimeAmbiance; remaining: number }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[92] flex justify-center">
      {/* Nappe : 3 arrêts très rapprochés en opacité pour une extinction sans
          aucune bande visible (un dégradé à 2 arrêts « casse » toujours). */}
      <div
        aria-hidden
        className="absolute left-1/2 top-0 -translate-x-1/2"
        style={{
          width: 'min(1400px, 130vw)',
          height: '460px',
          background: `radial-gradient(60% 78% at 50% 0%,
            ${auraColor(amb, 0.20 * amb.intensity + 0.05)} 0%,
            ${auraColor(amb, 0.11 * amb.intensity + 0.02)} 34%,
            ${auraColor(amb, 0.04 * amb.intensity)} 62%,
            transparent 100%)`,
          filter: 'blur(26px)',
          transition: 'background 2000ms linear',
        }}
      />
      <div className="relative mt-3 flex flex-col items-center leading-none">
        <span className="font-display text-[2.4rem] font-semibold tabular-nums"
          style={{ color: auraColor(amb), letterSpacing: '-0.03em', transition: DRIFT }}>
          {amb.overtime ? `+${fmt(Math.abs(remaining))}` : fmt(remaining)}
        </span>
        <span className="mt-1 text-[11.5px] font-medium" style={{ color: auraColor(amb, 0.7), transition: DRIFT }}>
          {amb.label}
        </span>
      </div>
    </div>
  );
}
