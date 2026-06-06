import { useState, useEffect, useMemo, Fragment } from 'react'
import type { LegTimelineItem } from '../api'
import { COURSE_LEGS, TOTAL_COURSE_MILES } from '@kt82/shared'
import { CourseScreen } from './CourseScreen'

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



export function PreRaceScreen({ teamName, assignedStartTime, timeline }: Props) {
  const [nowMs, setNowMs] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const finishTime = useMemo(() => {
    let ms = assignedStartTime.getTime()
    for (const courseLeg of COURSE_LEGS) {
      const item = timeline.find(t => t.leg.legNumber === courseLeg.legNumber)
      if (item?.assignment) ms += item.assignment.targetPaceSecPerMile * item.leg.distanceMiles * 1000
    }
    return new Date(ms)
  }, [assignedStartTime, timeline])
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

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <CourseScreen
          currentLegNumber={0}
          raceStartedAt={null}
          teamName={teamName}
          timeline={timeline}
          assignedStartTime={assignedStartTime}
        />
      </div>

    </div>
  )
}
