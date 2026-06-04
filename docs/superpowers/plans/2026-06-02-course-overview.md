# Course Overview Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a full-screen "THE COURSE" view to the Tracker and Driver apps showing all 18 race legs with live race clock, tappable Google Maps links per leg, difficulty chips, and done/active/upcoming status.

**Architecture:** A new `packages/shared/src/course.ts` holds static leg data, difficulty map, and URL helpers used by both apps. Each app gets an identical `CourseScreen.tsx` component. The Tracker wires it via local `showCourse` state in `TeamDetail`; the Driver wires it via a new `'course'` view type in `App.tsx`.

**Tech Stack:** React 18 + TypeScript + Tailwind CSS + CSS custom properties (Direction B theme). No new API endpoints.

**Design reference:** `resources/designs/design_handoff_kt82_course_overview/course-legs.jsx` and `README.md` — pixel values there are source of truth. Behavioral prototype: `KT82 Prototype.html` (project root) → Tracker → tap a team → "THE COURSE / ALL 18 LEGS →", and Driver → racing → "VIEW ALL 18 LEGS".

---

## File Map

| Status | File | Purpose |
|---|---|---|
| Create | `packages/shared/src/course.ts` | Static 18-leg data, difficulty map, mapPoint/mapRoute helpers |
| Modify | `packages/shared/src/index.ts` | Re-export new course module |
| Create | `apps/tracker/src/components/CourseScreen.tsx` | Full course screen component |
| Create | `apps/driver/src/components/CourseScreen.tsx` | Identical component for Driver |
| Modify | `apps/driver/src/index.css` | Add missing `live-dot` animation |
| Modify | `apps/tracker/src/components/TeamDetail.tsx` | Add `showCourse` state + header button + conditional render |
| Modify | `apps/driver/src/components/TimingScreen.tsx` | Add `onViewCourse` prop + "VIEW ALL 18 LEGS" button |
| Modify | `apps/driver/src/App.tsx` | Add `'course'` view type + handler functions |

---

## Task 1: Shared course data module

**Files:**
- Create: `packages/shared/src/course.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Create `packages/shared/src/course.ts`**

```typescript
export interface CourseLeg {
  legNumber: number
  startName: string
  startLat: number
  startLng: number
  endName: string
  endLat: number
  endLng: number
  miles: number
}

