import type { Race, Leg, Handoff, TeamSummary } from './api'

const KEY = 'kt82_driver_session'

export type CachedSession =
  | {
      viewType: 'start'
      race: Race
      team: TeamSummary
      pin: string
      nextLeg: Leg
      nextRunner: string | null
    }
  | {
      viewType: 'racing'
      race: Race
      team: TeamSummary
      pin: string
      resultId: string | null
      leg: Leg
      startedAt: string
      nextHandoff: Handoff | null
      currentRunner: string | null
      raceStartedAt: string | null
      nextRunner: string | null
      nextLeg: Leg | null
      nextRunnerEta: string | null
      targetPaceSecPerMile: number | null
    }

export function saveSession(session: CachedSession): void {
  localStorage.setItem(KEY, JSON.stringify(session))
}

export function readSession(): CachedSession | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try { return JSON.parse(raw) as CachedSession }
  catch { return null }
}

export function clearSession(): void {
  localStorage.removeItem(KEY)
}
