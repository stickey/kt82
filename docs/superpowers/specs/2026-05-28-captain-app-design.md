# Sub-project 3 — Captain App

**Date:** 2026-05-28
**Scope:** Captain app — team setup before and during race day. PIN-authenticated. Two tabs: Roster (manage runners) and Assignments (assign runners to legs with target pace). No lock/unlock — captains edit freely.

---

## Decisions Made

| Decision | Choice | Rationale |
|---|---|---|
| Auth | PIN → `POST /api/auth/team` → `{ teamId }`; store both in localStorage | PIN doubles as identity and auth; no separate credential |
| localStorage keys | `captain_team_id`, `captain_pin` | Parallel to Manager's `manager_password` |
| Navigation | Two-tab layout: Roster + Assignments | Matches Manager app pattern; maps to workflow order |
| Assignment flow | Leg-centric — list all legs, tap to assign | ~18 legs makes leg-centric easier to spot gaps than member-centric |
| Pace input | `M:SS` or `MM:SS` text input | How runners naturally talk about pace; converted to `targetPaceSecPerMile` on save |
| Lock/unlock | Omitted from MVP | Captain edits freely; no lock workflow needed |
| Race ID source | Derived from `GET /api/teams/:id` → `TeamDetail.raceId` | Captain auth only has teamId; raceId comes from team detail |
| Shared components | Copy Modal + ConfirmDialog from Manager (not a shared package) | No cross-app sharing needed; avoids premature abstraction |

---

## File Structure

```
apps/captain/src/
  api.ts                  — API client singleton; PIN/teamId localStorage helpers
  App.tsx                 — auth gate + tab router; loads team detail on mount
  components/
    LoginScreen.tsx       — PIN entry form
    TabNav.tsx            — Roster / Assignments tab navigation + sign-out
    Modal.tsx             — bottom-sheet modal (copied from Manager)
    ConfirmDialog.tsx     — confirm dialog wrapper (copied from Manager)
  tabs/
    RosterTab.tsx         — members list with add/rename/delete
    AssignmentsTab.tsx    — leg list with assignment modal
```

---

## Auth Flow

1. Captain enters PIN on `LoginScreen`
2. `POST /api/auth/team { pin }` → `{ teamId }` (server tries PIN against all teams)
3. Store `captain_team_id` and `captain_pin` in localStorage
4. All subsequent requests send `X-Team-Pin: <pin>` header
5. On 401 anywhere: clear both localStorage keys, return to `LoginScreen`

---

## API Routes Used

| Method | Path | Auth header | Purpose |
|---|---|---|---|
| POST | `/api/auth/team` | none | Login — get teamId from PIN |
| GET | `/api/teams/:id` | `X-Team-Pin` | Team detail (name, raceId, members, assignments) |
| GET | `/api/races/:id/legs` | `X-Team-Pin` | All legs in race order |
| POST | `/api/teams/:id/members` | `X-Team-Pin` | Add member `{ name }` |
| PUT | `/api/members/:id` | `X-Team-Pin` | Rename member `{ name }` |
| DELETE | `/api/members/:id` | `X-Team-Pin` | Remove member — body must include `{ teamId }` (inline PIN verification) |
| POST | `/api/teams/:id/assignments` | `X-Team-Pin` | Assign `{ legId, teamMemberId, targetPaceSecPerMile }` |
| PUT | `/api/assignments/:id` | `X-Team-Pin` | Update `{ teamMemberId, targetPaceSecPerMile }` |
| DELETE | `/api/assignments/:id` | `X-Team-Pin` | Remove assignment — body must include `{ teamId }` (inline PIN verification) |

---

## `api.ts`

```typescript
import { createApiClient } from '@kt82/shared'

export const TEAM_ID_KEY = 'captain_team_id'
export const PIN_KEY = 'captain_pin'

export function getTeamId(): string | null {
  return localStorage.getItem(TEAM_ID_KEY)
}

export const api = createApiClient('/api', () => {
  const pin = localStorage.getItem(PIN_KEY) ?? ''
  return pin ? { 'X-Team-Pin': pin } : {} as Record<string, string>
})
```

