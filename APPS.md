# KT82 App Inventory

Four mobile-first web apps. Use the names below to scope change requests.

---

## Driver (`apps/driver/` · port 5176)

Used by the van driver during the race to start legs, time runners, and navigate.

| Screen | File | What it shows |
|--------|------|---------------|
| **AuthScreen** | `components/AuthScreen.tsx` | Team picker + PIN entry; the login gate before any race action |
| **StartScreen** | `components/StartScreen.tsx` | Next leg info (runner, leg name, distance, handoff nav link); long-press START button to begin the leg |
| **TimingScreen** | `components/TimingScreen.tsx` | Active leg: elapsed time, ETA pill, runner + next-runner chips, LAP and FINISH long-press buttons, links to Course / Leg Progress / Leg Map |
| **LegProgressScreen** | `components/LegProgressScreen.tsx` | Pace-scenario table (5 rows: fast → slow) showing projected finish time and delta vs target for the current leg |
| **LegMapScreen** | `components/LegMapScreen.tsx` | Full-screen Leaflet map of current leg route with moving runner icon; range band showing pace scenarios |
| **CourseScreen** | `components/CourseScreen.tsx` | Scrollable list of all course legs with distance, difficulty, start/finish nav links, and race elapsed time |
| **CompleteScreen** | `components/CompleteScreen.tsx` | Race finished: final timeline of all legs with split times, paces, and total elapsed |

### Driver shared components

| Component | File | Purpose |
|-----------|------|---------|
| **LongPressButton** | `components/LongPressButton.tsx` | Hold-to-confirm button with fill animation; used for START, LAP, and FINISH actions |

---

## Tracker (`apps/tracker/` · port 5173)

Public, no-auth view of all teams' live race progress.

| Screen | File | What it shows |
|--------|------|---------------|
| **TeamGrid** | `components/TeamGrid.tsx` | Top-level list of all teams; each card shows current runner, current leg, ETA, and pace status (ON PACE / AHEAD / BEHIND) |
| **TeamDetail** | `components/TeamDetail.tsx` | Wrapper that owns the selected team's timeline and sub-screen navigation; renders one of the sub-screens below |
| ↳ **PreRaceScreen** | `components/PreRaceScreen.tsx` | Shown before race start: countdown clock, assigned start time, full leg schedule with projected splits |
| ↳ **LegProgressScreen** | `components/LegProgressScreen.tsx` | **No longer accessible from Tracker UI** (file retained; accessible in Driver via TimingScreen) |
| ↳ **LegMapScreen** | `components/LegMapScreen.tsx` | Same Leaflet map view as Driver's |
| ↳ **CourseScreen** | `components/CourseScreen.tsx` | Same course overview as Driver's |

---

## Captain (`apps/captain/` · port 5174)

Team self-service: roster management and leg assignments. Auth via team PIN.

| Screen / Tab | File | What it shows |
|--------------|------|---------------|
| **LoginScreen** | `components/LoginScreen.tsx` | PIN entry; stores credentials in localStorage |
| **RosterTab** | `tabs/RosterTab.tsx` | List of team members; add, rename, or delete runners |
| **AssignmentsTab** | `tabs/AssignmentsTab.tsx` | Grid of all legs; assign a runner and target pace (mm:ss/mi) to each leg |

### Captain shared components

| Component | File | Purpose |
|-----------|------|---------|
| **TabNav** | `components/TabNav.tsx` | Top nav bar with Roster / Assignments tabs and Sign Out |
| **Modal** | `components/Modal.tsx` | Bottom sheet on mobile, centered dialog on desktop; used for add/edit forms |
| **ConfirmDialog** | `components/ConfirmDialog.tsx` | Confirm / Cancel dialog for destructive actions; wraps Modal |

---

## Manager (`apps/manager/` · port 5175)

Admin tool for race setup and teardown. Auth via admin password.

| Screen / Tab | File | What it shows |
|--------------|------|---------------|
| **LoginScreen** | `components/LoginScreen.tsx` | Admin password entry |
| **RaceTab** | `tabs/RaceTab.tsx` | Create or view the active race (name + date) |
| **LegsTab** | `tabs/LegsTab.tsx` | CRUD for legs (number, name, distance) and their handoff points (name, address, lat/lng) |
| **TeamsTab** | `tabs/TeamsTab.tsx` | Create teams, set/view PINs, rename, reset assignments, export PIN sheet |
| **DangerTab** | `tabs/DangerTab.tsx` | Destructive actions: clear all results, delete individual teams, wipe entire race |

### Manager shared components

| Component | File | Purpose |
|-----------|------|---------|
| **TabNav** | `components/TabNav.tsx` | Top nav bar with Race / Legs / Teams / Danger tabs and Sign Out |
| **Modal** | `components/Modal.tsx` | Same bottom-sheet / centered-dialog pattern as Captain |
| **ConfirmDialog** | `components/ConfirmDialog.tsx` | Same confirm dialog as Captain |

---

## How to scope a change

- **"on the Timing screen"** → `apps/driver/src/components/TimingScreen.tsx`
- **"the pace table"** → `LegProgressScreen` in both `apps/driver` and `apps/tracker` (identical component, separate files)
- **"the map"** → `LegMapScreen` in both `apps/driver` and `apps/tracker`
- **"the course overview"** → `CourseScreen` in both `apps/driver` and `apps/tracker`
- **"the pre-race countdown"** → `apps/tracker/src/components/PreRaceScreen.tsx` (Tracker only)
- **"the team list"** → `apps/tracker/src/components/TeamGrid.tsx`
- **"roster management"** → `apps/captain/src/tabs/RosterTab.tsx`
- **"leg assignments"** → `apps/captain/src/tabs/AssignmentsTab.tsx`
- **"adding/editing legs"** → `apps/manager/src/tabs/LegsTab.tsx`
- **"team PINs"** → `apps/manager/src/tabs/TeamsTab.tsx`
