import { useState, useEffect, useMemo } from 'react'
import { COURSE_LEGS, TOTAL_COURSE_MILES, LEG_DIFFICULTY, mapPoint, mapRoute } from '@kt82/shared'
import type { CourseLeg } from '@kt82/shared'
import { formatRaceTime, formatTime } from '../api'
import type { LegTimelineItem } from '../api'

interface CourseScreenProps {
  currentLegNumber: number   // 0 = not started; >18 = all done
  raceStartedAt: string | null
  teamName: string
  backLabel?: string
  onBack?: () => void        // absent = embedded mode (no top bar / title)
  timeline?: LegTimelineItem[]
  assignedStartTime?: Date
}

function fmtMs(ms: number): string {
  return formatTime(new Date(ms).toISOString())
}

function MapPin({ color }: { color: string }) {
  return (
    <svg width="13" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path d="M12 2C8.1 2 5 5.1 5 9c0 4.9 7 13 7 13s7-8.1 7-13c0-3.9-3.1-7-7-7z" fill={color} />
      <circle cx="12" cy="9" r="2.6" fill="rgba(0,0,0,0.55)" />
    </svg>
  )
}

function MapLink({ kind, name, url, dotColor, nameColor, filled }: {
  kind: 'start' | 'finish'
  name: string
  url: string
  dotColor: string
  nameColor: string
  filled: boolean
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      style={{ display: 'grid', gridTemplateColumns: '12px 1fr auto', alignItems: 'center',
        columnGap: 10, textDecoration: 'none', color: 'inherit', padding: '3px 0', minHeight: 44 }}
    >
      <span style={{ width: 9, height: 9, borderRadius: '50%', justifySelf: 'center',
        background: filled ? dotColor : 'transparent', border: `2px solid ${dotColor}` }} />
      <span style={{ minWidth: 0 }}>
        <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 8.5,
          letterSpacing: '0.14em', color: 'var(--faint)', display: 'block', textTransform: 'uppercase' }}>
          {kind === 'start' ? 'START' : 'FINISH'}
        </span>
        <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 14.5,
          lineHeight: 1.12, color: nameColor, display: 'block' }}>
          {name}
        </span>
      </span>
      <MapPin color={dotColor} />
    </a>
  )
}

function DiffChip({ legNumber }: { legNumber: number }) {
  const diff = LEG_DIFFICULTY[legNumber]
  const c = diff.tier === 'easy' ? 'var(--green)' : diff.tier === 'medium' ? 'var(--amber)' : 'var(--red)'
  const label = diff.tier === 'easy' ? 'EASY' : diff.tier === 'medium' ? 'MEDIUM' : 'DIFFICULT'
  const noteLabel = diff.note === 'distance' ? 'DISTANCE' : diff.note === 'single-track' ? 'SINGLE TRACK' : null
  return (
    <div style={{ textAlign: 'right' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5,
        fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 9,
        letterSpacing: '0.06em', color: c,
        background: `color-mix(in srgb, ${c} 13%, transparent)`,
        padding: '4px 8px', borderRadius: 999, whiteSpace: 'nowrap' }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: c }} />
        {label}
      </span>
      {noteLabel && (
        <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 8.5,
          letterSpacing: '0.04em', color: 'var(--faint)', marginTop: 4, textTransform: 'uppercase' }}>
          {noteLabel}
        </div>
      )}
    </div>
  )
}