---

## App.tsx

Lifts `teamDetail` state (fetched on mount after login). Passes `teamDetail` down to both tabs — Roster needs `team.id`, AssignmentsTab needs `team.id` and `team.raceId`.

```typescript
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

Note: `RosterTab` owns loading `teamDetail` (since it runs first and needs to fetch it anyway). It calls `onTeamLoad` after fetch so `App` can cache it for `AssignmentsTab`.

---

## LoginScreen

- Single PIN field (`inputMode="numeric"`, `type="password"`)
- Submit → `POST /api/auth/team { pin }` → on success store `captain_team_id` + `captain_pin`, call `onSuccess()`
- On error: "Wrong PIN" message; clear localStorage

---

## RosterTab

Fetches `GET /api/teams/:id` on mount (teamId from localStorage). Calls `onTeamLoad(detail)`.

**Layout:**
- Header row: member count label + "Add Runner" button
- Empty state: "No runners yet" with add prompt
- Member list: one row per member — name, Rename + Delete buttons

**Add modal:** single "Name" text field → `POST /api/teams/:id/members { name }`

**Rename modal:** pre-filled name field → `PUT /api/members/:id { name }`

**Delete confirm:** "Remove [name] from the team?" → `DELETE /api/members/:id` with body `{ teamId }` (required for inline PIN verification)

**Error:** 409 on delete (member has assignments) → show "Remove their leg assignments first"

---

## AssignmentsTab

Props: `{ teamDetail: TeamDetail | null, on401 }`. If `teamDetail` is null (roster tab not yet loaded), fetches team detail itself.

Fetches `GET /api/races/:id/legs` using `teamDetail.raceId`. Shows loading state during fetch.

**Empty state (no legs):** "No legs configured yet. Ask the race manager to set up the course."

**Leg row:**
- Left: `#N · Leg Name · X.X mi`
- Right: `Member Name · 8:30/mi` (assigned) OR amber "Unassigned" badge (not assigned)
- Full row is tappable → opens assignment modal

**Assignment modal:**
- Title: "Leg N — Leg Name"
- Member picker: radio-style button list, one per roster member; pre-selected if already assigned
- Pace input: text, placeholder "8:30", label "Target pace (min/mile)"
- Validation: must match `/^\d{1,2}:\d{2}$/`; minutes ≥ 1; seconds 0–59
- Conversion: `targetPaceSecPerMile = minutes * 60 + seconds`
- Save → `POST /api/teams/:id/assignments` (new) or `PUT /api/assignments/:id` (edit)
- "Remove assignment" link (only shown when editing) → `DELETE /api/assignments/:id` with body `{ teamId }`
- Dismisses modal on success, reloads legs

---

## Pace Helpers

```typescript
// "8:30" → 510
function parsePace(input: string): number | null {
  const m = input.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const mins = parseInt(m[1])
  const secs = parseInt(m[2])
  if (secs > 59 || mins < 1) return null
  return mins * 60 + secs
}

// 510 → "8:30"
function formatPace(secPerMile: number): string {
  const mins = Math.floor(secPerMile / 60)
  const secs = secPerMile % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
```

Both helpers live in `AssignmentsTab.tsx` (only used there).

---

## Error Handling

| Scenario | Behavior |
|---|---|
| 401 on any request | Clear localStorage, return to LoginScreen |
| DELETE member with assignments | 409 → "Remove their leg assignments first" |
| Network / non-401 error | "Failed to save — check your connection" |
| No legs configured | Non-error empty state with explanatory message |
| Invalid pace format | Client-side validation before submit; no server round-trip |

---

## Out of Scope

- Lock / unlock assignments
- Live race status (ETAs, current runner)
- Viewing other teams' data
