# Driver Session Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist the Driver app's racing session to localStorage so an accidental browser refresh while offline restores the TimingScreen directly — no login required.

**Architecture:** A new `sessionCache.ts` module mirrors `pendingActions.ts`. A single `useEffect` in App.tsx auto-saves the view state on every transition. On app load, if the server fetch fails and a cached session exists, the app restores the view from cache and sets a `restoredFromCache` flag. TimingScreen renders an "Offline · Cached" badge when that flag is set.

**Tech Stack:** React 18, TypeScript 5, localStorage (same pattern as `pendingActions.ts`)

**Branch:** `feature/offline-session-cache`

---

### Task 1: Create `sessionCache.ts`

**Files:**
- Create: `apps/driver/src/sessionCache.ts`

- [ ] **Step 1: Create the module**

`apps/driver/src/sessionCache.ts`:

```typescript
import type { Race, Leg, Handoff, TeamSummary } from './api'

const KEY = 'kt82_driver_session'

export type CachedSession =
  | {
      viewType: 'start'
      race: Race
      team: TeamSummary
      pin: string
      nextLeg: Leg
      nextRunner: string | null
    }
  | {
      viewType: 'racing'
      race: Race
      team: TeamSummary
      pin: string
      resultId: string | null
      leg: Leg
      startedAt: string
      nextHandoff: Handoff | null
      currentRunner: string | null
      raceStartedAt: string | null
      nextRunner: string | null
      nextLeg: Leg | null
      nextRunnerEta: string | null
      targetPaceSecPerMile: number | null
    }

export function saveSession(session: CachedSession): void {
  localStorage.setItem(KEY, JSON.stringify(session))
}

export function readSession(): CachedSession | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try { return JSON.parse(raw) as CachedSession }
  catch { return null }
}

export function clearSession(): void {
  localStorage.removeItem(KEY)
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/mattstocke/Code/KT82
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver build 2>&1 | tail -20
```

Expected: build succeeds (the new file is standalone — no errors from it yet).

- [ ] **Step 3: Commit**

```bash
git add apps/driver/src/sessionCache.ts
git commit -m "feat(driver): add sessionCache localStorage module"
```

---

### Task 2: Auto-save session on view transitions

**Files:**
- Modify: `apps/driver/src/App.tsx`

- [ ] **Step 1: Add import**

At the top of `apps/driver/src/App.tsx`, add to the existing local imports:

```typescript
import { enqueue, peek, dequeue, type PendingAction } from './pendingActions'
import { saveSession, readSession, clearSession } from './sessionCache'
```

Replace the existing `pendingActions` import line with both lines above.

- [ ] **Step 2: Add the session auto-save effect**

Add this new `useEffect` immediately after the existing `legMapLastUpdatedMs` state declaration (around line 28), before `handleAuth`:

```typescript
// Mirror view state to localStorage so a refresh-while-offline can restore
useEffect(() => {
  const v = view
  if (
    v.type === 'racing' ||
    v.type === 'course' ||
    v.type === 'leg-progress' ||
    v.type === 'leg-map'
  ) {
    saveSession({
      viewType: 'racing',
      race: v.race,
      team: v.team,
      pin: v.pin,
      resultId: v.resultId,
      leg: v.leg,
      startedAt: v.startedAt,
      nextHandoff: v.nextHandoff,
      currentRunner: v.currentRunner,
      raceStartedAt: v.raceStartedAt,
      nextRunner: v.nextRunner,
      nextLeg: v.nextLeg,
      nextRunnerEta: v.nextRunnerEta,
      targetPaceSecPerMile: v.targetPaceSecPerMile,
    })
  } else if (v.type === 'start') {
    saveSession({
      viewType: 'start',
      race: v.race,
      team: v.team,
      pin: v.pin,
      nextLeg: v.nextLeg,
      nextRunner: v.nextRunner,
    })
  } else if (v.type === 'complete') {
    clearSession()
  }
  // 'loading', 'no-race', 'auth' — do nothing
}, [view])
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/mattstocke/Code/KT82
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver build 2>&1 | tail -20
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/driver/src/App.tsx
git commit -m "feat(driver): auto-save session to localStorage on view transitions"
```

