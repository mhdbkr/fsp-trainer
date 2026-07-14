# The premium experience — UI/UX for a plan the candidate trusts

The engine can be perfect and still fail if the Programme *feels* like a spreadsheet. This file is
the experience layer: how to make the plan **legible, reassuring, and premium**. The emotional
target is serenity — "I know what to do today, I trust it's right, I can see I'm on track."

Build with the project's stack: React + TypeScript, TailwindCSS, the app's `card` / `label` / `chip`
/ `btn-*` utility classes, dark-mode via `dark:` variants, hash router. Match the surrounding
components (`ProgramPage.tsx`, `Shell.tsx`, `ui.tsx`) — same radii, spacing, and tone. Never
introduce a new design language; extend the existing one.

## Table of contents
1. Experience principles
2. The setup wizard (first run)
3. Today-focus (the daily home)
4. Calendar views (week / month)
5. Transparency — "why this plan"
6. Serenity & progress signals
7. Adjustments (autonomy without friction)
8. Edge & empty states
9. Motion, polish & accessibility
10. Anti-patterns

---

## 1. Experience principles
- **One clear next action.** The candidate should always see *what to do now* before *everything
  there is to do*. Today first; the horizon second.
- **Reassure by explaining.** Every task carries a reason; the plan's emphasis is always visible.
  Trust comes from legibility, not from a prettier progress bar.
- **Calm, not gamified-anxious.** Honest progress and gentle nudges — never streak-guilt, red
  alarms, or manufactured urgency. Backlog is shown as *choices*, not *failure*.
- **Autonomy is one tap away.** Postpone, skip, mark-done, add, change intensity — frictionless,
  reversible, and the plan silently re-reasons around the choice.
- **Premium = restraint + rhythm.** Generous whitespace, a calm palette, one accent, subtle depth,
  smooth (not flashy) motion, and typographic hierarchy that makes the day scannable in two seconds.

## 2. The setup wizard (first run)
When no `ProgramConfig` exists, a static list is jarring. Replace it with a short, warm wizard that
*co-designs* the plan and ends on a confident summary. Keep it to a few focused steps:
1. **The date.** Exam date (or "I'll set weeks instead"). This anchors everything — say so:
   "On construit ton plan à rebours depuis cette date."
2. **Your week.** Days off + hours per day + intensity. Frame intensity by *feel*
   (leicht/mittel/intensiv) with the daily-minutes it implies, not raw multipliers.
3. **Where you stand.** Priority specialties + a quick per-axis `selfLevel` self-rating. Explain it
   personalises day 1 before any simulation data exists.
4. **Your plan is ready.** A confident recap: "X semaines, Y jours/semaine, ~Z min/jour, priorité
   à … — première séance aujourd'hui." One primary button into today.
Persist to `ProgramConfig`; the wizard writes intent, the engine does the rest. Let the user re-open
it later to adjust — the plan re-plans, it doesn't reset progress.

