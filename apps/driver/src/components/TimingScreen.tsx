import { useState, useEffect } from 'react'
import { createDriverApi, buildNavUrl, formatElapsed, formatRaceTime, formatTime } from '../api'
import { LongPressButton } from './LongPressButton'
import type { TeamSummary, Leg, Handoff } from '../api'

interface Props {
  team: TeamSummary
  pin: string
  resultId: string | null
  leg: Leg
  startedAt: string
  nextHandoff: Handoff | null
  currentRunner: string | null
  raceStartedAt: string | null
  onLapPress: (finishedAt: string) => void
  onComplete: () => void
  nextRunner: string | null
  nextLeg: Leg | null
  nextRunnerEta: string | null
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

export function TimingScreen({ team, pin, resultId, leg, startedAt, nextHandoff, currentRunner, raceStartedAt, onLapPress, onComplete, nextRunner, nextLeg, nextRunnerEta }: Props) {
  const [elapsed, setElapsed] = useState(0)
  const [raceElapsed, setRaceElapsed] = useState(0)
  const [eta, setEta]         = useState<{ eta: string; secondsRemaining: number; status: 'on-pace' | 'ahead' | 'overdue' } | null>(null)
  const [stopError, setStopError]         = useState('')
  const [stopActing, setStopActing]       = useState(false)
  const [pendingStopAt, setPendingStopAt] = useState<string | null>(null)

  // Leg elapsed clock
  useEffect(() => {
    const start = new Date(startedAt).getTime()
    setElapsed(Date.now() - start)
    const id = setInterval(() => setElapsed(Date.now() - start), 1_000)
    return () => clearInterval(id)
  }, [startedAt])

  // Race elapsed clock
  useEffect(() => {
    if (!raceStartedAt) return
    const start = new Date(raceStartedAt).getTime()
    setRaceElapsed(Date.now() - start)
    const id = setInterval(() => setRaceElapsed(Date.now() - start), 1_000)
    return () => clearInterval(id)
  }, [raceStartedAt])

  // ETA poll every 30s
  useEffect(() => {
    setEta(null)
    const api = createDriverApi(pin)
    async function poll() {
      try {
        const state = await api.get(`/teams/${team.id}/current`)
        if (state.status === 'in-progress') setEta(state.eta ?? null)
      } catch { /* keep stale */ }
    }
    poll()
    const id = setInterval(poll, 30_000)
    return () => clearInterval(id)
  }, [pin, team.id, resultId])

  function handleLap() {
    onLapPress(new Date().toISOString())
  }

  async function handleStop() {
    if (stopActing) return
    setStopActing(true)
    setStopError('')
    const finishedAt = pendingStopAt ?? new Date().toISOString()
    setPendingStopAt(finishedAt)
    try {
      const api = createDriverApi(pin)
      await api.patch(`/results/${resultId!}`, { finishedAt, action: 'stop' })
      setPendingStopAt(null)
      onComplete()
    } catch (err: unknown) {
      setStopError(err instanceof Error ? err.message : 'Failed — try again')
      setStopActing(false)
    }
  }

  const navUrl    = nextHandoff ? buildNavUrl(nextHandoff) : ''
  const etaStatus = eta?.status ?? 'on-pace'
  const paceColor = etaStatus === 'overdue' ? 'var(--red)' : 'var(--green)'

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
        {!resultId && (
          <span style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, color: 'var(--mut)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--mut)', flexShrink: 0, display: 'inline-block' }} />
            Syncing…
          </span>
        )}
        <span className="font-mono" style={{ fontSize: 12, color: 'var(--mut)' }}>
          Race {formatRaceTime(raceElapsed)}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col px-[18px] pt-5 pb-6 gap-4">

        {/* Runner info */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--mut)' }}>
              Now Running · Leg {leg.legNumber}
            </span>
            {eta && (
              <span className="uppercase flex-shrink-0" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9.5, fontWeight: 800, letterSpacing: '0.1em', padding: '3px 8px', borderRadius: 999, background: paceColor, color: 'var(--ink)' }}>
                {etaStatus === 'overdue' ? 'Behind Pace' : etaStatus === 'ahead' ? 'Ahead' : 'On Pace'}
              </span>
            )}
          </div>
          {currentRunner && (
            <div className="font-display uppercase leading-none" style={{ fontSize: 50 }}>
              {currentRunner}
            </div>
          )}
          <div className="uppercase mt-1" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: '0.06em', color: 'var(--faint)' }}>
            → {nextHandoff?.name ?? leg.name} · {leg.distanceMiles} mi
          </div>
        </div>

        {/* Twin readout panels */}
        <div className="flex gap-2.5">
          <div className="flex-1 text-center" style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, padding: '12px 10px' }}>
            <div className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--faint)', marginBottom: 4 }}>Leg Time</div>
            <div className="font-mono" style={{ fontSize: 38, fontWeight: 700, lineHeight: 1 }}>{formatElapsed(elapsed)}</div>
            <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, color: 'var(--faint)', marginTop: 4 }}>{leg.distanceMiles} mi total</div>
          </div>
          <div className="flex-1 text-center" style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 16, padding: '12px 10px' }}>
            <div className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--faint)', marginBottom: 4 }}>
              ETA · {nextHandoff?.name ?? leg.name}
            </div>
            {eta
              ? <div className="font-mono" style={{ fontSize: 38, fontWeight: 700, lineHeight: 1, color: paceColor }}>{formatTime(eta.eta)}</div>
              : <div className="font-mono" style={{ fontSize: 38, color: 'var(--faint)', lineHeight: 1 }}>—</div>
            }
            <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, color: 'var(--faint)', marginTop: 4 }}>
              {eta ? (etaStatus === 'overdue' ? 'behind pace' : etaStatus === 'ahead' ? 'ahead of pace' : 'on pace') : 'calculating…'}
            </div>
          </div>
        </div>

        {/* On Deck strip */}
        {nextRunner && (
          <div className="flex items-center gap-2.5" style={{ background: 'var(--panel2)', borderRadius: 14, padding: '10px 14px' }}>
            <div className="flex items-center justify-center flex-shrink-0" style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--panel)', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 12, color: 'var(--mut)' }}>
              {initials(nextRunner)}
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 14, fontWeight: 800 }}>{nextRunner}</div>
              <div style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10.5, color: 'var(--faint)', marginTop: 1 }}>
                Leg {nextLeg?.legNumber}{nextHandoff ? ` · → ${nextHandoff.name}` : ''}
                {nextRunnerEta ? ` · Est. ${formatTime(nextRunnerEta)}` : ''}
              </div>
            </div>
            <span className="uppercase flex-shrink-0" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', border: '1px solid var(--line)', borderRadius: 999, padding: '2px 8px', color: 'var(--mut)' }}>
              On Deck
            </span>
          </div>
        )}

        {/* Navigate button */}
        {navUrl && (
          <a
            href={navUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 uppercase min-h-[44px]"
            style={{ border: '1px solid var(--accent)', borderRadius: 14, fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--accent)', textDecoration: 'none' }}
          >
            <svg width="11" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.1 2 5 5.1 5 9c0 4.9 7 13 7 13s7-8.1 7-13c0-3.9-3.1-7-7-7z" fill="var(--accent)" />
              <circle cx="12" cy="9" r="2.6" fill="var(--bg)" />
            </svg>
            Navigate to {nextHandoff!.name} ↗
          </a>
        )}

        {stopError && <p style={{ fontSize: 13, color: 'var(--red)', textAlign: 'center' }}>{stopError}</p>}

        {/* LAP + END */}
        <div className="mt-auto flex flex-col gap-2">
          <LongPressButton
            label="LAP"
            holdMs={1500}
            onComplete={handleLap}
            bgStyle="var(--accent)"
            textStyle="var(--ink)"
            height={84}
            disabled={!resultId}
            className="font-display text-[34px]"
          />
          <p className="text-center uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--faint)' }}>
            Hold to Record Handoff at {nextHandoff?.name ?? leg.name}
          </p>
          <LongPressButton
            label="••• End Race Early"
            holdMs={1500}
            onComplete={handleStop}
            bgStyle="var(--panel2)"
            textStyle="var(--faint)"
            height={44}
            disabled={stopActing || !resultId}
            className="text-[11px] font-hanken font-extrabold tracking-widest uppercase"
          />
        </div>
      </div>
    </div>
  )
}
