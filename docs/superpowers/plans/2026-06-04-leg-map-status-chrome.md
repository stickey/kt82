# Leg Map Status Chrome Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add elapsed leg time and a refresh timer (`Xs ago`) to the top-right chrome of the `LegMapScreen` in both tracker and driver apps.

**Architecture:** `LegMapScreen` (shared between tracker and driver) gains a new optional `lastUpdatedMs?: number` prop. When provided it derives seconds-since-update from the existing `nowMs` tick and renders `Xs ago` below the LIVE dot. The LEG elapsed time is computed inline from the already-available `startedAtMs`. Parent components (`TeamDetail` and driver `App.tsx`) wire up the prop from their existing poll state.

**Tech Stack:** React, TypeScript — no new dependencies.

---

### Task 1: Add LEG elapsed time and refresh timer to LegMapScreen

Both apps share an identical `LegMapScreen` component. Make the same change in both files.

**Files:**
- Modify: `apps/tracker/src/components/LegMapScreen.tsx`
- Modify: `apps/driver/src/components/LegMapScreen.tsx`

- [ ] **Step 1: Add `lastUpdatedMs` to the Props interface**

In both files, find the `Props` interface (lines 6–18). Add one optional field after `onBack`:

```ts
interface Props {
  runner: string
  town: string
  legN: number
  totalLegs: number
  distMiles: number
  startedAtMs: number
  raceStartedAtMs: number | null
  targetPaceSecPerMile: number
  teamName: string
  backLabel: string
  onBack: () => void
  lastUpdatedMs?: number
}
```

- [ ] **Step 2: Destructure the new prop**

Find the function signature (line 106 in both files):

```tsx
export function LegMapScreen({
  runner, town, legN, totalLegs, distMiles,
  startedAtMs, raceStartedAtMs, targetPaceSecPerMile, teamName, backLabel, onBack,
}: Props) {
```

Replace with:

```tsx
export function LegMapScreen({
  runner, town, legN, totalLegs, distMiles,
  startedAtMs, raceStartedAtMs, targetPaceSecPerMile, teamName, backLabel, onBack,
  lastUpdatedMs,
}: Props) {
```

- [ ] **Step 3: Replace the top-right chrome block**

In both files, find this block inside the top chrome (around lines 231–242):

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
  {raceStartedAtMs !== null && (
    <div>
      <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 8, letterSpacing: '0.08em', color: 'rgba(251,246,238,0.4)' }}>RACE </span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12, color: 'rgba(251,246,238,0.85)' }}>{fmtElapsed(nowMs - raceStartedAtMs)}</span>
    </div>
  )}
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <div className="live-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
    <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', color: 'rgba(251,246,238,0.7)' }}>LIVE</span>
  </div>
</div>
```

Replace with:

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
  {raceStartedAtMs !== null && (
    <div>
      <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 8, letterSpacing: '0.08em', color: 'rgba(251,246,238,0.4)' }}>RACE </span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12, color: 'rgba(251,246,238,0.85)' }}>{fmtElapsed(nowMs - raceStartedAtMs)}</span>
    </div>
  )}
  <div>
    <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 8, letterSpacing: '0.08em', color: 'rgba(251,246,238,0.4)' }}>LEG </span>
    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12, color: 'rgba(251,246,238,0.85)' }}>{fmtElapsed(nowMs - startedAtMs)}</span>
  </div>
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div className="live-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
      <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', color: 'rgba(251,246,238,0.7)' }}>LIVE</span>
    </div>
    {lastUpdatedMs !== undefined && Math.floor((nowMs - lastUpdatedMs) / 1000) > 0 && (
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 10, color: 'rgba(251,246,238,0.35)' }}>{Math.floor((nowMs - lastUpdatedMs) / 1000)}s ago</span>
    )}
  </div>
</div>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker exec tsc --noEmit
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/tracker/src/components/LegMapScreen.tsx apps/driver/src/components/LegMapScreen.tsx
git commit -m "feat(map): add elapsed leg time and refresh timer to top chrome"
```

---

### Task 2: Wire `lastUpdatedMs` in tracker TeamDetail

`TeamDetail` already tracks `lastUpdatedRef` (a `React.MutableRefObject<Date | null>`). Pass its millisecond value to `LegMapScreen`.

**Files:**
- Modify: `apps/tracker/src/components/TeamDetail.tsx:212–226`

- [ ] **Step 1: Add the prop to the LegMapScreen call**

Find the `LegMapScreen` render block (lines 212–226):

```tsx
if (showLegMap && activeItem && activeItem.runner && activeItem.assignment && activeItem.result) return (
  <LegMapScreen
    runner={activeItem.runner.name}
    town={activeItem.leg.handoff?.name ?? activeItem.leg.name}
    legN={activeItem.leg.legNumber}
    totalLegs={timeline.length || 18}
    distMiles={activeItem.leg.distanceMiles}
    startedAtMs={new Date(activeItem.result.startedAt).getTime()}
    raceStartedAtMs={raceStartedAt ? new Date(raceStartedAt).getTime() : null}
    targetPaceSecPerMile={activeItem.assignment.targetPaceSecPerMile}
    teamName={teamName}
    backLabel={`← ${teamName}`}
    onBack={() => setShowLegMap(false)}
  />
)
```

Replace with:

