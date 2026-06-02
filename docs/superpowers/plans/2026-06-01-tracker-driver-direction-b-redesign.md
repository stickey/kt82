# Tracker & Driver — Direction B Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle `apps/tracker` and `apps/driver` to Direction B "Course / Bib" — Anton/Hanken Grotesk/JetBrains Mono type, warm near-black palette with orange accent, color-forward pace status, big glanceable numerics — without changing any behavior, API calls, or state logic.

**Architecture:** Clean restyle in-place — keep all logic, hooks, and API calls; replace only JSX markup and CSS. Design tokens live as CSS vars in each app's `index.css` with a `@media (prefers-color-scheme: light)` override in Tracker. Token values applied via inline `style={}` props (CSS var references) alongside Tailwind utility classes for layout.

**Tech Stack:** React 18, TypeScript, Tailwind CSS 3, Vite, Google Fonts (Anton, Hanken Grotesk, JetBrains Mono)

**Reference:** `docs/design_handoff_kt82_tracker_driver/prototype/KT82 Prototype.html` — open in browser while implementing to verify each screen.

**Spec:** `docs/superpowers/specs/2026-06-01-tracker-driver-direction-b-redesign.md`

---

## File Map

| File | Action | What changes |
|---|---|---|
| `apps/tracker/index.html` | Modify | Replace Barlow/DM Sans Google Fonts with Anton + Hanken Grotesk + JetBrains Mono |
| `apps/tracker/tailwind.config.js` | Modify | Add `fontFamily` extensions for `display`, `hanken`, `mono` |
| `apps/tracker/src/index.css` | Modify | Replace all CSS vars; add light-theme media query; update font-display class; keep live-dot/glow animations |
| `apps/tracker/src/App.tsx` | Modify | Update loading/no-race bg to use `--bg` CSS var |
| `apps/tracker/src/components/TeamGrid.tsx` | Modify | Full JSX restyle |
| `apps/tracker/src/components/TeamDetail.tsx` | Modify | Full JSX restyle |
| `apps/driver/index.html` | Modify | Add Anton + Hanken Grotesk + JetBrains Mono Google Fonts |
| `apps/driver/tailwind.config.js` | Modify | Add `fontFamily` extensions |
| `apps/driver/src/index.css` | Modify | Add Direction B dark-only CSS vars |
| `apps/driver/src/App.tsx` | Modify | Add `nextRunner` to `start` view state; update loading/no-race bg |
| `apps/driver/src/components/LongPressButton.tsx` | Modify | Add `holding` state + label swap; replace `colorClass`/`textClass` with `bgStyle`/`textStyle`; add `height` prop |
| `apps/driver/src/components/StartScreen.tsx` | Modify | Accept `nextRunner` prop; full JSX restyle |
| `apps/driver/src/components/TimingScreen.tsx` | Modify | Full JSX restyle; inline top bar replaces RaceBanner |
| `apps/driver/src/components/CompleteScreen.tsx` | Modify | Full JSX restyle |
| `apps/driver/src/components/RaceBanner.tsx` | Delete | Replaced by inline top bar in each Driver screen |

---

## Task 1: Create branch + add Google Fonts to both apps

**Files:**
- Modify: `apps/tracker/index.html`
- Modify: `apps/driver/index.html`

- [ ] **Step 1: Create the feature branch**

```bash
git checkout -b redesign/tracker-driver-direction-b
```

- [ ] **Step 2: Update `apps/tracker/index.html`** — replace the existing Barlow/DM Sans font link with the three new families

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>KT82 Tracker</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Hanken+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Update `apps/driver/index.html`** — add the same three font families (driver had no fonts previously)

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>KT82 Driver</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Anton&family=Hanken+Grotesk:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Commit**

```bash
git add apps/tracker/index.html apps/driver/index.html
git commit -m "feat(redesign): add Anton/Hanken Grotesk/JetBrains Mono Google Fonts to tracker and driver"
```

---

## Task 2: Tracker token layer — CSS vars + Tailwind config

**Files:**
- Modify: `apps/tracker/src/index.css`
- Modify: `apps/tracker/tailwind.config.js`

- [ ] **Step 1: Replace `apps/tracker/src/index.css`** — new CSS vars (dark default + light override), updated font declarations, keep animations

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* === Direction B — Dark theme (default) === */
:root {
  --bg:      #13110a;
  --panel:   #1d1810;
  --panel2:  #241d12;
  --line:    rgba(255,240,220,0.10);
  --line2:   rgba(255,240,220,0.055);
  --text:    #fbf6ee;
  --mut:     #a99e8c;
  --faint:   #6a6053;
  --accent:  #ff5a1f;
  --green:   #37d27a;
  --red:     #ff4d2e;
  --amber:   #ffae3b;
  --ink:     #13110a;
}

/* === Light theme (spectators in daylight) === */
@media (prefers-color-scheme: light) {
  :root {
    --bg:      #f4f0e7;
    --panel:   #ffffff;
    --panel2:  #faf6ec;
    --line:    rgba(0,0,0,0.09);
    --line2:   rgba(0,0,0,0.05);
    --text:    #1a160f;
    --mut:     #6f6759;
    --faint:   #b0a795;
    --accent:  #e8480f;
    --green:   #0e9b52;
    --red:     #dd3a23;
    --amber:   #c47d12;
    --ink:     #ffffff;
  }
}

* { box-sizing: border-box; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Hanken Grotesk', sans-serif;
  min-height: 100dvh;
}

/* Anton = display font for race-bib headlines */
.font-display { font-family: 'Anton', sans-serif; }
.font-mono    { font-family: 'JetBrains Mono', monospace; }

.card-hover { transition: opacity 0.15s; }
.card-hover:active { opacity: 0.8; }

@keyframes live-dot {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.25; }
}
.live-dot { animation: live-dot 1.5s ease-in-out infinite; }

@keyframes glow-green {
  from { box-shadow: 0 14px 40px rgba(55,210,122,0.18); }
  to   { box-shadow: 0 14px 40px rgba(55,210,122,0.40); }
}
@keyframes glow-red {
  from { box-shadow: 0 14px 40px rgba(255,77,46,0.18); }
  to   { box-shadow: 0 14px 40px rgba(255,77,46,0.40); }
}
@media (prefers-color-scheme: light) {
  @keyframes glow-green {
    from { box-shadow: 0 14px 34px rgba(14,155,82,0.15); }
    to   { box-shadow: 0 14px 34px rgba(14,155,82,0.35); }
  }
  @keyframes glow-red {
    from { box-shadow: 0 14px 34px rgba(221,58,35,0.15); }
    to   { box-shadow: 0 14px 34px rgba(221,58,35,0.35); }
  }
}
.glow-green { animation: glow-green 1.5s ease-in-out infinite alternate; }
.glow-red   { animation: glow-red   1.5s ease-in-out infinite alternate; }
```

- [ ] **Step 2: Update `apps/tracker/tailwind.config.js`** — add font families so Tailwind classes like `font-display` are available

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Anton', 'sans-serif'],
        hanken:  ['Hanken Grotesk', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/tracker/src/index.css apps/tracker/tailwind.config.js
git commit -m "feat(redesign): tracker Direction B token layer — CSS vars, light theme, fonts"
```

---

## Task 3: Driver token layer — CSS vars + Tailwind config

**Files:**
- Modify: `apps/driver/src/index.css`
- Modify: `apps/driver/tailwind.config.js`

- [ ] **Step 1: Replace `apps/driver/src/index.css`** — dark-only tokens (Driver is always dark)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* === Direction B — Dark theme (Driver is always dark) === */
:root {
  --bg:      #13110a;
  --panel:   #1d1810;
  --panel2:  #241d12;
  --line:    rgba(255,240,220,0.10);
  --line2:   rgba(255,240,220,0.055);
  --text:    #fbf6ee;
  --mut:     #a99e8c;
  --faint:   #6a6053;
  --accent:  #ff5a1f;
  --green:   #37d27a;
  --red:     #ff4d2e;
  --amber:   #ffae3b;
  --ink:     #13110a;
}

