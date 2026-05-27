import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { createRace } from './helpers'

const ADMIN = { 'X-Admin-Password': 'testadmin' }

describe('GET /api/races', () => {
  it('returns empty array when no races exist', async () => {
    const res = await request(app).get('/api/races').set(ADMIN)
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it('returns 401 without admin password', async () => {
    const res = await request(app).get('/api/races')
    expect(res.status).toBe(401)
  })

  it('lists all races', async () => {
    await createRace({ name: 'KT82 2026' })
    const res = await request(app).get('/api/races').set(ADMIN)
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].name).toBe('KT82 2026')
  })
})

describe('POST /api/races', () => {
  it('creates a race', async () => {
    const res = await request(app)
      .post('/api/races')
      .set(ADMIN)
      .send({ name: 'KT82 2026', date: '2026-06-01' })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('KT82 2026')
    expect(res.body.id).toBeTruthy()
  })

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/races')
      .set(ADMIN)
      .send({ date: '2026-06-01' })
    expect(res.status).toBe(400)
  })
})
