# Tracker App

Public read-only race status board for spectators and team supporters.

## What It Does

- Shows all teams' current status at a glance (2-column card grid)
- Displays live ETA, current runner, and pace status (on pace / ahead / overdue) for each in-progress team
- Tap a team card to see the full leg-by-leg timeline
- Tap the **Est. Arrival** time in the hero card to open the leg progress screen (see below)
- Tap **"ALL 18 LEGS →"** on the team detail to open the full course overview (see below)
- Share a direct link to a team's view via native share sheet or clipboard copy
- Auto-detects the active race — no configuration needed
- Polls for updates every 30 seconds; shows "Unable to refresh" on network loss without clearing stale data

## Running

The API server must be running first:
```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm dev
```

```bash
# From repo root
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker dev
```

Opens at **http://localhost:5173**

## Auth

None — fully public. No login required.

## URL Format

Team detail views use hash routing: `http://localhost:5173/#team/<teamId>`

These URLs are shareable and bookmarkable. Opening a direct team link works without going through the grid first.

## Leg Progress Screen

Reachable from the team detail page by tapping the **Est. Arrival** time in the hero card. A **"BY PACE →"** pill appears beneath the arrival time to indicate it's tappable.

**What it shows:**
- **Runner name**, leg number, destination, and target pace in the header
- **Progress bar** — estimated position on the current leg, with an I-beam range marker spanning the ±30 s/mi uncertainty. A white notch marks the best estimate; the range fill shows the spread at ~40% opacity
- **Arrival by pace table** — 5 rows spanning the runner's target pace ±30 s/mi in 15 s steps, fastest first:

  | PACE | ARRIVES | IN | Δ | LEG TIME |
  |---|---|---|---|---|
  | Scenario pace | Estimated clock time | Countdown | ±min:sec vs target | Total leg duration |

  The target-pace row is highlighted. Δ is red if slower than target, green if faster.
- All numbers tick every second. No API calls — derived from existing timeline data.

Back button returns to the team detail.

## Course Overview Screen

Reachable from a team's detail page by tapping **"THE COURSE / ALL 18 LEGS →"** in the section header. Shows the entire 18-leg course on one scrollable screen, contextualised to the viewing team's current position.

**What it shows:**
- Live race clock (ticking every second) and a blinking **LIVE** indicator
- Progress bar with a position marker dot showing how far through the course the team is
- Tally pills: `✓ N DONE`, `● ON LEG N`, `N TO GO`
- "Race in Progress" callout with the current leg's start → finish names
- All 18 leg rows with done / active / upcoming status styling:
  - **Done** — green-washed background, green left stripe, ✓ DONE badge
  - **Active** — accent-highlighted background with border, LIVE badge
  - **Next** — NEXT outlined badge; remaining legs are unstyled
- Per-leg **difficulty chip** (Easy / Medium / Difficult, with Distance or Single Track note where applicable)
- Per-leg **mileage** in monospace

**Map links (the main feature):** Every leg row has three tappable Google Maps links — all open in a new tab:
- **START** — drops a pin at the leg's start coordinates
- **FINISH** — drops a pin at the leg's finish coordinates
- **FULL DIRECTIONS ↗** — turn-by-turn route from start to finish

Back button returns to the team detail. The course data (coordinates, difficulty, mileage) is static — it reflects the fixed KT82 course, independent of what legs have been seeded into the database.

## File Structure

```
src/
  api.ts              — public API client, TeamStatus type, formatTime helper
  App.tsx             — hash router, race auto-detect on mount
  components/
    TeamGrid.tsx      — polling grid of all teams; "Updated Xs ago" counter
    TeamDetail.tsx    — hero section (current runner + ETA, tappable for leg progress) + full leg timeline
    LegProgressScreen.tsx — pace-swept progress bar + arrival table for the live leg
    CourseScreen.tsx  — all-18-legs course overview with map links and live clock
```
