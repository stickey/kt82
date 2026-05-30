# Family Spectator ETAs — Design Spec

**Date:** 2026-05-29
**Status:** Implemented

---

## Problem

Families don't follow a relay race from start to finish. They drive ahead to a specific handoff point and wait for their runner. Currently the tracker shows ETA only for the active leg, and navigation links only appear for that same leg's next handoff. Families have no way to look ahead at future legs.

## Goal

Add projected arrival times and navigation links for all future (not-started) handoff points directly in the existing `TeamDetail` leg timeline — no new UI sections, no server changes.

---

## Visual Design

Option B (selected): projected time right-aligned, navigation link as a second row below the leg name.

**Not-started leg row (after change):**
```
○  David Wolf                               ~10:51 AM
   Leg 3 · Katy Trail Jct · 6.3 mi
   ↗ Navigate to Katy Trail Junction
```

- `~` prefix on projected times signals uncertainty (distinguishes from confirmed active ETA)
- Nav link in `--blue` (`#60a5fa`), only rendered when `leg.handoff?.lat` exists
- Time shown as muted color to distinguish from the active leg's bright ETA

**Active leg row** — unchanged; hero card already shows ETA + nav link.

**Completed leg row** — unchanged.

---

## ETA Chaining Logic

Computed client-side from the existing `LegTimelineItem[]` data on every poll refresh (30s). Stored as a derived value — not in separate state — so it always reflects the latest server anchor.

```
anchor = activeItem.eta.eta          // server-calculated Date for current leg finish
for each not-started item in leg order:
  duration = item.assignment.targetPaceSecPerMile × item.leg.distanceMiles  (seconds)
  projectedArrival = anchor + duration
  map.set(item.leg.id, projectedArrival)
  anchor = projectedArrival
```

Build `projectedTimes: Map<string, Date>`. Only legs with a non-null `assignment` get an entry.

---

## Edge Cases

| Situation | Projected time | Nav link |
|---|---|---|
| No active leg (race not started) | `—` | Show if handoff has coordinates |
| Leg has no assignment (no pace) | `—` | Show if handoff has coordinates |
| Leg has no handoff coordinates | `—` | Omit entirely |
| Normal not-started leg | `~HH:MM AM/PM` | Show |

---

## Implementation Scope

**One file changed:** `apps/tracker/src/components/TeamDetail.tsx`

1. After deriving `activeItem`, compute `projectedTimes` map (derived from `items`, no `useState`)
2. In the not-started leg render: add projected time (right) and nav link (second row)
3. Reuse `formatTime` (already imported from `../api`)
4. Reuse Apple Maps URL builder already present in the file for the hero card nav link

No changes to: server routes, shared package, other apps, CSS.

---

## Verification

1. `pnpm --filter tracker dev` with a race in-progress
2. Not-started legs show `~HH:MM AM/PM` projected times, increasing down the list
3. Each not-started leg with handoff coordinates shows `↗ Navigate to [Name]` link
4. Tapping the nav link opens Apple Maps to the correct coordinates
5. After a lap is recorded, projected times update on next poll (≤30s)
6. Legs without assignment show `—` for time; nav link still appears if handoff has coordinates
7. If race not started, times show `—`, nav links still appear
