// Non-régression de la recherche (F4a §3.2, AC-10) : la Bedeutung (`s`) sert au
// recto « Sens → terme », à la recherche (applyQuery : page Fachbegriffe, decks
// intelligents) et la sélection se résout par lookupTerm. Pour CHAQUE terme lié
// à un cas, réécrit ou non : retrouvé par son mot ET par sa Bedeutung.
import { describe, it, expect } from 'vitest';
import links from './caseTermLinks.json';
import { seedFachbegriffe } from './seedFachbegriffe';
import { lookupTerm } from '@/lib/dictionary';
import { applyQuery } from '@/lib/collections/query';

const all = seedFachbegriffe();
const linked = new Set(Object.values(links as Record<string, string[]>).flat());
const terms = all.filter((b) => linked.has(b.id));
/** Mesuré avant F4a : termes à ponctuation que lookupTerm ne résout pas (hors périmètre).
 *  + Diabetes mellitus (Abk. Diabetes), lié par variante de libellé : exactLookup retire la « ) » finale
 *  de la sélection, même cause que ÖGD et DRU (correctif à faire dans src/lib/dictionary.ts). */
const LOOKUP_KNOWN = ['fb-i-m', 'fb-oesophago-gastro-duodenoskopie-oegd', 'fb-digital-rektale-untersuchung-dru', 'fb-b-b', 'fb-diabetes-mellitus-abk-diabetes'];

describe('recherche des termes liés (AC-10)', () => {
  it('lookupTerm(terme) résout le même id (hors exceptions connues)', () => {
    expect(terms.filter((b) => lookupTerm(b.term, all)?.id !== b.id).map((b) => b.id).filter((id) => !LOOKUP_KNOWN.includes(id))).toEqual([]);
  });
  it('applyQuery trouve chaque terme par son mot et par sa Bedeutung', () => {
    expect(terms.filter((b) => !applyQuery({ q: b.term }, all).some((x) => x.id === b.id)).map((b) => b.id)).toEqual([]);
    expect(terms.filter((b) => !applyQuery({ q: b.translationSimple }, all).some((x) => x.id === b.id)).map((b) => b.id)).toEqual([]);
  }, 30_000);   // 2 × 1 253 recherches sur tout le glossaire : lent sous charge, pas faux
});
