import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { createRace, createTeam, createLeg, createMember, createAssignment, createLegResult } from './helpers'
import { prisma } from '../lib/prisma'

const ADMIN = { 'X-Admin-Password': 'testadmin' }

describe('GET /api/races/:id/teams', () => {
  it('lists teams with locked status', async () => {
    const race = await createRace()
    await createTeam(race.id, '1234', 'Fast Feet')

    const res = await request(app).get(`/api/races/${race.id}/teams`).set(ADMIN)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('Fast Feet')
    expect(res.body[0].locked).toBe(false)
  })
})

describe('POST /api/races/:id/teams', () => {
  it('creates a team and hashes the PIN', async () => {
    const race = await createRace()
    const res = await request(app)
      .post(`/api/races/${race.id}/teams`)
      .set(ADMIN)
      .send({ name: 'Speed Demons', pin: '9876' })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Speed Demons')
    expect(res.body.captainPinHash).toBeUndefined()
    expect(res.body.pin).toBe('9876')
  })
})

describe('POST /api/teams/:id/reset', () => {
  it('unlocks the team and clears assignments', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    await prisma.team.update({ where: { id: team.id }, data: { locked: true } })

    const res = await request(app)
      .post(`/api/teams/${team.id}/reset`)
      .set(ADMIN)
    expect(res.status).toBe(200)
    expect(res.body.locked).toBe(false)
  })
})

describe('GET /api/teams/:id', () => {
  it('returns team detail with members and assignments for correct PIN', async () => {
    const race = await createRace()
    const team = await createTeam(race.id, '1234', 'Fast Feet')

    const res = await request(app)
      .get(`/api/teams/${team.id}`)
      .set('X-Team-Pin', '1234')
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Fast Feet')
    expect(res.body.members).toEqual([])
    expect(res.body.assignments).toEqual([])
    expect(res.body.captainPinHash).toBeUndefined()
  })

  it('returns 401 with wrong PIN', async () => {
    const race = await createRace()
    const team = await createTeam(race.id, '1234')

    const res = await request(app)
      .get(`/api/teams/${team.id}`)
      .set('X-Team-Pin', '9999')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/teams/:id/reset with existing results', () => {
  it('clears both assignments and results', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const leg = await createLeg(race.id, 1)
    const member = await createMember(team.id)
    await createAssignment(team.id, leg.id, member.id)
    await createLegResult(team.id, leg.id)

    const res = await request(app)
      .post(`/api/teams/${team.id}/reset`)
      .set('X-Admin-Password', 'testadmin')
    expect(res.status).toBe(200)
    expect(res.body.locked).toBe(false)

    const results = await prisma.legResult.findMany({ where: { teamId: team.id } })
    const assignments = await prisma.legAssignment.findMany({ where: { teamId: team.id } })
    expect(results).toHaveLength(0)
    expect(assignments).toHaveLength(0)
  })
})
