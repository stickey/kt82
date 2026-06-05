# Driver App

Race-day timing app used by the driver/timekeeper in the support vehicle to start legs, record handoffs, and track ETA.

## What It Does

- Authenticates with a team PIN, then detects whether the race has started
- **Start screen:** Displays the first leg info; hold the START button (~500ms) to begin the race
- **Timing screen:** Three equal pills — **Leg Time** (elapsed + estimated distance completed), **Time Left** (countdown + estimated distance remaining), and **ETA** (clock time + pace status) — all updating every second when target pace is set, or two pills (Leg Time + ETA) when pace is unavailable; navigate to the next handoff point; tap **"WHEN DO THEY ARRIVE?"** for a pace-sweep arrival detail (see below); tap **"VIEW ALL 18 LEGS · THE COURSE →"** for a full course overview with runner names and times (see below); hold LAP (~1500ms) to record a handoff and advance to the next leg; hold "End race early" (~1500ms) to stop
- **Complete screen:** Total race time + per-leg splits for all completed legs
- All timing buttons use long-press (hold-to-activate) to prevent accidental taps in a moving vehicle
- Timestamps are captured client-side at the moment of button activation

## Running

The API server must be running first:
```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm dev
```

```bash
# From repo root
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver dev
```

Opens at **http://localhost:5176**

## Auth

Login with your team PIN. PINs are created by the race director in the Manager app.

Dev credential: `1234` (after creating a team in Manager or via the test suite).

## Leg Progress Screen ("When Do They Arrive?")

Reachable from the timing screen via the **"WHEN DO THEY ARRIVE?"** button — a full-width button directly below the twin ETA/elapsed panels, colored green (on pace) or red (behind pace) to match the current status. Only appears once the runner's target pace is known from the server.

**What it shows:**
- **Progress bar** — estimated position on the current leg right now, with an I-beam range marker spanning the ±30 s/mi uncertainty. The track fills solid to the near edge of the range; the range span is shown at ~40% opacity; a 🏃 runner icon (orange circle) marks the best estimate. Label above shows `≈X.X OF Y.Y MI` and below shows `likely range · ≈N% in`
- **Arrival by pace table** — 5 rows, fastest arrival first:

  | PACE | ARRIVES | IN | Δ | LEG TIME |
  |---|---|---|---|---|
  | Runner's adjusted pace for each scenario | Estimated clock time | Countdown | ±min:sec vs target | Total leg duration |

  The target-pace row is highlighted in orange. FASTEST / TARGET / SLOWEST tags on the extreme and middle rows. Δ column is red if slower than target, green if faster.
- **Footnote:** "Position barely shifts with pace — but arrival can swing several minutes. Plan warm-ups off the spread, not a single time."
- Ticking **LIVE** indicator — all times update every second

Back button returns to the timing screen. No data is fetched — all values are derived from the runner's start timestamp and target pace already in view state.

## Leg Map Screen

Reachable two ways:
- From the **timing screen** via the **MAP** button (below "WHEN DO THEY ARRIVE?") — only appears when the runner's target pace is known
- From the **Leg Progress screen** via the **MAP** button at the bottom

Shows a full-screen, non-interactive map of the current leg with the runner's estimated position updated every second.

**What it shows:**
- **CartoDB Dark Matter** tile map (Leaflet.js) — no pan or zoom; bounds auto-fit to the leg route with padding for chrome
- **Route polyline** — orange line tracing the actual road route for the leg
- **Green dot** at the start, **red dot** at the finish
- **Start label** (leg start name) floating below the green dot
- **Destination label** (leg end name + on-pace ETA) floating above the red dot, updating each second
- **Runner icon** (🏃 orange circle) moving along the route at the estimated position; a leg elapsed time chip sits just below it, ticking every second
- **Range band** — wide translucent orange segment spanning the min–max position spread across pace scenarios
- **Top chrome overlay** (gradient from top):
  - Back button (← TIMING or ← LEG PROGRESS depending on entry point)
  - RACE elapsed time in JetBrains Mono + pulsing LIVE dot
  - Runner name, leg number, destination, distance
