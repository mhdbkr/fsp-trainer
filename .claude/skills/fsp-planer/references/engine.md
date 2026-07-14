# The scheduling engine — model, algorithm, adaptivity, evolution

This is the *how*. It documents the real data model and algorithm as they exist today, the
adaptivity signals available, and a concrete roadmap for making the plan smarter. Read
`learning-science.md` first so every change here has a reason.

## Table of contents
1. Data model (types.ts)
2. The scheduling algorithm today (program.ts)
3. Adaptivity signals — what the plan can react to
4. Invariants to preserve
5. Evolution roadmap (how to revolutionise it)
6. Testing the engine

---

## 1. Data model (`app/src/db/types.ts`)

```ts
type Intensity = 'leicht' | 'mittel' | 'intensiv';
type Layer = 1 | 2 | 3;
type AssistanceMode = 'assiste' | 'autonome';
type ProgramBlockKind = 'simulation' | 'drill' | 'fachwissen' | 'aufklaerung' | 'revision';

interface ProgramConfig {
  startDate: string;            // ISO
  examDate?: string;            // ISO (else weeks)
  weeks?: number;
  intensity: Intensity;
  hoursPerSession: number;      // daily volume on worked days
  offDays: number[];            // 0=Sun … 6=Sat (date-fns getDay)
  prioritySpecialties: Specialty[];
  selfLevel: Partial<Record<Axis, number>>;  // self-assessment 0..100 per axis
  createdAt: number;
  adjust?: ProgramAdjust;       // manual interventions, re-reasoned each recompute
}

interface ProgramAdjust {
  doneLayers?: Record<string, number>;  // caseId → layers hand-marked done
  postpone?: Record<string, number>;    // caseId → working-days shift for next layers
  skipDrillDates?: string[];            // ISO dates whose drill is cancelled
  extras?: ExtraTask[];                 // manually added tasks
}

interface ProgramBlock {               // one task on a day
  kind: ProgramBlockKind;
  label: string;
  estMin: number;
  caseId?: string; layer?: Layer; assistance?: AssistanceMode;
  axis?: Axis; specialty?: Specialty;
  id?: string;                          // stable id for manual actions
  manual?: boolean;                     // user-added (removable)
}

interface ProgramDay {
  date: string; isOff: boolean;
  targetMin: number;                    // daily budget
  blocks: ProgramBlock[];
  worked: boolean;                      // ≥1 real activity that day (derived from sims)
  spentMin: number;                     // real minutes that day
}
```

The `selfLevel` (per-axis self-assessment) and `feeling` (per-part, on `Simulation`) are the two
**profile/calibration** inputs that are underused today — prime fuel for smarter adaptivity (§5).

## 2. The scheduling algorithm today (`app/src/lib/program.ts`)

Pipeline, all recomputed on every render (never persisted):

1. **Budget.** `dailyBudget = round(hoursPerSession × 60 × INTENSITY_FACTOR[intensity])`,
   with `INTENSITY_FACTOR = { leicht: 0.8, mittel: 1.0, intensiv: 1.3 }`.
2. **Score each case.** `lastScoreByCase(sims)` = latest mean part-score per case.
   `specialtyWeakness` = mean `(100 − score)` per specialty over attempted cases.
   `casePriority(c, lastScore, priority, spWeak) = (weakness + freq) × prioBoost × statusBoost ×
   disciplineBoost`, where weakness = `lastScore==null ? 75 : max(5, 100−lastScore)`,
   freq = `min(30, c.frequency)`, prioBoost = `1.5` if priority specialty, statusBoost = `0.3` if
   Maîtrisé, disciplineBoost = `1 + spWeak/100`.
3. **Rank** cases with remaining layers (`effectiveDoneLayers < 3`) by descending priority.
   `effectiveDoneLayers = max(case.layerProgress, adjust.doneLayers[id])`.
4. **Introduce gradually.** Only `INTRO_PER_DAY = 2` new (layer-1) cases enter per working day, so
   the plan doesn't dump every case on day 1 — this also produces natural interleaving.
5. **Place layers with growing gaps.** For each remaining layer L, desired date =
   `anchor + LAYER_GAP[L]` (`{1:0, 2:2, 3:4}`), then `placeFrom` finds the next working day with
   budget for `SIM_MIN (40)`; overflow slides forward. `anchor = day` after placement, so the next
   layer spaces from the *real* placement. Layer 1 also drops a linked `fachwissen` block
   (`FACHWISSEN_MIN 15`). Layer 1 = assisté, layers 2–3 = autonome.
6. **Daily drill.** Every working day (unless in `skipDrillDates`) gets a `drill` block
   (`DRILL_MIN 15`), labelled with a decaying due-card estimate.
7. **Manual extras** (`adjust.extras`) are placed on their exact dates, `manual: true`.
8. **`generateProgram`** slices `[today … min(exam, today+horizon)]` into `ProgramDay[]`, attaching
   real `spentMin` / `worked` from simulations.

Supporting outputs:
- **`disciplineStats`** → the "Où le plan met l'accent" panel: per-specialty cases, layers done /
  total, attempted, avg score, and a `priority` (haute/moyenne/basse). This is the *transparency*
  surface — keep it truthful.
- **`programStats`** → daysUntilExam, workedDays, plannedDaysElapsed, `adherencePct`,
  totalSpentMin, `backlogUnits` (Σ remaining layers).

## 3. Adaptivity signals — what the plan can react to

