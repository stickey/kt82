# Leg Progress Screen — "When Do They Arrive?"

**Date:** 2026-06-03  
**Status:** Implemented  
**Apps:** Driver, Tracker  
**Variant:** Direction A (progress bar + arrival table)

---

## Overview

A read-only detail screen that shows the **live runner's estimated position** on the current leg, swept across target pace ±30 s/mi in 15 s increments. Primary use: the next runner knows when to warm up; the team knows when to be at the exchange point.

Shown for the **live leg only**. No data fetching — all values derived client-side from existing state.

---

## Estimate Model

New function `lpEstimates(startedAtMs, nowMs, distMiles, targetPaceSecPerMile)` added to `packages/shared/src/eta.ts`.

Sweeps offsets `[-30, -15, 0, +15, +30]` sec/mile. For each offset `off`:

```
p        = targetPaceSecPerMile + off
elapsed  = max(0, (nowMs - startedAtMs) / 1000)
frac     = clamp((elapsed / p) / distMiles, 0, 1)   // estimated fraction of leg done
finishMs = startedAtMs + distMiles * p * 1000
remain   = max(0, (finishMs - nowMs) / 1000)
deltaSec = distMiles * off                           // arrival swing vs target
arrived  = nowMs >= finishMs
```

Returns an array of 5 estimate objects. Index `[2]` (offset 0) is the best/target estimate.

**Progress bar span:** The true ±30 s/mi spread is only ~3% of leg distance — too narrow to read. The drawn span is widened to a legible minimum of 10%, centered on the best estimate:

```
MIN_SPAN = 0.10
half     = max((maxFrac - minFrac) / 2, MIN_SPAN / 2)
visMin   = clamp(targetFrac - half, 0, 1)
visMax   = clamp(targetFrac + half, 0, 1)
```

`maxFrac` = fastest pace (−30 offset), `minFrac` = slowest pace (+30 offset).

---

## Navigation Wiring

### Driver

Add `leg-progress` to the `View` discriminated union in `apps/driver/src/App.tsx`. It carries the same fields as the `racing` view (same data is needed):

```ts
| { type: 'leg-progress'; race: Race; team: TeamSummary; pin: string; resultId: string | null;
    leg: Leg; startedAt: string; nextHandoff: Handoff | null; currentRunner: string | null;
    raceStartedAt: string | null; nextRunner: string | null; nextLeg: Leg | null; nextRunnerEta: string | null }
```

`handleViewLegProgress()` in App.tsx: `setView(prev => prev.type === 'racing' ? { ...prev, type: 'leg-progress' } : prev)`  
`handleBackFromLegProgress()`: `setView(prev => prev.type === 'leg-progress' ? { ...prev, type: 'racing' } : prev)`

`TimingScreen` receives a new `onViewLegProgress` prop (callback, no args). The new button sits below the twin readout panels, above the "On Deck" strip:

- Full-width button, `border-radius: 14`, height 52px minimum
- Background: `var(--green)` if on-pace/ahead, `var(--red)` if overdue (matches status color)
- Label: **"WHEN DO THEY ARRIVE?"** — Hanken Grotesk 800, 14px, `var(--ink)`
- Sub-label: `EST. RANGE · PACE ±30s/MI` — Hanken Grotesk 700, 10px, opacity 0.85, `var(--ink)`
- Right: `→` glyph, 20px

### Tracker

Add `showLegProgress` boolean to `TeamDetail`'s local state (alongside existing `showCourse`).

The `EST. ARRIVAL` time display at the bottom-left of the hero card becomes a `<button>`. Beneath the `EST. ARRIVAL` label, append a `BY PACE →` pill:

- Pill: Hanken Grotesk 800, 9px, `rgba(0,0,0,0.18)` background, `var(--ink)` text, `border-radius: 20`, padding `2px 7px`
- The entire button area (time + label + pill) is tappable; `min-height: 44px`
- `onClick={() => setShowLegProgress(true)}`

Back from leg-progress: `setShowLegProgress(false)`, `backLabel` = `← {teamName}`.

---

## Component

Two files (nearly identical, differ only in `backLabel` default and minor prop sourcing):

- `apps/driver/src/components/LegProgressScreen.tsx`
- `apps/tracker/src/components/LegProgressScreen.tsx`

### Props

