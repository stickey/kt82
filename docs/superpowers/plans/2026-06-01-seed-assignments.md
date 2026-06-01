# Seed Assignments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `pnpm seed:assignments <teamId> <csvFile>` CLI script that bulk-creates leg assignments from a CSV, resolving runners by name instead of requiring ID lookups.

**Architecture:** Follows the exact pattern of `server/src/seed/legs.ts` and `server/src/seed/roster.ts` — a standalone TypeScript script run with `tsx`, using PrismaClient directly. Takes `teamId` + `csvFile` as CLI args. Resolves legs by legNumber (via team's raceId) and runners by name (within the team). Parses pace from `mm:ss` format.

**Tech Stack:** Node.js, TypeScript, tsx, csv-parse, PrismaClient

---

### Task 1: Implement and test the pace parser

**Files:**
- Create: `server/src/seed/assignments.ts`

The `parsePace` function is pure and unit-testable in isolation before wiring up the full script.

- [ ] **Step 1: Write the failing test**

Add to a new describe block at the bottom of `server/src/__tests__/assignments.test.ts` (open the file to see its current content first — add after the last describe block):

```ts
describe('parsePace', () => {
  it('converts mm:ss to seconds per mile', async () => {
    // import the function — we'll export it from the seed script
    const { parsePace } = await import('../seed/assignments')
    expect(parsePace('8:30')).toBe(510)
    expect(parsePace('10:00')).toBe(600)
    expect(parsePace('9:05')).toBe(545)
  })

  it('throws on invalid format', async () => {
    const { parsePace } = await import('../seed/assignments')
    expect(() => parsePace('abc')).toThrow('Invalid targetPace "abc"')
    expect(() => parsePace('8')).toThrow('Invalid targetPace "8"')
    expect(() => parsePace('')).toThrow()
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test src/__tests__/assignments.test.ts
```

Expected: test file may have existing tests that pass, but the new `parsePace` describe block fails with "Cannot find module '../seed/assignments'" or similar.

- [ ] **Step 3: Create the seed script with parsePace exported**

Create `server/src/seed/assignments.ts`:

```ts
import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export function parsePace(raw: string): number {
  const parts = raw.split(':')
  if (parts.length !== 2) throw new Error(`Invalid targetPace "${raw}" — expected mm:ss (e.g. 8:30)`)
  const minutes = parseInt(parts[0], 10)
  const seconds = parseInt(parts[1], 10)
  if (isNaN(minutes) || isNaN(seconds)) throw new Error(`Invalid targetPace "${raw}" — expected mm:ss (e.g. 8:30)`)
  return minutes * 60 + seconds
}

async function seedAssignments(teamId: string, csvFile: string) {
  const team = await prisma.team.findUnique({ where: { id: teamId } })
  if (!team) throw new Error(`Team not found: ${teamId}`)

  const existing = await prisma.legAssignment.count({ where: { teamId } })
  if (existing > 0) {
    console.error(`Team already has ${existing} assignments. Clear them first via the Captain app.`)
    process.exit(1)
  }

  const csvPath = path.isAbsolute(csvFile)
    ? csvFile
    : path.join(process.cwd(), csvFile)

  const records = parse(fs.readFileSync(csvPath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[]

  // Load all legs for this team's race
  const legs = await prisma.leg.findMany({ where: { raceId: team.raceId } })
  const legByNumber = new Map(legs.map(l => [l.legNumber, l]))

  // Load all members for this team
  const members = await prisma.teamMember.findMany({ where: { teamId } })
  const memberByName = new Map(members.map(m => [m.name, m]))

  console.log(`Seeding ${records.length} assignments for team "${team.name}"...`)

  for (const row of records) {
    const legNumber = parseInt(row.legNumber, 10)
    const leg = legByNumber.get(legNumber)
    if (!leg) throw new Error(`No leg with legNumber ${legNumber} found in this race`)

    const runner = memberByName.get(row.runner?.trim())
    if (!runner) throw new Error(`No member named "${row.runner?.trim()}" found on this team`)

    const targetPaceSecPerMile = parsePace(row.targetPace?.trim())

    await prisma.legAssignment.create({
      data: { teamId, legId: leg.id, teamMemberId: runner.id, targetPaceSecPerMile },
    })
    console.log(`  Leg ${legNumber}: ${runner.name} @ ${row.targetPace}/mi`)
  }

  console.log('Done.')
}

// Guard prevents CLI code from running when this module is imported in tests
if (!process.env.VITEST) {
  const [teamId, csvFile] = process.argv.slice(2)
  if (!teamId || !csvFile) {
    console.error('Usage: pnpm seed:assignments <teamId> <csvFile>')
    console.error('Example: pnpm seed:assignments clx123abc resources/sample-assignments.csv')
    process.exit(1)
  }
  seedAssignments(teamId, csvFile)
    .catch(err => { console.error(err.message); process.exit(1) })
    .finally(() => prisma.$disconnect())
}
```

- [ ] **Step 4: Run the tests — confirm parsePace tests pass**

```bash
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm test src/__tests__/assignments.test.ts
```

Expected: all tests pass including the new `parsePace` describe block.

- [ ] **Step 5: Commit**

```bash
git add server/src/seed/assignments.ts server/src/__tests__/assignments.test.ts
git commit -m "feat(seed): add seed:assignments script with parsePace unit tests"
```

---

### Task 2: Wire up the script and update docs

**Files:**
- Modify: `server/package.json`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add the script to package.json**

In `server/package.json`, find the `"scripts"` block. Add after `"seed:roster"`:

```json
"seed:assignments": "tsx src/seed/assignments.ts"
```

The scripts block should look like:
```json
"scripts": {
  ...
  "seed:legs": "tsx src/seed/legs.ts",
  "seed:roster": "tsx src/seed/roster.ts",
  "seed:assignments": "tsx src/seed/assignments.ts"
},
```

- [ ] **Step 2: Update CLAUDE.md**

In `CLAUDE.md`, find the `seed:roster` entry in the Key Commands section and add the following block immediately after it:

```markdown
# Seed leg assignments from a CSV (must have legNumber, runner, targetPace columns)
# 1. Create a race, seed legs, create a team, seed roster
# 2. Run (csvFile path relative to server/ dir or absolute):
cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm seed:assignments <teamId> <csvFile>
# Example: pnpm seed:assignments clx123abc ../resources/assignments.csv
# CSV format: legNumber,runner,targetPace  (targetPace as mm:ss, e.g. 8:30)
# Guards against double-seeding. Clear assignments via Manager → Teams → Reset first.
```

- [ ] **Step 3: Verify end-to-end manually**

Create a test CSV at `resources/sample-assignments.csv`:
```csv
legNumber,runner,targetPace
1,Test Runner,8:30
```

Then run through the full flow in the Manager app:
1. Create a race, seed legs with `pnpm seed:legs <raceId>`
2. Create a team, seed roster with `pnpm seed:roster <teamId> resources/team.rungmc.csv` (or a one-name CSV)
3. Run: `cd server && PATH="$HOME/.nvm/versions/node/v20.11.0/bin:$PATH" pnpm seed:assignments <teamId> resources/sample-assignments.csv`
4. Open Captain app — confirm the assignment appears
5. Run the same command again — confirm: `Team already has 1 assignments. Clear them first via the Captain app.`
6. Test error: edit CSV to use a non-existent runner name — confirm: `No member named "..." found on this team`

- [ ] **Step 4: Commit**

```bash
git add server/package.json CLAUDE.md resources/sample-assignments.csv
git commit -m "feat(seed): register seed:assignments command, update docs"
```