* { box-sizing: border-box; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Hanken Grotesk', sans-serif;
  min-height: 100dvh;
}

.font-display { font-family: 'Anton', sans-serif; }
.font-mono    { font-family: 'JetBrains Mono', monospace; }
```

- [ ] **Step 2: Update `apps/driver/tailwind.config.js`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Anton', 'sans-serif'],
        hanken:  ['Hanken Grotesk', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/driver/src/index.css apps/driver/tailwind.config.js
git commit -m "feat(redesign): driver Direction B token layer — CSS vars, fonts"
```

---

## Task 4: Restyle TeamGrid + update Tracker App.tsx

**Files:**
- Modify: `apps/tracker/src/components/TeamGrid.tsx`
- Modify: `apps/tracker/src/App.tsx`

No behavior changes. All polling, intervals, and `onTeamClick` logic stays identical. Visual-only.

**Note on miles data:** `GET /races/:id/status` returns `currentLeg.legNumber` but not all-legs distances (that endpoint requires admin auth). The progress bar uses `(legNumber - 1) / 18` as a fraction and shows `Leg N of 18` instead of exact miles.

- [ ] **Step 1: Replace `apps/tracker/src/components/TeamGrid.tsx`**

```tsx
import { useState, useEffect, useRef } from 'react'
import { api, formatTime } from '../api'
import type { Race, TeamStatus } from '../api'

interface Props {
  race: Race
  onTeamClick: (teamId: string, teamName: string) => void
}

function statusColor(s: 'on-pace' | 'ahead' | 'overdue'): string {
  return s === 'overdue' ? 'var(--red)' : 'var(--green)'
}
function statusLabel(s: 'on-pace' | 'ahead' | 'overdue'): string {
  if (s === 'overdue') return 'BEHIND PACE'
  if (s === 'ahead')   return 'AHEAD'
  return 'ON PACE'
}

export function TeamGrid({ race, onTeamClick }: Props) {
  const [statuses, setStatuses] = useState<TeamStatus[]>([])
  const [pollError, setPollError] = useState(false)
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState<number | null>(null)
  const lastUpdatedRef = useRef<Date | null>(null)

  useEffect(() => {
    async function poll() {
      try {
        const data = await api.get<TeamStatus[]>(`/races/${race.id}/status`)
        setStatuses(data)
        lastUpdatedRef.current = new Date()
        setSecondsSinceUpdate(0)
        setPollError(false)
      } catch {
        setPollError(true)
      }
    }
    poll()
    const pollId = setInterval(poll, 30_000)
    const tickId = setInterval(() => {
      if (lastUpdatedRef.current) {
        setSecondsSinceUpdate(Math.floor((Date.now() - lastUpdatedRef.current.getTime()) / 1000))
      }
    }, 1_000)
    return () => { clearInterval(pollId); clearInterval(tickId) }
  }, [race.id])

  const raceDate = new Date(race.date).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  }).toUpperCase()

  const sorted = [...statuses].sort((a, b) => {
    const aDone = a.currentLeg ? a.currentLeg.legNumber - 1 : -1
    const bDone = b.currentLeg ? b.currentLeg.legNumber - 1 : -1
    if (bDone !== aDone) return bDone - aDone
    // tie-break: earlier ETA wins
    const aEta = a.eta?.eta ? new Date(a.eta.eta).getTime() : Infinity
    const bEta = b.eta?.eta ? new Date(b.eta.eta).getTime() : Infinity
    return aEta - bEta
  })

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <div className="max-w-2xl mx-auto px-[18px] pt-[18px] pb-8">

        {/* Header */}
        <div className="mb-5">
          <h1 className="font-display uppercase leading-none" style={{ fontSize: 50, letterSpacing: '0.01em' }}>
            KT82
          </h1>
          <p className="mt-1 uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--accent)' }}>
            {race.name} · {raceDate}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--mut)' }}>
              {statuses.length} Teams on Course
            </span>
            {pollError ? (
              <span style={{ fontSize: 11, color: 'var(--amber)' }}>⚠ Unable to refresh</span>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="live-dot inline-block flex-shrink-0" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
                <span className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--green)' }}>Live</span>
                {secondsSinceUpdate !== null && secondsSinceUpdate > 0 && (
                  <span className="font-mono" style={{ fontSize: 11, color: 'var(--faint)' }}>
                    · {secondsSinceUpdate}s ago
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Team cards */}
        {statuses.length === 0 && !pollError ? (
          <p style={{ fontSize: 13, color: 'var(--mut)' }}>No teams yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {sorted.map((s, idx) => {
              const isActive   = s.status === 'in-progress'
              const isLeading  = idx === 0 && isActive
              const etaStatus  = s.eta?.status ?? 'on-pace'
              const sColor     = isActive ? statusColor(etaStatus) : 'var(--faint)'
              const legsDone   = s.currentLeg ? s.currentLeg.legNumber - 1 : 0
              const progress   = Math.min(legsDone / 18, 1)

              return (
                <button
                  key={s.team.id}
                  onClick={() => onTeamClick(s.team.id, s.team.name)}
                  className="card-hover w-full text-left flex overflow-hidden"
                  style={{
                    background: 'var(--panel)',
                    border: `1px solid ${isLeading ? 'var(--accent)' : 'var(--line)'}`,
                    borderRadius: 18,
                    minHeight: 44,
                  }}
                >
                  {/* Status stripe */}
                  <div style={{ width: 6, flexShrink: 0, background: sColor, alignSelf: 'stretch' }} />

                  {/* Card body */}
                  <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
                    {/* Top: rank + name + status pill */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isLeading && (
                          <span className="font-display flex-shrink-0" style={{ fontSize: 18, color: 'var(--accent)', lineHeight: 1 }}>1</span>
                        )}
                        <span className="font-display uppercase truncate" style={{ fontSize: 28, lineHeight: 0.9, color: isActive ? 'var(--text)' : 'var(--mut)' }}>
                          {s.team.name}
                        </span>
                      </div>
                      {isActive && s.eta && (
                        <span className="flex-shrink-0 uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em', padding: '3px 8px', borderRadius: 999, background: sColor, color: 'var(--ink)' }}>
                          {statusLabel(etaStatus)}
                        </span>
                      )}
                    </div>

                    {/* Mid + bottom (active teams only) */}
                    {isActive && s.currentLeg && (
                      <>
                        <div className="flex items-baseline justify-between gap-2 mt-1">
                          <span className="truncate" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 12.5, color: 'var(--mut)' }}>
                            Leg {s.currentLeg.legNumber}
                            {s.currentRunner ? ` · ${s.currentRunner.name}` : ''}
                            {s.nextHandoff ? ` → ${s.nextHandoff.name}` : ''}
                          </span>
                          {s.eta && (
                            <span className="font-mono flex-shrink-0" style={{ fontSize: 16, color: sColor }}>
                              {formatTime(s.eta.eta)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div style={{ flex: 1, height: 4, background: 'var(--line)', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.round(progress * 100)}%`, background: sColor, borderRadius: 999 }} />
                          </div>
                          <span className="font-mono flex-shrink-0" style={{ fontSize: 11, color: 'var(--faint)' }}>
                            Leg {legsDone} of 18
                          </span>
                        </div>
                      </>
                    )}

                    {!isActive && (
                      <p className="mt-1" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 12, color: 'var(--faint)' }}>
                        Not started
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update `apps/tracker/src/App.tsx`** — replace hardcoded `bg-gray-950` with CSS vars in loading/no-race states and root wrapper

