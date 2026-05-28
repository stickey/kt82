# Sub-project 5 — Tracker App

**Date:** 2026-05-28
**Scope:** Public read-only race status board. No auth. Shows all teams' live status and ETAs; tapping a team shows the full leg timeline. Auto-detects the active race.

---

## Decisions Made

| Decision | Choice | Rationale |
|---|---|---|
| Auth | None — fully public | Tracker is read-only; spectators shouldn't need a PIN |
| Race discovery | Auto-detect via `GET /api/races/active` | One active race at a time (MVP); spectators just open the URL |
| Team list layout | 2-column card grid | Best balance of density and readability on mobile |
| Team detail layout | Hero (current runner) + full leg timeline below | Current status is most important; full timeline for context |
| Navigation | Hash routing — URL changes to `#team/:id` on team tap | Shareable team links without React Router dependency |
| Share button | `navigator.share()` → falls back to clipboard copy | Native share sheet on mobile; clipboard fallback for desktop |
| Polling interval | 30 seconds | Sufficient freshness; tolerates poor connectivity |
| ETA display | Absolute time ("2:47 PM") + status badge | Absolute time is stable between polls; badge shows pace status |

---

## File Structure

```
apps/tracker/src/
  api.ts                — fetch helpers (no auth headers)
  App.tsx               — hash router, race auto-detect, polling orchestration
  components/
    TeamGrid.tsx        — 2-col card grid of all teams
    TeamDetail.tsx      — hero section + leg timeline for one team
```

---

## New Server Endpoint

Add to `server/src/routes/tracker.ts` (existing public router):

```typescript
router.get('/races/active', async (req, res, next) => {
  try {
    const race = await prisma.race.findFirst({ orderBy: { date: 'desc' } })
    if (!race) return res.status(404).json({ error: 'No active race' })
    res.json(race)
  } catch (err) { next(err) }
})
```

No auth middleware — tracker routes are all public.

---

## API Routes Used

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/races/active` | none | Auto-detect latest race |
| GET | `/api/races/:id/status` | none | All teams' live status (polled every 30s) |
| GET | `/api/teams/:id/timeline` | none | Full leg timeline for one team (polled every 30s) |

---

## App.tsx — Routing & Polling

Hash routing: read `window.location.hash` on mount and on `hashchange` events.

- Hash empty or `#` → show team grid, poll race status
- Hash `#team/:id` → show team detail, poll team timeline

State:
```typescript
type View = { type: 'grid' } | { type: 'team'; teamId: string }
```

On mount:
1. Fetch `GET /api/races/active` → store `race`
2. Parse hash → set initial view
3. Start 30s poll for whichever view is active

On hash change: switch view and restart poll (clear old interval, start new one).

Cleanup: clear interval on unmount.

---

## `api.ts`

```typescript
import { createApiClient } from '@kt82/shared'

export const api = createApiClient('/api', () => ({}))
```

No PIN, no auth headers. The shared `createApiClient` factory is used as-is.

Response types:

```typescript
// GET /api/races/active → Race (from @kt82/shared)

// GET /api/races/:id/status — define locally in api.ts:
// TeamMember and Handoff imported from @kt82/shared
type TeamStatus = {
  team: { id: string; name: string }
  status: 'not-started' | 'in-progress'
  currentLeg?: { id: string; legNumber: number; name: string; distanceMiles: number }
  currentRunner?: TeamMember | null
  nextHandoff?: Handoff | null
  eta?: { eta: string; secondsRemaining: number; status: 'on-pace' | 'ahead' | 'overdue' } | null
}

// GET /api/teams/:id/timeline → LegTimelineItem[] (from @kt82/shared)
```

Note: `eta.eta` is serialized as an ISO string over the wire (not a `Date` object).

---

## TeamGrid

Props: `{ statuses: TeamStatus[], raceId: string, onTeamClick: (teamId: string) => void }`

Layout: `grid grid-cols-2 gap-3`

**Each card:**
- Team name — bold
- If `in-progress`: leg number + leg name, runner name, ETA time formatted as `h:mm a` (e.g. "2:47 PM"), status badge
- If `not-started`: muted "Not started" text, no ETA
- Status badge colors: `on-pace` / `ahead` → green; `overdue` → amber
- Full card is tappable → `onTeamClick(team.id)`
- Min touch target: card is naturally ≥ 44px tall given content

**Race header above grid:**
- Race name + date (formatted)
- "Updated X seconds ago" — ticks up every second, resets on each successful poll
- On network error: "Unable to refresh — check connection" (replaces counter, does not clear stale data)

**Empty state** (no teams in race): "No teams yet."
**No race found** (404 from `/races/active`): full-screen "No active race."

---

## TeamDetail

Props: `{ teamId: string, onBack: () => void }`

Fetches and polls `GET /api/teams/:id/timeline` on mount.

**Header:**
- "← All Teams" back button — calls `onBack()` (sets hash to `''`)
- Team name centered
- "Share" button right — calls `navigator.share({ title, url: window.location.href })` if available, else `navigator.clipboard.writeText(window.location.href)`

**Hero section** (only if any leg has `status: 'in-progress'`):
```
Now on course
[Runner Name] · Leg [N] · [Name] · [X.X] mi
ETA [2:47 PM]   [on pace badge]
```
Green border/background. If `status === 'overdue'`: amber.

**All Legs timeline** (always shown):
- Only legs that have an assignment are shown (omit unassigned legs)
- Ordered by `leg.legNumber` asc
- **Completed** row: dimmed, "Leg N · Runner Name", finish time formatted as `h:mm a`, checkmark icon
- **In-progress** row: green highlight, "Leg N · Runner Name", ETA time, status badge
- **Not-started** row: muted, "Leg N · Runner Name", "—" for time

**"Updated X seconds ago"** same as TeamGrid.

---

## ETA Formatting

```typescript
function formatTime(isoString: string): string {
  const d = new Date(isoString)
  const h = d.getHours() % 12 || 12
  const m = d.getMinutes().toString().padStart(2, '0')
  const ampm = d.getHours() < 12 ? 'AM' : 'PM'
  return `${h}:${m} ${ampm}`
}
```

Used in both TeamGrid (card ETA) and TeamDetail (hero + timeline rows).

---

## Error Handling

| Scenario | Behavior |
|---|---|
| No active race (404) | Full-screen "No active race" message |
| Poll network error | Show "Unable to refresh — check connection"; keep stale data visible |
| Team not found (404 on timeline) | "Team not found" message in detail view |
| Team has no assignments | Timeline shows empty state: "No assignments yet." |

---

## Out of Scope

- GPS or map rendering
- Push notifications
- Race selection UI (auto-detect only)
- Historical race archives
- Spectator accounts / bookmarks (URL hash serves this purpose)
