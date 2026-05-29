import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedRoster(teamId: string, csvFile: string) {
  const team = await prisma.team.findUnique({ where: { id: teamId } })
  if (!team) throw new Error(`Team not found: ${teamId}`)

  const existing = await prisma.teamMember.count({ where: { teamId } })
  if (existing > 0) {
    console.error(`Team already has ${existing} members. Remove them first via the Captain app.`)
    process.exit(1)
  }

  const csvPath = path.isAbsolute(csvFile)
    ? csvFile
    : path.join(process.cwd(), csvFile)

  const records = parse(fs.readFileSync(csvPath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[]

  const names = records.map(r => r.name?.trim()).filter(Boolean)
  if (names.length === 0) throw new Error('No names found in CSV (expected a "name" column)')

  console.log(`Seeding ${names.length} members into "${team.name}"...`)

  await prisma.teamMember.createMany({
    data: names.map(name => ({ teamId, name })),
  })

  names.forEach(name => console.log(`  ${name}`))
  console.log('Done.')
}

const [teamId, csvFile] = process.argv.slice(2)
if (!teamId || !csvFile) {
  console.error('Usage: pnpm seed:roster <teamId> <csvFile>')
  console.error('Example: pnpm seed:roster clx123abc resources/team.rungmc.csv')
  process.exit(1)
}

seedRoster(teamId, csvFile)
  .catch(err => { console.error(err.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
