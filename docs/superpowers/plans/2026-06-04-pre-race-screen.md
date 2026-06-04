# Pre-Race Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a polished pre-race landing page to the tracker app that shows a countdown, estimated relay timeline, and auto-transitions to the live race view once the team starts.

**Architecture:** `PreRaceScreen` is a new standalone component rendered as an early-return inside `TeamDetail`. `TeamDetail` computes `assignedStartTime` (7 AM on race date, or `?startoffset` ms from now for testing) and gates on `showPreRace = !hasStarted || (forcePreRace && !startTimeReached)`. Because TeamDetail stays mounted, its existing 30s poll keeps running — the gate flips automatically when a leg goes in-progress.

**Tech Stack:** React 18, TypeScript, Tailwind (CSS vars only), `@kt82/shared` COURSE_LEGS

---

## File Map

| Action | File | Purpose |
|---|---|---|
| Create | `apps/tracker/src/components/PreRaceScreen.tsx` | All pre-race UI: Header, Countdown, Hero, Trail timeline |
| Modify | `apps/tracker/src/App.tsx` | Pass `raceDate={race.date}` to `<TeamDetail>` |
| Modify | `apps/tracker/src/components/TeamDetail.tsx` | Add `raceDate` prop, compute `assignedStartTime`, add gate |
| Modify | `apps/tracker/src/index.css` | Add `pr-pulse` keyframes + `.pr-cd-band` class |
| Modify | `apps/tracker/README.md` | Document pre-race screen + test params |

---

### Task 1: Stub PreRaceScreen + wire gate in TeamDetail

**Files:**
- Create: `apps/tracker/src/components/PreRaceScreen.tsx`
- Modify: `apps/tracker/src/App.tsx`
- Modify: `apps/tracker/src/components/TeamDetail.tsx`

- [ ] **Step 1: Create stub PreRaceScreen**

Create `apps/tracker/src/components/PreRaceScreen.tsx`:

```tsx
import type { LegTimelineItem } from '../api'

interface Props {
  teamName: string
  assignedStartTime: Date
  timeline: LegTimelineItem[]
  onBack: () => void
}

export function PreRaceScreen({ teamName, onBack }: Props) {
  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100dvh', padding: '52px 18px 18px' }}>
      <button
        onClick={onBack}
        style={{
          fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 12, fontWeight: 800,
          letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mut)',
          background: 'none', border: 'none', cursor: 'pointer', minHeight: 44,
          display: 'flex', alignItems: 'center', marginBottom: 16,
        }}
      >
        ← All Teams
      </button>
      <p style={{ color: 'var(--mut)' }}>{teamName} — Pre-Race (building…)</p>
    </div>
  )
}
```

- [ ] **Step 2: Pass `raceDate` to TeamDetail in App.tsx**

In `apps/tracker/src/App.tsx`, find the line:
```tsx
? <TeamDetail teamId={teamId} teamName={teamName} onBack={navigateBack} />
```
Replace with:
```tsx
? <TeamDetail teamId={teamId} teamName={teamName} raceDate={race.date} onBack={navigateBack} />
```

- [ ] **Step 3: Add `raceDate` prop + `assignedStartTime` + gate to TeamDetail**

In `apps/tracker/src/components/TeamDetail.tsx`:

**a)** Add `useMemo` to the React import (line 1):
```tsx
import { useState, useEffect, useRef, useMemo } from 'react'
```

**b)** Add `raceDate: string` to the `Props` interface (around line 9):
```tsx
interface Props {
  teamId: string
  teamName: string
  raceDate: string
  onBack: () => void
}
```

**c)** Add `raceDate` to the function signature (around line 39):
```tsx
export function TeamDetail({ teamId, teamName, raceDate, onBack }: Props) {
```

**d)** Add the URL param + `assignedStartTime` computation after the existing state declarations (after the `showLegMap` state, before the `useEffect` poll). Insert after line ~49:
```tsx
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const startOffsetMs = params.has('startoffset') ? Number(params.get('startoffset')) : null

  const assignedStartTime = useMemo(() => {
    if (startOffsetMs !== null) return new Date(Date.now() + startOffsetMs)
    const d = new Date(raceDate)
    d.setHours(7, 0, 0, 0)
    return d
  }, [startOffsetMs, raceDate])
```

