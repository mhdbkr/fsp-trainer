import type {
  AssistanceMode, ChecklistItem, Layer, MusterCity, PartResult, SimTeil, SimulationMode,
} from '@/db/types';
import { checklistPct, emptyLanguageGrid, languagePct } from '@/lib/scoring';
import { ZUSTAENDE, type Lauf, type LaufTeil, type LaufZustand, type TeilEntwurf } from './types';

// ============================================================================
// L'automate d'une partie de simulation. Contrat §2, ADR-0018.
//
// Une seule fonction de transition, un ordre total sur les états, et TROIS
// exceptions nommées (la troisième, `zurueckZumBilanz` — checkliste → bilanz —,
// est une décision de `main` à la re-revue) :
//   · `partieSuivante` — bilanz(t) → laufend(t+1) : une PROGRESSION dans le run,
//     sans laquelle l'automate ne peut pas jouer trois Teile ;
//   · `zurueckZurPartie` — bilanz(t) → laufend(t) : la SEULE régression, et elle
//     est un geste explicite, jamais un effet de bord.
//
// Ce que ce module remplace : `SimulationRunner.tsx:184-191` (`savePart`), où
// « Valider » retombait en `setPhase('play')` et, quand `flow.length === 1`,
// réaffichait l'exercice qu'on venait de terminer. Il n'y a plus de branche qui
// ne fasse rien : `terminerPartie` n'a qu'une destination.
//
// RÈGLE 8 AMENDÉE (décision de `main`, 30 sept. 2026 — le contrat §2.1 disait
// « visible dans `bilanz` comme dans `laufend` », ce qui contredisait son propre
// diagramme) : on ne quitte PAS une partie en cours d'un seul clic. Pendant
// `laufend`, l'en-tête n'offre que « Terminer la partie ». « Terminer la
// simulation » n'existe qu'en `bilanz` et passe toujours par ici :
//   bilanz → versChecklist → checkliste → [arztbriefSchreiben → arztbrief]
//          → speichern → gespeichert.
// `speichern` hors de `checkliste`/`arztbrief` est refusé, et l'appelant
// (`useLauf.beenden`) n'écrit RIEN quand il est refusé.
// ============================================================================

const PREFIX: Record<LaufTeil, string> = {
  anamnese: 'anam-', dokumentation: 'doku-', fallvorstellung: 'fall-', aufklaerung: 'aufk-',
};

export function zustandIndex(z: LaufZustand): number {
  return ZUSTAENDE.indexOf(z);
}

function uuid(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  // Repli (jsdom ancien, contexte non sécurisé) — même forme, même unicité utile.
  return 'lauf-xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export interface LaufEingabe {
  caseId: string;
  caseName?: string;
  profileId?: string;
  geplanteTeile: SimTeil[];
  modus?: 'komplett' | 'teil';
  assistance: AssistanceMode;
  layer: Layer;
  muster?: MusterCity;
  mode?: SimulationMode;
  taskId?: string;
}

/** Crée un `Lauf` en `vorbereitung`. L'`id` est posé ICI, une seule fois : il
 *  est la clé d'idempotence de l'écriture finale (§3.2, INV-22). */
export function erstelleLauf(i: LaufEingabe): Lauf {
  // Validation de frontière : un `profileId` fourni n'est jamais vide (§6,
  // INV-26). ABSENT est permis — pas de compte actif (décision `main`, M2) :
  // mieux vaut « non attribué » que « local », qui partirait au serveur.
  if (i.profileId === '') throw new Error('Lauf: profileId vide (contrat §6, INV-26)');
  if (!i.geplanteTeile.length) throw new Error('Lauf: geplanteTeile ne peut pas être vide');
  return {
    id: uuid(),
    caseId: i.caseId,
    caseName: i.caseName ?? '',
    profileId: i.profileId,
    modus: i.modus ?? (i.geplanteTeile.length === 3 ? 'komplett' : 'teil'),
    geplanteTeile: [...i.geplanteTeile],
    zustand: 'vorbereitung',
    aktuellerTeil: null,
    teilVorAufklaerung: null,
    startedAt: Date.now(),
    teileGespielt: [],
    teile: {},
    checkliste: [],
    sekundenProTeil: {},
    entwurf: {},
    notes: {},
    bogen: {},
    arztbriefText: '',
    assistance: i.assistance,
    layer: i.layer,
    muster: i.muster,
    mode: i.mode ?? 'texte',
    taskId: i.taskId,
  };
}

