import { useState, useEffect } from 'react'
import { createDriverApi, formatElapsed, formatDuration } from '../api'
import type { Race, TeamSummary, LegTimelineItem } from '../api'

interface Props {
  race: Race
  team: TeamSummary
  pin: string
}

export function CompleteScreen({ race, team, pin }: Props) {
  const [items, setItems] = useState<LegTimelineItem[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    createDriverApi(pin)
      .get<LegTimelineItem[]>(`/teams/${team.id}/timeline`)
      .then(setItems)
      .catch(() => setError('Could not load results'))
  }, [pin, team.id])

  const completed = items.filter(i => i.status === 'completed' && i.result?.startedAt && i.result?.finishedAt)

  const totalMs = (() => {
    if (completed.length === 0) return null
    const starts = completed.map(i => new Date(i.result!.startedAt).getTime())
    const ends = completed.map(i => new Date(i.result!.finishedAt!).getTime())
    return Math.max(...ends) - Math.min(...starts)
  })()

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col p-6">
      <div className="text-center mb-8">
        <div className="text-4xl mb-2">🏁</div>
        <h1 className="text-2xl font-bold">Race Complete!</h1>
        <p className="text-gray-400 text-sm mt-1">{team.name}</p>
        {totalMs !== null && (
          <p className="text-xl font-mono font-bold text-green-400 mt-3">
            {formatElapsed(totalMs)}
          </p>
        )}
      </div>

      {error && <p className="text-red-400 text-sm text-center mb-4">{error}</p>}

      <div className="flex flex-col gap-2">
        {items
          .filter(i => i.assignment !== null)
          .sort((a, b) => a.leg.legNumber - b.leg.legNumber)
          .map(item => (
            <div key={item.leg.id} className="bg-gray-800 rounded-lg px-4 py-3 flex justify-between items-center">
              <div>
                <span className="text-xs text-gray-500 mr-2">Leg {item.leg.legNumber}</span>
                <span className="text-sm font-medium">{item.runner?.name ?? '—'}</span>
              </div>
              <div className="font-mono text-sm text-gray-300">
                {item.result?.startedAt && item.result?.finishedAt
                  ? formatDuration(item.result.startedAt, item.result.finishedAt)
                  : '—'}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}
