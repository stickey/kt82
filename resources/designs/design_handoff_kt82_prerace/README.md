# Handoff: KT82 Pre-Race Team Overview

## Overview
A polished **pre-race landing page** for a single team in the KT82 (Katy Trail Relay — 82 miles, 18 legs, 6 runners) tracker app. It is shown to a team **only before they have started leg 1**. Once the team starts the race, this view is no longer available and the app switches to the live race view.

The page is a pre-race welcome hub: it celebrates the upcoming start, counts down to the team's assigned gun time, and lays out the full estimated relay timeline — every handoff time, location, and the runner assigned to each leg — ending at the finish in Hermann.

## About the Design Files
The files in this bundle are **design references created in HTML/React (via inline Babel JSX)** — a prototype that demonstrates the intended look, layout, and behavior. **They are not production code to drop in directly.** The task is to **recreate this design in the target codebase's existing environment** (React Native, React web, SwiftUI, etc.) using its established components, navigation, data layer, and styling patterns. If no front-end environment exists yet, pick the most appropriate framework for the project and implement there.

The data files (`kt82-data.js`, `kt82-legs-data.js`) are realistic stand-ins for what should come from the real backend — treat them as a **schema/shape reference and ETA-algorithm reference**, not as the data source.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and the countdown/ETA behavior are final and intended to be matched closely. Recreate the UI faithfully using the codebase's own component library and design tokens, substituting equivalents where the codebase already has them (buttons, type scale, etc.).

---

## Screen: Pre-Race Team Overview

A single mobile screen (designed at 402×874, iPhone-class) that scrolls vertically. Top to bottom it has four regions: **Header**, **Countdown / Fanfare**, **Start→Finish Hero**, **The Route (trail timeline)**.

### Layout
- Single column, full-width regions, mobile-first.
- Outer background `--bg`. Regions are separated by hairline dividers (`--line`) or margin.
- Vertical scroll for the whole screen; the route timeline is the long scrolling content at the bottom.
- Safe-area top padding (~52px) so the header clears the status bar / notch.

### Region 1 — Header (fixed at top of content)
- Padding `52px 18px 14px`, bottom border `1px solid --line`.
- **Eyebrow**: `KT82 · KATY TRAIL RELAY` — 10px, weight 700, letter-spacing 0.15em, color `--accent`, margin-bottom 8px.
- **Row** (`flex`, `space-between`, `align-items: flex-start`, gap 12):
  - **Left**: Team name in display font (Anton), 47px, line-height 0.86, uppercase. Below it a status line: `PRE-RACE · ESTIMATES ONLY` — 11px, weight 700, color `--mut`, margin-top 7px, letter-spacing 0.04em. (When the start time has passed it reads `RACE IN PROGRESS`.)
  - **Right**: a "YOUR START" card. Rounded 14px, padding `9px 13px 11px`, border `1px solid --line`, background `--panel` (dark) / `#fff` (light), min-width 72px, centered text:
    - Label `YOUR START` — 8.5px, weight 800, letter-spacing 0.12em, color `--mut`.
    - Time (mono) — 22px, weight 700, color `--accent`, margin-top 5px.
    - AM/PM (mono) — 10px, color `--mut`.

### Region 2 — Countdown / Fanfare
- Background: dark theme → `--panel2`; light theme → `#1a160f` (intentionally a dark band in light mode for contrast/fanfare). Padding `15px 18px 14px`, centered text, bottom border.
- **Label row** (flex center, gap 7, margin-bottom 9): a 7px pulsing accent dot (`@keyframes pr-pulse`, 1.3s ease-in-out infinite) + text `RACE STARTS IN` — 9.5px, weight 800, letter-spacing 0.2em, color `--accent`. When started: dot hidden, text `RACE IN PROGRESS`.
- **Countdown** (flex center, mono, weight 700, line-height 1): three number groups `HH` `MM` `SS` at **50px**, separated by `:` at 38px in `--accent` (opacity 0.7). Numbers are white-ish (`--text` dark / `#fff` light); turn green (`--green`) once started.
- **Unit labels** row: `HRS` `MIN` `SEC` — 8.5px, weight 700, letter-spacing 0.15em, faint color, gap 38, margin-top 5.
- **Date line**: e.g. `THU · JUN 4 · GUN AT 9:24 AM` — 10.5px, weight 700, letter-spacing 0.08em, margin-top 11.

