# Superpowers Index

## Specs & Status

| Spec | Date | Status | What it covers |
|---|---|---|---|
| [Server & DB scaffold](specs/2026-05-26-server-db-scaffold-design.md) | 2026-05-26 | ✅ Implemented | Express API, Prisma schema, monorepo setup, 4 empty app shells |
| [Manager app](specs/2026-05-28-manager-app-design.md) | 2026-05-28 | ✅ Implemented | Race/leg/team/assignment management UI |
| [Tracker app](specs/2026-05-28-tracker-app-design.md) | 2026-05-28 | ✅ Implemented | Public race board, team grid, team detail timeline |
| [Captain app](specs/2026-05-28-captain-app-design.md) | 2026-05-28 | ✅ Implemented | Team assignment screen for captains |
| [Driver app](specs/2026-05-28-driver-app-design.md) | 2026-05-28 | ✅ Implemented | Race timing screen, LAP/STOP, ETA display |
| [Danger zone](specs/2026-05-29-danger-zone-design.md) | 2026-05-29 | ✅ Implemented | Manager admin tab for destructive ops (wipe race, delete legs) |
| [Family spectator ETAs](specs/2026-05-29-family-spectator-etas-design.md) | 2026-05-29 | ✅ Implemented | Projected ETAs + nav links for future legs in tracker timeline |
| [Elapsed & race time](specs/2026-05-29-elapsed-race-time-design.md) | 2026-05-29 | ✅ Implemented | Sticky race-time banner + leg elapsed in driver and tracker |
| [Favicon](specs/2026-06-01-favicon-design.md) | 2026-06-01 | ✅ Implemented | Green KT82 SVG favicon across all 4 apps; fixed Captain/Manager page titles |
| [Seed assignments](specs/2026-06-01-seed-assignments-design.md) | 2026-06-01 | ✅ Implemented | Bulk CSV seeder for leg assignments with runner-by-name resolution |
| [Google Maps](specs/2026-06-01-google-maps-design.md) | 2026-06-01 | ✅ Implemented | Switch all nav links from Apple Maps to Google Maps |
| [Next runner up](specs/2026-06-01-next-runner-design.md) | 2026-06-01 | ✅ Implemented | On Deck chip in driver timing screen with next runner name + projected finish |
| [Race complete summary](specs/2026-06-01-race-complete-summary-design.md) | 2026-06-01 | ✅ Implemented | Leg splits with actual pace, target pace, and ahead/behind delta |
| [Direction B redesign](specs/2026-06-01-tracker-driver-direction-b-redesign.md) | 2026-06-01 | ✅ Implemented | Full visual restyle of Tracker + Driver: Anton/Hanken Grotesk/JetBrains Mono, warm dark palette, orange accent |
| [Offline resilience](specs/2026-06-02-offline-resilience-design.md) | 2026-06-02 | ✅ Implemented | Driver: optimistic LAP, localStorage queue, background retry, sync indicator; Tracker: offline banner |
| [Course overview](specs/2026-06-02-course-overview-design.md) | 2026-06-02 | ✅ Implemented | All-18-legs screen in Tracker + Driver with Google Maps links, live clock, difficulty chips, done/active/upcoming status |

Each spec has a matching implementation plan in `plans/` with the same filename stem.

## Workflow

When completing a new feature:
1. Update the spec's `**Status:** Approved` → `**Status:** Implemented`
2. Add a row to this table
3. Include both changes in the merge commit
