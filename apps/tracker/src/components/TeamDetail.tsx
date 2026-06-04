import { useState, useEffect, useRef, useMemo } from 'react'
import { api, formatTime, formatElapsed, formatRaceTime } from '../api'
import type { LegTimelineItem } from '../api'
import { CourseScreen } from './CourseScreen'
import { LegProgressScreen } from './LegProgressScreen'
import { LegMapScreen } from './LegMapScreen'
import { PreRaceScreen } from './PreRaceScreen'
import { COURSE_LEGS } from '@kt82/shared'

interface Props {
  teamId: string
  teamName: string
  raceDate: string
  onBack: () => void
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

function NavPin({ url }: { url: string }) {
  if (!url) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      title="Directions"
      className="flex items-center justify-center flex-shrink-0"
      style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--panel2)', border: '1px solid var(--line)' }}
    >
      <svg width="11" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M12 2C8.1 2 5 5.1 5 9c0 4.9 7 13 7 13s7-8.1 7-13c0-3.9-3.1-7-7-7z" fill="var(--faint)" />
        <circle cx="12" cy="9" r="2.6" fill="var(--panel2)" />
      </svg>
    </a>
  )
}

export function TeamDetail({ teamId, teamName, raceDate, onBack }: Props) {
  const [timeline, setTimeline] = useState<LegTimelineItem[]>([])
  const [pollError, setPollError] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState<number | null>(null)
  const [tick, setTick] = useState(0)
  const lastUpdatedRef = useRef<Date | null>(null)
  const notFoundRef = useRef(false)
  const [showCourse, setShowCourse] = useState(false)
  const [showLegProgress, setShowLegProgress] = useState(false)
  const [showLegMap, setShowLegMap] = useState(false)

  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const startOffsetMs = params.has('startoffset') ? Number(params.get('startoffset')) : null

  const assignedStartTime = useMemo(() => {
    if (startOffsetMs !== null) return new Date(Date.now() + startOffsetMs)
    const d = new Date(raceDate)
    d.setHours(7, 0, 0, 0)
    return d
  }, [startOffsetMs, raceDate])

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
        if (msg.includes('→ 404')) { notFoundRef.current = true; setNotFound(true) }
        else setPollError(true)
      }
    }
    poll()
    const pollId = setInterval(poll, 30_000)
    const tickId = setInterval(() => {
      if (lastUpdatedRef.current) {
        setSecondsSinceUpdate(Math.floor((Date.now() - lastUpdatedRef.current.getTime()) / 1000))
      }
      setTick(t => t + 1)
    }, 1_000)
    return () => { clearInterval(pollId); clearInterval(tickId) }
  }, [teamId])

  function handleShare() {
    const url = window.location.href
    if (navigator.share) navigator.share({ title: teamName, url })
    else navigator.clipboard.writeText(url)
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="p-4">
          <button onClick={onBack} className="flex items-center min-h-[44px]" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--mut)' }}>
            ← All Teams
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p style={{ color: 'var(--mut)' }}>Team not found.</p>
        </div>
      </div>
    )
  }

  const activeItem = timeline.find(t => t.status === 'in-progress')
  const sorted     = [...timeline].sort((a, b) => a.leg.legNumber - b.leg.legNumber)

  // Auto-exit map/progress views when the active leg changes
  const activeResultId = activeItem?.result?.id ?? null
  useEffect(() => {
    setShowLegMap(false)
    setShowLegProgress(false)
  }, [activeResultId])

  // Race timestamps
  const raceStartedAt = sorted.find(t => t.result?.startedAt)?.result?.startedAt ?? null
  const allDone       = timeline.length > 0 && timeline.every(t => t.status === 'completed')
  const raceEndedAts  = allDone ? sorted.map(t => t.result?.finishedAt).filter(Boolean).sort() : []
  const raceEndedAt   = raceEndedAts[raceEndedAts.length - 1] ?? null
  const raceElapsedMs = raceStartedAt
    ? Math.max(0, new Date(raceEndedAt ?? Date.now()).getTime() - new Date(raceStartedAt).getTime())
    : 0
  // re-read tick to force re-render every second
  void tick

  const hasStarted = timeline.some(t => t.status === 'in-progress' || t.status === 'completed')
  const forcePreRace = params.has('prerace') || startOffsetMs !== null
  const startTimeReached = Date.now() >= assignedStartTime.getTime()
  const showPreRace = !hasStarted || (forcePreRace && !startTimeReached)

  // Miles
  const milesDone  = sorted.filter(t => t.status === 'completed').reduce((s, t) => s + t.leg.distanceMiles, 0)
  const totalMiles = sorted.reduce((s, t) => s + t.leg.distanceMiles, 0) || 82
  const milesToGo  = Math.max(0, totalMiles - milesDone)

  // Projected arrival times for not-started legs
  const projectedTimes = new Map<string, Date>()
  if (activeItem?.eta?.eta) {
    let anchor = new Date(String(activeItem.eta.eta))
    for (const item of sorted.filter(t => t.status === 'not-started')) {
      if (!item.assignment) continue
      const durationMs = item.assignment.targetPaceSecPerMile * item.leg.distanceMiles * 1000
      const arrival    = new Date(anchor.getTime() + durationMs)
      projectedTimes.set(item.leg.id, arrival)
      anchor = arrival
    }
  }

  // On-deck: first not-started leg after the active one
  const onDeckItem = activeItem
    ? sorted.find(t => t.status === 'not-started' && t.leg.legNumber > activeItem.leg.legNumber)
    : null

  // Leg time (ticking)
  const legElapsedMs = activeItem?.result?.startedAt
    ? Math.max(0, Date.now() - new Date(activeItem.result.startedAt).getTime())
    : 0

  // Status helpers
  const etaStatus  = activeItem?.eta?.status ?? 'on-pace'
  const heroColor  = etaStatus === 'overdue' ? 'var(--red)' : 'var(--green)'
  const heroBg     = etaStatus === 'overdue' ? '#ff4d2e' : '#37d27a'

  function buildNavUrl(handoff: LegTimelineItem['leg']['handoff']): string {
    if (!handoff) return ''
    if (handoff.lat != null && handoff.lng != null)
      return `https://www.google.com/maps/dir/?api=1&destination=${handoff.lat},${handoff.lng}`
    if (handoff.address)
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(handoff.address)}`
    return ''
  }

  if (showPreRace) return (
    <PreRaceScreen
      teamName={teamName}
      assignedStartTime={assignedStartTime}
      timeline={timeline}
    />
  )

  if (showCourse) return (
    <CourseScreen
      currentLegNumber={allDone ? COURSE_LEGS.length + 1 : (activeItem?.leg.legNumber ?? 0)}
      raceStartedAt={raceStartedAt}
      teamName={teamName}
      backLabel={`← ${teamName}`}
      onBack={() => setShowCourse(false)}
    />
  )

  if (showLegProgress && activeItem && activeItem.runner && activeItem.assignment && activeItem.result) return (
    <LegProgressScreen
      runner={activeItem.runner.name}
      town={activeItem.leg.handoff?.name ?? activeItem.leg.name}
      legN={activeItem.leg.legNumber}
      totalLegs={timeline.length || 18}
      distMiles={activeItem.leg.distanceMiles}
      startedAtMs={new Date(activeItem.result.startedAt).getTime()}
      targetPaceSecPerMile={activeItem.assignment.targetPaceSecPerMile}
      teamName={teamName}
      backLabel={`← ${teamName}`}
      onBack={() => setShowLegProgress(false)}
      onViewLegMap={() => { setShowLegProgress(false); setShowLegMap(true) }}
    />
  )

  if (showLegMap && activeItem && activeItem.runner && activeItem.assignment && activeItem.result) return (
    <LegMapScreen
      runner={activeItem.runner.name}
      town={activeItem.leg.handoff?.name ?? activeItem.leg.name}
      legN={activeItem.leg.legNumber}
      totalLegs={timeline.length || 18}
      distMiles={activeItem.leg.distanceMiles}
      startedAtMs={new Date(activeItem.result.startedAt).getTime()}
      raceStartedAtMs={raceStartedAt ? new Date(raceStartedAt).getTime() : null}
      targetPaceSecPerMile={activeItem.assignment.targetPaceSecPerMile}
      teamName={teamName}
      backLabel={`← ${teamName}`}
      onBack={() => setShowLegMap(false)}
      lastUpdatedMs={lastUpdatedRef.current?.getTime()}
    />
  )

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>

      {/* Top bar */}
      <div className="flex items-center justify-between px-[18px] py-3" style={{ borderBottom: '1px solid var(--line)' }}>
        <button onClick={onBack} className="flex items-center min-h-[44px] uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--mut)' }}>
          ← All Teams
        </button>
        {pollError && <span style={{ fontSize: 11, color: 'var(--amber)' }}>⚠ Unable to refresh</span>}
        {!pollError && secondsSinceUpdate !== null && secondsSinceUpdate > 0 && (
          <span className="font-mono" style={{ fontSize: 11, color: 'var(--faint)' }}>{secondsSinceUpdate}s ago</span>
        )}
        <button onClick={handleShare} className="flex items-center min-h-[44px] uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--mut)' }}>
          Share ↗
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-[18px] pt-4 pb-10">

        {/* Team header + bib */}
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0 flex-1">
            <p className="uppercase mb-1" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--accent)' }}>
              KT82 · Katy Trail Relay
            </p>
            <h1 className="font-display uppercase leading-none" style={{ fontSize: 48 }}>
              {teamName}
            </h1>
          </div>
          {activeItem && (
            <div className="flex-shrink-0 ml-3 text-center" style={{ background: 'var(--accent)', borderRadius: 14, padding: '10px 14px', minWidth: 70 }}>
              <div className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--ink)' }}>Leg</div>
              <div className="font-display leading-none" style={{ fontSize: 38, color: 'var(--ink)' }}>{activeItem.leg.legNumber}</div>
              <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, color: 'rgba(19,17,10,0.55)' }}>of {timeline.length || 18}</div>
            </div>
          )}
        </div>

        {/* Progress + total race time */}
        {raceStartedAt && (
          <div className="mb-4">
            <div className="flex items-baseline justify-between mb-1">
              <div>
                <div className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--faint)' }}>Total Race Time</div>
                <div className="font-mono" style={{ fontSize: 26, fontWeight: 700, color: 'var(--text)', lineHeight: 1.1 }}>
                  {formatRaceTime(raceElapsedMs)}
                </div>
              </div>
              <div className="text-right">
                <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13, color: 'var(--mut)' }}>
                  {milesToGo.toFixed(1)} mi to go
                </div>
                <div className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--faint)', marginTop: 2 }}>
                  {milesDone.toFixed(1)} of {totalMiles.toFixed(0)} mi done
                </div>
              </div>
            </div>
            <div style={{ height: 5, background: 'var(--line)', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min((milesDone / totalMiles) * 100, 100).toFixed(1)}%`, background: 'var(--accent)', borderRadius: 999 }} />
            </div>
          </div>
        )}

        {/* Hero — relay pass */}
        {activeItem && activeItem.runner && activeItem.eta && (
          <div
            className={etaStatus === 'overdue' ? 'glow-red' : 'glow-green'}
            style={{ background: heroBg, borderRadius: 22, padding: 16, marginBottom: 16 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <span className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--ink)' }}>
                Now Running · Leg {activeItem.leg.legNumber}
              </span>
              <span className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em', padding: '3px 9px', borderRadius: 999, background: 'rgba(0,0,0,0.18)', color: 'var(--ink)' }}>
                {etaStatus === 'overdue' ? 'Behind Pace' : etaStatus === 'ahead' ? 'Ahead' : 'On Pace'}
              </span>
            </div>

            {/* Runner name */}
            <div className="font-display uppercase leading-none" style={{ fontSize: 52, color: 'var(--ink)', margin: '6px 0 4px' }}>
              {activeItem.runner.name}
            </div>

            {/* Destination */}
            {activeItem.leg.handoff && (
              <div className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 12.5, fontWeight: 800, letterSpacing: '0.06em', color: 'rgba(19,17,10,0.65)', marginBottom: 12 }}>
                → Heading to {activeItem.leg.handoff.name}
              </div>
            )}

            {/* Three readouts */}
            <div className="flex mb-3">
              <button
                onClick={() => setShowLegProgress(true)}
                style={{ flex: '1 1 0', background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  textAlign: 'center', minHeight: 44, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center' }}
              >
                <div className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(19,17,10,0.55)', marginBottom: 2 }}>Est. Arrival</div>
                <div className="font-mono" style={{ fontSize: 34, fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
                  {formatTime(String(activeItem.eta.eta))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
                  <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 10,
                    opacity: 0.85, letterSpacing: '0.06em', color: 'var(--ink)' }}>BY PACE</span>
                  <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 9,
                    letterSpacing: '0.06em', background: 'rgba(0,0,0,0.18)', padding: '2px 7px',
                    borderRadius: 20, color: 'var(--ink)' }}>→</span>
                </div>
              </button>
              {activeItem.assignment && (
                <button
                  onClick={() => setShowLegMap(true)}
                  style={{
                    flex: '0 0 auto', background: 'none', border: 'none', cursor: 'pointer',
                    padding: '0 12px', textAlign: 'center', minHeight: 44,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    borderLeft: '1px solid rgba(0,0,0,0.15)',
                  }}
                >
                  <div className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(19,17,10,0.55)', marginBottom: 2 }}>Map</div>
                  <div style={{ fontSize: 18 }}>🗺</div>
                </button>
              )}
              <div className="flex-1 text-center" style={{ borderLeft: '1px solid rgba(0,0,0,0.15)' }}>
                <div className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(19,17,10,0.55)', marginBottom: 2 }}>Leg Time</div>
                <div className="font-mono" style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.1 }}>
                  {formatElapsed(legElapsedMs)}
                </div>
              </div>
              <div className="flex-1 text-center" style={{ borderLeft: '1px solid rgba(0,0,0,0.15)' }}>
                <div className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'rgba(19,17,10,0.55)', marginBottom: 2 }}>Distance</div>
                <div className="font-mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>
                  {activeItem.leg.distanceMiles} mi
                </div>
              </div>
            </div>

            {/* Hands off to (on-deck) */}
            {onDeckItem && onDeckItem.runner && (
              <div className="flex items-center gap-2 mb-2" style={{ background: 'rgba(0,0,0,0.16)', borderRadius: 12, padding: '10px 12px' }}>
                <div className="flex items-center justify-center flex-shrink-0" style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.20)', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 13, color: 'var(--ink)' }}>
                  {initials(onDeckItem.runner.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, fontWeight: 800, color: 'var(--ink)' }}>
                    {onDeckItem.runner.name}
                  </div>
                  <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10.5, color: 'rgba(19,17,10,0.60)' }}>
                    Leg {onDeckItem.leg.legNumber} · {onDeckItem.leg.distanceMiles} mi
                    {onDeckItem.leg.handoff ? ` → ${onDeckItem.leg.handoff.name}` : ''}
                  </div>
                </div>
                <span className="uppercase flex-shrink-0" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', background: 'rgba(0,0,0,0.18)', borderRadius: 999, padding: '2px 8px', color: 'var(--ink)' }}>
                  On Deck
                </span>
              </div>
            )}

            {/* Drive to */}
            {activeItem.leg.handoff && buildNavUrl(activeItem.leg.handoff) && (
              <a
                href={buildNavUrl(activeItem.leg.handoff)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className="flex items-center justify-center gap-2"
                style={{ background: 'rgba(0,0,0,0.28)', borderRadius: 12, padding: '11px 14px', textDecoration: 'none' }}
              >
                <svg width="12" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2C8.1 2 5 5.1 5 9c0 4.9 7 13 7 13s7-8.1 7-13c0-3.9-3.1-7-7-7z" fill="var(--ink)" />
                  <circle cx="12" cy="9" r="2.6" fill="rgba(0,0,0,0.3)" />
                </svg>
                <span className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--ink)' }}>
                  Drive to {activeItem.leg.handoff.name} →
                </span>
              </a>
            )}
          </div>
        )}

        {/* The Course */}
        <button
          onClick={() => setShowCourse(true)}
          className="flex items-center justify-between w-full min-h-[44px] mb-0"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
        >
          <span className="font-display uppercase" style={{ fontSize: 24 }}>Arrivals</span>
          <span className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11,
            fontWeight: 800, letterSpacing: '0.08em', color: 'var(--accent)' }}>
            ALL {COURSE_LEGS.length} LEGS →
          </span>
        </button>
        <div className="uppercase mb-3" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10,
          fontWeight: 800, letterSpacing: '0.1em', color: 'var(--faint)' }}>
          {timeline.length} Handoffs
        </div>

        {timeline.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--mut)' }}>No assignments yet.</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {sorted.map(item => {
              const isDone    = item.status === 'completed'
              const isActive  = item.status === 'in-progress'
              const isNext    = onDeckItem?.leg.id === item.leg.id
              const iStatus   = isActive ? (etaStatus === 'overdue' ? 'var(--red)' : 'var(--green)') : 'var(--mut)'
              const navUrl    = buildNavUrl(item.leg.handoff)

              // Delta for done rows
              let deltaLabel: string | null = null
              if (isDone && item.assignment && item.result?.startedAt && item.result?.finishedAt) {
                const actualSec = (new Date(item.result.finishedAt).getTime() - new Date(item.result.startedAt).getTime()) / 1000
                const targetSec = item.assignment.targetPaceSecPerMile * item.leg.distanceMiles
                const deltaSec  = actualSec - targetSec  // positive = slower (behind)
                const deltaMin  = Math.round(Math.abs(deltaSec) / 60)
                if (deltaMin > 0) deltaLabel = deltaSec > 0 ? `+${deltaMin}m` : `-${deltaMin}m`
              }

              return (
                <div
                  key={item.leg.id}
                  className="flex items-center gap-2.5 px-2.5 py-2"
                  style={{
                    borderRadius: 10,
                    opacity: isDone ? 0.4 : 1,
                    background: isActive
                      ? `${heroBg}1e`
                      : 'transparent',
                  }}
                >
                  {/* Leg number */}
                  <span className="font-display uppercase flex-shrink-0 text-center" style={{ fontSize: 20, width: 26, color: isActive ? heroColor : 'var(--faint)', lineHeight: 1 }}>
                    {item.leg.legNumber}
                  </span>

                  {/* Avatar */}
                  <div className="flex items-center justify-center flex-shrink-0" style={{ width: 30, height: 30, borderRadius: '50%', background: isActive ? `${heroBg}40` : 'var(--panel2)', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 10, color: isActive ? heroColor : 'var(--mut)' }}>
                    {item.runner ? initials(item.runner.name) : '?'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 15, fontWeight: 800, color: isActive ? iStatus : isDone ? 'var(--faint)' : 'var(--text)', lineHeight: 1.2 }}>
                      {item.runner?.name ?? '—'}
                    </div>
                    <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, color: 'var(--faint)', marginTop: 1 }}>
                      {item.leg.handoff?.name ?? item.leg.name} · {item.leg.distanceMiles} mi
                    </div>
                  </div>

                  {/* Time + tags */}
                  <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                    {isActive && (
                      <span className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', background: heroColor, color: 'var(--ink)', borderRadius: 999, padding: '2px 6px' }}>Live</span>
                    )}
                    {isNext && (
                      <span className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', border: '1px solid var(--line)', color: 'var(--mut)', borderRadius: 999, padding: '2px 6px' }}>On Deck</span>
                    )}
                    <span className="font-mono" style={{ fontSize: 14, color: isActive ? iStatus : isDone ? 'var(--faint)' : 'var(--mut)' }}>
                      {isDone && item.result?.finishedAt
                        ? formatTime(item.result.finishedAt)
                        : isActive && item.eta
                          ? formatTime(String(item.eta.eta))
                          : projectedTimes.has(item.leg.id)
                            ? `~${formatTime(projectedTimes.get(item.leg.id)!.toISOString())}`
                            : '—'}
                    </span>
                    {deltaLabel && (
                      <span className="font-mono" style={{ fontSize: 10, color: deltaLabel.startsWith('+') ? 'var(--red)' : 'var(--green)' }}>
                        {deltaLabel}
                      </span>
                    )}
                  </div>

                  {/* Nav pin */}
                  <NavPin url={navUrl} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
