import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { seedCases } from '@/data/seedCases';
import { fachChapterRaw } from './anamneseChapters';

// K3 (ADR-0023, contrat frage-atomique §10.4 I3, §10.10) — FACH_RULES reste la couche d'adaptation,
// inchangée : la Fachanamnese BRUTE de chaque cas (FACH_RULES, sexe, âge, `fachSkip`, questions « fach »
// du cas, fusion gynéco) est la même avant et après `cohere`. Gel gravé AVANT K3 (une empreinte par cas
// du JSON complet : textes, sondes, relances, `parts`) ; un lot qui change volontairement la Fach brute
// le régénère et dit pourquoi.
describe('I3 — la Fach brute (fachChapterRaw) ne bouge pas avec le moteur de cohérence', () => {
  it('130 cas, empreinte du chapitre brut', async () => {
    const lines = seedCases().map((c) => {
      const f = fachChapterRaw(c);
      return `${c.id} ${f ? `${f.chapter.id} ${f.chapter.questions.length} ${createHash('sha256').update(JSON.stringify(f)).digest('hex').slice(0, 16)}` : '—'}`;
    });
    expect(lines).toHaveLength(130);
    await expect(lines.join('\n') + '\n').toMatchFileSnapshot('./__snapshots__/fach-raw.txt');
  });
});
