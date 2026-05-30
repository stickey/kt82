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

Each spec has a matching implementation plan in `plans/` with the same filename stem.

## Workflow

When completing a new feature:
1. Update the spec's `**Status:** Approved` → `**Status:** Implemented`
2. Add a row to this table
3. Include both changes in the merge commit
