import { createApiClient } from '@kt82/shared'
import type { Race, LegTimelineItem, TeamMember, Handoff } from '@kt82/shared'

export const api = createApiClient('/api', () => ({}))

export type TeamStatus = {
  team: { id: string; name: string }
  status: 'not-started' | 'in-progress'
  currentLeg?: { id: string; legNumber: number; name: string; distanceMiles: number }
  currentRunner?: TeamMember | null
  nextHandoff?: Handoff | null
  eta?: { eta: string; secondsRemaining: number; status: 'on-pace' | 'ahead' | 'overdue' } | null
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

export type { Race, LegTimelineItem }
