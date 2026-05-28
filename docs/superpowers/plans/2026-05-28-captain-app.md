# Captain App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Captain app (`apps/captain`) — a PIN-authenticated two-tab web app for managing a team's roster and leg assignments before and during race day.

**Architecture:** React + TypeScript + Tailwind SPA with the same patterns as the Manager app. `api.ts` creates a `createApiClient` singleton that injects `X-Team-Pin` from localStorage; a `deleteWithBody` helper handles DELETE requests that require a JSON body. `App.tsx` manages auth state and tab routing; `RosterTab` owns the initial team detail fetch and lifts it to `App` via callback; `AssignmentsTab` does a parallel fetch on mount (team detail + legs). The server needs one new endpoint (`GET /api/teams/:id/legs`) because the existing legs route is admin-only.

**Tech Stack:** React 18, TypeScript 5, Tailwind CSS 3, Vite 5, `@kt82/shared` (createApiClient, types), Express server (one new endpoint in Task 1)

---

## File Structure

**New files:**
- `apps/captain/src/api.ts` — API client singleton + `deleteWithBody` helper
- `apps/captain/src/components/LoginScreen.tsx` — PIN entry screen
- `apps/captain/src/components/TabNav.tsx` — Roster / Assignments tab nav
- `apps/captain/src/components/Modal.tsx` — bottom-sheet modal (copied from Manager)
- `apps/captain/src/components/ConfirmDialog.tsx` — confirm dialog (copied from Manager)
- `apps/captain/src/tabs/RosterTab.tsx` — member CRUD
- `apps/captain/src/tabs/AssignmentsTab.tsx` — leg-centric assignment list + modal

**Modified files:**
- `apps/captain/src/App.tsx` — overwrite placeholder with auth gate + tab router
- `server/src/routes/teams.ts` — add `GET /api/teams/:id/legs`
- `server/src/__tests__/teams.test.ts` — add tests for new endpoint

---

## Key context

**Auth pattern:** Captain enters PIN → `POST /api/auth/team { pin }` → server returns `{ teamId }` → store `captain_pin` + `captain_team_id` in localStorage → all subsequent requests include `X-Team-Pin` header. On 401: clear both keys, return to login.

**Why `deleteWithBody`:** The shared `api.delete(path)` takes no body, but `DELETE /api/members/:id` and `DELETE /api/assignments/:id` require `{ teamId }` in the body for inline PIN verification. The helper replicates the `createApiClient` fetch logic but adds a body.

**Why member delete cascades:** The server `DELETE /api/members/:id` route wraps in a transaction — it deletes all `LegAssignment` rows for that member first, then deletes the member. No 409 is possible. The confirm dialog should warn about this.

**PUT /api/members/:id body:** Requires `{ name, teamId }` — `teamId` is needed for inline PIN verification.

**PUT /api/assignments/:id body:** Requires `{ teamId, teamMemberId, targetPaceSecPerMile }`.

**Pace format:** Display and input as `M:SS` (e.g. `8:30`). Store as `targetPaceSecPerMile` integer (e.g. `510`).

**Relevant shared types:**
```typescript
// From @kt82/shared
interface Team { id: string; raceId: string; name: string; locked: boolean }
interface TeamMember { id: string; teamId: string; name: string }
interface Leg { id: string; raceId: string; legNumber: number; name: string; distanceMiles: number; handoff: Handoff | null }
interface LegAssignment { id: string; teamId: string; legId: string; teamMemberId: string; targetPaceSecPerMile: number }
interface TeamDetail extends Team {
  members: TeamMember[]
  assignments: (LegAssignment & { leg: Leg; teamMember: TeamMember })[]
  results: LegResult[]
}
```

---

## Task 1: Add GET /api/teams/:id/legs server endpoint

**Files:**
- Modify: `server/src/routes/teams.ts`
- Modify: `server/src/__tests__/teams.test.ts`

The existing `GET /api/races/:id/legs` uses `adminAuth`. Captains authenticate with a PIN, so they need a team-scoped endpoint that looks up the team's `raceId` and returns all legs for that race.

- [ ] **Step 1: Write the failing tests**

Add to the bottom of `server/src/__tests__/teams.test.ts`:

