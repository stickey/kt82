# Handoff: KT82 — Tracker & Driver redesign (Direction B "Course / Bib")

## Overview
A fresh, bolder visual direction for the **KT82** relay-race app suite (Katy Trail, 82 miles · 18 legs · 6 runners running 3 legs each), applied to the two race-day-facing apps:

- **Tracker** (`apps/tracker`) — the public, read-only spectator status board.
- **Driver** (`apps/driver`) — the in-vehicle timing app run by the support-vehicle timekeeper.

The direction is called **"Course / Bib"**: athletic-poster energy — heavy condensed display type (race-bib feel), a warm near-black/paper palette with one vivid accent, color-forward pace status, and big glanceable numerics. The redesign keeps every piece of data the current apps already compute; it changes the *presentation*, hierarchy, and adds three things the team asked for on the Tracker detail:
1. **Who is running now → who they hand off to next** (the relay pass), made explicit.
2. **Current leg time + estimated arrival** shown together.
3. A **directions link on every leg** (map pin), plus **total race time** on screen.

> Captain (`apps/captain`) and Manager (`apps/manager`) are **out of scope** for this pass — leave them as-is. They can adopt the same tokens later.

---

## About the design files
Everything in this bundle is a **design reference built in HTML/JSX** — a high-fidelity prototype showing intended look and behavior. **It is not production code to copy in.** The task is to **re-implement these designs in the existing `apps/tracker` and `apps/driver` codebases** (React 18 + Vite + TypeScript + Tailwind), reusing their established patterns, components, types, API client, and the real `LongPressButton`.

The prototype uses **inline styles and mock data** purely so it runs standalone. In the real apps you will:
- Express the tokens below as Tailwind theme values / CSS variables and use Tailwind classes.
- Bind to the **real API responses and types** (`@kt82/shared`, `apps/*/src/api.ts`) — discard the mock `kt82-data.js`.
- Reuse the existing `LongPressButton`, `buildNavUrl`, `formatElapsed`/`formatTime` helpers.

### Fidelity: **High-fidelity (hifi).**
Colors, type, spacing, and interactions are final. Recreate the UI faithfully using Tailwind in the existing codebase. Pixel values below are the source of truth; convert to the nearest Tailwind scale step where one exists, otherwise use arbitrary values (e.g. `text-[15px]`, `rounded-[18px]`).

---

## Files in this bundle

| File | What it is |
|---|---|
| `prototype/KT82 Prototype.html` | **The interactive prototype** — open in a browser. Tracker grid↔detail + the full Driver state machine, live clocks, hold-to-activate buttons, light/dark + accent tweaks. This is the canonical behavioral reference. |
| `prototype/prototype.jsx` | All interactive components (the real source for the prototype). Read this for exact markup, sizes, and interaction logic. |
| `prototype/kt82-data.js` | **Mock** data + the schedule/ETA math. Use only to understand the *shape* of data each screen needs — your API already provides equivalents. |
| `prototype/ios-frame.jsx`, `prototype/tweaks-panel.jsx` | Harness only (device bezel + tweak controls). **Not part of the design** — ignore for implementation. |
| `reference/KT82 Tracker Concepts.html` | The side-by-side concept canvas: Direction A vs **Direction B** (chosen), plus the Driver screens. Good for seeing static states. |
| `reference/directionB.jsx`, `reference/directionB-driver.jsx` | Static versions of the Direction B Tracker + Driver screens. |
| `reference/directionA.jsx`, `reference/design-canvas.jsx` | Direction A (rejected) and the canvas harness — context only. |

---

## Design tokens

Define these once and share across both apps (e.g. extend `tailwind.config.js` `theme.extend` + a small CSS-vars layer). The design ships **dark (default) and light** themes, plus a configurable **accent**.

### Color — Dark theme (primary; Driver is always dark, Tracker defaults dark)
| Token | Hex | Use |
|---|---|---|
| `bg` | `#13110a` | app background (warm near-black) |
| `panel` | `#1d1810` | cards, readout panels |
| `panel2` | `#241d12` | nested/secondary fills, avatars on dark |
| `line` | `rgba(255,240,220,0.10)` | hairline borders |
| `line2` | `rgba(255,240,220,0.055)` | list-row dividers |
| `text` | `#fbf6ee` | primary text (warm white) |
| `mut` | `#a99e8c` | secondary text |
| `faint` | `#6a6053` | tertiary/labels |
| `accent` | `#ff5a1f` | **brand accent** (orange) — bib tile, progress bar, buttons, labels |
| `green` | `#37d27a` | status: on-pace / ahead |
| `red` | `#ff4d2e` | status: behind / overdue |
| `amber` | `#ffae3b` | reserved warning |
| `ink` | `#13110a` | text/icon color placed **on** an accent/status fill (dark theme → dark ink) |

