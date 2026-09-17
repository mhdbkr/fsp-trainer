import type { Fachbegriff } from '@/db/types';

const collator = new Intl.Collator('de', { sensitivity: 'base' });
/** Tri alphabétique allemand (Ä = A, insensible à la casse) des Fachbegriffe. */
export const sortDe = (a: Fachbegriff, b: Fachbegriff) => collator.compare(a.term, b.term);