```ts
interface Props {
  runner: string                  // runner's display name
  town: string                    // handoff point name (leg destination)
  legN: number
  totalLegs: number               // typically 18
  distMiles: number
  startedAtMs: number             // leg start time as ms epoch
  targetPaceSecPerMile: number
  teamName: string
  backLabel: string               // "← TIMING" (Driver) | "← {teamName}" (Tracker)
  onBack: () => void
}
```

### State

Single piece of internal state: `nowMs` — updated every 1 000 ms via `setInterval`. All five estimate rows are derived per-render from `lpEstimates(startedAtMs, nowMs, distMiles, targetPaceSecPerMile)`. No API calls.

### Layout (Direction A)

**Top bar** (flex space-between, `padding: 8px 18px`):
- Left: back button — Hanken Grotesk 800, 12px, letter-spacing 0.04em, `var(--mut)`
- Right: LIVE indicator — 7px green dot (pulsing, see Animations) + "LIVE" label Hanken 700 11px `var(--mut)`

**Title block** (`padding: 4px 18px 0`):
- Eyebrow: `LEG {n} OF {totalLegs} · {TEAM}` — Hanken 700, 11px, letter-spacing 0.13em, `var(--accent)`
- Runner name: Anton 44px, line-height 0.92, uppercase, `var(--text)`, `margin-top: 7px`
- Meta line: `→ {TOWN} · {dist} MI · TARGET {m:ss}/MI` — Hanken 800, 12px, letter-spacing 0.04em, `var(--mut)`; pace value in JetBrains Mono 700, `var(--text)`, `margin-top: 9px`

**Progress bar block** (`padding: 18px 18px 4px`):
- Header row (flex space-between, `margin-bottom: 14px`): left `ESTIMATED POSITION · NOW` Hanken 800 10px `var(--mut)` nowrap; right `≈{milesIn} OF {dist} MI` Hanken 800 11px `var(--accent)` nowrap
- Bar container: `position: relative`, height 30px. Layers (bottom→top):
  - Track: full width, 12px tall, `border-radius: 20px`, background `var(--line)`
  - Solid fill: `left: 0`, `width: visMin%`, 12px, `border-radius: 20px 0 0 20px`, background `var(--accent)`
  - Range span: `left: visMin%`, `width: (visMax−visMin)%`, 12px, background `var(--accent)66` (~40% alpha)
  - Left end-cap: at `visMin%`, `width: 3.5px`, `height: 26px`, `border-radius: 2px`, background `var(--accent)`, centered vertically
  - Right end-cap: same at `visMax%`
  - Best-estimate tick: at `targetFrac%`, `width: 3px`, `height: 18px`, `border-radius: 2px`, background `var(--panel)` (reads as notch inside span)
- Scale row (flex space-between, `margin-top: 11px`): left `0 mi · handoff` Mono 10px `var(--faint)`; center `likely range · ≈{pct}% in` Hanken 700 10px `var(--mut)` nowrap; right `{dist} mi · finish` Mono 10px `var(--faint)`

**Arrival table** (`padding: 14px 18px 26px`):
- Section title: Anton 20px uppercase, `margin-bottom: 8px`
- Container: background `var(--panel)`, `1px solid var(--line)`, `border-radius: 16px`, `overflow: hidden`
- Header row (`padding: 9px 14px`, `border-bottom: 1px solid var(--line)`): Hanken 800, 8.5px, letter-spacing 0.08em, `var(--faint)`
- 5 data rows (`padding: 11px 14px`): target row background `var(--accent)14` (~8% alpha)
- Row order: fastest first (−30 offset, earliest arrival) → slowest last (+30 offset)
- Columns (flex gap 8px):

| Column | Flex | Align | Content |
|--------|------|-------|---------|
| PACE | `0 0 52px` | left | `{m:ss}` Mono 700 14px, accent on target row; sub-tag `FASTEST`/`TARGET`/`SLOWEST` Hanken 800 7px `var(--faint)` |
| ARRIVES | `1 1 0` | right | `{h:mm}` Mono 700 14.5px (accent on target) + ` {AM/PM}` 9px `var(--mut)` |
| IN | `0 0 58px` | right | countdown `{m:ss}` Mono 12.5px `var(--mut)` |
| Δ | `0 0 50px` | right | signed `{m:ss}` Mono 700 12px; `var(--red)` if positive (slower), `var(--green)` if negative (faster), `—` if zero |
| LEG TIME | `0 0 56px` | right | `{m:ss}` Mono 12.5px `var(--mut)` |

