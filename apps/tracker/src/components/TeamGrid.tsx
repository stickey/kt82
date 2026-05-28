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
      <div className="mb-5">
        <h1 className="text-xl font-bold">{race.name}</h1>
        <p className="text-sm text-gray-400">{raceDate}</p>
        <p className="text-xs text-gray-500 mt-1">
          {pollError
            ? 'Unable to refresh — check connection'
            : secondsSinceUpdate !== null
              ? `Updated ${secondsSinceUpdate}s ago`
              : 'Loading...'}
        </p>
      </div>

      {statuses.length === 0 && !pollError ? (
        <p className="text-gray-500 text-sm">No teams yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {statuses.map(s => (
            <button
              key={s.team.id}
              onClick={() => onTeamClick(s.team.id, s.team.name)}
              className="bg-gray-800 rounded-xl p-3 text-left min-h-[80px] hover:bg-gray-700 active:bg-gray-600 transition-colors w-full"
            >
              <div className="font-semibold text-sm text-white mb-1 leading-tight">{s.team.name}</div>
              {s.status === 'in-progress' && s.currentLeg ? (
                <>
                  <div className="text-xs text-gray-400 mb-1">
                    Leg {s.currentLeg.legNumber}{s.currentRunner ? ` · ${s.currentRunner.name}` : ''}
                  </div>
                  {s.eta && (
                    <>
                      <div className={`text-sm font-bold ${s.eta.status === 'overdue' ? 'text-amber-400' : 'text-green-400'}`}>
                        {formatTime(s.eta.eta)}
                      </div>
                      <div className={`text-xs ${s.eta.status === 'overdue' ? 'text-amber-500' : 'text-green-600'}`}>
                        {s.eta.status === 'overdue' ? 'overdue' : s.eta.status === 'ahead' ? 'ahead' : 'on pace'}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-xs text-gray-500">Not started</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
