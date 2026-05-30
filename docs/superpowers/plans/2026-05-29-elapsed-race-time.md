# Elapsed & Race Time Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent race-time banner to the driver and tracker apps, and show leg elapsed time in the tracker's hero card.

**Architecture:** One server change adds `raceStartedAt` to the `/current` response. The driver gets a new `RaceBanner` component (self-contained 1s ticker) rendered at the top of `StartScreen` and `TimingScreen`. The tracker computes both race time and leg elapsed client-side from existing timeline data during its existing 1s re-render tick, and renders an identical sticky banner plus a leg elapsed line in the hero card.

**Tech Stack:** Express 4 + Prisma 5 (server), React 18 + TypeScript 5 + Tailwind CSS (driver/tracker), Vitest + Supertest (server tests). All commands require `PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH"`.

---

## File Map

- **Modify:** `server/src/routes/results.ts` — add `raceStartedAt` to `GET /teams/:id/current` in-progress response
- **Modify:** `server/src/__tests__/results.test.ts` — add test for `raceStartedAt` field
- **Modify:** `apps/driver/src/api.ts` — add `raceStartedAt` to `CurrentStateInProgress`; add `formatRaceTime`
- **Modify:** `apps/driver/src/App.tsx` — add `raceStartedAt` to `racing` view state type and all three setView calls
- **Create:** `apps/driver/src/components/RaceBanner.tsx` — self-contained banner component with pulsing dot and ticking race clock
- **Modify:** `apps/driver/src/components/StartScreen.tsx` — add `RaceBanner` at top, restructure outer div
- **Modify:** `apps/driver/src/components/TimingScreen.tsx` — add `raceStartedAt` prop, add `RaceBanner` at top, restructure outer div
- **Modify:** `apps/tracker/src/api.ts` — add `formatElapsed` and `formatRaceTime`
- **Modify:** `apps/tracker/src/components/TeamDetail.tsx` — add sticky banner, add leg elapsed below pace badge

---

### Task 1: Server — add `raceStartedAt` to `/current` response

**Files:**
- Modify: `server/src/routes/results.ts`
- Modify: `server/src/__tests__/results.test.ts`

- [ ] **Step 1: Write the failing test**

In `server/src/__tests__/results.test.ts`, add a new `it` block inside the existing `describe('GET /api/teams/:id/current'` block (after the existing two tests):

```ts
it('returns raceStartedAt equal to the first leg startedAt when on a later leg', async () => {
  const race = await createRace()
  const team = await createTeam(race.id)
  const leg1 = await createLeg(race.id, 1, 5)
  const leg2 = await createLeg(race.id, 2, 5)
  const member = await createMember(team.id)
  await createAssignment(team.id, leg1.id, member.id, 480)
  await createAssignment(team.id, leg2.id, member.id, 480)

  const leg1Start = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
  await prisma.legResult.create({
    data: { teamId: team.id, legId: leg1.id, startedAt: leg1Start, finishedAt: new Date(Date.now() - 30 * 60 * 1000) },
  })
  const leg2Start = new Date(Date.now() - 10 * 60 * 1000)
  await prisma.legResult.create({
    data: { teamId: team.id, legId: leg2.id, startedAt: leg2Start },
  })

  const res = await request(app)
    .get(`/api/teams/${team.id}/current`)
    .set('X-Team-Pin', '1234')
  expect(res.status).toBe(200)
  expect(res.body.status).toBe('in-progress')
  expect(res.body.raceStartedAt).toBe(leg1Start.toISOString())
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test src/__tests__/results.test.ts
```

Expected: the new test fails with something like `expected undefined to be "..."` — `raceStartedAt` is not yet in the response.

- [ ] **Step 3: Implement `raceStartedAt` in the route**

In `server/src/routes/results.ts`, locate the `router.get('/teams/:id/current'` handler (line ~14). Inside the `in-progress` branch, after fetching `activeResult` and `assignment`, add one query and include the result in the response.

Current in-progress block ends with:
```ts
res.json({
  status: 'in-progress',
  result: serializeResult(activeResult),
  currentLeg: activeResult.leg,
  nextHandoff: activeResult.leg.handoff,
  currentRunner: assignment?.teamMember ?? null,
  assignment,
  eta,
})
```

