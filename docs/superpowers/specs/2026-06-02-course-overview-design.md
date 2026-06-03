# Course Overview Screen — Design Spec

**Date:** 2026-06-02  
**Status:** Implemented  
**Scope:** Tracker + Driver apps; read-only screen layered on existing data

---

## Overview

A new full-screen "THE COURSE" view showing all 18 legs of the KT82 relay at once. Each leg row has tappable Google Maps links for its START and FINISH coordinates and a "FULL DIRECTIONS" route link. The screen also shows the live race clock, a LIVE blinker, a progress bar with a position marker, tally pills, and a "now running" callout. Leg rows are visually differentiated by status: done (green wash), active (accent highlight + LIVE badge), upcoming (plain). A difficulty chip per row shows Easy / Medium / Difficult.

The design tokens, fonts, and component patterns follow the existing Direction B redesign verbatim. No new API endpoints. No changes to the timing state machine, auth, or polling.

**Reference:** `resources/designs/design_handoff_kt82_course_overview/` — the `course-legs.jsx` and `README.md` are the canonical visual and behavioral reference. Pixel values there are source of truth; convert to nearest Tailwind step or use arbitrary values.

---

## Shared data module

### `packages/shared/src/course.ts`

New file exporting:

```ts
export interface CourseLeg {
  legNumber: number
  startName: string
  startLat: number
  startLng: number
  endName: string
  endLat: number
  endLng: number
  miles: number
}

export const COURSE_LEGS: CourseLeg[]   // 18 entries, data from handoff README table

export interface LegDifficulty {
  tier: 'easy' | 'medium' | 'difficult'
  note?: 'distance' | 'single-track'    // only for some difficult legs
}
export const LEG_DIFFICULTY: Record<number, LegDifficulty>  // keyed 1–18

export function mapPoint(lat: number, lng: number): string
// → https://www.google.com/maps?q={lat},{lng}

export function mapRoute(a: { lat: number; lng: number }, b: { lat: number; lng: number }): string
// → https://www.google.com/maps/dir/{a.lat},{a.lng}/{b.lat},{b.lng}
```

Static values come directly from the handoff's reference table (18 legs, coordinates as listed). `COURSE_LEGS[0].startName` = "Maryland Heights Aquaport" (leg 1 start; no leg-0 handoff in the DB).

`packages/shared/src/index.ts` re-exports `CourseLeg`, `COURSE_LEGS`, `LegDifficulty`, `LEG_DIFFICULTY`, `mapPoint`, `mapRoute` alongside existing exports.

---

## Component: `CourseScreen`

### Prop shape (same for both apps)

```ts
interface CourseScreenProps {
  legs: CourseLeg[]
  currentLegNumber: number   // 0 = not started (all upcoming); >18 = complete (all done)
  raceStartedAt: string | null   // null → suppress clock + LIVE indicator
  teamName: string
  backLabel: string          // "← TEAM NAME" (Tracker) or "← TIMING" (Driver)
  onBack: () => void
}
```

### Internal sub-components (not exported)

**`LegRow`** — renders one leg: 3-column grid (`40px 1fr auto`), status stripe, leg number + badge (LIVE / ✓ DONE / NEXT / nothing), two `MapLink` rows with a connector line, "FULL DIRECTIONS ↗" link, difficulty chip + mileage. State derived: `n < currentLegNumber` → done, `n === currentLegNumber` → now, `n > currentLegNumber` → upcoming.

**`MapLink`** — a single `<a target="_blank" rel="noopener noreferrer">` with `e.stopPropagation()`. Grid `12px 1fr auto`: status dot → label + place name → map-pin SVG. Dot is filled for FINISH (done/now), hollow ring for START or any upcoming point.

### Screen layout (top → bottom)

1. **Top bar** — back button (left) + blinking green dot + LIVE (right). Suppressed/grayed when `raceStartedAt` is null.
2. **Title block** — accent eyebrow `KT82 · KATY TRAIL RELAY · {teamName}`, display headline `THE COURSE`.
3. **Race clock + position** — left: `formatRaceTime(now − raceStartedAt)` ticking every second; right: `LEG {n} / 18` + miles done. Progress bar with accent fill and position marker dot. Tally pills: `✓ N DONE` (green), `● ON LEG N` (accent), `N TO GO` (faint). Now-running callout box (blinking accent dot + `RACE IN PROGRESS · ON LEG N` + `{start} → {end}`). Entire clock+position block is hidden when `raceStartedAt` is null (replace with a minimal "Race not started" note).
4. **Column header** — `LEG · START → FINISH · DIFF · MI` labels.
5. **Leg list** — 18 `LegRow` components, vertical scroll, `padding-bottom: 36px`.

### Clock

