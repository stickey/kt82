# Pre-Race Screen Design

**Status:** Approved — ready for implementation  
**Date:** 2026-06-04  
**Feature:** Tracker app pre-race landing page for a team before they start leg 1

---

## Summary

When a team has not yet started the race (no legs in-progress or completed), the tracker shows a polished pre-race landing page instead of the live race view. It celebrates the upcoming start, counts down to the team's assigned gun time, and lays out the full estimated relay timeline — every handoff time, location, and assigned runner.

---

## Architecture

**New file:** `apps/tracker/src/components/PreRaceScreen.tsx`

**Changes to existing files:**
- `App.tsx`: pass `raceDate={race.date}` to `<TeamDetail>`
- `TeamDetail.tsx`: add `raceDate: string` to props interface; compute `assignedStartTime` here (not in PreRaceScreen) so the gate can use it; add early-return gate after timeline loads

**`assignedStartTime` computation (in TeamDetail):**

`assignedStartTime` moves up to `TeamDetail` so both the gate and `PreRaceScreen` share the same value:

```ts
const params = useMemo(() => new URLSearchParams(window.location.search), [])
const startOffsetMs = params.has('startoffset') ? Number(params.get('startoffset')) : null

const assignedStartTime = useMemo(() => {
  if (startOffsetMs !== null) return new Date(Date.now() + startOffsetMs)
  const d = new Date(raceDate)
  d.setHours(7, 0, 0, 0)
  return d
}, [startOffsetMs, raceDate])
```

**Gate condition (in TeamDetail):** Uses `tick` (already in state, increments every second) to re-evaluate each second. Shows pre-race when the team hasn't started OR when a dev override is active and the start time hasn't been reached yet.

```tsx
void tick // already in TeamDetail state — forces re-render every second
const hasStarted = timeline.some(t => t.status === 'in-progress' || t.status === 'completed')
const forcePreRace = params.has('prerace') || startOffsetMs !== null
const startTimeReached = Date.now() >= assignedStartTime.getTime()
const showPreRace = !hasStarted || (forcePreRace && !startTimeReached)

if (showPreRace) return (
  <PreRaceScreen
    teamName={teamName}
    assignedStartTime={assignedStartTime}
    timeline={timeline}
    onBack={onBack}
  />
)
```

**Manual testing:**
- `?prerace` — forces pre-race screen regardless of race state; stays until param is removed
- `?startoffset=30000` — sets start time to 30 seconds from now; pre-race shows with a live countdown, then automatically transitions to the live view once the clock passes zero (assuming `hasStarted` is true from the real DB by then)
- Both params can be combined: `?prerace&startoffset=30000`

**Automatic transition to live view:** Because `PreRaceScreen` is an early-return inside `TeamDetail` (not a separate mounted component), `TeamDetail`'s existing 30-second polling loop (`/teams/${teamId}/timeline`) continues to run while the pre-race screen is displayed. When a leg transitions to `in-progress` or `completed`, the next poll updates `timeline`, `hasStarted` flips to `true`, the gate no longer fires, and the user automatically sees the live race view. With `?startoffset`, the gate also releases when the clock passes `assignedStartTime` (re-evaluated each second via `tick`).

**PreRaceScreen props:**
```ts
interface Props {
  teamName: string
  assignedStartTime: Date   // computed in TeamDetail; stable reference
  timeline: LegTimelineItem[]
  onBack: () => void
}
```

---

## Assigned Start Time

Hardcoded at **7:00 AM on the race date** (only one team uses this feature currently). Computed in `TeamDetail` and passed to `PreRaceScreen` as a stable `Date` prop. The `?startoffset=<ms>` query param overrides this for testing.

Document this in `apps/tracker/README.md` when complete.

---

## ETA Algorithm

Walk `COURSE_LEGS` in order, accumulating from `assignedStartTime` (passed as a prop — already a stable `Date`):

```ts
const schedule = useMemo(() => {
  let ms = assignedStartTime.getTime()
  return COURSE_LEGS.map(courseLeg => {
    const item = timeline.find(t => t.leg.legNumber === courseLeg.legNumber)
    const legStartMs = ms
    if (item?.assignment) {
      ms += item.assignment.targetPaceSecPerMile * courseLeg.miles * 1000
    }
    return { courseLeg, item, legStartMs, legEndMs: ms }
  })
}, [assignedStartTime, timeline])
const finishTime = new Date(schedule[schedule.length - 1].legEndMs)
```

If a leg has no assignment, its duration is treated as 0 (timestamps carry forward unchanged). ETAs after an unassigned leg are meaningless but the UI degrades gracefully — runner shows `—` and time still shows.

Schedule is `useMemo`-ized on `assignedStartTime` (stable reference, never changes mid-session).

