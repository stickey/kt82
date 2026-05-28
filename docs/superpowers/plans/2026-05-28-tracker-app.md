# Tracker App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public read-only race status board that auto-detects the active race, shows all teams in a 2-column card grid with live ETAs, and lets users tap into a team's full leg timeline.

**Architecture:** React SPA with hash-based routing (`#team/:id`). No auth — fully public. `App.tsx` handles race discovery and routing. `TeamGrid` and `TeamDetail` each own their own 30-second polling. One new server endpoint (`GET /api/races/active`) added to the existing public tracker router.

**Tech Stack:** React 18 + TypeScript + Tailwind CSS + Vite (frontend); Express + Prisma (server); Vitest + Supertest (server tests). pnpm workspaces monorepo. All pnpm commands require Node 20: prefix with `PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH"`.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `server/src/routes/tracker.ts` | Modify | Add `GET /races/active` route (public, no auth) |
| `server/src/__tests__/tracker.test.ts` | Modify | Add tests for `GET /api/races/active` |
| `apps/tracker/src/api.ts` | Create | API client, `TeamStatus` type, `formatTime` helper |
| `apps/tracker/src/components/TeamGrid.tsx` | Create | 2-col card grid; polls `/races/:id/status` |
| `apps/tracker/src/components/TeamDetail.tsx` | Create | Hero + leg timeline; polls `/teams/:id/timeline` |
| `apps/tracker/src/App.tsx` | Modify | Hash routing + race auto-detect |
| `apps/tracker/index.html` | Modify | Update page title |

---

## Task 1: Server — GET /api/races/active

**Files:**
- Modify: `server/src/routes/tracker.ts`
- Modify: `server/src/__tests__/tracker.test.ts`

- [ ] **Step 1: Write the failing tests**

Add a new `describe` block at the top of `server/src/__tests__/tracker.test.ts`, before the existing `describe('GET /api/races/:id/status ...')` block:

```typescript
describe('GET /api/races/active (no auth)', () => {
  it('returns the most recent race by date', async () => {
    await createRace({ name: 'Old Race', date: new Date('2025-06-01') })
    const recent = await createRace({ name: 'KT82 2026', date: new Date('2026-06-01') })

    const res = await request(app).get('/api/races/active')
    expect(res.status).toBe(200)
    expect(res.body.id).toBe(recent.id)
    expect(res.body.name).toBe('KT82 2026')
  })

  it('returns 404 when no races exist', async () => {
    const res = await request(app).get('/api/races/active')
    expect(res.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test src/__tests__/tracker.test.ts
```

Expected: 2 new tests FAIL with 404 (route not found yet).

- [ ] **Step 3: Add the route to tracker.ts**

In `server/src/routes/tracker.ts`, add this route as the FIRST route in the file, immediately after `const router = Router()`:

```typescript
router.get('/races/active', async (req, res, next) => {
  try {
    const race = await prisma.race.findFirst({ orderBy: { date: 'desc' } })
    if (!race) return res.status(404).json({ error: 'No active race' })
    res.json(race)
  } catch (err) { next(err) }
})
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test src/__tests__/tracker.test.ts
```

Expected: all tracker tests PASS (previously 5, now 7).

- [ ] **Step 5: Run full test suite to check for regressions**

```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/tracker.ts server/src/__tests__/tracker.test.ts
git commit -m "feat: add GET /api/races/active endpoint for tracker"
```

---

## Task 2: Tracker api.ts

**Files:**
- Create: `apps/tracker/src/api.ts`

- [ ] **Step 1: Create the file**

Create `apps/tracker/src/api.ts` with the following content:

```typescript
import { createApiClient } from '@kt82/shared'
import type { Race, LegTimelineItem, TeamMember, Handoff } from '@kt82/shared'

export const api = createApiClient('/api', () => ({}))

export type TeamStatus = {
  team: { id: string; name: string }
  status: 'not-started' | 'in-progress'
  currentLeg?: { id: string; legNumber: number; name: string; distanceMiles: number }
  currentRunner?: TeamMember | null
  nextHandoff?: Handoff | null
  eta?: { eta: string; secondsRemaining: number; status: 'on-pace' | 'ahead' | 'overdue' } | null
}

export function formatTime(isoString: string): string {
  const d = new Date(isoString)
  const h = d.getHours() % 12 || 12
  const m = d.getMinutes().toString().padStart(2, '0')
  const ampm = d.getHours() < 12 ? 'AM' : 'PM'
  return `${h}:${m} ${ampm}`
}

export type { Race, LegTimelineItem }
```

