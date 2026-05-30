# Elapsed & Race Time Display — Design Spec

**Date:** 2026-05-29
**Status:** Implemented

---

## Problem

The driver has no way to see how long the total race has been running, only the current leg's elapsed time. The tracker gives families no sense of how long the runner has been on the current leg. Both apps would benefit from a persistent race clock and a live leg elapsed time.

## Goal

Add two live clocks to the driver and tracker apps:
1. **Race time** — total time since the first leg started, shown in a sticky banner at the top
2. **Leg elapsed** — time since the current leg started, shown inside the hero/timing area

Both must fit in existing layouts with no new sections. Both tick live client-side every second.

---

## Visual Design

### Banner (both apps)

A persistent strip at the very top of the screen, always visible:

```
● RunGMC          4:12:08
                  RACE TIME
```

- Dark navy background (`#0f172a`), blue bottom border (`#1e3a5f`)
- Pulsing blue dot (`#60a5fa`) + team name on the left
- Race clock (`H:MM:SS`, `#60a5fa`, monospace) + "Race time" label on the right
- Shows `0:00:00` before race starts (no results yet)
- In the tracker: `position: sticky; top: 0; z-index: 10` so it stays in view while scrolling the leg timeline

### Driver (TimingScreen)

Banner sits above the existing "Now on course" header. The Elapsed/ETA card is unchanged.

### Tracker (TeamDetail hero card)

Banner sits below the `← All Teams | TeamName | Share` header (sticky). Inside the hero card, leg elapsed appears as a small muted line directly below the pace badge:

```
11:47 AM   [On pace]
41:22 on this leg
─────────────────────
→ Lost Valley TH    [Meet here ↗]
```

---

## Data & Architecture

### Race time source

**Tracker:** Derived client-side from `timeline` data already fetched. `raceStartedAt` = `startedAt` of the result with the earliest `startedAt` among all timeline items that have a result. The component re-renders every second via the existing `secondsSinceUpdate` tick, so no extra interval is needed.

**Driver:** The `/current` endpoint currently only returns the active result's `startedAt`. A new field `raceStartedAt: string | null` must be added to the `in-progress` response — the `startedAt` of the team's earliest `LegResult` (one extra `findFirst` query, ordered by `startedAt asc`). Returns `null` if no results exist (shouldn't happen in `in-progress` state, but defensive).

When `raceStartedAt` is null or the race hasn't started, the banner displays `0:00:00`.

### Leg elapsed source

**Driver:** Already computed — `elapsed` state in `TimingScreen` is `Date.now() - new Date(startedAt).getTime()` ms. No change needed; it already drives the "Elapsed" display in the stat card.

**Tracker:** Derived client-side from `activeItem.result.startedAt`. Same tick as above.

### Clock format

Both use `formatElapsed(ms: number): string` — already in `apps/driver/src/api.ts`, outputs `H:MM:SS` for ≥1 hour, `M:SS` below. The same function needs to be added to `apps/tracker/src/api.ts`.

---

## Edge Cases

| State | Banner race time | Leg elapsed (tracker hero) |
|---|---|---|
| Race not started | `0:00:00` | Hero card not shown |
| Race in-progress | Live ticking from first result `startedAt` | Live ticking from active result `startedAt` |
| Race complete (driver CompleteScreen) | Out of scope — banner not shown on CompleteScreen |  |

---

## Files Changed

| File | Change |
|---|---|
| `server/src/routes/results.ts` | Add `raceStartedAt` to `in-progress` `/current` response |
| `apps/driver/src/api.ts` | Add `raceStartedAt: string \| null` to `CurrentStateInProgress` type |
| `apps/driver/src/App.tsx` | Thread `raceStartedAt` through `racing` view state |
| `apps/driver/src/components/TimingScreen.tsx` | Add `raceStartedAt` prop; add race time banner |
| `apps/driver/src/components/StartScreen.tsx` | Add race time banner (always shows `0:00:00`) |
| `apps/tracker/src/api.ts` | Add `formatElapsed` function |
| `apps/tracker/src/components/TeamDetail.tsx` | Add sticky banner; add leg elapsed below pace badge in hero card |

---

## Verification

1. Start the driver app and auth into a team — banner shows `0:00:00` on the StartScreen
2. Press START — banner begins ticking from `0:00:00`
3. Record a LAP — banner continues ticking (race time doesn't reset), leg elapsed in stat card resets to the new leg's startedAt
4. Open the tracker, navigate to a team in-progress — banner shows same race time as driver (within ~1s), leg elapsed shows time since current leg started
5. Scroll the tracker timeline — banner sticks to the top
6. With no active race, tracker team detail banner shows `0:00:00`
7. Both clocks tick every second without jank
