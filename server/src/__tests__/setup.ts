import { beforeAll, beforeEach, afterAll } from 'vitest'
import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'

beforeAll(async () => {
  process.env.ADMIN_PASSWORD_HASH = await bcrypt.hash('testadmin', 1)
})

beforeEach(async () => {
  await prisma.legResult.deleteMany()
  await prisma.legAssignment.deleteMany()
  await prisma.teamMember.deleteMany()
  await prisma.team.deleteMany()
  await prisma.handoff.deleteMany()
  await prisma.leg.deleteMany()
  await prisma.race.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})
