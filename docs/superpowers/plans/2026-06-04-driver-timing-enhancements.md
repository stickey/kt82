# Driver Timing Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a third "Time Left" pill to the TimingScreen and replace the white notch on the LegProgressScreen progress bar with a runner icon.

**Architecture:** All changes are pure UI — no server calls, no shared package changes. TimingScreen gets a new `targetPaceSecPerMile` prop and calls `lpEstimates` from `@kt82/shared` with a 1-second ticker to derive distance completed, time remaining, and distance remaining. LegProgressScreen swaps one div for another.

**Tech Stack:** React + TypeScript, Vite dev server, `@kt82/shared` (`lpEstimates`), Tailwind (utility classes only — no new color classes), CSS custom properties for theme colours.

---

## File Map

| File | Change |
|------|--------|
| `apps/driver/src/components/TimingScreen.tsx` | Add `targetPaceSecPerMile` prop, `nowMs` ticker, `lpEstimates` call, `fmtRemain` helper, 3-pill layout |
| `apps/driver/src/App.tsx` | Pass `targetPaceSecPerMile={view.targetPaceSecPerMile}` to `<TimingScreen>` |
| `apps/driver/src/components/LegProgressScreen.tsx` | Replace white notch div with runner icon div |

---

## Task 1: Update TimingScreen — add prop, estimates, 3-pill layout

**Files:**
- Modify: `apps/driver/src/components/TimingScreen.tsx`

> Note: After this task `App.tsx` will have a TypeScript error until Task 2 is done. Commit both tasks together, or use `// @ts-ignore` temporarily if you want to test incrementally.

- [ ] **Step 1: Add `lpEstimates` import**

At the top of `TimingScreen.tsx`, change line 2 from:
```ts
import { createDriverApi, buildNavUrl, formatElapsed, formatRaceTime, formatTime } from '../api'
```
to:
```ts
import { createDriverApi, buildNavUrl, formatElapsed, formatRaceTime, formatTime } from '../api'
import { lpEstimates } from '@kt82/shared'
```

- [ ] **Step 2: Add `fmtRemain` helper function**

Add this function after the existing `initials` helper (around line 26), before the Props interface:
```ts
function fmtRemain(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = (s % 60).toString().padStart(2, '0')
  const mm = m.toString().padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`
}
```

- [ ] **Step 3: Add `targetPaceSecPerMile` to the Props interface**

The Props interface currently ends with `onViewLegMap`. Add the new prop:
```ts
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
  onViewLegProgress: (() => void) | null
  onViewLegMap: (() => void) | null
  targetPaceSecPerMile: number | null
}
```

- [ ] **Step 4: Destructure new prop and add `nowMs` ticker**

In the function signature, add `targetPaceSecPerMile` to the destructured props:
```ts
export function TimingScreen({ team, pin, resultId, leg, startedAt, nextHandoff, currentRunner, raceStartedAt, onLapPress, onComplete, nextRunner, nextLeg, nextRunnerEta, onViewCourse, onViewLegProgress, onViewLegMap, targetPaceSecPerMile }: Props) {
```

Then add a `nowMs` state with a 1-second ticker. Place it right after the existing `const [elapsed, setElapsed] = useState(0)` line:
```ts
const [nowMs, setNowMs] = useState(() => Date.now())

useEffect(() => {
  const id = setInterval(() => setNowMs(Date.now()), 1_000)
  return () => clearInterval(id)
}, [])
```

- [ ] **Step 5: Compute estimates**

Add these computed values after the existing `const paceColor = ...` line (around line 93):
```ts
const startedAtMs = new Date(startedAt).getTime()
const ests = targetPaceSecPerMile !== null
  ? lpEstimates(startedAtMs, nowMs, leg.distanceMiles, targetPaceSecPerMile)
  : null
const est = ests?.[2] ?? null
const distDone = est ? est.frac * leg.distanceMiles : 0
const distLeft = est ? (1 - est.frac) * leg.distanceMiles : 0
const secLeft = est ? est.remain : 0
const pillFontSize = est ? 28 : 38
```

- [ ] **Step 6: Replace twin panels with 3-pill layout**

Find the `{/* Twin readout panels */}` block (lines 142–161) and replace the entire block:
```tsx
{/* Twin / triple readout panels */}
<div className="flex gap-2.5">
  <div className="flex-1 text-center" style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, padding: '12px 10px' }}>
    <div className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--faint)', marginBottom: 4 }}>Leg Time</div>
    <div className="font-mono" style={{ fontSize: pillFontSize, fontWeight: 700, lineHeight: 1 }}>{formatElapsed(elapsed)}</div>
    <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, color: 'var(--faint)', marginTop: 4 }}>
      {est ? `~${distDone.toFixed(2)} mi done` : `${leg.distanceMiles} mi total`}
    </div>
  </div>
  {est && (
    <div className="flex-1 text-center" style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, padding: '12px 10px' }}>
      <div className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--faint)', marginBottom: 4 }}>Time Left</div>
      <div className="font-mono" style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>{fmtRemain(secLeft)}</div>
      <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, color: 'var(--faint)', marginTop: 4 }}>
        ~{distLeft.toFixed(2)} mi left
      </div>
    </div>
  )}
  <div className="flex-1 text-center" style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, padding: '12px 10px' }}>
    <div className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--faint)', marginBottom: 4 }}>ETA</div>
    {eta
      ? <div className="font-mono" style={{ fontSize: pillFontSize, fontWeight: 700, lineHeight: 1, color: paceColor }}>{formatTime(eta.eta)}</div>
      : <div className="font-mono" style={{ fontSize: pillFontSize, color: 'var(--faint)', lineHeight: 1 }}>—</div>
    }
    <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, color: 'var(--faint)', marginTop: 4 }}>
      {eta ? (etaStatus === 'overdue' ? 'behind pace' : etaStatus === 'ahead' ? 'ahead of pace' : 'on pace') : 'calculating…'}
    </div>
  </div>
