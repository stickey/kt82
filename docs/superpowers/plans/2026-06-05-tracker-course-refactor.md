# Tracker CourseScreen Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `CourseScreen` the primary subscreen in Tracker's `TeamDetail`, enhanced with runner names and start/finish times per leg; replace `PreRaceScreen`'s route trail with the same inline `CourseScreen`.

**Architecture:** `CourseScreen` gains optional `timeline` + `assignedStartTime` props and an embedded mode (no `onBack` = no top bar/title). `TeamDetail` removes its inline leg list and `LegProgressScreen` navigation, rendering `CourseScreen` inline instead. `PreRaceScreen` keeps its countdown and hero box but replaces the `TrailNode`/`TrailLeg` route section with `CourseScreen`.

**Tech Stack:** React 18, TypeScript 5, Vite, Tailwind CSS (utility classes + CSS vars), pnpm workspaces

---

## Task 1: Create pre-refactor git tag

**Files:** none (git only)

- [ ] **Step 1: Create the tag**

```bash
git tag pre-tracker-course-refactor
```

- [ ] **Step 2: Verify**

```bash
git tag | grep pre-tracker
```

Expected output: `pre-tracker-course-refactor`

---

## Task 2: Enhance CourseScreen (Tracker)

**Files:**
- Modify: `apps/tracker/src/components/CourseScreen.tsx`

### Overview of changes
- Add `useMemo` to React imports
- Add `formatTime` to `../api` import; add `LegTimelineItem` type import
- Make `backLabel` and `onBack` optional; add `timeline?: LegTimelineItem[]` and `assignedStartTime?: Date`
- Add `fmtMs` helper
- Add `legDataMap` useMemo inside the component
- Replace `LegRow` with the new 2-row grid layout (runner name + diff chip header row; map links + time blocks below)
- Remove the column-header `<div>` (the "Leg / Start → Finish / Diff · Mi" row)
- Update `COURSE_LEGS.map` call to pass leg data from `legDataMap`
- Wrap top bar and title in `{onBack && (...)}` for embedded mode
- Enhance "now-running callout" with active runner name

- [ ] **Step 1: Replace the entire file with the new version**

