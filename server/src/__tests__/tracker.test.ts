import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { prisma } from '../lib/prisma'
import { createRace, createTeam, createLeg, createMember, createAssignment } from './helpers'

describe('GET /api/races/:id/status (no auth)', () => {
  it('returns all teams with not-started status before race begins', async () => {
    const race = await createRace()
    await createTeam(race.id, '1234', 'Team A')
    await createTeam(race.id, '5678', 'Team B')

    const res = await request(app).get(`/api/races/${race.id}/status`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].status).toBe('not-started')
  })

  it('returns current runner and ETA for an in-progress team', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const leg = await createLeg(race.id, 1, 5)
    const member = await createMember(team.id, 'Bob')
    await createAssignment(team.id, leg.id, member.id, 480)
    await prisma.legResult.create({
      data: { teamId: team.id, legId: leg.id, startedAt: new Date(Date.now() - 10 * 60 * 1000) },
    })

    const res = await request(app).get(`/api/races/${race.id}/status`)
    expect(res.status).toBe(200)
    expect(res.body[0].status).toBe('in-progress')
    expect(res.body[0].currentRunner.name).toBe('Bob')
    expect(res.body[0].eta).toBeTruthy()
  })
})

describe('GET /api/teams/:id/timeline (no auth)', () => {
  it('returns all legs with assignment, runner, and status', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const leg1 = await createLeg(race.id, 1, 5)
    const leg2 = await createLeg(race.id, 2, 5)
    const member = await createMember(team.id)
    await createAssignment(team.id, leg1.id, member.id, 480)
    await createAssignment(team.id, leg2.id, member.id, 480)

    const finishedAt = new Date()
    const startedAt = new Date(finishedAt.getTime() - 41 * 60 * 1000)
    await prisma.legResult.create({ data: { teamId: team.id, legId: leg1.id, startedAt, finishedAt } })

    const res = await request(app).get(`/api/teams/${team.id}/timeline`)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(2)
    expect(res.body[0].status).toBe('completed')
    expect(res.body[1].status).toBe('not-started')
  })
})
