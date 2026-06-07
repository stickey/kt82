# Offline Resilience — Phase 2 Design

**Date:** 2026-06-07
**Status:** Pending Implementation
**Builds on:** `2026-06-02-offline-resilience-design.md` (implemented: pendingActions queue, optimistic LAP, Tracker isOnline banner)

## Problem

Three gaps remain after Phase 1:

1. **Cold-start failure (Driver, P1):** A driver opens the browser fresh in a dead zone. The JS/CSS bundle cannot download. The app never loads.
2. **CourseScreen goes blank (Driver + Tracker, P1):** CourseScreen fetches the leg timeline once on mount with an empty catch. On failure, `timeline` stays `[]` and the entire timing column shows `—` with no explanation. There is no poll — data also goes stale during long legs.
3. **Weak connectivity indicators:** The existing "Offline · Cached" and "Syncing…" labels are 11px muted text, easy to miss in sunlight. The Tracker's offline banner is similarly low-contrast. Users cannot tell at a glance that data is stale.

## Scope

- **Driver app:** service worker shell caching, CourseScreen data caching + poll, improved TimingScreen connectivity indicator
- **Tracker app:** service worker shell caching, team status data caching, CourseScreen data caching + poll, improved connectivity indicator
- **Captain / Manager apps:** no changes
- **Server:** no changes

---

## Section 1: Service Worker Shell Caching (vite-plugin-pwa)

Both Driver and Tracker get `vite-plugin-pwa` added to their `vite.config.ts`. The plugin auto-generates a Workbox service worker that precaches the compiled app bundle (JS, CSS, HTML) on first successful load. Subsequent opens — including cold starts in dead zones — serve the app from disk.

**Scope constraint:** the service worker caches static assets only. All API traffic passes through to the server unchanged. The existing pendingActions queue and sessionCache are unaffected.

**Base path handling:** each app has a Vite `base` path (`/driver`, `/tracker`). The service worker `scope` is confined to that path so the two workers do not interfere. Configure via `vite-plugin-pwa`'s `scope` option matching the app base.

**Update behavior:** Workbox detects changed asset hashes on each deploy and silently updates the cached bundle in the background. The updated bundle activates on next open (no user action required, no stale-app problem).

**vite.config.ts change (same pattern for both apps):**
```ts
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
        name: 'KT82 Driver',       // or 'KT82 Tracker'
        short_name: 'KT82',
        theme_color: '#1a1612',    // var(--bg)
        background_color: '#1a1612',
        display: 'standalone',
        start_url: '/driver',      // or '/tracker'
        scope: '/driver',          // or '/tracker'
      },
    }),
  ],
  base: '/driver',
  server: { port: 5176, proxy: { '/api': 'http://localhost:3001' } },
})
```

The manifest is included as a byproduct — both apps become installable on supporting devices. No custom install prompt UI is added.

---

## Section 2: Data Caching Utility

Each app gets a new `src/cache.ts` module — a thin localStorage wrapper with a timestamp. Components use it to render immediately from cache on mount, then refresh from the network.

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

No expiry — stale data is always better than a blank screen. Cache keys:

| Screen | Cache key |
|---|---|
| Driver CourseScreen | `kt82_timeline_{teamId}` |
| Tracker TeamGrid | `kt82_race_status_{raceId}` |
| Tracker TeamDetail | `kt82_team_detail_{teamId}` |

The existing `sessionCache` (driver session state) and `pendingActions` queue are unchanged.

---

## Section 3: OfflineBanner Component

Both apps get a new `src/components/OfflineBanner.tsx`. It renders a full-width orange strip when `message` is non-null, nothing when null.

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

Parent components own the message string. They compute it from their connectivity state and pass it down. No global state, no context.

Three message patterns used across the apps:

| Situation | Message |
|---|---|
| App loaded from cache, no network | `OFFLINE · Loaded from saved session` |
| LAP queued, waiting to sync | `LAP QUEUED · Will sync when signal returns` |
| Fetch failed, showing stale data (with age) | `NO CONNECTION · Timing data from 4 min ago` |
| Fetch failed, no cache available | `NO CONNECTION · No cached data available` |

---

## Section 4: TimingScreen (Driver)

**Remove:** the existing inline "Offline · Cached" / "Syncing…" badge (11px muted text in the header bar). Also remove "Syncing…" on `resultId === null` — that's normal post-LAP operation, not a connectivity problem.

**Add:** `OfflineBanner` below the top bar. Message logic:
- `pendingAction !== null` → `LAP QUEUED · Will sync when signal returns` (highest priority)
- `restoredFromCache && pendingAction === null` → `OFFLINE · Loaded from saved session`
- Neither → `null` (no banner)

