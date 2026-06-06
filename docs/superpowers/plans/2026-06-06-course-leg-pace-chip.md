# Course Leg Pace Chip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a color-coded pace chip (actual pace + delta vs target) next to the runner name on each completed leg row in the CourseScreen.

**Architecture:** Both `apps/tracker` and `apps/driver` have their own `CourseScreen.tsx` with identical `LegRow` component structure and `legDataMap` logic. Changes are made to each file independently. A `formatPace` module-level helper formats seconds-per-mile as `M:SS`. The `LegData` type gains an optional `pace` field computed only for completed legs with an assignment.

**Tech Stack:** React, TypeScript, inline styles (no Tailwind color classes), design tokens via CSS vars (`--green`, `--accent`, `--mut`)

---

### Task 1: Add pace chip to tracker CourseScreen

**Files:**
- Modify: `apps/tracker/src/components/CourseScreen.tsx`

- [ ] **Step 1: Add `formatPace` helper after `fmtMs`**

In `apps/tracker/src/components/CourseScreen.tsx`, find the `fmtMs` function (lines ~17–19) and add `formatPace` immediately after:

```ts
function fmtMs(ms: number): string {
  return formatTime(new Date(ms).toISOString())
}

function formatPace(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
```

- [ ] **Step 2: Extend `LegData` type with optional `pace` field**

In the `CourseScreen` function body, find the `LegData` type declaration (line ~197):

Replace:
```ts
type LegData = { runnerName: string | null; startTime: string | null; endTime: string | null; endLabel: 'Finish' | 'ETA' }
```

With:
```ts
type LegData = {
  runnerName: string | null
  startTime: string | null
  endTime: string | null
  endLabel: 'Finish' | 'ETA'
  pace?: { actualSecPerMile: number; deltaSecPerMile: number }
}
```

- [ ] **Step 3: Compute pace in the `legDataMap` completed branch**

Find the completed leg branch in `legDataMap` (line ~207):

Replace:
```ts
if (item.status === 'completed' && item.result?.startedAt && item.result?.finishedAt) {
  map.set(item.leg.legNumber, {
    runnerName,
    startTime: formatTime(item.result.startedAt),
    endTime: formatTime(item.result.finishedAt),
    endLabel: 'Finish',
  })
```

With:
```ts
if (item.status === 'completed' && item.result?.startedAt && item.result?.finishedAt) {
  const elapsedSec = (new Date(item.result.finishedAt).getTime() - new Date(item.result.startedAt).getTime()) / 1000
  const actualSecPerMile = elapsedSec / item.leg.distanceMiles
  const pace = item.assignment
    ? { actualSecPerMile, deltaSecPerMile: actualSecPerMile - item.assignment.targetPaceSecPerMile }
    : undefined
  map.set(item.leg.legNumber, {
    runnerName,
    startTime: formatTime(item.result.startedAt),
    endTime: formatTime(item.result.finishedAt),
    endLabel: 'Finish',
    pace,
  })
```

- [ ] **Step 4: Add `pace` prop to `LegRow` and render the chip**

Find the `LegRow` function signature and props interface (lines ~65–74):

Replace:
```ts
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
```

With:
```ts
function LegRow({ leg, state, isNextUp, isLast, runnerName, startTime, endTime, endLabel, pace }: {
  leg: CourseLeg
  state: 'done' | 'now' | 'upcoming'
  isNextUp: boolean
  isLast: boolean
  runnerName?: string | null
  startTime?: string | null
  endTime?: string | null
  endLabel?: 'Finish' | 'ETA'
  pace?: { actualSecPerMile: number; deltaSecPerMile: number } | null
}) {
  const isDone = state === 'done'
  const isNow  = state === 'now'
```

- [ ] **Step 5: Build the chip element before the return**

In the `LegRow` function body, after the color variable declarations and before the `return`, add:

