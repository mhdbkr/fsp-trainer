import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { seedCases } from '@/data/seedCases';
import { fachChapterRaw } from './anamneseChapters';

// K3 (ADR-0023, contrat frage-atomique §10.4 I3, §10.10) — FACH_RULES reste la couche d'adaptation,
// inchangée : la Fachanamnese BRUTE de chaque cas (FACH_RULES, sexe, âge, `fachSkip`, questions « fach »
// du cas, fusion gynéco) est la même avant et après `cohere`. Gel gravé AVANT K3 (une empreinte par cas
// du JSON : textes, sondes, relances, `parts`, ordre). Les DÉCLARATIONS des lots K (`sucht`, `followUpSucht`,
// `enumere`, `relu`) sont hors de l'empreinte : K3 en corrige à la source (décision de main, rapport K3 § 2),
// sans toucher le texte ni l'applicabilité de FACH_RULES. Un lot qui change volontairement la Fach brute
// régénère le gel et dit pourquoi.
const DECLARATIONS = new Set(['sucht', 'followUpSucht', 'enumere', 'relu']);
const sansDeclaration = (k: string, v: unknown) => (DECLARATIONS.has(k) ? undefined : v);

describe('I3 — la Fach brute (fachChapterRaw) ne bouge pas avec le moteur de cohérence', () => {
  it('130 cas, empreinte du chapitre brut', async () => {
    const lines = seedCases().map((c) => {
      const f = fachChapterRaw(c);
      return `${c.id} ${f ? `${f.chapter.id} ${f.chapter.questions.length} ${createHash('sha256').update(JSON.stringify(f, sansDeclaration)).digest('hex').slice(0, 16)}` : '—'}`;
    });
    expect(lines).toHaveLength(130);
    await expect(lines.join('\n') + '\n').toMatchFileSnapshot('./__snapshots__/fach-raw.txt');
  });
});
