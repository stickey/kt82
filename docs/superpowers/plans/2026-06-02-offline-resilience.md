# Offline Resilience (Driver App) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Driver app resilient to brief connectivity gaps at handoff points by capturing the lap timestamp immediately on button press and syncing to the server in the background.

**Architecture:** On LAP press, the Driver app captures the timestamp, immediately advances the UI using next-leg data already in state, and queues the PATCH to `localStorage`. A background retry loop fires every 5 seconds until the server confirms. A "Syncing…" pill in the top bar is the only user-facing signal. The Tracker app gets a simple offline banner. No server changes required.

**Tech Stack:** React, TypeScript, `localStorage`, existing `fetch`-based API client — no new dependencies.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `apps/driver/src/pendingActions.ts` | **Create** | `localStorage` read/write for one pending LAP action |
| `apps/driver/src/App.tsx` | **Modify** | Racing view state, `handleLapPress`, `pendingAction` React state, retry `useEffect`, startup flush |
| `apps/driver/src/components/TimingScreen.tsx` | **Modify** | New props, sync indicator, remove internal LAP API calls, preserve STOP timestamp on failure |
| `apps/tracker/src/App.tsx` | **Modify** | `isOnline` state and offline banner |

---

### Task 1: Create pendingActions.ts

**Files:**
- Create: `apps/driver/src/pendingActions.ts`

- [ ] **Step 1: Create the file**

```typescript
// apps/driver/src/pendingActions.ts
const KEY = 'kt82_pending_action'

export type PendingAction = {
  resultId: string
  finishedAt: string
  action: 'lap'
}

export function enqueue(action: PendingAction): void {
  localStorage.setItem(KEY, JSON.stringify(action))
}

export function peek(): PendingAction | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try { return JSON.parse(raw) as PendingAction }
  catch { return null }
}

export function dequeue(): void {
  localStorage.removeItem(KEY)
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd apps/driver && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/driver/src/pendingActions.ts
git commit -m "feat(driver): add pendingActions localStorage queue"
```

---

### Task 2: Update App.tsx and TimingScreen

`App.tsx` and `TimingScreen.tsx` share a prop interface and must be updated together — do all steps before testing.

**Files:**
- Modify: `apps/driver/src/App.tsx`
- Modify: `apps/driver/src/components/TimingScreen.tsx`

#### App.tsx changes

- [ ] **Step 1: Update imports in App.tsx**

Add the `pendingActions` import and add `useRef` isn't needed — just add the `pendingActions` import. The existing React import stays as-is.

```typescript
import { useState, useEffect } from 'react'
import { publicApi, createDriverApi } from './api'
import { AuthScreen } from './components/AuthScreen'
import { StartScreen } from './components/StartScreen'
import { TimingScreen } from './components/TimingScreen'
import { enqueue, peek, dequeue, type PendingAction } from './pendingActions'
import type { Race, TeamSummary, Leg, Handoff, CurrentState, CurrentStateInProgress } from './api'
```

- [ ] **Step 2: Update the `View` type racing variant**

Replace the `racing` line in the `View` union (currently line 14). Change `resultId: string` → `string | null`, replace `nextLegNumber: number | null` with `nextLeg: Leg | null`:

```typescript
type View =
  | { type: 'loading' }
  | { type: 'no-race' }
  | { type: 'auth'; race: Race }
  | { type: 'start'; race: Race; team: TeamSummary; pin: string; nextLeg: Leg; nextRunner: string | null }
  | { type: 'racing'; race: Race; team: TeamSummary; pin: string; resultId: string | null; leg: Leg; startedAt: string; nextHandoff: Handoff | null; currentRunner: string | null; raceStartedAt: string | null; nextRunner: string | null; nextLeg: Leg | null; nextRunnerEta: string | null }
  | { type: 'complete'; race: Race; team: TeamSummary; pin: string }
```

- [ ] **Step 3: Add `pendingAction` React state**

Directly after `const [view, setView] = useState<View>({ type: 'loading' })`, add:

```typescript
const [pendingAction, setPendingAction] = useState<PendingAction | null>(() => peek())
```

