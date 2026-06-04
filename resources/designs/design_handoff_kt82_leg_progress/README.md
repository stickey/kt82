# Handoff: KT82 — Runner Leg-Progress ("When do they arrive?")

## Overview
A new screen for the **KT82** relay-tracking app (Katy Trail Relay — 82 miles, 18 legs, 6 runners per team). It gives the **driver** and the **next runner / tracker** a gauge of when the currently-running runner will arrive at the next handoff — so the team knows when to warm up, get to the exchange, and be ready to cheer.

The screen shows, for the **live leg only**:
1. A **progress bar** with a **range marker** ("I-beam") for the runner's estimated position right now.
2. A **table** of estimated arrival times swept across **target pace ±30 s/mi in 15 s increments** (5 rows: −30, −15, target, +15, +30).

There are **two layout directions** to choose from (Direction A is the current front-runner; B is an alternate). Pick one for production — they share the exact same data model.

---

## About the Design Files
The files in `reference/` are **design references created in HTML/React + inline Babel** — prototypes showing the intended look and behavior. They are **not production code to copy directly.** They render in the browser via CDN React + Babel-in-the-page and a shared `window.KT82` data object.

Your task is to **recreate these designs in the target app's environment** (React Native, Swift/SwiftUI, Flutter, a production React web app, etc.), using its established component library, navigation, theming, and data layer. If no app environment exists yet, choose the most appropriate framework and implement there. Treat the HTML as the source of truth for **visual design, layout, copy, and the calculation model** — not for the literal DOM/CSS.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and the estimate math are final. Recreate the UI pixel-faithfully using your codebase's primitives. The one deliberately *non-literal* element is the position-range width on the bar — see "The estimate model" → *Drawn span vs. true span*.

---

## The estimate model (most important section)

All numbers derive from a **time-based** model — there is **no live GPS**. Given:
- `legStartedAtMs` — when the runner took the handoff (ms epoch)
- `nowMs` — current time (ms epoch)
- `dist` — leg distance in miles
- `paceSec` — the runner's **target pace** in **seconds per mile**

Compute `elapsed = (nowMs − legStartedAtMs) / 1000` (seconds, floored at 0), then sweep five pace offsets `[-30, -15, 0, +15, +30]` seconds/mile. For each offset `off`:

```
p        = paceSec + off                       // this scenario's pace (sec/mi)
total    = dist * p                            // total leg time (sec)
frac     = clamp((elapsed / p) / dist, 0, 1)   // fraction of leg completed NOW
finishMs = legStartedAtMs + total * 1000       // arrival clock time
remain   = max(0, (finishMs - nowMs) / 1000)   // countdown from now (sec)
deltaSec = dist * off                          // arrival delta vs target pace (sec)
arrived  = nowMs >= finishMs
```

Index `[2]` (offset 0) is the **target/best estimate**.

**Key insight that drives the whole UI:** because `elapsed` is fixed, the runner's *position right now* (`frac`) barely changes across the pace scenarios (a few percent), but the *arrival time* swings by minutes. So:
- The **bar** shows a single best-estimate position with a **range marker**, not five separate dots (five dots overlap and read as noise — this was explicitly rejected during design).
- The **table** carries the full pace-by-pace spread, because that's where the meaningful variation lives.

### Drawn span vs. true span (Direction A bar)
The true min→max of `frac` across the five paces is only ~3% of the leg — too narrow to read. The bar therefore **widens the drawn range to a legible minimum**, centered on the best estimate:

```
MIN_SPAN = 0.10                                  // 10% of the bar, minimum
half     = max((maxFrac - minFrac) / 2, MIN_SPAN / 2)
visMin   = clamp(targetFrac - half, 0, 1)
visMax   = clamp(targetFrac + half, 0, 1)
```
`minFrac` = slowest pace (+30, least progress), `maxFrac` = fastest pace (−30, most progress). This is a deliberate legibility choice, not the literal spread.

---

## Screens / Views

There is **one screen** with **two layout variants**. Common chrome is shared.

### Shared chrome (both variants)

