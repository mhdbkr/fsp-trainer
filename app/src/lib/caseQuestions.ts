import type { CaseQuestion, CaseQuestionKapitel } from '@/db/types';

/** Texte d'une question propre au cas (forme courte ou objet). */
export const cqText = (q: CaseQuestion): string => (typeof q === 'string' ? q : q.frage);
/** Sous-chapitre du guide où elle se pose ; une chaîne nue = motif (aktuell). */
export const cqKapitel = (q: CaseQuestion): CaseQuestionKapitel => (typeof q === 'string' ? 'aktuell' : q.kapitel);
