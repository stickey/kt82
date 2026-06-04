# Spec: Leg Map Status Chrome — Elapsed Leg Time + Refresh Timer

**Status:** Approved  
**Date:** 2026-06-04

## Summary

Add two pieces of information to the top-right chrome of `LegMapScreen`: the elapsed leg time alongside the existing race time, and a refresh timer (`Xs ago`) showing how stale the underlying data is.

## Changes

### 1. Elapsed leg time — `LegMapScreen`

Add a `LEG m:ss` label to the top-right area, alongside the existing `RACE m:ss`. Uses `fmtElapsed(nowMs - startedAtMs)`, which is already available in the component. No new props needed.

**Current layout (top-right):**
```
RACE 1:23:45   ● LIVE
```

**New layout:**
```
RACE 1:23:45   LEG 4:12   ● LIVE
```

Both time labels use the same style: `RACE`/`LEG` in 8px faint uppercase label, value in 12px JetBrains Mono.

### 2. Refresh timer — `LegMapScreen`

Add an optional `lastUpdatedMs?: number` prop. When provided and the data is at least 1 second stale, show `Xs ago` below/near the LIVE dot in the same faint style used in `TeamDetail`.

The component derives `secondsSinceUpdate` from `nowMs - lastUpdatedMs` on each tick. When `lastUpdatedMs` is undefined or `secondsSinceUpdate < 1`, the element is hidden.

**New layout (with refresh timer):**
```
RACE 1:23:45   LEG 4:12   ● LIVE
                            12s ago
```

### 3. Wire up `lastUpdatedMs` — tracker `TeamDetail`

`TeamDetail` already has `lastUpdatedRef.current` (a `Date`). Pass its millisecond value as the new prop when rendering `LegMapScreen`:

```tsx
lastUpdatedMs={lastUpdatedRef.current?.getTime()}
```

### 4. Wire up `lastUpdatedMs` — driver `App.tsx`

The driver polls every 15s while on `leg-map` view. Add a `lastUpdatedMs` state variable. Set it to `Date.now()` on each successful poll. Pass it to `LegMapScreen`.

```tsx
const [lastUpdatedMs, setLastUpdatedMs] = useState<number | null>(null)
// inside the poll success handler:
setLastUpdatedMs(Date.now())
// on LegMapScreen:
lastUpdatedMs={lastUpdatedMs ?? undefined}
```

## Files Changed

- `apps/tracker/src/components/LegMapScreen.tsx` — add `lastUpdatedMs` prop, render LEG elapsed + refresh timer
- `apps/driver/src/components/LegMapScreen.tsx` — same (identical component)
- `apps/tracker/src/components/TeamDetail.tsx` — pass `lastUpdatedMs` prop
- `apps/driver/src/App.tsx` — add `lastUpdatedMs` state, wire to poll, pass as prop
