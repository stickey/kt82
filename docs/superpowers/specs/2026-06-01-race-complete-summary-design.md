**Status:** Implemented

# Race Complete Summary — Leg Splits with Pace vs Target

## Context

When the driver app reaches the `CompleteScreen` after the last leg, it already shows a basic list of leg splits (runner name + elapsed time). However it doesn't show pace per mile or how each runner compared to their target pace. Race teams care about this — it's the primary feedback loop for improvement year over year.

## Design

Enhance the existing `CompleteScreen` split list to show three columns per leg:
- **Actual pace** — computed from elapsed time ÷ distance (formatted as mm:ss/mi)
- **Target pace** — from `assignment.targetPaceSecPerMile` (formatted as mm:ss/mi)
- **Delta** — difference, colored green (ahead) or amber (behind), shown as `+m:ss` or `-m:ss`

The total race time banner at the top remains unchanged.

### Row layout (mobile, 375px)

```
Leg 4  Alice Smith
       32:14  ·  8:24/mi  vs 8:30  ▲ 0:06 ahead
```

Leg number and runner name on the first line (existing). Second line: elapsed · actual pace · target pace · delta chip.

### Pace formatting

Add `formatPace(secPerMile: number): string` to `apps/driver/src/api.ts`:
```ts
export function formatPace(secPerMile: number): string {
  const m = Math.floor(secPerMile / 60)
  const s = Math.round(secPerMile % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}
```

Actual pace per leg = `(finishedAt - startedAt) in seconds / leg.distanceMiles`.

Delta = `targetPaceSecPerMile - actualPaceSecPerMile`:
- Positive → runner was **ahead** of target (ran faster) → green
- Negative → runner was **behind** target → amber

### Legs with no assignment

If `item.assignment` is null (no target pace set), omit the vs/delta portion and show only elapsed + actual pace.

## Changes

| File | Change |
|---|---|
| `apps/driver/src/api.ts` | Add `formatPace(secPerMile: number): string` utility |
| `apps/driver/src/components/CompleteScreen.tsx` | Enhance split rows — add actual pace, target pace, delta |

No server changes required. `LegTimelineItem` already carries `assignment.targetPaceSecPerMile`, `result.startedAt/finishedAt`, and `leg.distanceMiles`.

## Verification

1. Run a race to completion (or use dev data with known times)
2. Complete screen should show each completed leg with elapsed time, actual pace, and — for legs with assignments — a target pace and delta
3. A runner faster than target should show green "ahead" delta; slower should show amber "behind"
4. Legs without assignments should show elapsed + pace only, no delta
