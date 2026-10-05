// ============================================================================
// Le montage du cadran sur la carte de cas (S4-4). Le cadran lit `dialData`
// (INV-59) ; ce module n'y ajoute que « joué depuis ta dernière visite » — une
// comparaison de dates, pas une mesure — pour que l'arc d'un Teil joué se
// dessine UNE fois au retour sur la liste, et que l'anneau d'un cas devenu
// prêt se soude. La dernière visite vit sur l'appareil (par compte en mode
// fondateur) ; au premier passage elle est absente, donc rien ne s'anime.
// ============================================================================
import { useEffect, useState } from 'react';
import type { CaseProgress } from '@/db/types';
import { getActiveUserId } from '@/lib/auth/accounts';
import { now } from '@/lib/clock';
import { dialData, type CaseDialData } from '@/lib/dialData';
import { TEILE } from '@/lib/simScope';

const FOUNDER = import.meta.env.VITE_AUTH_MODE === 'founder';
const KEY = 'doctopus-cas-visite';
const cle = (): string => (FOUNDER ? `${KEY}:${getActiveUserId() ?? 'anon'}` : KEY);

/** L'instant (epoch ms) de la dernière visite de la liste, ou `null` au premier passage. */
export function derniereVisite(): number | null {
  try {
    const v = Number(localStorage.getItem(cle()));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch { return null; }
}

export function noteVisite(): void {
  try { localStorage.setItem(cle(), String(now())); } catch { /* stockage indisponible : la prochaine visite n'animera rien */ }
}

/** La visite d'AVANT celle-ci, lue une fois ; la visite en cours est notée en quittant la liste. */
export function useDerniereVisite(): number | null {
  const [avant] = useState(derniereVisite);
  useEffect(() => {
    window.addEventListener('pagehide', noteVisite);
    return () => { window.removeEventListener('pagehide', noteVisite); noteVisite(); };
  }, []);
  return avant;
}

export function dialDeCarte(cp: CaseProgress, visite: number | null): CaseDialData {
  const d = dialData(cp);
  if (visite === null) return d;
  const joues = TEILE.map((t) => t.key).filter((t) => (d.teile[t].lastAt ?? 0) > visite);
  return joues.length > 0 ? { ...d, vientDEtreJoue: joues } : d;
}

/** Le cas est devenu prêt depuis la dernière visite : l'anneau se soude, une fois. */
export const vientDeSouder = (d: CaseDialData, visite: number | null): boolean =>
  visite !== null && d.soude && d.pretAt !== null && d.pretAt > visite;