```tsx
import { useState, useEffect } from 'react'
import { api } from './api'
import type { Race, TeamStatus } from './api'
import { TeamGrid } from './components/TeamGrid'
import { TeamDetail } from './components/TeamDetail'

function getHashTeamId(): string | null {
  const m = window.location.hash.match(/^#team\/(.+)$/)
  return m ? m[1] : null
}

export default function App() {
  const [race, setRace] = useState<Race | null>(null)
  const [noRace, setNoRace] = useState(false)
  const [teamId, setTeamId] = useState<string | null>(getHashTeamId)
  const [teamName, setTeamName] = useState('')

  useEffect(() => {
    api.get<Race>('/races/active')
      .then(setRace)
      .catch(() => setNoRace(true))
  }, [])

  useEffect(() => {
    function onHashChange() { setTeamId(getHashTeamId()) }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (!race || !teamId || teamName) return
    api.get<TeamStatus[]>(`/races/${race.id}/status`)
      .then(statuses => {
        const found = statuses.find(s => s.team.id === teamId)
        if (found) setTeamName(found.team.name)
      })
      .catch(() => {})
  }, [race, teamId, teamName])

  function navigateToTeam(id: string, name: string) {
    window.location.hash = `team/${id}`
    setTeamId(id)
    setTeamName(name)
  }

  function navigateBack() {
    window.location.hash = ''
    setTeamId(null)
  }

  if (noRace) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <p style={{ color: 'var(--mut)' }}>No active race.</p>
    </div>
  )

  if (!race) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <p style={{ fontSize: 13, color: 'var(--mut)' }}>Loading…</p>
    </div>
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      {teamId
        ? <TeamDetail teamId={teamId} teamName={teamName} onBack={navigateBack} />
        : <TeamGrid race={race} onTeamClick={navigateToTeam} />
      }
    </div>
  )
}
```

- [ ] **Step 3: Start dev server and verify Tracker grid**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker dev
# Open http://localhost:5173
# Check: KT82 Anton header, orange subline, live dot, team cards with stripe/pill/progress bar
# Compare with docs/design_handoff_kt82_tracker_driver/prototype/KT82 Prototype.html
```

- [ ] **Step 4: Commit**

```bash
git add apps/tracker/src/components/TeamGrid.tsx apps/tracker/src/App.tsx
git commit -m "feat(redesign): restyle Tracker TeamGrid to Direction B"
```

---

## Task 5: Restyle TeamDetail

**Files:**
- Modify: `apps/tracker/src/components/TeamDetail.tsx`

All polling, intervals, `raceStartedAt` derivation, `projectedTimes` map, and `handleShare` logic stays identical. New elements: bib tile, race time block with miles progress, hero relay-pass block with on-deck strip, course rows with avatars and nav pins on every leg.

- [ ] **Step 1: Replace `apps/tracker/src/components/TeamDetail.tsx`**

```tsx
import { useState, useEffect, useRef } from 'react'
import { api, formatTime, formatElapsed, formatRaceTime } from '../api'
import type { LegTimelineItem } from '../api'

interface Props {
  teamId: string
  teamName: string
  onBack: () => void
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

function NavPin({ url }: { url: string }) {
  if (!url) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      title="Directions"
      className="flex items-center justify-center flex-shrink-0"
      style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--panel2)', border: '1px solid var(--line)' }}
    >
      <svg width="11" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C8.1 2 5 5.1 5 9c0 4.9 7 13 7 13s7-8.1 7-13c0-3.9-3.1-7-7-7z" fill="var(--faint)" />
        <circle cx="12" cy="9" r="2.6" fill="var(--panel2)" />
      </svg>
    </a>
  )
}