**Top bar** (`padding: 8px 18px`, flex space-between):
- Left: **back button** — text only, e.g. `← TRAIL MIX` or `← TIMING`. Hanken Grotesk 800, 12px, letter-spacing 0.04em, color `mut`.
- Right: **LIVE indicator** — a 7px green (`green`) dot that blinks (opacity 1 → 0.25 → 1, 1.5 s ease-in-out infinite) + label "LIVE", Hanken 700, 11px, letter-spacing 0.1em, color `mut`.
- The whole screen has `padding-top: 52px` to clear the device status bar.

**Title block** (`padding: 4px 18px 0`):
- Eyebrow: `LEG {n} OF {totalLegs} · {TEAM}` — Hanken 700, 11px, letter-spacing 0.13em, color `accent`.
- Runner name: **Anton**, 44px, line-height 0.92, uppercase, color `text`. `margin-top: 7px`.
- Meta line: `→ {TOWN} · {dist} MI · TARGET {m:ss}/MI` — Hanken 800, 12px, letter-spacing 0.04em, color `mut`; the pace value `{m:ss}` is **JetBrains Mono** 700, color `text`. `margin-top: 9px`.

---

### Variant A — Progress bar + arrival table (recommended)

**1. Position bar block** (`padding: 18px 18px 4px`)

Header row (flex space-between, `margin-bottom: 14px`):
- Left: `ESTIMATED POSITION · NOW` — Hanken 800, 10px, letter-spacing 0.1em, color `mut`, nowrap.
- Right: `≈{milesIn} OF {dist} MI` — Hanken 800, 11px, letter-spacing 0.04em, color `accent`, nowrap. (`milesIn = targetFrac * dist`, 1 decimal.)

The **bar** itself (relative container, height 30px), layered:
- **Track**: full width, height 12px, `border-radius: 20px`, background `line`.
- **Solid progress fill**: `left: 0` → `width: visMin%`, height 12px, `border-radius: 20px 0 0 20px`, background `accent`.
- **Range span**: `left: visMin%`, `width: (visMax−visMin)%`, height 12px, background `accent` at **40% alpha** (`accent` + `66`).
- **Two end-caps**: vertical bars at `visMin%` and `visMax%`, each `width: 3.5px`, `height: 26px`, `border-radius: 2px`, background `accent`, centered on the track (translate −50%,−50%).
- **Best-estimate tick**: at `targetFrac%`, `width: 3px`, `height: 18px`, `border-radius: 2px`, background `panel` (white) so it reads as a notch inside the accent span.

Scale row (flex space-between, `margin-top: 11px`):
- Left: `0 mi · handoff` — JetBrains Mono 10px, color `faint`.
- Center: `likely range · ≈{pct}% in` — Hanken 700, 10px, color `mut`, nowrap. (`pct = round(targetFrac*100)`.)
- Right: `{dist} mi · finish` — JetBrains Mono 10px, color `faint`.

**2. Arrival table** (`padding: 14px 18px 26px`)

- Section title: `ARRIVAL BY PACE` — **Anton** 20px, uppercase, letter-spacing 0.02em, `margin-bottom: 8px`.
- Table container: background `panel`, `1px solid line`, `border-radius: 16px`, `overflow: hidden`.
- **Column layout** (flex row, `gap: 8px`, cell padding `11px 14px`; header padding `9px 14px`):

  | Column | Flex basis | Align | Content |
  |---|---|---|---|
  | PACE | `0 0 52px` | left | `{m:ss}` Mono 700 14px + sub-tag (`FASTEST`/`SLOWEST`/`TARGET`) Hanken 800 7px color `faint` |
  | ARRIVES | `1 1 0` | right | `{h:mm}` Mono 700 14.5px + ` {AM/PM}` 9px color `mut` |
  | IN | `0 0 58px` | right | countdown `{m:ss}` Mono 12.5px color `mut` |
  | Δ | `0 0 50px` | right | signed `{m:ss}` Mono 700 12px; color `red` if late (+), `green` if early (−), `mut`/`—` if on target |
  | LEG TIME | `0 0 56px` | right | total `{m:ss}` Mono 12.5px color `mut` |

- Header labels: Hanken 800, 8.5px, letter-spacing 0.08em, color `faint`. Header row has `border-bottom: 1px solid line`.
- Rows: `border-bottom: 1px solid line2` (none on last row).
- **Target row highlight**: background `accent` at 8% alpha (`accent` + `14`); its PACE and ARRIVES values are colored `accent`.
- Sign convention: `−` uses the minus glyph `−` (U+2212), not a hyphen.

