import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function extractHandoffName(legName: string): string {
  const parts = legName.split(' to ')
  if (parts.length < 2) return legName
  return parts[parts.length - 1]
    .replace(/\s+\(via\b.*/i, '')
    .replace(/\s+via\b.*/i, '')
    .trim()
}

async function seedLegs(raceId: string, csvFile?: string) {
  const race = await prisma.race.findUnique({ where: { id: raceId } })
  if (!race) throw new Error(`Race not found: ${raceId}`)

  const existing = await prisma.leg.count({ where: { raceId } })
  if (existing > 0) {
    console.error(`Race already has ${existing} legs. Wipe them first via the Manager Danger tab.`)
    process.exit(1)
  }

  const csvPath = csvFile
    ? path.isAbsolute(csvFile) ? csvFile : path.join(process.cwd(), csvFile)
    : path.join(__dirname, '../../../resources/KT82legs.csv')
  const records = parse(fs.readFileSync(csvPath, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[]

  console.log(`Seeding ${records.length} legs into "${race.name}"...`)

  for (const row of records) {
    const handoffName = extractHandoffName(row.LEG_NAME)
    const leg = await prisma.leg.create({
      data: {
        raceId,
        legNumber: parseInt(row.LEG_NUMBER),
        name: row.LEG_NAME,
        distanceMiles: parseFloat(row.LEG_LENGTH),
      },
    })
    await prisma.handoff.create({
      data: {
        legId: leg.id,
        name: handoffName,
        lat: parseFloat(row.LEG_END_LAT),
        lng: parseFloat(row.LEG_END_LNG),
      },
    })
    console.log(`  Leg ${row.LEG_NUMBER}: ${handoffName}`)
  }

  console.log('Done.')
}

const [raceId, csvFile] = process.argv.slice(2)
if (!raceId) {
  console.error('Usage: pnpm seed:legs <raceId> [csvFile]')
  console.error('Example: pnpm seed:legs clx123abc ../resources/KT82legs.csv')
  process.exit(1)
}

seedLegs(raceId, csvFile)
  .catch(err => { console.error(err.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
