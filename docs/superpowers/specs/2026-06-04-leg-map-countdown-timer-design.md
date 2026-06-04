# Spec: Leg Map Runner Icon — Countdown Timer

**Status:** Approved  
**Date:** 2026-06-04

## Summary

Change the timer label on the runner icon in `LegMapScreen` (both tracker and driver apps) from elapsed leg time to a countdown showing time remaining until on-pace arrival.

## Problem

The runner icon currently displays elapsed time since leg start (e.g. "4:23" counting up). For spectators and drivers waiting at a handoff point, the more useful number is how long until the runner arrives — a countdown to zero.

## Design

### What changes

In `apps/tracker/src/components/LegMapScreen.tsx` and `apps/driver/src/components/LegMapScreen.tsx`, in the per-tick `useEffect` that updates the runner marker, replace:

```ts
const legTime = fmtElapsed(nowMs - startedAtMs)
```

with:

```ts
const legTime = fmtElapsed(ests[2].remain * 1000)
```

`ests[2]` is the on-pace estimate already computed earlier in the same effect. `remain` is seconds remaining until on-pace finish, clamped to `0` by `lpEstimates`. Multiplying by 1000 converts to milliseconds for `fmtElapsed`.

### What stays the same

- `fmtElapsed` formatter is unchanged — the output format (`m:ss` or `h:mm:ss`) is the same
- `makeRunnerIcon` is unchanged
- The destination marker (which already shows the wall-clock ETA) is unchanged
- No new formatters, helpers, or props are needed

### Edge cases

- **Runner overdue (past on-pace finish time):** `remain` is clamped to `0`, so label shows "0:00" and stays there. This correctly signals the runner should be arriving imminently.
- **Both apps identical:** tracker and driver share the same component code; both files get the same one-line change.

## Files Changed

- `apps/tracker/src/components/LegMapScreen.tsx` — line 178
- `apps/driver/src/components/LegMapScreen.tsx` — line 178