// ---------------------------------------------------------------- Lectures

/** Le prochain Teil PLANIFIÉ non encore joué, dans l'ordre déclaré. */
export function naechsterTeil(lauf: Lauf): SimTeil | null {
  return lauf.geplanteTeile.find((t) => !lauf.teileGespielt.includes(t)) ?? null;
}

/** La portée jouée est un FAIT, jamais l'intention (§5, INV-25).
 *  `simScope.ts:19-23` répondait `true` dès `scope === 'full'`, AVANT de
 *  compter les parties : un run abandonné après une partie passait pour
 *  « simulation complète ». */
export function istVollstaendig(lauf: Lauf): boolean {
  return lauf.geplanteTeile.length === 3
    && lauf.geplanteTeile.every((t) => lauf.teileGespielt.includes(t));
}

export function checklisteFuer(lauf: Lauf, teil: LaufTeil): ChecklistItem[] {
  return lauf.checkliste.filter((i) => i.id.startsWith(PREFIX[teil]));
}

/** Dérivation, pas un second stockage : le Lauf ne garde que les secondes. */
export function minutenProTeil(lauf: Lauf): Partial<Record<LaufTeil, number>> {
  const out: Partial<Record<LaufTeil, number>> = {};
  for (const [t, s] of Object.entries(lauf.sekundenProTeil)) {
    if (typeof s === 'number') out[t as LaufTeil] = Math.round(s / 60);
  }
  return out;
}

// -------------------------------------------------- Écritures de champs
// Ce ne sont pas des transitions : elles ne touchent jamais `zustand`.

/** Coche un item de la checklist PORTÉE PAR LE LAUF. C'est le pont d'
 *  `AnamneseGuide` (INV-24) : cocher un chapitre pendant la partie doit se
 *  retrouver dans la checklist de fin, qui était reconstruite à neuf. */
export function setzeChecklistItem(lauf: Lauf, id: string, checked: boolean): Lauf {
  const i = lauf.checkliste.findIndex((it) => it.id === id);
  if (i < 0 || lauf.checkliste[i].checked === checked) return lauf;
  const checkliste = [...lauf.checkliste];
  checkliste[i] = { ...checkliste[i], checked };
  return { ...lauf, checkliste };
}

export function setzeEntwurf(lauf: Lauf, teil: LaufTeil, patch: Partial<TeilEntwurf>): Lauf {
  const vorher = lauf.entwurf[teil] ?? { grid: emptyLanguageGrid(), feeling: 50, hinweise: 0 };
  return { ...lauf, entwurf: { ...lauf.entwurf, [teil]: { ...vorher, ...patch } } };
}

/** Pose le chrono d'un Teil. MONOTONE : une valeur inférieure à celle déjà
 *  enregistrée est ignorée (INV-28). C'est ce qui rend inoffensif un chrono
 *  remonté à zéro par un remontage de composant — la cause de
 *  « on m'a remis au début » (`useTimer.ts:13-20` relancé par `:438`). */
export function tickChrono(lauf: Lauf, teil: LaufTeil, sekunden: number): Lauf {
  const vorher = lauf.sekundenProTeil[teil] ?? 0;
  if (sekunden <= vorher) return lauf;
  return { ...lauf, sekundenProTeil: { ...lauf.sekundenProTeil, [teil]: sekunden } };
}

/** La Dokumentation n'a pas de grille orale (`PartEvaluation.tsx:17`). */
export const hatSprachgitter = (teil: LaufTeil): boolean => teil !== 'dokumentation';

/** Le résultat d'un Teil, DÉRIVÉ des champs du Lauf — jamais d'un état local.
 *  C'est ce qui remplace le `useState(checklistFor(part))` de
 *  `PartEvaluation.tsx:16`, qui repartait de `checked: false` en dur et perdait
 *  tout ce qui avait été coché pendant la partie. */