</div>
```

---

## Task 2: App.tsx — pass `targetPaceSecPerMile` to TimingScreen

**Files:**
- Modify: `apps/driver/src/App.tsx:288-297`

- [ ] **Step 1: Add the prop to the TimingScreen render call**

Find the `<TimingScreen` block (around line 288). Add `targetPaceSecPerMile` as a new prop:
```tsx
<TimingScreen
  team={view.team} pin={view.pin} resultId={view.resultId}
  leg={view.leg} startedAt={view.startedAt} nextHandoff={view.nextHandoff}
  currentRunner={view.currentRunner} raceStartedAt={view.raceStartedAt}
  onLapPress={handleLapPress} onComplete={handleComplete}
  nextRunner={view.nextRunner} nextLeg={view.nextLeg} nextRunnerEta={view.nextRunnerEta}
  onViewCourse={handleViewCourse}
  onViewLegProgress={view.targetPaceSecPerMile !== null ? handleViewLegProgress : null}
  onViewLegMap={view.targetPaceSecPerMile !== null ? handleViewLegMapFromRacing : null}
  targetPaceSecPerMile={view.targetPaceSecPerMile}
/>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver build 2>&1 | tail -20
```

Expected: build succeeds with no TypeScript errors. If there are type errors, fix them before continuing.

- [ ] **Step 3: Commit Tasks 1 and 2 together**

```bash
git add apps/driver/src/components/TimingScreen.tsx apps/driver/src/App.tsx
git commit -m "feat(driver): add time remaining pill to timing screen"
```

---

## Task 3: LegProgressScreen — replace notch with runner icon

**Files:**
- Modify: `apps/driver/src/components/LegProgressScreen.tsx:143`

- [ ] **Step 1: Replace the white notch div**

Find this block (line 143):
```tsx
{/* Best-estimate notch (panel = white in dark theme) */}
<div style={{ position: 'absolute', top: '50%', left: `${target.frac * 100}%`, transform: 'translate(-50%, -50%)', width: 3, height: 18, borderRadius: 2, background: 'var(--panel)' }} />
```

Replace it with:
```tsx
{/* Runner icon at best-estimate position */}
<div style={{
  position: 'absolute', top: '50%', left: `${target.frac * 100}%`,
  transform: 'translate(-50%, -50%)',
  width: 26, height: 26, borderRadius: '50%',
  background: '#ff5a1f', border: '2.5px solid #fff',
  boxShadow: '0 0 7px rgba(255,90,31,0.75)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 13, lineHeight: '1',
}}>🏃</div>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver build 2>&1 | tail -20
```

Expected: clean build, no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/driver/src/components/LegProgressScreen.tsx
git commit -m "feat(driver): replace progress bar notch with runner icon"
```

---

## Task 4: Verify in browser

- [ ] **Step 1: Start the driver dev server**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver dev
```

Open http://localhost:5176 in a mobile-sized browser window (DevTools device emulation recommended).

- [ ] **Step 2: Verify TimingScreen — with pace assigned**

Navigate to the timing screen for a leg that has `targetPaceSecPerMile` set (a runner with a pace assignment). Check:
- Three pills appear: **Leg Time** | **Time Left** | **ETA**
- Leg Time subtext shows `~X.XX mi done` (not `X.X mi total`), updating every second
- Time Left shows `M:SS` countdown, updating every second
- Time Left subtext shows `~X.XX mi left`, updating every second
- ETA pill is unchanged in appearance
- All three pills are equal width and same background colour (no emphasis on any pill)
- Font size is visibly smaller than before (28px vs 38px) but still legible

- [ ] **Step 3: Verify TimingScreen — without pace assigned**

Navigate to a leg with no pace assignment (or temporarily pass `null` for `targetPaceSecPerMile` in App.tsx for testing). Check:
- Two pills appear: **Leg Time** | **ETA** (original layout)
- Leg Time subtext shows `X.X mi total` (original)
- Font size reverts to larger (38px)

- [ ] **Step 4: Verify LegProgressScreen**

Tap "WHEN DO THEY ARRIVE?" to reach LegProgressScreen. Check:
- The orange uncertainty range on the progress bar has a 🏃 emoji in an orange circle at the on-pace estimate position
- The circle moves as `nowMs` advances (check by waiting a few seconds or using a past `startedAt` time in dev data)
- The white thin notch is gone
- The bar overall height looks clean — the 26px icon fits within the 30px bar container without clipping

- [ ] **Step 5: Check Docker build passes**

```bash
docker build -t kt82-test . 2>&1 | tail -30
```

Expected: build succeeds. If `@types/leaflet` strictness errors appear (a known Docker/TypeScript difference), check that no new Leaflet API calls were added — they shouldn't have been in this change.
