import type { LegAssignment, LegResult, Leg, ETAResult } from './types'

export function calculateETA(
  assignment: LegAssignment,
  result: LegResult,
  leg: Leg,
  now: Date = new Date()
): ETAResult {
  const projectedTotalSeconds = assignment.targetPaceSecPerMile * leg.distanceMiles
  const elapsedSeconds = (now.getTime() - new Date(result.startedAt).getTime()) / 1000
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
