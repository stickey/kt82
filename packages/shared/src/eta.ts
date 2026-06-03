import type { LegAssignment, LegResult, Leg, ETAResult } from './types'

export function calculateETA(
  assignment: LegAssignment,
  result: LegResult,
  leg: Leg,
  now: Date = new Date()
): ETAResult {
  const start = new Date(result.startedAt)
  if (isNaN(start.getTime())) {
    throw new Error(`calculateETA: invalid startedAt value "${result.startedAt}"`)
  }
  const projectedTotalSeconds = assignment.targetPaceSecPerMile * leg.distanceMiles
  const elapsedSeconds = (now.getTime() - start.getTime()) / 1000
  const secondsRemaining = projectedTotalSeconds - elapsedSeconds
  const eta = new Date(now.getTime() + secondsRemaining * 1000)

  let status: ETAResult['status']
  if (secondsRemaining < -60) {
    status = 'overdue'
  } else if (secondsRemaining > 60) {
    status = 'on-pace'
  } else {
    status = 'ahead'
  }

  return { eta, secondsRemaining, status }
}

export interface LPEstimate {
  off: number      // sec/mile offset from target (-30 to +30)
  p: number        // adjusted pace (sec/mile)
  total: number    // total leg time at this pace (seconds)
  frac: number     // estimated fraction of leg done (0–1)
  finishMs: number // estimated finish time (ms epoch)
  remain: number   // seconds remaining from nowMs (≥ 0)
  deltaSec: number // arrival delta vs target: distMiles × off
  arrived: boolean // nowMs >= finishMs
}

export function lpEstimates(
  startedAtMs: number,
  nowMs: number,
  distMiles: number,
  targetPaceSecPerMile: number
): LPEstimate[] {
  const elapsed = Math.max(0, (nowMs - startedAtMs) / 1000)
  return [-30, -15, 0, 15, 30].map((off) => {
    const p = targetPaceSecPerMile + off
    const total = distMiles * p
    const frac = distMiles > 0 ? Math.min(1, Math.max(0, elapsed / p / distMiles)) : 0
    const finishMs = startedAtMs + total * 1000
    return {
      off,
      p,
      total,
      frac,
      finishMs,
      remain: Math.max(0, (finishMs - nowMs) / 1000),
      deltaSec: distMiles * off,
      arrived: nowMs >= finishMs,
    }
  })
}
