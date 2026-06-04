# Leg Map Countdown Timer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the runner icon label on the leg map from elapsed leg time to a countdown showing seconds remaining until on-pace arrival.

**Architecture:** Both `LegMapScreen` components (tracker and driver) compute `ests` via `lpEstimates` on every tick. `ests[2].remain` is on-pace seconds remaining, clamped to 0. Passing `ests[2].remain * 1000` to the existing `fmtElapsed` formatter (instead of `nowMs - startedAtMs`) produces a countdown in the same `m:ss` format.

**Tech Stack:** React, TypeScript, Leaflet — no new dependencies.

---

### Task 1: Swap elapsed time for countdown in both LegMapScreen components

**Files:**
- Modify: `apps/tracker/src/components/LegMapScreen.tsx:178`
- Modify: `apps/driver/src/components/LegMapScreen.tsx:178`

- [ ] **Step 1: Edit tracker LegMapScreen**

In `apps/tracker/src/components/LegMapScreen.tsx`, find line 178 inside the per-tick `useEffect`:

```ts
// Before
const legTime = fmtElapsed(nowMs - startedAtMs)
```

Replace with:

```ts
// After
const legTime = fmtElapsed(ests[2].remain * 1000)
```

`ests` is already computed two lines above (line 173): `const ests = lpEstimates(startedAtMs, nowMs, distMiles, targetPaceSecPerMile)`

- [ ] **Step 2: Edit driver LegMapScreen**

Apply the identical change in `apps/driver/src/components/LegMapScreen.tsx` line 178.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker exec tsc --noEmit
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Visual smoke test**

Start the dev stack:
```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" ./scripts/dev.sh
```

Open the tracker (port 5173) or driver (port 5176) with a live leg in progress. Navigate to the map view. Confirm the label below the runner dot counts down toward "0:00" rather than counting up from start.

- [ ] **Step 5: Commit**

```bash
git add apps/tracker/src/components/LegMapScreen.tsx apps/driver/src/components/LegMapScreen.tsx
git commit -m "feat(map): show ETA countdown on runner icon instead of elapsed time"
```