```tsx
import { useState, useEffect, useMemo } from 'react'
import { COURSE_LEGS, TOTAL_COURSE_MILES, LEG_DIFFICULTY, mapPoint, mapRoute } from '@kt82/shared'
import type { CourseLeg } from '@kt82/shared'
import { formatRaceTime, formatTime } from '../api'
import type { LegTimelineItem } from '../api'

interface CourseScreenProps {
  currentLegNumber: number   // 0 = not started; >18 = all done
  raceStartedAt: string | null
  teamName: string
  backLabel?: string
  onBack?: () => void        // absent = embedded mode (no top bar / title)
  timeline?: LegTimelineItem[]
  assignedStartTime?: Date
}

function fmtMs(ms: number): string {
  return formatTime(new Date(ms).toISOString())
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
        columnGap: 10, textDecoration: 'none', color: 'inherit', padding: '3px 0', minHeight: 44 }}
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

function LegRow({ leg, state, isNextUp, isLast, runnerName, startTime, endTime, endLabel }: {
  leg: CourseLeg
  state: 'done' | 'now' | 'upcoming'
  isNextUp: boolean
  isLast: boolean
  runnerName?: string | null
  startTime?: string | null
  endTime?: string | null
  endLabel?: 'Finish' | 'ETA'
}) {
  const isDone = state === 'done'
  const isNow  = state === 'now'

  const stripeColor  = isNow ? 'var(--accent)' : isDone ? 'var(--green)' : 'var(--line)'
  const rowBg        = isNow ? 'color-mix(in srgb, var(--accent) 11%, transparent)'
                     : isDone ? 'color-mix(in srgb, var(--green) 6%, transparent)'
                     : 'transparent'
  const legNumColor  = isNow ? 'var(--accent)' : isDone ? 'var(--mut)' : 'var(--faint)'
  const nameColor    = isNow ? 'var(--accent)' : isDone ? 'var(--mut)' : 'var(--text)'
  const dotColor     = isNow ? 'var(--accent)' : isDone ? 'var(--green)' : 'var(--faint)'
  const mapNameColor = isDone ? 'var(--mut)' : 'var(--text)'

  return (
    <div style={{ position: 'relative', display: 'grid',
      gridTemplateColumns: '40px 1fr auto',
      gridTemplateRows: 'auto auto',
      columnGap: 12, padding: '13px 12px 13px 16px', background: rowBg,
      borderRadius: isNow ? 16 : isDone ? 12 : 0,
      border: isNow ? '1px solid var(--accent)' : 'none',
      borderBottom: (isNow || isDone || isLast) ? 'none' : '1px solid var(--line2)' }}>

      {/* Left status stripe */}
      <div style={{ position: 'absolute', left: 0,
        top: (isNow || isDone) ? 6 : 0, bottom: (isNow || isDone) ? 6 : 0,
        width: 3, borderRadius: 3, background: stripeColor }} />

      {/* Col 1, rows 1+2: leg number + state badge */}
      <div style={{ gridColumn: 1, gridRow: '1 / 3', textAlign: 'center', paddingTop: 2 }}>
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

      {/* Cols 2–3, row 1: runner name + difficulty chip */}
      <div style={{ gridColumn: '2 / 4', gridRow: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingBottom: 7 }}>
        <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, fontWeight: 800,
          color: runnerName ? nameColor : 'var(--faint)' }}>
          {runnerName ?? '—'}
        </span>
        <DiffChip legNumber={leg.legNumber} />
      </div>

      {/* Col 2, row 2: start → finish map links */}
      <div style={{ gridColumn: 2, gridRow: 2, minWidth: 0 }}>
        <MapLink kind="start" name={leg.startName}
          url={mapPoint(leg.startLat, leg.startLng)}
          dotColor={dotColor} nameColor={mapNameColor} filled={false} />
        <div style={{ width: 2, height: 9, marginLeft: 5,
          background: isDone ? 'color-mix(in srgb, var(--green) 40%, transparent)' : 'var(--line)' }} />
        <MapLink kind="finish" name={leg.endName}
          url={mapPoint(leg.endLat, leg.endLng)}
          dotColor={dotColor} nameColor={mapNameColor} filled={isNow || isDone} />
        <a
          href={mapRoute({ lat: leg.startLat, lng: leg.startLng }, { lat: leg.endLat, lng: leg.endLng })}
          target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 7,
            textDecoration: 'none', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800,
            fontSize: 9.5, letterSpacing: '0.08em', color: isNow ? 'var(--accent)' : 'var(--mut)',
            minHeight: 44 }}>
          FULL DIRECTIONS <span style={{ fontSize: 11 }}>↗</span>
        </a>
      </div>

      {/* Col 3, row 2: start time + ETA/finish time */}
      <div style={{ gridColumn: 3, gridRow: 2,
        display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 1, minWidth: 58 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 8,
            letterSpacing: '0.12em', color: 'var(--faint)', textTransform: 'uppercase' }}>Start</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14,
            color: isNow ? 'var(--green)' : 'var(--mut)', lineHeight: 1.1 }}>
            {startTime ?? '—'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 8,
            letterSpacing: '0.12em', color: 'var(--faint)', textTransform: 'uppercase' }}>
            {endLabel ?? 'ETA'}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14,
            color: isNow ? 'var(--accent)' : 'var(--mut)', lineHeight: 1.1 }}>
            {endTime ?? '—'}
          </div>
        </div>
      </div>
    </div>
  )
}

export function CourseScreen({ currentLegNumber, raceStartedAt, teamName, backLabel, onBack, timeline, assignedStartTime }: CourseScreenProps) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!raceStartedAt) return
    const id = setInterval(() => setTick(t => t + 1), 1_000)
    return () => clearInterval(id)
  }, [raceStartedAt])

  void tick

  type LegData = { runnerName: string | null; startTime: string | null; endTime: string | null; endLabel: 'Finish' | 'ETA' }

  const legDataMap = useMemo<Map<number, LegData>>(() => {
    const map = new Map<number, LegData>()
    if (!timeline?.length) return map

    const sorted = [...timeline].sort((a, b) => a.leg.legNumber - b.leg.legNumber)

    for (const item of sorted) {
      const runnerName = item.runner?.name ?? null
      if (item.status === 'completed' && item.result?.startedAt && item.result?.finishedAt) {
        map.set(item.leg.legNumber, {
          runnerName,
          startTime: formatTime(item.result.startedAt),
          endTime: formatTime(item.result.finishedAt),
          endLabel: 'Finish',
        })
      } else if (item.status === 'in-progress' && item.result?.startedAt && item.eta?.eta) {
        map.set(item.leg.legNumber, {
          runnerName,
          startTime: formatTime(item.result.startedAt),
          endTime: `~${formatTime(String(item.eta.eta))}`,
          endLabel: 'ETA',
        })
      } else {
        map.set(item.leg.legNumber, { runnerName, startTime: null, endTime: null, endLabel: 'ETA' })
      }
    }

    // Project start + end times for not-started legs
    const activeItem = sorted.find(t => t.status === 'in-progress')
    const anchorDate = activeItem?.eta?.eta
      ? new Date(String(activeItem.eta.eta))
      : assignedStartTime ?? null

    if (anchorDate) {
      let anchor = anchorDate.getTime()
      for (const item of sorted.filter(t => t.status === 'not-started')) {
        if (!item.assignment) continue
        const startMs = anchor
        const durationMs = item.assignment.targetPaceSecPerMile * item.leg.distanceMiles * 1000
        anchor = startMs + durationMs
        const existing = map.get(item.leg.legNumber)
        map.set(item.leg.legNumber, {
          runnerName: existing?.runnerName ?? null,
          startTime: `~${fmtMs(startMs)}`,
          endTime: `~${fmtMs(anchor)}`,
          endLabel: 'ETA',
        })
      }
    }

    return map
  }, [timeline, assignedStartTime])

  const milesDone  = Math.round(COURSE_LEGS.filter(l => l.legNumber < currentLegNumber).reduce((s, l) => s + l.miles, 0) * 10) / 10
  const pct        = Math.min(100, Math.round((milesDone / TOTAL_COURSE_MILES) * 100))
  const doneCount  = Math.max(0, currentLegNumber - 1)
  const toGo       = Math.max(0, COURSE_LEGS.length - currentLegNumber)
  const curLeg     = COURSE_LEGS.find(l => l.legNumber === currentLegNumber) ?? COURSE_LEGS[0]
  const raceElapsedMs = raceStartedAt ? Math.max(0, Date.now() - new Date(raceStartedAt).getTime()) : 0
  const isRacing   = raceStartedAt !== null && currentLegNumber >= 1 && currentLegNumber <= COURSE_LEGS.length

  const activeRunner = timeline?.find(t => t.status === 'in-progress')?.runner?.name ?? null

  const stateOf = (n: number): 'done' | 'now' | 'upcoming' =>
    n < currentLegNumber ? 'done' : n === currentLegNumber ? 'now' : 'upcoming'

  return (
    <div className={onBack ? 'min-h-screen' : ''} style={{ background: 'var(--bg)', color: 'var(--text)',
      fontFamily: "'Hanken Grotesk', sans-serif" }}>

      {/* Top bar — hidden in embedded mode */}
      {onBack && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 18px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--mut)', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800,
            fontSize: 12, letterSpacing: '0.04em', padding: 0, whiteSpace: 'nowrap', minHeight: 44, minWidth: 44 }}>
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
      )}

      {/* Title — hidden in embedded mode */}
      {onBack && (
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
      )}

      {/* Race clock + progress (only shown while racing) */}
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
                {activeRunner && (
                  <span style={{ fontWeight: 800, color: 'var(--accent)' }}>{activeRunner} · </span>
                )}
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

      {/* Leg list */}
      <div style={{ padding: '0 8px 36px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {COURSE_LEGS.map((leg, i) => {
          const data = legDataMap.get(leg.legNumber)
          return (
            <LegRow
              key={leg.legNumber}
              leg={leg}
              state={stateOf(leg.legNumber)}
              isNextUp={leg.legNumber === currentLegNumber + 1}
              isLast={i === COURSE_LEGS.length - 1}
              runnerName={data?.runnerName}
              startTime={data?.startTime}
              endTime={data?.endTime}
              endLabel={data?.endLabel}
            />
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Check for TypeScript errors**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker exec tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add apps/tracker/src/components/CourseScreen.tsx
git commit -m "feat(tracker): enhance CourseScreen with runner names and times"
```