export function TeamDetail({ teamId, teamName, onBack }: Props) {
  const [timeline, setTimeline] = useState<LegTimelineItem[]>([])
  const [pollError, setPollError] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState<number | null>(null)
  const [tick, setTick] = useState(0)
  const lastUpdatedRef = useRef<Date | null>(null)
  const notFoundRef = useRef(false)

  useEffect(() => {
    async function poll() {
      if (notFoundRef.current) return
      try {
        const data = await api.get<LegTimelineItem[]>(`/teams/${teamId}/timeline`)
        setTimeline(data)
        lastUpdatedRef.current = new Date()
        setSecondsSinceUpdate(0)
        setPollError(false)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : ''
        if (msg.includes('→ 404')) { notFoundRef.current = true; setNotFound(true) }
        else setPollError(true)
      }
    }
    poll()
    const pollId = setInterval(poll, 30_000)
    const tickId = setInterval(() => {
      if (lastUpdatedRef.current) {
        setSecondsSinceUpdate(Math.floor((Date.now() - lastUpdatedRef.current.getTime()) / 1000))
      }
      setTick(t => t + 1)
    }, 1_000)
    return () => { clearInterval(pollId); clearInterval(tickId) }
  }, [teamId])

  function handleShare() {
    const url = window.location.href
    if (navigator.share) navigator.share({ title: teamName, url })
    else navigator.clipboard.writeText(url)
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="p-4">
          <button onClick={onBack} className="flex items-center min-h-[44px]" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mut)' }}>
            ← All Teams
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p style={{ color: 'var(--mut)' }}>Team not found.</p>
        </div>
      </div>
    )
  }

  const activeItem = timeline.find(t => t.status === 'in-progress')
  const sorted     = [...timeline].sort((a, b) => a.leg.legNumber - b.leg.legNumber)

  // Race timestamps
  const raceStartedAt = sorted.find(t => t.result?.startedAt)?.result?.startedAt ?? null
  const allDone       = timeline.length > 0 && timeline.every(t => t.status === 'completed')
  const raceEndedAt   = allDone
    ? sorted.map(t => t.result?.finishedAt).filter(Boolean).sort().at(-1) ?? null
    : null
  const raceElapsedMs = raceStartedAt
    ? Math.max(0, new Date(raceEndedAt ?? Date.now()).getTime() - new Date(raceStartedAt).getTime())
    : 0
  // re-read tick to force re-render every second
  void tick

  // Miles
  const milesDone  = sorted.filter(t => t.status === 'completed').reduce((s, t) => s + t.leg.distanceMiles, 0)
  const totalMiles = sorted.reduce((s, t) => s + t.leg.distanceMiles, 0) || 82
  const milesToGo  = Math.max(0, totalMiles - milesDone)

  // Projected arrival times for not-started legs
  const projectedTimes = new Map<string, Date>()
  if (activeItem?.eta?.eta) {
    let anchor = new Date(String(activeItem.eta.eta))
    for (const item of sorted.filter(t => t.status === 'not-started')) {
      if (!item.assignment) continue
      const durationMs = item.assignment.targetPaceSecPerMile * item.leg.distanceMiles * 1000
      const arrival    = new Date(anchor.getTime() + durationMs)
      projectedTimes.set(item.leg.id, arrival)
      anchor = arrival
    }
  }

  // On-deck: first not-started leg after the active one
  const onDeckItem = activeItem
    ? sorted.find(t => t.status === 'not-started' && t.leg.legNumber > activeItem.leg.legNumber)
    : null

  // Leg time (ticking)
  const legElapsedMs = activeItem?.result?.startedAt
    ? Math.max(0, Date.now() - new Date(activeItem.result.startedAt).getTime())
    : 0

  // Status helpers
  const etaStatus  = activeItem?.eta?.status ?? 'on-pace'
  const heroColor  = etaStatus === 'overdue' ? 'var(--red)' : 'var(--green)'
  const heroBg     = etaStatus === 'overdue' ? '#ff4d2e' : '#37d27a'

  function buildNavUrl(handoff: LegTimelineItem['leg']['handoff']): string {
    if (!handoff) return ''
    if (handoff.lat != null && handoff.lng != null)
      return `https://www.google.com/maps/dir/?api=1&destination=${handoff.lat},${handoff.lng}`
    if (handoff.address)
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(handoff.address)}`
    return ''
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-[18px] py-3" style={{ borderBottom: '1px solid var(--line)' }}>
        <button onClick={onBack} className="flex items-center min-h-[44px] uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--mut)' }}>
          ← All Teams
        </button>
        {pollError && <span style={{ fontSize: 11, color: 'var(--amber)' }}>⚠ Unable to refresh</span>}
        {!pollError && secondsSinceUpdate !== null && secondsSinceUpdate > 0 && (
          <span className="font-mono" style={{ fontSize: 11, color: 'var(--faint)' }}>{secondsSinceUpdate}s ago</span>
        )}
        <button onClick={handleShare} className="flex items-center min-h-[44px] uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--mut)' }}>
          Share ↗
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-[18px] pt-4 pb-10">

        {/* Team header + bib */}
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0 flex-1">
            <p className="uppercase mb-1" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--accent)' }}>
              KT82 · Katy Trail Relay
            </p>
            <h1 className="font-display uppercase leading-none" style={{ fontSize: 48 }}>
              {teamName}
            </h1>
          </div>
          {activeItem && (
            <div className="flex-shrink-0 ml-3 text-center" style={{ background: 'var(--accent)', borderRadius: 14, padding: '10px 14px', minWidth: 70 }}>
              <div className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--ink)' }}>Leg</div>
              <div className="font-display leading-none" style={{ fontSize: 38, color: 'var(--ink)' }}>{activeItem.leg.legNumber}</div>
              <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, color: 'rgba(19,17,10,0.55)' }}>of {timeline.length || 18}</div>
            </div>
          )}
        </div>

        {/* Progress + total race time */}
        {raceStartedAt && (
          <div className="mb-4">
            <div className="flex items-baseline justify-between mb-1">
              <div>
                <div className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--faint)' }}>Total Race Time</div>
                <div className="font-mono" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>
                  {formatRaceTime(raceElapsedMs)}
                </div>
              </div>
              <div className="text-right">
                <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13, color: 'var(--mut)' }}>
                  {milesToGo.toFixed(1)} mi to go
                </div>
                <div className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--faint)', marginTop: 2 }}>
                  {milesDone.toFixed(1)} of {totalMiles.toFixed(0)} mi done
                </div>
              </div>
            </div>
            <div style={{ height: 5, background: 'var(--line)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min((milesDone / totalMiles) * 100, 100).toFixed(1)}%`, background: 'var(--accent)', borderRadius: 999 }} />
            </div>
          </div>
        )}

        {/* Hero — relay pass */}
        {activeItem && activeItem.runner && activeItem.eta && (
          <div
            className={etaStatus === 'overdue' ? 'glow-red' : 'glow-green'}
            style={{ background: heroBg, borderRadius: 22, padding: 16, marginBottom: 16 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <span className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--ink)' }}>
                Now Running · Leg {activeItem.leg.legNumber}
              </span>
              <span className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em', padding: '3px 9px', borderRadius: 999, background: 'rgba(0,0,0,0.18)', color: 'var(--ink)' }}>
                {etaStatus === 'overdue' ? 'Behind Pace' : etaStatus === 'ahead' ? 'Ahead' : 'On Pace'}
              </span>
            </div>

            {/* Runner name */}
            <div className="font-display uppercase leading-none" style={{ fontSize: 52, color: 'var(--ink)', margin: '6px 0 4px' }}>
              {activeItem.runner.name}
            </div>

            {/* Destination */}
            {activeItem.leg.handoff && (
              <div className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 12.5, fontWeight: 800, letterSpacing: '0.06em', color: 'rgba(19,17,10,0.65)', marginBottom: 12 }}>
                → Heading to {activeItem.leg.handoff.name}
              </div>
            )}

            {/* Three readouts */}
            <div className="flex mb-3">
              <div className="flex-1 text-center">
                <div className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(19,17,10,0.55)', marginBottom: 2 }}>Est. Arrival</div>
                <div className="font-mono" style={{ fontSize: 34, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
                  {formatTime(String(activeItem.eta.eta))}
                </div>
              </div>
              <div className="flex-1 text-center" style={{ borderLeft: '1px solid rgba(0,0,0,0.15)' }}>
                <div className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(19,17,10,0.55)', marginBottom: 2 }}>Leg Time</div>
                <div className="font-mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.1 }}>
                  {formatElapsed(legElapsedMs)}
                </div>
              </div>
              <div className="flex-1 text-center" style={{ borderLeft: '1px solid rgba(0,0,0,0.15)' }}>
                <div className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(19,17,10,0.55)', marginBottom: 2 }}>To Go</div>
                <div className="font-mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>
                  {activeItem.leg.distanceMiles} mi
                </div>
              </div>
            </div>

            {/* Hands off to (on-deck) */}
            {onDeckItem && onDeckItem.runner && (
              <div className="flex items-center gap-2 mb-2" style={{ background: 'rgba(0,0,0,0.16)', borderRadius: 12, padding: '10px 12px' }}>
                <div className="flex items-center justify-center flex-shrink-0" style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.20)', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 13, color: 'var(--ink)' }}>
                  {initials(onDeckItem.runner.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>
                    {onDeckItem.runner.name}
                  </div>
                  <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10.5, color: 'rgba(19,17,10,0.60)' }}>
                    Leg {onDeckItem.leg.legNumber} · {onDeckItem.leg.distanceMiles} mi
                    {onDeckItem.leg.handoff ? ` → ${onDeckItem.leg.handoff.name}` : ''}
                  </div>
                </div>
                <span className="uppercase flex-shrink-0" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', background: 'rgba(0,0,0,0.18)', borderRadius: 999, padding: '2px 8px', color: 'var(--ink)' }}>
                  On Deck
                </span>
              </div>
            )}

            {/* Drive to */}
            {activeItem.leg.handoff && buildNavUrl(activeItem.leg.handoff) && (
              <a
                href={buildNavUrl(activeItem.leg.handoff)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center justify-center gap-2"
                style={{ background: 'rgba(0,0,0,0.28)', borderRadius: 12, padding: '11px 14px', textDecoration: 'none' }}
              >
                <svg width="12" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C8.1 2 5 5.1 5 9c0 4.9 7 13 7 13s7-8.1 7-13c0-3.9-3.1-7-7-7z" fill="var(--ink)" />
                  <circle cx="12" cy="9" r="2.6" fill="rgba(0,0,0,0.3)" />
                </svg>
                <span className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--ink)' }}>
                  Drive to {activeItem.leg.handoff.name} →
                </span>
              </a>
            )}
          </div>
        )}

        {/* The Course */}
        <div className="font-display uppercase" style={{ fontSize: 24, marginBottom: 2 }}>The Course</div>
        <div className="uppercase mb-3" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--faint)' }}>
          {timeline.length} Handoffs
        </div>

        {timeline.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--mut)' }}>No assignments yet.</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {sorted.map(item => {
              const isDone    = item.status === 'completed'
              const isActive  = item.status === 'in-progress'
              const isNext    = onDeckItem?.leg.id === item.leg.id
              const iStatus   = isActive ? (etaStatus === 'overdue' ? 'var(--red)' : 'var(--green)') : 'var(--mut)'
              const navUrl    = buildNavUrl(item.leg.handoff)

              // Delta for done rows
              let deltaLabel: string | null = null
              if (isDone && item.assignment && item.result?.startedAt && item.result?.finishedAt) {
                const actualSec = (new Date(item.result.finishedAt).getTime() - new Date(item.result.startedAt).getTime()) / 1000
                const targetSec = item.assignment.targetPaceSecPerMile * item.leg.distanceMiles
                const deltaSec  = actualSec - targetSec  // positive = slower (behind)
                const deltaMin  = Math.round(Math.abs(deltaSec) / 60)
                if (deltaMin > 0) deltaLabel = deltaSec > 0 ? `+${deltaMin}m` : `-${deltaMin}m`
              }

              return (
                <div
                  key={item.leg.id}
                  className="flex items-center gap-2.5 px-2.5 py-2"
                  style={{
                    borderRadius: 10,
                    opacity: isDone ? 0.4 : 1,
                    background: isActive
                      ? `${heroBg}1e`
                      : 'transparent',
                  }}
                >
                  {/* Leg number */}
                  <span className="font-display uppercase flex-shrink-0 text-center" style={{ fontSize: 20, width: 26, color: isActive ? heroColor : 'var(--faint)', lineHeight: 1 }}>
                    {item.leg.legNumber}
                  </span>

                  {/* Avatar */}
                  <div className="flex items-center justify-center flex-shrink-0" style={{ width: 30, height: 30, borderRadius: '50%', background: isActive ? `${heroBg}40` : 'var(--panel2)', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 10, color: isActive ? heroColor : 'var(--mut)' }}>
                    {item.runner ? initials(item.runner.name) : '?'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 15, fontWeight: 800, color: isActive ? iStatus : isDone ? 'var(--faint)' : 'var(--text)', lineHeight: 1.2 }}>
                      {item.runner?.name ?? '—'}
                    </div>
                    <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, color: 'var(--faint)', marginTop: 1 }}>
                      {item.leg.handoff?.name ?? item.leg.name} · {item.leg.distanceMiles} mi
                    </div>
                  </div>

                  {/* Time + tags */}
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    {isActive && (
                      <span className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', background: heroColor, color: 'var(--ink)', borderRadius: 999, padding: '2px 6px' }}>Live</span>
                    )}
                    {isNext && (
                      <span className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', border: '1px solid var(--line)', color: 'var(--mut)', borderRadius: 999, padding: '2px 6px' }}>On Deck</span>
                    )}
                    <span className="font-mono" style={{ fontSize: 14, color: isActive ? iStatus : isDone ? 'var(--faint)' : 'var(--mut)' }}>
                      {isDone && item.result?.finishedAt
                        ? formatTime(item.result.finishedAt)
                        : isActive && item.eta
                          ? formatTime(String(item.eta.eta))
                          : projectedTimes.has(item.leg.id)
                            ? `~${formatTime(projectedTimes.get(item.leg.id)!.toISOString())}`
                            : '—'}
                    </span>
                    {deltaLabel && (
                      <span className="font-mono" style={{ fontSize: 10, color: deltaLabel.startsWith('+') ? 'var(--red)' : 'var(--green)' }}>
                        {deltaLabel}
                      </span>
                    )}
                  </div>

                  {/* Nav pin */}
                  <NavPin url={navUrl} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify in browser** — open a team detail from the grid, check all sections against the prototype

