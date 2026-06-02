# Tracker & Driver — Direction B "Course / Bib" Redesign

**Date:** 2026-06-01  
**Branch:** `redesign/tracker-driver-direction-b`  
**Status:** Approved for implementation

---

## Overview

Full visual restyle of `apps/tracker` and `apps/driver` to Direction B "Course / Bib": athletic-poster aesthetic — Anton display type, Hanken Grotesk body/UI, JetBrains Mono for all numerics, warm near-black palette with one vivid orange accent, color-forward pace status, and big glanceable numerics.

Captain and Manager are **out of scope**. All behavior (polling, state machines, API calls, auth) is preserved unchanged. Only the presentation layer changes.

---

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Implementation approach | Clean restyle in-place | Components are small; behavior is cleanly separated from JSX; new token set is different enough that hybrid code would be messy |
| Token sharing | Duplicated per-app (tracker + driver each own their tokens) | No new package; Captain/Manager out of scope; two files is not a maintenance problem |
| Tracker theme | `prefers-color-scheme` auto-switch | No manual toggle needed; dark = default, light overrides via media query |
| Driver theme | Dark only | In-vehicle use case; no light variant needed |
| Branch scope | Single branch for both apps | Token layer is shared; phasing would complicate token coordination |

---

## Design Tokens

Defined in each app's `tailwind.config.js` (`theme.extend`) and `index.css` (CSS vars). Accent is a single CSS variable so it can be themed.

### Dark theme (default; Driver always uses this)
| Token | Value | Use |
|---|---|---|
| `--bg` | `#13110a` | App background (warm near-black) |
| `--panel` | `#1d1810` | Cards, readout panels |
| `--panel2` | `#241d12` | Nested/secondary fills, on-deck bar |
| `--line` | `rgba(255,240,220,0.10)` | Hairline borders |
| `--line2` | `rgba(255,240,220,0.055)` | List-row dividers |
| `--text` | `#fbf6ee` | Primary text (warm white) |
| `--mut` | `#a99e8c` | Secondary text |
| `--faint` | `#6a6053` | Tertiary / labels |
| `--accent` | `#ff5a1f` | Brand accent (orange) |
| `--green` | `#37d27a` | On-pace / ahead |
| `--red` | `#ff4d2e` | Behind / overdue |
| `--amber` | `#ffae3b` | Reserved warning |
| `--ink` | `#13110a` | Text on accent/status fills |

### Light theme (`@media (prefers-color-scheme: light)` — Tracker only)
| Token | Value |
|---|---|
| `--bg` | `#f4f0e7` |
| `--panel` | `#ffffff` |
| `--panel2` | `#faf6ec` |
| `--line` | `rgba(0,0,0,0.09)` |
| `--line2` | `rgba(0,0,0,0.05)` |
| `--text` | `#1a160f` |
| `--mut` | `#6f6759` |
| `--faint` | `#b0a795` |
| `--accent` | `#e8480f` |
| `--green` | `#0e9b52` |
| `--red` | `#dd3a23` |
| `--amber` | `#c47d12` |
| `--ink` | `#ffffff` |

### Typography
Loaded via Google Fonts in each app's `index.html`:
- **Anton** (400) — display: race-bib headlines, team names, leg numbers, big totals. Always `uppercase`, tight `line-height` (0.88–0.90).
- **Hanken Grotesk** (400/500/600/700/800) — body/UI. Labels use 800 weight, uppercase, wide tracking.
- **JetBrains Mono** (400/500/700) — all clocks, durations, distances, paces.

Replace Tracker's current `DM Sans` + `Barlow Condensed` imports.

### Shape & shadow
- Cards / buttons / readout panels: `border-radius: 18px`
- Hero block: `border-radius: 22px`
- Chips / pills / strips: `border-radius: 14px`; status pills fully rounded (`999px`)
- Hero glow shadow: `0 14px 40px <statusColor>40` (dark) / `0 14px 34px <statusColor>33` (light)
- Grid cards: flat (1px `--line` border); leading team card uses 1px `--accent` border

### Spacing
Screen gutters `18px`. Card inner padding `14–16px`. Vertical rhythm between blocks `14–22px`.

---

## Screens

### 1. Tracker — TeamGrid (`TeamGrid.tsx`)

