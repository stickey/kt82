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