- [ ] **Step 3: Commit**

```bash
git add apps/tracker/src/components/TeamDetail.tsx
git commit -m "feat(redesign): restyle Tracker TeamDetail to Direction B"
```

---

## Task 6: Restyle LongPressButton

**Files:**
- Modify: `apps/driver/src/components/LongPressButton.tsx`

New props: `bgStyle` (CSS value string), `textStyle` (CSS value, default `'var(--ink)'`), `height` (px number, default 64), `holdLabel` (string shown while holding). Existing call sites in `StartScreen` / `TimingScreen` will be updated in Tasks 7 & 8.

- [ ] **Step 1: Replace `apps/driver/src/components/LongPressButton.tsx`**

```tsx
import { useState, useRef, useCallback, useEffect } from 'react'

interface Props {
  label: string
  holdLabel?: string       // shown while holding, default 'KEEP HOLDING…'
  holdMs: number
  onComplete: () => void
  bgStyle: string          // CSS value, e.g. 'var(--accent)' or 'var(--panel2)'
  textStyle?: string       // CSS value, default 'var(--ink)'
  height?: number          // px, default 64
  disabled?: boolean
  className?: string
}

export function LongPressButton({
  label,
  holdLabel = 'KEEP HOLDING…',
  holdMs,
  onComplete,
  bgStyle,
  textStyle = 'var(--ink)',
  height = 64,
  disabled = false,
  className = '',
}: Props) {
  const [progress, setProgress]   = useState(0)
  const [holding, setHolding]     = useState(false)
  const rafRef       = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const completedRef = useRef(false)

  const cancel = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    startTimeRef.current = null
    completedRef.current = false
    setProgress(0)
    setHolding(false)
  }, [])

  const start = useCallback(() => {
    if (disabled) return
    completedRef.current = false
    startTimeRef.current = Date.now()
    setHolding(true)
    const tick = () => {
      if (startTimeRef.current === null) return
      const p = Math.min((Date.now() - startTimeRef.current) / holdMs, 1)
      setProgress(p)
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        completedRef.current = true
        rafRef.current = null
        startTimeRef.current = null
        onComplete()
      }
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [disabled, holdMs, onComplete])

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return (
    <button
      className={`relative overflow-hidden w-full select-none ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
      style={{ background: bgStyle, height, borderRadius: 18, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      disabled={disabled}
    >
      {/* Rising fill */}
      <span
        className="absolute inset-0 origin-bottom pointer-events-none"
        style={{ transform: `scaleY(${progress})`, background: 'rgba(255,255,255,0.26)', transition: 'none' }}
      />
      {/* Label */}
      <span
        className="relative z-10 font-display uppercase block"
        style={{
          letterSpacing: '0.04em',
          color: textStyle,
          transform: holding ? 'scale(0.72)' : 'scale(1)',
          transition: 'transform 0.1s ease',
        }}
      >
        {holding ? holdLabel : label}
      </span>
    </button>
  )
}
```

- [ ] **Step 2: Commit** (call sites not yet updated — do that in Tasks 7–8)

```bash
git add apps/driver/src/components/LongPressButton.tsx
git commit -m "feat(redesign): update LongPressButton — holding state, bgStyle/textStyle props, height prop"
```

---

## Task 7: Restyle StartScreen + wire nextRunner in App.tsx

**Files:**
- Modify: `apps/driver/src/App.tsx` — add `nextRunner: string | null` to `start` view state
- Modify: `apps/driver/src/components/StartScreen.tsx`

`CurrentStateNotStarted` already has `nextRunner: TeamMember | null` — we just need to thread it through.

- [ ] **Step 1: Update `apps/driver/src/App.tsx`** — add `nextRunner` to the `start` view type and `handleAuth`; update loading/no-race states to use CSS vars

```tsx
import { useState, useEffect } from 'react'
import { publicApi } from './api'
import { AuthScreen } from './components/AuthScreen'
import { StartScreen } from './components/StartScreen'
import { TimingScreen } from './components/TimingScreen'
import { CompleteScreen } from './components/CompleteScreen'
import type { Race, TeamSummary, Leg, Handoff, CurrentState, CurrentStateInProgress } from './api'

type View =
  | { type: 'loading' }
  | { type: 'no-race' }
  | { type: 'auth'; race: Race }
  | { type: 'start'; race: Race; team: TeamSummary; pin: string; nextLeg: Leg; nextRunner: string | null }
  | { type: 'racing'; race: Race; team: TeamSummary; pin: string; resultId: string; leg: Leg; startedAt: string; nextHandoff: Handoff | null; currentRunner: string | null; raceStartedAt: string | null; nextRunner: string | null; nextLegNumber: number | null; nextRunnerEta: string | null }
  | { type: 'complete'; race: Race; team: TeamSummary; pin: string }