Replace it with:
```ts
const firstResult = await prisma.legResult.findFirst({
  where: { teamId },
  orderBy: { startedAt: 'asc' },
})

res.json({
  status: 'in-progress',
  result: serializeResult(activeResult),
  currentLeg: activeResult.leg,
  nextHandoff: activeResult.leg.handoff,
  currentRunner: assignment?.teamMember ?? null,
  assignment,
  eta,
  raceStartedAt: firstResult!.startedAt.toISOString(),
})
```

- [ ] **Step 4: Run tests and verify they pass**

```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test src/__tests__/results.test.ts
```

Expected: all tests pass including the new one.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/results.ts server/src/__tests__/results.test.ts
git commit -m "feat(server): add raceStartedAt to /current in-progress response"
```

---

### Task 2: Driver — type update, `formatRaceTime`, and `App.tsx` threading

**Files:**
- Modify: `apps/driver/src/api.ts`
- Modify: `apps/driver/src/App.tsx`

- [ ] **Step 1: Add `raceStartedAt` to `CurrentStateInProgress` and add `formatRaceTime`**

In `apps/driver/src/api.ts`:

1. Add `raceStartedAt: string | null` to `CurrentStateInProgress` (currently ends at line ~25):

```ts
export type CurrentStateInProgress = {
  status: 'in-progress'
  result: { id: string; teamId: string; legId: string; startedAt: string; finishedAt: null }
  currentLeg: Leg
  nextHandoff: Handoff | null
  currentRunner: TeamMember | null
  eta: { eta: string; secondsRemaining: number; status: 'on-pace' | 'ahead' | 'overdue' } | null
  raceStartedAt: string | null
}
```

2. After the existing `formatElapsed` function (around line 56), add `formatRaceTime`:

```ts
export function formatRaceTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}
```

- [ ] **Step 2: Add `raceStartedAt` to the `racing` view type in `App.tsx`**

In `apps/driver/src/App.tsx`, find the `View` type (around line 9). Update the `racing` variant:

```ts
type View =
  | { type: 'loading' }
  | { type: 'no-race' }
  | { type: 'auth'; race: Race }
  | { type: 'start'; race: Race; team: TeamSummary; pin: string; nextLeg: Leg }
  | { type: 'racing'; race: Race; team: TeamSummary; pin: string; resultId: string; leg: Leg; startedAt: string; nextHandoff: Handoff | null; currentRunner: string | null; raceStartedAt: string | null }
  | { type: 'complete'; race: Race; team: TeamSummary; pin: string }
```

- [ ] **Step 3: Thread `raceStartedAt` through all three `setView` calls in `App.tsx`**

**`handleAuth`** — in the `else` branch that sets `type: 'racing'` (around line 36), add:
```ts
raceStartedAt: state.raceStartedAt ?? null,
```

**`handleStart`** — in the `setView` call (around line 51), add:
```ts
raceStartedAt: state.raceStartedAt ?? null,
```

**`handleLap`** — in the `setView` call (around line 66), add:
```ts
raceStartedAt: state.raceStartedAt ?? null,
```

**The `TimingScreen` JSX** (around line 118) — add the prop:
```tsx
<TimingScreen
  race={view.race}
  team={view.team}
  pin={view.pin}
  resultId={view.resultId}
  leg={view.leg}
  startedAt={view.startedAt}
  nextHandoff={view.nextHandoff}
  currentRunner={view.currentRunner}
  raceStartedAt={view.raceStartedAt}
  onLap={handleLap}
  onComplete={handleComplete}
/>
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /path/to/repo && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver build 2>&1 | head -30
```

Expected: no TypeScript errors (build may warn about other things but no type errors on changed lines).

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/api.ts apps/driver/src/App.tsx
git commit -m "feat(driver): add raceStartedAt to CurrentStateInProgress and thread through App"
```

---

### Task 3: Driver — `RaceBanner` component + integrate into `StartScreen` and `TimingScreen`

**Files:**
- Create: `apps/driver/src/components/RaceBanner.tsx`
- Modify: `apps/driver/src/components/StartScreen.tsx`
- Modify: `apps/driver/src/components/TimingScreen.tsx`

- [ ] **Step 1: Create `RaceBanner.tsx`**

Create `apps/driver/src/components/RaceBanner.tsx` with the following content:

