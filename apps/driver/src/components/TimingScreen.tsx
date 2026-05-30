import { useState, useEffect } from 'react'
import { createDriverApi, buildNavUrl, formatElapsed, formatTime } from '../api'
import { LongPressButton } from './LongPressButton'
import { RaceBanner } from './RaceBanner'
import type { TeamSummary, Leg, Handoff, CurrentStateInProgress } from '../api'

interface Props {
  team: TeamSummary
  pin: string
  resultId: string
  leg: Leg
  startedAt: string
  nextHandoff: Handoff | null
  currentRunner: string | null
  raceStartedAt: string | null
  onLap: (state: CurrentStateInProgress) => void
  onComplete: () => void
}

export function TimingScreen({ team, pin, resultId, leg, startedAt, nextHandoff, currentRunner, raceStartedAt, onLap, onComplete }: Props) {
  const [elapsed, setElapsed] = useState(0)
  const [eta, setEta] = useState<{ eta: string; secondsRemaining: number; status: 'on-pace' | 'ahead' | 'overdue' } | null>(null)
  const [error, setError] = useState('')
  const [acting, setActing] = useState(false)

  // Elapsed clock — ticks every second from startedAt
  useEffect(() => {
    const start = new Date(startedAt).getTime()
    setElapsed(Date.now() - start)
    const id = setInterval(() => setElapsed(Date.now() - start), 1_000)
    return () => clearInterval(id)
  }, [startedAt])

  // ETA poll every 30s
  useEffect(() => {
    setEta(null)  // clear stale ETA from previous leg
    const api = createDriverApi(pin)
    async function poll() {
      try {
        const state = await api.get<CurrentStateInProgress>(`/teams/${team.id}/current`)
        if (state.status === 'in-progress') setEta(state.eta ?? null)
      } catch { /* keep stale ETA */ }
    }
    poll()
    const id = setInterval(poll, 30_000)
    return () => clearInterval(id)
  }, [pin, team.id, resultId])

  async function handleLap() {
    if (acting) return
    setActing(true)
    setError('')
    const finishedAt = new Date().toISOString()
    try {
      const api = createDriverApi(pin)
      const lapResult = await api.patch<{ current: unknown; next: { id: string; startedAt: string } | null }>(
        `/results/${resultId}`,
        { finishedAt, action: 'lap' }
      )
      if (lapResult.next === null) {
        onComplete()
      } else {
        const state = await api.get<CurrentStateInProgress>(`/teams/${team.id}/current`)
        setActing(false)
        onLap(state)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed — try again')
      setActing(false)
    }
  }

  async function handleStop() {
    if (acting) return
    setActing(true)
    setError('')
    const finishedAt = new Date().toISOString()
    try {
      const api = createDriverApi(pin)
      await api.patch(`/results/${resultId}`, { finishedAt, action: 'stop' })
      onComplete()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed — try again')
      setActing(false)
    }
  }

  const navUrl = nextHandoff ? buildNavUrl(nextHandoff) : ''
  const paceColor = eta?.status === 'overdue' ? 'text-amber-400' : 'text-green-400'
  const etaBgClass = eta?.status === 'overdue' ? 'bg-amber-900/40 border-amber-700' : 'bg-green-900/40 border-green-800'

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <RaceBanner teamName={team.name} raceStartedAt={raceStartedAt} />
      <div className="flex-1 flex flex-col p-4 gap-4">
        {/* Runner info */}
        <div className="text-center pt-2">
          <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Now on course</div>
          {currentRunner && <div className="text-2xl font-bold">{currentRunner}</div>}
          <div className="text-sm text-gray-400">
            Leg {leg.legNumber} · {leg.name} · {leg.distanceMiles} mi
          </div>
        </div>

        {/* Elapsed + ETA */}
        <div className={`rounded-xl border p-4 ${etaBgClass}`}>
          <div className="flex justify-around items-center">
            <div className="text-center">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Elapsed</div>
              <div className="text-3xl font-bold font-mono">{formatElapsed(elapsed)}</div>
            </div>
            <div className="w-px h-12 bg-gray-700" />
            <div className="text-center">
              <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">ETA</div>
              {eta
                ? <div className={`text-3xl font-bold ${paceColor}`}>{formatTime(eta.eta)}</div>
                : <div className="text-xl text-gray-500">—</div>
              }
            </div>
          </div>
          {eta && (
            <div className={`text-center text-xs mt-2 ${paceColor}`}>
              {eta.status === 'overdue' ? 'overdue' : eta.status === 'ahead' ? 'ahead of pace' : 'on pace'}
            </div>
          )}
        </div>

        {/* Navigation */}
        {navUrl && (
          <a
            href={navUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-center text-sm text-blue-400 underline min-h-[44px] flex items-center justify-center"
          >
            Navigate to {nextHandoff!.name} ↗
          </a>
        )}

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        {/* LAP */}
        <div className="mt-auto">
          <LongPressButton
            label="LAP"
            holdMs={1500}
            onComplete={handleLap}
            colorClass="bg-blue-600"
            disabled={acting}
            className="text-xl"
          />
          <p className="text-xs text-gray-500 text-center mt-1">Hold to record handoff</p>
        </div>

        {/* STOP — small, tucked away */}
        <div className="pb-2">
          <LongPressButton
            label="••• End race early"
            holdMs={1500}
            onComplete={handleStop}
            colorClass="bg-gray-800"
            textClass="text-gray-400"
            disabled={acting}
            className="text-sm"
          />
        </div>
      </div>
    </div>
  )
}