export default function App() {
  const [view, setView] = useState<View>({ type: 'loading' })

  useEffect(() => {
    publicApi.get<Race>('/races/active')
      .then(race => setView({ type: 'auth', race }))
      .catch(() => setView({ type: 'no-race' }))
  }, [])

  function handleAuth(team: TeamSummary, pin: string, state: CurrentState) {
    const race = (view as { race: Race }).race
    if (state.status === 'not-started') {
      if (!state.nextLeg) { setView({ type: 'auth', race }); return }
      setView({ type: 'start', race, team, pin, nextLeg: state.nextLeg, nextRunner: state.nextRunner?.name ?? null })
    } else {
      setView({
        type: 'racing', race, team, pin,
        resultId: state.result.id,
        leg: state.currentLeg,
        startedAt: state.result.startedAt,
        nextHandoff: state.nextHandoff,
        currentRunner: state.currentRunner?.name ?? null,
        raceStartedAt: state.raceStartedAt ?? null,
        nextRunner: state.nextRunner?.name ?? null,
        nextLegNumber: state.nextLeg?.legNumber ?? null,
        nextRunnerEta: state.nextRunnerEta ?? null,
      })
    }
  }

  function handleStart(state: CurrentStateInProgress) {
    const v = view as Extract<View, { type: 'start' }>
    setView({
      type: 'racing', race: v.race, team: v.team, pin: v.pin,
      resultId: state.result.id,
      leg: state.currentLeg,
      startedAt: state.result.startedAt,
      nextHandoff: state.nextHandoff,
      currentRunner: state.currentRunner?.name ?? null,
      raceStartedAt: state.raceStartedAt ?? null,
      nextRunner: state.nextRunner?.name ?? null,
      nextLegNumber: state.nextLeg?.legNumber ?? null,
      nextRunnerEta: state.nextRunnerEta ?? null,
    })
  }

  function handleLap(state: CurrentStateInProgress) {
    const v = view as Extract<View, { type: 'racing' }>
    setView({
      type: 'racing', race: v.race, team: v.team, pin: v.pin,
      resultId: state.result.id,
      leg: state.currentLeg,
      startedAt: state.result.startedAt,
      nextHandoff: state.nextHandoff,
      currentRunner: state.currentRunner?.name ?? null,
      raceStartedAt: state.raceStartedAt ?? null,
      nextRunner: state.nextRunner?.name ?? null,
      nextLegNumber: state.nextLeg?.legNumber ?? null,
      nextRunnerEta: state.nextRunnerEta ?? null,
    })
  }

  function handleComplete() {
    const v = view as Extract<View, { type: 'racing' }>
    setView({ type: 'complete', race: v.race, team: v.team, pin: v.pin })
  }

  if (view.type === 'loading') return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <p style={{ color: 'var(--mut)', fontFamily: "'Hanken Grotesk', sans-serif" }}>Loading…</p>
    </div>
  )

  if (view.type === 'no-race') return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <p style={{ color: 'var(--mut)', fontFamily: "'Hanken Grotesk', sans-serif" }}>No active race</p>
    </div>
  )

  if (view.type === 'auth')     return <AuthScreen race={view.race} onAuth={handleAuth} />
  if (view.type === 'start')    return <StartScreen race={view.race} team={view.team} pin={view.pin} nextLeg={view.nextLeg} nextRunner={view.nextRunner} onStart={handleStart} />
  if (view.type === 'racing')   return (
    <TimingScreen
      team={view.team} pin={view.pin} resultId={view.resultId}
      leg={view.leg} startedAt={view.startedAt} nextHandoff={view.nextHandoff}
      currentRunner={view.currentRunner} raceStartedAt={view.raceStartedAt}
      onLap={handleLap} onComplete={handleComplete}
      nextRunner={view.nextRunner} nextLegNumber={view.nextLegNumber} nextRunnerEta={view.nextRunnerEta}
    />
  )
  return <CompleteScreen race={view.race} team={view.team} pin={view.pin} />
}
```

- [ ] **Step 2: Replace `apps/driver/src/components/StartScreen.tsx`**

```tsx
import { useState } from 'react'
import { createDriverApi, buildNavUrl } from '../api'
import { LongPressButton } from './LongPressButton'
import type { Race, TeamSummary, Leg, CurrentStateInProgress } from '../api'

