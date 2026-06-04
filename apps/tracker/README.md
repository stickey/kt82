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

## Leg Map Screen

Reachable two ways from the team detail page:
- Tap the **🗺 MAP** button in the hero card (next to Est. Arrival) — only appears when the runner has an assignment
- Tap **MAP** at the bottom of the Leg Progress screen

Shows a full-screen, non-interactive map of the current leg with the runner's estimated position updated every second.

**What it shows:**
- **CartoDB Dark Matter** tile map (Leaflet.js) — no pan or zoom; bounds auto-fit to the leg route
- **Route polyline** — orange line tracing the actual road route
- **Green dot** at the start, **red dot** at the finish
- **Start label** floating below the green dot; **destination label** (name + on-pace ETA) floating above the red dot, updating each second
- **Runner icon** (🏃 orange circle) at the estimated position with a leg elapsed time chip below it
- **Range band** — translucent orange segment spanning the position spread
- **Top chrome:** back button, runner name, leg/team info, RACE elapsed time, pulsing LIVE dot
- **Bottom chrome** — estimates table:

  | PACE | ARRIVES | LEG TIME |
  |---|---|---|
  | Pace scenario | Estimated arrival | Estimated total leg duration |

**Auto-exit on lap:** When the 30-second poll detects a new active result (leg changed), the map view closes automatically and the team detail refreshes.

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

## Pre-Race Screen

Shown when a team has not yet started leg 1 — replaces the live race view. Once the team starts, the 30-second poll detects the change and automatically shows the live view.

**What it shows:**
- **Header** — team name, `PRE-RACE · ESTIMATES ONLY` status, `YOUR START` card with gun time
- **Countdown** — live `HH:MM:SS` timer to the team's start time; turns green and reads `RACE IN PROGRESS` once started
- **Hero** — orange card with team start time, estimated finish time in Hermann, total miles/legs
- **The Route** — full 18-leg trail timeline: start node, alternating leg segments (runner, distance, route link) and handoff nodes (estimated time, location, map link), finish node

**Start time:** Hardcoded at **7:00 AM on the race date** (`race.date` with hours set to 7 local time). This is a hardcode for the single team currently using this feature — revisit if multiple teams with different start times need support.

**Estimated handoff times** are computed by walking `COURSE_LEGS` in order and accumulating `targetPaceSecPerMile × distanceMiles` from the start time. Legs with no assignment contribute 0 duration (times after them are still shown but may be wrong).

**Testing the pre-race screen:**
- `?prerace` — forces the pre-race screen regardless of race state. Remove param + refresh to return to live view.
- `?startoffset=<ms>` — sets the start time to `now + <ms>` milliseconds. Pre-race shows with a live countdown; when it reaches zero the screen automatically transitions to the live view (assuming the race has started in the DB). Implies `?prerace` behavior for the duration.
- Example: `http://localhost:5173/#team/<id>?startoffset=30000` — shows a 30-second countdown then transitions.

## File Structure

```
src/
  api.ts              — public API client, TeamStatus type, formatTime helper
  App.tsx             — hash router, race auto-detect on mount
  components/
    TeamGrid.tsx          — polling grid of all teams; "Updated Xs ago" counter
    TeamDetail.tsx        — hero section (current runner + ETA, MAP button, leg progress) + full leg timeline
    LegProgressScreen.tsx — pace-swept progress bar + arrival table for the live leg
    LegMapScreen.tsx      — full-screen Leaflet map with runner position, route, ETA label, estimates table
    CourseScreen.tsx      — all-18-legs course overview with map links and live clock
    PreRaceScreen.tsx     — pre-race landing page: countdown, hero, trail timeline (shown before leg 1 starts)
```