function LegRow({ leg, state, isNextUp, isLast, runnerName, startTime, endTime, endLabel }: {
  leg: CourseLeg
  state: 'done' | 'now' | 'upcoming'
  isNextUp: boolean
  isLast: boolean
  runnerName?: string | null
  startTime?: string | null
  endTime?: string | null
  endLabel?: 'Finish' | 'ETA'
}) {
  const isDone = state === 'done'
  const isNow  = state === 'now'

  const stripeColor  = isNow ? 'var(--accent)' : isDone ? 'var(--green)' : 'var(--line)'
  const rowBg        = isNow ? 'color-mix(in srgb, var(--accent) 11%, transparent)'
                     : isDone ? 'color-mix(in srgb, var(--green) 6%, transparent)'
                     : 'transparent'
  const legNumColor  = isNow ? 'var(--accent)' : isDone ? 'var(--mut)' : 'var(--faint)'
  const nameColor    = isNow ? 'var(--accent)' : isDone ? 'var(--mut)' : 'var(--text)'
  const dotColor     = isNow ? 'var(--accent)' : isDone ? 'var(--green)' : 'var(--faint)'
  const mapNameColor = isDone ? 'var(--mut)' : 'var(--text)'

  return (
    <div style={{ position: 'relative', display: 'grid',
      gridTemplateColumns: '40px 1fr auto',
      gridTemplateRows: 'auto auto',
      columnGap: 12, padding: '13px 12px 13px 16px', background: rowBg,
      borderRadius: isNow ? 16 : isDone ? 12 : 0,
      border: isNow ? '1px solid var(--accent)' : 'none',
      borderBottom: (isNow || isDone || isLast) ? 'none' : '1px solid var(--line2)' }}>

      {/* Left status stripe */}
      <div style={{ position: 'absolute', left: 0,
        top: (isNow || isDone) ? 6 : 0, bottom: (isNow || isDone) ? 6 : 0,
        width: 3, borderRadius: 3, background: stripeColor }} />

      {/* Col 1, rows 1+2: leg number + state badge */}
      <div style={{ gridColumn: 1, gridRow: '1 / 3', textAlign: 'center', paddingTop: 2 }}>
        <div style={{ fontFamily: "'Anton', sans-serif", fontSize: 30, lineHeight: 0.8, color: legNumColor }}>
          {String(leg.legNumber).padStart(2, '0')}
        </div>
        {isNow && (
          <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 7.5,
            letterSpacing: '0.1em', color: 'var(--ink)', background: 'var(--accent)',
            borderRadius: 20, padding: '2px 0', marginTop: 5 }}>
            LIVE
          </div>
        )}
        {isDone && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 5,
            fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 7.5,
            letterSpacing: '0.08em', color: 'var(--green)' }}>
            <span style={{ width: 13, height: 13, borderRadius: '50%', background: 'var(--green)',
              color: 'var(--ink)', display: 'inline-flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 9 }}>✓</span>
            DONE
          </div>
        )}
        {isNextUp && (
          <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 7.5,
            letterSpacing: '0.08em', color: 'var(--accent)',
            border: '1px solid var(--accent)', borderRadius: 20, padding: '2px 0', marginTop: 5 }}>
            NEXT
          </div>
        )}
      </div>

      {/* Cols 2–3, row 1: runner name + difficulty chip */}
      <div style={{ gridColumn: '2 / 4', gridRow: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        paddingBottom: 7 }}>
        <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, fontWeight: 800,
          color: runnerName ? nameColor : 'var(--faint)' }}>
          {runnerName ?? '—'}
        </span>
        <DiffChip legNumber={leg.legNumber} />
      </div>

      {/* Col 2, row 2: start → finish map links */}
      <div style={{ gridColumn: 2, gridRow: 2, minWidth: 0 }}>
        <MapLink kind="start" name={leg.startName}
          url={mapPoint(leg.startLat, leg.startLng)}
          dotColor={dotColor} nameColor={mapNameColor} filled={false} />
        <div style={{ width: 2, height: 9, marginLeft: 5,
          background: isDone ? 'color-mix(in srgb, var(--green) 40%, transparent)' : 'var(--line)' }} />
        <MapLink kind="finish" name={leg.endName}
          url={mapPoint(leg.endLat, leg.endLng)}
          dotColor={dotColor} nameColor={mapNameColor} filled={isNow || isDone} />
        <a
          href={mapRoute({ lat: leg.startLat, lng: leg.startLng }, { lat: leg.endLat, lng: leg.endLng })}
          target="_blank" rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 7,
            textDecoration: 'none', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800,
            fontSize: 9.5, letterSpacing: '0.08em', color: isNow ? 'var(--accent)' : 'var(--mut)',
            minHeight: 44 }}>
          FULL DIRECTIONS <span style={{ fontSize: 11 }}>↗</span>
        </a>
      </div>

      {/* Col 3, row 2: start time + ETA/finish time */}
      <div style={{ gridColumn: 3, gridRow: 2,
        display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 1, minWidth: 58 }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 8,
            letterSpacing: '0.12em', color: 'var(--faint)', textTransform: 'uppercase' }}>Start</div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14,
            color: isNow ? 'var(--green)' : 'var(--mut)', lineHeight: 1.1 }}>
            {startTime ?? '—'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 8,
            letterSpacing: '0.12em', color: 'var(--faint)', textTransform: 'uppercase' }}>
            {endLabel ?? 'ETA'}
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14,
            color: isNow ? 'var(--accent)' : 'var(--mut)', lineHeight: 1.1 }}>
            {endTime ?? '—'}
          </div>
        </div>
      </div>
    </div>
  )
}