export const COURSE_LEGS: CourseLeg[] = [
  { legNumber: 1,  startName: 'Maryland Heights Aquaport',                startLat: 38.72545,    startLng: -90.44608,   endName: 'Lakehouse 364',                                    endLat: 38.7009544,  endLng: -90.496994,   miles: 5.10 },
  { legNumber: 2,  startName: 'Lakehouse 364',                            startLat: 38.7009544,  startLng: -90.496994,  endName: '364 Access',                                       endLat: 38.741153,   endLng: -90.524274,   miles: 3.93 },
  { legNumber: 3,  startName: '364 Access',                               startLat: 38.741153,   startLng: -90.524274,  endName: 'Greens Bottom Road Trailhead',                     endLat: 38.714401,   endLng: -90.56675,    miles: 3.20 },
  { legNumber: 4,  startName: 'Greens Bottom Road Trailhead',             startLat: 38.714401,   startLng: -90.56675,   endName: 'MO Research Park / Busch Greenway',                endLat: 38.6946466,  endLng: -90.6843187,  miles: 7.24 },
  { legNumber: 5,  startName: 'MO Research Park / Busch Greenway',        startLat: 38.6946466,  startLng: -90.6843187, endName: 'Lewis & Clark Trailhead',                          endLat: 38.69111,    endLng: -90.72442,    miles: 4.72 },
  { legNumber: 6,  startName: 'Lewis & Clark Trailhead',                  startLat: 38.69111,    startLng: -90.72442,   endName: 'Weldon Spring Trailhead',                          endLat: 38.659962,   endLng: -90.743787,   miles: 5.89 },
  { legNumber: 7,  startName: 'Weldon Spring Trailhead',                  startLat: 38.659962,   startLng: -90.743787,  endName: 'Weldon Spring Conservation Area (Lost Valley)',    endLat: 38.6614265,  endLng: -90.75767,    miles: 5.73 },
  { legNumber: 8,  startName: 'Weldon Spring Conservation Area (Lost Valley)', startLat: 38.6614265, startLng: -90.75767, endName: 'Matson',                                         endLat: 38.608612,   endLng: -90.79485,    miles: 4.43 },
  { legNumber: 9,  startName: 'Matson',                                   startLat: 38.608612,   startLng: -90.79485,   endName: 'Klondike Park',                                    endLat: 38.58024,    endLng: -90.83944,    miles: 3.61 },
  { legNumber: 10, startName: 'Klondike Park',                            startLat: 38.58024,    startLng: -90.83944,   endName: 'Augusta',                                          endLat: 38.569882,   endLng: -90.881067,   miles: 2.58 },
  { legNumber: 11, startName: 'Augusta',                                  startLat: 38.569882,   startLng: -90.881067,  endName: 'Dutzow',                                           endLat: 38.602628,   endLng: -90.999058,   miles: 7.56 },
  { legNumber: 12, startName: 'Dutzow',                                   startLat: 38.602628,   startLng: -90.999058,  endName: 'Marthasville',                                     endLat: 38.627633,   endLng: -91.060658,   miles: 3.67 },
  { legNumber: 13, startName: 'Marthasville',                             startLat: 38.627633,   startLng: -91.060658,  endName: 'Treloar',                                          endLat: 38.643583,   endLng: -91.188267,   miles: 6.96 },
  { legNumber: 14, startName: 'Treloar',                                  startLat: 38.643583,   startLng: -91.188267,  endName: 'Bernheimer Road',                                  endLat: 38.66808,    endLng: -91.25537,    miles: 4.17 },
  { legNumber: 15, startName: 'Bernheimer Road',                          startLat: 38.66808,    startLng: -91.25537,   endName: 'Gore-Case Community Center',                       endLat: 38.72521,    endLng: -91.34014,    miles: 6.14 },
  { legNumber: 16, startName: 'Gore-Case Community Center',               startLat: 38.72521,    startLng: -91.34014,   endName: 'Case Road',                                        endLat: 38.73476,    endLng: -91.37289,    miles: 2.69 },
  { legNumber: 17, startName: 'Case Road',                                startLat: 38.73476,    startLng: -91.37289,   endName: 'McKittrick',                                       endLat: 38.73410,    endLng: -91.44449,    miles: 3.89 },
  { legNumber: 18, startName: 'McKittrick',                               startLat: 38.73410,    startLng: -91.44449,   endName: 'Hermann & Finish!!',                               endLat: 38.70396,    endLng: -91.43376,    miles: 3.15 },
]

export const TOTAL_COURSE_MILES = 84.66

export interface LegDifficulty {
  tier: 'easy' | 'medium' | 'difficult'
  note?: 'distance' | 'single-track'
}

export const LEG_DIFFICULTY: Record<number, LegDifficulty> = {
  1:  { tier: 'medium' },
  2:  { tier: 'medium' },
  3:  { tier: 'easy' },
  4:  { tier: 'difficult', note: 'distance' },
  5:  { tier: 'difficult', note: 'single-track' },
  6:  { tier: 'difficult', note: 'single-track' },
  7:  { tier: 'difficult', note: 'single-track' },
  8:  { tier: 'medium' },
  9:  { tier: 'easy' },
  10: { tier: 'easy' },
  11: { tier: 'difficult', note: 'distance' },
  12: { tier: 'medium' },
  13: { tier: 'difficult', note: 'distance' },
  14: { tier: 'medium' },
  15: { tier: 'difficult', note: 'distance' },
  16: { tier: 'easy' },
  17: { tier: 'medium' },
  18: { tier: 'medium' },
}

export function mapPoint(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`
}

export function mapRoute(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): string {
  return `https://www.google.com/maps/dir/${a.lat},${a.lng}/${b.lat},${b.lng}`
}
```

- [ ] **Step 2: Add re-export to `packages/shared/src/index.ts`**

Current content:
```typescript
export * from './types'
export * from './eta'
export * from './api'
```

New content (add one line):
```typescript
export * from './types'
export * from './eta'
export * from './api'
export * from './course'
```

- [ ] **Step 3: Verify the shared package types are accepted by the tracker app**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker exec tsc --noEmit 2>&1 | head -20
```

Expected: no output (zero errors). If errors appear related to `course.ts`, fix them before continuing.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/course.ts packages/shared/src/index.ts
git commit -m "feat(shared): add static course data, difficulty map, and map URL helpers"
```

---

## Task 2: CourseScreen component (both apps)

**Files:**
- Create: `apps/tracker/src/components/CourseScreen.tsx`
- Create: `apps/driver/src/components/CourseScreen.tsx`
- Modify: `apps/driver/src/index.css` (add missing `live-dot` animation)

The component is identical in both apps. Both import `formatRaceTime` from `'../api'` (both apps define it there).

- [ ] **Step 1: Create `apps/tracker/src/components/CourseScreen.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { COURSE_LEGS, TOTAL_COURSE_MILES, LEG_DIFFICULTY, mapPoint, mapRoute } from '@kt82/shared'
import type { CourseLeg } from '@kt82/shared'
import { formatRaceTime } from '../api'

