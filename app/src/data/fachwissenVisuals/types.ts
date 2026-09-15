// Types de la spec visuelle Fachwissen — source de vérité TypeScript.
// Voir docs/contracts/fachwissen-visuals.md §1. Recopie mot pour mot le
// schéma du contrat ; n'importe depuis `@/db/types` que des TYPES
// (`import type`), le chargeur esbuild du validateur neutralise l'alias
// `@/` (§5), toute valeur importée par `@/` serait `undefined` au run.
//
// `VisualKind` (registry.ts) et `Tone` (primitives.tsx) sont réutilisés tels
// quels : valeurs identiques au contrat, une seule définition dans le
// dépôt (voir rapport T1 pour la vérification de l'écart).

import type { DiagnostikStufe } from '@/db/types';
import type { VisualKind } from '@/components/visuals/registry';
import type { Tone } from '@/components/visuals/primitives';

export type { VisualKind, Tone };

// ----------------------------------------------------------------------------
// 1.1 Références vers la fiche (contrat §1.1)
// ----------------------------------------------------------------------------

export type SectionKey =
  | 'klinik'
  | 'diagnostik'
  | 'therapie'
  | 'klassifikation'
  | 'differenzialdiagnosen'
  | 'redFlags'
  | 'risikofaktoren'
  | 'prognose'
  | 'aetiologie';

/** Pointeur stable vers une entrée de fiche — par clé, jamais par index. */
export type SectionRef =
  | { section: 'therapie'; label: string } // TherapieSektion.label exact
  | { section: 'klassifikation'; name: string } // klassifikation[].name exact
  | { section: 'diagnostik'; stufe: DiagnostikStufe } // toutes les entrées de la stufe
  | { section: 'differenzialdiagnosen'; dd: string } // differenzialdiagnosen[].dd exact
  | { section: 'klinik' | 'redFlags' | 'risikofaktoren'; text: string } // texte exact
  | { section: 'prognose' | 'aetiologie' }; // champ entier

/** Provenance d'un libellé porté par un visuel. */
export type Source = SectionRef | 'ergänzt';

// ----------------------------------------------------------------------------
// 1.2 Spec et bloc (contrat §1.2)
// ----------------------------------------------------------------------------

export const VISUAL_SCHEMA_VERSION = 1 as const;

interface BlockBase<K extends VisualKind, D> {
  /** Unique dans la spec ; kebab-case ; préfixé par le kind (ex. `tree-ap`). */
  id: string;
  kind: K;
  /** Titre affiché (allemand), ≤ 60 caractères. */
  title: string;
  /** Entrées de fiche DÉCHARGÉES par ce bloc (repliées, §3). Peut être vide. */
  replaces: SectionRef[];
  /** Section avant laquelle le bloc s'insère, colonne principale (§3.3). */
  anchor: SectionKey;
  /** Départage plusieurs blocs sur le même anchor ; défaut = index dans `blocks`. */
  order?: number;
  /** Une phrase à réciter, lue par le bloc pour l'oral. */
  merke?: string;
  data: D;
}

export type VisualBlock =
  | BlockBase<'anatomy-map', AnatomyMapData>
  | BlockBase<'decision-tree', DecisionTreeData>
  | BlockBase<'syndrome-map', SyndromeMapData>
  | BlockBase<'timeline', TimelineData>
  | BlockBase<'compare-table', CompareTableData>
  | BlockBase<'therapy-toggles', TherapyTogglesData>
  | BlockBase<'score-gauge', ScoreGaugeData>;

export interface FachwissenVisualSpec {
  fachwissenId: string; // = Fachwissen.id ; le fichier porte ce nom
  version: typeof VISUAL_SCHEMA_VERSION;
  blocks: VisualBlock[]; // 1 à 4
}

// ----------------------------------------------------------------------------
// 1.3 anatomy-map — silhouette cliquable (contrat §1.3)
// ----------------------------------------------------------------------------

export const ANATOMY_REGIONS = [
  'head',
  'eyes',
  'neck',
  'jaw',
  'chest',
  'retrosternal',
  'left-arm',
  'right-arm',
  'epigastrium',
  'right-upper-quadrant',
  'left-upper-quadrant',
  'periumbilical',
  'right-lower-quadrant',
  'left-lower-quadrant',
  'flank-left',
  'flank-right',
  'back',
  'lumbar',
  'pelvis',
  'left-leg',
  'right-leg',
  'legs',
  'hands',
  'feet',
  'skin',
] as const;
export type AnatomyRegion = (typeof ANATOMY_REGIONS)[number];
export type AnatomyFigure = 'body' | 'torso' | 'abdomen';