- Delta sign uses the minus glyph `−` (U+2212), not a hyphen
- Footnote below table: "Position barely shifts with pace — but arrival can swing several minutes. Plan warm-ups off the spread, not a single time." — Hanken 600, 10.5px, `var(--faint)`, line-height 1.4, `margin-top: 10px`

---

## Animations

**LIVE dot pulse** (CSS keyframes `@keyframes lp-blink`): opacity 1 → 0.25 → 1, 1.5s ease-in-out infinite.  
Applied only when `!window.matchMedia('(prefers-reduced-motion: reduce)').matches`. The dot is rendered unconditionally; the animation class is toggled by a ref check on mount.

---

## Data Flow: What Callers Pass

### Driver (from `racing` view state in App.tsx)

| Prop | Source |
|------|--------|
| `runner` | `view.currentRunner` |
| `town` | `view.nextHandoff?.name ?? view.leg.name` |
| `legN` | `view.leg.legNumber` |
| `distMiles` | `view.leg.distanceMiles` |
| `startedAtMs` | `new Date(view.startedAt).getTime()` |
| `targetPaceSecPerMile` | fetched via ETA poll — add to `racing` view state (see below) |
| `teamName` | `view.team.name` |
| `backLabel` | `"← TIMING"` |

`targetPaceSecPerMile` is not currently stored on the `racing` view. The ETA poll in `TimingScreen` already receives an `eta` object from the server's `/teams/:id/current` endpoint. The server response for `status: 'in-progress'` needs to include `targetPaceSecPerMile` (the active leg's assignment pace), or we derive it from the `eta` object. The cleanest path: add `targetPaceSecPerMile` to the `CurrentStateInProgress` API type and include it in the server's current-state response so it flows into view state.

### Tracker (from `TeamDetail` timeline state)

| Prop | Source |
|------|--------|
| `runner` | `activeItem.runner.name` |
| `town` | `activeItem.leg.handoff?.name ?? activeItem.leg.name` |
| `legN` | `activeItem.leg.legNumber` |
| `distMiles` | `activeItem.leg.distanceMiles` |
| `startedAtMs` | `new Date(activeItem.result.startedAt).getTime()` |
| `targetPaceSecPerMile` | `activeItem.assignment.targetPaceSecPerMile` |
| `teamName` | `teamName` prop |
| `backLabel` | `← ${teamName}` |

`activeItem.assignment` is already available in the `LegTimelineItem` type.

---

## Server Change

The `/teams/:id/current` endpoint in `server/src/routes/results.ts` already includes `assignment` in its JSON response (which contains `targetPaceSecPerMile`), but the client type `CurrentStateInProgress` in `apps/driver/src/api.ts` doesn't declare it. Two small changes:

1. Add `targetPaceSecPerMile: number | null` as an explicit top-level field to the server's `res.json(...)` response (e.g. `targetPaceSecPerMile: assignment?.targetPaceSecPerMile ?? null`).
2. Add `targetPaceSecPerMile: number | null` to `CurrentStateInProgress` in `apps/driver/src/api.ts`.

No change needed to `packages/shared/src/types.ts` — `CurrentStateInProgress` lives only in the Driver app's `api.ts`.

The `racing` view state in `App.tsx` then stores `targetPaceSecPerMile` so it can be passed through to `LegProgressScreen`.

---

## Files Changed

| File | Change |
|------|--------|
| `packages/shared/src/eta.ts` | Add `lpEstimates()` export |
| `server/src/routes/results.ts` | Add `targetPaceSecPerMile` as explicit top-level field in current-state response |
| `apps/driver/src/api.ts` | Add `targetPaceSecPerMile: number \| null` to `CurrentStateInProgress` |
| `apps/driver/src/App.tsx` | Add `leg-progress` view type; `handleViewLegProgress` / `handleBackFromLegProgress`; pass `targetPaceSecPerMile` through view state |
| `apps/driver/src/components/TimingScreen.tsx` | Add `onViewLegProgress` prop + "WHEN DO THEY ARRIVE?" button |
| `apps/driver/src/components/LegProgressScreen.tsx` | New component |
| `apps/tracker/src/components/TeamDetail.tsx` | Add `showLegProgress` state; make EST. ARRIVAL tappable with BY PACE pill |
| `apps/tracker/src/components/LegProgressScreen.tsx` | New component |
