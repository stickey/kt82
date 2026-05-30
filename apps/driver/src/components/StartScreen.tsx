import { useState } from 'react'
import { createDriverApi } from '../api'
import { LongPressButton } from './LongPressButton'
import { RaceBanner } from './RaceBanner'
import type { Race, TeamSummary, Leg, CurrentStateInProgress } from '../api'

interface Props {
  race: Race
  team: TeamSummary
  pin: string
  nextLeg: Leg
  onStart: (state: CurrentStateInProgress) => void
}

export function StartScreen({ race, team, pin, nextLeg, onStart }: Props) {
  const [error, setError] = useState('')
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

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <RaceBanner teamName={team.name} raceStartedAt={null} />
      <div className="flex-1 flex flex-col p-6">
        <div className="mb-2 text-sm text-gray-400">{race.name}</div>
        <div className="flex-1 flex flex-col justify-center gap-6">
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">First Leg</div>
            <div className="text-3xl font-bold mb-1">Leg {nextLeg.legNumber}</div>
            <div className="text-lg text-gray-300">{nextLeg.name}</div>
            <div className="text-sm text-gray-400">{nextLeg.distanceMiles} mi</div>
          </div>
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <LongPressButton
            label="START"
            holdMs={500}
            onComplete={handleStart}
            colorClass="bg-green-600"
            disabled={started}
            className="text-xl"
          />
          <p className="text-xs text-gray-500 text-center">Hold to start the race</p>
        </div>
      </div>
    </div>
  )
}
