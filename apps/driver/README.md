# Driver App

Race-day timing app used by the driver/timekeeper in the support vehicle to start legs, record handoffs, and track ETA.

## What It Does

- Authenticates with a team PIN, then detects whether the race has started
- **Start screen:** Displays the first leg info; hold the START button (~500ms) to begin the race
- **Timing screen:** Ticking elapsed clock + server-polled ETA side by side; navigate to the next handoff point; hold LAP (~1500ms) to record a handoff and advance to the next leg; hold "End race early" (~1500ms) to stop
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

## File Structure

```
src/
  api.ts              — PIN-bearing API client factory, format helpers (formatElapsed, formatTime, formatDuration, buildNavUrl)
  App.tsx             — discriminated union state machine (loading → auth → start → racing → complete)
  components/
    LongPressButton.tsx — reusable hold-to-activate button with rAF fill animation
    AuthScreen.tsx    — team selection dropdown + PIN entry
    StartScreen.tsx   — first leg info + START long-press
    TimingScreen.tsx  — elapsed clock, ETA poll, navigation link, LAP/STOP
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
