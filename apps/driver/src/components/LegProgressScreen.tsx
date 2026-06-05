import { useState, useEffect } from 'react'
import { lpEstimates } from '@kt82/shared'

function lpDur(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = (s % 60).toString().padStart(2, '0')
  const mm = m.toString().padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`
}

function lpPace(sec: number): string {
  const totalSec = Math.round(sec)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function lpSigned(sec: number): string {
  if (sec === 0) return '—'
  const sign = sec > 0 ? '+' : '−'
  return sign + lpPace(Math.abs(sec))
}

function lpClock(ms: number): { full: string; ap: string } {
  const d = new Date(ms)
  const h = d.getHours() % 12 || 12
  const m = d.getMinutes().toString().padStart(2, '0')
  return { full: `${h}:${m}`, ap: d.getHours() < 12 ? 'AM' : 'PM' }
}

function lpTag(off: number): string {
  return off === -30 ? 'FASTEST' : off === 30 ? 'SLOWEST' : off === 0 ? 'TARGET' : ''
}

interface Props {
  runner: string
  town: string
  legN: number
  totalLegs: number
  distMiles: number
  startedAtMs: number
  targetPaceSecPerMile: number
  teamName: string
  backLabel: string
  onBack: () => void
  onViewLegMap?: () => void
}

export function LegProgressScreen({
  runner, town, legN, totalLegs, distMiles,
  startedAtMs, targetPaceSecPerMile, teamName,
  backLabel, onBack, onViewLegMap,
}: Props) {
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1_000)
    return () => clearInterval(id)
  }, [])

  const ests = lpEstimates(startedAtMs, nowMs, distMiles, targetPaceSecPerMile)
  const target = ests[2]
  const minFrac = ests[ests.length - 1].frac
  const maxFrac = ests[0].frac

  const MIN_SPAN = 0.10
  const half = Math.max((maxFrac - minFrac) / 2, MIN_SPAN / 2)
  const visMin = Math.max(0, target.frac - half)
  const visMax = Math.min(1, target.frac + half)
  const L = visMin * 100
  const R = visMax * 100
  const W = R - L
  const pct = Math.round(target.frac * 100)
  const milesIn = target.frac * distMiles

  const cols = [
    { label: 'PACE',     flex: '0 0 52px', align: 'left'  as const },
    { label: 'ARRIVES',  flex: '1 1 0',    align: 'right' as const },
    { label: 'IN',       flex: '0 0 58px', align: 'right' as const },
    { label: 'Δ',        flex: '0 0 50px', align: 'right' as const },
    { label: 'LEG TIME', flex: '0 0 56px', align: 'right' as const },
  ]

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)', fontFamily: "'Hanken Grotesk', sans-serif" }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px' }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mut)',
            fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 12,
            letterSpacing: '0.04em', padding: 0, whiteSpace: 'nowrap', minHeight: 44 }}
        >
          {backLabel}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="live-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', flexShrink: 0 }} />
          <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', color: 'var(--mut)' }}>LIVE</span>
        </div>
      </div>

      {/* Title block */}
      <div style={{ padding: '4px 18px 0' }}>
        <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 11, letterSpacing: '0.13em', color: 'var(--accent)', textTransform: 'uppercase' }}>
          LEG {legN} OF {totalLegs} · {teamName.toUpperCase()}
        </div>
        <div className="font-display uppercase" style={{ fontSize: 44, lineHeight: 0.92, marginTop: 7 }}>
          {runner}
        </div>
        <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 12, letterSpacing: '0.04em', color: 'var(--mut)', marginTop: 9 }}>
          → {town.toUpperCase()} · {distMiles.toFixed(1)} MI · TARGET{' '}
          <span className="font-mono" style={{ fontWeight: 700, color: 'var(--text)' }}>{lpPace(targetPaceSecPerMile)}</span>/MI
        </div>
      </div>

      {/* Progress bar block */}
      <div style={{ padding: '18px 18px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
          <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 10, letterSpacing: '0.1em', color: 'var(--mut)', whiteSpace: 'nowrap' }}>
            ESTIMATED POSITION · NOW
          </span>
          <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 11, color: 'var(--accent)', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
            ≈{milesIn.toFixed(1)} OF {distMiles.toFixed(1)} MI
          </span>
        </div>

        {/* Bar — layered absolute divs inside a 30px relative container */}
        <div style={{ position: 'relative', height: 30 }}>
          {/* Track */}
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 12, transform: 'translateY(-50%)', borderRadius: 20, background: 'var(--line)' }} />
          {/* Solid fill up to visMin */}
          <div style={{ position: 'absolute', top: '50%', left: 0, width: `${L}%`, height: 12, transform: 'translateY(-50%)', borderRadius: '20px 0 0 20px', background: 'var(--accent)' }} />
          {/* Range span at ~40% alpha */}
          <div style={{ position: 'absolute', top: '50%', left: `${L}%`, width: `${W}%`, height: 12, transform: 'translateY(-50%)', background: 'color-mix(in srgb, var(--accent) 40%, transparent)' }} />
          {/* Left end-cap */}
          <div style={{ position: 'absolute', top: '50%', left: `${L}%`, transform: 'translate(-50%, -50%)', width: 3.5, height: 26, borderRadius: 2, background: 'var(--accent)' }} />
          {/* Right end-cap */}
          <div style={{ position: 'absolute', top: '50%', left: `${R}%`, transform: 'translate(-50%, -50%)', width: 3.5, height: 26, borderRadius: 2, background: 'var(--accent)' }} />
          {/* Runner icon at best-estimate position */}
          <div style={{
            position: 'absolute', top: '50%', left: `${target.frac * 100}%`,
            transform: 'translate(-50%, -50%)',
            width: 26, height: 26, borderRadius: '50%',
            background: '#ff5a1f', border: '2.5px solid #fff',
            boxShadow: '0 0 7px rgba(255,90,31,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, lineHeight: '1',
          }}>🏃</div>
        </div>

        {/* Scale row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 11 }}>
          <span className="font-mono" style={{ fontSize: 10, color: 'var(--faint)' }}>0 mi · handoff</span>
          <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 700, fontSize: 10, color: 'var(--mut)', whiteSpace: 'nowrap' }}>
            likely range · ≈{pct}% in
          </span>
          <span className="font-mono" style={{ fontSize: 10, color: 'var(--faint)' }}>{distMiles.toFixed(1)} mi · finish</span>
        </div>
      </div>

      {/* Arrival table */}
      <div style={{ padding: '14px 18px 26px' }}>
        <div className="font-display uppercase" style={{ fontSize: 20, letterSpacing: '0.02em', marginBottom: 8 }}>
          Arrival by pace
        </div>
        <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ display: 'flex', gap: 8, padding: '9px 14px', borderBottom: '1px solid var(--line)' }}>
            {cols.map(col => (
              <span key={col.label} style={{ flex: col.flex, textAlign: col.align, fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 8.5, letterSpacing: '0.08em', color: 'var(--faint)' }}>
                {col.label}
              </span>
            ))}
          </div>

          {/* 5 data rows — fastest first */}
          {ests.map((e, i) => {
            const isTarget = e.off === 0
            const c = lpClock(e.finishMs)
            const tag = lpTag(e.off)
            const deltaColor = e.deltaSec > 0 ? 'var(--red)' : e.deltaSec < 0 ? 'var(--green)' : 'var(--mut)'
            return (
              <div
                key={e.off}
                style={{
                  display: 'flex', gap: 8, alignItems: 'center', padding: '11px 14px',
                  background: isTarget ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent',
                  borderBottom: i < ests.length - 1 ? '1px solid var(--line2)' : 'none',
                }}
              >
                <span style={{ flex: '0 0 52px' }}>
                  <span className="font-mono" style={{ fontWeight: 700, fontSize: 14, color: isTarget ? 'var(--accent)' : 'var(--text)' }}>
                    {lpPace(e.p)}
                  </span>
                  {tag && (
                    <span style={{ display: 'block', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 7, letterSpacing: '0.06em', color: 'var(--faint)', marginTop: 2 }}>
                      {tag}
                    </span>
                  )}
                </span>
                <span style={{ flex: '1 1 0', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <span className="font-mono" style={{ fontWeight: 700, fontSize: 14.5, color: isTarget ? 'var(--accent)' : 'var(--text)' }}>
                    {c.full}
                  </span>
                  <span className="font-mono" style={{ fontSize: 9, color: 'var(--mut)' }}> {c.ap}</span>
                </span>
                <span className="font-mono" style={{ flex: '0 0 58px', textAlign: 'right', fontSize: 12.5, color: 'var(--mut)', whiteSpace: 'nowrap' }}>
                  {lpDur(e.remain)}
                </span>
                <span className="font-mono" style={{ flex: '0 0 50px', textAlign: 'right', fontWeight: 700, fontSize: 12, color: deltaColor, whiteSpace: 'nowrap' }}>
                  {e.deltaSec === 0 ? '—' : lpSigned(e.deltaSec)}
                </span>
                <span className="font-mono" style={{ flex: '0 0 56px', textAlign: 'right', fontSize: 12.5, color: 'var(--mut)', whiteSpace: 'nowrap' }}>
                  {lpDur(e.total)}
                </span>
              </div>
            )
          })}
        </div>

        <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, fontSize: 10.5, color: 'var(--faint)', marginTop: 10, lineHeight: 1.4 }}>
          Position barely shifts with pace — but arrival can swing several minutes. Plan warm-ups off the spread, not a single time.
        </div>
        {onViewLegMap && (
          <button
            onClick={onViewLegMap}
            className="flex items-center justify-between w-full"
            style={{ border: '1px solid var(--line)', borderRadius: 14, background: 'var(--panel2)',
              cursor: 'pointer', padding: '13px 18px', minHeight: 52,
              textAlign: 'left', marginTop: 16, width: '100%' }}
          >
            <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 14,
              letterSpacing: '0.02em', lineHeight: 1, color: 'var(--text)', whiteSpace: 'nowrap' }}>
              MAP
            </span>
            <span style={{ fontSize: 20, color: 'var(--accent)', flexShrink: 0 }}>→</span>
          </button>
        )}
      </div>
    </div>
  )
}
