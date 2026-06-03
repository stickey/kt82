import { describe, it, expect } from 'vitest'
import { calculateETA, lpEstimates } from '../eta'
import type { LegAssignment, LegResult, Leg } from '../types'

const leg: Leg = { id: 'leg1', raceId: 'race1', legNumber: 1, name: 'Leg 1', distanceMiles: 5 }
const assignment: LegAssignment = {
  id: 'a1', teamId: 't1', legId: 'leg1', teamMemberId: 'm1',
  targetPaceSecPerMile: 480 // 8:00/mile → 40 min for 5 miles = 2400s total
}

describe('calculateETA', () => {
  it('returns on-pace when more than 60s remaining', () => {
    const startedAt = new Date(Date.now() - 10 * 60 * 1000).toISOString() // 10 min ago
    const result: LegResult = { id: 'r1', teamId: 't1', legId: 'leg1', startedAt, finishedAt: null }
    const now = new Date()

    // elapsed=600s, projected=2400s, remaining=1800s
    const eta = calculateETA(assignment, result, leg, now)

    expect(eta.status).toBe('on-pace')
    expect(eta.secondsRemaining).toBeCloseTo(1800, 0)
    expect(eta.eta.getTime()).toBeCloseTo(now.getTime() + 1800 * 1000, -3)
  })

  it('returns overdue when more than 60s past projected finish', () => {
    const startedAt = new Date(Date.now() - 50 * 60 * 1000).toISOString() // 50 min ago
    const result: LegResult = { id: 'r1', teamId: 't1', legId: 'leg1', startedAt, finishedAt: null }
    const now = new Date()

    // elapsed=3000s, projected=2400s, remaining=-600s
    const eta = calculateETA(assignment, result, leg, now)

    expect(eta.status).toBe('overdue')
    expect(eta.secondsRemaining).toBeCloseTo(-600, 0)
  })

  it('returns ahead when within 60s of projected finish', () => {
    const startedAt = new Date(Date.now() - 39 * 60 * 1000).toISOString() // 39 min ago
    const result: LegResult = { id: 'r1', teamId: 't1', legId: 'leg1', startedAt, finishedAt: null }
    const now = new Date()

    // elapsed=2340s, projected=2400s, remaining=60s
    const eta = calculateETA(assignment, result, leg, now)

    expect(eta.status).toBe('ahead')
  })

  it('throws on invalid startedAt', () => {
    const result: LegResult = { id: 'r1', teamId: 't1', legId: 'leg1', startedAt: 'not-a-date', finishedAt: null }
    expect(() => calculateETA(assignment, result, leg)).toThrow('invalid startedAt')
  })
})

describe('lpEstimates', () => {
  const startedAtMs = 1_000_000_000
  const distMiles = 5
  const pace = 540 // 9:00/mi → 2700s total

  it('returns 5 estimates in fastest-to-slowest order', () => {
    const ests = lpEstimates(startedAtMs, startedAtMs + 60_000, distMiles, pace)
    expect(ests).toHaveLength(5)
    expect(ests.map(e => e.off)).toEqual([-30, -15, 0, 15, 30])
  })

  it('index 2 is the target pace with deltaSec 0', () => {
    const ests = lpEstimates(startedAtMs, startedAtMs + 60_000, distMiles, pace)
    expect(ests[2].p).toBe(pace)
    expect(ests[2].deltaSec).toBe(0)
    expect(ests[2].off).toBe(0)
  })

  it('frac is clamped between 0 and 1', () => {
    const ests = lpEstimates(startedAtMs, startedAtMs + 99_999_999, distMiles, pace)
    ests.forEach(e => {
      expect(e.frac).toBeGreaterThanOrEqual(0)
      expect(e.frac).toBeLessThanOrEqual(1)
    })
  })

  it('remain is 0 and arrived is true past finish time', () => {
    const finishMs = startedAtMs + distMiles * pace * 1000
    const ests = lpEstimates(startedAtMs, finishMs + 5_000, distMiles, pace)
    expect(ests[2].remain).toBe(0)
    expect(ests[2].arrived).toBe(true)
  })

  it('fastest pace (index 0) finishes before slowest (index 4)', () => {
    const ests = lpEstimates(startedAtMs, startedAtMs + 60_000, distMiles, pace)
    expect(ests[0].finishMs).toBeLessThan(ests[4].finishMs)
  })

  it('total equals distMiles × p', () => {
    const ests = lpEstimates(startedAtMs, startedAtMs + 60_000, distMiles, pace)
    ests.forEach(e => expect(e.total).toBeCloseTo(distMiles * e.p, 5))
  })
})
