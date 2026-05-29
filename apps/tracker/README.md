# Tracker App

Public read-only race status board for spectators and team supporters.

## What It Does

- Shows all teams' current status at a glance (2-column card grid)
- Displays live ETA, current runner, and pace status (on pace / ahead / overdue) for each in-progress team
- Tap a team card to see the full leg-by-leg timeline
- Share a direct link to a team's view via native share sheet or clipboard copy
- Auto-detects the active race — no configuration needed
- Polls for updates every 30 seconds; shows "Unable to refresh" on network loss without clearing stale data

## Running

The API server must be running first:
```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm dev
```

```bash
# From repo root
PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm --filter tracker dev
```

Opens at **http://localhost:5173**

## Auth

None — fully public. No login required.

## URL Format

Team detail views use hash routing: `http://localhost:5173/#team/<teamId>`

These URLs are shareable and bookmarkable. Opening a direct team link works without going through the grid first.

## File Structure

```
src/
  api.ts              — public API client, TeamStatus type, formatTime helper
  App.tsx             — hash router, race auto-detect on mount
  components/
    TeamGrid.tsx      — polling grid of all teams; "Updated Xs ago" counter
    TeamDetail.tsx    — hero section (current runner + ETA) + full leg timeline
```