- **Bottom chrome overlay** (gradient from bottom) — compact estimates table:

  | PACE | ARRIVES | LEG TIME |
  |---|---|---|
  | Pace for each scenario | Estimated clock arrival | Estimated total leg duration |

  5 rows spanning target pace ±30 s/mi. Target row highlighted in orange.

**Auto-refresh on lap:** Polls the server every 15 seconds while on this screen. If the active leg changes (another device pressed LAP), automatically navigates to the racing view with fresh state.

Back button returns to the screen that launched the map (timing or leg progress).

## Course Overview Screen

Reachable from the timing screen by tapping **"VIEW ALL 18 LEGS · THE COURSE →"** (a secondary button below the navigation link). Shows the entire 18-leg course on one scrollable screen while keeping the race clock running.

**What it shows:**
- Live race clock (same tick as the timing screen) and a blinking **LIVE** indicator
- Progress bar with a position marker dot showing how far through the course the team is
- Tally pills: `✓ N DONE`, `● ON LEG N`, `N TO GO`
- "Race in Progress" callout with the current leg's start → finish names
- All 18 leg rows with done / active / upcoming status styling:
  - **Done** — green-washed background, green left stripe
  - **Active** — accent-highlighted background with border, LIVE badge
  - **Next** — NEXT outlined badge
- Per-leg **runner name** (or `—` if unassigned) and **mileage**
- Per-leg **start time** and **finish time or ETA** in monospace — completed legs show actual times, the active leg shows ETA, and upcoming legs show projected times based on target pace
- Two tappable map links per leg (**START** / **FINISH**) that open Google Maps in a new tab

Back button returns to the timing screen. The timing state (current leg, elapsed clock, resultId) is fully preserved — nothing resets on back.

**Note:** Runner names and times are fetched from the server when the screen opens (`/teams/:id/timeline`). The static course data (coordinates, mileage) is bundled in the app.

## File Structure

```
src/
  api.ts              — PIN-bearing API client factory, format helpers (formatElapsed, formatTime, formatDuration, buildNavUrl)
  App.tsx             — discriminated union state machine (loading → auth → start → racing → leg-progress → leg-map → course → complete)
  components/
    LongPressButton.tsx   — reusable hold-to-activate button with rAF fill animation
    AuthScreen.tsx        — team selection dropdown + PIN entry
    StartScreen.tsx       — first leg info + START long-press
    TimingScreen.tsx      — elapsed clock, ETA poll, navigation link, WHEN DO THEY ARRIVE / MAP buttons, LAP/STOP, VIEW ALL LEGS button
    LegProgressScreen.tsx — pace-swept progress bar + arrival table for the live leg
    LegMapScreen.tsx      — full-screen Leaflet map with runner position, route, ETA label, estimates table
    CourseScreen.tsx      — all-18-legs course overview with runner names, start/finish times, map links, and live clock; fetches timeline on open
    CompleteScreen.tsx    — total time + leg-by-leg splits
```

## Offline / Connectivity Loss

Handoff points in rural Missouri often have poor signal. The app is designed to survive brief outages without losing timing data.

**LAP at a dead-signal location:**
- The timestamp is captured at the moment the button activates (before any network call)
- The UI advances to the next leg immediately — the driver doesn't wait for a server response
- The failed PATCH is queued in `localStorage` (`kt82_pending_action`)
- A **"Syncing…"** pill appears in the top bar and the LAP/END buttons are disabled until the server confirms
- A background retry fires every 5 seconds; once connectivity returns the queued action is sent and the buttons re-enable automatically

**Page reload while an action is queued:**
- On re-auth, the app detects the queued action in `localStorage` and flushes it before rendering
- If the flush succeeds the driver lands on the correct current leg; if the server is still unreachable the queue is cleared and server state wins

**End Race Early (END button):**
- No optimistic advance — the button retries with the original captured timestamp on each press
- If the first attempt fails, the error message is shown and the same timestamp is reused on retry

**ETA display:**
- The ETA panel polls every 30 seconds; failures are silent and the last known value is shown until the next successful poll

## Navigation Deep Links

When a handoff point has coordinates set (in Manager), the navigation link opens Google Maps directly to those coordinates. If only an address is set, it opens an address search. The link is hidden when no handoff point is configured.