---

## Task 3: Update TeamDetail — remove LegProgressScreen, simplify hero card

**Files:**
- Modify: `apps/tracker/src/components/TeamDetail.tsx`

- [ ] **Step 1: Remove `LegProgressScreen` import (line 6)**

Delete the line:
```tsx
import { LegProgressScreen } from './LegProgressScreen'
```

- [ ] **Step 2: Remove `NavPin` component (lines 21–39)**

Delete the entire `NavPin` function — it is only used in the Arrivals section being removed in Task 4.

- [ ] **Step 3: Remove `showLegProgress` state (line 50) and `showCourse` state (line 49)**

Replace:
```tsx
const [showCourse, setShowCourse] = useState(false)
const [showLegProgress, setShowLegProgress] = useState(false)
const [showLegMap, setShowLegMap] = useState(false)
```

With:
```tsx
const [showLegMap, setShowLegMap] = useState(false)
```

- [ ] **Step 4: Simplify the auto-exit effect — remove `setShowLegProgress` (around line 115)**

Replace:
```tsx
useEffect(() => {
  setShowLegMap(false)
  setShowLegProgress(false)
}, [activeResultId])
```

With:
```tsx
useEffect(() => {
  setShowLegMap(false)
}, [activeResultId])
```

- [ ] **Step 5: Remove `if (showCourse)` full-screen block (around lines 186–194)**

