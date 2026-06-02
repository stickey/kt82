# Offline Resilience Design

**Date:** 2026-06-02
**Status:** Approved

## Problem

The KT82 relay takes place in rural Missouri with spotty cell coverage. The most critical failure scenario: the Driver is at a handoff point (often a rural road junction with poor signal), taps the LAP button to record the handoff, the API call fails, and the timestamp is lost. A retry with a fresh timestamp records the wrong time.

## Scope

- **Driver app:** Optimistic UI + local action queue. Critical — timestamps must be preserved.
- **Tracker app:** Offline indicator only. Read-only display; stale data is acceptable.
- **Captain / Manager apps:** No changes. These are used before/after the race, not during it.
- **Server:** No changes required.

## Approach: Local Action Queue + Optimistic UI

Capture the timestamp at button-press time, immediately advance the Driver UI using data already in state, and queue the API call in `localStorage` with the original timestamp. A background retry loop fires every 5 seconds until the server confirms. No service worker needed.

Expected outage pattern: brief drop at a handoff point (seconds to a few minutes), then connectivity resumes as the car gets moving. Multi-leg offline scenarios are out of scope.

---

## Section 1: Core Data Flow and Queue

### New module: `apps/driver/src/pendingActions.ts`

A small `localStorage` wrapper. Stores at most one pending action at a time (the in-flight LAP or STOP that hasn't synced yet).

```typescript
type PendingAction = {
  resultId: string    // the LegResult being finalized
  finishedAt: string  // ISO timestamp captured at press time
  action: 'lap' | 'stop'
}
```

Exports: `enqueue(action)`, `peek(): PendingAction | null`, `dequeue()`, `clear()`.

Storage key: `kt82_pending_action` (singular — only one in-flight action at a time).

### Changes to `App.tsx` racing view state

```typescript
type View =
  | ...
  | {
      type: 'racing'
      race: Race
      team: TeamSummary
      pin: string
      resultId: string | null      // null = pending server confirmation
      leg: Leg
      startedAt: string
      nextHandoff: Handoff | null
      currentRunner: string | null
      raceStartedAt: string | null
      nextRunner: string | null
      nextLeg: Leg | null           // NEW: full Leg object (was nextLegNumber: number | null)
      nextRunnerEta: string | null
    }
```

`resultId: string | null` — null means the LAP was captured locally but the server hasn't confirmed yet. The LAP/END buttons are disabled while null.

`nextLeg: Leg | null` — the full next Leg object, threaded through from the `/teams/{id}/current` response (which already returns it). Previously only `nextLegNumber: number` was stored. Required for optimistic UI advancement.

### Optimistic LAP flow in App.tsx

New `handleLapPress(finishedAt: string)` function (replaces the API logic currently inside `TimingScreen`):

1. Capture the old `resultId` and current view state
2. **Immediately advance the view** (optimistic):
   - `leg` ← old `nextLeg`
   - `startedAt` ← `finishedAt`
   - `resultId` ← `null`
   - `currentRunner` ← old `nextRunner`
   - `nextHandoff` ← `old nextLeg?.handoff ?? null` (navigation target for new current leg)
   - `nextLeg`, `nextRunner`, `nextRunnerEta` ← `null` (unknown until sync)
3. Attempt `PATCH /results/{oldResultId}` with `{ finishedAt, action: 'lap' }`
4. **On success:** update `resultId` with the server-assigned ID, then GET `/teams/{id}/current` to fill in `nextLeg` / `nextRunner` / `nextRunnerEta`
5. **On failure:** enqueue `{ resultId: oldResultId, finishedAt, action: 'lap' }` to localStorage; `resultId` stays `null`

New `handleStopPress(finishedAt: string)` — same pattern; on success advances to complete screen; on failure enqueues `action: 'stop'`.

### Background retry in App.tsx

A `useEffect` that activates when `view.type === 'racing' && view.resultId === null`:

- Fires a `setInterval` every 5 seconds
- Reads the queued action from localStorage
- Attempts the PATCH
- On success: dequeue, update `resultId` in state, GET `/current` to refresh next-leg data
- On failure: keep queued, try again next tick
- Cleans up the interval when `resultId` becomes non-null or component unmounts

---

## Section 2: TimingScreen UI Changes

### Prop changes

| Prop | Before | After |
|------|--------|-------|
| `resultId` | `string` | `string \| null` |
| `nextLegNumber` | `number \| null` | removed |
| `nextLeg` | (not present) | `Leg \| null` |
| `onLap` | `(state: CurrentStateInProgress) => void` | removed |
| `onComplete` | `() => void` | kept |
| `onLapPress` | (not present) | `(finishedAt: string) => void` |
| `onStopPress` | (not present) | `(finishedAt: string) => void` |

`handleLap` and `handleStop` (internal API call logic) are removed from `TimingScreen`. The component captures the timestamp and calls the callback; App.tsx owns the API call and state transition.

The `acting` and `error` states are removed from `TimingScreen`. Since the UI advances immediately, there is no waiting state to represent. The sync indicator (see below) is the only user-facing signal.

### Sync indicator

A small pill visible only when `resultId === null`, placed in the top bar alongside the team name:

```
● Syncing…
```

Styled with `color: var(--mut)`, `font-family: Hanken Grotesk`, small caps. Disappears when `resultId` becomes non-null.

### Button disabled state

LAP and END buttons are disabled when `resultId === null`. Button labels and appearance do not change — the sync indicator is the signal, not the button text. This prevents a second LAP press before the first one has a real server ID.

---

## Section 3: Startup Queue Flush (Page Reload Edge Case)

If the driver reloads the page while a LAP is queued but unsynced, the server still shows them on the previous leg. The fix is in `handleAuth` in App.tsx.

**Flow:**
1. Driver enters PIN → `handleAuth` fires as normal
2. After verifying the PIN, check `pendingActions.peek()`
3. If a pending action exists:
   - Attempt the PATCH using the driver's PIN
   - **On success:** dequeue, then GET `/current` (server is now up to date)
   - **On failure (still offline):** clear the queue; let the server state win — we cannot recover a timestamp after a page reload without connectivity
4. Continue with normal auth flow

This means the "reload + still offline" edge case loses the timestamp. The far more common "reload + connectivity restored" case recovers correctly.

---

## Section 4: Tracker Offline Indicator

In `apps/tracker/src/App.tsx`:

- Track `isOnline: boolean` using `navigator.onLine` and `window` `online`/`offline` events
- When `isOnline === false`, show a banner at the top of the page:

```
No connection — data may be stale
```

Styled in `var(--mut)`, consistent with the Tracker design system. The existing data-fetch polling continues to fail silently — no change.

---

## Files Changed

| File | Change |
|------|--------|
| `apps/driver/src/pendingActions.ts` | New — localStorage queue utilities |
| `apps/driver/src/App.tsx` | View state changes, handleLapPress/handleStopPress, background retry effect, startup flush in handleAuth |
| `apps/driver/src/components/TimingScreen.tsx` | Prop changes, sync indicator, remove internal API calls |
| `apps/tracker/src/App.tsx` | isOnline state + offline banner |

No server changes. No changes to Captain or Manager apps.
