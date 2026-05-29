import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { createRace } from './helpers'
import { prisma } from '../lib/prisma'
import { createLeg, createHandoff, createTeam, createMember, createAssignment, createLegResult } from './helpers'

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

describe('PUT /api/races/:id', () => {
  it('PUT /api/races/:id updates name and date', async () => {
    const race = await createRace({ name: 'Old Name' })
    const res = await request(app)
      .put(`/api/races/${race.id}`)
      .set('X-Admin-Password', 'testadmin')
      .send({ name: 'KT82 2026', date: '2026-09-06T00:00:00.000Z' })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('KT82 2026')
  })

  it('PUT /api/races/:id returns 404 for missing race', async () => {
    const res = await request(app)
      .put('/api/races/nonexistent')
      .set('X-Admin-Password', 'testadmin')
      .send({ name: 'X' })
    expect(res.status).toBe(404)
  })
})

describe('DELETE /api/races/:id/results', () => {
  it('returns 401 without admin password', async () => {
    const race = await createRace()
    const res = await request(app).delete(`/api/races/${race.id}/results`)
    expect(res.status).toBe(401)
  })

  it('returns 404 for unknown race', async () => {
    const res = await request(app)
      .delete('/api/races/nonexistent/results')
      .set(ADMIN)
    expect(res.status).toBe(404)
  })

  it('deletes all leg results, leaving legs and teams intact', async () => {
    const race = await createRace()
    const leg = await createLeg(race.id, 1)
    const team = await createTeam(race.id)
    await createLegResult(team.id, leg.id)

    const res = await request(app)
      .delete(`/api/races/${race.id}/results`)
      .set(ADMIN)
    expect(res.status).toBe(200)

    const legCount = await prisma.leg.count({ where: { raceId: race.id } })
    const teamCount = await prisma.team.count({ where: { raceId: race.id } })
    const resultCount = await prisma.legResult.count({ where: { leg: { raceId: race.id } } })
    expect(legCount).toBe(1)
    expect(teamCount).toBe(1)
    expect(resultCount).toBe(0)
  })
})

describe('DELETE /api/races/:id', () => {
  it('returns 401 without admin password', async () => {
    const race = await createRace()
    const res = await request(app).delete(`/api/races/${race.id}`)
    expect(res.status).toBe(401)
  })

  it('returns 404 for unknown race', async () => {
    const res = await request(app)
      .delete('/api/races/nonexistent')
      .set(ADMIN)
    expect(res.status).toBe(404)
  })

  it('deletes race and all dependent data', async () => {
    const race = await createRace()
    const leg = await createLeg(race.id, 1)
    await createHandoff(leg.id)
    const team = await createTeam(race.id)
    const member = await createMember(team.id)
    await createAssignment(team.id, leg.id, member.id)
    await createLegResult(team.id, leg.id)

    const res = await request(app)
      .delete(`/api/races/${race.id}`)
      .set(ADMIN)
    expect(res.status).toBe(200)

    // Everything is gone
    expect(await prisma.race.count()).toBe(0)
    expect(await prisma.leg.count()).toBe(0)
    expect(await prisma.handoff.count()).toBe(0)
    expect(await prisma.team.count()).toBe(0)
    expect(await prisma.teamMember.count()).toBe(0)
    expect(await prisma.legAssignment.count()).toBe(0)
    expect(await prisma.legResult.count()).toBe(0)
  })
})