Delete:
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

- [ ] **Step 6: Remove `if (showLegProgress)` full-screen block (around lines 196–211)**

Delete:
```tsx
if (showLegProgress && activeItem && activeItem.runner && activeItem.assignment && activeItem.result) return (
  <LegProgressScreen
    runner={activeItem.runner.name}
    town={activeItem.leg.handoff?.name ?? activeItem.leg.name}
    legN={activeItem.leg.legNumber}
    totalLegs={timeline.length || 18}
    distMiles={activeItem.leg.distanceMiles}
    startedAtMs={new Date(activeItem.result.startedAt).getTime()}
    targetPaceSecPerMile={activeItem.assignment.targetPaceSecPerMile}
    teamName={teamName}
    backLabel={`← ${teamName}`}
    onBack={() => setShowLegProgress(false)}
    onViewLegMap={() => { setShowLegProgress(false); setShowLegMap(true) }}
  />
)
```

- [ ] **Step 7: Make the "Est. Arrival" cell non-interactive in the hero card**

The "Est. Arrival" cell is a `<button onClick={() => setShowLegProgress(true)} ...>`. Replace the outer `<button>` with a `<div>` and remove the `→` arrow chip. The content (label, time, "BY PACE" text) stays. Find this block (inside the hero card's "Three readouts" flex row):

Replace:
```tsx
<button
  onClick={() => setShowLegProgress(true)}
  style={{ flex: '1 1 0', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
    textAlign: 'center', minHeight: 44, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center' }}
>
  <div className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(19,17,10,0.55)', marginBottom: 2 }}>Est. Arrival</div>
  <div className="font-mono" style={{ fontSize: 34, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
    {formatTime(String(activeItem.eta.eta))}
  </div>
  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
    <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 10,
      opacity: 0.85, letterSpacing: '0.06em', color: 'var(--ink)' }}>BY PACE</span>
    <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 9,
      letterSpacing: '0.06em', background: 'rgba(0,0,0,0.18)', padding: '2px 7px',
      borderRadius: 20, color: 'var(--ink)' }}>→</span>
  </div>
</button>
```

With:
```tsx
<div style={{ flex: '1 1 0', padding: 0,
  textAlign: 'center', minHeight: 44, display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center' }}>
  <div className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(19,17,10,0.55)', marginBottom: 2 }}>Est. Arrival</div>
  <div className="font-mono" style={{ fontSize: 34, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
    {formatTime(String(activeItem.eta.eta))}
  </div>
  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
    <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 10,
      opacity: 0.85, letterSpacing: '0.06em', color: 'var(--ink)' }}>BY PACE</span>
  </div>
</div>
```

- [ ] **Step 8: Check for TypeScript errors**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker exec tsc --noEmit
```

Expected: no errors (there will be unused-variable warnings for `showCourse`/`showLegProgress` if any references remain — fix them before moving on)

- [ ] **Step 9: Commit**

```bash
git add apps/tracker/src/components/TeamDetail.tsx
git commit -m "feat(tracker): remove LegProgressScreen from TeamDetail navigation"
```

---

## Task 4: Update TeamDetail — replace Arrivals section with inline CourseScreen

**Files:**
- Modify: `apps/tracker/src/components/TeamDetail.tsx`

- [ ] **Step 1: Remove `projectedTimes` map (around lines 142–151)**

Delete this entire block:
```tsx
// Projected arrival times for not-started legs
const projectedTimes = new Map<string, Date>()
if (activeItem?.eta?.eta) {
  let anchor = new Date(String(activeItem.eta.eta))
  for (const item of sorted.filter(t => t.status === 'not-started')) {
    if (!item.assignment) continue
    const durationMs = item.assignment.targetPaceSecPerMile * item.leg.distanceMiles * 1000
    const arrival    = new Date(anchor.getTime() + durationMs)
    projectedTimes.set(item.leg.id, arrival)
    anchor = arrival
  }
}
```

- [ ] **Step 2: Remove the entire Arrivals section**

Find and delete the block starting with the "The Course" button and ending after the closing `</div>` of the `sorted.map(...)` section. This is the section that starts around:

```tsx
{/* The Course */}
<button
  onClick={() => setShowCourse(true)}
  ...
>
  <span className="font-display uppercase" style={{ fontSize: 24 }}>Arrivals</span>
  <span className="uppercase" style={{ ...}}>
    ALL {COURSE_LEGS.length} LEGS →
  </span>
</button>
<div className="uppercase mb-3" ...>
  {timeline.length} Handoffs
</div>

{timeline.length === 0 ? (
  <p style={{ fontSize: 13, color: 'var(--mut)' }}>No assignments yet.</p>
) : (
  <div className="flex flex-col gap-0.5">
    {sorted.map(item => {
      ...
    })}
  </div>
)}
```

Delete everything from `{/* The Course */}` through the closing `)}` of the ternary.

- [ ] **Step 3: Add inline `<CourseScreen>` in place of the removed section**

In the same location (inside `<div className="max-w-2xl mx-auto px-[18px] pt-4 pb-10">`), add at the end before the closing `</div>`:

```tsx
<CourseScreen
  currentLegNumber={allDone ? COURSE_LEGS.length + 1 : (activeItem?.leg.legNumber ?? 0)}
  raceStartedAt={raceStartedAt}
  teamName={teamName}
  timeline={timeline}
  assignedStartTime={assignedStartTime}
