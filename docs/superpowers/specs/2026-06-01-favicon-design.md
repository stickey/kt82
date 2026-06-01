**Status:** Approved

# Favicon — KT82 Race Suite

## Context

All four apps currently ship with the default Vite placeholder favicon (`vite.svg` — the Vite logo). This looks wrong in browser tabs and on mobile home-screen bookmarks. The Captain and Manager apps also have the generic `<title>Vite + React + TS</title>`. This spec covers replacing the placeholder with a proper KT82-branded favicon across all four apps.

## Design

- **Shape:** Rounded rectangle (rx="10" on a 64×64 viewBox)
- **Background:** Deep forest green `#14532d` — evokes the rural Missouri race setting, distinct in browser chrome
- **Text:** `KT82` centered, bold condensed (`Barlow Condensed` / `Arial Narrow` fallback), color `#f0fdf4`, font-size 27, letter-spacing −0.5
- **Format:** SVG — sharp at all sizes, no build step required

SVG source (identical for all four apps):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="10" fill="#14532d"/>
  <text x="32" y="46" font-family="'Barlow Condensed','Arial Narrow',Arial,sans-serif"
        font-weight="700" font-size="27" fill="#f0fdf4"
        text-anchor="middle" letter-spacing="-0.5">KT82</text>
</svg>
```

## Changes

Four apps — same change in each:

### `apps/{tracker,captain,manager,driver}/public/favicon.svg`
Create this file with the SVG above. The existing `vite.svg` can be deleted.

### `apps/{tracker,captain,manager,driver}/index.html`
1. Replace the favicon link:
   - **Before:** `<link rel="icon" type="image/svg+xml" href="/vite.svg" />`
   - **After:** `<link rel="icon" href="/favicon.svg" type="image/svg+xml" />`
2. Fix the `<title>` tags where they're still the Vite placeholder:
   - Captain: `<title>KT82 Captain</title>`
   - Manager: `<title>KT82 Manager</title>`
   - Tracker already has `KT82 Tracker` ✓
   - Driver already has `KT82 Driver` ✓

## Verification

1. Run any app locally (e.g. `pnpm --filter tracker dev`)
2. Open `http://localhost:5173` — browser tab should show the green KT82 icon
3. Repeat a spot-check for one other app (e.g. manager at port 5175)
4. Confirm the Vite logo is gone from all tabs