This initialises from `localStorage` so the retry loop activates on page reload if a prior session queued an action.

- [ ] **Step 4: Update `handleAuth` in-progress branch**

Replace the `setView` inside the `else` block of `handleAuth` (the in-progress path). Change `nextLegNumber: state.nextLeg?.legNumber ?? null` to `nextLeg: state.nextLeg ?? null`:

```typescript
setView({
  type: 'racing', race, team, pin,
  resultId: state.result.id,
  leg: state.currentLeg,
  startedAt: state.result.startedAt,
  nextHandoff: state.nextHandoff,
  currentRunner: state.currentRunner?.name ?? null,
  raceStartedAt: state.raceStartedAt ?? null,
  nextRunner: state.nextRunner?.name ?? null,
  nextLeg: state.nextLeg ?? null,
  nextRunnerEta: state.nextRunnerEta ?? null,
})
```

- [ ] **Step 5: Update `handleStart`**

Same replacement in `handleStart`:

```typescript
setView({
  type: 'racing', race: v.race, team: v.team, pin: v.pin,
  resultId: state.result.id,
  leg: state.currentLeg,
  startedAt: state.result.startedAt,
  nextHandoff: state.nextHandoff,
  currentRunner: state.currentRunner?.name ?? null,
  raceStartedAt: state.raceStartedAt ?? null,
  nextRunner: state.nextRunner?.name ?? null,
  nextLeg: state.nextLeg ?? null,
  nextRunnerEta: state.nextRunnerEta ?? null,
})
```

- [ ] **Step 6: Replace `handleLap` with `handleLapPress`**

Delete the existing `handleLap` function entirely. Replace with:

```typescript
function handleLapPress(finishedAt: string) {
  const v = view as Extract<View, { type: 'racing' }>
  if (!v.resultId) return

  const oldResultId = v.resultId
  const { race, team, pin } = v
  const api = createDriverApi(pin)

  if (!v.nextLeg) {
    // Last leg — advance to complete optimistically and queue the PATCH
    setView({ type: 'complete', race, team, pin })
    const action: PendingAction = { resultId: oldResultId, finishedAt, action: 'lap' }
    enqueue(action)
    setPendingAction(action)
    return
  }

  const nextLeg = v.nextLeg

  // Optimistically advance to the next leg immediately
  setView({
    type: 'racing', race, team, pin,
    resultId: null,
    leg: nextLeg,
    startedAt: finishedAt,
    nextHandoff: nextLeg.handoff ?? null,
    currentRunner: v.nextRunner,
    raceStartedAt: v.raceStartedAt,
    nextRunner: null,
    nextLeg: null,
    nextRunnerEta: null,
  })

  // Attempt the PATCH in the background
  api.patch<{ current: unknown; next: { id: string; startedAt: string } | null }>(
    `/results/${oldResultId}`, { finishedAt, action: 'lap' }
  ).then(async (lapResult) => {
    if (lapResult.next === null) {
      setView(prev => prev.type === 'racing'
        ? { type: 'complete', race, team, pin }
        : prev)
      return
    }
    const state = await api.get<CurrentStateInProgress>(`/teams/${team.id}/current`)
    setView(prev => prev.type !== 'racing' ? prev : {
      ...prev,
      resultId: state.result.id,
      nextLeg: state.nextLeg ?? null,
      nextRunner: state.nextRunner?.name ?? null,
      nextRunnerEta: state.nextRunnerEta ?? null,
    })
  }).catch(() => {
    const action: PendingAction = { resultId: oldResultId, finishedAt, action: 'lap' }
    enqueue(action)
    setPendingAction(action)
  })
}
```

- [ ] **Step 7: Add background retry `useEffect`**

Add this after the existing `useEffect` hooks:

