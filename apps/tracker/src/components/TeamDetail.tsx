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
  const notFoundRef = useRef(false)

  useEffect(() => {
    async function poll() {
      if (notFoundRef.current) return
      try {
        const data = await api.get<LegTimelineItem[]>(`/teams/${teamId}/timeline`)
        setTimeline(data)
        lastUpdatedRef.current = new Date()
        setSecondsSinceUpdate(0)
        setPollError(false)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : ''
        if (msg.includes('→ 404')) {
          notFoundRef.current = true
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
      <div className="min-h-screen flex flex-col" style={{background:'var(--bg)', color:'var(--text)'}}>
        <div className="p-4">
          <button onClick={onBack} className="text-sm min-h-[44px] flex items-center" style={{color:'var(--muted)'}}>
            ← All Teams
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p style={{color:'var(--muted)'}}>Team not found.</p>
        </div>
      </div>
    )
  }

  const activeItem = timeline.find(t => t.status === 'in-progress')

  return (
    <div className="min-h-screen" style={{background:'var(--bg)', color:'var(--text)'}}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3" style={{borderBottom:'1px solid var(--border)'}}>
        <button onClick={onBack} className="text-sm min-h-[44px] flex items-center" style={{color:'var(--muted)'}}>
          ← All Teams
        </button>
        <span className="font-display text-xl font-bold">{teamName}</span>
        <button onClick={handleShare} className="text-sm min-h-[44px] flex items-center" style={{color:'var(--muted)'}}>
          Share
        </button>
      </div>

      <div className="p-4 max-w-3xl mx-auto">
        {/* Staleness */}
        <p className="text-xs mb-5" style={{color:'var(--faint)'}}>
          {pollError
            ? 'Unable to refresh — check connection'
            : secondsSinceUpdate !== null
              ? `Updated ${secondsSinceUpdate}s ago`
              : 'Loading...'}
        </p>

        {/* Hero card */}
        {activeItem && activeItem.runner && activeItem.eta && (
          <div
            className={`rounded-2xl p-5 mb-6 ${activeItem.eta.status === 'overdue' ? 'glow-amber' : 'glow-green'}`}
            style={{
              background: activeItem.eta.status === 'overdue' ? 'var(--amber-bg)' : 'var(--green-bg)',
              border: `1px solid ${activeItem.eta.status === 'overdue' ? 'var(--amber-dim)' : 'var(--green-dim)'}`,
            }}
          >
            <div className="font-display text-xs font-semibold uppercase tracking-widest mb-3"
              style={{color: activeItem.eta.status === 'overdue' ? 'var(--amber)' : 'var(--green)'}}>
              Now on course
            </div>
            <div className="font-display text-3xl font-bold leading-none mb-1" style={{color:'var(--text)'}}>
              {activeItem.runner.name}
            </div>
            <div className="text-sm mb-4" style={{color:'var(--muted)'}}>
              Leg {activeItem.leg.legNumber} · {activeItem.leg.name} · {activeItem.leg.distanceMiles} mi
            </div>
            <div className="flex items-end gap-3 mb-4">
              <span className="font-display text-5xl font-bold leading-none"
                style={{color: activeItem.eta.status === 'overdue' ? 'var(--amber)' : 'var(--green)'}}>
                {formatTime(String(activeItem.eta.eta))}
              </span>
              <span className="font-display text-sm font-semibold uppercase tracking-wide mb-1 px-2 py-0.5 rounded"
                style={{
                  background: activeItem.eta.status === 'overdue' ? 'rgba(245,158,11,0.15)' : 'rgba(34,197,94,0.15)',
                  color: activeItem.eta.status === 'overdue' ? 'var(--amber)' : 'var(--green)',
                }}>
                {activeItem.eta.status === 'overdue' ? 'Overdue' : activeItem.eta.status === 'ahead' ? 'Ahead' : 'On pace'}
              </span>
            </div>
            {activeItem.leg.handoff && (
              <div className="flex items-center gap-3 pt-3"
                style={{borderTop:`1px solid ${activeItem.eta.status === 'overdue' ? 'var(--amber-dim)' : 'var(--green-dim)'}`}}>
                <span className="text-sm flex-1" style={{color:'var(--text)'}}>
                  → {activeItem.leg.handoff.name}
                </span>
                {activeItem.leg.handoff.lat != null && activeItem.leg.handoff.lng != null && (
                  <a
                    href={`https://maps.apple.com/?daddr=${activeItem.leg.handoff.lat},${activeItem.leg.handoff.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="text-sm font-medium px-3 py-1.5 rounded-lg min-h-[36px] flex items-center"
                    style={{background:'rgba(96,165,250,0.12)', color:'var(--blue)', border:'1px solid rgba(96,165,250,0.25)'}}
                  >
                    Meet here ↗
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* Timeline */}
        <div className="font-display text-xs font-semibold uppercase tracking-widest mb-4" style={{color:'var(--faint)'}}>
          All Legs
        </div>

        {timeline.length === 0 ? (
          <p className="text-sm" style={{color:'var(--muted)'}}>No assignments yet.</p>
        ) : (
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute left-[9px] top-3 bottom-3 w-px" style={{background:'var(--border)'}} />
            <div className="flex flex-col gap-1">
              {timeline.map(item => {
                const isActive = item.status === 'in-progress'
                const isDone = item.status === 'completed'
                const isOverdue = item.eta?.status === 'overdue'
                return (
                  <div key={item.leg.id}
                    className="flex items-start gap-3 py-2.5 px-3 rounded-lg"
                    style={{
                      opacity: isDone ? 0.45 : 1,
                      background: isActive ? (isOverdue ? 'var(--amber-bg)' : 'var(--green-bg)') : 'transparent',
                    }}>
                    {/* Status dot */}
                    <div className="mt-0.5 flex-shrink-0 w-5 flex justify-center">
                      {isDone ? (
                        <div className="w-2 h-2 rounded-full mt-1" style={{background:'var(--faint)'}} />
                      ) : isActive ? (
                        <div className="relative w-3 h-3 mt-0.5">
                          <div className="absolute inset-0 rounded-full"
                            style={{background: isOverdue ? 'var(--amber)' : 'var(--green)'}} />
                          <div className="absolute -inset-1 rounded-full opacity-30 live-dot"
                            style={{background: isOverdue ? 'var(--amber)' : 'var(--green)'}} />
                        </div>
                      ) : (
                        <div className="w-2 h-2 rounded-full mt-1" style={{border:'1px solid var(--faint)'}} />
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-display font-semibold text-base leading-tight"
                          style={{color: item.status === 'not-started' ? 'var(--faint)' : 'var(--text)'}}>
                          {item.runner?.name ?? '—'}
                        </span>
                        <span className="font-display font-semibold text-base flex-shrink-0"
                          style={{color: isActive ? (isOverdue ? 'var(--amber)' : 'var(--green)') : 'var(--muted)'}}>
                          {isDone && item.result?.finishedAt
                            ? formatTime(item.result.finishedAt)
                            : isActive && item.eta
                              ? formatTime(String(item.eta.eta))
                              : '—'}
                        </span>
                      </div>
                      <div className="text-xs mt-0.5" style={{color:'var(--faint)'}}>
                        Leg {item.leg.legNumber} · {item.leg.distanceMiles} mi
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
