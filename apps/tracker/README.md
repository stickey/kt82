# Tracker App

Public read-only race status board for spectators and team supporters.

## What It Does

- Shows all teams' current status at a glance (2-column card grid)
- Displays live ETA, current runner, and pace status (on pace / ahead / overdue) for each in-progress team
- Tap a team card to see the full leg-by-leg timeline with embedded course overview (all 18 legs with runner names, start/finish times, and map links)
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

**No longer accessible from the Tracker UI.** The file (`LegProgressScreen.tsx`) is retained but not reachable from any navigation path in Tracker. The equivalent view is available in the Driver app via the **"WHEN DO THEY ARRIVE?"** button on the Timing screen.

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

## Course Overview

Embedded directly in the team detail page — no separate screen or tap required. Shows the entire 18-leg course scrollable below the hero card, contextualised to the viewing team's current position.

**What it shows:**
- All 18 leg rows with done / active / upcoming status styling:
  - **Done** — green-washed background, green left stripe
  - **Active** — accent-highlighted background with border, LIVE badge
  - **Next** — NEXT outlined badge; remaining legs are unstyled
- Per-leg **runner name** (or `—` if unassigned), **mileage**, and two tappable **map links** (START / FINISH) that open Google Maps in a new tab
- Per-leg **start time** and **finish time or ETA** in monospace — completed legs show actual times, the active leg shows ETA, and upcoming legs show projected times based on target pace

The course data (coordinates, mileage) is static. Runner names and times come from the team's live timeline.

## Pre-Race Screen

Shown when a team has not yet started leg 1 — replaces the live race view. Once the team starts, the 30-second poll detects the change and automatically shows the live view.

**What it shows:**
- **Header** — team name, `PRE-RACE · ESTIMATES ONLY` status, `YOUR START` card with gun time
- **Countdown** — live `HH:MM:SS` timer to the team's start time; turns green and reads `RACE IN PROGRESS` once started
- **Hero** — orange card with team start time, estimated finish time in Hermann, total miles/legs
- **Course overview** — all 18 legs embedded below the hero, showing each runner, projected start/finish times based on target pace, and START/FINISH map links

**Start time:** Hardcoded at **7:00 AM on the race date** (`race.date` with hours set to 7 local time). This is a hardcode for the single team currently using this feature — revisit if multiple teams with different start times need support.

**Estimated handoff times** are computed by walking `COURSE_LEGS` in order and accumulating `targetPaceSecPerMile × distanceMiles` from the start time. Legs with no assignment contribute 0 duration (times after them are still shown but may be wrong).

**Testing the pre-race screen:**
- `?prerace` — forces the pre-race screen regardless of race state. Remove param + refresh to return to live view.
- `?startoffset=<ms>` — sets the start time to `now + <ms>` milliseconds. Pre-race shows with a live countdown; when it reaches zero the screen automatically transitions to the live view (assuming the race has started in the DB). Implies `?prerace` behavior for the duration.

The query param goes **before** the `#`, e.g.:
```
# Force pre-race (production)
https://kt82.onrender.com/tracker/?prerace#team/<teamId>

# 60-second countdown then auto-transition (production)
https://kt82.onrender.com/tracker/?startoffset=60000#team/<teamId>

# Local dev
http://localhost:5173/?prerace#team/<teamId>
http://localhost:5173/?startoffset=60000#team/<teamId>
```

## File Structure

```
src/
  api.ts              — public API client, TeamStatus type, formatTime helper
  App.tsx             — hash router, race auto-detect on mount
  components/
    TeamGrid.tsx          — polling grid of all teams; "Updated Xs ago" counter
    TeamDetail.tsx        — hero section (current runner + ETA, MAP button) + embedded CourseScreen with runner names and times
    LegProgressScreen.tsx — pace-swept progress bar + arrival table (not reachable from Tracker UI; retained for reference)
    LegMapScreen.tsx      — full-screen Leaflet map with runner position, route, ETA label, estimates table
    CourseScreen.tsx      — all-18-legs course overview with runner names, start/finish times, and map links; embedded in TeamDetail and PreRaceScreen
    PreRaceScreen.tsx     — pre-race landing page: countdown, hero, embedded CourseScreen with projected times (shown before leg 1 starts)
```
