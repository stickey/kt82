# Leg Map Screen — Runner on Map

**Date:** 2026-06-03  
**Status:** Approved  
**Apps:** Driver, Tracker  

---

## Overview

A full-screen map view showing the runner's estimated position on the current leg's road route. Builds directly on the LegProgressScreen: the same `lpEstimates()` `frac` values that drive the progress bar are used to place a runner icon along the actual course polyline.

The map is non-interactive (no pan/zoom). It fits the full viewport and updates every second.

---

## Route Data

### Storage

Add `routeCoords: [number, number][]` to the `CourseLeg` interface in `packages/shared/src/course.ts`. Each entry is a `[lat, lng]` pair. The array represents the road path for the leg (not straight-line).

```typescript
export interface CourseLeg {
  legNumber: number
  startName: string
  startLat: number
  startLng: number
  endName: string
  endLat: number
  endLng: number
  miles: number
  routeCoords: [number, number][]   // road path, [lat, lng] pairs
}
```

### How to provide the route data

1. Go to **geojson.io**
2. Draw 18 polylines — one per leg, tracing the actual road route
3. Export as GeoJSON
4. Extract the `coordinates` arrays from each `LineString` feature (GeoJSON uses `[lng, lat]` order — swap to `[lat, lng]` when writing into `COURSE_LEGS`)

There is no runtime routing API. The geometry is static in source.

### Position interpolation utility

Add `lerpAlongPolyline(coords: [number, number][], frac: number): [number, number]` to `packages/shared/src/course.ts`.

Algorithm:
1. Compute cumulative Euclidean distances between consecutive coordinate pairs to get `totalLength`
2. Target distance = `frac * totalLength`
3. Walk segments until cumulative distance reaches the target; linearly interpolate within the segment

This is degree-based distance (not haversine) — sufficient for the small scales involved (≤10 miles per leg).

---

## New Screen: LegMapScreen

One new component added to both apps at:
- `apps/driver/src/components/LegMapScreen.tsx`
- `apps/tracker/src/components/LegMapScreen.tsx`

### Props

Mirrors LegProgressScreen exactly (same call site, same data):

```typescript
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
```

### Map library

**Leaflet.js** (`leaflet` + `@types/leaflet`). Added to both `apps/driver` and `apps/tracker`.

Tile layer: CartoDB Dark Matter  
URL: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`  
Attribution: `© OpenStreetMap contributors © CARTO`

### Map configuration

- Container: `width: 100%; height: 100dvh` (full viewport)
- All interaction disabled: `dragging: false`, `zoomControl: false`, `scrollWheelZoom: false`, `doubleClickZoom: false`, `keyboard: false`, `touchZoom: false`, `tap: false`
- `map.fitBounds(routeBounds)` on mount — fits the leg's full polyline with a small padding
- No re-fitting on update (bounds are static per leg)

### Leaflet/Vite icon fix

Vite breaks Leaflet's default marker icon paths. Use `L.divIcon` for all markers (runner icon, start/end) — no PNG assets needed.

### Map layers (drawn in order)

1. **Route polyline** — the full `routeCoords` for the current leg, styled in accent color, moderate weight
2. **Range segment** — a second polyline overlaid on the route from `frac[minPace]` to `frac[maxPace]` (i.e., −30s/mi to +30s/mi estimates), semi-transparent accent
3. **Runner icon** — a `L.divIcon` marker at `lerpAlongPolyline(routeCoords, estimates[2].frac)` (target pace position); styled as a runner glyph or colored dot
4. **Start marker** — small `L.divIcon` at leg start coords, labelled with `startName`
5. **End marker** — small `L.divIcon` at leg end coords, labelled with `endName` (handoff point)

The range segment mirrors the progress bar logic: `minFrac` = fastest pace (offset −30), `maxFrac` = slowest pace (offset +30). No artificial widening needed on the map since the visual rendering tolerates a thin segment.

### Live update

Same pattern as LegProgressScreen: `setInterval` every 1000ms calling `lpEstimates(startedAtMs, nowMs, distMiles, targetPaceSecPerMile)`. On each tick, update the runner icon's `LatLng` and the range segment's polyline points. The tile layer and route polyline are static.

### Chrome

Same top-bar chrome as LegProgressScreen:
- Back button (top-left): `← {backLabel}`, dismisses the screen
- LIVE indicator (top-right): pulsing green dot + "LIVE" label
- Runner name and leg info (overlaid on map, top area below back/live bar)

The chrome overlays the map (positioned absolutely over the Leaflet container).

---

## Navigation

### Entry points

The MAP button appears in three places, all guarded by the same condition: an active leg with a non-null `targetPaceSecPerMile`.

1. **Driver — TimingScreen (main racing screen):** Add a "MAP →" button directly on the timing screen, alongside or near the existing "WHEN DO THEY ARRIVE?" button. Opens `LegMapScreen` directly without requiring a trip through LegProgressScreen first.

2. **Tracker — TeamDetail (main team view):** Add a "MAP →" button in the active-leg section of `TeamDetail`, alongside the existing EST. ARRIVAL tap target. Managed via local state (`showLegMap`) the same way `showLegProgress` works today.

3. **LegProgressScreen (both apps):** Add a "MAP →" button at the bottom of the progress screen for users who are already there.

All three entry points pass identical props to `LegMapScreen`.

### App.tsx changes (Driver)

Add a `leg-map` view type to the Driver's navigation union, adjacent to `leg-progress`. Same state shape — no new fields needed. Transition handlers mirror `handleViewLegProgress`/`handleBackFromLegProgress`.

---

## Design Handoff

Visual design (runner icon, route line weight/color, marker styling, chrome typography, overlay opacity) is delegated to a Claude design file in `resources/designs/design_handoff_kt82_leg_map/`. The design file should follow the same format as `design_handoff_kt82_leg_progress/` and use the existing Direction B design tokens.

The spec intentionally omits pixel-level styling — that is the design handoff's domain.

---

## Dependencies

| Package | Added to |
|---|---|
| `leaflet` | `apps/driver`, `apps/tracker` |
| `@types/leaflet` | `apps/driver`, `apps/tracker` |

Leaflet's CSS must be imported in the component (or app entry): `import 'leaflet/dist/leaflet.css'`. Without it the map tiles do not render correctly.

No server changes. No new API endpoints. All data is client-side.

---

## Verification

1. Add placeholder `routeCoords` (e.g., 3-point arrays) to one leg in `COURSE_LEGS` and confirm `lerpAlongPolyline` returns a point between start and end
2. Open Driver app → start a leg → tap "WHEN DO THEY ARRIVE?" → tap "MAP →" → confirm full-screen map renders, route line visible, runner icon placed on route
3. Wait 10–15 seconds; confirm runner icon advances along the route
4. Confirm range segment is visible as a semi-transparent overlay
5. Tap back, confirm return to LegProgressScreen
6. Repeat entry path from Tracker app
7. Confirm map is non-pannable (attempt drag — map should not move)