**e)** Add the gate condition after the existing `void tick` line (around line 117). Insert after `void tick`:
```tsx
  const hasStarted = timeline.some(t => t.status === 'in-progress' || t.status === 'completed')
  const forcePreRace = params.has('prerace') || startOffsetMs !== null
  const startTimeReached = Date.now() >= assignedStartTime.getTime()
  const showPreRace = !hasStarted || (forcePreRace && !startTimeReached)
```

**f)** Add the early-return for PreRaceScreen. Add the import at the top of the file with the other component imports:
```tsx
import { PreRaceScreen } from './PreRaceScreen'
```

Then add the early return after the `void tick` block and new gate computation, before the `if (showCourse)` check (around line 160):
```tsx
  if (showPreRace) return (
    <PreRaceScreen
      teamName={teamName}
      assignedStartTime={assignedStartTime}
      timeline={timeline}
      onBack={onBack}
    />
  )
```

- [ ] **Step 4: Start the dev stack and verify the gate works**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" ./scripts/dev.sh
```

Navigate to a team URL and append `?prerace`:
```
http://localhost:5173/#team/<any-team-id>?prerace
```

Expected: the stub pre-race screen appears showing "— Pre-Race (building…)" instead of the live race view.

Also test `?startoffset=5000` — pre-race should show for ~5 seconds then flip to the live view.

- [ ] **Step 5: Commit**

```bash
git add apps/tracker/src/components/PreRaceScreen.tsx \
        apps/tracker/src/App.tsx \
        apps/tracker/src/components/TeamDetail.tsx
git commit -m "feat(tracker): wire pre-race gate in TeamDetail with stub PreRaceScreen"
```

---

### Task 2: CSS animation + Header + Countdown regions

**Files:**
- Modify: `apps/tracker/src/index.css`
- Modify: `apps/tracker/src/components/PreRaceScreen.tsx`

- [ ] **Step 1: Add CSS to index.css**

In `apps/tracker/src/index.css`, append after the existing `@keyframes glow-red` block:

```css
/* Pre-race countdown band — always dark regardless of theme */
.pr-cd-band {
  background: var(--panel2);
}
@media (prefers-color-scheme: light) {
  .pr-cd-band {
    background: #1a160f;
  }
}

/* Pulsing dot for the countdown label */
@keyframes pr-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.35; transform: scale(0.82); }
}
@media (prefers-reduced-motion: no-preference) {
  .pr-pulse { animation: pr-pulse 1.3s ease-in-out infinite; }
}
```

- [ ] **Step 2: Replace stub PreRaceScreen with Header + Countdown**

Replace the full contents of `apps/tracker/src/components/PreRaceScreen.tsx` with:

```tsx
import { useState, useEffect, useMemo, Fragment } from 'react'
import type { LegTimelineItem } from '../api'
import { COURSE_LEGS } from '@kt82/shared'

interface Props {
  teamName: string
  assignedStartTime: Date
  timeline: LegTimelineItem[]
  onBack: () => void
}

function prClock(d: Date) {
  const h = d.getHours() % 12 || 12
  const m = d.getMinutes().toString().padStart(2, '0')
  const ap = d.getHours() < 12 ? 'AM' : 'PM'
  return { full: `${h}:${m}`, ap }
}

function prCd(sec: number) {
  sec = Math.max(0, Math.round(sec))
  return {
    h: String(Math.floor(sec / 3600)).padStart(2, '0'),
    m: String(Math.floor((sec % 3600) / 60)).padStart(2, '0'),
    s: String(sec % 60).padStart(2, '0'),
  }
}

function prDate(d: Date) {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const mons = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  return `${days[d.getDay()]} · ${mons[d.getMonth()]} ${d.getDate()}`
}

function mapsPoint(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`
}

function mapsRoute(sLat: number, sLng: number, eLat: number, eLng: number) {
  return `https://www.google.com/maps/dir/${sLat},${sLng}/${eLat},${eLng}`
}

const TOTAL_MILES = COURSE_LEGS.reduce((s, l) => s + l.miles, 0).toFixed(1)