---

## UI Regions

### Region 1 — Header

- Safe-area top padding (~52px), bottom border `1px solid var(--line)`
- Eyebrow: `KT82 · KATY TRAIL RELAY` — 10px, weight 700, `letter-spacing: 0.15em`, `var(--accent)`
- Team name: Anton 47px, uppercase, `line-height: 0.86`
- Status line below name: `PRE-RACE · ESTIMATES ONLY` → switches to `RACE IN PROGRESS` when `now >= assignedStartTime`
- "YOUR START" card (top-right): border `1px solid var(--line)`, bg `var(--panel)`, radius 14px, label 8.5px, time mono 22px `var(--accent)`, AM/PM 10px `var(--mut)`

### Region 2 — Countdown / Fanfare

- Background: `var(--panel2)` dark / `#1a160f` light (intentionally dark in both themes)
- Pulsing accent dot (`.pr-pulse` CSS animation) + `RACE STARTS IN` label; dot hidden + label → `RACE IN PROGRESS` when started
- Countdown `HH:MM:SS`: JetBrains Mono 50px, `var(--text)` → `var(--green)` when started, separators `:` in `var(--accent)` at 38px
- Unit labels `HRS MIN SEC` below digits
- Date line: `THU · JUN 4 · GUN AT 7:00 AM` format

### Region 3 — Start → Finish Hero

- Background `var(--accent)`, radius 18px, text `var(--ink)`
- `TEAM START` block (left) + `→` (center) + `EST. FINISH · HERMANN` block (right), both showing mono 32px times
- Bottom row: `{totalMiles} MI · {totalLegs} LEGS · 6 RUNNERS` + `≈ ESTIMATES` chip

Use `COURSE_LEGS.length` for leg count and `COURSE_LEGS.reduce((s,l) => s + l.miles, 0)` for total miles.

### Region 4 — The Route (trail timeline)

Vertical spine with interleaved node rows (handoff points) and leg rows (segments between handoffs).

**Spine constants:** left rail = 30px, time column = 62px.

**Source of truth for locations:** `COURSE_LEGS` (always available, consistent). DB handoff lat/lng not used here.

**Nodes (19 total: start + one per leg end):**
- Start node: `COURSE_LEGS[0].startName`, lat/lng from `COURSE_LEGS[0].startLat/startLng`, hollow 13px dot, accent border
- Mid nodes (legs 1–17 ends): `COURSE_LEGS[i].endName`, hollow 9px dot, `var(--mut)` border
- Finish node: `COURSE_LEGS[17].endName` ("Hermann & Finish!!"), filled 15px accent dot with halo

Node content: time column (62px, right-aligned, mono 13.5px, accent for start/finish, `var(--text)` for mid) + location name (flex-1, 12.5px weight 700) + START/FINISH badge. Whole row is a `<a>` opening maps at the location's lat/lng.

**Leg segments (18 total):**
- `L{n}` chip (mono 8.5px, faint, bordered)
- Runner name (12.5px weight 700, `var(--text)` or `—` if unassigned)
- Distance from `COURSE_LEGS[i].miles`
- Map pin button (24px circle) links to route: `https://www.google.com/maps/dir/{startLat},{startLng}/{endLat},{endLng}`

**Footer:** two centered lines, 10.5px, `var(--faint)`:  
`Handoff times are estimates from each runner's target pace.`  
`Live tracking begins the moment your team starts leg 1.`

---

## Animation

Add to `apps/tracker/src/index.css`:

```css
@keyframes pr-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.35; transform: scale(0.82); }
}
@media (prefers-reduced-motion: no-preference) {
  .pr-pulse { animation: pr-pulse 1.3s ease-in-out infinite; }
}
```

---

## Behavior

- **Countdown**: `setInterval` every 1s updates `nowMs`. `secondsRemaining = Math.max(0, (assignedStartTime - nowMs) / 1000)`.
- **Started state**: when `now >= assignedStartTime`, countdown stays at `00:00:00`, digits turn green, labels switch to `RACE IN PROGRESS`. In practice this screen won't be visible once the team starts (the gate in TeamDetail will switch to the live view), but it degrades gracefully.
- **Map links**: open in new tab (`target="_blank"`). Node links: `https://www.google.com/maps?q={lat},{lng}`. Leg route links: `https://www.google.com/maps/dir/{startLat},{startLng}/{endLat},{endLng}`.
- **Back**: `onBack()` → navigates to team grid, same as TeamDetail.

---

## Out of Scope

- No DB/schema changes (start time is hardcoded at 7 AM on race date)
- No Manager UI for assigning start times
- Light theme is supported via existing CSS vars (no extra work needed)
