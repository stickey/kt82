# Handoff: KT82 — "The Course" all-legs overview (Tracker + Driver)

## Overview
A new screen for the **KT82** app suite that shows the **entire 18-leg course on one screen**, with:
- **Tappable Google-Maps links** for every leg's **START** and **FINISH** point (and a per-leg "full directions" route link).
- The **live race clock** (total race time, ticks every second) + a blinking **LIVE** indicator.
- An obvious **completed / active / upcoming** breakdown, contextual to the viewing team's progress, including a position marker on a progress bar and a "✓ N done · on leg n · N to go" tally.

This extends the existing **Direction B "Course / Bib"** redesign. It reuses those design tokens, fonts, and the map-pin pattern verbatim — read `../design_handoff_kt82_tracker_driver/README.md` first for the token layer; this doc only covers the **new** screen and how to wire it.

It applies to the two race-day apps:
- **Tracker** (`apps/tracker`) — the public spectator board. Reached from a **team's detail** page.
- **Driver** (`apps/driver`) — the in-vehicle timing app. Reached from the **timing screen**.

> Out of scope: Captain & Manager. No changes to polling, auth, or the timing state machine — this is a read-only view layered on data already loaded.

---

## About the design files
The files in this bundle are **design references built in HTML/JSX** — a high-fidelity prototype of look + behavior, **not production code to paste in**. The task is to **re-implement this screen in the real `apps/tracker` and `apps/driver` codebases** (React 18 + Vite + TypeScript + Tailwind), reusing their established components, types (`@kt82/shared`), API client, and helpers (`buildNavUrl`, `formatRaceTime`, etc.). The mock `kt82-legs-data.js` exists only so the prototype runs standalone — bind to the **real API** instead.

### Fidelity: **High-fidelity (hifi).**
Colors, type, spacing, and interactions are final. Pixel values below are the source of truth; convert to the nearest Tailwind step or use arbitrary values (`text-[15px]`, `rounded-[16px]`).

---

## Where it lives / entry points

| App | Entry point | Opens with |
|---|---|---|
| **Tracker** | On **TeamDetail** (`TeamDetail.tsx`), the `THE COURSE` section header is now a button: right side reads **`ALL 18 LEGS →`**. | That team's current leg + race-elapsed. Back returns to the team detail. |
| **Driver** | On **TimingScreen** (`TimingScreen.tsx`), a secondary button under "Navigate to…": **`VIEW ALL 18 LEGS · THE COURSE →`**. | The driver's current leg + live race clock. Back returns to timing. |

**Deliberately NOT on the Tracker all-teams grid** — the course view is only meaningful in a single team's context (it highlights *that team's* position), so it is reached through a team, never from the grid.

In the prototype this is the component **`CourseLegsScreen`** in `course-legs.jsx`, rendered as a full screen (it replaces the current screen; not a modal). Back button is top-left.

---

## Screen: "THE COURSE" (all legs)

Vertical scroll. Top → bottom:

### 1. Top bar
- Left: back button — `← <CONTEXT>` (Tracker: `← <TEAM NAME>`; Driver: `← TIMING`). Hanken **800**, 12px, `letter-spacing .04em`, color `mut`, `white-space: nowrap`.
- Right: blinking green dot (7px, color `green`, the existing 1.5s blink) + `LIVE` (Hanken 700, 11px, `.1em`, `mut`).
- Padding `8px 18px`.

### 2. Title block  (padding `4px 18px 0`)
- Accent eyebrow: `KT82 · KATY TRAIL RELAY · <TEAM NAME>` — Hanken **700**, 11px, `.14em`, color `accent`.
- `THE COURSE` — **Anton 50**, uppercase, `line-height .84`, `margin-top 8px`.

### 3. Race clock + position  (padding `16px 18px 18px`)
A two-column row:
- **Left:** `formatRaceTime(now − raceStartedAt)` in **JetBrains Mono 700, 26px** (ticks every second). Label below: `TOTAL RACE TIME` — Hanken **800**, 10px, `.12em`, `mut`.
- **Right (text-align right, `white-space: nowrap`):** `LEG {currentLeg}` mono 700 16px + `/ {18}` (11px, `mut`). Below: `{milesDone} OF {totalMiles} MI` — Hanken 700, 10px, `.08em`, `faint`.