export function PreRaceScreen({ teamName, assignedStartTime, timeline, onBack }: Props) {
  const [nowMs, setNowMs] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // ETA schedule — placeholder until Task 3 fills in the Hero + Trail
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
  const started = nowMs >= assignedStartTime.getTime()
  const cd = prCd((assignedStartTime.getTime() - nowMs) / 1000)
  const sc = prClock(assignedStartTime)
  const fc = prClock(finishTime)
  void fc // used in Task 3

  return (
    <div style={{
      height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Hanken Grotesk', sans-serif",
    }}>

      {/* HEADER */}
      <div style={{ flexShrink: 0, padding: '52px 18px 14px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: '0.15em', color: 'var(--accent)', marginBottom: 8 }}>
          KT82 · KATY TRAIL RELAY
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div
              className="font-display"
              style={{ fontSize: 47, lineHeight: 0.86, textTransform: 'uppercase' }}
            >
              {teamName}
            </div>
            <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--mut)', marginTop: 7, letterSpacing: '0.04em' }}>
              {started ? 'RACE IN PROGRESS' : 'PRE-RACE · ESTIMATES ONLY'}
            </div>
          </div>
          <div style={{
            flexShrink: 0, borderRadius: 14, padding: '9px 13px 11px', textAlign: 'center',
            border: '1px solid var(--line)', background: 'var(--panel)', minWidth: 72,
          }}>
            <div style={{ fontWeight: 800, fontSize: 8.5, letterSpacing: '0.12em', color: 'var(--mut)' }}>YOUR START</div>
            <div className="font-mono" style={{ fontWeight: 700, fontSize: 22, color: 'var(--accent)', lineHeight: 1, marginTop: 5 }}>
              {sc.full}
            </div>
            <div className="font-mono" style={{ fontSize: 10, color: 'var(--mut)', marginTop: 2 }}>{sc.ap}</div>
          </div>
        </div>
      </div>

      {/* COUNTDOWN / FANFARE */}
      <div className="pr-cd-band" style={{
        flexShrink: 0, padding: '15px 18px 14px', textAlign: 'center',
        borderBottom: '1px solid var(--line)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 9 }}>
          {!started && (
            <span
              className="pr-pulse"
              style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }}
            />
          )}
          <span style={{ fontWeight: 800, fontSize: 9.5, letterSpacing: '0.2em', color: 'var(--accent)' }}>
            {started ? 'RACE IN PROGRESS' : 'RACE STARTS IN'}
          </span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
          fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, lineHeight: 1,
        }}>
          {[cd.h, cd.m, cd.s].map((v, i) => (
            <Fragment key={i}>
              <span style={{ fontSize: 50, color: started ? 'var(--green)' : '#fbf6ee', letterSpacing: '0.02em' }}>
                {v}
              </span>
              {i < 2 && (
                <span style={{ fontSize: 38, color: 'var(--accent)', opacity: 0.7, padding: '0 2px', marginTop: -4 }}>
                  :
                </span>
              )}
            </Fragment>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 38, marginTop: 5 }}>
          {['HRS', 'MIN', 'SEC'].map(l => (
            <span key={l} style={{ fontWeight: 700, fontSize: 8.5, letterSpacing: '0.15em', color: 'var(--faint)' }}>
              {l}
            </span>
          ))}
        </div>
        <div style={{ fontWeight: 700, fontSize: 10.5, letterSpacing: '0.08em', color: 'var(--mut)', marginTop: 11 }}>
          {prDate(assignedStartTime)} · GUN AT {sc.full} {sc.ap}
        </div>
      </div>

      {/* Hero + Route placeholders — filled in Tasks 3 and 4 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px', color: 'var(--faint)', fontSize: 12 }}>
        (hero + route coming soon)
      </div>

    </div>
  )
}
```

- [ ] **Step 3: Verify Header and Countdown in browser**

With the dev stack running, open:
```
http://localhost:5173/#team/<team-id>?prerace&startoffset=30000
```

Expected:
- Header shows team name in large Anton font, "YOUR START" card top-right with the time ~30s from now
- Countdown band is dark (even in light mode), shows `00:00:XX` counting down
- Pulsing orange dot visible to the left of "RACE STARTS IN"
- After ~30 seconds: digits turn green, label becomes "RACE IN PROGRESS", dot disappears

- [ ] **Step 4: Commit**

```bash
git add apps/tracker/src/index.css apps/tracker/src/components/PreRaceScreen.tsx
git commit -m "feat(tracker): add pre-race Header and Countdown regions"
```

---

### Task 3: ETA algorithm + Hero region

**Files:**
- Modify: `apps/tracker/src/components/PreRaceScreen.tsx`

The ETA schedule and `finishTime` are already computed in the stub from Task 2. This task adds the Hero region and removes the placeholder.

- [ ] **Step 1: Replace the placeholder div with the Hero region**

In `PreRaceScreen.tsx`, find:
```tsx
      {/* Hero + Route placeholders — filled in Tasks 3 and 4 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px', color: 'var(--faint)', fontSize: 12 }}>
        (hero + route coming soon)
      </div>
```

Replace with:
```tsx
      {/* HERO: start → finish */}
      <div style={{
        flexShrink: 0, margin: '14px 16px 0', background: 'var(--accent)',
        borderRadius: 18, padding: '15px 18px 13px', color: 'var(--ink)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 8.5, letterSpacing: '0.14em', opacity: 0.75 }}>TEAM START</div>
            <div className="font-mono" style={{ fontWeight: 700, fontSize: 32, lineHeight: 0.9, marginTop: 4 }}>
              {sc.full}<span style={{ fontSize: 15, opacity: 0.9, marginLeft: 3 }}>{sc.ap}</span>
            </div>
          </div>
          <div className="font-display" style={{ opacity: 0.45, fontSize: 20, marginBottom: 4 }}>→</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: 8.5, letterSpacing: '0.14em', opacity: 0.75 }}>EST. FINISH · HERMANN</div>
            <div className="font-mono" style={{ fontWeight: 700, fontSize: 32, lineHeight: 0.9, marginTop: 4 }}>
              {fc.full}<span style={{ fontSize: 15, opacity: 0.9, marginLeft: 3 }}>{fc.ap}</span>
            </div>
          </div>
        </div>
        <div style={{
          marginTop: 10, paddingTop: 9, borderTop: '1px solid rgba(255,255,255,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontWeight: 700, fontSize: 10.5, opacity: 0.8, letterSpacing: '0.04em' }}>
            {TOTAL_MILES} MI · {COURSE_LEGS.length} LEGS · 6 RUNNERS
          </span>
          <span style={{
            fontWeight: 800, fontSize: 8.5, letterSpacing: '0.08em',
            background: 'rgba(0,0,0,0.2)', padding: '3px 8px', borderRadius: 20,
          }}>≈ ESTIMATES</span>
        </div>
      </div>

      {/* Route placeholder — filled in Task 4 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px', color: 'var(--faint)', fontSize: 12 }}>
        (route coming soon)
      </div>
```

Also remove the `void fc` line since `fc` is now used:
```tsx
  // remove this line:
  void fc // used in Task 3
```

- [ ] **Step 2: Verify Hero in browser**

Open `http://localhost:5173/#team/<team-id>?prerace`

Expected:
- Orange rounded card below the countdown band
- Left side: `TEAM START` label + `7:00 AM` in large mono
- Right side: `EST. FINISH · HERMANN` + estimated finish time (hours after 7 AM, based on assignment paces)
- Bottom row: total miles + leg count + `≈ ESTIMATES` chip
- If no assignments exist, finish time equals 7:00 AM (no duration added — acceptable graceful degradation)

- [ ] **Step 3: Commit**

```bash
git add apps/tracker/src/components/PreRaceScreen.tsx
git commit -m "feat(tracker): add pre-race Hero region with ETA algorithm"
```

---

### Task 4: Trail timeline (The Route)

**Files:**
- Modify: `apps/tracker/src/components/PreRaceScreen.tsx`

- [ ] **Step 1: Add MapPin, TrailNode, and TrailLeg sub-components**

In `PreRaceScreen.tsx`, add these three components between the helper functions and the main `PreRaceScreen` export:

```tsx
function MapPin() {
  return (
    <svg width="8.5" height="11" viewBox="0 0 20 25" fill="none">
      <path d="M10 1C5.59 1 2 4.59 2 9c0 5.57 8 15 8 15s8-9.43 8-15c0-4.41-3.59-8-8-8z" fill="currentColor" />
      <circle cx="10" cy="9" r="2.8" fill="var(--panel2)" />
    </svg>
  )
}

interface TrailNodeProps {
  time: Date
  place: string
  kind: 'start' | 'mid' | 'finish'
  mapUrl: string
}

function TrailNode({ time, place, kind, mapUrl }: TrailNodeProps) {
  const c = prClock(time)
  const isStart = kind === 'start'
  const isFinish = kind === 'finish'
  const dotSize = isFinish ? 15 : isStart ? 13 : 9

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 30 }}>
      {/* rail */}
      <div style={{ width: 30, flexShrink: 0, position: 'relative' }}>
        <div style={{
          position: 'absolute', left: '50%', marginLeft: -1,
          top: isStart ? '50%' : 0, bottom: isFinish ? '50%' : 0,
          width: 2, background: 'var(--line)',
        }} />
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%,-50%)',
          width: dotSize, height: dotSize, borderRadius: '50%',
          background: isFinish ? 'var(--accent)' : 'var(--bg)',
          border: isFinish ? 'none' : `2.5px solid ${isStart ? 'var(--accent)' : 'var(--mut)'}`,
          boxShadow: isFinish ? '0 0 0 4px rgba(255,90,31,0.13)' : 'none',
        }} />
      </div>
      {/* content */}
      <a
        href={mapUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        style={{
          flex: 1, minWidth: 0, display: 'flex', alignItems: 'center',
          gap: 8, padding: '5px 0', textDecoration: 'none',
        }}
      >
        <div style={{ width: 62, flexShrink: 0, textAlign: 'right', whiteSpace: 'nowrap' }}>
          <span
            className="font-mono"
            style={{ fontWeight: 700, fontSize: 13.5, color: (isStart || isFinish) ? 'var(--accent)' : 'var(--text)' }}
          >
            {c.full}
          </span>
          <span className="font-mono" style={{ fontSize: 8, color: 'var(--faint)', marginLeft: 2 }}>{c.ap}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            flex: 1, minWidth: 0, fontWeight: 700, fontSize: 12.5,
            color: isFinish ? 'var(--accent)' : 'var(--text)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {place}
            {isStart && (
              <span style={{ fontWeight: 700, fontSize: 8.5, letterSpacing: '0.1em', color: 'var(--faint)', marginLeft: 7 }}>
                START
              </span>
            )}
            {isFinish && (
              <span style={{
                fontWeight: 800, fontSize: 8, letterSpacing: '0.1em',
                background: 'var(--accent)', color: 'var(--ink)',
                padding: '2px 6px', borderRadius: 20, marginLeft: 7,
              }}>
                FINISH
              </span>
            )}
          </span>
        </div>
      </a>
    </div>
  )
}

