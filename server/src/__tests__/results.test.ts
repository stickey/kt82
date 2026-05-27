import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { prisma } from '../lib/prisma'
import { createRace, createTeam, createLeg, createMember, createAssignment } from './helpers'

describe('GET /api/teams/:id/current', () => {
  it('returns not-started when no results exist', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const leg = await createLeg(race.id, 1)
    const member = await createMember(team.id)
    await createAssignment(team.id, leg.id, member.id)

    const res = await request(app)
      .get(`/api/teams/${team.id}/current`)
      .set('X-Team-Pin', '1234')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('not-started')
    expect(res.body.nextLeg.legNumber).toBe(1)
  })

  it('returns in-progress with ETA when leg is active', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const leg = await createLeg(race.id, 1, 5)
    const member = await createMember(team.id)
    await createAssignment(team.id, leg.id, member.id, 480)
    const startedAt = new Date(Date.now() - 10 * 60 * 1000)
    await prisma.legResult.create({ data: { teamId: team.id, legId: leg.id, startedAt } })

    const res = await request(app)
      .get(`/api/teams/${team.id}/current`)
      .set('X-Team-Pin', '1234')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('in-progress')
    expect(res.body.eta.status).toBe('on-pace')
    expect(res.body.currentRunner.name).toBe(member.name)
  })
})

describe('POST /api/teams/:id/results (START)', () => {
  it('creates a LegResult with client-provided startedAt', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const leg = await createLeg(race.id, 1)
    const member = await createMember(team.id)
    await createAssignment(team.id, leg.id, member.id)

    const startedAt = new Date().toISOString()
    const res = await request(app)
      .post(`/api/teams/${team.id}/results`)
      .set('X-Team-Pin', '1234')
      .send({ legId: leg.id, startedAt })
    expect(res.status).toBe(201)
    expect(res.body.legId).toBe(leg.id)
    expect(res.body.startedAt).toBe(startedAt)
    expect(res.body.finishedAt).toBeNull()
  })
})

describe('PATCH /api/results/:id (LAP)', () => {
  it('sets finishedAt and creates next LegResult with same timestamp', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const leg1 = await createLeg(race.id, 1, 5)
    const leg2 = await createLeg(race.id, 2, 5)
    const member = await createMember(team.id)
    await createAssignment(team.id, leg1.id, member.id)
    await createAssignment(team.id, leg2.id, member.id)

    const startedAt = new Date(Date.now() - 40 * 60 * 1000)
    const result = await prisma.legResult.create({
      data: { teamId: team.id, legId: leg1.id, startedAt },
    })

    const finishedAt = new Date().toISOString()
    const res = await request(app)
      .patch(`/api/results/${result.id}`)
      .set('X-Team-Pin', '1234')
      .send({ finishedAt, action: 'lap' })
    expect(res.status).toBe(200)
    expect(res.body.current.finishedAt).toBe(finishedAt)
    expect(res.body.next.legId).toBe(leg2.id)
    expect(res.body.next.startedAt).toBe(finishedAt)
  })
})

describe('PATCH /api/results/:id (STOP)', () => {
  it('sets finishedAt and returns null for next', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const leg = await createLeg(race.id, 1, 5)
    const member = await createMember(team.id)
    await createAssignment(team.id, leg.id, member.id)

    const result = await prisma.legResult.create({
      data: { teamId: team.id, legId: leg.id, startedAt: new Date(Date.now() - 20 * 60 * 1000) },
    })

    const finishedAt = new Date().toISOString()
    const res = await request(app)
      .patch(`/api/results/${result.id}`)
      .set('X-Team-Pin', '1234')
      .send({ finishedAt, action: 'stop' })
    expect(res.status).toBe(200)
    expect(res.body.current.finishedAt).toBe(finishedAt)
    expect(res.body.next).toBeNull()
  })
})
