# Driver App

Race-day timing app used by the driver/timekeeper in the support vehicle to start legs, record handoffs, and track ETA.

## What It Does

- Authenticates with a team PIN, then detects whether the race has started
- **Start screen:** Displays the first leg info; hold the START button (~500ms) to begin the race
- **Timing screen:** Ticking elapsed clock + server-polled ETA side by side; navigate to the next handoff point; tap **"VIEW ALL 18 LEGS · THE COURSE →"** for a full course overview (see below); hold LAP (~1500ms) to record a handoff and advance to the next leg; hold "End race early" (~1500ms) to stop
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

## Course Overview Screen

Reachable from the timing screen by tapping **"VIEW ALL 18 LEGS · THE COURSE →"** (a secondary button below the navigation link). Shows the entire 18-leg course on one scrollable screen while keeping the race clock running.

**What it shows:**
- Live race clock (same tick as the timing screen) and a blinking **LIVE** indicator
- Progress bar with a position marker dot showing how far through the course the team is
- Tally pills: `✓ N DONE`, `● ON LEG N`, `N TO GO`
- "Race in Progress" callout with the current leg's start → finish names
- All 18 leg rows with done / active / upcoming status styling:
  - **Done** — green-washed background, ✓ DONE badge
  - **Active** — accent-highlighted background with border, LIVE badge
  - **Next** — NEXT outlined badge
- Per-leg **difficulty chip** (Easy / Medium / Difficult, with Distance or Single Track note where applicable)
- Per-leg **mileage** in monospace

**Map links:** Every leg row has three tappable Google Maps links — all open in a new tab:
- **START** — drops a pin at the leg's start coordinates
- **FINISH** — drops a pin at the leg's finish coordinates
- **FULL DIRECTIONS ↗** — turn-by-turn route from start to finish

Back button returns to the timing screen. The timing state (current leg, elapsed clock, resultId) is fully preserved — nothing resets on back.

**Offline note:** The course data is entirely static (bundled in the app). Opening the course overview requires no network request.

## File Structure

```
src/
  api.ts              — PIN-bearing API client factory, format helpers (formatElapsed, formatTime, formatDuration, buildNavUrl)
  App.tsx             — discriminated union state machine (loading → auth → start → racing → course → complete)
  components/
    LongPressButton.tsx — reusable hold-to-activate button with rAF fill animation
    AuthScreen.tsx    — team selection dropdown + PIN entry
    StartScreen.tsx   — first leg info + START long-press
    TimingScreen.tsx  — elapsed clock, ETA poll, navigation link, LAP/STOP, VIEW ALL LEGS button
    CourseScreen.tsx  — all-18-legs course overview with map links and live clock
    CompleteScreen.tsx — total time + leg-by-leg splits
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