```typescript
describe('GET /api/teams/:id/legs', () => {
  it('returns legs in legNumber order for the team race', async () => {
    const race = await createRace()
    const team = await createTeam(race.id, '1234')
    await createLeg(race.id, 2)
    await createLeg(race.id, 1)

    const res = await request(app)
      .get(`/api/teams/${team.id}/legs`)
      .set('X-Team-Pin', '1234')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].legNumber).toBe(1)
    expect(res.body[1].legNumber).toBe(2)
  })

  it('returns 401 with wrong PIN', async () => {
    const race = await createRace()
    const team = await createTeam(race.id, '1234')

    const res = await request(app)
      .get(`/api/teams/${team.id}/legs`)
      .set('X-Team-Pin', '9999')
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/mattstocke/Code/KT82/server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test src/__tests__/teams.test.ts
```

Expected: 2 new tests FAIL with "Cannot GET /api/teams/.../legs" or 404.

- [ ] **Step 3: Add the route to server/src/routes/teams.ts**

Add this block after the `router.get('/teams/:id', teamAuth, ...)` handler:

```typescript
router.get('/teams/:id/legs', teamAuth, async (req, res, next) => {
  try {
    const team = await prisma.team.findUnique({ where: { id: req.params.id } })
    if (!team) return res.status(404).json({ error: 'Team not found' })
    const legs = await prisma.leg.findMany({
      where: { raceId: team.raceId },
      orderBy: { legNumber: 'asc' },
      include: { handoff: true },
    })
    res.json(legs)
  } catch (err) { next(err) }
})
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/mattstocke/Code/KT82/server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test src/__tests__/teams.test.ts
```

Expected: all teams tests pass including the 2 new ones.

- [ ] **Step 5: Run full test suite**

```bash
cd /Users/mattstocke/Code/KT82/server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test
```

Expected: all 47 tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/src/routes/teams.ts server/src/__tests__/teams.test.ts
git commit -m "feat: add GET /api/teams/:id/legs endpoint for captain app"
```

---

## Task 2: Captain api.ts and App.tsx shell

**Files:**
- Create: `apps/captain/src/api.ts`
- Modify: `apps/captain/src/App.tsx`

- [ ] **Step 1: Create apps/captain/src/api.ts**

```typescript
import { createApiClient } from '@kt82/shared'

export const TEAM_ID_KEY = 'captain_team_id'
export const PIN_KEY = 'captain_pin'

export function getTeamId(): string | null {
  return localStorage.getItem(TEAM_ID_KEY)
}

export const api = createApiClient('/api', () => {
  const pin = localStorage.getItem(PIN_KEY)
  const headers: Record<string, string> = {}
  if (pin) headers['X-Team-Pin'] = pin
  return headers
})