```tsx
if (showLegMap && activeItem && activeItem.runner && activeItem.assignment && activeItem.result) return (
  <LegMapScreen
    runner={activeItem.runner.name}
    town={activeItem.leg.handoff?.name ?? activeItem.leg.name}
    legN={activeItem.leg.legNumber}
    totalLegs={timeline.length || 18}
    distMiles={activeItem.leg.distanceMiles}
    startedAtMs={new Date(activeItem.result.startedAt).getTime()}
    raceStartedAtMs={raceStartedAt ? new Date(raceStartedAt).getTime() : null}
    targetPaceSecPerMile={activeItem.assignment.targetPaceSecPerMile}
    teamName={teamName}
    backLabel={`← ${teamName}`}
    onBack={() => setShowLegMap(false)}
    lastUpdatedMs={lastUpdatedRef.current?.getTime()}
  />
)
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/tracker/src/components/TeamDetail.tsx
git commit -m "feat(tracker): pass lastUpdatedMs to LegMapScreen"
```

---

### Task 3: Wire `lastUpdatedMs` in driver App.tsx

The driver polls every 15s while on `leg-map` view. Add state to track the last successful poll time and pass it to `LegMapScreen`.

**Files:**
- Modify: `apps/driver/src/App.tsx`

- [ ] **Step 1: Add `legMapLastUpdatedMs` state**

Find the existing state declarations at the top of `App()` (around lines 25–26):

```tsx
export default function App() {
  const [view, setView] = useState<View>({ type: 'loading' })
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(() => peek())
```

Add the new state on the line after `pendingAction`:

```tsx
export default function App() {
  const [view, setView] = useState<View>({ type: 'loading' })
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(() => peek())
  const [legMapLastUpdatedMs, setLegMapLastUpdatedMs] = useState<number | undefined>(undefined)
```

- [ ] **Step 2: Set `legMapLastUpdatedMs` on each successful poll**

Find the leg-map polling effect (lines 191–220):

```tsx
// Poll for leg changes while on leg-map (can't press LAP from there)
useEffect(() => {
  if (view.type !== 'leg-map') return
  const { pin, team, race, resultId } = view
  const api = createDriverApi(pin)
  const id = setInterval(async () => {
    try {
      const state = await api.get<CurrentState>(`/teams/${team.id}/current`)
      if (state.status === 'not-started') {
        if (!state.nextLeg) return
        setView({ type: 'start', race, team, pin, nextLeg: state.nextLeg, nextRunner: state.nextRunner?.name ?? null })
      } else if (state.result.id !== resultId) {
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
          targetPaceSecPerMile: state.targetPaceSecPerMile ?? null,
        })
      }
    } catch { /* ignore, keep polling */ }
  }, 15_000)
  return () => clearInterval(id)
}, [view.type]) // eslint-disable-line react-hooks/exhaustive-deps
```

Replace with:

```tsx
// Poll for leg changes while on leg-map (can't press LAP from there)
useEffect(() => {
  if (view.type !== 'leg-map') return
  setLegMapLastUpdatedMs(undefined)
  const { pin, team, race, resultId } = view
  const api = createDriverApi(pin)
  const id = setInterval(async () => {
    try {
      const state = await api.get<CurrentState>(`/teams/${team.id}/current`)
      setLegMapLastUpdatedMs(Date.now())
      if (state.status === 'not-started') {
        if (!state.nextLeg) return
        setView({ type: 'start', race, team, pin, nextLeg: state.nextLeg, nextRunner: state.nextRunner?.name ?? null })
      } else if (state.result.id !== resultId) {
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
          targetPaceSecPerMile: state.targetPaceSecPerMile ?? null,
        })
      }
    } catch { /* ignore, keep polling */ }
  }, 15_000)
  return () => clearInterval(id)
}, [view.type]) // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 3: Pass `legMapLastUpdatedMs` to `LegMapScreen`**

Find the `LegMapScreen` render block (around lines 320–334):

```tsx
if (view.type === 'leg-map') return (
  <LegMapScreen
    runner={view.currentRunner ?? 'Runner'}
    town={view.nextHandoff?.name ?? view.leg.name}
    legN={view.leg.legNumber}
    totalLegs={18}
    distMiles={view.leg.distanceMiles}
    startedAtMs={new Date(view.startedAt).getTime()}
    raceStartedAtMs={view.raceStartedAt ? new Date(view.raceStartedAt).getTime() : null}
    targetPaceSecPerMile={view.targetPaceSecPerMile!}
    teamName={view.team.name}
    backLabel={view.from === 'leg-progress' ? '← LEG PROGRESS' : '← TIMING'}
    onBack={handleBackFromLegMap}
  />
)
```

Replace with:

```tsx
if (view.type === 'leg-map') return (
  <LegMapScreen
    runner={view.currentRunner ?? 'Runner'}
    town={view.nextHandoff?.name ?? view.leg.name}
    legN={view.leg.legNumber}
    totalLegs={18}
    distMiles={view.leg.distanceMiles}
    startedAtMs={new Date(view.startedAt).getTime()}
    raceStartedAtMs={view.raceStartedAt ? new Date(view.raceStartedAt).getTime() : null}
    targetPaceSecPerMile={view.targetPaceSecPerMile!}
    teamName={view.team.name}
    backLabel={view.from === 'leg-progress' ? '← LEG PROGRESS' : '← TIMING'}
    onBack={handleBackFromLegMap}
    lastUpdatedMs={legMapLastUpdatedMs}
  />
)
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/App.tsx
git commit -m "feat(driver): pass lastUpdatedMs to LegMapScreen"
```
