# Driver App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Driver app — a PIN-authenticated race-day timing SPA used from a moving vehicle to START/LAP/STOP legs with live ETA display and navigation deep-links.

**Architecture:** Screen-based decomposition — `App.tsx` holds a discriminated-union view state and transitions between `AuthScreen`, `StartScreen`, `TimingScreen`, and `CompleteScreen`. A shared `LongPressButton` component handles all timing actions with hold-to-activate safety. All API calls use a pin-bearing client created via `@kt82/shared`'s `createApiClient`.

**Tech Stack:** Vite + React 18 + TypeScript + Tailwind CSS (same stack as tracker/captain/manager). `@kt82/shared` for `createApiClient`, `Race`, `Leg`, `Handoff`, `LegTimelineItem` types.

---

## Context for Implementers

### Monorepo structure
```
server/          Express API (port 3001)
packages/shared/ types.ts, api.ts, eta.ts
apps/driver/     This app (port 5176)
apps/tracker/    Reference implementation to copy patterns from
```

### Run commands (Node 20 required)
```bash
# Run the API server (keep running in a separate terminal)
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm dev

# Run the driver app
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver dev
# Opens at http://localhost:5176
```

### Key API routes (all under /api, proxied to port 3001 in dev)

**Auth pattern:** PIN sent as `X-Team-Pin` header on all team routes. `createApiClient(baseUrl, getHeaders)` from `@kt82/shared` handles this — see `apps/tracker/src/api.ts` for reference.

| Method | Path | Auth | Request body | Response |
|---|---|---|---|---|
| GET | `/races/active` | none | — | `Race` |
| GET | `/races/:id/status` | none | — | `TeamStatus[]` (defined below) |
| GET | `/teams/:id/current` | X-Team-Pin header | — | `CurrentState` (defined below) |
| POST | `/teams/:id/results` | X-Team-Pin header | `{legId, startedAt}` | `LegResult` |
| PATCH | `/results/:id` | X-Team-Pin header | `{finishedAt, action}` | `{current: LegResult, next: LegResult \| null}` |
| GET | `/teams/:id/timeline` | X-Team-Pin header | — | `LegTimelineItem[]` |

**`/teams/:id/current` response shapes:**
```typescript
// status: 'not-started'
{ status: 'not-started', nextLeg: Leg | null, nextRunner: TeamMember | null }

// status: 'in-progress'
{
  status: 'in-progress',
  result: { id: string; teamId: string; legId: string; startedAt: string; finishedAt: null },
  currentLeg: Leg,
  nextHandoff: Handoff | null,
  currentRunner: TeamMember | null,
  assignment: LegAssignment | null,
  eta: { eta: string; secondsRemaining: number; status: 'on-pace' | 'ahead' | 'overdue' } | null
}
```

**`PATCH /results/:id` with `action: 'lap'`:**
- If another assigned leg exists: atomically closes current leg and creates next LegResult. Returns `{current, next}` where `next.startedAt === finishedAt` of current.
- If no more assigned legs: closes current leg, returns `{current, next: null}`.

**`PATCH /results/:id` with `action: 'stop'`:** Always returns `{current, next: null}`.

### Shared types (from `packages/shared/src/types.ts`)
```typescript
interface Race { id: string; name: string; date: string; createdAt: string }
interface Leg { id: string; raceId: string; legNumber: number; name: string; distanceMiles: number; handoff?: Handoff }
interface Handoff { id: string; legId: string; name: string; address?: string | null; lat?: number | null; lng?: number | null }
interface TeamMember { id: string; teamId: string; name: string }
interface LegAssignment { id: string; teamId: string; legId: string; teamMemberId: string; targetPaceSecPerMile: number }
interface LegTimelineItem {
  leg: Leg
  assignment: (LegAssignment & { teamMember: TeamMember }) | null
  result: { id: string; teamId: string; legId: string; startedAt: string; finishedAt: string | null } | null
  runner: TeamMember | null
  status: 'not-started' | 'in-progress' | 'completed'
  eta: { eta: Date; secondsRemaining: number; status: 'on-pace' | 'ahead' | 'overdue' } | null
}
```

