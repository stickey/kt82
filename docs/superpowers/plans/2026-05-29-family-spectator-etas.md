# Family Spectator ETAs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add projected arrival times and navigation links for all not-started legs to the team detail timeline, so families can see when and where to meet their runner.

**Architecture:** Client-side only — derive a `projectedTimes: Map<legId, Date>` from the already-fetched `LegTimelineItem[]` data on every render. Anchor on the server's ETA for the active leg, chain each subsequent leg by adding `targetPaceSecPerMile × distanceMiles` seconds. Display projected time (right-aligned, `~` prefix) and an Apple Maps nav link (second row, blue) in each not-started leg row.

**Tech Stack:** React 18, TypeScript 5, Tailwind CSS, CSS custom properties. No new dependencies.

---

## File Map

- **Modify:** `apps/tracker/src/components/TeamDetail.tsx` — only file changed

---

### Task 1: Compute projected times and show them in the right column

The existing right-column time expression (around line 203) shows `—` for not-started legs. Replace that with the projected time.

**Files:**
- Modify: `apps/tracker/src/components/TeamDetail.tsx`

- [ ] **Step 1: Add the `projectedTimes` computation after `activeItem`**

In `TeamDetail.tsx`, find this line (currently line 77):
```tsx
const activeItem = timeline.find(t => t.status === 'in-progress')
```

Add the following block immediately after it:
```tsx
const projectedTimes = new Map<string, Date>()
if (activeItem?.eta?.eta) {
  let anchor = new Date(String(activeItem.eta.eta))
  const notStarted = timeline
    .filter(t => t.status === 'not-started')
    .sort((a, b) => a.leg.legNumber - b.leg.legNumber)
  for (const item of notStarted) {
    if (!item.assignment) continue
    const durationMs = item.assignment.targetPaceSecPerMile * item.leg.distanceMiles * 1000
    const arrival = new Date(anchor.getTime() + durationMs)
    projectedTimes.set(item.leg.id, arrival)
    anchor = arrival
  }
}
```

- [ ] **Step 2: Update the right-column time expression**

Find the right-column `<span>` for the time (currently lines 202–209):
```tsx
<span className="font-display font-semibold text-base flex-shrink-0"
  style={{color: isActive ? (isOverdue ? 'var(--amber)' : 'var(--green)') : 'var(--muted)'}}>
  {isDone && item.result?.finishedAt
    ? formatTime(item.result.finishedAt)
    : isActive && item.eta
      ? formatTime(String(item.eta.eta))
      : '—'}
</span>
```

Replace with:
```tsx
<span className="font-display font-semibold text-base flex-shrink-0"
  style={{color: isActive ? (isOverdue ? 'var(--amber)' : 'var(--green)') : 'var(--muted)'}}>
  {isDone && item.result?.finishedAt
    ? formatTime(item.result.finishedAt)
    : isActive && item.eta
      ? formatTime(String(item.eta.eta))
      : projectedTimes.has(item.leg.id)
        ? `~${formatTime(projectedTimes.get(item.leg.id)!.toISOString())}`
        : '—'}
</span>
```

- [ ] **Step 3: Start the dev server and verify projected times appear**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker dev
```

Open http://localhost:5173 in the browser. Navigate to a team detail view while a race is in-progress.

Expected: Not-started legs now show `~10:51 AM` style times (muted color, `~` prefix) in the right column. Times should increase down the list. Completed and active legs are unchanged.

If no race is in-progress: not-started legs still show `—` (no anchor to chain from). That is correct.

---

### Task 2: Add navigation links below not-started leg names

Add a second row inside each not-started leg's content area, showing `↗ Navigate to [Handoff Name]` when the handoff has coordinates.

**Files:**
- Modify: `apps/tracker/src/components/TeamDetail.tsx`

- [ ] **Step 1: Add the nav link after the "Leg N · X mi" row**

In the timeline map, find the leg info line (currently around line 211–213):
```tsx
<div className="text-xs mt-0.5" style={{color:'var(--faint)'}}>
  Leg {item.leg.legNumber} · {item.leg.distanceMiles} mi
</div>
```

Add the following block immediately after this `<div>`:
```tsx
{!isDone && !isActive && item.leg.handoff?.lat != null && item.leg.handoff?.lng != null && (
  <a
    href={`https://maps.apple.com/?daddr=${item.leg.handoff.lat},${item.leg.handoff.lng}`}
    target="_blank"
    rel="noopener noreferrer"
    onClick={e => e.stopPropagation()}
    className="text-xs mt-1.5 inline-block"
    style={{color:'var(--blue)'}}
  >
    ↗ Navigate to {item.leg.handoff.name}
  </a>
)}
```

- [ ] **Step 2: Verify navigation links in the browser**

With the dev server still running (http://localhost:5173):

1. Navigate to a team detail view
2. Not-started legs with handoff coordinates show `↗ Navigate to [Name]` in blue below the leg info
3. Tapping/clicking the link opens Apple Maps to the correct location
4. Not-started legs without handoff coordinates show no nav link (no crash)
5. Completed and active leg rows are unchanged — no nav link appears on them
6. The hero card's existing "Meet here ↗" button is still present for the active leg

- [ ] **Step 3: Verify with race not started**

If you can test with a team that has no results yet (race not started):
- Nav links still appear on all legs that have handoff coordinates
- Times show `—` on all legs (no anchor)

- [ ] **Step 4: Commit**

```bash
git add apps/tracker/src/components/TeamDetail.tsx
git commit -m "feat(tracker): show projected ETAs and nav links for future legs"
```

---

## Done

The feature is complete when:
- Not-started legs show `~HH:MM AM/PM` projected times that increase down the list
- Each not-started leg with handoff coordinates has a `↗ Navigate to [Name]` link
- Times update on each 30s poll cycle
- No regressions on completed/active leg rows or the hero card
