# Sub-project 4 — Driver App

**Date:** 2026-05-28
**Scope:** PIN-authenticated race-day timing app used by the driver in a moving vehicle. Handles START / LAP / STOP timing with long-press safety, live ETA display, and navigation deep-links to handoff points.

---

## Decisions Made

| Decision | Choice | Rationale |
|---|---|---|
| Auth | Team selection + PIN (same PIN as Captain) | Driver knows their team; PIN prevents unauthorized timing |
| Layout | LAP prominent, STOP as "End race early" small link | Minimises accidental race termination |
| Long press | All timing buttons require long press | Prevents accidental taps in moving vehicle |
| START hold duration | ~500ms | Short but intentional — race start is time-sensitive |
| LAP / STOP hold duration | ~1500ms | Longer — harder to trigger accidentally |
| Fill animation | Yes — fills from bottom during hold | Visual feedback confirming the press is registering |
| ETA display | Elapsed clock (ticking) + ETA time (stable) | Elapsed gives sense of how long runner has been out; ETA anchors expectation |
| Navigation | `maps.apple.com` deep link with lat/lng; address fallback | Native Maps app on iOS; works cross-platform via browser redirect |
| Race complete | Summary screen: total time + all leg splits | Satisfying end state; splits useful for post-race review |
| Server changes | None needed | All required routes already implemented |

---

## File Structure

```
apps/driver/src/
  api.ts                    — fetch helpers, auth headers, response types
  App.tsx                   — state machine, view transitions
  components/
    LongPressButton.tsx     — reusable hold-to-activate button with fill animation
    AuthScreen.tsx          — team selection + PIN entry
    StartScreen.tsx         — pre-race: first leg info + START button
    TimingScreen.tsx        — in-progress: elapsed + ETA + LAP + nav link
    CompleteScreen.tsx      — post-race: total time + leg splits
```

---

## State Machine (`App.tsx`)

```typescript
type View =
  | { type: 'auth' }
  | { type: 'start';   race: Race; team: { id: string; name: string }; pin: string; leg: Leg }
  | { type: 'racing';  race: Race; team: { id: string; name: string }; pin: string; resultId: string; leg: Leg; startedAt: string; nextHandoff: Handoff | null }
  | { type: 'complete'; race: Race; team: { id: string; name: string }; pin: string }
```

**Transitions:**

| From | Action | To |
|---|---|---|
| `auth` | PIN verified, status `not-started` | `start` |
| `auth` | PIN verified, status `in-progress` | `racing` |
| `start` | START long-press completes | `racing` |
| `racing` | LAP, next leg exists | `racing` (new leg) |
| `racing` | LAP, no next leg | `complete` |
| `racing` | STOP | `complete` |

On mount, App fetches `GET /api/races/active`. If no active race, shows "No active race" message.

---

## API Routes Used

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/races/active` | none | Detect active race on mount |
| GET | `/api/races/:id/status` | none | Fetch team list for team selection |
| GET | `/api/teams/:id/current` | `X-Team-Pin` | Verify PIN + get current state |
| POST | `/api/teams/:id/results` | `X-Team-Pin` | START — `{legId, startedAt}` |
| PATCH | `/api/results/:id` | body `{teamId, pin}` | LAP/STOP — `{finishedAt, action, teamId, pin}` |
| GET | `/api/teams/:id/timeline` | `X-Team-Pin` | Complete screen leg splits |

All timestamps are client-provided (`new Date().toISOString()` at moment of button release).

---

## `api.ts`

```typescript
import { createApiClient } from '@kt82/shared'
import type { Race, Leg, Handoff, LegTimelineItem } from '@kt82/shared'

export function createDriverApi(pin: string) {
  return createApiClient('/api', () => ({
    'X-Team-Pin': pin,
  }))
}

export type CurrentState = {
  status: 'not-started' | 'in-progress'
  result: { id: string; startedAt: string } | null
  currentLeg: Leg | null
  nextHandoff: Handoff | null
  currentRunner: { id: string; name: string } | null
  assignment: { targetPaceMinPerMile: number } | null
  eta: { eta: string; secondsRemaining: number; status: 'on-pace' | 'ahead' | 'overdue' } | null
}

export type TeamSummary = { id: string; name: string }

