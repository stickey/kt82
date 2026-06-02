import { useState, useEffect } from 'react'
import { publicApi, createDriverApi } from './api'
import { AuthScreen } from './components/AuthScreen'
import { StartScreen } from './components/StartScreen'
import { TimingScreen } from './components/TimingScreen'
import { CompleteScreen } from './components/CompleteScreen'
import { enqueue, peek, dequeue, type PendingAction } from './pendingActions'
import type { Race, TeamSummary, Leg, Handoff, CurrentState, CurrentStateInProgress } from './api'

type View =
  | { type: 'loading' }
  | { type: 'no-race' }
  | { type: 'auth'; race: Race }
  | { type: 'start'; race: Race; team: TeamSummary; pin: string; nextLeg: Leg; nextRunner: string | null }
  | { type: 'racing'; race: Race; team: TeamSummary; pin: string; resultId: string | null; leg: Leg; startedAt: string; nextHandoff: Handoff | null; currentRunner: string | null; raceStartedAt: string | null; nextRunner: string | null; nextLeg: Leg | null; nextRunnerEta: string | null }
  | { type: 'complete'; race: Race; team: TeamSummary; pin: string }

export default function App() {
  const [view, setView] = useState<View>({ type: 'loading' })
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(() => peek())

  useEffect(() => {
    publicApi.get<Race>('/races/active')
      .then(race => setView({ type: 'auth', race }))
      .catch(() => setView({ type: 'no-race' }))
  }, [])

  function handleAuth(team: TeamSummary, pin: string, state: CurrentState) {
    const race = (view as { race: Race }).race
    if (state.status === 'not-started') {
      if (!state.nextLeg) { setView({ type: 'auth', race }); return }
      setView({ type: 'start', race, team, pin, nextLeg: state.nextLeg, nextRunner: state.nextRunner?.name ?? null })
    } else {
      setView({
        type: 'racing', race, team, pin,
        resultId: state.result.id,
        leg: state.currentLeg,
        startedAt: state.result.startedAt,
        nextHandoff: state.nextHandoff,
        currentRunner: state.currentRunner?.name ?? null,
        raceStartedAt: state.raceStartedAt ?? null,
        nextRunner: state.nextRunner?.name ?? null,
        nextLeg: state.nextLeg ?? null,
        nextRunnerEta: state.nextRunnerEta ?? null,
      })
    }
  }

  function handleStart(state: CurrentStateInProgress) {
    const v = view as Extract<View, { type: 'start' }>
    setView({
      type: 'racing', race: v.race, team: v.team, pin: v.pin,
      resultId: state.result.id,
      leg: state.currentLeg,
      startedAt: state.result.startedAt,
      nextHandoff: state.nextHandoff,
      currentRunner: state.currentRunner?.name ?? null,
      raceStartedAt: state.raceStartedAt ?? null,
      nextRunner: state.nextRunner?.name ?? null,
      nextLeg: state.nextLeg ?? null,
      nextRunnerEta: state.nextRunnerEta ?? null,
    })
  }

  function handleLapPress(finishedAt: string) {
    const v = view as Extract<View, { type: 'racing' }>
    if (!v.resultId) return

    const oldResultId = v.resultId
    const { race, team, pin } = v
    const api = createDriverApi(pin)

    if (!v.nextLeg) {
      // Last leg — advance to complete optimistically and queue the PATCH
      setView({ type: 'complete', race, team, pin })
      const action: PendingAction = { resultId: oldResultId, finishedAt, action: 'lap' }
      enqueue(action)
      setPendingAction(action)
      return
    }

    const nextLeg = v.nextLeg

    // Optimistically advance to the next leg immediately
    setView({
      type: 'racing', race, team, pin,
      resultId: null,
      leg: nextLeg,
      startedAt: finishedAt,
      nextHandoff: nextLeg.handoff ?? null,
      currentRunner: v.nextRunner,
      raceStartedAt: v.raceStartedAt,
      nextRunner: null,
      nextLeg: null,
      nextRunnerEta: null,
    })

    // Attempt the PATCH in the background
    api.patch<{ current: unknown; next: { id: string; startedAt: string } | null }>(
      `/results/${oldResultId}`, { finishedAt, action: 'lap' }
    ).then(async (lapResult) => {
      if (lapResult.next === null) {
        setView(prev => prev.type === 'racing'
          ? { type: 'complete', race, team, pin }
          : prev)
        return
      }
      const state = await api.get<CurrentStateInProgress>(`/teams/${team.id}/current`)
      setView(prev => prev.type !== 'racing' ? prev : {
        ...prev,
        resultId: state.result.id,
        nextLeg: state.nextLeg ?? null,
        nextRunner: state.nextRunner?.name ?? null,
        nextRunnerEta: state.nextRunnerEta ?? null,
      })
    }).catch(() => {
      const action: PendingAction = { resultId: oldResultId, finishedAt, action: 'lap' }
      enqueue(action)
      setPendingAction(action)
    })
  }

  function handleComplete() {
    const v = view as Extract<View, { type: 'racing' }>
    setView({ type: 'complete', race: v.race, team: v.team, pin: v.pin })
  }

  // Retry queued LAP actions (while racing with null resultId, or after last-leg optimistic complete)
  useEffect(() => {
    if (!pendingAction) return
    if (view.type !== 'racing' && view.type !== 'complete') return

    const pin = view.pin
    const teamId = view.team.id

    const id = setInterval(async () => {
      const action = peek()
      if (!action) return
      const api = createDriverApi(pin)
      try {
        const lapResult = await api.patch<{ current: unknown; next: { id: string } | null }>(
          `/results/${action.resultId}`, { finishedAt: action.finishedAt, action: action.action }
        )
        dequeue()
        setPendingAction(null)
        if (lapResult.next === null) {
          setView(prev => prev.type === 'racing'
            ? { type: 'complete', race: prev.race, team: prev.team, pin: prev.pin }
            : prev)
        } else {
          const state = await api.get<CurrentStateInProgress>(`/teams/${teamId}/current`)
          setView(prev => prev.type !== 'racing' ? prev : {
            ...prev,
            resultId: state.result.id,
            nextLeg: state.nextLeg ?? null,
            nextRunner: state.nextRunner?.name ?? null,
            nextRunnerEta: state.nextRunnerEta ?? null,
          })
        }
      } catch { /* keep trying */ }
    }, 5_000)

    return () => clearInterval(id)
  }, [!!pendingAction, view.type]) // eslint-disable-line react-hooks/exhaustive-deps

  if (view.type === 'loading') return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <p style={{ color: 'var(--mut)', fontFamily: "'Hanken Grotesk', sans-serif" }}>Loading…</p>
    </div>
  )

  if (view.type === 'no-race') return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <p style={{ color: 'var(--mut)', fontFamily: "'Hanken Grotesk', sans-serif" }}>No active race</p>
    </div>
  )

  if (view.type === 'auth')     return <AuthScreen race={view.race} onAuth={handleAuth} />
  if (view.type === 'start')    return <StartScreen race={view.race} team={view.team} pin={view.pin} nextLeg={view.nextLeg} nextRunner={view.nextRunner} onStart={handleStart} />
  if (view.type === 'racing') return (
    <TimingScreen
      team={view.team} pin={view.pin} resultId={view.resultId}
      leg={view.leg} startedAt={view.startedAt} nextHandoff={view.nextHandoff}
      currentRunner={view.currentRunner} raceStartedAt={view.raceStartedAt}
      onLapPress={handleLapPress} onComplete={handleComplete}
      nextRunner={view.nextRunner} nextLeg={view.nextLeg} nextRunnerEta={view.nextRunnerEta}
    />
  )
  return <CompleteScreen race={view.race} team={view.team} pin={view.pin} />
}