Note: `TeamStatus.eta.eta` is typed as `string` because the server serializes the `Date` to an ISO string when sending JSON. `LegTimelineItem.eta.eta` has the same wire behavior — use `String(item.eta.eta)` when passing to `formatTime`.

- [ ] **Step 2: Verify the build compiles cleanly**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add apps/tracker/src/api.ts
git commit -m "feat: tracker API client and types"
```

---

## Task 3: TeamGrid.tsx

**Files:**
- Create: `apps/tracker/src/components/TeamGrid.tsx`

The grid polls `GET /api/races/:id/status` every 30 seconds and ticks a "Updated Xs ago" counter every second.

- [ ] **Step 1: Create the components directory and file**

Create `apps/tracker/src/components/TeamGrid.tsx`:

```typescript
import { useState, useEffect, useRef } from 'react'
import { api, formatTime } from '../api'
import type { Race, TeamStatus } from '../api'

interface Props {
  race: Race
  onTeamClick: (teamId: string, teamName: string) => void
}

export function TeamGrid({ race, onTeamClick }: Props) {
  const [statuses, setStatuses] = useState<TeamStatus[]>([])
  const [pollError, setPollError] = useState(false)
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState<number | null>(null)
  const lastUpdatedRef = useRef<Date | null>(null)

  useEffect(() => {
    async function poll() {
      try {
        const data = await api.get<TeamStatus[]>(`/races/${race.id}/status`)
        setStatuses(data)
        lastUpdatedRef.current = new Date()
        setSecondsSinceUpdate(0)
        setPollError(false)
      } catch {
        setPollError(true)
      }
    }

    poll()
    const pollId = setInterval(poll, 30_000)
    const tickId = setInterval(() => {
      if (lastUpdatedRef.current) {
        setSecondsSinceUpdate(Math.floor((Date.now() - lastUpdatedRef.current.getTime()) / 1000))
      }
    }, 1_000)

    return () => {
      clearInterval(pollId)
      clearInterval(tickId)
    }
  }, [race.id])

  const raceDate = new Date(race.date).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="text-xl font-bold">{race.name}</h1>
        <p className="text-sm text-gray-400">{raceDate}</p>
        <p className="text-xs text-gray-500 mt-1">
          {pollError
            ? 'Unable to refresh — check connection'
            : secondsSinceUpdate !== null
              ? `Updated ${secondsSinceUpdate}s ago`
              : 'Loading...'}
        </p>
      </div>

      {statuses.length === 0 && !pollError ? (
        <p className="text-gray-500 text-sm">No teams yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {statuses.map(s => (
            <button
              key={s.team.id}
              onClick={() => onTeamClick(s.team.id, s.team.name)}
              className="bg-gray-800 rounded-xl p-3 text-left min-h-[80px] hover:bg-gray-700 active:bg-gray-600 transition-colors w-full"
            >
              <div className="font-semibold text-sm text-white mb-1 leading-tight">{s.team.name}</div>
              {s.status === 'in-progress' && s.currentLeg && s.currentRunner ? (
                <>
                  <div className="text-xs text-gray-400 mb-1">
                    Leg {s.currentLeg.legNumber} · {s.currentRunner.name}
                  </div>
                  {s.eta && (
                    <>
                      <div className={`text-sm font-bold ${s.eta.status === 'overdue' ? 'text-amber-400' : 'text-green-400'}`}>
                        {formatTime(s.eta.eta)}
                      </div>
                      <div className={`text-xs ${s.eta.status === 'overdue' ? 'text-amber-500' : 'text-green-600'}`}>
                        {s.eta.status === 'overdue' ? 'overdue' : s.eta.status === 'ahead' ? 'ahead' : 'on pace'}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-xs text-gray-500">Not started</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
```

Note: `s.eta.eta` is already typed as `string` in `TeamStatus`, so no cast is needed here — pass directly to `formatTime`.

- [ ] **Step 2: Verify build**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker build
```

Expected: build succeeds. (App.tsx doesn't import TeamGrid yet — that's fine.)

- [ ] **Step 3: Commit**

```bash
git add apps/tracker/src/components/TeamGrid.tsx
git commit -m "feat: tracker TeamGrid component with polling"
```

---

## Task 4: TeamDetail.tsx

**Files:**
- Create: `apps/tracker/src/components/TeamDetail.tsx`

The detail view polls `GET /api/teams/:id/timeline` every 30 seconds. Shows a hero section when a leg is in progress, then a full timeline of all assigned legs.

- [ ] **Step 1: Create the file**

Create `apps/tracker/src/components/TeamDetail.tsx`:

```typescript
import { useState, useEffect, useRef } from 'react'
import { api, formatTime } from '../api'
import type { LegTimelineItem } from '../api'

interface Props {
  teamId: string
  teamName: string
  onBack: () => void
}

export function TeamDetail({ teamId, teamName, onBack }: Props) {
  const [timeline, setTimeline] = useState<LegTimelineItem[]>([])
  const [pollError, setPollError] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState<number | null>(null)
  const lastUpdatedRef = useRef<Date | null>(null)

  useEffect(() => {
    async function poll() {
      try {
        const data = await api.get<LegTimelineItem[]>(`/teams/${teamId}/timeline`)
        setTimeline(data)
        lastUpdatedRef.current = new Date()
        setSecondsSinceUpdate(0)
        setPollError(false)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : ''
        if (msg.includes('→ 404')) {
          setNotFound(true)
        } else {
          setPollError(true)
        }
      }
    }

    poll()
    const pollId = setInterval(poll, 30_000)
    const tickId = setInterval(() => {
      if (lastUpdatedRef.current) {
        setSecondsSinceUpdate(Math.floor((Date.now() - lastUpdatedRef.current.getTime()) / 1000))
      }
    }, 1_000)

    return () => {
      clearInterval(pollId)
      clearInterval(tickId)
    }
  }, [teamId])

  function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({ title: teamName, url })
    } else {
      navigator.clipboard.writeText(url)
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        <div className="p-4">
          <button onClick={onBack} className="text-gray-400 text-sm hover:text-white">
            ← All Teams
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400">Team not found.</p>
        </div>
      </div>
    )
  }

  const activeItem = timeline.find(t => t.status === 'in-progress')

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="flex items-center gap-3 p-4 border-b border-gray-800">
        <button
          onClick={onBack}
          className="text-gray-400 text-sm hover:text-white min-h-[44px] flex items-center"
        >
          ← All Teams
        </button>
        <h1 className="flex-1 text-center font-bold text-base">{teamName}</h1>
        <button
          onClick={handleShare}
          className="text-sm text-gray-400 hover:text-white min-h-[44px] flex items-center justify-end"
        >
          Share
        </button>
      </div>

      <div className="p-4 max-w-3xl mx-auto">
        <p className="text-xs text-gray-500 mb-4">
          {pollError
            ? 'Unable to refresh — check connection'
            : secondsSinceUpdate !== null
              ? `Updated ${secondsSinceUpdate}s ago`
              : 'Loading...'}
        </p>

        {activeItem && activeItem.runner && activeItem.eta && (
          <div className={`rounded-xl p-4 mb-5 border ${
            activeItem.eta.status === 'overdue'
              ? 'bg-amber-950 border-amber-500'
              : 'bg-green-950 border-green-500'
          }`}>
            <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
              activeItem.eta.status === 'overdue' ? 'text-amber-400' : 'text-green-400'
            }`}>
              Now on course
            </div>
            <div className="text-base font-bold text-white">
              {activeItem.runner.name} · Leg {activeItem.leg.legNumber} · {activeItem.leg.name}
            </div>
            <div className="text-sm text-gray-300 mb-2">{activeItem.leg.distanceMiles} mi</div>
            <div className="flex items-center gap-3">
              <span className={`text-xl font-bold ${
                activeItem.eta.status === 'overdue' ? 'text-amber-400' : 'text-green-400'
              }`}>
                {formatTime(String(activeItem.eta.eta))}
              </span>
              <span className={`text-sm px-2 py-0.5 rounded-full ${
                activeItem.eta.status === 'overdue'
                  ? 'bg-amber-900 text-amber-300'
                  : 'bg-green-900 text-green-300'
              }`}>
                {activeItem.eta.status === 'overdue' ? 'overdue'
                  : activeItem.eta.status === 'ahead' ? 'ahead'
                  : 'on pace'}
              </span>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">All Legs</div>

        {timeline.length === 0 ? (
          <p className="text-gray-500 text-sm">No assignments yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {timeline.map(item => (
              <div
                key={item.leg.id}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 ${
                  item.status === 'in-progress'
                    ? item.eta?.status === 'overdue'
                      ? 'bg-amber-950 border border-amber-700'
                      : 'bg-green-950 border border-green-700'
                    : item.status === 'completed'
                      ? 'bg-gray-800 opacity-60'
                      : 'bg-gray-800 opacity-40'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                  item.status === 'completed'
                    ? 'bg-gray-600 text-gray-300'
                    : item.status === 'in-progress'
                      ? item.eta?.status === 'overdue'
                        ? 'bg-amber-500 text-black'
                        : 'bg-green-500 text-black'
                      : 'border border-gray-600'
                }`}>
                  {item.status === 'completed' ? '✓' : item.status === 'in-progress' ? '▶' : ''}
                </div>

                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${
                    item.status === 'not-started' ? 'text-gray-500' : 'text-white'
                  }`}>
                    Leg {item.leg.legNumber} · {item.runner?.name ?? '—'}
                  </div>
                  <div className="text-xs text-gray-500">{item.leg.distanceMiles} mi</div>
                </div>

                <div className="text-right flex-shrink-0">
                  {item.status === 'completed' && item.result?.finishedAt ? (
                    <span className="text-xs text-gray-400">{formatTime(item.result.finishedAt)}</span>
                  ) : item.status === 'in-progress' && item.eta ? (
                    <span className={`text-sm font-bold ${
                      item.eta.status === 'overdue' ? 'text-amber-400' : 'text-green-400'
                    }`}>
                      {formatTime(String(item.eta.eta))}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-600">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

Note: `item.eta.eta` is typed as `Date` in `LegTimelineItem` (from `@kt82/shared`) but arrives as an ISO string over the wire. Always wrap with `String(...)` before passing to `formatTime`. Similarly `item.result.finishedAt` is a `string` on the wire — pass directly to `formatTime`.

- [ ] **Step 2: Verify build**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker build
```

Expected: build succeeds.

- [ ] **Step 3: Commit**

```bash
git add apps/tracker/src/components/TeamDetail.tsx
git commit -m "feat: tracker TeamDetail component with hero and timeline"
```

---

## Task 5: App.tsx + index.html

**Files:**
- Modify: `apps/tracker/src/App.tsx`
- Modify: `apps/tracker/index.html`

- [ ] **Step 1: Replace App.tsx**

Replace the entire content of `apps/tracker/src/App.tsx`:

```typescript
import { useState, useEffect } from 'react'
import { api } from './api'
import type { Race } from './api'
import { TeamGrid } from './components/TeamGrid'
import { TeamDetail } from './components/TeamDetail'

function getHashTeamId(): string | null {
  const m = window.location.hash.match(/^#team\/(.+)$/)
  return m ? m[1] : null
}

export default function App() {
  const [race, setRace] = useState<Race | null>(null)
  const [noRace, setNoRace] = useState(false)
  const [teamId, setTeamId] = useState<string | null>(getHashTeamId)
  const [teamName, setTeamName] = useState('')

  useEffect(() => {
    api.get<Race>('/races/active')
      .then(setRace)
      .catch(() => setNoRace(true))
  }, [])

  useEffect(() => {
    function onHashChange() {
      setTeamId(getHashTeamId())
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  function navigateToTeam(id: string, name: string) {
    window.location.hash = `team/${id}`
    setTeamId(id)
    setTeamName(name)
  }

  function navigateBack() {
    window.location.hash = ''
    setTeamId(null)
  }

  if (noRace) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <p className="text-gray-400">No active race.</p>
    </div>
  )

  if (!race) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {teamId
        ? <TeamDetail teamId={teamId} teamName={teamName} onBack={navigateBack} />
        : <TeamGrid race={race} onTeamClick={navigateToTeam} />
      }
    </div>
  )
}
```

- [ ] **Step 2: Update the HTML title**

In `apps/tracker/index.html`, replace:

```html
<title>Vite + React + TS</title>
```

with:

```html
<title>KT82 Tracker</title>
```

- [ ] **Step 3: Build to verify everything compiles**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker build
```

Expected: build succeeds with no TypeScript errors.

- [ ] **Step 4: Start dev server and do a manual smoke test**

In one terminal, start the API server:
```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm dev
```

In another terminal, start the tracker:
```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker dev
```

Open http://localhost:5173 and verify:
- Shows "No active race." if no race exists in the dev DB (or "Loading..." briefly)
- If a race with teams exists: shows the 2-column card grid with team cards
- Tapping a card changes the URL to `#team/:id` and shows the team detail view with header, "← All Teams" back link, "Share" button
- "← All Teams" navigates back and clears the hash
- "Updated Xs ago" counter ticks up every second and resets on each poll

- [ ] **Step 5: Run full server test suite one final time**

```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/tracker/src/App.tsx apps/tracker/index.html
git commit -m "feat: tracker app shell with hash routing and race auto-detect"
```