interface CourseScreenProps {
  currentLegNumber: number   // 0 = not started; >18 = all done
  raceStartedAt: string | null
  teamName: string
  backLabel: string
  onBack: () => void
}

function MapPin({ color }: { color: string }) {
  return (
    <svg width="13" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M12 2C8.1 2 5 5.1 5 9c0 4.9 7 13 7 13s7-8.1 7-13c0-3.9-3.1-7-7-7z" fill={color} />
      <circle cx="12" cy="9" r="2.6" fill="rgba(0,0,0,0.55)" />
    </svg>
  )
}

function MapLink({ kind, name, url, dotColor, nameColor, filled }: {
  kind: 'start' | 'finish'
  name: string
  url: string
  dotColor: string
  nameColor: string
  filled: boolean
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      style={{ display: 'grid', gridTemplateColumns: '12px 1fr auto', alignItems: 'center',
        columnGap: 10, textDecoration: 'none', color: 'inherit', padding: '3px 0' }}
    >
      <span style={{ width: 9, height: 9, borderRadius: '50%', justifySelf: 'center',
        background: filled ? dotColor : 'transparent', border: `2px solid ${dotColor}` }} />
      <span style={{ minWidth: 0 }}>
        <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 8.5,
          letterSpacing: '0.14em', color: 'var(--faint)', display: 'block', textTransform: 'uppercase' }}>
          {kind === 'start' ? 'START' : 'FINISH'}
        </span>
        <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 14.5,
          lineHeight: 1.12, color: nameColor, display: 'block' }}>
          {name}
        </span>
      </span>
      <MapPin color={dotColor} />
    </a>
  )
}

function DiffChip({ legNumber }: { legNumber: number }) {
  const diff = LEG_DIFFICULTY[legNumber]
  const c = diff.tier === 'easy' ? 'var(--green)' : diff.tier === 'medium' ? 'var(--amber)' : 'var(--red)'
  const label = diff.tier === 'easy' ? 'EASY' : diff.tier === 'medium' ? 'MEDIUM' : 'DIFFICULT'
  const noteLabel = diff.note === 'distance' ? 'DISTANCE' : diff.note === 'single-track' ? 'SINGLE TRACK' : null
  return (
    <div style={{ textAlign: 'right' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
        fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 9,
        letterSpacing: '0.06em', color: c,
        background: `color-mix(in srgb, ${c} 13%, transparent)`,
        padding: '4px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />
        {label}
      </span>
      {noteLabel && (
        <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 8.5,
          letterSpacing: '0.04em', color: 'var(--faint)', marginTop: 4, textTransform: 'uppercase' }}>
          {noteLabel}
        </div>
      )}
    </div>
  )
}

