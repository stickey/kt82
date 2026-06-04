import { useState, useEffect } from 'react'
import { publicApi, createDriverApi } from './api'
import { AuthScreen } from './components/AuthScreen'
import { StartScreen } from './components/StartScreen'
import { TimingScreen } from './components/TimingScreen'
import { CompleteScreen } from './components/CompleteScreen'
import { CourseScreen } from './components/CourseScreen'
import { LegProgressScreen } from './components/LegProgressScreen'
import { LegMapScreen } from './components/LegMapScreen'
import { enqueue, peek, dequeue, type PendingAction } from './pendingActions'
import type { Race, TeamSummary, Leg, Handoff, CurrentState, CurrentStateInProgress } from './api'

type View =
  | { type: 'loading' }
  | { type: 'no-race' }
  | { type: 'auth'; race: Race }
  | { type: 'start'; race: Race; team: TeamSummary; pin: string; nextLeg: Leg; nextRunner: string | null }
  | { type: 'racing'; race: Race; team: TeamSummary; pin: string; resultId: string | null; leg: Leg; startedAt: string; nextHandoff: Handoff | null; currentRunner: string | null; raceStartedAt: string | null; nextRunner: string | null; nextLeg: Leg | null; nextRunnerEta: string | null; targetPaceSecPerMile: number | null }
  | { type: 'course'; race: Race; team: TeamSummary; pin: string; resultId: string | null; leg: Leg; startedAt: string; nextHandoff: Handoff | null; currentRunner: string | null; raceStartedAt: string | null; nextRunner: string | null; nextLeg: Leg | null; nextRunnerEta: string | null; targetPaceSecPerMile: number | null }
  | { type: 'leg-progress'; race: Race; team: TeamSummary; pin: string; resultId: string | null; leg: Leg; startedAt: string; nextHandoff: Handoff | null; currentRunner: string | null; raceStartedAt: string | null; nextRunner: string | null; nextLeg: Leg | null; nextRunnerEta: string | null; targetPaceSecPerMile: number | null }
  | { type: 'leg-map'; from: 'racing' | 'leg-progress'; race: Race; team: TeamSummary; pin: string; resultId: string | null; leg: Leg; startedAt: string; nextHandoff: Handoff | null; currentRunner: string | null; raceStartedAt: string | null; nextRunner: string | null; nextLeg: Leg | null; nextRunnerEta: string | null; targetPaceSecPerMile: number | null }
  | { type: 'complete'; race: Race; team: TeamSummary; pin: string }

