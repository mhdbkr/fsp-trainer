import { describe, it, expect } from 'vitest';
import { buildExternalPrompt, PROMPT_MAX, PREFILL_MAX } from './prompt';
import { seedCases } from '@/data/seedCases';
import { PROBE_BY_ID } from '@/data/guides/anamneseProbes';

// Mêmes ids que SECONDARY_CHAPTERS dans prompt.ts (non exporté à dessein — le
// test vérifie le contrat, pas l'implémentation). Ces chapitres sont, par la
// règle D7-3c, les SEULS que la cascade peut réduire à leur résumé « Fakten » ;
// la fidélité intégrale n'est donc garantie que pour les autres.
const SECONDARY_CHAPTERS = new Set(['personalia', 'vegetativ', 'familie-sozial']);

describe('prompt sur le corpus', () => {
  it('130/130 cas ≤ PROMPT_MAX en exam+feedback ; aucune fuite de fiche médicale avant Teil 3 ; distribution des longueurs', () => {
    const cases = seedCases();
    expect(cases.length).toBeGreaterThanOrEqual(130);
    const tooLong: string[] = []; const leaks: string[] = []; const lens: number[] = [];
    for (const c of cases) {
      const p = buildExternalPrompt({ c, scope: 'exam+feedback', feedbackLang: 'fr', topTerms: [] });
      lens.push(p.length);
      if (p.length > PROMPT_MAX) tooLong.push(`${c.id}:${p.length}`);
      const [beforeTeil3] = p.split('## Teil 3');
      const vd = c.medicalView?.verdachtsdiagnose;
      if (vd && vd.length > 6 && beforeTeil3.includes(vd)) leaks.push(c.id);
      const verdacht = c.medicalView?.patientWorte?.verdacht;
      if (verdacht && verdacht.length > 6 && beforeTeil3.includes(verdacht)) leaks.push(`${c.id}:patientWorte`);
    }
    // Distribution imprimée AVANT les assertions dures : on veut ces chiffres
    // même si tooLong/leaks font échouer le test (diagnostic, pas décoration).
    const sorted = [...lens].sort((a, b) => a - b);
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const median = sorted[Math.floor(sorted.length / 2)];
    const underPrefill = lens.filter((l) => l <= PREFILL_MAX).length;
    const underPromptMax = lens.filter((l) => l <= PROMPT_MAX).length;
    // eslint-disable-next-line no-console
    console.log(
      `[prompt corpus] n=${lens.length} min=${min} médiane=${median} max=${max} ` +
      `≤PREFILL_MAX(${PREFILL_MAX})=${underPrefill}/${lens.length} (${Math.round((underPrefill / lens.length) * 100)}%) ` +
      `≤PROMPT_MAX(${PROMPT_MAX})=${underPromptMax}/${lens.length} (${Math.round((underPromptMax / lens.length) * 100)}%)`,
    );

    expect(tooLong).toEqual([]);
    expect(leaks).toEqual([]);
  });

  it('3 cas riches : persona et chaque réplique des chapitres non secondaires intégraux, aucune troncature (« … »)', () => {
    const cases = seedCases();
    const richest = [...cases]
      .sort((a, b) => Object.keys(b.patientSheet.antworten ?? {}).length - Object.keys(a.patientSheet.antworten ?? {}).length)
      .slice(0, 3);
    expect(richest.length).toBe(3);
    for (const c of richest) {
      const p = buildExternalPrompt({ c, scope: 'exam+feedback', feedbackLang: 'fr', topTerms: [] });
      expect(p).not.toContain('…'); // jamais de troncature, quel que soit le niveau de repli atteint
      if (c.patientSheet.persona) expect(p).toContain(c.patientSheet.persona);
      for (const [probeId, antwort] of Object.entries(c.patientSheet.antworten ?? {})) {
        if (!antwort) continue;
        const kapitel = PROBE_BY_ID[probeId]?.kapitel ?? 'aktuell';
        if (SECONDARY_CHAPTERS.has(kapitel)) continue; // seul repli permis (D7-3c) — résumé Fakten toléré ici
        expect(p).toContain(antwort);
      }
    }
  });
});
