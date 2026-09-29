// Ligne courte d'un terme dans une liste (TermList, CaseTermsPanel) : la parole
// du patient quand le registre existe, sinon la Bedeutung. La fiche complète
// vit dans TermSheet / TermUsage (F4a).
import type { Fachbegriff } from '@/db/types';

export const registerLine = (t: Pick<Fachbegriff, 'translationSimple' | 'register'>): string => t.register?.patient ?? t.translationSimple;
