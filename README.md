# KT82 Race Suite

A suite of four mobile-first web applications supporting participants, spectators, team captains, drivers, and timekeepers for the KT82 relay race in rural Missouri.

## Background

The KT82 is an 82-mile multi-leg road relay race held in rural Missouri. Teams of runners each cover one or more legs of the course, with a support vehicle transporting the team between handoff points. Because the race runs through areas with poor GPS and cellular coverage, **all arrival time predictions are pace-based, not GPS-based**. The apps must function well on mobile devices and tolerate spotty connectivity.

### Race Format

- **Total distance:** ~82 miles across many legs (leg count and lengths vary by year)
- **Typical team:** 6 runners, each running approximately 3 legs = ~18 legs per team
- **Leg lengths:** Vary; each leg has a defined distance in miles
- **Support vehicle:** Drives team members between handoff points while one runner is on course
- **Handoff points:** Fixed locations along the route with a name and optionally an address or GPS coordinates (lat/lng) for navigation
- The race format is flexible — leg count and runner assignments are configured per race by the Manager app

---

## App Overview

### App 1 — Race Tracker (Participants & Spectators)
**Who uses it:** Runners, friends, family, anyone following the race.

**Purpose:** Show a team's current position on the course and predict when runners will arrive at each upcoming handoff. Spectators use this to know where and when to meet their team.

**Key features:**
- View all teams and their current leg/runner
- Estimated arrival time at the next handoff based on pace + elapsed time
- Timeline view of completed and upcoming legs for a team
- Shareable team link so spectators can bookmark a specific team
- Auto-refresh (polling, not WebSocket — keep it simple)
- No login required; read-only

---

### App 2 — Team Captain Dashboard
**Who uses it:** Team captain before and during the race.

**Purpose:** Configure the team roster, assign each runner to one or more legs, and set target pace per runner per leg. This is the primary input source for all ETA predictions in the Tracker.

**Key features:**
- PIN-based login (PIN assigned by Race Manager)
- Enter team members by name
- Assign each runner to specific leg(s) — drag-and-drop or simple select
- Set target pace (min/mile) per runner per leg
- See a projected race timeline based on assigned paces
- Lock/confirm assignments before race start

---

### App 3 — Race Manager Console
**Who uses it:** Race director/organizer.

**Purpose:** Create and configure the race — define legs, handoff locations, and team captain access.

**Key features:**
- Create a race with a name and date
- Add legs in order: leg number, name, distance (miles)
- Add/edit each handoff location: name, address OR lat/lng coordinates
- Create teams and assign a PIN for each team captain
- View all teams and their current setup status
- Ability to re-open or reset a team's leg assignments if needed
- Simple admin password (single password, not multi-user for now)

---

### App 4 — Driver & Timekeeper
**Who uses it:** The team's support vehicle driver (and timekeeper, often the same person).

**Purpose:** A simple stopwatch-style interface for recording leg times during the race and navigating to the next handoff location.

**Key features:**
- PIN-based login (same PIN as Team Captain)
- Shows current runner and leg
- START / LAP / STOP stopwatch controls
  - LAP: records the leg time, advances to next runner/leg
- Displays ETA of the current runner based on pace and elapsed time
- One-tap navigation to the next handoff (opens Google Maps / Apple Maps with the destination pre-filled from handoff lat/lng or address)
- Clear, glanceable display suitable for use in a moving vehicle

---

## Technical Architecture

### Monorepo Structure

```
kt82/
├── apps/
│   ├── tracker/          # App 1 — React, read-only, public
│   ├── captain/          # App 2 — React, PIN auth
│   ├── manager/          # App 3 — React, admin auth
│   └── driver/           # App 4 — React, PIN auth
├── packages/
│   └── shared/           # Shared types, API client, utilities
└── server/               # Node.js / Express API + PostgreSQL
```

### Tech Stack

| Layer | Choice |
|-------|--------|
| Frontend | React + TypeScript |
| Styling | Tailwind CSS |
| Backend | Node.js + Express |
| Database | PostgreSQL + Prisma ORM |
| Auth | PIN-based (no JWT complexity needed for MVP) |
| Maps | Google Maps URL deep link or Apple Maps URL (no Maps SDK needed) |
| Hosting | Deployable to Railway, Render, or Fly.io |