### Color — Light theme
| Token | Hex |
|---|---|
| `bg` | `#f4f0e7` (warm paper) |
| `panel` | `#ffffff` |
| `panel2` | `#faf6ec` |
| `line` | `rgba(0,0,0,0.09)` |
| `line2` | `rgba(0,0,0,0.05)` |
| `text` | `#1a160f` |
| `mut` | `#6f6759` |
| `faint` | `#b0a795` |
| `accent` | `#e8480f` |
| `green` | `#0e9b52` |
| `red` | `#dd3a23` |
| `amber` | `#c47d12` |
| `ink` | `#ffffff` (light theme → white text on accent/status fills) |

**Accent is swappable.** Default `#ff5a1f`. The prototype also exposes `#ff2e63` (pink), `#2b6fff` (blue), `#7a5af0` (purple). Implement accent as a single CSS variable so it can be themed; status green/red are **not** themable.

**Status → color rule:** `overdue/behind → red`, `ahead → green`, `on-pace → green`. (Helper in prototype: `statusColor()` / `statusText()`.)

### Typography
Load via Google Fonts (Tracker already imports DM Sans/Barlow — replace with these for these two apps):
- **Display** — `Anton` (single weight 400, used large + uppercase). Race-bib headlines, team names, leg numbers, big totals, section titles. Always `text-transform: uppercase`, tight `line-height` (0.84–0.9), `letter-spacing ~0.005–0.02em`.
- **Body / UI** — `Hanken Grotesk` (400/500/600/700/800). Labels use **800** weight, uppercase, `letter-spacing 0.08–0.14em`, small (9–12px).
- **Numerics / time** — `JetBrains Mono` (400/500/700). All clocks, durations, distances, paces. Use for anything that ticks.

Representative sizes (px): hero town/runner name `Anton 50–62`; team name in grid `Anton 28`; big totals `JetBrains Mono 26–56`; arrival clock `JetBrains Mono 34`; twin readouts (Driver) `JetBrains Mono 38`; body labels `Hanken 800 9–11`; row primary `Hanken 800 16`.

### Radius / shape
- Cards & hero: `22px` (hero), `18px` (cards, buttons, readout panels), `16px` (nav button, driver panels), `14px` (small chips/strips).
- Pills/tags & progress bars: fully rounded (`999px`).
- Status pills: `padding 3–4px 8–9px`, `Hanken 800 9–10.5px`, uppercase, `ink` text on status fill.
- Avatars: circle, initials in `Hanken 800` (~36% of diameter).

### Shadow
- Hero block (status-colored): `0 14px 40px <statusColor>40` (dark) / `0 14px 34px <statusColor>33` (light) — a soft glow in the status color.
- Grid cards: flat (1px `line` border only); the **leading** team's card uses a `1px accent` border instead.

### Spacing
Screen gutters `18px`. Card inner padding `14–16px`. Section label → content gap `~8px`. Vertical rhythm between blocks `14–22px`.

---

## Screens / Views

### TRACKER

The Tracker is read-only and polls the API (already implemented — keep `TeamGrid`'s 30s poll + "updated Ns ago", and `TeamDetail`'s poll + not-found handling). This redesign restyles `apps/tracker/src/components/TeamGrid.tsx` and `TeamDetail.tsx`.

#### 1. Tracker — All-teams grid  (`TeamGrid.tsx`)
- **Purpose:** glance at every team's live status; tap a card → that team's detail (existing hash route `#team/<id>`).
- **Header:** `KT82` in **Anton 50**, uppercase; subline `KATY TRAIL RELAY · SAT · MAY 16` in Hanken 800 11px accent. Right side: blinking green dot + `LIVE` (reuse existing live-dot animation). Below header: row with `6 TEAMS ON COURSE` (Hanken 800 11px mut) and `updated Ns ago` (JetBrains Mono 11px faint) — bind to the existing seconds-since-update counter.
- **Cards (one column, `gap 12px`):** each team card is a horizontal row:
  - A **6px status-color stripe** down the left edge (full height).
  - Body padding `14px 16px`. Top line: team name in **Anton 28** uppercase (truncate with ellipsis), and a **status pill** right-aligned (`ON PACE` / `AHEAD` / `BEHIND PACE`, `ink` on status color). The leading team also shows a small `Anton 18 accent "1"` before its name and an accent border on the card.
  - Middle line: `Leg {n} · {FirstName} → {nextHandoff}` (Hanken 12.5px mut) on the left; **projected arrival clock** (`JetBrains Mono 16` in status color + ` AM/PM` mut) on the right.
  - Bottom line: a thin rounded **progress bar** (`done/18`, fill = status color) + `{milesToGo} mi` (JetBrains Mono 11px) at the right.
  - Sort cards by `done` (legs completed) descending.