**Header:**
- `KT82` — Anton 50, uppercase
- Subline: `KATY TRAIL RELAY · SAT · MAY 16` — Hanken 800 11px, accent color
- Row below: `{N} TEAMS ON COURSE` (Hanken 800 11px, `--mut`) left; blinking green dot + `LIVE` + `· {N}s ago` (JetBrains Mono 11px, `--faint`) right
- Poll error: replace live row with `⚠ Unable to refresh` (amber)

**Team cards** (single column, `gap: 12px`):
- Horizontal row layout: 6px status-color left stripe + card body (`padding: 14px 16px`)
- Top line: rank `1` in Anton 18 accent (leading team only) + team name Anton 28 uppercase (truncate with ellipsis), status pill right-aligned (`ON PACE` / `AHEAD` / `BEHIND PACE`, ink text on status fill, fully rounded)
- Leading team: accent border on card
- Middle line: `Leg {n} · {Runner} → {Handoff}` (Hanken 12.5px, `--mut`) left; projected arrival clock (JetBrains Mono 16px, status color) right
- Bottom: thin progress bar (`milesDone / totalMiles`, fill = status color) + `{milesToGo} mi` (JetBrains Mono 11px, `--faint`) right
- Not-started teams: dimmed (opacity ~0.55), no middle/bottom rows, muted name
- Sort by `done` (legs completed) descending

**Derived data** (from existing `TeamStatus[]` + leg data already loaded):
- `milesDone` = sum of `distanceMiles` for completed legs
- `milesToGo` = total race miles − milesDone (current partial leg contributes 0 for simplicity)
- `done` = count of completed legs (for sort)

**Behavior unchanged:** 30s poll + seconds-since-update tick. `onTeamClick` → hash route.

---

### 2. Tracker — TeamDetail (`TeamDetail.tsx`)

Scrolls vertically. Sections top→bottom:

**Top bar:** `← ALL TEAMS` (Hanken 800 12px, `--mut`) left; `SHARE ↗` right. Existing `onBack` / `handleShare`.

**Team header:** `KT82 · KATY TRAIL RELAY` accent label (Hanken 800 10px); team name Anton 48 uppercase. Right: bib tile — solid accent, `border-radius: 14px`, `LEG` label + Anton 38 leg number + `of 18`, ink text.

**Progress + total race time:**
- Left: `TOTAL RACE TIME` label (Hanken 800 9px, `--faint`) + ticking JetBrains Mono 26 value (= `now − raceStartedAt`, existing `raceElapsedMs` + 1s interval already in `TeamDetail`)
- Right: `{milesToGo} mi to go` (Hanken 13px, `--mut`) + `{milesDone} OF 82 MI DONE` (Hanken 800 9px, `--faint`)
- Full-width accent progress bar below (`milesDone / 82`)

