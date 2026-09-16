# Plan — Prüfungstag-Simulator + Bereitschaftsindex (sous-projet #2, epic #3)

> Auteur `plan-pruefungstag` · 2026-09-16 · étape 3 · spec `docs/superpowers/specs/2026-09-16-pruefungstag-design.md` (085a3b0) · avis `docs/specs/pedagogy/2026-09-16-bereitschaftsindex-review.md` · contrats `docs/contracts/sync-protocol.md` § exam_day.completed (b6bf646) · rapport arch `.superpowers/teams/pruefungstag/reports/arch.md`.
> Briefs autonomes par tâche : `.superpowers/teams/pruefungstag/briefs/tasks/T<n>.md`. Worktree : `doctopus-pruefungstag`, branche `feat/pruefungstag`.

## 0. Décisions du lead intégrées (non rediscutées)

- `withSimulant` = **déclaration** au setup (case « Ich habe einen Simulanten »). Aucune détection.
- **Ordre de livraison** : `z.enum` de la fonction `events` (T10, code) et la migration `20260916000010_exam_day_event.sql` sont appliqués sur la base vivante (`psql`) + fonction déployée **avant merge** (T26 « ship-prereq »). Le client n'émet `exam_day.completed` qu'une fois T26 fait.
- Points d'entrée hors périmètre (1 import + 1 ligne JSX chacun) : 2 routes `main.tsx`, `<ReadinessCard />` dans `HomePage`, bouton dans `SimulationHub`, early-return « mode examen » dans `SimulationRunner.tsx`.
- Nouveau code : `app/src/lib/readiness/` (module, `index.ts` ré-exporte), `app/src/features/readiness/`, `app/src/features/simulation/examDay*`. Fichiers < 500 lignes. TDD vitest. Navigateur : `playwright-cli` headless, DOM de l'app.

## 1. Décisions de plan (faits vérifiés dans le code)

| # | Décision | Fait / motif |
|---|---|---|
| P1 | `outsidePlan` se calcule contre une constante `CORPUS_SPECIALTIES` (16) et non contre `cases` : sur un appareil Free, Dexie ne contient que les 12 cas du tier (`applyContent` purge par tier). | `seedCases.ts` : 16 spécialités distinctes (les 18 du type `Specialty` moins `Anatomie`, `Allgemein`) ; 12 cas `tier: 1`. `ReadinessInput` garde `cases`/`visibleCases` (contrat) — sur le client les deux = `db.cases`. |
| P2 | **`ImmersiveMode` n'est pas monté** en Prüfungstag. | Il rend les chapitres du guide (`adaptChaptersForCase`, `VORSTELLUNG_CHAPTERS`) = aide interdite §5.3. Le spec dit « disponible, mêmes restrictions » : impossible sans toucher `ImmersiveMode.tsx` (hors périmètre). Écart signalé au lead ; ticket de suite. |
| P3 | Reprise : le runner examen synchronise un `SessionSnapshot` minimal dans `useSimSession` (pour la barre « reprendre » existante, qui navigue vers `/simulation/:caseId/run`) ; l'early-return de `SimulationRunner` s'active si `?modus=pruefungstag` **ou** si `useExamDaySession` porte une session pour ce `caseId`. | `ResumeSessionBar.tsx` l.4 ; aucune modification de la barre. |
| P4 | Bascule fiche simulant en P3 (`exam-phase`) : **hors périmètre** (`usePatientSync.ts` non autorisé). V1 : le setup et la fiche imprimable disent au simulant « quand le candidat te présente le cas, ouvre l'onglet Examinateur » (onglet existant dans `PatientScreen`). Ticket de suite T-S5. | `PatientScreen.tsx` l.19 : `tab` local. |
| P5 | Aucun sélecteur `[data-guide]`/`[data-muster]`/`.autolink` n'existe dans le code. Le verrouillage est prouvé **mécaniquement** : `checkExamDay.mjs` interdit dans `examDay*.tsx` tout import de `AnamneseGuide`, `VorstellungGuide`, `ArztbriefGuide`, `MusterCard`, `ImmersiveMode`, `KommunikationPanel`, `AutoLink`, `PatientSheetView`, `ExaminerSheetView`, `checklists` ; la sonde DOM vérifie l'absence des textes racines de ces composants. | Preuve par code de sortie (CI) + sonde. |
| P6 | CA-13 : le grep « `20 * 60` / `1200` » est scopé à `examDay*` et `features/readiness/` (le Runner entraînement en contient légitimement). | `SimulationRunner.tsx` l.28-31. |
| P7 | Historique = `computeBereitschaftsindex` rejoué à la fin de chacune des 12 dernières semaines (sims filtrées `date ≤ weekEnd`, `now = weekEnd`). Projection = régression linéaire sur les ≤ 4 derniers points, extrapolée à `ProgramConfig.examDate`, bornée 0..100 et **≤ 79 si plafonné**, étiquetée « si tu continues au même rythme ». | Le spec ne définit pas la projection : hypothèse de plan, à valider par lead à G-plan. |
| P8 | Session Prüfungstag = store zustand `persist` dédié (`examDaySession.ts`, clé `fsp-exam-day`), pas le snapshot entraînement (qui porte `elapsed` = compteur, incompatible avec D3). | `simSession.ts` l.11-24. |
| P9 | Le tirage utilise `db.cases` (déjà filtré par tier) ; « tier du plan » = le contenu présent. | `loader.ts` l.35-49. |