interface TrailLegProps {
  legN: number
  runnerName: string | null
  miles: number
  mapUrl: string
}

function TrailLeg({ legN, runnerName, miles, mapUrl }: TrailLegProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch' }}>
      {/* rail (line passes straight through) */}
      <div style={{ width: 30, flexShrink: 0, position: 'relative' }}>
        <div style={{
          position: 'absolute', left: '50%', marginLeft: -1,
          top: 0, bottom: 0, width: 2, background: 'var(--line)',
        }} />
      </div>
      {/* content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
        <span
          className="font-mono"
          style={{
            flexShrink: 0, fontWeight: 700, fontSize: 8.5, letterSpacing: '0.04em',
            color: 'var(--faint)', border: '1px solid var(--line)', borderRadius: 5, padding: '2px 5px',
          }}
        >
          L{legN}
        </span>
        <span style={{
          flex: 1, minWidth: 0, fontWeight: 700, fontSize: 12.5, color: 'var(--text)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {runnerName ?? '—'}
        </span>
        <span className="font-mono" style={{ flexShrink: 0, fontWeight: 500, fontSize: 10.5, color: 'var(--faint)' }}>
          {miles} mi
        </span>
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          title="Open leg route in maps"
          style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, borderRadius: '50%',
            border: '1px solid var(--line)', background: 'var(--panel2)',
            textDecoration: 'none', color: 'var(--mut)',
          }}
        >
          <MapPin />
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Replace the route placeholder with the full trail**

Find:
```tsx
      {/* Route placeholder — filled in Task 4 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px', color: 'var(--faint)', fontSize: 12 }}>
        (route coming soon)
      </div>
```

Replace with:
```tsx
      {/* THE ROUTE */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24, marginTop: 14 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 18px 10px',
        }}>
          <span style={{ fontWeight: 800, fontSize: 9.5, letterSpacing: '0.14em', color: 'var(--mut)' }}>
            THE ROUTE
          </span>
          <span style={{ fontWeight: 700, fontSize: 9.5, letterSpacing: '0.06em', color: 'var(--faint)' }}>
            EST. HANDOFF TIMES
          </span>
        </div>

        <div style={{ padding: '0 18px' }}>
          {/* Start node */}
          <TrailNode
            time={assignedStartTime}
            place={COURSE_LEGS[0].startName}
            kind="start"
            mapUrl={mapsPoint(COURSE_LEGS[0].startLat, COURSE_LEGS[0].startLng)}
          />

          {/* Interleaved legs + nodes */}
          {schedule.map((s, i) => {
            const isLast = i === schedule.length - 1
            return (
              <Fragment key={s.courseLeg.legNumber}>
                <TrailLeg
                  legN={s.courseLeg.legNumber}
                  runnerName={s.item?.runner?.name ?? null}
                  miles={s.courseLeg.miles}
                  mapUrl={mapsRoute(
                    s.courseLeg.startLat, s.courseLeg.startLng,
                    s.courseLeg.endLat, s.courseLeg.endLng,
                  )}
                />
                <TrailNode
                  time={new Date(s.legEndMs)}
                  place={s.courseLeg.endName}
                  kind={isLast ? 'finish' : 'mid'}
                  mapUrl={mapsPoint(s.courseLeg.endLat, s.courseLeg.endLng)}
                />
              </Fragment>
            )
          })}
        </div>

        <div style={{
          padding: '12px 18px 0', textAlign: 'center',
          fontWeight: 600, fontSize: 10.5, color: 'var(--faint)', lineHeight: 1.5,
        }}>
          Handoff times are estimates from each runner's target pace.<br />
          Live tracking begins the moment your team starts leg 1.
        </div>
      </div>
