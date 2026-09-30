export type ProgressEventType =
  | 'simulation.completed' | 'srs.reviewed' | 'plan.done' | 'case.layer_reached' | 'program.configured'
  | 'term.favorited' | 'term.unfavorited'
  | 'deck.created' | 'deck.renamed' | 'deck.query_changed' | 'deck.deleted' | 'deck.term_added' | 'deck.term_removed'
  | 'srs.settings_changed'
  | 'term.personal_created' | 'term.personal_deleted' | 'term.personal_updated'
  // --- Journal d'entrainement (ADR-0017 / training-journal.md §2.2) ---------
  // `training.logged`      subject = TrainingEvent.id  · payload = l'evenement sans id
  // `plan.materialized`    subject = yyyy-MM-dd        · payload = { tasks, mode, seed, targetMin }
  //                        SEULE exception au dernier-gagne : le PLUS ANCIEN
  //                        occurred_at gagne — « fige » veut dire que le premier fige.
  // `plan.replanned`       subject = yyyy-MM-dd        · payload = { tasks, reason }
  //                        dernier-gagne, et bat toujours plan.materialized.
  | 'training.logged' | 'plan.materialized' | 'plan.replanned';
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