export async function deleteWithBody(path: string, body: unknown): Promise<void> {
  const pin = localStorage.getItem(PIN_KEY) ?? ''
  const res = await fetch(`/api${path}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(pin ? { 'X-Team-Pin': pin } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`DELETE ${path} → ${res.status}: ${text}`)
  }
}
```

- [ ] **Step 2: Overwrite apps/captain/src/App.tsx**

```typescript
import { useState } from 'react'
import { LoginScreen } from './components/LoginScreen'
import { TabNav } from './components/TabNav'
import { RosterTab } from './tabs/RosterTab'
import { AssignmentsTab } from './tabs/AssignmentsTab'
import { TEAM_ID_KEY, PIN_KEY } from './api'
import type { TeamDetail } from '@kt82/shared'

type Tab = 'roster' | 'assignments'

export default function App() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem(TEAM_ID_KEY))
  const [tab, setTab] = useState<Tab>('roster')
  const [teamDetail, setTeamDetail] = useState<TeamDetail | null>(null)

  function handle401() {
    localStorage.removeItem(TEAM_ID_KEY)
    localStorage.removeItem(PIN_KEY)
    setAuthed(false)
    setTeamDetail(null)
  }

  function handleSignOut() {
    localStorage.removeItem(TEAM_ID_KEY)
    localStorage.removeItem(PIN_KEY)
    setAuthed(false)
    setTeamDetail(null)
  }

  if (!authed) return <LoginScreen onSuccess={() => setAuthed(true)} />

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <TabNav tab={tab} onTab={setTab} onSignOut={handleSignOut} teamName={teamDetail?.name} />
      <div className="p-4 max-w-3xl mx-auto">
        {tab === 'roster' && <RosterTab onTeamLoad={setTeamDetail} on401={handle401} />}
        {tab === 'assignments' && <AssignmentsTab teamDetail={teamDetail} on401={handle401} />}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter captain build 2>&1
```

Expected: TypeScript errors because LoginScreen, TabNav, RosterTab, AssignmentsTab don't exist yet. That's fine — we'll fix them in later tasks. If there are errors *other than* missing module errors, fix them now.

- [ ] **Step 4: Commit**

```bash
git add apps/captain/src/api.ts apps/captain/src/App.tsx
git commit -m "feat: captain app shell and API client"
```

---

## Task 3: LoginScreen and TabNav

**Files:**
- Create: `apps/captain/src/components/LoginScreen.tsx`
- Create: `apps/captain/src/components/TabNav.tsx`

- [ ] **Step 1: Create apps/captain/src/components/LoginScreen.tsx**

Note: `/api/auth/team` reads `pin` from the request body — it does NOT require the `X-Team-Pin` header. Store credentials only after a successful auth response.

```typescript
import { useState } from 'react'
import { api, TEAM_ID_KEY, PIN_KEY } from '../api'

interface Props { onSuccess: () => void }

export function LoginScreen({ onSuccess }: Props) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { teamId } = await api.post<{ teamId: string }>('/auth/team', { pin })
      localStorage.setItem(PIN_KEY, pin)
      localStorage.setItem(TEAM_ID_KEY, teamId)
      onSuccess()
    } catch {
      setError('Wrong PIN')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-1">KT82 Captain</h1>
        <p className="text-gray-400 text-sm mb-6">Enter your team PIN to continue</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="Team PIN"
            autoFocus
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-base font-mono tracking-widest"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !pin}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg px-4 py-3 text-base transition-colors"
          >
            {loading ? 'Checking…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create apps/captain/src/components/TabNav.tsx**

```typescript
type Tab = 'roster' | 'assignments'

interface Props {
  tab: Tab
  onTab: (t: Tab) => void
  onSignOut: () => void
  teamName?: string
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'roster', label: 'Roster' },
  { id: 'assignments', label: 'Assignments' },
]

export function TabNav({ tab, onTab, onSignOut, teamName }: Props) {
  return (
    <div className="bg-gray-900 border-b border-gray-800">
      <div className="flex items-center justify-between px-4 py-3 md:hidden">
        <span className="font-bold text-white text-base">{teamName ?? 'KT82 Captain'}</span>
        <button onClick={onSignOut} className="text-gray-400 text-sm hover:text-white">Sign out</button>
      </div>
      <div className="flex items-stretch">
        <div className="hidden md:flex items-center px-4 pr-6 font-bold text-white whitespace-nowrap border-r border-gray-800 text-sm">
          {teamName ?? 'KT82 Captain'}
        </div>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => onTab(t.id)}
            className={`flex-1 md:flex-none py-3 px-5 text-sm font-medium border-b-2 transition-colors min-h-[44px] ${
              tab === t.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
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

- [ ] **Step 3: Verify build (still expects missing tab files)**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter captain build 2>&1
```

Expected: errors only for missing `RosterTab` and `AssignmentsTab` modules.

- [ ] **Step 4: Commit**

```bash
git add apps/captain/src/components/LoginScreen.tsx apps/captain/src/components/TabNav.tsx
git commit -m "feat: captain login screen and tab navigation"
```

---

## Task 4: Modal and ConfirmDialog

**Files:**
- Create: `apps/captain/src/components/Modal.tsx`
- Create: `apps/captain/src/components/ConfirmDialog.tsx`

These are copies of the Manager app's components. Read the source files and copy them verbatim — same logic, same styles, same props interface.

- [ ] **Step 1: Copy Modal from Manager**

Read `apps/manager/src/components/Modal.tsx` and create `apps/captain/src/components/Modal.tsx` with identical content.

The file should be:

```typescript
import { useEffect } from 'react'

interface Props {
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function Modal({ title, onClose, children }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50 md:p-4" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-800 rounded-t-2xl md:rounded-2xl w-full md:max-w-md shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h2 className="font-semibold text-white text-base">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Copy ConfirmDialog from Manager**

Read `apps/manager/src/components/ConfirmDialog.tsx` and create `apps/captain/src/components/ConfirmDialog.tsx` with identical content.

The file should be:

```typescript
import { Modal } from './Modal'

interface Props {
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger = true, onConfirm, onCancel }: Props) {
  return (
    <Modal title={title} onClose={onCancel}>
      <div className="flex flex-col gap-4">
        <p className="text-gray-300 text-sm">{message}</p>
        <div className="flex gap-3 justify-end pt-1">
          <button onClick={onCancel} className="text-sm text-gray-400 hover:text-white px-3 py-2">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/captain/src/components/Modal.tsx apps/captain/src/components/ConfirmDialog.tsx
git commit -m "feat: captain modal and confirm dialog components"
```

---

## Task 5: RosterTab

**Files:**
- Create: `apps/captain/src/tabs/RosterTab.tsx`

Fetches `GET /api/teams/:id` on mount, displays members list, supports add/rename/delete via modals. Calls `onTeamLoad(detail)` after each fetch so `App` has the latest team detail for `AssignmentsTab`.

Note on delete: the server cascades deletions (removes all leg assignments for the member first), so there is no 409 error. The confirm dialog warns about this side effect.

Note on rename: `PUT /api/members/:id` requires `{ name, teamId }` in the body.
Note on delete: `DELETE /api/members/:id` (via `deleteWithBody`) requires `{ teamId }` in the body.

- [ ] **Step 1: Create apps/captain/src/tabs/RosterTab.tsx**

```typescript
import { useState, useEffect } from 'react'
import { api, getTeamId, deleteWithBody } from '../api'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { TeamDetail, TeamMember } from '@kt82/shared'

interface Props {
  onTeamLoad: (detail: TeamDetail) => void
  on401: () => void
}

type ModalState =
  | { type: 'add' }
  | { type: 'rename'; member: TeamMember }
  | { type: 'delete'; member: TeamMember }

export function RosterTab({ onTeamLoad, on401 }: Props) {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modal, setModal] = useState<ModalState | null>(null)
  const [nameForm, setNameForm] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      const teamId = getTeamId()!
      const detail = await api.get<TeamDetail>(`/teams/${teamId}`)
      setMembers(detail.members)
      onTeamLoad(detail)
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setLoadError('Failed to load — check your connection')
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd() {
    if (!nameForm.trim()) { setFormError('Name is required'); return }
    setSaving(true)
    setFormError('')
    try {
      const teamId = getTeamId()!
      await api.post(`/teams/${teamId}/members`, { name: nameForm.trim() })
      setModal(null)
      await load()
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setFormError('Failed to save — check your connection')
    } finally {
      setSaving(false)
    }
  }

  async function handleRename() {
    if (modal?.type !== 'rename') return
    if (!nameForm.trim()) { setFormError('Name is required'); return }
    setSaving(true)
    setFormError('')
    try {
      const teamId = getTeamId()!
      await api.put(`/members/${modal.member.id}`, { name: nameForm.trim(), teamId })
      setModal(null)
      await load()
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setFormError('Failed to save — check your connection')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (modal?.type !== 'delete') return
    setSaving(true)
    try {
      const teamId = getTeamId()!
      await deleteWithBody(`/members/${modal.member.id}`, { teamId })
      setModal(null)
      await load()
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setFormError('Failed to delete — check your connection')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-gray-500 py-10 text-center">Loading…</p>
  if (loadError) return <p className="text-red-400 py-10 text-center">{loadError}</p>

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {members.length} {members.length === 1 ? 'Runner' : 'Runners'}
        </p>
        <button
          onClick={() => { setNameForm(''); setFormError(''); setModal({ type: 'add' }) }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors min-h-[36px]"
        >
          + Add Runner
        </button>
      </div>

      {members.length === 0 && (
        <div className="bg-gray-900 rounded-xl p-8 border border-dashed border-gray-700 text-center">
          <p className="text-gray-500 text-sm">No runners yet</p>
        </div>
      )}

      <div className="flex flex-col gap-1">
        {members.map(member => (
          <div key={member.id} className="bg-gray-900 rounded-xl px-4 py-3 flex items-center justify-between min-h-[52px]">
            <span className="text-white font-medium text-sm">{member.name}</span>
            <div className="flex items-center gap-3 text-xs">
              <button
                onClick={() => { setNameForm(member.name); setFormError(''); setModal({ type: 'rename', member }) }}
                className="text-blue-400 hover:text-blue-300 min-h-[44px] flex items-center"
              >
                Rename
              </button>
              <span className="text-gray-700">·</span>
              <button
                onClick={() => { setFormError(''); setModal({ type: 'delete', member }) }}
                className="text-red-400 hover:text-red-300 min-h-[44px] flex items-center"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal?.type === 'add' && (
        <Modal title="Add Runner" onClose={() => setModal(null)}>
          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="text-sm text-gray-400 block mb-1">Name</span>
              <input
                type="text"
                value={nameForm}
                onChange={e => setNameForm(e.target.value)}
                placeholder="Alice"
                autoFocus
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </label>
            {formError && <p className="text-red-400 text-sm">{formError}</p>}
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setModal(null)} className="text-sm text-gray-400 hover:text-white px-3 py-2">Cancel</button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
              >
                {saving ? 'Saving…' : 'Add'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal?.type === 'rename' && (
        <Modal title="Rename Runner" onClose={() => setModal(null)}>
          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="text-sm text-gray-400 block mb-1">New name</span>
              <input
                type="text"
                value={nameForm}
                onChange={e => setNameForm(e.target.value)}
                autoFocus
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
              />
            </label>
            {formError && <p className="text-red-400 text-sm">{formError}</p>}
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setModal(null)} className="text-sm text-gray-400 hover:text-white px-3 py-2">Cancel</button>
              <button
                onClick={handleRename}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {modal?.type === 'delete' && (
        <ConfirmDialog
          title="Remove Runner"
          message={`Remove ${modal.member.name} from the team? Their leg assignments will also be deleted.`}
          confirmLabel="Remove"
          onConfirm={handleDelete}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter captain build 2>&1
```

Expected: error only for missing `AssignmentsTab` module.

- [ ] **Step 3: Commit**

```bash
git add apps/captain/src/tabs/RosterTab.tsx
git commit -m "feat: captain roster tab with add/rename/delete"
```

---

## Task 6: AssignmentsTab

**Files:**
- Create: `apps/captain/src/tabs/AssignmentsTab.tsx`

Fetches team detail and legs in parallel on mount. Displays all legs in order; each row shows assigned runner + pace or an amber "Unassigned" badge. Tapping a row opens a modal to assign or re-assign with a member picker and pace input.

Pace helpers:
- `parsePace("8:30")` → `510` (or `null` if invalid)
- `formatPace(510)` → `"8:30"`

Validation: input must match `/^\d{1,2}:\d{2}$/`, seconds must be 0–59, minutes must be ≥ 1.

Note on save: `PUT /api/assignments/:id` requires `{ teamId, teamMemberId, targetPaceSecPerMile }` in body.
Note on remove: `DELETE /api/assignments/:id` (via `deleteWithBody`) requires `{ teamId }` in body.

- [ ] **Step 1: Create apps/captain/src/tabs/AssignmentsTab.tsx**

```typescript
import { useState, useEffect } from 'react'
import { api, getTeamId, deleteWithBody } from '../api'
import { Modal } from '../components/Modal'
import type { TeamDetail, TeamMember, Leg, LegAssignment } from '@kt82/shared'

interface Props {
  teamDetail: TeamDetail | null
  on401: () => void
}

type AssignmentDetail = LegAssignment & { teamMember: TeamMember }

function parsePace(input: string): number | null {
  const m = input.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const mins = parseInt(m[1])
  const secs = parseInt(m[2])
  if (secs > 59 || mins < 1) return null
  return mins * 60 + secs
}

function formatPace(secPerMile: number): string {
  const mins = Math.floor(secPerMile / 60)
  const secs = secPerMile % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function AssignmentsTab({ teamDetail, on401 }: Props) {
  const [legs, setLegs] = useState<Leg[]>([])
  const [members, setMembers] = useState<TeamMember[]>(teamDetail?.members ?? [])
  const [assignments, setAssignments] = useState<AssignmentDetail[]>(
    (teamDetail?.assignments ?? []).map(a => ({ ...a, teamMember: a.teamMember }))
  )
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [modal, setModal] = useState<{ leg: Leg; assignment: AssignmentDetail | null } | null>(null)
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [paceInput, setPaceInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setLoadError('')
    try {
      const teamId = getTeamId()!
      const [detail, legsData] = await Promise.all([
        api.get<TeamDetail>(`/teams/${teamId}`),
        api.get<Leg[]>(`/teams/${teamId}/legs`),
      ])
      setMembers(detail.members)
      setAssignments(detail.assignments.map(a => ({ ...a, teamMember: a.teamMember })))
      setLegs(legsData)
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setLoadError('Failed to load — check your connection')
    } finally {
      setLoading(false)
    }
  }

  function openModal(leg: Leg) {
    const assignment = assignments.find(a => a.legId === leg.id) ?? null
    setModal({ leg, assignment })
    setSelectedMemberId(assignment?.teamMemberId ?? '')
    setPaceInput(assignment ? formatPace(assignment.targetPaceSecPerMile) : '')
    setFormError('')
  }

  async function handleSave() {
    if (!selectedMemberId) { setFormError('Select a runner'); return }
    const pace = parsePace(paceInput)
    if (pace === null) { setFormError('Enter pace as M:SS (e.g. 8:30)'); return }
    setSaving(true)
    setFormError('')
    const teamId = getTeamId()!
    try {
      if (modal!.assignment) {
        await api.put(`/assignments/${modal!.assignment.id}`, {
          teamId,
          teamMemberId: selectedMemberId,
          targetPaceSecPerMile: pace,
        })
      } else {
        await api.post(`/teams/${teamId}/assignments`, {
          legId: modal!.leg.id,
          teamMemberId: selectedMemberId,
          targetPaceSecPerMile: pace,
        })
      }
      setModal(null)
      await load()
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setFormError('Failed to save — check your connection')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    if (!modal?.assignment) return
    setSaving(true)
    const teamId = getTeamId()!
    try {
      await deleteWithBody(`/assignments/${modal.assignment.id}`, { teamId })
      setModal(null)
      await load()
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setFormError('Failed to remove — check your connection')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-gray-500 py-10 text-center">Loading…</p>
  if (loadError) return <p className="text-red-400 py-10 text-center">{loadError}</p>

  if (legs.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-gray-500 text-sm">No legs configured yet.</p>
        <p className="text-gray-600 text-xs mt-1">Ask the race manager to set up the course.</p>
      </div>
    )
  }

  const assignmentMap = new Map(assignments.map(a => [a.legId, a]))
  const assignedCount = legs.filter(l => assignmentMap.has(l.id)).length

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {assignedCount} / {legs.length} assigned
        </p>
      </div>

      <div className="flex flex-col gap-1">
        {legs.map(leg => {
          const assignment = assignmentMap.get(leg.id) ?? null
          return (
            <div
              key={leg.id}
              className="bg-gray-900 rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-800/50 transition-colors min-h-[56px]"
              onClick={() => openModal(leg)}
            >
              <div className="min-w-0 flex-1">
                <span className="text-white font-medium text-sm">#{leg.legNumber} · {leg.name}</span>
                <span className="text-gray-400 text-xs ml-2">{leg.distanceMiles} mi</span>
              </div>
              <div className="text-right shrink-0 ml-3">
                {assignment ? (
                  <div>
                    <span className="text-white text-sm block">{assignment.teamMember.name}</span>
                    <span className="text-gray-400 text-xs">{formatPace(assignment.targetPaceSecPerMile)}/mi</span>
                  </div>
                ) : (
                  <span className="text-amber-400 text-xs">Unassigned</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {modal && (
        <Modal
          title={`Leg ${modal.leg.legNumber} — ${modal.leg.name}`}
          onClose={() => setModal(null)}
        >
          <div className="flex flex-col gap-4">
            {members.length === 0 ? (
              <p className="text-gray-400 text-sm">Add runners on the Roster tab first.</p>
            ) : (
              <>
                <div>
                  <p className="text-sm text-gray-400 mb-2">Runner</p>
                  <div className="flex flex-col gap-1.5">
                    {members.map(member => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => setSelectedMemberId(member.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                          selectedMemberId === member.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        {member.name}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="block">
                  <span className="text-sm text-gray-400 block mb-1">Target pace (min/mile)</span>
                  <input
                    type="text"
                    value={paceInput}
                    onChange={e => setPaceInput(e.target.value)}
                    placeholder="8:30"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm font-mono"
                  />
                </label>
                {formError && <p className="text-red-400 text-sm">{formError}</p>}
                <div className="flex items-center justify-between pt-1">
                  {modal.assignment ? (
                    <button
                      onClick={handleRemove}
                      disabled={saving}
                      className="text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      Remove assignment
                    </button>
                  ) : <span />}
                  <div className="flex gap-3">
                    <button onClick={() => setModal(null)} className="text-sm text-gray-400 hover:text-white px-3 py-2">Cancel</button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
                    >
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build passes cleanly**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter captain build 2>&1
```

Expected: clean build, no TypeScript errors, output in `apps/captain/dist/`.

- [ ] **Step 3: Run full server test suite to confirm no regressions**

```bash
cd /Users/mattstocke/Code/KT82/server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test
```

Expected: all 47 tests pass.

- [ ] **Step 4: Commit**

```bash
git add apps/captain/src/tabs/AssignmentsTab.tsx
git commit -m "feat: captain assignments tab with leg-centric assignment and pace input"
```
