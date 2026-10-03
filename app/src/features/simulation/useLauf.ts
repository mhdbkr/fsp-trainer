import { useCallback, useEffect, useRef, useState } from 'react';
import type { Case, SimTeil } from '@/db/types';
import { checklistFor } from '@/lib/checklists';
import { getActiveUserId } from '@/lib/auth/accounts';
import { useUi } from '@/store/ui';
import { snapshotAusLauf, useSimSession } from '@/store/simSession';
import {
  aktualisiereTeil, bewerte, erstelleLauf, setzeChecklistItem, setzeEntwurf,
  tickChrono, transition, type LaufAktion,
} from '@/lib/lauf/automat';
import {
  bereinigeAltenLauf, gibAuf, retteAktivenLauf, speichereAktivenLauf, speichern,
} from '@/lib/lauf/speichern';
import type { Lauf, LaufTeil, TeilEntwurf } from '@/lib/lauf/types';

// ============================================================================
// Le point d'entrée unique du runner sur l'automate. Un seul état React — le
// `Lauf` — et une seule façon de le faire bouger : `dispatch`.
//
// Ce qu'il remplace : huit `useState` locaux au runner (`active`, `phase`,
// `bogen`, `arztbriefText`, `results`, `aufklaerungOpen`, `elapsed`,
// `finished`), dont aucun n'était l'état de la partie — d'où une navigation
// faite de conditions locales, et « Valider » qui réaffichait l'exercice fini.
//
// Persistance : à CHAQUE changement, dans Dexie (`db.meta['lauf.aktiv']`).
// La barre « Reprendre » (`components/ResumeSessionBar.tsx`) lit le store
// `simSession`, réveillé depuis `lauf.aktiv` (`hydriereAusLauf`) ; ce hook
// l'alimente en direct par la même projection (`snapshotAusLauf`).
// ============================================================================

const MODELL = (teil: LaufTeil) => checklistFor(teil);

export interface LaufSteuerung {
  lauf: Lauf | null;
  /** `true` tant qu'on ne sait pas s'il y a une partie à reprendre. */
  laedt: boolean;
  /** Dernier échec d'enregistrement — l'écran le dit et permet de réessayer. */
  fehler: string | null;
  dispatch: (a: LaufAktion) => void;
  /** « Terminer la partie » : l'évaluation est dérivée des champs du Lauf. */
  terminerPartie: () => void;
  aufklaerungOeffnen: () => void;
  setzeFeld: (patch: Partial<Pick<Lauf, 'bogen' | 'arztbriefText' | 'notes'>>) => void;
  setzeEntwurfFeld: (teil: LaufTeil, patch: Partial<TeilEntwurf>) => void;
  setzeItem: (id: string, checked: boolean) => void;
  tick: (teil: LaufTeil, sekunden: number) => void;
  /** bilanz → checkliste. La seule sortie de fin de partie (règle 8 amendée). */
  versChecklist: () => void;
  /** checkliste → bilanz de la dernière partie (décision 8 de `main`). */
  zurueckZumBilanz: () => void;
  /** checkliste → arztbrief — facultatif (Q5). */
  arztbriefSchreiben: () => void;
  /** checkliste|arztbrief → gespeichert, puis écriture idempotente. Rend l'id
   *  de la simulation enregistrée, ou `null` si l'automate refuse. */
  beenden: () => Promise<string | null>;
}