## 3. Today-focus (the daily home)
The default view is **today**, not the month. Design it as a calm daily brief:
- **Header line:** the date, a warm one-liner, and the day's budget vs planned ("~75 min · 3 blocs").
- **The blocks as a checklist**, in intended order (interleaved, retrieval-first). Each block row:
  icon by `kind`, label, `estMin`, and — critically — a **micro-reason** ("Couche 2 · autonome ·
  espacée depuis mardi"). Tapping a block deep-links into the simulation/drill/Fachwissen.
- **A single primary CTA:** "Commencer la séance" → the first/next block.
- **Done state:** when the day's blocks are complete, celebrate *quietly* ("Séance du jour bouclée ✅
  — repos me‌rité") — no confetti storm.
- **Off-day:** an explicit, guilt-free rest card ("Jour de repos — la mémoire consolide pendant les
  pauses"), tying rest to the science.

## 4. Calendar views (week / month)
Week and month are the *horizon*, secondary to today. Keep them glanceable:
- **Week:** 7 columns, today highlighted; each day shows load (a small bar/dots vs budget), block
  dots coloured by kind, and worked/planned state. Off-days visually muted.
- **Month:** density heat per day (how full vs budget), today ringed, exam date flagged with a
  countdown, phase bands (e.g. "consolidation" during the taper). Tap a day → its detail.
- **Selection drives the day panel**, so the calendar is a navigator, not a wall of text.
- Colour encodes **kind** (simulation / drill / fachwissen / aufklaerung / revision) consistently
  with the `Legend`; never invent per-view colours.

## 5. Transparency — "why this plan"
This is what separates a coach from a to-do list. Two always-available surfaces:
- **Per-block micro-reasons** (see §3): layer, assistance mode, spacing rationale, priority driver.
- **The emphasis panel** ("Où le plan met l'accent", from `disciplineStats`): per-specialty progress
  (layers done/total), avg score, and priority (haute/moyenne/basse) with a plain-language cause
  ("priorité haute — score moyen 54 %"). When adaptivity fires (a case moved earlier, a discipline
  gained share), reflect it here so the change is *seen*, not magical.
Rule: **no unexplained task, ever.** If you can't show why it's scheduled, the engine shouldn't
schedule it.

## 6. Serenity & progress signals
Progress is shown to *reassure*, calibrated honest, never vanity:
- **On-track indicator:** days-until-exam + a calm "tu es dans les temps / léger retard, voici le
  plan pour rattraper" — always paired with the *fix*, never bare guilt.
- **Coverage & backlog:** layers done vs total and shrinking `backlogUnits`, framed as momentum.
- **Adherence & streak:** worked days, gently. A missed day reshuffles without a broken-streak
  penalty.
- **Calibration reassurance:** where `feeling` < `score`, actively soothe ("tu te sous-estimes ici").
- Prefer **"tu es prêt·e à X %" / "il te reste N séances clés"** over anxious countdowns.

## 7. Adjustments (autonomy without friction)
Map every manual action in `programAdjust.ts` to a one-tap, reversible control, and let the plan
re-reason instantly:
- **Mark layer done**, **postpone** (a small menu: +1j / +3j / semaine prochaine), **skip today's
  drill**, **add a revision** (case picker), **remove** a manual task, **change intensity**, **reset
  adjustments**. Each shows an immediate, calm re-plan — the payoff for the tap is *seeing the plan
  adapt*. Confirm destructive ones (reset) softly.

## 8. Edge & empty states
- **No config:** the wizard (§2), never a blank page.
- **No data yet:** day 1 seeded from `selfLevel`/priorities so it already feels personal; say "on
  affinera dès ta première simulation".
- **Behind schedule / plan won't fit:** the calm 3-option catch-up card (rééquilibrer / intensifier /
  repousser), not a red banner.
- **Exam passed / plan complete:** a graceful close ("plan terminé — révision libre") rather than an
  empty calendar.
- **All caught up today:** the quiet done-state, optionally offering a bonus block.

## 9. Motion, polish & accessibility
- **Motion with meaning:** subtle transitions when the plan re-plans (a block gliding to its new day
  makes adaptivity *felt*); respect `prefers-reduced-motion`.
- **Depth, lightly:** soft shadows, rounded cards, one accent colour; avoid heavy gradients and
  clutter. Premium reads as *calm*.
- **Dark mode first-class** via `dark:` variants, matching the app.
- **Accessible:** semantic headings, keyboard-navigable calendar and menus, focus states, colour
  never the *only* signal (pair with icon/label), and readable contrast in both themes.
- **Fast:** the plan recomputes each render — memoise (`useMemo`) so navigation stays instant.

## 10. Anti-patterns (do not ship)
- A flat, reasonless task list — the #1 way to lose the candidate's trust.
- Red alarms, broken-streak shaming, manufactured urgency, vanity metrics.
- Overfilled days to hit a coverage number (violates the budget ceiling and the science).
- A frozen plan that ignores new results, or hidden adaptivity the panel doesn't reflect.
- A new color/spacing system that clashes with the rest of the app.
- Burying *today* under the month view — the candidate opens the Programme to know *what to do now*.
