import { useCallback, useEffect, useRef, useState } from 'react';
import type { Case, SimTeil } from '@/db/types';
import { checklistFor } from '@/lib/checklists';
import { isTeil } from '@/lib/simScope';
import { getActiveUserId } from '@/lib/auth/accounts';
import { useUi } from '@/store/ui';
import { snapshotAusLauf, useSimSession } from '@/store/simSession';
import {
  DREI_TEILE, aktualisiereTeil, bewerte, erstelleLauf, nimmWiederAuf, setzeChecklistItem, setzeEntwurf,
  stempleTeilBeginn, teilDesItems, tickChrono, transition, type LaufAktion,
} from '@/lib/lauf/automat';
import { now } from '@/lib/clock';
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
  /** [S4-7] Le début d'un Teil d'examen, posé une fois (simulation-run.md §11.1). Sans effet hors examen. */
  stempleTeil: (teil: SimTeil, at: number) => void;
  /** [S4-7] Abandon (décision 3) : la règle de `gibAuf` — écrit après un Teil joué, rien avant. La persistance en vol
   *  s'arrête AVANT l'écriture : aucune ne peut recréer `lauf.aktiv` derrière elle. */
  aufgeben: () => Promise<void>;
}

/** [S4-7] Le mode de la partie : un examen (simulation-run.md §11) ou l'entraînement. */
export interface LaufOptionen { examen?: boolean }

/** [S4] Le départ lu dans l'URL : `?depart=`, ou l'ancien `?teil=` lu de même (§10.3). Jamais un périmètre. */
export const departDe = (p: URLSearchParams): SimTeil | null => {
  const t = p.get('depart') ?? p.get('teil');
  return isTeil(t) ? (t as SimTeil) : null;
};

/** `depart` (`?depart=`, ou l'ancien `?teil=`) : le Teil par lequel une partie NEUVE commence.
 *  Jamais un périmètre (INV-70) : toute partie neuve planifie les trois Teile. */
export function useLauf(c: Case | undefined, depart: SimTeil | null, taskId?: string, optionen?: LaufOptionen): LaufSteuerung {
  const examen = optionen?.examen === true;
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
  // Le départ est lu UNE fois, à la création, et n'entre pas dans les dépendances
  // de l'effet (§10.3) : un changement de `?depart=` ne recrée ni ne reprend le Lauf.
  const departRef = useRef(depart);
  departRef.current = depart;

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
      // Reprise à l'identique, `zustand` compris — dès que le CAS correspond.
      // [S4] Il n'y a plus qu'une entrée : le « mode » (complète / un Teil) ne
      // départage plus rien, et un `lauf.aktiv` série 3 en `teil` se reprend tel
      // quel jusqu'à son écriture (§3.1). C'est la SEULE branche de reprise —
      // barre « Reprendre », rechargement, retour sur le runner — donc le seul
      // appel de `nimmWiederAuf` (m7, INV-73).
      // [S4-7] Le même cas ET le même mode (§11.4, INV-E11) : un examen n'est jamais repris par l'entraînement, ni
      // l'inverse — il est abandonné selon la règle ci-dessous.
      if (alt && alt.caseId === c.id && !!alt.examen === examen) {
        setLauf(nimmWiederAuf(alt, now()));
        setLaedt(false);
        return;
      }
      // Une autre partie traînait : elle est ÉCRITE si une partie y a été
      // jouée, jamais jetée (§3.1) — c'était un `verwerfeAktivenLauf()` muet.
      if (alt) await gibAuf(alt);
      // [S4] ENTRÉE UNIQUE (INV-70) : `erstelleLauf` planifie les trois Teile, en
      // `komplett`. Le départ ne choisit que le Teil de `demarrer`.
      const frisch = erstelleLauf({
        caseId: c.id, caseName: c.name,
        // Le compte actif, ou RIEN (M2) : « local » partait au serveur. Le
        // seul repli vit dans `saveSimulation`.
        profileId: getActiveUserId() ?? undefined,
        ...(taskId ? { taskId } : {}),                         // R-C4
        ...(examen ? { examen: true as const } : {}),          // [S4-7] Autonome, couche 3 (§11.1)
        assistance: reglage.current.assistance,
        layer: reglage.current.layer,
        muster: reglage.current.muster,
      });
      if (annule) return;
      setLauf(transition(frisch, { typ: 'demarrer', teil: departRef.current ?? undefined, checkliste: DREI_TEILE.flatMap(MODELL) }));
      setLaedt(false);
    })();
    return () => { annule = true; };
  }, [c?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Toute transition voulue efface l'alerte d'échec (item 5) : elle concerne
  // l'écran où l'on a cliqué « Enregistrer », pas le bilan où l'on revient.
  const dispatch = useCallback((a: LaufAktion) => {
    setFehler(null);
    setLauf((l) => (l ? transition(l, a) : l));
  }, []);

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
    // Le Teil de l'ITEM, pas le Teil courant : à la checklist de fin de l'Examen (`aktuellerTeil` nul), cocher doit
    // aussi mettre à jour le score du Teil concerné.
    const t = teilDesItems(id) ?? l.aktuellerTeil;
    return t ? aktualisiereTeil(next, t) : next;
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
      // Message HUMAIN à l'écran ; le détail technique va en console (item 6).
      console.error('[lauf] enregistrement échoué', e);
      setFehler("L'enregistrement a échoué. Rien n'est perdu : réessaie.");
      return null;
    }
  }, [lauf, c]);

  const stempleTeil = useCallback((t: SimTeil, at: number) =>
    setLauf((l) => (l ? stempleTeilBeginn(l, t, at) : l)), []);

  const aufgeben = useCallback(async () => {
    const l = lauf;
    if (!l) return;
    setLauf(null);
    await gibAuf(l);
    await useSimSession.getState().end();
  }, [lauf]);

  return { lauf, laedt, fehler, dispatch, terminerPartie, aufklaerungOeffnen, setzeFeld, setzeEntwurfFeld, setzeItem, tick, versChecklist, zurueckZumBilanz, arztbriefSchreiben, beenden, stempleTeil, aufgeben };
}
