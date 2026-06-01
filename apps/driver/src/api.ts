import { createApiClient } from '@kt82/shared'
import type { Race, Leg, Handoff, LegTimelineItem, TeamMember } from '@kt82/shared'

export function createDriverApi(pin: string) {
  return createApiClient('/api', () => ({ 'X-Team-Pin': pin }))
}

export const publicApi = createApiClient('/api', () => ({}))

export type TeamSummary = { id: string; name: string }

export type CurrentStateNotStarted = {
  status: 'not-started'
  nextLeg: Leg | null
  nextRunner: TeamMember | null
}

export type CurrentStateInProgress = {
  status: 'in-progress'
  result: { id: string; teamId: string; legId: string; startedAt: string; finishedAt: null }
  currentLeg: Leg
  nextHandoff: Handoff | null
  currentRunner: TeamMember | null
  eta: { eta: string; secondsRemaining: number; status: 'on-pace' | 'ahead' | 'overdue' } | null
  raceStartedAt: string | null
}

export type CurrentState = CurrentStateNotStarted | CurrentStateInProgress

export type LegResultSerialized = {
  id: string; teamId: string; legId: string; startedAt: string; finishedAt: string | null
}

export type LapResult = { current: LegResultSerialized; next: LegResultSerialized | null }

export type TeamStatusItem = {
  team: TeamSummary
  status: 'not-started' | 'in-progress'
}

export function formatTime(isoString: string): string {
  const d = new Date(isoString)
  const h = d.getHours() % 12 || 12
  const m = d.getMinutes().toString().padStart(2, '0')
  const ampm = d.getHours() < 12 ? 'AM' : 'PM'
  return `${h}:${m} ${ampm}`
}

export function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mm = minutes.toString().padStart(2, '0')
  const ss = seconds.toString().padStart(2, '0')
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${minutes}:${ss}`
}

export function formatRaceTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

export function formatDuration(startIso: string, endIso: string): string {
  return formatElapsed(new Date(endIso).getTime() - new Date(startIso).getTime())
}

export function formatPace(secPerMile: number): string {
  const m = Math.floor(secPerMile / 60)
  const s = Math.round(secPerMile % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function buildNavUrl(handoff: Handoff): string {
  if (handoff.lat != null && handoff.lng != null)
    return `https://maps.apple.com/?daddr=${handoff.lat},${handoff.lng}`
  if (handoff.address)
    return `https://maps.apple.com/?daddr=${encodeURIComponent(handoff.address)}`
  return ''
}

export type { Race, Leg, Handoff, LegTimelineItem, TeamMember }
