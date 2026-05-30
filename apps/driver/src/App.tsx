import { useState, useEffect } from 'react'
import { publicApi } from './api'
import { AuthScreen } from './components/AuthScreen'
import { StartScreen } from './components/StartScreen'
import { TimingScreen } from './components/TimingScreen'
import { CompleteScreen } from './components/CompleteScreen'
import type { Race, TeamSummary, Leg, Handoff, CurrentState, CurrentStateInProgress } from './api'

type View =
  | { type: 'loading' }
  | { type: 'no-race' }
  | { type: 'auth'; race: Race }
  | { type: 'start'; race: Race; team: TeamSummary; pin: string; nextLeg: Leg }
  | { type: 'racing'; race: Race; team: TeamSummary; pin: string; resultId: string; leg: Leg; startedAt: string; nextHandoff: Handoff | null; currentRunner: string | null; raceStartedAt: string | null }
  | { type: 'complete'; race: Race; team: TeamSummary; pin: string }

export default function App() {
  const [view, setView] = useState<View>({ type: 'loading' })

  useEffect(() => {
    publicApi.get<Race>('/races/active')
      .then(race => setView({ type: 'auth', race }))
      .catch(() => setView({ type: 'no-race' }))
  }, [])

  function handleAuth(team: TeamSummary, pin: string, state: CurrentState) {
    const race = (view as { race: Race }).race
    if (state.status === 'not-started') {
      if (!state.nextLeg) {
        setView({ type: 'auth', race })
        return
      }
      setView({ type: 'start', race, team, pin, nextLeg: state.nextLeg })
    } else {
      setView({
        type: 'racing',
        race,
        team,
        pin,
        resultId: state.result.id,
        leg: state.currentLeg,
        startedAt: state.result.startedAt,
        nextHandoff: state.nextHandoff,
        currentRunner: state.currentRunner?.name ?? null,
        raceStartedAt: state.raceStartedAt ?? null,
      })
    }
  }

  function handleStart(state: CurrentStateInProgress) {
    const v = view as Extract<View, { type: 'start' }>
    setView({
      type: 'racing',
      race: v.race,
      team: v.team,
      pin: v.pin,
      resultId: state.result.id,
      leg: state.currentLeg,
      startedAt: state.result.startedAt,
      nextHandoff: state.nextHandoff,
      currentRunner: state.currentRunner?.name ?? null,
      raceStartedAt: state.raceStartedAt ?? null,
    })
  }

  function handleLap(state: CurrentStateInProgress) {
    const v = view as Extract<View, { type: 'racing' }>
    setView({
      type: 'racing',
      race: v.race,
      team: v.team,
      pin: v.pin,
      resultId: state.result.id,
      leg: state.currentLeg,
      startedAt: state.result.startedAt,
      nextHandoff: state.nextHandoff,
      currentRunner: state.currentRunner?.name ?? null,
      raceStartedAt: state.raceStartedAt ?? null,
    })
  }

  function handleComplete() {
    const v = view as Extract<View, { type: 'racing' }>
    setView({ type: 'complete', race: v.race, team: v.team, pin: v.pin })
  }

  if (view.type === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">Loading…</p>
      </div>
    )
  }

  if (view.type === 'no-race') {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-gray-400">No active race</p>
      </div>
    )
  }

  if (view.type === 'auth') {
    return <AuthScreen race={view.race} onAuth={handleAuth} />
  }

  if (view.type === 'start') {
    return (
      <StartScreen
        race={view.race}
        team={view.team}
        pin={view.pin}
        nextLeg={view.nextLeg}
        onStart={handleStart}
      />
    )
  }

  if (view.type === 'racing') {
    return (
      <TimingScreen
        team={view.team}
        pin={view.pin}
        resultId={view.resultId}
        leg={view.leg}
        startedAt={view.startedAt}
        nextHandoff={view.nextHandoff}
        currentRunner={view.currentRunner}
        raceStartedAt={view.raceStartedAt}
        onLap={handleLap}
        onComplete={handleComplete}
      />
    )
  }

  return <CompleteScreen race={view.race} team={view.team} pin={view.pin} />
}
