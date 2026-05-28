import { useState, useEffect } from 'react'
import { api } from './api'
import type { Race } from './api'
import { TeamGrid } from './components/TeamGrid'
import { TeamDetail } from './components/TeamDetail'

function getHashTeamId(): string | null {
  const m = window.location.hash.match(/^#team\/(.+)$/)
  return m ? m[1] : null
}

export default function App() {
  const [race, setRace] = useState<Race | null>(null)
  const [noRace, setNoRace] = useState(false)
  const [teamId, setTeamId] = useState<string | null>(getHashTeamId)
  const [teamName, setTeamName] = useState('')

  useEffect(() => {
    api.get<Race>('/races/active')
      .then(setRace)
      .catch(() => setNoRace(true))
  }, [])

  useEffect(() => {
    function onHashChange() {
      setTeamId(getHashTeamId())
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  function navigateToTeam(id: string, name: string) {
    window.location.hash = `team/${id}`
    setTeamId(id)
    setTeamName(name)
  }

  function navigateBack() {
    window.location.hash = ''
    setTeamId(null)
  }

  if (noRace) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <p className="text-gray-400">No active race.</p>
    </div>
  )

  if (!race) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
      <p className="text-gray-400 text-sm">Loading...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {teamId
        ? <TeamDetail teamId={teamId} teamName={teamName} onBack={navigateBack} />
        : <TeamGrid race={race} onTeamClick={navigateToTeam} />
      }
    </div>
  )
}
