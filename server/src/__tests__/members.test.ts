import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { createRace, createTeam, createMember } from './helpers'

describe('POST /api/teams/:id/members', () => {
  it('adds a team member', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)

    const res = await request(app)
      .post(`/api/teams/${team.id}/members`)
      .set('X-Team-Pin', '1234')
      .send({ name: 'Alice' })
    expect(res.status).toBe(201)
    expect(res.body.name).toBe('Alice')
    expect(res.body.teamId).toBe(team.id)
  })

  it('returns 401 without PIN', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const res = await request(app)
      .post(`/api/teams/${team.id}/members`)
      .send({ name: 'Alice' })
    expect(res.status).toBe(401)
  })
})

describe('PUT /api/members/:id', () => {
  it('renames a member', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const member = await createMember(team.id, 'Alice')

    const res = await request(app)
      .put(`/api/members/${member.id}`)
      .set('X-Team-Pin', '1234')
      .send({ name: 'Alicia', teamId: team.id })
    expect(res.status).toBe(200)
    expect(res.body.name).toBe('Alicia')
  })
})

describe('DELETE /api/members/:id', () => {
  it('removes a member', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const member = await createMember(team.id)

    const res = await request(app)
      .delete(`/api/members/${member.id}`)
      .set('X-Team-Pin', '1234')
      .send({ teamId: team.id })
    expect(res.status).toBe(204)
  })
})
