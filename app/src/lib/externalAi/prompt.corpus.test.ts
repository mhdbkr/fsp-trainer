import { describe, it, expect } from 'vitest';
import { buildExternalPromptDetailed, PROMPT_MAX, PREFILL_MAX, stripFrenchDirections } from './prompt';
import { seedCases } from '@/data/seedCases';
import { PROBE_BY_ID } from '@/data/guides/anamneseProbes';
import { buildRollenskript } from '@/lib/rolePlay';

const TEIL3_MARKER = '# Teil 3 – Oberärztin/Oberarzt';

// E — séquences de régie française qui ne doivent plus jamais survivre dans
// la section Oberarzt du prompt, quel que soit le cas du corpus (comparaison
// SENSIBLE À LA CASSE, comme demandé : on vérifie la forme exacte observée
// dans les fiches, pas une variante). Match sur mot/limite de mot entier —
// une simple sous-chaîne ferait faussement échouer sur « Teste » contenu
// dans un nom allemand légitime comme « Testergebnis ».
const FRENCH_DIRECTION_SEQUENCES = ['Le simulant', 'le candidat', 'Relance', 'Demande un', 'Teste'];
const containsWholeWordSequence = (text: string, seq: string) => new RegExp(`\\b${seq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text);

// B1 — marqueurs allemands sans ambiguïté : si une phrase RETIRÉE par
// stripFrenchDirections en contient un, c'est un faux positif (régie
// française confondue avec de l'allemand courant).
const GERMAN_MARKER_RE = /\b(und|der|die|das|mit|wegen|ist|nicht|bei|auf)\b/iu;
// B1 — borne haute documentée : ~8–15 champs reaktion modifiés attendus sur
// le corpus de 130 cas ; on fixe une borne dure à 20 pour détecter une
// régression (trop de faux positifs) sans figer le chiffre exact.
const MAX_REAKTION_FIELDS_TOUCHED = 20;

// Mêmes ids que SECONDARY_CHAPTERS dans prompt.ts (non exporté à dessein — le
// test vérifie le contrat, pas l'implémentation). Ces chapitres sont, par la
// règle D7-3c, les SEULS que la cascade peut réduire à leur résumé « Fakten » ;
// la fidélité intégrale n'est donc garantie que pour les autres — mais comme
// on impose ici level === 'full' pour les 130 cas, aucune cascade ne joue et
// la fidélité intégrale vaut pour TOUS les chapitres.
const SECONDARY_CHAPTERS = new Set(['personalia', 'vegetativ', 'familie-sozial']);

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
    const frenchDirectionSurvivors: string[] = [];
    let toleratedLeakHits = 0;
    let reaktionFieldsTotal = 0; let reaktionFieldsTouchedByStrip = 0;
    const removedSentences: string[] = [];
    const germanMarkerFalsePositives: string[] = [];
    for (const c of cases) {
      // E/B1 — régie française : combien de champs reaktion sont modifiés par
      // stripFrenchDirections sur ce cas (compromis compté, voir prompt.ts).
      for (const sec of c.examinerSheet ?? []) {
        for (const inter of sec.interactions) {
          if (!inter.reaktion) continue;
          reaktionFieldsTotal += 1;
          const stripped = stripFrenchDirections(inter.reaktion);
          if (stripped !== inter.reaktion) {
            reaktionFieldsTouchedByStrip += 1;
            // Diagnostic : sentences (découpage naïf, à titre de contrôle
            // uniquement — la vraie règle est dans prompt.ts) présentes dans
            // l'original mais absentes du résultat stripé = phrases retirées.
            const roughSentences = inter.reaktion.split(/(?<=[.!?])\s+/u).filter((s) => s.trim().length > 0);
            for (const sent of roughSentences) {
              if (stripped.includes(sent.trim())) continue;
              removedSentences.push(`${c.id}: ${sent.trim()}`);
              if (GERMAN_MARKER_RE.test(sent)) germanMarkerFalsePositives.push(`${c.id}: ${sent.trim()}`);
            }
          }
        }
      }
      const { text: p, level } = buildExternalPromptDetailed({ c, scope: 'exam+feedback', feedbackLang: 'fr', topTerms: REALISTIC_TOP_TERMS });
      lens.push(p.length);
      if (p.length > PROMPT_MAX) tooLong.push(`${c.id}:${p.length}`);
      if (level !== 'full') notFull.push(`${c.id}:${level}`);
      const [beforeTeil3, afterTeil3] = p.split(TEIL3_MARKER);
      // E — aucune séquence de régie française ne doit survivre dans la
      // section Oberarzt (après le marqueur Teil 3), quel que soit le cas.
      for (const seq of FRENCH_DIRECTION_SEQUENCES) {
        if (afterTeil3 && containsWholeWordSequence(afterTeil3, seq)) frenchDirectionSurvivors.push(`${c.id}:${seq}`);
      }
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
    // eslint-disable-next-line no-console
    console.log(`[prompt corpus] régie française (E) : ${reaktionFieldsTouchedByStrip}/${reaktionFieldsTotal} champs reaktion modifiés par stripFrenchDirections`);
    // eslint-disable-next-line no-console
    console.log(`[prompt corpus] B1 — phrases retirées par stripFrenchDirections (contrôle) :\n${removedSentences.map((s) => `  - ${s}`).join('\n')}`);

    expect(tooLong).toEqual([]);
    expect(notFull).toEqual([]);
    expect(leaks).toEqual([]);
    expect(frenchDirectionSurvivors).toEqual([]);
    // B1 — aucune phrase retirée ne doit contenir un marqueur allemand courant :
    // signe que la règle confond de l'allemand avec de la régie française.
    expect(germanMarkerFalsePositives).toEqual([]);
    // B1 — borne haute documentée sur le nombre de champs reaktion modifiés
    // (attendu ≈ 8–15 sur ce corpus ; ≤ 20 pour détecter une régression).
    expect(reaktionFieldsTouchedByStrip).toBeLessThanOrEqual(MAX_REAKTION_FIELDS_TOUCHED);
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
