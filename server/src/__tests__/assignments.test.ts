import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { app } from '../app'
import { createRace, createTeam, createLeg, createMember, createAssignment } from './helpers'

describe('POST /api/teams/:id/assignments', () => {
  it('creates a leg assignment', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const leg = await createLeg(race.id, 1)
    const member = await createMember(team.id)

    const res = await request(app)
      .post(`/api/teams/${team.id}/assignments`)
      .set('X-Team-Pin', '1234')
      .send({ legId: leg.id, teamMemberId: member.id, targetPaceSecPerMile: 510 })
    expect(res.status).toBe(201)
    expect(res.body.targetPaceSecPerMile).toBe(510)
  })
})

describe('PUT /api/assignments/:id', () => {
  it('updates pace', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const leg = await createLeg(race.id, 1)
    const member = await createMember(team.id)
    const assignment = await createAssignment(team.id, leg.id, member.id, 480)

    const res = await request(app)
      .put(`/api/assignments/${assignment.id}`)
      .set('X-Team-Pin', '1234')
      .send({ targetPaceSecPerMile: 500, teamId: team.id })
    expect(res.status).toBe(200)
    expect(res.body.targetPaceSecPerMile).toBe(500)
  })
})

describe('DELETE /api/assignments/:id', () => {
  it('removes an assignment', async () => {
    const race = await createRace()
    const team = await createTeam(race.id)
    const leg = await createLeg(race.id, 1)
    const member = await createMember(team.id)
    const assignment = await createAssignment(team.id, leg.id, member.id)

    const res = await request(app)
      .delete(`/api/assignments/${assignment.id}`)
      .set('X-Team-Pin', '1234')
      .send({ teamId: team.id })
    expect(res.status).toBe(204)
  })
})

describe('parsePace', () => {
  it('converts mm:ss to seconds per mile', async () => {
    // import the function — we'll export it from the seed script
    const { parsePace } = await import('../seed/assignments')
    expect(parsePace('8:30')).toBe(510)
    expect(parsePace('10:00')).toBe(600)
    expect(parsePace('9:05')).toBe(545)
  })

  it('throws on invalid format', async () => {
    const { parsePace } = await import('../seed/assignments')
    expect(() => parsePace('abc')).toThrow('Invalid targetPace "abc"')
    expect(() => parsePace('8')).toThrow('Invalid targetPace "8"')
    expect(() => parsePace('')).toThrow()
  })
})
