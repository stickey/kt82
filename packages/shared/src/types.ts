export interface Race {
  id: string
  name: string
  date: string
  createdAt: string
}

export interface Leg {
  id: string
  raceId: string
  legNumber: number
  name: string
  distanceMiles: number
  handoff?: Handoff
}

export interface Handoff {
  id: string
  legId: string
  name: string
  address?: string | null
  lat?: number | null
  lng?: number | null
}

export interface Team {
  id: string
  raceId: string
  name: string
  locked: boolean
}

export interface TeamMember {
  id: string
  teamId: string
  name: string
}

export interface LegAssignment {
  id: string
  teamId: string
  legId: string
  teamMemberId: string
  targetPaceSecPerMile: number
}

export interface LegResult {
  id: string
  teamId: string
  legId: string
  startedAt: string
  finishedAt: string | null
}

export interface TeamDetail extends Team {
  members: TeamMember[]
  assignments: (LegAssignment & { leg: Leg; teamMember: TeamMember })[]
  results: LegResult[]
}

export interface LegTimelineItem {
  leg: Leg
  assignment: (LegAssignment & { teamMember: TeamMember }) | null
  result: LegResult | null
  runner: TeamMember | null
  status: 'not-started' | 'in-progress' | 'completed'
  eta: ETAResult | null
}

export interface ETAResult {
  eta: Date
  secondsRemaining: number
  status: 'on-pace' | 'ahead' | 'overdue'
}
