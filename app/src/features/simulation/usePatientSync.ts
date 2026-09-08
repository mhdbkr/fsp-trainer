import { useEffect, useRef, useState } from 'react';
import { useSimSession } from '@/store/simSession';

// ============================================================================
// Synchro fiche patient (100 % local, sans cloud).
// - Même appareil (2ᵉ fenêtre/onglet) : BroadcastChannel → suivi live du cas
//   ET du chapitre d'anamnèse que le candidat interroge (Rollenskript aligné).
// - Autre appareil (smartphone) : QR vers l'URL publique #/patient/:id.
// ============================================================================

const CHANNEL = 'fsp-patient-sync';

/** Côté simulation : émet le cas actif + le chapitre de guide en cours vers
 *  d'éventuelles fenêtres « rôle patient ». Répond aussi aux demandes d'état. */
export function usePatientBroadcast(caseId: string | undefined) {
  const ref = useRef<BroadcastChannel | null>(null);
  const guideChapter = useSimSession((s) => s.guideChapter);
  const guideProbe = useSimSession((s) => s.guideProbe);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(CHANNEL);
    ref.current = ch;
    // Une fenêtre patient demande l'état courant → on renvoie cas + chapitre.
    ch.onmessage = (e) => {
      if (e.data?.type === 'request-active') {
        const st = useSimSession.getState();
        if (caseId) ch.postMessage({ type: 'active-case', caseId });
        if (st.guideChapter) ch.postMessage({ type: 'guide-chapter', chapterId: st.guideChapter.chapterId });
        ch.postMessage({ type: 'guide-probe', probeId: st.guideProbe });
      }
    };
    return () => ch.close();
  }, [caseId]);

  useEffect(() => {
    if (caseId && ref.current) ref.current.postMessage({ type: 'active-case', caseId });
  }, [caseId]);

  // Le candidat avance dans le guide → on diffuse le chapitre (suivi live).
  useEffect(() => {
    if (guideChapter && ref.current) ref.current.postMessage({ type: 'guide-chapter', chapterId: guideChapter.chapterId });
  }, [guideChapter]);
  // La QUESTION précise que le candidat pose → le simulant voit LA ligne, pas
  // seulement le chapitre (c'est ce qui dit aux deux « où on en est »).
  useEffect(() => {
    if (ref.current) ref.current.postMessage({ type: 'guide-probe', probeId: guideProbe });
  }, [guideProbe]);
}

/** Côté fenêtre patient : suit la SONDE (question) que le candidat pose. */
export function useProbeFollow(): string | null {
  const [probeId, setProbeId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = (e) => {
      if (e.data?.type === 'guide-probe') setProbeId(e.data.probeId ?? null);
    };
    ch.postMessage({ type: 'request-active' });
    return () => ch.close();
  }, []);
  return probeId;
}

/** Côté fenêtre patient : suit le cas actif diffusé (même appareil). */
export function usePatientFollow(initial?: string) {
  const [caseId, setCaseId] = useState<string | undefined>(initial);
  // Si le paramètre de route change (navigation directe entre cas), on suit.
  useEffect(() => { if (initial) setCaseId(initial); }, [initial]);
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

/** Côté fenêtre patient : suit le CHAPITRE d'anamnèse que le candidat interroge. */
export function useChapterFollow(): string | null {
  const [chapterId, setChapterId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') return;
    const ch = new BroadcastChannel(CHANNEL);
    ch.onmessage = (e) => {
      if (e.data?.type === 'guide-chapter' && e.data.chapterId) setChapterId(e.data.chapterId);
    };
    ch.postMessage({ type: 'request-active' });
    return () => ch.close();
  }, []);
  return chapterId;
}

// URL publique de l'app en ligne (GitHub Pages). Surchargeable au build via
// VITE_PUBLIC_URL. Sert de cible aux QR codes quand on développe en local, pour
// qu'un smartphone puisse ouvrir la fiche SANS être sur le même réseau.
export const PUBLIC_APP_URL =
  ((import.meta as { env?: Record<string, string> }).env?.VITE_PUBLIC_URL || '').trim() ||
  'https://mhdbkr.github.io/fsp-trainer/';

/** URL de la fiche patient pour le QR. Si l'app tourne en local (localhost / IP
 *  LAN), on pointe vers l'URL PUBLIQUE en ligne — ainsi le QR est scannable
 *  depuis n'importe quel téléphone connecté à Internet. Si l'app est déjà servie
 *  en ligne, on réutilise sa propre racine (fonctionne sur sous-chemin Pages). */
export function patientUrl(caseId: string): string {
  const { hostname, href } = window.location;
  const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[?::1\]?|\d{1,3}(\.\d{1,3}){3})$/.test(hostname);
  const base = (isLocal ? PUBLIC_APP_URL : href.split('#')[0]).replace(/#.*$/, '').replace(/\/?$/, '/');
  return `${base}#/patient/${caseId}`;
}

/** Vrai si le QR pointe vers l'URL en ligne (app lancée en local). */
export function patientUrlIsOnline(): boolean {
  return /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[?::1\]?|\d{1,3}(\.\d{1,3}){3})$/.test(window.location.hostname);
}

/** URL LOCALE de la fiche patient — pour la 2ᵉ fenêtre sur le MÊME appareil :
 *  même origine (suivi live BroadcastChannel) et toujours la version courante
 *  de l'app (jamais une vieille version déployée). */
export function localPatientUrl(caseId: string): string {
  return `${window.location.href.split('#')[0]}#/patient/${caseId}`;
}