### Reference file
`apps/tracker/src/api.ts` — shows exact `createApiClient` usage pattern.
`apps/tracker/src/components/TeamGrid.tsx` — shows polling pattern with `setInterval` + cleanup.

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `apps/driver/src/api.ts` | **Create** | API client factory, response types, format helpers |
| `apps/driver/src/components/LongPressButton.tsx` | **Create** | Hold-to-activate button with fill animation |
| `apps/driver/src/components/AuthScreen.tsx` | **Create** | Team selection + PIN entry |
| `apps/driver/src/components/StartScreen.tsx` | **Create** | Pre-race: first leg info + START button |
| `apps/driver/src/components/TimingScreen.tsx` | **Create** | In-progress: elapsed+ETA, LAP, nav link |
| `apps/driver/src/components/CompleteScreen.tsx` | **Create** | Post-race: total time + leg splits |
| `apps/driver/src/App.tsx` | **Replace** | State machine, race detection, screen transitions |
| `apps/driver/index.html` | **Modify** | Update page title |

---

## Task 1: `api.ts` — API client and helpers

**Files:**
- Create: `apps/driver/src/api.ts`

- [ ] **Step 1: Create `apps/driver/src/api.ts`**

```typescript
import { createApiClient } from '@kt82/shared'
import type { Race, Leg, Handoff, LegTimelineItem, TeamMember } from '@kt82/shared'

export function createDriverApi(pin: string) {
  return createApiClient('/api', () => ({ 'X-Team-Pin': pin }))
}

export const publicApi = createApiClient('/api', () => ({}))

export type TeamSummary = { id: string; name: string }

export type CurrentStateNotStarted = {
  status: 'not-started'
  nextLeg: Leg | null
  nextRunner: TeamMember | null
}

export type CurrentStateInProgress = {
  status: 'in-progress'
  result: { id: string; teamId: string; legId: string; startedAt: string; finishedAt: null }
  currentLeg: Leg
  nextHandoff: Handoff | null
  currentRunner: TeamMember | null
  eta: { eta: string; secondsRemaining: number; status: 'on-pace' | 'ahead' | 'overdue' } | null
}

export type CurrentState = CurrentStateNotStarted | CurrentStateInProgress

export type LegResultSerialized = {
  id: string; teamId: string; legId: string; startedAt: string; finishedAt: string | null
}

export type LapResult = { current: LegResultSerialized; next: LegResultSerialized | null }

export type TeamStatusItem = {
  team: TeamSummary
  status: 'not-started' | 'in-progress'
}

export function formatTime(isoString: string): string {
  const d = new Date(isoString)
  const h = d.getHours() % 12 || 12
  const m = d.getMinutes().toString().padStart(2, '0')
  const ampm = d.getHours() < 12 ? 'AM' : 'PM'
  return `${h}:${m} ${ampm}`
}

export function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mm = minutes.toString().padStart(2, '0')
  const ss = seconds.toString().padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`
}

export function formatDuration(startIso: string, endIso: string): string {
  return formatElapsed(new Date(endIso).getTime() - new Date(startIso).getTime())
}

export function buildNavUrl(handoff: Handoff): string {
  if (handoff.lat != null && handoff.lng != null)
    return `https://maps.apple.com/?daddr=${handoff.lat},${handoff.lng}`
  if (handoff.address)
    return `https://maps.apple.com/?daddr=${encodeURIComponent(handoff.address)}`
  return ''
}

export type { Race, Leg, Handoff, LegTimelineItem, TeamMember }
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /path/to/repo && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/driver/src/api.ts
git commit -m "feat(driver): api client, types, and format helpers"
```

---

## Task 2: `LongPressButton.tsx` — Hold-to-activate button

**Files:**
- Create: `apps/driver/src/components/LongPressButton.tsx`

The button fills from the bottom while held. Releasing before `holdMs` resets to 0. `onComplete` fires when fill reaches 100%. Touch events and mouse events both work via `onPointerDown/Up/Leave`.

- [ ] **Step 1: Create `apps/driver/src/components/LongPressButton.tsx`**

```typescript
import { useState, useRef, useCallback } from 'react'

interface Props {
  label: string
  holdMs: number
  onComplete: () => void
  colorClass: string      // e.g. 'bg-blue-500'
  textClass?: string      // default 'text-white'
  disabled?: boolean
  className?: string
}