export function bewerte(lauf: Lauf, teil: LaufTeil): PartResult {
  const e = lauf.entwurf[teil];
  const checklist = checklisteFuer(lauf, teil);
  const grid = hatSprachgitter(teil) ? (e?.grid ?? emptyLanguageGrid()) : undefined;
  return {
    done: true,
    durationSec: lauf.sekundenProTeil[teil] ?? 0,
    checklist,
    languageGrid: grid,
    feeling: e?.feeling ?? 50,
    contentPct: checklistPct(checklist),
    officialPct: grid ? languagePct(grid) : 0,
    assistanceUsed: lauf.assistance,
  };
}

/** Recalcule `teile[teil]` depuis les champs, pendant le bilan. Ce n'est pas
 *  une transition : `zustand` n'est pas touché. */
export function aktualisiereTeil(lauf: Lauf, teil: LaufTeil): Lauf {
  const vorher = lauf.teile[teil];
  if (!vorher?.done) return lauf;
  const r = bewerte(lauf, teil);
  return {
    ...lauf,
    teile: {
      ...lauf.teile,
      [teil]: {
        ...vorher,
        languageGrid: r.languageGrid,
        feeling: r.feeling,
        contentPct: r.contentPct,
        officialPct: r.officialPct,
        hints: lauf.entwurf[teil]?.hinweise ?? vorher.hints,
      },
    },
  };
}

// -------------------------------------------------------------- Transitions

export type LaufAktion =
  | { typ: 'demarrer'; teil?: LaufTeil; checkliste: ChecklistItem[] }
  | { typ: 'aufklaerungOeffnen'; checkliste: ChecklistItem[] }
  | { typ: 'terminerPartie'; ergebnis: PartResult }
  | { typ: 'partieSuivante' }
  | { typ: 'versChecklist' }
  | { typ: 'zurueckZurPartie' }
  | { typ: 'zurueckZumBilanz' }
  | { typ: 'arztbriefSchreiben' }
  | { typ: 'speichern' };

/** Ajoute des items de checklist SANS reconstruire ceux qui existent déjà. */
function mitCheckliste(lauf: Lauf, modell: ChecklistItem[]): ChecklistItem[] {
  const vorhanden = new Set(lauf.checkliste.map((i) => i.id));
  return [...lauf.checkliste, ...modell.filter((i) => !vorhanden.has(i.id)).map((i) => ({ ...i }))];
}

/** L'automate accepte-t-il cette action ? La vue n'a pas d'autre règle
 *  d'affichage de ses sorties : un bouton existe ssi sa transition existe. */
export function erlaubt(lauf: Lauf, aktion: LaufAktion): boolean {
  return transition(lauf, aktion) !== lauf;
}

/** Visibilité de « Terminer la simulation » dans l'en-tête (règle 8 amendée,
 *  I1) : au bilan seulement — jamais pendant une partie en cours, même quand
 *  une partie est déjà jouée. C'est la transition `versChecklist`, rien d'autre. */
export const simulationBeendbar = (lauf: Lauf): boolean => erlaubt(lauf, { typ: 'versChecklist' });

