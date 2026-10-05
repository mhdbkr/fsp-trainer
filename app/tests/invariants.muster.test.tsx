// C6 — INV-74 (simulation-run.md §10.6, ADR-0021 déc. 9) : le Muster passe de cinq villes à
// « guidé » / « libre » SANS perte de notes. Pour tout `bogen` enregistré et tout `muster` (série 3 ou
// série 4), l'ensemble des valeurs non vides rendues par l'aperçu (`BogenPreview`) est ÉGAL à
// l'ensemble des valeurs non vides stockées ; `musterArt` est total.
import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { BogenPreview } from '@/components/BogenPreview';
import { MUSTER_BOGEN, MUSTER_BOGEN_LEGACY, bogenKeysOf, musterArt } from '@/data/guides/musterBogen';
import type { BogenNotes, MusterArt, MusterCity } from '@/db/types';
import { forAll } from './helpers/prop';

afterEach(() => cleanup());

const VILLES: MusterCity[] = ['Standard', 'Freiburg', 'Karlsruhe', 'Reutlingen', 'Stuttgart'];
const MUSTER: (MusterCity | MusterArt | undefined)[] = [...VILLES, 'guide', 'libre', undefined];
/** Toutes les clés qu'une feuille a jamais pu écrire — y compris une clé nue `noxen` (Freiburg) et une clé inconnue. */
const CLES = [...new Set([
  ...Object.values(MUSTER_BOGEN_LEGACY).flatMap((s) => [...bogenKeysOf(s), ...s.fields.map((f) => f.key)]),
  ...Object.values(MUSTER_BOGEN).flatMap((s) => bogenKeysOf(s)),
  'zusatz-unbekannt',
])];

describe('INV-74 — Muster sans perte de notes', () => {
  it('musterArt est total : villes → libre (Standard → guidé), série 4 inchangé, absent → guidé', () => {
    expect(VILLES.map(musterArt)).toEqual(['guide', 'libre', 'libre', 'libre', 'libre']);
    expect([musterArt('guide'), musterArt('libre'), musterArt(undefined), musterArt(null)]).toEqual(['guide', 'libre', 'guide', 'guide']);
  });

  it('pour 300 bogens générés × 8 Muster, l’aperçu rend exactement les valeurs non vides stockées', async () => {
    let autres = 0;
    await forAll(300, (r) => {
      const bogen: BogenNotes = {};
      for (const k of CLES) if (r.bool(0.35)) bogen[k] = r.bool(0.15) ? (r.bool() ? '' : '   ') : `v-${k}-${r.int(0, 1e6)}`;
      const stockees = Object.values(bogen).filter((v) => v.trim()).sort();
      for (const m of MUSTER) {
        const { container, unmount } = render(<BogenPreview bogen={bogen} muster={m} />);
        const rendues = [...container.querySelectorAll('dd')].map((d) => d.textContent ?? '').sort();
        expect(rendues, `muster ${m ?? '∅'} : ${JSON.stringify(bogen)}`).toEqual(stockees);
        if (rendues.length > bogenKeysOf(MUSTER_BOGEN[musterArt(m)]).filter((k) => bogen[k]?.trim()).length) autres++;
        unmount();
      }
    });
    expect(autres, 'aucune note hors du Muster courant : la preuve passe à vide').toBeGreaterThan(200);
  }, 120_000);
});
