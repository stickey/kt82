# Manager App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Implementers should use the `frontend-design` skill when building UI components to ensure high design quality.

**Goal:** Build the Race Manager Console (`apps/manager`) — a tabbed admin web app for creating the race, defining legs and handoffs, and managing teams.

**Architecture:** React + TypeScript + Tailwind SPA. An `api.ts` singleton creates an `ApiClient` from `@kt82/shared` that injects `X-Admin-Password` from localStorage on every request. The top-level `App.tsx` manages auth state and the active tab; each tab is a self-contained component that fetches its own data. Race ID is fetched in `RaceTab` and lifted to `App` via callback so `LegsTab` and `TeamsTab` can use it. Team PINs are stored in localStorage on creation (the server returns them once on `POST /api/races/:id/teams`) and merged into the teams list display.

**Tech Stack:** React 18, TypeScript 5, Tailwind CSS 3, Vite 5, `@kt82/shared` (createApiClient, types), Express server (for the one new endpoint in Task 1)

---

## File Structure

**New files:**
- `apps/manager/src/api.ts` — API client singleton + PIN localStorage helpers
- `apps/manager/src/components/LoginScreen.tsx` — full-screen password prompt
- `apps/manager/src/components/TabNav.tsx` — top tab bar (responsive)
- `apps/manager/src/components/Modal.tsx` — reusable modal wrapper
- `apps/manager/src/components/ConfirmDialog.tsx` — reusable confirm dialog
- `apps/manager/src/tabs/RaceTab.tsx` — Race tab
- `apps/manager/src/tabs/LegsTab.tsx` — Legs tab (list + expand + forms)
- `apps/manager/src/tabs/TeamsTab.tsx` — Teams tab (table/cards + forms)

**Modified files:**
- `apps/manager/src/App.tsx` — overwrite placeholder with auth gate + tab router
- `server/src/routes/races.ts` — add `PUT /api/races/:id`
- `server/src/__tests__/races.test.ts` — add test for new endpoint

---

## Task 1: Add PUT /api/races/:id server endpoint

**Files:**
- Modify: `server/src/routes/races.ts`
- Modify: `server/src/__tests__/races.test.ts`

The Manager needs to edit race name/date. The server currently only has GET + POST for races.

- [ ] **Step 1: Write the failing test**

Add to `server/src/__tests__/races.test.ts`:

```typescript
it('PUT /api/races/:id updates name and date', async () => {
  const race = await createRace({ name: 'Old Name' })
  const res = await request(app)
    .put(`/api/races/${race.id}`)
    .set('X-Admin-Password', 'testadmin')
    .send({ name: 'KT82 2026', date: '2026-09-06T00:00:00.000Z' })
  expect(res.status).toBe(200)
  expect(res.body.name).toBe('KT82 2026')
})

it('PUT /api/races/:id returns 404 for missing race', async () => {
  const res = await request(app)
    .put('/api/races/nonexistent')
    .set('X-Admin-Password', 'testadmin')
    .send({ name: 'X' })
  expect(res.status).toBe(404)
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/mattstocke/Code/KT82/server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test src/__tests__/races.test.ts
```
Expected: 2 new tests FAIL.

- [ ] **Step 3: Add PUT /api/races/:id to server/src/routes/races.ts**

Read the file first. Then add this route after the existing `router.post('/races', ...)` block:

```typescript
router.put('/races/:id', adminAuth, async (req, res, next) => {
  try {
    const { name, date } = req.body
    const data: { name?: string; date?: Date } = {}
    if (name != null) {
      if (!String(name).trim()) return res.status(400).json({ error: 'name cannot be empty' })
      data.name = String(name).trim()
    }
    if (date != null) {
      const d = new Date(date)
      if (isNaN(d.getTime())) return res.status(400).json({ error: 'invalid date' })
      data.date = d
    }
    if (Object.keys(data).length === 0) return res.status(400).json({ error: 'name or date required' })
    const race = await prisma.race.update({ where: { id: req.params.id }, data })
    res.json(race)
  } catch (err) {
    if (!handlePrismaError(err, res)) next(err)
  }
})
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/mattstocke/Code/KT82/server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test src/__tests__/races.test.ts
```
Expected: all races tests PASS. Then run full suite:
```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test
```
Expected: all 43+ tests PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/mattstocke/Code/KT82
git add server/src/routes/races.ts server/src/__tests__/races.test.ts
git commit -m "feat: add PUT /api/races/:id for race editing"
```

---

## Task 2: API client singleton

**Files:**
- Create: `apps/manager/src/api.ts`

No automated tests for this file — verified implicitly when the app loads.

- [ ] **Step 1: Create apps/manager/src/api.ts**

```typescript
import { createApiClient } from '@kt82/shared'

export const PASSWORD_KEY = 'manager_password'
export const PINS_KEY = 'manager_team_pins'

export function getStoredPins(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(PINS_KEY) ?? '{}') } catch { return {} }
}

export function storePin(teamId: string, pin: string): void {
  const pins = getStoredPins()
  pins[teamId] = pin
  localStorage.setItem(PINS_KEY, JSON.stringify(pins))
}

