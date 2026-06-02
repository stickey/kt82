import { useState, useEffect, useRef } from 'react'
import { api, formatTime } from '../api'
import type { Race, TeamStatus } from '../api'

interface Props {
  race: Race
  onTeamClick: (teamId: string, teamName: string) => void
}

function statusColor(s: 'on-pace' | 'ahead' | 'overdue'): string {
  return s === 'overdue' ? 'var(--red)' : 'var(--green)'
}
function statusLabel(s: 'on-pace' | 'ahead' | 'overdue'): string {
  if (s === 'overdue') return 'BEHIND PACE'
  if (s === 'ahead')   return 'AHEAD'
  return 'ON PACE'
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
    return () => { clearInterval(pollId); clearInterval(tickId) }
  }, [race.id])

  const raceDate = new Date(race.date).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  }).toUpperCase()

  const sorted = [...statuses].sort((a, b) => {
    const aDone = a.currentLeg ? a.currentLeg.legNumber - 1 : -1
    const bDone = b.currentLeg ? b.currentLeg.legNumber - 1 : -1
    if (bDone !== aDone) return bDone - aDone
    // tie-break: earlier ETA wins
    const aEta = a.eta?.eta ? new Date(a.eta.eta).getTime() : Infinity
    const bEta = b.eta?.eta ? new Date(b.eta.eta).getTime() : Infinity
    return aEta - bEta
  })

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <div className="max-w-2xl mx-auto px-[18px] pt-[18px] pb-8">

        {/* Header */}
        <div className="mb-5">
          <h1 className="font-display uppercase leading-none" style={{ fontSize: 50, letterSpacing: '0.01em' }}>
            KT82
          </h1>
          <p className="mt-1 uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--accent)' }}>
            {race.name} · {raceDate}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--mut)' }}>
              {statuses.length} Teams on Course
            </span>
            {pollError ? (
              <span style={{ fontSize: 11, color: 'var(--amber)' }}>⚠ Unable to refresh</span>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="live-dot inline-block flex-shrink-0" style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }} />
                <span className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--green)' }}>Live</span>
                {secondsSinceUpdate !== null && secondsSinceUpdate > 0 && (
                  <span className="font-mono" style={{ fontSize: 11, color: 'var(--faint)' }}>
                    · {secondsSinceUpdate}s ago
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Team cards */}
        {statuses.length === 0 && !pollError ? (
          <p style={{ fontSize: 13, color: 'var(--mut)' }}>No teams yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {sorted.map((s, idx) => {
              const isActive   = s.status === 'in-progress'
              const isLeading  = idx === 0 && isActive
              const etaStatus  = s.eta?.status ?? 'on-pace'
              const sColor     = isActive ? statusColor(etaStatus) : 'var(--faint)'
              const legsDone   = s.currentLeg ? s.currentLeg.legNumber - 1 : 0
              const progress   = Math.min(legsDone / 18, 1)

              return (
                <button
                  key={s.team.id}
                  onClick={() => onTeamClick(s.team.id, s.team.name)}
                  className="card-hover w-full text-left flex overflow-hidden"
                  style={{
                    background: 'var(--panel)',
                    border: `1px solid ${isLeading ? 'var(--accent)' : 'var(--line)'}`,
                    borderRadius: 18,
                    minHeight: 44,
                  }}
                >
                  {/* Status stripe */}
                  <div style={{ width: 6, flexShrink: 0, background: sColor, alignSelf: 'stretch' }} />

                  {/* Card body */}
                  <div style={{ flex: 1, padding: '14px 16px', minWidth: 0 }}>
                    {/* Top: rank + name + status pill */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isLeading && (
                          <span className="font-display flex-shrink-0" style={{ fontSize: 18, color: 'var(--accent)', lineHeight: 1 }}>1</span>
                        )}
                        <span className="font-display uppercase truncate" style={{ fontSize: 28, lineHeight: 0.9, color: isActive ? 'var(--text)' : 'var(--mut)' }}>
                          {s.team.name}
                        </span>
                      </div>
                      {isActive && s.eta && (
                        <span className="flex-shrink-0 uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em', padding: '3px 8px', borderRadius: 999, background: sColor, color: 'var(--ink)' }}>
                          {statusLabel(etaStatus)}
                        </span>
                      )}
                    </div>

                    {/* Mid + bottom (active teams only) */}
                    {isActive && s.currentLeg && (
                      <>
                        <div className="flex items-baseline justify-between gap-2 mt-1">
                          <span className="truncate" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 12.5, color: 'var(--mut)' }}>
                            Leg {s.currentLeg.legNumber}
                            {s.currentRunner ? ` · ${s.currentRunner.name}` : ''}
                            {s.nextHandoff ? ` → ${s.nextHandoff.name}` : ''}
                          </span>
                          {s.eta && (
                            <span className="font-mono flex-shrink-0" style={{ fontSize: 16, color: sColor }}>
                              {formatTime(s.eta.eta)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <div style={{ flex: 1, height: 4, background: 'var(--line)', borderRadius: 999, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.round(progress * 100)}%`, background: sColor, borderRadius: 999 }} />
                          </div>
                          <span className="font-mono flex-shrink-0" style={{ fontSize: 11, color: 'var(--faint)' }}>
                            Leg {legsDone} of 18
                          </span>
                        </div>
                      </>
                    )}

                    {!isActive && (
                      <p className="mt-1" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 12, color: 'var(--faint)' }}>
                        Not started
                      </p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
