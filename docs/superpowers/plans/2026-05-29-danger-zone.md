# Danger Zone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Danger" tab to the Manager app with three destructive reset operations: clear timing data, delete a team (cascaded), and wipe the entire race.

**Architecture:** Three new admin-authed server endpoints handle deletion in FK-safe order using Prisma transactions. A new `DangerTab` component in the Manager app renders three red-styled sections, each gated by a `ConfirmDialog`. The tab is wired into the existing `TabNav` and `App` with a `onRaceWipe` callback that resets the parent's race state and navigates to the Race tab.

**Tech Stack:** Express + Prisma (server), React + Tailwind + existing `ConfirmDialog` (Manager app), Vitest + Supertest (tests)

---

## File Map

| Action | File | Purpose |
|---|---|---|
| Modify | `server/src/routes/races.ts` | Add `DELETE /api/races/:id/results` and `DELETE /api/races/:id` |
| Modify | `server/src/routes/teams.ts` | Add `DELETE /api/teams/:id` |
| Modify | `server/src/__tests__/races.test.ts` | Tests for the two new race endpoints |
| Modify | `server/src/__tests__/teams.test.ts` | Test for `DELETE /api/teams/:id` |
| Create | `apps/manager/src/tabs/DangerTab.tsx` | Three-section danger zone UI |
| Modify | `apps/manager/src/components/TabNav.tsx` | Add "Danger" tab |
| Modify | `apps/manager/src/App.tsx` | Render DangerTab, add `handleRaceWipe` |

---

## Task 1: `DELETE /api/races/:id/results` — clear timing data

**Files:**
- Modify: `server/src/__tests__/races.test.ts`
- Modify: `server/src/routes/races.ts`

- [ ] **Step 1: Add tests to `server/src/__tests__/races.test.ts`**

Add these imports at the top (after existing imports):
```typescript
import { prisma } from '../lib/prisma'
import { createLeg, createHandoff, createTeam, createMember, createAssignment, createLegResult } from './helpers'
```

Append this describe block at the end of the file:

```typescript
describe('DELETE /api/races/:id/results', () => {
  it('returns 401 without admin password', async () => {
    const race = await createRace()
    const res = await request(app).delete(`/api/races/${race.id}/results`)
    expect(res.status).toBe(401)
  })

  it('returns 404 for unknown race', async () => {
    const res = await request(app)
      .delete('/api/races/nonexistent/results')
      .set(ADMIN)
    expect(res.status).toBe(404)
  })

  it('deletes all leg results, leaving legs and teams intact', async () => {
    const race = await createRace()
    const leg = await createLeg(race.id, 1)
    const team = await createTeam(race.id)
    await createLegResult(team.id, leg.id)

    const res = await request(app)
      .delete(`/api/races/${race.id}/results`)
      .set(ADMIN)
    expect(res.status).toBe(200)

    const legCount = await prisma.leg.count({ where: { raceId: race.id } })
    const teamCount = await prisma.team.count({ where: { raceId: race.id } })
    const resultCount = await prisma.legResult.count({ where: { leg: { raceId: race.id } } })
    expect(legCount).toBe(1)
    expect(teamCount).toBe(1)
    expect(resultCount).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test src/__tests__/races.test.ts
```

Expected: the three new tests FAIL with 404 (route not found) or similar.

- [ ] **Step 3: Implement the endpoint in `server/src/routes/races.ts`**

Add this route after the existing `PUT /races/:id` handler (before `export default router`):

```typescript
router.delete('/races/:id/results', adminAuth, async (req, res, next) => {
  try {
    const race = await prisma.race.findUnique({ where: { id: req.params.id } })
    if (!race) return res.status(404).json({ error: 'Race not found' })
    await prisma.legResult.deleteMany({ where: { leg: { raceId: req.params.id } } })
    res.json({ ok: true })
  } catch (err) { next(err) }
})
```

