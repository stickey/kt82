# Danger Zone — Manager App Reset Controls

**Date:** 2026-05-29
**Scope:** Add a "Danger" tab to the Manager app with destructive data operations for development and testing: clear timing data, delete a team (cascaded), and wipe the entire race.

---

## Decisions Made

| Decision | Choice | Rationale |
|---|---|---|
| Location | 4th tab in Manager app | Already admin-password gated; no new app needed for dev-only use |
| Auth | Existing `adminAuth` middleware (`X-Admin-Password` header) | Same protection as all other Manager admin routes |
| Cascade strategy | Manual FK-safe delete order in server routes | No Prisma cascade deletes configured in schema; matches existing pattern in `POST /api/teams/:id/reset` |
| Confirm UX | Existing `ConfirmDialog` component | Consistent with Manager patterns; prevents accidental taps |
| Visual treatment | Red buttons and section headers | Tab should feel noticeably different from configuration tabs |
| Tab label | "Danger" | Short, unambiguous |

---

## New Server Endpoints

All three endpoints are protected by `adminAuth` middleware.

### `DELETE /api/races/:id` — in `races.ts`

Wipes the entire race and everything under it in FK-safe order:

```
LegResult → LegAssignment → TeamMember → Handoff → Leg → Team → Race
```

Uses a Prisma transaction. Returns `204 No Content` on success.

### `DELETE /api/races/:id/results` — in `races.ts`

Deletes all `LegResult` rows for the race. Teams, members, assignments, and legs are untouched — the race can be re-run without reconfiguring anything.

Returns `204 No Content` on success.

### `DELETE /api/teams/:id` — in `teams.ts`

Deletes one team and all its dependent data in FK-safe order:

```
LegResult → LegAssignment → TeamMember → Team
```

Uses a Prisma transaction. Returns `204 No Content` on success.

---

## Manager UI

### TabNav change

Add "Danger" as the 4th tab. Tab order: Race | Legs | Teams | Danger.

### File

`apps/manager/src/tabs/DangerTab.tsx`

### Props

```typescript
interface Props {
  race: Race | null
  on401: () => void
  onRaceWipe: () => void  // calls parent's onRaceChange(null) and switches to Race tab
}
```

### Empty state

If `race` is null, show: *"Create a race first before using reset controls."* — same pattern as LegsTab and TeamsTab.

### Three sections

Each section has a red-tinted heading and a red button. Clicking any button opens a `ConfirmDialog` before the API call fires.

---

#### 1. Clear Timing Data

- **Heading:** "Clear Timing Data"
- **Description:** "Deletes all recorded leg times. Teams, members, and assignments are preserved — the race can be re-run without reconfiguring anything."
- **Button:** "Clear Results"
- **Confirm message:** `"Clear all leg results for [race.name]? The race can be re-run but all recorded times will be lost."`
- **API call:** `DELETE /api/races/:id/results`
- **On success:** Show inline confirmation ("Results cleared"), no navigation change.

---

#### 2. Delete a Team

- **Heading:** "Delete a Team"
- **Description:** "Permanently removes a team and all its members, assignments, and recorded times."
- **Content:** Fetches `GET /api/races/:id/teams` on mount. Renders one row per team with a red "Delete" button.
- **Confirm message:** `"Delete [team.name]? This removes the team, all members, assignments, and recorded times permanently."`
- **API call:** `DELETE /api/teams/:id`
- **On success:** Reload team list inline.

---

#### 3. Wipe Everything

- **Heading:** "Wipe Everything"
- **Description:** "Deletes this race and all data under it — legs, handoffs, teams, members, assignments, and results. The app returns to the empty state."
- **Button:** "Wipe Everything"
- **Confirm message:** `"Delete [race.name] and all data? This cannot be undone."`
- **API call:** `DELETE /api/races/:id`
- **On success:** Call `onRaceWipe()` — parent sets race to null and switches to the Race tab.

---

## Error Handling

| Scenario | Behavior |
|---|---|
| 401 on any request | Call `on401()` — clears localStorage, returns to LoginScreen |
| Network / non-401 error | Inline red error message near the triggering button |
| No race configured | Non-error empty state with explanatory message |

---

## Out of Scope

- Per-team results clearing (full team delete or `POST /api/teams/:id/reset` covers dev needs)
- Race-day operational controls (future ops portal)
- Bulk team deletion
