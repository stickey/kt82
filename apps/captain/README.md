# Captain App

Team setup dashboard for team captains to configure their roster and leg assignments before the race.

## What It Does

- **Roster tab:** Add, rename, and remove team members
- **Assignments tab:** Assign a runner to each leg with a target pace (min/mile); unassigned legs are skipped in ETA calculations

## Running

The API server must be running first:
```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm dev
```

```bash
# From repo root
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter captain dev
```

Opens at **http://localhost:5174**

## Auth

Login with your team PIN. PINs are created by the race director in the Manager app.

Dev credential: `1234` (after creating a team in Manager or via the test suite).

## File Structure

```
src/
  api.ts              — PIN-bearing API client factory
  App.tsx             — login gate, tab routing
  components/
    LoginScreen.tsx   — PIN entry
    TabNav.tsx        — tab bar (Roster / Assignments)
    Modal.tsx         — reusable modal wrapper
    ConfirmDialog.tsx — reusable confirm/cancel dialog
  tabs/
    RosterTab.tsx     — add/rename/remove team members
    AssignmentsTab.tsx — assign runners to legs with target pace
```