export function LongPressButton({ label, holdMs, onComplete, colorClass, textClass = 'text-white', disabled = false, className = '' }: Props) {
  const [progress, setProgress] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const completedRef = useRef(false)

  const cancel = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    startTimeRef.current = null
    completedRef.current = false
    setProgress(0)
  }, [])

  const start = useCallback(() => {
    if (disabled) return
    completedRef.current = false
    startTimeRef.current = Date.now()

    const tick = () => {
      if (startTimeRef.current === null) return
      const elapsed = Date.now() - startTimeRef.current
      const p = Math.min(elapsed / holdMs, 1)
      setProgress(p)
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        completedRef.current = true
        rafRef.current = null
        startTimeRef.current = null
        onComplete()
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [disabled, holdMs, onComplete])

  return (
    <button
      className={`relative overflow-hidden rounded-xl font-bold min-h-[64px] w-full select-none ${colorClass} ${textClass} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      disabled={disabled}
    >
      {/* Fill overlay rising from bottom */}
      <span
        className="absolute inset-0 bg-white/20 origin-bottom transition-none"
        style={{ transform: `scaleY(${progress})` }}
      />
      <span className="relative z-10 px-4 py-3 block">{label}</span>
    </button>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manually verify in browser**

Start the dev server (`pnpm --filter driver dev`), temporarily render `<LongPressButton label="TEST" holdMs={1000} onComplete={() => alert('done')} colorClass="bg-blue-500" />` in `App.tsx`. Hold the button — fill should rise from bottom. Release early — fill resets. Hold full duration — alert fires. Undo the temporary App.tsx change.

- [ ] **Step 4: Commit**

```bash
git add apps/driver/src/components/LongPressButton.tsx
git commit -m "feat(driver): LongPressButton with fill animation"
```

---

## Task 3: `AuthScreen.tsx` — Team selection + PIN entry

**Files:**
- Create: `apps/driver/src/components/AuthScreen.tsx`

Fetches teams from the active race, shows a select + PIN input. On submit, calls `/teams/:id/current` to verify and determines which view to transition to.

- [ ] **Step 1: Create `apps/driver/src/components/AuthScreen.tsx`**

```typescript
import { useState, useEffect } from 'react'
import { publicApi, createDriverApi } from '../api'
import type { Race, TeamSummary, CurrentState } from '../api'

interface Props {
  race: Race
  onAuth: (team: TeamSummary, pin: string, state: CurrentState) => void
}

export function AuthScreen({ race, onAuth }: Props) {
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [teamId, setTeamId] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    publicApi.get<{ team: TeamSummary }[]>(`/races/${race.id}/status`)
      .then(data => {
        const list = data.map(d => d.team)
        setTeams(list)
        if (list.length > 0) setTeamId(list[0].id)
      })
      .catch(() => setError('Could not load teams'))
  }, [race.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!teamId || !pin) return
    setError('')
    setLoading(true)
    try {
      const api = createDriverApi(pin)
      const state = await api.get<CurrentState>(`/teams/${teamId}/current`)
      const team = teams.find(t => t.id === teamId)!
      onAuth(team, pin, state)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('401')) {
        setError('Incorrect PIN')
      } else {
        setError('Could not connect — check network')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-bold mb-2">{race.name}</h1>
      <p className="text-sm text-gray-400 mb-8">Driver / Timekeeper</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Team</label>
          <select
            value={teamId}
            onChange={e => setTeamId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-base min-h-[44px]"
          >
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Team PIN</label>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="Enter PIN"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-base min-h-[44px]"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !teamId || !pin}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl py-4 font-bold text-lg min-h-[56px]"
        >
          {loading ? 'Verifying…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/driver/src/components/AuthScreen.tsx
git commit -m "feat(driver): AuthScreen team selection and PIN entry"
```

---

## Task 4: `StartScreen.tsx` — Pre-race with START button

**Files:**
- Create: `apps/driver/src/components/StartScreen.tsx`

Shows the first assigned leg. START is a 500ms long press. On complete, POSTs to create the first LegResult, then fetches current state to get `nextHandoff`.

- [ ] **Step 1: Create `apps/driver/src/components/StartScreen.tsx`**

```typescript
import { useState } from 'react'
import { createDriverApi } from '../api'
import { LongPressButton } from './LongPressButton'
import type { Race, TeamSummary, Leg, CurrentStateInProgress } from '../api'

interface Props {
  race: Race
  team: TeamSummary
  pin: string
  nextLeg: Leg
  onStart: (state: CurrentStateInProgress) => void
}

export function StartScreen({ race, team, pin, nextLeg, onStart }: Props) {
  const [error, setError] = useState('')
  const [started, setStarted] = useState(false)

  async function handleStart() {
    if (started) return
    setStarted(true)
    setError('')
    const startedAt = new Date().toISOString()
    try {
      const api = createDriverApi(pin)
      await api.post(`/teams/${team.id}/results`, { legId: nextLeg.id, startedAt })
      const state = await api.get<CurrentStateInProgress>(`/teams/${team.id}/current`)
      onStart(state)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start — try again')
      setStarted(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col p-6">
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
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/driver/src/components/StartScreen.tsx
git commit -m "feat(driver): StartScreen with START long-press"
```

---

## Task 5: `TimingScreen.tsx` — In-progress timing display

**Files:**
- Create: `apps/driver/src/components/TimingScreen.tsx`

Elapsed clock ticks locally every second. ETA polled from server every 30s. LAP (1500ms) and STOP (1500ms, styled as small link) both long-press. After LAP, re-fetches `/current` for new leg data.

- [ ] **Step 1: Create `apps/driver/src/components/TimingScreen.tsx`**

```typescript
import { useState, useEffect, useRef } from 'react'
import { createDriverApi, buildNavUrl, formatElapsed, formatTime } from '../api'
import { LongPressButton } from './LongPressButton'
import type { Race, TeamSummary, Leg, Handoff, CurrentStateInProgress } from '../api'

interface Props {
  race: Race
  team: TeamSummary
  pin: string
  resultId: string
  leg: Leg
  startedAt: string
  nextHandoff: Handoff | null
  currentRunner: string | null
  onLap: (state: CurrentStateInProgress) => void
  onComplete: () => void
}

export function TimingScreen({ race, team, pin, resultId, leg, startedAt, nextHandoff, currentRunner, onLap, onComplete }: Props) {
  const [elapsed, setElapsed] = useState(0)
  const [eta, setEta] = useState<{ eta: string; secondsRemaining: number; status: 'on-pace' | 'ahead' | 'overdue' } | null>(null)
  const [error, setError] = useState('')
  const [acting, setActing] = useState(false)

  // Elapsed clock — ticks every second from startedAt
  useEffect(() => {
    const start = new Date(startedAt).getTime()
    setElapsed(Date.now() - start)
    const id = setInterval(() => setElapsed(Date.now() - start), 1_000)
    return () => clearInterval(id)
  }, [startedAt])

  // ETA poll every 30s
  useEffect(() => {
    const api = createDriverApi(pin)
    async function poll() {
      try {
        const state = await api.get<CurrentStateInProgress>(`/teams/${team.id}/current`)
        if (state.status === 'in-progress') setEta(state.eta ?? null)
      } catch { /* keep stale ETA */ }
    }
    poll()
    const id = setInterval(poll, 30_000)
    return () => clearInterval(id)
  }, [pin, team.id])

  async function handleLap() {
    if (acting) return
    setActing(true)
    setError('')
    const finishedAt = new Date().toISOString()
    try {
      const api = createDriverApi(pin)
      const lapResult = await api.patch<{ current: unknown; next: { id: string; startedAt: string } | null }>(
        `/results/${resultId}`,
        { finishedAt, action: 'lap' }
      )
      if (lapResult.next === null) {
        onComplete()
      } else {
        const state = await api.get<CurrentStateInProgress>(`/teams/${team.id}/current`)
        onLap(state)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed — try again')
      setActing(false)
    }
  }

  async function handleStop() {
    if (acting) return
    setActing(true)
    setError('')
    const finishedAt = new Date().toISOString()
    try {
      const api = createDriverApi(pin)
      await api.patch(`/results/${resultId}`, { finishedAt, action: 'stop' })
      onComplete()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed — try again')
      setActing(false)
    }
  }

  const navUrl = nextHandoff ? buildNavUrl(nextHandoff) : ''
  const paceColor = eta?.status === 'overdue' ? 'text-amber-400' : 'text-green-400'
  const etaBgClass = eta?.status === 'overdue' ? 'bg-amber-900/40 border-amber-700' : 'bg-green-900/40 border-green-800'

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col p-4 gap-4">
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
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/driver/src/components/TimingScreen.tsx
git commit -m "feat(driver): TimingScreen with elapsed clock, ETA, LAP/STOP"
```

---

## Task 6: `CompleteScreen.tsx` — Race complete summary

**Files:**
- Create: `apps/driver/src/components/CompleteScreen.tsx`

Fetches timeline on mount. Computes total time from first `startedAt` to last `finishedAt` across all completed legs.

- [ ] **Step 1: Create `apps/driver/src/components/CompleteScreen.tsx`**

```typescript
import { useState, useEffect } from 'react'
import { createDriverApi, formatElapsed, formatDuration } from '../api'
import type { Race, TeamSummary, LegTimelineItem } from '../api'

interface Props {
  race: Race
  team: TeamSummary
  pin: string
}

export function CompleteScreen({ race, team, pin }: Props) {
  const [items, setItems] = useState<LegTimelineItem[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    createDriverApi(pin)
      .get<LegTimelineItem[]>(`/teams/${team.id}/timeline`)
      .then(setItems)
      .catch(() => setError('Could not load results'))
  }, [pin, team.id])

  const completed = items.filter(i => i.status === 'completed' && i.result?.startedAt && i.result?.finishedAt)

  const totalMs = (() => {
    if (completed.length === 0) return null
    const starts = completed.map(i => new Date(i.result!.startedAt).getTime())
    const ends = completed.map(i => new Date(i.result!.finishedAt!).getTime())
    return Math.max(...ends) - Math.min(...starts)
  })()

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col p-6">
      <div className="text-center mb-8">
        <div className="text-4xl mb-2">🏁</div>
        <h1 className="text-2xl font-bold">Race Complete!</h1>
        <p className="text-gray-400 text-sm mt-1">{team.name}</p>
        {totalMs !== null && (
          <p className="text-xl font-mono font-bold text-green-400 mt-3">
            {formatElapsed(totalMs)}
          </p>
        )}
      </div>

      {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

      <div className="flex flex-col gap-2">
        {items
          .filter(i => i.assignment !== null)
          .sort((a, b) => a.leg.legNumber - b.leg.legNumber)
          .map(item => (
            <div key={item.leg.id} className="bg-gray-800 rounded-lg px-4 py-3 flex justify-between items-center">
              <div>
                <span className="text-xs text-gray-500 mr-2">Leg {item.leg.legNumber}</span>
                <span className="text-sm font-medium">{item.runner?.name ?? '—'}</span>
              </div>
              <div className="font-mono text-sm text-gray-300">
                {item.result?.startedAt && item.result?.finishedAt
                  ? formatDuration(item.result.startedAt, item.result.finishedAt)
                  : '—'}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/driver/src/components/CompleteScreen.tsx
git commit -m "feat(driver): CompleteScreen with total time and leg splits"
```

---

## Task 7: `App.tsx` — State machine and race detection

**Files:**
- Modify: `apps/driver/src/App.tsx` (replace stub)
- Modify: `apps/driver/index.html` (update title)

Fetches the active race on mount. Routes between screens based on view state. Auth transitions are driven by the `CurrentState` returned from PIN verification.

- [ ] **Step 1: Replace `apps/driver/src/App.tsx`**

```typescript
import { useState, useEffect } from 'react'
import { publicApi } from './api'
import { AuthScreen } from './components/AuthScreen'
import { StartScreen } from './components/StartScreen'
import { TimingScreen } from './components/TimingScreen'
import { CompleteScreen } from './components/CompleteScreen'
import type { Race, TeamSummary, Leg, Handoff, CurrentState, CurrentStateInProgress } from './api'

type View =
  | { type: 'loading' }
  | { type: 'no-race' }
  | { type: 'auth'; race: Race }
  | { type: 'start'; race: Race; team: TeamSummary; pin: string; nextLeg: Leg }
  | { type: 'racing'; race: Race; team: TeamSummary; pin: string; resultId: string; leg: Leg; startedAt: string; nextHandoff: Handoff | null; currentRunner: string | null }
  | { type: 'complete'; race: Race; team: TeamSummary; pin: string }

export default function App() {
  const [view, setView] = useState<View>({ type: 'loading' })

  useEffect(() => {
    publicApi.get<Race>('/races/active')
      .then(race => setView({ type: 'auth', race }))
      .catch(() => setView({ type: 'no-race' }))
  }, [])

  function handleAuth(team: TeamSummary, pin: string, state: CurrentState) {
    const race = (view as { race: Race }).race
    if (state.status === 'not-started') {
      if (!state.nextLeg) {
        // Race configured but no assignments yet
        setView({ type: 'auth', race })
        return
      }
      setView({ type: 'start', race, team, pin, nextLeg: state.nextLeg })
    } else {
      setView({
        type: 'racing',
        race,
        team,
        pin,
        resultId: state.result.id,
        leg: state.currentLeg,
        startedAt: state.result.startedAt,
        nextHandoff: state.nextHandoff,
        currentRunner: state.currentRunner?.name ?? null,
      })
    }
  }

  function handleStart(state: CurrentStateInProgress) {
    const v = view as Extract<View, { type: 'start' }>
    setView({
      type: 'racing',
      race: v.race,
      team: v.team,
      pin: v.pin,
      resultId: state.result.id,
      leg: state.currentLeg,
      startedAt: state.result.startedAt,
      nextHandoff: state.nextHandoff,
      currentRunner: state.currentRunner?.name ?? null,
    })
  }

  function handleLap(state: CurrentStateInProgress) {
    const v = view as Extract<View, { type: 'racing' }>
    setView({
      type: 'racing',
      race: v.race,
      team: v.team,
      pin: v.pin,
      resultId: state.result.id,
      leg: state.currentLeg,
      startedAt: state.result.startedAt,
      nextHandoff: state.nextHandoff,
      currentRunner: state.currentRunner?.name ?? null,
    })
  }

  function handleComplete() {
    const v = view as Extract<View, { type: 'racing' }>
    setView({ type: 'complete', race: v.race, team: v.team, pin: v.pin })
  }

  if (view.type === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </div>
    )
  }

  if (view.type === 'no-race') {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">No active race</p>
      </div>
    )
  }

  if (view.type === 'auth') {
    return <AuthScreen race={view.race} onAuth={handleAuth} />
  }

  if (view.type === 'start') {
    return (
      <StartScreen
        race={view.race}
        team={view.team}
        pin={view.pin}
        nextLeg={view.nextLeg}
        onStart={handleStart}
      />
    )
  }

  if (view.type === 'racing') {
    return (
      <TimingScreen
        race={view.race}
        team={view.team}
        pin={view.pin}
        resultId={view.resultId}
        leg={view.leg}
        startedAt={view.startedAt}
        nextHandoff={view.nextHandoff}
        currentRunner={view.currentRunner}
        onLap={handleLap}
        onComplete={handleComplete}
      />
    )
  }

  return <CompleteScreen race={view.race} team={view.team} pin={view.pin} />
}
```

- [ ] **Step 2: Update `apps/driver/index.html` title**

Change the `<title>` tag in `apps/driver/index.html` to:
```html
<title>KT82 Driver</title>
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual smoke test**

Start both server and driver app:
```bash
# Terminal 1
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm dev

# Terminal 2
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver dev
```

Open http://localhost:5176. Expected flow:
1. Loading → AuthScreen with team dropdown and PIN field
2. Enter a team and PIN `1234` → advances to StartScreen (if no active result) or TimingScreen (if race in progress)
3. Hold START (~500ms) → transitions to TimingScreen, elapsed clock begins ticking
4. Wait 30s — ETA updates from server
5. Hold LAP (~1500ms) — transitions to next leg (or complete if last leg)
6. Hold "End race early" (~1500ms) — transitions to CompleteScreen
7. CompleteScreen shows total time and leg splits

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/App.tsx apps/driver/index.html
git commit -m "feat(driver): App state machine and screen routing"
```
