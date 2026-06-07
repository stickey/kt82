# Offline Resilience Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Driver and Tracker apps load reliably in dead zones and show clear, prominent connectivity indicators instead of going blank or showing subtle muted-text badges.

**Architecture:** Service worker precaching (via vite-plugin-pwa) ensures both apps load from disk on cold start. A thin `cache.ts` localStorage utility provides stale-while-revalidate for timeline/status data. A shared `OfflineBanner` component renders a full-width orange strip whenever connectivity is degraded — replacing the existing weak indicators.

**Tech Stack:** vite-plugin-pwa (Workbox), React, localStorage, existing CSS design tokens (`var(--accent)` = `#ff5a1f`, `var(--bg)` = `#13110a`)

---

## File Map

**New files:**
- `apps/driver/src/cache.ts` — setCache/getCache utility
- `apps/tracker/src/cache.ts` — identical utility (separate workspaces)
- `apps/driver/src/components/OfflineBanner.tsx` — orange strip component
- `apps/tracker/src/components/OfflineBanner.tsx` — identical component

**Modified files:**
- `apps/driver/package.json` — add vite-plugin-pwa devDependency
- `apps/tracker/package.json` — add vite-plugin-pwa devDependency
- `apps/driver/vite.config.ts` — add VitePWA plugin
- `apps/tracker/vite.config.ts` — add VitePWA plugin
- `apps/driver/src/App.tsx` — add reconnection logic to clear restoredFromCache banner
- `apps/driver/src/components/TimingScreen.tsx` — remove 11px muted badge, add OfflineBanner
- `apps/driver/src/components/CourseScreen.tsx` — add cache load + 30s poll + OfflineBanner
- `apps/tracker/src/App.tsx` — remove isOnline banner + event listeners
- `apps/tracker/src/components/TeamGrid.tsx` — add cache load on mount, upgrade pollError to OfflineBanner
- `apps/tracker/src/components/TeamDetail.tsx` — add cache load on mount, upgrade pollError to OfflineBanner

---

## Task 1: cache.ts utility — both apps

**Files:**
- Create: `apps/driver/src/cache.ts`
- Create: `apps/tracker/src/cache.ts`

- [ ] **Step 1: Create the driver cache utility**

Create `apps/driver/src/cache.ts`:

```ts
export function setCache(key: string, data: unknown): void {
  localStorage.setItem(key, JSON.stringify({ data, savedAt: Date.now() }))
}

export function getCache<T>(key: string): { data: T; ageMs: number } | null {
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    const { data, savedAt } = JSON.parse(raw)
    return { data: data as T, ageMs: Date.now() - savedAt }
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Create the tracker cache utility**

Create `apps/tracker/src/cache.ts` with the exact same content as `apps/driver/src/cache.ts` above.

- [ ] **Step 3: Commit**

```bash
git add apps/driver/src/cache.ts apps/tracker/src/cache.ts
git commit -m "feat: add localStorage cache utility to driver and tracker"
```

---

## Task 2: OfflineBanner component — both apps

**Files:**
- Create: `apps/driver/src/components/OfflineBanner.tsx`
- Create: `apps/tracker/src/components/OfflineBanner.tsx`

- [ ] **Step 1: Create the driver OfflineBanner**

Create `apps/driver/src/components/OfflineBanner.tsx`:

```tsx
export function OfflineBanner({ message }: { message: string | null }) {
  if (!message) return null
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
      {message}
    </div>
  )
}
```

- [ ] **Step 2: Create the tracker OfflineBanner**

Create `apps/tracker/src/components/OfflineBanner.tsx` with the exact same content.

- [ ] **Step 3: Commit**

```bash
git add apps/driver/src/components/OfflineBanner.tsx apps/tracker/src/components/OfflineBanner.tsx
git commit -m "feat: add OfflineBanner component to driver and tracker"
```

---

## Task 3: vite-plugin-pwa — Driver

**Files:**
- Modify: `apps/driver/package.json`
- Modify: `apps/driver/vite.config.ts`

- [ ] **Step 1: Install vite-plugin-pwa in the driver app**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver add -D vite-plugin-pwa
```