```

- [ ] **Step 3: Verify the full pre-race screen in browser**

Open `http://localhost:5173/#team/<team-id>?prerace`

Check the following:
- Trail spine is a continuous vertical line with dots at each handoff
- Start node: hollow accent-bordered dot, `START` label, accent-colored time
- Mid nodes: smaller hollow grey-bordered dots, black/white time
- Finish node: filled orange dot with halo, `FINISH` badge, accent-colored time and name
- Leg segments: `L1`…`L18` chips, runner name (or `—` if unassigned), miles, map pin button
- All node rows and map pin buttons open Google Maps in a new tab
- Footer note visible at the bottom after scrolling

Also test the `?startoffset=15000` transition:
```
http://localhost:5173/#team/<team-id>?startoffset=15000
```
Expected: countdown from ~15 seconds, then auto-transition to the live race view.

- [ ] **Step 4: Commit**

```bash
git add apps/tracker/src/components/PreRaceScreen.tsx
git commit -m "feat(tracker): add pre-race trail timeline (The Route)"
```

---

### Task 5: Update tracker README

**Files:**
- Modify: `apps/tracker/README.md`

- [ ] **Step 1: Add Pre-Race Screen section to README**

In `apps/tracker/README.md`, add a new section after the "Course Overview Screen" section and before "File Structure":

