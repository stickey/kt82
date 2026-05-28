import { useState, useEffect, useRef } from 'react'
import { api, formatTime } from '../api'
import type { LegTimelineItem } from '../api'

interface Props {
  teamId: string
  teamName: string
  onBack: () => void
}

export function TeamDetail({ teamId, teamName, onBack }: Props) {
  const [timeline, setTimeline] = useState<LegTimelineItem[]>([])
  const [pollError, setPollError] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState<number | null>(null)
  const lastUpdatedRef = useRef<Date | null>(null)

  useEffect(() => {
    async function poll() {
      try {
        const data = await api.get<LegTimelineItem[]>(`/teams/${teamId}/timeline`)
        setTimeline(data)
        lastUpdatedRef.current = new Date()
        setSecondsSinceUpdate(0)
        setPollError(false)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : ''
        if (msg.includes('→ 404')) {
          setNotFound(true)
        } else {
          setPollError(true)
        }
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
  }, [teamId])

  function handleShare() {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({ title: teamName, url })
    } else {
      navigator.clipboard.writeText(url)
    }
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        <div className="p-4">
          <button onClick={onBack} className="text-gray-400 text-sm hover:text-white">
            ← All Teams
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400">Team not found.</p>
        </div>
      </div>
    )
  }

  const activeItem = timeline.find(t => t.status === 'in-progress')

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="flex items-center gap-3 p-4 border-b border-gray-800">
        <button
          onClick={onBack}
          className="text-gray-400 text-sm hover:text-white min-h-[44px] flex items-center"
        >
          ← All Teams
        </button>
        <h1 className="flex-1 text-center font-bold text-base">{teamName}</h1>
        <button
          onClick={handleShare}
          className="text-sm text-gray-400 hover:text-white min-h-[44px] flex items-center justify-end"
        >
          Share
        </button>
      </div>

      <div className="p-4 max-w-3xl mx-auto">
        <p className="text-xs text-gray-500 mb-4">
          {pollError
            ? 'Unable to refresh — check connection'
            : secondsSinceUpdate !== null
              ? `Updated ${secondsSinceUpdate}s ago`
              : 'Loading...'}
        </p>

        {activeItem && activeItem.runner && activeItem.eta && (
          <div className={`rounded-xl p-4 mb-5 border ${
            activeItem.eta.status === 'overdue'
              ? 'bg-amber-950 border-amber-500'
              : 'bg-green-950 border-green-500'
          }`}>
            <div className={`text-xs font-semibold uppercase tracking-wide mb-1 ${
              activeItem.eta.status === 'overdue' ? 'text-amber-400' : 'text-green-400'
            }`}>
              Now on course
            </div>
            <div className="text-base font-bold text-white">
              {activeItem.runner.name} · Leg {activeItem.leg.legNumber} · {activeItem.leg.name}
            </div>
            <div className="text-sm text-gray-300 mb-2">{activeItem.leg.distanceMiles} mi</div>
            <div className="flex items-center gap-3">
              <span className={`text-xl font-bold ${
                activeItem.eta.status === 'overdue' ? 'text-amber-400' : 'text-green-400'
              }`}>
                {formatTime(String(activeItem.eta.eta))}
              </span>
              <span className={`text-sm px-2 py-0.5 rounded-full ${
                activeItem.eta.status === 'overdue'
                  ? 'bg-amber-900 text-amber-300'
                  : 'bg-green-900 text-green-300'
              }`}>
                {activeItem.eta.status === 'overdue' ? 'overdue'
                  : activeItem.eta.status === 'ahead' ? 'ahead'
                  : 'on pace'}
              </span>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">All Legs</div>

        {timeline.length === 0 ? (
          <p className="text-gray-500 text-sm">No assignments yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {timeline.map(item => (
              <div
                key={item.leg.id}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 ${
                  item.status === 'in-progress'
                    ? item.eta?.status === 'overdue'
                      ? 'bg-amber-950 border border-amber-700'
                      : 'bg-green-950 border border-green-700'
                    : item.status === 'completed'
                      ? 'bg-gray-800 opacity-60'
                      : 'bg-gray-800 opacity-40'
                }`}
              >
                <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs ${
                  item.status === 'completed'
                    ? 'bg-gray-600 text-gray-300'
                    : item.status === 'in-progress'
                      ? item.eta?.status === 'overdue'
                        ? 'bg-amber-500 text-black'
                        : 'bg-green-500 text-black'
                      : 'border border-gray-600'
                }`}>
                  {item.status === 'completed' ? '✓' : item.status === 'in-progress' ? '▶' : ''}
                </div>

                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${
                    item.status === 'not-started' ? 'text-gray-500' : 'text-white'
                  }`}>
                    Leg {item.leg.legNumber} · {item.runner?.name ?? '—'}
                  </div>
                  <div className="text-xs text-gray-500">{item.leg.distanceMiles} mi</div>
                </div>

                <div className="text-right flex-shrink-0">
                  {item.status === 'completed' && item.result?.finishedAt ? (
                    <span className="text-xs text-gray-400">{formatTime(item.result.finishedAt)}</span>
                  ) : item.status === 'in-progress' && item.eta ? (
                    <span className={`text-sm font-bold ${
                      item.eta.status === 'overdue' ? 'text-amber-400' : 'text-green-400'
                    }`}>
                      {formatTime(String(item.eta.eta))}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-600">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