```typescript
// Retry queued LAP actions (runs while racing with null resultId, or after last-leg optimistic complete)
useEffect(() => {
  if (!pendingAction) return
  if (view.type !== 'racing' && view.type !== 'complete') return

  const pin = view.pin
  const teamId = view.team.id

  const id = setInterval(async () => {
    const action = peek()
    if (!action) return
    const api = createDriverApi(pin)
    try {
      const lapResult = await api.patch<{ current: unknown; next: { id: string } | null }>(
        `/results/${action.resultId}`, { finishedAt: action.finishedAt, action: action.action }
      )
      dequeue()
      setPendingAction(null)
      if (lapResult.next === null) {
        setView(prev => prev.type === 'racing'
          ? { type: 'complete', race: prev.race, team: prev.team, pin: prev.pin }
          : prev)
      } else {
        const state = await api.get<CurrentStateInProgress>(`/teams/${teamId}/current`)
        setView(prev => prev.type !== 'racing' ? prev : {
          ...prev,
          resultId: state.result.id,
          nextLeg: state.nextLeg ?? null,
          nextRunner: state.nextRunner?.name ?? null,
          nextRunnerEta: state.nextRunnerEta ?? null,
        })
      }
    } catch { /* keep trying */ }
  }, 5_000)

  return () => clearInterval(id)
}, [!!pendingAction, view.type]) // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 8: Update the `TimingScreen` JSX render in App.tsx**

Replace the `<TimingScreen ...>` JSX (around lines 98–106). Remove `onLap`, `nextLegNumber`; add `onLapPress`, `nextLeg`:

```tsx
if (view.type === 'racing') return (
  <TimingScreen
    team={view.team} pin={view.pin} resultId={view.resultId}
    leg={view.leg} startedAt={view.startedAt} nextHandoff={view.nextHandoff}
    currentRunner={view.currentRunner} raceStartedAt={view.raceStartedAt}
    onLapPress={handleLapPress} onComplete={handleComplete}
    nextRunner={view.nextRunner} nextLeg={view.nextLeg} nextRunnerEta={view.nextRunnerEta}
  />
)
```

Also delete the `handleLap` function reference from the old JSX if it's still present.

#### TimingScreen.tsx changes

- [ ] **Step 9: Update Props interface and destructuring**

Replace the entire `Props` interface and the component signature:

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
}
```

Update the component signature (line 26):

```typescript
export function TimingScreen({ team, pin, resultId, leg, startedAt, nextHandoff, currentRunner, raceStartedAt, onLapPress, onComplete, nextRunner, nextLeg, nextRunnerEta }: Props) {
```

- [ ] **Step 10: Replace state and handlers inside TimingScreen**

Remove the `error` and `acting` state lines. Replace with stop-specific state:

```typescript
const [stopError, setStopError]     = useState('')
const [stopActing, setStopActing]   = useState(false)
const [pendingStopAt, setPendingStopAt] = useState<string | null>(null)
```

Remove the entire `handleLap` function. Add a one-liner:

```typescript
function handleLap() {
  onLapPress(new Date().toISOString())
}
```

Replace `handleStop` with a version that preserves the timestamp on failure:

```typescript
async function handleStop() {
  if (stopActing) return
  setStopActing(true)
  setStopError('')
  const finishedAt = pendingStopAt ?? new Date().toISOString()
  setPendingStopAt(finishedAt)
  try {
    const api = createDriverApi(pin)
    await api.patch(`/results/${resultId!}`, { finishedAt, action: 'stop' })
    setPendingStopAt(null)
    onComplete()
  } catch (err: unknown) {
    setStopError(err instanceof Error ? err.message : 'Failed — try again')
    setStopActing(false)
  }
}
```

- [ ] **Step 11: Remove unused import**

Remove `CurrentStateInProgress` from the import line (no longer used in TimingScreen):

```typescript
import type { TeamSummary, Leg, Handoff } from '../api'
```

- [ ] **Step 12: Add sync indicator to the top bar**

Inside the top bar `<div>`, after the team name span, add the sync pill:

```tsx
{!resultId && (
  <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, color: 'var(--mut)', display: 'flex', alignItems: 'center', gap: 5 }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mut)', flexShrink: 0, display: 'inline-block' }} />
    Syncing…
  </span>
)}
```