```tsx
import { useState, useEffect } from 'react'
import { formatRaceTime } from '../api'

interface Props {
  teamName: string
  raceStartedAt: string | null
}

export function RaceBanner({ teamName, raceStartedAt }: Props) {
  const [elapsedMs, setElapsedMs] = useState(
    raceStartedAt ? Date.now() - new Date(raceStartedAt).getTime() : 0
  )

  useEffect(() => {
    if (!raceStartedAt) {
      setElapsedMs(0)
      return
    }
    const start = new Date(raceStartedAt).getTime()
    setElapsedMs(Date.now() - start)
    const id = setInterval(() => setElapsedMs(Date.now() - start), 1_000)
    return () => clearInterval(id)
  }, [raceStartedAt])

  return (
    <div
      className="flex items-center justify-between px-4 py-2"
      style={{ background: '#0f172a', borderBottom: '2px solid #1e3a5f' }}
    >
      <div className="flex items-center gap-2">
        <div className="relative w-2.5 h-2.5 flex-shrink-0">
          <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-60" />
          <div className="absolute inset-0 rounded-full bg-blue-400" />
        </div>
        <span className="text-sm font-semibold text-slate-400">{teamName}</span>
      </div>
      <div className="text-right">
        <div className="font-mono text-base font-bold leading-none text-blue-400">
          {formatRaceTime(elapsedMs)}
        </div>
        <div className="text-[9px] uppercase tracking-widest text-slate-500 mt-0.5">Race time</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update `StartScreen.tsx` to include the banner**

The current outer div in `StartScreen` is:
```tsx
<div className="min-h-screen bg-gray-950 text-white flex flex-col p-6">
  <div className="mb-2 text-sm text-gray-400">{race.name} · {team.name}</div>
  <div className="flex-1 flex flex-col justify-center gap-6">
    ...
  </div>
</div>
```

Replace with (add import at top, restructure to put banner outside the padding):

Add import after existing imports:
```tsx
import { RaceBanner } from './RaceBanner'
```

Replace the return value:
```tsx
return (
  <div className="min-h-screen bg-gray-950 text-white flex flex-col">
    <RaceBanner teamName={team.name} raceStartedAt={null} />
    <div className="flex-1 flex flex-col p-6">
      <div className="mb-2 text-sm text-gray-400">{race.name} · {team.name}</div>
      <div className="flex-1 flex flex-col justify-center gap-6">
        <div className="text-center">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">First Leg</div>
          <div className="text-3xl font-bold mb-1">Leg {nextLeg.legNumber}</div>
          <div className="text-lg text-gray-300">{nextLeg.name}</div>
          <div className="text-sm text-gray-400">{nextLeg.distanceMiles} mi</div>
        </div>
        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        <LongPressButton
          label="START"
          holdMs={500}
          onComplete={handleStart}
          colorClass="bg-green-600"
          disabled={started}
          className="text-xl"
        />
        <p className="text-xs text-gray-500 text-center">Hold to start the race</p>
      </div>
    </div>
  </div>
)
```

- [ ] **Step 3: Update `TimingScreen.tsx` to accept `raceStartedAt` and include the banner**

In `apps/driver/src/components/TimingScreen.tsx`:

1. Add `raceStartedAt: string | null` to the `Props` interface (after `currentRunner`):
```ts
interface Props {
  race: Race
  team: TeamSummary
  pin: string
  resultId: string
  leg: Leg
  startedAt: string
  nextHandoff: Handoff | null
  currentRunner: string | null
  raceStartedAt: string | null
  onLap: (state: CurrentStateInProgress) => void
  onComplete: () => void
}
```

2. Destructure `raceStartedAt` from props:
```ts
export function TimingScreen({ race, team, pin, resultId, leg, startedAt, nextHandoff, currentRunner, raceStartedAt, onLap, onComplete }: Props) {
```

3. Add import after existing imports:
```tsx
import { RaceBanner } from './RaceBanner'
```

4. The current outer div is:
```tsx
<div className="min-h-screen bg-gray-950 text-white flex flex-col p-4 gap-4">
```

Replace the entire return with the banner at top and `flex-1` inner wrapper so `mt-auto` on the LAP button still works:

```tsx
return (
  <div className="min-h-screen bg-gray-950 text-white flex flex-col">
    <RaceBanner teamName={team.name} raceStartedAt={raceStartedAt} />
    <div className="flex-1 flex flex-col p-4 gap-4">
      {/* Runner info */}
      <div className="text-center pt-2">
        <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Now on course</div>
        {currentRunner && <div className="text-2xl font-bold">{currentRunner}</div>}
        <div className="text-sm text-gray-400">
          Leg {leg.legNumber} · {leg.name} · {leg.distanceMiles} mi
        </div>
      </div>

      {/* Elapsed + ETA */}
      <div className={`rounded-xl border p-4 ${etaBgClass}`}>
        <div className="flex justify-around items-center">
          <div className="text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Elapsed</div>
            <div className="text-3xl font-bold font-mono">{formatElapsed(elapsed)}</div>
          </div>
          <div className="w-px h-12 bg-gray-700" />
          <div className="text-center">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">ETA</div>
            {eta
              ? <div className={`text-3xl font-bold ${paceColor}`}>{formatTime(eta.eta)}</div>
              : <div className="text-xl text-gray-500">—</div>
            }
          </div>
        </div>
        {eta && (
          <div className={`text-center text-xs mt-2 ${paceColor}`}>
            {eta.status === 'overdue' ? 'overdue' : eta.status === 'ahead' ? 'ahead of pace' : 'on pace'}
          </div>
        )}
      </div>

      {/* Navigation */}
      {navUrl && (
        <a
          href={navUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-center text-sm text-blue-400 underline min-h-[44px] flex items-center justify-center"
        >
          Navigate to {nextHandoff!.name} ↗
        </a>
      )}

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}

      {/* LAP */}
      <div className="mt-auto">
        <LongPressButton
          label="LAP"
          holdMs={1500}
          onComplete={handleLap}
          colorClass="bg-blue-600"
          disabled={acting}
          className="text-xl"
        />
        <p className="text-xs text-gray-500 text-center mt-1">Hold to record handoff</p>
      </div>

      {/* STOP — small, tucked away */}
      <div className="pb-2">
        <LongPressButton
          label="••• End race early"
          holdMs={1500}
          onComplete={handleStop}
          colorClass="bg-gray-800"
          textClass="text-gray-400"
          disabled={acting}
          className="text-sm"
        />
      </div>
    </div>
  </div>
)
```

- [ ] **Step 4: Start the driver dev server and verify in browser**

```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm dev &
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver dev
```

Open http://localhost:5176 in the browser. Auth into a team.

Expected on StartScreen: banner shows `RunGMC` (or team name) with `0:00:00` ticking frozen at zero.
Expected on TimingScreen (if race is in-progress): banner shows live race time ticking each second; existing Elapsed/ETA card is unchanged.

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/components/RaceBanner.tsx apps/driver/src/components/StartScreen.tsx apps/driver/src/components/TimingScreen.tsx
git commit -m "feat(driver): add race time banner to StartScreen and TimingScreen"
```

---

### Task 4: Tracker — `formatElapsed`, `formatRaceTime`, sticky banner, leg elapsed

**Files:**
- Modify: `apps/tracker/src/api.ts`
- Modify: `apps/tracker/src/components/TeamDetail.tsx`

- [ ] **Step 1: Add `formatElapsed` and `formatRaceTime` to tracker's `api.ts`**

In `apps/tracker/src/api.ts`, add both functions after `formatTime`:

```ts
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mm = minutes.toString().padStart(2, '0')
  const ss = seconds.toString().padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`
}

