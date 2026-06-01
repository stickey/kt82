# Race Complete Summary — Pace vs Target Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the Driver app's post-race CompleteScreen to show each runner's actual pace per mile, their target pace, and a colored delta (ahead/behind).

**Architecture:** All required data is already on `LegTimelineItem` (fetched from `/teams/:id/timeline`): `leg.distanceMiles`, `result.startedAt/finishedAt`, and `assignment.targetPaceSecPerMile`. No server changes needed. We add a `formatPace` utility to `apps/driver/src/api.ts` and enhance the split rows in `CompleteScreen.tsx`.

**Tech Stack:** TypeScript, React, Tailwind CSS

---

### Task 1: Add formatPace utility

**Files:**
- Modify: `apps/driver/src/api.ts`

The `formatPace` function converts seconds-per-mile to `mm:ss` string. It's pure and testable. However, the driver app has no unit test suite — we'll verify by inspection and visual testing rather than adding a Jest/Vitest config just for this. The function is simple enough that correctness is obvious from the implementation.

- [ ] **Step 1: Add formatPace to api.ts**

In `apps/driver/src/api.ts`, add after the existing `formatDuration` function:

```ts
export function formatPace(secPerMile: number): string {
  const m = Math.floor(secPerMile / 60)
  const s = Math.round(secPerMile % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/driver/src/api.ts
git commit -m "feat(driver): add formatPace utility (sec/mi → mm:ss)"
```

---

### Task 2: Enhance CompleteScreen split rows

**Files:**
- Modify: `apps/driver/src/components/CompleteScreen.tsx`

- [ ] **Step 1: Import formatPace**

In `apps/driver/src/components/CompleteScreen.tsx`, update the import from `../api`:

```ts
// Before
import { createDriverApi, formatElapsed, formatDuration } from '../api'

// After
import { createDriverApi, formatElapsed, formatDuration, formatPace } from '../api'
```

- [ ] **Step 2: Replace the split row render logic**

Find the `.map(item => (...))` block that renders each split row. Replace the entire row content with:

```tsx
{items
  .filter(i => i.assignment !== null)
  .sort((a, b) => a.leg.legNumber - b.leg.legNumber)
  .map(item => {
    const hasResult = item.result?.startedAt && item.result?.finishedAt
    const elapsedMs = hasResult
      ? new Date(item.result!.finishedAt!).getTime() - new Date(item.result!.startedAt).getTime()
      : null
    const actualPaceSec = (elapsedMs && item.leg.distanceMiles > 0)
      ? (elapsedMs / 1000) / item.leg.distanceMiles
      : null
    const targetPaceSec = item.assignment?.targetPaceSecPerMile ?? null
    const deltaSec = (actualPaceSec !== null && targetPaceSec !== null)
      ? targetPaceSec - actualPaceSec  // positive = ahead (ran faster)
      : null

    return (
      <div key={item.leg.id} className="bg-gray-800 rounded-lg px-4 py-3">
        <div className="flex justify-between items-center mb-1">
          <div>
            <span className="text-xs text-gray-500 mr-2">Leg {item.leg.legNumber}</span>
            <span className="text-sm font-medium">{item.runner?.name ?? '—'}</span>
          </div>
          <div className="font-mono text-sm text-gray-300">
            {hasResult ? formatDuration(item.result!.startedAt, item.result!.finishedAt!) : '—'}
          </div>
        </div>
        {actualPaceSec !== null && (
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
            <span>{formatPace(actualPaceSec)}/mi</span>
            {targetPaceSec !== null && (
              <>
                <span className="text-gray-600">vs {formatPace(targetPaceSec)}</span>
                {deltaSec !== null && (
                  <span className={deltaSec >= 0 ? 'text-green-400' : 'text-amber-400'}>
                    {deltaSec >= 0 ? `▲ ${formatPace(Math.abs(deltaSec))} ahead` : `▼ ${formatPace(Math.abs(deltaSec))} behind`}
                  </span>
                )}
              </>
            )}
          </div>
        )}
      </div>
    )
  })
}
```

- [ ] **Step 3: Verify in browser**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver dev
```

To test without running a full race, temporarily navigate directly to the `CompleteScreen` by modifying `App.tsx` to render `<CompleteScreen>` with a team that has completed results, or use the Manager app to set up a team with results already recorded.

Confirm:
- Each completed leg shows elapsed time (existing) + `8:24/mi` actual pace
- Legs with assignments show `vs 8:30` target and a green `▲ 0:06 ahead` or amber `▼ 0:15 behind` delta
- Legs without assignments (no target pace) show only elapsed and actual pace, no delta

- [ ] **Step 4: Commit**

```bash
git add apps/driver/src/components/CompleteScreen.tsx
git commit -m "feat(driver): show pace vs target delta on race complete summary"
```
