# Learning science — the evidence base, applied to FSP

Every scheduling rule in the planner must trace back to a principle here. This file is the
*why*; `engine.md` is the *how*. If you're about to add a rule you can't ground in one of
these principles, stop — an ungrounded rule makes the plan feel arbitrary, and an arbitrary
plan is one the candidate silently abandons.

## Table of contents
1. Spacing effect (distributed practice)
2. Testing effect (retrieval practice / active recall)
3. Interleaving
4. Desirable difficulties
5. The forgetting curve & expanding intervals
6. Metacognition & confidence calibration
7. Cognitive load & the daily budget
8. Backward design from the deadline
9. Motivation, adherence & serenity
10. FSP-specific synthesis

---

## 1. Spacing effect (distributed practice)
**Principle.** The same total study time produces far more durable memory when spread across
days than massed in one sitting. Re-encountering material *after partial forgetting* forces a
harder, more consolidating retrieval.

**In this app.** A case is worked in **3 layers**, and the layers are spaced by growing gaps
(`LAYER_GAP = {1: 0, 2: 2, 3: 4}` working days). Two layers of one case must **never** land on
the same day — that would collapse spacing into massing. The daily Fachbegriffe **drill** is
itself an SM-2 spaced schedule.

**Design consequence.** When you tune intervals, keep them *expanding*, and keep them anchored
to the *actual* date a layer was done (`anchor = day`), not the planned date — real spacing
tracks real study, not the ideal calendar.

## 2. Testing effect (retrieval practice / active recall)
**Principle.** *Retrieving* information (producing it from memory) strengthens it far more than
*reviewing* it (re-reading). The struggle to recall is the mechanism, not a side effect.

**In this app.** The plan's core units are **retrieval by design**: a simulation makes the
candidate *produce* the anamnesis / Arztbrief / Fallvorstellung; the drill makes them *recall*
a Fachbegriff before flipping. Passive "read the Fachwissen" blocks are the *seasoning*, not the
meal — schedule them as support around an active block (as the engine already does: layer-1
simulation → linked Fachwissen), never as the plan's backbone.

**Design consequence.** Favour blocks that demand production. When adding a new block kind, ask
"does this make the candidate retrieve, or just re-expose them?" Bias the plan toward retrieval.

## 3. Interleaving
**Principle.** Mixing problem *types* (here: specialties, skill axes) within a study period
beats blocking one type for a long stretch. Interleaving trains the harder, exam-realistic skill
of *discriminating which approach a new case needs* — exactly what the exam demands when an
unknown patient walks in.

**In this app.** The staggered introduction (`INTRO_PER_DAY = 2` new cases) and priority ranking
naturally mix specialties across a week rather than marching through all of cardiology then all
of gastro. Preserve that mix.

**Design consequence.** When you sequence blocks in a day or week, avoid long single-specialty
runs. If priority scoring ever clusters one discipline, interleave deliberately. The
"Où le plan met l'accent" panel should show *balance with a lean*, not tunnel vision.

## 4. Desirable difficulties
**Principle.** Conditions that make learning feel *harder and slower* (spacing, retrieval,
interleaving, reduced scaffolding) produce *better* long-term retention than easy, fluent study.
Fluency during practice is a poor predictor of exam performance.

**In this app.** The **assistance ladder** encodes this: layer 1 = *assisté* (full scaffolding —
chapters shown, phrasings visible), layers 2–3 = *autonome* (scaffolding withdrawn, real-exam
conditions). Scoring weights autonome higher because it is the harder, more valid signal.

**Design consequence.** The plan should *progressively remove support*. Never let a case stay at
assisté forever because it feels comfortable. Layer 2–3 must default to autonome.

## 5. The forgetting curve & expanding intervals
**Principle.** Memory decays roughly exponentially; each successful spaced retrieval *flattens*
the curve, so the optimal next review is *later than the last gap*. Reviewing too early wastes
time (nothing forgotten yet); too late loses the trace. The sweet spot is "just before you'd
forget", which grows with each success (SM-2's core idea).

