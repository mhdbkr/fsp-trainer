# Simuler avec ton IA · Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un tap depuis la pré-simulation, le runner, la fiche d'un cas ou le résultat ouvre l'IA préférée du candidat avec le personnage (patient → Oberarzt → feedback) prêt à jouer ; au retour, l'app propose l'auto-évaluation et la séance compte.

**Architecture:** Un générateur pur (`lib/externalAi/prompt.ts`) transforme le `Rollenskript` (déjà utilisé par le simulant humain) et l'`examinerSheet` en prompt allemand ; une table de cibles (`targets.ts`) sait quelle URL pré-remplit (`?q=`) et écrit toujours le presse-papiers ; une feuille unique (`ExternalAiSheet`) est branchée aux 4 points d'entrée ; une meta `externalAi.pending` déclenche la carte de retour qui réutilise `PartEvaluation` et le chemin de sauvegarde extrait du runner.

**Tech Stack:** React 18, Vite 7, Dexie, Zustand, Vitest + @testing-library/react, playwright-cli. Aucune dépendance nouvelle.

Spec : `docs/superpowers/specs/2026-09-17-external-ai-simulation-design.md`

## Global Constraints

- Branche `feat/external-ai` depuis `main` ; worktree `../doctopus-external-ai` (copier `app/.env`, `app/supabase/.env`). Commandes depuis `app/`.
- Gates : `npm run typecheck`, `npx vitest run --dir src` (**aussi sans `.env`**, cf. team-protocol), `npm run build` → exit 0 (flake #33 toléré).
- Le prompt **ne contient jamais** `medicalView`, `verdachtsdiagnose`, `linkedFachwissen` ; il contient personalia, `persona`, chaque `antwort` du Rollenskript, `negativ` en « Nein », `schwierigeReaktionen`.
- `PROMPT_MAX = 6000` caractères ; 130/130 cas ≤ `PROMPT_MAX` (scope `exam+feedback`).
- Cibles (verbatim) : chatgpt `https://chatgpt.com/?q=` (envoie) · claude `https://claude.ai/new?q=` · perplexity `https://www.perplexity.ai/search?q=` · grok `https://grok.com/?q=` · gemini `https://gemini.google.com/app` (aucun paramètre). Presse-papiers **toujours** écrit avant l'ouverture ; `window.open` dans le gestionnaire de clic.
- Metas locales : `externalAi.target`, `externalAi.scope`, `externalAi.feedbackLang`, `externalAi.pending` (`{ caseId, targetId, scope, at }`).
- `Simulation.mode` gagne `'external-ai'` ; `Simulation.externalTarget?` ; `assistance: 'autonome'` pour ces séances ; contrat documenté (`sync-protocol.md`, via `arch`), pas de migration.
- Charte : tons existants, cibles 44 px, feuille = pattern `DeckSheet` ; pas de logos tiers (initiale dans un rond).
- Stager fichier par fichier ; pas de trailer Co-Authored-By dans les commits d'agents ; vérifier par code de sortie.

---

### Task 1 : Générateur de prompt (`lib/externalAi/prompt.ts`)

**Files:**
- Create: `app/src/lib/externalAi/prompt.ts`
- Test: `app/src/lib/externalAi/prompt.test.ts`, `app/src/lib/externalAi/prompt.corpus.test.ts`

**Interfaces:**
- Consumes: `buildRollenskript(sheet: PatientSheet): RoleChapter[]` (`@/lib/rolePlay`), types `Case`, `PatientSheet`, `ExaminerSheetSection`
- Produces:
  ```ts
  export type Scope = 'anamnese' | 'exam' | 'exam+feedback';
  export type FeedbackLang = 'fr' | 'de';
  export interface PromptInput { c: Case; scope: Scope; feedbackLang: FeedbackLang; topTerms: string[] }
  export const PROMPT_MAX = 6000;
  export function buildExternalPrompt(i: PromptInput): string;
  export const SCOPE_LABELS: Record<Scope, string>;   // 'Anamnèse seule' | 'Examen complet' | 'Examen + feedback'
  ```

- [ ] **Step 1 : tests qui échouent**

```ts
// app/src/lib/externalAi/prompt.test.ts
import { describe, it, expect } from 'vitest';
import { buildExternalPrompt, PROMPT_MAX } from './prompt';
import type { Case } from '@/db/types';

const c = {
  id: 'case-test', name: 'Ulcus ventriculi', pathology: 'ulcus', specialty: 'Gastroenterologie',
  patientSheet: {
    personalia: { name: 'Karl Müller', age: 58, geschlecht: 'm', beruf: 'Maschinenarbeiter', familienstand: 'verheiratet', wohnsituation: 'Wohnung, 2. Stock, mit Ehefrau', hausarzt: 'Dr. Weber' },
    leitsymptome: ['Schmerzen im Oberbauch seit 3 Wochen'], begleitsymptome: ['Übelkeit'],
    antworten: { 'akt-motiv': 'Ich habe seit drei Wochen Schmerzen im Oberbauch.', 'akt-beginn': 'Das hat langsam angefangen.' },
    negativeFindings: ['Fieber'], vegetativeAnamnese: [],
    schwierigeReaktionen: ['Wird ungeduldig, wenn Fachwörter benutzt werden'],
    persona: 'Tu minimises tes douleurs ; tu ne parles du sang dans les selles que si on te le demande.',
  },
  medicalView: { verdachtsdiagnose: 'Ulcus ventriculi', patientWorte: { verdacht: 'ein Geschwür im Magen' } },
  examinerSheet: [{ title: 'Nach der Vorstellung', interactions: [{ frage: 'Welche Differenzialdiagnosen kommen in Frage?', reaktion: 'Gastritis, Pankreatitis' }] }],
  examinerQuestions: ['Wie gehen Sie weiter vor?'],
  linkedFachbegriffeIds: [], probableAufklaerungIds: [], caseSpecificQuestions: [], centers: [], frequency: 1, difficulty: 1,
} as unknown as Case;
const base = { c, feedbackLang: 'fr' as const, topTerms: ['Ulkus', 'Hämatemesis'] };

describe('buildExternalPrompt', () => {
  it('anamnese : rôle, personalia, chaque réponse du Rollenskript, négatifs, réactions difficiles, persona', () => {
    const p = buildExternalPrompt({ ...base, scope: 'anamnese' });
    for (const s of ['Karl Müller', '58', 'Maschinenarbeiter', 'Dr. Weber', 'Ich habe seit drei Wochen Schmerzen im Oberbauch.', 'Das hat langsam angefangen.', 'Nein: Fieber', 'Wird ungeduldig', 'Regieanweisung', 'minimises tes douleurs', 'Nenne nie eine Diagnose']) expect(p).toContain(s);
    expect(p).not.toContain('Fallvorstellung'); expect(p).not.toContain('Feedback');
  });
  it('ne divulgue jamais la fiche médicale', () => {
    for (const scope of ['anamnese', 'exam', 'exam+feedback'] as const) {
      const p = buildExternalPrompt({ ...base, scope });
      expect(p).not.toContain('Ulcus ventriculi');            // verdachtsdiagnose
      expect(p).not.toContain('ein Geschwür im Magen');        // medicalView.patientWorte
    }
  });
  it('exam : section Oberarzt avec les questions dans l\'ordre, attendus entre parenthèses, puis examinerQuestions', () => {
    const p = buildExternalPrompt({ ...base, scope: 'exam' });
    const i1 = p.indexOf('Welche Differenzialdiagnosen'); const i2 = p.indexOf('Wie gehen Sie weiter vor?');
    expect(i1).toBeGreaterThan(0); expect(i2).toBeGreaterThan(i1);
    expect(p).toContain('(erwartet: Gastritis, Pankreatitis)');
    expect(p).toContain('„Fallvorstellung“'); expect(p).not.toContain('„Feedback“');
  });
  it('exam+feedback : grille avec les termes attendus, langue du feedback', () => {
    const fr = buildExternalPrompt({ ...base, scope: 'exam+feedback' });
    expect(fr).toContain('„Feedback“'); expect(fr).toContain('Ulkus'); expect(fr).toContain('Hämatemesis'); expect(fr).toContain('Konjunktiv I'); expect(fr).toContain('auf Französisch');
    const de = buildExternalPrompt({ ...base, scope: 'exam+feedback', feedbackLang: 'de' });
    expect(de).toContain('auf Deutsch'); expect(de).not.toContain('auf Französisch');
  });
  it('taille bornée sur ce cas', () => { expect(buildExternalPrompt({ ...base, scope: 'exam+feedback' }).length).toBeLessThanOrEqual(PROMPT_MAX); });
});
```

```ts
// app/src/lib/externalAi/prompt.corpus.test.ts — le vrai corpus (130 cas)
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
```
Vérifier le nom réel de l'export de `src/data/seedCases.ts` (`grep -n "^export" src/data/seedCases.ts`) et l'adapter ; ce fichier fait > 1 Mo : ne pas le lire, seulement l'importer. Si la verdachtsdiagnose est aussi, par nature, le nom du cas que le patient pourrait citer (« mon médecin a dit… »), le prompt doit quand même l'omettre : l'assertion tient.

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run src/lib/externalAi`
Expected: FAIL — module introuvable

- [ ] **Step 3 : implémentation**

```ts
// app/src/lib/externalAi/prompt.ts
// ============================================================================
// Personnage prêt à jouer pour une IA externe (ChatGPT, Claude, Gemini…).
// Source unique : le Rollenskript du simulant humain — ce que le partenaire
// lit, l'IA le joue. JAMAIS la fiche médicale (le patient ignore son
// diagnostic). Gabarit allemand, déterministe, testé par snapshot et sur le
// corpus (≤ PROMPT_MAX). Spec : 2026-09-17-external-ai-simulation-design.md
// ============================================================================
import type { Case, PatientSheet } from '@/db/types';
import { buildRollenskript } from '@/lib/rolePlay';

export type Scope = 'anamnese' | 'exam' | 'exam+feedback';
export type FeedbackLang = 'fr' | 'de';
export interface PromptInput { c: Case; scope: Scope; feedbackLang: FeedbackLang; topTerms: string[] }
export const PROMPT_MAX = 6000;
export const SCOPE_LABELS: Record<Scope, string> = { anamnese: 'Anamnèse seule', exam: 'Examen complet', 'exam+feedback': 'Examen + feedback' };

const line = (s?: string | number | null) => (s === undefined || s === null || s === '' ? null : String(s));
const join = (parts: (string | null)[], sep = '\n') => parts.filter((p): p is string => !!p).join(sep);

function personalia(s: PatientSheet): string {
  const p = s.personalia;
  const g = p.geschlecht === 'w' ? 'weiblich' : p.geschlecht === 'm' ? 'männlich' : null;
  return join([
    `- Name: ${p.name}, ${p.age} Jahre${g ? `, ${g}` : ''}`,
    p.beruf ? `- Beruf: ${p.beruf}` : null,
    p.familienstand ? `- Familienstand: ${p.familienstand}` : null,
    p.wohnsituation ? `- Wohnsituation: ${p.wohnsituation}` : null,
    p.hausarzt ? `- Hausarzt/Hausärztin: ${p.hausarzt}` : null,
  ]);
}

function knowledge(s: PatientSheet, compact: boolean): string {
  const chapters = buildRollenskript(s);
  return chapters.map((ch) => {
    const facts = ch.glance.length ? `  Fakten: ${ch.glance.join(' · ')}` : null;
    const lines = compact ? [] : ch.lines.map((l) => l.negativ ? `  - Nein: ${l.antwort}` : `  - ${l.frage ? `Wenn gefragt „${l.frage}“ → ` : ''}${l.antwort}`);
    return join([`### ${ch.title}`, facts, ...lines]);
  }).join('\n');
}

function oberarzt(c: Case): string {
  const sections = (c.examinerSheet ?? []).map((sec) => join([`- ${sec.title}:`, ...sec.interactions.map((i) => `  - ${i.frage}${i.reaktion ? ` (erwartet: ${i.reaktion})` : ''}`)]));
  const extra = (c.examinerQuestions ?? []).map((q) => `  - ${q}`);
  return join([
    '## Teil 3 – Oberarzt/Oberärztin',
    'Wenn die Ärztin/der Arzt „Fallvorstellung“ sagt, wechselst du die Rolle: Du bist jetzt die Oberärztin/der Oberarzt. Hör die Fallvorstellung vollständig an, dann stelle diese Fragen in dieser Reihenfolge – fordernd, aber wohlwollend. Keine ungefragte Hilfe. Bleib in dieser Rolle, bis „Feedback“ oder „Ende“ gesagt wird.',
    ...sections,
    extra.length ? join(['- Weitere Prüferfragen:', ...extra]) : null,
  ]);
}

function feedback(lang: FeedbackLang, topTerms: string[]): string {
  const l = lang === 'fr' ? 'auf Französisch' : 'auf Deutsch';
  return join([
    '## Feedback',
    `Wenn die Ärztin/der Arzt „Feedback“ sagt, verlässt du jede Rolle und gibst ${l} ein Prüfungsfeedback:`,
    '- Konjunktiv I in der Fallvorstellung (indirekte Rede) – korrekt, fehlend, falsch',
    '- Register: mündlich vs. schriftlich, Patientensprache vs. Fachsprache',
    topTerms.length ? `- Erwartete Fachbegriffe (wurden sie benutzt?): ${topTerms.join(', ')}` : '- Erwartete Fachbegriffe der Fallvorstellung',
    '- Struktur der Fallvorstellung (Reihenfolge, Vollständigkeit, Zeit)',
    '- 3 Stärken, 3 Baustellen, je ein konkreter Satz zum Üben',
  ]);
}

export function buildExternalPrompt(i: PromptInput): string {
  const s = i.c.patientSheet;
  const withRole = (compact: boolean) => join([
    '# Rolle',
    'Du spielst eine Patientin / einen Patienten in einer Simulation der Fachsprachprüfung Medizin (Deutschland). Die Ärztin/der Arzt führt das Anamnesegespräch. Regeln:',
    '- Antworte NUR auf das, was gefragt wird. Ein bis zwei Sätze. Auf Deutsch.',
    '- Sprich wie ein Patient: keine Fachbegriffe von dir aus, Umgangssprache, Gefühle.',
    '- Nenne nie eine Diagnose – du weißt nicht, was du hast. Erfinde keine neuen Fakten; wenn etwas nicht unten steht, sag „Das weiß ich nicht“ oder bleib vage.',
    '- Bleib in der Rolle, auch wenn die Ärztin/der Arzt aus dem Rahmen fällt.',
    '',
    '# Wer du bist',
    personalia(s),
    s.persona ? `- Regieanweisung (nicht vorlesen): ${s.persona}` : null,
    s.leitsymptome?.length ? `- Warum du hier bist (in deinen Worten): ${s.leitsymptome.join('; ')}` : null,
    s.begleitsymptome?.length ? `- Außerdem: ${s.begleitsymptome.join('; ')}` : null,
    '',
    '# Was du weißt (antworte nur, wenn danach gefragt wird)',
    knowledge(s, compact),
    s.schwierigeReaktionen?.length ? join(['', '## Schwierige Momente', ...s.schwierigeReaktionen.map((r) => `- ${r}`)]) : null,
    i.scope !== 'anamnese' ? join(['', oberarzt(i.c)]) : null,
    i.scope === 'exam+feedback' ? join(['', feedback(i.feedbackLang, i.topTerms)]) : null,
    '',
    '# Start',
    'Stell dich mit einem Satz vor, sobald die Ärztin/der Arzt dich begrüßt. Nenne nie eine Diagnose. Sprachmodus empfohlen.',
  ]);
  const full = withRole(false);
  return full.length <= PROMPT_MAX ? full : withRole(true);   // repli : chapitres en « Fakten » seulement
}
```
Note sur le repli compact : si même la version compacte dépasse `PROMPT_MAX`, le test corpus le dira ; dans ce cas, tronquer `glance` à 6 items par chapitre (règle à ajouter et tester) plutôt que d'augmenter la borne.

- [ ] **Step 4 : lancer, vérifier**

Run: `npx vitest run src/lib/externalAi && npm run typecheck`
Expected: exit 0 ; noter dans le rapport la taille max sur le corpus et combien de cas passent en compact.

- [ ] **Step 5 : commit**

```bash
git add src/lib/externalAi/prompt.ts src/lib/externalAi/prompt.test.ts src/lib/externalAi/prompt.corpus.test.ts
git commit -m "feat(ia-externe): générateur de prompt patient → Oberarzt → feedback depuis le Rollenskript (jamais la fiche médicale)"
```

---

### Task 2 : Cibles, lancement, préférences (`lib/externalAi/targets.ts`)

**Files:**
- Create: `app/src/lib/externalAi/targets.ts`
- Test: `app/src/lib/externalAi/targets.test.ts`

**Interfaces:**
- Consumes: `getMeta/setMeta` (`@/db/db`), `PROMPT_MAX`, `Scope`, `FeedbackLang` (Task 1)
- Produces:
  ```ts
  export type TargetId = 'chatgpt' | 'claude' | 'gemini' | 'perplexity' | 'grok';
  export interface AiTarget { id: TargetId; label: string; base: string; prefill: ((prompt: string) => string) | null; submits: boolean; voiceHint: string }
  export const AI_TARGETS: AiTarget[];
  export function buildLaunchUrl(t: AiTarget, prompt: string): { url: string; prefilled: boolean };
  export async function launch(t: AiTarget, prompt: string, deps?: { open?: (url: string) => void; copy?: (text: string) => Promise<void> }): Promise<{ opened: boolean; copied: boolean; prefilled: boolean }>;
  export interface ExternalAiPrefs { target: TargetId; scope: Scope; feedbackLang: FeedbackLang }
  export async function loadPrefs(): Promise<ExternalAiPrefs>;      // défaut { target: 'chatgpt', scope: 'exam+feedback', feedbackLang: 'fr' }
  export async function savePrefs(p: ExternalAiPrefs): Promise<void>;
  export interface PendingExternalSim { caseId: string; targetId: TargetId; scope: Scope; at: number }
  export const getPending: () => Promise<PendingExternalSim | null>; export const setPending: (p: PendingExternalSim | null) => Promise<void>;
  ```

- [ ] **Step 1 : tests qui échouent**

```ts
// app/src/lib/externalAi/targets.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AI_TARGETS, buildLaunchUrl, launch, loadPrefs, savePrefs, getPending, setPending } from './targets';
import { PROMPT_MAX } from './prompt';
import { db } from '@/db/db';

const T = Object.fromEntries(AI_TARGETS.map((t) => [t.id, t]));

describe('cibles', () => {
  it('URLs exactes par cible', () => {
    expect(buildLaunchUrl(T.chatgpt, 'Hallo Welt')).toEqual({ url: 'https://chatgpt.com/?q=Hallo%20Welt', prefilled: true });
    expect(buildLaunchUrl(T.claude, 'Hallo Welt')).toEqual({ url: 'https://claude.ai/new?q=Hallo%20Welt', prefilled: true });
    expect(buildLaunchUrl(T.perplexity, 'x')).toEqual({ url: 'https://www.perplexity.ai/search?q=x', prefilled: true });
    expect(buildLaunchUrl(T.grok, 'x')).toEqual({ url: 'https://grok.com/?q=x', prefilled: true });
    expect(buildLaunchUrl(T.gemini, 'x')).toEqual({ url: 'https://gemini.google.com/app', prefilled: false });
    expect(T.chatgpt.submits).toBe(true); expect(T.claude.submits).toBe(false);
  });
  it('au-delà de PROMPT_MAX → URL de base sans ?q=', () => {
    const long = 'a'.repeat(PROMPT_MAX + 1);
    expect(buildLaunchUrl(T.chatgpt, long)).toEqual({ url: 'https://chatgpt.com/', prefilled: false });
  });
  it('launch : copie puis ouvre ; copie échouée → copied false mais ouvre quand même', async () => {
    const open = vi.fn(); const copy = vi.fn().mockResolvedValue(undefined);
    expect(await launch(T.claude, 'p', { open, copy })).toEqual({ opened: true, copied: true, prefilled: true });
    expect(copy).toHaveBeenCalledWith('p'); expect(open).toHaveBeenCalledWith('https://claude.ai/new?q=p');
    const copyFail = vi.fn().mockRejectedValue(new Error('denied'));
    expect(await launch(T.gemini, 'p', { open, copy: copyFail })).toEqual({ opened: true, copied: false, prefilled: false });
  });
});

describe('préférences et trace', () => {
  beforeEach(() => db.meta.clear());
  it('défauts puis persistance', async () => {
    expect(await loadPrefs()).toEqual({ target: 'chatgpt', scope: 'exam+feedback', feedbackLang: 'fr' });
    await savePrefs({ target: 'claude', scope: 'anamnese', feedbackLang: 'de' });
    expect(await loadPrefs()).toEqual({ target: 'claude', scope: 'anamnese', feedbackLang: 'de' });
  });
  it('pending set/get/clear', async () => {
    expect(await getPending()).toBeNull();
    await setPending({ caseId: 'c1', targetId: 'chatgpt', scope: 'exam', at: 123 });
    expect(await getPending()).toEqual({ caseId: 'c1', targetId: 'chatgpt', scope: 'exam', at: 123 });
    await setPending(null); expect(await getPending()).toBeNull();
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run src/lib/externalAi/targets.test.ts`
Expected: FAIL — module introuvable

- [ ] **Step 3 : implémentation**

```ts
// app/src/lib/externalAi/targets.ts
// Cibles d'IA externes et lancement. Vérifié 2026-09-17 : ChatGPT `?q=`
// pré-remplit ET envoie ; Claude `/new?q=` pré-remplit (Entrée manuel) ;
// Perplexity, Grok `?q=` ; Gemini n'a aucun paramètre → presse-papiers.
// Le presse-papiers est TOUJOURS écrit (filet) ; l'ouverture doit rester dans
// le gestionnaire de clic (mobile bloque les popups différés).
import { getMeta, setMeta } from '@/db/db';
import { PROMPT_MAX, type Scope, type FeedbackLang } from './prompt';

export type TargetId = 'chatgpt' | 'claude' | 'gemini' | 'perplexity' | 'grok';
export interface AiTarget { id: TargetId; label: string; base: string; prefill: ((prompt: string) => string) | null; submits: boolean; voiceHint: string }

const q = (base: string) => (p: string) => `${base}${encodeURIComponent(p)}`;
export const AI_TARGETS: AiTarget[] = [
  { id: 'chatgpt', label: 'ChatGPT', base: 'https://chatgpt.com/', prefill: q('https://chatgpt.com/?q='), submits: true, voiceHint: 'Le prompt part tout seul ; appuie ensuite sur le micro (mode vocal).' },
  { id: 'claude', label: 'Claude', base: 'https://claude.ai/new', prefill: q('https://claude.ai/new?q='), submits: false, voiceHint: 'Appuie sur Entrée pour envoyer, puis active la voix.' },
  { id: 'gemini', label: 'Gemini', base: 'https://gemini.google.com/app', prefill: null, submits: false, voiceHint: 'Colle le prompt (déjà copié), envoie, puis active Gemini Live.' },
  { id: 'perplexity', label: 'Perplexity', base: 'https://www.perplexity.ai/', prefill: q('https://www.perplexity.ai/search?q='), submits: true, voiceHint: 'Le prompt part tout seul ; active ensuite le mode vocal.' },
  { id: 'grok', label: 'Grok', base: 'https://grok.com/', prefill: q('https://grok.com/?q='), submits: false, voiceHint: 'Envoie le prompt, puis active la voix.' },
];

export function buildLaunchUrl(t: AiTarget, prompt: string): { url: string; prefilled: boolean } {
  if (!t.prefill || prompt.length > PROMPT_MAX) return { url: t.base, prefilled: false };
  return { url: t.prefill(prompt), prefilled: true };
}

export async function launch(t: AiTarget, prompt: string, deps: { open?: (url: string) => void; copy?: (text: string) => Promise<void> } = {}): Promise<{ opened: boolean; copied: boolean; prefilled: boolean }> {
  const copy = deps.copy ?? ((text: string) => navigator.clipboard.writeText(text));
  const open = deps.open ?? ((url: string) => { window.open(url, '_blank', 'noopener'); });
  let copied = false;
  try { await copy(prompt); copied = true; } catch { copied = false; }
  const { url, prefilled } = buildLaunchUrl(t, prompt);
  open(url);
  return { opened: true, copied, prefilled };
}

export interface ExternalAiPrefs { target: TargetId; scope: Scope; feedbackLang: FeedbackLang }
const DEFAULT_PREFS: ExternalAiPrefs = { target: 'chatgpt', scope: 'exam+feedback', feedbackLang: 'fr' };
export async function loadPrefs(): Promise<ExternalAiPrefs> {
  const [target, scope, feedbackLang] = await Promise.all([getMeta<TargetId>('externalAi.target', DEFAULT_PREFS.target), getMeta<Scope>('externalAi.scope', DEFAULT_PREFS.scope), getMeta<FeedbackLang>('externalAi.feedbackLang', DEFAULT_PREFS.feedbackLang)]);
  return { target, scope, feedbackLang };
}
export async function savePrefs(p: ExternalAiPrefs): Promise<void> {
  await Promise.all([setMeta('externalAi.target', p.target), setMeta('externalAi.scope', p.scope), setMeta('externalAi.feedbackLang', p.feedbackLang)]);
}

export interface PendingExternalSim { caseId: string; targetId: TargetId; scope: Scope; at: number }
export const getPending = () => getMeta<PendingExternalSim | null>('externalAi.pending', null);
export const setPending = (p: PendingExternalSim | null) => setMeta('externalAi.pending', p);
```
Vérifier la signature de `setMeta` (`grep -n "export async function setMeta\|export const setMeta" src/db/db.ts`) — elle accepte `unknown`/`null`.

- [ ] **Step 4 : lancer, vérifier**

Run: `npx vitest run src/lib/externalAi && npm run typecheck`
Expected: exit 0

- [ ] **Step 5 : commit**

```bash
git add src/lib/externalAi/targets.ts src/lib/externalAi/targets.test.ts
git commit -m "feat(ia-externe): cibles (ChatGPT, Claude, Gemini, Perplexity, Grok), lancement presse-papiers + ?q=, préférences et trace"
```

---

### Task 3 : Feuille `ExternalAiSheet` + 4 points d'entrée

**Files:**
- Create: `app/src/features/simulation/ExternalAiSheet.tsx`
- Test: `app/src/features/simulation/ExternalAiSheet.test.tsx`
- Modify: `app/src/features/simulation/SimulationSetup.tsx` (carte « Avec ton IA » sous la carte des rôles), `app/src/features/simulation/SimulationRunner.tsx:~275` (chip « ✦ IA » à côté d'Aufklärung ; `ResultScreen` lien « Rejouer avec ton IA »), `app/src/features/cases/CaseDetailPage.tsx` (bouton d'en-tête)
- Modify: `app/src/store/ui.ts` (`externalAiCaseId: string | null; openExternalAi(caseId); closeExternalAi()`) — la feuille est montée une fois dans `Shell.tsx` (comme `GlossaryDrawer`)

**Interfaces:**
- Consumes: Tasks 1–2 ; `termsInOrder`/`linkedFachbegriffeIds` pour `topTerms` (8 premiers, texte `term`) ; `useCase(id)`, `useFachbegriffe()`
- Produces: `openExternalAi(caseId)` dans le store ; `<ExternalAiSheet />` global.

- [ ] **Step 1 : test qui échoue**

```tsx
// app/src/features/simulation/ExternalAiSheet.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/db/db';
import { useUi } from '@/store/ui';
import { ExternalAiSheet } from './ExternalAiSheet';

const launchMod = vi.hoisted(() => ({ launch: vi.fn(async () => ({ opened: true, copied: true, prefilled: true })) }));
vi.mock('@/lib/externalAi/targets', async (orig) => ({ ...(await orig<typeof import('@/lib/externalAi/targets')>()), launch: launchMod.launch }));

const c = { id: 'c1', name: 'Ulcus', pathology: 'ulcus', specialty: 'Gastroenterologie', patientSheet: { personalia: { name: 'Karl', age: 50 }, leitsymptome: ['Bauchweh'], begleitsymptome: [], antworten: {}, vegetativeAnamnese: [] }, medicalView: { verdachtsdiagnose: 'Ulcus ventriculi' }, examinerSheet: [], examinerQuestions: [], linkedFachbegriffeIds: ['fb-a'], probableAufklaerungIds: [], caseSpecificQuestions: [], centers: [], frequency: 1, difficulty: 1 };

describe('ExternalAiSheet', () => {
  beforeEach(async () => { await db.meta.clear(); await db.cases.clear(); await db.fachbegriffe.clear(); await db.cases.put(c as never); await db.fachbegriffe.put({ id: 'fb-a', term: 'Ulkus', translationSimple: 'Geschwür', specialty: 'Gastroenterologie', pathologyTags: [], centers: [], linkedCaseIds: [], srs: { interval: 0, easeFactor: 2.5, dueDate: 0, repetitions: 0, lapses: 0, state: 'Neu' } } as never); useUi.setState({ externalAiCaseId: 'c1' }); });

  it('affiche cibles, portée, aperçu ; « Ouvrir » lance avec la cible choisie, mémorise et pose la trace', async () => {
    render(<MemoryRouter><ExternalAiSheet /></MemoryRouter>);
    expect(await screen.findByRole('dialog', { name: /simuler avec ton ia/i })).toBeTruthy();
    fireEvent.click(screen.getByRole('radio', { name: /claude/i }));
    fireEvent.click(screen.getByRole('radio', { name: /anamnèse seule/i }));
    fireEvent.click(screen.getByRole('button', { name: /voir ce que ton ia recevra/i }));
    expect(screen.getByText(/Karl/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /ouvrir dans claude/i }));
    await waitFor(() => expect(launchMod.launch).toHaveBeenCalled());
    expect(launchMod.launch.mock.calls[0][0].id).toBe('claude');
    expect(launchMod.launch.mock.calls[0][1]).not.toContain('Fallvorstellung');
    await waitFor(async () => expect((await db.meta.get('externalAi.target'))?.value).toBe('claude'));
    expect((await db.meta.get('externalAi.pending'))?.value).toMatchObject({ caseId: 'c1', targetId: 'claude', scope: 'anamnese' });
    expect(await screen.findByText(/prompt copié/i)).toBeTruthy();
  });
  it('« Copier le prompt » n\'ouvre rien', async () => {
    const write = vi.fn().mockResolvedValue(undefined); Object.assign(navigator, { clipboard: { writeText: write } });
    render(<MemoryRouter><ExternalAiSheet /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /copier le prompt/i }));
    await waitFor(() => expect(write).toHaveBeenCalled());
    expect(launchMod.launch).not.toHaveBeenCalled();
  });
  it('Échap ferme', async () => {
    render(<MemoryRouter><ExternalAiSheet /></MemoryRouter>);
    await screen.findByRole('dialog'); fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(useUi.getState().externalAiCaseId).toBeNull());
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run src/features/simulation/ExternalAiSheet.test.tsx`
Expected: FAIL

- [ ] **Step 3 : implémentation**

`store/ui.ts` : ajouter `externalAiCaseId: null as string | null, openExternalAi: (caseId: string) => set({ externalAiCaseId: caseId }), closeExternalAi: () => set({ externalAiCaseId: null })` (types dans l'interface).

```tsx
// app/src/features/simulation/ExternalAiSheet.tsx
import { useEffect, useMemo, useState } from 'react';
import { useUi } from '@/store/ui';
import { useCase, useFachbegriffe } from '@/hooks/useData';
import { buildExternalPrompt, SCOPE_LABELS, type Scope, type FeedbackLang } from '@/lib/externalAi/prompt';
import { AI_TARGETS, launch, loadPrefs, savePrefs, setPending, type TargetId } from '@/lib/externalAi/targets';
import { termsInOrder } from '@/lib/collections/query';   // vérifier l'emplacement réel (F2a l'a créé ; grep "export function termsInOrder")

// Feuille unique « Simuler avec ton IA » — montée une fois dans Shell, ouverte
// par useUi.openExternalAi(caseId) depuis la pré-sim, le runner, la fiche du
// cas et l'écran de résultat. Le prompt est construit ici, à la volée.
export function ExternalAiSheet() {
  const caseId = useUi((s) => s.externalAiCaseId); const close = useUi((s) => s.closeExternalAi);
  const c = useCase(caseId ?? undefined); const begriffe = useFachbegriffe();
  const [target, setTarget] = useState<TargetId>('chatgpt'); const [scope, setScope] = useState<Scope>('exam+feedback'); const [lang, setLang] = useState<FeedbackLang>('fr');
  const [preview, setPreview] = useState(false); const [toast, setToast] = useState<string | null>(null);
  useEffect(() => { loadPrefs().then((p) => { setTarget(p.target); setScope(p.scope); setLang(p.feedbackLang); }); }, []);
  useEffect(() => { if (!caseId) return; const h = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); }; document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h); }, [caseId, close]);

  const topTerms = useMemo(() => (c && begriffe ? termsInOrder(c.linkedFachbegriffeIds, begriffe).slice(0, 8).map((t) => t.term) : []), [c, begriffe]);
  const prompt = useMemo(() => (c ? buildExternalPrompt({ c, scope, feedbackLang: lang, topTerms }) : ''), [c, scope, lang, topTerms]);
  if (!caseId || !c) return null;
  const t = AI_TARGETS.find((x) => x.id === target)!;

  const go = async () => {
    // Presse-papiers + window.open dans le gestionnaire du clic (mobile).
    const r = await launch(t, prompt);
    await Promise.all([savePrefs({ target, scope, feedbackLang: lang }), setPending({ caseId, targetId: target, scope, at: Date.now() })]);
    setToast(r.prefilled ? `Prompt copié · ${t.label} ouvert. ${t.voiceHint}` : `Prompt copié — colle-le dans ${t.label}. ${t.voiceHint}`);
  };
  const copyOnly = async () => { try { await navigator.clipboard.writeText(prompt); setToast('Prompt copié.'); } catch { setToast('Copie impossible — sélectionne le texte de l\'aperçu.'); setPreview(true); } };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-900/20" onClick={close} />
      <div role="dialog" aria-modal="true" aria-label="Simuler avec ton IA" className="glass fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[92vh] max-w-lg space-y-4 overflow-y-auto rounded-t-2xl p-4 sm:inset-auto sm:left-1/2 sm:top-[8vh] sm:-translate-x-1/2 sm:rounded-2xl">
        <div><div className="label">Simuler avec ton IA</div><h2 className="text-lg font-bold">{c.name}</h2>
          <p className="text-sm text-slate-500">Le personnage est prêt. Dans ton IA, active le mode vocal et salue le patient — dis « Fallvorstellung » pour passer à l'Oberarzt{scope === 'exam+feedback' ? ', « Feedback » pour le bilan' : ''}.</p></div>
        <div role="radiogroup" aria-label="IA" className="flex flex-wrap gap-2">
          {[t, ...AI_TARGETS.filter((x) => x.id !== target)].map((x) => (
            <label key={x.id} className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm ${x.id === target ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200' : 'border-slate-200 text-slate-600 dark:border-slate-700'}`}>
              <input type="radio" name="ai" className="sr-only" aria-label={x.label} checked={x.id === target} onChange={() => setTarget(x.id)} />
              <span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-[11px] font-bold text-white dark:bg-ink-600">{x.label[0]}</span>{x.label}
            </label>
          ))}
        </div>
        <div role="radiogroup" aria-label="Portée" className="grid grid-cols-3 gap-2 text-sm">
          {(Object.keys(SCOPE_LABELS) as Scope[]).map((s) => (
            <label key={s} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-xl border px-2 text-center ${s === scope ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30' : 'border-slate-200 dark:border-slate-700'}`}>
              <input type="radio" name="scope" className="sr-only" aria-label={SCOPE_LABELS[s]} checked={s === scope} onChange={() => setScope(s)} />{SCOPE_LABELS[s]}
            </label>
          ))}
        </div>
        {scope === 'exam+feedback' && (
          <div className="flex items-center gap-3 text-sm"><span className="label">Feedback en</span>
            {(['fr', 'de'] as FeedbackLang[]).map((l) => <button key={l} type="button" onClick={() => setLang(l)} className={`min-h-11 rounded-full px-3 ${lang === l ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>{l === 'fr' ? 'Français' : 'Deutsch'}</button>)}
          </div>
        )}
        <button type="button" onClick={() => setPreview((p) => !p)} className="btn-ghost text-sm">{preview ? 'Masquer l\'aperçu' : 'Voir ce que ton IA recevra'} · {prompt.length} car.</button>
        {preview && <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-900">{prompt}</pre>}
        {toast && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">{toast}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={copyOnly} className="btn-outline">Copier le prompt</button>
          <button type="button" onClick={go} className="btn-primary">Ouvrir dans {t.label}</button>
        </div>
      </div>
    </>
  );
}
```
Monter `<ExternalAiSheet />` dans `Shell.tsx` à côté de `<GlossaryDrawer />`.

Points d'entrée (chacun = un bouton qui appelle `openExternalAi(c.id)`) :
- `SimulationSetup.tsx` : après la carte des rôles, une `card p-4` : eyebrow « Autre façon de simuler », titre « Avec ton IA », texte « ChatGPT, Claude, Gemini… en vocal — le patient et l'Oberarzt sont prêts. », bouton `btn-outline` « Simuler avec ton IA » (icône `spark`).
- `SimulationRunner.tsx` : dans la rangée QR / Aufklärung : `<button onClick={() => openExternalAi(c.id)} className="chip …" title="Continuer ou rejouer ce cas avec ton IA"><Icon name="spark" className="h-3.5 w-3.5" />IA</button>` ; dans `ResultScreen` : `<button className="btn-outline" onClick={() => openExternalAi(c.id)}>Rejouer avec ton IA</button>`.
- `CaseDetailPage.tsx` : bouton secondaire d'en-tête « Simuler avec ton IA ».
Un test composant léger pour chaque point d'entrée n'est pas exigé ; le test de la feuille couvre le comportement, la preuve navigateur (Task 5) couvre les 4 boutons.

- [ ] **Step 4 : lancer, vérifier**

Run: `npx vitest run src/features/simulation/ExternalAiSheet.test.tsx && npx vitest run --dir src && npm run typecheck && npm run build`
Expected: exit 0

- [ ] **Step 5 : commit**

```bash
git add src/store/ui.ts src/features/simulation/ExternalAiSheet.tsx src/features/simulation/ExternalAiSheet.test.tsx src/components/Shell.tsx src/features/simulation/SimulationSetup.tsx src/features/simulation/SimulationRunner.tsx src/features/cases/CaseDetailPage.tsx
git commit -m "feat(ia-externe): feuille « Simuler avec ton IA » (cible, portée, aperçu, ouvrir/copier) et ses 4 points d'entrée"
```

---

### Task 4 : Retour et trace — sauvegarde extraite, carte « Tu as simulé… », badge

**Files:**
- Create: `app/src/lib/simulationSave.ts` (extraction de `finishSimulation` sans changement de comportement)
- Modify: `app/src/features/simulation/SimulationRunner.tsx:178-210` (utilise `saveSimulation`)
- Modify: `app/src/db/types.ts` (`SimulationMode` + `'external-ai'`, `Simulation.externalTarget?`)
- Create: `app/src/features/simulation/PendingExternalSimCard.tsx`
- Modify: `app/src/features/home/HomePage.tsx` (carte sous `MigrationPrompt`), `app/src/features/cases/CaseDetailPage.tsx` (carte en tête si pending du même cas)
- Modify: historique (composant qui liste `useSimulations()` — `grep -rl "useSimulations()" src/features`) : badge « IA externe » quand `mode === 'external-ai'`
- Modify: `docs/contracts/sync-protocol.md` (note payload `simulation.completed` : `mode`/`externalTarget`) — rôle `arch`
- Test: `app/src/lib/simulationSave.test.ts`, `app/src/features/simulation/PendingExternalSimCard.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  // lib/simulationSave.ts
  export interface SaveInput { c: Case; parts: Partial<Record<Part, PartResult>>; notes?: string; bogen?: unknown; arztbriefText?: string; assistance: AssistanceMode; layer: Layer; muster?: unknown; scope?: 'teil' | 'full'; teil?: Part; mode?: SimulationMode; externalTarget?: TargetId }
  export async function saveSimulation(i: SaveInput): Promise<Simulation>;   // put + syncQueue.push(simulation.completed) + confiance/statut du cas + case.layer_reached ; NE touche pas useSimSession
  ```

- [ ] **Step 1 : tests qui échouent**

```ts
// app/src/lib/simulationSave.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@/db/db';
import { saveSimulation } from './simulationSave';
vi.mock('@/lib/sync/queue', async () => { const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events'); return { syncQueue: { push: vi.fn(async (i: { type: string; subject_id: string | null; payload: unknown }) => { const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...i } as never; await db.progress_events.put(ev); return ev; }) } }; });
vi.mock('@/lib/supabase', () => ({ supabase: {}, callFn: vi.fn() }));

const c = { id: 'c1', name: 'X', pathology: 'x', specialty: 'X', linkedFachbegriffeIds: [], probableAufklaerungIds: [], caseSpecificQuestions: [], centers: [], frequency: 1, difficulty: 1, patientSheet: { personalia: { name: 'A', age: 1 }, leitsymptome: [], begleitsymptome: [], antworten: {}, vegetativeAnamnese: [] }, medicalView: {} } as never;
const part = { done: true, checklist: [], feeling: 70, durationSec: 600 } as never;

describe('saveSimulation', () => {
  beforeEach(async () => { await db.simulations.clear(); await db.progress_events.clear(); await db.cases.clear(); await db.cases.put(c); });
  it('external-ai : enregistre, émet simulation.completed avec mode/externalTarget, met à jour la confiance du cas', async () => {
    const sim = await saveSimulation({ c, parts: { anamnese: part }, assistance: 'autonome', layer: 1 as never, mode: 'external-ai', externalTarget: 'chatgpt' });
    expect(sim.mode).toBe('external-ai'); expect(sim.externalTarget).toBe('chatgpt');
    expect(await db.simulations.get(sim.id)).toBeTruthy();
    const ev = (await db.progress_events.toArray()).find((e) => e.type === 'simulation.completed');
    expect((ev?.payload as { mode?: string }).mode).toBe('external-ai');
    const updated = await db.cases.get('c1'); expect(updated?.lastSimulationId).toBe(sim.id); expect(typeof updated?.confidence).toBe('number');
  });
});
```

```tsx
// app/src/features/simulation/PendingExternalSimCard.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { db } from '@/db/db';
import { setPending } from '@/lib/externalAi/targets';
import { PendingExternalSimCard } from './PendingExternalSimCard';
vi.mock('@/lib/sync/queue', async () => { const { db } = await import('@/db/db'); const { newId } = await import('@/lib/sync/events'); return { syncQueue: { push: vi.fn(async (i: { type: string; subject_id: string | null; payload: unknown }) => { const ev = { id: newId(), user_id: 'u', occurred_at: new Date().toISOString(), ...i } as never; await db.progress_events.put(ev); return ev; }) } }; });
vi.mock('@/lib/supabase', () => ({ supabase: {}, callFn: vi.fn() }));
const c = { id: 'c1', name: 'Ulcus', pathology: 'x', specialty: 'X', linkedFachbegriffeIds: [], probableAufklaerungIds: [], caseSpecificQuestions: [], centers: [], frequency: 1, difficulty: 1, patientSheet: { personalia: { name: 'A', age: 1 }, leitsymptome: [], begleitsymptome: [], antworten: {}, vegetativeAnamnese: [] }, medicalView: {} } as never;

describe('PendingExternalSimCard', () => {
  beforeEach(async () => { await db.meta.clear(); await db.simulations.clear(); await db.cases.clear(); await db.cases.put(c); });
  it('absente sans trace ; présente avec trace ; « Ce n\'était pas une simulation » efface', async () => {
    const { rerender } = render(<MemoryRouter><PendingExternalSimCard /></MemoryRouter>);
    expect(screen.queryByText(/tu as simulé/i)).toBeNull();
    await setPending({ caseId: 'c1', targetId: 'chatgpt', scope: 'exam', at: Date.now() });
    rerender(<MemoryRouter><PendingExternalSimCard /></MemoryRouter>);
    expect(await screen.findByText(/tu as simulé/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /pas une simulation/i }));
    await waitFor(async () => expect((await db.meta.get('externalAi.pending'))?.value ?? null).toBeNull());
  });
  it('« Évaluer » → PartEvaluation → enregistre une simulation external-ai et efface la trace', async () => {
    await setPending({ caseId: 'c1', targetId: 'claude', scope: 'anamnese', at: Date.now() });
    render(<MemoryRouter><PendingExternalSimCard /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: /évaluer/i }));
    fireEvent.click(await screen.findByRole('button', { name: /enregistrer|valider/i }));   // bouton de PartEvaluation — vérifier son libellé réel
    await waitFor(async () => expect(await db.simulations.count()).toBe(1));
    const sim = (await db.simulations.toArray())[0]; expect(sim.mode).toBe('external-ai'); expect(sim.externalTarget).toBe('claude');
    expect((await db.meta.get('externalAi.pending'))?.value ?? null).toBeNull();
  });
});
```

- [ ] **Step 2 : lancer, vérifier l'échec**

Run: `npx vitest run src/lib/simulationSave.test.ts src/features/simulation/PendingExternalSimCard.test.tsx`
Expected: FAIL — modules introuvables

- [ ] **Step 3 : implémentation**

`types.ts` : `export type SimulationMode = 'texte' | 'tts' | 'vocal' | 'external-ai';` et dans `Simulation` : `externalTarget?: 'chatgpt' | 'claude' | 'gemini' | 'perplexity' | 'grok';`.

```ts
// app/src/lib/simulationSave.ts
// Sauvegarde d'une simulation — extraite du runner SANS changement de
// comportement, pour être partagée avec le retour d'une simulation IA externe.
import { db } from '@/db/db';
import { syncQueue } from '@/lib/sync/queue';
import { buildCorrections, partScore, caseMastery } from '@/lib/scoring';   // vérifier les emplacements réels de ces trois fonctions (grep dans SimulationRunner.tsx imports)
import type { Case, Simulation, PartResult, AssistanceMode, Layer, SimulationMode } from '@/db/types';
type Part = 'anamnese' | 'dokumentation' | 'fallvorstellung' | 'aufklaerung';

export interface SaveInput { c: Case; parts: Partial<Record<Part, PartResult>>; notes?: string; bogen?: unknown; arztbriefText?: string; assistance: AssistanceMode; layer: Layer; muster?: unknown; scope?: 'teil' | 'full'; teil?: Part; mode?: SimulationMode; externalTarget?: Simulation['externalTarget'] }

export async function saveSimulation(i: SaveInput): Promise<Simulation> {
  const parts = { ...i.parts };
  const sim: Simulation = {
    id: `sim-${Date.now()}`, caseId: i.c.id, date: Date.now(), parts,
    notes: i.notes, bogen: i.bogen, arztbriefText: i.arztbriefText,
    prioritizedCorrections: buildCorrections(parts),
    passed: Object.values(parts).filter((p) => p?.done).every((p) => partScore(p!) >= 60),
    assistance: i.assistance, layer: i.layer, muster: i.muster,
    scope: i.scope ?? 'full', teil: i.teil,
    ...(i.mode ? { mode: i.mode } : {}), ...(i.externalTarget ? { externalTarget: i.externalTarget } : {}),
  } as Simulation;
  await db.simulations.put(sim);
  syncQueue.push({ type: 'simulation.completed', subject_id: i.c.id, payload: sim }).catch((e) => console.warn('[sync]', e));
  const done = Object.values(parts).filter((p): p is PartResult => !!p?.done);
  if (done.length) {
    const prior = await db.simulations.where('caseId').equals(i.c.id).toArray();
    const mastery = caseMastery(prior, i.c.id, sim).score ?? 0;
    const conf = Math.round(mastery * (i.assistance === 'autonome' ? 1 : 0.9));
    const status = conf >= 80 ? 'Maîtrisé' : conf >= 40 ? 'En cours' : 'À faire';
    await db.cases.update(i.c.id, { confidence: conf, status, lastSimulationId: sim.id, layerProgress: i.layer });
    syncQueue.push({ type: 'case.layer_reached', subject_id: i.c.id, payload: { layer: i.layer } }).catch((e) => console.warn('[sync]', e));
  }
  return sim;
}
```
Dans le runner, `finishSimulation` devient : `const sim = await saveSimulation({ c, parts: results, notes, bogen, arztbriefText, assistance, layer, muster, scope: teil ? 'teil' : 'full', teil: teil ?? undefined }); useSimSession.getState().end(); setFinished(sim);` — copier les types exacts des variables locales (`notes`, `bogen`, `muster`) depuis le runner ; comparer le `sim` produit avant/après sur un cas (test existant du runner s'il y en a un, sinon la preuve navigateur).

```tsx
// app/src/features/simulation/PendingExternalSimCard.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '@/db/db';
import { getPending, setPending, AI_TARGETS, type PendingExternalSim } from '@/lib/externalAi/targets';
import { PartEvaluation } from './PartEvaluation';
import { saveSimulation } from '@/lib/simulationSave';
import type { Case, PartResult } from '@/db/types';

// Carte de retour après une simulation avec une IA externe : la séance ne
// compte que si le candidat s'auto-évalue (même grille que le runner).
export function PendingExternalSimCard({ onlyCaseId }: { onlyCaseId?: string } = {}) {
  const [p, setP] = useState<PendingExternalSim | null>(null); const [c, setC] = useState<Case | null>(null);
  const [step, setStep] = useState<'idle' | 'anamnese' | 'fallvorstellung'>('idle'); const [parts, setParts] = useState<Partial<Record<'anamnese' | 'fallvorstellung', PartResult>>>({});
  const reload = async () => { const x = await getPending(); if (!x || Date.now() - x.at > 12 * 3600_000 || (onlyCaseId && x.caseId !== onlyCaseId)) { setP(null); return; } setP(x); setC((await db.cases.get(x.caseId)) ?? null); };
  useEffect(() => { void reload(); const h = () => { if (document.visibilityState === 'visible') void reload(); }; document.addEventListener('visibilitychange', h); return () => document.removeEventListener('visibilitychange', h); }, [onlyCaseId]);
  if (!p || !c) return null;
  const target = AI_TARGETS.find((t) => t.id === p.targetId)?.label ?? p.targetId;
  const dismiss = async () => { await setPending(null); setP(null); };
  const finish = async (all: typeof parts) => { await saveSimulation({ c, parts: all, assistance: 'autonome', layer: (c.layerProgress ?? 1) as never, mode: 'external-ai', externalTarget: p.targetId, scope: 'full' }); await setPending(null); setP(null); setStep('idle'); };
  if (step !== 'idle') {
    return <PartEvaluation part={step} durationSec={0} onCancel={() => setStep('idle')} onSave={(r) => { const next = { ...parts, [step]: r }; setParts(next); if (step === 'anamnese' && p.scope !== 'anamnese') setStep('fallvorstellung'); else void finish(next); }} />;
  }
  return (
    <section className="card flex flex-wrap items-center justify-between gap-3 p-4">
      <div><div className="label">Simulation avec ton IA</div><p className="font-semibold">Tu as simulé <Link to={`/cas/${c.id}`} className="text-brand-600">{c.name}</Link> avec {target} — comment ça s'est passé ?</p></div>
      <div className="flex gap-2"><button type="button" onClick={() => setStep('anamnese')} className="btn-primary">Évaluer</button><button type="button" onClick={dismiss} className="btn-ghost text-sm">Ce n'était pas une simulation</button></div>
    </section>
  );
}
```
Vérifier les libellés réels des boutons de `PartEvaluation` et la signature de `caseMastery`/`layerProgress`. Historique : là où les simulations sont listées, ajouter `{sim.mode === 'external-ai' && <span className="chip bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">IA externe{sim.externalTarget ? ` · ${sim.externalTarget}` : ''}</span>}`.

`sync-protocol.md` : sous « Synchronisé », après `simulation.completed`, ajouter « (payload = `Simulation` ; `mode` peut valoir `'external-ai'` avec `externalTarget`, séance auto-évaluée après une simulation dans une IA externe — spec 2026-09-17-external-ai) ».

- [ ] **Step 4 : lancer, vérifier**

Run: `npx vitest run src/lib/simulationSave.test.ts src/features/simulation && npx vitest run --dir src && npm run typecheck && npm run build`
Expected: exit 0

- [ ] **Step 5 : commit**

```bash
git add src/db/types.ts src/lib/simulationSave.ts src/lib/simulationSave.test.ts src/features/simulation/SimulationRunner.tsx src/features/simulation/PendingExternalSimCard.tsx src/features/simulation/PendingExternalSimCard.test.tsx src/features/home/HomePage.tsx src/features/cases/CaseDetailPage.tsx docs/contracts/sync-protocol.md
git add <fichier historique modifié>
git commit -m "feat(ia-externe): retour — carte « Tu as simulé… », auto-évaluation, simulation external-ai ; sauvegarde extraite du runner ; badge historique"
```

---

### Task 5 : Relecture de langue, docs, preuve navigateur

**Files:**
- Create: `app/scripts/e2e/external-ai.spec.md`
- Modify: `CONTEXT.md` (vocabulaire : « IA externe », « portée »), `app/docs/PRODUCT-VISION.md` §3 point 12 (une ligne : bascule vers l'IA du candidat livrée en attendant #13)

- [ ] **Step 1 : relecture allemande** — dispatcher `fsp-language-reviewer` (Sonnet) sur `src/lib/externalAi/prompt.ts` (gabarit) + 3 prompts générés (cas gastro, cardio, psy, écrits dans le scratchpad) : registre, orthographe, clarté des consignes ; appliquer les corrections (un fixeur), re-vérifier les tests.
- [ ] **Step 2 : docs** — `CONTEXT.md` : « **IA externe** : simulation jouée dans l'app d'IA du candidat (ChatGPT, Claude, Gemini, Perplexity, Grok) avec un prompt généré depuis le Rollenskript ; **portée** : anamnèse seule / examen complet / + feedback ; la séance compte après auto-évaluation (`mode: 'external-ai'`). » ; vision §3.12 : une phrase.
- [ ] **Step 3 : navigateur** (playwright-cli, dev server port libre, compte premium local) — AC-5 : les 4 points d'entrée ouvrent la feuille (pré-sim, runner, fiche du cas, résultat) ; AC-4/AC-7 : stub `window.open` dans la page (`window.open = (u) => { window.__opened = u; }`) et `navigator.clipboard.writeText` → cliquer « Ouvrir dans ChatGPT » → `__opened` commence par `https://chatgpt.com/?q=` et contient `Nenne%20nie` ; Gemini → `https://gemini.google.com/app` ; viewport 390 px sans débordement ; AC-6 : après lancement, recharger l'accueil → carte « Tu as simulé… » → Évaluer → historique montre le badge « IA externe ». Consigner valeurs et captures.
- [ ] **Step 4 : commit**

```bash
git add scripts/e2e/external-ai.spec.md CONTEXT.md docs/PRODUCT-VISION.md
git commit -m "docs(ia-externe): vocabulaire, vision ; preuve navigateur AC-4/5/6/7"
```

---

### Task 6 : Fin de branche

- [ ] Gates complets (avec et sans `.env`) ; `quality-branch-reviewer` (Opus) ; `direction-keeper` (raisonnement sur le cas, zéro doublon, concision des textes de la feuille) ; `ux-user-advocate` (persona : « je veux parler à mon patient ce soir dans ChatGPT ») ; `front-design-keeper` (feuille, chip, carte). Un fixeur, re-revue.
- [ ] PR `gh pr create --base main --title "feat: Simuler avec ton IA — patient/Oberarzt/feedback prêts pour ChatGPT, Claude, Gemini… (spec 2026-09-17)"`, CI verte, merge par la direction ; aucune migration ni fonction à déployer ; Pages se redéploie.
- [ ] Test de fumée manuel documenté dans le spec.md : ouvrir réellement ChatGPT et Claude avec un cas, vérifier que le prompt arrive et que le patient répond en rôle (la direction le fait ; l'agent ne peut pas).
