# Google Maps Navigation Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all Apple Maps navigation links with Google Maps links so navigation works correctly on Android devices and in all browsers.

**Architecture:** Three locations contain Apple Maps URLs. The Driver app centralises its URL building in `buildNavUrl`. The Tracker app has two hardcoded inline URLs. All three switch to `https://www.google.com/maps/dir/?api=1&destination=...`.

**Tech Stack:** TypeScript, React (no dependencies added)

---

### Task 1: Update buildNavUrl in the Driver app

**Files:**
- Modify: `apps/driver/src/api.ts`

- [ ] **Step 1: Update buildNavUrl**

In `apps/driver/src/api.ts`, find the `buildNavUrl` function and replace it:

```ts
// Before
export function buildNavUrl(handoff: Handoff): string {
  if (handoff.lat != null && handoff.lng != null)
    return `https://maps.apple.com/?daddr=${handoff.lat},${handoff.lng}`
  if (handoff.address)
    return `https://maps.apple.com/?daddr=${encodeURIComponent(handoff.address)}`
  return ''
}

// After
export function buildNavUrl(handoff: Handoff): string {
  if (handoff.lat != null && handoff.lng != null)
    return `https://www.google.com/maps/dir/?api=1&destination=${handoff.lat},${handoff.lng}`
  if (handoff.address)
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(handoff.address)}`
  return ''
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/driver/src/api.ts
git commit -m "fix(driver): switch navigation links from Apple Maps to Google Maps"
```

---

### Task 2: Update hardcoded Apple Maps URLs in the Tracker app

**Files:**
- Modify: `apps/tracker/src/components/TeamDetail.tsx`

- [ ] **Step 1: Find and replace both Apple Maps URLs**

Open `apps/tracker/src/components/TeamDetail.tsx`. Search for `maps.apple.com` — there are exactly two occurrences (around lines 196 and 272). Replace each one:

```ts
// Before (both occurrences)
href={`https://maps.apple.com/?daddr=${...lat},${...lng}`}

// After (both occurrences)
href={`https://www.google.com/maps/dir/?api=1&destination=${...lat},${...lng}`}
```

The lat/lng expressions vary between the two instances — replace only the domain/path portion, keep the template literal variables as-is.

- [ ] **Step 2: Verify there are no remaining Apple Maps URLs**

```bash
grep -r "maps.apple.com" apps/
```

Expected: no output.

- [ ] **Step 3: Verify in browser**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker dev
```

Open http://localhost:5173, navigate to a team detail with a handoff that has lat/lng. Click the navigation link — it should open `google.com/maps` not `maps.apple.com`.

- [ ] **Step 4: Commit**

```bash
git add apps/tracker/src/components/TeamDetail.tsx
git commit -m "fix(tracker): switch navigation links from Apple Maps to Google Maps"
```