```ts
let paceChipEl: JSX.Element | null = null
if (isDone && pace) {
  const faster = pace.deltaSecPerMile < 0
  const chipColor = faster ? 'var(--green)' : 'var(--accent)'
  const chipBg = faster
    ? 'color-mix(in srgb, var(--green) 13%, transparent)'
    : 'color-mix(in srgb, var(--accent) 13%, transparent)'
  const sign = pace.deltaSecPerMile < 0 ? '−' : '+'
  const absDelta = Math.abs(pace.deltaSecPerMile)
  paceChipEl = (
    <span style={{
      fontFamily: "'Hanken Grotesk', sans-serif",
      fontWeight: 800,
      fontSize: 9.5,
      letterSpacing: '0.04em',
      color: chipColor,
      background: chipBg,
      padding: '4px 8px',
      borderRadius: 999,
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {formatPace(pace.actualSecPerMile)} {sign}{formatPace(absDelta)}
    </span>
  )
}
```

- [ ] **Step 6: Update the row-1 flex container to insert the chip**

Find the "Cols 2–3, row 1: runner name + difficulty chip" div (line ~133):

Replace:
```tsx
{/* Cols 2–3, row 1: runner name + difficulty chip */}
<div style={{ gridColumn: '2 / 4', gridRow: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  paddingBottom: 5 }}>
  <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, fontWeight: 800,
    color: runnerName ? nameColor : 'var(--faint)' }}>
    {runnerName ?? '—'}
  </span>
  <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 11,
    color: 'var(--faint)', flexShrink: 0 }}>
    {leg.miles} mi
  </span>
</div>
```

With:
```tsx
{/* Cols 2–3, row 1: runner name + pace chip + mileage */}
<div style={{ gridColumn: '2 / 4', gridRow: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: 6, paddingBottom: 5 }}>
  <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, fontWeight: 800,
    color: runnerName ? nameColor : 'var(--faint)',
    flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
    {runnerName ?? '—'}
  </span>
  {paceChipEl}
  <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 11,
    color: 'var(--faint)', flexShrink: 0 }}>
    {leg.miles} mi
  </span>
</div>
```

- [ ] **Step 7: Pass `pace` through in the leg list render**

Find the `LegRow` call in the leg list (line ~398):

Replace:
```tsx
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
```

With:
```tsx
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
  pace={data?.pace}
/>
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add apps/tracker/src/components/CourseScreen.tsx
git commit -m "feat(tracker): show pace chip on completed legs in CourseScreen"
```

---

### Task 2: Add pace chip to driver CourseScreen

**Files:**
- Modify: `apps/driver/src/components/CourseScreen.tsx`

The driver's `CourseScreen.tsx` is structurally identical to the tracker's. Apply the same changes.

- [ ] **Step 1: Add `formatPace` helper after `fmtMs`**

In `apps/driver/src/components/CourseScreen.tsx`, find `fmtMs` (line ~17) and add immediately after:

```ts
function fmtMs(ms: number): string {
  return formatTime(new Date(ms).toISOString())
}

function formatPace(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
```

- [ ] **Step 2: Extend `LegData` type with optional `pace` field**

Find the `LegData` type in the `CourseScreen` function body (line ~210):

Replace:
```ts
type LegData = { runnerName: string | null; startTime: string | null; endTime: string | null; endLabel: 'Finish' | 'ETA' }
```

With:
```ts
type LegData = {
  runnerName: string | null
  startTime: string | null
  endTime: string | null
  endLabel: 'Finish' | 'ETA'
  pace?: { actualSecPerMile: number; deltaSecPerMile: number }
}
```

- [ ] **Step 3: Compute pace in the `legDataMap` completed branch**

Find the completed branch (line ~218):

Replace:
```ts
if (item.status === 'completed' && item.result?.startedAt && item.result?.finishedAt) {
  map.set(item.leg.legNumber, { runnerName, startTime: formatTime(item.result.startedAt), endTime: formatTime(item.result.finishedAt), endLabel: 'Finish' })
```

With:
```ts
if (item.status === 'completed' && item.result?.startedAt && item.result?.finishedAt) {
  const elapsedSec = (new Date(item.result.finishedAt).getTime() - new Date(item.result.startedAt).getTime()) / 1000
  const actualSecPerMile = elapsedSec / item.leg.distanceMiles
  const pace = item.assignment
    ? { actualSecPerMile, deltaSecPerMile: actualSecPerMile - item.assignment.targetPaceSecPerMile }
    : undefined
  map.set(item.leg.legNumber, { runnerName, startTime: formatTime(item.result.startedAt), endTime: formatTime(item.result.finishedAt), endLabel: 'Finish', pace })
```

