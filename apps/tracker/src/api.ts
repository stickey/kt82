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

export type { Race, LegTimelineItem }