/>
```

- [ ] **Step 4: Check for TypeScript errors**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker exec tsc --noEmit
```

Expected: no errors. If `etaStatus`/`heroColor`/`heroBg`/`onDeckItem`/`sorted` show as unused, they are still used in the hero card — double-check before removing.

- [ ] **Step 5: Commit**

```bash
git add apps/tracker/src/components/TeamDetail.tsx
git commit -m "feat(tracker): replace Arrivals section with inline CourseScreen"
```

---

## Task 5: Update PreRaceScreen — replace trail with inline CourseScreen

**Files:**
- Modify: `apps/tracker/src/components/PreRaceScreen.tsx`

- [ ] **Step 1: Update React import — remove `Fragment`**

Replace:
```tsx
import { useState, useEffect, useMemo, Fragment } from 'react'
```
With:
```tsx
import { useState, useEffect, useMemo } from 'react'
```

- [ ] **Step 2: Update shared import — remove `mapPoint` and `mapRoute`**

Replace:
```tsx
import { COURSE_LEGS, mapPoint, mapRoute, TOTAL_COURSE_MILES } from '@kt82/shared'
```
With:
```tsx
import { COURSE_LEGS, TOTAL_COURSE_MILES } from '@kt82/shared'
```

- [ ] **Step 3: Add CourseScreen import**