`useEffect` interval (1 s) inside `CourseScreen` increments a `tick` state to force re-render. `raceElapsedMs = Date.now() - new Date(raceStartedAt).getTime()`, formatted with the existing `formatRaceTime` util from `@kt82/shared` (or from each app's `api.ts`).

---

## Tracker wiring

**File:** `apps/tracker/src/components/TeamDetail.tsx`

- Add `showCourse: boolean` state (local).
- Change the `"The Course"` section header from a plain `<div>` to a `<button>` row: left text `THE COURSE`, right text `ALL 18 LEGS →`. Tapping sets `showCourse = true`.
- When `showCourse` is true, render `<CourseScreen>` instead of the full `TeamDetail` body.
- `onBack` sets `showCourse = false`.
- Props: `legs={COURSE_LEGS}`, `currentLegNumber={activeItem?.leg.legNumber ?? 0}`, `raceStartedAt={raceStartedAt}`, `teamName`, `backLabel={\`← ${teamName}\`}`.
- No hash-routing change — the course view is ephemeral within the team detail.
- If race is complete (`allDone`), pass `currentLegNumber={19}` (all rows render as done).

**File:** `apps/tracker/src/components/CourseScreen.tsx` (new)

---

## Driver wiring

**File:** `apps/driver/src/App.tsx`

- Add `'course'` to the `View` union:
  ```ts
  | { type: 'course'; race: Race; team: TeamSummary; pin: string; currentLegNumber: number; raceStartedAt: string; teamName: string }
  ```
- Add `handleViewCourse()` function: transitions from `'racing'` view to `'course'` view, copying `leg.legNumber`, `raceStartedAt`, `team.name`.
- Add `handleBackFromCourse()`: transitions back to `'racing'` view (all racing props preserved in the course view state — include `resultId`, `startedAt`, `nextHandoff`, `currentRunner`, `nextRunner`, `nextLeg`, `nextRunnerEta` in the `'course'` view shape, or re-derive from the racing view before transitioning).
- When `view.type === 'course'`, render `<CourseScreen>` with the stored props.

**File:** `apps/driver/src/components/TimingScreen.tsx`

- Add `onViewCourse: () => void` prop.
- Add a secondary button below the existing "Navigate to…" button: `VIEW ALL 18 LEGS · THE COURSE →`. Styled as a secondary action (outlined or muted), min-height 44px.

**File:** `apps/driver/src/components/CourseScreen.tsx` (new)

---

## Data reference (from handoff)

`totalMiles = 84.66`. Difficulty values:

| Legs | Tier | Note |
|---|---|---|
| 3, 9, 10, 16 | Easy | — |
| 1, 2, 8, 12, 14, 17, 18 | Medium | — |
| 4, 11, 13, 15 | Difficult | distance |
| 5, 6, 7 | Difficult | single-track |

Coordinates and leg names verbatim from the handoff README table (18 rows).

---

## Map link strategy

Three links per leg — all `target="_blank" rel="noopener noreferrer"`, all call `e.stopPropagation()`:

| Link | Helper | Trigger |
|---|---|---|
| START point | `mapPoint(startLat, startLng)` | Tapping the START row |
| FINISH point | `mapPoint(endLat, endLng)` | Tapping the FINISH row |
| Full directions | `mapRoute({startLat,startLng}, {endLat,endLng})` | "FULL DIRECTIONS ↗" |

These are **distinct** from the existing `buildNavUrl(handoff)` helper (which builds a directions-to link for driving to the next handoff). Do not reuse `buildNavUrl` here.

---

## Implementation order

1. Add `course.ts` to `packages/shared/src/` with static data, difficulty map, and URL helpers. Re-export from `index.ts`.
2. Build `CourseScreen.tsx` in `apps/tracker/src/components/` — full component with clock, progress, leg list.
3. Wire Tracker: convert the "The Course" section header in `TeamDetail.tsx` to a button; add `showCourse` state; render `CourseScreen` when true.
4. Build `CourseScreen.tsx` in `apps/driver/src/components/` — same component, same props (can be adapted from Tracker version).
5. Wire Driver: add `onViewCourse` prop to `TimingScreen`, add `handleViewCourse`/`handleBackFromCourse` in `App.tsx`, add `'course'` view type.
6. Verify against `KT82 Prototype.html`: done legs green-washed ✓, active leg accent + LIVE, upcoming plain; all map links open correctly; clock ticks; LIVE blinks.

---

## Out of scope

- Captain and Manager apps — no changes.
- Polling, auth, timing state machine — no changes.
- Light/dark theme: Tracker supports both (CSS vars handle it automatically). Driver is dark-only (same as today).
- GPS, real-time leg progress — no changes; ETAs remain pace-based only.
