import type { Fachbegriff } from '@/db/types';

export const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)) as readonly string[];
const BASE: Record<string, string> = { Ä: 'A', Ö: 'O', Ü: 'U', ẞ: 'S', ß: 'S' };

/** Lettre de groupement (allemand) : Ä→A, Ö→O, Ü→U, ß→S ; hors alphabet → '#'. */
export function letterOf(term: string): string {
  const raw = term.trim()[0] ?? '';
  const base = BASE[raw];
  const l = base ?? raw.toUpperCase();
  return /^[A-Z]$/.test(l) ? l : '#';
}
const collator = new Intl.Collator('de', { sensitivity: 'base' });
export const sortDe = (a: Fachbegriff, b: Fachbegriff) => collator.compare(a.term, b.term);

export type Row = { kind: 'letter'; letter: string } | { kind: 'term'; term: Fachbegriff };
/** Lignes de la liste (en-tête de lettre + termes) et index de la première ligne de chaque lettre. `terms` doit déjà être trié. */
export function buildRows(terms: Fachbegriff[]): { rows: Row[]; firstIndexByLetter: Map<string, number> } {
  const rows: Row[] = []; const firstIndexByLetter = new Map<string, number>();
  let current = '';
  for (const term of terms) {
    const l = letterOf(term.term);
    if (l !== current) { current = l; firstIndexByLetter.set(l, rows.length); rows.push({ kind: 'letter', letter: l }); }
    rows.push({ kind: 'term', term });
  }
  return { rows, firstIndexByLetter };
}
