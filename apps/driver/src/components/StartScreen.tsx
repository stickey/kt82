import { useState } from 'react'
import { createDriverApi, buildNavUrl } from '../api'
import { LongPressButton } from './LongPressButton'
import type { Race, TeamSummary, Leg, CurrentStateInProgress } from '../api'

interface Props {
  race: Race
  team: TeamSummary
  pin: string
  nextLeg: Leg
  nextRunner: string | null
  onStart: (state: CurrentStateInProgress) => void
}

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
}

export function StartScreen({ race, team, pin, nextLeg, nextRunner, onStart }: Props) {
  const [error, setError]     = useState('')
  const [started, setStarted] = useState(false)

  async function handleStart() {
    if (started) return
    setStarted(true)
    setError('')
    const startedAt = new Date().toISOString()
    try {
      const api = createDriverApi(pin)
      await api.post(`/teams/${team.id}/results`, { legId: nextLeg.id, startedAt })
      const state = await api.get<CurrentStateInProgress>(`/teams/${team.id}/current`)
      onStart(state)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to start — try again')
      setStarted(false)
    }
  }

  const navUrl = nextLeg.handoff ? buildNavUrl(nextLeg.handoff) : ''

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
        <span className="font-mono" style={{ fontSize: 12, color: 'var(--mut)' }}>Race Not Started</span>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col px-[18px] pt-6 pb-8 gap-5">
        <div>
          <p className="uppercase mb-2" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--accent)' }}>
            KT82 · Katy Trail Relay
          </p>
          <h1 className="font-display uppercase leading-none" style={{ fontSize: 60 }}>
            Ready<br />To Roll
          </h1>
          <p className="mt-3" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 13, color: 'var(--mut)' }}>
            {race.name}
          </p>
        </div>

        {/* First-leg card */}
        <div style={{ background: 'var(--panel)', borderRadius: 18, border: '1px solid var(--line)', padding: '14px 16px' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 9.5, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--faint)' }}>
              First Leg · Up Now
            </span>
            <span className="font-display" style={{ fontSize: 24, color: 'var(--mut)' }}>
              {String(nextLeg.legNumber).padStart(2, '0')}
            </span>
          </div>
          <div className="flex items-center gap-3 mb-3">
            {nextRunner && (
              <div className="flex items-center justify-center flex-shrink-0" style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--panel2)', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 800, fontSize: 16, color: 'var(--mut)' }}>
                {initials(nextRunner)}
              </div>
            )}
            <div className="min-w-0">
              {nextRunner && (
                <div className="font-display uppercase leading-none" style={{ fontSize: 28 }}>
                  {nextRunner}
                </div>
              )}
              <div className="mt-1" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, color: 'var(--faint)' }}>
                → {nextLeg.handoff?.name ?? nextLeg.name} · {nextLeg.distanceMiles} mi
              </div>
            </div>
          </div>
          {navUrl && (
            <a
              href={navUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 min-h-[44px] uppercase"
              style={{ borderTop: '1px solid var(--line2)', paddingTop: 10, fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--accent)', textDecoration: 'none' }}
            >
              <svg width="12" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.1 2 5 5.1 5 9c0 4.9 7 13 7 13s7-8.1 7-13c0-3.9-3.1-7-7-7z" fill="var(--accent)" />
                <circle cx="12" cy="9" r="2.6" fill="var(--panel)" />
              </svg>
              Navigate to {nextLeg.handoff?.name ?? nextLeg.name} ↗
            </a>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-2">
          {error && <p style={{ fontSize: 13, color: 'var(--red)', textAlign: 'center' }}>{error}</p>}
          <LongPressButton
            label="START"
            holdMs={500}
            onComplete={handleStart}
            bgStyle="var(--accent)"
            textStyle="var(--ink)"
            height={92}
            disabled={started}
            className="font-display text-[40px]"
          />
          <p className="text-center uppercase" style={{ fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--faint)' }}>
            Hold to Start the Race Clock
          </p>
        </div>
      </div>
    </div>
  )
}
