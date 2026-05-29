import { useState, useEffect, useRef } from 'react'
import { api, formatTime } from '../api'
import type { Race, TeamStatus } from '../api'

interface Props {
  race: Race
  onTeamClick: (teamId: string, teamName: string) => void
}

export function TeamGrid({ race, onTeamClick }: Props) {
  const [statuses, setStatuses] = useState<TeamStatus[]>([])
  const [pollError, setPollError] = useState(false)
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState<number | null>(null)
  const lastUpdatedRef = useRef<Date | null>(null)

  useEffect(() => {
    async function poll() {
      try {
        const data = await api.get<TeamStatus[]>(`/races/${race.id}/status`)
        setStatuses(data)
        lastUpdatedRef.current = new Date()
        setSecondsSinceUpdate(0)
        setPollError(false)
      } catch {
        setPollError(true)
      }
    }

    poll()
    const pollId = setInterval(poll, 30_000)
    const tickId = setInterval(() => {
      if (lastUpdatedRef.current) {
        setSecondsSinceUpdate(Math.floor((Date.now() - lastUpdatedRef.current.getTime()) / 1000))
      }
    }, 1_000)

    return () => {
      clearInterval(pollId)
      clearInterval(tickId)
    }
  }, [race.id])

  const raceDate = new Date(race.date).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="p-4 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-4xl font-bold tracking-tight" style={{color:'var(--text)'}}>
          {race.name}
        </h1>
        <p className="text-sm mt-1" style={{color:'var(--muted)'}}>
          {raceDate}
        </p>
        <div className="flex items-center gap-1.5 mt-2">
          {pollError ? (
            <span className="text-xs" style={{color:'var(--amber)'}}>⚠ Unable to refresh</span>
          ) : (
            <>
              <span className="live-dot w-1.5 h-1.5 rounded-full inline-block flex-shrink-0" style={{background:'var(--green)'}} />
              <span className="text-xs" style={{color:'var(--muted)'}}>
                {secondsSinceUpdate === 0 ? 'live' : `${secondsSinceUpdate}s ago`}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Grid */}
      {statuses.length === 0 && !pollError ? (
        <p className="text-sm" style={{color:'var(--muted)'}}>No teams yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {statuses.map(s => {
            const isActive = s.status === 'in-progress'
            const isOverdue = s.eta?.status === 'overdue'
            return (
              <button
                key={s.team.id}
                onClick={() => onTeamClick(s.team.id, s.team.name)}
                className="card-hover rounded-xl p-4 text-left w-full"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  minHeight: isActive ? 'auto' : '80px',
                }}
              >
                {/* Team name */}
                <div
                  className="font-display text-lg font-bold leading-tight mb-2"
                  style={{color: isActive ? 'var(--text)' : 'var(--faint)'}}
                >
                  {s.team.name}
                </div>

                {isActive && s.currentLeg ? (
                  <>
                    {/* Leg + runner */}
                    <div className="text-xs mb-2" style={{color:'var(--muted)'}}>
                      Leg {s.currentLeg.legNumber}{s.currentRunner ? ` · ${s.currentRunner.name}` : ''}
                    </div>

                    {/* ETA */}
                    {s.eta && (
                      <>
                        <div
                          className="font-display text-2xl font-bold leading-none"
                          style={{color: isOverdue ? 'var(--amber)' : 'var(--green)'}}
                        >
                          {formatTime(s.eta.eta)}
                        </div>
                        <div
                          className="font-display text-xs font-semibold uppercase tracking-wider mt-0.5"
                          style={{color: isOverdue ? 'var(--amber)' : 'var(--green)'}}
                        >
                          {isOverdue ? 'overdue' : s.eta.status === 'ahead' ? 'ahead' : 'on pace'}
                        </div>
                      </>
                    )}

                    {/* Next handoff */}
                    {s.nextHandoff && (
                      <div className="text-xs mt-2 truncate" style={{color:'var(--faint)'}}>
                        → {s.nextHandoff.name}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-xs" style={{color:'var(--faint)'}}>Not started</div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
