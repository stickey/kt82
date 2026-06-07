---
title: Course Screen — Completed Leg Pace Chip
status: Implemented
date: 2026-06-06
---

## Summary

Add a pace chip inline next to the runner name on each completed leg row in the `CourseScreen`. The chip shows the runner's actual pace and their delta versus their target pace, color-coded by outcome.

## Scope

Applies to both `apps/tracker/src/components/CourseScreen.tsx` and `apps/driver/src/components/CourseScreen.tsx`. Both files share the same `LegRow` component structure and `legDataMap` building logic.

## Data

For a completed leg, all required data is already in the `LegTimelineItem`:

- `item.result.startedAt` — leg start timestamp (ISO string)
- `item.result.finishedAt` — leg finish timestamp (ISO string)
- `item.leg.distanceMiles` — leg distance in miles
- `item.assignment.targetPaceSecPerMile` — target pace for comparison

Pace calculation:
```
elapsedSec = (Date(finishedAt) - Date(startedAt)) / 1000
actualPaceSecPerMile = elapsedSec / distanceMiles
deltaSecPerMile = actualPaceSecPerMile - targetPaceSecPerMile
```

If `assignment` is null (no target set), the chip is omitted entirely.

## LegData Extension

Add `pace` to the `LegData` type used in `legDataMap`:

```ts
type LegData = {
  runnerName: string | null
  startTime: string | null
  endTime: string | null
  endLabel: 'Finish' | 'ETA'
  pace: { actualSecPerMile: number; deltaSecPerMile: number } | null
}
```

Computed only for `status === 'completed'` with both `result.finishedAt` and `assignment` present. All other states set `pace: null`.

## Chip Display

The chip appears inline in `LegRow`'s top row (col 2–3, row 1), between the runner name and the mileage label. It is only rendered when `isDone` and `pace` is non-null.

**Format:** `8:42  −0:08`
- Left portion: actual pace formatted as `M:SS` (minutes and zero-padded seconds)
- Right portion: delta formatted as `−M:SS` or `+M:SS` (sign always shown; negative = faster than target)

**Colors:**
- Faster than target (delta < 0): green pill — `color: var(--green)`, `background: color-mix(in srgb, var(--green) 13%, transparent)`
- Slower than target (delta > 0): orange pill — `color: var(--accent)`, `background: color-mix(in srgb, var(--accent) 13%, transparent)`
- Exactly on target (delta = 0): muted — `color: var(--mut)`, `background: color-mix(in srgb, var(--mut) 10%, transparent)`

**Typography:** Hanken Grotesk, weight 800, ~9.5px, `letter-spacing: 0.04em`. Padding `4px 8px`, border-radius `999px`.

## Pace Formatting Helper

Add a `formatPace(secPerMile: number): string` helper in the component file:

```ts
function formatPace(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
```

Delta formatted the same way, prefixed with `+` or `−` (minus sign, not hyphen).

## LegRow Interface Change

Add an optional `pace` prop:

```ts
pace?: { actualSecPerMile: number; deltaSecPerMile: number } | null
```

The chip renders between runner name and mileage in the existing row-1 flex container. The runner name gets `flex: 1; minWidth: 0; overflow: hidden; textOverflow: ellipsis; whiteSpace: nowrap` to give way to the chip if space is tight. The mileage label keeps `flexShrink: 0`.

## What Does Not Change

- Row height, layout structure, and color scheme of the existing rows
- All existing start/finish time display logic
- In-progress (LIVE) and upcoming rows — no chip shown
- The `—` placeholder for rows with no runner or no result