export function formatRaceTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}
```

- [ ] **Step 2: Import `formatElapsed` and `formatRaceTime` in `TeamDetail.tsx`**

In `apps/tracker/src/components/TeamDetail.tsx`, update the import line (currently line 2):

```tsx
import { api, formatTime, formatElapsed, formatRaceTime } from '../api'
```

- [ ] **Step 3: Add derived race time and leg elapsed calculations**

In `TeamDetail.tsx`, after the existing `projectedTimes` block (currently ends around line 92), add:

```tsx
const raceStartedAt = timeline
  .filter(t => t.result !== null)
  .sort((a, b) => new Date(a.result!.startedAt).getTime() - new Date(b.result!.startedAt).getTime())[0]
  ?.result?.startedAt ?? null

const raceElapsedMs = raceStartedAt ? Date.now() - new Date(raceStartedAt).getTime() : 0
const legElapsedMs = activeItem?.result?.startedAt
  ? Date.now() - new Date(activeItem.result.startedAt).getTime()
  : 0
```

These are derived on every render. Since `secondsSinceUpdate` state updates every second, `Date.now()` advances and both values tick live at 1s resolution.

- [ ] **Step 4: Add the sticky banner in `TeamDetail.tsx`**

In `TeamDetail.tsx`, find the return statement. The current structure is:

```tsx
return (
  <div className="min-h-screen" style={{background:'var(--bg)', color:'var(--text)'}}>
    {/* Header */}
    <div className="flex items-center justify-between px-4 py-3" style={{borderBottom:'1px solid var(--border)'}}>
      ...
    </div>

    <div className="p-4 max-w-3xl mx-auto">
      {/* Staleness */}
      ...
```

Insert the sticky banner **between** the header `</div>` and the `<div className="p-4 max-w-3xl mx-auto">`:

```tsx
    {/* Race time banner — sticky */}
    <div
      className="sticky top-0 z-10 flex items-center justify-between px-4 py-2"
      style={{ background: '#0f172a', borderBottom: '2px solid #1e3a5f' }}
    >
      <div className="flex items-center gap-2">
        <div className="relative w-2.5 h-2.5 flex-shrink-0">
          <div className="absolute inset-0 rounded-full animate-ping opacity-60" style={{ background: '#60a5fa' }} />
          <div className="absolute inset-0 rounded-full" style={{ background: '#60a5fa' }} />
        </div>
        <span className="text-sm font-semibold" style={{ color: '#94a3b8' }}>{teamName}</span>
      </div>
      <div className="text-right">
        <div className="font-mono text-base font-bold leading-none" style={{ color: '#60a5fa' }}>
          {formatRaceTime(raceElapsedMs)}
        </div>
        <div className="text-[9px] uppercase tracking-widest mt-0.5" style={{ color: '#475569' }}>Race time</div>
      </div>
    </div>
```

- [ ] **Step 5: Add leg elapsed below the pace badge in the hero card**

In `TeamDetail.tsx`, find the hero card section. The pace badge block currently is (around line 141–148):

```tsx
<div className="flex items-end gap-3 mb-4">
  <span className="font-display text-5xl font-bold leading-none"
    style={{color: activeItem.eta.status === 'overdue' ? 'var(--amber)' : 'var(--green)'}}>
    {formatTime(String(activeItem.eta.eta))}
  </span>
  <span className="font-display text-sm font-semibold uppercase tracking-wide mb-1 px-2 py-0.5 rounded"
    style={{
      background: activeItem.eta.status === 'overdue' ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)',
      color: activeItem.eta.status === 'overdue' ? 'var(--amber)' : 'var(--green)',
    }}>
    {activeItem.eta.status === 'overdue' ? 'Overdue' : activeItem.eta.status === 'ahead' ? 'Ahead' : 'On pace'}
  </span>