function LegRow({ leg, state, isNextUp, isLast }: {
  leg: CourseLeg
  state: 'done' | 'now' | 'upcoming'
  isNextUp: boolean
  isLast: boolean
}) {
  const isDone = state === 'done'
  const isNow  = state === 'now'

  const stripeColor = isNow ? 'var(--accent)' : isDone ? 'var(--green)' : 'var(--line)'
  const rowBg       = isNow ? 'color-mix(in srgb, var(--accent) 11%, transparent)'
                    : isDone ? 'color-mix(in srgb, var(--green) 6%, transparent)'
                    : 'transparent'
  const legNumColor = isNow ? 'var(--accent)' : isDone ? 'var(--mut)' : 'var(--faint)'
  const nameColor   = isDone ? 'var(--mut)' : 'var(--text)'
  const dotColor    = isNow ? 'var(--accent)' : isDone ? 'var(--green)' : 'var(--faint)'

  return (
    <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '40px 1fr auto',
      columnGap: 12, padding: '13px 12px 13px 16px', background: rowBg,
      borderRadius: isNow ? 16 : isDone ? 12 : 0,
      border: isNow ? '1px solid var(--accent)' : 'none',
      borderBottom: (isNow || isDone || isLast) ? 'none' : '1px solid var(--line2)' }}>

      {/* Left status stripe */}
      <div style={{ position: 'absolute', left: 0,
        top: (isNow || isDone) ? 6 : 0, bottom: (isNow || isDone) ? 6 : 0,
        width: 3, borderRadius: 3, background: stripeColor }} />

      {/* Leg number + state badge */}
      <div style={{ textAlign: 'center', paddingTop: 2 }}>
        <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 30, lineHeight: 0.8, color: legNumColor }}>
          {String(leg.legNumber).padStart(2, '0')}
        </div>
        {isNow && (
          <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 7.5,
            letterSpacing: '0.1em', color: 'var(--ink)', background: 'var(--accent)',
            borderRadius: 20, padding: '2px 0', marginTop: 5 }}>
            LIVE
          </div>
        )}
        {isDone && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 5,
            fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 7.5,
            letterSpacing: '0.08em', color: 'var(--green)' }}>
            <span style={{ width: 13, height: 13, borderRadius: '50%', background: 'var(--green)',
              color: 'var(--ink)', display: 'inline-flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 9 }}>✓</span>
            DONE
          </div>
        )}
        {isNextUp && (
          <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 7.5,
            letterSpacing: '0.08em', color: 'var(--accent)',
            border: '1px solid var(--accent)', borderRadius: 20, padding: '2px 0', marginTop: 5 }}>
            NEXT
          </div>
        )}
      </div>

      {/* Start → Finish map links */}
      <div style={{ minWidth: 0 }}>
        <MapLink kind="start" name={leg.startName}
          url={mapPoint(leg.startLat, leg.startLng)}
          dotColor={dotColor} nameColor={nameColor} filled={isNow || isDone} />
        <div style={{ width: 2, height: 9, marginLeft: 5,
          background: isDone ? 'color-mix(in srgb, var(--green) 40%, transparent)' : 'var(--line)' }} />
        <MapLink kind="finish" name={leg.endName}
          url={mapPoint(leg.endLat, leg.endLng)}
          dotColor={dotColor} nameColor={nameColor} filled={isNow || isDone} />
        <a
          href={mapRoute({ lat: leg.startLat, lng: leg.startLng }, { lat: leg.endLat, lng: leg.endLng })}
          target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 7,
            textDecoration: 'none', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800,
            fontSize: 9.5, letterSpacing: '0.08em', color: isNow ? 'var(--accent)' : 'var(--mut)' }}>
          FULL DIRECTIONS <span style={{ fontSize: 11 }}>↗</span>
        </a>
      </div>

      {/* Difficulty chip + mileage */}
      <div style={{ paddingTop: 2, minWidth: 56 }}>
        <DiffChip legNumber={leg.legNumber} />
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 16,
          color: isDone ? 'var(--mut)' : 'var(--text)', marginTop: 8, textAlign: 'right' }}>
          {leg.miles.toFixed(2)}<span style={{ fontSize: 10, color: 'var(--mut)' }}> mi</span>
        </div>
      </div>
    </div>
  )
}