Expected: package added to `apps/driver/package.json` devDependencies. `pnpm-lock.yaml` updated.

- [ ] **Step 2: Update driver vite.config.ts**

Replace the entire contents of `apps/driver/vite.config.ts` with:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      },
      manifest: {
        name: 'KT82 Driver',
        short_name: 'KT82',
        theme_color: '#13110a',
        background_color: '#13110a',
        display: 'standalone',
        start_url: '/driver',
        scope: '/driver',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
    }),
  ],
  base: '/driver',
  server: { port: 5176, proxy: { '/api': 'http://localhost:3001' } },
})
```

- [ ] **Step 3: Verify the service worker is generated**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver build 2>&1 | tail -20
```

Expected: build succeeds, output includes lines mentioning `sw.js` and `workbox-*.js`.

```bash
ls apps/driver/dist/
```

Expected: `sw.js` and `workbox-*.js` files appear in the dist directory alongside the regular build artifacts.

- [ ] **Step 4: Commit**

```bash
git add apps/driver/package.json apps/driver/vite.config.ts pnpm-lock.yaml
git commit -m "feat(driver): add vite-plugin-pwa for offline shell caching"
```

---

## Task 4: vite-plugin-pwa — Tracker

**Files:**
- Modify: `apps/tracker/package.json`
- Modify: `apps/tracker/vite.config.ts`

- [ ] **Step 1: Install vite-plugin-pwa in the tracker app**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker add -D vite-plugin-pwa
```

- [ ] **Step 2: Update tracker vite.config.ts**

Replace the entire contents of `apps/tracker/vite.config.ts` with:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
      },
      manifest: {
        name: 'KT82 Tracker',
        short_name: 'KT82',
        theme_color: '#13110a',
        background_color: '#13110a',
        display: 'standalone',
        start_url: '/tracker',
        scope: '/tracker',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
        ],
      },
    }),
  ],
  base: '/tracker',
  server: { port: 5173, proxy: { '/api': 'http://localhost:3001' } },
})
```