- [ ] **Step 4: Add `pace` prop to `LegRow` and render the chip**

Find the `LegRow` signature (line ~65):

Replace:
```ts
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
```

With:
```ts
function LegRow({ leg, state, isNextUp, isLast, runnerName, startTime, endTime, endLabel, pace }: {
  leg: CourseLeg
  state: 'done' | 'now' | 'upcoming'
  isNextUp: boolean
  isLast: boolean
  runnerName?: string | null
  startTime?: string | null
  endTime?: string | null
  endLabel?: 'Finish' | 'ETA'
  pace?: { actualSecPerMile: number; deltaSecPerMile: number } | null
}) {
  const isDone = state === 'done'
  const isNow  = state === 'now'
```

- [ ] **Step 5: Build the chip element before the return**

After the color variable declarations and before the `return`, add:

```ts
let paceChipEl: JSX.Element | null = null
if (isDone && pace) {
  const faster = pace.deltaSecPerMile < 0
  const chipColor = faster ? 'var(--green)' : 'var(--accent)'
  const chipBg = faster
    ? 'color-mix(in srgb, var(--green) 13%, transparent)'
    : 'color-mix(in srgb, var(--accent) 13%, transparent)'
  const sign = pace.deltaSecPerMile < 0 ? '−' : '+'
  const absDelta = Math.abs(pace.deltaSecPerMile)
  paceChipEl = (
    <span style={{
      fontFamily: "'Hanken Grotesk', sans-serif",
      fontWeight: 800,
      fontSize: 9.5,
      letterSpacing: '0.04em',
      color: chipColor,
      background: chipBg,
      padding: '4px 8px',
      borderRadius: 999,
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      {formatPace(pace.actualSecPerMile)} {sign}{formatPace(absDelta)}
    </span>
  )
}
```

- [ ] **Step 6: Update the row-1 flex container to insert the chip**

Find the "Cols 2–3, row 1: runner name + mileage" div (line ~133):

Replace:
```tsx
{/* Cols 2–3, row 1: runner name + mileage */}
<div style={{ gridColumn: '2 / 4', gridRow: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  paddingBottom: 5 }}>
  <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, fontWeight: 800,
    color: runnerName ? nameColor : 'var(--faint)' }}>
    {runnerName ?? '—'}
  </span>
  <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 11,
    color: 'var(--faint)', flexShrink: 0 }}>
    {leg.miles} mi
  </span>
</div>
```

With:
```tsx
{/* Cols 2–3, row 1: runner name + pace chip + mileage */}
<div style={{ gridColumn: '2 / 4', gridRow: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  gap: 6, paddingBottom: 5 }}>
  <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, fontWeight: 800,
    color: runnerName ? nameColor : 'var(--faint)',
    flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
    {runnerName ?? '—'}
  </span>
  {paceChipEl}
  <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 11,
    color: 'var(--faint)', flexShrink: 0 }}>
    {leg.miles} mi
  </span>
</div>
```

- [ ] **Step 7: Pass `pace` through in the leg list render**

Find the `LegRow` call (line ~377):

Replace:
```tsx
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
```

With:
```tsx
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
  pace={data?.pace}
/>
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add apps/driver/src/components/CourseScreen.tsx
git commit -m "feat(driver): show pace chip on completed legs in CourseScreen"
```

---

### Task 3: Manual verification

**Files:** none

- [ ] **Step 1: Start the dev stack**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" ./scripts/dev.sh
```

- [ ] **Step 2: Verify completed legs show the pace chip**

Open the tracker at `http://localhost:5173` and navigate to The Course for a team that has completed at least one leg.

Check:
- Completed legs show a pill chip between the runner name and mileage
- Chip text format: `M:SS +M:SS` or `M:SS −M:SS`
- Faster-than-target chip is green
- Slower-than-target chip is orange/accent
- In-progress and upcoming legs show no chip
- Legs with no assignment (no target pace) show no chip

- [ ] **Step 3: Verify in driver app**

Open the driver at `http://localhost:5176` → Course screen.

Same checks as Step 2.

- [ ] **Step 4: Verify name truncation on narrow screens**

In browser DevTools, set viewport to 375px wide. Confirm that long runner names truncate with `…` rather than overflowing into or behind the chip.
