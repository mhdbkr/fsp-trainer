import type { MusterCity, Specialty } from '@/db/types';

export type ProgressEventType = 'simulation.completed' | 'srs.reviewed' | 'plan.done' | 'case.layer_reached' | 'program.configured' | 'exam_day.completed';

/** Résumé d'une partie d'un Prüfungstag (docs/contracts/sync-protocol.md § exam_day.completed). */
export interface ExamDayPartSummary {
  score: number;         // weightedPartScore (lib/scoring.ts), 0..100
  contentPct: number;
  officialPct: number;
  durationSec: number;   // temps réellement consommé, ≤ 1200
  passed: boolean;
}
/** Payload v1 de `exam_day.completed` — `subject_id` = `simulationId`. Sous réserve G2.
 *  Résumé dérivé (< 2 Ko, sans texte libre) ; aucune projection Dexie ; `bereitschaft`
 *  est un instantané client non fiable côté serveur. */
export interface ExamDayCompletedPayload {
  v: 1;
  simulationId: string;
  caseId: string;
  specialty: Specialty;
  land: 'BW';
  muster?: MusterCity;
  withSimulant: boolean;                       // assertion client (détection même appareil ou déclaration)
  weightClass: 'pruefungstag' | 'solo';        // effet dans l'indice : poids 3 + lève le plafond / poids 2 sans lever
  startedAt: string;                           // ISO
  endedAt: string;                             // ISO
  parts: {
    anamnese: ExamDayPartSummary;
    dokumentation: ExamDayPartSummary;
    fallvorstellung: ExamDayPartSummary;
    aufklaerung: ExamDayPartSummary | null;    // null si non ouverte
  };
  passed: boolean;                             // chaque partie tentée ≥ 60 %
  bereitschaft: { before: number; after: number; capped: 'none' | 'no_recent_exam_day' };
  appVersion: string;
}
export interface ProgressEvent {
  id: string;            // uuid client
  user_id: string;       // 'local' tant qu'anonyme ; réattribué à la migration
  type: ProgressEventType;
  subject_id: string | null;
  payload: unknown;
  occurred_at: string;   // ISO
  received_at?: string;  // posé par le serveur
}
export interface OutboxRow { id: string; attempts: number; lastError?: string }
export type NewEvent = Pick<ProgressEvent, 'type' | 'subject_id' | 'payload'> & { occurred_at?: string };
export const newId = () => crypto.randomUUID();
