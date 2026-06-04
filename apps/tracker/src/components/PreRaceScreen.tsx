import { useState, useEffect, useMemo, Fragment } from 'react'
import type { LegTimelineItem } from '../api'
import { COURSE_LEGS, mapPoint, mapRoute, TOTAL_COURSE_MILES } from '@kt82/shared'

interface Props {
  teamName: string
  assignedStartTime: Date
  timeline: LegTimelineItem[]
}

function prClock(d: Date) {
  const h = d.getHours() % 12 || 12
  const m = d.getMinutes().toString().padStart(2, '0')
  const ap = d.getHours() < 12 ? 'AM' : 'PM'
  return { full: `${h}:${m}`, ap }
}

function prCd(sec: number) {
  sec = Math.max(0, Math.round(sec))
  return {
    h: String(Math.floor(sec / 3600)).padStart(2, '0'),
    m: String(Math.floor((sec % 3600) / 60)).padStart(2, '0'),
    s: String(sec % 60).padStart(2, '0'),
  }
}

function prDate(d: Date) {
  const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const mons = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  return `${days[d.getDay()]} · ${mons[d.getMonth()]} ${d.getDate()}`
}


function MapPin() {
  return (
    <svg width="8.5" height="11" viewBox="0 0 20 25" fill="none">
      <path d="M10 1C5.59 1 2 4.59 2 9c0 5.57 8 15 8 15s8-9.43 8-15c0-4.41-3.59-8-8-8z" fill="currentColor" />
      <circle cx="10" cy="9" r="2.8" fill="var(--panel2)" />
    </svg>
  )
}

interface TrailNodeProps {
  time: Date
  place: string
  kind: 'start' | 'mid' | 'finish'
  mapUrl: string
}