export type { Race, Leg, Handoff, LegTimelineItem }
```

---

## `LongPressButton.tsx`

```typescript
type Props = {
  label: string
  holdMs: number
  onComplete: () => void
  colorClass: string   // e.g. 'bg-blue-500'
  disabled?: boolean
  className?: string
}
```

Implementation:
- Internal `useRef` timer via `requestAnimationFrame`
- `progress` state (0–1) drives fill overlay: `scaleY(progress)` from `transform-origin: bottom`
- Binds `onPointerDown` (start), `onPointerUp` + `onPointerLeave` (cancel)
- Calls `onComplete()` when progress reaches 1
- `disabled` prop prevents all interaction, dims the button
- Min height 64px (larger than standard 44px — used in a moving vehicle)

---

## AuthScreen

1. On mount: fetch `GET /api/races/active`. If 404 → show "No active race."
2. Fetch `GET /api/races/:id/status` → populate team dropdown.
3. User selects team, enters PIN.
4. On submit: `GET /api/teams/:id/current` with `X-Team-Pin` header.
   - 401 → "Incorrect PIN"
   - Success, `status: 'not-started'` → transition to `start` with `currentLeg`
   - Success, `status: 'in-progress'` → transition to `racing` with `result`, `currentLeg`, `nextHandoff`

---

## StartScreen

```
┌─────────────────────────────┐
│ [Team Name]                 │
│                             │
│ FIRST LEG                   │
│ Leg 1 · [Name] · X.X mi    │
│ [Start → End]               │
│                             │
│ [     START     ]           │
│  (hold to start race)       │
└─────────────────────────────┘
```

- Shows first leg details from `leg` in view state
- START is `LongPressButton` with `holdMs={500}`
- On complete: `POST /teams/:id/results {legId: leg.id, startedAt: new Date().toISOString()}`
  - Response contains `{id, legId, startedAt}` — extract `resultId`
  - Fetch `GET /teams/:id/current` to get `nextHandoff`
  - Transition to `racing`

---

## TimingScreen

```
┌─────────────────────────────┐
│ NOW ON COURSE               │
│ [Runner Name]               │
│ Leg N · [Name] · X.X mi    │
│                             │
│ ┌──────────┬──────────────┐ │
│ │ ELAPSED  │     ETA      │ │
│ │  23:14   │   2:47 PM    │ │
│ └──────────┴──────────────┘ │
│  [on pace / ahead / overdue]│
│                             │
│ [Navigate to [Handoff] ↗]  │
│                             │
│ [         LAP         ]    │
│                             │
│     ··· End race early      │
└─────────────────────────────┘
```

**Elapsed clock:** Ticks locally every second. `elapsed = Date.now() - new Date(startedAt).getTime()`. Formatted as `m:ss` (or `h:mm:ss` if ≥ 1 hour).

**ETA:** Polled from `GET /teams/:id/current` every 30s. Displayed as `h:mm AM/PM`. Pace badge: green for `on-pace`/`ahead`, amber for `overdue`.

**Navigation link:** Only shown if `nextHandoff` exists.
```typescript
function buildNavUrl(handoff: Handoff): string {
  if (handoff.lat != null && handoff.lng != null)
    return `https://maps.apple.com/?daddr=${handoff.lat},${handoff.lng}`
  if (handoff.address)
    return `https://maps.apple.com/?daddr=${encodeURIComponent(handoff.address)}`
  return ''
}
```
Opens in new tab (`target="_blank"`).

**LAP:** `LongPressButton` `holdMs={1500}`.
On complete: `PATCH /results/:id {finishedAt: new Date().toISOString(), action: 'lap', teamId, pin}`
- Response `{current, next}`:
  - `next !== null` → fetch updated `/teams/:id/current` for new `nextHandoff` → stay in `racing` with new `leg`, new `resultId` (from `next.id`), new `startedAt` (from `next.startedAt` — server sets this from the LAP `finishedAt`)
  - `next === null` → transition to `complete`

**STOP ("End race early"):** Small text link rendered as a `LongPressButton` with `holdMs={1500}`, muted styling.
On complete: `PATCH /results/:id {finishedAt, action: 'stop', teamId, pin}` → transition to `complete`.

**Poll cleanup:** Clear interval on unmount and on transition away from this screen.

---

## CompleteScreen

```
┌─────────────────────────────┐
│ Race Complete!              │
│                             │
│ Total time: 9h 42m 14s      │
│                             │
│ Leg 1  Alex M.    32:14     │
│ Leg 2  Jordan T.  28:47     │
│ Leg 3  Sarah K.   41:02     │
│ ...                         │
└─────────────────────────────┘
```

Fetch `GET /teams/:id/timeline` on mount.
- Total time: `last.finishedAt - first.startedAt` across all completed legs
- Each row: leg number, runner name, duration (`finishedAt - startedAt`)
- Duration format: `m:ss` (or `h:mm:ss` if ≥ 1 hour)
- Legs with no `finishedAt` (stopped mid-leg) shown with "—" for time

---

## Error Handling

| Scenario | Behavior |
|---|---|
| No active race | Full-screen "No active race" on AuthScreen |
| Wrong PIN | Inline "Incorrect PIN" error, stay on AuthScreen |
| Network error during START/LAP/STOP | Toast-style error, button re-enabled — do not transition |
| Poll network error | Keep stale ETA visible; no error shown (transient) |
| LAP response missing `next` | Treat as `next === null` → complete |

---

## Out of Scope

- Multiple simultaneous drivers per team
- Offline queue / retry for START/LAP/STOP (poor connectivity shown as error)
- GPS tracking
- Push notifications
- Historical race data
