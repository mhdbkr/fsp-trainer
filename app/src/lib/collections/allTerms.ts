// ============================================================================
// Source UNIQUE des termes révisables (F3 §3.1) : glossaire publié + termes
// personnels vus au format Fachbegriff. drill, liste, favoris, pertinence lisent
// ceci ; la notation passe par rateTerm (aiguillage par préfixe pt-).
// ============================================================================
import { db } from '@/db/db';
import type { Fachbegriff, PersonalTerm } from '@/db/types';
import { reviewSrs, type Grade } from '@/lib/srs';
import { syncQueue } from '@/lib/sync/queue';
import { isPersonalId } from './personalTerms';

export type PersonalTermView = Fachbegriff & { personal: true; context?: string; caseId?: string };
export type AnyTerm = Fachbegriff | PersonalTermView;
export const isPersonalView = (t: AnyTerm): t is PersonalTermView => (t as PersonalTermView).personal === true;

export function toView(pt: PersonalTerm): PersonalTermView {
  return {
    id: pt.id, term: pt.term, translationSimple: pt.explanation ?? pt.context ?? '', specialty: 'Allgemein',
    pathologyTags: [], centers: [], linkedCaseIds: [], srs: pt.srs, personal: true,
    ...(pt.context ? { context: pt.context } : {}), ...(pt.caseId ? { caseId: pt.caseId } : {}),
  };
}
export const mergeTerms = (fb: Fachbegriff[], pts: PersonalTerm[]): AnyTerm[] => [...fb, ...pts.map(toView)];

export async function rateTerm(card: AnyTerm, g: Grade): Promise<void> {
  const srs = reviewSrs(card.srs, g);
  if (isPersonalId(card.id)) await db.personal_terms.update(card.id, { srs });
  else await db.fachbegriffe.update(card.id, { srs });
  syncQueue.push({ type: 'srs.reviewed', subject_id: card.id, payload: srs }).catch((e) => console.warn('[sync]', e));
}
