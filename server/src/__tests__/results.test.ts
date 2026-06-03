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
    expect(res.body.raceStartedAt).toBe(startedAt.toISOString())
    expect(res.body.targetPaceSecPerMile).toBe(480)
  })

  it('returns raceStartedAt equal to the first leg startedAt when on a later leg', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const leg1 = await createLeg(race.id, 1, 5)
    const leg2 = await createLeg(race.id, 2, 5)
    const member = await createMember(team.id)
    await createAssignment(team.id, leg1.id, member.id, 480)
    await createAssignment(team.id, leg2.id, member.id, 480)

    const leg1Start = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
    await prisma.legResult.create({
      data: { teamId: team.id, legId: leg1.id, startedAt: leg1Start, finishedAt: new Date(Date.now() - 30 * 60 * 1000) },
    })
    const leg2Start = new Date(Date.now() - 10 * 60 * 1000)
    await prisma.legResult.create({
      data: { teamId: team.id, legId: leg2.id, startedAt: leg2Start },
    })

    const res = await request(app)
      .get(`/api/teams/${team.id}/current`)
      .set('X-Team-Pin', '1234')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('in-progress')
    expect(res.body.raceStartedAt).toBe(leg1Start.toISOString())
  })

  it('returns nextRunner and nextLeg when a second leg assignment exists', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const leg1 = await createLeg(race.id, 1, 5)
    const leg2 = await createLeg(race.id, 2, 4)
    const runner1 = await createMember(team.id, 'Alice')
    const runner2 = await createMember(team.id, 'Bob')
    await createAssignment(team.id, leg1.id, runner1.id, 480)
    await createAssignment(team.id, leg2.id, runner2.id, 500)
    const startedAt = new Date(Date.now() - 5 * 60 * 1000)
    await prisma.legResult.create({ data: { teamId: team.id, legId: leg1.id, startedAt } })

    const res = await request(app)
      .get(`/api/teams/${team.id}/current`)
      .set('X-Team-Pin', '1234')
    expect(res.status).toBe(200)
    expect(res.body.nextRunner.name).toBe('Bob')
    expect(res.body.nextLeg.legNumber).toBe(2)
    expect(res.body.nextRunnerEta).not.toBeNull()
    // nextRunnerEta should be a valid ISO string in the future
    expect(new Date(res.body.nextRunnerEta).getTime()).toBeGreaterThan(Date.now())
  })

  it('returns null nextRunner on the last leg', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const leg1 = await createLeg(race.id, 1, 5)
    const runner1 = await createMember(team.id, 'Alice')
    await createAssignment(team.id, leg1.id, runner1.id, 480)
    await prisma.legResult.create({ data: { teamId: team.id, legId: leg1.id, startedAt: new Date() } })

    const res = await request(app)
      .get(`/api/teams/${team.id}/current`)
      .set('X-Team-Pin', '1234')
    expect(res.status).toBe(200)
    expect(res.body.nextRunner).toBeNull()
    expect(res.body.nextLeg).toBeNull()
    expect(res.body.nextRunnerEta).toBeNull()
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

describe('PATCH /api/results/:id (negative paths)', () => {
  it('returns 401 when no PIN provided', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const leg = await createLeg(race.id, 1, 5)
    const result = await prisma.legResult.create({
      data: { teamId: team.id, legId: leg.id, startedAt: new Date() },
    })

    const res = await request(app)
      .patch(`/api/results/${result.id}`)
      .send({ finishedAt: new Date().toISOString(), action: 'stop' })
    expect(res.status).toBe(401)
  })

  it('returns 404 for non-existent result', async () => {
    const res = await request(app)
      .patch('/api/results/nonexistent-id')
      .set('X-Team-Pin', '1234')
      .send({ finishedAt: new Date().toISOString(), action: 'stop' })
    expect(res.status).toBe(404)
  })

  it('LAP with no next assignment returns next: null', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const leg = await createLeg(race.id, 1, 5)
    const member = await createMember(team.id)
    await createAssignment(team.id, leg.id, member.id)

    const result = await prisma.legResult.create({
      data: { teamId: team.id, legId: leg.id, startedAt: new Date(Date.now() - 40 * 60 * 1000) },
    })

    const finishedAt = new Date().toISOString()
    const res = await request(app)
      .patch(`/api/results/${result.id}`)
      .set('X-Team-Pin', '1234')
      .send({ finishedAt, action: 'lap' })
    expect(res.status).toBe(200)
    expect(res.body.current.finishedAt).toBe(finishedAt)
    expect(res.body.next).toBeNull()
  })
})