---

### Task 3: Restore from cache on app load failure

**Files:**
- Modify: `apps/driver/src/App.tsx`

- [ ] **Step 1: Add `restoredFromCache` state**

In `App()`, after the existing `useState` declarations (around line 26–27), add:

```typescript
const [restoredFromCache, setRestoredFromCache] = useState(false)
```

- [ ] **Step 2: Replace the initial load `useEffect`**

Replace the existing load effect:

```typescript
useEffect(() => {
  publicApi.get<Race>('/races/active')
    .then(race => setView({ type: 'auth', race }))
    .catch(() => setView({ type: 'no-race' }))
}, [])
```

With:

```typescript
useEffect(() => {
  publicApi.get<Race>('/races/active')
    .then(race => setView({ type: 'auth', race }))
    .catch(() => {
      const cached = readSession()
      if (cached) {
        if (cached.viewType === 'start') {
          setView({
            type: 'start',
            race: cached.race,
            team: cached.team,
            pin: cached.pin,
            nextLeg: cached.nextLeg,
            nextRunner: cached.nextRunner,
          })
        } else {
          setView({
            type: 'racing',
            race: cached.race,
            team: cached.team,
            pin: cached.pin,
            resultId: cached.resultId,
            leg: cached.leg,
            startedAt: cached.startedAt,
            nextHandoff: cached.nextHandoff,
            currentRunner: cached.currentRunner,
            raceStartedAt: cached.raceStartedAt,
            nextRunner: cached.nextRunner,
            nextLeg: cached.nextLeg,
            nextRunnerEta: cached.nextRunnerEta,
            targetPaceSecPerMile: cached.targetPaceSecPerMile,
          })
        }
        setRestoredFromCache(true)
      } else {
        setView({ type: 'no-race' })
      }
    })
}, [])
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/mattstocke/Code/KT82
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver build 2>&1 | tail -20
```

Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/driver/src/App.tsx
git commit -m "feat(driver): restore racing session from cache when server unreachable on load"
```

---

### Task 4: Show "Offline · Cached" badge in TimingScreen

**Files:**
- Modify: `apps/driver/src/components/TimingScreen.tsx`
- Modify: `apps/driver/src/App.tsx` (pass the new prop)

- [ ] **Step 1: Add `restoredFromCache` prop to `TimingScreen`**

In `apps/driver/src/components/TimingScreen.tsx`, add `restoredFromCache: boolean` to the `Props` interface:

```typescript
interface Props {
  team: TeamSummary
  pin: string
  resultId: string | null
  leg: Leg
  startedAt: string
  nextHandoff: Handoff | null
  currentRunner: string | null
  raceStartedAt: string | null
  onLapPress: (finishedAt: string) => void
  onComplete: () => void
  nextRunner: string | null
  nextLeg: Leg | null
  nextRunnerEta: string | null
  onViewCourse: () => void
  onViewLegProgress: (() => void) | null
  onViewLegMap: (() => void) | null
  targetPaceSecPerMile: number | null
  restoredFromCache: boolean
}
```

- [ ] **Step 2: Destructure the new prop**

In the function signature, add `restoredFromCache` to the destructured props:

```typescript
export function TimingScreen({ team, pin, resultId, leg, startedAt, nextHandoff, currentRunner, raceStartedAt, onLapPress, onComplete, nextRunner, nextLeg, nextRunnerEta, onViewCourse, onViewLegProgress, onViewLegMap, targetPaceSecPerMile, restoredFromCache }: Props) {
```

- [ ] **Step 3: Replace the sync indicator in the top bar**

Find the existing sync pill in the top bar:

```typescript
{!resultId && (
  <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, color: 'var(--mut)', display: 'flex', alignItems: 'center', gap: 5 }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mut)', flexShrink: 0, display: 'inline-block' }} />
    Syncing…
  </span>
)}
```

Replace with:

```typescript
{(restoredFromCache || !resultId) && (
  <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, color: 'var(--mut)', display: 'flex', alignItems: 'center', gap: 5 }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mut)', flexShrink: 0, display: 'inline-block' }} />
    {restoredFromCache ? 'Offline · Cached' : 'Syncing…'}
  </span>
)}
```

- [ ] **Step 4: Pass `restoredFromCache` from App.tsx**

In `apps/driver/src/App.tsx`, find the `<TimingScreen ... />` render (around line 287–299) and add the prop:

```typescript
if (view.type === 'racing') return (
  <TimingScreen
    team={view.team} pin={view.pin} resultId={view.resultId}
    leg={view.leg} startedAt={view.startedAt} nextHandoff={view.nextHandoff}
    currentRunner={view.currentRunner} raceStartedAt={view.raceStartedAt}
    onLapPress={handleLapPress} onComplete={handleComplete}
    nextRunner={view.nextRunner} nextLeg={view.nextLeg} nextRunnerEta={view.nextRunnerEta}
    onViewCourse={handleViewCourse}
    onViewLegProgress={view.targetPaceSecPerMile !== null ? handleViewLegProgress : null}
    onViewLegMap={view.targetPaceSecPerMile !== null ? handleViewLegMapFromRacing : null}
    targetPaceSecPerMile={view.targetPaceSecPerMile}
    restoredFromCache={restoredFromCache}
  />
)
```

- [ ] **Step 5: Verify build**

```bash
cd /Users/mattstocke/Code/KT82
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver build 2>&1 | tail -20
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add apps/driver/src/components/TimingScreen.tsx apps/driver/src/App.tsx
git commit -m "feat(driver): show Offline · Cached badge when session restored from cache"
```

---

### Task 5: Manual verification

**Files:** None (testing only)

- [ ] **Step 1: Start the dev stack**

```bash
cd /Users/mattstocke/Code/KT82
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" ./scripts/dev.sh
```

Open `http://localhost:5176` (Driver app).