### Region 3 — Start → Finish Hero
- Margin `14px 16px 0`, background `--accent` (solid), border-radius 18px, padding `15px 18px 13px`, text color `--ink` (white on dark accent).
- **Top row** (flex, `align-items: flex-end`, `space-between`, gap 8):
  - **Left block**: label `TEAM START` (8.5px, weight 800, letter-spacing 0.14em, opacity 0.75) + big time (mono, 32px, weight 700, line-height 0.9) with AM/PM at 15px inline.
  - **Center**: a large `→` (display font, 20px, opacity 0.45).
  - **Right block** (right-aligned): label `EST. FINISH · HERMANN` + big time, same treatment.
- **Divider row** (margin-top 10, padding-top 9, top border `1px solid rgba(255,255,255,0.18)`, flex space-between):
  - Left: `82 MI · 18 LEGS · 6 RUNNERS` — 10.5px, weight 700, opacity 0.8.
  - Right: an `≈ ESTIMATES` chip — 8.5px, weight 800, background `rgba(0,0,0,0.2)`, padding `3px 8px`, radius 20.

### Region 4 — The Route (trail timeline) — the centerpiece
A **connected vertical spine** that reads as the relay route: handoff **nodes** sit on the line, and each **leg segment** between two nodes shows the runner who runs it. Padding `0 18px`. Preceded by a small header row: `THE ROUTE` (left, 9.5px weight 800 letter-spacing 0.14em, color `--mut`) and `EST. HANDOFF TIMES` (right, faint).

**The spine**: a 2px vertical line (`--line`) running down a fixed 30px-wide left rail column, continuous through every row. It starts at the first node and ends at the finish node (line is clipped to start at center of the start node and end at center of the finish node).

**Node row** (a handoff point — there are 19: the start + one per leg end). The whole row is a link that opens that location in maps.
- Left rail (30px): the spine line + a centered dot.
  - **Start node**: hollow dot, 13px, 2.5px `--accent` border, `--bg` fill.
  - **Mid nodes**: hollow dot, 9px, 2.5px `--mut` border, `--bg` fill.
  - **Finish node**: filled `--accent` dot, 15px, no border, with a soft `0 0 0 4px {accent}22` halo.
- Content (flex, align-center, gap 8, padding `5px 0`):
  - **Time column** (fixed 62px, right-aligned, nowrap): time (mono, 13.5px, weight 700) + AM/PM (mono, 8px, faint). Time is `--accent` for the start and finish nodes, `--text` for mid nodes.
  - **Location name** (flex 1, ellipsis): 12.5px, weight 700. `--text` normally, `--accent` for the finish node.
    - Start node appends a faint `START` tag (8.5px, weight 700, letter-spacing 0.1em, color `--faint`).
    - Finish node appends a solid `FINISH` badge (8px, weight 800, background `--accent`, color `--ink`, padding `2px 6px`, radius 20).

**Leg segment row** (between two nodes — 18 of them, the run a single runner does). Tucked tight against the spine so it clearly belongs to the stretch between the two handoffs.
- Left rail (30px): the spine line passes straight through (no dot).
- Content (flex, align-center, gap 8, padding `6px 0`):
  - **Leg chip**: `L1`…`L18` — mono, 8.5px, weight 700, letter-spacing 0.04em, color `--faint`, `1px solid --line` border, radius 5, padding `2px 5px`. (Deliberately quiet — the leg number must NOT dominate the node.)
  - **Runner name** (flex 1, ellipsis): 12.5px, weight 700, `--text`. This is the lead element of the segment.
  - **Distance**: e.g. `5.1 mi` — mono, 10.5px, weight 500, `--faint`.
  - **Map pin button**: 24px circle, `1px solid --line` border, `--panel2` background, a small map-pin SVG in `--mut`; links to the leg route in maps. `stopPropagation` so it doesn't trigger the node link.

