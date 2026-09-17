export type ProgressEventType =
  | 'simulation.completed' | 'srs.reviewed' | 'plan.done' | 'case.layer_reached' | 'program.configured'
  | 'term.favorited' | 'term.unfavorited'
  | 'deck.created' | 'deck.renamed' | 'deck.query_changed' | 'deck.deleted' | 'deck.term_added' | 'deck.term_removed';
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
