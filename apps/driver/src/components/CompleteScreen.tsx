import { useState, useEffect } from 'react'
import { createDriverApi, formatElapsed, formatDuration, formatPace } from '../api'
import type { Race, TeamSummary, LegTimelineItem } from '../api'

interface Props {
  race: Race
  team: TeamSummary
  pin: string
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

export function CompleteScreen({ race: _race, team, pin }: Props) {
  const [items, setItems] = useState<LegTimelineItem[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    createDriverApi(pin)
      .get<LegTimelineItem[]>(`/teams/${team.id}/timeline`)
      .then(setItems)
      .catch(() => setError('Could not load results'))
  }, [pin, team.id])

  const completed = items.filter(i => i.status === 'completed' && i.result?.startedAt && i.result?.finishedAt)

  const totalMs = completed.length === 0 ? null : (() => {
    const starts = completed.map(i => new Date(i.result!.startedAt).getTime())
    const ends   = completed.map(i => new Date(i.result!.finishedAt!).getTime())
    return Math.max(...ends) - Math.min(...starts)
  })()

  const finishedAt = completed.length > 0
    ? new Date(Math.max(...completed.map(i => new Date(i.result!.finishedAt!).getTime())))
    : null

  const sorted = [...items]
    .filter(i => i.assignment !== null)
    .sort((a, b) => a.leg.legNumber - b.leg.legNumber)

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-[18px] py-3" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="flex items-center gap-2">
          <div style={{ width: 18, height: 18, background: 'var(--accent)', borderRadius: 4, flexShrink: 0 }} />
          <span className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: '0.04em' }}>
            {team.name}
          </span>
        </div>
        <span className="font-mono" style={{ fontSize: 12, color: 'var(--green)' }}>Finished ✓</span>
      </div>

      {/* Body */}
      <div className="px-[18px] pt-5 pb-10">

        {/* Race complete header */}
        <div className="mb-6">
          <p className="uppercase mb-1" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--green)' }}>
            Race Complete
          </p>
          {totalMs !== null ? (
            <div className="font-mono" style={{ fontSize: 56, fontWeight: 700, lineHeight: 1 }}>
              {formatElapsed(totalMs)}
            </div>
          ) : (
            <div className="font-mono" style={{ fontSize: 56, color: 'var(--faint)', lineHeight: 1 }}>—</div>
          )}
          <p className="mt-2" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13, color: 'var(--mut)' }}>
            {completed.length} of {items.filter(i => i.assignment).length} legs
            {finishedAt ? ` · finished ${finishedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : ''}
          </p>
        </div>

        {error && <p style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{error}</p>}

        {/* Splits */}
        <div className="font-display uppercase mb-3" style={{ fontSize: 22 }}>Splits</div>

        <div className="flex flex-col">
          {sorted.map(item => {
            const hasResult   = item.result?.startedAt && item.result?.finishedAt
            const elapsedMs   = hasResult
              ? new Date(item.result!.finishedAt!).getTime() - new Date(item.result!.startedAt).getTime()
              : null
            const actualPace  = elapsedMs && item.leg.distanceMiles > 0
              ? (elapsedMs / 1000) / item.leg.distanceMiles
              : null
            const targetPace  = item.assignment?.targetPaceSecPerMile ?? null
            const deltaSec    = actualPace && targetPace ? targetPace - actualPace : null  // positive = ahead

            return (
              <div
                key={item.leg.id}
                className="flex items-center gap-2.5 py-2"
                style={{ borderBottom: '1px solid var(--line2)' }}
              >
                {/* Leg number */}
                <span className="font-display uppercase flex-shrink-0" style={{ fontSize: 20, color: 'var(--faint)', width: 24, textAlign: 'center', lineHeight: 1 }}>
                  {item.leg.legNumber}
                </span>

                {/* Avatar */}
                <div className="flex items-center justify-center flex-shrink-0" style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--panel2)', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 10, color: 'var(--mut)' }}>
                  {item.runner ? initials(item.runner.name) : '?'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, fontWeight: 800, lineHeight: 1.2 }}>
                    {item.runner?.name ?? '—'}
                  </div>
                  <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, color: 'var(--faint)', marginTop: 1 }}>
                    {item.leg.handoff?.name ?? item.leg.name} · {item.leg.distanceMiles} mi
                  </div>
                </div>

                {/* Time + pace delta */}
                <div className="text-right flex-shrink-0">
                  <div className="font-mono" style={{ fontSize: 15, color: 'var(--mut)' }}>
                    {hasResult ? formatDuration(item.result!.startedAt, item.result!.finishedAt!) : '—'}
                  </div>
                  {actualPace && (
                    <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, color: 'var(--faint)', marginTop: 1 }}>
                      {formatPace(actualPace)}/mi
                      {deltaSec !== null && Math.abs(deltaSec) >= 5 && (
                        <span style={{ marginLeft: 4, color: deltaSec >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {deltaSec >= 0 ? '▲' : '▼'} {formatPace(Math.abs(deltaSec))}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
