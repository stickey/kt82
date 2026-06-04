import { useState, useEffect, useMemo, Fragment } from 'react'
import type { LegTimelineItem } from '../api'
import { COURSE_LEGS } from '@kt82/shared'

interface Props {
  teamName: string
  assignedStartTime: Date
  timeline: LegTimelineItem[]
  onBack: () => void
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

function mapsPoint(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`
}

function mapsRoute(sLat: number, sLng: number, eLat: number, eLng: number) {
  return `https://www.google.com/maps/dir/${sLat},${sLng}/${eLat},${eLng}`
}

const TOTAL_MILES = COURSE_LEGS.reduce((s, l) => s + l.miles, 0).toFixed(1)

export function PreRaceScreen({ teamName, assignedStartTime, timeline, onBack }: Props) {
  const [nowMs, setNowMs] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // ETA schedule — placeholder until Task 3 fills in the Hero + Trail
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
  void fc // used in Task 3

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

      {/* Hero + Route placeholders — filled in Tasks 3 and 4 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px', color: 'var(--faint)', fontSize: 12 }}>
        (hero + route coming soon)
      </div>

    </div>
  )
}