- Footnote below the table (`margin-top: 10px`): "Position barely shifts with pace — but arrival can swing several minutes. Plan warm-ups off the spread, not a single time." — Hanken 600, 10.5px, color `faint`, line-height 1.4.

**Row order (top→bottom):** fastest (8:38, −30) → +15 steps → slowest (9:38, +30). i.e. earliest arrival first.

---

### Variant B — Pace lanes (alternate)

`padding: 8px 18px 26px`.

**1. Best-estimate hero card** (`margin-top: 10px`): full-width, background `accent`, text `ink` (white), `border-radius: 18px`, `padding: 14px 18px 16px`, flex space-between aligned to bottom.
- Left: eyebrow `BEST ESTIMATE · ON TARGET PACE` (Hanken 800, 9.5px, letter-spacing 0.12em, opacity 0.9) + arrival `{h:mm}` Mono 700 36px line-height 0.95 with ` {AM/PM}` 17px.
- Right: countdown `{m:ss}` Mono 700 22px + label `TILL HANDOFF` Hanken 800 9px opacity 0.9.

**2. Section header** (`margin: 20px 0 4px`, flex space-between): `If pace holds at…` (Anton 20px uppercase) + `±30s/MI` (Hanken 800 9px color `faint`).

**3. Five pace-lane cards** (vertical stack, `gap: 8px`). Each card: background `panel` (or `accent`@8% for target), `1px solid line` (or `accent` for target), `border-radius: 14px`, `padding: 11px 14px`. Three lines:
- **Line 1** (flex space-between, baseline): `{m:ss}` Mono 700 18px + `/mi` Hanken 700 9.5px `faint` + optional pill tag (`FASTEST`/`TARGET`/`SLOWEST`; target pill is `accent` bg / `ink` text, others `panel2` bg / `mut` text; 7.5px, padding `2px 6px`, radius 20px). Right side: arrival `{h:mm}` Mono 700 17px + ` {AM/PM}` 10px `mut`.
- **Line 2** mini-bar (`margin: 10px 0 8px`): track height 7px radius 20px bg `line`; fill `width: frac%` bg `accent` (target) or `mut`; dot at `frac%` 11px circle, `accent`/`panel` fill, 2px border `ink`/`mut`.
- **Line 3** (flex space-between, Mono 10.5px, nowrap): left `≈{pct}% there · leg {m:ss}` color `faint`; right `in {m:ss}` color `mut` + delta (color-coded `red`/`green`, 700, `margin-left: 10px`, "on tgt" when 0).

---

## Interactions & Behavior
- **Live updates:** `nowMs` should advance on a timer (the prototype ticks ~1/sec). Every metric (frac, arrival, countdown) recomputes from `nowMs`. Countdown `IN` / `TILL HANDOFF` decreases in real time.
- **Back button** dismisses the screen (pop navigation) back to the entry point.
- **LIVE dot** pulses continuously (1.5 s).
- **Reduced motion:** disable the blink and any entrance animation under `prefers-reduced-motion`.
- No other interactive controls on the screen itself — it is a read-only detail view.

## Entry points (navigation into this screen)
Wire **both** of these (already implemented in the prototype):
1. **Tracker → team detail:** the `EST. ARRIVAL` hero block on the team-detail screen is tappable; it shows a `BY PACE →` affordance pill and opens this screen for that team's live leg.
2. **Driver → live timing:** a dedicated full-width button labeled **"WHEN DO THEY ARRIVE?"** with sub-label `EST. RANGE · PACE ±30s/MI` and a `→`, placed under the live-leg distance/pace readout. Button background is the leg's status color (`green` on-pace / `red` behind). Opens this screen for the in-progress leg.

In both cases pass the live leg's `legStartedAtMs`, `nowMs`, `dist`, `paceSec` (target), runner, town, leg number.

## State Management
Inputs (props): `legStartedAtMs`, `nowMs`, `dist`, `paceSec`, `runner {name}`, `town`, `legN`, `totalLegs` (default 18), `teamName`, `variant` ('A' | 'B'), `onBack`, `backLabel`.
- The only live state is `nowMs` (a clock tick). Everything else is derived per render via the estimate model above.
- No data fetching in the prototype; in production, `legStartedAtMs`/`paceSec`/`dist` come from the team's leg schedule and the handoff event.