export function transition(lauf: Lauf, aktion: LaufAktion): Lauf {
  switch (aktion.typ) {
    case 'demarrer': {
      if (lauf.zustand !== 'vorbereitung') return lauf;
      const teil = aktion.teil ?? lauf.geplanteTeile[0];
      return {
        ...lauf,
        zustand: 'laufend',
        aktuellerTeil: teil,
        checkliste: mitCheckliste(lauf, aktion.checkliste),
      };
    }

    case 'aufklaerungOeffnen': {
      // PAS un changement d'état : le jury interrompt, on reste `laufend`.
      // L'ordre total porte sur `zustand`, pas sur le Teil.
      if (lauf.zustand !== 'laufend' || lauf.aktuellerTeil === 'aufklaerung') return lauf;
      // UNE Aufklärung par run (M4) — comme à l'examen, et le Lauf n'a qu'une
      // place pour elle (`teile.aufklaerung`). Une seconde reprenait le chrono
      // de la première (monotone) et ses cases déjà cochées : refusée.
      if (lauf.teileGespielt.includes('aufklaerung')) return lauf;
      // `aktuellerTeil` est déjà narrowé hors de `'aufklaerung'` par la garde
      // ci-dessus : c'est donc un `SimTeil`, le Teil d'où le jury interrompt.
      const vorher = lauf.aktuellerTeil;
      return {
        ...lauf,
        aktuellerTeil: 'aufklaerung',
        teilVorAufklaerung: vorher ?? lauf.teilVorAufklaerung,
        checkliste: mitCheckliste(lauf, aktion.checkliste),
      };
    }

    case 'terminerPartie': {
      // UNE SEULE destination. C'est la correction de fond : il n'existe plus
      // de branche qui, sur le dernier Teil, ne fasse rien.
      if (lauf.zustand !== 'laufend' || !lauf.aktuellerTeil) return lauf;
      const t = lauf.aktuellerTeil;
      const r = aktion.ergebnis;
      const dauer = Math.max(r.durationSec, lauf.sekundenProTeil[t] ?? 0);
      return {
        ...lauf,
        zustand: 'bilanz',
        teileGespielt: lauf.teileGespielt.includes(t) ? lauf.teileGespielt : [...lauf.teileGespielt, t],
        teile: {
          ...lauf.teile,
          [t]: {
            done: true,
            durationSec: dauer,
            languageGrid: r.languageGrid,
            feeling: r.feeling,
            contentPct: r.contentPct,
            officialPct: r.officialPct,
            assistanceUsed: r.assistanceUsed ?? lauf.assistance,
            hints: lauf.entwurf[t]?.hinweise ?? 0,
          },
        },
        sekundenProTeil: { ...lauf.sekundenProTeil, [t]: dauer },
      };
    }

    case 'partieSuivante': {
      // Exception nommée nº 1 — une PROGRESSION, pas un retour.
      if (lauf.zustand !== 'bilanz') return lauf;
      // Après une Aufklärung on revient au Teil d'où le jury a interrompu, et
      // à lui seul : c'est le `setActive('anamnese')` en dur qui disparaît.
      const reprise = lauf.teilVorAufklaerung && !lauf.teileGespielt.includes(lauf.teilVorAufklaerung)
        ? lauf.teilVorAufklaerung
        : naechsterTeil(lauf);
      if (!reprise) return lauf;   // plus rien à jouer : seul `versChecklist` sort
      return {
        ...lauf,
        zustand: 'laufend',
        aktuellerTeil: reprise,
        teilVorAufklaerung: reprise === lauf.teilVorAufklaerung ? null : lauf.teilVorAufklaerung,
      };
    }

    case 'zurueckZurPartie': {
      // Exception nommée nº 2 — la SEULE régression, et seulement depuis bilanz.
      // Le chrono reprend là où il s'était arrêté : `sekundenProTeil` n'est pas
      // touché, et `tickChrono` refuse toute valeur inférieure.
      if (lauf.zustand !== 'bilanz' || !lauf.aktuellerTeil) return lauf;
      return { ...lauf, zustand: 'laufend' };
    }

    case 'versChecklist': {
      if (lauf.zustand !== 'bilanz') return lauf;
      return { ...lauf, zustand: 'checkliste', aktuellerTeil: null };
    }

    case 'zurueckZumBilanz': {
      // Exception nommée nº 3 (décision de `main`) — checkliste → bilanz de la
      // dernière partie jouée. Sans elle, « Terminer la simulation » posé à
      // côté de « Partie suivante » tronquait le run sans retour possible.
      // Depuis `checkliste` seulement : l'Arztbrief commencé n'y ramène pas.
      if (lauf.zustand !== 'checkliste') return lauf;
      const letzter = lauf.teileGespielt[lauf.teileGespielt.length - 1];
      if (!letzter) return lauf;
      return { ...lauf, zustand: 'bilanz', aktuellerTeil: letzter };
    }

    case 'arztbriefSchreiben': {
      if (lauf.zustand !== 'checkliste') return lauf;
      // Q5 : facultatif, et seulement si la Dokumentation n'a pas été jouée —
      // sinon la lettre existe déjà, la reproposer serait un doublon. La règle
      // vit ICI (source unique, ADR-0018), la vue ne fait que demander.
      if (lauf.teileGespielt.includes('dokumentation')) return lauf;
      return { ...lauf, zustand: 'arztbrief' };
    }

    case 'speichern': {
      // Transition d'état seulement. L'écriture en base vit dans `speichern.ts`
      // et est idempotente sur `lauf.id`.
      if (lauf.zustand !== 'checkliste' && lauf.zustand !== 'arztbrief') return lauf;
      return { ...lauf, zustand: 'gespeichert', aktuellerTeil: null, endedAt: Date.now() };
    }
  }
}
