import { useState, useEffect } from 'react'
import { publicApi, createDriverApi } from '../api'
import type { Race, TeamSummary, CurrentState } from '../api'

interface Props {
  race: Race
  onAuth: (team: TeamSummary, pin: string, state: CurrentState) => void
}

export function AuthScreen({ race, onAuth }: Props) {
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [teamId, setTeamId] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    publicApi.get<{ team: TeamSummary }[]>(`/races/${race.id}/status`)
      .then(data => {
        const list = data.map(d => d.team)
        setTeams(list)
        if (list.length > 0) setTeamId(list[0].id)
      })
      .catch(() => setError('Could not load teams'))
  }, [race.id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!teamId || !pin) return
    setError('')
    setLoading(true)
    try {
      const api = createDriverApi(pin)
      const state = await api.get<CurrentState>(`/teams/${teamId}/current`)
      const team = teams.find(t => t.id === teamId)
      if (!team) {
        setError('Team not found — please select a team again')
        return
      }
      onAuth(team, pin, state)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : ''
      if (msg.includes('401')) {
        setError('Incorrect PIN')
      } else {
        setError('Could not connect — check network')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
      <h1 className="text-2xl font-bold mb-2">{race.name}</h1>
      <p className="text-sm text-gray-400 mb-8">Driver / Timekeeper</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Team</label>
          <select
            value={teamId}
            onChange={e => setTeamId(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-base min-h-[44px]"
          >
            {teams.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Team PIN</label>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="Enter PIN"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-base min-h-[44px]"
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading || !teamId || !pin}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 rounded-xl py-4 font-bold text-lg min-h-[56px]"
        >
          {loading ? 'Verifying…' : 'Continue'}
        </button>
      </form>
    </div>
  )
}