- **Data:** all from the existing `GET /races/:id/status` `TeamStatus[]` (team name, status, currentLeg, currentRunner, nextHandoff, eta). `milesToGo`/`done` can be derived from leg data you already load (see "State / data" below).

#### 2. Tracker — Team detail  (`TeamDetail.tsx`)
Scrolls vertically. Sections top→bottom:

1. **Top bar:** `← ALL TEAMS` (Hanken 800 12px mut, calls existing back/`onBack`) left; `SHARE ↗` right (reuse existing `navigator.share`/clipboard `handleShare`).
2. **Team header:** `KT82 · KATY TRAIL RELAY` accent label; team name in **Anton 48** uppercase. To the right, a **bib tile**: solid `accent` rounded-14 box with `LEG` / big `Anton 38 {currentLegNumber}` / `of 18` — `ink` text.
3. **Progress + total race time:** left = **`TOTAL RACE TIME`** as a large `JetBrains Mono 26` value that **ticks every second** (= now − raceStartedAt; derive race start from earliest leg `startedAt`, as `TeamDetail` already does via `raceStartedAt`). Right = `{milesToGo} mi to go` + `{milesDone} OF 82 MI DONE`. Below: full-width accent progress bar (`milesDone/82`).
4. **Hero — the relay pass (status-colored block, radius 22, glow shadow):**
   - Label `NOW RUNNING · LEG {n}` + status pill (`{delta} MIN BEHIND` or `ON PACE`).
   - **Current runner name** in **Anton 52** uppercase (this replaced the handoff town as the headline — runner identity leads).
   - `→ HEADING TO {TOWN}` (Hanken 800 12.5px).
   - A row of three readouts: **EST. ARRIVAL** (`JetBrains Mono 34` clock) · **LEG TIME** (`JetBrains Mono 22`, ticks every second = now − current leg `startedAt`) · **TO GO** (`{distLeft} mi`).
   - **`HANDS OFF TO` strip** (translucent black `rgba(0,0,0,0.16)` band inside the hero): the **next runner's** avatar + name + `Leg {n+1} · {dist} mi → {town}`, tagged `ON DECK`. This is the leg immediately after the current one in the timeline — i.e. who takes the baton at the upcoming handoff.
   - **`DRIVE TO {TOWN} →`** action bar (darker translucent `rgba(0,0,0,0.30)`): links to `buildNavUrl(currentLeg.handoff)`.
5. **The Course:** section title `THE COURSE` (Anton 24) + `18 HANDOFFS`. Then the full 18-leg timeline, one **CourseRow** each:
   - `[leg # in Anton 26] [avatar 36] [runner name Hanken 800 16 + town·dist below] [arrival clock JetBrains Mono 15] [map-pin button]`.
   - **States:** *done* → dimmed, green ✓, shows actual arrival + `±Nm` delta vs target; *now* → row tinted with status color at ~12% alpha, rounded, `LIVE` tag, status-color values; *next* → muted, `~` prefix on projected clock, hollow feel; the immediate next leg also gets an outlined `ON DECK` pill.
   - **Map pin:** a 32px circle with a teardrop-pin icon → `buildNavUrl(leg.handoff)` in a new tab, on **every** leg that has a handoff (hide if `handoff` is null, matching current behavior).

### DRIVER

Restyle `apps/driver/src/components/{StartScreen,TimingScreen,CompleteScreen}.tsx` and keep `App.tsx`'s state machine (`loading → auth → start → racing → complete`) and `LongPressButton.tsx` (already a hold-to-activate button with a rAF fill — just restyle its fill/typography). **Always dark.**

#### 3. Driver — Start  (`StartScreen.tsx`)
- Top bar: orange square tick + `TRAIL MIX` (team name) left; `RACE NOT STARTED` (JetBrains Mono mut) right; hairline under.
- `KT82 · KATY TRAIL RELAY` accent label; **`READY TO ROLL`** in Anton 60 (two lines). A sentence of context (miles/legs/runners).
- **First-leg card** (panel, radius 18): header `FIRST LEG · UP NOW` + `01`; body = runner avatar 48 + runner name (Anton 30) + `→ {town} · {dist} mi · target {pace}/mi`; footer = `NAVIGATE TO {TOWN} ↗` (links `buildNavUrl`).
- Bottom: big **`START`** hold button (`accent` fill, `ink` text, Anton 40, height 92) + hint `HOLD TO START THE RACE CLOCK`. Uses `LongPressButton` (~500–600ms hold) → existing "begin race" action.