interface Props {
  race: Race
  team: TeamSummary
  pin: string
  nextLeg: Leg
  nextRunner: string | null
  onStart: (state: CurrentStateInProgress) => void
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

export function StartScreen({ race, team, pin, nextLeg, nextRunner, onStart }: Props) {
  const [error, setError]     = useState('')
  const [started, setStarted] = useState(false)

  async function handleStart() {
    if (started) return
    setStarted(true)
    setError('')
    const startedAt = new Date().toISOString()
    try {
      const api = createDriverApi(pin)
      await api.post(`/teams/${team.id}/results`, { legId: nextLeg.id, startedAt })
      const state = await api.get<CurrentStateInProgress>(`/teams/${team.id}/current`)
      onStart(state)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start — try again')
      setStarted(false)
    }
  }

  const navUrl = nextLeg.handoff ? buildNavUrl(nextLeg.handoff) : ''

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-[18px] py-3" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="flex items-center gap-2">
          <div style={{ width: 18, height: 18, background: 'var(--accent)', borderRadius: 4, flexShrink: 0 }} />
          <span className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: '0.04em' }}>
            {team.name}
          </span>
        </div>
        <span className="font-mono" style={{ fontSize: 12, color: 'var(--mut)' }}>Race Not Started</span>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col px-[18px] pt-6 pb-8 gap-5">
        <div>
          <p className="uppercase mb-2" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--accent)' }}>
            KT82 · Katy Trail Relay
          </p>
          <h1 className="font-display uppercase leading-none" style={{ fontSize: 60 }}>
            Ready<br />To Roll
          </h1>
          <p className="mt-3" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13, color: 'var(--mut)' }}>
            {race.name}
          </p>
        </div>

        {/* First-leg card */}
        <div style={{ background: 'var(--panel)', borderRadius: 18, border: '1px solid var(--line)', padding: '14px 16px' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9.5, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--faint)' }}>
              First Leg · Up Now
            </span>
            <span className="font-display" style={{ fontSize: 24, color: 'var(--mut)' }}>
              {String(nextLeg.legNumber).padStart(2, '0')}
            </span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            {nextRunner && (
              <div className="flex items-center justify-center flex-shrink-0" style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--panel2)', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 16, color: 'var(--mut)' }}>
                {initials(nextRunner)}
              </div>
            )}
            <div className="min-w-0">
              {nextRunner && (
                <div className="font-display uppercase leading-none" style={{ fontSize: 28 }}>
                  {nextRunner}
                </div>
              )}
              <div className="mt-1" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, color: 'var(--faint)' }}>
                → {nextLeg.handoff?.name ?? nextLeg.name} · {nextLeg.distanceMiles} mi
              </div>
            </div>
          </div>
          {navUrl && (
            <a
              href={navUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 min-h-[44px] uppercase"
              style={{ borderTop: '1px solid var(--line2)', paddingTop: 10, fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--accent)', textDecoration: 'none' }}
            >
              <svg width="12" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.1 2 5 5.1 5 9c0 4.9 7 13 7 13s7-8.1 7-13c0-3.9-3.1-7-7-7z" fill="var(--accent)" />
                <circle cx="12" cy="9" r="2.6" fill="var(--panel)" />
              </svg>
              Navigate to {nextLeg.handoff?.name ?? nextLeg.name} ↗
            </a>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-2">
          {error && <p style={{ fontSize: 13, color: 'var(--red)', textAlign: 'center' }}>{error}</p>}
          <LongPressButton
            label="START"
            holdMs={500}
            onComplete={handleStart}
            bgStyle="var(--accent)"
            textStyle="var(--ink)"
            height={92}
            disabled={started}
            className="font-display text-[40px]"
          />
          <p className="text-center uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--faint)' }}>
            Hold to Start the Race Clock
          </p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/driver/src/App.tsx apps/driver/src/components/StartScreen.tsx
git commit -m "feat(redesign): restyle Driver StartScreen to Direction B; thread nextRunner prop"
```

---

## Task 8: Restyle TimingScreen + delete RaceBanner

**Files:**
- Modify: `apps/driver/src/components/TimingScreen.tsx`
- Delete: `apps/driver/src/components/RaceBanner.tsx`

Top bar is now inline — RaceBanner is no longer needed. All timing logic (`elapsed` state, ETA poll, `handleLap`, `handleStop`) stays identical.

- [ ] **Step 1: Replace `apps/driver/src/components/TimingScreen.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { createDriverApi, buildNavUrl, formatElapsed, formatRaceTime, formatTime } from '../api'
import { LongPressButton } from './LongPressButton'
import type { TeamSummary, Leg, Handoff, CurrentStateInProgress } from '../api'

interface Props {
  team: TeamSummary
  pin: string
  resultId: string
  leg: Leg
  startedAt: string
  nextHandoff: Handoff | null
  currentRunner: string | null
  raceStartedAt: string | null
  onLap: (state: CurrentStateInProgress) => void
  onComplete: () => void
  nextRunner: string | null
  nextLegNumber: number | null
  nextRunnerEta: string | null
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

export function TimingScreen({ team, pin, resultId, leg, startedAt, nextHandoff, currentRunner, raceStartedAt, onLap, onComplete, nextRunner, nextLegNumber, nextRunnerEta }: Props) {
  const [elapsed, setElapsed] = useState(0)
  const [raceElapsed, setRaceElapsed] = useState(0)
  const [eta, setEta]         = useState<{ eta: string; secondsRemaining: number; status: 'on-pace' | 'ahead' | 'overdue' } | null>(null)
  const [error, setError]     = useState('')
  const [acting, setActing]   = useState(false)

  // Leg elapsed clock
  useEffect(() => {
    const start = new Date(startedAt).getTime()
    setElapsed(Date.now() - start)
    const id = setInterval(() => setElapsed(Date.now() - start), 1_000)
    return () => clearInterval(id)
  }, [startedAt])

  // Race elapsed clock
  useEffect(() => {
    if (!raceStartedAt) return
    const start = new Date(raceStartedAt).getTime()
    setRaceElapsed(Date.now() - start)
    const id = setInterval(() => setRaceElapsed(Date.now() - start), 1_000)
    return () => clearInterval(id)
  }, [raceStartedAt])

  // ETA poll every 30s
  useEffect(() => {
    setEta(null)
    const api = createDriverApi(pin)
    async function poll() {
      try {
        const state = await api.get<CurrentStateInProgress>(`/teams/${team.id}/current`)
        if (state.status === 'in-progress') setEta(state.eta ?? null)
      } catch { /* keep stale */ }
    }
    poll()
    const id = setInterval(poll, 30_000)
    return () => clearInterval(id)
  }, [pin, team.id, resultId])

  async function handleLap() {
    if (acting) return
    setActing(true); setError('')
    const finishedAt = new Date().toISOString()
    try {
      const api = createDriverApi(pin)
      const lapResult = await api.patch<{ current: unknown; next: { id: string; startedAt: string } | null }>(
        `/results/${resultId}`, { finishedAt, action: 'lap' }
      )
      if (lapResult.next === null) {
        onComplete()
      } else {
        const state = await api.get<CurrentStateInProgress>(`/teams/${team.id}/current`)
        setActing(false)
        onLap(state)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed — try again')
      setActing(false)
    }
  }

  async function handleStop() {
    if (acting) return
    setActing(true); setError('')
    const finishedAt = new Date().toISOString()
    try {
      const api = createDriverApi(pin)
      await api.patch(`/results/${resultId}`, { finishedAt, action: 'stop' })
      onComplete()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed — try again')
      setActing(false)
    }
  }

  const navUrl    = nextHandoff ? buildNavUrl(nextHandoff) : ''
  const etaStatus = eta?.status ?? 'on-pace'
  const paceColor = etaStatus === 'overdue' ? 'var(--red)' : 'var(--green)'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-[18px] py-3" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="flex items-center gap-2">
          <div style={{ width: 18, height: 18, background: 'var(--accent)', borderRadius: 4, flexShrink: 0 }} />
          <span className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: '0.04em' }}>
            {team.name}
          </span>
        </div>
        <span className="font-mono" style={{ fontSize: 12, color: 'var(--mut)' }}>
          Race {formatRaceTime(raceElapsed)}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col px-[18px] pt-5 pb-6 gap-4">

        {/* Runner info */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--mut)' }}>
              Now Running · Leg {leg.legNumber}
            </span>
            {eta && (
              <span className="uppercase flex-shrink-0" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em', padding: '3px 8px', borderRadius: 999, background: paceColor, color: 'var(--ink)' }}>
                {etaStatus === 'overdue' ? 'Behind Pace' : etaStatus === 'ahead' ? 'Ahead' : 'On Pace'}
              </span>
            )}
          </div>
          {currentRunner && (
            <div className="font-display uppercase leading-none" style={{ fontSize: 50 }}>
              {currentRunner}
            </div>
          )}
          <div className="uppercase mt-1" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: '0.06em', color: 'var(--faint)' }}>
            → {nextHandoff?.name ?? leg.name} · {leg.distanceMiles} mi
          </div>
        </div>

        {/* Twin readout panels */}
        <div className="flex gap-2.5">
          <div className="flex-1 text-center" style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, padding: '12px 10px' }}>
            <div className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--faint)', marginBottom: 4 }}>Leg Time</div>
            <div className="font-mono" style={{ fontSize: 38, fontWeight: 700, lineHeight: 1 }}>{formatElapsed(elapsed)}</div>
            <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, color: 'var(--faint)', marginTop: 4 }}>{leg.distanceMiles} mi total</div>
          </div>
          <div className="flex-1 text-center" style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, padding: '12px 10px' }}>
            <div className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--faint)', marginBottom: 4 }}>
              ETA · {nextHandoff?.name ?? leg.name}
            </div>
            {eta
              ? <div className="font-mono" style={{ fontSize: 38, fontWeight: 700, lineHeight: 1, color: paceColor }}>{formatTime(eta.eta)}</div>
              : <div className="font-mono" style={{ fontSize: 38, color: 'var(--faint)', lineHeight: 1 }}>—</div>
            }
            <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, color: 'var(--faint)', marginTop: 4 }}>
              {eta ? (etaStatus === 'overdue' ? 'behind pace' : etaStatus === 'ahead' ? 'ahead of pace' : 'on pace') : 'calculating…'}
            </div>
          </div>
        </div>

        {/* On Deck strip */}
        {nextRunner && (
          <div className="flex items-center gap-2.5" style={{ background: 'var(--panel2)', borderRadius: 14, padding: '10px 14px' }}>
            <div className="flex items-center justify-center flex-shrink-0" style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--panel)', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 12, color: 'var(--mut)' }}>
              {initials(nextRunner)}
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, fontWeight: 800 }}>{nextRunner}</div>
              <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10.5, color: 'var(--faint)', marginTop: 1 }}>
                Leg {nextLegNumber}{nextHandoff ? ` · → ${nextHandoff.name}` : ''}
                {nextRunnerEta ? ` · Est. ${formatTime(nextRunnerEta)}` : ''}
              </div>
            </div>
            <span className="uppercase flex-shrink-0" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', border: '1px solid var(--line)', borderRadius: 999, padding: '2px 8px', color: 'var(--mut)' }}>
              On Deck
            </span>
          </div>
        )}

        {/* Navigate button */}
        {navUrl && (
          <a
            href={navUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 uppercase min-h-[44px]"
            style={{ border: '1px solid var(--accent)', borderRadius: 14, fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--accent)', textDecoration: 'none' }}
          >
            <svg width="11" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.1 2 5 5.1 5 9c0 4.9 7 13 7 13s7-8.1 7-13c0-3.9-3.1-7-7-7z" fill="var(--accent)" />
              <circle cx="12" cy="9" r="2.6" fill="var(--bg)" />
            </svg>
            Navigate to {nextHandoff!.name} ↗
          </a>
        )}

        {error && <p style={{ fontSize: 13, color: 'var(--red)', textAlign: 'center' }}>{error}</p>}

        {/* LAP + END */}
        <div className="mt-auto flex flex-col gap-2">
          <LongPressButton
            label="LAP"
            holdMs={1500}
            onComplete={handleLap}
            bgStyle="var(--accent)"
            textStyle="var(--ink)"
            height={84}
            disabled={acting}
            className="font-display text-[34px]"
          />
          <p className="text-center uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--faint)' }}>
            Hold to Record Handoff at {nextHandoff?.name ?? leg.name}
          </p>
          <LongPressButton
            label="••• End Race Early"
            holdMs={1500}
            onComplete={handleStop}
            bgStyle="var(--panel2)"
            textStyle="var(--faint)"
            height={44}
            disabled={acting}
            className="text-[11px] font-hanken font-extrabold tracking-widest uppercase"
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Delete `RaceBanner.tsx`** — it is no longer imported anywhere

```bash
git rm apps/driver/src/components/RaceBanner.tsx
```

- [ ] **Step 3: Commit**

```bash
git add apps/driver/src/components/TimingScreen.tsx
git commit -m "feat(redesign): restyle Driver TimingScreen to Direction B; remove RaceBanner"
```

---

## Task 9: Restyle CompleteScreen

**Files:**
- Modify: `apps/driver/src/components/CompleteScreen.tsx`

All data-fetching logic (timeline API call, `totalMs` calc, pace delta calc) stays identical. Visual-only restyle.

- [ ] **Step 1: Replace `apps/driver/src/components/CompleteScreen.tsx`**

```tsx
import { useState, useEffect } from 'react'
import { createDriverApi, formatElapsed, formatDuration, formatPace } from '../api'
import type { Race, TeamSummary, LegTimelineItem } from '../api'

interface Props {
  race: Race
  team: TeamSummary
  pin: string
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

export function CompleteScreen({ race: _race, team, pin }: Props) {
  const [items, setItems] = useState<LegTimelineItem[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    createDriverApi(pin)
      .get<LegTimelineItem[]>(`/teams/${team.id}/timeline`)
      .then(setItems)
      .catch(() => setError('Could not load results'))
  }, [pin, team.id])

  const completed = items.filter(i => i.status === 'completed' && i.result?.startedAt && i.result?.finishedAt)

  const totalMs = completed.length === 0 ? null : (() => {
    const starts = completed.map(i => new Date(i.result!.startedAt).getTime())
    const ends   = completed.map(i => new Date(i.result!.finishedAt!).getTime())
    return Math.max(...ends) - Math.min(...starts)
  })()

  const finishedAt = completed.length > 0
    ? new Date(Math.max(...completed.map(i => new Date(i.result!.finishedAt!).getTime())))
    : null

  const sorted = [...items]
    .filter(i => i.assignment !== null)
    .sort((a, b) => a.leg.legNumber - b.leg.legNumber)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-[18px] py-3" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="flex items-center gap-2">
          <div style={{ width: 18, height: 18, background: 'var(--accent)', borderRadius: 4, flexShrink: 0 }} />
          <span className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: '0.04em' }}>
            {team.name}
          </span>
        </div>
        <span className="font-mono" style={{ fontSize: 12, color: 'var(--green)' }}>Finished ✓</span>
      </div>

      {/* Body */}
      <div className="px-[18px] pt-5 pb-10">

        {/* Race complete header */}
        <div className="mb-6">
          <p className="uppercase mb-1" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--green)' }}>
            Race Complete
          </p>
          {totalMs !== null ? (
            <div className="font-mono" style={{ fontSize: 56, fontWeight: 700, lineHeight: 1 }}>
              {formatElapsed(totalMs)}
            </div>
          ) : (
            <div className="font-mono" style={{ fontSize: 56, color: 'var(--faint)', lineHeight: 1 }}>—</div>
          )}
          <p className="mt-2" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13, color: 'var(--mut)' }}>
            {completed.length} of {items.filter(i => i.assignment).length} legs
            {finishedAt ? ` · finished ${finishedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ''}
          </p>
        </div>

        {error && <p style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{error}</p>}

        {/* Splits */}
        <div className="font-display uppercase mb-3" style={{ fontSize: 22 }}>Splits</div>

        <div className="flex flex-col">
          {sorted.map(item => {
            const hasResult   = item.result?.startedAt && item.result?.finishedAt
            const elapsedMs   = hasResult
              ? new Date(item.result!.finishedAt!).getTime() - new Date(item.result!.startedAt).getTime()
              : null
            const actualPace  = elapsedMs && item.leg.distanceMiles > 0
              ? (elapsedMs / 1000) / item.leg.distanceMiles
              : null
            const targetPace  = item.assignment?.targetPaceSecPerMile ?? null
            const deltaSec    = actualPace && targetPace ? targetPace - actualPace : null  // positive = ahead

            return (
              <div
                key={item.leg.id}
                className="flex items-center gap-2.5 py-2"
                style={{ borderBottom: '1px solid var(--line2)' }}
              >
                {/* Leg number */}
                <span className="font-display uppercase flex-shrink-0" style={{ fontSize: 20, color: 'var(--faint)', width: 24, textAlign: 'center', lineHeight: 1 }}>
                  {item.leg.legNumber}
                </span>

                {/* Avatar */}
                <div className="flex items-center justify-center flex-shrink-0" style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--panel2)', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 10, color: 'var(--mut)' }}>
                  {item.runner ? initials(item.runner.name) : '?'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, fontWeight: 800, lineHeight: 1.2 }}>
                    {item.runner?.name ?? '—'}
                  </div>
                  <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, color: 'var(--faint)', marginTop: 1 }}>
                    {item.leg.handoff?.name ?? item.leg.name} · {item.leg.distanceMiles} mi
                  </div>
                </div>

                {/* Time + pace delta */}
                <div className="text-right flex-shrink-0">
                  <div className="font-mono" style={{ fontSize: 15, color: 'var(--mut)' }}>
                    {hasResult ? formatDuration(item.result!.startedAt, item.result!.finishedAt!) : '—'}
                  </div>
                  {actualPace && (
                    <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, color: 'var(--faint)', marginTop: 1 }}>
                      {formatPace(actualPace)}/mi
                      {deltaSec !== null && Math.abs(deltaSec) >= 5 && (
                        <span style={{ marginLeft: 4, color: deltaSec >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {deltaSec >= 0 ? '▲' : '▼'} {formatPace(Math.abs(deltaSec))}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/driver/src/components/CompleteScreen.tsx
git commit -m "feat(redesign): restyle Driver CompleteScreen to Direction B"
```

---

## Task 10: Visual verification + merge readiness

- [ ] **Step 1: Run the full dev stack**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" ./scripts/dev.sh
```

- [ ] **Step 2: Open the interactive prototype for comparison**

```
open docs/design_handoff_kt82_tracker_driver/prototype/KT82\ Prototype.html
```

- [ ] **Step 3: Verify Tracker** — open http://localhost:5173

Check each item:
- [ ] KT82 in Anton 50, orange subline with race name + date
- [ ] Live dot animating, `LIVE` label, seconds-since-update
- [ ] Team cards: 6px stripe, Anton name, status pill, leg/runner/town row, arrival clock, progress bar
- [ ] Leading team has accent border + rank `1`
- [ ] Not-started teams dimmed, no middle/bottom rows
- [ ] Cards sorted by legs completed descending
- [ ] Click a card → team detail
- [ ] Team detail: top bar, team name + bib tile, race time ticking, miles progress bar
- [ ] Hero block: runner name big, EST. ARRIVAL clock, LEG TIME ticking, on-deck strip, drive-to link
- [ ] Course list: all rows with leg #, avatar, runner+town, projected/actual clock, nav pin on each leg
- [ ] LIVE / ON DECK tags on correct rows
- [ ] Nav pin opens Google Maps in new tab
- [ ] Share button works
- [ ] Back button returns to grid
- [ ] Light theme: set browser/OS to light mode, reload — warm paper background, adjusted colors

- [ ] **Step 4: Verify Driver** — open http://localhost:5176

Check each screen (use the prototype's Driver tab as reference):
- [ ] Start: orange square + team name top bar, "READY TO ROLL" Anton 60, first-leg card with runner avatar + name + nav link, hold-to-START button (accent, 92px)
- [ ] Start button: hold fills from bottom, label shrinks + shows "KEEP HOLDING…"
- [ ] Timing: race clock ticking in top bar, runner name Anton 50, twin panels (leg time + ETA), on-deck strip, outlined nav button, LAP button (accent, 84px), End Race Early button (dark, small)
- [ ] LAP button: hold fills, label swaps
- [ ] Complete: "Finished ✓" green in top bar, total time JetBrains Mono 56, splits list with pace deltas

- [ ] **Step 5: Check TypeScript compiles without errors**

```bash
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker exec tsc --noEmit
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter driver exec tsc --noEmit
```

Expected: no output (no errors).

- [ ] **Step 6: Commit any fixes found during verification**

```bash
git add -p  # stage specific fixes
git commit -m "fix(redesign): visual verification fixes"
```

- [ ] **Step 7: Merge to main**

```bash
git checkout main
git merge redesign/tracker-driver-direction-b --no-ff -m "feat: implement Direction B redesign for Tracker and Driver apps"
```