---

## Design Tokens

**Light theme (default / primary):**
| Token | Value | Use |
|---|---|---|
| `bg` | `#f4f0e7` | screen background (warm cream) |
| `panel` | `#ffffff` | cards, table, white ticks |
| `panel2` | `#faf6ec` | inset pill backgrounds |
| `line` | `rgba(0,0,0,0.09)` | borders, track |
| `line2` | `rgba(0,0,0,0.05)` | row dividers |
| `text` | `#1a160f` | primary text |
| `mut` | `#6f6759` | secondary text |
| `faint` | `#b0a795` | tertiary/labels |
| `accent` | `#e8480f` | primary accent (burnt orange) |
| `green` | `#0e9b52` | on-pace / early / LIVE |
| `red` | `#dd3a23` | behind pace / late |
| `amber` | `#c47d12` | (reserved) |
| `ink` | `#ffffff` | text on accent fills |

**Dark theme** (the app supports it; mirror with): `bg #13110a`, `panel #1d1810`, `panel2 #241d12`, `line rgba(255,240,220,0.10)`, `line2 rgba(255,240,220,0.055)`, `text #fbf6ee`, `mut #a99e8c`, `faint #6a6053`, `accent #ff5a1f`, `green #37d27a`, `red #ff4d2e`, `amber #ffae3b`, `ink #13110a`.

> Note: the standalone canvas file uses `accent #ff2e63` (pink) for demonstration; the **production accent is `#e8480f`** as used in the live prototype. Use the prototype value.

Alpha suffixes used: append `14` (≈8%), `26` (≈15%), `33` (≈20%), `66` (≈40%) to a hex color for translucent fills.

**Typography:**
- **Display** — `Anton` (single weight 400; reads bold). Used for runner name (44px) and section titles (20px), uppercase.
- **Body / labels** — `Hanken Grotesk` (weights 400–800). Eyebrows and labels are 800 + wide letter-spacing.
- **Numerals / data** — `JetBrains Mono` (400/500/700). All times, paces, clock values, deltas.

**Spacing / radius:** screen gutters 18px; cards radius 14–18px; table radius 16px; bar track radius 20px (pill); pill tags radius 20px. Bar track height 12px, end-caps 26px tall × 3.5px, best-estimate tick 18px × 3px.

---

## Assets
No images or icons are required for this screen — the `→` and `←` are plain text glyphs, the LIVE indicator is a CSS circle, and the bar/marker are CSS rectangles. Fonts load from Google Fonts (Anton, Hanken Grotesk, JetBrains Mono); substitute your app's equivalents if these aren't already in the project.

## Files (in `reference/`)
- **`leg-progress.jsx`** — the screen itself. `LegProgress` is the entry component; `LPHeroBar` + `LPTable` are Variant A, `LPLanes` is Variant B; `lpEstimates()` is the calculation model; `lp*` helpers format durations/paces/clock. **Start here.**
- **`KT82 Leg Progress.html`** — standalone canvas showing Variant A and B side-by-side in iPhone frames (open this to see both).
- **`KT82 Prototype.html`** — the full interactive app; shows the two entry points wired up (Driver button + Tracker hero) and a Tweaks toggle for layout A/B.
- **`prototype.jsx`** — Tracker + Driver apps; see `DriverTiming` (the "WHEN DO THEY ARRIVE?" button), `TrackerDetail` (the tappable `EST. ARRIVAL` hero), and `tokB()` (theme tokens).
- **`kt82-data.js`** — shared race data + `window.KT82.fmt.clock/dur/pace`. The estimate model consumes `current` (live leg: `n`, `town`, `dist`, `runner.pace`, `startedAt`, `elapsedSec`).
- **`ios-frame.jsx`, `design-canvas.jsx`, `tweaks-panel.jsx`, `course-legs.jsx`** — supporting scaffolds used by the prototypes (device bezel, comparison canvas, tweak panel, related course screen). Reference only; not part of the feature.

A screenshot of both directions is in `screenshots/direction-A-and-B.png`.
