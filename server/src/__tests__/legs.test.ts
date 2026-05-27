import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { createRace, createLeg } from './helpers'

const ADMIN = { 'X-Admin-Password': 'testadmin' }

describe('GET /api/races/:id/legs', () => {
  it('returns legs in legNumber order', async () => {
    const race = await createRace()
    await createLeg(race.id, 2)
    await createLeg(race.id, 1)

    const res = await request(app).get(`/api/races/${race.id}/legs`).set(ADMIN)
    expect(res.status).toBe(200)
    expect(res.body[0].legNumber).toBe(1)
    expect(res.body[1].legNumber).toBe(2)
  })
})

describe('POST /api/races/:id/legs', () => {
  it('creates a leg', async () => {
    const race = await createRace()
    const res = await request(app)
      .post(`/api/races/${race.id}/legs`)
      .set(ADMIN)
      .send({ legNumber: 1, name: 'Start to Barn', distanceMiles: 4.7 })
    expect(res.status).toBe(201)
    expect(res.body.distanceMiles).toBe(4.7)
  })
})

describe('PUT /api/legs/:id', () => {
  it('updates a leg', async () => {
    const race = await createRace()
    const leg = await createLeg(race.id, 1)

    const res = await request(app)
      .put(`/api/legs/${leg.id}`)
      .set(ADMIN)
      .send({ distanceMiles: 5.2 })
    expect(res.status).toBe(200)
    expect(res.body.distanceMiles).toBe(5.2)
  })
})

describe('DELETE /api/legs/:id', () => {
  it('deletes a leg', async () => {
    const race = await createRace()
    const leg = await createLeg(race.id, 1)

    const res = await request(app).delete(`/api/legs/${leg.id}`).set(ADMIN)
    expect(res.status).toBe(204)
  })
})
