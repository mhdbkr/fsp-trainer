// Le plan de l'Examen par Land (simulation-run.md §11.2). Seul fichier de features/examen autorisé à porter des durées
// en dur (scripts/checkExamen.mjs, règle 2). Porté de `feat/pruefungstag` (examDayPlan.ts).
//
// Faits d'examen SOURCÉS : trois Teile d'environ 20 min (ANALYSE.md §1 ; protocoles de Stuttgart l.512 et de
// Reutlingen l.331 ; Fallvorstellung : Freiburg l.1378, Stuttgart l.1449). La transition de 60 s et les alertes à 5:00 et
// 1:00 sont des CHOIX DE CONCEPTION, pas des faits d'examen.
import type { SimTeil } from '@/db/types';

export type ExamLand = 'BW';

export interface ExamDayPlan {
  land: ExamLand;
  label: string;
  parts: { key: SimTeil; label: string; targetSec: number; source: string }[];
  transitionSec: number;
  alertsSec: number[];
  p3Note: string;
}

export const EXAM_DAY_PLAN: Record<ExamLand, ExamDayPlan> = {
  BW: {
    land: 'BW',
    label: 'Baden-Württemberg',
    parts: [
      { key: 'anamnese', label: 'Anamnese', targetSec: 20 * 60, source: 'ANALYSE.md l.31 ; 00 FSP Stuttgart.md l.512' },
      { key: 'dokumentation', label: 'Dokumentation', targetSec: 20 * 60, source: 'ANALYSE.md l.32 ; 00 FSP Reutlingen.md l.331' },
      { key: 'fallvorstellung', label: 'Fallvorstellung', targetSec: 20 * 60, source: 'ANALYSE.md l.33 ; Freiburg l.1378, Stuttgart l.1449' },
    ],
    transitionSec: 60,
    alertsSec: [5 * 60, 60],
    p3Note: '≈ 15 min d’Arzt-Arzt-Gespräch puis ≈ 5 min de Fachbegriffe (BW)',
  },
};

export const targetSec = (land: ExamLand, t: SimTeil): number => EXAM_DAY_PLAN[land].parts.find((x) => x.key === t)!.targetSec;