### Shared Package

The `packages/shared` package exports:
- TypeScript types for all domain models
- API client functions (fetch wrappers)
- ETA calculation utilities

---

## Domain Model

### Core Entities

```
Race
  id, name, date, adminPassword (hashed)

Leg
  id, raceId, legNumber, name, distanceMiles

Handoff
  id, legId (the handoff at the END of this leg), name, address?, lat?, lng?

Team
  id, raceId, name, captainPin (hashed)

TeamMember
  id, teamId, name

LegAssignment
  id, teamId, legId, teamMemberId, targetPaceSecPerMile

LegResult
  id, teamId, legId, startedAt (timestamp), finishedAt (timestamp)?
  -- startedAt is set when timekeeper hits LAP on the previous leg (or START for leg 1)
```

### ETA Calculation Logic

```
elapsedSeconds = now - legResult.startedAt
projectedTotalSeconds = assignment.targetPaceSecPerMile * leg.distanceMiles
remainingSeconds = projectedTotalSeconds - elapsedSeconds
eta = now + remainingSeconds
```

If the runner is ahead of or behind pace, remaining seconds can be negative or very large — display gracefully (e.g., "overdue" or "ahead of schedule").

---

## Design Principles

### Mobile-First
- All four apps must be fully usable on a phone with one hand
- Touch targets minimum 44px
- High contrast — legible in direct sunlight
- Minimal data entry on mobile; prefer taps over typing

### No GPS Dependency
- All ETAs are computed from pace + elapsed time only
- No location permissions requested from users
- Navigation is handled by deep-linking to external map apps (Google Maps / Apple Maps), not in-app

### Connectivity Tolerance
- Polling interval for Tracker: every 30 seconds is fine
- Driver/Timekeeper: timestamps should be captured client-side and synced to server; do not depend on a round-trip to record a LAP
- Graceful offline state messaging ("Last updated X seconds ago")

### Auth Simplicity (MVP)
- Race Manager: single admin password stored server-side (bcrypt hashed)
- Team Captain & Driver: 4–6 digit PIN per team (bcrypt hashed)
- No JWT, no sessions — PIN submitted with each request for MVP; upgrade later if needed
- Tracker: no auth, fully public

---

## Key UX Notes

### App 1 (Tracker)
- Default view: list of teams with current leg and runner name
- Tap a team → detailed view showing full leg timeline, ETAs, and completed times
- "Share this team" button copies a direct URL
- Show a simple leg map or diagram if possible (numbered handoff points)

### App 2 (Captain)
- Wizard-style setup flow: 1) Add members → 2) Assign legs → 3) Set paces → 4) Review & confirm
- Show a projected finish time on the review screen
- After race starts, switch to a read-only "race in progress" view showing live ETAs

### App 3 (Manager)
- Table-based admin interface; desktop-friendly but not mobile-hostile
- Leg/handoff editor should support bulk entry
- Export team PINs as printable list

### App 4 (Driver/Timekeeper)
- Single-screen focus: big current runner name, big timer, big LAP button
- Secondary info: ETA line ("On pace — arrives ~2:34 PM"), next handoff name
- Navigation button: prominent, labeled "Navigate to [Handoff Name]"
- Confirm dialog before LAP to prevent accidental taps

---

## Build Order (Recommended)

1. **Server + DB schema** — Get the data model and API running first; all apps depend on it
2. **App 3 (Manager)** — Seed the race data needed by everything else
3. **App 2 (Captain)** — Populate leg assignments and paces; enables ETA calculations
4. **App 4 (Driver)** — Core race-day tool; validates ETA logic in real conditions
5. **App 1 (Tracker)** — Consumes all the above; can be built last since it's read-only

---

## Out of Scope (MVP)

- Real-time GPS tracking
- Push notifications
- Multi-race management (one race at a time is fine)
- User accounts / OAuth
- In-app maps rendering (deep links to Google/Apple Maps only)
- Historical race archives