export function useLauf(c: Case | undefined, teil: SimTeil | null): LaufSteuerung {
  const [lauf, setLauf] = useState<Lauf | null>(null);
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);
  const assistance = useUi((s) => s.assistance);
  const layer = useUi((s) => s.layer);
  const muster = useUi((s) => s.muster);
  // Les réglages ne servent qu'à la CRÉATION : une partie déjà commencée garde
  // les siens. Sans cette ref, changer de couche dans un autre onglet
  // réécrirait le Lauf en cours.
  const reglage = useRef({ assistance, layer, muster });
  reglage.current = { assistance, layer, muster };

  // ---- Reprise ou création ------------------------------------------------
  useEffect(() => {
    if (!c) return;
    let annule = false;
    (async () => {
      // Rien de ce qui précède la création ne doit pouvoir bloquer le runner :
      // un échec ici laissait `laedt` à `true` — « Chargement… » à vie, sur
      // tous les cas. On écarte le Lauf fautif et on continue.
      let alt: Lauf | null = null;
      try { alt = await bereinigeAltenLauf(); } catch (e) {
        // On tente d'ÉCRIRE la partie jouée avant d'écarter (re-revue 2) :
        // `retteAktivenLauf` ne lève jamais.
        console.warn('[lauf] reprise impossible, sauvetage puis écart', e);
        await retteAktivenLauf();
      }
      if (annule) return;
      // Reprise à l'identique, `zustand` compris — seulement si le cas ET le
      // mode correspondent EXACTEMENT. Avant, `!teil` acceptait n'importe quel
      // Lauf du cas : ouvrir la simulation complète reprenait un Teil seul.
      if (alt && alt.caseId === c.id && (teil
        ? alt.modus === 'teil' && alt.geplanteTeile[0] === teil
        : alt.modus === 'komplett')) {
        setLauf(alt);
        setLaedt(false);
        return;
      }
      // Une autre partie traînait : elle est ÉCRITE si une partie y a été
      // jouée, jamais jetée (§3.1) — c'était un `verwerfeAktivenLauf()` muet.
      if (alt) await gibAuf(alt);
      const geplant: SimTeil[] = teil ? [teil] : ['anamnese', 'dokumentation', 'fallvorstellung'];
      const frisch = erstelleLauf({
        caseId: c.id, caseName: c.name,
        // Le compte actif, ou RIEN (M2) : « local » partait au serveur. Le
        // seul repli vit dans `saveSimulation`.
        profileId: getActiveUserId() ?? undefined,
        geplanteTeile: geplant,
        modus: teil ? 'teil' : 'komplett',
        assistance: reglage.current.assistance,
        layer: reglage.current.layer,
        muster: reglage.current.muster,
      });
      if (annule) return;
      setLauf(transition(frisch, { typ: 'demarrer', checkliste: geplant.flatMap(MODELL) }));
      setLaedt(false);
    })();
    return () => { annule = true; };
  }, [c?.id, teil]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Pause / reprise de la barre « Reprendre » ----------------------------
  // Quitter le runner met la partie EN PAUSE : la barre la propose ailleurs dans
  // l'app. Ce couple avait disparu avec les `useState` du runner — la barre
  // n'apparaissait plus qu'après un rechargement. `minimize()` est sans effet
  // quand la partie est terminée (`end()` a vidé le snapshot).
  useEffect(() => {
    useSimSession.getState().resume();
    return () => { useSimSession.getState().minimize(); };
  }, []);

  // ---- Persistance à chaque changement ------------------------------------
  useEffect(() => {
    if (!lauf || lauf.zustand === 'gespeichert') return;
    void speichereAktivenLauf(lauf);
    // Miroir pour la barre « Reprendre » — la même projection qu'au réveil.
    useSimSession.getState().sync(snapshotAusLauf(lauf));
  }, [lauf]);

  const dispatch = useCallback((a: LaufAktion) => setLauf((l) => (l ? transition(l, a) : l)), []);

  const terminerPartie = useCallback(() => setLauf((l) => {
    if (!l || !l.aktuellerTeil) return l;
    return transition(l, { typ: 'terminerPartie', ergebnis: bewerte(l, l.aktuellerTeil) });
  }), []);

  const aufklaerungOeffnen = useCallback(() => setLauf((l) =>
    l ? transition(l, { typ: 'aufklaerungOeffnen', checkliste: MODELL('aufklaerung') }) : l), []);

  const setzeFeld = useCallback((patch: Partial<Pick<Lauf, 'bogen' | 'arztbriefText' | 'notes'>>) =>
    setLauf((l) => (l ? { ...l, ...patch } : l)), []);

  const setzeEntwurfFeld = useCallback((t: LaufTeil, patch: Partial<TeilEntwurf>) =>
    setLauf((l) => (l ? aktualisiereTeil(setzeEntwurf(l, t, patch), t) : l)), []);

  // Cocher un chapitre dans le guide coche l'item de checklist du Lauf : le
  // travail fait pendant la partie n'est plus perdu au moment du bilan (INV-24).
  const setzeItem = useCallback((id: string, checked: boolean) => setLauf((l) => {
    if (!l) return l;
    const next = setzeChecklistItem(l, id, checked);
    return l.aktuellerTeil ? aktualisiereTeil(next, l.aktuellerTeil) : next;
  }), []);

  const tick = useCallback((t: LaufTeil, s: number) =>
    setLauf((l) => (l ? tickChrono(l, t, s) : l)), []);

  const versChecklist = useCallback(() => dispatch({ typ: 'versChecklist' }), [dispatch]);
  const zurueckZumBilanz = useCallback(() => dispatch({ typ: 'zurueckZumBilanz' }), [dispatch]);
  const arztbriefSchreiben = useCallback(() => dispatch({ typ: 'arztbriefSchreiben' }), [dispatch]);

  // La fin passe par l'AUTOMATE, jamais à côté : `speichern` n'est accepté que
  // depuis `checkliste` ou `arztbrief`. Avant, `beenden()` écrivait depuis
  // `laufend` alors que la transition était refusée — la simulation était
  // enregistrée, le Lauf restait `laufend`, et le tick suivant du chrono
  // recréait `lauf.aktiv` avec l'id d'une simulation déjà écrite.
  const beenden = useCallback(async () => {
    const l = lauf;
    if (!l || !c) return null;
    const fertig = transition(l, { typ: 'speichern' });
    if (fertig === l) return null;           // refusé par l'automate : rien n'est écrit
    // `gespeichert` d'abord dans l'état React : la persistance en vol s'arrête
    // AVANT l'écriture, aucune ne peut la doubler.
    setLauf(fertig);
    setFehler(null);
    // Idempotente sur `lauf.id` : un second clic ne crée ni une seconde ligne
    // ni un second événement (INV-22).
    try {
      const sim = await speichern(fertig, c);
      void useSimSession.getState().end();
      return sim.id;
    } catch (e) {
      // L'écriture n'a PAS eu lieu : on rend le Lauf d'avant (ce n'est pas une
      // transition, c'est l'annulation d'un `speichern` qui n'a pas abouti) et
      // on le dit. Avant : écran figé sur « Enregistrement… » (mineur 9).
      setLauf(l);
      setFehler(e instanceof Error ? e.message : String(e));
      return null;
    }
  }, [lauf, c]);

  return { lauf, laedt, fehler, dispatch, terminerPartie, aufklaerungOeffnen, setzeFeld, setzeEntwurfFeld, setzeItem, tick, versChecklist, zurueckZumBilanz, arztbriefSchreiben, beenden };
}