After the existing imports, add:
```tsx
import { CourseScreen } from './CourseScreen'
```

- [ ] **Step 4: Remove `MapPin`, `TrailNode`, and `TrailLeg` components**

Delete all three component functions — they are only used in the route section being replaced.

`MapPin` (the local one inside PreRaceScreen, not the one in CourseScreen):
```tsx
function MapPin() {
  return (
    <svg width="8.5" height="11" viewBox="0 0 20 25" fill="none">
      ...
    </svg>
  )
}
```

`TrailNode` (the entire function definition).

`TrailLeg` (the entire function definition).

- [ ] **Step 5: Replace `schedule` memo with `finishTime` computation**

Replace:
```tsx
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

With:
```tsx
const finishTime = useMemo(() => {
  let ms = assignedStartTime.getTime()
  for (const courseLeg of COURSE_LEGS) {
    const item = timeline.find(t => t.leg.legNumber === courseLeg.legNumber)
    if (item?.assignment) ms += item.assignment.targetPaceSecPerMile * courseLeg.miles * 1000
  }
  return new Date(ms)
}, [assignedStartTime, timeline])
```

- [ ] **Step 6: Replace the "THE ROUTE" section with inline CourseScreen**

Find and delete the entire route section:
```tsx
{/* THE ROUTE */}
<div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24, marginTop: 14 }}>
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 18px 10px' }}>
    ...
  </div>
  <div style={{ padding: '0 18px' }}>
    <TrailNode ... />
    {schedule.map((s, i) => {
      ...
    })}
  </div>
  <div style={{ padding: '12px 18px 0', ... }}>
    Handoff times are estimates...
  </div>
</div>
```

Replace with:
```tsx
<div style={{ flex: 1, overflowY: 'auto' }}>
  <CourseScreen
    currentLegNumber={0}
    raceStartedAt={null}
    teamName={teamName}
    timeline={timeline}
    assignedStartTime={assignedStartTime}
  />
</div>
```

- [ ] **Step 7: Check for TypeScript errors**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker exec tsc --noEmit
```

Expected: no errors

- [ ] **Step 8: Commit**

```bash
git add apps/tracker/src/components/PreRaceScreen.tsx
git commit -m "feat(tracker): replace PreRaceScreen trail with inline CourseScreen"
```

---

## Task 6: Update APPS.md

**Files:**
- Modify: `APPS.md`

- [ ] **Step 1: Update the LegProgressScreen row in the Tracker table**

Find:
```markdown
| ↳ **LegProgressScreen** | `components/LegProgressScreen.tsx` | Same pace-scenario table as Driver's; shows projected finish for the active leg |
```

Replace with:
```markdown
| ↳ **LegProgressScreen** | `components/LegProgressScreen.tsx` | **No longer accessible from Tracker UI** (file retained; accessible in Driver via TimingScreen) |
```

- [ ] **Step 2: Commit**

```bash
git add APPS.md
git commit -m "docs: note LegProgressScreen inaccessible in Tracker after course refactor"
```

---

## Task 7: Verify with dev server

**Files:** none

- [ ] **Step 1: Start the dev stack**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" ./scripts/dev.sh
```

- [ ] **Step 2: Check pre-race view** — open Tracker at `http://localhost:5173`, pick a team that hasn't started yet (or use `?prerace` param). Verify:
  - Countdown clock is visible
  - Hero start→finish box is visible
  - Below the hero box: leg list with runner names and `~` projected start + ETA times for all legs
  - No "THE ROUTE" trail

- [ ] **Step 3: Check in-race view** — start a race (or use a seeded team with results). Verify:
  - Hero card shows active runner, ETA, leg time; Est. Arrival cell is no longer tappable
  - Below hero card: leg list shows completed legs with actual start/finish times, active leg with actual start + `~ETA`, upcoming legs with `~` projected times
  - No "Arrivals / ALL X LEGS →" button
  - Map button in hero card still navigates to LegMapScreen

- [ ] **Step 4: Check CourseScreen from Driver** — open Driver at `http://localhost:5176`, navigate to CourseScreen from TimingScreen. Verify it still works (back button present, no runner name data expected).
