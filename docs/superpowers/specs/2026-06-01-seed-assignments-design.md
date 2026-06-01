**Status:** Approved

# Seed Assignments Script

## Context

The two existing seed scripts (`seed:legs`, `seed:roster`) let race organizers bulk-load legs and runner rosters from CSV files. There's no equivalent for leg assignments — mapping runners to specific legs with a target pace. Currently assignments must be entered one at a time through the Captain app UI, which is tedious for an 18-leg race. This script closes that gap.

## Design

`pnpm seed:assignments <teamId> <csvFile>` reads a CSV and creates one `LegAssignment` per row, resolving runners by name (no need to look up member IDs manually).

### CLI signature

```
pnpm seed:assignments <teamId> <csvFile>
```

`csvFile` path is relative to `server/` or absolute (same convention as `seed:roster`).

### CSV format

| Column | Type | Example | Notes |
|---|---|---|---|
| `legNumber` | integer | `3` | Must match an existing leg in the team's race |
| `runner` | string | `Alice Smith` | Must match a `TeamMember.name` for this team (case-sensitive) |
| `targetPace` | mm:ss | `8:30` | Converted to `targetPaceSecPerMile` on write |

Example file:
```csv
legNumber,runner,targetPace
1,Alice Smith,8:30
2,Bob Jones,9:15
3,Alice Smith,8:45
```

### Resolution logic

1. Load team by `teamId` → get `team.raceId`; error if team not found
2. Load all legs for `team.raceId` into a `Map<legNumber, Leg>`
3. Load all `TeamMember`s for `teamId` into a `Map<name, TeamMember>`
4. For each CSV row, resolve leg and member — fail fast with a clear message if either is not found
5. Parse `targetPace` (`mm:ss`) → `minutes * 60 + seconds`; error on invalid format
6. `prisma.legAssignment.create(...)` per row

### Double-seeding guard

If `LegAssignment` count for this `teamId` is > 0, print an error and exit 1 (same pattern as the other seed scripts). Message: `"Team already has N assignments. Clear them first via the Captain app."`

### Error messages (fail-fast, exit 1 on first error)

- Unknown leg number: `"No leg with legNumber N found in this race"`
- Unknown runner name: `"No member named \"Alice Smith\" found on this team"`
- Bad pace format: `"Invalid targetPace \"abc\" — expected mm:ss (e.g. 8:30)"`

## Files

| File | Change |
|---|---|
| `server/src/seed/assignments.ts` | New file — the seed script |
| `server/package.json` | Add `"seed:assignments": "tsx src/seed/assignments.ts"` |
| `CLAUDE.md` | Add `seed:assignments` entry in the Key Commands section |

## Verification

1. Create a race, seed legs, create a team, seed roster
2. Run `pnpm seed:assignments <teamId> resources/sample-assignments.csv` (create a small test CSV)
3. Confirm assignments appear in the Captain app
4. Run the same command again — confirm the double-seed guard fires
5. Test with an unknown runner name and an unknown leg number — confirm clean error messages