**Progress bar** (full width, height 8, radius 999, track = `line`):
- Fill width = `milesDone / totalMiles`, color `accent`.
- **Position marker** at the fill edge: a 14px `accent` dot, `2.5px solid <bg>` ring + `0 0 0 2px accent` outer ring (`position:absolute; left:{pct}%; translate(-50%,-50%)`). `overflow: visible` on the track so the marker isn't clipped.

**Tally pills** (`margin-top 12`, flex, gap 7) — three pills, each Hanken **800**, 9.5px, `.06em`, `padding 5px 10px`, `radius 999`, with `color = X` and `background = X @ ~11% alpha`:
- `✓ {doneCount} DONE` → color `green`
- `● ON LEG {currentLeg}` → color `accent`
- `{toGo} TO GO` → color `faint`

**Now-running callout** (`margin-top 14`): a `radius 14` box, `background accent@~8%`, `border 1px accent@~33%`, `padding 11px 14px`. Blinking 8px `accent` dot + two lines:
- `RACE IN PROGRESS · ON LEG {currentLeg}` — Hanken 800, 9.5px, `.12em`, `accent`.
- `{currentLeg.start} → {currentLeg.end}` — Hanken 700, 13px, `text`, truncated.

### 4. Column header  (padding `0 30px 6px`, grid `40px 1fr auto`, gap 12)
Hanken **800**, 9px, `.1em`, `faint`: `LEG` (centered) · `START → FINISH` · `DIFF · MI` (right).

### 5. Leg rows  (list padding `0 8px 36px`, `gap 2`)
One **CLLegRow** per leg, grid `40px 1fr auto`, column-gap 12, `padding 13px 12px 13px 16px`. Each row has a **3px status stripe** down the far-left edge (`position:absolute; left:0`):

| State | Stripe | Row background | Leg # color | Badge under # |
|---|---|---|---|---|
| **done** (`n < currentLeg`) | `green` | `green @ ~6%` (radius 12) | `mut` | `✓ DONE` — a 13px `green` disc with `ink` ✓ + `DONE` text (Hanken 800, 7.5px, `green`) |
| **now** (`n === currentLeg`) | `accent` | `accent @ ~11%` (radius 16, `1px accent` border) | `accent` | `LIVE` pill (Hanken 800, 7.5px, `ink` on `accent`) |
| **upcoming** (`n > currentLeg`) | `line` | none | `faint` | the immediate next leg only: outlined `NEXT` pill (`accent`); others: nothing |

- Leg number: **Anton 30**, `line-height .8`.
- **START → FINISH column** (the middle): two stacked `MapLink` rows joined by a short 2px connector line (`green@40%` when done, else `line`):
  - Each `MapLink` is a grid `12px 1fr auto`: a 9px dot (start = hollow ring; finish = filled; **upcoming = hollow** for both) colored by state; a label (`START`/`FINISH`, Hanken 800 8.5px `.14em` `faint`) above the place **name** (Hanken **700**, 14.5px; `text` for done/now, slightly muted otherwise); and a **map-pin** icon on the right. The whole row is the `<a>` link (see Map links).
  - Below the two links: **`FULL DIRECTIONS ↗`** — Hanken 800, 9.5px, `.08em`, color `accent` when active else `mut`. Links to the leg's route.
- **Right column (DIFF · MI):** a difficulty chip on top, then mileage.
  - Chip: Hanken **800**, 9px, `.06em`, `padding 4px 8px`, `radius 999`, with a 5px dot; `color` + `background @ ~13%` by tier — **Easy → green**, **Medium → amber**, **Difficult → red**. Difficult legs show a tiny `faint` note under the chip (`DISTANCE` or `SINGLE TRACK`).
  - Mileage: **JetBrains Mono 700, 16px** (`text`, or `mut` when done) + ` mi` (10px `mut`). Two decimals.

---

## Map links (the core ask)

Three links per leg, all `target="_blank" rel="noopener noreferrer"` and `e.stopPropagation()` so they don't trigger the row:

| Link | URL form | Notes |
|---|---|---|
| **START point** | `https://www.google.com/maps?q={lat},{lng}` | Drops a pin on the start coordinate. |
| **FINISH point** | `https://www.google.com/maps?q={lat},{lng}` | Drops a pin on the finish coordinate. |
| **FULL DIRECTIONS** | `https://www.google.com/maps/dir/{startLat},{startLng}/{endLat},{endLng}` | Turn-by-turn for the whole leg. |