- [ ] **Step 2: Verify cache is written during normal use**

1. Log in with your team PIN and reach the TimingScreen
2. Open DevTools → Application → Local Storage → `http://localhost:5176`
3. Confirm `kt82_driver_session` key exists with `viewType: "racing"`, correct `leg`, `startedAt`, etc.

- [ ] **Step 3: Verify restore on offline refresh**

1. While on TimingScreen, open DevTools → Network tab → set throttling to "Offline"
2. Refresh the page (Cmd+R)
3. Expected: TimingScreen reappears immediately with correct elapsed time running, top bar shows "● Offline · Cached"
4. Expected: NOT bounced to login screen, NOT "No active race"

- [ ] **Step 4: Verify badge clears after reconnect**

1. Restore network (set throttling back to "No throttling")
2. Wait up to 30 seconds for the ETA poll to succeed
3. The badge does NOT automatically clear (it persists until next view transition) — this is expected behaviour. The driver can continue timing normally.

- [ ] **Step 5: Verify cache cleared on complete**

1. Advance through all legs to the CompleteScreen (or use "End Race Early")
2. Check Local Storage — `kt82_driver_session` key should be absent

- [ ] **Step 6: Update spec status and index**

In `docs/superpowers/specs/2026-06-05-driver-session-cache-design.md`, change:
```
**Status:** Draft
```
to:
```
**Status:** Implemented
```

In `docs/superpowers/INDEX.md`, change `📋 Draft` to `✅ Implemented` on the driver session cache row.

- [ ] **Step 7: Final commit**

```bash
git add docs/superpowers/specs/2026-06-05-driver-session-cache-design.md docs/superpowers/INDEX.md
git commit -m "docs: mark driver session cache as implemented"
```