The top bar flex row already has `items-center justify-between`. Place the pill between the team name group and the race time span so it sits in the centre naturally, or right-align it next to the race time. Either works — just keep it unobtrusive.

- [ ] **Step 13: Update error display and button disabled states**

Replace the single `{error && ...}` line with stop-specific error display:

```tsx
{stopError && <p style={{ fontSize: 13, color: 'var(--red)', textAlign: 'center' }}>{stopError}</p>}
```

Update the LAP `LongPressButton`:

```tsx
<LongPressButton
  label="LAP"
  holdMs={1500}
  onComplete={handleLap}
  bgStyle="var(--accent)"
  textStyle="var(--ink)"
  height={84}
  disabled={!resultId}
  className="font-display text-[34px]"
/>
```

Update the END `LongPressButton`:

```tsx
<LongPressButton
  label="••• End Race Early"
  holdMs={1500}
  onComplete={handleStop}
  bgStyle="var(--panel2)"
  textStyle="var(--faint)"
  height={44}
  disabled={stopActing || !resultId}
  className="text-[11px] font-hanken font-extrabold tracking-widest uppercase"
/>
```

- [ ] **Step 14: Fix the "On Deck" nextLegNumber reference**

On the line that renders `Leg {nextLegNumber}` (around line 176), change to use `nextLeg`:

```tsx
Leg {nextLeg?.legNumber}{nextHandoff ? ` · → ${nextHandoff.name}` : ''}
{nextRunnerEta ? ` · Est. ${formatTime(nextRunnerEta)}` : ''}
```

The "On Deck" block is already guarded by `{nextRunner && (...)}` so it hides automatically when `nextRunner` is null after an optimistic advance.

- [ ] **Step 15: TypeScript check**

```bash
cd apps/driver && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" npx tsc --noEmit
```

Expected: no errors. Fix any reported before moving on.

- [ ] **Step 16: Manual smoke test**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" ./scripts/dev.sh
```

Open `http://localhost:5176`. Verify:
1. Auth screen loads, driver can log in
2. StartScreen shows, START button works
3. TimingScreen shows with running clocks
4. LAP button advances to next leg immediately
5. END button still works and advances to CompleteScreen
6. No console errors

- [ ] **Step 17: Commit**

```bash
git add apps/driver/src/App.tsx apps/driver/src/components/TimingScreen.tsx
git commit -m "feat(driver): optimistic LAP with offline queue and sync indicator"
```

---

### Task 3: Startup queue flush in handleAuth

If the driver reloads the page while a LAP is queued, flush it before rendering so the server is up to date.

**Files:**
- Modify: `apps/driver/src/App.tsx`

- [ ] **Step 1: Update `handleAuth` to flush pending actions**

Replace the existing `handleAuth` function signature body. The function is currently `async`-ish (it uses `.then` in the else branch — actually looking at the code it is synchronous). Make it `async` and add the flush at the top:

```typescript
async function handleAuth(team: TeamSummary, pin: string, passedState: CurrentState) {
  const race = (view as { race: Race }).race
  const api = createDriverApi(pin)

  // Flush any action queued in a previous session before reading server state
  let state = passedState
  const pending = peek()
  if (pending) {
    try {
      await api.patch(`/results/${pending.resultId}`, {
        finishedAt: pending.finishedAt,
        action: pending.action,
      })
    } catch { /* server state wins on failure */ }
    dequeue()
    setPendingAction(null)
    // Re-fetch so we get the server's updated state after the flush
    try {
      state = await api.get<CurrentState>(`/teams/${team.id}/current`)
    } catch { /* use passedState as fallback */ }
  }

  if (state.status === 'not-started') {
    if (!state.nextLeg) { setView({ type: 'auth', race }); return }
    setView({ type: 'start', race, team, pin, nextLeg: state.nextLeg, nextRunner: state.nextRunner?.name ?? null })
  } else {
    setView({
      type: 'racing', race, team, pin,
      resultId: state.result.id,
      leg: state.currentLeg,
      startedAt: state.result.startedAt,
      nextHandoff: state.nextHandoff,
      currentRunner: state.currentRunner?.name ?? null,
      raceStartedAt: state.raceStartedAt ?? null,
      nextRunner: state.nextRunner?.name ?? null,
      nextLeg: state.nextLeg ?? null,
      nextRunnerEta: state.nextRunnerEta ?? null,
    })
  }
}
```

