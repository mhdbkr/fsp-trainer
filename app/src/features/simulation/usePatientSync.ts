import { useEffect, useRef, useState } from 'react';

// ============================================================================
// Synchro fiche patient (100 % local, sans cloud).
// - Même appareil (2ᵉ fenêtre/onglet) : BroadcastChannel → suivi live du cas.
// - Autre appareil (smartphone même Wi-Fi) : QR vers l'URL LAN #/patient/:id.
//   (Le suivi cross-device auto nécessiterait un broker ; ici on ouvre la
//    bonne fiche via QR, la fenêtre locale suit en live.)
// ============================================================================

const CHANNEL = 'fsp-patient-sync';

/** Côté simulation : émet le cas actif vers d'éventuelles fenêtres patient. */
export function usePatientBroadcast(caseId: string | undefined) {
  const ref = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(CHANNEL);
    ref.current = ch;
    return () => ch.close();
  }, []);
  useEffect(() => {
    if (caseId && ref.current) ref.current.postMessage({ type: 'active-case', caseId });
  }, [caseId]);
}

/** Côté fenêtre patient : suit le cas actif diffusé (même appareil). */
export function usePatientFollow(initial?: string) {
  const [caseId, setCaseId] = useState<string | undefined>(initial);
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = (e) => {
      if (e.data?.type === 'active-case' && e.data.caseId) setCaseId(e.data.caseId);
    };
    // demande l'état courant à la fenêtre simulation
    ch.postMessage({ type: 'request-active' });
    return () => ch.close();
  }, []);
  return caseId;
}

/** URL de la fiche patient (pour le QR). Prend la racine réelle de l'app (tout
 *  ce qui précède le #), ce qui fonctionne aussi bien en local qu'hébergé sur
 *  un sous-chemin (ex. GitHub Pages : user.github.io/repo/). */
export function patientUrl(caseId: string): string {
  const base = window.location.href.split('#')[0];
  return `${base}#/patient/${caseId}`;
}