> These are **point** links (`?q=`), distinct from the existing `buildNavUrl(handoff)` helper, which builds a *directions-to* link (`/dir/?api=1&destination=`). Add a tiny helper rather than reuse `buildNavUrl`:
> ```ts
> const mapPoint = (lat: number, lng: number) => `https://www.google.com/maps?q=${lat},${lng}`
> const mapRoute = (a: {lat:number;lng:number}, b: {lat:number;lng:number}) =>
>   `https://www.google.com/maps/dir/${a.lat},${a.lng}/${b.lat},${b.lng}`
> ```

### Mapping start/end to the real data model
In the API, each **leg has one `Handoff`** (its **finish** — `handoff.lat` / `handoff.lng`). So:
- A leg's **FINISH** = `leg.handoff` coords.
- A leg's **START** = the **previous leg's handoff** coords. **Leg 1's start** = the race start location (Maryland Heights Aquaport — supply from the race config / first handoff origin, since there's no leg-0 handoff).
- If a leg has no handoff (`null`), hide its pins — matching current behavior.

The exact coordinates, leg names, mileage, and difficulty are in **`KT82legs.csv`** (also rendered in `kt82-legs.png`). Treat the CSV/image as the **source of truth** for the static course; the API supplies live timing + position.

---

## Data binding

Everything the screen needs is already loaded by the existing screens — no new endpoints, no new global state.

### Tracker (from `TeamDetail.tsx`)
- **Legs:** the `LegTimelineItem[]` the detail already fetches — gives per-leg name, distance, handoff, and status (done/now/next), arrival/actual times.
- **currentLeg:** the item whose status is the active one (the detail already identifies "now running").
- **raceStartedAt:** the existing `raceStartedAt` derivation (earliest leg `startedAt`).
- **milesDone / toGo / doneCount:** derive from the legs (sum `distanceMiles` for legs before current; `count − currentLeg` for to-go) — same arithmetic the detail's progress block already does.
- **Render** the new screen in place of the detail (or a nested route) when the user taps the section header; back restores the detail.

### Driver (from `TimingScreen.tsx` / `App.tsx`)
- **currentLeg / position:** `CurrentStateInProgress.currentLeg.legNumber`.
- **raceStartedAt:** `CurrentStateInProgress.raceStartedAt`; tick the clock with the same 1s interval the timing screen uses.
- **Full leg list:** the static course (from config/`KT82legs.csv`) for the rows; mark `n < currentLeg` done, `n === currentLeg` now, rest upcoming.
- **Render** as an overlay/route over timing; the timing interval keeps running so the clock stays live; back returns to timing.

### Difficulty — needs a source
`difficulty` (Easy / Medium / Difficult + a "distance" | "single track" note) is **not** in the current `Leg` type. It comes from `kt82-legs.png` / is implied per leg. Either (a) add a `difficulty` field to the leg config/`@kt82/shared` `Leg`, or (b) ship a static `legNumber → difficulty` map. Values are in the table below.

---

## Reference data (from `KT82legs.csv` + `kt82-legs.png`)

`totalMiles` = **84.66** (sum of the 18 legs; the "82" in KT82 is branding). Coordinates are `lat,lng`.

| Leg | Start → Finish | Diff | Mi | Start coord | Finish coord |
|---|---|---|---|---|---|
| 1 | Maryland Heights Aquaport → Lakehouse 364 | Medium | 5.10 | 38.72545,-90.44608 | 38.7009544,-90.496994 |
| 2 | Lakehouse 364 → 364 Access | Medium | 3.93 | 38.7009544,-90.496994 | 38.741153,-90.524274 |
| 3 | 364 Access → Greens Bottom Road Trailhead | Easy | 3.20 | 38.741153,-90.524274 | 38.714401,-90.56675 |
| 4 | Greens Bottom Road Trailhead → MO Research Park / Busch Greenway | Difficult (distance) | 7.24 | 38.714401,-90.56675 | 38.6946466,-90.6843187 |
| 5 | MO Research Park / Busch Greenway → Lewis & Clark Trailhead | Difficult (single track) | 4.72 | 38.6946466,-90.6843187 | 38.69111,-90.72442 |
| 6 | Lewis & Clark Trailhead → Weldon Spring Trailhead | Difficult (single track) | 5.89 | 38.69111,-90.72442 | 38.659962,-90.743787 |
| 7 | Weldon Spring Trailhead → Weldon Spring Conservation Area (Lost Valley) | Difficult (single track) | 5.73 | 38.659962,-90.743787 | 38.6614265,-90.75767 |
| 8 | Weldon Spring Conservation Area (Lost Valley) → Matson | Medium | 4.43 | 38.6614265,-90.75767 | 38.608612,-90.79485 |
| 9 | Matson → Klondike Park | Easy | 3.61 | 38.608612,-90.79485 | 38.58024,-90.83944 |
| 10 | Klondike Park → Augusta | Easy | 2.58 | 38.58024,-90.83944 | 38.569882,-90.881067 |
| 11 | Augusta → Dutzow | Difficult (distance) | 7.56 | 38.569882,-90.881067 | 38.602628,-90.999058 |
| 12 | Dutzow → Marthasville | Medium | 3.67 | 38.602628,-90.999058 | 38.627633,-91.060658 |
| 13 | Marthasville → Treloar | Difficult (distance) | 6.96 | 38.627633,-91.060658 | 38.643583,-91.188267 |
| 14 | Treloar → Bernheimer Road | Medium | 4.17 | 38.643583,-91.188267 | 38.66808,-91.25537 |
| 15 | Bernheimer Road → Gore-Case Community Center | Difficult (distance) | 6.14 | 38.66808,-91.25537 | 38.72521,-91.34014 |
| 16 | Gore-Case Community Center → Case Road | Easy | 2.69 | 38.72521,-91.34014 | 38.73476,-91.37289 |
| 17 | Case Road → McKittrick | Medium | 3.89 | 38.73476,-91.37289 | 38.73410,-91.44449 |
| 18 | McKittrick → Hermann & Finish!! | Medium | 3.15 | 38.73410,-91.44449 | 38.70396,-91.43376 |

> Note: image mileage and CSV mileage differ slightly on a few legs (the CSV's `LEG_LENGTH` is the measured value); the table above uses the image figures. Pick one source and be consistent — recommend the CSV as canonical for production.

---

## Design tokens
Unchanged from Direction B — see `../design_handoff_kt82_tracker_driver/README.md`. Quick recall: fonts **Anton** (display), **Hanken Grotesk** (UI/labels), **JetBrains Mono** (all numerics). Status colors `green` / `amber` / `red` are **not** themable; `accent` is. Dark is primary; Tracker also supports light.

New radii used here: rows `12`/`16`, callout/pills `14`/`999`, chips `999`. Status stripe `3px`, radius `3`.

---

## Files in this bundle
| File | What it is |
|---|---|
| `course-legs.jsx` | **The screen source** — `CourseLegsScreen` + `CLLegRow` + `CLMapLink` + `CLPin`. Exact markup, sizes, states, and the three link forms. The canonical reference. |
| `kt82-legs-data.js` | **Mock** course data (the table above as JS) showing the *shape* the screen consumes and the URL-builder helpers. Discard in production; bind to the API + `KT82legs.csv`. |
| `KT82legs.csv` | **Source of truth** for coordinates, names, mileage, and the ready-made point/route links per leg. |
| `kt82-legs.png` | The original spreadsheet view that inspired the screen (leg / start / end / difficulty / mileage). Source for the **difficulty** column. |

Behavioral reference (in the project root, already present): `KT82 Prototype.html` → open it, go **Tracker → tap a team → "THE COURSE / ALL 18 LEGS →"**, and **Driver → racing → "VIEW ALL 18 LEGS"**.

## Implementation order
1. Add a `mapPoint()` / `mapRoute()` helper (or extend the existing nav helpers) and a `legNumber → difficulty` source.
2. Build the shared `CourseScreen` component (clock + position + tally + leg list) once; feed it `{ legs, currentLeg, raceStartedAt, backLabel, onBack, teamName }`.
3. Wire the Tracker entry on `TeamDetail` (section header → screen, back restores detail).
4. Wire the Driver entry on `TimingScreen` (button → overlay, back to timing, clock keeps ticking).
5. Verify against `KT82 Prototype.html`: done legs green-washed with ✓, active leg accent-highlighted + LIVE, upcoming plain; start/finish/route links open correctly; clock ticks; LIVE blinks.