function TrailNode({ time, place, kind, mapUrl }: TrailNodeProps) {
  const c = prClock(time)
  const isStart = kind === 'start'
  const isFinish = kind === 'finish'
  const dotSize = isFinish ? 15 : isStart ? 13 : 9

  return (
    <div style={{ display: 'flex', alignItems: 'stretch', minHeight: 30 }}>
      {/* rail */}
      <div style={{ width: 30, flexShrink: 0, position: 'relative' }}>
        <div style={{
          position: 'absolute', left: '50%', marginLeft: -1,
          top: isStart ? '50%' : 0, bottom: isFinish ? '50%' : 0,
          width: 2, background: 'var(--line)',
        }} />
        <div style={{
          position: 'absolute', left: '50%', top: '50%',
          transform: 'translate(-50%,-50%)',
          width: dotSize, height: dotSize, borderRadius: '50%',
          background: isFinish ? 'var(--accent)' : 'var(--bg)',
          border: isFinish ? 'none' : `2.5px solid ${isStart ? 'var(--accent)' : 'var(--mut)'}`,
          boxShadow: isFinish ? '0 0 0 4px rgba(255,90,31,0.13)' : 'none',
        }} />
      </div>
      {/* content */}
      <a
        href={mapUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        style={{
          flex: 1, minWidth: 0, display: 'flex', alignItems: 'center',
          gap: 8, padding: '5px 0', textDecoration: 'none',
        }}
      >
        <div style={{ width: 62, flexShrink: 0, textAlign: 'right', whiteSpace: 'nowrap' }}>
          <span
            className="font-mono"
            style={{ fontWeight: 700, fontSize: 13.5, color: (isStart || isFinish) ? 'var(--accent)' : 'var(--text)' }}
          >
            {c.full}
          </span>
          <span className="font-mono" style={{ fontSize: 8, color: 'var(--faint)', marginLeft: 2 }}>{c.ap}</span>
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            flex: 1, minWidth: 0, fontWeight: 700, fontSize: 12.5,
            color: isFinish ? 'var(--accent)' : 'var(--text)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {place}
            {isStart && (
              <span style={{ fontWeight: 700, fontSize: 8.5, letterSpacing: '0.1em', color: 'var(--faint)', marginLeft: 7 }}>
                START
              </span>
            )}
            {isFinish && (
              <span style={{
                fontWeight: 800, fontSize: 8, letterSpacing: '0.1em',
                background: 'var(--accent)', color: 'var(--ink)',
                padding: '2px 6px', borderRadius: 20, marginLeft: 7,
              }}>
                FINISH
              </span>
            )}
          </span>
        </div>
      </a>
    </div>
  )
}

interface TrailLegProps {
  legN: number
  runnerName: string | null
  miles: number
  mapUrl: string
}

function TrailLeg({ legN, runnerName, miles, mapUrl }: TrailLegProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'stretch' }}>
      {/* rail (line passes straight through) */}
      <div style={{ width: 30, flexShrink: 0, position: 'relative' }}>
        <div style={{
          position: 'absolute', left: '50%', marginLeft: -1,
          top: 0, bottom: 0, width: 2, background: 'var(--line)',
        }} />
      </div>
      {/* content */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
        <span
          className="font-mono"
          style={{
            flexShrink: 0, fontWeight: 700, fontSize: 8.5, letterSpacing: '0.04em',
            color: 'var(--faint)', border: '1px solid var(--line)', borderRadius: 5, padding: '2px 5px',
          }}
        >
          L{legN}
        </span>
        <span style={{
          flex: 1, minWidth: 0, fontWeight: 700, fontSize: 12.5, color: 'var(--text)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {runnerName ?? '—'}
        </span>
        <span className="font-mono" style={{ flexShrink: 0, fontWeight: 500, fontSize: 10.5, color: 'var(--faint)' }}>
          {miles} mi
        </span>
        <a
          href={mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          title="Open leg route in maps"
          style={{
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 24, height: 24, borderRadius: '50%',
            border: '1px solid var(--line)', background: 'var(--panel2)',
            textDecoration: 'none', color: 'var(--mut)',
          }}
        >
          <MapPin />
        </a>
      </div>
    </div>
  )
}

export function PreRaceScreen({ teamName, assignedStartTime, timeline }: Props) {
  const [nowMs, setNowMs] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const schedule = useMemo(() => {
    let ms = assignedStartTime.getTime()
    return COURSE_LEGS.map(courseLeg => {
      const item = timeline.find(t => t.leg.legNumber === courseLeg.legNumber)
      const legStartMs = ms
      if (item?.assignment) {
        ms += item.assignment.targetPaceSecPerMile * courseLeg.miles * 1000
      }
      return { courseLeg, item, legStartMs, legEndMs: ms }
    })
  }, [assignedStartTime, timeline])

  const finishTime = new Date(schedule[schedule.length - 1].legEndMs)
  const started = nowMs >= assignedStartTime.getTime()
  const cd = prCd((assignedStartTime.getTime() - nowMs) / 1000)
  const sc = prClock(assignedStartTime)
  const fc = prClock(finishTime)

  return (
    <div style={{
      height: '100dvh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Hanken Grotesk', sans-serif",
    }}>

      {/* HEADER */}
      <div style={{ flexShrink: 0, padding: '52px 18px 14px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: '0.15em', color: 'var(--accent)', marginBottom: 8 }}>
          KT82 · KATY TRAIL RELAY
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div
              className="font-display"
              style={{ fontSize: 47, lineHeight: 0.86, textTransform: 'uppercase' }}
            >
              {teamName}
            </div>
            <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--mut)', marginTop: 7, letterSpacing: '0.04em' }}>
              {started ? 'RACE IN PROGRESS' : 'PRE-RACE · ESTIMATES ONLY'}
            </div>
          </div>
          <div style={{
            flexShrink: 0, borderRadius: 14, padding: '9px 13px 11px', textAlign: 'center',
            border: '1px solid var(--line)', background: 'var(--panel)', minWidth: 72,
          }}>
            <div style={{ fontWeight: 800, fontSize: 8.5, letterSpacing: '0.12em', color: 'var(--mut)' }}>YOUR START</div>
            <div className="font-mono" style={{ fontWeight: 700, fontSize: 22, color: 'var(--accent)', lineHeight: 1, marginTop: 5 }}>
              {sc.full}
            </div>
            <div className="font-mono" style={{ fontSize: 10, color: 'var(--mut)', marginTop: 2 }}>{sc.ap}</div>
          </div>
        </div>
      </div>

      {/* COUNTDOWN / FANFARE */}
      <div className="pr-cd-band" style={{
        flexShrink: 0, padding: '15px 18px 14px', textAlign: 'center',
        borderBottom: '1px solid var(--line)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, marginBottom: 9 }}>
          {!started && (
            <span
              className="pr-pulse"
              style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }}
            />
          )}
          <span style={{ fontWeight: 800, fontSize: 9.5, letterSpacing: '0.2em', color: 'var(--accent)' }}>
            {started ? 'RACE IN PROGRESS' : 'RACE STARTS IN'}
          </span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1,
          fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, lineHeight: 1,
        }}>
          {[cd.h, cd.m, cd.s].map((v, i) => (
            <Fragment key={i}>
              <span style={{ fontSize: 50, color: started ? 'var(--green)' : '#fbf6ee', letterSpacing: '0.02em' }}>
                {v}
              </span>
              {i < 2 && (
                <span style={{ fontSize: 38, color: 'var(--accent)', opacity: 0.7, padding: '0 2px', marginTop: -4 }}>
                  :
                </span>
              )}
            </Fragment>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 38, marginTop: 5 }}>
          {['HRS', 'MIN', 'SEC'].map(l => (
            <span key={l} style={{ fontWeight: 700, fontSize: 8.5, letterSpacing: '0.15em', color: 'var(--faint)' }}>
              {l}
            </span>
          ))}
        </div>
        <div style={{ fontWeight: 700, fontSize: 10.5, letterSpacing: '0.08em', color: 'var(--mut)', marginTop: 11 }}>
          {prDate(assignedStartTime)} · GUN AT {sc.full} {sc.ap}
        </div>
      </div>

      {/* HERO: start → finish */}
      <div style={{
        flexShrink: 0, margin: '14px 16px 0', background: 'var(--accent)',
        borderRadius: 18, padding: '15px 18px 13px', color: 'var(--ink)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 8.5, letterSpacing: '0.14em', opacity: 0.75 }}>TEAM START</div>
            <div className="font-mono" style={{ fontWeight: 700, fontSize: 32, lineHeight: 0.9, marginTop: 4 }}>
              {sc.full}<span style={{ fontSize: 15, opacity: 0.9, marginLeft: 3 }}>{sc.ap}</span>
            </div>
          </div>
          <div className="font-display" style={{ opacity: 0.45, fontSize: 20, marginBottom: 4 }}>→</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 800, fontSize: 8.5, letterSpacing: '0.14em', opacity: 0.75 }}>EST. FINISH · HERMANN</div>
            <div className="font-mono" style={{ fontWeight: 700, fontSize: 32, lineHeight: 0.9, marginTop: 4 }}>
              {fc.full}<span style={{ fontSize: 15, opacity: 0.9, marginLeft: 3 }}>{fc.ap}</span>
            </div>
          </div>
        </div>
        <div style={{
          marginTop: 10, paddingTop: 9, borderTop: '1px solid rgba(255,255,255,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontWeight: 700, fontSize: 10.5, opacity: 0.8, letterSpacing: '0.04em' }}>
            {TOTAL_COURSE_MILES.toFixed(1)} MI · {COURSE_LEGS.length} LEGS · 6 RUNNERS
          </span>
          <span style={{
            fontWeight: 800, fontSize: 8.5, letterSpacing: '0.08em',
            background: 'rgba(0,0,0,0.2)', padding: '3px 8px', borderRadius: 20,
          }}>≈ ESTIMATES</span>
        </div>
      </div>

      {/* THE ROUTE */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 24, marginTop: 14 }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 18px 10px',
        }}>
          <span style={{ fontWeight: 800, fontSize: 9.5, letterSpacing: '0.14em', color: 'var(--mut)' }}>
            THE ROUTE
          </span>
          <span style={{ fontWeight: 700, fontSize: 9.5, letterSpacing: '0.06em', color: 'var(--faint)' }}>
            EST. HANDOFF TIMES
          </span>
        </div>

        <div style={{ padding: '0 18px' }}>
          {/* Start node */}
          <TrailNode
            time={assignedStartTime}
            place={COURSE_LEGS[0].startName}
            kind="start"
            mapUrl={mapPoint(COURSE_LEGS[0].startLat, COURSE_LEGS[0].startLng)}
          />

          {/* Interleaved legs + nodes */}
          {schedule.map((s, i) => {
            const isLast = i === schedule.length - 1
            return (
              <Fragment key={s.courseLeg.legNumber}>
                <TrailLeg
                  legN={s.courseLeg.legNumber}
                  runnerName={s.item?.runner?.name ?? null}
                  miles={s.courseLeg.miles}
                  mapUrl={mapRoute(
                    { lat: s.courseLeg.startLat, lng: s.courseLeg.startLng },
                    { lat: s.courseLeg.endLat, lng: s.courseLeg.endLng },
                  )}
                />
                <TrailNode
                  time={new Date(s.legEndMs)}
                  place={s.courseLeg.endName}
                  kind={isLast ? 'finish' : 'mid'}
                  mapUrl={mapPoint(s.courseLeg.endLat, s.courseLeg.endLng)}
                />
              </Fragment>
            )
          })}
        </div>

        <div style={{
          padding: '12px 18px 0', textAlign: 'center',
          fontWeight: 600, fontSize: 10.5, color: 'var(--faint)', lineHeight: 1.5,
        }}>
          Handoff times are estimates from each runner's target pace.<br />
          Live tracking begins the moment your team starts leg 1.
        </div>
      </div>

    </div>
  )
}
