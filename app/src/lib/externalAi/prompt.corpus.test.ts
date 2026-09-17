import { describe, it, expect } from 'vitest';
import { buildExternalPrompt, PROMPT_MAX } from './prompt';
import { seedCases } from '@/data/seedCases';

describe('prompt sur le corpus', () => {
  it('130/130 cas ≤ PROMPT_MAX en exam+feedback ; aucune verdachtsdiagnose divulguée', () => {
    const cases = seedCases();
    expect(cases.length).toBeGreaterThanOrEqual(130);
    const tooLong: string[] = []; const leaks: string[] = [];
    for (const c of cases) {
      const p = buildExternalPrompt({ c, scope: 'exam+feedback', feedbackLang: 'fr', topTerms: [] });
      if (p.length > PROMPT_MAX) tooLong.push(`${c.id}:${p.length}`);
      const vd = c.medicalView?.verdachtsdiagnose; if (vd && vd.length > 6 && p.includes(vd)) leaks.push(c.id);
    }
    expect(tooLong).toEqual([]); expect(leaks).toEqual([]);
  });
});