## 2. Tranches et tâches

Agents : `sim-engine-engineer` (moteur, horloge, verrouillage, évaluation), `front-implementer` (écrans), `platform-sync-engineer` (émission, projection, Edge Function, CI). Modèle **Sonnet** sauf mention. Chaque tâche = test d'abord, puis code, puis `npm test` + `npm run typecheck` (code de sortie 0). Un implémenteur par tâche, fichier par fichier ; un relecteur (`quality-task-reviewer`, Opus) après chaque tâche.

### Tranche 1 — Fondations de l'indice (issue #24) · CI attendue : `npm test`, `typecheck`, `checkExamDay.mjs` verts

**T1 — `lib/readiness.ts` → module** · sim-engine-engineer · CA-12
- Fichiers : `git mv app/src/lib/readiness.ts app/src/lib/readiness/index.ts` ; imports relatifs `./scoring` → `../scoring`.
- Test d'abord : `app/src/lib/readiness/index.test.ts` — `computeReadiness([], [], [])` retourne `{ global: 0, verdict: 'Pas encore' }`, `byAxis.length === 6` (snapshot du comportement actuel).
- DoD : `HomePage`/`StatsPage` inchangés ; `grep -rn "from '@/lib/readiness'"` compile ; test vert.

**T2 — `bereitschaft.ts` : types, poids, constantes** · sim-engine-engineer · CA-7
- Créer `app/src/lib/readiness/bereitschaft.ts` avec les interfaces §6.3 du spec (`ReadinessInput`, `Bereitschaft`, `ReadinessAction`), `CORPUS_SPECIALTIES: Specialty[]` (16), `DAY = 86_400_000`.
- ```ts
  export function sourceWeight(sim: Simulation): 3 | 2 | 1 {
    if (sim.context === 'pruefungstag' && sim.withSimulant === true) return 3;
    return sim.assistance === 'autonome' || sim.context === 'pruefungstag' ? 2 : 1;
  }
  export function recencyWeight(simDate: number, now: number): 1 | 0.5 | 0.25 {
    const d = (now - simDate) / DAY; return d < 30 ? 1 : d < 90 ? 0.5 : 0.25;
  }
  export const isDemoSim = (s: Simulation) => s.id.startsWith('sim-demo-');
  ```
- Test d'abord `bereitschaft.test.ts` : 6 cas de `sourceWeight` (dont solo → 2), 3 bornes de `recencyWeight` (29 j, 30 j, 90 j), `isDemoSim`.

**T3 — `computeS`** · sim-engine-engineer · CA-7
- ```ts
  export type ExamAxis = 'Anamnese' | 'Dokumentation' | 'Fallvorstellung';
  export function computeS(sims: Simulation[], now: number): Bereitschaft['s']
  // pool Anamnese = parts.anamnese (w) + parts.aufklaerung (w × 0.5) ; score = weightedPartScore(res, { assistance: sim.assistance ?? 'assiste', layer: sim.layer ?? 1 })
  // axis = Σ(w·score)/Σw | null ; byAxis[].tested = axis !== null ; value = mean(axis ?? 0) arrondi
  ```
