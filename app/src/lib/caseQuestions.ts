import type { CaseQuestionLue, CaseQuestionKapitel } from '@/db/types';

/** Texte d'une question propre au cas (forme courte ou objet). */
export const cqText = (q: CaseQuestionLue): string => (typeof q === 'string' ? q : q.frage);
/** Relances de la question, dans l'ordre (Q0 `followUp`, puis Q3 `followUps`), chacune avec sa condition : « Falls ja: … ». */
export const cqFollowUps = (q: CaseQuestionLue): string[] =>
  (typeof q === 'string' ? [] : [q.followUp, ...(q.followUps ?? [])].filter((f): f is string => !!f?.trim()));
/** Les relances en une ligne (écrans de lecture, Rollenskript). */
export const cqFollowUp = (q: CaseQuestionLue): string | undefined => cqFollowUps(q).join(' ') || undefined;
/** Sous-chapitre du guide où elle se pose ; une chaîne nue = motif (aktuell). */
export const cqKapitel = (q: CaseQuestionLue): CaseQuestionKapitel => (typeof q === 'string' ? 'aktuell' : q.kapitel);