export interface AnatomyHotspot {
  region: AnatomyRegion;
  label: string; // court, allemand (« Ikterus (Sklera) »)
  source: Source; // entrée klinik/redFlags citée (plusieurs hotspots peuvent citer la même)
  tone?: Tone; // défaut 'accent' ; 'signal' = red flag
}
export interface AnatomyMapData {
  figure: AnatomyFigure;
  hotspots: AnatomyHotspot[]; // ≥ 2 ; une région au plus une fois
}

// ----------------------------------------------------------------------------
// 1.4 decision-tree — arbre décisionnel (contrat §1.4)
// ----------------------------------------------------------------------------

export type TreeNode =
  | { question: string; source: Source; branches: { label: string; child: TreeNode }[] } // ≥ 2 branches
  | { answer: string; source: Source; text?: string; tone?: Tone }; // feuille
export interface DecisionTreeData {
  root: TreeNode; // profondeur ≤ 4 (racine = 1) ; ≤ 12 nœuds au total
}

// ----------------------------------------------------------------------------
// 1.5 syndrome-map — carte de syndrome (contrat §1.5)
// ----------------------------------------------------------------------------

export interface SyndromeSpoke {
  label: string; // rubrique (« Hauptsymptome »)
  tone?: Tone;
  items: { text: string; source: Source }[]; // 1 à 5
}
export interface SyndromeMapData {
  center: string; // « Depressive Episode ≥ 2 Wochen »
  spokes: SyndromeSpoke[]; // 3 à 6
}

// ----------------------------------------------------------------------------
// 1.6 timeline — frise (contrat §1.6)
// ----------------------------------------------------------------------------

export interface TimelinePoint {
  at: string; // position libre : « 0–10 min », « Stadium C »
  label: string;
  detail?: string;
  source: Source;
  tone?: Exclude<Tone, 'signal'>; // le coral n'est jamais porté par un point (R3)
}
export interface TimelineData {
  axis: 'zeit' | 'stadium' | 'schritt';
  axisTone?: 'neutral' | 'signal'; // 'signal' = toute la bande est un point de bascule
  points: TimelinePoint[]; // 3 à 8, ordre = ordre du tableau
}

// ----------------------------------------------------------------------------
// 1.7 compare-table — tableau comparatif (contrat §1.7)
// ----------------------------------------------------------------------------

export interface CompareTableData {
  columns: string[]; // 2 à 3 en-têtes (« KHK », « DD »)
  rows: {
    criterion: string;
    cells: string[]; // cells.length === columns.length
    source: Source;
    emphasis?: number; // index de colonne mise en avant, au plus une par ligne
  }[]; // 2 à 8
}

// ----------------------------------------------------------------------------
// 1.8 therapy-toggles — sections de thérapie commutables (contrat §1.8)
// ----------------------------------------------------------------------------

export interface TherapyOption {
  label: string; // onglet (peut abréger le label de la fiche)
  ref: { section: 'therapie'; label: string }; // items LUS depuis la fiche, jamais recopiés
  akut?: boolean; // teinte 'signal' ; au plus une option
}
export interface TherapyTogglesData {
  options: TherapyOption[]; // 2 à 5
  default: number; // index dans options
}

// ----------------------------------------------------------------------------
// 1.9 score-gauge — jauge de score (contrat §1.9)
// ----------------------------------------------------------------------------

export interface ScoreCriterion {
  label: string; // « Bilirubin (mg/dl) »
  points: number[]; // valeurs sélectionnables, croissantes (ex. [1, 2, 3])
  choices?: string[]; // libellé par valeur (« < 2 », « 2–3 », « > 3 »), même longueur
  source: Source; // seuils absents de `inhalt` → 'ergänzt' (spec R2)
}
export interface ScoreBand {
  label: string;
  min: number;
  max: number;
  tone: Tone;
  source: Source;
}
export interface ScoreGaugeData {
  score: { name: string; ref: { section: 'klassifikation'; name: string } };
  criteria: ScoreCriterion[]; // peut être vide → jauge statique des bandes
  bands: ScoreBand[]; // contiguës, couvrent [Σ min(points), Σ max(points)] sans trou
  interactive: boolean;
  unit?: string; // « Punkte » par défaut
}
