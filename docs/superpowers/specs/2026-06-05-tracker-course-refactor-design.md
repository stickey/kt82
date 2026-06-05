---
title: Tracker — CourseScreen as Primary Subscreen
date: 2026-06-05
status: Approved
---

## Overview

Refactor the Tracker app so that `CourseScreen` is the primary subscreen inside `TeamDetail`, replacing the current inline "Arrivals" leg list. `CourseScreen` is enhanced to show runner names and anticipated start/finish times per leg. The same enhanced `CourseScreen` replaces the route/trail section in `PreRaceScreen`. `LegProgressScreen` is removed from the Tracker navigation.

A git tag `pre-tracker-course-refactor` is created before any code changes.

---

## Section 1 — CourseScreen (Tracker) enhancements

**New props:**
- `timeline?: LegTimelineItem[]` — provides runner names and result/ETA data per leg
- `assignedStartTime?: Date` — anchor for projected times when race hasn't started
- `onBack` becomes optional; when absent, the top bar (back button, LIVE indicator) is hidden (embedded mode)

**LegRow restructure:**

3-column outer grid `(40px | 1fr | auto)` with 2 internal rows:
- Row 1 spans cols 2–3: runner name (left) + difficulty chip (right)
- Row 2 col 2: existing START/FINISH map links + full directions link
- Row 2 col 3: labeled START + ETA/FINISH time blocks (right-aligned)

The two-row structure ensures the START label in the map column and the START label in the time column are vertically aligned.

**Time values per leg:**
- **Done**: actual `result.startedAt` + `result.finishedAt`
- **Active**: actual `result.startedAt` + `eta.eta` (labeled "ETA", prefixed `~`)
- **Not-started**: projected start + projected end, chained from the active leg's ETA using `assignment.targetPaceSecPerMile × leg.distanceMiles`; projected values prefixed `~`
- **No assignment**: times shown as `—`

**Race header callout** (the "Race in Progress · On Leg N" box): add the active runner's name from the timeline item.

---

## Section 2 — TeamDetail changes

**Remove:**
- `showCourse` state, `setShowCourse` calls, and the `if (showCourse) return <CourseScreen …/>` full-screen block
- `showLegProgress` state, `setShowLegProgress` calls, and the `if (showLegProgress) return <LegProgressScreen …/>` block
- `LegProgressScreen` import
- The entire "Arrivals" section: the `<button onClick={() => setShowCourse(true)}>` header, the leg count label, and the inline `sorted.map(...)` leg list
- The auto-exit effect that reset `showLegProgress` (the `showLegMap` reset stays)
- The `onClick={() => setShowLegProgress(true)}` wrapper around the "Est. Arrival" cell in the hero card — becomes a plain non-interactive `<div>`

**Add:**
- Inline `<CourseScreen>` at the bottom of the primary view, passing `timeline`, `assignedStartTime`, `currentLegNumber`, `raceStartedAt`, `teamName` — no `onBack` prop (embedded mode, hides its top bar)
- CourseScreen owns the projected-times computation internally (removes the need for the `projectedTimes` map in TeamDetail)

---

## Section 3 — PreRaceScreen changes

**Keep:** header (team name, YOUR START panel), countdown band, hero start→finish box.

**Remove:**
- The entire "THE ROUTE" section: `TrailNode`, `TrailLeg` components, the `schedule` memo, and the helper functions `prClock`/`prDate`/`prCd` that are only used in the route section
- The `finishTime` derivation moves inline (simple: last item of the schedule array → can be a plain computed value for the hero box)

**Add:**
- Inline `<CourseScreen>` in place of the route section, passing `timeline`, `assignedStartTime`, `currentLegNumber=0`, `raceStartedAt=null`, `teamName` — no `onBack`

---

## Section 4 — APPS.md update

In the Tracker table, update the `LegProgressScreen` row:

> ↳ **LegProgressScreen** | `components/LegProgressScreen.tsx` | **No longer accessible from Tracker UI** (file retained; accessible in Driver)

---

## What is NOT changing

- Driver app: `CourseScreen`, `LegProgressScreen`, and all other Driver screens are unchanged
- `packages/shared`: no changes
- Server/API: no changes
- The hero card in TeamDetail: unchanged except the "Est. Arrival" tap target is removed
- `LegMapScreen` in Tracker: still accessible from the map button in the hero card
