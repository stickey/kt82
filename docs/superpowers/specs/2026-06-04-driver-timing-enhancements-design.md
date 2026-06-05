# Driver Timing Enhancements — Design Spec

**Date:** 2026-06-04  
**Status:** Approved  
**Scope:** `apps/driver` — `TimingScreen` and `LegProgressScreen`

---

## Overview

Two screens in the driver app get enhancements to surface more real-time progress information. The timing screen gains a third pill showing estimated time and distance remaining. The arrival screen's progress bar swaps a thin white notch for the runner icon used on the map screen.

---

## Change 1 — TimingScreen: 3-pill row

### Current state

Two equal-width pills side by side:
- **Leg Time** — big: elapsed leg time (e.g. `32:15`); subtext: `3.1 mi total`
- **ETA** — big: estimated arrival clock time (e.g. `9:42`); subtext: pace status

### New state

Three equal-width pills, same styling, font size reduced from 38px → 28px to fit the narrower columns:

| Pill | Big text | Subtext |
|------|----------|---------|
| **Leg Time** | elapsed leg time (unchanged) | `~1.45 mi done` — estimated distance completed, 2 decimal places |
| **Time Left** *(new)* | estimated time remaining (e.g. `14:22`) | `~1.65 mi left` — estimated distance remaining, 2 decimal places |
| **ETA** | arrival clock time (unchanged) | pace status (unchanged) |

Both distance values use the on-pace estimate from `lpEstimates` (`ests[2]`):
- Distance completed: `ests[2].frac * distMiles` — displayed as `~X.XX mi done`
- Time remaining: `ests[2].remain` (seconds) — displayed as `M:SS` or `H:MM:SS`
- Distance remaining: `(1 - ests[2].frac) * distMiles` — displayed as `~X.XX mi left`

Distance subtexts are prefixed with `~` to signal they are estimates. All values update every second via a `nowMs` state ticker.

The new pill and updated subtext are **only rendered when `targetPaceSecPerMile` is non-null**. When pace is unavailable the layout falls back to the existing 2-pill row with the original `3.1 mi total` subtext.

### Implementation

- Add `targetPaceSecPerMile: number | null` prop to `TimingScreen`
- Add `nowMs` state with `setInterval(1000)` inside `TimingScreen`
- Import `lpEstimates` from `@kt82/shared`
- Update `App.tsx` to pass `targetPaceSecPerMile={view.targetPaceSecPerMile}` to `<TimingScreen>`

---

## Change 2 — LegProgressScreen: runner icon on progress bar

### Current state

The progress bar has a thin white vertical bar (`3px × 18px`, `background: var(--panel)`) positioned at the on-pace estimate fraction — visually marking the center of the uncertainty span.

### New state

Replace that div with a 26px orange circle containing the 🏃 emoji, matching the map screen's runner marker style:
- `width: 26px`, `height: 26px`, `border-radius: 50%`
- `background: #ff5a1f` (accent orange)
- `border: 2.5px solid #fff`
- `box-shadow: 0 0 7px rgba(255,90,31,0.75)`
- Emoji: 🏃 at `font-size: 13px`
- Positioned with `position: absolute`, `transform: translate(-50%, -50%)` centered on `target.frac * 100%`

The 30px-tall bar container already accommodates the 26px icon without height changes.

No other changes to `LegProgressScreen`.

---

## Files Changed

| File | Change |
|------|--------|
| `apps/driver/src/components/TimingScreen.tsx` | Add prop, `nowMs` ticker, `lpEstimates` call, 3-pill layout |
| `apps/driver/src/components/LegProgressScreen.tsx` | Replace white notch div with runner icon div |
| `apps/driver/src/App.tsx` | Pass `targetPaceSecPerMile` to `<TimingScreen>` |

No server changes. No shared package changes. No tracker app changes.