**Footer note** under the timeline: two centered lines, 10.5px, weight 600, `--faint`, line-height 1.5:
`Handoff times are estimates from each runner's target pace.` / `Live tracking begins the moment your team starts leg 1.`

---

## Interactions & Behavior
- **Live countdown**: a 1-second interval recomputes `teamStart − now` and renders `HH:MM:SS`. Clamp negative to 00:00:00.
- **Started state**: when `now ≥ teamStart`, the countdown digits turn green, the pulsing dot hides, and the labels switch to `RACE IN PROGRESS`. (In the real app, this screen should simply not be reachable once the team has started — this in-page state is just a graceful boundary.)
- **Gating**: route to this screen ONLY when the team has not started leg 1. After the first leg starts, show the live race view instead.
- **Map links**: every node opens its location; every leg pin opens that leg's route. All open in a new tab/external maps. URLs are built from lat/lng (see Data).
- **Estimates messaging**: the `ESTIMATES ONLY` status, the `≈ ESTIMATES` hero chip, the `EST. HANDOFF TIMES` label, and the footer note all reinforce that times are projections. Keep this framing.
- **Scroll**: only the route timeline is long; header/countdown/hero stay at the natural top of the scroll.

## State Management
- `teamStartTime: Date` — the team's **assigned** start time (see Data requirements). Drives the countdown AND the entire ETA chain.
- `now: Date` — ticked every second.
- Derived (memoized on `teamStartTime`): the **schedule** — an array of `{ leg, runner, legStart, legEnd }` for all 18 legs.
- No data fetching in the prototype; in production, fetch the team (with its assigned start time), the 18 legs, and the 6 runners.

## ETA Algorithm (compute per-leg handoffs before any results exist)
Walk the legs in order, accumulating time from the team start:
```
ms = teamStartTime
for each leg i (1..18):
  runner   = runners[(i - 1) % 6]        // 6 runners rotate, 3 legs each
  legStart = ms                          // = previous leg's handoff (team start for leg 1)
  ms      += runner.pace * leg.miles * 1000   // pace is SECONDS per mile
  legEnd   = ms                          // the handoff / arrival time
finishTime = legEnd of leg 18            // arrival in Hermann
```
- `runner.pace` is **seconds per mile** (e.g. 470 = 7:50/mi). `legEnd` of one leg is exactly `legStart` of the next — the timeline chains seamlessly. The hero "EST. FINISH" is the final `legEnd`.
- This is intentionally a **pure pace×distance projection** with no variance, since it must work before any live results exist.

## Data Requirements (backend)
- **Each team needs an assigned start time.** This likely requires a DB/schema update (e.g. `team.assignedStartTime`). In the prototype it's faked as `pageLoad + hoursUntil` so the countdown is live for demos — replace with the real field.
- **Legs** (18): `n`, `start` (name), `end` (name), `miles`, start lat/lng `s`, end lat/lng `e`, plus `diff`/`note` (not shown on this screen but available). See `kt82-legs-data.js`. Leg 18 ends at Hermann (the finish).
- **Runners** (6): `id`, `name`, `initials`, `pace` (sec/mile). See `kt82-data.js`. They rotate `(legNumber - 1) % 6`.
- **Map URLs**:
  - Location point: `https://www.google.com/maps?q={lat},{lng}`
  - Leg route: `https://www.google.com/maps/dir/{startLatLng}/{endLatLng}`

