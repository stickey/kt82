import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { createRace, createTeam } from './helpers'

describe('POST /api/auth/admin', () => {
  it('returns 200 with correct password', async () => {
    const res = await request(app)
      .post('/api/auth/admin')
      .send({ password: 'testadmin' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })

  it('returns 401 with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/admin')
      .send({ password: 'wrong' })
    expect(res.status).toBe(401)
  })

  it('returns 400 when password missing', async () => {
    const res = await request(app).post('/api/auth/admin').send({})
    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/team', () => {
  it('returns 200 and teamId with correct PIN', async () => {
    const race = await createRace()
    const team = await createTeam(race.id, '5678')

    const res = await request(app)
      .post('/api/auth/team')
      .send({ pin: '5678' })
    expect(res.status).toBe(200)
    expect(res.body.teamId).toBe(team.id)
  })

  it('returns 401 with wrong PIN', async () => {
    const race = await createRace()
    await createTeam(race.id, '5678')

    const res = await request(app)
      .post('/api/auth/team')
      .send({ pin: '0000' })
    expect(res.status).toBe(401)
  })
})
