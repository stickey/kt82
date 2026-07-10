# Justin "Boo, Hiss!!" Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a "Boo, Hiss!!" banner on Team MA's Tracker `TeamDetail` screen exactly when Justin is the currently-running leg.

**Architecture:** A new presentational component `JustinBanner.tsx` (modeled on the existing `OfflineBanner.tsx`), rendered in `TeamDetail.tsx` behind a single hardcoded boolean derived from data the component already fetches (`teamId` + `activeItem.runner.name`). No new state, no new polling, no server changes.

**Tech Stack:** React + TypeScript, `apps/tracker` (Vite). No test framework is configured for this app (no vitest/testing-library in `apps/tracker/package.json`), so verification is manual via the dev server rather than an automated component test.

**Spec:** `docs/superpowers/specs/2026-07-09-justin-boo-banner-design.md`

---

### Task 1: Create the `JustinBanner` component

**Files:**
- Create: `apps/tracker/src/components/JustinBanner.tsx`
- Reference: `apps/tracker/src/components/OfflineBanner.tsx` (pattern to follow)

- [ ] **Step 1: Write the component**

```tsx
export function JustinBanner({ show }: { show: boolean }) {
  if (!show) return null
  return (
    <div style={{
      background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
      borderBottom: '1px solid var(--accent)',
      padding: '10px 18px',
      fontFamily: "'Hanken Grotesk', sans-serif",
      fontSize: 12,
      fontWeight: 800,
      letterSpacing: '0.06em',
      color: 'var(--accent)',
      textAlign: 'center',
    }}>
      Boo, Hiss!!
    </div>
  )
}
```

- [ ] **Step 2: Type-check the new file**

Run: `cd apps/tracker && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm exec tsc --noEmit`
Expected: no errors mentioning `JustinBanner.tsx`

- [ ] **Step 3: Commit**

```bash
git add apps/tracker/src/components/JustinBanner.tsx
git commit -m "feat(tracker): add JustinBanner component"
```

---

### Task 2: Wire `JustinBanner` into `TeamDetail`

**Files:**
- Modify: `apps/tracker/src/components/TeamDetail.tsx`

- [ ] **Step 1: Import the component**

At the top of `apps/tracker/src/components/TeamDetail.tsx`, alongside the existing `OfflineBanner` import (currently at line 8):

```tsx
import { OfflineBanner } from './OfflineBanner'
import { JustinBanner } from './JustinBanner'
```

- [ ] **Step 2: Add the derived boolean**

Immediately after the existing line `const activeItem = timeline.find(t => t.status === 'in-progress')` (currently line 99), add:

```ts
  const activeItem = timeline.find(t => t.status === 'in-progress')
  const showJustinBanner = teamId === 'cmrd0be290001fn7qgi8sadky' && activeItem?.runner?.name === 'Justin'
```

- [ ] **Step 3: Render the banner above `OfflineBanner`**

In the main return block, `<OfflineBanner message={bannerMessage} />` currently appears right after the outer wrapping `<div>` (currently line 179):

```tsx
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <JustinBanner show={showJustinBanner} />
      <OfflineBanner message={bannerMessage} />
```

- [ ] **Step 4: Type-check**

Run: `cd apps/tracker && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm exec tsc --noEmit`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add apps/tracker/src/components/TeamDetail.tsx
git commit -m "feat(tracker): show Boo Hiss banner when Justin is running for Team MA"
```

---

### Task 3: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Start the dev stack**

Run: `PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" ./scripts/dev.sh`

- [ ] **Step 2: Confirm Team MA is seeded**

Team MA (`cmrd0be290001fn7qgi8sadky`) should already exist with its roster and assignments seeded per `resources/seeds/roster.ma.csv` and `resources/seeds/assignments.ma.csv` (per repo convention: `pnpm seed:roster cmrd0be290001fn7qgi8sadky ../resources/seeds/roster.ma.csv` and `pnpm seed:assignments cmrd0be290001fn7qgi8sadky ../resources/seeds/assignments.ma.csv`, run from `server/`, only if not already seeded — both scripts guard against double-seeding).

- [ ] **Step 3: Drive leg 2 (Justin's leg) into progress**

Open the Driver app (`http://localhost:5176`) for Team MA, complete leg 1 (Matt), then hit START on leg 2 (Justin, per `assignments.ma.csv`).

- [ ] **Step 4: Confirm the banner shows for Team MA**

Open the Tracker app (`http://localhost:5173`) and navigate to Team MA's `TeamDetail` screen. Confirm:
- The "Boo, Hiss!!" strip appears directly below the top bar, above where `OfflineBanner` would render.
- It uses the same visual style as `OfflineBanner` (accent-colored strip, same font/weight).

- [ ] **Step 5: Confirm it does NOT show in the negative cases**

- Advance leg 2 to completion (leg 3, Chris, in progress) — banner should disappear.
- Open a different team's `TeamDetail` screen (if another team is seeded) — banner should never appear there even if that team has its own runner coincidentally named Justin.
- View Team MA before the race starts (pre-race screen) — banner should not appear (no `activeItem` yet).

- [ ] **Step 6: Stop the dev stack**

Ctrl+C in the terminal running `./scripts/dev.sh`.

---

## Files Changed

| File | Change |
|---|---|
| `apps/tracker/src/components/JustinBanner.tsx` | New — banner component, modeled on `OfflineBanner` |
| `apps/tracker/src/components/TeamDetail.tsx` | Import `JustinBanner`, add `showJustinBanner` derived boolean, render above `OfflineBanner` |