export function CourseScreen({ currentLegNumber, raceStartedAt, teamName, backLabel, onBack, timeline, assignedStartTime }: CourseScreenProps) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!raceStartedAt) return
    const id = setInterval(() => setTick(t => t + 1), 1_000)
    return () => clearInterval(id)
  }, [raceStartedAt])

  void tick

  type LegData = { runnerName: string | null; startTime: string | null; endTime: string | null; endLabel: 'Finish' | 'ETA' }

  const legDataMap = useMemo<Map<number, LegData>>(() => {
    const map = new Map<number, LegData>()
    if (!timeline?.length) return map

    const sorted = [...timeline].sort((a, b) => a.leg.legNumber - b.leg.legNumber)

    for (const item of sorted) {
      const runnerName = item.runner?.name ?? null
      if (item.status === 'completed' && item.result?.startedAt && item.result?.finishedAt) {
        map.set(item.leg.legNumber, {
          runnerName,
          startTime: formatTime(item.result.startedAt),
          endTime: formatTime(item.result.finishedAt),
          endLabel: 'Finish',
        })
      } else if (item.status === 'in-progress' && item.result?.startedAt && item.eta?.eta) {
        map.set(item.leg.legNumber, {
          runnerName,
          startTime: formatTime(item.result.startedAt),
          endTime: `~${formatTime(String(item.eta.eta))}`,
          endLabel: 'ETA',
        })
      } else {
        map.set(item.leg.legNumber, { runnerName, startTime: null, endTime: null, endLabel: 'ETA' })
      }
    }

    // Project start + end times for not-started legs
    const activeItem = sorted.find(t => t.status === 'in-progress')
    const anchorDate = activeItem?.eta?.eta
      ? new Date(String(activeItem.eta.eta))
      : assignedStartTime ?? null

    if (anchorDate) {
      let anchor = anchorDate.getTime()
      for (const item of sorted.filter(t => t.status === 'not-started')) {
        if (!item.assignment) continue
        const startMs = anchor
        const durationMs = item.assignment.targetPaceSecPerMile * item.leg.distanceMiles * 1000
        anchor = startMs + durationMs
        const existing = map.get(item.leg.legNumber)
        map.set(item.leg.legNumber, {
          runnerName: existing?.runnerName ?? null,
          startTime: `~${fmtMs(startMs)}`,
          endTime: `~${fmtMs(anchor)}`,
          endLabel: 'ETA',
        })
      }
    }

    return map
  }, [timeline, assignedStartTime])

  const milesDone  = Math.round(COURSE_LEGS.filter(l => l.legNumber < currentLegNumber).reduce((s, l) => s + l.miles, 0) * 10) / 10
  const pct        = Math.min(100, Math.round((milesDone / TOTAL_COURSE_MILES) * 100))
  const doneCount  = Math.max(0, currentLegNumber - 1)
  const toGo       = Math.max(0, COURSE_LEGS.length - currentLegNumber)
  const curLeg     = COURSE_LEGS.find(l => l.legNumber === currentLegNumber) ?? COURSE_LEGS[0]
  const raceElapsedMs = raceStartedAt ? Math.max(0, Date.now() - new Date(raceStartedAt).getTime()) : 0
  const isRacing   = raceStartedAt !== null && currentLegNumber >= 1 && currentLegNumber <= COURSE_LEGS.length

  const activeRunner = timeline?.find(t => t.status === 'in-progress')?.runner?.name ?? null

  const stateOf = (n: number): 'done' | 'now' | 'upcoming' =>
    n < currentLegNumber ? 'done' : n === currentLegNumber ? 'now' : 'upcoming'

  return (
    <div className={onBack ? 'min-h-screen' : ''} style={{ background: 'var(--bg)', color: 'var(--text)',
      fontFamily: "'Hanken Grotesk', sans-serif" }}>

      {/* Top bar — hidden in embedded mode */}
      {onBack && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 18px' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--mut)', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800,
            fontSize: 12, letterSpacing: '0.04em', padding: 0, whiteSpace: 'nowrap', minHeight: 44, minWidth: 44 }}>
            {backLabel}
          </button>
          {isRacing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="live-dot" style={{ width: 7, height: 7, borderRadius: '50%',
                background: 'var(--green)' }} />
              <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 11,
                letterSpacing: '0.1em', color: 'var(--mut)' }}>LIVE</span>
            </div>
          )}
        </div>
      )}

      {/* Title — hidden in embedded mode */}
      {onBack && (
        <div style={{ padding: '4px 18px 0' }}>
          <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 11,
            letterSpacing: '0.14em', color: 'var(--accent)', textTransform: 'uppercase' }}>
            KT82 · Katy Trail Relay{teamName ? ` · ${teamName}` : ''}
          </div>
          <div className="font-display" style={{ fontSize: 50, lineHeight: 0.84,
            textTransform: 'uppercase', marginTop: 8 }}>
            The Course
          </div>
        </div>
      )}

      {/* Race clock + progress (only shown while racing) */}
      {isRacing ? (
        <div style={{ padding: '16px 18px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            marginBottom: 9 }}>
            <div>
              <div className="font-mono" style={{ fontWeight: 700, fontSize: 26, lineHeight: 0.9 }}>
                {formatRaceTime(raceElapsedMs)}
              </div>
              <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 10,
                letterSpacing: '0.12em', color: 'var(--mut)', marginTop: 5, textTransform: 'uppercase' }}>
                Total Race Time
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="font-mono" style={{ fontWeight: 700, fontSize: 16, whiteSpace: 'nowrap' }}>
                LEG {currentLegNumber}
                <span style={{ fontSize: 11, color: 'var(--mut)' }}> / {COURSE_LEGS.length}</span>
              </div>
              <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 10,
                letterSpacing: '0.08em', color: 'var(--faint)', marginTop: 6, whiteSpace: 'nowrap' }}>
                {milesDone} OF {TOTAL_COURSE_MILES} MI
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ position: 'relative', height: 8, borderRadius: 999,
            background: 'var(--line)', overflow: 'visible' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)',
              borderRadius: 999 }} />
            <div style={{ position: 'absolute', top: '50%', left: `${pct}%`,
              transform: 'translate(-50%, -50%)', width: 14, height: 14, borderRadius: '50%',
              background: 'var(--accent)', border: '2.5px solid var(--bg)',
              boxShadow: '0 0 0 2px var(--accent)' }} />
          </div>

          {/* Tally pills */}
          <div style={{ display: 'flex', gap: 7, marginTop: 12, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 9.5,
              letterSpacing: '0.06em', color: 'var(--green)',
              background: 'color-mix(in srgb, var(--green) 11%, transparent)',
              padding: '5px 10px', borderRadius: 999 }}>
              ✓ {doneCount} DONE
            </span>
            <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 9.5,
              letterSpacing: '0.06em', color: 'var(--accent)',
              background: 'color-mix(in srgb, var(--accent) 11%, transparent)',
              padding: '5px 10px', borderRadius: 999 }}>
              ● ON LEG {currentLegNumber}
            </span>
            <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 9.5,
              letterSpacing: '0.06em', color: 'var(--faint)',
              background: 'color-mix(in srgb, var(--faint) 11%, transparent)',
              padding: '5px 10px', borderRadius: 999 }}>
              {toGo} TO GO
            </span>
          </div>

          {/* Now-running callout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14,
            background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--accent) 33%, transparent)',
            borderRadius: 14, padding: '11px 14px' }}>
            <div className="live-dot" style={{ width: 8, height: 8, borderRadius: '50%',
              background: 'var(--accent)', flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 9.5,
                letterSpacing: '0.12em', color: 'var(--accent)', textTransform: 'uppercase' }}>
                Race in Progress · On Leg {currentLegNumber}
              </div>
              <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 13,
                color: 'var(--text)', marginTop: 3, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeRunner && (
                  <span style={{ fontWeight: 800, color: 'var(--accent)' }}>{activeRunner} · </span>
                )}
                {curLeg.startName} → {curLeg.endName}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '16px 18px 18px' }}>
          <p style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13, color: 'var(--mut)' }}>
            Race not started.
          </p>
        </div>
      )}

      {/* Leg list */}
      <div style={{ padding: '0 8px 36px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {COURSE_LEGS.map((leg, i) => {
          const data = legDataMap.get(leg.legNumber)
          return (
            <LegRow
              key={leg.legNumber}
              leg={leg}
              state={stateOf(leg.legNumber)}
              isNextUp={leg.legNumber === currentLegNumber + 1}
              isLast={i === COURSE_LEGS.length - 1}
              runnerName={data?.runnerName}
              startTime={data?.startTime}
              endTime={data?.endTime}
              endLabel={data?.endLabel}
            />
          )
        })}
      </div>
    </div>
  )
}