#### 4. Driver — Timing  (`TimingScreen.tsx`) — the hero screen
- Top bar: `TRAIL MIX` + live **`RACE {h:mm:ss}`** (ticks; = now − raceStartedAt).
- `NOW RUNNING · LEG {n}` + status pill. Current **runner name** Anton 50. `→ {TOWN} · {dist} MI`.
- **Twin readout panels** side by side (the README's "side by side elapsed + ETA"): **LEG TIME** (`JetBrains Mono 38`, ticks from current leg start) and **ETA · {TOWN}** (`JetBrains Mono 38` in status color; from the server-polled ETA — keep the existing 30s `/current` poll). Under them: `{distLeft} mi to handoff` and `target {pace}/mi`.
- **`ON DECK`** strip (panel2): next runner avatar + name + `Leg {n+1} · {dist} mi → {town}`. (Reuse the existing "On Deck" data the Timing screen already receives: `nextRunner`, `nextLegNumber`, `nextRunnerEta`.)
- **`NAVIGATE TO {TOWN} ↗`** outlined-accent button → `buildNavUrl(nextHandoff)`.
- **`LAP`** hold button (accent, Anton 34, height 84, ~1500ms) → existing lap/handoff action (advance leg). Hint `HOLD TO RECORD HANDOFF AT {TOWN}`.
- Tucked at the very bottom: small **`••• END RACE EARLY`** hold button (panel2 fill, mut text, ~1500ms) → existing stop action.

#### 5. Driver — Complete  (`CompleteScreen.tsx`)
- Top bar: `TRAIL MIX` + `FINISHED ✓` (green).
- `RACE COMPLETE` (green label); **total time** in `JetBrains Mono 56`; subline `{n} of 18 legs · finished {clock}`.
- `SPLITS` (Anton 22) + a list of all completed legs: `[leg # Anton 20] [avatar 30] [runner + town·dist] [split time JetBrains Mono 15]`. (From the existing per-leg results/splits the Complete screen already builds.)

---

## Interactions & behavior
- **Hold-to-activate** everywhere a timing action happens (START ~500ms, LAP ~1500ms, END ~1500ms). Keep `LongPressButton`'s rAF fill; restyle the fill to `rgba(255,255,255,0.26)` rising from the bottom, label shrinks (~0.72×) and swaps to `KEEP HOLDING…` while held. Releasing early cancels (existing behavior). Timestamps captured client-side at activation (existing behavior).
- **Tracker navigation:** tap card → `#team/<id>` (existing hash route); `← ALL TEAMS` returns. Detail must work as a deep link (existing).
- **Live clocks:** total race time and current-leg time tick every second on both the Tracker detail and Driver timing. Drive them off timestamps + a 1s interval (the prototype increments a `tick`; `TeamDetail` already has the timestamps it needs).
- **Polling:** unchanged — grid 30s, detail 30s, driver `/current` 30s; keep the stale-data-on-network-loss behavior and "Unable to refresh" messaging.
- **Map links:** every handoff with coords/address opens `buildNavUrl()` in a new tab (`target="_blank" rel="noopener noreferrer"`); hide the pin when no handoff.
- **Transitions:** keep it snappy — fades/instant nav are fine; the only required motion is the long-press fill and the blinking live dot.

## State management
No new global state. Reuse what the apps already have:
- **Tracker:** `TeamStatus[]` (grid) and `LegTimelineItem[]` (detail) from `apps/tracker/src/api.ts`; `raceStartedAt` derivation already in `TeamDetail`. New derived values the design shows — `milesDone`, `milesToGo`, per-leg projected arrival, "on deck" (the leg after the active one) — are computed from data already loaded (legs + assignments + results); see `kt82-data.js` `buildTeam()` for the exact arithmetic (target sec = `pace × distance`; projected arrival = anchor + Σ durations; milesToGo = current leg remaining + Σ remaining legs).
- **Driver:** keep the `App.tsx` discriminated-union state machine and the `CurrentStateInProgress` shape (it already carries `eta`, `nextRunner`, `nextLeg`, `raceStartedAt`).

## Assets
- **No image assets.** Icons are inline SVG (the map-pin teardrop) or text glyphs (`→ ↗ ✓ ←`). The pin is a simple two-path teardrop+dot (see `NavPin` in `prototype.jsx`) — reproduce or swap for your icon set.
- **Fonts:** Anton, Hanken Grotesk, JetBrains Mono (Google Fonts). Replace the Tracker's current DM Sans/Barlow Condensed imports for these two apps.
- Team names, runner names, and Katy Trail town names in the prototype are **mock** — real data comes from the API.

## Implementation notes / order
1. Add the token layer (Tailwind theme + accent CSS var + the three fonts) shared by `apps/tracker` and `apps/driver`.
2. Tracker: `TeamGrid` card restyle → then `TeamDetail` (header, race-time block, hero, course list + pins). Verify against `prototype/KT82 Prototype.html` (Tracker tab).
3. Driver: restyle `LongPressButton` fill → `StartScreen` → `TimingScreen` (twin readouts + on-deck) → `CompleteScreen`. Verify against the Driver tab.
4. Light theme is required for Tracker (spectators in daylight); Driver can stay dark-only.
```