</div>
```

Replace the `mb-4` on the wrapping div with `mb-1`, and add the elapsed line immediately after:

```tsx
<div className="flex items-end gap-3 mb-1">
  <span className="font-display text-5xl font-bold leading-none"
    style={{color: activeItem.eta.status === 'overdue' ? 'var(--amber)' : 'var(--green)'}}>
    {formatTime(String(activeItem.eta.eta))}
  </span>
  <span className="font-display text-sm font-semibold uppercase tracking-wide mb-1 px-2 py-0.5 rounded"
    style={{
      background: activeItem.eta.status === 'overdue' ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)',
      color: activeItem.eta.status === 'overdue' ? 'var(--amber)' : 'var(--green)',
    }}>
    {activeItem.eta.status === 'overdue' ? 'Overdue' : activeItem.eta.status === 'ahead' ? 'Ahead' : 'On pace'}
  </span>
</div>
<div className="text-sm mb-4" style={{color:'var(--muted)'}}>
  {formatElapsed(legElapsedMs)} on this leg
</div>
```

- [ ] **Step 6: Start the tracker dev server and verify in browser**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker dev
```

Open http://localhost:5173 in the browser. Navigate to a team detail view.

Expected:
1. Blue banner visible immediately below the "← All Teams | Name | Share" header
2. Banner shows `0:00:00` if race not started, or live ticking race time if in-progress
3. Scroll the timeline — banner sticks to the top of the viewport
4. Hero card (if race in-progress) shows `41:22 on this leg` (or similar) below the pace badge
5. Elapsed time ticks every second
6. After a 30s poll cycle completes, times continue ticking from updated server data

- [ ] **Step 7: Commit**

```bash
git add apps/tracker/src/api.ts apps/tracker/src/components/TeamDetail.tsx
git commit -m "feat(tracker): add sticky race time banner and leg elapsed in hero card"
```

---

## Done

The feature is complete when:
- Driver `StartScreen` shows banner with `0:00:00`
- Driver `TimingScreen` shows banner ticking from first leg's `startedAt`; existing Elapsed/ETA card unchanged
- Tracker `TeamDetail` shows same-styled banner, sticky on scroll
- Tracker hero card shows `X:XX on this leg` below pace badge when race is in-progress
- All server tests pass
