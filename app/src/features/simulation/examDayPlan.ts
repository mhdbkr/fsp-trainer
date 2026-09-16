// Plan du Prüfungstag par Land (spec §5.2 : ANALYSE.md l.31-33 ; protocoles Stuttgart l.512, Reutlingen l.331).
// Seul fichier autorisé à porter des durées en dur (vérifié par scripts/checkExamDay.mjs).

export type ExamDayPart = 'anamnese' | 'dokumentation' | 'fallvorstellung';
export type ExamDayPhase = ExamDayPart | 'transition' | 'evaluation' | 'result';
export type ExamLand = 'BW';

export interface ExamDayPlan {
  land: ExamLand;
  label: string;
  parts: { key: ExamDayPart; label: string; targetSec: number; source: string }[];
  transitionSec: number;
  alertsSec: number[];
  purgeAfterMs: number;
  excludePlayedWithinMs: number;
  p3Note: string;
}

export const ORDER: ExamDayPart[] = ['anamnese', 'dokumentation', 'fallvorstellung'];

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
    purgeAfterMs: 24 * 60 * 60 * 1000,
    excludePlayedWithinMs: 14 * 24 * 60 * 60 * 1000,
    p3Note: '≈ 15 min Arzt-Arzt-Gespräch + ≈ 5 min Fachbegriffe-Liste (BW)',
  },
};

export const nextPart = (p: ExamDayPart): ExamDayPart | null => ORDER[ORDER.indexOf(p) + 1] ?? null;

export const targetSec = (land: ExamLand, p: ExamDayPart) =>
  EXAM_DAY_PLAN[land].parts.find((x) => x.key === p)!.targetSec;
