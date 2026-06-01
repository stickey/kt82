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
