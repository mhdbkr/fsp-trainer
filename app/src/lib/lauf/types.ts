import type {
  AssistanceMode, BogenNotes, ChecklistItem, LanguageGrid, Layer, MusterCity,
  PartResult, SimTeil, SimulationMode, SketchNotes,
} from '@/db/types';

// ============================================================================
// `Lauf` — une partie de simulation. UNE seule source de vérité.
// Contrat : docs/contracts/simulation-run.md §1 · ADR-0018.
//
// La checklist, les Teile couverts, le minutage et le score sont des CHAMPS du
// Lauf, pas des états parallèles. Un `useState` qui reconstruit l'un des quatre
// est un défaut de contrat (c'était `PartEvaluation.tsx:16`).
// ============================================================================

/** Les six états, dans leur ORDRE TOTAL. L'index vaut la règle : aucune
 *  transition ne va vers un état d'index inférieur ou égal (§2.1 règle 1). */
export const ZUSTAENDE = [
  'vorbereitung',   // pré-simulation
  'laufend',        // en cours, sur un Teil
  'bilanz',         // bilan de la partie qui vient d'être jouée
  'checkliste',     // checklist de fin
  'arztbrief',      // rédaction (facultative, Q5)
  'gespeichert',    // enregistré — terminal
] as const;

export type LaufZustand = (typeof ZUSTAENDE)[number];

export type LaufModus = 'komplett' | 'teil';

/** Aufklärung est un Teil du Lauf comme un autre — le jury peut l'appeler à
 *  tout moment. Elle n'est jamais PLANIFIÉE (`geplanteTeile: SimTeil[]`), mais
 *  elle est jouée, évaluée et chronométrée comme les trois autres. C'est ce qui
 *  supprime le `setActive('anamnese')` en dur de `SimulationRunner.tsx:187`. */
export type LaufTeil = SimTeil | 'aufklaerung';

/** Le FAIT d'un Teil joué — la projection vers `PartResult` est directe. */
export interface TeilLauf {
  done: boolean;
  durationSec: number;
  languageGrid?: LanguageGrid;
  feeling: number;
  contentPct: number;
  officialPct: number;
  /** Mode réellement utilisé sur cette partie. Déclaré dans `db/types.ts:451`
   *  et jamais renseigné jusqu'ici (dette d'audit 8.8). */
  assistanceUsed: AssistanceMode;
  /** Aides consultées pendant la partie. `AnamneseGuide.tsx:33` les comptait
   *  sans jamais les faire sortir du composant (dette 8.7). */
  hints: number;
}

/** Brouillon d'évaluation EN VOL. C'est un champ du Lauf, donc il survit à une
 *  interruption : quitter puis « Reprendre » ne rouvre plus une évaluation
 *  vierge (§3.1). */
export interface TeilEntwurf {
  grid: LanguageGrid;
  feeling: number;
  hinweise: number;
}

export interface Lauf {
  /** uuid v4, posé UNE SEULE FOIS à la création. C'est la clé d'idempotence de
   *  l'écriture finale (§3.2) — le `sim-${Date.now()}` de
   *  `simulationSave.ts:44` en produisait un nouveau à chaque clic. */
  id: string;
  caseId: string;
  caseName: string;
  /** Le compte actif à la création ; ABSENT sans compte (décision `main`,
   *  M2) — jamais une valeur fabriquée comme « local », qui partirait au
   *  serveur. Le seul repli vit dans `saveSimulation`. À la lecture, absent ⇒
   *  profil par défaut (§6). */
  profileId?: string;

  /** L'INTENTION déclarée. */
  modus: LaufModus;
  /** L'INTENTION : trois Teile, ou un seul. Jamais `'aufklaerung'`. */
  geplanteTeile: SimTeil[];

  zustand: LaufZustand;
  /** `null` hors de `laufend` et de `bilanz`. */
  aktuellerTeil: LaufTeil | null;
  /** Le Teil d'où l'on a ouvert une Aufklärung — on y revient (§2.1 règle 7). */
  teilVorAufklaerung: SimTeil | null;

  startedAt: number;
  endedAt?: number;

  // ---- CHAMPS — pas des états parallèles -----------------------------------
  /** Le FAIT : Teile réellement terminés. La portée jouée, jamais l'intention. */
  teileGespielt: LaufTeil[];
  teile: Partial<Record<LaufTeil, TeilLauf>>;
  /** UNE liste plate, tous Teile confondus. Les ids sont sémantiques et
   *  préfixés (`anam-`, `doku-`, `fall-`, `aufk-`), donc « la checklist de ce
   *  Teil » est un filtre de préfixe, pas une seconde liste (§4.2). */
  checkliste: ChecklistItem[];
  /** Chrono par Teil, en SECONDES et monotone croissant (INV-28).
   *  Le contrat §1 écrit `minutenProTeil` ; la minute perdrait l'information du
   *  runner (qui compte en secondes) et rendrait INV-28 intestable. La minute
   *  est une DÉRIVATION — `minutenProTeil(lauf)` —, pas un second stockage. */
  sekundenProTeil: Partial<Record<LaufTeil, number>>;
  entwurf: Partial<Record<LaufTeil, TeilEntwurf>>;

  notes: SketchNotes;
  bogen: BogenNotes;
  arztbriefText: string;

  assistance: AssistanceMode;
  layer: Layer;
  muster?: MusterCity;
  mode: SimulationMode;
  /** TaskInstance du plan, si le Lauf a été lancé depuis le programme. */
  taskId?: string;
}

/** Projection d'un `TeilLauf` vers le `PartResult` historique. La checklist du
 *  Teil est passée à part : elle vit sur le Lauf, pas sur le TeilLauf. */
export function zuPartResult(t: TeilLauf, checklist: ChecklistItem[]): PartResult {
  return {
    done: t.done,
    durationSec: t.durationSec,
    checklist,
    languageGrid: t.languageGrid,
    feeling: t.feeling,
    contentPct: t.contentPct,
    officialPct: t.officialPct,
    assistanceUsed: t.assistanceUsed,
  };
}
