import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { createRace, createTeam } from './helpers'
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
