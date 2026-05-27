import bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'

export async function createRace(overrides: { name?: string; date?: Date } = {}) {
  return prisma.race.create({
    data: { name: 'KT82 Test Race', date: new Date('2026-06-01'), ...overrides },
  })
}

export async function createTeam(raceId: string, pin = '1234', name = 'Test Team') {
  return prisma.team.create({
    data: { raceId, name, captainPinHash: await bcrypt.hash(pin, 1) },
  })
}

export async function createLeg(
  raceId: string,
  legNumber: number,
  distanceMiles = 5.0
) {
  return prisma.leg.create({
    data: { raceId, legNumber, name: `Leg ${legNumber}`, distanceMiles },
  })
}

export async function createHandoff(legId: string) {
  return prisma.handoff.create({
    data: { legId, name: 'Test Handoff', lat: 38.5, lng: -92.5 },
  })
}

export async function createMember(teamId: string, name = 'Test Runner') {
  return prisma.teamMember.create({ data: { teamId, name } })
}

export async function createAssignment(
  teamId: string,
  legId: string,
  teamMemberId: string,
  targetPaceSecPerMile = 480
) {
  return prisma.legAssignment.create({
    data: { teamId, legId, teamMemberId, targetPaceSecPerMile },
  })
}

export async function createLegResult(
  teamId: string,
  legId: string,
  startedAt = new Date(),
  finishedAt: Date | null = null
) {
  return prisma.legResult.create({
    data: { teamId, legId, startedAt, finishedAt },
  })
}