The engine already reads, or can cheaply read, these signals. Any "make it adaptive" request
should connect an *input signal* to a *scheduling change* and a *visible cue*:

| Signal (input) | Source | Current use | Latent power |
|---|---|---|---|
| Latest score per case | `lastScoreByCase` | priority weakness | drive layer interval (sooner if low) |
| Specialty weakness | `specialtyWeakness` | disciplineBoost | rebalance week toward weak discipline |
| Layer progress | `effectiveDoneLayers` | how many layers remain | taper / mastery recession |
| Adherence | `programStats.adherencePct` | shown only | adapt intensity, trigger catch-up |
| `feeling` vs score | `Simulation.parts[].feeling` | unused in engine | calibration-driven priority |
| `selfLevel` per axis | `ProgramConfig.selfLevel` | unused in engine | seed initial priorities pre-data |
| Days until exam | `programEnd` | horizon | taper, coverage triage |
| Part-level score | `partScore` per part | mean only | schedule axis-specific practice |

## 4. Invariants to preserve

Changing the engine is fine; violating these is not — each maps to a `learning-science.md` principle:
- **Recompute, never freeze.** The plan is a pure function of (config, cases, sims, now). No
  scheduling state is persisted; only `adjust` (user intent) is. This is what makes it adaptive.
- **Layers spaced, never same-day.** Growing gaps, anchored to real placement.
- **Budget is a ceiling.** Overflow slides; days are never overfilled to hit coverage.
- **Off-days & manual adjustments win.** The engine re-reasons around them, never overrides them.
- **Weakness attracts time; mastery recedes but doesn't vanish** (spacing still needs a last touch).
- **Retrieval-first.** Active blocks (simulation, drill) are the backbone; passive blocks support.

## 5. Evolution roadmap — how to revolutionise it

Concrete, science-backed upgrades. Each names its principle and its required UX cue. Ship them as
*more adaptivity*, never as *more rigidity*.

**a) Forgetting-curve layer intervals** *(spacing + forgetting curve)*
Replace the fixed `LAYER_GAP` with score-responsive gaps: a low-scoring layer returns sooner
(e.g. gap ≈ `base × f(score)`, shorter when score is low), a confident one waits longer — a per-case
curve like SM-2 but for cases. UX cue: a small "revient tôt car fragile / plus tard car solide" note.

**b) Calibration-driven priority** *(metacognition)*
Fold `feeling − score` into `casePriority`: high feeling + low score (dangerous blind spot) gets a
boost; low feeling + high score gets *soothed* (deprioritised, and surfaced as reassurance). UX cue:
a calibration chip on the case.

**c) Adaptive intensity suggestion** *(cognitive load + adherence)*
When `adherencePct` is chronically low, *propose* dropping intensity ("passe en leicht cette
semaine ?"); when consistently ahead with budget to spare, *propose* intensiv. Suggest, never
impose — autonomy sustains adherence. UX cue: a gentle banner, one-tap accept.

**d) Exam taper** *(backward design)*
In the final window (e.g. last `min(7, 15%×horizon)` working days) stop introducing new layer-1
cases; fill with spaced review of highest-value/weakest-but-attempted material + light drill, and
a mock full-run. UX cue: a "Dernière ligne droite — consolidation" phase marker on the calendar.

**e) Backlog & catch-up** *(adherence + honesty)*
When `backlogUnits` can't fit before the exam at current pace, surface it honestly and offer
choices: *rééquilibrer* (drop lowest-value coverage to protect depth), *intensifier*, or *repousser
la date*. Never silently overfill days. UX cue: a calm "le plan ne rentre plus — voici 3 options"
card, not a red alarm.

**f) Axis-aware scheduling** *(retrieval, targeted)*
Use part-level scores so a candidate weak specifically in Dokumentation gets Arztbrief-focused
blocks, not just "more of this case". Requires a block kind or tag per axis. UX cue: axis tags on
blocks and in the discipline panel.

**g) Profile & preferences seeding** *(personalisation)*
Before any simulation data exists, seed initial priorities from `selfLevel` and
`prioritySpecialties` so day 1 already feels personal; let the user pin/snooze specialties. Persist
preferences in `ProgramConfig`/`ProgramAdjust` (they're user intent, so they survive recompute).

When adding any of these, keep the function **pure and cheap** (it runs on every render) and keep
`disciplineStats`/`programStats` in step so the transparency panel never lies about what changed.

## 6. Testing the engine

Because `generateProgram` is a pure function of `(config, data, horizon, now)`, it is trivially
testable — exploit that:
- **Determinism:** pass a fixed `now`; assert the same plan out.
- **Adaptivity proofs** (the important ones): construct a config + sims, snapshot the plan, then
  mutate *one* signal and assert the plan *changed the right way* — lower a case's score ⇒ its next
  layer moves earlier / its specialty gains share; add `skipDrillDates` ⇒ that drill is gone; move
  `examDate` earlier ⇒ horizon shrinks and (once built) taper engages; raise `intensity` ⇒ more
  blocks fit per day.
- **Invariant guards:** no two layers of one case share a date; no day exceeds `targetMin`; off-days
  hold no blocks; `effectiveDoneLayers` never regresses.
Put these in a small script or vitest spec so future engine changes can't silently break the
adaptivity that is the whole point. Then *also* verify in the browser preview (drive the Programme
page) — a passing unit test plus a visibly-changing calendar is the bar.