**Hero — relay pass** (status-colored block, radius 22, status glow shadow):
- Header: `NOW RUNNING · LEG {n}` (Hanken 800 10px, ink) + status pill (`ON PACE` / `{N} MIN AHEAD` / `{N} MIN BEHIND`, ink on status fill)
- Runner name: Anton 52, uppercase, ink
- `→ HEADING TO {TOWN}` (Hanken 800 12.5px, ink at ~70% opacity)
- Three readouts row: **EST. ARRIVAL** (JetBrains Mono 34, ink) · **LEG TIME** (JetBrains Mono 22, ticking from `activeItem.result.startedAt`) · **TO GO** (`{activeItem.leg.distanceMiles} mi` — total leg distance; matches prototype's simplified approach)
- **`HANDS OFF TO` strip** (`rgba(0,0,0,0.16)`, radius 12): next runner avatar (36px circle, initials Hanken 800) + name (Hanken 800 14px) + `Leg {n+1} · {dist} mi → {town}` + `ON DECK` pill
  - "Next runner" = the `not-started` leg immediately after the active one in the sorted timeline
- **`DRIVE TO {TOWN} →`** action bar (`rgba(0,0,0,0.30)`, radius 12): nav-pin SVG + label. Links to `buildNavUrl(activeItem.leg.handoff)`.

**The Course:** `THE COURSE` (Anton 24) + `{N} HANDOFFS` sub (Hanken 800 10px, `--faint`). Full 18-leg timeline:

Each `CourseRow`:
- `[leg # Anton 20, --faint] [avatar 30px circle] [runner name Hanken 800 15px + town·dist below] [arrival clock JetBrains Mono 14px] [nav-pin button 30px circle]`
- **done**: opacity 0.38, dimmed name + `--faint` clock showing actual arrival time + `±Nm` delta; green ✓ on actual arrival
- **now**: status-color tinted background (12% alpha), `LIVE` pill, status-color values, `--green`/`--red` leg number
- **next** (leg immediately after active): `ON DECK` outlined pill, `~` prefix on projected clock, muted
- **future**: muted, `~` projected clock
- Map-pin button: 30px circle → `buildNavUrl(leg.handoff)` in new tab; hidden if handoff is null

**Behavior unchanged:** 30s poll, 1s tick (already present), `raceStartedAt` derivation, `projectedTimes` map.

---

### 3. Driver — StartScreen (`StartScreen.tsx`)

Always dark.

**Top bar:** Orange square tick + team name (Hanken 800 13px, uppercase) left; `RACE NOT STARTED` (JetBrains Mono 12px, `--mut`) right.

**Body:**
- `KT82 · KATY TRAIL RELAY` accent label; `READY TO ROLL` Anton 60 (two lines), `--text`
- Context line: `{race.name}` or a fixed descriptor like `82 MILES · KATY TRAIL` (Hanken 13px, `--mut`). Total legs/runners are not in the `Race` or `Leg` props — use race name or a hardcoded descriptor.

**First-leg card** (`--panel`, radius 18):
- Header: `FIRST LEG · UP NOW` (Hanken 800 9.5px, `--faint`) left + `01` (Anton 24, `--mut`) right
- Body: runner avatar 48px + runner name Anton 28 uppercase + `→ {town} · {dist} mi · target {pace}/mi` (Hanken 11px, `--faint`)
- Footer (border-top `--line2`): nav-pin icon + `NAVIGATE TO {TOWN} ↗` (Hanken 800 11px, accent) → `buildNavUrl(nextLeg.handoff)`

**Bottom:**
- `START` hold button: accent fill, ink text, Anton 40, height 92, radius 18. `LongPressButton` holdMs=500.
- Hint: `HOLD TO START THE RACE CLOCK` (Hanken 800 10px, `--faint`, centered)

---

### 4. Driver — TimingScreen (`TimingScreen.tsx`)

Always dark. The hero screen.

**Top bar:** Orange square tick + team name left; `RACE {h:mm:ss}` (JetBrains Mono 12px, `--mut`, ticks from `raceStartedAt`) right.

**Body:**
- `NOW RUNNING · LEG {n}` (Hanken 800 10px, `--mut`) + status pill (Hanken 800 9.5px, status fill, ink text)
- Runner name: Anton 50, uppercase, `--text`
- `→ {TOWN} · {dist} MI` (Hanken 800 13px, uppercase, `--faint`)

**Twin readout panels** side by side (`--panel`, radius 16, border `--line`):
- Left: `LEG TIME` label (Hanken 800 9px, `--faint`) + JetBrains Mono 38 ticking elapsed (existing `elapsed` state)
- Right: `ETA · {TOWN}` label + JetBrains Mono 38 in status color (from 30s-polled `eta`); `—` if no ETA yet
- Sub-text: `{distLeft} mi to handoff` (left) + `target {pace}/mi` (right) — Hanken 10px, `--faint`

**On-deck strip** (`--panel2`, radius 14): next runner avatar (36px) + name (Hanken 800 14px) + `Leg {n+1} · {dist} mi → {town}` (Hanken 10.5px, `--faint`) + `ON DECK` outlined pill. Uses existing `nextRunner`, `nextLegNumber` props.

**Navigate button:** outlined accent border, radius 14, `NAVIGATE TO {TOWN} ↗` (Hanken 800 11px, accent). → `buildNavUrl(nextHandoff)`. Hidden if no `nextHandoff`.

**Bottom:**
- `LAP` hold button: accent fill, ink text, Anton 34, height 84, radius 18. `LongPressButton` holdMs=1500. Existing `handleLap`.
- Hint: `HOLD TO RECORD HANDOFF AT {TOWN}` (Hanken 800 10px, `--faint`, centered)
- `••• END RACE EARLY` hold button: `--panel2` fill, `--faint` text, Hanken 800 11px, height 44, radius 14. `LongPressButton` holdMs=1500. Existing `handleStop`.

---

### 5. Driver — CompleteScreen (`CompleteScreen.tsx`)

Always dark.

**Top bar:** Orange square tick + team name left; `FINISHED ✓` (JetBrains Mono 12px, `--green`) right.

**Body:**
- `RACE COMPLETE` (Hanken 800 10px, `--green`) label
- Total time: JetBrains Mono 56, `--text`
- Subline: `{n} of 18 legs · finished {clock}` (Hanken 13px, `--mut`)

**Splits list** (`SPLITS` Anton 22):
- Each row: `[leg # Anton 20, --faint] [avatar 30px] [runner name Hanken 800 14px + town·dist Hanken 10px --faint] [split time JetBrains Mono 15px, --mut]`
- Divider: 1px `--line2` between rows
- Data from existing `completedLegs` / `results` the CompleteScreen already receives

---

### 6. LongPressButton restyle

Keep all logic (rAF fill, pointer events, `completedRef`). Visual changes only:
- Fill overlay: `rgba(255,255,255,0.26)` rising from bottom (already implemented — keep as-is)
- While holding: label shrinks to ~0.72× and swaps to `KEEP HOLDING…` (add `holding` state + conditional label)
- Change `colorClass` / `textClass` from Tailwind class strings to CSS var inline styles: add `bgStyle` and `textStyle` props (type `React.CSSProperties`) and apply via `style={{ background: bgStyle, color: textStyle }}`. Each call site passes `bgStyle="var(--accent)"` / `bgStyle="var(--panel2)"` etc.
- Add `height` prop (number, px) used directly in style. `fontSize` set per call site via `className` or style.
- `holdLabel` prop (string, default `"KEEP HOLDING…"`) — shown instead of `label` while holding.

---

## Files Changed

| File | Change |
|---|---|
| `apps/tracker/index.html` | Add Google Fonts: Anton, Hanken Grotesk, JetBrains Mono |
| `apps/tracker/tailwind.config.js` | Extend theme with token names |
| `apps/tracker/src/index.css` | Replace CSS vars + font declarations; add light theme media query; keep `live-dot` + glow animations |
| `apps/tracker/src/App.tsx` | Update root bg class to use `--bg` token |
| `apps/tracker/src/components/TeamGrid.tsx` | Full JSX restyle |
| `apps/tracker/src/components/TeamDetail.tsx` | Full JSX restyle |
| `apps/driver/index.html` | Add Google Fonts: Anton, Hanken Grotesk, JetBrains Mono |
| `apps/driver/tailwind.config.js` | Extend theme with token names (dark only) |
| `apps/driver/src/index.css` | Replace CSS vars + font declarations (dark only) |
| `apps/driver/src/components/LongPressButton.tsx` | Add `holding` state, shrink + swap label while held |
| `apps/driver/src/components/StartScreen.tsx` | Full JSX restyle |
| `apps/driver/src/components/TimingScreen.tsx` | Full JSX restyle |
| `apps/driver/src/components/CompleteScreen.tsx` | Full JSX restyle |

`RaceBanner.tsx` — replaced by the inline top-bar pattern in each Driver screen; can be deleted after restyle.

---

## Implementation Order

1. Create branch `redesign/tracker-driver-direction-b` off `main`
2. Add fonts to both `index.html` files
3. Write token layer: `apps/tracker/src/index.css` + `apps/tracker/tailwind.config.js`
4. Write token layer: `apps/driver/src/index.css` + `apps/driver/tailwind.config.js`
5. Restyle `apps/tracker/src/components/TeamGrid.tsx`
6. Restyle `apps/tracker/src/components/TeamDetail.tsx`
7. Restyle `apps/driver/src/components/LongPressButton.tsx`
8. Restyle `apps/driver/src/components/StartScreen.tsx`
9. Restyle `apps/driver/src/components/TimingScreen.tsx`
10. Restyle `apps/driver/src/components/CompleteScreen.tsx`
11. Update `apps/tracker/src/App.tsx` root bg + remove old `RaceBanner` references in driver
12. Verify each screen against `docs/design_handoff_kt82_tracker_driver/prototype/KT82 Prototype.html`

---

## Out of Scope

- Captain app (`apps/captain`)
- Manager app (`apps/manager`)
- API changes
- New data endpoints
- Authentication changes
- Accent color picker (accent is a CSS var for future use; default orange only for now)
