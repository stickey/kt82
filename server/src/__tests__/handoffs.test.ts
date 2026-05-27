import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { createRace, createLeg, createHandoff } from './helpers'

const ADMIN = { 'X-Admin-Password': 'testadmin' }

describe('POST /api/legs/:id/handoff', () => {
  it('creates a handoff for a leg', async () => {
    const race = await createRace()
    const leg = await createLeg(race.id, 1)

    const res = await request(app)
      .post(`/api/legs/${leg.id}/handoff`)
      .set(ADMIN)
      .send({ name: 'Barn Parking Lot', lat: 38.512, lng: -92.431 })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Barn Parking Lot')
    expect(res.body.lat).toBe(38.512)
  })
})

describe('PUT /api/handoffs/:id', () => {
  it('updates a handoff', async () => {
    const race = await createRace()
    const leg = await createLeg(race.id, 1)
    const handoff = await createHandoff(leg.id)

    const res = await request(app)
      .put(`/api/handoffs/${handoff.id}`)
      .set(ADMIN)
      .send({ address: '123 Rural Route, Booneville MO' })
    expect(res.status).toBe(200)
    expect(res.body.address).toBe('123 Rural Route, Booneville MO')
  })
})