export default function App() {
  const [view, setView] = useState<View>({ type: 'loading' })
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(() => peek())
  const [legMapLastUpdatedMs, setLegMapLastUpdatedMs] = useState<number | undefined>(undefined)

  useEffect(() => {
    publicApi.get<Race>('/races/active')
      .then(race => setView({ type: 'auth', race }))
      .catch(() => setView({ type: 'no-race' }))
  }, [])

  async function handleAuth(team: TeamSummary, pin: string, passedState: CurrentState) {
    const race = (view as { race: Race }).race
    const api = createDriverApi(pin)

    // Flush any action queued in a previous session before reading server state
    let state = passedState
    const pending = peek()
    if (pending) {
      try {
        await api.patch(`/results/${pending.resultId}`, {
          finishedAt: pending.finishedAt,
          action: pending.action,
        })
      } catch { /* server state wins on failure */ }
      dequeue()
      setPendingAction(null)
      // Re-fetch so we get up-to-date state after the flush
      try {
        state = await api.get<CurrentState>(`/teams/${team.id}/current`)
      } catch { /* use passedState as fallback */ }
    }

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
        targetPaceSecPerMile: state.targetPaceSecPerMile ?? null,
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
      targetPaceSecPerMile: state.targetPaceSecPerMile ?? null,
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
      targetPaceSecPerMile: null,
    })

    // Attempt the PATCH in the background
    api.patch<{ current: unknown; next: { id: string; startedAt: string } | null }>(
      `/results/${oldResultId}`, { finishedAt, action: 'lap' }
    ).then(async (lapResult) => {
      if (lapResult.next === null) {
        setView(prev => (prev.type === 'racing' || prev.type === 'course')
          ? { type: 'complete', race, team, pin }
          : prev)
        return
      }
      // Re-enable LAP immediately using the PATCH response — GET enriches but isn't required
      setView(prev => (prev.type !== 'racing' && prev.type !== 'course') ? prev : {
        ...prev,
        resultId: lapResult.next!.id,
      })
      try {
        const state = await api.get<CurrentStateInProgress>(`/teams/${team.id}/current`)
        setView(prev => (prev.type !== 'racing' && prev.type !== 'course') ? prev : {
          ...prev,
          resultId: state.result.id,
          nextLeg: state.nextLeg ?? null,
          nextRunner: state.nextRunner?.name ?? null,
          nextRunnerEta: state.nextRunnerEta ?? null,
          targetPaceSecPerMile: state.targetPaceSecPerMile ?? null,
        })
      } catch { /* resultId already restored; next-leg info refreshes on next ETA poll */ }
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

  function handleViewCourse() {
    setView(prev => prev.type === 'racing' ? { ...prev, type: 'course' } : prev)
  }

  function handleBackFromCourse() {
    setView(prev => prev.type === 'course' ? { ...prev, type: 'racing' } : prev)
  }

  function handleViewLegProgress() {
    setView(prev => prev.type === 'racing' ? { ...prev, type: 'leg-progress' } : prev)
  }

  function handleBackFromLegProgress() {
    setView(prev => prev.type === 'leg-progress' ? { ...prev, type: 'racing' } : prev)
  }

  function handleViewLegMapFromRacing() {
    setView(prev => prev.type === 'racing' ? { ...prev, type: 'leg-map', from: 'racing' } : prev)
  }
  function handleViewLegMapFromLegProgress() {
    setView(prev => prev.type === 'leg-progress' ? { ...prev, type: 'leg-map', from: 'leg-progress' } : prev)
  }
  function handleBackFromLegMap() {
    setView(prev => prev.type !== 'leg-map' ? prev : { ...prev, type: prev.from })
  }

  // Poll for leg changes while on leg-map (can't press LAP from there)
  useEffect(() => {
    if (view.type !== 'leg-map') return
    setLegMapLastUpdatedMs(undefined)
    const { pin, team, race, resultId } = view
    const api = createDriverApi(pin)
    const id = setInterval(async () => {
      try {
        const state = await api.get<CurrentState>(`/teams/${team.id}/current`)
        setLegMapLastUpdatedMs(Date.now())
        if (state.status === 'not-started') {
          if (!state.nextLeg) return
          setView({ type: 'start', race, team, pin, nextLeg: state.nextLeg, nextRunner: state.nextRunner?.name ?? null })
        } else if (state.result.id !== resultId) {
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
            targetPaceSecPerMile: state.targetPaceSecPerMile ?? null,
          })
        }
      } catch { /* ignore, keep polling */ }
    }, 15_000)
    return () => clearInterval(id)
  }, [view.type]) // eslint-disable-line react-hooks/exhaustive-deps

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
        if (lapResult.next === null) {
          dequeue()
          setPendingAction(null)
          setView(prev => prev.type === 'racing'
            ? { type: 'complete', race: prev.race, team: prev.team, pin: prev.pin }
            : prev)
        } else {
          // Restore resultId from PATCH response before dequeue — GET is non-fatal
          setView(prev => prev.type !== 'racing' ? prev : {
            ...prev,
            resultId: lapResult.next!.id,
          })
          dequeue()
          setPendingAction(null)
          try {
            const state = await api.get<CurrentStateInProgress>(`/teams/${teamId}/current`)
            setView(prev => prev.type !== 'racing' ? prev : {
              ...prev,
              resultId: state.result.id,
              nextLeg: state.nextLeg ?? null,
              nextRunner: state.nextRunner?.name ?? null,
              nextRunnerEta: state.nextRunnerEta ?? null,
              targetPaceSecPerMile: state.targetPaceSecPerMile ?? null,
            })
          } catch { /* resultId already restored; next-leg info refreshes on next ETA poll */ }
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
      onViewCourse={handleViewCourse}
      onViewLegProgress={view.targetPaceSecPerMile !== null ? handleViewLegProgress : null}
      onViewLegMap={view.targetPaceSecPerMile !== null ? handleViewLegMapFromRacing : null}
    />
  )
  if (view.type === 'course') return (
    <CourseScreen
      currentLegNumber={view.leg.legNumber}
      raceStartedAt={view.raceStartedAt}
      teamName={view.team.name}
      backLabel="← TIMING"
      onBack={handleBackFromCourse}
    />
  )
  if (view.type === 'leg-progress') return (
    <LegProgressScreen
      runner={view.currentRunner ?? 'Runner'}
      town={view.nextHandoff?.name ?? view.leg.name}
      legN={view.leg.legNumber}
      totalLegs={18}
      distMiles={view.leg.distanceMiles}
      startedAtMs={new Date(view.startedAt).getTime()}
      targetPaceSecPerMile={view.targetPaceSecPerMile!}
      teamName={view.team.name}
      backLabel="← TIMING"
      onBack={handleBackFromLegProgress}
      onViewLegMap={handleViewLegMapFromLegProgress}
    />
  )
  if (view.type === 'leg-map') return (
    <LegMapScreen
      runner={view.currentRunner ?? 'Runner'}
      town={view.nextHandoff?.name ?? view.leg.name}
      legN={view.leg.legNumber}
      totalLegs={18}
      distMiles={view.leg.distanceMiles}
      startedAtMs={new Date(view.startedAt).getTime()}
      raceStartedAtMs={view.raceStartedAt ? new Date(view.raceStartedAt).getTime() : null}
      targetPaceSecPerMile={view.targetPaceSecPerMile!}
      teamName={view.team.name}
      backLabel={view.from === 'leg-progress' ? '← LEG PROGRESS' : '← TIMING'}
      onBack={handleBackFromLegMap}
      lastUpdatedMs={legMapLastUpdatedMs}
    />
  )
  return <CompleteScreen race={view.race} team={view.team} pin={view.pin} />
}
