# Driver Session Cache Design

**Date:** 2026-06-05
**Status:** Implemented
**Branch:** feature/offline-session-cache

## Problem

If the driver accidentally refreshes the browser while offline (or with very poor connectivity), the app bounces them to login. The login screen itself requires two API calls to complete, so with no connectivity the driver is completely stuck — unable to resume timing until connectivity returns.

All racing session state (team, PIN, current leg, startedAt, resultId) lives only in React state and is lost on refresh.

## Scope

- **Driver app only.** Other apps are not used during the race.
- **No server changes.** Pure client-side localStorage persistence.
- **No service worker / PWA complexity.** Straightforward localStorage cache.

## Approach

Persist the full racing session to localStorage on every meaningful state transition. On app load, if the initial server fetch fails AND a cached session exists, restore the view directly from cache — skipping the login screen entirely.

---

## Section 1: Session Cache Module

### New file: `apps/driver/src/sessionCache.ts`

Parallel to `pendingActions.ts`. Exports `save`, `read`, `clear`.

Storage key: `kt82_driver_session`

```typescript
type CachedSession =
  | {
      viewType: 'start'
      race: Race
      team: TeamSummary
      pin: string
      nextLeg: Leg          // the leg about to be run
      nextRunner: string | null
    }
  | {
      viewType: 'racing'
      race: Race
      team: TeamSummary
      pin: string
      resultId: string | null
      leg: Leg              // current leg in progress
      startedAt: string
      nextHandoff: Handoff | null
      currentRunner: string | null
      raceStartedAt: string | null
      nextRunner: string | null
      nextLeg: Leg | null   // upcoming leg (after current)
      nextRunnerEta: string | null
      targetPaceSecPerMile: number | null
    }
```

`save(session: CachedSession)` — serializes to JSON, writes to localStorage.  
`read(): CachedSession | null` — reads and parses; returns null on missing or malformed.  
`clear()` — removes the key.

---

## Section 2: Write Events in App.tsx

Session is written (overwritten) on every transition that puts the driver in a state they'd need to resume from:

| Event | Action |
|-------|--------|
| `handleAuth` resolves to `start` view | `save` with `viewType: 'start'` |
| `handleAuth` resolves to `racing` view | `save` with `viewType: 'racing'` |
| `handleStart` → racing | `save` with `viewType: 'racing'` |
| `handleLapPress` → new leg | `save` with updated racing fields (optimistic state) |
| `handleComplete` | `clear` |

The cache is always current-leg state. On refresh it will restore to wherever the driver was at the last handoff.

---

## Section 3: Restore on Load Failure

Current app load logic in App.tsx:

```typescript
useEffect(() => {
  publicApi.get<Race>('/races/active')
    .then(race => setView({ type: 'auth', race }))
    .catch(() => setView({ type: 'no-race' }))
}, [])
```

New logic:

```typescript
useEffect(() => {
  publicApi.get<Race>('/races/active')
    .then(race => setView({ type: 'auth', race }))
    .catch(() => {
      const cached = readSession()
      if (cached) {
        setView(restoreViewFromCache(cached))
      } else {
        setView({ type: 'no-race' })
      }
    })
}, [])
```

`restoreViewFromCache` maps a `CachedSession` to the appropriate `View` object (`start` or `racing`). The view is indistinguishable from a normally-loaded one — the elapsed timer, pending action retry, and ETA poll all resume naturally from the cached `startedAt` and `resultId`.

If the session was restored from cache and the resultId is null (a pending lap was in flight), the existing background retry loop activates immediately and will sync when connectivity returns.

---

## Section 4: Session Lifetime

- **Written** on each relevant state transition (see Section 2)
- **Cleared** on race complete
- **No time-based expiry** — the raceId serves as the natural invalidation key; stale data from a prior year's race won't match a newly active race

When connectivity eventually returns after an offline restore, the existing ETA poll and pending action retry loops re-validate and update state automatically. No special re-sync logic needed.

---

## Section 5: Offline Indicator

When the view is restored from cache (server was unreachable on load), surface a minimal top-bar badge on TimingScreen:

```
● Offline · Cached
```

Styled with `color: var(--mut)`, replaces/joins the existing "Syncing…" pill. The driver knows they're on cached data. The badge persists for the remainder of the session — it does not clear automatically when connectivity returns. This is intentional: the driver has a continuous low-key indicator that they started the session from cache.

Pass a boolean `restoredFromCache: boolean` prop to `TimingScreen`; the component decides rendering.

---

## Files Changed

| File | Change |
|------|--------|
| `apps/driver/src/sessionCache.ts` | New — localStorage save/read/clear |
| `apps/driver/src/App.tsx` | Write session on transitions; restore on load failure |
| `apps/driver/src/components/TimingScreen.tsx` | Accept + render `restoredFromCache` prop |

No server changes. No changes to other apps.