> Note: returns `200 { ok: true }` rather than 204 because the shared API client (`packages/shared/src/api.ts`) always calls `res.json()` on the response — a 204 with no body would reject.

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test src/__tests__/races.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/races.ts server/src/__tests__/races.test.ts
git commit -m "feat(server): DELETE /api/races/:id/results — clear timing data"
```

---

## Task 2: `DELETE /api/races/:id` — wipe entire race

**Files:**
- Modify: `server/src/__tests__/races.test.ts`
- Modify: `server/src/routes/races.ts`

- [ ] **Step 1: Add tests to `server/src/__tests__/races.test.ts`**

The `prisma` and helpers imports were added in Task 1 — no new imports needed. Append this describe block after the Task 1 block:

```typescript
describe('DELETE /api/races/:id', () => {
  it('returns 401 without admin password', async () => {
    const race = await createRace()
    const res = await request(app).delete(`/api/races/${race.id}`)
    expect(res.status).toBe(401)
  })

  it('returns 404 for unknown race', async () => {
    const res = await request(app)
      .delete('/api/races/nonexistent')
      .set(ADMIN)
    expect(res.status).toBe(404)
  })

  it('deletes race and all dependent data', async () => {
    const race = await createRace()
    const leg = await createLeg(race.id, 1)
    await createHandoff(leg.id)
    const team = await createTeam(race.id)
    const member = await createMember(team.id)
    await createAssignment(team.id, leg.id, member.id)
    await createLegResult(team.id, leg.id)

    const res = await request(app)
      .delete(`/api/races/${race.id}`)
      .set(ADMIN)
    expect(res.status).toBe(200)

    // Everything is gone
    expect(await prisma.race.count()).toBe(0)
    expect(await prisma.leg.count()).toBe(0)
    expect(await prisma.handoff.count()).toBe(0)
    expect(await prisma.team.count()).toBe(0)
    expect(await prisma.teamMember.count()).toBe(0)
    expect(await prisma.legAssignment.count()).toBe(0)
    expect(await prisma.legResult.count()).toBe(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test src/__tests__/races.test.ts
```

Expected: the three new tests FAIL.

- [ ] **Step 3: Implement the endpoint in `server/src/routes/races.ts`**

Add this route after the `DELETE /api/races/:id/results` handler from Task 1:

```typescript
router.delete('/races/:id', adminAuth, async (req, res, next) => {
  try {
    const race = await prisma.race.findUnique({ where: { id: req.params.id } })
    if (!race) return res.status(404).json({ error: 'Race not found' })
    await prisma.$transaction(async (tx) => {
      await tx.legResult.deleteMany({ where: { leg: { raceId: req.params.id } } })
      await tx.legAssignment.deleteMany({ where: { leg: { raceId: req.params.id } } })
      await tx.teamMember.deleteMany({ where: { team: { raceId: req.params.id } } })
      await tx.team.deleteMany({ where: { raceId: req.params.id } })
      await tx.handoff.deleteMany({ where: { leg: { raceId: req.params.id } } })
      await tx.leg.deleteMany({ where: { raceId: req.params.id } })
      await tx.race.delete({ where: { id: req.params.id } })
    })
    res.json({ ok: true })
  } catch (err) { next(err) }
})
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test src/__tests__/races.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/races.ts server/src/__tests__/races.test.ts
git commit -m "feat(server): DELETE /api/races/:id — wipe race and all dependent data"
```

---

## Task 3: `DELETE /api/teams/:id` — delete team with cascade

**Files:**
- Modify: `server/src/__tests__/teams.test.ts`
- Modify: `server/src/routes/teams.ts`

- [ ] **Step 1: Add tests to `server/src/__tests__/teams.test.ts`**

Add these imports at the top (after existing imports) if not already present:

```typescript
import { prisma } from '../lib/prisma'
import { createRace, createLeg, createTeam, createMember, createAssignment, createLegResult } from './helpers'
```

Append this describe block at the end of the file:

```typescript
describe('DELETE /api/teams/:id', () => {
  const ADMIN = { 'X-Admin-Password': 'testadmin' }

  it('returns 401 without admin password', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const res = await request(app).delete(`/api/teams/${team.id}`)
    expect(res.status).toBe(401)
  })

  it('returns 404 for unknown team', async () => {
    const res = await request(app)
      .delete('/api/teams/nonexistent')
      .set(ADMIN)
    expect(res.status).toBe(404)
  })

  it('deletes team and all dependent data, leaving race and legs intact', async () => {
    const race = await createRace()
    const leg = await createLeg(race.id, 1)
    const team = await createTeam(race.id)
    const member = await createMember(team.id)
    await createAssignment(team.id, leg.id, member.id)
    await createLegResult(team.id, leg.id)

    const res = await request(app)
      .delete(`/api/teams/${team.id}`)
      .set(ADMIN)
    expect(res.status).toBe(200)

    // Team and its data are gone
    expect(await prisma.team.count()).toBe(0)
    expect(await prisma.teamMember.count()).toBe(0)
    expect(await prisma.legAssignment.count()).toBe(0)
    expect(await prisma.legResult.count()).toBe(0)

    // Race and legs are untouched
    expect(await prisma.race.count()).toBe(1)
    expect(await prisma.leg.count()).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test src/__tests__/teams.test.ts
```

Expected: the three new tests FAIL.

- [ ] **Step 3: Implement the endpoint in `server/src/routes/teams.ts`**

Add this route after the existing `POST /teams/:id/reset` handler:

```typescript
// Manager: delete team (cascades members, assignments, results)
router.delete('/teams/:id', adminAuth, async (req, res, next) => {
  try {
    const team = await prisma.team.findUnique({ where: { id: req.params.id } })
    if (!team) return res.status(404).json({ error: 'Team not found' })
    await prisma.$transaction(async (tx) => {
      await tx.legResult.deleteMany({ where: { teamId: req.params.id } })
      await tx.legAssignment.deleteMany({ where: { teamId: req.params.id } })
      await tx.teamMember.deleteMany({ where: { teamId: req.params.id } })
      await tx.team.delete({ where: { id: req.params.id } })
    })
    res.json({ ok: true })
  } catch (err) { next(err) }
})
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test src/__tests__/teams.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Run full test suite to confirm no regressions**

```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test
```

Expected: all tests PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/teams.ts server/src/__tests__/teams.test.ts
git commit -m "feat(server): DELETE /api/teams/:id — delete team with cascade"
```

---

## Task 4: `DangerTab` component

**Files:**
- Create: `apps/manager/src/tabs/DangerTab.tsx`

- [ ] **Step 1: Create `apps/manager/src/tabs/DangerTab.tsx`**

```typescript
import { useState, useEffect } from 'react'
import { api } from '../api'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { Race, Team } from '@kt82/shared'

interface Props {
  race: Race | null
  on401: () => void
  onRaceWipe: () => void
}

type Confirm =
  | { type: 'clearResults' }
  | { type: 'deleteTeam'; team: Team }
  | { type: 'wipeAll' }

export function DangerTab({ race, on401, onRaceWipe }: Props) {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (race) loadTeams(race.id)
    else setTeams([])
  }, [race?.id])

  async function loadTeams(raceId: string) {
    setLoading(true)
    try {
      const data = await api.get<Team[]>(`/races/${raceId}/teams`)
      setTeams(data)
    } catch (err: any) {
      if (err.message?.includes('→ 401')) on401()
    } finally {
      setLoading(false)
    }
  }

  function openConfirm(c: Confirm) {
    setError('')
    setSuccess('')
    setConfirm(c)
  }

  async function handleConfirm() {
    if (!confirm || !race) return
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      if (confirm.type === 'clearResults') {
        await api.delete(`/races/${race.id}/results`)
        setSuccess('Timing data cleared.')
      } else if (confirm.type === 'deleteTeam') {
        await api.delete(`/teams/${confirm.team.id}`)
        await loadTeams(race.id)
        setSuccess(`${confirm.team.name} deleted.`)
      } else if (confirm.type === 'wipeAll') {
        await api.delete(`/races/${race.id}`)
        onRaceWipe()
        return
      }
      setConfirm(null)
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setError('Operation failed — check your connection.')
      setConfirm(null)
    } finally {
      setBusy(false)
    }
  }

  if (!race) {
    return (
      <p className="text-gray-500 py-10 text-center text-sm">
        Create a race first before using reset controls.
      </p>
    )
  }

  return (
    <div className="py-4 flex flex-col gap-6">
      {error && <p className="text-red-400 text-sm">{error}</p>}
      {success && <p className="text-emerald-400 text-sm">{success}</p>}

      {/* Clear timing data */}
      <div className="bg-gray-900 rounded-xl p-4 border border-red-900/40">
        <p className="text-xs font-medium text-red-400 uppercase tracking-wider mb-1">Clear Timing Data</p>
        <p className="text-gray-400 text-sm mb-4">
          Deletes all recorded leg times. Teams, members, and assignments are preserved — the race can be re-run without reconfiguring anything.
        </p>
        <button
          onClick={() => openConfirm({ type: 'clearResults' })}
          className="bg-red-700 hover:bg-red-600 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors min-h-[44px]"
        >
          Clear Results
        </button>
      </div>

      {/* Delete a team */}
      <div className="bg-gray-900 rounded-xl p-4 border border-red-900/40">
        <p className="text-xs font-medium text-red-400 uppercase tracking-wider mb-1">Delete a Team</p>
        <p className="text-gray-400 text-sm mb-4">
          Permanently removes a team and all its members, assignments, and recorded times.
        </p>
        {loading ? (
          <p className="text-gray-500 text-sm">Loading…</p>
        ) : teams.length === 0 ? (
          <p className="text-gray-600 text-sm">No teams.</p>
        ) : (
          <div className="flex flex-col divide-y divide-gray-800">
            {teams.map(team => (
              <div key={team.id} className="flex items-center justify-between py-2.5">
                <span className="text-white text-sm">{team.name}</span>
                <button
                  onClick={() => openConfirm({ type: 'deleteTeam', team })}
                  className="text-red-400 hover:text-red-300 text-sm min-h-[44px] px-2 transition-colors"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Wipe everything */}
      <div className="bg-gray-900 rounded-xl p-4 border border-red-900/40">
        <p className="text-xs font-medium text-red-400 uppercase tracking-wider mb-1">Wipe Everything</p>
        <p className="text-gray-400 text-sm mb-4">
          Deletes this race and all data under it — legs, handoffs, teams, members, assignments, and results. The app returns to the empty state.
        </p>
        <button
          onClick={() => openConfirm({ type: 'wipeAll' })}
          className="bg-red-700 hover:bg-red-600 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors min-h-[44px]"
        >
          Wipe Everything
        </button>
      </div>

      {/* Confirm dialogs */}
      {confirm?.type === 'clearResults' && (
        <ConfirmDialog
          title="Clear Results"
          message={`Clear all leg results for ${race.name}? The race can be re-run but all recorded times will be lost.`}
          confirmLabel={busy ? 'Clearing…' : 'Clear Results'}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === 'deleteTeam' && (
        <ConfirmDialog
          title="Delete Team"
          message={`Delete ${confirm.team.name}? This removes the team, all members, assignments, and recorded times permanently.`}
          confirmLabel={busy ? 'Deleting…' : 'Delete Team'}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === 'wipeAll' && (
        <ConfirmDialog
          title="Wipe Everything"
          message={`Delete ${race.name} and all data? This cannot be undone.`}
          confirmLabel={busy ? 'Wiping…' : 'Wipe Everything'}
          onConfirm={handleConfirm}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/manager/src/tabs/DangerTab.tsx
git commit -m "feat(manager): DangerTab component with clear results, delete team, wipe everything"
```

---

## Task 5: Wire DangerTab into TabNav and App

**Files:**
- Modify: `apps/manager/src/components/TabNav.tsx`
- Modify: `apps/manager/src/App.tsx`

- [ ] **Step 1: Update `apps/manager/src/components/TabNav.tsx`**

Replace the entire file with:

```typescript
type Tab = 'race' | 'legs' | 'teams' | 'danger'

interface Props {
  tab: Tab
  onTab: (t: Tab) => void
  onSignOut: () => void
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'race', label: 'Race' },
  { id: 'legs', label: 'Legs' },
  { id: 'teams', label: 'Teams' },
  { id: 'danger', label: 'Danger' },
]

export function TabNav({ tab, onTab, onSignOut }: Props) {
  return (
    <div className="bg-gray-900 border-b border-gray-800">
      {/* Mobile: title row above tabs */}
      <div className="flex items-center justify-between px-4 py-3 md:hidden">
        <span className="font-bold text-white text-base">KT82 Manager</span>
        <button onClick={onSignOut} className="text-gray-400 text-sm hover:text-white">Sign out</button>
      </div>
      {/* Tab row */}
      <div className="flex items-stretch">
        {/* Desktop: title inline with tabs */}
        <div className="hidden md:flex items-center px-4 pr-6 font-bold text-white whitespace-nowrap border-r border-gray-800 text-sm">
          KT82 Manager
        </div>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => onTab(t.id)}
            className={`flex-1 md:flex-none py-3 px-5 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${
              tab === t.id
                ? t.id === 'danger'
                  ? 'border-red-500 text-red-400'
                  : 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
        {/* Desktop: sign out right-aligned */}
        <div className="hidden md:flex items-center ml-auto px-4">
          <button onClick={onSignOut} className="text-gray-500 text-sm hover:text-white transition-colors">
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update `apps/manager/src/App.tsx`**

Replace the entire file with:

```typescript
import { useState } from 'react'
import { LoginScreen } from './components/LoginScreen'
import { TabNav } from './components/TabNav'
import { RaceTab } from './tabs/RaceTab'
import { LegsTab } from './tabs/LegsTab'
import { TeamsTab } from './tabs/TeamsTab'
import { DangerTab } from './tabs/DangerTab'
import { PASSWORD_KEY } from './api'
import type { Race } from '@kt82/shared'

type Tab = 'race' | 'legs' | 'teams' | 'danger'

export default function App() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem(PASSWORD_KEY))
  const [tab, setTab] = useState<Tab>('race')
  const [race, setRace] = useState<Race | null>(null)

  function handle401() {
    localStorage.removeItem(PASSWORD_KEY)
    setAuthed(false)
    setRace(null)
  }

  function handleSignOut() {
    localStorage.removeItem(PASSWORD_KEY)
    setAuthed(false)
    setRace(null)
  }

  function handleRaceWipe() {
    setRace(null)
    setTab('race')
  }

  if (!authed) return <LoginScreen onSuccess={() => setAuthed(true)} />

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <TabNav tab={tab} onTab={setTab} onSignOut={handleSignOut} />
      <div className="p-4 max-w-3xl mx-auto">
        {tab === 'race' && <RaceTab onRaceChange={setRace} on401={handle401} />}
        {tab === 'legs' && <LegsTab race={race} on401={handle401} />}
        {tab === 'teams' && <TeamsTab race={race} on401={handle401} />}
        {tab === 'danger' && <DangerTab race={race} on401={handle401} onRaceWipe={handleRaceWipe} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Start the server and Manager app and verify manually**

In one terminal:
```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm dev
```

In another terminal:
```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter manager dev
```

Open http://localhost:5175 and sign in with `kt82admin`. Verify:
- "Danger" tab appears in the nav bar with red active indicator when selected
- With no race: shows "Create a race first before using reset controls."
- With a race:
  - "Clear Results" button opens confirm dialog with race name; dismissing cancels; confirming shows "Timing data cleared." success message
  - "Delete a Team" section lists teams; Delete button opens confirm; confirming removes the team from the list
  - "Wipe Everything" button opens confirm; confirming returns to the Race tab showing "No race configured yet"

- [ ] **Step 4: Commit**

```bash
git add apps/manager/src/components/TabNav.tsx apps/manager/src/App.tsx
git commit -m "feat(manager): wire DangerTab into TabNav and App"
```
