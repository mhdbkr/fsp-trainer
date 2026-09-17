import { describe, it, expect } from 'vitest';
import { buildExternalPromptDetailed, PROMPT_MAX, PREFILL_MAX } from './prompt';
import { seedCases } from '@/data/seedCases';
import { PROBE_BY_ID } from '@/data/guides/anamneseProbes';
import { buildRollenskript } from '@/lib/rolePlay';

const TEIL3_MARKER = '# Teil 3 – Oberarzt/Oberärztin';

// Mêmes ids que SECONDARY_CHAPTERS dans prompt.ts (non exporté à dessein — le
// test vérifie le contrat, pas l'implémentation). Ces chapitres sont, par la
// règle D7-3c, les SEULS que la cascade peut réduire à leur résumé « Fakten » ;
// la fidélité intégrale n'est donc garantie que pour les autres — mais comme
// on impose ici level === 'full' pour les 130 cas, aucune cascade ne joue et
// la fidélité intégrale vaut pour TOUS les chapitres.
const SECONDARY_CHAPTERS = new Set(['personalia', 'vegetativ', 'familie-sozial']);
void SECONDARY_CHAPTERS; // conservé pour documentation du contrat D7-3c

// Termes réalistes (8 × ~20 caractères) — proches d'un vrai relevé de
// Fachbegriffe attendus par cas, pour ne pas sous-tester la taille du prompt.
const REALISTIC_TOP_TERMS = [
  'Verdachtsdiagnose stellen',
  'Differenzialdiagnosen nennen',
  'Anamnese strukturieren',
  'Schmerzcharakter erfragen',
  'Vegetative Anamnese',
  'Medikamentenanamnese',
  'Sozialanamnese erheben',
  'Weiteres Vorgehen planen',
];

// F3 : aplatit récursivement toutes les chaînes ≥ minLen d'un objet (pour
// détecter une fuite de medicalView, quelle que soit sa forme interne).
function flattenStrings(value: unknown, minLen = 12, out: string[] = []): string[] {
  if (typeof value === 'string') {
    if (value.length >= minLen) out.push(value);
  } else if (Array.isArray(value)) {
    for (const v of value) flattenStrings(v, minLen, out);
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value as Record<string, unknown>)) flattenStrings(v, minLen, out);
  }
  return out;
}

describe('prompt sur le corpus', () => {
  it('130/130 cas : level "full" (aucune cascade nécessaire), ≤ PROMPT_MAX, aucune fuite de fiche médicale avant Teil 3, distribution des longueurs', () => {
    const cases = seedCases();
    expect(cases.length).toBeGreaterThanOrEqual(130);
    const tooLong: string[] = []; const notFull: string[] = []; const leaks: string[] = []; const lens: number[] = [];
    let toleratedLeakHits = 0;
    for (const c of cases) {
      const { text: p, level } = buildExternalPromptDetailed({ c, scope: 'exam+feedback', feedbackLang: 'fr', topTerms: REALISTIC_TOP_TERMS });
      lens.push(p.length);
      if (p.length > PROMPT_MAX) tooLong.push(`${c.id}:${p.length}`);
      if (level !== 'full') notFull.push(`${c.id}:${level}`);
      const [beforeTeil3] = p.split(TEIL3_MARKER);
      const vd = c.medicalView?.verdachtsdiagnose;
      if (vd && vd.length > 6 && beforeTeil3.includes(vd)) leaks.push(c.id);
      const verdacht = c.medicalView?.patientWorte?.verdacht;
      if (verdacht && verdacht.length > 6 && beforeTeil3.includes(verdacht)) leaks.push(`${c.id}:patientWorte`);

      // F3 (étendu) : aucune chaîne de medicalView (aplatie, ≥ 12 car.) ne doit
      // fuiter avant Teil 3 — SAUF si cette même chaîne apparaît aussi dans le
      // patientSheet (elle appartient alors légitimement au discours patient,
      // ex. antécédents familiaux répétés dans les deux fiches).
      const medicalStrings = flattenStrings(c.medicalView);
      const patientStrings = flattenStrings(c.patientSheet);
      const isTolerated = (s: string) => patientStrings.some((ps) => ps.includes(s) || s.includes(ps));
      for (const ms of medicalStrings) {
        if (!beforeTeil3.includes(ms)) continue;
        if (isTolerated(ms)) { toleratedLeakHits += 1; continue; }
        leaks.push(`${c.id}:medicalView-leak`);
      }

      // F1 : fidélité — chaque réplique non négative du Rollenskript apparaît
      // verbatim avant Teil 3 (level 'full' garanti ci-dessous, donc aucune
      // compaction n'a pu la remplacer par un résumé Fakten).
      const chapters = buildRollenskript(c.patientSheet);
      for (const ch of chapters) {
        for (const line of ch.lines) {
          if (line.negativ) continue; // stripping F3 : pas de garantie verbatim
          if (!beforeTeil3.includes(line.antwort)) leaks.push(`${c.id}:${ch.id}:fidélité-manquante`);
        }
      }
    }
    // Distribution imprimée AVANT les assertions dures : on veut ces chiffres
    // même si tooLong/notFull/leaks font échouer le test (diagnostic, pas décoration).
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
      `≤PROMPT_MAX(${PROMPT_MAX})=${underPromptMax}/${lens.length} (${Math.round((underPromptMax / lens.length) * 100)}%) ` +
      `fuites medicalView tolérées (présentes aussi dans patientSheet)=${toleratedLeakHits}`,
    );

    expect(tooLong).toEqual([]);
    expect(notFull).toEqual([]);
    expect(leaks).toEqual([]);
  });

  it('3 cas riches : persona et chaque réplique des chapitres non secondaires intégraux, aucune troncature (« … »)', () => {
    const cases = seedCases();
    const richest = [...cases]
      .sort((a, b) => Object.keys(b.patientSheet.antworten ?? {}).length - Object.keys(a.patientSheet.antworten ?? {}).length)
      .slice(0, 3);
    expect(richest.length).toBe(3);
    for (const c of richest) {
      const p = buildExternalPromptDetailed({ c, scope: 'exam+feedback', feedbackLang: 'fr', topTerms: REALISTIC_TOP_TERMS }).text;
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