```markdown
## Pre-Race Screen

Shown when a team has not yet started leg 1 — replaces the live race view. Once the team starts, the 30-second poll detects the change and automatically shows the live view.

**What it shows:**
- **Header** — team name, `PRE-RACE · ESTIMATES ONLY` status, `YOUR START` card with gun time
- **Countdown** — live `HH:MM:SS` timer to the team's start time; turns green and reads `RACE IN PROGRESS` once started
- **Hero** — orange card with team start time, estimated finish time in Hermann, total miles/legs
- **The Route** — full 18-leg trail timeline: start node, alternating leg segments (runner, distance, route link) and handoff nodes (estimated time, location, map link), finish node

**Start time:** Hardcoded at **7:00 AM on the race date** (`race.date` with hours set to 7 local time). This is a hardcode for the single team currently using this feature — revisit if multiple teams with different start times need support.

**Estimated handoff times** are computed by walking `COURSE_LEGS` in order and accumulating `targetPaceSecPerMile × distanceMiles` from the start time. Legs with no assignment contribute 0 duration (times after them are still shown but may be wrong).

**Testing the pre-race screen:**
- `?prerace` — forces the pre-race screen regardless of race state. Remove param + refresh to return to live view.
- `?startoffset=<ms>` — sets the start time to `now + <ms>` milliseconds. Pre-race shows with a live countdown; when it reaches zero the screen automatically transitions to the live view (assuming the race has started in the DB). Implies `?prerace` behavior for the duration.
- Example: `http://localhost:5173/#team/<id>?startoffset=30000` — shows a 30-second countdown then transitions.
```

- [ ] **Step 2: Update the File Structure section**

In the `## File Structure` section, add `PreRaceScreen.tsx` to the components list:

```markdown
    PreRaceScreen.tsx       — pre-race landing page: countdown, hero, trail timeline (shown before leg 1 starts)
```

Add it after `CourseScreen.tsx` in the list.

- [ ] **Step 3: Commit**

```bash
git add apps/tracker/README.md
git commit -m "docs(tracker): document pre-race screen and test params in README"
```