**In this app.** The Fachbegriffe SRS already implements SM-2 (`src/lib/srs.ts`, `isDue`). The
case **layers** are a coarse, hand-tuned version of the same idea (2→4 day gaps). A strong
evolution (see `engine.md`) is to make layer intervals *responsive to the score*: a shaky layer
(low score) should come back **sooner**; a confident one can wait **longer** — a per-case
forgetting curve, not a fixed table.

**Design consequence.** Treat `LAYER_GAP` as a starting point, not a law. Intervals that adapt to
performance are more faithful to the science than a fixed schedule.

## 6. Metacognition & confidence calibration
**Principle.** Learners are systematically overconfident about material they've *seen* (fluency
illusion). Prompting a *prediction* of performance, then confronting it with the *actual* result,
calibrates judgement and directs effort to true weak spots. The gap between felt-confidence and
measured-score is itself a signal.

**In this app.** Each simulation part captures both a **`feeling`** (0–100 self-rating) and an
objective **score**. The divergence is gold: high feeling + low score = a *dangerous blind spot*
that deserves priority; low feeling + high score = wasted anxiety the plan should soothe.

**Design consequence.** Use `feeling` vs `score` as an adaptivity input and a UX cue. Surface
calibration gently ("you felt shaky here but scored 82% — trust it") to build the serenity that
is this feature's whole point.

## 7. Cognitive load & the daily budget
**Principle.** Working memory is finite; overloading a session degrades encoding and morale.
Sustainable daily volume beats heroic days followed by burnout. Consistency compounds; binging
does not.

**In this app.** `dailyBudget = hoursPerSession × 60 × INTENSITY_FACTOR[intensity]`
(`leicht 0.8 / mittel 1.0 / intensiv 1.3`). Blocks that don't fit **slide to the next working
day** rather than cramming. Off-days are respected.

**Design consequence.** The budget is a *ceiling*. Never overfill a day to hit a coverage target.
If material won't fit before the exam, that's a truth to *surface* (backlog), not to hide by
overstuffing days.

## 8. Backward design from the deadline
**Principle.** With a fixed exam date, effective planning runs *backwards*: reserve an end-game
consolidation/taper window, then fill the remaining time so every high-value item gets its layers
and its spaced reviews before the date — accepting that a large surface may not all fit, and
prioritising accordingly.

**In this app.** `programEnd(config)` (exam date, or start + weeks) bounds everything. The
horizon, `programStats.daysUntilExam`, and `backlogUnits` come from it.

**Design consequence.** Add an explicit **taper**: in the final stretch, stop *introducing* new
cases and shift to *spaced review of the strongest-value material + light drill*, so the candidate
arrives rested and consolidated, not mid-discovery. See `engine.md` §exam-taper.

## 9. Motivation, adherence & serenity
**Principle.** A plan only works if it's followed. Adherence rises with *autonomy* (the plan bends
to the user's life), *visible progress* (streaks, coverage, shrinking backlog), *achievable daily
goals*, and *low anxiety*. Guilt-driven dashboards backfire; calm, honest ones sustain.

**In this app.** `adherencePct` (worked days / planned days), `backlogUnits`, streak signals, and
manual adjustments (postpone, skip, mark done, add) give autonomy and honest feedback.

**Design consequence.** Frame everything as *support, not surveillance*. Missing a day reshuffles
the plan without scolding. Progress is shown to reassure, not to shame. This is the emotional
core of the serenity goal.

## 10. FSP-specific synthesis
Putting it together for this exam:
- **Breadth via spaced layers + interleaving** so dozens of cases across specialties get covered
  and mixed, not blocked.
- **Depth via retrieval + desirable difficulty** so each case is *produced* under progressively
  real conditions (assisté → autonome), not just read.
- **Adaptivity via the forgetting curve + calibration** so weak/overconfident spots pull effort
  and time toward themselves automatically.
- **Sustainability via the daily budget + off-days + taper** so the candidate arrives at the
  fixed date consolidated and calm.
- **Trust via transparency + honest progress** so the candidate *believes* the plan and follows it.

When these tensions conflict (breadth vs depth, coverage vs budget, challenge vs morale), resolve
in favour of **durable learning and sustained adherence** — a plan followed at 80% beats a perfect
plan abandoned in week two.