export function CourseScreen({ currentLegNumber, raceStartedAt, teamName, backLabel, onBack }: CourseScreenProps) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!raceStartedAt) return
    const id = setInterval(() => setTick(t => t + 1), 1_000)
    return () => clearInterval(id)
  }, [raceStartedAt])

  void tick

  const milesDone  = Math.round(COURSE_LEGS.filter(l => l.legNumber < currentLegNumber).reduce((s, l) => s + l.miles, 0) * 10) / 10
  const pct        = Math.min(100, Math.round((milesDone / TOTAL_COURSE_MILES) * 100))
  const doneCount  = Math.max(0, currentLegNumber - 1)
  const toGo       = Math.max(0, COURSE_LEGS.length - currentLegNumber)
  const curLeg     = COURSE_LEGS.find(l => l.legNumber === currentLegNumber) ?? COURSE_LEGS[0]
  const raceElapsedMs = raceStartedAt ? Math.max(0, Date.now() - new Date(raceStartedAt).getTime()) : 0
  const isRacing   = raceStartedAt !== null && currentLegNumber >= 1 && currentLegNumber <= COURSE_LEGS.length

  const stateOf = (n: number): 'done' | 'now' | 'upcoming' =>
    n < currentLegNumber ? 'done' : n === currentLegNumber ? 'now' : 'upcoming'

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)',
      fontFamily: "'Hanken Grotesk', sans-serif" }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 18px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--mut)', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800,
          fontSize: 12, letterSpacing: '0.04em', padding: 0, whiteSpace: 'nowrap', minHeight: 44 }}>
          {backLabel}
        </button>
        {isRacing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="live-dot" style={{ width: 7, height: 7, borderRadius: '50%',
              background: 'var(--green)' }} />
            <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 11,
              letterSpacing: '0.1em', color: 'var(--mut)' }}>LIVE</span>
          </div>
        )}
      </div>

      {/* Title */}
      <div style={{ padding: '4px 18px 0' }}>
        <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 11,
          letterSpacing: '0.14em', color: 'var(--accent)', textTransform: 'uppercase' }}>
          KT82 · Katy Trail Relay{teamName ? ` · ${teamName}` : ''}
        </div>
        <div className="font-display" style={{ fontSize: 50, lineHeight: 0.84,
          textTransform: 'uppercase', marginTop: 8 }}>
          The Course
        </div>
      </div>

      {/* Race clock + position (only shown while racing) */}
      {isRacing ? (
        <div style={{ padding: '16px 18px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            marginBottom: 9 }}>
            <div>
              <div className="font-mono" style={{ fontWeight: 700, fontSize: 26, lineHeight: 0.9 }}>
                {formatRaceTime(raceElapsedMs)}
              </div>
              <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 10,
                letterSpacing: '0.12em', color: 'var(--mut)', marginTop: 5, textTransform: 'uppercase' }}>
                Total Race Time
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="font-mono" style={{ fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap' }}>
                LEG {currentLegNumber}
                <span style={{ fontSize: 11, color: 'var(--mut)' }}> / {COURSE_LEGS.length}</span>
              </div>
              <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 10,
                letterSpacing: '0.08em', color: 'var(--faint)', marginTop: 6, whiteSpace: 'nowrap' }}>
                {milesDone} OF {TOTAL_COURSE_MILES} MI
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ position: 'relative', height: 8, borderRadius: 999,
            background: 'var(--line)', overflow: 'visible' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)',
              borderRadius: 999 }} />
            <div style={{ position: 'absolute', top: '50%', left: `${pct}%`,
              transform: 'translate(-50%, -50%)', width: 14, height: 14, borderRadius: '50%',
              background: 'var(--accent)', border: '2.5px solid var(--bg)',
              boxShadow: '0 0 0 2px var(--accent)' }} />
          </div>

          {/* Tally pills */}
          <div style={{ display: 'flex', gap: 7, marginTop: 12, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 9.5,
              letterSpacing: '0.06em', color: 'var(--green)',
              background: 'color-mix(in srgb, var(--green) 11%, transparent)',
              padding: '5px 10px', borderRadius: 999 }}>
              ✓ {doneCount} DONE
            </span>
            <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 9.5,
              letterSpacing: '0.06em', color: 'var(--accent)',
              background: 'color-mix(in srgb, var(--accent) 11%, transparent)',
              padding: '5px 10px', borderRadius: 999 }}>
              ● ON LEG {currentLegNumber}
            </span>
            <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 9.5,
              letterSpacing: '0.06em', color: 'var(--faint)',
              background: 'color-mix(in srgb, var(--faint) 11%, transparent)',
              padding: '5px 10px', borderRadius: 999 }}>
              {toGo} TO GO
            </span>
          </div>

          {/* Now-running callout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14,
            background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent) 33%, transparent)',
            borderRadius: 14, padding: '11px 14px' }}>
            <div className="live-dot" style={{ width: 8, height: 8, borderRadius: '50%',
              background: 'var(--accent)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 9.5,
                letterSpacing: '0.12em', color: 'var(--accent)', textTransform: 'uppercase' }}>
                Race in Progress · On Leg {currentLegNumber}
              </div>
              <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 13,
                color: 'var(--text)', marginTop: 3, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {curLeg.startName} → {curLeg.endName}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '16px 18px 18px' }}>
          <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13, color: 'var(--mut)' }}>
            Race not started.
          </p>
        </div>
      )}

      {/* Column header */}
      <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', columnGap: 12,
        padding: '0 30px 6px', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800,
        fontSize: 9, letterSpacing: '0.1em', color: 'var(--faint)', textTransform: 'uppercase' }}>
        <span style={{ textAlign: 'center' }}>Leg</span>
        <span>Start → Finish</span>
        <span style={{ textAlign: 'right' }}>Diff · Mi</span>
      </div>

      {/* Leg list */}
      <div style={{ padding: '0 8px 36px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {COURSE_LEGS.map((leg, i) => (
          <LegRow
            key={leg.legNumber}
            leg={leg}
            state={stateOf(leg.legNumber)}
            isNextUp={leg.legNumber === currentLegNumber + 1}
            isLast={i === COURSE_LEGS.length - 1}
          />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `apps/driver/src/components/CourseScreen.tsx`**

The content is identical to `apps/tracker/src/components/CourseScreen.tsx` — copy it exactly. Both apps define `formatRaceTime` in their own `../api.ts`, so the import path is the same.

- [ ] **Step 3: Add `live-dot` animation to `apps/driver/src/index.css`**

The Driver's `index.css` (at `apps/driver/src/index.css`) is missing the `live-dot` animation that `CourseScreen` uses. The Tracker already has it. Add these lines at the end of `apps/driver/src/index.css`:

```css
@keyframes live-dot {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.25; }
}
.live-dot { animation: live-dot 1.5s ease-in-out infinite; }
```

- [ ] **Step 4: Start the Tracker dev server and verify CourseScreen renders without errors**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker dev
```

Open `http://localhost:5173`. The app should load without console TypeScript errors. (The CourseScreen isn't reachable yet — just verify the build succeeds.)

- [ ] **Step 5: Commit**

```bash
git add apps/tracker/src/components/CourseScreen.tsx \
        apps/driver/src/components/CourseScreen.tsx \
        apps/driver/src/index.css
git commit -m "feat(tracker,driver): add CourseScreen component with all-legs view"
```

---

## Task 3: Wire Tracker entry point

**Files:**
- Modify: `apps/tracker/src/components/TeamDetail.tsx`

The existing "The Course" section header (a plain `<div>`) becomes a tappable button row. When tapped, it replaces the TeamDetail body with the CourseScreen.

- [ ] **Step 1: Add import and `showCourse` state to `TeamDetail.tsx`**

At the top of `apps/tracker/src/components/TeamDetail.tsx`, add the CourseScreen import alongside the existing imports:

```typescript
import { CourseScreen } from './CourseScreen'
import { COURSE_LEGS } from '@kt82/shared'
```

Inside the `TeamDetail` function, add state after the existing state declarations:

```typescript
const [showCourse, setShowCourse] = useState(false)
```

- [ ] **Step 2: Add early return for CourseScreen**

Immediately before the existing `return (` at the bottom of `TeamDetail`, add:

```tsx
if (showCourse) return (
  <CourseScreen
    currentLegNumber={allDone ? COURSE_LEGS.length + 1 : (activeItem?.leg.legNumber ?? 0)}
    raceStartedAt={raceStartedAt}
    teamName={teamName}
    backLabel={`← ${teamName}`}
    onBack={() => setShowCourse(false)}
  />
)
```

- [ ] **Step 3: Convert the "The Course" section header to a button**

Find this block in the existing `TeamDetail` JSX (around line 303–307):

```tsx
{/* The Course */}
<div className="font-display uppercase" style={{ fontSize: 24, marginBottom: 2 }}>The Course</div>
<div className="uppercase mb-3" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--faint)' }}>
  {timeline.length} Handoffs
</div>
```

Replace it with:

```tsx
{/* The Course */}
<button
  onClick={() => setShowCourse(true)}
  className="flex items-center justify-between w-full min-h-[44px] mb-0"
  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
>
  <span className="font-display uppercase" style={{ fontSize: 24 }}>The Course</span>
  <span className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11,
    fontWeight: 800, letterSpacing: '0.08em', color: 'var(--accent)' }}>
    ALL {COURSE_LEGS.length} LEGS →
  </span>
</button>
<div className="uppercase mb-3" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10,
  fontWeight: 800, letterSpacing: '0.1em', color: 'var(--faint)' }}>
  {timeline.length} Handoffs
</div>
```

- [ ] **Step 4: Start the Tracker dev server and verify the button and screen**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker dev
```

Open `http://localhost:5173`, tap a team, scroll to "The Course". Verify:
- Section header shows "The Course" on the left and "ALL 18 LEGS →" (accent color) on the right
- Tapping it navigates to CourseScreen (full screen, "THE COURSE" title visible)
- Back button returns to team detail
- All 18 leg rows visible with leg numbers, start/finish names
- No console errors

If there's no active race, `raceStartedAt` will be null and the clock block should be hidden, replaced by "Race not started."

- [ ] **Step 5: Commit**

```bash
git add apps/tracker/src/components/TeamDetail.tsx
git commit -m "feat(tracker): wire CourseScreen from TeamDetail section header"
```

---

## Task 4: Wire Driver entry point

**Files:**
- Modify: `apps/driver/src/components/TimingScreen.tsx`
- Modify: `apps/driver/src/App.tsx`

- [ ] **Step 1: Add `onViewCourse` prop to `TimingScreen` and add the button**

In `apps/driver/src/components/TimingScreen.tsx`, add `onViewCourse: () => void` to the `Props` interface:

```typescript
interface Props {
  team: TeamSummary
  pin: string
  resultId: string | null
  leg: Leg
  startedAt: string
  nextHandoff: Handoff | null
  currentRunner: string | null
  raceStartedAt: string | null
  onLapPress: (finishedAt: string) => void
  onComplete: () => void
  nextRunner: string | null
  nextLeg: Leg | null
  nextRunnerEta: string | null
  onViewCourse: () => void
}
```

Destructure it in the function signature:

```typescript
export function TimingScreen({ team, pin, resultId, leg, startedAt, nextHandoff, currentRunner, raceStartedAt, onLapPress, onComplete, nextRunner, nextLeg, nextRunnerEta, onViewCourse }: Props) {
```

Add the "VIEW ALL 18 LEGS" button after the Navigate button and before `{stopError && ...}`:

```tsx
{/* View all legs */}
<button
  onClick={onViewCourse}
  className="flex items-center justify-center gap-1.5 uppercase min-h-[44px] w-full"
  style={{ border: '1px solid var(--line)', borderRadius: 14, background: 'none', cursor: 'pointer',
    fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, fontWeight: 800,
    letterSpacing: '0.08em', color: 'var(--mut)' }}
>
  VIEW ALL 18 LEGS · THE COURSE →
</button>
```

Place it immediately after the closing `)}` of the `{navUrl && (<a ...>)}` block, before the `{stopError && ...}` line.

- [ ] **Step 2: Add `'course'` view type to `App.tsx`**

In `apps/driver/src/App.tsx`, extend the `View` union type. Find the existing type definition and add the `'course'` variant:

```typescript
type View =
  | { type: 'loading' }
  | { type: 'no-race' }
  | { type: 'auth'; race: Race }
  | { type: 'start'; race: Race; team: TeamSummary; pin: string; nextLeg: Leg; nextRunner: string | null }
  | { type: 'racing'; race: Race; team: TeamSummary; pin: string; resultId: string | null; leg: Leg; startedAt: string; nextHandoff: Handoff | null; currentRunner: string | null; raceStartedAt: string | null; nextRunner: string | null; nextLeg: Leg | null; nextRunnerEta: string | null }
  | { type: 'course'; race: Race; team: TeamSummary; pin: string; resultId: string | null; leg: Leg; startedAt: string; nextHandoff: Handoff | null; currentRunner: string | null; raceStartedAt: string | null; nextRunner: string | null; nextLeg: Leg | null; nextRunnerEta: string | null }
  | { type: 'complete'; race: Race; team: TeamSummary; pin: string }
```

- [ ] **Step 3: Add handler functions and `CourseScreen` import in `App.tsx`**

Add the import at the top alongside other component imports:

```typescript
import { CourseScreen } from './components/CourseScreen'
```

Add two new functions inside the `App` component body (after `handleComplete`):

```typescript
function handleViewCourse() {
  setView(prev => prev.type === 'racing' ? { ...prev, type: 'course' } : prev)
}

function handleBackFromCourse() {
  setView(prev => prev.type === 'course' ? { ...prev, type: 'racing' } : prev)
}
```

- [ ] **Step 4: Add `onViewCourse` to the TimingScreen render call and add `'course'` render branch**

Find the `if (view.type === 'racing') return (` block in `App.tsx` and add `onViewCourse={handleViewCourse}` to the `<TimingScreen>` props:

```tsx
if (view.type === 'racing') return (
  <TimingScreen
    team={view.team} pin={view.pin} resultId={view.resultId}
    leg={view.leg} startedAt={view.startedAt} nextHandoff={view.nextHandoff}
    currentRunner={view.currentRunner} raceStartedAt={view.raceStartedAt}
    onLapPress={handleLapPress} onComplete={handleComplete}
    nextRunner={view.nextRunner} nextLeg={view.nextLeg} nextRunnerEta={view.nextRunnerEta}
    onViewCourse={handleViewCourse}
  />
)
```

Add the `'course'` render branch immediately after (before the final `return <CompleteScreen ...>`):

```tsx
if (view.type === 'course') return (
  <CourseScreen
    currentLegNumber={view.leg.legNumber}
    raceStartedAt={view.raceStartedAt}
    teamName={view.team.name}
    backLabel="← TIMING"
    onBack={handleBackFromCourse}
  />
)
```

- [ ] **Step 5: Start the Driver dev server and verify**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver dev
```

Open `http://localhost:5176`. Log in and start a race (or use an existing racing state). Verify:
- TimingScreen shows a "VIEW ALL 18 LEGS · THE COURSE →" button below the Navigate button
- Tapping it shows the CourseScreen (full screen, live clock ticking)
- Back button returns to TimingScreen with all timing state intact
- The active leg is highlighted with accent color and LIVE badge
- Previous legs show green ✓ DONE styling
- No console errors

- [ ] **Step 6: Commit**

```bash
git add apps/driver/src/components/TimingScreen.tsx apps/driver/src/App.tsx
git commit -m "feat(driver): wire CourseScreen from TimingScreen VIEW ALL LEGS button"
```

---

## Task 5: Full visual verification

- [ ] **Step 1: Start the full dev stack**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" ./scripts/dev.sh
```

- [ ] **Step 2: Open the prototype for reference**

Open `KT82 Prototype.html` in a browser (double-click the file or `open KT82\ Prototype.html`). Navigate to Tracker → tap a team → "THE COURSE / ALL 18 LEGS →" to see the target design.

- [ ] **Step 3: Verify Tracker**

Open `http://localhost:5173`. Tap a team that has an active race. Tap "ALL 18 LEGS →". Check:

- [ ] Top bar: back button (left, shows team name), blinking green LIVE dot + "LIVE" text (right)
- [ ] Title: accent eyebrow "KT82 · KATY TRAIL RELAY · [team name]", large "THE COURSE" headline
- [ ] Race clock ticks every second in JetBrains Mono
- [ ] Progress bar fills to current leg's position with accent dot marker
- [ ] Three tally pills: green (✓ N DONE), accent (● ON LEG N), faint (N TO GO)
- [ ] Now-running callout box with blinking accent dot and current leg start → end names
- [ ] Column header row: LEG · START → FINISH · DIFF · MI
- [ ] Done legs: green wash background, green stripe, "✓ DONE" badge
- [ ] Active leg: accent-highlighted background + border, "LIVE" badge
- [ ] Next leg: "NEXT" outlined badge in accent
- [ ] Each leg has START and FINISH tappable rows — tap one, confirm it opens `maps.google.com?q=...` in a new tab
- [ ] Each leg has "FULL DIRECTIONS ↗" link — tap one, confirm it opens `maps.google.com/dir/...` in a new tab
- [ ] Difficulty chips: Easy (green), Medium (amber), Difficult (red); notes ("DISTANCE", "SINGLE TRACK") appear below for relevant legs
- [ ] Mileage shown in JetBrains Mono to 2 decimal places

- [ ] **Step 4: Verify Driver**

Open `http://localhost:5176`. Authenticate, start a race. Verify TimingScreen shows "VIEW ALL 18 LEGS · THE COURSE →" button. Tap it. Check the same list as Step 3. Confirm back button returns to timing with clock still correct.

- [ ] **Step 5: Commit if any fixes were needed during verification**

```bash
git add -p   # stage only verified changes
git commit -m "fix(course): visual corrections from browser verification"
```

---

## Self-Review

**Spec coverage check:**
- ✅ Shared data module with `COURSE_LEGS`, `LEG_DIFFICULTY`, `TOTAL_COURSE_MILES`, `mapPoint`, `mapRoute`
- ✅ `CourseScreen` prop shape: `currentLegNumber`, `raceStartedAt`, `teamName`, `backLabel`, `onBack`
- ✅ Top bar: back button + LIVE indicator (suppressed when not racing)
- ✅ Title block: accent eyebrow + Anton display headline
- ✅ Race clock ticking via 1s interval, `formatRaceTime`
- ✅ Progress bar with position marker dot
- ✅ Tally pills (done/now/to-go)
- ✅ Now-running callout with blinking dot
- ✅ Column header
- ✅ LegRow: status stripe, leg number, done/live/next badges
- ✅ MapLink: start + finish tappable rows, FULL DIRECTIONS link
- ✅ `mapPoint` for start/finish, `mapRoute` for full directions
- ✅ DiffChip: Easy/Medium/Difficult with optional distance/single-track note
- ✅ Tracker entry: header button → showCourse state → CourseScreen replace
- ✅ Driver entry: `onViewCourse` prop → `'course'` view type → back restores timing
- ✅ `live-dot` animation added to Driver CSS
- ✅ `allDone` case: `currentLegNumber = COURSE_LEGS.length + 1` renders all rows as done
- ✅ `raceStartedAt = null` case: clock+callout block replaced with "Race not started."
