# Leg Progress Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "When do they arrive?" leg-progress detail screen to both the Driver and Tracker apps, showing an estimated position bar and a pace-swept ETA table for the live leg.

**Architecture:** A new `lpEstimates()` utility in `packages/shared` computes five ETA scenarios (target pace ±30 s/mi in 15 s steps). The Driver adds a `leg-progress` view type to its discriminated-union navigation. The Tracker adds local `showLegProgress` state in `TeamDetail`, same pattern as `showCourse`. Both apps get their own `LegProgressScreen.tsx` (identical component, per-app as the existing `CourseScreen` pattern).

**Tech Stack:** React + TypeScript, Vite, Tailwind (CSS classes only for layout utilities), CSS custom properties (`var(--accent)` etc.), `@kt82/shared` workspace package.

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `packages/shared/src/eta.ts` | Modify | Add `LPEstimate` interface, `lpEstimates()` |
| `packages/shared/src/__tests__/eta.test.ts` | Modify | Add `lpEstimates` tests |
| `server/src/routes/results.ts` | Modify | Add `targetPaceSecPerMile` to `/current` response |
| `server/src/__tests__/results.test.ts` | Modify | Assert new field present |
| `apps/driver/src/api.ts` | Modify | Add `targetPaceSecPerMile` to `CurrentStateInProgress` |
| `apps/driver/src/App.tsx` | Modify | Add `leg-progress` view type + `targetPaceSecPerMile` to `racing`/`course` types; new handlers + render case |
| `apps/driver/src/components/TimingScreen.tsx` | Modify | Add `onViewLegProgress` prop + "WHEN DO THEY ARRIVE?" button |
| `apps/driver/src/components/LegProgressScreen.tsx` | Create | New component |
| `apps/tracker/src/components/LegProgressScreen.tsx` | Create | New component (identical to driver's) |
| `apps/tracker/src/components/TeamDetail.tsx` | Modify | Add `showLegProgress` state, tappable EST. ARRIVAL entry point |

---

## Task 1: `lpEstimates()` in shared package

**Files:**
- Modify: `packages/shared/src/__tests__/eta.test.ts`
- Modify: `packages/shared/src/eta.ts`

- [ ] **Step 1.1: Update the import and add tests to `packages/shared/src/__tests__/eta.test.ts`**

Change the first line from:
```ts
import { calculateETA } from '../eta'
```
to:
```ts
import { calculateETA, lpEstimates } from '../eta'
```

Then after the closing `})` of the existing `calculateETA` describe block, append:

```ts
describe('lpEstimates', () => {
  const startedAtMs = 1_000_000_000
  const distMiles = 5
  const pace = 540 // 9:00/mi → 2700s total

  it('returns 5 estimates in fastest-to-slowest order', () => {
    const ests = lpEstimates(startedAtMs, startedAtMs + 60_000, distMiles, pace)
    expect(ests).toHaveLength(5)
    expect(ests.map(e => e.off)).toEqual([-30, -15, 0, 15, 30])
  })

  it('index 2 is the target pace with deltaSec 0', () => {
    const ests = lpEstimates(startedAtMs, startedAtMs + 60_000, distMiles, pace)
    expect(ests[2].p).toBe(pace)
    expect(ests[2].deltaSec).toBe(0)
    expect(ests[2].off).toBe(0)
  })

  it('frac is clamped between 0 and 1', () => {
    const ests = lpEstimates(startedAtMs, startedAtMs + 99_999_999, distMiles, pace)
    ests.forEach(e => {
      expect(e.frac).toBeGreaterThanOrEqual(0)
      expect(e.frac).toBeLessThanOrEqual(1)
    })
  })

  it('remain is 0 and arrived is true past finish time', () => {
    const finishMs = startedAtMs + distMiles * pace * 1000
    const ests = lpEstimates(startedAtMs, finishMs + 5_000, distMiles, pace)
    expect(ests[2].remain).toBe(0)
    expect(ests[2].arrived).toBe(true)
  })

  it('fastest pace (index 0) finishes before slowest (index 4)', () => {
    const ests = lpEstimates(startedAtMs, startedAtMs + 60_000, distMiles, pace)
    expect(ests[0].finishMs).toBeLessThan(ests[4].finishMs)
  })

  it('total equals distMiles × p', () => {
    const ests = lpEstimates(startedAtMs, startedAtMs + 60_000, distMiles, pace)
    ests.forEach(e => expect(e.total).toBeCloseTo(distMiles * e.p, 5))
  })
})
```

- [ ] **Step 1.2: Run tests to confirm they fail**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter @kt82/shared test
```

Expected: fails with `lpEstimates is not a function` or similar.

- [ ] **Step 1.3: Implement `lpEstimates` in `packages/shared/src/eta.ts`**

After the existing `calculateETA` function, append:

```ts
export interface LPEstimate {
  off: number      // sec/mile offset from target (-30 to +30)
  p: number        // adjusted pace (sec/mile)
  total: number    // total leg time at this pace (seconds)
  frac: number     // estimated fraction of leg done (0–1)
  finishMs: number // estimated finish time (ms epoch)
  remain: number   // seconds remaining from nowMs (≥ 0)
  deltaSec: number // arrival delta vs target: distMiles × off
  arrived: boolean // nowMs >= finishMs
}

export function lpEstimates(
  startedAtMs: number,
  nowMs: number,
  distMiles: number,
  targetPaceSecPerMile: number
): LPEstimate[] {
  const elapsed = Math.max(0, (nowMs - startedAtMs) / 1000)
  return [-30, -15, 0, 15, 30].map((off) => {
    const p = targetPaceSecPerMile + off
    const total = distMiles * p
    const frac = distMiles > 0 ? Math.min(1, Math.max(0, elapsed / p / distMiles)) : 0
    const finishMs = startedAtMs + total * 1000
    return {
      off,
      p,
      total,
      frac,
      finishMs,
      remain: Math.max(0, (finishMs - nowMs) / 1000),
      deltaSec: distMiles * off,
      arrived: nowMs >= finishMs,
    }
  })
}
```

- [ ] **Step 1.4: Run tests to confirm they pass**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter @kt82/shared test
```

Expected: all tests PASS.

- [ ] **Step 1.5: Commit**

```bash
git add packages/shared/src/eta.ts packages/shared/src/__tests__/eta.test.ts
git commit -m "feat(shared): add lpEstimates() for pace-swept leg progress calculation"
```

---

## Task 2: Server exposes `targetPaceSecPerMile` in `/current` response

**Files:**
- Modify: `server/src/__tests__/results.test.ts`
- Modify: `server/src/routes/results.ts`

- [ ] **Step 2.1: Add assertion to existing in-progress test in `server/src/__tests__/results.test.ts`**

Find the test `it('returns in-progress with ETA when leg is active'` (line ~23). After the line `expect(res.body.currentRunner.name).toBe(member.name)`, add:

```ts
expect(res.body.targetPaceSecPerMile).toBe(480)
```

The `480` matches the pace passed to `createAssignment(team.id, leg.id, member.id, 480)` already in that test.

- [ ] **Step 2.2: Run to confirm failure**

```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test src/__tests__/results.test.ts
```

Expected: `AssertionError: expected undefined to be 480`

- [ ] **Step 2.3: Add field to `server/src/routes/results.ts`**

In the `res.json({...})` call (around line 88), add one line at the end:

```ts
res.json({
  status: 'in-progress',
  result: serializeResult(activeResult),
  currentLeg: activeResult.leg,
  nextHandoff: activeResult.leg.handoff,
  currentRunner: assignment?.teamMember ?? null,
  assignment,
  eta,
  raceStartedAt: (firstResult ?? activeResult).startedAt.toISOString(),
  nextRunner: nextAssignment?.teamMember ?? null,
  nextLeg: nextAssignment?.leg ?? null,
  nextRunnerEta,
  targetPaceSecPerMile: assignment?.targetPaceSecPerMile ?? null,
})
```

- [ ] **Step 2.4: Run to confirm pass**

```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test src/__tests__/results.test.ts
```

Expected: all tests PASS.

- [ ] **Step 2.5: Commit**

```bash
git add server/src/routes/results.ts server/src/__tests__/results.test.ts
git commit -m "feat(server): include targetPaceSecPerMile in in-progress current-state response"
```

---

## Task 3: Driver app — types and view state

**Files:**
- Modify: `apps/driver/src/api.ts`
- Modify: `apps/driver/src/App.tsx`

- [ ] **Step 3.1: Add field to `CurrentStateInProgress` in `apps/driver/src/api.ts`**

Find the `CurrentStateInProgress` type and add `targetPaceSecPerMile: number | null` as the last field:

```ts
export type CurrentStateInProgress = {
  status: 'in-progress'
  result: { id: string; teamId: string; legId: string; startedAt: string; finishedAt: null }
  currentLeg: Leg
  nextHandoff: Handoff | null
  currentRunner: TeamMember | null
  eta: { eta: string; secondsRemaining: number; status: 'on-pace' | 'ahead' | 'overdue' } | null
  raceStartedAt: string | null
  nextRunner: TeamMember | null
  nextLeg: Leg | null
  nextRunnerEta: string | null
  targetPaceSecPerMile: number | null
}
```

- [ ] **Step 3.2: Update `View` union in `apps/driver/src/App.tsx`**

Replace the entire `View` type declaration with:

```ts
type View =
  | { type: 'loading' }
  | { type: 'no-race' }
  | { type: 'auth'; race: Race }
  | { type: 'start'; race: Race; team: TeamSummary; pin: string; nextLeg: Leg; nextRunner: string | null }
  | { type: 'racing'; race: Race; team: TeamSummary; pin: string; resultId: string | null; leg: Leg; startedAt: string; nextHandoff: Handoff | null; currentRunner: string | null; raceStartedAt: string | null; nextRunner: string | null; nextLeg: Leg | null; nextRunnerEta: string | null; targetPaceSecPerMile: number | null }
  | { type: 'course'; race: Race; team: TeamSummary; pin: string; resultId: string | null; leg: Leg; startedAt: string; nextHandoff: Handoff | null; currentRunner: string | null; raceStartedAt: string | null; nextRunner: string | null; nextLeg: Leg | null; nextRunnerEta: string | null; targetPaceSecPerMile: number | null }
  | { type: 'leg-progress'; race: Race; team: TeamSummary; pin: string; resultId: string | null; leg: Leg; startedAt: string; nextHandoff: Handoff | null; currentRunner: string | null; raceStartedAt: string | null; nextRunner: string | null; nextLeg: Leg | null; nextRunnerEta: string | null; targetPaceSecPerMile: number | null }
  | { type: 'complete'; race: Race; team: TeamSummary; pin: string }
```

- [ ] **Step 3.3: Add `targetPaceSecPerMile` to every `racing` view construction in `apps/driver/src/App.tsx`**

There are 5 places. In each, add `targetPaceSecPerMile` as shown:

**Location 1 — `handleAuth` else branch (sets racing from initial in-progress state):**
```ts
setView({
  type: 'racing', race, team, pin,
  resultId: state.result.id,
  leg: state.currentLeg,
  startedAt: state.result.startedAt,
  nextHandoff: state.nextHandoff,
  currentRunner: state.currentRunner?.name ?? null,
  raceStartedAt: state.raceStartedAt ?? null,
  nextRunner: state.nextRunner?.name ?? null,
  nextLeg: state.nextLeg ?? null,
  nextRunnerEta: state.nextRunnerEta ?? null,
  targetPaceSecPerMile: state.targetPaceSecPerMile ?? null,
})
```

**Location 2 — `handleStart`:**
```ts
setView({
  type: 'racing', race: v.race, team: v.team, pin: v.pin,
  resultId: state.result.id,
  leg: state.currentLeg,
  startedAt: state.result.startedAt,
  nextHandoff: state.nextHandoff,
  currentRunner: state.currentRunner?.name ?? null,
  raceStartedAt: state.raceStartedAt ?? null,
  nextRunner: state.nextRunner?.name ?? null,
  nextLeg: state.nextLeg ?? null,
  nextRunnerEta: state.nextRunnerEta ?? null,
  targetPaceSecPerMile: state.targetPaceSecPerMile ?? null,
})
```

**Location 3 — `handleLapPress` optimistic advance (new leg, pace unknown yet):**
```ts
setView({
  type: 'racing', race, team, pin,
  resultId: null,
  leg: nextLeg,
  startedAt: finishedAt,
  nextHandoff: nextLeg.handoff ?? null,
  currentRunner: v.nextRunner,
  raceStartedAt: v.raceStartedAt,
  nextRunner: null,
  nextLeg: null,
  nextRunnerEta: null,
  targetPaceSecPerMile: null,
})
```

**Location 4 — `handleLapPress` GET after PATCH (enriches view with server state):**
```ts
setView(prev => (prev.type !== 'racing' && prev.type !== 'course') ? prev : {
  ...prev,
  resultId: state.result.id,
  nextLeg: state.nextLeg ?? null,
  nextRunner: state.nextRunner?.name ?? null,
  nextRunnerEta: state.nextRunnerEta ?? null,
  targetPaceSecPerMile: state.targetPaceSecPerMile ?? null,
})
```

**Location 5 — pending action retry loop GET:**
```ts
setView(prev => prev.type !== 'racing' ? prev : {
  ...prev,
  resultId: state.result.id,
  nextLeg: state.nextLeg ?? null,
  nextRunner: state.nextRunner?.name ?? null,
  nextRunnerEta: state.nextRunnerEta ?? null,
  targetPaceSecPerMile: state.targetPaceSecPerMile ?? null,
})
```

- [ ] **Step 3.4: Confirm TypeScript compiles**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver build 2>&1 | head -40
```

Expected: zero errors.

- [ ] **Step 3.5: Commit**

```bash
git add apps/driver/src/api.ts apps/driver/src/App.tsx
git commit -m "feat(driver): add targetPaceSecPerMile to view state + leg-progress view type"
```

---

## Task 4: Driver `LegProgressScreen` component

**Files:**
- Create: `apps/driver/src/components/LegProgressScreen.tsx`

No new CSS needed — `apps/driver/src/index.css` already defines `.live-dot` with the same 1.5 s pulse animation.

- [ ] **Step 4.1: Create `apps/driver/src/components/LegProgressScreen.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { lpEstimates } from '@kt82/shared'

function lpDur(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = (s % 60).toString().padStart(2, '0')
  const mm = m.toString().padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`
}

function lpPace(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function lpSigned(sec: number): string {
  if (sec === 0) return '—'
  const sign = sec > 0 ? '+' : '−'
  return sign + lpPace(Math.abs(sec))
}

function lpClock(ms: number): { full: string; ap: string } {
  const d = new Date(ms)
  const h = d.getHours() % 12 || 12
  const m = d.getMinutes().toString().padStart(2, '0')
  return { full: `${h}:${m}`, ap: d.getHours() < 12 ? 'AM' : 'PM' }
}

function lpTag(off: number): string {
  return off === -30 ? 'FASTEST' : off === 30 ? 'SLOWEST' : off === 0 ? 'TARGET' : ''
}

interface Props {
  runner: string
  town: string
  legN: number
  totalLegs: number
  distMiles: number
  startedAtMs: number
  targetPaceSecPerMile: number
  teamName: string
  backLabel: string
  onBack: () => void
}

export function LegProgressScreen({
  runner, town, legN, totalLegs, distMiles,
  startedAtMs, targetPaceSecPerMile, teamName,
  backLabel, onBack,
}: Props) {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1_000)
    return () => clearInterval(id)
  }, [])

  const ests = lpEstimates(startedAtMs, nowMs, distMiles, targetPaceSecPerMile)
  const target = ests[2]
  const minFrac = ests[ests.length - 1].frac
  const maxFrac = ests[0].frac

  const MIN_SPAN = 0.10
  const half = Math.max((maxFrac - minFrac) / 2, MIN_SPAN / 2)
  const visMin = Math.max(0, target.frac - half)
  const visMax = Math.min(1, target.frac + half)
  const L = visMin * 100
  const R = visMax * 100
  const W = R - L
  const pct = Math.round(target.frac * 100)
  const milesIn = target.frac * distMiles

  const cols = [
    { label: 'PACE',     flex: '0 0 52px', align: 'left'  as const },
    { label: 'ARRIVES',  flex: '1 1 0',    align: 'right' as const },
    { label: 'IN',       flex: '0 0 58px', align: 'right' as const },
    { label: 'Δ',        flex: '0 0 50px', align: 'right' as const },
    { label: 'LEG TIME', flex: '0 0 56px', align: 'right' as const },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Hanken Grotesk', sans-serif" }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px' }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mut)',
            fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 12,
            letterSpacing: '0.04em', padding: 0, whiteSpace: 'nowrap', minHeight: 44 }}
        >
          {backLabel}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="live-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
          <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', color: 'var(--mut)' }}>LIVE</span>
        </div>
      </div>

      {/* Title block */}
      <div style={{ padding: '4px 18px 0' }}>
        <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.13em', color: 'var(--accent)', textTransform: 'uppercase' }}>
          LEG {legN} OF {totalLegs} · {teamName.toUpperCase()}
        </div>
        <div className="font-display uppercase" style={{ fontSize: 44, lineHeight: 0.92, marginTop: 7 }}>
          {runner}
        </div>
        <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 12, letterSpacing: '0.04em', color: 'var(--mut)', marginTop: 9 }}>
          → {town.toUpperCase()} · {distMiles.toFixed(1)} MI · TARGET{' '}
          <span className="font-mono" style={{ fontWeight: 700, color: 'var(--text)' }}>{lpPace(targetPaceSecPerMile)}</span>/MI
        </div>
      </div>

      {/* Progress bar block */}
      <div style={{ padding: '18px 18px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
          <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 10, letterSpacing: '0.1em', color: 'var(--mut)', whiteSpace: 'nowrap' }}>
            ESTIMATED POSITION · NOW
          </span>
          <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 11, color: 'var(--accent)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
            ≈{milesIn.toFixed(1)} OF {distMiles.toFixed(1)} MI
          </span>
        </div>

        {/* Bar — layered absolute divs inside a 30px relative container */}
        <div style={{ position: 'relative', height: 30 }}>
          {/* Track */}
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 12, transform: 'translateY(-50%)', borderRadius: 20, background: 'var(--line)' }} />
          {/* Solid fill up to visMin */}
          <div style={{ position: 'absolute', top: '50%', left: 0, width: `${L}%`, height: 12, transform: 'translateY(-50%)', borderRadius: '20px 0 0 20px', background: 'var(--accent)' }} />
          {/* Range span at ~40% alpha */}
          <div style={{ position: 'absolute', top: '50%', left: `${L}%`, width: `${W}%`, height: 12, transform: 'translateY(-50%)', background: 'color-mix(in srgb, var(--accent) 40%, transparent)' }} />
          {/* Left end-cap */}
          <div style={{ position: 'absolute', top: '50%', left: `${L}%`, transform: 'translate(-50%, -50%)', width: 3.5, height: 26, borderRadius: 2, background: 'var(--accent)' }} />
          {/* Right end-cap */}
          <div style={{ position: 'absolute', top: '50%', left: `${R}%`, transform: 'translate(-50%, -50%)', width: 3.5, height: 26, borderRadius: 2, background: 'var(--accent)' }} />
          {/* Best-estimate notch (panel = white in dark theme) */}
          <div style={{ position: 'absolute', top: '50%', left: `${target.frac * 100}%`, transform: 'translate(-50%, -50%)', width: 3, height: 18, borderRadius: 2, background: 'var(--panel)' }} />
        </div>

        {/* Scale row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 11 }}>
          <span className="font-mono" style={{ fontSize: 10, color: 'var(--faint)' }}>0 mi · handoff</span>
          <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 10, color: 'var(--mut)', whiteSpace: 'nowrap' }}>
            likely range · ≈{pct}% in
          </span>
          <span className="font-mono" style={{ fontSize: 10, color: 'var(--faint)' }}>{distMiles.toFixed(1)} mi · finish</span>
        </div>
      </div>

      {/* Arrival table */}
      <div style={{ padding: '14px 18px 26px' }}>
        <div className="font-display uppercase" style={{ fontSize: 20, letterSpacing: '0.02em', marginBottom: 8 }}>
          Arrival by pace
        </div>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'flex', gap: 8, padding: '9px 14px', borderBottom: '1px solid var(--line)' }}>
            {cols.map(col => (
              <span key={col.label} style={{ flex: col.flex, textAlign: col.align, fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 8.5, letterSpacing: '0.08em', color: 'var(--faint)' }}>
                {col.label}
              </span>
            ))}
          </div>

          {/* 5 data rows — fastest first */}
          {ests.map((e, i) => {
            const isTarget = e.off === 0
            const c = lpClock(e.finishMs)
            const tag = lpTag(e.off)
            const deltaColor = e.deltaSec > 0 ? 'var(--red)' : e.deltaSec < 0 ? 'var(--green)' : 'var(--mut)'
            return (
              <div
                key={e.off}
                style={{
                  display: 'flex', gap: 8, alignItems: 'center', padding: '11px 14px',
                  background: isTarget ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent',
                  borderBottom: i < ests.length - 1 ? '1px solid var(--line2)' : 'none',
                }}
              >
                <span style={{ flex: '0 0 52px' }}>
                  <span className="font-mono" style={{ fontWeight: 700, fontSize: 14, color: isTarget ? 'var(--accent)' : 'var(--text)' }}>
                    {lpPace(e.p)}
                  </span>
                  {tag && (
                    <span style={{ display: 'block', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 7, letterSpacing: '0.06em', color: 'var(--faint)', marginTop: 2 }}>
                      {tag}
                    </span>
                  )}
                </span>
                <span style={{ flex: '1 1 0', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <span className="font-mono" style={{ fontWeight: 700, fontSize: 14.5, color: isTarget ? 'var(--accent)' : 'var(--text)' }}>
                    {c.full}
                  </span>
                  <span className="font-mono" style={{ fontSize: 9, color: 'var(--mut)' }}> {c.ap}</span>
                </span>
                <span className="font-mono" style={{ flex: '0 0 58px', textAlign: 'right', fontSize: 12.5, color: 'var(--mut)', whiteSpace: 'nowrap' }}>
                  {lpDur(e.remain)}
                </span>
                <span className="font-mono" style={{ flex: '0 0 50px', textAlign: 'right', fontWeight: 700, fontSize: 12, color: deltaColor, whiteSpace: 'nowrap' }}>
                  {e.deltaSec === 0 ? '—' : lpSigned(e.deltaSec)}
                </span>
                <span className="font-mono" style={{ flex: '0 0 56px', textAlign: 'right', fontSize: 12.5, color: 'var(--mut)', whiteSpace: 'nowrap' }}>
                  {lpDur(e.total)}
                </span>
              </div>
            )
          })}
        </div>

        <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, fontSize: 10.5, color: 'var(--faint)', marginTop: 10, lineHeight: 1.4 }}>
          Position barely shifts with pace — but arrival can swing several minutes. Plan warm-ups off the spread, not a single time.
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4.2: Confirm TypeScript compiles**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver build 2>&1 | head -40
```

Expected: zero errors.

- [ ] **Step 4.3: Commit**

```bash
git add apps/driver/src/components/LegProgressScreen.tsx
git commit -m "feat(driver): add LegProgressScreen component (Direction A)"
```

---

## Task 5: Driver wiring — TimingScreen button + App.tsx navigation

**Files:**
- Modify: `apps/driver/src/components/TimingScreen.tsx`
- Modify: `apps/driver/src/App.tsx`

- [ ] **Step 5.1: Add `onViewLegProgress` prop to `TimingScreen`'s `Props` interface**

In `apps/driver/src/components/TimingScreen.tsx`, add to the `Props` interface:

```ts
onViewLegProgress: (() => void) | null
```

Also add it to the destructured params in the function signature:
```ts
export function TimingScreen({ team, pin, resultId, leg, startedAt, nextHandoff,
  currentRunner, raceStartedAt, onLapPress, onComplete,
  nextRunner, nextLeg, nextRunnerEta, onViewCourse, onViewLegProgress }: Props) {
```

- [ ] **Step 5.2: Add the "WHEN DO THEY ARRIVE?" button to `TimingScreen`**

In the body JSX, locate the `{/* On Deck strip */}` comment and insert the following block immediately before it (after the twin readout panels section):

```tsx
{/* When do they arrive */}
{onViewLegProgress && (
  <button
    onClick={onViewLegProgress}
    className="flex items-center justify-between w-full"
    style={{ border: 'none', borderRadius: 14, background: paceColor, cursor: 'pointer',
      padding: '13px 18px', minHeight: 52, textAlign: 'left' }}
  >
    <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
      <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 14,
        letterSpacing: '0.02em', lineHeight: 1, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
        WHEN DO THEY ARRIVE?
      </span>
      <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 10,
        letterSpacing: '0.06em', lineHeight: 1, color: 'var(--ink)', opacity: 0.85, whiteSpace: 'nowrap' }}>
        EST. RANGE · PACE ±30s/MI
      </span>
    </span>
    <span style={{ fontSize: 20, color: 'var(--ink)', flexShrink: 0 }}>→</span>
  </button>
)}
```

`paceColor` is already computed from `etaStatus` earlier in the component (`'var(--red)'` or `'var(--green)'`), so the button automatically matches the status color.

- [ ] **Step 5.3: Add handlers and render case to `apps/driver/src/App.tsx`**

Add the import at the top:
```ts
import { LegProgressScreen } from './components/LegProgressScreen'
```

Add two handler functions after `handleBackFromCourse`:
```ts
function handleViewLegProgress() {
  setView(prev => prev.type === 'racing' ? { ...prev, type: 'leg-progress' } : prev)
}

function handleBackFromLegProgress() {
  setView(prev => prev.type === 'leg-progress' ? { ...prev, type: 'racing' } : prev)
}
```

Update the `racing` render case to pass the new prop:
```tsx
if (view.type === 'racing') return (
  <TimingScreen
    team={view.team} pin={view.pin} resultId={view.resultId}
    leg={view.leg} startedAt={view.startedAt} nextHandoff={view.nextHandoff}
    currentRunner={view.currentRunner} raceStartedAt={view.raceStartedAt}
    onLapPress={handleLapPress} onComplete={handleComplete}
    nextRunner={view.nextRunner} nextLeg={view.nextLeg} nextRunnerEta={view.nextRunnerEta}
    onViewCourse={handleViewCourse}
    onViewLegProgress={view.targetPaceSecPerMile !== null ? handleViewLegProgress : null}
  />
)
```

Add the `leg-progress` render case after the existing `course` case:
```tsx
if (view.type === 'leg-progress') return (
  <LegProgressScreen
    runner={view.currentRunner ?? 'Runner'}
    town={view.nextHandoff?.name ?? view.leg.name}
    legN={view.leg.legNumber}
    totalLegs={18}
    distMiles={view.leg.distanceMiles}
    startedAtMs={new Date(view.startedAt).getTime()}
    targetPaceSecPerMile={view.targetPaceSecPerMile!}
    teamName={view.team.name}
    backLabel="← TIMING"
    onBack={handleBackFromLegProgress}
  />
)
```

- [ ] **Step 5.4: Confirm TypeScript compiles**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver build 2>&1 | head -40
```

Expected: zero errors.

- [ ] **Step 5.5: Manual smoke test**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" ./scripts/dev.sh
```

In the Driver app (http://localhost:5176):
1. Authenticate and start a leg
2. The "WHEN DO THEY ARRIVE?" button appears below the twin readout panels — its background should be green (on-pace) or red (behind)
3. Tap it — leg progress screen appears with runner name, town, progress bar, and 5-row table
4. Numbers update every second (countdown IN column)
5. Tap the back button — returns to TimingScreen

- [ ] **Step 5.6: Commit**

```bash
git add apps/driver/src/components/TimingScreen.tsx apps/driver/src/App.tsx
git commit -m "feat(driver): wire LegProgressScreen from WHEN DO THEY ARRIVE button"
```

---

## Task 6: Tracker `LegProgressScreen` component

**Files:**
- Create: `apps/tracker/src/components/LegProgressScreen.tsx`

No new CSS needed — `apps/tracker/src/index.css` already defines `.live-dot`.

- [ ] **Step 6.1: Create `apps/tracker/src/components/LegProgressScreen.tsx`**

The component is identical to the driver's. Copy the full contents of `apps/driver/src/components/LegProgressScreen.tsx` verbatim — the imports, helpers, Props interface, and JSX are the same because both apps use the same CSS variables and fonts.

- [ ] **Step 6.2: Confirm TypeScript compiles**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker build 2>&1 | head -40
```

Expected: zero errors.

- [ ] **Step 6.3: Commit**

```bash
git add apps/tracker/src/components/LegProgressScreen.tsx
git commit -m "feat(tracker): add LegProgressScreen component (Direction A)"
```

---

## Task 7: Tracker wiring — TeamDetail.tsx entry point

**Files:**
- Modify: `apps/tracker/src/components/TeamDetail.tsx`

- [ ] **Step 7.1: Add import and `showLegProgress` state**

At the top of `TeamDetail.tsx`, add the import alongside the existing `CourseScreen` import:
```ts
import { LegProgressScreen } from './LegProgressScreen'
```

In the component body, after `const [showCourse, setShowCourse] = useState(false)`, add:
```ts
const [showLegProgress, setShowLegProgress] = useState(false)
```

- [ ] **Step 7.2: Add leg-progress render guard**

After the existing `if (showCourse) return (...)` block, add:

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
  />
)
```

- [ ] **Step 7.3: Make the EST. ARRIVAL readout tappable in the hero card**

In the hero card block (inside `{activeItem && activeItem.runner && activeItem.eta && (...)}`), find the three-column readouts div (`{/* Three readouts */}`). The first column shows "Est. Arrival". Wrap that first column's `<div className="flex-1 text-center">` in a `<button>` and append the "BY PACE →" pill:

Replace:
```tsx
<div className="flex-1 text-center">
  <div className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(19,17,10,0.55)', marginBottom: 2 }}>Est. Arrival</div>
  <div className="font-mono" style={{ fontSize: 34, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
    {formatTime(String(activeItem.eta.eta))}
  </div>
</div>
```

With:
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

- [ ] **Step 7.4: Confirm TypeScript compiles**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker build 2>&1 | head -40
```

Expected: zero errors.

- [ ] **Step 7.5: Manual smoke test**

Navigate to Tracker (http://localhost:5173), select a team with an active leg:
1. The hero card shows "BY PACE →" beneath the arrival time in the Est. Arrival column
2. Tapping the arrival column opens the leg progress screen
3. Screen shows runner name, town, progress bar, and 5-row table
4. Numbers tick every second
5. Back button returns to TeamDetail

- [ ] **Step 7.6: Commit**

```bash
git add apps/tracker/src/components/TeamDetail.tsx
git commit -m "feat(tracker): wire LegProgressScreen from EST. ARRIVAL hero entry point"
```
