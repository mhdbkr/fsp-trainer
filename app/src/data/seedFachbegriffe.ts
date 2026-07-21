import type { Fachbegriff, Specialty, Center } from '@/db/types';
import { freshSrs } from '@/lib/srs';
import RAW from './fachbegriffe.json';

// ============================================================================
// Glossaire Fachbegriffe — import COMPLET (2 266 termes) depuis
// `Fachbegriffe_FSP.csv` (2 249, colonnes Terme/Traduction/Spécialité/Centres/
// Prononciation), enrichi par les définitions allemandes d'`anki_FSP.txt` et
// fusionné avec les tags curatés des anciennes entrées de démonstration.
//
// Régénéré par `app/scratchpad/fachbegriffe/gen.py` → `fachbegriffe.json`.
// - `id` STABLE dérivé du terme (fb-<slug>) → le SRS survit aux reseeds.
// - `translationSimple` = reformulation patient (bidirectionnel technique↔patient).
// - `pathologyTags` alimente le câblage cas/fachwissen↔terme (seed wireLinks).
// - `linkedCaseIds` rempli au seed (linkage automatique).
// ============================================================================

type Raw = {
  id: string; t: string; s: string; sp: Specialty;
  p?: string; def?: string; c: Center[]; tags?: string[];
};

export function seedFachbegriffe(): Fachbegriff[] {
  return (RAW as unknown as Raw[]).map((r) => ({
    id: r.id,
    term: r.t,
    translationSimple: r.s,
    definitionDetailed: r.def,
    pronunciation: r.p,
    specialty: r.sp,
    pathologyTags: r.tags ?? [],
    centers: r.c,
    linkedCaseIds: [],
    srs: freshSrs(),
  }));
}