Note: `CurrentState` is already imported. The `handleAuth` callback type passed to `AuthScreen` accepts `(team, pin, state)` — this change is backward-compatible.

- [ ] **Step 2: TypeScript check**

```bash
cd apps/driver && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual smoke test — simulate page reload with pending action**

1. Open `http://localhost:5176` and log in
2. Open browser DevTools → Application → Local Storage
3. Set `kt82_pending_action` to any JSON value (e.g. `{"resultId":"fake","finishedAt":"2026-06-02T12:00:00.000Z","action":"lap"}`)
4. Reload the page
5. Verify: after re-auth, the app renders normally (the failed flush is ignored, localStorage is cleared)

- [ ] **Step 4: Commit**

```bash
git add apps/driver/src/App.tsx
git commit -m "feat(driver): flush pending action queue on re-auth after page reload"
```

---

### Task 4: Tracker offline indicator

**Files:**
- Modify: `apps/tracker/src/App.tsx`

- [ ] **Step 1: Add `isOnline` state and event listeners**

In `apps/tracker/src/App.tsx`, add after the existing state declarations:

```typescript
const [isOnline, setIsOnline] = useState(() => navigator.onLine)

useEffect(() => {
  function handleOnline()  { setIsOnline(true)  }
  function handleOffline() { setIsOnline(false) }
  window.addEventListener('online',  handleOnline)
  window.addEventListener('offline', handleOffline)
  return () => {
    window.removeEventListener('online',  handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}, [])
```

- [ ] **Step 2: Add the offline banner**

At the top of the returned JSX (inside the outermost `<div>`), before any conditional rendering:

```tsx
{!isOnline && (
  <div style={{
    background: 'var(--panel)',
    borderBottom: '1px solid var(--line)',
    padding: '10px 18px',
    fontFamily: "'Hanken Grotesk', sans-serif",
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--mut)',
    textAlign: 'center',
    letterSpacing: '0.04em',
  }}>
    No connection — data may be stale
  </div>
)}
```

- [ ] **Step 3: TypeScript check**

```bash
cd apps/tracker && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/tracker/src/App.tsx
git commit -m "feat(tracker): show offline banner when network is unavailable"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| Timestamp captured at press time | Task 2 — `handleLapPress` captures `finishedAt` before optimistic advance |
| Immediate UI advancement on LAP | Task 2 — `setView(...)` fires before the `.patch(...)` call |
| localStorage queue with original timestamp | Task 2 — `enqueue(action)` / `setPendingAction` on catch |
| Background retry every 5s | Task 2 — `setInterval(5_000)` useEffect |
| Sync indicator when resultId is null | Task 2 — `{!resultId && <span>Syncing…</span>}` |
| LAP/END disabled while pending | Task 2 — `disabled={!resultId}` |
| Startup flush on page reload | Task 3 — `handleAuth` flushes before rendering |
| Last-leg LAP advance to complete | Task 2 — `if (!v.nextLeg)` branch in `handleLapPress` |
| STOP preserves timestamp on failure | Task 2 — `pendingStopAt` state in `handleStop` |
| Tracker offline banner | Task 4 |

**Placeholder scan:** No TBDs or TODOs present.

**Type consistency:**
- `PendingAction` defined in `pendingActions.ts` Task 1, imported in App.tsx Task 2 — consistent.
- `resultId: string | null` defined in View type Task 2 Step 2, used in TimingScreen props Task 2 Step 9 — consistent.
- `nextLeg: Leg | null` in View type and TimingScreen props — consistent.
- `onLapPress` defined in TimingScreen Props (Step 9), passed from App.tsx (Step 8), called with `handleLapPress` (Step 6) — consistent.
- `handleLap` in TimingScreen (Step 10) calls `onLapPress(new Date().toISOString())` — `onLapPress` accepts `string` — consistent.