## Design Tokens

Two themes. The token object is selected by theme; an optional accent override replaces `--accent`.

**Dark (default)**
| token | value |
|---|---|
| bg | `#13110a` |
| panel | `#1d1810` |
| panel2 | `#241d12` |
| line | `rgba(255,240,220,0.10)` |
| line2 | `rgba(255,240,220,0.055)` |
| text | `#fbf6ee` |
| mut | `#a99e8c` |
| faint | `#6a6053` |
| accent | `#ff5a1f` |
| green | `#37d27a` |
| ink | `#13110a` |

**Light**
| token | value |
|---|---|
| bg | `#f4f0e7` |
| panel | `#ffffff` |
| panel2 | `#faf6ec` |
| line | `rgba(0,0,0,0.09)` |
| line2 | `rgba(0,0,0,0.05)` |
| text | `#1a160f` |
| mut | `#6f6759` |
| faint | `#b0a795` |
| accent | `#e8480f` |
| green | `#0e9b52` |
| ink | `#ffffff` |

**Accent options offered:** `#ff5a1f` (default), `#ff2e63`, `#2b6fff`, `#7a5af0`.

**Typography**
- Display: **Anton** (team name, big `→`). Uppercase, very tight line-height (0.86–1.0).
- Body: **Hanken Grotesk** (weights 400/500/600/700/800).
- Mono: **JetBrains Mono** (all times, distances, countdown).
- Key sizes: countdown digits 50px; hero times 32px; team name 47px; node time 13.5px; node location 12.5px; runner 12.5px; leg chip / micro-labels 8–9.5px.

**Spacing / radius**: region padding ~14–18px; hero radius 18px; start-card radius 14px; map-pin circle 24px; leg chip radius 5px; badges radius 20px. Left rail width **30px**, time column width **62px** (these two govern the timeline alignment).

**Motion**: `pr-pulse` — opacity 1→0.35→1 and scale 1→0.82→1 over 1.3s, infinite, on the countdown dot only. Respect `prefers-reduced-motion`.

## Assets
- No raster assets. The only graphics are inline **map-pin SVGs** (a teardrop pin with a hollow center) drawn in code — reuse the codebase's icon set if it has a map-pin/location icon.
- Fonts via Google Fonts (Anton, Hanken Grotesk, JetBrains Mono) — swap for the codebase's equivalent display/body/mono stack if it has one.
- The iPhone bezel (`ios-frame.jsx`) is **prototype chrome only** — do not reproduce it; it just frames the screen for presentation.

## Files in this bundle
- `KT82 Pre-Race.html` — entry point. App shell, theme tokens (`tokB`/`tok`), device-fit scaling, and the Tweaks panel wiring. Open this to see the design.
- `pre-race.jsx` — **the actual screen**: `PreRaceScreen` (regions + countdown + schedule), `Trail` / `TrailNode` / `TrailLeg` (the timeline), plus the `prClock` / `prCd` / `prDate` time helpers and the ETA algorithm. **This is the file to read for the implementation.**
- `kt82-legs-data.js` — the 18 real legs (names, miles, lat/lng, map URLs). Shape/algorithm reference.
- `kt82-data.js` — runners (pace), schedule-builder, and map URL helpers. Shape/algorithm reference.
- `ios-frame.jsx` — prototype device bezel (presentation chrome; ignore for production).
- `tweaks-panel.jsx` — prototype-only control panel (team, hours-to-start, theme, accent). Not part of the product.

## Notes for the implementer
- Build the screen with the codebase's components and tokens; map the tokens above to existing theme variables where possible.
- The two layout constants that make the spine line up are the **30px rail** and **62px time column** — keep node dots and leg content aligned to the same rail center.
- Keep the leg number visually quiet (the `L#` chip) — an earlier iteration with large leg numbers was rejected for competing with the nodes.
- Preserve the "this is only an estimate" framing throughout.