export const api = createApiClient('/api', () => {
  const pw = localStorage.getItem(PASSWORD_KEY) ?? ''
  return pw ? { 'X-Admin-Password': pw } : {}
})
```

- [ ] **Step 2: Commit**

```bash
cd /Users/mattstocke/Code/KT82
git add apps/manager/src/api.ts
git commit -m "feat: manager API client singleton"
```

---

## Task 3: App shell + LoginScreen

**Files:**
- Modify: `apps/manager/src/App.tsx`
- Create: `apps/manager/src/components/LoginScreen.tsx`

- [ ] **Step 1: Create apps/manager/src/components/LoginScreen.tsx**

```typescript
import { useState } from 'react'
import { api, PASSWORD_KEY } from '../api'

interface Props { onSuccess: () => void }

export function LoginScreen({ onSuccess }: Props) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      localStorage.setItem(PASSWORD_KEY, password)
      await api.post('/auth/admin', { password })
      onSuccess()
    } catch {
      localStorage.removeItem(PASSWORD_KEY)
      setError('Wrong password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-1">KT82 Manager</h1>
        <p className="text-gray-400 text-sm mb-6">Admin access required</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Admin password"
            autoFocus
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-base"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
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

- [ ] **Step 2: Overwrite apps/manager/src/App.tsx**

```typescript
import { useState } from 'react'
import { LoginScreen } from './components/LoginScreen'
import { TabNav } from './components/TabNav'
import { RaceTab } from './tabs/RaceTab'
import { LegsTab } from './tabs/LegsTab'
import { TeamsTab } from './tabs/TeamsTab'
import { PASSWORD_KEY } from './api'
import type { Race } from '@kt82/shared'

type Tab = 'race' | 'legs' | 'teams'

export default function App() {
  const [authed, setAuthed] = useState(() => !!localStorage.getItem(PASSWORD_KEY))
  const [tab, setTab] = useState<Tab>('race')
  const [race, setRace] = useState<Race | null>(null)

  function handle401() {
    localStorage.removeItem(PASSWORD_KEY)
    setAuthed(false)
  }

  function handleSignOut() {
    localStorage.removeItem(PASSWORD_KEY)
    setAuthed(false)
  }

  if (!authed) return <LoginScreen onSuccess={() => setAuthed(true)} />

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <TabNav tab={tab} onTab={setTab} onSignOut={handleSignOut} />
      <div className="p-4 max-w-3xl mx-auto">
        {tab === 'race' && <RaceTab onRaceChange={setRace} on401={handle401} />}
        {tab === 'legs' && <LegsTab race={race} on401={handle401} />}
        {tab === 'teams' && <TeamsTab race={race} on401={handle401} />}
      </div>
    </div>
  )
}
```

Note: `TabNav`, `RaceTab`, `LegsTab`, `TeamsTab` don't exist yet — TypeScript will error until Tasks 4–9 are complete. That's fine; build them in order.

- [ ] **Step 3: Commit**

```bash
cd /Users/mattstocke/Code/KT82
git add apps/manager/src/App.tsx apps/manager/src/components/LoginScreen.tsx
git commit -m "feat: manager app shell and login screen"
```

---

## Task 4: TabNav component

**Files:**
- Create: `apps/manager/src/components/TabNav.tsx`

- [ ] **Step 1: Create apps/manager/src/components/TabNav.tsx**

```typescript
type Tab = 'race' | 'legs' | 'teams'

interface Props {
  tab: Tab
  onTab: (t: Tab) => void
  onSignOut: () => void
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'race', label: 'Race' },
  { id: 'legs', label: 'Legs' },
  { id: 'teams', label: 'Teams' },
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
                ? 'border-blue-500 text-blue-400'
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

- [ ] **Step 2: Commit**

```bash
cd /Users/mattstocke/Code/KT82
git add apps/manager/src/components/TabNav.tsx
git commit -m "feat: manager tab navigation"
```

---

## Task 5: Modal + ConfirmDialog

**Files:**
- Create: `apps/manager/src/components/Modal.tsx`
- Create: `apps/manager/src/components/ConfirmDialog.tsx`

- [ ] **Step 1: Create apps/manager/src/components/Modal.tsx**

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
    <div className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50 md:p-4">
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

- [ ] **Step 2: Create apps/manager/src/components/ConfirmDialog.tsx**

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

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  danger = true,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal title={title} onClose={onCancel}>
      <p className="text-gray-300 text-sm mb-5 leading-relaxed">{message}</p>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            danger
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/mattstocke/Code/KT82
git add apps/manager/src/components/Modal.tsx apps/manager/src/components/ConfirmDialog.tsx
git commit -m "feat: reusable Modal and ConfirmDialog components"
```

---

## Task 6: Race Tab

**Files:**
- Create: `apps/manager/src/tabs/RaceTab.tsx`

- [ ] **Step 1: Create apps/manager/src/tabs/RaceTab.tsx**

```typescript
import { useState, useEffect } from 'react'
import { api } from '../api'
import { Modal } from '../components/Modal'
import type { Race } from '@kt82/shared'

interface Props {
  onRaceChange: (race: Race | null) => void
  on401: () => void
}

type Form = { name: string; date: string }

export function RaceTab({ onRaceChange, on401 }: Props) {
  const [race, setRace] = useState<Race | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState<Form>({ name: '', date: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoadError('')
    try {
      const races = await api.get<Race[]>('/races')
      const r = races[0] ?? null
      setRace(r)
      onRaceChange(r)
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setLoadError('Failed to load — check your connection')
    } finally {
      setLoading(false)
    }
  }

  function openCreate() {
    setForm({ name: '', date: '' })
    setFormError('')
    setShowModal(true)
  }

  function openEdit() {
    if (!race) return
    setForm({ name: race.name, date: race.date.slice(0, 10) })
    setFormError('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.date) {
      setFormError('Race name and date are required')
      return
    }
    const isoDate = new Date(form.date + 'T12:00:00').toISOString()
    setSaving(true)
    setFormError('')
    try {
      let updated: Race
      if (race) {
        updated = await api.put<Race>(`/races/${race.id}`, { name: form.name.trim(), date: isoDate })
      } else {
        updated = await api.post<Race>('/races', { name: form.name.trim(), date: isoDate })
      }
      setRace(updated)
      onRaceChange(updated)
      setShowModal(false)
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setFormError('Failed to save — check your connection')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-gray-500 py-10 text-center">Loading…</p>
  if (loadError) return <p className="text-red-400 py-10 text-center">{loadError}</p>

  return (
    <div className="py-4">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Active Race</p>

      {race ? (
        <div className="bg-gray-900 rounded-xl p-4 flex items-start justify-between">
          <div>
            <p className="text-white font-semibold text-lg leading-tight">{race.name}</p>
            <p className="text-gray-400 text-sm mt-1">
              {new Date(race.date).toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
          </div>
          <button onClick={openEdit} className="text-blue-400 hover:text-blue-300 text-sm font-medium min-h-[44px] flex items-center">
            Edit
          </button>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl p-8 border border-dashed border-gray-700 text-center">
          <p className="text-gray-500 text-sm mb-3">No race configured yet</p>
          <button onClick={openCreate} className="text-blue-400 hover:text-blue-300 text-sm font-medium">
            + Create Race
          </button>
        </div>
      )}

      {showModal && (
        <Modal title={race ? 'Edit Race' : 'Create Race'} onClose={() => setShowModal(false)}>
          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="text-sm text-gray-400 block mb-1">Race name</span>
              <input
                type="text"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="KT82 2026"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-400 block mb-1">Race date</span>
              <input
                type="date"
                value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
              />
            </label>
            {formError && <p className="text-red-400 text-sm">{formError}</p>}
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setShowModal(false)} className="text-sm text-gray-400 hover:text-white px-3 py-2">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Start the dev server and verify**

In one terminal:
```bash
cd /Users/mattstocke/Code/KT82/server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm dev
```

In another terminal:
```bash
cd /Users/mattstocke/Code/KT82 && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter manager dev
```

Open http://localhost:5175/manager

Verify:
- [ ] Login screen appears; entering wrong password shows "Wrong password"
- [ ] Entering `kt82admin` (the dev admin password) logs in and shows "No race configured yet"
- [ ] "+ Create Race" opens a modal; filling in name + date and saving creates the race
- [ ] "Edit" button opens modal pre-filled; saving updates the race
- [ ] Refreshing the page keeps you logged in (password in localStorage)
- [ ] "Sign out" returns to login screen

- [ ] **Step 3: Commit**

```bash
cd /Users/mattstocke/Code/KT82
git add apps/manager/src/tabs/RaceTab.tsx
git commit -m "feat: manager race tab"
```

---

## Task 7: Legs Tab — display

**Files:**
- Create: `apps/manager/src/tabs/LegsTab.tsx`

This task builds the legs list with expand/collapse inline handoff display. Mutations (add/edit/delete) are in Task 8.

- [ ] **Step 1: Create apps/manager/src/tabs/LegsTab.tsx**

```typescript
import { useState, useEffect } from 'react'
import { api } from '../api'
import type { Race, Leg } from '@kt82/shared'

interface Props {
  race: Race | null
  on401: () => void
}

export function LegsTab({ race, on401 }: Props) {
  const [legs, setLegs] = useState<Leg[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (race) load(race.id)
    else setLegs([])
  }, [race?.id])

  async function load(raceId: string) {
    setLoading(true)
    setLoadError('')
    try {
      const data = await api.get<Leg[]>(`/races/${raceId}/legs`)
      setLegs(data)
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setLoadError('Failed to load legs')
    } finally {
      setLoading(false)
    }
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  if (!race) {
    return <p className="text-gray-500 py-10 text-center text-sm">Create a race first, then add legs here.</p>
  }
  if (loading) return <p className="text-gray-500 py-10 text-center">Loading…</p>
  if (loadError) return <p className="text-red-400 py-10 text-center">{loadError}</p>

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {legs.length} {legs.length === 1 ? 'Leg' : 'Legs'}
        </p>
        <button className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors min-h-[36px]">
          + Add Leg
        </button>
      </div>

      {legs.length === 0 && (
        <div className="bg-gray-900 rounded-xl p-8 border border-dashed border-gray-700 text-center">
          <p className="text-gray-500 text-sm">No legs yet — add the first one</p>
        </div>
      )}

      <div className="flex flex-col gap-1">
        {legs.map(leg => {
          const open = expanded.has(leg.id)
          const hasHandoff = !!leg.handoff
          return (
            <div key={leg.id} className="bg-gray-900 rounded-xl overflow-hidden">
              {/* Leg row */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-800/50 transition-colors min-h-[52px]"
                onClick={() => toggleExpand(leg.id)}
              >
                <span className="text-gray-500 text-xs w-6 shrink-0 text-right">#{leg.legNumber}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-white font-medium text-sm">{leg.name}</span>
                  <span className="text-gray-400 text-xs ml-2">{leg.distanceMiles} mi</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {!hasHandoff && (
                    <span className="text-amber-400 text-xs">No handoff</span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); /* edit leg — Task 8 */ }}
                    className="text-blue-400 hover:text-blue-300 text-xs min-h-[44px] px-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); /* delete leg — Task 8 */ }}
                    className="text-red-400 hover:text-red-300 text-xs min-h-[44px] px-1"
                  >
                    Delete
                  </button>
                  <span className="text-gray-500 text-xs">{open ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Handoff panel */}
              {open && (
                <div className="border-t border-gray-800 px-4 py-3 pl-[52px] bg-gray-950/50">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Handoff Point</p>
                  {hasHandoff ? (
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-white text-sm font-medium">{leg.handoff!.name}</p>
                        {leg.handoff!.address && (
                          <p className="text-gray-400 text-xs mt-0.5">{leg.handoff!.address}</p>
                        )}
                        {(leg.handoff!.lat != null || leg.handoff!.lng != null) && (
                          <p className="text-gray-500 text-xs mt-0.5">
                            {leg.handoff!.lat}°, {leg.handoff!.lng}°
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => { /* edit handoff — Task 8 */ }}
                        className="text-blue-400 hover:text-blue-300 text-xs shrink-0 min-h-[44px] flex items-center"
                      >
                        Edit handoff
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-gray-500 text-sm">No handoff set</p>
                      <button
                        onClick={() => { /* add handoff — Task 8 */ }}
                        className="text-blue-400 hover:text-blue-300 text-xs min-h-[44px] flex items-center"
                      >
                        + Add handoff
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

With dev servers running (from Task 6 Step 2), navigate to the Legs tab at http://localhost:5175/manager

Verify:
- [ ] "Create a race first" message shows if no race exists
- [ ] After creating a race (Race tab), Legs tab shows "No legs yet"
- [ ] "+ Add Leg" button is visible (not wired up yet — that's Task 8)
- [ ] No TypeScript errors in the terminal

- [ ] **Step 3: Commit**

```bash
cd /Users/mattstocke/Code/KT82
git add apps/manager/src/tabs/LegsTab.tsx
git commit -m "feat: manager legs tab display"
```

---

## Task 8: Legs Tab — add/edit/delete mutations

**Files:**
- Modify: `apps/manager/src/tabs/LegsTab.tsx`

This task wires up all the mutation buttons left as stubs in Task 7.

- [ ] **Step 1: Read the current LegsTab.tsx**, then replace it with the full version below

```typescript
import { useState, useEffect } from 'react'
import { api } from '../api'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { Race, Leg, Handoff } from '@kt82/shared'

interface Props {
  race: Race | null
  on401: () => void
}

type LegForm = { legNumber: string; name: string; distanceMiles: string }
type HandoffForm = { name: string; address: string; lat: string; lng: string }
type ModalState =
  | { type: 'addLeg' }
  | { type: 'editLeg'; leg: Leg }
  | { type: 'deleteLeg'; leg: Leg }
  | { type: 'addHandoff'; leg: Leg }
  | { type: 'editHandoff'; leg: Leg; handoff: Handoff }

export function LegsTab({ race, on401 }: Props) {
  const [legs, setLegs] = useState<Leg[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<ModalState | null>(null)
  const [legForm, setLegForm] = useState<LegForm>({ legNumber: '', name: '', distanceMiles: '' })
  const [handoffForm, setHandoffForm] = useState<HandoffForm>({ name: '', address: '', lat: '', lng: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (race) load(race.id)
    else setLegs([])
  }, [race?.id])

  async function load(raceId: string) {
    setLoading(true)
    setLoadError('')
    try {
      const data = await api.get<Leg[]>(`/races/${raceId}/legs`)
      setLegs(data)
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setLoadError('Failed to load legs')
    } finally {
      setLoading(false)
    }
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function openAddLeg() {
    const nextNum = legs.length > 0 ? Math.max(...legs.map(l => l.legNumber)) + 1 : 1
    setLegForm({ legNumber: String(nextNum), name: '', distanceMiles: '' })
    setFormError('')
    setModal({ type: 'addLeg' })
  }

  function openEditLeg(leg: Leg) {
    setLegForm({ legNumber: String(leg.legNumber), name: leg.name, distanceMiles: String(leg.distanceMiles) })
    setFormError('')
    setModal({ type: 'editLeg', leg })
  }

  function openDeleteLeg(leg: Leg) {
    setModal({ type: 'deleteLeg', leg })
  }

  function openHandoff(leg: Leg) {
    if (leg.handoff) {
      setHandoffForm({
        name: leg.handoff.name,
        address: leg.handoff.address ?? '',
        lat: leg.handoff.lat != null ? String(leg.handoff.lat) : '',
        lng: leg.handoff.lng != null ? String(leg.handoff.lng) : '',
      })
      setModal({ type: 'editHandoff', leg, handoff: leg.handoff })
    } else {
      setHandoffForm({ name: '', address: '', lat: '', lng: '' })
      setModal({ type: 'addHandoff', leg })
    }
    setFormError('')
  }

  async function saveLeg() {
    const num = parseInt(legForm.legNumber)
    const dist = parseFloat(legForm.distanceMiles)
    if (!legForm.name.trim() || isNaN(num) || num < 1 || isNaN(dist) || dist <= 0) {
      setFormError('Leg number (≥1), name, and distance (>0) are required')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      if (modal?.type === 'addLeg') {
        await api.post(`/races/${race!.id}/legs`, {
          legNumber: num, name: legForm.name.trim(), distanceMiles: dist,
        })
      } else if (modal?.type === 'editLeg') {
        await api.put(`/legs/${modal.leg.id}`, {
          legNumber: num, name: legForm.name.trim(), distanceMiles: dist,
        })
      }
      await load(race!.id)
      setModal(null)
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setFormError('Failed to save leg')
    } finally {
      setSaving(false)
    }
  }

  async function deleteLeg() {
    if (modal?.type !== 'deleteLeg') return
    setSaving(true)
    try {
      await api.delete(`/legs/${modal.leg.id}`)
      await load(race!.id)
      setModal(null)
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setFormError('Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  async function saveHandoff() {
    if (!handoffForm.name.trim()) { setFormError('Handoff name is required'); return }
    const lat = handoffForm.lat ? parseFloat(handoffForm.lat) : null
    const lng = handoffForm.lng ? parseFloat(handoffForm.lng) : null
    if (handoffForm.lat && isNaN(lat!)) { setFormError('Latitude must be a number'); return }
    if (handoffForm.lng && isNaN(lng!)) { setFormError('Longitude must be a number'); return }
    setSaving(true)
    setFormError('')
    const body = {
      name: handoffForm.name.trim(),
      address: handoffForm.address.trim() || null,
      lat: lat ?? null,
      lng: lng ?? null,
    }
    try {
      if (modal?.type === 'addHandoff') {
        await api.post(`/legs/${modal.leg.id}/handoff`, body)
      } else if (modal?.type === 'editHandoff') {
        await api.put(`/handoffs/${modal.handoff.id}`, body)
      }
      await load(race!.id)
      setModal(null)
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setFormError('Failed to save handoff')
    } finally {
      setSaving(false)
    }
  }

  if (!race) return <p className="text-gray-500 py-10 text-center text-sm">Create a race first.</p>
  if (loading) return <p className="text-gray-500 py-10 text-center">Loading…</p>
  if (loadError) return <p className="text-red-400 py-10 text-center">{loadError}</p>

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {legs.length} {legs.length === 1 ? 'Leg' : 'Legs'}
        </p>
        <button
          onClick={openAddLeg}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors min-h-[36px]"
        >
          + Add Leg
        </button>
      </div>

      {legs.length === 0 && (
        <div className="bg-gray-900 rounded-xl p-8 border border-dashed border-gray-700 text-center">
          <p className="text-gray-500 text-sm">No legs yet</p>
        </div>
      )}

      <div className="flex flex-col gap-1">
        {legs.map(leg => {
          const open = expanded.has(leg.id)
          return (
            <div key={leg.id} className="bg-gray-900 rounded-xl overflow-hidden">
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-800/50 transition-colors min-h-[52px]"
                onClick={() => toggleExpand(leg.id)}
              >
                <span className="text-gray-500 text-xs w-6 shrink-0 text-right">#{leg.legNumber}</span>
                <div className="flex-1 min-w-0">
                  <span className="text-white font-medium text-sm">{leg.name}</span>
                  <span className="text-gray-400 text-xs ml-2">{leg.distanceMiles} mi</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {!leg.handoff && <span className="text-amber-400 text-xs hidden sm:inline">No handoff</span>}
                  <button
                    onClick={e => { e.stopPropagation(); openEditLeg(leg) }}
                    className="text-blue-400 hover:text-blue-300 text-xs min-h-[44px] px-1"
                  >
                    Edit
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); openDeleteLeg(leg) }}
                    className="text-red-400 hover:text-red-300 text-xs min-h-[44px] px-1"
                  >
                    Delete
                  </button>
                  <span className="text-gray-500 text-xs">{open ? '▲' : '▼'}</span>
                </div>
              </div>

              {open && (
                <div className="border-t border-gray-800 px-4 py-3 pl-[52px] bg-gray-950/50">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Handoff Point</p>
                  {leg.handoff ? (
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-white text-sm font-medium">{leg.handoff.name}</p>
                        {leg.handoff.address && (
                          <p className="text-gray-400 text-xs mt-0.5">{leg.handoff.address}</p>
                        )}
                        {(leg.handoff.lat != null || leg.handoff.lng != null) && (
                          <p className="text-gray-500 text-xs mt-0.5">
                            {leg.handoff.lat}°, {leg.handoff.lng}°
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => openHandoff(leg)}
                        className="text-blue-400 hover:text-blue-300 text-xs shrink-0 min-h-[44px] flex items-center"
                      >
                        Edit handoff
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="text-gray-500 text-sm">No handoff set</p>
                      <button
                        onClick={() => openHandoff(leg)}
                        className="text-blue-400 hover:text-blue-300 text-xs min-h-[44px] flex items-center"
                      >
                        + Add handoff
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Leg modal */}
      {(modal?.type === 'addLeg' || modal?.type === 'editLeg') && (
        <Modal title={modal.type === 'addLeg' ? 'Add Leg' : 'Edit Leg'} onClose={() => setModal(null)}>
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <label className="block w-24 shrink-0">
                <span className="text-sm text-gray-400 block mb-1">Leg #</span>
                <input
                  type="number"
                  min="1"
                  value={legForm.legNumber}
                  onChange={e => setLegForm(f => ({ ...f, legNumber: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-blue-500 text-sm"
                />
              </label>
              <label className="block flex-1">
                <span className="text-sm text-gray-400 block mb-1">Distance (miles)</span>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={legForm.distanceMiles}
                  onChange={e => setLegForm(f => ({ ...f, distanceMiles: e.target.value }))}
                  placeholder="4.2"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-sm text-gray-400 block mb-1">Leg name</span>
              <input
                type="text"
                value={legForm.name}
                onChange={e => setLegForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Hartsburg"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </label>
            {formError && <p className="text-red-400 text-sm">{formError}</p>}
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setModal(null)} className="text-sm text-gray-400 hover:text-white px-3 py-2">Cancel</button>
              <button
                onClick={saveLeg}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Handoff modal */}
      {(modal?.type === 'addHandoff' || modal?.type === 'editHandoff') && (
        <Modal
          title={modal.type === 'addHandoff' ? `Add Handoff — Leg ${modal.leg.legNumber}` : `Edit Handoff — Leg ${modal.leg.legNumber}`}
          onClose={() => setModal(null)}
        >
          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="text-sm text-gray-400 block mb-1">Handoff name <span className="text-gray-600">(required)</span></span>
              <input
                type="text"
                value={handoffForm.name}
                onChange={e => setHandoffForm(f => ({ ...f, name: e.target.value }))}
                placeholder="McBaine Trailhead"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-400 block mb-1">Address <span className="text-gray-600">(optional)</span></span>
              <input
                type="text"
                value={handoffForm.address}
                onChange={e => setHandoffForm(f => ({ ...f, address: e.target.value }))}
                placeholder="1234 County Rd, McBaine, MO"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </label>
            <div className="flex gap-3">
              <label className="block flex-1">
                <span className="text-sm text-gray-400 block mb-1">Latitude <span className="text-gray-600">(optional)</span></span>
                <input
                  type="number"
                  step="any"
                  value={handoffForm.lat}
                  onChange={e => setHandoffForm(f => ({ ...f, lat: e.target.value }))}
                  placeholder="38.834"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </label>
              <label className="block flex-1">
                <span className="text-sm text-gray-400 block mb-1">Longitude <span className="text-gray-600">(optional)</span></span>
                <input
                  type="number"
                  step="any"
                  value={handoffForm.lng}
                  onChange={e => setHandoffForm(f => ({ ...f, lng: e.target.value }))}
                  placeholder="-92.452"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                />
              </label>
            </div>
            {formError && <p className="text-red-400 text-sm">{formError}</p>}
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setModal(null)} className="text-sm text-gray-400 hover:text-white px-3 py-2">Cancel</button>
              <button
                onClick={saveHandoff}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete leg confirm */}
      {modal?.type === 'deleteLeg' && (
        <ConfirmDialog
          title="Delete Leg"
          message={`Delete Leg ${modal.leg.legNumber} — ${modal.leg.name}? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={deleteLeg}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Verify:
- [ ] "+ Add Leg" opens modal; leg number auto-increments; saving creates the leg and it appears in the list
- [ ] Clicking a leg row expands it; expanded row shows "No handoff set" with "+ Add handoff" link
- [ ] "+ Add handoff" opens modal; saving creates the handoff; expanded row now shows name/address/lat-lng
- [ ] "Edit handoff" opens modal pre-filled; saving updates the handoff
- [ ] "Edit" leg opens modal pre-filled with current values; saving updates the leg
- [ ] "Delete" shows confirmation dialog; confirming removes the leg
- [ ] Amber "No handoff" text appears on legs without a handoff (visible on small screens)

- [ ] **Step 3: Commit**

```bash
cd /Users/mattstocke/Code/KT82
git add apps/manager/src/tabs/LegsTab.tsx
git commit -m "feat: manager legs tab with add/edit/delete leg and handoff"
```

---

## Task 9: Teams Tab

**Files:**
- Create: `apps/manager/src/tabs/TeamsTab.tsx`

The server's `GET /api/races/:id/teams` returns `{ id, raceId, name, locked }[]` — no member/assignment counts, no plain PINs. PINs are returned only once on `POST /api/races/:id/teams` and stored in localStorage.

- [ ] **Step 1: Create apps/manager/src/tabs/TeamsTab.tsx**

```typescript
import { useState, useEffect } from 'react'
import { api, getStoredPins, storePin } from '../api'
import { Modal } from '../components/Modal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import type { Race, Team } from '@kt82/shared'

interface Props {
  race: Race | null
  on401: () => void
}

type ModalState =
  | { type: 'addTeam' }
  | { type: 'renameTeam'; team: Team }
  | { type: 'resetTeam'; team: Team }
  | { type: 'exportPins' }

export function TeamsTab({ race, on401 }: Props) {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [modal, setModal] = useState<ModalState | null>(null)
  const [addForm, setAddForm] = useState({ name: '', pin: '' })
  const [renameForm, setRenameForm] = useState({ name: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [pins, setPins] = useState<Record<string, string>>(getStoredPins)

  useEffect(() => {
    if (race) load(race.id)
    else setTeams([])
  }, [race?.id])

  async function load(raceId: string) {
    setLoading(true)
    setLoadError('')
    try {
      const data = await api.get<Team[]>(`/races/${raceId}/teams`)
      setTeams(data)
      setPins(getStoredPins())
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setLoadError('Failed to load teams')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddTeam() {
    const pinVal = addForm.pin.trim()
    if (!addForm.name.trim()) { setFormError('Team name is required'); return }
    if (!/^\d{4,6}$/.test(pinVal)) { setFormError('PIN must be 4–6 digits'); return }
    setSaving(true)
    setFormError('')
    try {
      const created = await api.post<Team & { pin: string }>(`/races/${race!.id}/teams`, {
        name: addForm.name.trim(),
        pin: pinVal,
      })
      storePin(created.id, created.pin)
      setPins(getStoredPins())
      await load(race!.id)
      setModal(null)
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setFormError('Failed to create team')
    } finally {
      setSaving(false)
    }
  }

  async function handleRename() {
    if (modal?.type !== 'renameTeam') return
    if (!renameForm.name.trim()) { setFormError('Name is required'); return }
    setSaving(true)
    setFormError('')
    try {
      await api.put(`/teams/${modal.team.id}`, { name: renameForm.name.trim() })
      await load(race!.id)
      setModal(null)
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
      setFormError('Failed to rename team')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (modal?.type !== 'resetTeam') return
    setSaving(true)
    try {
      await api.post(`/teams/${modal.team.id}/reset`, {})
      await load(race!.id)
      setModal(null)
    } catch (err: any) {
      if (err.message?.includes('→ 401')) { on401(); return }
    } finally {
      setSaving(false)
    }
  }

  function statusBadge(team: Team) {
    if (team.locked) {
      return <span className="bg-emerald-950 text-emerald-400 text-xs font-medium rounded px-2 py-0.5">Locked</span>
    }
    return <span className="border border-gray-700 text-gray-400 text-xs font-medium rounded px-2 py-0.5">Unlocked</span>
  }

  if (!race) return <p className="text-gray-500 py-10 text-center text-sm">Create a race first.</p>
  if (loading) return <p className="text-gray-500 py-10 text-center">Loading…</p>
  if (loadError) return <p className="text-red-400 py-10 text-center">{loadError}</p>

  return (
    <div className="py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          {teams.length} {teams.length === 1 ? 'Team' : 'Teams'}
        </p>
        <div className="flex gap-2">
          {teams.length > 0 && (
            <button
              onClick={() => setModal({ type: 'exportPins' })}
              className="border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors min-h-[36px]"
            >
              Export PINs
            </button>
          )}
          <button
            onClick={() => { setAddForm({ name: '', pin: '' }); setFormError(''); setModal({ type: 'addTeam' }) }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg px-3 py-1.5 transition-colors min-h-[36px]"
          >
            + Add Team
          </button>
        </div>
      </div>

      {teams.length === 0 && (
        <div className="bg-gray-900 rounded-xl p-8 border border-dashed border-gray-700 text-center">
          <p className="text-gray-500 text-sm">No teams yet</p>
        </div>
      )}

      {/* Desktop table */}
      {teams.length > 0 && (
        <div className="hidden md:block bg-gray-900 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[1fr_80px_120px] px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-800">
            <span>Team</span>
            <span>PIN</span>
            <span>Status</span>
          </div>
          {teams.map((team, i) => (
            <div
              key={team.id}
              className={`grid grid-cols-[1fr_80px_120px] px-4 py-3 items-center ${i < teams.length - 1 ? 'border-b border-gray-800' : ''}`}
            >
              <div>
                <span className="text-white text-sm font-medium">{team.name}</span>
                <span className="ml-3 text-xs">
                  <button onClick={() => { setRenameForm({ name: team.name }); setFormError(''); setModal({ type: 'renameTeam', team }) }}
                    className="text-blue-400 hover:text-blue-300">Rename</button>
                  <span className="text-gray-700 mx-1">·</span>
                  <button onClick={() => setModal({ type: 'resetTeam', team })}
                    className="text-amber-400 hover:text-amber-300">Reset</button>
                </span>
              </div>
              <span className="text-white text-sm font-mono">{pins[team.id] ?? '—'}</span>
              <div>{statusBadge(team)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Mobile cards */}
      {teams.length > 0 && (
        <div className="md:hidden flex flex-col gap-2">
          {teams.map(team => (
            <div key={team.id} className="bg-gray-900 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <span className="text-white font-semibold text-base">{team.name}</span>
                {statusBadge(team)}
              </div>
              <div className="flex gap-4 text-xs text-gray-400 mb-3">
                <span>PIN: <span className="text-white font-mono">{pins[team.id] ?? '—'}</span></span>
              </div>
              <div className="flex gap-3 text-xs">
                <button
                  onClick={() => { setRenameForm({ name: team.name }); setFormError(''); setModal({ type: 'renameTeam', team }) }}
                  className="text-blue-400 hover:text-blue-300 min-h-[44px] flex items-center"
                >
                  Rename
                </button>
                <span className="text-gray-700">·</span>
                <button
                  onClick={() => setModal({ type: 'resetTeam', team })}
                  className="text-amber-400 hover:text-amber-300 min-h-[44px] flex items-center"
                >
                  Reset
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add team modal */}
      {modal?.type === 'addTeam' && (
        <Modal title="Add Team" onClose={() => setModal(null)}>
          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="text-sm text-gray-400 block mb-1">Team name</span>
              <input
                type="text"
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Team Alpha"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm text-gray-400 block mb-1">PIN <span className="text-gray-600">(4–6 digits)</span></span>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={addForm.pin}
                onChange={e => setAddForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))}
                placeholder="1234"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm font-mono"
              />
            </label>
            {formError && <p className="text-red-400 text-sm">{formError}</p>}
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setModal(null)} className="text-sm text-gray-400 hover:text-white px-3 py-2">Cancel</button>
              <button
                onClick={handleAddTeam}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
              >
                {saving ? 'Creating…' : 'Create Team'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Rename modal */}
      {modal?.type === 'renameTeam' && (
        <Modal title="Rename Team" onClose={() => setModal(null)}>
          <div className="flex flex-col gap-4">
            <label className="block">
              <span className="text-sm text-gray-400 block mb-1">New name</span>
              <input
                type="text"
                value={renameForm.name}
                onChange={e => setRenameForm({ name: e.target.value })}
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

      {/* Reset confirm */}
      {modal?.type === 'resetTeam' && (
        <ConfirmDialog
          title="Reset Team"
          message={`Reset ${modal.team.name}? This will delete all leg assignments and unlock the team. Race results are also cleared.`}
          confirmLabel="Reset"
          onConfirm={handleReset}
          onCancel={() => setModal(null)}
        />
      )}

      {/* Export PINs modal */}
      {modal?.type === 'exportPins' && (
        <Modal title="Team PINs" onClose={() => setModal(null)}>
          <div className="mb-4">
            <table className="w-full text-sm">
              <tbody>
                {teams.map(team => (
                  <tr key={team.id} className="border-b border-gray-800 last:border-0">
                    <td className="py-2.5 text-white">{team.name}</td>
                    <td className="py-2.5 text-right font-mono text-white">{pins[team.id] ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-gray-500 text-xs mt-3">PINs marked — were not created on this device.</p>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setModal(null)} className="text-sm text-gray-400 hover:text-white px-3 py-2">Close</button>
            <button
              onClick={() => window.print()}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              Print
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser**

Verify:
- [ ] Teams tab shows "Create a race first" if no race
- [ ] After race created: "No teams yet"
- [ ] "+ Add Team" opens modal; PIN input only accepts digits; creating a team shows it in the list with PIN visible
- [ ] Refreshing the page: PIN still shows (stored in localStorage)
- [ ] Desktop: table layout with Team / PIN / Status columns
- [ ] Mobile (resize to 375px): cards layout with stacked info
- [ ] "Rename" renames team; "Reset" shows confirm dialog and resets the team (locked → unlocked)
- [ ] "Export PINs" shows all teams with PINs and a Print button
- [ ] Status badge shows "Locked" (green) or "Unlocked" (gray) correctly

- [ ] **Step 3: Run full server test suite to confirm no regressions**

```bash
cd /Users/mattstocke/Code/KT82/server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test
```
Expected: all tests PASS.

- [ ] **Step 4: Run a production build to confirm no TypeScript errors**

```bash
cd /Users/mattstocke/Code/KT82 && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter manager build
```
Expected: build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/mattstocke/Code/KT82
git add apps/manager/src/tabs/TeamsTab.tsx
git commit -m "feat: manager teams tab with add/rename/reset/export"
```
