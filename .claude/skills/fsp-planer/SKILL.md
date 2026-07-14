---
name: fsp-planer
description: >-
  Design, build, and evolve the PROGRAMME / study-plan module of the FSP-Cockpit app —
  a dynamic, adaptive preparation calendar grounded in learning science (spaced
  repetition, active recall, interleaving, desirable difficulties) that re-plans itself
  from the candidate's performance, profile, and preferences, and presents it as a calm,
  premium, reassuring experience. Use this skill for ANY task touching the study program,
  révision planner, calendar/agenda, daily session, scheduling engine, layer/couche
  intervals, drill cadence, adaptivity from scores, intensity, exam-date countdown,
  backlog/catch-up, the "why this plan" transparency panel, the setup wizard, or the
  Program data model (ProgramConfig / ProgramBlock / ProgramDay / ProgramAdjust) —
  even when the user only says "planning", "calendrier", "programme", "révisions",
  "spaced repetition", "mon plan", or asks to make the plan smarter or nicer.
  Trigger before writing planner code so it stays faithful to the science and the model.
---

# FSP Planer — the adaptive preparation program

This skill turns the app's **Programme** section into a study coach the candidate can
trust: a plan that is *scientifically sound*, *genuinely adaptive*, and *calming to look
at*. It covers three inseparable layers — the learning science, the scheduling engine,
and the premium UX — and keeps every change faithful to the existing data model so the
planner never regresses into a static to-do list.

The north star: **the candidate should open the Programme and feel serene** — "I know
exactly what to do today, I trust that it's the right thing, and I can see I'm on track
for the exam." Every decision below serves that feeling.

## The exam this plan prepares for

FSP (Fachsprachprüfung Medizin, Baden-Württemberg): a fixed-date, high-stakes oral+written
exam with three parts (Anamnese, Dokumentation/Arztbrief, Fallvorstellung) plus Aufklärung.
Preparation is a race against **a real deadline** with a **large, uneven surface** (dozens
of cases across specialties, hundreds of Fachbegriffe, four skill axes). That shapes
everything: the plan is *backward-designed from the exam date*, it must *cover breadth
without cramming*, and it must *spend the most time where the candidate is weakest*.

Two things the plan orchestrates, already modelled in the app:
- **Cases worked in 3 layers (Couchen).** Layer 1 = discovery (assisté), layers 2–3 =
  consolidation (autonome). Layers of the same case are spaced apart, never same-day.
- **Daily Fachbegriffe drill** on an SM-2 spaced-repetition schedule.

## How to work on the Programme (the loop)

Follow this order. Skipping straight to UI or to a scheduling tweak without re-reading the
science or the model is how the plan drifts.

1. **Anchor in the goal.** Restate what the candidate needs: which exam date, how many
   weeks, which specialties are priorities, how much time per day, what feels shaky. If a
   `ProgramConfig` exists, read it; if not, the setup wizard produces one.
2. **Apply the science.** Any scheduling or content decision must trace back to a principle
   in `references/learning-science.md` (spacing, retrieval, interleaving, desirable
   difficulty, calibration). If you can't name the principle, don't ship the rule.
3. **Design or evolve the engine.** Work against the real model and algorithm in
   `references/engine.md`. Preserve the invariants (layers spaced, budget respected,
   re-planned on every render, adaptive from scores). Make it *more* adaptive, not more
   rigid.
4. **Build the premium experience.** Use the patterns in `references/ui-ux.md` — today-focus,
   calendar views, the "why this plan" transparency, serenity/progress signals, friendly
   adjustments. Reassurance is a feature, not decoration.
5. **Verify adaptivity, not just rendering.** Prove the plan *changed* in response to a
   signal: lower a score → weak case/specialty gets more/earlier work; skip days → backlog
   surfaces and catch-up appears; move the exam date → the horizon and taper shift. Drive it
   in the browser preview (see the app's verification workflow), don't just eyeball the code.

## Non-negotiables

These are the invariants that keep the plan trustworthy. Break one and the candidate stops
believing the plan — which defeats the entire feature.

- **Backward from the exam date.** The horizon, pacing, and end-game taper are derived from
  `programEnd(config)`. The plan always knows how many working days are left.
- **Spaced, never bunched.** Two layers of the same case never land on the same day;
  intervals grow (layer 1 → 2 → 3). The daily drill is spaced by SM-2, not "all due cards now".
- **Adaptive by construction.** The schedule is recomputed on every view from current scores,
  layer progress, and adherence — never frozen at setup. A new simulation result must be able
  to change tomorrow's plan.
- **Weakness gets the time.** Priority flows to weak/frequent/priority-specialty cases and to
  disciplines with low average scores. Mastered material recedes; it does not vanish (spacing
  still needs a final touch).
- **Respect the human.** The daily budget (hours × intensity) is a ceiling, not a suggestion;
  overflow slides forward. Off-days are sacred. Manual adjustments (mark done, postpone, skip,
  add) always win and the engine re-reasons around them.
- **Explain the plan.** Never present tasks without a visible reason. The candidate should be
  able to see *why today looks like this* and *where the plan is putting its emphasis*.
- **Calm over cram.** The tone is reassuring and honest — surface backlog without alarm, show
  progress without vanity metrics. Never manufacture urgency.

## The current implementation (source of truth)

Read these before editing so changes extend the real thing:
- `app/src/lib/program.ts` — the scheduler (`generateProgram`, `schedule`, `casePriority`,
  `disciplineStats`, `programStats`, `effectiveDoneLayers`, `programEnd`).
- `app/src/lib/programAdjust.ts` — manual interventions (mark layer done, postpone, add/remove
  extra, skip drill, set intensity, reset).
- `app/src/features/program/ProgramPage.tsx` — the UI (stat cards, intensity switch, day
  section, upcoming, discipline panel, week/month views, block rows + actions).
- `app/src/db/types.ts` — the model: `ProgramConfig`, `ProgramAdjust`, `ExtraTask`,
  `ProgramBlock`, `ProgramDay`, `Intensity`, `Layer`, `AssistanceMode`.

## Reference files — read the one that fits the task

- **`references/learning-science.md`** — the evidence base and how each principle maps to a
  concrete rule in this app. Read it before changing *what* gets scheduled *when*.
- **`references/engine.md`** — the data model, the scheduling algorithm, the adaptivity
  signals, and the evolution roadmap (forgetting-curve intervals, per-part weakness, adaptive
  intensity, exam taper, backlog/catch-up, profile & preferences). Read it before changing the
  planner logic.
- **`references/ui-ux.md`** — the premium experience: setup wizard, today-focus, calendar
  views, transparency, serenity/progress signals, adjustments, edge/empty states, motion,
  accessibility. Read it before changing anything the candidate sees.

Keep all three in sync: a new adaptivity signal in the engine needs a matching principle in
the science file and a visible cue in the UI, or it will feel like magic the candidate can't
trust.