**Clearing `restoredFromCache`:** App.tsx already has a lap retry loop (fires every 5s when `pendingAction !== null`) and a leg-map poll (fires every 15s). Add `setRestoredFromCache(false)` to the success path of both. For the common case where the driver has no pending LAP and is not on the leg-map screen, add a one-shot connectivity check in App.tsx: when `restoredFromCache` is true and view is `racing`, fire a single `GET /races/active` in a `useEffect`; on success call `setRestoredFromCache(false)`. This means the banner clears within seconds of the device regaining a usable signal.

---

## Section 5: Driver CourseScreen

The **driver's** `CourseScreen` fetches `/teams/{teamId}/timeline` once on mount with an empty catch and never polls — confirmed as the root cause of the race-day blank-screen issue. Replace this with:

1. **On mount:** call `getCache('kt82_timeline_{teamId}')`. If present, set `timeline` immediately and set `bannerMessage` to `NO CONNECTION · Timing data from X min ago` if `ageMs > 60_000`, else `null`.
2. **Fetch:** fire the API call. On success: `setTimeline`, `setCache`, `setBannerMessage(null)`. On failure: if cache was loaded, update banner with current age; if no cache, set banner to `NO CONNECTION · No cached data available`.
3. **Poll:** `setInterval` every 30 seconds while the screen is open. Each tick follows the same success/failure logic as step 2.
4. **Cleanup:** `clearInterval` on unmount.

`OfflineBanner` is rendered just below the top bar, above the title block.

The "LIVE" dot in the header remains — it reflects whether the race is in progress, not connectivity.

Note: the **tracker's** `CourseScreen` is a pure rendering component — it receives `timeline` as a prop from `TeamDetail`, which owns the fetch. No changes to tracker's `CourseScreen.tsx` are needed.

---

## Section 6: Tracker TeamGrid and TeamDetail

Both components already poll every 30 seconds and have `pollError` + `secondsSinceUpdate` states. The existing indicators are small/amber and easy to miss. The changes are: add localStorage cache load on mount, and upgrade the existing error indicators to `OfflineBanner`.

**TeamGrid** (`apps/tracker/src/components/TeamGrid.tsx`):
- On mount: call `getCache('kt82_race_status_{raceId}')`, call `setStatuses` immediately if present.
- The existing 30-second `poll()` function: on success, add `setCache('kt82_race_status_{raceId}', data)`. On failure (already sets `setPollError(true)`), also compute banner message from cache age.
- Replace the existing `pollError` amber indicator with `OfflineBanner`. Compute message: if cache exists, `NO CONNECTION · Data from X min ago`; if no cache, `NO CONNECTION · No cached data available`.

**TeamDetail** (`apps/tracker/src/components/TeamDetail.tsx`):
- Same pattern with `kt82_team_detail_{teamId}` caching the timeline.
- The existing `pollError` amber chip (`⚠ Unable to refresh`) and `secondsSinceUpdate` label are replaced by `OfflineBanner` using the same message logic.
- `OfflineBanner` is rendered at the top of the component, above the team header.

**Tracker App.tsx:**
- Remove the existing `isOnline`-based banner div and its event listeners.
- The per-component `OfflineBanner` instances now own connectivity communication; a top-level `isOnline` flag is no longer needed.

---

## Section 7: Error Handling

Fetch failure handling is consistent across all components:
- Never clear data that is already rendering
- Show OfflineBanner with specific message (with age if cache exists, without if not)
- Poll continues trying; on next success the banner clears
- No retry buttons, no manual refresh controls

One explicit empty state: CourseScreen opens for the first time with no network and no cache. Leg rows render with `—` for times (same as today), and the banner reads `NO CONNECTION · No cached data available`. This is the only place an empty state with no data is shown, and it is labeled.

---

## Files Changed

| File | Change |
|---|---|
| `apps/driver/package.json` | Add `vite-plugin-pwa` devDependency |
| `apps/tracker/package.json` | Add `vite-plugin-pwa` devDependency |
| `apps/driver/vite.config.ts` | Add VitePWA plugin with autoUpdate + manifest |
| `apps/tracker/vite.config.ts` | Add VitePWA plugin with autoUpdate + manifest |
| `apps/driver/src/cache.ts` | New — setCache / getCache utility |
| `apps/tracker/src/cache.ts` | New — setCache / getCache utility |
| `apps/driver/src/components/OfflineBanner.tsx` | New — orange strip component |
| `apps/tracker/src/components/OfflineBanner.tsx` | New — orange strip component |
| `apps/driver/src/components/TimingScreen.tsx` | Replace inline badge with OfflineBanner; remove "Syncing…" |
| `apps/driver/src/components/CourseScreen.tsx` | Add cache load on mount, 30s poll, OfflineBanner |
| `apps/tracker/src/App.tsx` | Remove isOnline banner and related state |
| `apps/tracker/src/components/TeamGrid.tsx` | Add cache load on mount; upgrade pollError indicator to OfflineBanner |
| `apps/tracker/src/components/TeamDetail.tsx` | Add cache load on mount; upgrade pollError + secondsSinceUpdate to OfflineBanner |
