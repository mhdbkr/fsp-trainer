import type { CaseQuestionLue, CaseQuestionKapitel } from '@/db/types';

/** Texte d'une question propre au cas (forme courte ou objet). */
export const cqText = (q: CaseQuestionLue): string => (typeof q === 'string' ? q : q.frage);
/** Relance de la question (Q0), avec sa condition dans le texte : « Falls ja: … ». */
export const cqFollowUp = (q: CaseQuestionLue): string | undefined => (typeof q === 'string' ? undefined : q.followUp);
/** Sous-chapitre du guide où elle se pose ; une chaîne nue = motif (aktuell). */
export const cqKapitel = (q: CaseQuestionLue): CaseQuestionKapitel => (typeof q === 'string' ? 'aktuell' : q.kapitel);