- [ ] **Step 3: Verify the service worker is generated**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker build 2>&1 | tail -20
```

Expected: build succeeds, `sw.js` and `workbox-*.js` appear in `apps/tracker/dist/`.

- [ ] **Step 4: Commit**

```bash
git add apps/tracker/package.json apps/tracker/vite.config.ts pnpm-lock.yaml
git commit -m "feat(tracker): add vite-plugin-pwa for offline shell caching"
```

---

## Task 5: Driver App.tsx — reconnection logic for restoredFromCache

**Files:**
- Modify: `apps/driver/src/App.tsx`

`restoredFromCache` is set to `true` when the session loads from cache on mount but is never cleared. This task adds the clearing logic so the OFFLINE banner (added in Task 6) dismisses when connectivity returns.

- [ ] **Step 1: Add setRestoredFromCache(false) to the LAP retry loop success paths**

In `apps/driver/src/App.tsx`, find the LAP retry loop `useEffect` (around line 301). It has two success branches. Add `setRestoredFromCache(false)` to both.

Find this block (last-leg case):
```ts
if (lapResult.next === null) {
  dequeue()
  setPendingAction(null)
  setView(prev => prev.type === 'racing'
    ? { type: 'complete', race: prev.race, team: prev.team, pin: prev.pin }
    : prev)
}
```

Replace with:
```ts
if (lapResult.next === null) {
  dequeue()
  setPendingAction(null)
  setRestoredFromCache(false)
  setView(prev => prev.type === 'racing'
    ? { type: 'complete', race: prev.race, team: prev.team, pin: prev.pin }
    : prev)
}
```

Find this block (mid-race case, a few lines later):
```ts
setView(prev => prev.type !== 'racing' ? prev : {
  ...prev,
  resultId: lapResult.next!.id,
})
dequeue()
setPendingAction(null)
```

Replace with:
```ts
setView(prev => prev.type !== 'racing' ? prev : {
  ...prev,
  resultId: lapResult.next!.id,
})
dequeue()
setPendingAction(null)
setRestoredFromCache(false)
```

- [ ] **Step 2: Add setRestoredFromCache(false) to the leg-map poll success path**

In the same file, find the leg-map poll `useEffect` (around line 260). Inside the `try` block, find where the successful state update happens. After the `setView` call inside the try block but before the catch, add `setRestoredFromCache(false)`.

Find this section (inside the try block of the leg-map interval):
```ts
try {
  const state = await api.get<CurrentState>(`/teams/${team.id}/current`)
  setLegMapLastUpdatedMs(Date.now())
  if (state.status === 'not-started') {
```

Add `setRestoredFromCache(false)` right after `setLegMapLastUpdatedMs(Date.now())`:
```ts
try {
  const state = await api.get<CurrentState>(`/teams/${team.id}/current`)
  setLegMapLastUpdatedMs(Date.now())
  setRestoredFromCache(false)
  if (state.status === 'not-started') {
```

- [ ] **Step 3: Add a one-shot reconnection ping for the racing view**

Add a new `useEffect` in `apps/driver/src/App.tsx` after the existing effects (before the render return statements). This handles the case where the driver is on the racing screen with no pending action and no leg-map poll — the most common case:

```ts
// One-shot ping to clear the OFFLINE banner once connectivity returns
useEffect(() => {
  if (!restoredFromCache) return
  if (view.type !== 'racing' && view.type !== 'start') return
  let cancelled = false
  publicApi.get<unknown>('/races/active').then(() => {
    if (!cancelled) setRestoredFromCache(false)
  }).catch(() => {})
  return () => { cancelled = true }
}, [restoredFromCache, view.type]) // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 4: Verify no TypeScript errors**

```bash
cd apps/driver && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/App.tsx
git commit -m "feat(driver): clear OFFLINE banner when connectivity returns"
```

---

## Task 6: Driver TimingScreen — replace badge with OfflineBanner

**Files:**
- Modify: `apps/driver/src/components/TimingScreen.tsx`

The current indicator (lines 129–134) is a 11px muted-text badge that also appears during normal post-LAP syncing (`!resultId`), making it invisible noise. Replace it with a proper `OfflineBanner`.

- [ ] **Step 1: Add OfflineBanner import**

At the top of `apps/driver/src/components/TimingScreen.tsx`, add the import alongside the existing imports:

```ts
import { OfflineBanner } from './OfflineBanner'
```

- [ ] **Step 2: Remove the existing inline badge**

Find and remove this block (lines 129–134):
```tsx
{(restoredFromCache || !resultId) && (
  <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, color: 'var(--mut)', display: 'flex', alignItems: 'center', gap: 5 }}>
    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mut)', flexShrink: 0, display: 'inline-block' }} />
    {restoredFromCache ? 'Offline · Cached' : 'Syncing…'}
  </span>
)}
```

- [ ] **Step 3: Add OfflineBanner between top bar and body**

The top bar div ends with `</div>` at line ~138. The body div starts with `{/* Body */}` at line ~140. Add the OfflineBanner between them:

Find:
```tsx
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col px-[18px] pt-5 pb-6 gap-4">
```

Replace with:
```tsx
      </div>

      <OfflineBanner message={
        pendingAction
          ? 'LAP QUEUED · Will sync when signal returns'
          : restoredFromCache
            ? 'OFFLINE · Loaded from saved session'
            : null
      } />

      {/* Body */}
      <div className="flex-1 flex flex-col px-[18px] pt-5 pb-6 gap-4">
```

Note: `pendingAction` is not currently a prop on TimingScreen — it comes from App.tsx state. Check the Props interface and add it:

In the `interface Props` block near the top of TimingScreen.tsx, add:
```ts
pendingAction: boolean
```

Back in `apps/driver/src/App.tsx`, find where TimingScreen is rendered (around line 362) and add the prop:
```tsx
<TimingScreen
  ...existing props...
  pendingAction={pendingAction !== null}
  restoredFromCache={restoredFromCache}
/>
```

- [ ] **Step 4: Verify no TypeScript errors**

```bash
cd apps/driver && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/driver/src/components/TimingScreen.tsx apps/driver/src/App.tsx
git commit -m "feat(driver): replace muted sync badge with prominent OfflineBanner"
```

---

## Task 7: Driver CourseScreen — cache + poll + OfflineBanner

**Files:**
- Modify: `apps/driver/src/components/CourseScreen.tsx`

This screen currently does a single fetch on mount with an empty catch. On failure the entire timing column goes blank. This was the confirmed race-day failure. Add cache-first loading, a 30-second poll, and OfflineBanner.

- [ ] **Step 1: Add imports**

In `apps/driver/src/components/CourseScreen.tsx`, add to the import block at the top:

```ts
import { useState } from 'react'   // already imported — add bannerMessage to existing useState uses
import { setCache, getCache } from '../cache'
import { OfflineBanner } from './OfflineBanner'
import type { LegTimelineItem } from '../api'
```

(Check the existing imports first — `useState`, `publicApi`, and `LegTimelineItem` should already be imported. Only add what's missing.)

- [ ] **Step 2: Add bannerMessage state**

Find the existing state declarations in `CourseScreen`:
```ts
const [tick, setTick] = useState(0)
const [timeline, setTimeline] = useState<LegTimelineItem[]>([])
```

Add `bannerMessage` state:
```ts
const [tick, setTick] = useState(0)
const [timeline, setTimeline] = useState<LegTimelineItem[]>([])
const [bannerMessage, setBannerMessage] = useState<string | null>(null)
```

- [ ] **Step 3: Replace the single-fetch useEffect with cache-first + poll**

Find and replace this existing useEffect:
```ts
useEffect(() => {
  publicApi.get<LegTimelineItem[]>(`/teams/${teamId}/timeline`)
    .then(setTimeline)
    .catch(() => {})
}, [teamId])
```

Replace with:
```ts
useEffect(() => {
  const cacheKey = `kt82_timeline_${teamId}`

  const cached = getCache<LegTimelineItem[]>(cacheKey)
  if (cached) {
    setTimeline(cached.data)
    if (cached.ageMs > 60_000) {
      const mins = Math.max(1, Math.round(cached.ageMs / 60_000))
      setBannerMessage(`NO CONNECTION · Timing data from ${mins} min ago`)
    }
  }

  async function fetchTimeline() {
    try {
      const data = await publicApi.get<LegTimelineItem[]>(`/teams/${teamId}/timeline`)
      setTimeline(data)
      setCache(cacheKey, data)
      setBannerMessage(null)
    } catch {
      const stale = getCache<LegTimelineItem[]>(cacheKey)
      if (stale) {
        const mins = Math.max(1, Math.round(stale.ageMs / 60_000))
        setBannerMessage(`NO CONNECTION · Timing data from ${mins} min ago`)
      } else {
        setBannerMessage('NO CONNECTION · No cached data available')
      }
    }
  }

  fetchTimeline()
  const id = setInterval(fetchTimeline, 30_000)
  return () => clearInterval(id)
}, [teamId])
```

- [ ] **Step 4: Add OfflineBanner to the render output**

In the CourseScreen return JSX, find the top bar div (the div containing the back button and "LIVE" indicator). It starts with:
```tsx
<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '8px 18px' }}>
```

Add `<OfflineBanner message={bannerMessage} />` immediately after the closing `</div>` of the top bar, before the title block:

```tsx
      </div>

      <OfflineBanner message={bannerMessage} />

      {/* Title */}
      <div style={{ padding: '4px 18px 0' }}>
```

- [ ] **Step 5: Verify no TypeScript errors**

```bash
cd apps/driver && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/driver/src/components/CourseScreen.tsx
git commit -m "fix(driver): CourseScreen now caches timeline, polls every 30s, shows OfflineBanner on failure"
```

---

## Task 8: Tracker App.tsx — remove isOnline banner

**Files:**
- Modify: `apps/tracker/src/App.tsx`

The top-level isOnline banner is being replaced by per-component OfflineBanner instances (Tasks 9 and 10). Remove the top-level one.

- [ ] **Step 1: Remove isOnline state, event listeners, and banner**

In `apps/tracker/src/App.tsx`:

Remove the `isOnline` state declaration:
```ts
const [isOnline, setIsOnline] = useState(() => navigator.onLine)
```

Remove the entire isOnline event listener useEffect:
```ts
useEffect(() => {
  function handleOnline()  { setIsOnline(true)  }
  function handleOffline() { setIsOnline(false) }
  window.addEventListener('online',  handleOnline)
  window.addEventListener('offline', handleOffline)
  return () => {
    window.removeEventListener('online',  handleOnline)
    window.removeEventListener('offline', handleOffline)
  }
}, [])
```

Remove the banner JSX block:
```tsx
{!isOnline && (
  <div style={{
    background: 'var(--panel)',
    borderBottom: '1px solid var(--line)',
    padding: '10px 18px',
    fontFamily: "'Hanken Grotesk', sans-serif",
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--mut)',
    textAlign: 'center',
    letterSpacing: '0.04em',
  }}>
    No connection — data may be stale
  </div>
)}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd apps/tracker && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/tracker/src/App.tsx
git commit -m "feat(tracker): remove top-level isOnline banner (replaced by per-component OfflineBanner)"
```

---

## Task 9: Tracker TeamGrid — cache + OfflineBanner

**Files:**
- Modify: `apps/tracker/src/components/TeamGrid.tsx`

TeamGrid already polls every 30 seconds and has a `pollError` state, but shows a small amber `⚠ Unable to refresh` chip. This task adds localStorage caching (so data renders immediately on mount) and replaces the chip with OfflineBanner.

- [ ] **Step 1: Add imports**

At the top of `apps/tracker/src/components/TeamGrid.tsx`, add:

```ts
import { setCache, getCache } from '../cache'
import { OfflineBanner } from './OfflineBanner'
import type { TeamStatus } from '../api'  // already imported — only add what's missing
```

- [ ] **Step 2: Add bannerMessage state**

Find the existing state declarations:
```ts
const [statuses, setStatuses] = useState<TeamStatus[]>([])
const [pollError, setPollError] = useState(false)
const [secondsSinceUpdate, setSecondsSinceUpdate] = useState<number | null>(null)
const lastUpdatedRef = useRef<Date | null>(null)
```

Add `bannerMessage`:
```ts
const [statuses, setStatuses] = useState<TeamStatus[]>([])
const [pollError, setPollError] = useState(false)
const [secondsSinceUpdate, setSecondsSinceUpdate] = useState<number | null>(null)
const lastUpdatedRef = useRef<Date | null>(null)
const [bannerMessage, setBannerMessage] = useState<string | null>(null)
```

- [ ] **Step 3: Load from cache on mount and upgrade the poll function**

Find the `useEffect` that starts with `async function poll()`. Replace the entire effect with:

```ts
useEffect(() => {
  const cacheKey = `kt82_race_status_${race.id}`

  const cached = getCache<TeamStatus[]>(cacheKey)
  if (cached) {
    setStatuses(cached.data)
  }

  async function poll() {
    try {
      const data = await api.get<TeamStatus[]>(`/races/${race.id}/status`)
      setStatuses(data)
      setCache(cacheKey, data)
      lastUpdatedRef.current = new Date()
      setSecondsSinceUpdate(0)
      setPollError(false)
      setBannerMessage(null)
    } catch {
      setPollError(true)
      const stale = getCache<TeamStatus[]>(cacheKey)
      if (stale) {
        const mins = Math.max(1, Math.round(stale.ageMs / 60_000))
        setBannerMessage(`NO CONNECTION · Data from ${mins} min ago`)
      } else {
        setBannerMessage('NO CONNECTION · No cached data available')
      }
    }
  }
  poll()
  const pollId = setInterval(poll, 30_000)
  const tickId = setInterval(() => {
    if (lastUpdatedRef.current) {
      setSecondsSinceUpdate(Math.floor((Date.now() - lastUpdatedRef.current.getTime()) / 1000))
    }
  }, 1_000)
  return () => { clearInterval(pollId); clearInterval(tickId) }
}, [race.id])
```

- [ ] **Step 4: Replace pollError indicator with OfflineBanner**

In the JSX return, find the outermost div (currently `<div className="min-h-screen" ...>`). Wrap the return in a fragment and add OfflineBanner at the top:

Find:
```tsx
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <div className="max-w-2xl mx-auto px-[18px] pt-[18px] pb-8">
```

Replace with:
```tsx
  return (
    <>
      <OfflineBanner message={bannerMessage} />
      <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="max-w-2xl mx-auto px-[18px] pt-[18px] pb-8">
```

Close the fragment at the end of the return (add `</>` after the final `</div>`).

Also remove the existing pollError indicator in the header. Find:
```tsx
            {pollError ? (
              <span style={{ fontSize: 11, color: 'var(--amber)' }}>⚠ Unable to refresh</span>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="live-dot inline-block flex-shrink-0" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
                <span className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--green)' }}>Live</span>
                {secondsSinceUpdate !== null && secondsSinceUpdate > 0 && (
                  <span className="font-mono" style={{ fontSize: 11, color: 'var(--faint)' }}>
                    · {secondsSinceUpdate}s ago
                  </span>
                )}
              </div>
            )}
```

Replace with (always show the Live/seconds indicator — the banner handles the error):
```tsx
            <div className="flex items-center gap-1.5">
              <span className="live-dot inline-block flex-shrink-0" style={{ width: 8, height: 8, borderRadius: '50%', background: pollError ? 'var(--accent)' : 'var(--green)' }} />
              <span className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: pollError ? 'var(--accent)' : 'var(--green)' }}>
                {pollError ? 'Offline' : 'Live'}
              </span>
              {secondsSinceUpdate !== null && secondsSinceUpdate > 0 && (
                <span className="font-mono" style={{ fontSize: 11, color: 'var(--faint)' }}>
                  · {secondsSinceUpdate}s ago
                </span>
              )}
            </div>
```

- [ ] **Step 5: Verify no TypeScript errors**

```bash
cd apps/tracker && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/tracker/src/components/TeamGrid.tsx
git commit -m "feat(tracker): TeamGrid caches status data, shows OfflineBanner on poll failure"
```

---

## Task 10: Tracker TeamDetail — cache + OfflineBanner

**Files:**
- Modify: `apps/tracker/src/components/TeamDetail.tsx`

TeamDetail polls every 30 seconds for the leg timeline (which populates start times and ETAs). It shows a small amber `⚠ Unable to refresh` chip and a `{secondsSinceUpdate}s ago` label. Replace with cache + OfflineBanner.

- [ ] **Step 1: Add imports**

At the top of `apps/tracker/src/components/TeamDetail.tsx`, add:

```ts
import { setCache, getCache } from '../cache'
import { OfflineBanner } from './OfflineBanner'
import type { LegTimelineItem } from '../api'  // already imported — only add what's missing
```

- [ ] **Step 2: Add bannerMessage state**

Find the existing state declarations near the top of the `TeamDetail` component function. Add `bannerMessage`:

```ts
const [bannerMessage, setBannerMessage] = useState<string | null>(null)
```

- [ ] **Step 3: Load from cache on mount and upgrade the poll function**

Find the `useEffect` that contains `async function poll()` and fetches `/teams/${teamId}/timeline`. Replace the entire effect with:

```ts
useEffect(() => {
  const cacheKey = `kt82_team_detail_${teamId}`

  const cached = getCache<LegTimelineItem[]>(cacheKey)
  if (cached) {
    setTimeline(cached.data)
  }

  async function poll() {
    try {
      const data = await api.get<LegTimelineItem[]>(`/teams/${teamId}/timeline`)
      setTimeline(data)
      setCache(cacheKey, data)
      lastUpdatedRef.current = new Date()
      setSecondsSinceUpdate(0)
      setPollError(false)
      setBannerMessage(null)
    } catch {
      setPollError(true)
      const stale = getCache<LegTimelineItem[]>(cacheKey)
      if (stale) {
        const mins = Math.max(1, Math.round(stale.ageMs / 60_000))
        setBannerMessage(`NO CONNECTION · Timing data from ${mins} min ago`)
      } else {
        setBannerMessage('NO CONNECTION · No cached data available')
      }
    }
  }
  poll()
  const pollId = setInterval(poll, 30_000)
  const tickId = setInterval(() => {
    if (lastUpdatedRef.current) {
      setSecondsSinceUpdate(Math.floor((Date.now() - lastUpdatedRef.current.getTime()) / 1000))
    }
  }, 1_000)
  return () => { clearInterval(pollId); clearInterval(tickId) }
}, [teamId])

- [ ] **Step 4: Add OfflineBanner and remove the existing small indicators**

Find the existing small error indicators (around line 173):
```tsx
{pollError && <span style={{ fontSize: 11, color: 'var(--amber)' }}>⚠ Unable to refresh</span>}
{!pollError && secondsSinceUpdate !== null && secondsSinceUpdate > 0 && (
  <span className="font-mono" style={{ fontSize: 11, color: 'var(--faint)' }}>{secondsSinceUpdate}s ago</span>
)}
```

Remove both of those spans.

Then find the outermost div returned by TeamDetail. Add `<OfflineBanner message={bannerMessage} />` as the very first child of that div (before the team header content), or wrap the return in a fragment with OfflineBanner first — whichever matches the component's structure.

- [ ] **Step 5: Verify no TypeScript errors**

```bash
cd apps/tracker && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add apps/tracker/src/components/TeamDetail.tsx
git commit -m "feat(tracker): TeamDetail caches timeline data, shows OfflineBanner on poll failure"
```

---

## Task 11: Manual verification

There are no automated frontend tests. Verify the feature end-to-end in a browser.

- [ ] **Step 1: Start the dev stack**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" ./scripts/dev.sh
```

- [ ] **Step 2: Verify Driver OfflineBanner — offline session restore**

1. Open Driver at `http://localhost:5176/driver` and log in. Navigate to the timing screen.
2. Open Chrome DevTools → Network tab → set throttling to **Offline**.
3. Hard-refresh the page (Cmd+Shift+R).
4. Expected: app loads from localStorage cache (not a blank page) and the orange `OFFLINE · Loaded from saved session` banner appears below the top bar.
5. Switch Network back to **No throttling**.
6. Expected: the banner disappears within a few seconds (reconnection ping succeeds).

- [ ] **Step 3: Verify Driver CourseScreen — stale data banner**

1. With Driver running, navigate to the Course screen.
2. In DevTools → Network tab → set to **Offline**.
3. Wait 35 seconds (one poll cycle).
4. Expected: the orange `NO CONNECTION · Timing data from 1 min ago` banner appears. The timing data remains visible (not blank).
5. Switch back to online.
6. Expected: banner disappears on next poll.

- [ ] **Step 4: Verify Tracker TeamGrid — stale data banner**

1. Open Tracker at `http://localhost:5173/tracker`.
2. In DevTools → Network → **Offline**.
3. Wait 35 seconds.
4. Expected: orange OfflineBanner appears at top with timing data still visible. The Live dot in the header turns orange and reads "Offline".
5. Return online, wait 30s.
6. Expected: banner clears, dot returns to green "Live".

- [ ] **Step 5: Verify service worker builds**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver build && ls apps/driver/dist/sw.js
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker build && ls apps/tracker/dist/sw.js
```

Expected: both commands exit 0 and `sw.js` exists in each dist directory.

- [ ] **Step 6: Final commit if any cleanup was done during verification**

```bash
git add -p   # stage only intentional changes
git commit -m "fix: address issues found during manual verification"
```
