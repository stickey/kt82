---
name: clear-assignments-danger-tab
description: Race-wide "Clear Assignments" action in the Manager Danger tab — deletes all leg assignments, cascades to timing results, unlocks all teams
status: Approved
---

## Overview

Add a **Clear Assignments** control to the Manager app's Danger tab. It deletes every `LegAssignment` for the active race, cascades to delete every `LegResult` (since timing data without assignments is meaningless), and unlocks all teams so the Captain app can re-enter assignments.

This is a race-wide operation. Per-team assignment reset already exists in the Teams tab.

## Server

New route in `server/src/routes/races.ts`:

```
DELETE /races/:id/assignments   (adminAuth)
```

Implementation — single transaction:
1. `legResult.deleteMany` where `leg.raceId = id`
2. `legAssignment.deleteMany` where `leg.raceId = id`
3. `team.updateMany` where `raceId = id` → `{ locked: false }`

Returns `200 { ok: true }`. Returns `404` if race not found (guard before transaction).

## DangerTab UI

New section inserted between "Clear Timing Data" and "Delete a Team":

- **Section title:** Clear Assignments
- **Description:** "Deletes all leg assignments for every team. Timing data is also cleared since it depends on assignments. Teams are unlocked so assignments can be re-entered."
- **Button:** Clear Assignments (red, same style as Clear Results)
- **Confirm dialog title:** Clear Assignments
- **Confirm message:** "Clear all assignments for [race.name]? Timing data will also be deleted. Teams will be unlocked."
- **Confirm label:** Clear Assignments (busy: Clearing…)
- **Success toast:** "Assignments cleared."

New discriminant added to the `Confirm` union type: `{ type: 'clearAssignments' }`.

## Scope

- No schema changes
- No new files — additions only to `routes/races.ts` and `DangerTab.tsx`
- No changes to the Teams tab or any other route
