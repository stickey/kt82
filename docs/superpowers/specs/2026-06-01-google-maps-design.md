**Status:** Implemented

# Google Maps Navigation Links

## Context

The Driver app and Tracker app both generate "navigate to handoff" links that open Apple Maps. On Android devices (common among participants and spectators) Apple Maps links fail or redirect awkwardly. Switching to Google Maps URLs works on all platforms — Android opens the Google Maps app, iOS opens Google Maps if installed or falls back to a browser-based map.

## Design

Replace all Apple Maps URLs (`maps.apple.com`) with Google Maps direction URLs (`google.com/maps/dir`). No UI changes — the links look and behave identically to users; only the destination app changes.

### URL format

| Input | New URL |
|---|---|
| Lat/lng | `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}` |
| Address string | `https://www.google.com/maps/dir/?api=1&destination={encodeURIComponent(address)}` |

## Changes

### `apps/driver/src/api.ts` — `buildNavUrl`

```ts
export function buildNavUrl(handoff: Handoff): string {
  if (handoff.lat != null && handoff.lng != null)
    return `https://www.google.com/maps/dir/?api=1&destination=${handoff.lat},${handoff.lng}`
  if (handoff.address)
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(handoff.address)}`
  return ''
}
```

### `apps/tracker/src/components/TeamDetail.tsx`

Two hardcoded Apple Maps URLs (lines ~196 and ~272). Replace both:

- **Before:** `https://maps.apple.com/?daddr=${lat},${lng}`
- **After:** `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`

## Verification

1. Run the driver app, start a leg that has a handoff with lat/lng
2. Tap the navigation link — should open Google Maps (or google.com/maps in browser)
3. Open the tracker, navigate to a team detail with a future leg that has a handoff — nav link should also use Google Maps