- Test : 1 sim autonome < 30 j avec anamnese=80 seulement → `byAxis` = [80 tested, 0 untested, 0 untested], `value = 27` ; Aufklärung seule → axe Anamnese testé ; poids 3 vs 1 sur deux sims (attendu à l'unité près) ; `weights` = `{ pruefungstag: 3, autonome: 2, assiste: 1 }`.

**T4 — `computeC`** · sim-engine-engineer · CA-7, CA-8
- ```ts
  export function computeC(sims: Simulation[], cases: Case[], visibleCases: Case[]): Bereitschaft['c']
  // F(s) = Σ frequency des visibleCases de s ; couverte si ∃ sim (context==='pruefungstag' || assistance==='autonome') && simulationPassed(sim) sur un cas de s
  // value = round(100·ΣF(couvertes)/ΣF(toutes)) ; missing = [{specialty, share: F(s)/ΣF}] tri desc ; outsidePlan = CORPUS_SPECIALTIES − spec(visibleCases) ; denominator = nb spécialités du plan ; corpusTotal = 16
  ```
- Test : 2 spécialités (freq 10 et 30), une couverte → 25 ou 75 selon laquelle ; sim assistée réussie ne couvre pas ; sim autonome échouée ne couvre pas ; `outsidePlan` = 14 avec 2 spécialités visibles ; `ΣF = 0` → `value = 0`, pas de NaN.

**T5 — `computeL`** · sim-engine-engineer · CA-7
- ```ts
  export function computeL(sims: Simulation[]): Bereitschaft['l']
  // parties orales (anamnese|fallvorstellung|aufklaerung) avec languageGrid, triées par sim.date puis ordre fixe ; last5 ; base = mean(officialPct) ; trend (si 5) = mean(3 dernières) − mean(3 premières) → +5 | −5 | 0 ; value = clamp(base+trend) ; si samples < 3 → min(value, 30)
  ```
- Test : 0 → `{value:0, samples:0}` ; 2 échantillons à 90 → 30 ; 3 à 70 → 70, trend 0 ; 5 montants (50,55,60,70,80) → base 63, trend +5 → 68 ; 5 descendants → −5 ; 6 échantillons → seuls les 5 derniers.

**T6 — `computeBereitschaftsindex`** · sim-engine-engineer · **Opus** (assemblage + plafond + explications : la moindre erreur d'unité rend l'indice faux pour tous) · CA-7, CA-11
- ```ts
  export function computeBereitschaftsindex(input: ReadinessInput, now = Date.now()): Bereitschaft {
    const sims = input.sims.filter((s) => !isDemoSim(s));
    const s = computeS(sims, now), c = computeC(sims, input.cases, input.visibleCases), l = computeL(sims);
    const raw = Math.round(0.5 * s.value + 0.25 * c.value + 0.25 * l.value);
    const qualifying = sims.filter((x) => x.context === 'pruefungstag' && x.withSimulant === true && simulationPassed(x) && now - x.date < 30 * DAY);
    const capped = qualifying.length ? 'none' : 'no_recent_exam_day';
    const capExpiresAt = qualifying.length ? Math.max(...qualifying.map((x) => x.date)) + 30 * DAY : null;
    const value = capped === 'none' ? raw : Math.min(raw, 79);
    const margins = { s: 0.5 * (100 - s.value), c: 0.25 * (100 - c.value), l: 0.25 * (100 - l.value) };
    const leverage = (['s', 'c', 'l'] as const).reduce((a, b) => (margins[b] > margins[a] ? b : a));
    return { value, verdict: verdictFor(value), capped, capExpiresAt, leverage, s, c, l, explain: explain(s, c, l, capped, capExpiresAt), actions: computeActions(input, now) };
  }
  ```
  `verdictFor` = seuils existants (≥80 Prêt, ≥65 Presque prêt, ≥40 En route). `explain` = 4 phrases §6.1 avec valeurs (en allemand, ton de la charte, « — nicht getestet » pour un axe non testé).
- Test : jeu de données de référence calculé à la main dans le test (commentaire ligne à ligne) → `value` exact ; plafond 79 avec `raw = 85` sans PT ; PT solo réussi → toujours 79 ; PT avec simulant réussi il y a 10 j → 85, `capExpiresAt = date + 30 j` ; PT à 31 j → plafonné ; `sim-demo-*` ignorées ; deux appels = deux résultats `toEqual`.

**T7 — `computeActions`** · sim-engine-engineer · CA-10
- ```ts
  export function computeActions(input: ReadinessInput, now: number): ReadinessAction[]
  // hypothèses (copies profondes, jamais de mutation) : 'exam_day' = ajouter une sim {context:'pruefungstag', withSimulant:true, 3 parties à 70 %, date: now} ;
  // 'cover_specialty' (par spécialité manquante, top 3 par share) = ajouter une sim autonome réussie à 70 % sur le cas le plus fréquent de s ;
  // 'axis' (axe non testé ou le plus bas) = ajouter une partie autonome à 70 % ; 'language' = 3 parties orales à officialPct 70
  // gain = computeBereitschaftsindex(hyp, now).value − base.value, ≥ 0 (max(0, …)) ; tri desc ; slice(0, 5) ; garder ≥ 3
  ```
  Garde anti-récursion : `computeBereitschaftsindex` prend `opts?: { withActions?: boolean }` (défaut `true`), `computeActions` appelle avec `false`.
- Test : gains ≥ 0, triés desc, 3 ≤ n ≤ 5, entrée non mutée (`toEqual` avant/après), `exam_day` présent quand plafonné.

**T8 — `history.ts` : historique + projection (Pro)** · sim-engine-engineer · CA-9
- `app/src/lib/readiness/history.ts` : `bereitschaftHistory(input, now, weeks = 12): { weekEnd: number; value: number }[]` ; `projectBereitschaft(history, examDate: number, capped: boolean): { value: number; atExamDate: number; basis: 'trend' | 'insufficient' } | null` (P7).
- Test : 12 points, monotone quand les sims s'accumulent ; projection bornée, ≤ 79 si `capped` ; `< 2` points → `basis: 'insufficient'`.

**T9 — `checkExamDay.mjs` + CI** · platform-sync-engineer · CA-13, CA-17, P5
- `app/scripts/checkExamDay.mjs` : sur `app/src/features/simulation/examDay*.{ts,tsx}` et `app/src/features/readiness/**` : (a) `import` interdits (liste P5) ; (b) `/\b(20|12|5)\s*\*\s*60\b|\b1200\b/` interdit hors `examDayPlan.ts` ; (c) `/\bNotification\b|\.push\(\s*['"]notif|mail|sendEmail/` interdit (le `syncQueue.push` est autorisé : regex ancrée sur `new Notification`/`Notification.`/`mail`). Sortie 1 avec la ligne fautive.
- `.github/workflows/quality.yml` : étape `node scripts/checkExamDay.mjs` après `checkAllergyConflicts`. `package.json` : script `check:examday`.
- Test : fixture temporaire dans le script (`--self-test`) qui échoue sur un fichier fautif et passe sur un fichier sain.

**T10 — Edge Function `events` : `z.enum` + test** · platform-sync-engineer · CA-6 (prérequis)
- `app/supabase/functions/events/index.ts` l.7 : ajouter `'exam_day.completed'`.
- Test d'abord `app/supabase/tests/events.test.ts` : lot mixte `[plan.done, exam_day.completed]` → `acked` = 2 ids ; `type: 'bogus'` → réponse d'erreur (400) ; skip si `SUPABASE` local absent (comme les tests voisins). Vérifier via `npm run db:test` (exit 0) en local avec `supabase start`.
- Note : **code seulement** ; le déploiement est T26.

### Tranche 2 — Moteur Prüfungstag, pur (issue #25) · CI : tests T11–T16 verts

**T11 — `examDayPlan.ts`** · sim-engine-engineer · CA-1, CA-13
- ```ts
  export type ExamDayPart = 'anamnese' | 'dokumentation' | 'fallvorstellung';
  export type ExamDayPhase = ExamDayPart | 'transition' | 'evaluation' | 'result';
  export interface ExamDayPlan { land: 'BW'; parts: { key: ExamDayPart; label: string; targetSec: number; source: string }[]; transitionSec: number; alertsSec: number[]; purgeAfterMs: number; excludePlayedWithinMs: number; p3Note: string }
  export const EXAM_DAY_PLAN: Record<'BW', ExamDayPlan> = { BW: { parts: [{ key:'anamnese', label:'Anamnese', targetSec: 20*60, source:'ANALYSE.md l.31' }, …], transitionSec: 60, alertsSec: [300, 60], purgeAfterMs: 24*60*60*1000, excludePlayedWithinMs: 14*DAY, p3Note: '≈ 15 min Arzt-Arzt-Gespräch + ≈ 5 min Fachbegriffe-Liste (BW)' } };
  export const ORDER: ExamDayPart[] = ['anamnese','dokumentation','fallvorstellung'];
  ```
- Test : 3 parties à 1200 s ; `transitionSec ≤ 60` ; label du Land = 'BW'.

**T12 — `examDayPick.ts`** · sim-engine-engineer · CA-3
- ```ts
  export function pickExamDayCase(cases: Case[], sims: Simulation[], now: number, rng: () => number = Math.random): Case | null
  // éligibles = cases sans sim (context quelconque) avec now − date < 14 j ; si vide → toutes ; si vide → null ; tirage pondéré par max(frequency, 1)
  ```
- Test : rng injecté à 0 / 0.99 → cas attendu ; exclusion 13 j vs 15 j ; relâchement si tout joué ; `[]` → null.

**T13 — `examDayClock.ts`** · sim-engine-engineer · CA-1, CA-4
- ```ts
  export function remainingSec(startedAt: number, targetSec: number, now: number): number {
    if (now < startedAt) return 0;                      // horloge reculée = échu
    return Math.max(0, targetSec - Math.floor((now - startedAt) / 1000));
  }
  export function useExamDayClock(startedAt: number | null, targetSec: number, nowFn = Date.now): { remaining: number; expired: boolean; alert: 300 | 60 | null }
  // setInterval 500 ms + 'visibilitychange' → recalcul immédiat ; expired = remaining === 0 && startedAt !== null
  ```
- Test (pur) : 1200 − 1 s ; `now < startedAt` → 0 ; 3 h plus tard → 0. Hook : `renderHook` + `vi.useFakeTimers`, `expired` passe à `true` sans action.

**T14 — `examDaySession.ts`** · sim-engine-engineer · CA-4, CA-15
- Store zustand `persist` (`localStorage` clé `fsp-exam-day`) :
  ```ts
  interface ExamDayState { caseId: string; land: 'BW'; withSimulant: boolean; muster?: MusterCity; startedAt: number; partTimes: Partial<Record<ExamDayPart, number>>; phase: ExamDayPhase; bogen: BogenNotes; arztbriefText: string; aufklaerungOpened: boolean; results: Partial<Record<SimulationPart, PartResult>> }
  actions: start(input), beginPart(part, now), setBogen, setArztbrief, openAufklaerung, toTransition(), toEvaluation(), saveResult(part, r), abandon() /* efface */, purgeIfStale(now) /* > 24 h → null */
  ```
  Reducers purs exportés (`reduceStart`, `reduceBeginPart`, …) testés sans React. `partTimes[part]` posé une seule fois (idempotent).
- Test : purge à 24 h + 1 ms, pas à 23 h ; `beginPart` deux fois garde le premier `startedAt` ; `abandon` vide tout.

**T15 — `examDayFinish.ts` : construction sim + payload** · platform-sync-engineer · CA-5, CA-6
- ```ts
  export function buildExamDaySimulation(st: ExamDayState, c: Case, now: number, profileId?: string): Simulation
  // id `sim-${now}`, context:'pruefungstag', assistance:'autonome', layer:3, withSimulant, muster, parts (durationSec ≤ 1200, recalculé depuis partTimes : min(1200, next − start)), passed = simulationPassed, examDay:{ startedAt, endedAt: now, land:'BW', partTimes }, notes:{}, bogen, arztbriefText, prioritizedCorrections: []
  export function buildExamDayPayload(sim: Simulation, c: Case, before: Bereitschaft, after: Bereitschaft, appVersion: string): ExamDayCompletedPayload
  // v:1, weightClass: withSimulant ? 'pruefungstag' : 'solo', parts.* = { score: weightedPartScore(p,{assistance:'autonome',layer:3}), contentPct, officialPct, durationSec, passed: partPassed(p) }, aufklaerung: p ?? null, bereitschaft:{ before: before.value, after: after.value, capped: after.capped }
  export async function persistExamDay(sim, payload, c): Promise<void>
  // db.simulations.put(sim) ; db.cases.update(confidence/status/lastSimulationId comme Runner l.187-192) ; syncQueue.push({type:'simulation.completed', subject_id: c.id, payload: sim}) ; syncQueue.push({type:'exam_day.completed', subject_id: sim.id, payload}) ; chaque push .catch(console.warn) — jamais bloquant
  ```
- Test : payload conforme à `ExamDayCompletedPayload` (typecheck) et `< 2 Ko` ; `subject_id` = `sim.id` ; ordre des deux pushes (spy) ; sim solo → `weightClass:'solo'`, `sourceWeight` = 2.

**T16 — projections : journal avec `exam_day.completed`** · platform-sync-engineer · CA-6
- `app/src/lib/sync/projections.test.ts` (ajout) : journal `[simulation.completed(sim pruefungstag), exam_day.completed]` → `rebuildProjections` ne lève pas, aucune ligne dérivée du second, la sim restituée porte `context/withSimulant/examDay` (T-S4 arch).

### Tranche 3 — Écrans Prüfungstag (issue #26) · CI : tests + typecheck + build + `checkExamDay` verts ; sondes T21

**T17 — `examDaySetup.tsx` + route + bouton Hub** · front-implementer · CA-3
- Écran `/simulation/pruefungstag` : règles (BW, 20/20/20, sans aide, `p3Note`), conseil pédagogique étiqueté « Conseil » (jamais bloquant), conseil « désactive la mise en veille », Muster préréglé depuis `useUi`, **case à cocher « Ich habe einen Simulanten »** (→ `withSimulant`), QR `patientUrl(caseId)` **affiché seulement après le tirage** avec la consigne P4 au simulant, bouton « Prüfungstag starten » → `pickExamDayCase(db.cases, sims, now)` → `start(...)` → `beginPart('anamnese', now)` → `navigate(/simulation/${caseId}/run?modus=pruefungstag)`. Aucun cas éligible → message + lien Hub.
- Le DOM candidat avant départ ne contient ni nom ni motif du cas ; après tirage, uniquement un bandeau « Fall gezogen — QR für den Simulanten » (le nom/âge/motif s'affichent au top départ dans le runner).
- `main.tsx` : `{ path: 'simulation/pruefungstag', element: <ExamDaySetup /> }` (avant `simulation/:caseId/pre`). `SimulationHub.tsx` : `<Link to="/simulation/pruefungstag" className="btn-ghost">Prüfungstag</Link>`.
- Test : `examDaySetup.test.tsx` (RTL) — bouton désactivé tant que `db.cases` vide ; case à cocher pilote `withSimulant` dans le store.

**T18 — `examDayRunner.tsx` + early-return Runner** · sim-engine-engineer · **Opus** (verrouillage exhaustif + transitions + reprise : le cœur de la mesure) · CA-1, CA-2, CA-4
- Rendu par phase : en-tête (Land BW, partie, chrono `useExamDayClock`, nom/âge/motif du cas), P1 : `AnamneseBogen` (`assistance:'autonome'`) éditable + bouton « Aufklärung durchführen » (modale texte seule : titre + « Le simulant a sa fiche » ; `openAufklaerung()`), P2 : `<textarea>` Arztbrief + Bogen `readOnly`, P3 : Bogen + Arztbrief en lecture seule. `expired` → bandeau « Zeit ist um », saisies `disabled`, `toTransition()` ; écran transition (texte selon partie, bouton « Bereit » ou auto à 60 s via `useExamDayClock(transitionStartedAt, 60)`) → `beginPart(next, now)` ; après P3 → `toEvaluation()` → `<ExamDayEvaluation />`. Bouton discret « Abbrechen » + confirmation → `abandon()`, `useSimSession.end()`, navigate Hub.
- Alertes 5:00 / 1:00 : classe visuelle + `computeAmbiance` de `timeAmbiance.ts` (son si autorisé).
- Reprise : au montage, `purgeIfStale(now)` ; si toutes les parties échues et `phase !== 'evaluation'` → `toEvaluation()`. Sync `useSimSession.sync({ caseId, caseName, active, phase:'play', bogen, arztbriefText, results, aufklaerungOpen:false, elapsed:{} })` à chaque changement.
- Dev : `?debugClock=<offsetSec>` (uniquement `import.meta.env.DEV`) → `nowFn = () => Date.now() + offset*1000`.
- `SimulationRunner.tsx` (≤ 5 lignes) : `const [sp] = useSearchParams(); const exam = useExamDaySession((s) => s.state); if (sp.get('modus') === 'pruefungstag' || exam?.caseId === caseId) return <ExamDayRunner caseId={caseId!} />;` avant tout état.
- Test RTL : P1 → Bogen éditable ; `expired` → `readonly` + bandeau ; aucun texte « Guide », « Muster », « Redewendung » dans le container ; `checkExamDay.mjs` exit 0.

**T19 — `examDayEvaluation.tsx`** · front-implementer · CA-5
- Enchaîne `PartEvaluation` pour `anamnese`, `dokumentation`, `fallvorstellung`, puis `aufklaerung` si `aufklaerungOpened` ; `durationSec = min(1200, consommé)` depuis `partTimes` ; `onSave` → `saveResult` ; `onCancel` désactivé (message « Évalue chaque partie, même vide »). Dernière grille → `phase:'result'`.
- Test : ordre des 3 (ou 4) grilles ; `durationSec ≤ 1200`.

**T20 — `examDayResult.tsx` + persistance** · front-implementer · CA-6, CA-15, CA-16
- Au montage : `before = computeBereitschaftsindex({sims, cases, visibleCases: cases})`, `sim = buildExamDaySimulation`, `after = compute(… sims+[sim])`, `payload = buildExamDayPayload`, `await persistExamDay` (une seule fois — garde `useRef`), puis `useExamDaySession.abandon()` (efface la session) + `useSimSession.end()`.
- Ordre d'affichage strict : (1) score par partie + seuil 60 + « Bestanden / Nicht bestanden (BW) » ; (2) débrief : items `checklist` non cochés par partie, critère `LANGUAGE_CRITERIA` le plus bas, temps consommé ; (3) une action gratuite (`Link` « rejoue ce cas en Autonome » vers `/simulation/:caseId/pre`) ; (4) BI `before → after` + `capped` en clair ; bandeau si `!withSimulant` ; (5) un CTA : `Gate feature="readiness.plan"` → « Voir mon plan » sinon « Voir mon Bereitschaftsindex » (`/bereitschaft`). **Aucune** carte pricing.
- Test RTL : ordre des sections par `data-section` ; `persistExamDay` appelé une fois ; aucun lien `/pricing`.

**T21 — Sondes navigateur tranche 3** · front-implementer · CA-2, CA-3, CA-4, CA-6, CA-14, CA-15, CA-16
- `playwright-cli` headless, `-s=pruefungstag`, port 5102 (`npm run dev -- --port 5102`), mesures DOM. Scénarios et preuves : voir §5. Résultats consignés dans `reports/build-probes.md` (commande + sortie).

### Tranche 4 — Bereitschaftsindex, écrans (issue #27) · CI : tests + typecheck + build ; sondes T25

**T22 — `ReadinessPage.tsx` (Free)** · front-implementer · CA-8, CA-11
- Route `/bereitschaft` (`main.tsx`). `useLiveQuery(db.simulations)`, `useLiveQuery(db.cases)` ; `cases.length === 0` → état « chargement » (jamais 0). Affiche : chiffre + verdict ; plafond (`capped` → phrase + « fais un Prüfungstag avec simulant » ; sinon « valable jusqu'au JJ.MM » depuis `capExpiresAt`) ; 3 composantes avec leur phrase `explain[i]` ; `byAxis` : `tested ? score % : '— nicht getestet'` ; levier (`leverage`) ; couverture « N des M spécialités de ton plan ; les protocoles en comptent 16 ; hors plan : … » ; formule en mono (`readout`). Charte « instrument clinique ».
- Test RTL : axe non testé → texte « — nicht getestet », jamais « 0 % » ; plafonné → phrase ; deux nombres de couverture présents.

**T23 — `ReadinessPlan.tsx` (Pro) + fallback Free** · front-implementer · CA-9, CA-10
- Dans `ReadinessPage` : `<Gate feature="readiness.plan" fallback={<FreeCard />}><ReadinessPlan bi={bi} input={input} /></Gate>`. `ReadinessPlan` : actions (`label`, `+gain`, mention « hypothèse : réussie à 70 % »), historique (`bereitschaftHistory`, courbe SVG 12 points), projection (`projectBereitschaft` si `ProgramConfig.examDate`). `FreeCard` : titre « Voir comment progresser », nomme exactement « plan d'actions chiffré, historique, projection », lien `/pricing`, **aucun chiffre**, aucune couleur d'alerte.
- Test RTL : Free (`matrix` mockée) → aucun `+N` dans le DOM, carte présente ; Pro → actions triées, « 70 % » à côté de chaque gain.

**T24 — `ReadinessCard.tsx` + HomePage + route** · front-implementer · CA-8
- Carte compacte (chiffre, verdict, levier, lien `/bereitschaft`) ; `HomePage.tsx` : `<ReadinessCard />` (1 import + 1 ligne) sous la carte « session » ; `main.tsx` : `{ path: 'bereitschaft', element: <ReadinessPage /> }`.
- Test RTL : chargement sans cases → squelette ; avec données → chiffre.

**T25 — Sondes navigateur tranche 4** · front-implementer · CA-8, CA-9, CA-11 (§5).

### Tranche 5 — Ship-prereq et clôture (issue #28)

**T26 — ship-prereq** · `main` (ops-devops-engineer en exécution, `main` autorise) · CA-6
1. `psql "$DATABASE_URL" -f app/supabase/migrations/20260916000010_exam_day_event.sql` sur la base vivante (jamais `db:reset`).
2. `node app/scripts/dumpSchema.mjs && git diff --exit-code docs/contracts/schema.sql` → 0.
3. `supabase functions deploy events` (config du projet ; jamais `--no-verify-jwt`).
4. Preuve : `curl -s -o /dev/null -w '%{http_code}' -X POST $URL/functions/v1/events -H "Authorization: Bearer $TEST_JWT" -d '{"events":[{"id":"<uuid>","type":"exam_day.completed","subject_id":"x","payload":{"v":1},"occurred_at":"2026-09-16T00:00:00Z"}]}'` → `200`.
5. Seulement après : merge de `feat/pruefungstag` (`finishing-a-development-branch`, revue de branche Opus, `security-review` : sync + entitlements).

**T27 — Revue de branche + clôture** · quality-branch-reviewer (Opus) → coord-release-manager · toutes CA (tableau §5 rempli avec preuves).

## 3. Interfaces entre tâches

| Producteur | Consommateur | Contrat |
|---|---|---|
| T2 types (`ReadinessInput`, `Bereitschaft`, `ReadinessAction`) | T3–T8, T20, T22–T24 | tel que §6.3 du spec ; `Bereitschaft.explain: string[4]` |
| T6 `computeBereitschaftsindex(input, now, opts?)` | T7 (opts `{withActions:false}`), T8, T15, T20, T22, T24 | pur, idempotent |
| T11 `EXAM_DAY_PLAN`, `ORDER`, `ExamDayPart/Phase` | T12–T20, T9 (seul fichier autorisé à porter des durées) | |
| T14 `useExamDaySession` + `ExamDayState` | T15 (`buildExamDaySimulation(st, …)`), T17, T18, T19, T20, T18-early-return | store `persist` ; reducers purs |
| T15 `persistExamDay(sim, payload, c)` | T20 | deux `push`, ordre `simulation.completed` puis `exam_day.completed` ; `subject_id` = `sim.id` pour le second |
| T10 `z.enum` | T26 (déploiement) | le client n'émet qu'après T26 |

## 4. Traçabilité CA → tâches

| CA | Tâches |
|---|---|
| CA-1 | T11, T13, T18, T21 |
| CA-2 | T9 (imports interdits), T18, T21 |
| CA-3 | T12, T17, T21 |
| CA-4 | T13, T14, T18, T21 |
| CA-5 | T15, T19 |
| CA-6 | T10, T15, T16, T20, T21, T26 |
| CA-7 | T2, T3, T4, T5, T6 |
| CA-8 | T4, T22, T24, T25 |
| CA-9 | T8, T23, T25 |
| CA-10 | T7, T23 |
| CA-11 | T6, T22, T25 |
| CA-12 | T1 |
| CA-13 | T9, T11 |
| CA-14 | T21 (réseau coupé) |
| CA-15 | T14, T20, T21 |
| CA-16 | T20, T21 |
| CA-17 | T9 |

## 5. Vérification — preuve attendue par critère

| CA | Preuve |
|---|---|
| CA-1 | `npx vitest run src/features/simulation/examDayClock.test.ts src/features/simulation/examDayPlan.test.ts` → exit 0 ; sonde : `?modus=pruefungstag&debugClock=1201` → `document.querySelector('[data-exam-banner]')?.textContent` contient « Zeit ist um » sans clic |
| CA-2 | `node scripts/checkExamDay.mjs` → exit 0 ; sonde P1 : `[...document.querySelectorAll('[data-exam-day] *')].some(e => /Guide|Muster|Redewendung|Fachanamnese|Glossar/.test(e.textContent))` → `false` ; `document.querySelector('[data-exam-day] textarea, [data-exam-day] input')` non `disabled` |
| CA-3 | `npx vitest run src/features/simulation/examDayPick.test.ts` → 0 ; sonde setup : `document.body.innerText` ne contient pas le nom du cas tiré avant départ ; après : nom/âge/motif seuls |
| CA-4 | sonde : départ → `location.hash='#/'` → attendre 3 s → cliquer « Reprendre » → `[data-exam-remaining]` a diminué de ≥ 3 s |
| CA-5 | `npx vitest run src/features/simulation/examDayFinish.test.ts` → 0 ; sonde : 3 grilles `h2` « Évaluation — … » dans l'ordre |
| CA-6 | sonde Dexie : `(await db.simulations.toArray()).at(-1).context === 'pruefungstag'` ; `(await db.outbox.toArray()).map(e=>e.type)` finit par `['simulation.completed','exam_day.completed']` ; `projections.test.ts` → 0 ; T26 `curl` → 200 |
| CA-7 | `npx vitest run src/lib/readiness` → 0 (jeu de référence commenté à la main) |
| CA-8 | sonde `/bereitschaft` Free : texte « — nicht getestet » présent pour un axe vide ; `/0 %/` absent des axes ; « des 8 spécialités » et « en comptent 16 » présents |
| CA-9 | sonde Free : `document.body.innerText` ne matche pas `/\+\d+/` dans `[data-readiness-plan-fallback]` ; Pro (`pruefungstag-pro@test.dev`) : `[data-readiness-plan]` présent |
| CA-10 | `npx vitest run src/lib/readiness/bereitschaft.test.ts -t actions` → 0 |
| CA-11 | vitest T6 ; sonde : Free sans PT → « ≤ 79 » + phrase ; après PT avec simulant réussi → « valable jusqu'au » |
| CA-12 | `npm test` → 0 ; `git diff --stat main -- app/src/features/home app/src/features/stats` = 1 ligne + 1 import (HomePage) |
| CA-13 | `node scripts/checkExamDay.mjs` → 0 ; sonde : texte « BW » dans le setup et le runner |
| CA-14 | sonde : `context.setOffline(true)` avant setup → parcours complet → `window.__errors` (hook `onerror`) vide ; outbox = 2 événements `pending` |
| CA-15 | sonde : départ → « Abbrechen » → confirmer → `db.simulations.count()` et `db.outbox.count()` inchangés |
| CA-16 | sonde : ordre `[data-section]` = `scores, debrief, next, bi, cta` ; aucun `a[href*="pricing"]` sur `/simulation/:id/run` en Free et en Pro |
| CA-17 | `node scripts/checkExamDay.mjs` → 0 |

## 6. Pre-mortem (agentops:pre-mortem)

| # | Mode d'échec | Parade |
|---|---|---|
| 1 | Le client émet `exam_day.completed` avant que la fonction ne le connaisse → 400 sur le lot, `simulation.completed` perdue avec lui. | T10 (code) + T26 (déploiement) **avant merge** ; T21/CA-6 vérifie le 200 ; en attendant T26, la branche n'est pas mergée. |
| 2 | Migration appliquée avec `db:reset` → contenu publié effacé. | T26 : `psql` uniquement, étape écrite ; `main` exécute. |
| 3 | `computeBereitschaftsindex` juste « à peu près » : arrondis intermédiaires ⇒ BI ± 1, indice faux pour tous. | T6 : un seul `Math.round` final ; jeu de référence calculé à la main dans le test (CA-7 « à l'unité près »). |
| 4 | Un aide se glisse dans le runner (un `MusterCard` « pratique », `ImmersiveMode`). | T9 : liste d'imports interdits en CI (exit 1) ; P2 : `ImmersiveMode` non monté. |
| 5 | Chrono compteur réintroduit par réflexe (`useTimer`) → temps gagné en arrière-plan. | T13 pur `remainingSec(startedAt, target, now)` ; `useTimer` dans la liste d'imports interdits de T9. |
| 6 | La barre « Reprendre » ramène au Runner **entraînement** sur le cas du Prüfungstag (état corrompu, guide visible). | P3 : early-return sur `useExamDaySession.state.caseId === caseId` ; sonde CA-4. |
| 7 | Deux `push` non atomiques : la sim est écrite, le second `push` échoue → serveur sans résumé. | Acceptation : l'outbox est locale et rejouée ; `simulation.completed` suffit à reconstruire l'indice (A1 arch). Journalisé, non bloquant. |
| 8 | `withSimulant` déclaré à tort → plafond levé sans interlocuteur. | Acceptation écrite (spec §17, lead) : assertion client ; le résultat affiche « avec simulant (déclaré) » ; la ligue #9 tranchera. |
| 9 | Free : `outsidePlan` vide car calculé sur `db.cases` purgé. | P1 : `CORPUS_SPECIALTIES` constante ; test T4 « 14 hors plan avec 2 visibles ». |
| 10 | Actions Pro : gain négatif ou récursion infinie (`actions` → `compute` → `actions`). | T7 : `max(0, …)` + `opts.withActions:false` ; test « gain ≥ 0 ». |
| 11 | Carte pricing ou chiffre « +X » fuit sur l'écran de résultat ou dans le fallback Free (dark pattern, veto pédagogique). | T20/T23 tests RTL « aucun `/pricing` », « aucun `+N` » ; sondes CA-9/CA-16 en Free **et** Pro. |
| 12 | L'écran de résultat persiste deux fois (StrictMode double-montage) → deux sims, quatre événements. | T20 : garde `useRef` + id de sim dérivé de `startedAt` (`sim-exam-${startedAt}`) → `put` idempotent ; test « appelé une fois ». |
| 13 | Session > 24 h non purgée → un Prüfungstag fantôme bloque le Runner de ce cas. | T14 `purgeIfStale` au montage + test 24 h ± 1 ms. |
| 14 | Fichier > 500 lignes (`examDayRunner.tsx`). | Découpage prévu : `examDayRunner.tsx` (phases) + `examDayParts.tsx` (rendu P1/P2/P3) si > 400 lignes ; vérifié à la revue de tâche. |

**Trois risques majeurs** : #1 (ordre de déploiement / perte de lot), #3 (indice faux à l'unité), #4/#5 (aide ou chrono compteur réintroduits → la mesure ne vaut plus rien).

## 7. Écarts et tickets de suite (à trancher par lead)

- P2 : `ImmersiveMode` non monté en Prüfungstag (contradiction spec §5.3 « disponible » vs §5.3 « guide absent »). Ticket : « mode focus sans guide » (touche `ImmersiveMode.tsx`, hors périmètre).
- P4 : message `exam-phase` pour la fiche simulant (arch T-S5) — ticket, `usePatientSync.ts` hors périmètre.
- P7 : définition de la projection (régression linéaire, ≤ 79 si plafonné) — hypothèse à valider.
- ADR-0013 à aligner (3 lignes, `spec`) — non couvert par ce plan.

## 8. Issues GitHub

Une par tranche, référencent #3 : #24 (tranche 1), #25 (tranche 2), #26 (tranche 3), #27 (tranche 4), #28 (tranche 5).

## 9. Self-review

- Placeholders : aucun (`…` uniquement dans les extraits de code raccourcis, complétés dans les briefs).
- Types : `Bereitschaft` (T2) est consommé tel quel par T6/T20/T22 ; `ExamDayState` (T14) par T15/T18/T20 ; `ExamDayCompletedPayload` vient de `lib/sync/events.ts` (contrat arch, non modifié) — `weightClass` dérivé de `withSimulant` (T15).
- Périmètre : hors-périmètre limité aux 4 points d'entrée du lead + `checkExamDay.mjs`/`quality.yml`/`package.json` (CI, autorisé par spec §13 « build ») + `events/index.ts` + `events.test.ts` (T-S1, prérequis lead). `usePatientSync.ts`, `ImmersiveMode.tsx`, `ResumeSessionBar.tsx` : non touchés.
- Chaque CA pointe vers ≥ 1 tâche (§4) ; chaque tâche a un test écrit d'abord.
